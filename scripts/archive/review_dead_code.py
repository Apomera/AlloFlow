"""
Review each deleted item: check if similar functionality exists elsewhere,
or if the deleted function was meant to be wired into a specific feature.

For each item, search for:
1. Related function calls that SHOULD have used the deleted function
2. Whether alternative implementations exist
3. Whether the feature the function supports is still active
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()
    lines = content.split('\n')

out = []

# ===================================================================
# 1. ANALYTICS CALLBACKS — check if their features have alternative tracking
# ===================================================================
out.append("=" * 70)
out.append("1. ANALYTICS CALLBACKS (4 items)")
out.append("=" * 70)

# recordEscapeRoomCompletion — does the escape room have ANY completion tracking?
escape_completion = []
for i, line in enumerate(lines):
    if 'escape' in line.lower() and ('complete' in line.lower() or 'finish' in line.lower() or 'solved' in line.lower()):
        if 'record' in line.lower() or 'track' in line.lower() or 'log' in line.lower() or 'handleScore' in line or 'pointHistory' in line:
            escape_completion.append(f"  L{i+1}: {line.strip()[:100]}")

out.append("\n--- recordEscapeRoomCompletion ---")
out.append(f"Escape room completion tracking references: {len(escape_completion)}")
for line in escape_completion[:5]:
    out.append(line)

# Does escape room use handleScoreUpdate?
escape_score = [f"  L{i+1}: {l.strip()[:100]}" for i, l in enumerate(lines) 
                if 'handleScoreUpdate' in l and ('escape' in l.lower() or 'puzzle' in l.lower())]
out.append(f"handleScoreUpdate calls near escape room: {len(escape_score)}")
for line in escape_score[:5]:
    out.append(line)

# recordFluencyAssessment — does fluency have tracking?
out.append("\n--- recordFluencyAssessment ---")
fluency_track = [f"  L{i+1}: {l.strip()[:100]}" for i, l in enumerate(lines) 
                 if 'fluency' in l.lower() and ('score' in l.lower() or 'record' in l.lower() or 'track' in l.lower() or 'assessment' in l.lower())]
out.append(f"Fluency tracking references: {len(fluency_track)}")
for line in fluency_track[:5]:
    out.append(line)

# recordFlashcardInteraction — does flashcard have tracking? 
out.append("\n--- recordFlashcardInteraction ---")
flash_track = [f"  L{i+1}: {l.strip()[:100]}" for i, l in enumerate(lines) 
               if 'flashcard' in l.lower() and ('score' in l.lower() or 'record' in l.lower() or 'track' in l.lower())]
out.append(f"Flashcard tracking references: {len(flash_track)}")
for line in flash_track[:5]:
    out.append(line)

# trackResourceTime — is resource time tracked elsewhere?
out.append("\n--- trackResourceTime ---")
time_track = [f"  L{i+1}: {l.strip()[:100]}" for i, l in enumerate(lines) 
              if 'resourceTime' in l or ('timeSpent' in l and 'resource' in l.lower())]
out.append(f"Resource time tracking references: {len(time_track)}")
for line in time_track[:5]:
    out.append(line)

# ===================================================================
# 2. PERSONA FUNCTIONS — check if persona feature is active
# ===================================================================
out.append("\n" + "=" * 70)
out.append("2. PERSONA FUNCTIONS (3 items)")
out.append("=" * 70)

# Is persona chat active?
persona_active = [f"  L{i+1}: {l.strip()[:100]}" for i, l in enumerate(lines)
                  if 'personaChat' in l or 'PersonaChat' in l or 'persona_chat' in l]
out.append(f"\nPersona chat references: {len(persona_active)}")
for line in persona_active[:5]:
    out.append(line)

# handlePersonaChatSubmit — does it exist and work?
persona_submit = 'handlePersonaChatSubmit' in content
out.append(f"handlePersonaChatSubmit exists: {persona_submit}")

# Are suggestions surfaced anywhere?
suggestion_ui = [f"  L{i+1}: {l.strip()[:100]}" for i, l in enumerate(lines)
                 if 'suggestion' in l.lower() and 'persona' in l.lower()]
out.append(f"Persona suggestion UI references: {len(suggestion_ui)}")
for line in suggestion_ui[:5]:
    out.append(line)

# Is interview summary surfaced anywhere?
interview_ui = [f"  L{i+1}: {l.strip()[:100]}" for i, l in enumerate(lines)
                if 'interview' in l.lower() and ('summary' in l.lower() or 'report' in l.lower())]
out.append(f"Interview summary UI references: {len(interview_ui)}")
for line in interview_ui[:5]:
    out.append(line)

# handlePersonaWordClick — is there word clicking in persona messages?
word_click_persona = [f"  L{i+1}: {l.strip()[:100]}" for i, l in enumerate(lines)
                      if 'wordClick' in l and 'persona' in l.lower()]
out.append(f"Persona word click UI references: {len(word_click_persona)}")

# ===================================================================
# 3. CONSTANTS — check if they were used by other deleted code
# ===================================================================
out.append("\n" + "=" * 70)
out.append("3. CONSTANTS (8 items)")
out.append("=" * 70)

constants = [
    'PHONEME_PRONUNCIATIONS', 'PHONOLOGICAL_ACTIVITIES', 'ORTHOGRAPHIC_ACTIVITIES',
    'SAFETY_BLACKLIST', 'IPA_GRAPHEME_OPTIONS', 'AUDIO_BANK_PHONEMES',
    'PREFETCH_BUFFER_SIZE', 'MAX_CHUNK_SIZE'
]

for const in constants:
    # Check if there are any comments or TODOs referencing this constant
    refs = [f"  L{i+1}: {l.strip()[:100]}" for i, l in enumerate(lines)
            if const in l]
    out.append(f"\n--- {const} ---")
    out.append(f"  Remaining references after deletion: {len(refs)}")
    for r in refs[:3]:
        out.append(r)

# Special check: SAFETY_BLACKLIST — is there ANY content safety filtering?
out.append("\n--- SAFETY ANALYSIS ---")
safety_refs = [f"  L{i+1}: {l.strip()[:100]}" for i, l in enumerate(lines)
               if 'safety' in l.lower() or 'blacklist' in l.lower() or 'profanity' in l.lower() or 'inappropriate' in l.lower()]
out.append(f"Content safety references: {len(safety_refs)}")
for r in safety_refs[:10]:
    out.append(r)

result = '\n'.join(out)
with open('dead_code_review.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print("Analysis written to dead_code_review.txt")
print(f"Total lines in report: {len(out)}")
