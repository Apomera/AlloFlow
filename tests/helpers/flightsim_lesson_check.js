// SkySchool lessons are completed by answering their check question, not by a
// self-declared button (2026-11). Suites that are about something else (who owns a
// saved completion, where focus goes) use this to answer the question the way a
// student would: pick options until one is accepted. Picks live in component state
// only, so this writes nothing to saved data.
export async function passLessonCheck(host, act) {
  const box = () => host && host.querySelector('[data-lesson-check]');
  if (!box() || box().getAttribute('data-lesson-check-state') === 'correct') return false;
  for (let index = 0; index < 4; index++) {
    const option = box().querySelector('[data-lesson-check-option="' + index + '"]');
    if (!option) break;
    await act(async () => { option.click(); });
    if (box().getAttribute('data-lesson-check-state') === 'correct') return true;
  }
  throw new Error('no option was accepted by the lesson check');
}
