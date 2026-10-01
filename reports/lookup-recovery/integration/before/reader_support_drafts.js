(function (root) {
  'use strict';
  function createSession() {
    const records = new Map();
    let active = null, pending = null, running = false;
    const session = {
      records,
      register(controller) {
        active = controller;
        return () => { if (active === controller) active = null; };
      },
      blocked() { return !running && !!active && active.hasChanges(); },
      hasChanges() { return (!!active && active.hasChanges()) || [...records.values()].some(record => record.dirty); },
      request(run) {
        if (!session.blocked()) return run();
        // Setters in one host action form one transition, not competing dialogs.
        if (pending) { if (pending.collecting) pending.steps.push(run); return false; }
        const request = { steps: [run], collecting: true };
        pending = request;
        queueMicrotask(() => { request.collecting = false; });
        active.defer({
          type: 'transition',
          cancel() { if (pending === request) pending = null; },
          run() {
            if (pending !== request) return false;
            pending = null;
            running = true;
            try { for (const step of request.steps) step(); }
            finally { running = false; }
            return true;
          }
        });
        return false;
      },
      protectUnload(event) {
        if (!session.hasChanges()) return;
        event.preventDefault();
        event.returnValue = '';
      }
    };
    return session;
  }
  const api = { createSession };
  if (root) { root.AlloModules = root.AlloModules || {}; root.AlloModules.ReaderSupportDrafts = api; }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : null);
