// Offline inspection cues. AudioContext's clock avoids depending on UI timer updates.
export function createInspectionAudio({ onUnavailable = () => {} } = {}) {
  let context;
  let generation = 0;
  const active = new Set();

  function release(sound) {
    sound.oscillator.onended = null;
    try { sound.oscillator.disconnect(); } catch {}
    try { sound.gain.disconnect(); } catch {}
    active.delete(sound);
  }

  function cancel() {
    generation += 1;
    for (const sound of active) {
      try { sound.oscillator.stop(); } catch {}
      release(sound);
    }
  }

  function unavailable(token) {
    if (token !== generation) return;
    cancel();
    onUnavailable();
  }

  function beep(at) {
    const sound = { oscillator: context.createOscillator(), gain: context.createGain() };
    active.add(sound);
    sound.oscillator.type = 'sine';
    sound.oscillator.frequency.setValueAtTime(880, at);
    sound.gain.gain.setValueAtTime(0, at);
    sound.gain.gain.linearRampToValueAtTime(0.18, at + 0.012);
    sound.gain.gain.linearRampToValueAtTime(0, at + 0.12);
    sound.oscillator.connect(sound.gain);
    sound.gain.connect(context.destination);
    sound.oscillator.onended = () => release(sound);
    sound.oscillator.start(at);
    sound.oscillator.stop(at + 0.13);
  }

  function schedule(token, startedAt) {
    if (token !== generation) return;
    try {
      if (context.state !== 'running') return unavailable(token);
      // Resuming may be asynchronous: keep cues relative to the inspection start.
      const elapsed = (performance.now() - startedAt) / 1000;
      const now = context.currentTime;
      for (const [seconds, offsets] of [[8, [0]], [12, [0, 0.2]]]) {
        // A late resume should never replay inspection cues that have already passed.
        if (elapsed > seconds) continue;
        for (const offset of offsets) beep(now + seconds - elapsed + offset);
      }
    } catch {
      unavailable(token);
    }
  }

  function start() {
    cancel();
    const token = generation;
    const startedAt = performance.now();
    try {
      if (!context || context.state === 'closed') {
        const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContext) return unavailable(token);
        context = new AudioContext();
      }
      if (context.state === 'running') schedule(token, startedAt);
      else {
        // Call resume synchronously so it retains the click/keyboard user gesture.
        Promise.resolve(context.resume()).then(
          () => schedule(token, startedAt),
          () => unavailable(token),
        );
      }
    } catch {
      unavailable(token);
    }
  }

  return { start, cancel };
}
