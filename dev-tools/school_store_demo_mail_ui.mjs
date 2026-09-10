// Demo-only presentation of captured mail. No sending or recipient entry.
export function demoMailClientScript() { return '(' + demoMailClient.toString() + ')();'; }
function demoMailClient() {
  const receipt = document.getElementById('checkout-receipt');
  if (!receipt || !document.body.dataset.demoGeneration) return;
  const style = document.createElement('style');
  style.textContent = '#demo-email-preview{margin-top:16px;padding-top:16px;border-top:1px solid #b7c8cd;overflow-wrap:anywhere}#demo-email-preview iframe{display:block;width:100%;height:460px;border:1px solid #b7c8cd;border-radius:8px;background:white}#demo-email-preview pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.5 system-ui}#demo-email-preview summary{min-height:44px;padding:12px 0;cursor:pointer}#demo-email-preview button{margin:8px 0}#demo-email-preview :focus-visible{outline:3px solid #6046b6;outline-offset:3px}';
  document.head.appendChild(style);
  style.textContent += '#checkout-receipt>.row:first-child{flex-wrap:wrap;gap:8px}#checkout-receipt .status-chip{white-space:normal;max-width:100%}#demo-email-panel{min-width:0;max-width:100%}';
  const notice = document.getElementById('notice');
  function labelSimulatedDelivery() {
    if (notice?.textContent === 'Checkout completed and the itemized receipt was sent.') notice.textContent = 'Checkout complete. Demo email generated—not sent.';
  }
  if (notice) new MutationObserver(labelSimulatedDelivery).observe(notice, { childList: true, characterData: true, subtree: true });
  labelSimulatedDelivery();
  let cancelPending = () => {};
  function syncReceipt() {
    if (receipt.hidden) { cancelPending(); receipt.querySelector('#demo-email-panel')?.remove(); return; }
    const chip = receipt.querySelector('.status-chip');
    if (chip && chip.textContent !== 'DEMO EMAIL — NOT SENT') chip.textContent = 'DEMO EMAIL — NOT SENT';
    const note = receipt.querySelector('.privacy-note');
    if (note && note.textContent !== 'Demo email generated—not sent. Preview the captured message below.') note.textContent = 'Demo email generated—not sent. Preview the captured message below.';
    if (receipt.querySelector('#demo-email-panel')) return;
    cancelPending();
    const receiptId = receipt.dataset.receiptId, orderId = receipt.dataset.orderId;
    const role = document.getElementById('demo-role').value, generation = document.body.dataset.demoGeneration;
    const panel = document.createElement('section'); panel.id = 'demo-email-panel';
    const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary'; button.id = 'demo-email-open'; button.textContent = 'Preview student email'; button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', 'demo-email-preview');
    const preview = document.createElement('div'); preview.id = 'demo-email-preview'; preview.hidden = true; preview.tabIndex = -1;
    panel.append(button, preview); receipt.appendChild(panel);
    let controller, serial = 0;
    const current = () => panel.isConnected && !receipt.hidden && receipt.dataset.receiptId === receiptId && receipt.dataset.orderId === orderId && document.body.dataset.demoGeneration === generation && document.getElementById('demo-role').value === role;
    cancelPending = () => { serial++; controller?.abort(); preview.replaceChildren(); preview.hidden = true; button.setAttribute('aria-expanded', 'false'); button.textContent = 'Preview student email'; button.disabled = false; };
    function text(tag, value) { const node = document.createElement(tag); node.textContent = value; preview.appendChild(node); return node; }
    button.onclick = async () => {
      if (!current()) return;
      if (!preview.hidden) { cancelPending(); return; }
      cancelPending(); const request = ++serial; controller = new AbortController();
      preview.hidden = false; button.textContent = 'Hide email preview'; button.setAttribute('aria-expanded', 'true');
      const status = text('p', 'Loading the captured fictional email…'); status.setAttribute('role', 'status');
      try {
        const response = await fetch('/demo-receipt-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ role, demoGeneration: generation, receiptId, orderId }) });
        const value = await response.json();
        if (!current() || request !== serial) return;
        if (!response.ok || !value.ok) throw Error(response.status === 409 ? 'This demo was reset. Reload this tab before previewing email.' : 'No captured email is available for this receipt. Nothing was sent.');
        const mail = value.message;
        if (!mail || mail.simulated !== true || mail.receiptId !== receiptId || mail.orderId !== orderId || !['to', 'senderName', 'subject', 'body', 'htmlBody'].every(key => typeof mail[key] === 'string')) throw Error('The email did not match this receipt. Nothing was sent.');
        preview.replaceChildren();
        text('h3', 'Student email preview');
        text('p', 'Fictional demo • Not sent. Actual generated content; email apps may display formatting differently.');
        text('p', 'To: ' + mail.to); text('p', 'Sender name: ' + mail.senderName); text('p', 'Subject: ' + mail.subject);
        const frame = document.createElement('iframe'); frame.title = 'Formatted student receipt email'; frame.setAttribute('sandbox', ''); frame.referrerPolicy = 'no-referrer';
        // Opaque sandbox plus CSP: email HTML cannot execute or load anything.
        frame.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"><style>body{margin:16px;overflow-wrap:anywhere}img{max-width:100%}</style></head><body>' + mail.htmlBody + '</body></html>';
        preview.appendChild(frame);
        const plain = document.createElement('details'), summary = document.createElement('summary'), body = document.createElement('pre'); summary.textContent = 'Plain-text version'; body.textContent = mail.body; plain.append(summary, body); preview.appendChild(plain);
        const close = text('button', 'Close email preview'); close.type = 'button'; close.className = 'secondary'; close.onclick = () => { cancelPending(); button.focus(); };
        preview.focus();
      } catch (error) { if (current() && request === serial && error.name !== 'AbortError') { preview.replaceChildren(); text('p', error.message).setAttribute('role', 'alert'); } }
      finally { if (current() && request === serial) button.disabled = false; }
    };
  }
  new MutationObserver(syncReceipt).observe(receipt, { childList: true, attributes: true, attributeFilter: ['hidden', 'data-receipt-id', 'data-order-id'] });
  window.addEventListener('pagehide', () => cancelPending());
  document.getElementById('demo-role').addEventListener('change', () => cancelPending());
  syncReceipt();
}
