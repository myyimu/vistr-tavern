# Engineering Notes

This project is intentionally small: a SillyTavern extension folder with no build step, no backend, and no external runtime dependencies.

## Verification

Use one command before committing or cutting a release:

```bash
npm run verify
```

It runs:

- `npm run check`: syntax checks for the browser entry, core modules, and scripts.
- `npm run smoke`: behavioral smoke test for narrative memory, handoff, awareness events, and export.
- `npm run verify:version`: version consistency check.

## Version Source

The current extension version must stay aligned across:

- `package.json`
- `manifest.json`
- `data/version.js`

`scripts/verify-version.mjs` enforces this. If a release updates one of these files but not the others, `npm run verify` fails.

## Release Hygiene

Before creating a release:

1. Update the version in `package.json`, `manifest.json`, and `data/version.js`.
2. Update `CHANGELOG.md`.
3. Run `npm run verify`.
4. Confirm README and release checklist point to the current alpha version.
5. Tag and create a GitHub pre-release.

## Scope Control

Keep alpha changes small and reversible:

- Prefer documentation, validation, and compatibility fixes over broad UI redesign.
- Do not add a backend, database, account system, or build pipeline unless a concrete user workflow requires it.
- Keep SillyTavern integration points visible in Debug so compatibility issues can be reported with evidence.
