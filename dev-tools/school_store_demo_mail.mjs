// Local fictional harness only. Never sends, regenerates or redirects mail.
export function captureReceiptMail(repo, result, before, captured) {
  const id = result?.receipt?.id;
  if (!id || captured.has(id)) return;
  const rows = repo.rows('Receipts').slice(1).filter(row => row[0] === id && row[5] === 'SENT');
  if (rows.length !== 1) return;
  const row = rows[0], kind = row[3];
  if (!['PURCHASE', 'REFUND'].includes(kind)) return;
  const messages = repo.mail.slice(before).filter(message => message.to === row[4]
    && String(message.body).split('\n').includes('Order: ' + row[1])
    && String(message.subject).endsWith(kind === 'REFUND' ? ' rewards refund receipt' : ' rewards purchase receipt'));
  if (messages.length !== 1) return;
  const { to, name, subject, body, htmlBody } = messages[0];
  if (![to, name, subject, body, htmlBody].every(value => typeof value === 'string')) return;
  captured.set(id, Object.freeze({ receiptId: id, orderId: row[1], to, senderName: name, subject, body, htmlBody, simulated: true }));
}

export function readReceiptMail(repo, input, captured) {
  if (!input || typeof input.receiptId !== 'string' || typeof input.orderId !== 'string'
    || Object.keys(input).some(key => !['receiptId', 'orderId', 'role', 'demoGeneration'].includes(key))) return null;
  const message = captured.get(input.receiptId);
  if (!message || message.orderId !== input.orderId) return null;
  // Honor the current simulated Store actor's existing receipt visibility.
  const view = repo.call('getSchoolRewardsBootstrap');
  if (!(view.recentReceipts || []).some(row => row.id === message.receiptId && row.orderId === message.orderId)) return null;
  return message;
}
