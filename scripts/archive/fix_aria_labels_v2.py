"""
Safe Aria-Label Injection — v2
STRATEGY: ONLY insert new lines. NEVER modify existing lines.

For each <button that lacks aria-label:
1. Parse ahead to find the full opening tag (up to the first unquoted >)
2. Determine label from: title attribute, icon name, or onClick handler
3. Insert aria-label="..." as a NEW LINE right after the <button line
4. Skip buttons that already have aria-label

SAFETY RULES:
- Never touch any existing line content
- Only insert new lines with proper indentation
- Skip any button where we can't determine a safe label
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

# Icon name → human-readable label mapping
ICON_LABELS = {
    'X': 'Close', 'ChevronRight': 'Next', 'ChevronLeft': 'Previous',
    'ChevronDown': 'Expand', 'ChevronUp': 'Collapse',
    'ArrowLeft': 'Go back', 'ArrowRight': 'Continue',
    'Mic': 'Voice input', 'MicOff': 'Mute microphone',
    'Play': 'Play', 'Pause': 'Pause', 'Square': 'Stop',
    'SkipForward': 'Skip forward', 'RotateCcw': 'Restart',
    'RefreshCw': 'Refresh', 'Plus': 'Add', 'Minus': 'Remove',
    'Trash': 'Delete', 'Trash2': 'Delete', 'Edit': 'Edit',
    'Edit2': 'Edit', 'Pencil': 'Edit', 'Save': 'Save',
    'Download': 'Download', 'Upload': 'Upload', 'Copy': 'Copy',
    'Check': 'Confirm', 'CheckCircle': 'Confirm',
    'CheckCircle2': 'Check', 'CheckSquare': 'Check',
    'XCircle': 'Cancel', 'Eye': 'Show', 'EyeOff': 'Hide',
    'Search': 'Search', 'Filter': 'Filter', 'Settings': 'Settings',
    'HelpCircle': 'Help', 'Info': 'Information',
    'Star': 'Favorite', 'Heart': 'Like', 'Share': 'Share',
    'Volume2': 'Volume', 'VolumeX': 'Mute',
    'Maximize': 'Maximize', 'Maximize2': 'Maximize',
    'Minimize': 'Minimize', 'Minimize2': 'Minimize',
    'Sparkles': 'Generate', 'Wand2': 'Generate',
    'FileDown': 'Export file', 'Printer': 'Print',
    'ListOrdered': 'Reorder list', 'Gamepad2': 'Start game',
    'Users': 'Groups', 'BookOpen': 'Read', 'History': 'History',
    'Lock': 'Locked', 'Unlock': 'Unlock', 'ImageIcon': 'Toggle images',
    'Wifi': 'Connect', 'CircleHelp': 'Help',
    'MessageSquare': 'Message', 'MessageCircleQuestion': 'Ask question',
    'MoreHorizontal': 'More options', 'MoreVertical': 'More options',
    'GripVertical': 'Drag to reorder', 'ExternalLink': 'Open in new tab',
    'ZoomIn': 'Zoom in', 'ZoomOut': 'Zoom out',
    'StopCircle': 'Stop', 'MousePointerClick': 'Click',
}

# Handler name → label mapping  
HANDLER_LABELS = {
    'onClose': 'Close', 'handleClose': 'Close',
    'onCancel': 'Cancel', 'handleCancel': 'Cancel',
    'handleSubmit': 'Submit', 'onSubmit': 'Submit',
    'handleAiGenerate': 'Generate with AI', 'toggleAll': 'Toggle all',
    'checkSpellingBee': 'Check answer', 'checkScramble': 'Check answer',
    'checkPuzzle': 'Check puzzle', 'revealPuzzle': 'Reveal answers',
    'checkAnswer': 'Check answer', 'handleSkip': 'Skip',
    'handleCheck': 'Check', 'initializeGame': 'Start game',
    'handleMicInput': 'Voice input', 'handleMicCheck': 'Check pronunciation',
    'checkAnswers': 'Check answers', 'checkOrder': 'Check order',
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
    'handleSpeak': 'Play audio',
    'handleDownloadAudio': 'Download audio',
    'handleManualScore': 'Adjust score',
    'handleExport': 'Export',
    'handleDragEnd': 'Drop item',
}

def get_button_context(lines, btn_start, btn_end_tag):
    """Gather context from the button's opening tag lines"""
    block = ''.join(lines[btn_start:btn_end_tag+1])
    
    # Extract title (simple string only, skip dynamic expressions)
    title_match = re.search(r'title="([^"]+)"', block)
    if title_match:
        return title_match.group(1)
    
    # Extract icons from within the button body (look further ahead)
    icons = re.findall(r'<(\w+)\s+size=', ''.join(lines[btn_start:min(len(lines), btn_start+20)]))
    
    # Extract onClick handler name
    onclick = re.search(r'onClick=\{(\w+)', block)
    handler = onclick.group(1) if onclick else None
    
    # Strategy: icon label enriched by handler
    label = None
    if icons and icons[0] in ICON_LABELS:
        label = ICON_LABELS[icons[0]]
        # Enrich generic labels with handler context
        if handler and label in ('Check', 'Show', 'Generate', 'Close', 'Refresh') and handler in HANDLER_LABELS:
            label = HANDLER_LABELS[handler]
    
    if not label and handler and handler in HANDLER_LABELS:
        label = HANDLER_LABELS[handler]
    
    return label

def find_opening_tag_end(lines, start):
    """Find the line index where the opening <button ...> tag closes.
    Returns the line index containing the closing > of the opening tag.
    IMPORTANT: Must correctly handle JSX expressions with > inside them."""
    depth_curly = 0  # Track {} nesting (JSX expressions)
    depth_paren = 0  # Track () nesting
    in_string_single = False
    in_string_double = False
    in_template = False
    
    for j in range(start, min(len(lines), start + 20)):
        line = lines[j]
        i = 0
        while i < len(line):
            ch = line[i]
            
            # Handle string states
            if ch == "'" and not in_string_double and not in_template:
                in_string_single = not in_string_single
            elif ch == '"' and not in_string_single and not in_template:
                in_string_double = not in_string_double
            elif ch == '`' and not in_string_single and not in_string_double:
                in_template = not in_template
            elif not in_string_single and not in_string_double and not in_template:
                if ch == '{':
                    depth_curly += 1
                elif ch == '}':
                    depth_curly -= 1
                elif ch == '(':
                    depth_paren += 1
                elif ch == ')':
                    depth_paren -= 1
                elif ch == '>' and depth_curly == 0 and depth_paren == 0:
                    # This is the closing > of the opening tag
                    return j
            
            i += 1
    
    return start  # fallback

# Process buttons: collect insertions
insertions = []  # List of (line_index, aria_label_line_content)

i = 0
while i < len(lines):
    line = lines[i]
    
    # Find <button (not <ButtonComponent)
    if re.search(r'<button[\s>]', line) and not re.search(r'<button[A-Z]', line):
        # Find the end of the opening tag
        tag_end = find_opening_tag_end(lines, i)
        
        # Check if already has aria-label anywhere in the opening tag
        has_aria = False
        for j in range(i, tag_end + 1):
            if 'aria-label' in lines[j]:
                has_aria = True
                break
        
        if not has_aria:
            # Determine the label
            label = get_button_context(lines, i, tag_end)
            
            if label:
                # Determine indentation: match the indentation of the <button line + 4 spaces
                leading = len(line) - len(line.lstrip())
                indent = ' ' * (leading + 4)
                suffix = '\r\n' if line.endswith('\r\n') else '\n'
                
                # Check if the button tag is multi-line
                is_multiline = tag_end > i
                
                if is_multiline:
                    # Safe: insert aria-label as new line after <button line
                    new_line = f'{indent}aria-label="{label}"{suffix}'
                    insertions.append((i + 1, new_line))
                # Skip single-line buttons entirely — too risky to modify
        
        i = tag_end + 1
    else:
        i += 1

# Apply insertions in reverse order (so line numbers don't shift)
insertions.sort(key=lambda x: x[0], reverse=True)
for line_idx, content in insertions:
    lines.insert(line_idx, content)

# Save
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"Safely inserted {len(insertions)} aria-label attributes (multi-line buttons only)")
print("DONE")
