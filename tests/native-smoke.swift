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
    static var expandedAttemptIDs: [String: String] = [:]

    static func main() throws {
        let root = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
        let output = root.appendingPathComponent(".build/native-qa-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
        store = output.appendingPathComponent("data.json")
        delegate = AppDelegate(resourceRoot: root.appendingPathComponent("app", isDirectory: true), storeURL: store, onLoad: run)
        NSApplication.shared.delegate = delegate
        DispatchQueue.main.asyncAfter(deadline: .now() + 60) { fail("Native smoke test timed out.") }
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
        webView.callAsyncJavaScript(code, arguments: ["expectedAttemptID": attemptID, "expectedExpandedIDs": expandedAttemptIDs], in: nil, in: .page) { result in
            switch result {
            case .failure(let error):
                let details = (error as NSError).userInfo["WKJavaScriptExceptionMessage"] as? String
                fail(details ?? error.localizedDescription)
            case .success(let value):
                if let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]), let json = String(data: data, encoding: .utf8) { print(json) }
                if phase == 0 {
                    guard let details = value as? [String: Any], let id = details["attemptID"] as? String else { fail("Test result did not contain an attempt ID.") }
                    attemptID = id
                    guard let ids = details["expandedAttemptIDs"] as? [String: String], ids.count == 3 else { fail("New trainer results were not returned.") }
                    expandedAttemptIDs = ids
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
                        print("PASS: Native modules, Square-1 OBL/EP and Skewb NS2, 390px phone layout, UI, bridge, durable save, backup, reload, and isolated data path. Fixture: \(store.path)")
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
    assert(document.querySelector('#trainer-select').options.length === 7, 'Seven trainers must be available');
    const expandedTrainers = [
      { id: 'square1-obl', branch: 'sq1obl', count: 185, seconds: 8.25 },
      { id: 'square1-ep', branch: 'sq1ep', count: 99, seconds: 10.5 },
      { id: 'skewb-ns2', branch: 'skewbns2', count: 131, seconds: 7.1 }
    ];
    const chooseTrainer = id => {
      const select = document.querySelector('#trainer-select');
      select.value = id; select.dispatchEvent(new Event('change', { bubbles: true }));
      assert(document.querySelector('#trainer-select').value === id, 'Trainer selection failed: ' + id);
    };
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
    const expandedAttemptIDs = {};
    for (const item of expandedTrainers) {
      chooseTrainer(item.id);
      assert(document.querySelector('#lte-manual'), item.id + ' native practice missing');
      assert(document.querySelector('.lte-preview svg'), item.id + ' diagram missing');
      assert(document.querySelector('[data-lte-setting="scrambleStyle"]')?.value === 'disguised', item.id + ' default setup style incorrect');
      document.querySelector('#lte-manual').value = String(item.seconds);
      document.querySelector('[data-action="lte-manual"]').click();
      for (let i = 0; i < 80; i++) { saved = await window.cornerlabNative.load(); if (saved[item.branch]?.attempts.length === 1) break; await wait(50); }
      const record = saved[item.branch]?.attempts[0];
      assert(record?.seconds === item.seconds, item.id + ' manual result was not persisted');
      assert(record.scrambleStyle === 'disguised', item.id + ' setup metadata missing');
      if (item.branch.startsWith('sq1')) {
        assert(record.layerAlignment === 'random', item.id + ' alignment not retained');
        assert([-3, 0, 3, 6].includes(record.initialTop) && [-3, 0, 3, 6].includes(record.initialBottom), item.id + ' invalid quarter-turn metadata');
      } else assert(!Object.hasOwn(record, 'layerAlignment'), 'Skewb stored Square-1-only conditions');
      assert(summarize(saved[item.branch].attempts).median === item.seconds, item.id + ' statistics cannot read the result');
      assert(document.querySelector('.scramble-completed'), item.id + ' completed scramble warning missing');
      expandedAttemptIDs[item.branch] = record.id;
    }
    assert(saved.attempts.length === 1 && saved.sq1.attempts.length === 1, 'New trainers changed existing histories');
    const returnTrainer = document.querySelector('#trainer-select');
    returnTrainer.value = '2x2'; returnTrainer.dispatchEvent(new Event('change', { bubbles: true }));
    for (let i = 0; i < 80; i++) { saved = await window.cornerlabNative.load(); if (saved.trainer === '2x2') break; await wait(50); }
    await window.cornerlabNative.save(saved);
    return { phase: 'before-reload', cases: CASES.length, seconds: saved.attempts[0].seconds, attemptID: saved.attempts[0].id, expandedAttemptIDs, nativeMethods: Object.keys(window.cornerlabNative), dataPath: info.dataPath };
    """# }

    static var secondPass: String { ready + #"""
    const loaded = await window.cornerlabNative.load();
    assert(loaded.attempts.length === 1 && loaded.attempts[0].id === expectedAttemptID, 'Saved JSON did not survive reload');
    assert(loaded.attempts[0].seconds === 4.25, 'Attempt changed after reload');
    assert(loaded.sq1.attempts.length === 1 && loaded.sq1.attempts[0].seconds === 6.75, 'Square-1 history changed after reload');
    for (const item of expandedTrainers) {
      const records = loaded[item.branch]?.attempts;
      assert(records?.length === 1 && records[0].seconds === item.seconds && records[0].id === expectedExpandedIDs[item.branch], item.id + ' history changed after reload');
    }
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
    const expandedLibraries = {};
    for (const item of expandedTrainers) {
      chooseTrainer(item.id);
      for (const tab of ['library', 'insights', 'settings', 'train']) {
        document.querySelector('[data-action="nav"][data-page="' + tab + '"]').click();
        await wait(50);
        assert(innerWidth === 390, 'Phone viewport width was not applied');
        assert(document.documentElement.scrollWidth <= innerWidth + 1, item.id + ' phone layout overflow on ' + tab);
        if (tab === 'library') {
          expandedLibraries[item.branch] = document.querySelectorAll('.lte-case').length;
          assert(expandedLibraries[item.branch] === item.count, item.id + ' library coverage mismatch');
        }
        if (tab === 'insights') {
          assert(document.querySelector('[data-progress="set"]')?.value === item.id, item.id + ' progress not selected');
          assert(document.querySelector('.progress-plot svg'), item.id + ' progress chart missing');
        }
      }
      assert(document.querySelector('.lte-preview svg'), item.id + ' phone preview missing');
    }
    window.scrollTo(0, 0);
    await wait(100);
    return { phase: 'after-reload', phoneWidth: innerWidth, square1Attempts: loaded.sq1.attempts.length, restoredAttempts: loaded.attempts.length, libraryCards, expandedLibraries };
    """# }
}
