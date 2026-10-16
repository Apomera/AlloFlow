import { artworkPrompt, resizeBoardImage, verifyBoardImage } from './lesson_board_support.js';

const cancelled = () => Object.assign(Error('Cancelled'), { name: 'AbortError' });

// One bound covers the provider, image preparation, and final decoding check.
// The caller may stop waiting even when its provider ignores cancellation.
export async function generateTabletopScenery(callImagen, board, style, { signal } = {}) {
  if (signal?.aborted) throw cancelled();
  if (typeof callImagen !== 'function') throw Error('board-image-provider');
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    let settled = false, timer;
    const finish = (ok, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (!ok) controller.abort();
      (ok ? resolve : reject)(value);
    };
    const abort = () => finish(false, cancelled());
    const check = () => { if (controller.signal.aborted) throw cancelled(); };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) { abort(); return; }
    timer = setTimeout(() => finish(false, Error('board-image-generation-timeout')), 100000);
    const run = async () => {
      const raw = await callImagen(artworkPrompt(board, 'scene:tabletop', style), 960, .78, { signal: controller.signal });
      check();
      const image = await resizeBoardImage(raw, 145000, 960);
      check();
      await verifyBoardImage(image, { signal: controller.signal });
      check();
      return image;
    };
    run().then(image => finish(true, image), failure => finish(false, failure));
  });
}
