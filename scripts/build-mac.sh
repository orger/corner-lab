#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_BUNDLE="$PROJECT_ROOT/dist/Corner Lab.app"
MODULE_CACHE="$PROJECT_ROOT/.build/swift-module-cache"
mkdir -p "$APP_BUNDLE/Contents/MacOS" "$APP_BUNDLE/Contents/Resources/app" "$MODULE_CACHE"

if [ ! -f "$PROJECT_ROOT/app/index.html" ]; then
  echo "Missing app/index.html. Build the app interface before packaging." >&2
  exit 1
fi

swiftc "$PROJECT_ROOT/native/CornerLab.swift" \
  -swift-version 5 \
  -parse-as-library \
  -O \
  -target "$(uname -m)-apple-macosx13.0" \
  -module-cache-path "$MODULE_CACHE" \
  -framework AppKit -framework WebKit -framework UniformTypeIdentifiers \
  -o "$APP_BUNDLE/Contents/MacOS/CornerLab"

cp "$PROJECT_ROOT/native/Info.plist" "$APP_BUNDLE/Contents/Info.plist"
/usr/bin/ditto "$PROJECT_ROOT/app" "$APP_BUNDLE/Contents/Resources/app"
cp "$PROJECT_ROOT/LICENSE" "$PROJECT_ROOT/NOTICE" "$APP_BUNDLE/Contents/Resources/"
cp "$PROJECT_ROOT/docs/SOURCES.md" "$APP_BUNDLE/Contents/Resources/SOURCES.md"
cp "$PROJECT_ROOT/docs/USER-GUIDE.md" "$APP_BUNDLE/Contents/Resources/USER-GUIDE.md"
cp "$PROJECT_ROOT/docs/5X5-GUIDE.md" "$APP_BUNDLE/Contents/Resources/5X5-GUIDE.md"
swift -module-cache-path "$MODULE_CACHE" "$PROJECT_ROOT/native/GenerateIcon.swift" "$PROJECT_ROOT/.build/CornerLab.iconset"
python3 "$PROJECT_ROOT/scripts/create-icns.py" "$PROJECT_ROOT/.build/CornerLab.iconset" "$APP_BUNDLE/Contents/Resources/CornerLab.icns"
/usr/bin/plutil -lint "$APP_BUNDLE/Contents/Info.plist"
/usr/bin/codesign --force --sign - "$APP_BUNDLE"
/usr/bin/codesign --verify --strict "$APP_BUNDLE"
echo "Built: $APP_BUNDLE"
echo "Open the app in Finder, or run: open \"$APP_BUNDLE\""
