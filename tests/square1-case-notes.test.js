import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES_SQ1 } from '../app/catalog-square1.js';
import { SQUARE1_CASE_NOTE_ROWS, SQUARE1_NOTE_SHAPES, getSquare1CaseNotes } from '../app/square1-case-notes.js';
import { generateSquare1Shapes, square1LegalRotations, applySquare1Alg, square1ShapeKey } from '../app/square1.js';

const caseId = (top, bottom) => `SQ1-${top}-${bottom}`;

test('the 64 personal table rows cover all 169 ordered cube-shape cases exactly once', () => {
  assert.equal(SQUARE1_CASE_NOTE_ROWS.length, 64);
  const ids = SQUARE1_CASE_NOTE_ROWS.flatMap(row => row.caseIds);
  assert.equal(ids.length, 169);
  assert.equal(new Set(ids).size, 169);
  assert.deepEqual(new Set(ids), new Set(CASES_SQ1.map(item => item.id)));
  for (const item of CASES_SQ1) {
    const note = getSquare1CaseNotes(item.id);
    assert.equal(note.listedSlices, item.slashes, `${note.label}: user column 4 must match the minimum slice count`);
    assert.equal(note.caseIds.includes(item.id), true);
    assert.match(note.rowId, /^SQ1-NOTE-\d{3}$/);
    assert.equal(typeof note.route, 'string');
    assert.equal(typeof note.tip, 'string');
  }
});

test('slice counts distinguish the similar/different fist, paw and fist/paw rows', () => {
  const leftFist = '11221212', rightFist = '11212122', leftPaw = '11122212', rightPaw = '11121222';
  const samples = [
    [leftFist, rightFist, 'Fist / Fist (similar)', 2],
    [rightFist, leftFist, 'Fist / Fist (similar)', 2],
    [leftFist, leftFist, 'Fist / Fist (different)', 6],
    [rightFist, rightFist, 'Fist / Fist (different)', 6],
    [leftPaw, rightPaw, 'Paw / Paw (similar)', 3],
    [rightPaw, leftPaw, 'Paw / Paw (similar)', 3],
    [leftPaw, leftPaw, 'Paw / Paw (different)', 5],
    [rightPaw, rightPaw, 'Paw / Paw (different)', 5],
    [leftFist, leftPaw, 'Fist / Paw (both same appearance)', 4],
    [rightFist, rightPaw, 'Fist / Paw (both same appearance)', 4],
    [leftFist, rightPaw, 'Fist / Paw (opposites)', 5],
    [rightFist, leftPaw, 'Fist / Paw (opposites)', 5],
  ];
  for (const [top, bottom, label, count] of samples) {
    const note = getSquare1CaseNotes(caseId(top, bottom));
    assert.equal(note.label, label); assert.equal(note.listedSlices, count);
    assert.equal(getSquare1CaseNotes(caseId(bottom, top)), note, 'layer swaps retain the same personal row');
  }
});

test('named three/five-corner and star cases use the table geometry, not ambiguous catalogue text', () => {
  const samples = [
    ['11122122', '12121212', 'Muffin / Square'], // Existing catalogue calls this Mushroom.
    ['111111222', '1122222', 'Tulip / Peacock'],
    ['111121122', '1122222', 'Fish / Peacock'],
    ['111122112', '1122222', 'Fish / Peacock'],
    ['111112122', '1212222', 'Bird / Arrow'],
    ['111112212', '1212222', 'Bird / Arrow'],
    ['111121212', '1221222', 'Jewel / Badge'],
    ['111211212', '1221222', 'House / Badge'],
    ['111212112', '1221222', 'House / Badge'],
    ['111211122', '1212222', 'Trilobite / Arrow'],
    ['112112112', '1221222', 'Nuke / Badge'],
    ['222222', '1111211112', 'Star / Eye'],
    ['222222', '1111111122', 'Star / Millennium Falcon'],
    ['222222', '1111112112', 'Vader / Star'],
    ['222222', '1111121112', 'Star / Yoda'],
    ['222222', '1111111212', 'Star / Spaceship'],
  ];
  for (const [top, bottom, label] of samples) {
    assert.equal(getSquare1CaseNotes(caseId(top, bottom)).label, label);
    assert.equal(getSquare1CaseNotes(caseId(bottom, top)).label, label);
  }
});

test('every personal route is physically reachable one slice per step from every mapped case', () => {
  const nodes = generateSquare1Shapes(), byKey = new Map(nodes.map(node => [node.key, node]));
  const graph = new Map(nodes.map(node => [node.key, new Set(
    square1LegalRotations(node.state.top).flatMap(top => square1LegalRotations(node.state.bottom).map(bottom =>
      square1ShapeKey(applySquare1Alg(node.state, `(${top},${bottom}) /`)))))]));
  const solved = '12121212-12121212';
  function stepMatches(key, step, remaining) {
    if (step === 'done') return key === solved;
    if (byKey.get(key).slashes !== remaining) return false;
    const [first, second] = step.toLowerCase().replace(/\s*\(.+\)/, '').split(/\s*,\s*/);
    const firstShapes = SQUARE1_NOTE_SHAPES[first], secondShapes = SQUARE1_NOTE_SHAPES[second];
    assert(firstShapes && secondShapes, `Unknown route name: ${step}`);
    const [top, bottom] = key.split('-');
    return (firstShapes.includes(top) && secondShapes.includes(bottom)) ||
      (firstShapes.includes(bottom) && secondShapes.includes(top));
  }
  for (const note of SQUARE1_CASE_NOTE_ROWS) {
    const steps = note.route.split(/\s*\/\s*/);
    assert.equal(steps.length, note.listedSlices, `${note.label}: each route transition represents one slice`);
    assert.equal(steps.at(-1), 'done');
    for (const id of note.caseIds) {
      let possible = new Set([id.slice(4)]);
      for (const [index, step] of steps.entries()) {
        possible = new Set([...possible].flatMap(key => [...graph.get(key)]).filter(key =>
          stepMatches(key, step, note.listedSlices - index - 1)));
        assert(possible.size, `${id} cannot reach ${step} at step ${index + 1} in ${note.route}`);
      }
      assert(possible.has(solved), `${id}: the complete personal route must restore cube shape`);
    }
  }
});

test('personal notes retain both comment columns and leave unrelated cases without notes', () => {
  const kite = getSquare1CaseNotes(caseId('11212212', '11212212'));
  assert.equal(kite.route, 'done'); assert.equal(kite.tip, '');
  const pawSquare = getSquare1CaseNotes(caseId('11121222', '12121212'));
  assert.equal(pawSquare.route, 'jewel, arrow / scallop, kite / fist, fist / kite, kite / done');
  assert.equal(pawSquare.tip, '');
  const squareKite = getSquare1CaseNotes(caseId('12121212', '11212212'));
  assert.equal(squareKite.route, 'fist, fist (different) / shield, kite / house, arrow / shield, square / fist, fist / kite, kite / done');
  assert.equal(squareKite.tip, 'line up kite top and square centre on right');
  assert.match(squareKite.orientationNote, /mirrored or swapped/);
  for (const id of ['', 'SQ1-OBL-001', 'SQ1-EP-01', 'CLL-H-1', 'SQ1-12121212-12121212', 'unknown']) {
    assert.equal(getSquare1CaseNotes(id), null);
  }
});
