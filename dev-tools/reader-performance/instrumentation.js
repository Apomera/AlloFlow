// Runs before React in an isolated browser context. No user storage is touched.
(() => {
  const enabled = new URLSearchParams(location.search).get('instrument') === '1';
  const counts = Object.create(null), milliseconds = Object.create(null);
  let longTasks = 0, longTaskMs = 0, longestTaskMs = 0, longTaskSince = performance.now();
  const supportsLongTasks = PerformanceObserver.supportedEntryTypes.includes('longtask');
  function recordLongTasks(entries) { for (const entry of entries) { if (entry.startTime < longTaskSince) continue; longTasks++; longTaskMs += entry.duration; longestTaskMs = Math.max(longestTaskMs, entry.duration); } }
  const longTaskObserver = supportsLongTasks ? new PerformanceObserver(list => recordLongTasks(list.getEntries())) : null;
  longTaskObserver?.observe({ type: 'longtask', buffered: false });
  const timers = new Set(), frames = new Set();
  const nativeTimeout = window.setTimeout.bind(window), nativeClear = window.clearTimeout.bind(window);
  const nativeFrame = window.requestAnimationFrame.bind(window), nativeCancel = window.cancelAnimationFrame.bind(window);
  let commits = 0, commitMs = 0, audioStarts = 0;
  const audioRefs = [], NativeAudio = window.Audio;
  window.Audio = function (...args) {
    const audio = new NativeAudio(...args); audioRefs.push(new WeakRef(audio));
    audio.addEventListener('playing', () => audioStarts++); return audio;
  };
  window.Audio.prototype = NativeAudio.prototype;
  function add(key, value = 1) { counts[key] = (counts[key] || 0) + value; }
  if (enabled) {
    window.setTimeout = (callback, delay, ...args) => {
      let id = nativeTimeout(() => { timers.delete(id); callback(...args); }, delay);
      timers.add(id); return id;
    };
    window.clearTimeout = id => { timers.delete(id); nativeClear(id); };
    window.requestAnimationFrame = callback => {
      let id = nativeFrame(time => { frames.delete(id); callback(time); });
      frames.add(id); return id;
    };
    window.cancelAnimationFrame = id => { frames.delete(id); nativeCancel(id); };
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      const start = performance.now();
      try { return write.call(this, key, value); }
      finally {
        add('storageWrites'); add('storageUtf16Bytes', 2 * String(value).length);
        add('storage:' + key); milliseconds.storage = (milliseconds.storage || 0) + performance.now() - start;
      }
    };
    const walk = Document.prototype.createTreeWalker;
    Document.prototype.createTreeWalker = function (...args) { add('treeWalkers'); return walk.apply(this, args); };
    const text = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    Object.defineProperty(Node.prototype, 'textContent', { ...text, get() {
      const result = text.get.call(this); add('textContentReads'); add('textContentChars', (result || '').length); return result;
    } });
  }
  window.readerMetrics = {
    enabled,
    wrap(object, key) {
      if (!enabled || typeof object[key] !== 'function') return;
      const original = object[key];
      object[key] = function (...args) {
        const start = performance.now(); add(key);
        try { return original.apply(this, args); }
        finally { milliseconds[key] = (milliseconds[key] || 0) + performance.now() - start; }
      };
    },
    onRender(_id, _phase, duration) { commits++; commitMs += duration; },
    reset() { longTaskSince = performance.now(); longTaskObserver?.takeRecords(); Object.keys(counts).forEach(key => delete counts[key]); Object.keys(milliseconds).forEach(key => delete milliseconds[key]); commits = 0; commitMs = 0; longTasks = 0; longTaskMs = 0; longestTaskMs = 0; },
    snapshot() { if (longTaskObserver) recordLongTasks(longTaskObserver.takeRecords()); return { longTasks: supportsLongTasks ? {count:longTasks,totalMs:longTaskMs,maxMs:longestTaskMs} : null, audioStarts, playingAudio: audioRefs.filter(ref => { const audio = ref.deref(); return audio && !audio.paused && !audio.ended; }).length, counts: { ...counts }, milliseconds: { ...milliseconds },
      commits: enabled ? commits : null, commitMs: enabled ? commitMs : null, outstandingTimers: enabled ? timers.size : null, outstandingFrames: enabled ? frames.size : null }; }
  };
})();
