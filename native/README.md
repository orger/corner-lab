# Corner Lab for macOS

Run `bash scripts/build-mac.sh` from the project folder. It compiles a Swift AppKit/WKWebView shell and packages all files from `app/` into `dist/Corner Lab.app`. The app works offline and requires no Node runtime. The build requires Apple Command Line Tools and targets macOS 13 or later on the build Mac's architecture. The local app is ad hoc signed; distribution to other Macs would require separate signing/notarization.

The build draws the icon using `GenerateIcon.swift`, packages its PNG representations with the standard-library Python script `scripts/create-icns.py`, and verifies the app's signature. The bundle also includes the license, source credits, and user guide.

For native runtime checks, `bash scripts/test-native.sh` launches a separate test executable using the actual app interface and an isolated `.build/native-qa-<UUID>/data.json` file. It checks module loading, UI time entry, native persistence, previous-file backup, reload, and library rendering without modifying the normal application data file. It opens a temporary native window and requires permission to run GUI programs in restricted environments.

## Browser/native persistence contract

`window.cornerlabNative` exists before any page scripts execute inside the macOS app. It is absent in an ordinary browser. All methods return promises:

- `load()` resolves to the saved JSON value, or `null` on first use. Corrupt data rejects without modifying the file.
- `save(data)` atomically saves a JSON value and resolves to `{ saved: true }`. The previous file is retained as `data.previous.json`.
- `exportData(data)` opens a macOS Save panel and resolves to `{ exported: true }`, or `null` if cancelled.
- `exportText(filename, content, contentType = 'text/csv')` opens a macOS Save panel for UTF-8 text, useful for CSV. It resolves to `{ exported: true }`, or `null` if cancelled.
- `importData()` opens a macOS Open panel, parses a JSON file and returns its contents, or `null` if cancelled. The UI must validate its own schema and confirm replacement before calling `save()`.
- `info()` returns `{ platform: 'macOS', dataPath, version: '1.6.0' }`.

The app also dispatches `cornerlab-native-ready` on `window` at DOMContentLoaded. Calls use `window.webkit.messageHandlers.storage.postMessage({id, action, payload})` internally, with native responses sent through `window.__cornerlabNativeReply`.

The durable file is `~/Library/Application Support/Corner Lab/data.json`; a maximum of 50 MB is supported. Browser previews can use localStorage. Keep native save requests ordered and surface save failures to the user. All displayed app resources are served from the bundle under `cornerlab://app/`; external HTTP(S) links open in the user's browser. JavaScript alert, confirm and prompt use native dialogs.
