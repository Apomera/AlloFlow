"""
Escape Room Preview & Save System — Implementation Script

Changes:
1. Add `savedEscapeRoom` to escapeRoomState (raw unprocessed data for editing)
2. Modify generateEscapeRoom to enter preview mode when isTeacherMode
3. Add preview / edit / save UI in the settings modal area
4. Add "Load Saved" option in settings when saved config exists
5. Add "Launch from Saved" flow that skips AI generation
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8-sig').read()
lines = content.split('\n')
changes = []

# ──────────────────────────────────────────────────────────
# CHANGE 1: Extend escapeRoomState initial state
# Add savedEscapeRoom and isPreview fields
# ──────────────────────────────────────────────────────────
# Find the escapeRoomState useState at L31163
for i, l in enumerate(lines):
    if 'const [escapeRoomState, setEscapeRoomState] = useState({' in l:
        # Find the closing });
        j = i + 1
        while j < len(lines) and '});' not in lines[j]:
            j += 1
        # Insert before the closing });
        insert_line = j  # line with });
        # Add new fields before the closing
        old = lines[insert_line - 1].rstrip('\r')  # line before });
        new_fields = old + '\r\n    isPreview: false,\r\n    savedEscapeRoom: null, // Saved configuration for teacher preview/edit'
        lines[insert_line - 1] = new_fields
        changes.append(f'Added isPreview and savedEscapeRoom to escapeRoomState init at L{i+1}')
        break

# ──────────────────────────────────────────────────────────
# CHANGE 2: Modify generateEscapeRoom to enter preview mode
# After successful generation, if teacher mode, go to preview instead of active
# ──────────────────────────────────────────────────────────
# The key section is L48792-48800 where setEscapeRoomState sets the room data
# We need to: (a) save raw data, (b) set isPreview instead of active for teachers
for i, l in enumerate(lines):
    if 'setEscapeRoomState(prev => ({' in l.strip() and i > 48700 and i < 48850:
        # Check if this is the success state (has room: data.room)
        next_lines = ''.join(lines[i:i+10])
        if 'room: data.room' in next_lines:
            # Replace this block to conditionally enter preview mode
            # Find the end of this setEscapeRoomState call
            j = i + 1
            depth = 1
            while j < len(lines) and depth > 0:
                depth += lines[j].count('({') + lines[j].count('(') - lines[j].count('})') - lines[j].count(')')
                if '}));' in lines[j]:
                    depth = 0
                j += 1
            # Insert savedEscapeRoom before the closing
            # We need to save raw data for editing
            # Find the line with room: data.room and insert after finalDoorPuzzle line
            for k in range(i, j):
                if 'finalDoorPuzzle: processedFinalDoor' in lines[k]:
                    old_line = lines[k].rstrip('\r')
                    lines[k] = old_line + '\r\n          savedEscapeRoom: { room: data.room, objects: data.objects, puzzles: data.puzzles, finalDoor: data.finalDoor || processedFinalDoor },\r\n          isPreview: true,'
                    changes.append(f'Added savedEscapeRoom and isPreview:true to generation success handler at L{k+1}')
                    break
            break

# ──────────────────────────────────────────────────────────
# CHANGE 3: Add functions for preview operations
# - confirmEscapeRoom: accept preview and start playing
# - updateEscapeRoomPuzzle: edit a puzzle in preview
# - saveEscapeRoomConfig: persist to localStorage
# - loadSavedEscapeRoom: load from localStorage
# ──────────────────────────────────────────────────────────
# Insert after launchEscapeRoomWithSettings (L49274)
for i, l in enumerate(lines):
    if 'generateEscapeRoom();' in l.strip() and i > 49200 and i < 49300:
        # This is inside launchEscapeRoomWithSettings
        # Find the closing }; of launchEscapeRoomWithSettings
        j = i + 1
        while j < len(lines) and '};' not in lines[j].strip():
            j += 1
        insert_after = j  # After the }; of launchEscapeRoomWithSettings

        new_functions = '''  // ═══════════════════════════════════════════════════════
  // ESCAPE ROOM PREVIEW & SAVE SYSTEM
  // ═══════════════════════════════════════════════════════
  
  // Confirm preview and start playing the escape room
  const confirmEscapeRoomPreview = () => {
    setEscapeRoomState(prev => ({
      ...prev,
      isPreview: false,
      isActive: true,
      timerPaused: true,
    }));
    playSound('correct');
    addToast(t('escape_room.preview_confirmed') || '✅ Escape Room locked — ready to play!', 'success');
  };

  // Update a puzzle in preview mode
  const updateEscapeRoomPuzzle = (puzzleIndex, field, value) => {
    setEscapeRoomState(prev => {
      const newPuzzles = [...prev.puzzles];
      const puzzle = { ...newPuzzles[puzzleIndex] };
      
      if (field === 'question') puzzle.question = value;
      else if (field === 'hint') puzzle.hint = value;
      else if (field === 'answer') puzzle.answer = value;
      else if (field === 'sentence') puzzle.sentence = value;
      else if (field === 'encodedText') puzzle.encodedText = value;
      else if (field === 'options' && puzzle.type === 'mcq') {
        // value = { index, text }
        const newOptions = [...puzzle.options];
        newOptions[value.index] = value.text;
        puzzle.options = newOptions;
      }
      
      newPuzzles[puzzleIndex] = puzzle;
      
      // Also update savedEscapeRoom
      const savedPuzzles = prev.savedEscapeRoom ? [...prev.savedEscapeRoom.puzzles] : [];
      if (savedPuzzles[puzzleIndex]) {
        savedPuzzles[puzzleIndex] = { ...savedPuzzles[puzzleIndex] };
        if (field === 'question') savedPuzzles[puzzleIndex].question = value;
        else if (field === 'hint') savedPuzzles[puzzleIndex].hint = value;
        else if (field === 'answer') savedPuzzles[puzzleIndex].answer = value;
        else if (field === 'sentence') savedPuzzles[puzzleIndex].sentence = value;
        else if (field === 'encodedText') savedPuzzles[puzzleIndex].encodedText = value;
        else if (field === 'options' && puzzle.type === 'mcq') {
          const newOpts = [...savedPuzzles[puzzleIndex].options];
          newOpts[value.index] = value.text;
          savedPuzzles[puzzleIndex].options = newOpts;
        }
      }
      
      return {
        ...prev,
        puzzles: newPuzzles,
        savedEscapeRoom: prev.savedEscapeRoom ? { ...prev.savedEscapeRoom, puzzles: savedPuzzles } : null
      };
    });
  };

  // Update final door puzzle in preview mode
  const updateEscapeRoomFinalDoor = (field, value) => {
    setEscapeRoomState(prev => ({
      ...prev,
      finalDoorPuzzle: { ...prev.finalDoorPuzzle, [field]: value },
      savedEscapeRoom: prev.savedEscapeRoom ? {
        ...prev.savedEscapeRoom,
        finalDoor: { ...(prev.savedEscapeRoom.finalDoor || prev.finalDoorPuzzle), [field]: value }
      } : null
    }));
  };

  // Save escape room config to localStorage
  const saveEscapeRoomConfig = () => {
    const config = escapeRoomState.savedEscapeRoom;
    if (!config) return;
    try {
      const saveData = {
        config,
        difficulty: escapeRoomState.difficulty,
        puzzleCount: escapeRoomState.puzzleCount || config.puzzles.length,
        timestamp: Date.now(),
        sourceTextHash: inputText.substring(0, 100), // For matching to source
      };
      localStorage.setItem('allo_saved_escape_room', JSON.stringify(saveData));
      addToast(t('escape_room.config_saved') || '💾 Escape Room saved! Load it anytime from settings.', 'success');
    } catch (e) {
      warnLog('Failed to save escape room config:', e);
      addToast(t('errors.storage_full') || 'Storage full — could not save', 'error');
    }
  };

  // Load saved escape room config
  const loadSavedEscapeRoom = () => {
    try {
      const saved = localStorage.getItem('allo_saved_escape_room');
      if (!saved) {
        addToast(t('escape_room.no_saved') || 'No saved Escape Room found', 'info');
        return;
      }
      const saveData = JSON.parse(saved);
      const config = saveData.config;
      if (!config || !config.room || !config.puzzles) {
        addToast(t('escape_room.invalid_save') || 'Saved data is corrupted', 'error');
        return;
      }
      
      // Process saved puzzles just like fresh generation
      const processedPuzzles = config.puzzles.map((p, i) => {
        const processed = {
          ...p,
          linkedObject: config.objects?.find(o => o.id === p.linkedObjectId) || config.objects?.[i] || { emoji: '🔮', name: `Puzzle ${i+1}` }
        };
        if (p.type === 'sequence' && p.items) {
          const indices = p.items.map((_, idx) => idx);
          processed.shuffledItems = derangeShuffle(indices);
        }
        if (p.type === 'scramble' && p.scrambledWord) {
          processed.displayLetters = derangeShuffle(p.scrambledWord.split('').filter(c => c.trim()));
        }
        if (p.type === 'matching' && p.pairs) {
          processed.leftColumn = derangeShuffle(p.pairs.map(pair => pair.left));
          processed.rightColumn = derangeShuffle(p.pairs.map(pair => pair.right));
        }
        if (p.type === 'fillin' && p.wordbank) {
          processed.wordbank = derangeShuffle(p.wordbank);
        }
        if (p.type === 'cipher' && p.wordbank) {
          processed.wordbank = derangeShuffle(p.wordbank);
        }
        return processed;
      });
      
      let processedFinalDoor = config.finalDoor || null;
      if (processedFinalDoor && processedFinalDoor.wordbank) {
        processedFinalDoor = { ...processedFinalDoor, wordbank: derangeShuffle(processedFinalDoor.wordbank) };
      }
      
      const diffPresets = {
        easy: { timePerPuzzle: 45, lives: 99, hints: 5, xpMultiplier: 0.5 },
        normal: { timePerPuzzle: 30, lives: 3, hints: 3, xpMultiplier: 1.0 },
        hard: { timePerPuzzle: 20, lives: 1, hints: 1, xpMultiplier: 2.0 }
      };
      const diff = saveData.difficulty || 'normal';
      const preset = diffPresets[diff];
      const totalTime = processedPuzzles.length * preset.timePerPuzzle;
      
      setEscapeRoomState(prev => ({
        ...prev,
        isActive: false,
        isPreview: true,
        isGenerating: false,
        showSettings: false,
        room: config.room,
        puzzles: processedPuzzles,
        objects: config.objects,
        totalPuzzles: processedPuzzles.length,
        finalDoorPuzzle: processedFinalDoor,
        savedEscapeRoom: config,
        solvedPuzzles: new Set(),
        isEscaped: false,
        timeRemaining: totalTime,
        maxTime: totalTime,
        difficulty: diff,
        lives: preset.lives,
        maxLives: preset.lives,
        hintsRemaining: preset.hints,
        maxHints: preset.hints,
        xpMultiplier: preset.xpMultiplier,
        streak: 0,
        wrongAttempts: 0,
        isGameOver: false,
        timerPaused: true,
      }));
      setEscapeTimeLeft(totalTime);
      setIsEscapeTimerRunning(false);
      playSound('correct');
      addToast(t('escape_room.loaded_saved') || '📂 Saved Escape Room loaded! Review and launch when ready.', 'success');
    } catch (e) {
      warnLog('Failed to load saved escape room:', e);
      addToast(t('errors.load_failed') || 'Failed to load saved config', 'error');
    }
  };

  // Check if there's a saved escape room
  const hasSavedEscapeRoom = useMemo(() => {
    try {
      return !!localStorage.getItem('allo_saved_escape_room');
    } catch { return false; }
  }, [escapeRoomState.showSettings]);'''

        lines.insert(insert_after + 1, new_functions)
        changes.append(f'Inserted preview/edit/save functions after L{insert_after+1}')
        break

# ──────────────────────────────────────────────────────────
# CHANGE 4: Add "Load Saved" button to settings modal
# Add before the Launch button in the settings panel
# ──────────────────────────────────────────────────────────
for i, l in enumerate(lines):
    if '<div className="flex gap-3">' in l and i > 68300 and i < 68500:
        # Check context — should be near escape room cancel/launch buttons
        context = ''.join(lines[i:i+15])
        if 'launchEscapeRoomWithSettings' in context:
            # Insert "Load Saved" button after the flex gap-3 div
            load_saved_btn = '''                    {hasSavedEscapeRoom && (
                        <button
                            aria-label="Load saved escape room"
                            onClick={loadSavedEscapeRoom}
                            className="flex-1 py-3 rounded-xl border-2 border-emerald-300 text-emerald-700 font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                        >
                            📂 {t('escape_room.load_saved') || 'Load Saved'}
                        </button>
                    )}'''
            old_line = lines[i].rstrip('\r')
            lines[i] = old_line + '\r\n' + load_saved_btn
            changes.append(f'Added Load Saved button to escape room settings at L{i+1}')
            break

# ──────────────────────────────────────────────────────────
# CHANGE 5: Add Preview UI overlay
# This renders when isPreview is true — shows all puzzles for review/edit
# Insert right after the settings modal closing tag
# ──────────────────────────────────────────────────────────
for i, l in enumerate(lines):
    if 'escapeRoomState.showSettings' in l and '&&' in l and i > 68200:
        # Find the closing of this conditional block
        j = i + 1
        depth = 1
        paren_depth = 0
        while j < len(lines):
            for ch in lines[j]:
                if ch == '{': depth += 1
                elif ch == '}': depth -= 1
            if depth <= 0:
                break
            j += 1
        # j is the line with the closing )}
        insert_after_settings = j
        
        preview_ui = '''      {escapeRoomState.isPreview && escapeRoomState.room && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" style={{ overflowY: 'auto' }}>
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl border-4 border-amber-400 relative overflow-y-auto max-w-3xl w-full mx-4 my-8 max-h-[90vh] transform transition-all animate-in zoom-in-95 duration-300" role="dialog" onClick={e => e.stopPropagation()}>
                <button 
                    onClick={() => setEscapeRoomState(prev => ({ ...prev, isPreview: false, isActive: false, room: null, puzzles: [], savedEscapeRoom: null }))}
                    className="absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10"
                    aria-label={t('common.close')}
                >
                    <X size={20} />
                </button>
                
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Key size={32} className="text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-1">👁️ {t('escape_room.preview_title') || 'Preview Escape Room'}</h2>
                    <p className="text-slate-500 text-sm">{t('escape_room.preview_desc') || 'Review and edit puzzles before students play. Click any field to edit.'}</p>
                </div>
                
                {/* Room Theme */}
                <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200">
                    <h3 className="font-bold text-amber-800 text-lg">🏰 {escapeRoomState.room.theme}</h3>
                    <p className="text-amber-700 text-sm mt-1">{escapeRoomState.room.description}</p>
                </div>
                
                {/* Puzzles */}
                <div className="space-y-3 mb-6">
                    {escapeRoomState.puzzles.map((puzzle, idx) => (
                        <div key={puzzle.id || idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-amber-300 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">{puzzle.linkedObject?.emoji || '🔮'}</span>
                                <span className="font-bold text-slate-700">{puzzle.linkedObject?.name || `Puzzle ${idx + 1}`}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                                    puzzle.type === 'mcq' ? 'bg-blue-100 text-blue-700' :
                                    puzzle.type === 'sequence' ? 'bg-purple-100 text-purple-700' :
                                    puzzle.type === 'cipher' ? 'bg-red-100 text-red-700' :
                                    puzzle.type === 'matching' ? 'bg-green-100 text-green-700' :
                                    puzzle.type === 'scramble' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-teal-100 text-teal-700'
                                }`}>{puzzle.type}</span>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Question</label>
                                    <input
                                        type="text"
                                        value={puzzle.question || puzzle.sentence || puzzle.encodedText || ''}
                                        onChange={e => updateEscapeRoomPuzzle(idx, puzzle.sentence ? 'sentence' : puzzle.encodedText ? 'encodedText' : 'question', e.target.value)}
                                        className="w-full mt-1 p-2 text-sm border border-slate-200 rounded-lg focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none transition-colors"
                                    />
                                </div>
                                {puzzle.type === 'mcq' && puzzle.options && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {puzzle.options.map((opt, optIdx) => (
                                            <div key={optIdx} className="flex items-center gap-1">
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${optIdx === puzzle.correctIndex ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                    {String.fromCharCode(65 + optIdx)}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={e => updateEscapeRoomPuzzle(idx, 'options', { index: optIdx, text: e.target.value })}
                                                    className={`flex-1 p-1.5 text-xs border rounded-lg outline-none transition-colors ${optIdx === puzzle.correctIndex ? 'border-green-300 bg-green-50' : 'border-slate-200'}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {puzzle.type === 'scramble' && (
                                    <p className="text-xs text-slate-500">✅ Answer: <strong>{puzzle.answer}</strong></p>
                                )}
                                {(puzzle.type === 'fillin' || puzzle.type === 'cipher') && (
                                    <p className="text-xs text-slate-500">✅ Answer: <strong>{puzzle.answer}</strong> | Wordbank: {(puzzle.wordbank || []).join(', ')}</p>
                                )}
                                {puzzle.type === 'sequence' && puzzle.items && (
                                    <p className="text-xs text-slate-500">📋 Correct order: {puzzle.items.join(' → ')}</p>
                                )}
                                {puzzle.type === 'matching' && puzzle.pairs && (
                                    <p className="text-xs text-slate-500">🔗 Pairs: {puzzle.pairs.map(p => `${p.left}↔${p.right}`).join(', ')}</p>
                                )}
                                {puzzle.hint && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Hint</label>
                                        <input
                                            type="text"
                                            value={puzzle.hint}
                                            onChange={e => updateEscapeRoomPuzzle(idx, 'hint', e.target.value)}
                                            className="w-full mt-1 p-2 text-xs border border-slate-200 rounded-lg focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Final Door */}
                {escapeRoomState.finalDoorPuzzle && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border border-red-200">
                        <h4 className="font-bold text-red-800 mb-2">🚪 Final Door Puzzle</h4>
                        <input
                            type="text"
                            value={escapeRoomState.finalDoorPuzzle.sentence || ''}
                            onChange={e => updateEscapeRoomFinalDoor('sentence', e.target.value)}
                            className="w-full p-2 text-sm border border-red-200 rounded-lg focus:border-red-400 outline-none mb-2"
                        />
                        <p className="text-xs text-red-600">✅ Answer: <strong>{escapeRoomState.finalDoorPuzzle.answer}</strong></p>
                    </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        aria-label="Discard preview"
                        onClick={() => setEscapeRoomState(prev => ({ ...prev, isPreview: false, isActive: false, room: null, puzzles: [], savedEscapeRoom: null }))}
                        className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                    >
                        {t('common.discard') || '🗑️ Discard'}
                    </button>
                    <button
                        aria-label="Save escape room configuration"
                        onClick={saveEscapeRoomConfig}
                        className="flex-1 py-3 rounded-xl border-2 border-emerald-300 text-emerald-700 font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                    >
                        💾 {t('escape_room.save_config') || 'Save'}
                    </button>
                    <button
                        aria-label="Confirm and launch escape room"
                        onClick={confirmEscapeRoomPreview}
                        className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-all shadow-lg hover:shadow-amber-500/30 flex items-center justify-center gap-2"
                    >
                        🚀 {t('escape_room.launch') || 'Launch!'}
                    </button>
                </div>
            </div>
        </div>
      )}'''
        
        lines.insert(insert_after_settings + 1, preview_ui)
        changes.append(f'Inserted preview UI overlay after settings modal at L{insert_after_settings+1}')
        break

# Write result
content = '\n'.join(lines)
with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

for c in changes:
    print(f'✅ {c}')
print(f'\nTotal changes: {len(changes)}')
print(f'New line count: {len(lines)}')
