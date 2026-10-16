import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { generateTabletopScenery } from '../lesson_board_scenery_request.js';
import { artworkPrompt, resizeBoardImage, verifyBoardImage } from '../lesson_board_support.js';

vi.mock('../lesson_board_support.js', () => ({
  artworkPrompt: vi.fn(), resizeBoardImage: vi.fn(), verifyBoardImage: vi.fn(),
}));

const board = { title: 'River expedition', playStyle: 'tabletop' };
const style = 'Soft watercolor terrain';
const image = 'data:image/png;base64,prepared';
const pending = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  artworkPrompt.mockReturnValue('Quiet top-down scenery');
  resizeBoardImage.mockResolvedValue(image);
  verifyBoardImage.mockResolvedValue(image);
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Tabletop scenery request lifecycle', () => {
  it('returns only a prepared, decoded image using the dedicated scenery prompt and bounded image size', async () => {
    const caller = new AbortController(), remove = vi.spyOn(caller.signal, 'removeEventListener');
    const provider = vi.fn(async () => 'provider image');
    await expect(generateTabletopScenery(provider, board, style, { signal: caller.signal })).resolves.toBe(image);
    expect(artworkPrompt).toHaveBeenCalledWith(board, 'scene:tabletop', style);
    expect(provider).toHaveBeenCalledWith('Quiet top-down scenery', 960, .78, { signal: expect.any(AbortSignal) });
    const internal = provider.mock.calls[0][3].signal;
    expect(internal).not.toBe(caller.signal);
    expect(resizeBoardImage).toHaveBeenCalledWith('provider image', 145000, 960);
    expect(verifyBoardImage).toHaveBeenCalledWith(image, { signal: internal });
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    caller.abort();
    expect(internal.aborted).toBe(false);
  });

  it('rejects a missing provider without preparing images or installing timers', async () => {
    await expect(generateTabletopScenery(null, board, style)).rejects.toThrow('board-image-provider');
    expect(resizeBoardImage).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not contact the provider when the caller already cancelled', async () => {
    const caller = new AbortController(), provider = vi.fn(); caller.abort();
    await expect(generateTabletopScenery(provider, board, style, { signal: caller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(provider).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels a provider that never settles and ignores a late success', async () => {
    const caller = new AbortController(), remove = vi.spyOn(caller.signal, 'removeEventListener'), deferred = pending(), provider = vi.fn(() => deferred.promise);
    const result = generateTabletopScenery(provider, board, style, { signal: caller.signal }), rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    caller.abort(); await rejected;
    expect(provider.mock.calls[0][3].signal.aborted).toBe(true);
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    deferred.resolve('late image'); await flush();
    expect(resizeBoardImage).not.toHaveBeenCalled();
    expect(verifyBoardImage).not.toHaveBeenCalled();
  });

  it('times out a stalled provider and aborts its internal signal', async () => {
    const deferred = pending(), provider = vi.fn(() => deferred.promise);
    const result = generateTabletopScenery(provider, board, style), rejected = expect(result).rejects.toThrow('board-image-generation-timeout');
    await vi.advanceTimersByTimeAsync(100000); await rejected;
    expect(provider.mock.calls[0][3].signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    deferred.reject(Error('late failure')); await flush();
    expect(resizeBoardImage).not.toHaveBeenCalled();
  });

  it('uses one timeout budget across generation and preparation', async () => {
    const generated = pending(), resized = pending(), provider = vi.fn(() => generated.promise);
    resizeBoardImage.mockReturnValue(resized.promise);
    const result = generateTabletopScenery(provider, board, style), rejected = expect(result).rejects.toThrow('board-image-generation-timeout');
    await vi.advanceTimersByTimeAsync(90000); generated.resolve('raw'); await flush();
    expect(resizeBoardImage).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10000); await rejected;
    resized.resolve(image); await flush();
    expect(verifyBoardImage).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels while resizing without waiting for resize or starting final decoding', async () => {
    const caller = new AbortController(), resized = pending(), provider = vi.fn(async () => 'raw');
    resizeBoardImage.mockReturnValue(resized.promise);
    const result = generateTabletopScenery(provider, board, style, { signal: caller.signal }), rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await flush(); expect(resizeBoardImage).toHaveBeenCalledTimes(1);
    caller.abort(); await rejected;
    resized.resolve(image); await flush();
    expect(verifyBoardImage).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('passes cancellation through final decoding and ignores its late completion', async () => {
    const caller = new AbortController(), decoded = pending(), provider = vi.fn(async () => 'raw');
    verifyBoardImage.mockReturnValue(decoded.promise);
    const result = generateTabletopScenery(provider, board, style, { signal: caller.signal }), rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await flush(); expect(verifyBoardImage).toHaveBeenCalledTimes(1);
    caller.abort(); await rejected;
    expect(verifyBoardImage.mock.calls[0][1].signal.aborted).toBe(true);
    decoded.resolve(image); await flush();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['provider', 'resize', 'decode'])('preserves %s failures and cleans up the request', async stage => {
    const failure = Error(stage === 'decode' ? 'board-image-invalid' : stage + ' failed'), caller = new AbortController(), remove = vi.spyOn(caller.signal, 'removeEventListener');
    const provider = vi.fn(async () => 'raw');
    if (stage === 'provider') provider.mockImplementation(() => { throw failure; });
    if (stage === 'resize') resizeBoardImage.mockRejectedValue(failure);
    if (stage === 'decode') verifyBoardImage.mockRejectedValue(failure);
    await expect(generateTabletopScenery(provider, board, style, { signal: caller.signal })).rejects.toBe(failure);
    expect(provider.mock.calls[0][3].signal.aborted).toBe(true);
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });
});
