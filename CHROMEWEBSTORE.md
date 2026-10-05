# Chrome Web Store — ClearGuide Studio

Last updated: 2026-10-05

This file is the source of truth for Chrome Web Store submission metadata and readiness.

## Submission status

- **Code baseline:** IN PROGRESS — branch `feat/store-baseline-studio-player`
- **Manifest/static syntax check:** PASS
- **Browser E2E smoke test:** PENDING
- **Developer account registration / fee / email verification / 2-Step Verification:** USER ACTION REQUIRED
- **Privacy policy:** READY IN REPO; public main-branch URL available after merge
- **Screenshots / promo assets:** PENDING
- **Developer Dashboard upload:** PENDING

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

## Store listing — Korean

### Short description

원하는 웹사이트에서 단계별 가이드를 만들고 미리본 뒤 재사용 가능한 JSON 템플릿으로 내보냅니다.

### Long description

ClearGuide Studio는 웹사이트 운영자, 고객지원 담당자, 접근성 담당자, 가이드 제작자가 실제 웹페이지 위에서 단계별 안내를 만들 수 있는 도구입니다.

주요 기능:

- 웹페이지에서 안내할 요소를 직접 선택
- 각 단계에 설명과 안내 문구 작성
- 사용자가 허용한 사이트에서 가이드 미리보기
- 여러 페이지로 이어지는 가이드 미리보기
- ClearGuide JSON 템플릿 가져오기/내보내기
- 가이드 데이터를 브라우저 로컬에 저장

현재 릴리즈는 ClearGuide 계정을 요구하지 않으며 작성한 가이드 데이터를 ClearGuide 서버로 전송하지 않습니다.

## Store listing — English

### Short description

Create and preview step-by-step web guides on sites you choose, then export reusable guide templates.

### Long description

ClearGuide Studio helps website operators, support teams, accessibility teams, and guide authors create step-by-step guidance directly on real webpages.

Main features:

- Select webpage elements to create guide steps.
- Add labels and instructions for each step.
- Preview guides on sites you approve.
- Continue multi-page previews across approved origins.
- Import and export reusable ClearGuide JSON templates.
- Keep guide data locally in your browser.

The current release does not require a ClearGuide account and does not send guide data to a ClearGuide server.

## Permissions justification

### storage

Stores guide templates, author preferences, and preview session state locally in the browser.

### tabs

ClearGuide Studio reads the URL of the currently active tab so it can determine the exact website origin for which the author is requesting access. The extension does not need permanent host access to every site; it uses the active tab URL to request only the selected site's optional host permission.

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

## Public URLs

- **Privacy policy (after merge):** https://github.com/FlashGTA/clearguide/blob/main/PRIVACY.md
- **Support:** https://github.com/FlashGTA/clearguide/issues
- **Project:** https://github.com/FlashGTA/clearguide

A developer contact email must still be configured and verified in the Chrome Web Store developer account.

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
