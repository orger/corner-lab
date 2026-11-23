import { CASES_SQ1 } from './catalog-square1.js';

// Personal recognition/route notes supplied by the user. These describe a
// strategy, independently of the selected numeric algorithm and random AUF.
// Each clockwise layer signature is rotationally canonical. The two chiral
// fist/paw variants are intentionally distinct; the user's slice count selects
// 'similar', 'different' and 'same appearance' pairs without guessing from names.
export const SQUARE1_NOTE_SHAPES = Object.freeze({
  kite: ['11212212'], barrel: ['11221122'], fist: ['11212122', '11221212'],
  scallop: ['11112222'], muffin: ['11122122'], shield: ['11211222'],
  square: ['12121212'], paw: ['11121222', '11122212'], star: ['222222'],
  peacock: ['1122222'], arrow: ['1212222'], badge: ['1221222'],
  tulip: ['111111222'], nuke: ['112112112'], fish: ['111121122', '111122112'],
  bird: ['111112122', '111112212'], jewel: ['111121212'],
  house: ['111211212', '111212112'], trilobite: ['111211122'],
  eye: ['1111211112'], 'millennium falcon': ['1111111122'],
  vader: ['1111112112'], yoda: ['1111121112'], spaceship: ['1111111212'],
});
for (const signatures of Object.values(SQUARE1_NOTE_SHAPES)) Object.freeze(signatures);

// Column 1, column 3, column 4, column 5. Spelling and obvious abbreviations
// are tidied for display, but route order and the user's recognition cues stay
// intact. Muffin is the shape called Mushroom in the existing catalogue.
const sourceRows = [
  ["Kite / Kite", "done", 1, ""],
  ["Barrel / Barrel", "kite, kite / done", 2, ""],
  ["Fist / Fist (similar)", "kite, kite / done", 2, ""],
  ["Scallop / Scallop", "barrel, barrel / kite, kite / done", 3, "align bottoms"],
  ["Muffin / Muffin", "barrel, barrel / kite, kite / done", 3, "bottoms or tops offset by one"],
  ["Shield / Shield", "barrel, barrel / kite, kite / done", 3, "tops offset across break"],
  ["Barrel / Kite", "fist, fist / kite, kite / done", 3, "short or long axis of barrel with vertical kite"],
  ["Scallop / Kite", "fist, fist / kite, kite / done", 3, "align tops and bottoms"],
  ["Muffin / Square", "fist, fist / kite, kite / done", 3, "bottom one diagonal or one aligned with edge of 3"],
  ["Shield / Square", "fist, fist / kite, kite / done", 3, "square corner of shield and square align front left"],
  ["Paw / Paw (similar)", "fist, fist / kite, kite / done", 3, "align square edges on left or offset by 1 (mirror)"],
  ["Star / Eye", "scallop, scallop / barrel, barrel / kite, kite / done", 4, "obvious"],
  ["Star / Millennium Falcon", "scallop, scallop / barrel, barrel / kite, kite / done", 4, "obvious"],
  ["Tulip / Peacock", "scallop, scallop / barrel, barrel / kite, kite / done", 4, "obvious"],
  ["Fish / Peacock", "shield, shield / barrel, barrel / kite, kite / done", 4, "obvious pair 2 pairs"],
  ["Scallop / Barrel", "shield, shield / barrel, barrel / kite, kite / done", 4, "long axis of barrel"],
  ["Nuke / Peacock", "shield, shield / barrel, barrel / kite, kite / done", 4, "peacock and nuke pair on same side of cut"],
  ["Bird / Peacock", "scallop, kite / fist, fist / kite, kite / done", 4, "make kite from peacock pair and bird beak"],
  ["Muffin / Shield", "scallop, kite / fist, fist / kite, kite / done", 4, "shield point in bottom left; muffin bottom right of cut"],
  ["Fish / Badge", "scallop, kite / fist, fist / kite, kite / done", 4, "make kite from fish pair and badge bottom"],
  ["Jewel / Arrow", "scallop, kite / fist, fist / kite, kite / done", 4, "join 90s"],
  ["Bird / Arrow", "scallop, kite / fist, fist / kite, kite / done", 4, "pair 90s of bird and arrow for kite"],
  ["Fist / Paw (both same appearance)", "shield, square / fist, fist / kite, kite / done", 4, "align square side of paw with kite top of fist"],
  ["House / Arrow", "shield, square / fist, fist / kite, kite / done", 4, "create square with bottom of house, breaking triplet"],
  ["Vader / Star", "paw, paw / fist, fist / kite, kite / done", 4, "Vader down middle vertical"],
  ["Jewel / Peacock", "paw, paw / fist, fist / kite, kite / done", 4, "put peacock pair to left and triplet at back on same side"],
  ["Trilobite / Arrow", "paw, paw / fist, fist / kite, kite / done", 4, "trilobite faces right; align 90 and triple on right of slit"],
  ["Paw / Paw (different)", "star, eye / scallop, scallop / barrel, barrel / kite, kite / done", 5, "obvious"],
  ["Badge / Tulip", "star, Millennium Falcon / scallop, scallop / barrel, barrel / kite, kite / done", 5, "obvious"],
  ["Badge / Trilobite", "fish, peacock / shield, shield / barrel, barrel / kite, kite / done", 5, "pair 3 2s from badge with 1 pair from trilobite"],
  ["Muffin / Paw", "fish, peacock / shield, shield / barrel, barrel / kite, kite / done", 5, "pair 2 of 3 on muffin with fingers of paw to make peacock"],
  ["Scallop / Shield", "fish, peacock / shield, shield / barrel, barrel / kite, kite / done", 5, "join one of the shield pairs opposite the 4 to make fish"],
  ["House / Badge", "fish, peacock / shield, shield / barrel, barrel / kite, kite / done", 5, "join peacock pair from house with tail from badge"],
  ["Shield / Barrel", "fish, peacock / shield, shield / barrel, barrel / kite, kite / done", 5, "obvious pairing of 2 pairs to make fish"],
  ["Scallop / Fist", "bird, peacock / scallop, kite / fist, fist / kite, kite / done", 5, "pair top of peacock from fist left with bottom from scallop with beak across split"],
  ["Scallop / Muffin", "bird, peacock / scallop, kite / fist, fist / kite, kite / done", 5, "join a pair of muffin top with peacock tail"],
  ["Scallop / Paw", "bird, peacock / scallop, kite / fist, fist / kite, kite / done", 5, "join 2 of the scallop pieces to paw to make bird"],
  ["Shield / Paw", "bird, peacock / scallop, kite / fist, fist / kite, kite / done", 5, "make peacock in way that joins the other shield pair to group"],
  ["Barrel / Paw", "bird, peacock / scallop, kite / fist, fist / kite, kite / done", 5, "join tail from paw with one pair to make a 5 with other pair"],
  ["Trilobite / Peacock", "bird, peacock / scallop, kite / fist, fist / kite, kite / done", 5, "line peacock pair left with caudal trilobite pair and slice"],
  ["Tulip / Arrow", "bird, peacock / scallop, kite / fist, fist / kite, kite / done", 5, "old method"],
  ["Arrow / Fish", "bird, peacock / scallop, kite / fist, fist / kite, kite / done", 5, "join pair symm. from fish with base from arrow to make 5"],
  ["Paw / Square", "jewel, arrow / scallop, kite / fist, fist / kite, kite / done", 5, ""],
  ["Paw / Kite", "jewel, arrow / scallop, kite / fist, fist / kite, kite / done", 5, "join 90 of kite to fingers of paw to make jewel"],
  ["Scallop / Square", "jewel, arrow / scallop, kite / fist, fist / kite, kite / done", 5, "bring 90 opposite 4 to make jewel"],
  ["Bird / Badge", "bird, arrow / scallop, kite / fist, fist / kite, kite / done", 5, "align 90 of bird with kite base"],
  ["Jewel / Badge", "bird, arrow / scallop, kite / fist, fist / kite, kite / done", 5, "add one part of badge onto 4 to make bird 5"],
  ["Shield / Kite", "house, arrow / shield, square / fist, fist / kite, kite / done", 5, "split a 90 off kite to make arrow"],
  ["Peacock / House", "house, arrow / shield, square / fist, fist / kite, kite / done", 5, "join peacock feathers with 90 of house 2"],
  ["Fist / Paw (opposites)", "jewel, peacock / paw, paw / fist, fist / kite, kite / done", 5, "top of peacock from fist with tail from paw"],
  ["Fist / Shield", "trilobite, arrow / paw, paw / fist, fist / kite, kite / done", 5, "use top of shield to make trilobite"],
  ["Barrel / Square", "paw, paw (different) / star, eye / scallop, scallop / barrel, barrel / kite, kite / done", 6, "join two big pieces with one to make 3"],
  ["Barrel / Fist", "fist, shield / trilobite, arrow / paw, paw / fist, fist / kite, kite / done", 6, "make shield with pair from fist"],
  ["Kite / Muffin", "shield, barrel / fish, peacock / scallop, scallop / barrel, barrel / kite, kite / done", 6, "obvious split into barrel"],
  ["Star / Yoda", "shield, paw / bird, peacock / scallop, kite / fist, fist / kite, kite / done", 6, "obvious split"],
  ["Star / Spaceship", "tulip, arrow / bird, peacock / scallop, kite / fist, fist / kite, kite / done", 6, "known"],
  ["Kite / Fist", "square, paw / jewel, arrow / scallop, kite / fist, fist / kite, kite / done", 6, "join 90s to make square keeping 2 bigs together"],
  ["Square / Fist", "kite, paw / jewel, arrow / scallop, kite / fist, fist / kite, kite / done", 6, "join 90s to make kite keeping 2 bigs together"],
  ["Nuke / Badge", "shield, kite / house, arrow / shield, square / fist, fist / kite, kite / done", 6, "make kite"],
  ["Fist / Fist (different)", "shield, kite / house, arrow / shield, square / fist, fist / kite, kite / done", 6, "join 90s to make kite"],
  ["Muffin / Barrel", "shield, kite / house, arrow / shield, square / fist, fist / kite, kite / done", 6, "obvious way to make kite"],
  ["Nuke / Arrow", "peacock, house / house, arrow / shield, square / fist, fist / kite, kite / done", 6, "join arrow to two pairs to make house"],
  ["Fist / Muffin", "fist, shield / trilobite, arrow / paw, paw / fist, fist / kite, kite / done", 6, "notch of fist next to muffin bottom so join pairs"],
  ["Square / Kite", "fist, fist (different) / shield, kite / house, arrow / shield, square / fist, fist / kite, kite / done", 7, "line up kite top and square centre on right"]
];

const namesInPair = label => label.toLowerCase().replace(/\s*\(.+\)/, '').split(/\s*[\/,]\s*/);
const namesMatch = (first, second, item) =>
  (SQUARE1_NOTE_SHAPES[first].includes(item.topShape) && SQUARE1_NOTE_SHAPES[second].includes(item.bottomShape)) ||
  (SQUARE1_NOTE_SHAPES[second].includes(item.topShape) && SQUARE1_NOTE_SHAPES[first].includes(item.bottomShape));
const orientationNote = 'Directional hints use your reference orientation; adapt left/right and top/bottom for mirrored or swapped versions.';

export const SQUARE1_CASE_NOTE_ROWS = Object.freeze(sourceRows.map(([label, route, listedSlices, tip], index) => {
  const [first, second] = namesInPair(label);
  const caseIds = CASES_SQ1.filter(item => item.slashes === listedSlices && namesMatch(first, second, item)).map(item => item.id);
  if (!caseIds.length) throw new Error(`No cube-shape case matches the personal notes for ${label}.`);
  return Object.freeze({ rowId: `SQ1-NOTE-${String(index + 1).padStart(3, '0')}`, label, route, tip,
    listedSlices, orientationNote, caseIds: Object.freeze(caseIds) });
}));

const notesByCase = new Map();
for (const note of SQUARE1_CASE_NOTE_ROWS) for (const caseId of note.caseIds) {
  if (notesByCase.has(caseId)) throw new Error(`Duplicate personal cube-shape notes for ${caseId}.`);
  notesByCase.set(caseId, note);
}

/** The same personal note applies to equivalent mirrored/layer-swapped cases.
 * Stable catalogue IDs, preferred algorithms and histories are never changed.
 * Other trainers and unknown IDs have no cube-shape personal notes.
 */
export function getSquare1CaseNotes(caseId) {
  return notesByCase.get(caseId) ?? null;
}
