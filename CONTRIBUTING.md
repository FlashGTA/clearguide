# Contributing to ClearGuide

ClearGuide has two primary deliverables:

- **Studio Extension** — guide authoring and preview
- **Player SDK** — guide consumption on websites

Both share the Guide Template contract in `schema/guide.schema.json`.

## Workflow

1. Open or reference an issue.
2. Create a focused branch.
3. Keep Studio, Player, and schema boundaries explicit.
4. Test the affected flow.
5. Open a pull request with behavior, permissions, privacy, and release impact described.

## Chrome extension changes

For changes under `manifest.json`, `src/`, or `public/`:

- follow Manifest V3
- request the minimum required permissions
- do not add remote executable code
- update `CHROMEWEBSTORE.md` when Store metadata, permissions, privacy behavior, or user-facing features change
- preserve service-worker restart safety
- prefer async/await for Chrome APIs

## Player changes

For changes under `sdk/`:

- do not require Chrome extension APIs
- keep the Player embeddable as normal website code
- do not silently add network calls
- preserve keyboard and accessibility behavior

## Guide schema changes

Schema changes require:

- schema version impact documented
- backward compatibility considered
- Studio export/import impact checked
- Player consumption impact checked

## Pull request scope

Prefer small PRs. Product strategy and private roadmap material should remain in `FlashGTA/ClearView_AI`; this public repository should contain what contributors need to build, test, and release ClearGuide.


## Contribution license

Unless explicitly stated otherwise, contributions submitted for inclusion in ClearGuide are provided under the repository's **Apache License 2.0**, consistent with Section 5 of that license.

The software license does not grant trademark rights to the ClearGuide name or logo.
