#!/usr/bin/env python3
from __future__ import annotations

import json
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "manifest.json"
DIST = ROOT / "dist"

RUNTIME_PATHS = [
    ROOT / "manifest.json",
    ROOT / "src",
    ROOT / "public",
]


def iter_files(path: pathlib.Path):
    if path.is_file():
        yield path
        return
    for item in sorted(path.rglob("*")):
        if item.is_file():
            yield item


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    version = manifest["version"]

    DIST.mkdir(exist_ok=True)
    target = DIST / f"clearguide-studio-v{version}.zip"

    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for runtime_path in RUNTIME_PATHS:
            for file_path in iter_files(runtime_path):
                archive.write(file_path, file_path.relative_to(ROOT).as_posix())

    print(target)


if __name__ == "__main__":
    main()
