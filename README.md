# evergreen-lifecycle-data

Open lifecycle dataset for [Evergreen](https://github.com/arminazimi/evergreen): evidence-backed deprecation, end-of-support, and end-of-life rules, one file per ecosystem.

Third parties can read these JSON files without installing the Evergreen scanner. Scans in Evergreen itself stay local and offline; this repository publishes the same reviewed rules as a standalone dataset.

## Layout

```text
registry/<ecosystem>.json   # evergreen.registry.v2 rules for that ecosystem
schemas/registry.v2.schema.json
scripts/validate.mjs        # offline CI validation
```

Each `registry/<ecosystem>.json` file uses the [registry v2](https://github.com/arminazimi/evergreen/blob/main/docs/decisions/0004-registry-v2.md) shape: Package URL (`purl`), VERS range (`vers`), lifecycle event, severity, sources, and provenance.

Ecosystems currently published:

- `android`, `ci-images`, `container`, `cpp`, `dart`, `database`, `deno`, `dotnet`, `elixir`
- `github-actions`, `go`, `java`, `kubernetes`, `nodejs`, `npm`, `php`, `python`
- `ruby`, `rust`, `scala`, `serverless`, `shell`, `swift`, `terraform`

## Validate

Requires Node.js 22 or newer.

```bash
npm ci
npm run check
```

`npm run check` validates every ecosystem file against the schema and checks that the file name, top-level `ecosystem`, and each rule's `ecosystem` agree. It does not use the network.

## Related

- Scanner, MCP server, and GitHub Action: [arminazimi/evergreen](https://github.com/arminazimi/evergreen)
- Static product API already published from Evergreen docs: https://arminazimi.github.io/evergreen/api/v1/
- Roadmap issue for this repository: [evergreen#258](https://github.com/arminazimi/evergreen/issues/258)

License and attribution for reuse are tracked separately ([evergreen#260](https://github.com/arminazimi/evergreen/issues/260)).
