import { Page } from '@playwright/test';

// Some Windows test hosts have no usable audio output device. Exercise the
// simulator's existing no-WebAudio fallback; native graphics remain untouched.
export async function useCephalopodAudioFallback(page: Page) {
  if (process.env.CEPHALOPOD_NO_AUDIO_DEVICE !== '1') return;
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { value: undefined, configurable: true });
    Object.defineProperty(window, 'webkitAudioContext', { value: undefined, configurable: true });
  });
}
