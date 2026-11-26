import { skewbFacelets, isSkewbFaceSolved } from './skewb.js';

export const SKEWB_COLORS = Object.freeze({ U: '#faf9f5', D: '#efcd53', F: '#54a487', B: '#6089cf', R: '#db7161', L: '#eeab5b' });
const names = { U: 'Top', D: 'Down', F: 'Front', B: 'Back', R: 'Right', L: 'Left' };
const point = (quad, u, v) => [0, 1].map(i => quad[0][i] * (1 - u) * (1 - v) + quad[1][i] * u * (1 - v) + quad[2][i] * u * v + quad[3][i] * (1 - u) * v);
const stickerPolygons = [
  [[.5, 0], [1, .5], [.5, 1], [0, .5]],
  [[0, 0], [.5, 0], [0, .5]],
  [[1, 0], [1, .5], [.5, 0]],
  [[1, 1], [.5, 1], [1, .5]],
  [[0, 1], [0, .5], [.5, 1]],
];
function faceSVG(face, colors, quad, labels, firstLayer = false) {
  const middle = point(quad, .5, .5);
  const fixed = firstLayer && face === 'D' ? [0, 3, 4].map(index => {
    // D is viewed from below: its rear corners are the lower two triangles.
    const [u, v] = index === 0 ? [.5, .68] : index === 3 ? [5 / 6, 5 / 6] : [1 / 6, 5 / 6];
    const [x, y] = point(quad, u, v);
    return `<circle data-fixed-sticker="D-${index}" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="2" fill="#29463b" stroke="white" stroke-width=".8"><title>${index === 0 ? 'Fixed bottom centre' : 'Fixed rear-bottom corner'}</title></circle>`;
  }).join('') : '';
  return `<g data-face="${face}" stroke="#29463b" stroke-width="1.3" stroke-linejoin="round">${stickerPolygons.map((polygon, index) =>
    `<polygon data-sticker="${face}-${index}" data-color="${colors[index]}" fill="${SKEWB_COLORS[colors[index]]}" points="${polygon.map(([u, v]) => point(quad, u, v).map(n => n.toFixed(2)).join(',')).join(' ')}"/>`).join('')}${labels ? `<text x="${middle[0]}" y="${middle[1] + 3.5}" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="700" fill="#29463b" stroke="#fff" stroke-width="2.6" paint-order="stroke">${face}</text>` : ''}${fixed}</g>`;
}
const square = (x, y, size) => [[x, y], [x + size, y], [x + size, y + size], [x, y + size]];

/** The three visible faces share physical corners; the other three outside
 * views make every centre and corner sticker visible. In particular the actual
 * completed bottom colour is shown instead of assuming every case is white.
 */
export function skewbSVG(state, options = {}) {
  const { size = 460, net = false, labels = true, firstLayer = false } = typeof options === 'number' ? { size: options } : options;
  const faces = skewbFacelets(state);
  if (net) {
    const positions = { U: [58, 4], L: [4, 58], F: [58, 58], R: [112, 58], B: [166, 58], D: [58, 112] };
    return `<svg class="skewb-diagram" width="${size}" style="max-width:100%;height:auto" viewBox="0 0 220 166" role="img" aria-label="Skewb, all six faces viewed from outside"><title>Skewb sticker state</title>${Object.entries(positions).map(([face, [x, y]]) => faceSVG(face, faces[face], square(x, y, 50), labels, firstLayer)).join('')}</svg>`;
  }
  const main = [
    ['U', [[110, 18], [195, 64], [110, 112], [25, 64]]],
    ['F', [[25, 64], [110, 112], [110, 222], [25, 174]]],
    ['R', [[110, 112], [195, 64], [195, 174], [110, 222]]],
  ];
  const bottomSolved = isSkewbFaceSolved(state, 'D');
  return `<svg class="skewb-diagram" width="${size}" style="max-width:100%;height:auto" viewBox="0 0 334 270" role="img" aria-label="Skewb top, front and right faces, with separate left, back and bottom outside views${bottomSolved ? '; completed side on the bottom' : ''}"><title>Skewb actual sticker colours</title>${main.map(([face, quad]) => faceSVG(face, faces[face], quad, labels)).join('')}${['L', 'B', 'D'].map((face, i) => {
    const y = 20 + i * 80;
    return `${labels ? `<text x="274" y="${y - 6}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#526b60">${names[face]}</text>` : ''}${faceSVG(face, faces[face], square(245, y, 58), labels, firstLayer)}`;
  }).join('')}${labels ? `<text x="110" y="249" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#526b60">Top · front · right</text><text x="274" y="249" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#526b60">${firstLayer ? 'Dots: fixed pieces' : bottomSolved ? 'Completed side ↓' : 'Outside views'}</text>` : ''}</svg>`;
}
