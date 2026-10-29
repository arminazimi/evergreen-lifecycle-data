#!/usr/bin/env node
/**
 * Validates every ecosystem registry under registry/*.json against
 * schemas/registry.v2.schema.json and a few dataset invariants.
 *
 * Offline only: reads the checkout. Exits 0 when every file is valid.
 */

import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Ajv2020 } from "ajv/dist/2020.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY_DIR = join(ROOT, "registry");
const SCHEMA_PATH = join(ROOT, "schemas", "registry.v2.schema.json");
const SCHEMA_VERSION = "evergreen.registry.v2";
const ECOSYSTEM_FILE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/;

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @param {string} path
 * @returns {Promise<unknown>}
 */
async function readJson(path) {
  const text = await readFile(path, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${path}: invalid JSON (${message})`);
  }
}

/**
 * Extra checks beyond JSON Schema so the dataset stays usable by third parties.
 * @param {string} fileName
 * @param {unknown} document
 * @returns {string[]}
 */
function datasetIssues(fileName, document) {
  const issues = [];
  const ecosystem = basename(fileName, ".json");

  if (!isRecord(document)) {
    issues.push("document must be an object");
    return issues;
  }

  if (document.schemaVersion !== SCHEMA_VERSION) {
    issues.push(`schemaVersion must be ${SCHEMA_VERSION}`);
  }

  if (document.ecosystem !== ecosystem) {
    issues.push(`ecosystem must match the file name (${ecosystem})`);
  }

  if (!Array.isArray(document.rules)) {
    issues.push("rules must be an array");
    return issues;
  }

  const seen = new Set();
  for (const [index, rule] of document.rules.entries()) {
    if (!isRecord(rule)) {
      issues.push(`rules[${index}] must be an object`);
      continue;
    }
    if (typeof rule.id !== "string" || rule.id.length === 0) {
      issues.push(`rules[${index}] is missing id`);
      continue;
    }
    if (seen.has(rule.id)) {
      issues.push(`duplicate rule id "${rule.id}"`);
    }
    seen.add(rule.id);
    if (rule.ecosystem !== ecosystem) {
      issues.push(`rule "${rule.id}": ecosystem must be ${ecosystem}`);
    }
  }

  return issues;
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
export async function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(
      "Usage: node scripts/validate.mjs\n\nValidate registry/<ecosystem>.json against schemas/registry.v2.schema.json.\n",
    );
    return 0;
  }

  const schema = await readJson(SCHEMA_PATH);
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);

  const names = (await readdir(REGISTRY_DIR))
    .filter((name) => ECOSYSTEM_FILE.test(name))
    .sort();

  if (names.length === 0) {
    process.stderr.write(`No ecosystem registry files found under ${REGISTRY_DIR}\n`);
    return 1;
  }

  /** @type {string[]} */
  const failures = [];

  for (const name of names) {
    const path = join(REGISTRY_DIR, name);
    let document;
    try {
      document = await readJson(path);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
      continue;
    }

    const ok = validate(document);
    if (!ok) {
      for (const error of validate.errors ?? []) {
        const where = error.instancePath || "/";
        failures.push(`${name}: schema ${where} ${error.message ?? "is invalid"}`);
      }
    }

    for (const issue of datasetIssues(name, document)) {
      failures.push(`${name}: ${issue}`);
    }
  }

  if (failures.length > 0) {
    process.stderr.write(
      `Invalid lifecycle dataset (${failures.length} problem${failures.length === 1 ? "" : "s"}):\n`,
    );
    for (const failure of failures.slice(0, 50)) {
      process.stderr.write(`- ${failure}\n`);
    }
    if (failures.length > 50) {
      process.stderr.write(`- … and ${failures.length - 50} more\n`);
    }
    return 1;
  }

  process.stdout.write(`Validated ${names.length} ecosystem registries.\n`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().then((code) => {
    process.exitCode = code;
  });
}
