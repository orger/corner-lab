import { reductionStatus } from './cube5.js';
import { COLORS5 } from './cubeview5.js';

/** Centre blocks in the current grip, with accurate outside-view orientation.
 * Grey outer borders indicate the surrounding (irrelevant) edges and corners.
 */
export function centreSVG5(state, options = {}) {
  const { size = 460, onlyUnsolved = true } = typeof options === 'number' ? { size: options } : options;
  const all = reductionStatus(state).centres;
  const centres = onlyUnsolved ? all.filter(centre => !centre.solved) : all;
  if (!centres.length) return `<svg class="centre-diagram" width="${size}" viewBox="0 0 300 52" role="img" aria-label="All six centres are solved"><rect x="1" y="1" width="298" height="50" rx="7" fill="#f7faf5" stroke="#dbe3d6"/><text x="150" y="30" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#29463b">All 6 centres are solved</text></svg>`;
  const columns = Math.min(3, centres.length), rows = Math.ceil(centres.length / columns);
  return `<svg class="centre-diagram" width="${size}" viewBox="0 0 ${columns * 124} ${rows * 122}" role="img" aria-label="${onlyUnsolved ? 'Unsolved' : 'All six'} 5 by 5 centre blocks, each face viewed from outside">${centres.map((centre, index) => {
    const x = index % columns * 124, y = Math.floor(index / columns) * 122;
    return `<g data-face="${centre.face}" transform="translate(${x} ${y})"><rect x="1" y="1" width="118" height="116" rx="7" fill="#f7faf5" stroke="#dbe3d6"/><text x="12" y="18" font-family="sans-serif" font-size="12" font-weight="700" fill="#29463b">${centre.face}</text><text x="108" y="18" text-anchor="end" font-family="sans-serif" font-size="9" fill="#526b60">${centre.face === 'U' ? 'back ↑' : centre.face === 'D' ? 'front ↑' : 'up ↑'}</text><rect x="14" y="24" width="92" height="86" rx="5" fill="#d9ded8" stroke="#89978e" stroke-width=".7"/>${centre.colors.map((color, local) => `<rect data-centre-index="${local}" x="${25 + local % 3 * 24}" y="${32 + Math.floor(local / 3) * 24}" width="22" height="22" rx="2" fill="${COLORS5[color]}" stroke="#526b60" stroke-width=".8"/>`).join('')}</g>`;
  }).join('')}</svg>`;
}
