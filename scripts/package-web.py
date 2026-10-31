#!/usr/bin/env python3
"""Package the reviewed source and built website without local runtime data."""

from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT_FILES = (
    ".gitignore", "AGENTS.md", "README.md", "LICENSE", "NOTICE", "package.json", "package-lock.json"
)
SOURCE_DIRECTORIES = {
    "app": {".html", ".css", ".js", ".webmanifest", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".woff", ".woff2"},
    "tests": {".js", ".swift"},
    "native": {".swift", ".plist", ".md"},
    "scripts": {".js", ".mjs", ".json", ".py", ".sh", ".swift", ".plist"},
    "docs": {".md"},
    ".github": {".yml", ".yaml"},
}
STATIC_SUFFIXES = {".html", ".css", ".js", ".webmanifest", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".woff", ".woff2", ".md"}
STATIC_ROOT_FILES = {"CNAME", ".nojekyll", "LICENSE", "NOTICE"}
EXCLUDED_DIRECTORIES = {"__pycache__", "node_modules", "dist", ".build", ".git", "tmp"}


def walk_files(directory):
    """Walk only ordinary source files; never follow a link outside the project."""
    for entry in sorted(directory.iterdir()):
        if entry.name in EXCLUDED_DIRECTORIES or entry.name == ".DS_Store":
            continue
        if entry.is_symlink():
            raise ValueError(f"Archives must not contain symbolic links: {entry}")
        if entry.is_dir():
            if not entry.name.startswith("."):
                yield from walk_files(entry)
        elif entry.is_file():
            yield entry


def source_files(root):
    files = []
    for name in SOURCE_ROOT_FILES:
        file = root / name
        if file.is_symlink():
            raise ValueError(f"Source must not contain symbolic links: {name}")
        if file.is_file():
            files.append(file)
    for directory, suffixes in SOURCE_DIRECTORIES.items():
        for file in walk_files(root / directory):
            if not file.name.startswith(".") and file.suffix in suffixes:
                files.append(file)
    return sorted(files, key=lambda file: file.relative_to(root).as_posix())


def static_files(root):
    files = []
    for file in walk_files(root):
        relative = file.relative_to(root)
        if relative.as_posix() in STATIC_ROOT_FILES or file.suffix in STATIC_SUFFIXES:
            files.append(file)
        else:
            raise ValueError(f"Unexpected file in the public web build: {relative}")
    required = {"index.html", "sw.js", "pwa.js", "manifest.webmanifest", "CNAME", ".nojekyll", "LICENSE", "NOTICE"}
    missing = required - {file.relative_to(root).as_posix() for file in files}
    if missing:
        raise ValueError("Build the website first; missing: " + ", ".join(sorted(missing)))
    if (root / "CNAME").read_text(encoding="utf-8").strip() != "cubing.orger.org":
        raise ValueError("The web build must target cubing.orger.org")
    return sorted(files, key=lambda file: file.relative_to(root).as_posix())


def write_archive(destination, root, files):
    # Stable timestamps avoid changing the ZIP when its source bytes are unchanged.
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with NamedTemporaryFile(dir=destination.parent, prefix=destination.name + ".", suffix=".tmp", delete=False) as handle:
            temporary = Path(handle.name)
        with ZipFile(temporary, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
            for file in files:
                entry = ZipInfo(file.relative_to(root).as_posix(), date_time=(1980, 1, 1, 0, 0, 0))
                entry.compress_type = ZIP_DEFLATED
                entry.create_system = 3
                entry.external_attr = (0o100000 | (file.stat().st_mode & 0o777)) << 16
                archive.writestr(entry, file.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
        temporary.replace(destination)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def main():
    site_root = PROJECT_ROOT / "dist" / "web"
    if not site_root.is_dir():
        raise SystemExit("Run npm run build:web before packaging.")
    public_files = static_files(site_root)
    project_files = source_files(PROJECT_ROOT)
    bundles = (
        ("Corner-Lab-GitHub-Pages.zip", PROJECT_ROOT, project_files),
        ("Corner-Lab-Web.zip", site_root, public_files),
    )
    for name, root, files in bundles:
        target = PROJECT_ROOT / "dist" / name
        write_archive(target, root, files)
        print(f"Packaged {len(files)} files: {target} ({target.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
