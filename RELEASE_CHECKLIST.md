# ClearGuide Public Release Checklist

## Before First Public Push

- Review the generated `LICENSE`, `COMMERCIAL_LICENSE.md`, and `TRADEMARK.md`
- Review `manifest.json` name and description for store-facing branding
- Load the repo as an unpacked extension and run a manual smoke test
- Open `automated_test.html` and confirm the lightweight checks pass
- Verify `player_demo.html` and `player_demo_complete.html` still work
- Confirm no internal audit or roadmap docs were copied in by mistake
- Add repository URL fields if you want to expose GitHub metadata later

## Before Each Release

- Re-run `./scripts/export-public-repos.sh` from the private monorepo
- Diff the exported folder before committing
- Verify icons and popup assets render correctly
- Confirm the SDK file and extension source changed together when needed
