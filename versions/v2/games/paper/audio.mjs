// Local synthesized sounds: no media downloads, voices, or copied game audio.
export class WorkshopAudio {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.context = null;
    this.lastImpact = -Infinity;
    this.voices = 0;
    this.active = new Map();
  }
  unlock() {
    if (!this.enabled) return;
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return;
    try {
      this.context ||= new Audio();
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch { /* Silent fallback keeps the game playable. */ }
  }
  setEnabled(value, allowResume = true) { this.enabled = value; if (!value || !allowResume) this.suspend(); else this.unlock(); }
  suspend() {
    for (const [oscillator, gain] of this.active) {
      try { gain.gain.cancelScheduledValues(this.context.currentTime); gain.gain.setValueAtTime(0, this.context.currentTime); oscillator.stop(); oscillator.disconnect(); gain.disconnect(); } catch {}
    }
    this.active.clear(); this.voices = 0;
    if (this.context?.state === 'running') this.context.suspend().catch(() => {});
  }
  tone(frequency, duration, type = 'sine', volume = 0.035, bend = 0.6) {
    const c = this.context;
    if (!this.enabled || !c || c.state !== 'running' || this.voices >= 6) return;
    this.voices++;
    const o = c.createOscillator(), gain = c.createGain(), now = c.currentTime;
    o.type = type; o.frequency.setValueAtTime(frequency, now);
    o.frequency.exponentialRampToValueAtTime(Math.max(25, frequency * bend), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    o.connect(gain); gain.connect(c.destination);
    this.active.set(o, gain);
    o.onended = () => { if (this.active.delete(o)) this.voices--; o.disconnect(); gain.disconnect(); };
    o.start(now); o.stop(now + duration + .01);
  }
  play(type, material = 'paper', intensity = 1) {
    const c = this.context;
    if (!c || !this.enabled) return;
    if (type === 'impact') {
      if (c.currentTime - this.lastImpact < .09) return;
      this.lastImpact = c.currentTime;
      this.tone(material === 'wood' ? 170 : 620, material === 'wood' ? .12 : .055,
        material === 'wood' ? 'triangle' : 'sawtooth', Math.min(.045, .012 + intensity * .003));
    } else if (type === 'break') {
      this.tone(material === 'wood' ? 110 : 850, .17, material === 'wood' ? 'triangle' : 'sawtooth', .04, .25);
      this.tone(material === 'wood' ? 245 : 410, .11, 'triangle', .022, .4);
    } else if (type === 'launch') this.tone(280, .19, 'triangle', .045, 2.2);
    else if (type === 'down') { this.tone(610, .15, 'sine', .04, .7); this.tone(920, .19, 'sine', .02, .85); }
    else if (type === 'won') { this.tone(523, .4, 'sine', .025, 1); this.tone(659, .45, 'sine', .02, 1); this.tone(784, .5, 'sine', .02, 1); }
    else if (type === 'lost') this.tone(220, .3, 'triangle', .025, .7);
  }
}
