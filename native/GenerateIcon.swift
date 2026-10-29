import AppKit

// Draw the application icon at each actual pixel size for a crisp native icon.
let iconset = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
try FileManager.default.createDirectory(at: iconset, withIntermediateDirectories: true)

func color(_ hex: Int) -> NSColor {
    NSColor(srgbRed: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: 1)
}

func drawIcon(pixels: Int, filename: String) throws {
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: pixels, pixelsHigh: pixels, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    bitmap.size = NSSize(width: pixels, height: pixels)
    let context = NSGraphicsContext(bitmapImageRep: bitmap)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    context.cgContext.scaleBy(x: CGFloat(pixels) / 1024, y: CGFloat(pixels) / 1024)
    context.imageInterpolation = .high

    let background = NSBezierPath(roundedRect: NSRect(x: 58, y: 58, width: 908, height: 908), xRadius: 208, yRadius: 208)
    let shadow = NSShadow()
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.28)
    shadow.shadowBlurRadius = 30
    shadow.shadowOffset = NSSize(width: 0, height: -12)
    shadow.set()
    color(0x173F35).setFill()
    background.fill()
    NSShadow().set()

    let tiles: [(CGFloat, CGFloat, Int)] = [
        (224, 528, 0xE8C88A), (528, 528, 0xE8C88A),
        (224, 224, 0xE8C88A), (528, 224, 0xA9C3A3),
    ]
    for (x, y, tint) in tiles {
        let tile = NSBezierPath(roundedRect: NSRect(x: x, y: y, width: 272, height: 272), xRadius: 46, yRadius: 46)
        color(tint).setFill()
        tile.fill()
        let highlight = NSBezierPath(roundedRect: NSRect(x: x + 10, y: y + 248, width: 252, height: 8), xRadius: 4, yRadius: 4)
        NSColor.white.withAlphaComponent(0.20).setFill()
        highlight.fill()
    }

    NSGraphicsContext.restoreGraphicsState()
    let data = bitmap.representation(using: .png, properties: [:])!
    try data.write(to: iconset.appendingPathComponent(filename), options: .atomic)
}

for points in [16, 32, 128, 256, 512] {
    try drawIcon(pixels: points, filename: "icon_\(points)x\(points).png")
    try drawIcon(pixels: points * 2, filename: "icon_\(points)x\(points)@2x.png")
}
