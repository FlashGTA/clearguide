# PR #3 main reconciliation — 2026-10-12

## Source and preservation

- Public repository: https://github.com/FlashGTA/clearguide
- Original PR head: `9267d113153505d8fc7d6866c8f0caa1a485db9b`.
- Main integrated: `d20744e` (latest when checked).
- Merge commit: `3f858a39a6fd9621bcf87ca2f37d00272933a11b`.
- Both original heads are ancestors of the merge; no force push or history rewriting.
- Conflicts resolved in README, manifest, and service worker.
- Manifest retains Studio identity, minimum permissions, optional origins, dynamic content scripts, and explicit CSP.
- Main's public-service demo, Goal Router, Player visibility/navigation recovery, and icons are retained.
- Main's workflow error recording, initial status, error clearing, and exhausted-session cleanup are integrated into the normalized asynchronous message handler.
- PR Store/OSS files (Apache-2.0, contribution/security/privacy docs, templates, schema/examples, packaging and CI) are unchanged from the original PR, apart from readiness documentation.

## Validation evidence

- `node scripts/validate_release.mjs`: PASS.
- Syntax checks: background, content script, popup, and Player: PASS.
- `git diff --check`: PASS.
- Store ZIP: 10 files, root manifest, only manifest/src/public runtime content: PASS.
- Icon PNG dimensions: 16×16, 48×48, 128×128: PASS.
- GitHub release validation at merge commit: PASS, including Store artifact upload.
  https://github.com/FlashGTA/clearguide/actions/runs/38247812250
- Artifact: `clearguide-studio-store-package`.

## Runtime evidence and limits

Chrome, with no Studio extension/API available:

- Player initialization and object guide rendering: PASS.
- Enter advances to the quantity-input step: PASS.
- Local mock payment journey reaches `player_demo_complete.html`, restores step index 3 and completion text: PASS.
- Reload restores an active guide: PASS.
- JSON example loads; on a local copy with its URL pattern adapted to the test page, the heading step renders: PASS. The example's original example.com pattern is intentionally retained in the repository.
- Missing JSON returns HTTP 404 as an error: PASS.
- Invalid selector safely returns null; javascript navigation is blocked: PASS.
- Escape clears the session and overlay and stops the animation ticker: PASS.

Isolated headless Chromium with unpacked extension:

- Manifest/extension service worker and popup load: PASS.
- Initially granted hosts: none; required permissions are activeTab/storage/scripting.
- Actual popup-to-service-worker workflow start, error recording, and error clearing: PASS.
- Unsafe origin is normalized to null: PASS.
- These checks do not substitute for Chrome's real toolbar invocation and permission prompts.
- Exhausted-session cleanup was preserved in the merge but could not be exercised through an ungranted test site's navigation event: tab URL access is intentionally unavailable until the site is granted.

## Remaining release gates

Follow `docs/CHROME_RUNTIME_SMOKE_TEST.md` sections 1–10. Still required:

- Real Chrome toolbar invocation, authoring, save/import/export, grant/deny/revoke prompts.
- Dynamic injection after reload, service-worker restart with granted origins, and multi-origin preview.
- Full extension malformed-guide checks and no duplicate overlays.
- Store screenshots and final privacy/metadata review.
- Brand/region decision: https://github.com/FlashGTA/clearguide/issues/4 (open).
- Existing developer account confirmed by owner; current Dashboard verification status and target item/distribution settings remain to be checked.

## Merge / release decision

Technically conflict-free and CI passing. **Hold merge, v0.2.0 tag, and Store submission** until the repository's runtime and brand gates pass. The locally generated ZIP is a release candidate; it is not yet tied to a published v0.2.0 tag. After gates pass, recheck current main/head, merge, tag, rebuild from the tag, verify ZIP, and upload through the existing developer account.
