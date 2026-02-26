"""
Comprehensive accessibility fixes - Tasks 2, 3, and 4.

Task 2: Contextualize 35 "Refresh" labels based on onClick handler
Task 3: Add <nav> landmark to sidebar tabs
Task 4: Add aria-expanded to modal/collapsible triggers
"""
import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

count = 0

# ============================================================
# TASK 2: Contextualize "Refresh" labels
# Strategy: Look at the onClick handler to determine context
# ============================================================
print("=" * 50)
print("TASK 2: Contextualizing Refresh labels")
print("=" * 50)

# Map onClick handlers to contextual labels
HANDLER_MAP = {
    'onExport': 'Create storybook',
    'onNewGame': 'Start new adventure',
    'handleGoalSearch': 'Search learning standards',
    'handleWizardAiSearch': 'Search with AI',
    'handleVennResetBoard': 'Reset Venn diagram',
    'handleCheckChallengeRouter': 'Check challenge answer',
    'handleGenerateOutcome': 'Generate scenario outcome',
    'handleExportSlides': 'Export as slides',
    'handleGenerateLessonIdeas': 'Generate lesson extension ideas',
    'handleSaveReflection': 'Submit reflection for grading',
    'handleAiUrlSearch': 'Search by URL',
    'handleGenerateSource': 'Generate source text',
    'handleResumeAdventure': 'Resume saved adventure',
    'handleAutoCorrectSource': 'Auto-correct selected errors',
    'handleApplyGrammarFixes': 'Apply grammar corrections',
    'handleAutoAddVocab': 'Auto-add vocabulary',
    'handleGenerateQuiz': 'Generate quiz',
    'handleGenerateBingo': 'Generate bingo card',
    'handleGenerateCrossword': 'Generate crossword puzzle',
    'handleAutoGenerateTimeline': 'Generate timeline',
    'handleGenerateConceptMap': 'Generate concept map',
    'handleAutoGenerateFlashcards': 'Generate flashcards',
    'handleExtendContent': 'Extend content',
    'handleRegenerateContent': 'Regenerate content',
    'handleFetchAiInsights': 'Fetch AI insights',
    'handleGenerateWritingPrompt': 'Generate writing prompt',
    'handleRunGrammarCheck': 'Run grammar check',
    'handleRunFactCheck': 'Run fact verification',
    'handleStartAdventure': 'Start new adventure',
    'handleGenerate': 'Generate content',
    'handleFindStandards': 'Search for standards',
}

for i, line in enumerate(lines):
    if 'aria-label="Refresh"' not in line:
        continue
    
    # Look at the next 5 lines for onClick handler
    handler = None
    for j in range(i, min(i + 8, len(lines))):
        m = re.search(r'onClick=\{?\(?[^}]*?(\w+Handle\w+|\w+handle\w+|on\w+)', lines[j])
        if not m:
            m = re.search(r'onClick=\{(\w+)\}', lines[j])
        if not m:
            m = re.search(r'onClick=\{\(\)\s*=>\s*\{?\s*(\w+)', lines[j])
        if not m:
            m = re.search(r'onClick=\{(\w+)\}', lines[j])
        if m:
            handler = m.group(1)
            break
    
    if handler:
        # Try direct handler match
        new_label = None
        for key, label in HANDLER_MAP.items():
            if key.lower() in handler.lower():
                new_label = label
                break
        
        if not new_label:
            # Derive from handler name: handleGenerateX -> "Generate X"
            readable = handler.replace('handle', '').replace('Handle', '')
            # CamelCase to words
            readable = re.sub(r'(?<!^)(?=[A-Z])', ' ', readable).strip().lower()
            if readable:
                new_label = readable.capitalize()
            else:
                new_label = "Refresh content"
        
        lines[i] = lines[i].replace('aria-label="Refresh"', f'aria-label="{new_label}"')
        count += 1
        print(f"  L{i+1}: Refresh -> '{new_label}' (handler: {handler})")
    else:
        # No handler found in nearby lines, look at data-help-key
        for j in range(i, min(i + 5, len(lines))):
            m = re.search(r'data-help-key="(\w+)"', lines[j])
            if m:
                key = m.group(1)
                readable = key.replace('_', ' ').replace('btn', '').strip().capitalize()
                lines[i] = lines[i].replace('aria-label="Refresh"', f'aria-label="{readable}"')
                count += 1
                print(f"  L{i+1}: Refresh -> '{readable}' (help-key: {key})")
                handler = True
                break
        
        if not handler:
            print(f"  L{i+1}: WARNING - no handler found, keeping 'Refresh'")

print(f"\n  Contextualized {count} Refresh labels")

# Also fix remaining "Close" labels
close_count = 0
for i, line in enumerate(lines):
    if 'aria-label="Close"' not in line:
        continue
    
    # Look at surrounding context for what's being closed
    context = ''
    for j in range(max(0, i - 20), i):
        l = lines[j]
        # Look for headings, titles, or modal identifiers
        m = re.search(r"<h[1-6][^>]*>([^<]{3,40})<", l)
        if m:
            context = m.group(1).strip()
        m = re.search(r"aria-label=\{?t\(['\"]([^'\"]+)['\"]\)", l)
        if m:
            context = m.group(1).split('.')[-1].replace('_', ' ').capitalize()
        m = re.search(r'title=\{?["\']([^"\']+)["\']', l)
        if m and len(m.group(1)) < 40:
            context = m.group(1)
    
    if context:
        new_label = f"Close {context}"
        lines[i] = lines[i].replace('aria-label="Close"', f'aria-label="{new_label}"')
        close_count += 1
        print(f"  L{i+1}: Close -> '{new_label}'")

print(f"\n  Contextualized {close_count} Close labels")

# ============================================================
# TASK 3: Add <nav> landmark to sidebar tabs
# ============================================================
print("\n" + "=" * 50)
print("TASK 3: Adding <nav> landmark")
print("=" * 50)

nav_count = 0

# Find the sidebar tab bar - it's a <div> containing tab buttons for Create/Review
for i, line in enumerate(lines):
    if 'activeSidebarTab' in line and 'bg-slate-200' in line and '<div' in line:
        if '<nav' not in line:
            lines[i] = line.replace('<div', '<nav aria-label="Content tabs"', 1)
            # Find the matching </div> for this tab bar
            # It should be within 10-15 lines
            depth = 1
            for j in range(i + 1, min(i + 20, len(lines))):
                depth += lines[j].count('<div') - lines[j].count('</div>')
                if depth <= 0:
                    lines[j] = lines[j].replace('</div>', '</nav>', 1)
                    nav_count += 1
                    print(f"  Wrapped sidebar tab bar (L{i+1} to L{j+1}) in <nav>")
                    break
            break

# Also check for the main sidebar tab section 
if nav_count == 0:
    for i, line in enumerate(lines):
        s = line.strip()
        if s.startswith('<div className="bg-slate-200 p-1 rounded-lg flex mb-4'):
            # Check if next lines have sidebar tab buttons
            has_tabs = False
            for j in range(i + 1, min(i + 10, len(lines))):
                if 'activeSidebarTab' in lines[j] or 'handleSetActiveSidebarTab' in lines[j]:
                    has_tabs = True
                    break
            if has_tabs:
                lines[i] = line.replace('<div', '<nav aria-label="Content tabs"', 1)
                depth = 1
                for j in range(i + 1, min(i + 20, len(lines))):
                    depth += lines[j].count('<div') - lines[j].count('</div>')
                    if depth <= 0:
                        lines[j] = lines[j].replace('</div>', '</nav>', 1)
                        nav_count += 1
                        print(f"  Wrapped tab bar (L{i+1} to L{j+1}) in <nav>")
                        break
                break

print(f"  Added {nav_count} <nav> landmark(s)")

# ============================================================
# TASK 4: Add aria-expanded to modal/collapsible triggers
# ============================================================
print("\n" + "=" * 50)
print("TASK 4: Adding aria-expanded")
print("=" * 50)

expanded_count = 0

# Pattern 1: Expandable tool sections in sidebar
# These use expandedTools.includes('toolname') pattern
# The trigger buttons toggle expansion and should have aria-expanded
for i, line in enumerate(lines):
    # Find buttons that toggle expandedTools
    if 'onClick' in line and 'toggleTool' in line and 'aria-expanded' not in line:
        # Extract the tool name from toggleTool('toolname')
        m = re.search(r"toggleTool\(['\"](\w+)['\"]\)", line)
        if m:
            tool = m.group(1)
            # Add aria-expanded with the state
            expanded_attr = f'aria-expanded={{expandedTools.includes(\'{tool}\')}}'
            # Insert before onClick
            lines[i] = line.replace('onClick', f'{expanded_attr} onClick', 1)
            expanded_count += 1
            print(f"  L{i+1}: Added aria-expanded for tool '{tool}'")

# Pattern 2: Modal triggers using setShowX or setIsX
# These buttons open/close modals and need aria-expanded={showX}
MODAL_PATTERNS = [
    # (onClick pattern, state variable for aria-expanded)
    ('setShowExportMenu', 'showExportMenu'),
    ('setShowHints', 'showHints'),
    ('setShowTranslateModal', 'showTranslateModal'),
    ('setShowClassAnalytics', 'showClassAnalytics'),
    ('setIsSettingsOpen', 'isSettingsOpen'),
    ('setShowStudentDashboard', 'showStudentDashboard'),
    ('setShowAuditLog', 'showAuditLog'),
    ('setIsPersonaReflectionOpen', 'isPersonaReflectionOpen'),
]

for i, line in enumerate(lines):
    for setter, state_var in MODAL_PATTERNS:
        if setter in line and 'aria-expanded' not in line and '<button' in line:
            expanded_attr = f'aria-expanded={{{state_var}}}'
            lines[i] = line.replace('<button', f'<button {expanded_attr}', 1)
            expanded_count += 1
            print(f"  L{i+1}: Added aria-expanded={{{state_var}}}")
            break

# Pattern 3: Collapsible sections using show/hide boolean state
# Find buttons that toggle show state and render different icons (ChevronUp/ChevronDown)
for i, line in enumerate(lines):
    if ('ChevronUp' in line or 'ChevronDown' in line) and 'aria-expanded' not in line:
        # Look backwards for the opening <button tag  
        for j in range(i, max(0, i - 5), -1):
            if '<button' in lines[j] and 'aria-expanded' not in lines[j]:
                # Find what state controls this
                # Check for expandedTools.includes pattern
                for k in range(j, min(j + 15, len(lines))):
                    m = re.search(r"expandedTools\.includes\(['\"](\w+)['\"]\)", lines[k])
                    if m:
                        tool = m.group(1)
                        if f"expandedTools.includes('{tool}')" not in lines[j]:
                            expanded_attr = f"aria-expanded={{expandedTools.includes('{tool}')}}"
                            lines[j] = lines[j].replace('<button', f'<button {expanded_attr}', 1)
                            expanded_count += 1
                            print(f"  L{j+1}: Added aria-expanded for expandable '{tool}'")
                        break
                break

print(f"  Added {expanded_count} aria-expanded attributes")

# ============================================================
# Write results
# ============================================================
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

total = count + close_count + nav_count + expanded_count
print(f"\n{'=' * 50}")
print(f"TOTAL FIXES: {total}")
print(f"  Refresh labels: {count}")
print(f"  Close labels: {close_count}")
print(f"  Nav landmarks: {nav_count}")
print(f"  aria-expanded: {expanded_count}")
print(f"{'=' * 50}")
