"""
Guard unhandled await calls — Phase 1: High-risk callGemini callers
and audio chain functions.

Strategy: For each identified async function that contains unguarded
await calls, find its body opening brace and wrap the body content
in try { ... } catch(e) { warnLog("Unhandled error:", e); }

This is safer than wrapping individual await lines because it
preserves the existing flow control within each function.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

changes = 0

# ===================================================================
# Strategy: For each target function, find its body and check if it
# already has a try/catch. If not, wrap the body.
# We need to find: the opening { of the function body, and the closing }
# ===================================================================

def find_function_body(lines, func_start_line):
    """Find the opening { and body indentation of an async function."""
    # func_start_line is 0-indexed
    # Find the opening {
    brace_line = None
    for j in range(func_start_line, min(func_start_line + 5, len(lines))):
        if '{' in lines[j]:
            brace_line = j
            break
    
    if brace_line is None:
        return None, None, None
    
    # Find the first non-empty line after the opening brace to determine body indentation
    body_indent = None
    first_body_line = None
    for j in range(brace_line + 1, min(brace_line + 10, len(lines))):
        stripped = lines[j].strip()
        if stripped and not stripped.startswith('//'):
            body_indent = len(lines[j]) - len(lines[j].lstrip())
            first_body_line = j
            break
    
    return brace_line, first_body_line, body_indent


def has_try_catch_at_level(lines, start, indent_level):
    """Check if the function body has a try/catch at the expected indentation."""
    for j in range(start, min(start + 300, len(lines))):
        stripped = lines[j].strip()
        line_indent = len(lines[j]) - len(lines[j].lstrip())
        
        # Stop when we reach something at or above the function's indentation
        if line_indent < indent_level and stripped and not stripped.startswith('//') and not stripped.startswith('*'):
            break
        
        if stripped.startswith('try {') or stripped.startswith('try{') or stripped == 'try':
            if line_indent == indent_level:
                return True
    
    return False


# Target functions to wrap (0-indexed start lines)
# High-risk: callGemini callers
high_risk_funcs = [
    (30284, 'handleWizardStandardLookup'),
    (36255, 'handleGenerateMath'),
    # (39837, 'handleReviseSelection'), — already has try/catch, audit found it inside
    (43632, 'generateHelpfulHint'),
    (46315, 'generateStandardChatResponse'),
    (47228, 'handleGeneratePersonas'),
    (48025, 'handlePersonaChatSubmit'),
    (48583, 'autoConfigureSettings'),
    (50373, 'checkedQuestions'),
    (51135, 'anon_L51135'),
    (53417, 'handleMasteryGrading'),
    (53652, 'handleComplexityAdjustment'),
]

# Audio chain functions 
audio_funcs = [
    (4013, 'anon_playAllOptions'),
    (6527, 'timer'),
    (6850, 'runInstructionSequence'),
    (8778, 'anon_phonemePlay'),
    (8821, 'anon_blendingPlay'),
]

# Medium-risk: selected high-value functions
medium_funcs = [
    (16674, 'callApi'),
    (26212, 'handlePauseToggle'),
    (26216, 'handleEndGame'),
    (26457, 'handleRevealResults'),
    (26536, 'handleNextQuestion'),
    (26547, 'handlePrevQuestion'),
    (33975, 'handleInitializeMap'),
    (37521, 'toggleFluencyRecording'),
    (38347, 'fetchGoogleCloudTTS'),
    (40696, 'handleDownloadAudio'),
    (43897, 'generateAdventureImage'),
    (45128, 'handleAdventureTextSubmit'),
    (45432, 'handleAdventureChoice'),
    (47791, 'handleSelectPersona'),
    (49688, 'generateImageWithRetry'),
]

all_targets = high_risk_funcs + audio_funcs + medium_funcs

# Sort by line number descending so insertions don't shift later line numbers
all_targets.sort(key=lambda x: x[0], reverse=True)

wrapped_count = 0
skipped_count = 0

for func_line_1indexed, func_name in all_targets:
    func_line = func_line_1indexed - 1  # Convert to 0-indexed
    
    if func_line >= len(lines):
        print(f"  SKIP {func_name} L{func_line_1indexed}: line out of range")
        skipped_count += 1
        continue
    
    brace_line, first_body_line, body_indent = find_function_body(lines, func_line)
    
    if brace_line is None or first_body_line is None:
        print(f"  SKIP {func_name} L{func_line_1indexed}: couldn't find function body")
        skipped_count += 1
        continue
    
    # Check if already has try/catch at body level
    if has_try_catch_at_level(lines, first_body_line, body_indent):
        print(f"  SKIP {func_name} L{func_line_1indexed}: already has try/catch")
        skipped_count += 1
        continue
    
    # This function needs wrapping! 
    # Insert `try {` at first_body_line (before existing content)
    # We need to find the closing brace of the function to insert `catch`
    
    # Find the closing brace by counting braces
    brace_depth = 0
    func_close_line = None
    for j in range(brace_line, len(lines)):
        for ch in lines[j]:
            if ch == '{':
                brace_depth += 1
            elif ch == '}':
                brace_depth -= 1
                if brace_depth == 0:
                    func_close_line = j
                    break
        if func_close_line is not None:
            break
    
    if func_close_line is None:
        print(f"  SKIP {func_name} L{func_line_1indexed}: couldn't find closing brace")
        skipped_count += 1
        continue
    
    # Build the indentation strings
    indent = ' ' * body_indent
    
    # Insert try { at the beginning of the body
    try_line = f"{indent}try {{\n"
    
    # Insert catch after the last line of the body (before the closing brace)
    catch_block = f"{indent}}} catch (e) {{ warnLog(\"Unhandled error in {func_name}:\", e); }}\n"
    
    # Re-indent all body lines by adding 4 spaces
    for j in range(first_body_line, func_close_line):
        if lines[j].strip():  # Don't indent empty lines
            lines[j] = '    ' + lines[j]
    
    # Insert try line before the body
    lines.insert(first_body_line, try_line)
    # Adjust func_close_line since we inserted a line
    func_close_line += 1
    
    # Insert catch before the closing brace
    lines.insert(func_close_line, catch_block)
    
    wrapped_count += 1
    print(f"  WRAPPED {func_name} L{func_line_1indexed} (body L{first_body_line+1}-L{func_close_line})")

# Write result
content = ''.join(lines)
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nWrapped: {wrapped_count}")
print(f"Skipped: {skipped_count}")
print(f"DONE")
