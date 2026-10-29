import { facelets, reductionStatus } from './cube5.js';

export const COLORS5 = { U: '#efcd53', D: '#faf9f5', F: '#54a487', B: '#6089cf', R: '#db7161', L: '#eeab5b' };

export function cubeSVG5(state, { size = 230, net = false } = {}) {
  const f = facelets(state);
  if (net) {
    const positions = { U: [54, 2], L: [2, 54], F: [54, 54], R: [106, 54], B: [158, 54], D: [54, 106] };
    return `<svg width="${size}" viewBox="0 0 210 158" role="img" aria-label="5 by 5 cube, all six faces">${Object.entries(positions).map(([face, [x, y]]) =>
      f[face].map((color, index) => `<rect x="${x + index % 5 * 10}" y="${y + Math.floor(index / 5) * 10}" width="9" height="9" rx="1" fill="${COLORS5[color]}" stroke="#334f45" stroke-width=".6"/>`).join('') +
      `<text x="${x + 24.5}" y="${y + 28}" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="700" fill="#29463b" stroke="#fff" stroke-width="1.8" paint-order="stroke">${face}</text>`
    ).join('')}</svg>`;
  }
  const faces = [['U', [[90, 12], [163, 50], [90, 90], [17, 50]]], ['F', [[17, 50], [90, 90], [90, 176], [17, 135]]], ['R', [[90, 90], [163, 50], [163, 135], [90, 176]]]];
  const point = (q, u, v) => [q[0][0] * (1 - u) * (1 - v) + q[1][0] * u * (1 - v) + q[2][0] * u * v + q[3][0] * (1 - u) * v,
    q[0][1] * (1 - u) * (1 - v) + q[1][1] * u * (1 - v) + q[2][1] * u * v + q[3][1] * (1 - u) * v];
  return `<svg width="${size}" viewBox="0 0 180 191" role="img" aria-label="5 by 5 cube, upper front and right faces"><g stroke="#29463b" stroke-width="1.5" stroke-linejoin="round">${faces.map(([face, q]) => f[face].map((color, index) => {
    const u = index % 5 / 5, v = Math.floor(index / 5) / 5;
    const points = [[u, v], [u + .2, v], [u + .2, v + .2], [u, v + .2]].map(([x, y]) => point(q, x, y).join(',')).join(' ');
    return `<polygon points="${points}" fill="${COLORS5[color]}"/>`;
  }).join('')).join('')}</g></svg>`;
}

/** Both stickers of all three physical edge cubies are always shown together.
 * Every unpaired group is shown, including back/bottom locations. Pass
 * onlyUnpaired:false for all 12 groups, with unpaired groups first.
 */
export function edgeSVG5(state, options = {}) {
  const { size = 460, onlyUnpaired = true } = typeof options === 'number' ? { size: options } : options;
  const status = reductionStatus(state);
  const edges = [...(onlyUnpaired ? status.unpaired : status.edges)].sort((a, b) => Number(a.paired) - Number(b.paired));
  if (!edges.length) return `<svg class="edge-diagram" width="${size}" viewBox="0 0 300 52" role="img" aria-label="All twelve edge groups are paired${status.centresSolved ? '' : '; centers remain mixed'}"><rect x="1" y="1" width="298" height="50" rx="7" fill="#f7faf5" stroke="#dbe3d6"/><text x="150" y="23" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#29463b">All 12 edge groups are paired</text><text x="150" y="39" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#658456">${status.centresSolved ? 'Centers are solved' : 'Centers remain mixed'}</text></svg>`;
  const columns = Math.min(4, edges.length), rows = Math.ceil(edges.length / columns);
  return `<svg class="edge-diagram" width="${size}" viewBox="0 0 ${columns * 115} ${rows * 74}" role="img" aria-label="${onlyUnpaired ? 'Unpaired' : 'All twelve'} 5 by 5 edge groups; each column shows two stickers on one cubie">${edges.map((edge, index) => {
    const x = index % columns * 115, y = Math.floor(index / columns) * 74;
    return `<g transform="translate(${x} ${y})"><rect x="1" y="1" width="109" height="68" rx="6" fill="${edge.paired ? '#f7faf5' : '#fff5dc'}" stroke="${edge.paired ? '#dbe3d6' : '#c3a450'}"/><text x="9" y="15" font-family="sans-serif" font-size="11" font-weight="700" fill="#29463b">${edge.name}</text><text x="102" y="15" text-anchor="end" font-family="sans-serif" font-size="8" fill="${edge.paired ? '#658456' : '#916b13'}">${edge.paired ? 'paired' : 'unpaired'}</text>${edge.faces.map((face, row) =>
      `<text x="10" y="${35 + row * 20}" font-family="sans-serif" font-size="9" fill="#526b60">${face}</text>` + edge.pairs.map((pair, col) =>
        `<rect x="${25 + col * 24}" y="${22 + row * 20}" width="22" height="18" rx="2" fill="${COLORS5[pair[row]]}" stroke="#526b60" stroke-width=".8"/>`).join('')
    ).join('')}</g>`;
  }).join('')}</svg>`;
}
