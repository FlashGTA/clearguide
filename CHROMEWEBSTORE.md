# Chrome Web Store — ClearGuide Studio

Last updated: 2026-10-05

This file is the source of truth for Chrome Web Store submission metadata and readiness.

## Product identity

- **Store name:** ClearGuide Studio
- **Short name:** ClearGuide
- **Category:** Productivity
- **Primary language:** Korean
- **Manifest version:** 3
- **Target release:** 0.2.0
- **Repository:** FlashGTA/clearguide

## Single purpose

ClearGuide Studio lets an author create, preview, import, and export step-by-step guides for websites they choose.

The extension is an **authoring tool**. Ordinary website visitors can consume published guides through the separate ClearGuide Player SDK without installing this extension.

## Short description

Create and preview step-by-step web guides on sites you choose, then export reusable guide templates.

## Long description

ClearGuide Studio helps website operators, support teams, accessibility teams, and guide authors create step-by-step guidance directly on a real webpage.

Main features:

- Select elements directly on a webpage to create guide steps.
- Add labels and instructions for each step.
- Preview the guide on approved websites.
- Continue multi-page guide previews across approved origins.
- Import and export reusable ClearGuide JSON templates.
- Keep guide data locally in your browser.

ClearGuide Studio does not require a ClearGuide account and does not send your guide data to a ClearGuide server in the current release.

## Permissions justification

### storage

Stores guide templates, author preferences, and preview session state locally in the browser.

### activeTab

Provides temporary access to the current tab after the user opens or invokes ClearGuide Studio, so the extension can identify the page and start a user-requested authoring action.

### scripting

Injects the bundled ClearGuide authoring/preview content script into a website only after the user grants access to that origin.

### optional host permissions

Target:
- `http://*/*`
- `https://*/*`

ClearGuide Studio works on arbitrary websites chosen by the author, so target origins cannot be known before installation. Host access is therefore requested at runtime for the specific sites used to create or preview a guide, rather than granted to all sites at installation.

## Privacy & data use

See `PRIVACY.md`.

Current release behavior:

- stores guide data locally with `chrome.storage.local`
- does not use analytics
- does not use advertising
- does not transmit guide data to ClearGuide servers
- does not sell or share user data
- requests host access only for user-selected guide sites

Dashboard privacy answers must match this behavior.

## Store assets required

- [ ] 128×128 store icon verified
- [ ] screenshot 1 — choose a webpage and start guide authoring
- [ ] screenshot 2 — pick an element and write guidance
- [ ] screenshot 3 — preview the completed guide
- [ ] screenshot 4 — export/import guide template
- [ ] optional screenshot 5 — multi-page guide preview
- [ ] small promotional tile if required by Dashboard
- [ ] support URL
- [ ] public privacy policy URL

Screenshots should be 1280×800 where practical.

## Package

Store ZIP must contain only runtime extension files:

- `manifest.json`
- `src/`
- `public/`

Do not include repository metadata, internal docs, SDK demos, development notes, or `CHROMEWEBSTORE.md` in the uploaded ZIP.

Use:

```bash
python scripts/package_store.py
```

## Manual first-publish sequence

1. Register/verify the Chrome Web Store developer account.
2. Build the release ZIP from the public repository.
3. Upload the ZIP in the Developer Dashboard.
4. Fill Store Listing using this file.
5. Provide a live privacy-policy URL.
6. Fill the Privacy practices tab so it exactly matches `PRIVACY.md`.
7. Upload screenshots/assets.
8. Configure distribution visibility/countries.
9. Submit for review.
10. After approval, record the Store item ID and URL here.

## Release mapping

The Store package must be reproducible from the matching public Git tag.

```text
Git tag v0.2.0
     =
manifest 0.2.0
     =
uploaded ClearGuide Studio ZIP
```

## Version history

### 0.2.0 — planned

- separates Studio authoring from Player consumption
- moves website access toward runtime optional host permissions
- establishes the public repository as the release source of truth
- adds Store/privacy/contribution documentation
