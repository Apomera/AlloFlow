// Teacher review of syllable markers. Compiled into the reader module. Students never
// reach this panel: they only read what it saves on the resource.
(function () {
  var AI_BATCH = 150;
  var METHODS = [
    { id: 'auto', key: 'syllable_prep.method_auto', label: 'Best match (recommended)', hintKey: 'syllable_prep.method_auto_hint', hint: 'Uses the checked word list and rules first. AI only looks at words they cannot settle.' },
    { id: 'device', key: 'syllable_prep.method_device', label: 'This device only', hintKey: 'syllable_prep.method_device_hint', hint: 'Never sends words to AI. Unsure words wait for you to check them.' },
    { id: 'ai', key: 'syllable_prep.method_ai', label: 'AI for every word', hintKey: 'syllable_prep.method_ai_hint', hint: 'Sends the word list to AI, then flags any word that disagrees with the checked list.' },
  ];

  function SyllablePrepPanel(props) {
    var core = window.AlloModules.SyllablePrep;
    var text = props.text;
    var language = props.language;
    var words = React.useMemo(function () { return core.extractWords(props.sourceText); }, [props.sourceText]);
    var onDevice = core.hasOnDeviceRules(language);
    var unsupported = core.isUnsupportedLanguage(language);
    var aiFn = props.aiFn;
    var saved = props.savedPrep;
    var savedInfo = React.useMemo(function () { return core.readPrep(saved); }, [saved]);

    var [method, setMethod] = React.useState(function () {
      if (savedInfo && METHODS.some(function (item) { return item.id === savedInfo.method; })) return savedInfo.method;
      return aiFn ? 'auto' : 'device';
    });
    var [entries, setEntries] = React.useState(function () { return savedInfo ? core.entriesFromSaved(words, saved) : []; });
    var [status, setStatus] = React.useState('idle');
    var [notice, setNotice] = React.useState('');
    var [dirty, setDirty] = React.useState(false);
    var [showAll, setShowAll] = React.useState(false);
    var [editing, setEditing] = React.useState(null);
    var [replaceEdits, setReplaceEdits] = React.useState(false);
    var [closing, setClosing] = React.useState(false);
    var dialogRef = React.useRef(null);
    var runRef = React.useRef(0);
    var aliveRef = React.useRef(true);

    React.useEffect(function () {
      aliveRef.current = true;
      if (dialogRef.current) dialogRef.current.focus();
      return function () { aliveRef.current = false; runRef.current += 1; };
    }, []);

    var run = React.useCallback(function (chosen, options) {
      var opts = options || {};
      var ticket = ++runRef.current;
      setStatus('working');
      setNotice('');
      var useAi = !!aiFn && chosen !== 'device' && opts.deviceOnly !== true;
      return (core.languageCode(language) === 'en' ? core.loadEnglishTable() : Promise.resolve(null)).then(function (table) {
        if (ticket !== runRef.current) return null;
        var tableMissing = core.languageCode(language) === 'en' && !table;
        var fresh = words.map(function (item) {
          return Object.assign({ count: item.count }, core.suggestOnDevice(item.word, language, table));
        });
        var known = new Map(fresh.map(function (entry) { return [entry.word, entry]; }));
        var merged = core.mergeWithSaved(fresh, saved, opts.replaceEdits === true);
        if (opts.replaceEdits !== true) {
          var local = new Map(entries.filter(function (entry) { return entry.edited; }).map(function (entry) { return [entry.word, entry]; }));
          merged = merged.map(function (entry) { return local.get(entry.word) || entry; });
        }
        var knownFor = function (word) {
          var device = known.get(word);
          return device && (device.source === 'table' || device.source === 'rules') ? device.parts : null;
        };
        var targets = !useAi ? [] : merged.filter(function (entry) { return !entry.edited && (chosen === 'ai' || entry.needsAi); }).map(function (entry) { return entry.word; });
        var batches = [];
        for (var i = 0; i < targets.length; i += AI_BATCH) batches.push(targets.slice(i, i + AI_BATCH));
        var byWord = new Map(merged.map(function (entry) { return [entry.word, entry]; }));
        var failed = 0;
        var step = batches.reduce(function (chain, batch) {
          return chain.then(function () {
            if (ticket !== runRef.current) return null;
            return Promise.resolve().then(function () { return aiFn(core.buildAiPrompt(batch, language), true); }).then(function (raw) {
              var results = core.parseAiReply(raw, batch, knownFor);
              batch.forEach(function (word) {
                if (results[word]) byWord.set(word, Object.assign({}, byWord.get(word), results[word]));
                else failed += 1;
              });
            }, function () { failed += batch.length; });
          });
        }, Promise.resolve());
        return step.then(function () {
          if (ticket !== runRef.current || !aliveRef.current) return;
          setEntries(merged.map(function (entry) { return byWord.get(entry.word) || entry; }));
          setStatus('ready');
          if (opts.markDirty !== false) setDirty(true);
          if (tableMissing) setNotice(text('syllable_prep.table_failed', 'The word list did not load, so these are first guesses. Check your connection and try again.'));
          else if (failed) setNotice(text('syllable_prep.ai_partial', 'AI could not answer for {count} words. They stay flagged for you to check.', { count: failed }));
        });
      }).catch(function () {
        if (ticket !== runRef.current || !aliveRef.current) return;
        setStatus('ready');
        setNotice(text('syllable_prep.run_failed', 'Suggestions could not be made. Try again.'));
      });
    }, [aiFn, entries, language, saved, text, words]);

    // Free and instant, so a first look at English or Spanish needs no button or AI.
    React.useEffect(function () {
      if (!savedInfo && onDevice && !unsupported) run('device', { deviceOnly: true, markDirty: false });
    }, []);

    var checkCount = entries.filter(function (entry) { return entry.check; }).length;
    var editedCount = entries.filter(function (entry) { return entry.edited; }).length;
    var visible = showAll ? entries : entries.filter(function (entry) { return entry.check || entry.edited; });

    var updateEntry = function (word, change) {
      setEntries(function (list) { return list.map(function (entry) { return entry.word === word ? Object.assign({}, entry, change) : entry; }); });
      setDirty(true);
    };
    var saveNow = function () {
      props.onSave(entries.length ? core.buildPrep(entries, { language: language, method: method }) : null);
      setDirty(false);
      props.onClose();
    };
    var requestClose = function () { if (dirty) setClosing(true); else props.onClose(); };
    var sourceLabel = function (entry) {
      if (entry.edited) return text('syllable_prep.source_teacher', 'Your change');
      if (entry.source === 'ai') return text('syllable_prep.source_ai', 'AI');
      if (entry.source === 'table') return text('syllable_prep.source_table', 'Word list');
      if (entry.source === 'rules') return text('syllable_prep.source_rules', 'Spelling rules');
      if (entry.source === 'guess') return text('syllable_prep.source_guess', 'First guess');
      if (entry.source === 'saved') return text('syllable_prep.source_saved', 'Saved');
      return text('syllable_prep.source_none', 'Not divided yet');
    };
    var buttonClass = 'min-h-11 inline-flex items-center justify-center rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 disabled:opacity-50';
    var primaryClass = 'min-h-11 inline-flex items-center justify-center rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-800 disabled:opacity-50';

    var renderEditor = function (entry) {
      var letters = core.graphemes(entry.word);
      var breaks = new Set(core.breaksOf(entry.parts));
      var pieces = [];
      letters.forEach(function (letter, index) {
        pieces.push(<span key={'l' + index} className="text-xl font-bold text-slate-900">{letter}</span>);
        if (index < letters.length - 1) {
          var on = breaks.has(index + 1);
          pieces.push(<button key={'g' + index} type="button" aria-pressed={on}
            aria-label={text('syllable_prep.gap_label', 'Divide between {before} and {after}', { before: letters.slice(0, index + 1).join(''), after: letters.slice(index + 1).join('') })}
            onClick={function () { updateEntry(entry.word, { parts: core.toggleBreak(entry.parts, index + 1), edited: true, check: false, source: 'teacher', needsAi: false }); }}
            className={'mx-0.5 inline-flex items-center justify-center rounded border text-base font-black ' + (on ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-400 bg-white text-slate-500 hover:bg-slate-100')}
            style={{ minWidth: 24, minHeight: 32 }}>{on ? core.SEPARATOR : ''}</button>);
        }
      });
      return <div className="mt-2 rounded-lg border border-slate-300 bg-slate-50 p-3">
        <p className="mb-2 text-xs text-slate-700">{text('syllable_prep.edit_hint', 'Select a gap to add or remove a division.')}</p>
        <div dir="auto" className="flex flex-wrap items-center">{pieces}</div>
      </div>;
    };

    return <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10100, background: 'rgba(15, 23, 42, 0.6)' }} onMouseDown={function (event) { if (event.target === event.currentTarget) requestClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="syllable-prep-title" tabIndex={-1}
        onKeyDown={function (event) { if (props.containFocus) props.containFocus(event, dialogRef.current, requestClose); }}
        className="w-full rounded-xl border border-slate-300 bg-white p-5 shadow-2xl" style={{ maxWidth: 720, maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="syllable-prep-title" className="text-lg font-black text-slate-900">{text('syllable_prep.title', 'Check syllables')}</h2>
          <button type="button" onClick={requestClose} className={buttonClass}>{text('common.close', 'Close')}</button>
        </div>
        <p className="mt-1 text-sm text-slate-700">{text('syllable_prep.intro', 'Students see these divisions in the Immersive Reader when they turn on Syllables. Flagged words stay undivided for students until you confirm them.')}</p>

        {unsupported ? <p role="status" className="mt-4 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-slate-900">{text('syllable_prep.unsupported', 'Syllable divisions are not available for this writing system yet.')}</p> : <>
          <fieldset className="mt-4">
            <legend className="text-sm font-bold text-slate-900">{text('syllable_prep.method_legend', 'How should suggestions be made?')}</legend>
            {METHODS.map(function (item) {
              var needsAi = item.id !== 'device';
              return <label key={item.id} className={'mt-2 flex items-start gap-2 text-sm ' + (needsAi && !aiFn ? 'text-slate-500' : 'text-slate-900')}>
                <input type="radio" name="syllable-prep-method" className="mt-1" value={item.id} checked={method === item.id} disabled={needsAi && !aiFn} onChange={function () { setMethod(item.id); }} />
                <span><span className="font-bold">{text(item.key, item.label)}</span><span className="block text-xs text-slate-700">{text(item.hintKey, item.hint)}</span></span>
              </label>;
            })}
          </fieldset>
          {!aiFn && <p className="mt-2 text-xs text-slate-700">{text('syllable_prep.no_ai', 'AI is not available here, so only this device can make suggestions.')}</p>}
          {!onDevice && <p className="mt-2 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-slate-900">{text('syllable_prep.no_rules', 'This device can only suggest English and Spanish so far. For {language}, use AI or add the divisions yourself.', { language: language })}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" className={primaryClass} aria-disabled={status === 'working'} disabled={!onDevice && !aiFn} onClick={function () { if (status !== 'working') run(method, { replaceEdits: replaceEdits }); }}>
              {status === 'working' ? text('syllable_prep.working', 'Working...') : text('syllable_prep.suggest', 'Suggest syllables')}
            </button>
            {editedCount > 0 && <label className="flex items-center gap-2 text-sm text-slate-900"><input type="checkbox" checked={replaceEdits} onChange={function (event) { setReplaceEdits(event.target.checked); }} />{text('syllable_prep.replace_edits', 'Also replace my changes')}</label>}
          </div>
          <p role="status" aria-live="polite" className="mt-3 text-sm font-bold text-slate-900">
            {entries.length ? text('syllable_prep.summary', '{total} words, {check} to check, {edited} changed by you', { total: entries.length, check: checkCount, edited: editedCount }) : ''}
          </p>
          {notice && <p role="alert" className="mt-2 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-slate-900">{notice}</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            {entries.length > 0 && <button type="button" aria-pressed={showAll} className={buttonClass} onClick={function () { setShowAll(!showAll); }}>{showAll ? text('syllable_prep.show_flagged', 'Show only flagged words') : text('syllable_prep.show_all', 'Show all words')}</button>}
            {checkCount > 0 && <button type="button" className={buttonClass} onClick={function () { setEntries(function (list) { return list.map(function (entry) { return entry.check ? Object.assign({}, entry, { check: false, needsAi: false }) : entry; }); }); setDirty(true); }}>{text('syllable_prep.confirm_all', 'Confirm all flagged words')}</button>}
          </div>

          {entries.length > 0 && visible.length === 0 && <p className="mt-3 text-sm text-slate-700">{text('syllable_prep.none_flagged', 'No words need checking.')}</p>}
          <ul className="mt-3 space-y-2">
            {visible.map(function (entry) {
              var open = editing === entry.word;
              return <li key={entry.word} className="rounded-lg border border-slate-300 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span dir="auto" className="text-lg font-bold text-slate-900">{entry.parts.join(' ' + core.SEPARATOR + ' ')}</span>
                    <span className="ml-2 text-xs text-slate-700">{sourceLabel(entry)}</span>
                    {entry.check && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-slate-900">{text('syllable_prep.flagged', 'Check this')}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entry.check && <button type="button" className={buttonClass} aria-label={text('syllable_prep.confirm_word', 'Confirm {word}', { word: entry.word })} onClick={function () { updateEntry(entry.word, { check: false, needsAi: false }); }}>{text('syllable_prep.looks_right', 'Looks right')}</button>}
                    <button type="button" className={buttonClass} aria-expanded={open} aria-label={text('syllable_prep.change_word', 'Change {word}', { word: entry.word })} onClick={function () { setEditing(open ? null : entry.word); }}>{text('syllable_prep.change', 'Change')}</button>
                  </div>
                </div>
                {open && renderEditor(entry)}
              </li>;
            })}
          </ul>
        </>}

        {closing ? <div role="alertdialog" aria-label={text('syllable_prep.unsaved', 'You have unsaved changes.')} className="mt-4 rounded-lg border border-amber-400 bg-amber-50 p-3">
          <p className="text-sm font-bold text-slate-900">{text('syllable_prep.unsaved', 'You have unsaved changes.')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={primaryClass} onClick={saveNow}>{text('syllable_prep.save', 'Save for students')}</button>
            <button type="button" className={buttonClass} onClick={props.onClose}>{text('syllable_prep.discard', 'Discard changes')}</button>
            <button type="button" className={buttonClass} onClick={function () { setClosing(false); }}>{text('syllable_prep.keep_working', 'Keep working')}</button>
          </div>
        </div> : <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-300 pt-3">
          {savedInfo && <button type="button" className={buttonClass} onClick={function () { props.onSave(null); props.onClose(); }}>{text('syllable_prep.remove', 'Remove saved syllables')}</button>}
          {!unsupported && <button type="button" className={primaryClass} disabled={!entries.length || status === 'working'} onClick={saveNow}>{text('syllable_prep.save', 'Save for students')}</button>}
        </div>}
      </div>
    </div>;
  }
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SyllablePrepPanel = SyllablePrepPanel;
})();
