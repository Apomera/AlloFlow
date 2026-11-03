import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let createCoordinator;
let coordinators;

beforeEach(() => {
  resetStemLab();
  loadTool(process.env.WEATHER_CHECKPOINT_OPEN_SOURCE || 'stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  createCoordinator = window.WeatherSystemsKernel.createLiveWeatherRequestCoordinator;
  coordinators = [];
  vi.useFakeTimers();
});

afterEach(() => {
  try {
    coordinators.forEach((manager) => manager.dispose());
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});

function coordinator(options) {
  const manager = createCoordinator(options);
  coordinators.push(manager);
  expect(manager.isLatestCompletion).toBeTypeOf('function');
  return manager;
}

describe('Weather checkpoint opening completion ownership', () => {
  it('rejects missing and still-pending work before it has completed', () => {
    const manager = coordinator();
    expect(manager.isLatestCompletion()).toBe(false);
    expect(manager.isLatestCompletion(null)).toBe(false);
    const pending = manager.begin();
    expect(manager.isCurrent(pending)).toBe(true);
    expect(manager.isLatestCompletion(pending)).toBe(false);
    expect(manager.isLatestCompletion({ ...pending })).toBe(false);
    expect(pending.state).toBe('pending');
    expect(vi.getTimerCount()).toBe(1);
  });

  it('recognizes a finished latest request repeatedly without consuming it or changing its deadline state', () => {
    const timeout = vi.fn();
    const manager = coordinator();
    const token = manager.begin(timeout);
    expect(manager.finish(token)).toBe(true);
    const completed = { ...token };
    for (let read = 0; read < 4; read++) expect(manager.isLatestCompletion(token)).toBe(true);
    expect(token).toEqual(completed);
    expect(manager.isCurrent(token)).toBe(false);
    expect(manager.finish(token)).toBe(false);
    expect(manager.isLatestCompletion(token)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60000);
    expect(timeout).not.toHaveBeenCalled();
    expect(token.signal.aborted).toBe(false);
    expect(manager.isLatestCompletion(token)).toBe(true);
  });

  it('invalidates an earlier completion as soon as a new request starts, even when that request is later cancelled', () => {
    const manager = coordinator({ AbortController: null });
    const earlier = manager.begin();
    expect(manager.finish(earlier)).toBe(true);
    expect(manager.isLatestCompletion(earlier)).toBe(true);
    const later = manager.begin();
    expect(later.signal).toBeUndefined();
    expect(manager.isLatestCompletion(earlier)).toBe(false);
    expect(manager.isLatestCompletion(later)).toBe(false);
    expect(manager.cancel()).toBe(true);
    expect(manager.finish(later)).toBe(false);
    expect(manager.isLatestCompletion(earlier)).toBe(false);
    expect(manager.isLatestCompletion(later)).toBe(false);
    expect(earlier.state).toBe('complete');
    expect(later.state).toBe('cancelled');
  });

  it('keeps only the newer completion eligible after two requests have finished', () => {
    const manager = coordinator();
    const earlier = manager.begin();
    expect(manager.finish(earlier)).toBe(true);
    const later = manager.begin();
    expect(manager.finish(later)).toBe(true);
    expect(later.id).toBeGreaterThan(earlier.id);
    expect(earlier.state).toBe('complete');
    expect(later.state).toBe('complete');
    expect(manager.isLatestCompletion(earlier)).toBe(false);
    expect(manager.isLatestCompletion(later)).toBe(true);
    expect(manager.isCurrent(earlier)).toBe(false);
    expect(manager.isCurrent(later)).toBe(false);
  });

  it('never treats cancellation or timeout as a successful completion', () => {
    const timeout = vi.fn();
    const manager = coordinator({ timeoutMs: 1000 });
    const cancelled = manager.begin(timeout);
    expect(manager.cancel()).toBe(true);
    expect(cancelled.signal.aborted).toBe(true);
    expect(manager.isLatestCompletion(cancelled)).toBe(false);
    const expired = manager.begin(timeout);
    vi.advanceTimersByTime(999);
    expect(timeout).not.toHaveBeenCalled();
    expect(manager.isLatestCompletion(expired)).toBe(false);
    vi.advanceTimersByTime(1);
    expect(timeout).toHaveBeenCalledExactlyOnceWith(expired);
    expect(expired.state).toBe('timeout');
    expect(expired.signal.aborted).toBe(true);
    expect(manager.finish(expired)).toBe(false);
    expect(manager.isLatestCompletion(cancelled)).toBe(false);
    expect(manager.isLatestCompletion(expired)).toBe(false);
    vi.advanceTimersByTime(60000);
    expect(timeout).toHaveBeenCalledTimes(1);
  });

  it('invalidates a completed result when its mount is disposed and rejects future work', () => {
    const manager = coordinator();
    const completed = manager.begin();
    expect(manager.finish(completed)).toBe(true);
    expect(manager.isLatestCompletion(completed)).toBe(true);
    manager.dispose();
    expect(manager.isLatestCompletion(completed)).toBe(false);
    expect(completed.state).toBe('complete');
    expect(manager.begin()).toBeNull();
    manager.dispose();
    expect(manager.isLatestCompletion(completed)).toBe(false);
  });

  it('rejects copied and foreign completed tokens even when their sequence numbers match', () => {
    const firstManager = coordinator();
    const secondManager = coordinator();
    const first = firstManager.begin();
    const second = secondManager.begin();
    expect(first.id).toBe(second.id);
    expect(firstManager.finish(first)).toBe(true);
    expect(secondManager.finish(second)).toBe(true);
    expect(firstManager.isLatestCompletion({ ...first })).toBe(false);
    expect(firstManager.isLatestCompletion(second)).toBe(false);
    expect(secondManager.isLatestCompletion(first)).toBe(false);
    expect(firstManager.isLatestCompletion(first)).toBe(true);
    expect(secondManager.isLatestCompletion(second)).toBe(true);
  });

  it('keeps the reentrant request as the only eligible completion when an abort listener starts a newer intent', () => {
    const manager = coordinator();
    const first = manager.begin();
    let newest;
    first.signal.addEventListener('abort', () => { newest = manager.begin(); });
    const interrupted = manager.begin();
    expect(first.state).toBe('superseded');
    expect(interrupted.state).toBe('superseded');
    expect(interrupted.signal.aborted).toBe(true);
    expect(manager.isCurrent(newest)).toBe(true);
    expect(manager.finish(first)).toBe(false);
    expect(manager.finish(interrupted)).toBe(false);
    expect(manager.isLatestCompletion(newest)).toBe(false);
    expect(manager.finish(newest)).toBe(true);
    expect(manager.isLatestCompletion(first)).toBe(false);
    expect(manager.isLatestCompletion(interrupted)).toBe(false);
    expect(manager.isLatestCompletion(newest)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
