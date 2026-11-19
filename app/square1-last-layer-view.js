import { square1LayerPieces } from './square1.js';

const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const point = (radius, degrees) => { const angle = degrees * Math.PI / 180; return [Math.cos(angle) * radius, Math.sin(angle) * radius]; };
const coords = pair => pair.map(value => value.toFixed(3)).join(',');
const colours = { white: '#fffdf6', yellow: '#f5d34d', green: '#319b68', red: '#df5748', blue: '#477abe', orange: '#f0a04a' };
const sideStickers = {
  TC: [['blue', 'red'], ['red', 'green'], ['green', 'orange'], ['orange', 'blue']],
  TE: [['red'], ['green'], ['orange'], ['blue']],
  BC: [['blue', 'orange'], ['orange', 'green'], ['green', 'red'], ['red', 'blue']],
  BE: [['blue'], ['orange'], ['green'], ['red']],
};

/** Outside views use the same geometry as the cube-shape trainer. Piece IDs
 * retain their U/D sticker colour and the clockwise order of their side
 * stickers through every slice. The bottom outside view mirrors left/right;
 * green front is toward the bottom of both solved diagrams.
 */
export function square1LastLayerSVG(state, options = {}) {
  const { stage = 'obl', size = 460, labels = true } = typeof options === 'number' ? { size: options } : options;
  const ep = stage === 'ep', radius = 47, endpoint = radius / Math.cos(Math.PI / 12);
  const label = ep ? 'edge permutation' : 'orientation of both layers';
  return `<svg class="square1-diagram square1-last-layer-diagram" width="${size}" viewBox="0 0 380 225" role="img" aria-label="Square-1 ${label}. Top and bottom outside views. White and yellow show layer orientation${ep ? '; side stickers show permutation' : ''}. Dashed lines mark the slice."><title>Square-1 ${label}</title>${[['Top', state.top, -75], ['Bottom', state.bottom, -105]].map(([name, layer, base], index) => {
    return `<g transform="translate(${index * 190 + 95},100)">${labels ? `<text x="0" y="-82" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#29463b">${name} · outside view</text>` : ''}${square1LayerPieces(layer).map(piece => {
      const begin = base + piece.start * 30, end = begin + piece.width * 30;
      const outer = piece.width === 2 ? [point(endpoint, begin), point(radius * Math.SQRT2, (begin + end) / 2), point(endpoint, end)] : [point(endpoint, begin), point(endpoint, end)];
      const colour = piece.id[0] === 'T' ? 'white' : 'yellow';
      const sides = sideStickers[piece.id.slice(0, 2)]?.[Number(piece.id[2])] || [];
      const stickers = ep ? sides.map((side, edge) => {
        const a = outer[edge], b = outer[edge + 1];
        if (!a || !b) return '';
        const points = [a, b, b.map(v => v * .82), a.map(v => v * .82)];
        return `<polygon data-sticker="side" data-colour="${side}" points="${points.map(coords).join(' ')}" fill="${colours[side]}" stroke="#334b40" stroke-width=".7"/>`;
      }).join('') : '';
      return `<g data-piece="${esc(piece.id)}" data-width="${piece.width}"><polygon data-sticker="face" data-colour="${colour}" points="0,0 ${outer.map(coords).join(' ')}" fill="${colours[colour]}" stroke="#45634e" stroke-width="1.3" stroke-linejoin="round"/>${stickers}</g>`;
    }).join('')}<line x1="${point(74, base)[0].toFixed(3)}" y1="${point(74, base)[1].toFixed(3)}" x2="${point(74, base + 180)[0].toFixed(3)}" y2="${point(74, base + 180)[1].toFixed(3)}" stroke="#9b5f55" stroke-width="1.2" stroke-dasharray="4 3" pointer-events="none"/><circle r="2" fill="#45634e"/>${labels ? '<text x="0" y="82" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#526b60">Front</text>' : ''}</g>`;
  }).join('')}${labels ? `<text x="190" y="216" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#526b60">${ep ? `Equator ${state.middleFlipped ? 'flipped' : 'square'} · match the illustrated grip` : 'Orient both colours · permutation and equator are free'}</text>` : ''}</svg>`;
}
