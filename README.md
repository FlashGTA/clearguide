# ClearGuide

Public release repository for the `ClearGuide` browser extension.

This repo is intended for publishing the user-facing extension code while the source monorepo stays private for ongoing development. It includes the runtime extension, demo pages, and the embeddable player SDK.

## What It Does

- Build guided workflows directly on top of live web pages
- Highlight the current step with an isolated overlay UI
- Resume workflows across page transitions
- Export guides for use with the standalone player SDK

## Included In This Public Repo

- `manifest.json`
- `src/`
- `public/`
- `sdk/`
- `USER_GUIDE.md`
- `player_demo.html`
- `player_demo_complete.html`
- `automated_test.html`

## Install As An Unpacked Extension

1. Open `chrome://extensions/`
2. Enable developer mode
3. Click `Load unpacked`
4. Select this repository root

## Local Test And Demo Files

- `automated_test.html`: lightweight browser-side regression checks
- `player_demo.html`: SDK demo page
- `player_demo_complete.html`: extended SDK demo page

## Notes

- License: `PolyForm Noncommercial 1.0.0`
- Commercial use requires a separate written license
- Branding and logos remain reserved under `TRADEMARK.md`
- The extension display name in `manifest.json` is exported as `ClearGuide`
- Internal roadmap, audit, and strategy documents are intentionally excluded from this public repo
