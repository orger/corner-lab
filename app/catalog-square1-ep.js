import { EP_DATA } from './data-square1-ep.js';

export const SQUARE1_EP_SOURCE_URL = 'https://sarah.cubing.net/square-1/ep';
export const SQUARE1_EP_SOURCE = 'Sarah Strong · Square-1 EP collection';
export const SETS_SQ1_EP = ['EP'];
const names = ['Solved', 'Adjacent', 'Opposite', 'U clockwise', 'U anticlockwise', 'Z', 'H', 'O clockwise', 'O anticlockwise', 'W'];
const odd = new Set([1, 2, 7, 8, 9]);

// The source's first digit is D, its second U. Keep that stable identifier,
// while the app consistently names cases as Top / Bottom.
export const CASES_SQ1_EP = EP_DATA.map(item => {
  const id = `SQ1-EP-${item.id}`, top = Number(item.id[1]), bottom = Number(item.id[0]);
  const parity = odd.has(top) !== odd.has(bottom);
  const algorithms = [{ id: `${id}-sarah`, alg: item.alg, label: 'Source recommendation',
    source: SQUARE1_EP_SOURCE, sourceUrl: SQUARE1_EP_SOURCE_URL },
  ...item.extras.map((alg, index) => ({ id: `${id}-alternative-${index + 1}`, alg, label: `Alternative ${index + 1}`,
    source: 'Alg-Trainers · Square-1 EP', sourceUrl: 'https://mihlefeld.github.io/Alg-Trainers/Sq1-CPEP-Trainer/index.html?select' }))];
  return { id, set: 'EP', name: `${names[top]} / ${names[bottom]}`,
    group: `${parity ? 'Parity' : 'No parity'} · ${names[top]}`, parity,
    topPattern: names[top], bottomPattern: names[bottom], sourceNumber: item.id,
    defaultAlgorithmId: algorithms[0].id, algorithms };
});
export const GROUPS_SQ1_EP = [...new Set(CASES_SQ1_EP.map(item => item.group))];
