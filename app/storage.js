import { CASES, GROUPS, SETS } from './catalog.js';
import { DEFAULT_SPEED_WINDOW, MAX_SPEED_WINDOW, DEFAULT_RANK_COUNT, MAX_RANK_COUNT, DEFAULT_INSIGHTS_WINDOW, MAX_INSIGHTS_WINDOW } from './stats.js';
import { normalizeAlg, validateAlternative } from './cube.js';
import { FIRST_FACE_CASES, DEFAULT_FIRST_FACE_CASE_IDS } from './first-face-cases.js';
import { freshLTEData, validateLTEData, freshLTCData, validateLTCData } from './lte-storage.js';

export const SCHEMA_VERSION=1;
const KEY='corner-lab-v1';
export function freshData() { return {version:SCHEMA_VERSION,trainer:'2x2',settings:{selectedCases:[],preAuf:['','U',"U'",'U2'],postAuf:['','U',"U'",'U2'],bottomAuf:['','D','D2',"D'"],orientations:[''],colors:['white'],mode:'last-layer',timingMode:'simple',inspectionAudio:false,strategy:'uniform',slowWindow:DEFAULT_SPEED_WINDOW,rankCount:DEFAULT_RANK_COUNT,insightsWindow:DEFAULT_INSIGHTS_WINDOW,finishIds:[...DEFAULT_FIRST_FACE_CASE_IDS],record:true,showPreview:true},preferences:{},attempts:[],presets:[],lte:freshLTEData(),ltc:freshLTCData()}; }

const casesById = new Map(CASES.map(item => [item.id, item]));
const finishIds = new Set(FIRST_FACE_CASES.map(item => item.id));
const primaryFinishIds = new Map(FIRST_FACE_CASES.map(item => [normalizeAlg(item.alg), item.id]));
// This case keeps its stable ID after changing the preferred insertion. Preserve
// early move-text selections and the identity of already-recorded solves.
primaryFinishIds.set("R' U' R", 'FF-LS-Uplus3');
const catalogFinishAlgorithms = new Set(FIRST_FACE_CASES.flatMap(item => item.algorithms.map(algorithm => normalizeAlg(algorithm.alg))));
// The old chooser contained every reduced sequence of 1–3 outer turns.
// Recognize its IDs directly, without building all 4,338 options on startup.
const LEGACY_FINISH_COUNT = 18 + 18 * 15 + 18 * 15 * 15;
function isLegacyFinish(value) {
  if (typeof value !== 'string') return false;
  const moves = value.split(' ');
  return moves.length >= 1 && moves.length <= 3 && moves.every((move, i) =>
    /^[URFDLB](?:2|')?$/.test(move) && (!i || moves[i - 1][0] !== move[0]));
}
const modes = ['last-layer', 'one-look'];
const timingModes = ['simple', 'inspection'];
const strategies = ['uniform', 'learning', 'slow', 'slowest', 'fastest', 'inconsistent', 'new'];
const conditions = {
  preAuf: ['', 'U', "U'", 'U2'], postAuf: ['', 'U', "U'", 'U2'],
  bottomAuf: ['', 'D', 'D2', "D'"],
  orientations: ['', 'y', "y'", 'y2'], colors: ['white', 'yellow', 'green', 'blue', 'red', 'orange'],
};
const fail = message => { throw new Error(message); };
const own = (object, key) => Object.hasOwn(object, key);
function object(value, label, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(`Invalid ${label}: expected an object.`);
  for (const key of Object.keys(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key) || (keys && !keys.includes(key))) fail(`Unknown ${label} field: ${key}.`);
  }
  return value;
}
function string(value, label, { empty = false, max = 200 } = {}) {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) fail(`Invalid ${label}: expected ${empty ? '' : 'non-empty '}text${Number.isFinite(max) ? ` of at most ${max} characters` : ''}.`);
  return value;
}
function boolean(value, label) {
  if (typeof value !== 'boolean') fail(`Invalid ${label}: expected true or false.`);
  return value;
}
function choice(value, allowed, label) {
  if (!allowed.includes(value)) fail(`Unknown ${label} value in backup.`);
  return value;
}
function uniqueStrings(value, label, allowed, minimum = 0, maximum = Infinity) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) fail(`Invalid ${label} selection length.`);
  for (const item of value) {
    string(item, label, { empty: true, max: 200 });
    if (allowed && !allowed.has(item)) fail(`Unknown ${label} value: ${item}.`);
  }
  if (new Set(value).size !== value.length) fail(`Duplicate ${label} values in backup.`);
  return [...value];
}
function selectedFinishes(value, label) {
  const selected = uniqueStrings(value, label, undefined, 0, LEGACY_FINISH_COUNT + finishIds.size);
  const migrated = new Set();
  let legacyCount = 0;
  for (const id of selected) {
    if (finishIds.has(id)) migrated.add(id);
    else {
      if (!isLegacyFinish(id)) fail(`Unknown ${label} value: ${id}.`);
      legacyCount += 1;
      const caseId = primaryFinishIds.get(normalizeAlg(id));
      if (caseId) migrated.add(caseId);
    }
  }
  if (legacyCount === LEGACY_FINISH_COUNT) return [...finishIds];
  if (selected.length && !migrated.size) return [...DEFAULT_FIRST_FACE_CASE_IDS];
  return [...migrated];
}
function speedWindow(value, label) {
  if (!Number.isInteger(value) || value < 1 || value > MAX_SPEED_WINDOW) fail(`Invalid ${label}: expected a whole number from 1 to ${MAX_SPEED_WINDOW}.`);
  return value;
}
function boundedCount(value, maximum, label) {
  if (!Number.isInteger(value) || value < 1 || value > maximum) fail(`Invalid ${label}: expected a whole number from 1 to ${maximum}.`);
  return value;
}
function settings(value, label) {
  object(value, label, ['selectedCases', 'preAuf', 'postAuf', 'bottomAuf', 'orientations', 'colors', 'mode', 'timingMode', 'inspectionAudio', 'strategy', 'slowWindow', 'rankCount', 'insightsWindow', 'finishIds', 'record', 'showPreview']);
  const result = {
    selectedCases: uniqueStrings(value.selectedCases, `${label} cases`, new Set(casesById.keys()), 0, CASES.length),
    finishIds: selectedFinishes(value.finishIds, `${label} finishes`),
    mode: choice(value.mode, modes, `${label} mode`),
    strategy: choice(value.strategy, strategies, `${label} strategy`),
    slowWindow: own(value, 'slowWindow') ? speedWindow(value.slowWindow, `${label} recent clean solves`) : DEFAULT_SPEED_WINDOW,
    rankCount: own(value, 'rankCount') ? boundedCount(value.rankCount, MAX_RANK_COUNT, `${label} ranked algorithms`) : DEFAULT_RANK_COUNT,
    insightsWindow: own(value, 'insightsWindow') ? boundedCount(value.insightsWindow, MAX_INSIGHTS_WINDOW, `${label} Insights recent solves`) : DEFAULT_INSIGHTS_WINDOW,
  };
  for (const [key, values] of Object.entries(conditions)) result[key] = uniqueStrings(
    key === 'bottomAuf' && !own(value, key) ? values : value[key], `${label} ${key}`, new Set(values), 1, values.length);
  // Earlier v1 records may predate these two UI toggles.
  result.record = own(value, 'record') ? boolean(value.record, `${label} record`) : true;
  result.showPreview = own(value, 'showPreview') ? boolean(value.showPreview, `${label} preview`) : false;
  result.timingMode = own(value, 'timingMode') ? choice(value.timingMode, timingModes, `${label} timing mode`) : value.mode === 'one-look' ? 'inspection' : 'simple';
  result.inspectionAudio = own(value, 'inspectionAudio') ? boolean(value.inspectionAudio, `${label} inspection audio`) : false;
  return result;
}
function algorithm(value, label, knownIds, canonical) {
  object(value, label, ['id', 'alg', 'source', 'url', 'sourceName', 'setup', 'finalAuf', 'endRotation', 'frameCorrection']);
  const result = { id: string(value.id, `${label} ID`), alg: string(value.alg, `${label} moves`, { empty: true, max: 100000 }) };
  if (knownIds.has(result.id)) fail(`Duplicate algorithm ID: ${result.id}.`);
  knownIds.add(result.id);
  const validation = validateAlternative(canonical, result.alg);
  if (!validation.valid) fail(`Invalid ${label}: ${validation.reason}`);
  result.alg = validation.algorithm;
  for (const key of ['source', 'sourceName', 'setup', 'finalAuf', 'endRotation', 'frameCorrection']) {
    if (own(value, key)) result[key] = string(value[key], `${label} ${key}`, { empty: true, max: 100000 });
  }
  if (own(value, 'url')) {
    result.url = string(value.url, `${label} URL`, { max: 2048 });
    let url; try { url = new URL(result.url); } catch { fail(`Invalid ${label} URL.`); }
    if (!['http:', 'https:'].includes(url.protocol)) fail(`Invalid ${label} URL protocol.`);
  }
  return result;
}
function preferences(value) {
  object(value, 'algorithm preferences');
  const result = {};
  const knownIds = new Set(CASES.flatMap(item => item.algorithms.map(a => a.id)));
  for (const [caseId, pref] of Object.entries(value)) {
    const item = casesById.get(caseId);
    if (!item) fail(`Unknown algorithm-preference case: ${caseId}.`);
    object(pref, `preferences for ${caseId}`, ['selected', 'custom']);
    if (own(pref, 'custom') && !Array.isArray(pref.custom)) fail(`Invalid personal algorithms for ${caseId}.`);
    const custom = Array.from(pref.custom ?? [], (a, i) => algorithm(a, `${caseId} personal algorithm ${i + 1}`, knownIds, item.algorithms[0].alg));
    const normalized = { custom };
    if (own(pref, 'selected')) {
      normalized.selected = string(pref.selected, `${caseId} preferred algorithm ID`);
      if (![...item.algorithms, ...custom].some(a => a.id === normalized.selected)) fail(`Unknown preferred algorithm for ${caseId}.`);
    }
    result[caseId] = normalized;
  }
  return result;
}
function attempt(value, knownIds) {
  const keys = ['id', 'caseId', 'set', 'group', 'algorithmId', 'algorithm', 'mode', 'timingMode', 'inspectionAudio', 'initialAuf', 'preAuf', 'postAuf', 'bottomAuf', 'orientation', 'color', 'finish', 'finishCaseId', 'seconds', 'recallFail', 'dnf', 'assisted', 'createdAt', 'sessionId', 'inspectionSeconds', 'scramble', 'solution'];
  object(value, 'solve record', keys);
  const result = { ...value };
  string(result.id, 'solve ID');
  if (knownIds.has(result.id)) fail(`Duplicate solve ID: ${result.id}.`);
  knownIds.add(result.id);
  const item = casesById.get(string(result.caseId, 'solve case ID'));
  if (!item) fail(`Unknown solve case: ${result.caseId}.`);
  if (!Number.isFinite(result.seconds) || result.seconds < 0 || result.seconds > 86400) fail('The backup contains an invalid solve time.');
  string(result.createdAt, 'solve timestamp', { max: 100 });
  if (!Number.isFinite(Date.parse(result.createdAt))) fail('The backup contains an invalid solve timestamp.');
  for (const key of ['recallFail', 'dnf', 'assisted']) result[key] = own(value, key) ? boolean(value[key], `solve ${key}`) : false;
  for (const key of ['algorithmId', 'sessionId']) if (own(value, key)) string(value[key], `solve ${key}`);
  for (const key of ['algorithm', 'scramble', 'solution']) if (own(value, key)) string(value[key], `solve ${key}`, { empty: true, max: 200000 });
  for (const [key, allowed] of Object.entries({ set: SETS, group: GROUPS, mode: modes, preAuf: conditions.preAuf, postAuf: conditions.postAuf, orientation: conditions.orientations, color: conditions.colors })) {
    if (own(value, key)) choice(value[key], allowed, `solve ${key}`);
  }
  if ((own(value, 'set') && value.set !== item.set) || (own(value, 'group') && value.group !== item.group)) fail(`Solve case ${value.caseId} has mismatched set or pattern.`);
  if (own(value, 'finish')) {
    string(value.finish, 'first-layer finish', { empty: true });
    if (value.finish !== '' && !isLegacyFinish(value.finish)) {
      let normalized;
      try { normalized = normalizeAlg(value.finish); } catch { fail('The backup contains an invalid first-layer finish.'); }
      if (!catalogFinishAlgorithms.has(normalized)) fail('The backup contains an invalid first-layer finish.');
    }
  }
  result.bottomAuf = own(value, 'bottomAuf') ? choice(value.bottomAuf, conditions.bottomAuf, 'solve bottomAuf') : '';
  result.initialAuf = own(value, 'initialAuf') ? choice(value.initialAuf, conditions.preAuf, 'solve initialAuf') : '';
  result.finishCaseId = own(value, 'finishCaseId') ? choice(value.finishCaseId, ['', ...finishIds], 'solve first-face case') : primaryFinishIds.get(normalizeAlg(value.finish ?? '')) ?? '';
  if (own(value, 'inspectionSeconds') && value.inspectionSeconds !== null && (!Number.isFinite(value.inspectionSeconds) || value.inspectionSeconds < 0)) fail('The backup contains an invalid inspection time.');
  result.timingMode = own(value, 'timingMode') ? choice(value.timingMode, timingModes, 'solve timing mode') : Number.isFinite(value.inspectionSeconds) ? 'inspection' : 'simple';
  result.inspectionAudio = own(value, 'inspectionAudio') ? boolean(value.inspectionAudio, 'solve inspection audio') : false;
  return result;
}

/** Validate every structure before import/load. Returned data is detached from
 * its input, so validation and later normalization cannot mutate a saved backup.
 * Optional history fields remain optional for early version-1 solve records.
 */
export function validateData(input) {
  object(input, 'backup', ['version', 'initialized', 'trainer', 'settings', 'preferences', 'attempts', 'presets', 'lte', 'ltc']);
  if (input.version !== SCHEMA_VERSION || !Array.isArray(input.attempts) || !Array.isArray(input.presets)) fail('This is not a Corner Lab version 1 backup.');
  const attemptIds = new Set(), presetIds = new Set();
  return {
    version: SCHEMA_VERSION,
    trainer: own(input, 'trainer') ? choice(input.trainer, ['2x2', '5x5', '5x5-centres'], 'trainer') : '2x2',
    initialized: own(input, 'initialized') ? boolean(input.initialized, 'initialized flag') : true,
    settings: settings(input.settings, 'practice'),
    preferences: preferences(input.preferences),
    attempts: Array.from(input.attempts, value => attempt(value, attemptIds)),
    presets: Array.from(input.presets, value => {
      object(value, 'saved practice', ['id', 'name', 'settings']);
      const id = string(value.id, 'saved-practice ID');
      if (presetIds.has(id)) fail(`Duplicate saved-practice ID: ${id}.`);
      presetIds.add(id);
      return { id, name: string(value.name, 'saved-practice name', { max: 80 }), settings: settings(value.settings, `saved practice ${value.name}`) };
    }),
    lte: own(input, 'lte') ? validateLTEData(input.lte) : freshLTEData(),
    ltc: own(input, 'ltc') ? validateLTCData(input.ltc) : freshLTCData(),
  };
}
const DATABASE = 'corner-lab';
const STORE = 'state';
const RECORD = 'data';
const hasDatabase = () => typeof globalThis.indexedDB?.open === 'function';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(DATABASE, 1);
    let blocked = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onerror = () => reject(request.error || new Error('Device storage could not be opened.'));
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Close other Corner Lab tabs and reopen the app to finish opening device storage.'));
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      if (blocked) database.close();
      else resolve(database);
    };
  });
}

async function browserRecord(mode, value) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      let operationError;
      transaction.onerror = event => { operationError = event.target.error; };
      transaction.onabort = () => reject(transaction.error || operationError || new Error('Device storage could not be saved.'));
      const store = transaction.objectStore(STORE);
      const request = mode === 'readonly' ? store.get(RECORD) : store.put(value, RECORD);
      // A successful request can still be rolled back. Only report a save after commit.
      transaction.oncomplete = () => resolve(request.result);
    });
  } finally {
    database.close();
  }
}

function legacyData() {
  const raw = localStorage.getItem(KEY);
  return raw ? validateData(JSON.parse(raw)) : null;
}

export async function loadData() {
  if(window.cornerlabNative) {
    const result=await window.cornerlabNative.load();
    return result?validateData(typeof result==='string'?JSON.parse(result):result):freshData();
  }
  if (!hasDatabase()) return legacyData() || freshData();
  const stored = await browserRecord('readonly');
  if (stored !== undefined) return validateData(typeof stored === 'string' ? JSON.parse(stored) : stored);
  const previous = legacyData();
  if (!previous) return freshData();
  // Keep the old file until migration commits; never fall back to stale data on a DB error.
  await browserRecord('readwrite', previous);
  try { localStorage.removeItem(KEY); } catch { /* The committed record remains authoritative. */ }
  return previous;
}
let queue=Promise.resolve();
export function saveData(data) {
  const copy=JSON.parse(JSON.stringify(data));
  queue=queue.catch(()=>{}).then(async()=>{
    if(window.cornerlabNative) await window.cornerlabNative.save(copy);
    else if (hasDatabase()) await browserRecord('readwrite', copy);
    else localStorage.setItem(KEY,JSON.stringify(copy));
  });
  return queue;
}
export function download(filename,content,type='application/json') {
  const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;a.hidden=true;
  document.body.appendChild(a);
  try { a.click(); } finally { a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000); }
}
