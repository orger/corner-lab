import { OBL_DATA } from './data-square1-obl.js';

export const SQUARE1_OBL_SOURCE_URL = 'https://mihlefeld.github.io/Alg-Trainers/Sq1-OBL-Trainer/index.html?select';
export const SQUARE1_OBL_SOURCE = 'Alg-Trainers · Square-1 OBL';
export const SETS_SQ1_OBL = ['OBL'];

// Keep upstream numbers stable. Colour-complementary orientation patterns are
// one OBL case; top/bottom order and mirror cases otherwise remain distinct.
export const CASES_SQ1_OBL = OBL_DATA.map(item => {
  const id = `SQ1-OBL-${String(item.num).padStart(3, '0')}`;
  const algorithms = item.algs.map((entry, index) => ({
    id: `${id}-source-${entry.sourceIndex + 1}`,
    alg: entry.alg, label: index ? `Alternative ${index + 1}` : 'Source recommendation',
    source: SQUARE1_OBL_SOURCE, sourceUrl: SQUARE1_OBL_SOURCE_URL,
  }));
  return { id, set: 'OBL', name: item.name, group: item.group, sourceNumber: item.num,
    defaultAlgorithmId: algorithms[0].id, algorithms, scrambles: item.scrambles };
});
export const GROUPS_SQ1_OBL = [...new Set(CASES_SQ1_OBL.map(item => item.group))];
