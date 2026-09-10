// Presentation only. All identity review, awards and checkout stay in the actual
// Store Portal and its existing fictional-server bridge.
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function unifiedDemoToolbar(metadata = {}) {
  const learners = Array.isArray(metadata.learners) ? metadata.learners.map(row => ({ learnerId: String(row.learnerId || ''), codename: String(row.codename || ''), studentId: String(row.studentId || '') })) : [];
  const data = { classId: String(metadata.classId || ''), classLabel: String(metadata.classLabel || 'Prepared fictional class'), categoryId: String(metadata.categoryId || ''), primaryStudentId: String(metadata.primaryStudentId || ''), notebookId: String(metadata.notebookId || ''), learners };
  return `<style>
#unified-demo{box-sizing:border-box;background:#102a40;color:#f3f8ff;padding:20px max(18px,calc((100% - 1100px)/2));font:15px/1.5 system-ui,sans-serif;border-bottom:3px solid #74d4c0}
#unified-demo *{box-sizing:border-box}#unified-demo [hidden]{display:none!important}#unified-demo .demo-heading{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}#unified-demo h1{font-size:clamp(21px,3vw,28px);line-height:1.2;margin:0;color:#fff}#unified-demo h2{font-size:20px;margin:0 0 6px;color:#fff}#unified-demo p{margin:7px 0;color:#e0ecf8}#unified-demo .demo-time{color:#c3ddd9;font-size:13px}#unified-demo nav{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:16px 0}#unified-demo a{color:#c1f1ff;text-underline-offset:3px}#unified-demo nav a{padding:11px 12px;border:1px solid #83a4bf;border-radius:9px;text-decoration:none;color:#f3f8ff;min-height:44px;display:flex;align-items:center;gap:7px;font-weight:750}#unified-demo nav a[aria-current=step]{background:#d8f5ee;color:#122f37;border-color:#d8f5ee}#unified-demo .demo-scene{padding:14px 16px;border:1px solid #45627c;border-radius:12px;background:#17364f}#unified-demo .demo-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}#unified-demo button,#unified-demo .demo-button{min-height:44px;padding:10px 15px;border:1px solid #a8c7df;border-radius:8px;background:#eff8ff;color:#132d43;font:750 14px/1.35 system-ui,sans-serif;text-decoration:none;cursor:pointer}#unified-demo button:disabled{opacity:.65;cursor:wait}#unified-demo .demo-roster{list-style:none;display:flex;flex-wrap:wrap;gap:7px;margin:10px 0;padding:0}#unified-demo .demo-roster li{border:1px solid #597a92;border-radius:999px;padding:5px 10px;overflow-wrap:anywhere}#unified-demo .demo-small{font-size:13px;color:#c7dbe9}#unified-demo #demo-status{min-height:1.5em;margin:10px 0 0}#unified-demo #demo-status[data-tone=error]{color:#ffcfb2}#unified-demo details{margin-top:12px;border-top:1px solid #45627c;padding-top:7px}#unified-demo summary{cursor:pointer;min-height:44px;padding:9px 0;font-weight:700}#unified-demo label{color:#e0ecf8;display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0}#unified-demo select{width:auto;margin:0;min-height:44px;background:#eff8ff;color:#132d43;border:1px solid #a8c7df;border-radius:8px;padding:8px;font:inherit}#unified-demo :is(a,button,select,summary):focus-visible{outline:3px solid #ffd875;outline-offset:3px}#unified-demo .demo-disclosure{margin-top:12px;max-width:100ch;font-size:12px;color:#c7dbe9}#unified-demo code{font:inherit;font-weight:700;color:inherit;overflow-wrap:anywhere}
#demo-optional-voice{margin-top:16px;padding:10px 12px;border:1px solid #8291a5;border-radius:10px}#demo-optional-voice>summary{min-height:44px;padding:10px 0;cursor:pointer;font-weight:750;line-height:1.5}#demo-optional-voice>summary:focus-visible{outline:3px solid #6046b6;outline-offset:3px}@media(prefers-color-scheme:dark){#demo-optional-voice>summary:focus-visible{outline-color:#fbbf24}}
@media(max-width:600px){#unified-demo{padding:16px}#unified-demo nav{grid-template-columns:repeat(2,minmax(0,1fr))}#unified-demo nav a{font-size:13px}#unified-demo .demo-scene{padding:12px}#unified-demo .demo-actions>*{max-width:100%}}
@media(forced-colors:active){#unified-demo,#unified-demo .demo-scene{background:Canvas;color:CanvasText;border-color:CanvasText}#unified-demo :is(h1,h2,p,summary,label){color:CanvasText}#unified-demo a{color:LinkText}#unified-demo nav a[aria-current=step]{background:Highlight;color:HighlightText}}
</style><aside id="unified-demo" aria-label="Fictional AlloFlow guided demo" data-demo-metadata="${escapeHtml(JSON.stringify(data))}">
<div class="demo-heading"><h1>AlloFlow demo • Fictional data only</h1><span class="demo-time">About 5 minutes · No sign-in needed</span></div>
<nav aria-label="Demo steps"><a href="/?demoStep=class&amp;role=staff" data-demo-step="class" aria-current="step">1 · Prepared class</a><a href="/?demoStep=recognize&amp;role=staff" data-demo-step="recognize">2 · Recognize</a><a href="/?demoStep=balance&amp;role=student" data-demo-step="balance">3 · Student balance</a><a href="/?demoStep=shop&amp;role=cashier" data-demo-step="shop">4 · Shop</a></nav>
<section id="demo-scene-class" class="demo-scene" aria-labelledby="demo-class-title"><h2 id="demo-class-title">Your class is ready</h2><p><strong>${escapeHtml(data.classLabel)}</strong> is a preloaded fictional snapshot. Its reviewed learner links and staff access are already prepared for this demo.</p><ul id="demo-prepared-roster" class="demo-roster" aria-label="Prepared fictional learner codenames">${learners.map(row => `<li>${escapeHtml(row.codename)}</li>`).join('')}</ul><p class="demo-small">No import chores or Google connection. Start with a 5-point recognition for Avery, then see the student balance and buy one Notebook.</p><div class="demo-actions"><a id="demo-start" class="demo-button" href="/?demoStep=recognize&amp;role=staff">Start demo</a><span class="demo-small">Expected path: 60 → 65 → 55 points, if each action is completed once.</span></div></section>
<section id="demo-scene-recognize" class="demo-scene" aria-labelledby="demo-recognize-title" hidden><h2 id="demo-recognize-title">Give a specific recognition</h2><p>Load the typed example, choose <strong>Review typed recognition</strong>, verify Avery's school identity, then use the student in the award form and confirm <strong>Record award</strong>.</p><div class="demo-actions"><button id="demo-load-example" type="button" disabled>Load 5-point example</button><a href="/?demoStep=balance&amp;role=student">After confirming: see student balance →</a></div><p class="demo-small">Loading the example only fills a request. It never sends points. Award once for the expected balance of 65.</p><details id="demo-voice-note"><summary>Optional dictation — not preverified</summary><p class="demo-small">Use the typed example for this walkthrough. The actual on-device dictation control is optional; it checks browser support only when you press Start. Nothing listens automatically, and there is no cloud fallback.</p></details></section>
<section id="demo-scene-balance" class="demo-scene" aria-labelledby="demo-balance-title" hidden><h2 id="demo-balance-title">See Avery's student view</h2><p>The balance and activity below come from the actual Store rules. After one 5-point award, the starting 60 points become 65. The student can browse rewards; the cashier completes a purchase.</p><div class="demo-actions"><a class="demo-button" href="/?demoStep=shop&amp;role=cashier">Next: shop as cashier</a></div></section>
<section id="demo-scene-shop" class="demo-scene" aria-labelledby="demo-shop-title" hidden><h2 id="demo-shop-title">Buy one Notebook</h2><p>Select Avery in cashier checkout, add <strong>one Notebook (10 points)</strong>, then use <strong>Refresh, review, and complete checkout</strong>. Verify the live confirmation before accepting.</p><p class="demo-small">After the recognition and one purchase: 65 → 55 points. The receipt below confirms what actually happened; navigation never makes a purchase.</p><div class="demo-actions"><a href="/?demoStep=balance&amp;role=student">See the updated student balance →</a></div></section>
<p id="demo-status" role="status" aria-live="polite" aria-atomic="true">Preparing the actual Store view…</p>
<details id="demo-advanced"><summary>Advanced demo controls</summary><div class="demo-actions"><label>Simulated role <select id="demo-role"><option value="staff">Staff</option><option value="student">Student</option><option value="cashier">Cashier</option><option value="admin">Administrator</option></select></label><button id="demo-reset" type="button">Reset fictional records</button><a href="/?demoStep=class&amp;role=staff&amp;demoAdvanced=print">Optional: explore Print Lab</a></div><p class="demo-small">Print Lab has its own manual review workflow. No email is delivered and no printer is operated. Reset starts this fictional walkthrough again.</p></details>
<p class="demo-disclosure">Classroom: simulated, prepared roster snapshot — no live Google OAuth. Store: actual review, ledger and checkout rules with in-memory fictional services. Role switching is a demo simulator, not student authentication. Educator Evaluation is separate and outside this walkthrough.</p>
</aside>`;
}

export function unifiedDemoClientScript() {
  return `(${unifiedDemoClient.toString()})();`;
}

function unifiedDemoClient() {
  'use strict';
  const root = document.getElementById('unified-demo');
  if (!root) return;
  const $ = id => document.getElementById(id);
  let metadata;
  try { metadata = JSON.parse(root.getAttribute('data-demo-metadata')); } catch { return; }
  const query = new URL(location.href).searchParams;
  const scenes = { class: { role: 'staff', tab: 'dashboard' }, recognize: { role: 'staff', tab: 'award' }, balance: { role: 'student', tab: 'dashboard' }, shop: { role: 'cashier', tab: 'store' } };
  const requested = query.get('demoStep'), step = Object.prototype.hasOwnProperty.call(scenes, requested) ? requested : 'class';
  const role = $('demo-role').value;
  root.querySelectorAll('[data-demo-step]').forEach(link => { if (link.dataset.demoStep === step) link.setAttribute('aria-current', 'step'); else link.removeAttribute('aria-current'); });
  Object.keys(scenes).forEach(name => { $('demo-scene-' + name).hidden = name !== step; });
  function status(message, error = false) { $('demo-status').textContent = message; $('demo-status').dataset.tone = error ? 'error' : 'ready'; }
  let preparing = false, revision = 0, departed = false;
  const contextGeneration = document.body.getAttribute('data-demo-generation');
  const current = () => !departed && document.body.contains(root) && $('demo-role').value === role && document.body.getAttribute('data-demo-generation') === contextGeneration;
  ['input', 'change'].forEach(name => document.addEventListener(name, event => { if (['typed-recognition-input', 'typed-recognition-category', 'linked-class', 'demo-role'].includes(event.target.id)) revision++; }));
  window.addEventListener('pagehide', () => { departed = true; revision++; });
  function waitFor(predicate) {
    return new Promise((resolve, reject) => {
      let timer, observer, finished = false;
      const finish = error => { if (finished) return; finished = true; clearTimeout(timer); if (observer) observer.disconnect(); document.removeEventListener('input', check); document.removeEventListener('change', check); error ? reject(error) : resolve(); };
      const check = () => { try { if (!current()) return finish(new Error('The demo view changed. Use its current controls.')); if (predicate()) finish(); } catch (error) { finish(error); } };
      observer = new MutationObserver(check); observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
      // The shared revision listener was registered first. Property-only edits
      // do not trigger MutationObserver, so check those events directly too.
      document.addEventListener('input', check); document.addEventListener('change', check);
      timer = setTimeout(() => finish(new Error('The Store is not ready yet. Wait for its status, then try again.')), 15000); check();
    });
  }
  function pendingAward() {
    if ($('award-submit')?.disabled || ($('retry-award') && !$('retry-award').hidden) || ($('notice')?.classList.contains('busy'))) return true;
    try { return !!(sessionStorage.getItem('alloflow_school_rewards_retry_award') || sessionStorage.getItem('alloflow_school_rewards_retry_award_group')); } catch { return true; }
  }
  function requireEmptyRequest() {
    if (!current() || role !== 'staff' || $('actor-pill')?.textContent.trim() !== 'STAFF') throw new Error('Use the Recognize step in the staff view.');
    if (!$('typed-recognition-input') || $('typed-recognition-input').value !== '') throw new Error('Keep or explicitly clear the current typed request before loading an example. It was not replaced.');
    if (pendingAward()) throw new Error('Finish the current Store operation or exact pending award retry first. No draft was replaced.');
    if ($('typed-voice-cancel') && !$('typed-voice-cancel').hidden) throw new Error('Finish or cancel dictation before loading the typed example.');
  }
  function choose(id, value) { const node = $(id); node.value = value; if (node.value !== value) throw new Error('The prepared class or category is unavailable. No example was inserted.'); node.dispatchEvent(new Event('change', { bubbles: true })); }
  $('demo-load-example').onclick = async () => {
    if (preparing) return;
    let started;
    try {
      requireEmptyRequest();
      const learners = (metadata.learners || []).filter(row => row.studentId === metadata.primaryStudentId);
      if (!metadata.classId || !metadata.categoryId || learners.length !== 1 || !learners[0].codename) throw new Error('The prepared fictional example is unavailable. Reset the fictional records or use the actual form.');
      preparing = true; $('demo-load-example').disabled = true; started = revision;
      status('Loading the prepared class through the actual Store controls…');
      $('linked-classes-load').click();
      await waitFor(() => { if (revision !== started) throw new Error('Your draft or selection changed. Your current choices were kept; try again when ready.'); return Array.from($('linked-class').options).some(option => option.value === metadata.classId) && !$('notice').classList.contains('busy'); });
      requireEmptyRequest(); if (revision !== started) throw new Error('A selection changed while the class loaded. Your current choices were kept; try again when ready.');
      if (!Array.from($('typed-recognition-category').options).some(option => option.value === metadata.categoryId)) throw new Error('The prepared category is no longer active. Use the current Store controls.');
      choose('linked-class', metadata.classId); choose('typed-recognition-category', metadata.categoryId);
      $('typed-recognition-input').value = 'give ' + learners[0].codename + ' 5 points for helping'; $('typed-recognition-input').dispatchEvent(new Event('input', { bubbles: true }));
      $('typed-recognition-input').focus(); $('typed-recognition-controls').scrollIntoView({ block: 'start', behavior: 'auto' });
      status('Example loaded, not awarded. Next choose Review typed recognition, verify Avery, then confirm the award separately.');
    } catch (error) { if (current()) status(error.message || 'The example could not be prepared. Use the actual Store controls.', true); }
    finally { preparing = false; if (current()) $('demo-load-example').disabled = false; }
  };
  function collapseOptionalVoice() {
    const fieldset = $('typed-voice-controls'); if (!fieldset || $('demo-optional-voice')) return;
    const details = document.createElement('details'), summary = document.createElement('summary'); details.id = 'demo-optional-voice'; summary.textContent = 'Optional on-device dictation'; details.appendChild(summary);
    fieldset.parentNode.insertBefore(details, fieldset); details.appendChild(fieldset);
    const cancelWhenClosed = () => { const cancel = $('typed-voice-cancel'); if (!details.open && cancel && !cancel.hidden && !cancel.disabled) cancel.click(); };
    details.addEventListener('toggle', cancelWhenClosed); cancelWhenClosed();
  }
  waitFor(() => $('actor-pill')?.textContent.trim() === role.toUpperCase() && !$('notice')?.classList.contains('busy')).then(() => {
    if (role !== scenes[step].role) { status('An advanced simulated role is selected. Use the numbered steps to return to the guided demo.'); return; }
    const advancedPrint = query.get('demoAdvanced') === 'print' && role === 'staff';
    const tab = $('tab-' + (advancedPrint ? 'print' : scenes[step].tab)); if (tab && !tab.hidden) tab.click();
    if (step === 'recognize' && !advancedPrint) {
      const panel = $('linked-learner-card'); if (!panel || panel.hidden) throw new Error('The prepared learner-link controls are unavailable. Reset the fictional records or check the Store status.');
      panel.open = true; collapseOptionalVoice(); $('demo-load-example').disabled = false; status('Staff view ready. Load the example when you are ready; no points are sent by that button.');
    } else status(advancedPrint ? 'Optional Print Lab view. Follow its manual review workflow; no printer is connected.' : step === 'class' ? 'Prepared fictional class ready. Start the demo to recognize a learner.' : step === 'balance' ? 'Student view ready. The balance below is the current recorded balance.' : 'Cashier view ready. Select Avery and one Notebook, then review the live checkout.');
  }).catch(error => { if (current()) status(error.message, true); });
}
