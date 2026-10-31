import { CASES5 } from './catalog5.js';
import { DEFAULT_SPEED_WINDOW, MAX_SPEED_WINDOW, DEFAULT_RANK_COUNT, MAX_RANK_COUNT, DEFAULT_INSIGHTS_WINDOW, MAX_INSIGHTS_WINDOW } from './stats.js';
import { CASES_CENTRES } from './catalog-centres.js';

const edges = { cases: CASES5, casesById: new Map(CASES5.map(item => [item.id, item])), label: '5×5' };
const centres = { cases: CASES_CENTRES, casesById: new Map(CASES_CENTRES.map(item => [item.id, item])), label: '5×5 centres' };
const orientations = ['', 'y', 'y2', "y'"];
const timingModes = ['simple', 'inspection'];
const scrambleStyles = ['provided', 'varied'];
const strategies = ['uniform', 'learning', 'slow', 'slowest', 'fastest', 'inconsistent', 'new'];
const own = (value, key) => Object.hasOwn(value, key);
const fail = message => { throw new Error(message); };

function freshTrainingData(catalog) {
  return {
    settings: {
      selectedCases: catalog.cases.map(item => item.id), orientations: [''],
      strategy: 'uniform', slowWindow: DEFAULT_SPEED_WINDOW, rankCount: DEFAULT_RANK_COUNT, insightsWindow: DEFAULT_INSIGHTS_WINDOW, scrambleStyle: 'provided', record: true, showPreview: true,
      timingMode: 'simple', inspectionAudio: false,
    },
    preferences: {}, attempts: [], presets: [],
  };
}
export const freshLTEData = () => freshTrainingData(edges);
export const freshLTCData = () => freshTrainingData(centres);

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
  object(value, label, ['selectedCases', 'orientations', 'strategy', 'slowWindow', 'rankCount', 'insightsWindow', 'scrambleStyle', 'record', 'showPreview', 'timingMode', 'inspectionAudio']);
  return {
    selectedCases: selection(value.selectedCases, [...catalog.casesById.keys()], `${label} cases`),
    orientations: selection(value.orientations, orientations, `${label} orientations`, 1),
    strategy: choice(value.strategy, strategies, `${label} strategy`),
    slowWindow: own(value, 'slowWindow') ? speedWindow(value.slowWindow, `${label} recent clean solves`) : DEFAULT_SPEED_WINDOW,
    rankCount: own(value, 'rankCount') ? boundedCount(value.rankCount, MAX_RANK_COUNT, `${label} ranked algorithms`) : DEFAULT_RANK_COUNT,
    insightsWindow: own(value, 'insightsWindow') ? boundedCount(value.insightsWindow, MAX_INSIGHTS_WINDOW, `${label} Insights recent solves`) : DEFAULT_INSIGHTS_WINDOW,
    scrambleStyle: own(value, 'scrambleStyle') ? choice(value.scrambleStyle, scrambleStyles, `${label} scramble style`) : 'provided',
    record: boolean(value.record, `${label} record`),
    showPreview: boolean(value.showPreview, `${label} preview`),
    timingMode: choice(value.timingMode, timingModes, `${label} timing mode`),
    inspectionAudio: boolean(value.inspectionAudio, `${label} inspection audio`),
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
    algorithm: string(value.algorithm, `${label} solve algorithm`, { max: 200000 }),
    orientation: choice(value.orientation, orientations, `${label} solve orientation`),
    scrambleStyle: own(value, 'scrambleStyle') ? choice(value.scrambleStyle, scrambleStyles, `${label} solve scramble style`) : 'provided',
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
  return result;
}

/** Each 5×5 trainer validates against its own catalog and returns detached data.
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
