# ClearGuide Studio Release Checklist

## Release source

- Public repository `FlashGTA/clearguide` is the release source.
- Store package must be reproducible from the matching public Git tag.
- Do not overwrite accepted public changes from a private monorepo export.

## Before each release

Run the full manual gate in [docs/CHROME_RUNTIME_SMOKE_TEST.md](./docs/CHROME_RUNTIME_SMOKE_TEST.md).

### Manifest / permissions

- [ ] `manifest_version` is 3
- [ ] version increased from previous Store upload
- [ ] only required API permissions are declared
- [ ] site access remains optional/runtime-granted
- [ ] permission justifications in `CHROMEWEBSTORE.md` match `manifest.json`
- [ ] no remote executable code

### Functional smoke test

- [ ] load unpacked extension
- [ ] open Studio on an unapproved site
- [ ] start authoring and confirm Chrome asks for that site's permission
- [ ] create and save a guide
- [ ] preview the guide
- [ ] export JSON
- [ ] import the exported JSON
- [ ] preview a multi-page guide on all approved origins
- [ ] remove site access and confirm Studio no longer injects there
- [ ] restart Chrome and confirm granted-site dynamic registration recovers

### Player

- [ ] `player_demo.html` works without the extension
- [ ] `player_demo_complete.html` works
- [ ] Player object-based template loading works
- [ ] Player JSON URL loading works
- [ ] Studio-exported template remains compatible with Player

### Privacy / Store

- [ ] `PRIVACY.md` matches actual data behavior
- [ ] privacy policy has a live public URL
- [ ] Developer Dashboard privacy answers match the policy
- [ ] listing description matches the actual single purpose
- [ ] at least one current 1280×800 or 640×400 screenshot is ready
- [ ] 128×128 Store icon is verified
- [ ] support URL is ready

## Package

Run:

```bash
python scripts/package_store.py
```

Verify the ZIP contains `manifest.json` at its root and only the Extension runtime files required for Store submission.

## Release

- [ ] commit reviewed
- [ ] tag `vX.Y.Z` created
- [ ] generated ZIP version matches the tag
- [ ] ZIP uploaded to Chrome Web Store Developer Dashboard
- [ ] listing/privacy/distribution reviewed
- [ ] submitted for review
- [ ] after approval, Store item URL recorded in `CHROMEWEBSTORE.md`
