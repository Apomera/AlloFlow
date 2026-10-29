import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let createCoordinator;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  createCoordinator = window.WeatherSystemsKernel.createLiveWeatherRequestCoordinator;
  vi.useFakeTimers();
});
afterEach(() => { vi.useRealTimers(); });

describe('Live weather request ownership', () => {
  it('keeps one token across the location and weather phases and completes once', () => {
    const coordinator = createCoordinator();
    const token = coordinator.begin();
    expect(coordinator.isCurrent(token)).toBe(true);
    // Geocoding finishing does not end the intent: the same token owns fetch.
    expect(coordinator.isCurrent(token)).toBe(true);
    expect(coordinator.finish(token)).toBe(true);
    expect(token.state).toBe('complete');
    expect(coordinator.finish(token)).toBe(false);
    expect(coordinator.isCurrent(token)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts a superseded fetch and rejects its stale result or error', () => {
    const coordinator = createCoordinator();
    const older = coordinator.begin();
    const newer = coordinator.begin();
    expect(newer.id).toBeGreaterThan(older.id);
    expect(older.signal.aborted).toBe(true);
    expect(older.state).toBe('superseded');
    expect(coordinator.isCurrent(older)).toBe(false);
    expect(coordinator.finish(older)).toBe(false);
    expect(coordinator.isCurrent(newer)).toBe(true);
    expect(newer.signal.aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('ignores late completions even when AbortController is unavailable', () => {
    const coordinator = createCoordinator({ AbortController: null });
    const older = coordinator.begin();
    const newer = coordinator.begin();
    expect(older.signal).toBeUndefined();
    expect(newer.signal).toBeUndefined();
    expect(coordinator.isCurrent(older)).toBe(false);
    expect(coordinator.isCurrent(newer)).toBe(true);
    coordinator.cancel();
    expect(coordinator.isCurrent(newer)).toBe(false);
  });

  it('still invalidates work when AbortController construction is unsupported', () => {
    const coordinator = createCoordinator({ AbortController: function () { throw new Error('unsupported'); } });
    const token = coordinator.begin();
    expect(token.signal).toBeUndefined();
    expect(coordinator.cancel()).toBe(true);
    expect(coordinator.isCurrent(token)).toBe(false);
    expect(token.state).toBe('cancelled');
  });

  it('invalidates before firing abort listeners', () => {
    const coordinator = createCoordinator();
    const token = coordinator.begin();
    let currentAtAbort;
    token.signal.addEventListener('abort', () => { currentAtAbort = coordinator.isCurrent(token); });
    coordinator.cancel();
    expect(currentAtAbort).toBe(false);
  });

  it('cancellation is repeatable and cannot cancel a future request', () => {
    const timeout = vi.fn();
    const coordinator = createCoordinator();
    expect(coordinator.cancel()).toBe(false);
    const token = coordinator.begin(timeout);
    expect(coordinator.cancel()).toBe(true);
    expect(coordinator.cancel()).toBe(false);
    const retry = coordinator.begin(timeout);
    vi.advanceTimersByTime(29999);
    expect(timeout).not.toHaveBeenCalled();
    expect(coordinator.isCurrent(token)).toBe(false);
    expect(coordinator.isCurrent(retry)).toBe(true);
    coordinator.finish(retry);
  });

  it('preserves a newer intent started synchronously by an abort listener', () => {
    const coordinator = createCoordinator();
    const first = coordinator.begin();
    let newest;
    first.signal.addEventListener('abort', () => { newest = coordinator.begin(); });
    const supersededWhileStarting = coordinator.begin();
    expect(coordinator.isCurrent(newest)).toBe(true);
    expect(coordinator.isCurrent(supersededWhileStarting)).toBe(false);
    expect(supersededWhileStarting.state).toBe('superseded');
    expect(supersededWhileStarting.signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    coordinator.finish(newest);
  });

  it('bounds the full chain with one deadline and reports timeout exactly once', () => {
    const timeout = vi.fn();
    const coordinator = createCoordinator({ timeoutMs: 10000 });
    const token = coordinator.begin(timeout);
    vi.advanceTimersByTime(6000); // Waiting on device coordinates or a geocoder.
    expect(coordinator.isCurrent(token)).toBe(true);
    vi.advanceTimersByTime(3999); // Weather response has now started, same token.
    expect(timeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(timeout).toHaveBeenCalledExactlyOnceWith(token);
    expect(token.state).toBe('timeout');
    expect(token.signal.aborted).toBe(true);
    expect(coordinator.isCurrent(token)).toBe(false);
    vi.advanceTimersByTime(60000);
    expect(timeout).toHaveBeenCalledTimes(1);
    expect(coordinator.finish(token)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not publish an old timeout after a newer request starts', () => {
    const oldTimeout = vi.fn(), newTimeout = vi.fn();
    const coordinator = createCoordinator({ timeoutMs: 10000 });
    coordinator.begin(oldTimeout);
    vi.advanceTimersByTime(9000);
    const newer = coordinator.begin(newTimeout);
    vi.advanceTimersByTime(1000);
    expect(oldTimeout).not.toHaveBeenCalled();
    expect(newTimeout).not.toHaveBeenCalled();
    expect(coordinator.isCurrent(newer)).toBe(true);
    coordinator.finish(newer);
    vi.advanceTimersByTime(60000);
    expect(newTimeout).not.toHaveBeenCalled();
  });

  it('allows timeout handling to begin a retry without aborting the retry', () => {
    const coordinator = createCoordinator({ timeoutMs: 1000 });
    let retry;
    const original = coordinator.begin(() => { retry = coordinator.begin(); });
    vi.advanceTimersByTime(1000);
    expect(original.signal.aborted).toBe(true);
    expect(coordinator.isCurrent(retry)).toBe(true);
    expect(retry.signal.aborted).toBe(false);
    coordinator.finish(retry);
  });

  it('finishing a successful response does not abort its signal or later show timeout', () => {
    const timeout = vi.fn();
    const coordinator = createCoordinator();
    const token = coordinator.begin(timeout);
    coordinator.finish(token);
    vi.advanceTimersByTime(60000);
    expect(token.signal.aborted).toBe(false);
    expect(timeout).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('disposal rejects late geolocation callbacks and future work', () => {
    const timeout = vi.fn();
    const coordinator = createCoordinator();
    const token = coordinator.begin(timeout);
    coordinator.dispose();
    expect(token.signal.aborted).toBe(true);
    expect(token.state).toBe('disposed');
    expect(coordinator.isCurrent(token)).toBe(false);
    expect(coordinator.finish(token)).toBe(false);
    expect(coordinator.begin()).toBeNull();
    coordinator.dispose();
    vi.advanceTimersByTime(60000);
    expect(timeout).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not accept a forged token with the same sequence number', () => {
    const coordinator = createCoordinator();
    const token = coordinator.begin();
    const copy = { ...token };
    expect(coordinator.isCurrent(copy)).toBe(false);
    expect(coordinator.finish(copy)).toBe(false);
    expect(coordinator.isCurrent(token)).toBe(true);
    coordinator.finish(token);
  });

  it.each([0, -1, 999])('uses at least one second for requested timeout %s', (timeoutMs) => {
    const timeout = vi.fn();
    const coordinator = createCoordinator({ timeoutMs });
    coordinator.begin(timeout);
    vi.advanceTimersByTime(999);
    expect(timeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(timeout).toHaveBeenCalledTimes(1);
  });

  it('caps a requested deadline at one minute', () => {
    const timeout = vi.fn();
    const coordinator = createCoordinator({ timeoutMs: 600000 });
    coordinator.begin(timeout);
    vi.advanceTimersByTime(59999);
    expect(timeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(timeout).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, null, NaN, Infinity, 'fast'])('uses the default deadline for invalid timeout %s', (timeoutMs) => {
    const timeout = vi.fn();
    const coordinator = createCoordinator({ timeoutMs });
    coordinator.begin(timeout);
    vi.advanceTimersByTime(29999);
    expect(timeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(timeout).toHaveBeenCalledTimes(1);
  });
});
