/** CubeSkills, “5x5 L2C Algorithms (Last Two Centers)”, supplied PDF.
 * The 19 unsolved diagrams are listed in reading order. The solved reference
 * is not a timed case. Descriptive names/groups are ours; sourceAlg preserves
 * the PDF text. Its M move is the single middle slice, turning like L.
 */
export const SETS_CENTRES = ['L2C'];
export const GROUPS_CENTRES = ['1 centre', '2 centres', '3 centres'];
export const CENTRES_SOURCE = 'CubeSkills · Last Two Centers PDF';

/** Compile this PDF's M notation without changing the shared cube parser's
 * explicit-wide-turn convention. 3Lw Lw′ turns only the middle layer.
 */
export function compileCentresAlg(algorithm = '') {
  if (typeof algorithm !== 'string') throw new TypeError('Algorithm must be text.');
  return algorithm.replace(/[’′`]/g, "'").replace(/\bM(2'?|'2|')?/g, (_, suffix = '') => {
    if (suffix.includes('2')) return '(3Lw2 Lw2)';
    return suffix === "'" ? "(3Lw' Lw)" : "(3Lw Lw')";
  });
}

// Expected U/F centre colors are transcribed from each PDF diagram. U and F
// denote the two centre colors (red/blue in the source), not the app palette.
const rows = [
  ['Single corner · adjacent', 1, 1, 1, 2, "(Rw U Rw') U (Rw U2' Rw')", 'UUUUUUUUF', 'FFUFFFFFF'],
  ['Single corner · opposite', 1, 1, 1, 3, "(Rw U' Rw') U' (Rw U2' Rw')", 'UUFUUUUUU', 'FFFFFFFFU'],
  ['Single middle centre', 1, 1, 1, 4, "Rw U' M' U Rw' U' M", 'UUUUUFUUU', 'FFFFFUFFF'],
  ['Lower pair · top-left bar', 2, 1, 2, 1, "(Rw U Rw')", 'FFUUUUUUU', 'FFFFFUFFU'],
  ['Lower pair · bottom-left bar', 2, 1, 2, 2, "(Rw U Rw') U' (Rw U' Rw')", 'UUUUUUFFU', 'FFFFFUFFU'],
  ['Upper pair · bottom-left bar', 2, 1, 2, 3, "(Rw U' Rw')", 'UUUUUUFFU', 'FFUFFUFFF'],
  ['Upper pair · top-left bar', 2, 1, 2, 4, "(Rw U' Rw') U (Rw U Rw')", 'FFUUUUUUU', 'FFUFFUFFF'],
  ['Lower pair · diagonal left', 2, 1, 3, 1, "(Rw U' Rw') U' (Rw U' Rw')", 'UFUUUUFUU', 'FFFFFUFFU'],
  ['Lower pair · diagonal right', 2, 1, 3, 2, "(Rw U2' Rw') U (Rw U2' Rw')", 'UFUUUUUUF', 'FFFFFUFFU'],
  ['Upper pair · diagonal left', 2, 1, 3, 3, "(Rw U Rw') U (Rw U Rw')", 'FUUUUUUFU', 'FFUFFUFFF'],
  ['Upper pair · diagonal right', 2, 1, 3, 4, "(Rw U2 Rw') U' (Rw U2 Rw')", 'UUFUUUUFU', 'FFUFFUFFF'],
  ['Two corners · right column', 2, 2, 1, 1, "(Rw U' Rw' U) (Rw U' Rw' U) (Rw U' Rw')", 'UUFUUUUUF', 'FFUFFFFFU'],
  ['Two corners · diagonal', 2, 2, 1, 2, "(Rw U' Rw') U2 (Rw U' Rw')", 'UUFUUUFUU', 'FFUFFFFFU'],
  ['Three centres · straight bar', 3, 2, 1, 3, "(Rw U2 Rw')", 'FUUFUUFUU', 'FFUFFUFFU'],
  ['Three centres · arrow', 3, 2, 1, 4, "(Rw U2' Rw') U2 (Rw U' Rw')", 'FUFUUUUFU', 'FFUFFUFFU'],
  ['Three centres · lower-left pair', 3, 2, 2, 1, "(Rw U Rw') U' (Rw U2 Rw')", 'UUFFUUFUU', 'FFUFFUFFU'],
  ['Three centres · upper-left pair', 3, 2, 2, 2, "(Rw U' Rw') U (Rw U2' Rw')", 'FUUFUUUUF', 'FFUFFUFFU'],
  ['Three centres · lower-right pair', 3, 2, 2, 3, "(Rw U' Rw') U (Rw U' Rw')", 'UUUUUFFUF', 'FFUFFUFFU'],
  ['Three centres · upper-right pair', 3, 2, 2, 4, "(Rw U Rw') U' (Rw U Rw')", 'FUFUUFUUU', 'FFUFFUFFU'],
];

export const CASES_CENTRES = rows.map(([name, displacedCentres, sourcePage, sourceRow, sourceColumn, sourceAlg, upper, front], index) => {
  const id = `LTC-${String(index + 1).padStart(2, '0')}`;
  return {
    id, name, originalName: name, puzzle: '5x5', set: 'L2C',
    group: GROUPS_CENTRES[displacedCentres - 1], displacedCentres,
    sourcePage, sourceRow, sourceColumn, source: CENTRES_SOURCE,
    sourceFile: 'last-2-centers-algorithms-5x5-2.pdf',
    referenceCentres: { U: upper, F: front },
    defaultAlgorithmId: `${id}-a1`,
    algorithms: [{ id: `${id}-a1`, label: 'Solve · CubeSkills', alg: compileCentresAlg(sourceAlg), sourceAlg, source: CENTRES_SOURCE }],
  };
});

export const CASES_CENTRES_BY_ID = new Map(CASES_CENTRES.map(item => [item.id, item]));
