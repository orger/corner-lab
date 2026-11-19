import AppKit
@preconcurrency import WebKit

/// Runs the actual native shell and application against isolated test storage.
/// Compile with -D NATIVE_SMOKE_TEST alongside native/CornerLab.swift.
@main
struct NativeSmoke {
    static var delegate: AppDelegate!
    static var phase = 0
    static var store: URL!
    static var attemptID = ""

    static func main() throws {
        let root = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
        let output = root.appendingPathComponent(".build/native-qa-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
        store = output.appendingPathComponent("data.json")
        delegate = AppDelegate(resourceRoot: root.appendingPathComponent("app", isDirectory: true), storeURL: store, onLoad: run)
        NSApplication.shared.delegate = delegate
        DispatchQueue.main.asyncAfter(deadline: .now() + 30) { fail("Native smoke test timed out.") }
        NSApplication.shared.run()
    }

    static func fail(_ message: String) -> Never {
        fputs("FAIL: \(message)\n", stderr)
        exit(1)
    }

    static func run(_ webView: WKWebView) {
        if phase == 1 {
            // Exercise the shared phone layout in the actual WebKit shell.
            webView.window?.minSize = NSSize(width: 320, height: 500)
            webView.window?.setContentSize(NSSize(width: 390, height: 844))
        }
        let code = phase == 0 ? firstPass : secondPass
        webView.callAsyncJavaScript(code, arguments: ["expectedAttemptID": attemptID], in: nil, in: .page) { result in
            switch result {
            case .failure(let error):
                let details = (error as NSError).userInfo["WKJavaScriptExceptionMessage"] as? String
                fail(details ?? error.localizedDescription)
            case .success(let value):
                if let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]), let json = String(data: data, encoding: .utf8) { print(json) }
                if phase == 0 {
                    guard let details = value as? [String: Any], let id = details["attemptID"] as? String else { fail("Test result did not contain an attempt ID.") }
                    attemptID = id
                    phase = 1
                    webView.reload()
                } else {
                    guard FileManager.default.fileExists(atPath: store.path),
                          FileManager.default.fileExists(atPath: store.deletingLastPathComponent().appendingPathComponent("data.previous.json").path) else { fail("Durable data or previous-file backup missing.") }
                    webView.takeSnapshot(with: nil) { image, error in
                        guard error == nil, let tiff = image?.tiffRepresentation,
                              let bitmap = NSBitmapImageRep(data: tiff),
                              let png = bitmap.representation(using: .png, properties: [:]) else { fail("Phone layout snapshot failed.") }
                        do { try png.write(to: store.deletingLastPathComponent().appendingPathComponent("phone-layout.png")) }
                        catch { fail("Could not save phone layout snapshot.") }
                        print("PASS: Native app modules, phone layout, UI, bridge, durable save, backup, reload, and isolated data path. Fixture: \(store.path)")
                        exit(0)
                    }
                }
            }
        }
    }

    static let ready = #"""
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    for (let i = 0; i < 120 && !document.querySelector('#manual-time'); i++) await wait(50);
    assert(document.querySelector('#manual-time'), 'App ES module did not initialize: ' + document.body.innerText);
    assert(document.querySelector('h1').textContent.includes('corner'), 'Practice UI missing');
    assert(!document.querySelector('.error'), document.querySelector('.error')?.textContent || 'Startup error');
    assert(window.cornerlabNative, 'Native bridge missing');
    """#

    static var firstPass: String { ready + #"""
    const { CASES } = await import('./catalog.js');
    const { summarize } = await import('./stats.js');
    const info = await window.cornerlabNative.info();
    assert(info.dataPath.includes('native-qa-'), 'Test must not use production data');
    const initial = await window.cornerlabNative.load();
    assert(initial && initial.attempts.length === 0, 'First use should have zero attempts');
    document.querySelector('#manual-time').value = '4.25';
    document.querySelector('[data-action="manual"]').click();
    let saved;
    for (let i = 0; i < 80; i++) { saved = await window.cornerlabNative.load(); if (saved.attempts.length === 1) break; await wait(50); }
    assert(saved.attempts.length === 1 && saved.attempts[0].seconds === 4.25, 'UI result was not persisted');
    assert(summarize(saved.attempts).median === 4.25, 'Stored time not recognized by statistics');
    assert(document.querySelector('.result-tools').textContent.includes('Saved locally'), 'Result confirmation missing');
    const trainer = document.querySelector('#trainer-select');
    trainer.value = 'square1'; trainer.dispatchEvent(new Event('change', { bubbles: true }));
    assert(document.querySelector('#lte-manual'), 'Square-1 native practice missing');
    assert(document.querySelector('.lte-preview svg'), 'Square-1 diagram missing');
    document.querySelector('#lte-manual').value = '6.75';
    document.querySelector('[data-action="lte-manual"]').click();
    for (let i = 0; i < 80; i++) { saved = await window.cornerlabNative.load(); if (saved.sq1?.attempts.length === 1) break; await wait(50); }
    assert(saved.sq1.attempts[0].seconds === 6.75, 'Square-1 native result was not persisted');
    assert(saved.sq1.attempts[0].scrambleStyle === 'disguised', 'Square-1 did not default to a disguised scramble');
    assert(saved.sq1.attempts[0].layerAlignment === 'random', 'Square-1 random layer orientation was not saved');
    assert(/\/\s*\(-?\d+,-?\d+\)$/.test(saved.sq1.attempts[0].scramble), 'Square-1 setup does not finish with a layer turn');
    assert(saved.attempts.length === 1, 'Square-1 changed the 2×2 history');
    const returnTrainer = document.querySelector('#trainer-select');
    returnTrainer.value = '2x2'; returnTrainer.dispatchEvent(new Event('change', { bubbles: true }));
    for (let i = 0; i < 80; i++) { saved = await window.cornerlabNative.load(); if (saved.trainer === '2x2') break; await wait(50); }
    await window.cornerlabNative.save(saved);
    return { phase: 'before-reload', cases: CASES.length, seconds: saved.attempts[0].seconds, attemptID: saved.attempts[0].id, nativeMethods: Object.keys(window.cornerlabNative), dataPath: info.dataPath };
    """# }

    static var secondPass: String { ready + #"""
    const loaded = await window.cornerlabNative.load();
    assert(loaded.attempts.length === 1 && loaded.attempts[0].id === expectedAttemptID, 'Saved JSON did not survive reload');
    assert(loaded.attempts[0].seconds === 4.25, 'Attempt changed after reload');
    assert(loaded.sq1.attempts.length === 1 && loaded.sq1.attempts[0].seconds === 6.75, 'Square-1 history changed after reload');
    document.querySelector('[data-action="nav"][data-page="settings"]').click();
    assert(document.body.innerText.includes('1 2×2 results'), 'App did not restore persisted history');
    assert(document.body.innerText.includes('Application Support'), 'Native settings mode missing');
    document.querySelector('[data-action="nav"][data-page="library"]').click();
    assert(document.querySelectorAll('.case-card').length > 0, 'Native library did not render');
    const trainer = document.querySelector('#trainer-select');
    trainer.value = 'square1'; trainer.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('[data-action="nav"][data-page="insights"]').click();
    assert(document.querySelector('[data-progress="set"]').value === 'square1', 'Square-1 progress not selected');
    assert(document.querySelector('.progress-plot svg'), 'Square-1 progress chart missing');
    document.querySelector('[data-action="nav"][data-page="library"]').click();
    assert(document.querySelectorAll('.lte-case').length > 0, 'Square-1 native library missing');
    const libraryCards = document.querySelectorAll('.lte-case').length;
    for (const tab of ['library', 'insights', 'settings', 'train']) {
      document.querySelector('[data-action="nav"][data-page="' + tab + '"]').click();
      await wait(50);
      assert(innerWidth === 390, 'Phone viewport width was not applied');
      assert(document.documentElement.scrollWidth <= innerWidth + 1, 'Phone layout overflow on ' + tab);
    }
    const alignment = document.querySelector('[data-lte-setting="layerAlignment"]');
    assert(alignment?.value === 'random', 'Starting layer orientation control missing');
    assert(document.querySelector('[data-lte-setting="scrambleStyle"]').value === 'disguised', 'Disguised scramble control missing');
    alignment.scrollIntoView({ block: 'center' });
    await wait(100);
    return { phase: 'after-reload', phoneWidth: innerWidth, square1Attempts: loaded.sq1.attempts.length, restoredAttempts: loaded.attempts.length, libraryCards };
    """# }
}
