"""
Add aria-label to buttons that truly need them.
Three strategies:
A. Buttons with title= → mirror title as aria-label
B. Icon-only buttons → derive aria-label from icon component name  
C. Handler-only buttons → derive aria-label from onClick handler name

SAFETY: Never adds aria-label to a button that already has one.
"""
import sys, re, json
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

# Icon name → human-readable label mapping
ICON_LABELS = {
    'X': 'Close',
    'ChevronRight': 'Next',
    'ChevronLeft': 'Previous',
    'ChevronDown': 'Expand',
    'ChevronUp': 'Collapse',
    'ArrowLeft': 'Go back',
    'ArrowRight': 'Continue',
    'Mic': 'Voice input',
    'MicOff': 'Mute microphone',
    'Play': 'Play',
    'Pause': 'Pause',
    'Square': 'Stop',
    'SkipForward': 'Skip forward',
    'RotateCcw': 'Restart',
    'RefreshCw': 'Refresh',
    'Plus': 'Add',
    'Minus': 'Remove',
    'Trash': 'Delete',
    'Trash2': 'Delete',
    'Edit': 'Edit',
    'Edit2': 'Edit',
    'Pencil': 'Edit',
    'Save': 'Save',
    'Download': 'Download',
    'Upload': 'Upload',
    'Copy': 'Copy',
    'Check': 'Confirm',
    'CheckCircle': 'Confirm',
    'CheckCircle2': 'Check',
    'CheckSquare': 'Check',
    'XCircle': 'Cancel',
    'Eye': 'Show',
    'EyeOff': 'Hide',
    'Search': 'Search',
    'Filter': 'Filter',
    'Settings': 'Settings',
    'HelpCircle': 'Help',
    'Info': 'Information',
    'AlertTriangle': 'Warning',
    'Star': 'Favorite',
    'Heart': 'Like',
    'Share': 'Share',
    'Share2': 'Share',
    'Moon': 'Dark mode',
    'Sun': 'Light mode',
    'Volume2': 'Volume',
    'VolumeX': 'Mute',
    'Maximize': 'Maximize',
    'Maximize2': 'Maximize',
    'Minimize': 'Minimize',
    'Minimize2': 'Minimize',
    'Sparkles': 'Generate',
    'Wand2': 'Generate',
    'FileDown': 'Export file',
    'Printer': 'Print',
    'ListOrdered': 'Reorder list',
    'Gamepad2': 'Start game',
    'Users': 'Groups',
    'BookOpen': 'Read',
    'History': 'History',
    'Lock': 'Locked',
    'Unlock': 'Unlock',
    'ImageIcon': 'Toggle images',
    'Wifi': 'Connect',
    'CircleHelp': 'Help',
    'MessageSquare': 'Message',
    'MessageCircleQuestion': 'Ask question',
    'MousePointerClick': 'Click',
    'MoreHorizontal': 'More options',
    'MoreVertical': 'More options',
    'GripVertical': 'Drag to reorder',
    'Grip': 'Drag to reorder',
    'ExternalLink': 'Open in new tab',
    'Fullscreen': 'Fullscreen',
    'ZoomIn': 'Zoom in',
    'ZoomOut': 'Zoom out',
}

# Handler name → human-readable label mapping
HANDLER_LABELS = {
    'onClose': 'Close',
    'handleClose': 'Close',
    'onCancel': 'Cancel',
    'handleCancel': 'Cancel',
    'handleSubmit': 'Submit',
    'onSubmit': 'Submit',
    'handleAiGenerate': 'Generate with AI',
    'toggleAll': 'Toggle all',
    'checkSpellingBee': 'Check answer',
    'checkScramble': 'Check answer',
    'checkPuzzle': 'Check puzzle',
    'revealPuzzle': 'Reveal answers',
    'checkAnswer': 'Check answer',
    'handleSkip': 'Skip',
    'handleCheck': 'Check',
    'initializeGame': 'Start game',
    'handleMicInput': 'Voice input',
    'handleMicCheck': 'Check pronunciation',
    'checkAnswers': 'Check answers',
    'checkOrder': 'Check order',
    'handleExportAnalyticsPDF': 'Export analytics as PDF',
    'handleVennScrambleBank': 'Scramble items',
    'handleSetIsVennPlayingToTrue': 'Start Venn game',
    'handleInitializeVenn': 'Initialize Venn diagram',
    'handleSetShowGroupModalToTrue': 'Manage groups',
    'handleSetShowGroupModalToFalse': 'Close groups',
    'resetFontSize': 'Reset font size',
    'handleToggleFocusMode': 'Toggle focus mode',
    'handleSetPersonaDefinitionDataToNull': 'Close definition',
    'handleSetActiveSidebarTabToCreate': 'Create new content',
    'handleToggleShowUDLGuide': 'Toggle UDL guide',
    'handleSetActiveViewToPersona': 'Open Persona chat',
    'handleGenerateMath': 'Generate math problems',
    'handleGenerateLessonPlan': 'Generate lesson plan',
    'handleGenerateFullPack': 'Generate full pack',
    'handleSetIsJoinPanelExpandedToTrue': 'Join session',
    'handleStartAdventure': 'Start adventure',
    'handleSetIsZenModeToFalse': 'Exit zen mode',
    'handleToggleIsEditingAnalysis': 'Toggle edit analysis',
    'handleToggleShowFlashcardImages': 'Toggle flashcard images',
    'handleToggleShowWordSearchAnswers': 'Toggle word search answers',
    'handlePrintGame': 'Print game',
    'handleToggleIsEditingLeveledText': 'Toggle edit text',
    'handleSetIsCustomReviseOpenToFalse': 'Close revision panel',
    'handleToggleIsEditingOutline': 'Toggle edit outline',
    'handleToggleIsEditingQuiz': 'Toggle edit quiz',
    'handleToggleShowQuizAnswers': 'Toggle quiz answers',
    'handleSetIsEscapeTimerRunningToTrue': 'Start timer',
    'handleToggleIsEditingFaq': 'Toggle edit FAQ',
    'handleToggleIsEditingScaffolds': 'Toggle edit scaffolds',
    'handleToggleIsEditingBrainstorm': 'Toggle edit brainstorm',
    'handleResumeAdventure': 'Resume adventure',
    'handleSetShowNewGameSetupToTrue': 'New game setup',
    'handleToggleImmersiveShowChoices': 'Toggle story choices',
    'handleBroadcastOptions': 'Broadcast to students',
    'handleStartSequel': 'Start sequel',
    'handleUseItem': 'Use item',
    'handleDownloadImage': 'Download image',
    'handleSetIsTimelineGameToTrue': 'Start timeline game',
    'handleToggleIsEditingTimeline': 'Toggle edit timeline',
    'handleSetIsConceptSortGameToTrue': 'Start concept sort game',
    'handleToggleShowMathAnswers': 'Toggle math answers',
    'handleSetShowMathAnswersToTrue': 'Show math answers',
    'launchEscapeRoomWithSettings': 'Launch escape room',
    'handleSetShowSaveModalToFalse': 'Close save dialog',
    'executeSaveFile': 'Save file',
    'handleSetShowStudyTimerModalToFalse': 'Close study timer',
}

changes = 0
i = 0
new_lines = list(lines)  # work on copy

def find_button_end(start_idx, all_lines):
    """Find the line before the first > that closes the opening tag"""
    for j in range(start_idx, min(len(all_lines), start_idx + 15)):
        line = all_lines[j]
        # Check if this line closes the opening tag (has > but not as part of an attribute)
        if '>' in line:
            # Make sure it's the closing of the opening tag, not a child element
            stripped = line.strip()
            if stripped.endswith('>') and not stripped.startswith('</'): 
                return j
            # Could be inline like onClick={() => ...} >
            if re.search(r'[}\"\']?\s*>', line):
                return j
    return start_idx

# Process line by line
i = 0
while i < len(new_lines):
    line = new_lines[i]
    
    # Only process <button lines (not already having aria-label)
    if re.search(r'<button[\s>]', line) and not re.search(r'<button[A-Z]', line):
        # Check the button opening tag for aria-label (look ahead a few lines)
        has_aria = False
        btn_open_end = i
        for j in range(i, min(len(new_lines), i + 12)):
            if 'aria-label' in new_lines[j]:
                has_aria = True
                break
            if '>' in new_lines[j] and j > i:
                btn_open_end = j
                break
            elif '>' in new_lines[j] and j == i and new_lines[j].count('>') > 0:
                btn_open_end = j
                break
        
        if has_aria:
            i += 1
            continue
        
        # Strategy A: Has title — mirror it
        title_match = None
        for j in range(i, min(len(new_lines), i + 10)):
            tm = re.search(r'title=\{([^}]+)\}', new_lines[j])
            if tm:
                title_match = (j, tm)
                break
            tm = re.search(r'title="([^"]+)"', new_lines[j])
            if tm:
                title_match = (j, tm)
                break
        
        if title_match:
            j, tm = title_match
            title_raw = tm.group(0)  # full match like title={...} or title="..."
            if title_raw.startswith('title={'):
                aria_val = title_raw.replace('title={', 'aria-label={')
            else:
                aria_val = title_raw.replace('title="', 'aria-label="')
            # Insert aria-label on the line after title
            indent = len(new_lines[j]) - len(new_lines[j].lstrip())
            indent_str = ' ' * indent
            # Add aria-label right after the title line
            aria_line = indent_str + aria_val + '\n'
            # Check if the line has \r\n
            if new_lines[j].endswith('\r\n'):
                aria_line = indent_str + aria_val + '\r\n'
            new_lines.insert(j + 1, aria_line)
            changes += 1
            i = j + 2
            continue
        
        # Strategy B: Has icon — derive from icon name
        icons = []
        onclick = None
        for j in range(i, min(len(new_lines), i + 15)):
            # Find icons
            for im in re.finditer(r'<(\w+)\s+size=', new_lines[j]):
                icons.append(im.group(1))
            # Find onClick
            om = re.search(r'onClick=\{(\w+)', new_lines[j])
            if om and onclick is None:
                onclick = om.group(1)
        
        label = None
        
        if icons:
            # Derive from first icon
            primary_icon = icons[0]
            if primary_icon in ICON_LABELS:
                label = ICON_LABELS[primary_icon]
                # Enrich with handler context for toggle/generic buttons
                if onclick and label in ('Check', 'Show', 'Generate') and onclick in HANDLER_LABELS:
                    label = HANDLER_LABELS[onclick]
            elif onclick and onclick in HANDLER_LABELS:
                label = HANDLER_LABELS[onclick]
        
        # Strategy C: Handler-only
        if not label and onclick and onclick in HANDLER_LABELS:
            label = HANDLER_LABELS[onclick]
        
        if label:
            # Insert aria-label on the <button line
            # Find the end of the <button tag attributes
            if new_lines[i].strip().endswith('>') or '/>' in new_lines[i]:
                # Single-line button — insert before the closing >
                new_lines[i] = re.sub(r'(\s*)(>|/>)', f' aria-label="{label}"\\2', new_lines[i], count=1)
            else:
                # Multi-line — add aria-label on next line
                indent = len(new_lines[i]) - len(new_lines[i].lstrip()) + 4
                indent_str = ' ' * indent
                suffix = '\r\n' if new_lines[i].endswith('\r\n') else '\n'
                new_lines.insert(i + 1, indent_str + f'aria-label="{label}"' + suffix)
            changes += 1
        
        i += 1
    else:
        i += 1

# Save
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Applied {changes} aria-label additions")
print("DONE")
