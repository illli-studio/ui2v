# Publish to UI2V

## Prerequisites

1. HyperFrames package folder ready (`registry-item.json` + entry HTML).
2. Logged in: `ui2v login` (or `ui2v login --token clh_...`).
3. Semver for this release: `--version 1.2.3`.

## Commands

```bash
ui2v motion publish ./path/to/package --version 1.0.0
ui2v motion publish ./path/to/package --version 1.0.1 --changelog "Fix timing" --tags latest
ui2v motion publish ./path/to/package --version 1.0.0 --slug my-slug --name "My Motion"
```

Bulk / workspace scan:

```bash
ui2v sync
ui2v sync --dry-run
ui2v sync --all --bump patch
```

## What the CLI checks locally

- Folder exists
- At least one file
- `registry-item.json` present
- Entry HTML present (`index.html` or `*.html`)
- Valid semver `--version`

Server-side validation still runs on upload (duration ≥ 1s, manifest shape, etc.).

## Required animation cover

`motion publish`, `skill publish`, legacy `publish`, and `sync` attach a cover.
Priority: explicit `--cover <path>` (relative to the package folder), manifest
`thumbnail` (a local uploaded path), root `thumbnail.webp/png/jpg`, root
`cover.webp/png/jpg`, then a screenshot. Manifest `thumbnail` is a string, for
example `"thumbnail": "assets/thumbnail.png"`; remote URLs are not fetched.

Screenshot time defaults to `min(3, duration / 2)` seconds. Set `--cover-time 1.5`
to select another frame; it must be >= 0 and < duration. Screenshots are cached
in `.ui2v/cover.png`, keyed by package file contents and timestamp. Changes to
HTML, scripts, images, fonts, media or manifest invalidate the cache;
`--refresh-cover` forces a new screenshot. Title/version flags do not invalidate
the cache. Remote asset changes require `--refresh-cover` because their contents
are not part of the package hash.

Existing Chrome/Edge/Chromium is used, or set `UI2V_COVER_BROWSER` to a browser
executable. On a Linux CI host without one, install it first:

```bash
npx playwright@1.64.1 install --with-deps chromium
ui2v motion publish ./my-motion --version 1.0.0
ui2v motion publish ./my-motion --version 1.0.1 --cover assets/thumbnail.png
```

Covers must show the animation itself (an actual frame or authored cover), never
a generic placeholder. Covers become WebP with a maximum edge of 640px and a 512000 byte limit, uploaded
as the reserved generated file `ui2v-cover.webp`. Do not author a source file with
that name. This file does not affect sync fingerprints. Screenshot failures stop
the upload and explain how to supply a cover. There is no `--no-cover` escape.

### Direct API clients

POST `/api/v1/motions` with your normal bearer API token, not an admin key.
For multipart requests, include the image in the `files` parts and set
`payload.thumbnailPath` to its exact uploaded filename, e.g. `"thumbnail.png"`.
For JSON requests, upload the image through the normal storage upload endpoint,
include its descriptor in `files[]`, and set the same `thumbnailPath`.
The backend checks that this is exactly one supplied PNG/JPEG/WebP image within
the size limit, then persists its storage URL as the motion thumbnail.
The API rejects publishing without a valid uploaded cover. Older clients must
upgrade or send `thumbnailPath` and an image. The API does not render arbitrary
HTML inside a Vercel request. The web upload form also requires a cover file.

## After publish

- Page: `https://ui2v.com/<owner>/<slug>`
- Install: `npx @ui2v/cli@latest install <slug>`

Published motions are released under MIT-0 on UI2V.

## Do not

- Publish `@ui2v/core` `animation.json` / `project.json` / legacy `MOTION.json`
- Call `@ui2v/cli@1.x` JSON toolchain commands (`validate` / `preview` / `render`) as a publish gate
- Use `clawhub` as the primary binary name (legacy); prefer `ui2v`

## Troubleshooting

- `ui2v: command not found` → install `npm install -g @ui2v/cli@latest`, then run `ui2v --cli-version`.
- `401` / `403` / auth prompt loops → run `ui2v login` again, or use `ui2v login --token clh_...` when the user provides a token.
- Invalid version → pass a semver release with `--version`, for example `1.0.1`.
- Entry file missing → ensure `index.html` exists, or that `registry-item.json.files[]` points to an existing composition HTML file.
- Server validation failure → re-check duration, dimensions, package type, and composition file shape in `references/package-format.md`.
