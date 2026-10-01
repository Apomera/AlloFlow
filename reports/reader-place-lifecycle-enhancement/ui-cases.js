
describe('reader lifecycle and storage recovery UI', () => {
  const leave = () => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; };
  const openTools = async () => { await act(async () => { const details = $('[data-reading-storage-tools]'); details.open = true; details.dispatchEvent(new Event('toggle')); }); };

  it('keeps reload protection after leaving a reading, scopes exports, and never claims a completed download', async () => {
    const rerender = mount({ readingLearnerKey: '' }); await click($('[data-section-prompts-toggle]'));
    expect(leave()).toBe(false); await type($('[data-section-prompt="mainIdea"]'), 'Temporary heron answer'); expect(leave()).toBe(true);
    const other = { ...item('Another exact passage.'), id: 'another' }; rerender({ readingLearnerKey: '', generatedContent: other });
    expect(leave()).toBe(true); await openTools();
    const copies = [...host.querySelectorAll('[data-reading-session-copy]')]; expect(copies[0].value).toContain('Temporary heron answer'); expect(copies[0].value).toContain(LONG);
    const make = vi.fn(() => 'blob:recovery-test'); Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: make });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const anchor = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await click($('[data-reading-download]')); expect(make).toHaveBeenCalledOnce(); expect(anchor).toHaveBeenCalledOnce();
    expect($('[data-reading-storage-tools]').textContent).toContain('Download requested'); expect(leave()).toBe(true);
    rerender({ readingLearnerKey: 'Other learner' }); expect($('[data-reading-session-copy]')).toBeNull(); expect($('[data-reading-storage-tools]')).toBeNull();
  });

  it('retains selectable text when download is blocked and removes preview guards on close', async () => {
    mount({ readingLearnerKey: '', isStudentPreview: true }); await click($('[data-section-prompts-toggle]'));
    await type($('[data-section-prompt="mainIdea"]'), 'Preview draft'); await openTools();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => { throw new Error('Blocked'); } });
    await click($('[data-reading-download]')); expect($('[data-reading-storage-tools]').textContent).toContain('download could not start');
    expect($('[data-reading-session-copy]').value).toContain('Preview draft'); expect(leave()).toBe(true);
    unmount(); expect(leave()).toBe(false);
  });

  it('requires an explicit storage review, keeps a copy after removal, and leaves other learners unchanged', async () => {
    mount(); await click($('[data-section-prompts-toggle]')); await type($('[data-section-prompt="mainIdea"]'), 'Saved answer');
    const rows = JSON.parse(localStorage.getItem(KEY)); rows['Other|reading|v1'] = { responses: { 0: { mainIdea: 'Private' } } }; localStorage.setItem(KEY, JSON.stringify(rows));
    await openTools(); await click($('[data-reading-storage-review]'));
    expect(document.activeElement).toBe($('[data-reading-storage-panel]')); expect($('[data-reading-storage-remove]').disabled).toBe(true);
    await click($('[data-reading-storage-confirm]')); await click($('[data-reading-storage-remove]'));
    expect(Object.keys(JSON.parse(localStorage.getItem(KEY)))).toEqual(['Other|reading|v1']);
    expect($('[data-section-prompt="mainIdea"]').value).toBe(''); expect($('[data-reading-recovery-copy]').value).toContain('Saved answer');
    expect($('[data-reading-session-copy]').value).not.toContain('Private'); expect(leave()).toBe(true);
  });

  it('rejects a stale storage confirmation and preserves new typed text', async () => {
    mount(); await click($('[data-section-prompts-toggle]')); await type($('[data-section-prompt="mainIdea"]'), 'First'); await openTools();
    await click($('[data-reading-storage-review]')); await type($('[data-section-prompt="mainIdea"]'), 'Newer');
    await click($('[data-reading-storage-confirm]')); await click($('[data-reading-storage-remove]'));
    expect($('[data-section-prompt="mainIdea"]').value).toBe('Newer'); expect(Object.values(JSON.parse(localStorage.getItem(KEY)))[0].responses[0].mainIdea).toBe('Newer');
    expect($('[data-reading-persistence]').textContent).toContain('changed after this review');
  });

  it('repairs a malformed row and gives actionable answer-size guidance without truncation', async () => {
    mount(); await click($('[data-section-prompts-toggle]')); await type($('[data-section-prompt="mainIdea"]'), 'First');
    const rows = JSON.parse(localStorage.getItem(KEY)); Object.values(rows)[0].responses[0].support = { old: 'Recover this' }; localStorage.setItem(KEY, JSON.stringify(rows));
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: KEY }))); await openTools(); await click($('[data-reading-storage-review]'));
    expect($('[data-reading-storage-repair]')).not.toBeNull(); await click($('[data-reading-storage-confirm]')); await click($('[data-reading-storage-repair]'));
    expect(Object.values(JSON.parse(localStorage.getItem(KEY)))[0].responses[0].support).toBeUndefined(); expect($('[data-reading-session-copy]').value).toContain('Recover this');
    await type($('[data-section-prompt="mainIdea"]'), 'x'.repeat(16001)); expect($('[data-section-prompt="mainIdea"]').value).toHaveLength(16001);
    expect($('[data-reading-storage-problem]').textContent).toContain('Herons'); expect($('[data-reading-storage-problem]').textContent).toContain('too long to save');
    await type($('[data-section-prompt="mainIdea"]'), 'Shorter'); expect($('[data-reading-storage-problem]')).toBeNull();
  });

  it('registers all new lifecycle strings in the candidate catalog', () => {
    const strings = JSON.parse(readFileSync(candidate + 'ui_strings.js', 'utf8'));
    for (const [key, value] of Object.entries(JSON.parse(readFileSync('reports/reader-place-lifecycle-enhancement/strings.json', 'utf8')))) expect(strings.simplified[key], key).toBe(value);
  });
});
