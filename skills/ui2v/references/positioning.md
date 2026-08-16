# UI2V positioning

Use this when writing README copy, npm copy, release notes, website text, or
answers that introduce UI2V.

## One-line positioning

UI2V is the registry CLI for HyperFrames motion packages: publish motion like a
package, install animation like a dependency.

## What UI2V does

- Search motion packages on ui2v.com
- Install reusable HyperFrames motion packages into a workspace
- Publish versioned motion packages from local folders
- Sync local package folders with the registry
- Inspect package metadata and files without installing
- Support ownership, transfer, moderation, stars, and CLI upgrades
- Provide advanced compatible package workflows under `ui2v package`

## What UI2V does not do

- It does not author compositions.
- It does not preview or render video.
- It does not export MP4/WebM.
- It does not use the removed `animation.json` renderer workflow.

Route those tasks to HyperFrames.

## Audience

- Motion designers packaging polished HyperFrames compositions
- Frontend teams installing reusable motion as project assets
- Design system maintainers treating animation patterns as versioned components
- Agents that need a stable publish/install workflow for motion packages

## Message pillars

1. **Distribution for motion** — motion packages should be searchable,
   installable, versioned, and shareable.
2. **Clear boundary** — HyperFrames creates motion; UI2V distributes it.
3. **Registry workflow** — login, search, install, publish, sync, inspect.
4. **Agent-readable packages** — `registry-item.json` and entry HTML give tools
   a stable shape to inspect.

## Advanced package registry

The `ui2v package` command group exists for compatible code-plugin and
bundle-plugin workflows. Do not lead with it in public UI2V intros. Mention it
only for advanced CLI docs or package-registry-specific work.

## Preferred phrasing

- "registry CLI"
- "HyperFrames motion packages"
- "publish motion like a package"
- "install animation like a dependency"
- "distribution layer for motion"
- "versioned motion packages"

## Avoid

- Calling UI2V a renderer
- Advertising `render`, `preview`, `validate`, or `doctor`
- Presenting old JSON examples as current demos
- Saying the current `@ui2v/cli` package is abandoned
