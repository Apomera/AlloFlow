"""
Show the floating ? ONLY when a modal blocks the header OR help mode is active.
Gate: isHelpMode || showWizard || isWordSoundsMode || isSyntaxGame || isMemoryGame || 
      isCrosswordGame || isMatchingGame || isTimelineGame || isConceptSortGame || 
      isReviewGame || escapeRoomState.isActive || isProjectSettingsOpen
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = 0

# Current condition: {!isZenMode && !showUDLGuide && (<>
# The floating ? is inside this block starting at L68391
# We need to wrap just the floating ? button in an additional condition

# Find the comment + button block and add a condition around just the button
old = '''      {/* Floating Help Toggle */}
      <button
        data-help-ignore="true"
        onClick={handleToggleIsHelpMode}
        aria-label={isHelpMode ? t('help_mode.deactivate') : t('help_mode.activate')}
        title={isHelpMode ? t('help_mode.deactivate') : t('help_mode.activate')}
        className={`fixed right-3 top-1/2 -translate-y-1/2 z-[10999] w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 transition-all duration-300 no-print ${
          isHelpMode 
            ? 'bg-yellow-400 border-yellow-500 text-slate-900 scale-110 animate-pulse shadow-yellow-400/50' 
            : 'bg-white/90 border-indigo-300/60 text-indigo-400 hover:bg-white hover:border-indigo-400 hover:text-indigo-600 hover:scale-110 hover:shadow-xl backdrop-blur-sm animate-[help-breathe_3s_ease-in-out_infinite]'
        }`}
        style={{ fontSize: '16px', fontWeight: 900, lineHeight: 1 }}
      >
        {isHelpMode ? <X size={16}/> : '?'}
      </button>'''

new = '''      {/* Floating Help Toggle — only visible when a modal/overlay blocks the header ? */}
      {(isHelpMode || showWizard || isWordSoundsMode || isSyntaxGame || isMemoryGame || isCrosswordGame || isMatchingGame || isTimelineGame || isConceptSortGame || isReviewGame || escapeRoomState.isActive || isProjectSettingsOpen) && (
      <button
        data-help-ignore="true"
        onClick={handleToggleIsHelpMode}
        aria-label={isHelpMode ? t('help_mode.deactivate') : t('help_mode.activate')}
        title={isHelpMode ? t('help_mode.deactivate') : t('help_mode.activate')}
        className={`fixed right-3 top-1/2 -translate-y-1/2 z-[10999] w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 transition-all duration-300 no-print ${
          isHelpMode 
            ? 'bg-yellow-400 border-yellow-500 text-slate-900 scale-110 animate-pulse shadow-yellow-400/50' 
            : 'bg-white/90 border-indigo-300/60 text-indigo-400 hover:bg-white hover:border-indigo-400 hover:text-indigo-600 hover:scale-110 hover:shadow-xl backdrop-blur-sm animate-[help-breathe_3s_ease-in-out_infinite]'
        }`}
        style={{ fontSize: '16px', fontWeight: 900, lineHeight: 1 }}
      >
        {isHelpMode ? <X size={16}/> : '?'}
      </button>
      )}'''

for nl in ['\r\n', '\n']:
    test = old.replace('\n', nl)
    repl = new.replace('\n', nl)
    if test in content:
        content = content.replace(test, repl)
        changes += 1
        print("Wrapped floating ? in modal visibility condition")
        break
else:
    print("ERROR: Could not find floating ? button block")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

# Fix double CRs
with open(FILE, 'rb') as f:
    raw = f.read()
dbl = raw.count(b'\r\r\n')
if dbl > 0:
    raw = raw.replace(b'\r\r\n', b'\r\n')
    with open(FILE, 'wb') as f:
        f.write(raw)
    print("Fixed %d double CRs" % dbl)

print("\nTotal changes: %d" % changes)
print("DONE")
