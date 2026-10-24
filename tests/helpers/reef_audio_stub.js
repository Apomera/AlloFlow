// Lane I3: a Web Audio stand-in for jsdom (which has none). It records every node, every
// connection, every start/stop and every parameter automation, so tests can count what the
// reef soundscape schedules and check that unmounting lets all of it go.
class Param {
  constructor(v) { this.value = v; this.events = []; }
  setValueAtTime(v, t) { this.events.push(['set', v, t]); return this; }
  linearRampToValueAtTime(v, t) { this.events.push(['lin', v, t]); return this; }
  exponentialRampToValueAtTime(v, t) { if (!(v > 0)) throw new RangeError('exponential ramp to ' + v); this.events.push(['exp', v, t]); return this; }
  setTargetAtTime(v, t, c) { this.events.push(['target', v, t, c]); return this; }
  cancelScheduledValues(t) { this.events.push(['cancel', t]); return this; }
}
class Node {
  constructor(ctx, kind) { this.ctx = ctx; this.kind = kind; this.outs = new Set(); this.disconnected = false; ctx.nodes.push(this); }
  connect(dest) {
    if (this.ctx.closedFor(this)) throw new Error('connect after dispose');
    this.outs.add(dest); this.ctx.connections.push([this, dest]); return dest;
  }
  disconnect() { this.outs.clear(); this.disconnected = true; }
}
class Source extends Node {
  constructor(ctx, kind) { super(ctx, kind); this.startAt = null; this.stopAt = null; this.onended = null; this.playbackRate = new Param(1); }
  start(at, offset) { if (this.startAt !== null) throw new Error('started twice'); this.startAt = at == null ? this.ctx.currentTime : at; this.offset = offset || 0; this.ctx.started.push(this); }
  stop(at) { if (this.startAt === null) throw new Error('stop before start'); this.stopAt = at == null ? this.ctx.currentTime : at; }
}
export class StubAudioContext {
  constructor(state = 'running') {
    this.state = state; this.currentTime = 0; this.sampleRate = 8000; this.nodes = []; this.connections = []; this.started = []; this.resumed = 0; this.listeners = new Set();
    this.destination = { kind: 'destination', connect() {}, disconnect() {} };
  }
  closedFor() { return false; }
  resume() { this.resumed += 1; if (this.onResume) this.onResume(); if (this.blockResume) return Promise.resolve(); this.setState('running'); return Promise.resolve(); }
  setState(s) { if (this.state === s) return; this.state = s; this.listeners.forEach((f) => f()); }
  addEventListener(type, f) { if (type === 'statechange') this.listeners.add(f); }
  removeEventListener(type, f) { if (type === 'statechange') this.listeners.delete(f); }
  close() { throw new Error('the shared context must never be closed'); }
  createGain() { const n = new Node(this, 'gain'); n.gain = new Param(1); return n; }
  createBiquadFilter() { const n = new Node(this, 'filter'); n.type = 'lowpass'; n.frequency = new Param(350); n.Q = new Param(1); return n; }
  createStereoPanner() { const n = new Node(this, 'panner'); n.pan = new Param(0); return n; }
  createDynamicsCompressor() { const n = new Node(this, 'limiter'); ['threshold', 'knee', 'ratio', 'attack', 'release'].forEach((k) => { n[k] = new Param(0); }); return n; }
  createOscillator() { const n = new Source(this, 'osc'); n.type = 'sine'; n.frequency = new Param(440); return n; }
  createBufferSource() { const n = new Source(this, 'buffer'); n.buffer = null; n.loop = false; return n; }
  createBuffer(channels, length, sampleRate) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: (c) => data[c] };
  }
  // Move the clock and end every source whose stop time has passed.
  advance(seconds) {
    this.currentTime += seconds;
    for (const s of this.started) if (!s.ended && s.stopAt !== null && s.stopAt <= this.currentTime) { s.ended = true; if (s.onended) s.onended(); }
  }
  // Nodes still wired into the graph (connected and not disconnected).
  wired() { return this.nodes.filter((n) => !n.disconnected && n.outs.size > 0); }
  playing() { return this.started.filter((s) => s.stopAt === null || s.stopAt > this.currentTime); }
}
export function energy(buffer) { const d = buffer.getChannelData(0); let e = 0; for (let i = 0; i < d.length; i++) e += d[i] * d[i]; return e; }
