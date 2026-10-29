/** Transcribed from the supplied “2x2 FF Algorithms (First Face)” sheet.
 * 36 named cases, grouped into the sheet's 22 bold representative/mirror
 * families. Primary algorithms are the sheet's bold choices except for the
 * explicitly marked user adaptation below. See SOURCES.md.
 * No attempt is made to identify cases merely by their algorithm length.
 */
export const FIRST_FACE_GROUPS = ['LS', 'DD', 'UD', 'UU'];
export const FIRST_FACE_SOURCE = { title: '2x2 FF Algorithms (First Face)', file: '2x2 FF.pdf' };

// [group, name, family, primary move text, secondary move texts, breaks bar]
// sourceAlg preserves the sheet's U2'/R2' spelling and grouping; alg uses the
// equivalent ordinary half-turn spelling for simulation and display.
const rows = [
  ['LS', 'D+4', 'LS-D4', "F' R' F R"],
  ['LS', 'D-4', 'LS-D4', "F R U' R'"],
  ['LS', 'U+3', 'LS-Ucorner3', "R' U' R"],
  ['LS', 'U-3', 'LS-Ucorner3', "R U R'"],
  ['LS', 'U3', 'LS-U3', "R2 U' R2'"],

  ['DD', 'KO5', 'DD-KO5', "R' U2 R U' R'", ["R' U' R U2' R'"]],
  ['DD', 'PT5', 'DD-KO5', "R U2' R' U R", ["R U R' U2 R"]],
  ['DD', 'OP5', 'DD-OP5', "R' U R2 U' R"],
  ['DD', 'KT5', 'DD-KT5', "R U2' R2' U R2", [{ alg: "y F R2 U' R2'", breaksBar: true }]],

  ['UD', 'JK1', 'UD-JK1', "R'"],
  ['UD', 'QT1', 'UD-JK1', 'R'],
  ['UD', 'PQ3', 'UD-PQ3', "R2 U R'"],
  ['UD', 'JO3', 'UD-PQ3', "R2' U' R"],
  ['UD', 'OQ3', 'UD-OQ3', "F' R F", [], true],
  ['UD', 'JP3', 'UD-OQ3', "F U' R'", [], true],
  ['UD', 'RT5', 'UD-RT5', "R U R' U' R"],
  ['UD', 'IK5', 'UD-RT5', "R' U' R U R'"],
  ['UD', 'DK3', 'UD-DK3', "R U' R2'"],
  ['UD', 'AT3', 'UD-DK3', "R' U R2"],
  ['UD', 'BP3', 'UD-BP3', "R U' R"],
  ['UD', 'CO3', 'UD-BP3', "R' U R'"],

  ['UU', 'BC1', 'UU-BC1', 'R2'],
  ['UU', 'BD5', 'UU-BD5', "R U R' U R2", ["U' R' U' R U' R2'"]],
  ['UU', 'CF3', 'UU-CF3', "R' U' R'"],
  ['UU', 'BE3', 'UU-CF3', 'R U R'],
  ['UU', 'BR5', 'UU-BR5', "R2 U R' U' R"],
  ['UU', 'CI5', 'UU-BR5', "R2' U' R U R'"],
  ['UU', 'DQ3', 'UU-DQ3', "R' U' R2", ['U2 R U2 R']],
  ['UU', 'AJ3', 'UU-DQ3', "R U R2'", ["U2 R' U2 R'"]],
  ['UU', 'FJ5', 'UU-FJ5', "R U' R U R2'"],
  ['UU', 'EQ5', 'UU-FJ5', "R' U R' U' R2"],
  ['UU', 'QR3', 'UU-QR3', "R2 U2' R'", ["U2 R2' U2' R"]],
  ['UU', 'JQ5', 'UU-JQ5', "R U2' R2' U' R2", ["U (R U' R' U) R' U' R"]],
  ['UU', 'IQ5', 'UU-IQ5', "R U' R U R'"],
  ['UU', 'JR5', 'UU-IQ5', "R' U R' U' R"],
  ['UU', 'FQ3', 'UU-FQ3', "R2 U' R'", ["U' R2' U R"]],
];

const idFor = (group, name) => `FF-${group}-${name.replace('+', 'plus').replace('-', 'minus')}`;
const normalized = text => text.replace(/[()]/g, ' ').replace(/2'/g, '2').trim().replace(/\s+/g, ' ');
const moveCount = text => normalized(text).split(' ').filter(token => /^[URFDLB]/.test(token)).length;
// Keep the stable ID so saved selections still point at the user's requested
// replacement. The original PDF move text is metadata, not a valid alternative
// for this new recognition pattern. Historical attempts retain their own finish.
const USER_ADAPTATIONS = {
  'FF-LS-Uplus3': {
    alg: "R U' R'",
    note: 'User adaptation: insert the upper front-left piece into the bottom front-right corner.',
  },
};

export const FIRST_FACE_CASES = rows.map(([group, name, family, primary, alternatives = [], breaksBar = false]) => {
  const id = idFor(group, name);
  const adaptation = USER_ADAPTATIONS[id];
  const algorithms = [{ alg: adaptation?.alg ?? primary, breaksBar }, ...alternatives.map(a => typeof a === 'string' ? { alg: a, breaksBar: false } : a)]
    .map((choice, index) => ({
      id: `${id}-a${index + 1}`, alg: normalized(choice.alg), sourceAlg: choice.alg,
      length: moveCount(choice.alg), primary: index === 0, breaksBar: choice.breaksBar,
      ...(adaptation && index === 0 ? { userAdapted: true, originalSourceAlg: primary, sourceNote: adaptation.note } : {}),
    }));
  return { id, name, group, family, alg: algorithms[0].alg, algorithms, length: algorithms[0].length, breaksBar,
    source: adaptation ? `User adaptation of ${FIRST_FACE_SOURCE.title}` : FIRST_FACE_SOURCE.title, sourceFile: FIRST_FACE_SOURCE.file,
    ...(adaptation ? { userAdapted: true, originalSourceAlg: primary, sourceNote: adaptation.note } : {}) };
});

export const FIRST_FACE_FAMILIES = [...new Set(FIRST_FACE_CASES.map(item => item.family))].map(id => {
  const cases = FIRST_FACE_CASES.filter(item => item.family === id);
  return { id, group: cases[0].group, name: cases.map(item => item.name).join(' / '),
    representativeId: cases[0].id, caseIds: cases.map(item => item.id) };
});

export const DEFAULT_FIRST_FACE_CASE_IDS = ['FF-LS-Uminus3', 'FF-LS-Uplus3'];
