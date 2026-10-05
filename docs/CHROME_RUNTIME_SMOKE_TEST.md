# Chrome Runtime Smoke Test

This is the required manual gate before merging a Store release PR.

Target baseline: **ClearGuide Studio 0.2.0**

## 1. Load the extension

Use the source branch or unpack the validated Store package.

1. Open `chrome://extensions/`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select the directory containing `manifest.json`.
5. Confirm the extension name is **ClearGuide Studio** and version is **0.2.0**.

Pass:
- extension loads without manifest errors
- no install-time "read and change all your data on all websites" permission is required

## 2. Runtime permission request

Use a normal HTTPS test site, for example `https://example.com/`.

1. Open the target site.
2. Open ClearGuide Studio from the toolbar.
3. Click **새 가이드 만들기**.
4. Observe Chrome's site-access prompt.

Pass:
- permission is requested only after the authoring action
- the requested origin is the current site, not all websites
- denying permission leaves the page unchanged
- granting permission starts the picker

## 3. Create and save a guide

On the approved site:

1. Pick an element.
2. Add a label and message.
3. Save the guide.
4. Close and reopen the popup.

Pass:
- guide appears in the current-page list
- exported JSON contains `schemaVersion: "1.0"`
- no credential, cookie, localStorage, or session value is exported

## 4. Preview after reload

1. Reload the approved site.
2. Confirm the registered content script becomes available again.
3. Start the saved guide.

Pass:
- preview starts without requesting the same permission again
- duplicate ClearGuide overlays are not created
- closing the guide stops continuous tracking

## 5. Revoke site access

1. Open Chrome's extension details for ClearGuide Studio.
2. Remove access to the test site.
3. Reload the site.

Pass:
- ClearGuide no longer injects automatically
- opening Studio can request that origin again
- existing local Guide JSON remains stored unless the user deletes it

## 6. Service-worker restart

1. Confirm a test site has already been granted.
2. From `chrome://extensions/`, restart/reload the extension or otherwise terminate the service worker.
3. Reload the approved site.

Pass:
- granted-origin dynamic content-script registration is restored/preserved
- stored guides remain available
- preview resumes normally

## 7. Multi-origin guide preview

Prepare/import a test guide whose steps use two explicit HTTPS origins.

Example shape:

```json
{
  "schemaVersion": "1.0",
  "id": "multi-origin-test",
  "name": "Multi origin test",
  "originUrl": "https://example.com/",
  "steps": [
    {
      "selector": "h1",
      "label": "Example",
      "message": "Example.com step",
      "urlPattern": "https://example.com/"
    },
    {
      "selector": "h1",
      "label": "Chrome docs",
      "message": "Second origin step",
      "urlPattern": "https://developer.chrome.com/"
    }
  ]
}
```

Pass:
- Studio requests only the target origins
- both origins must be approved before multi-origin preview
- navigation uses only HTTP/HTTPS
- non-HTTP(S) imported navigation is rejected

## 8. Malformed guide security checks

Try importing modified JSON with:

- `javascript:alert(1)` as `originUrl`
- `javascript:alert(1)` as a step `urlPattern`
- malformed CSS selector such as `[`
- HTML-like text in guide name/message
- unexpected interaction type

Pass:
- unsafe URL imports are rejected or normalized
- malformed selector does not crash the extension
- guide text is displayed as text, not executed as markup/script
- unsupported interaction types do not become arbitrary executable behavior

## 9. Player — no-extension path

Run a local static server from the repository root:

```bash
python -m http.server 8080
```

Open:

```text
http://localhost:8080/player_demo.html
```

Pass:
- demo works with ClearGuide Studio disabled
- guide steps render
- cross-page demo resumes
- keyboard navigation works
- Player uses no `chrome.*` API

## 10. Player JSON URL path

Serve a page that calls:

```html
<script src="/sdk/clearguide-player.js"></script>
<script>
  ClearGuide.init();
  ClearGuide.playFromUrl('/examples/guides/basic-guide.json');
</script>
```

Pass:
- JSON loads and validates
- guide renders without an extension
- failed JSON/network load produces an error rather than executing arbitrary code

## Release gate

Do not merge the Store release PR until:

- [ ] sections 1–10 pass
- [ ] GitHub release validation CI passes
- [ ] Store ZIP artifact is generated
- [ ] privacy text matches actual behavior
- [ ] license decision is resolved
- [ ] brand/name review is resolved for intended Store regions
