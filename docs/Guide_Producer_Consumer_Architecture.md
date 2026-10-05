# ClearGuide Producer / Consumer Architecture

## Decision

ClearGuide separates **guide production** from **guide consumption**.

- **ClearGuide Studio (Chrome Extension)**: creates, edits, previews, imports, and exports guide templates.
- **ClearGuide Player (Web SDK)**: consumes a guide template inside a website. End users do not need to install an extension.
- **Viewer Extension (optional future product)**: runs published guides on third-party sites that cannot embed the Player. It should be a separate Store item if its purpose and permission profile diverge from Studio.

This separation keeps the Chrome Web Store extension's purpose narrow and gives ordinary users a zero-install path when the website owner can embed the Player.

## Product Flow

```text
Author / operator
      ↓
ClearGuide Studio Extension
      ↓
Guide Template (JSON)
      ↓
 ┌───────────────┬────────────────┐
 ↓               ↓                ↓
Static file   CMS / backend    local preview
 ↓               ↓
ClearGuide Player SDK
      ↓
Website visitors
(no extension required)
```

## Roles

### Studio

Responsibilities:

- pick DOM targets on sites explicitly approved by the author
- write step labels and messages
- configure required actions
- preview a guide
- import/export guide JSON
- validate guide structure
- eventually publish templates to a chosen repository/CMS/backend

The Store listing should describe Studio as a **web guide authoring tool**, not as a general-purpose browser automation bundle.

### Player

Responsibilities:

- load a validated Guide Template
- render spotlight / tooltip / navigation UI
- preserve guide progress for the current browsing session
- execute no authoring UI
- require no Chrome extension APIs
- be embeddable by the website owner

The current implementation lives at `sdk/clearguide-player.js`.

### Viewer Extension — later, only if needed

Use this when:

- the website cannot embed the Player,
- but a user still needs to consume a published guide on that site.

Keep it separate from Studio when possible so normal users do not receive authoring permissions or authoring UI.

## Guide Template Contract

The Guide Template is the boundary between production and consumption.

Canonical schema:

- `schema/guide.schema.json`

Minimum contract:

```json
{
  "schemaVersion": "1.0",
  "id": "guide_example",
  "name": "Example guide",
  "domain": "example.com",
  "originUrl": "https://example.com/",
  "steps": [
    {
      "label": "Search",
      "message": "Enter a keyword.",
      "urlPattern": "https://example.com/search",
      "selector": "#search",
      "actionRequired": true,
      "interactionType": "input"
    }
  ]
}
```

## Distribution Modes

### 1. Embedded Player — preferred for ordinary users

Site owner ships:

```html
<script src="/assets/clearguide-player.js"></script>
<script>
  ClearGuide.init();
  ClearGuide.play(window.MY_GUIDE);
</script>
```

For production, the Player and guide JSON should normally be hosted by the same service/site that embeds them. This avoids requiring browser-extension permissions for end users.

### 2. Studio preview

The Studio extension can execute the same template for author preview. This does not define the end-user distribution model.

### 3. Future published guide catalog

A later phase can add a catalog/registry:

```text
Guide ID
Version
Target origins
Template URL
Author
Published at
Integrity/signature
```

Do not introduce a server requirement before it is needed. Static JSON is enough for the first public release.

## Permission Boundary

Studio should not inject on every website by default.

Target model:

```text
User opens Studio
      ↓
User chooses "Create guide"
      ↓
Request permission for that origin
      ↓
Register bundled content script only for approved origin
      ↓
Authoring / preview
```

A multi-origin guide should request all target origins from the author before preview/run.

The embedded Player has no Chrome host permissions because it runs as normal site code.

## Repository Boundary

`FlashGTA/clearguide` contains both Studio and Player because they share the guide schema and guide engine concepts, but they are separate deliverables:

```text
manifest.json + src/ + public/  → Chrome Store: ClearGuide Studio
sdk/                            → Web embed: ClearGuide Player
schema/                         → shared contract
examples/                       → templates / demos
```

A future repository split is unnecessary until independent release cadence or contributor ownership makes it useful.
