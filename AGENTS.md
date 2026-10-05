# AGENTS.md

## ClearGuide development rule

ClearGuide has two deliverables:

1. **ClearGuide Studio** — Chrome Extension for guide authoring and preview.
2. **ClearGuide Player** — normal web SDK for end-user guide playback.

The shared contract is `schema/guide.schema.json`.

Do not collapse Studio authoring and end-user playback into one permission-heavy Extension unless a product decision explicitly requires it.

## Modern Web Guidance

This project uses Google's Modern Web Guidance as an external best-practice source.

Upstream:
- https://github.com/GoogleChrome/modern-web-guidance
- https://developer.chrome.com/docs/extensions/ai/build-with-ai#modern_web_guidance

### Chrome Extension work

Before modifying:

- `manifest.json`
- `src/`
- `public/`
- Chrome APIs
- permissions
- service worker
- content scripts
- Chrome Web Store release metadata

use the `chrome-extensions` guidance pack and check the relevant reference material.

If Codex plugins are available:

```bash
codex plugin marketplace add GoogleChrome/modern-web-guidance
codex plugin add modern-web-guidance@googlechrome
```

Alternative:

```bash
npx modern-web-guidance@latest install --choose
```

Select both:
- `chrome-extensions`
- `modern-web-guidance`

### Player / frontend work

Before changing web-facing HTML/CSS/client JavaScript, search Modern Web Guidance for the concrete task and retrieve the best matching guide before implementation.

Examples:

```bash
npx -y modern-web-guidance@latest search "accessible guided overlay focus management"
npx -y modern-web-guidance@latest search "reduce animation work for continuously tracked overlay"
```

Do not invent a guide ID. Search first, then retrieve the returned ID.

## Store source of truth

Any change that affects the Store product must update `CHROMEWEBSTORE.md` in the same PR.

Store-affecting changes include:

- manifest version/name/description
- permissions or host permissions
- user-facing features
- privacy/data behavior
- screenshots/assets
- version/release status
- Store rejection remediation

## Permission policy

- request the narrowest permissions possible
- prefer `activeTab` for user-invoked current-tab access
- use runtime optional host permissions for author-selected sites
- do not restore static `<all_urls>` injection without a documented requirement and review
- keep the Player free of Chrome Extension permissions

## Privacy policy

- local-only behavior must remain truthful in `PRIVACY.md`
- adding analytics, remote APIs, cloud publishing, AI services, or telemetry requires privacy review
- never hardcode API keys or credentials in the published Extension

## Release flow

```text
Issue
  ↓
branch
  ↓
implementation + tests + docs
  ↓
PR / review
  ↓
main
  ↓
vX.Y.Z tag
  ↓
python scripts/package_store.py
  ↓
Chrome Web Store
```

The public repository is the release source of truth. Private ClearView_AI documents may propose features, but production ClearGuide changes are implemented here.
