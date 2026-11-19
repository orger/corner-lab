import { square1LayerPieces, square1LayerSignature } from './square1.js';
import { square1ShapeName } from './catalog-square1.js';
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const point = (radius, degrees) => { const angle = degrees * Math.PI / 180; return [Math.cos(angle) * radius, Math.sin(angle) * radius]; };
const coords = pair => pair.map(value => value.toFixed(3)).join(',');
/** Real silhouettes: corners have a 90° outside vertex, edges a flat face.
 * Both layers are viewed directly from outside; the dashed cut is mirrored on
 * the bottom. Thus the standard cube-shape start has two axis-aligned squares.
 * Colours distinguish corner/edge geometry, not permutation or orientation.
 */
export function square1SVG(state, options = {}) {
  const { size = 460, labels = true, shapeNames = true } = typeof options === 'number' ? { size: options } : options;
  const layers = [['Top', state.top, -75], ['Bottom', state.bottom, -105]];
  const names = layers.map(([, layer]) => square1ShapeName(square1LayerSignature(layer)));
  return `<svg class="square1-diagram" width="${size}" viewBox="0 0 380 215" role="img" aria-label="Square-1 top and bottom outside views${shapeNames ? ': ' + esc(names.join(' / ')) : ''}. Dashed lines mark the slice."><title>Square-1 cube shape</title>${layers.map(([label, layer, base], index) => {
    const pieces = square1LayerPieces(layer), radius = 47, endpoint = radius / Math.cos(Math.PI / 12);
    return `<g transform="translate(${index * 190 + 95},102)">${labels ? `<text x="0" y="-83" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#29463b">${label} · outside view</text>` : ''}${pieces.map(piece => {
      const begin = base + piece.start * 30, end = begin + piece.width * 30;
      const outer = piece.width === 2 ? [point(endpoint, begin), point(radius * Math.SQRT2, (begin + end) / 2), point(endpoint, end)] : [point(endpoint, begin), point(endpoint, end)];
      return `<polygon data-piece="${esc(piece.id)}" data-width="${piece.width}" points="0,0 ${outer.map(coords).join(' ')}" fill="${piece.width === 2 ? '#dce9cb' : '#fff7cf'}" stroke="#45634e" stroke-width="1.3" stroke-linejoin="round"/>`;
    }).join('')}<line x1="${point(75, base)[0].toFixed(3)}" y1="${point(75, base)[1].toFixed(3)}" x2="${point(75, base + 180)[0].toFixed(3)}" y2="${point(75, base + 180)[1].toFixed(3)}" stroke="#b65949" stroke-width="1.4" stroke-dasharray="4 3"/><circle r="2" fill="#45634e"/>${labels && shapeNames ? `<text x="0" y="91" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#526b60">${esc(names[index])}</text>` : ''}</g>`;
  }).join('')}</svg>`;
}
