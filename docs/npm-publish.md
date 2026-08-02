# Publishing @ui2v/cli

Use GitHub Actions workflow **Publish to npm** (`publish-npm.yml`).

## Why classic `NPM_TOKEN` failed

npm returned a misleading `E404` on `PUT @ui2v/cli` while provenance signed successfully. That usually means the CLI used a restricted/bypass-2FA token (or an empty `_authToken` from `setup-node` `registry-url`) instead of Trusted Publishing OIDC.

## Required: Trusted Publisher on npmjs.com

Open https://www.npmjs.com/package/@ui2v/cli → **Settings** → **Trusted Publisher**:

| Field | Value |
| --- | --- |
| Organization or user | `illli-studio` |
| Repository | `ui2v` |
| Workflow filename | `publish-npm.yml` |
| Environment name | `npm-publish` |

Save, then re-run the workflow with version `2.0.0`.

## Local smoke (optional)

```bash
bun install
bun run build
bun run ui2v --cli-version
```
