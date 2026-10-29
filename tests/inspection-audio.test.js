import test from 'node:test';
import assert from 'node:assert/strict';
import { createInspectionAudio } from '../app/inspection-audio.js';

function environment(t, { state = 'running', prefixed = false } = {}) {
  let milliseconds = 0;
  const instances = [];
  class FakeAudioContext {
    constructor() {
      this.state = state;
      this.currentTime = 0;
      this.destination = {};
      this.oscillators = [];
      this.gains = [];
      this.resumes = [];
      instances.push(this);
    }
    resume() {
      return new Promise((resolve, reject) => this.resumes.push({
        resolve: () => { this.state = 'running'; resolve(); }, reject,
      }));
    }
    createOscillator() {
      const oscillator = {
        frequency: { setValueAtTime() {} },
        starts: [], stops: [], disconnected: false,
        connect() {}, disconnect() { this.disconnected = true; },
        start(at) { this.starts.push(at); },
        stop(at) { this.stops.push(at); },
      };
      this.oscillators.push(oscillator);
      return oscillator;
    }
    createGain() {
      const gain = {
        gain: { setValueAtTime() {}, linearRampToValueAtTime() {} },
        disconnected: false, connect() {}, disconnect() { this.disconnected = true; },
      };
      this.gains.push(gain);
      return gain;
    }
  }
  const originalAudio = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  const originalPrefixed = Object.getOwnPropertyDescriptor(globalThis, 'webkitAudioContext');
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: prefixed ? undefined : FakeAudioContext });
  Object.defineProperty(globalThis, 'webkitAudioContext', { configurable: true, value: prefixed ? FakeAudioContext : undefined });
  t.mock.method(performance, 'now', () => milliseconds);
  t.after(() => {
    if (originalAudio) Object.defineProperty(globalThis, 'AudioContext', originalAudio);
    else delete globalThis.AudioContext;
    if (originalPrefixed) Object.defineProperty(globalThis, 'webkitAudioContext', originalPrefixed);
    else delete globalThis.webkitAudioContext;
  });
  return { instances, advance(seconds) { milliseconds += seconds * 1000; } };
}

test('inspection audio schedules one 8-second beep and two 12-second beeps offline', t => {
  const { instances } = environment(t);
  const audio = createInspectionAudio();
  audio.start();
  assert.equal(instances.length, 1);
  assert.deepEqual(instances[0].oscillators.map(o => o.starts[0]), [8, 12, 12.2]);
  assert.ok(instances[0].oscillators.every(o => o.stops[0] > o.starts[0]));
  audio.cancel();
  assert.ok(instances[0].oscillators.every(o => o.stops.length === 2 && o.stops[1] === undefined && o.disconnected));
  assert.ok(instances[0].gains.every(g => g.disconnected));
  audio.cancel();
  assert.ok(instances[0].oscillators.every(o => o.stops.length === 2), 'repeated cancellation is harmless');
});

test('resuming starts in the trusted call and preserves the real inspection deadline', async t => {
  const { instances, advance } = environment(t, { state: 'suspended' });
  const audio = createInspectionAudio();
  audio.start();
  const context = instances[0];
  assert.equal(context.resumes.length, 1, 'resume must be called before start returns');
  assert.equal(context.oscillators.length, 0);
  advance(3);
  context.currentTime = 1;
  context.resumes[0].resolve();
  await Promise.resolve();
  assert.deepEqual(context.oscillators.map(o => o.starts[0]), [6, 10, 10.2]);
  audio.cancel();
});

test('cancel during deferred resume suppresses every pending cue', async t => {
  const { instances } = environment(t, { state: 'suspended' });
  const audio = createInspectionAudio();
  audio.start();
  audio.cancel();
  instances[0].resumes[0].resolve();
  await Promise.resolve();
  assert.equal(instances[0].oscillators.length, 0);
});

test('starting another inspection silences old scheduled cues and reuses the context', t => {
  const { instances, advance } = environment(t);
  const audio = createInspectionAudio();
  audio.start();
  const context = instances[0];
  advance(10);
  context.currentTime = 10;
  context.oscillators[0].onended();
  audio.start();
  assert.equal(instances.length, 1);
  assert.equal(context.oscillators[0].stops.length, 1, 'ended cues are already released');
  assert.ok(context.oscillators.slice(0, 3).every(o => o.disconnected));
  assert.deepEqual(context.oscillators.slice(1, 3).map(o => o.stops.length), [2, 2]);
  assert.deepEqual(context.oscillators.slice(3).map(o => o.starts[0]), [18, 22, 22.2]);
  audio.cancel();
});

test('restarting while resume is deferred schedules only the new inspection', async t => {
  const { instances, advance } = environment(t, { state: 'suspended' });
  const audio = createInspectionAudio();
  audio.start();
  const context = instances[0];
  advance(4);
  audio.start();
  context.resumes[0].resolve();
  await Promise.resolve();
  assert.equal(context.oscillators.length, 0);
  context.resumes[1].resolve();
  await Promise.resolve();
  assert.deepEqual(context.oscillators.map(o => o.starts[0]), [8, 12, 12.2]);
  audio.cancel();
});

test('late audio resume skips elapsed cues instead of replaying them', async t => {
  const { instances, advance } = environment(t, { state: 'suspended' });
  const audio = createInspectionAudio();
  audio.start();
  advance(9);
  instances[0].resumes[0].resolve();
  await Promise.resolve();
  assert.deepEqual(instances[0].oscillators.map(o => o.starts[0]), [3, 3.2]);
  audio.cancel();
});

test('Safari prefixed audio context is supported', t => {
  const { instances } = environment(t, { prefixed: true });
  const audio = createInspectionAudio();
  audio.start();
  assert.equal(instances[0].oscillators.length, 3);
  audio.cancel();
});

test('a closed audio context is recreated for the next inspection', t => {
  const { instances } = environment(t);
  const audio = createInspectionAudio();
  audio.start();
  instances[0].state = 'closed';
  audio.start();
  assert.equal(instances.length, 2);
  assert.ok(instances[0].oscillators.every(o => o.disconnected));
  assert.equal(instances[1].oscillators.length, 3);
  audio.cancel();
});

test('unsupported audio and resume failures report unavailability without throwing', async t => {
  const { instances } = environment(t, { state: 'suspended' });
  let unavailable = 0;
  const audio = createInspectionAudio({ onUnavailable: () => unavailable++ });
  assert.doesNotThrow(() => audio.start());
  instances[0].resumes[0].reject(new Error('Audio is disabled'));
  await Promise.resolve();
  assert.equal(unavailable, 1);
  assert.equal(instances[0].oscillators.length, 0);
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: undefined });
  const unsupported = createInspectionAudio({ onUnavailable: () => unavailable++ });
  assert.doesNotThrow(() => unsupported.start());
  assert.equal(unavailable, 2);
  assert.doesNotThrow(() => unsupported.cancel());
});

test('an old rejected resume cannot silence a newer inspection or show an error', async t => {
  const { instances } = environment(t, { state: 'suspended' });
  let unavailable = 0;
  const audio = createInspectionAudio({ onUnavailable: () => unavailable++ });
  audio.start();
  audio.start();
  const context = instances[0];
  context.resumes[1].resolve();
  await Promise.resolve();
  context.resumes[0].reject(new Error('Old resume failed'));
  await Promise.resolve();
  assert.equal(unavailable, 0);
  assert.deepEqual(context.oscillators.map(o => o.stops.length), [1, 1, 1]);
  audio.cancel();
});
