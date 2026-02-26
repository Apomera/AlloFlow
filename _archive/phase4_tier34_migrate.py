"""
Phase 4 Tiers 3+4: Combined reducer migration
Groups: Quiz (3), Glossary (14), ConceptSort (19), UIChrome (20), Settings (7)
Same safe pattern: destructured reads + thin setter wrappers
"""
import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()
lines = text.split('\n')

GROUPS = {
    'quiz': {
        'prefix': 'QUIZ',
        'reducer_name': 'quizReducer',
        'state_name': 'quizState',
        'dispatch_name': 'quizDispatch',
        'hooks': [
            {'var': 'isEditingQuiz', 'setter': 'setIsEditingQuiz', 'init': 'false'},
            {'var': 'isFlashcardQuizMode', 'setter': 'setIsFlashcardQuizMode', 'init': 'false'},
            {'var': 'quizSelectedOption', 'setter': 'setQuizSelectedOption', 'init': 'null'},
        ]
    },
    'glossary': {
        'prefix': 'GLOSS',
        'reducer_name': 'glossaryReducer',
        'state_name': 'glossaryState',
        'dispatch_name': 'glossaryDispatch',
        'hooks': [
            {'var': 'glossaryHealthCheck', 'setter': 'setGlossaryHealthCheck', 'init': 'null'},
            {'var': 'isEditingGlossary', 'setter': 'setIsEditingGlossary', 'init': 'false'},
            {'var': 'definitionData', 'setter': 'setDefinitionData', 'init': 'null'},
            {'var': 'personaDefinitionData', 'setter': 'setPersonaDefinitionData', 'init': 'null'},
            {'var': 'isGeneratingTermImage', 'setter': 'setIsGeneratingTermImage', 'init': '{}'},
            {'var': 'glossaryRefinementInputs', 'setter': 'setGlossaryRefinementInputs', 'init': '{}'},
            {'var': 'newGlossaryTerm', 'setter': 'setNewGlossaryTerm', 'init': "''"},
            {'var': 'glossaryImageStyle', 'setter': 'setGlossaryImageStyle', 'init': "''"},
            {'var': 'isAddingTerm', 'setter': 'setIsAddingTerm', 'init': 'false'},
            {'var': 'glossaryImageSize', 'setter': 'setGlossaryImageSize', 'init': '128'},
            {'var': 'glossaryTier2Count', 'setter': 'setGlossaryTier2Count', 'init': '4'},
            {'var': 'glossaryTier3Count', 'setter': 'setGlossaryTier3Count', 'init': '6'},
            {'var': 'glossaryDefinitionLevel', 'setter': 'setGlossaryDefinitionLevel', 'init': "'Same as Source Text'"},
            {'var': 'glossaryFilter', 'setter': 'setGlossaryFilter', 'init': "'all'"},
        ]
    },
    'conceptsort': {
        'prefix': 'CS',
        'reducer_name': 'conceptSortReducer',
        'state_name': 'csState',
        'dispatch_name': 'csDispatch',
        'hooks': [
            {'var': 'isDraggingBank', 'setter': 'setIsDraggingBank', 'init': 'false'},
            {'var': 'dragBankOffset', 'setter': 'setDragBankOffset', 'init': '{ x: 0, y: 0 }'},
            {'var': 'isConceptSortGame', 'setter': 'setIsConceptSortGame', 'init': 'false'},
            {'var': 'isInteractiveFlashcards', 'setter': 'setIsInteractiveFlashcards', 'init': 'false'},
            {'var': 'flashcardIndex', 'setter': 'setFlashcardIndex', 'init': '0'},
            {'var': 'isFlashcardFlipped', 'setter': 'setIsFlashcardFlipped', 'init': 'false'},
            {'var': 'flashcardMode', 'setter': 'setFlashcardMode', 'init': "'standard'"},
            {'var': 'flashcardLang', 'setter': 'setFlashcardLang', 'init': "''"},
            {'var': 'showFlashcardImages', 'setter': 'setShowFlashcardImages', 'init': 'true'},
            {'var': 'flashcardScore', 'setter': 'setFlashcardScore', 'init': '0'},
            {'var': 'flashcardOptions', 'setter': 'setFlashcardOptions', 'init': '[]'},
            {'var': 'flashcardFeedback', 'setter': 'setFlashcardFeedback', 'init': 'null'},
            {'var': 'draggedResourceId', 'setter': 'setDraggedResourceId', 'init': 'null'},
            {'var': 'dragOverResourceId', 'setter': 'setDragOverResourceId', 'init': 'null'},
            {'var': 'isConceptMapReady', 'setter': 'setIsConceptMapReady', 'init': 'false'},
            {'var': 'conceptMapNodes', 'setter': 'setConceptMapNodes', 'init': '[]'},
            {'var': 'conceptMapEdges', 'setter': 'setConceptMapEdges', 'init': '[]'},
            {'var': 'draggedNodeId', 'setter': 'setDraggedNodeId', 'init': 'null'},
            {'var': 'dragOffset', 'setter': 'setDragOffset', 'init': '{ x: 0, y: 0 }'},
        ]
    },
    'uichrome': {
        'prefix': 'UI',
        'reducer_name': 'uiChromeReducer',
        'state_name': 'uiState',
        'dispatch_name': 'uiDispatch',
        'hooks': [
            {'var': 'isTeacherToolbarExpanded', 'setter': 'setIsTeacherToolbarExpanded', 'init': 'false'},
            {'var': 'showStudyTimerModal', 'setter': 'setShowStudyTimerModal', 'init': 'false'},
            {'var': 'showTimerConfetti', 'setter': 'setShowTimerConfetti', 'init': 'false'},
            {'var': 'showSubmitModal', 'setter': 'setShowSubmitModal', 'init': 'false'},
            {'var': 'showExportMenu', 'setter': 'setShowExportMenu', 'init': 'false'},
            {'var': 'showHealthCheckPanel', 'setter': 'setShowHealthCheckPanel', 'init': 'false'},
            {'var': 'isProfileModalOpen', 'setter': 'setIsProfileModalOpen', 'init': 'false'},
            {'var': 'isUnitModalOpen', 'setter': 'setIsUnitModalOpen', 'init': 'false'},
            {'var': 'showFluencyConfetti', 'setter': 'setShowFluencyConfetti', 'init': 'false'},
            {'var': 'selectionMenu', 'setter': 'setSelectionMenu', 'init': 'null'},
            {'var': 'showInfoModal', 'setter': 'setShowInfoModal', 'init': 'false'},
            {'var': 'infoModalTab', 'setter': 'setInfoModalTab', 'init': "'about'"},
            {'var': 'toasts', 'setter': 'setToasts', 'init': '[]'},
            {'var': 'showXPModal', 'setter': 'setShowXPModal', 'init': 'false'},
            {'var': 'showSaveModal', 'setter': 'setShowSaveModal', 'init': 'false'},
            {'var': 'showSessionModal', 'setter': 'setShowSessionModal', 'init': 'false'},
            {'var': 'showGroupModal', 'setter': 'setShowGroupModal', 'init': 'false'},
            {'var': 'isJoinPanelExpanded', 'setter': 'setIsJoinPanelExpanded', 'init': 'false'},
            {'var': 'showHintsModal', 'setter': 'setShowHintsModal', 'init': 'false'},
            {'var': 'isTranslateModalOpen', 'setter': 'setIsTranslateModalOpen', 'init': 'false'},
        ]
    },
    'settings': {
        'prefix': 'SETTINGS',
        'reducer_name': 'settingsReducer',
        'state_name': 'settingsState',
        'dispatch_name': 'settingsDispatch',
        'hooks': [
            {'var': 'isProjectSettingsOpen', 'setter': 'setIsProjectSettingsOpen', 'init': 'false'},
            {'var': 'theme', 'setter': 'setTheme', 'init': "'light'"},
            {'var': 'showTextSettings', 'setter': 'setShowTextSettings', 'init': 'false'},
            {'var': 'showVoiceSettings', 'setter': 'setShowVoiceSettings', 'init': 'false'},
            {'var': 'wordSearchLang', 'setter': 'setWordSearchLang', 'init': "'English'"},
            {'var': 'standardDeckLang', 'setter': 'setStandardDeckLang', 'init': "'English Only'"},
            {'var': 'targetTranslationLang', 'setter': 'setTargetTranslationLang', 'init': "'Spanish'"},
        ]
    },
}

# =========================================================================
# Build all reducer definitions
# =========================================================================
all_reducer_defs = []
for key, group in GROUPS.items():
    init_lines = '\n'.join(f"  {h['var']}: {h['init']}," for h in group['hooks'])
    prefix = group['prefix']
    reducer_def = f"""// === PHASE 4: {key.title()} useReducer ===
const {prefix}_INITIAL_STATE = {{
{init_lines}
}};
function {group['reducer_name']}(state, action) {{
  if (action.type === '{prefix}_SET') {{
    const val = typeof action.value === 'function' ? action.value(state[action.field]) : action.value;
    return {{ ...state, [action.field]: val }};
  }}
  if (action.type === '{prefix}_RESET') return {{ ...{prefix}_INITIAL_STATE }};
  return state;
}}
// === END PHASE 4 {key.title()} ===
"""
    all_reducer_defs.append(reducer_def)

# =========================================================================
# Insert all reducer definitions before existing Phase 4 reducers
# =========================================================================
insert_marker = '// === PHASE 4: Adventure useReducer ==='
insert_idx = None
for i, l in enumerate(lines):
    if insert_marker in l:
        insert_idx = i
        break

if insert_idx is None:
    print("ERROR: Could not find Adventure reducer marker")
    sys.exit(1)

combined_defs = '\n'.join(all_reducer_defs)
lines.insert(insert_idx, combined_defs)
print(f"INSERTED 5 reducer definitions before L{insert_idx+1}")

# =========================================================================
# Replace useState hooks for each group
# =========================================================================
total_replaced = 0
for key, group in GROUPS.items():
    prefix = group['prefix']
    destructure_vars = ', '.join(h['var'] for h in group['hooks'])
    setter_lines = '\n'.join(
        f"  const {h['setter']} = (v) => {group['dispatch_name']}({{ type: '{prefix}_SET', field: '{h['var']}', value: v }});"
        for h in group['hooks']
    )
    
    replacement_block = (
        f"  // === PHASE 4: {key.title()} state consolidated into useReducer ===\n"
        f"  const [{group['state_name']}, {group['dispatch_name']}] = useReducer({group['reducer_name']}, {prefix}_INITIAL_STATE);\n"
        f"  const {{ {destructure_vars} }} = {group['state_name']};\n"
        f"{setter_lines}"
    )
    
    first_replaced = False
    group_replaced = 0
    for h in group['hooks']:
        target = f"const [{h['var']}, {h['setter']}] = useState("
        for i in range(len(lines)):
            if target in lines[i] and '// [PHASE 4 MIGRATED]' not in lines[i]:
                if not first_replaced:
                    lines[i] = replacement_block
                    first_replaced = True
                else:
                    original = lines[i].strip()
                    lines[i] = f"  // [PHASE 4 MIGRATED] {original}"
                group_replaced += 1
                break
    
    print(f"  {key}: {group_replaced}/{len(group['hooks'])} hooks migrated")
    total_replaced += group_replaced

print(f"\nTotal: {total_replaced} hooks migrated across 5 groups")

# =========================================================================
# Save and verify
# =========================================================================
text = '\n'.join(lines)
open_b = text.count('{')
close_b = text.count('}')
print(f"Brace balance: {open_b} open, {close_b} close, delta = {open_b - close_b}")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(text)
print("FILE SAVED")
