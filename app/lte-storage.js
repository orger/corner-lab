import { CASES5 } from './catalog5.js';
import { DEFAULT_SPEED_WINDOW, MAX_SPEED_WINDOW, DEFAULT_RANK_COUNT, MAX_RANK_COUNT, DEFAULT_INSIGHTS_WINDOW, MAX_INSIGHTS_WINDOW } from './stats.js';
import { CASES_CENTRES } from './catalog-centres.js';
import { CASES_SQ1 } from './catalog-square1.js';
import { CASES_SQ1_OBL } from './catalog-square1-obl.js';
import { CASES_SQ1_EP } from './catalog-square1-ep.js';
import { CASES_SKEWB_NS2 } from './catalog-skewb-ns2.js';
import { CASES_SKEWB_FIRST_LAYER } from './catalog-skewb-first-layer.js';
import { parseSquare1Alg } from './square1.js';
import { parseSkewbAlg } from './skewb.js';

const edges = { cases: CASES5, casesById: new Map(CASES5.map(item => [item.id, item])), label: '5×5' };
const centres = { cases: CASES_CENTRES, casesById: new Map(CASES_CENTRES.map(item => [item.id, item])), label: '5×5 centres' };
const square1 = { cases: CASES_SQ1, casesById: new Map(CASES_SQ1.map(item => [item.id, item])), label: 'Square-1', orientations: [''], parseAlgorithm: parseSquare1Alg,
  scrambleStyles: ['provided', 'varied', 'disguised'], defaultScrambleStyle: 'disguised', layerAlignments: ['random', 'reference'] };
const square1Stage = (cases, label) => ({ cases, casesById: new Map(cases.map(item => [item.id, item])), label, orientations: [''], parseAlgorithm: parseSquare1Alg,
  scrambleStyles: ['provided', 'disguised'], defaultScrambleStyle: 'disguised', layerAlignments: ['random', 'reference'], layerTurns: [-3, 0, 3, 6] });
const square1OBL = square1Stage(CASES_SQ1_OBL, 'Square-1 OBL');
const square1EP = square1Stage(CASES_SQ1_EP, 'Square-1 EP');
const skewbNS2 = { cases: CASES_SKEWB_NS2, casesById: new Map(CASES_SKEWB_NS2.map(item => [item.id, item])), label: 'Skewb NS2', orientations: [''], parseAlgorithm: parseSkewbAlg,
  scrambleStyles: ['provided', 'disguised'], defaultScrambleStyle: 'disguised' };
const skewbFirstLayer = { cases: CASES_SKEWB_FIRST_LAYER, casesById: new Map(CASES_SKEWB_FIRST_LAYER.map(item => [item.id, item])), label: 'Skewb first layer', orientations: [''], parseAlgorithm: parseSkewbAlg,
  defaultCases: CASES_SKEWB_FIRST_LAYER.filter(item => !item.isSkip), scrambleStyles: ['provided', 'disguised'], defaultScrambleStyle: 'disguised' };
const orientations = ['', 'y', 'y2', "y'"];
const timingModes = ['simple', 'inspection'];
const scrambleStyles = ['provided', 'varied'];
const strategies = ['uniform', 'learning', 'slow', 'slowest', 'fastest', 'inconsistent', 'new'];
const own = (value, key) => Object.hasOwn(value, key);
const fail = message => { throw new Error(message); };

function freshTrainingData(catalog) {
  return {
    settings: {
      selectedCases: (catalog.defaultCases || catalog.cases).map(item => item.id), orientations: [''],
      strategy: 'uniform', slowWindow: DEFAULT_SPEED_WINDOW, rankCount: DEFAULT_RANK_COUNT, insightsWindow: DEFAULT_INSIGHTS_WINDOW, scrambleStyle: catalog.defaultScrambleStyle || 'provided', record: true, showPreview: true,
      timingMode: 'simple', inspectionAudio: false,
      ...(catalog.layerAlignments ? { layerAlignment: 'random' } : {}),
    },
    preferences: {}, attempts: [], presets: [],
  };
}
export const freshLTEData = () => freshTrainingData(edges);
export const freshLTCData = () => freshTrainingData(centres);
export const freshSQ1Data = () => freshTrainingData(square1);
export const freshSQ1OBLData = () => freshTrainingData(square1OBL);
export const freshSQ1EPData = () => freshTrainingData(square1EP);
export const freshSkewbNS2Data = () => freshTrainingData(skewbNS2);
export const freshSkewbFirstLayerData = () => freshTrainingData(skewbFirstLayer);

function object(value, label, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(`Invalid ${label}: expected an object.`);
  for (const key of Object.keys(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key) || (keys && !keys.includes(key))) fail(`Unknown ${label} field: ${key}.`);
  }
}
function string(value, label, { empty = false, max = 200 } = {}) {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) fail(`Invalid ${label}: expected ${empty ? '' : 'non-empty '}text of at most ${max} characters.`);
  return value;
}
function boolean(value, label) {
  if (typeof value !== 'boolean') fail(`Invalid ${label}: expected true or false.`);
  return value;
}
function choice(value, choices, label) {
  if (!choices.includes(value)) fail(`Unknown ${label} value in backup.`);
  return value;
}
function selection(value, choices, label, minimum = 0) {
  if (!Array.isArray(value) || value.length < minimum || value.length > choices.length) fail(`Invalid ${label} selection length.`);
  for (const item of value) choice(item, choices, label);
  if (new Set(value).size !== value.length) fail(`Duplicate ${label} values in backup.`);
  return [...value];
}
function speedWindow(value, label) {
  if (!Number.isInteger(value) || value < 1 || value > MAX_SPEED_WINDOW) fail(`Invalid ${label}: expected a whole number from 1 to ${MAX_SPEED_WINDOW}.`);
  return value;
}
function boundedCount(value, maximum, label) {
  if (!Number.isInteger(value) || value < 1 || value > maximum) fail(`Invalid ${label}: expected a whole number from 1 to ${maximum}.`);
  return value;
}
function settings(value, label, catalog) {
  object(value, label, ['selectedCases', 'orientations', 'strategy', 'slowWindow', 'rankCount', 'insightsWindow', 'scrambleStyle', 'record', 'showPreview', 'timingMode', 'inspectionAudio', ...(catalog.layerAlignments ? ['layerAlignment'] : [])]);
  return {
    selectedCases: selection(value.selectedCases, [...catalog.casesById.keys()], `${label} cases`),
    orientations: selection(value.orientations, catalog.orientations || orientations, `${label} orientations`, 1),
    strategy: choice(value.strategy, strategies, `${label} strategy`),
    slowWindow: own(value, 'slowWindow') ? speedWindow(value.slowWindow, `${label} recent clean solves`) : DEFAULT_SPEED_WINDOW,
    rankCount: own(value, 'rankCount') ? boundedCount(value.rankCount, MAX_RANK_COUNT, `${label} ranked algorithms`) : DEFAULT_RANK_COUNT,
    insightsWindow: own(value, 'insightsWindow') ? boundedCount(value.insightsWindow, MAX_INSIGHTS_WINDOW, `${label} Insights recent solves`) : DEFAULT_INSIGHTS_WINDOW,
    scrambleStyle: own(value, 'scrambleStyle') ? choice(value.scrambleStyle, catalog.scrambleStyles || scrambleStyles, `${label} scramble style`) : catalog.defaultScrambleStyle || 'provided',
    record: boolean(value.record, `${label} record`),
    showPreview: boolean(value.showPreview, `${label} preview`),
    timingMode: choice(value.timingMode, timingModes, `${label} timing mode`),
    inspectionAudio: boolean(value.inspectionAudio, `${label} inspection audio`),
    ...(catalog.layerAlignments ? { layerAlignment: own(value, 'layerAlignment') ? choice(value.layerAlignment, catalog.layerAlignments, `${label} layer alignment`) : 'random' } : {}),
  };
}
function selectedAlgorithm(caseId, algorithmId, label, catalog) {
  const item = catalog.casesById.get(caseId);
  if (!item) fail(`Unknown ${label} case: ${caseId}.`);
  string(algorithmId, `${label} algorithm ID`);
  if (!item.algorithms.some(algorithm => algorithm.id === algorithmId)) fail(`Unknown ${label} algorithm for ${caseId}.`);
  return algorithmId;
}
function preferences(value, catalog) {
  object(value, `${catalog.label} algorithm preferences`);
  return Object.fromEntries(Object.entries(value).map(([caseId, algorithmId]) =>
    [caseId, selectedAlgorithm(caseId, algorithmId, `${catalog.label} preferred`, catalog)]));
}
function time(value, label, maximum = 86400) {
  if (!Number.isFinite(value) || value < 0 || value > maximum) fail(`Invalid ${label}: expected ${maximum === Infinity ? 'finite nonnegative seconds' : `seconds from 0 to ${maximum}`}.`);
  return value;
}
function attempt(value, knownIds, catalog) {
  const label = catalog.label;
  object(value, `${label} solve record`, [
    'id', 'caseId', 'group', 'set', 'algorithmId', 'algorithm', 'orientation', 'scrambleStyle',
    'timingMode', 'inspectionAudio', 'seconds', 'inspectionSeconds',
    'recallFail', 'dnf', 'assisted', 'createdAt', 'sessionId', 'scramble', 'solution',
    ...(catalog.layerAlignments ? ['layerAlignment', 'initialTop', 'initialBottom'] : []),
  ]);
  const id = string(value.id, `${label} solve ID`);
  if (knownIds.has(id)) fail(`Duplicate ${label} solve ID: ${id}.`);
  knownIds.add(id);
  const caseId = string(value.caseId, `${label} solve case ID`);
  const item = catalog.casesById.get(caseId);
  if (!item) fail(`Unknown ${label} solve case: ${caseId}.`);
  const createdAt = string(value.createdAt, `${label} solve timestamp`, { max: 100 });
  if (!Number.isFinite(Date.parse(createdAt))) fail(`The backup contains an invalid ${label} solve timestamp.`);
  const result = {
    id, caseId, group: choice(value.group, [item.group], `${label} solve group`),
    algorithmId: selectedAlgorithm(caseId, value.algorithmId, `${label} solve`, catalog),
    // Keep the algorithm used at solve time, even if a later catalog changes it.
    algorithm: string(value.algorithm, `${label} solve algorithm`, { empty: item.isSkip === true, max: 200000 }),
    orientation: choice(value.orientation, catalog.orientations || orientations, `${label} solve orientation`),
    scrambleStyle: own(value, 'scrambleStyle') ? choice(value.scrambleStyle, catalog.scrambleStyles || scrambleStyles, `${label} solve scramble style`) : 'provided',
    timingMode: choice(value.timingMode, timingModes, `${label} solve timing mode`),
    inspectionAudio: boolean(value.inspectionAudio, `${label} solve inspection audio`),
    seconds: time(value.seconds, `${label} solve time`),
    inspectionSeconds: value.inspectionSeconds === null ? null : time(value.inspectionSeconds, `${label} inspection time`, Infinity),
    recallFail: boolean(value.recallFail, `${label} solve recall failure`),
    dnf: boolean(value.dnf, `${label} solve DNF`),
    assisted: boolean(value.assisted, `${label} solve assisted flag`),
    createdAt, sessionId: string(value.sessionId, `${label} solve session ID`),
    scramble: string(value.scramble, `${label} solve scramble`, { empty: true, max: 200000 }),
    solution: string(value.solution, `${label} solve solution`, { empty: true, max: 200000 }),
  };
  if (own(value, 'set')) result.set = choice(value.set, [item.set], `${label} solve set`);
  if (catalog.layerAlignments) {
    // Preserve missing metadata in older results instead of inventing starting
    // turns. The UI can interpret legacy styles without rewriting history.
    if (own(value, 'layerAlignment')) result.layerAlignment = choice(value.layerAlignment, catalog.layerAlignments, `${label} solve layer alignment`);
    for (const field of ['initialTop', 'initialBottom']) if (own(value, field)) {
      if (!Number.isInteger(value[field]) || value[field] < -5 || value[field] > 6) fail(`Invalid ${label} solve ${field}: expected a whole number from -5 to 6.`);
      if (catalog.layerTurns) choice(value[field], catalog.layerTurns, `${label} solve ${field}`);
      result[field] = value[field];
    }
  }
  if (catalog.parseAlgorithm) {
    // Historical notation is kept verbatim; parsing checks syntax only, so a
    // future catalogue update cannot rewrite an already recorded algorithm.
    for (const field of ['algorithm', 'scramble', 'solution']) {
      try { catalog.parseAlgorithm(result[field]); }
      catch { fail(`Invalid ${label} solve ${field} notation.`); }
    }
  }
  return result;
}

/** Each trainer validates against its own catalog and returns detached data.
 * Selections, preferences and history remain independent in a shared backup. */
function validateTrainingData(value, catalog) {
  const label = catalog.label;
  object(value, `${label} data`, ['settings', 'preferences', 'attempts', 'presets']);
  if (!Array.isArray(value.attempts) || !Array.isArray(value.presets)) fail(`Invalid ${label} history or saved practices.`);
  const attemptIds = new Set(), presetIds = new Set();
  return {
    settings: settings(value.settings, `${label} practice`, catalog),
    preferences: preferences(value.preferences, catalog),
    attempts: Array.from(value.attempts, value => attempt(value, attemptIds, catalog)),
    presets: Array.from(value.presets, value => {
      object(value, `${label} saved practice`, ['id', 'name', 'settings']);
      const id = string(value.id, `${label} saved-practice ID`);
      if (presetIds.has(id)) fail(`Duplicate ${label} saved-practice ID: ${id}.`);
      presetIds.add(id);
      const name = string(value.name, `${label} saved-practice name`, { max: 80 });
      return { id, name, settings: settings(value.settings, `${label} saved practice ${name}`, catalog) };
    }),
  };
}
export const validateLTEData = value => validateTrainingData(value, edges);
export const validateLTCData = value => validateTrainingData(value, centres);
export const validateSQ1Data = value => validateTrainingData(value, square1);
export const validateSQ1OBLData = value => validateTrainingData(value, square1OBL);
export const validateSQ1EPData = value => validateTrainingData(value, square1EP);
export const validateSkewbNS2Data = value => validateTrainingData(value, skewbNS2);
export const validateSkewbFirstLayerData = value => validateTrainingData(value, skewbFirstLayer);
