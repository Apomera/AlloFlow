// Older workflow suites use synthetic records and stubbed providers. This
// explicit test user completes the newly required review through the real UI;
// it does not replace the gate, call its internals, or bypass confirmation.
// Privacy-boundary tests keep manual control and must not use this helper.
export async function actWithSensitivePromptReview(React, action) {
  await React.act(async () => { await action(); });
  for (let count = 0; count < 100; count++) {
    const dialog = document.querySelector('[role="dialog"][aria-label="Review what AI receives"]');
    if (!dialog) return;
    const text = dialog.querySelector('textarea[aria-label="Text to send"]');
    const confirmation = dialog.querySelector('input[type="checkbox"]');
    const send = Array.from(dialog.querySelectorAll('button')).find(button => button.textContent === 'Send reviewed copy');
    if (!text || !text.value.trim() || !confirmation || !send) throw new Error('Sensitive prompt review is incomplete');
    if (!confirmation.checked) {
      await React.act(async () => { confirmation.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    }
    if (send.disabled) throw new Error('Sensitive prompt review still requires confirmation');
    await React.act(async () => { send.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  }
  throw new Error('Unexpected number of sensitive prompt reviews in one synthetic workflow');
}
