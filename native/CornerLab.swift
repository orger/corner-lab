import AppKit
@preconcurrency import WebKit
import UniformTypeIdentifiers

/// All app resources are local. The custom origin allows ES modules to work offline.
final class AppSchemeHandler: NSObject, WKURLSchemeHandler {
    private let root: URL

    init(root: URL) {
        self.root = root.standardizedFileURL.resolvingSymlinksInPath()
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url, url.scheme == "cornerlab", url.host == "app" else {
            urlSchemeTask.didFailWithError(URLError(.unsupportedURL))
            return
        }
        let path = url.path.isEmpty || url.path == "/" ? "index.html" : String(url.path.dropFirst())
        let file = root.appendingPathComponent(path).standardizedFileURL.resolvingSymlinksInPath()
        guard file.path.hasPrefix(root.path + "/"), let data = try? Data(contentsOf: file) else {
            urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        let types = ["html": "text/html", "js": "text/javascript", "mjs": "text/javascript", "css": "text/css", "json": "application/json", "svg": "image/svg+xml", "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp", "ico": "image/x-icon", "woff": "font/woff", "woff2": "font/woff2"]
        let mime = types[file.pathExtension.lowercased()] ?? "application/octet-stream"
        let response = URLResponse(url: url, mimeType: mime, expectedContentLength: data.count, textEncodingName: mime.hasPrefix("text/") || mime == "application/json" ? "utf-8" : nil)
        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var schemeHandler: AppSchemeHandler!
    private let storeURL: URL
    private let resourceRoot: URL
    private let onLoad: ((WKWebView) -> Void)?
    private let maximumDataSize = 50 * 1024 * 1024

    init(resourceRoot: URL? = nil, storeURL: URL? = nil, onLoad: ((WKWebView) -> Void)? = nil) {
        self.resourceRoot = resourceRoot ?? Bundle.main.resourceURL!.appendingPathComponent("app", isDirectory: true)
        self.storeURL = storeURL ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
            .appendingPathComponent("Corner Lab", isDirectory: true).appendingPathComponent("data.json")
        self.onLoad = onLoad
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        createMenu()
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
        schemeHandler = AppSchemeHandler(root: resourceRoot)
        configuration.setURLSchemeHandler(schemeHandler, forURLScheme: "cornerlab")
        configuration.userContentController.add(self, name: "storage")
        configuration.userContentController.addUserScript(WKUserScript(source: Self.bridgeScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = false
        if #available(macOS 13.3, *) { webView.isInspectable = true }
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1440, height: 940), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Corner Lab"
        window.minSize = NSSize(width: 980, height: 680)
        window.contentView = webView
        window.center()
        window.setFrameAutosaveName("CornerLabMainWindow")
        window.makeKeyAndOrderFront(nil)
        window.isReleasedWhenClosed = false
        NSApp.activate(ignoringOtherApps: true)
        webView.load(URLRequest(url: URL(string: "cornerlab://app/index.html")!))
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { onLoad?(webView) }

    private func createMenu() {
        let menu = NSMenu()
        let appItem = NSMenuItem()
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "About Corner Lab", action: #selector(showAbout), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Hide Corner Lab", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Quit Corner Lab", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        menu.addItem(appItem)
        let editItem = NSMenuItem()
        let editMenu = NSMenu(title: "Edit")
        editMenu.addItem(withTitle: "Undo", action: Selector(("undo:")), keyEquivalent: "z")
        editMenu.addItem(withTitle: "Redo", action: Selector(("redo:")), keyEquivalent: "Z")
        editMenu.addItem(.separator())
        editMenu.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = editMenu
        menu.addItem(editItem)
        let windowItem = NSMenuItem()
        let windowMenu = NSMenu(title: "Window")
        windowMenu.addItem(withTitle: "Minimize", action: #selector(NSWindow.miniaturize(_:)), keyEquivalent: "m")
        windowMenu.addItem(withTitle: "Close Window", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        windowMenu.addItem(withTitle: "Reload", action: #selector(reload), keyEquivalent: "r")
        windowItem.submenu = windowMenu
        menu.addItem(windowItem)
        NSApp.mainMenu = menu
        NSApp.windowsMenu = windowMenu
    }

    @objc private func showAbout() {
        NSApp.orderFrontStandardAboutPanel(options: [.applicationName: "Corner Lab", .applicationVersion: "1.6.0", .credits: NSAttributedString(string: "2×2 CLL/EG and 5×5 last-two-edges / last-two-centres practice.\nYour algorithms and practice history stay on this Mac.")])
    }

    @objc private func reload() { webView.reload() }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame,
              message.frameInfo.request.url?.scheme == "cornerlab",
              message.frameInfo.request.url?.host == "app",
              let body = message.body as? [String: Any],
              let id = body["id"] as? String,
              let action = body["action"] as? String else { return }
        do {
            switch action {
            case "load":
                if !FileManager.default.fileExists(atPath: storeURL.path) { reply(id, value: NSNull()); return }
                let data = try Data(contentsOf: storeURL)
                let value = try JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed])
                reply(id, value: value)
            case "save":
                let payload = body["payload"] ?? NSNull()
                let data = try encode(payload)
                try FileManager.default.createDirectory(at: storeURL.deletingLastPathComponent(), withIntermediateDirectories: true)
                if let previous = try? Data(contentsOf: storeURL) {
                    try previous.write(to: storeURL.deletingLastPathComponent().appendingPathComponent("data.previous.json"), options: .atomic)
                }
                try data.write(to: storeURL, options: .atomic)
                reply(id, value: ["saved": true])
            case "export":
                let data = try encode(body["payload"] ?? NSNull())
                let panel = NSSavePanel()
                panel.title = "Export Corner Lab Data"
                panel.nameFieldStringValue = "corner-lab-backup-\(Self.dateStamp()).json"
                panel.allowedContentTypes = [.json]
                panel.beginSheetModal(for: window) { [weak self] result in
                    guard let self = self else { return }
                    guard result == .OK, let url = panel.url else { self.reply(id, value: NSNull()); return }
                    do { try data.write(to: url, options: .atomic); self.reply(id, value: ["exported": true]) }
                    catch { self.reply(id, error: error.localizedDescription) }
                }
            case "exportText":
                guard let payload = body["payload"] as? [String: Any], let content = payload["content"] as? String else {
                    reply(id, error: "Text export requires text content."); return
                }
                let data = Data(content.utf8)
                guard data.count <= maximumDataSize else {
                    reply(id, error: "The text exceeds the 50 MB export limit."); return
                }
                let panel = NSSavePanel()
                panel.title = "Export Corner Lab Data"
                let requestedName = (payload["filename"] as? String) ?? "corner-lab-export.csv"
                panel.nameFieldStringValue = URL(fileURLWithPath: requestedName).lastPathComponent
                let type = payload["contentType"] as? String ?? "text/csv"
                panel.allowedContentTypes = [UTType(mimeType: type) ?? .plainText]
                panel.beginSheetModal(for: window) { [weak self] result in
                    guard let self = self else { return }
                    guard result == .OK, let url = panel.url else { self.reply(id, value: NSNull()); return }
                    do { try data.write(to: url, options: .atomic); self.reply(id, value: ["exported": true]) }
                    catch { self.reply(id, error: error.localizedDescription) }
                }
            case "import":
                let panel = NSOpenPanel()
                panel.title = "Import Corner Lab Data"
                panel.allowedContentTypes = [.json]
                panel.allowsMultipleSelection = false
                panel.canChooseDirectories = false
                panel.beginSheetModal(for: window) { [weak self] result in
                    guard let self = self else { return }
                    guard result == .OK, let url = panel.url else { self.reply(id, value: NSNull()); return }
                    do {
                        let data = try Data(contentsOf: url)
                        guard data.count <= self.maximumDataSize else { throw NSError(domain: "CornerLab", code: 1, userInfo: [NSLocalizedDescriptionKey: "The selected file exceeds the 50 MB import limit."]) }
                        let value = try JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed])
                        self.reply(id, value: value)
                    } catch { self.reply(id, error: error.localizedDescription) }
                }
            case "info": reply(id, value: ["platform": "macOS", "dataPath": storeURL.path, "version": "1.6.0"])
            default: reply(id, error: "Unknown native storage request.")
            }
        } catch { reply(id, error: error.localizedDescription) }
    }

    private func encode(_ value: Any) throws -> Data {
        let data = try JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed, .prettyPrinted, .sortedKeys])
        guard data.count <= maximumDataSize else { throw NSError(domain: "CornerLab", code: 1, userInfo: [NSLocalizedDescriptionKey: "The data exceeds the 50 MB storage limit."]) }
        return data
    }

    private func reply(_ id: String, value: Any = NSNull(), error: String? = nil) {
        var response: [String: Any] = ["id": id, "value": value]
        if let error = error { response["error"] = error }
        guard let data = try? JSONSerialization.data(withJSONObject: response, options: [.fragmentsAllowed]),
              let json = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.__cornerlabNativeReply(\(json));", completionHandler: nil)
    }

    private static func dateStamp() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if url.scheme == "cornerlab" && url.host == "app" { decisionHandler(.allow); return }
        if url.scheme == "https" || url.scheme == "http" { NSWorkspace.shared.open(url) }
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url, url.scheme == "https" || url.scheme == "http" { NSWorkspace.shared.open(url) }
        return nil
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = NSAlert()
        alert.messageText = "Corner Lab"
        alert.informativeText = message
        alert.addButton(withTitle: "OK")
        alert.beginSheetModal(for: window) { _ in completionHandler() }
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert()
        alert.messageText = "Corner Lab"
        alert.informativeText = message
        alert.alertStyle = .warning
        alert.addButton(withTitle: "Confirm")
        alert.addButton(withTitle: "Cancel")
        alert.beginSheetModal(for: window) { response in completionHandler(response == .alertFirstButtonReturn) }
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = NSAlert()
        alert.messageText = "Corner Lab"
        alert.informativeText = prompt
        let input = NSTextField(frame: NSRect(x: 0, y: 0, width: 360, height: 26))
        input.stringValue = defaultText ?? ""
        alert.accessoryView = input
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")
        alert.beginSheetModal(for: window) { response in completionHandler(response == .alertFirstButtonReturn ? input.stringValue : nil) }
    }

    private static let bridgeScript = #"""
    (() => {
      const pending = new Map();
      let nextId = 0;
      function request(action, payload) {
        return new Promise((resolve, reject) => {
          const id = String(++nextId);
          pending.set(id, { resolve, reject });
          window.webkit.messageHandlers.storage.postMessage({ id, action, payload: payload ?? null });
        });
      }
      window.__cornerlabNativeReply = ({ id, value, error }) => {
        const callback = pending.get(id);
        if (!callback) return;
        pending.delete(id);
        error ? callback.reject(new Error(error)) : callback.resolve(value);
      };
      Object.defineProperty(window, 'cornerlabNative', { value: Object.freeze({
        load: () => request('load'),
        save: data => request('save', data),
        exportData: data => request('export', data),
        exportText: (filename, content, contentType = 'text/csv') => request('exportText', { filename, content, contentType }),
        importData: () => request('import'),
        info: () => request('info'),
      }), writable: false });
      document.addEventListener('DOMContentLoaded', () => window.dispatchEvent(new Event('cornerlab-native-ready')), { once: true });
    })();
    """#
}

#if !NATIVE_SMOKE_TEST
@main
struct CornerLabMain {
    static var delegate: AppDelegate!
    static func main() {
        let application = NSApplication.shared
        delegate = AppDelegate()
        application.delegate = delegate
        application.run()
    }
}
#endif
