# Production release

Production: https://dogbone-cnc.vercel.app/ — Vercel project `dogbone-cnc`, connected to `kkrugley/dogbone`, production branch `main`.

## Release checks

Run `npm ci`, `npm test`, `npm run build`, `npm run test:browser`, and `npm audit` before a production push. Vercel also runs the unit tests before building. The browser suite exercises the configured CSP locally and can exercise a live URL with `TEST_BASE_URL`.

The app handles drawings in the browser. It has no file-upload API or database. DXF inputs are limited to 10 MB, 50,000 entities and 100,000 vertices to bound processing. Import errors are shown in the file card. The upload reads each file once and does not retain a second parsed-JSON copy. Undo history is limited to 20 file-state edits; viewport changes do not enter it.

The CSP blocks external scripts, network connections, plugins, forms and framing. Inline scripts are disallowed. `unsafe-eval` remains necessary for Pixi's generated shader/uniform synchronisation functions; removing it requires a different renderer strategy. Inline styles remain necessary for React/Pixi layout and UI components. File/error strings are rendered as text; production error pages do not expose stack traces.

Vercel supplies HTTPS/HSTS. Additional configured headers include `nosniff`, frame blocking, a restrictive Permissions-Policy, no referrers and same-origin opener isolation. Hashed assets are cached immutably; the entry page must revalidate. Reports and generated drawing outputs are excluded from deployment uploads and are not copied into `dist`.

## Rollback

The production deployment before this release was `dpl_9PY64YGGePsGuTfqUTW64HXrCvok`, commit `6586a77797c7693bfa85555e15057d1d1e1d7950`.

If a new deployment fails functional verification, restore the previous deployment through the project's Vercel deployment controls. Preserve a record of the failing commit and repair it before redeploying. Do not force-push or overwrite unrelated repository changes.
