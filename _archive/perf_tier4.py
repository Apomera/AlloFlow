"""
Tier 4 v2: Wrap components with React.memo().
Fixed: find arrow body correctly by starting brace tracking from '=>' position.
"""
import re

INPUT = 'AlloFlowANTI.txt'
REPORT = 'tier4_report.txt'

TARGETS = [
    "BranchItem", "StudentAnalyticsPanel", "WordSoundsModal",
    "SoundMappingView", "LetterTraceView", "LargeFileTranscriptionModal",
    "QuickStartWizard", "WordSoundsGenerator", "WordSoundsReviewPanel",
    "TeacherLiveQuizControls", "StudentEscapeRoomOverlay", "TeacherDashboard",
    "InfoTooltip", "AdventureAmbience", "OrthographyView",
    "StudentQuizOverlay", "GlobalMuteButton", "TeacherGate",
    "StudentSubmitModal", "InteractiveBlueprintCard", "DraftFeedbackInterface",
    "EscapeRoomTeacherControls", "SpeedReaderOverlay", "RoleSelectionModal",
    "ImmersiveToolbar", "CharacterColumn", "ToggleButton",
    "SpeechBubble", "StudentEntryModal", "MissionReportCard",
    "RhymeView", "AdventureShop", "BilingualFieldRenderer",
    "ClozeInput", "ClimaxProgressBar", "LongitudinalProgressChart",
    "StudentWelcomeModal", "SimpleBarChart",
]

def main():
    with open(INPUT, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    report = []
    report.append("=== Tier 4 v2: React.memo Wrapping ===")

    # Step 1: For each target, find its definition line
    # The pattern is: const Name = ({ ... }) => { or => (
    # It may span multiple lines (multi-line destructured props)
    
    # Better approach: search for "const Name = " and then find the => 
    comp_defs = {}  # name -> (first_line, arrow_line, arrow_col, body_char)
    
    for target in TARGETS:
        # Find "const Name = " or "const Name = React.memo("
        pattern = f'const {target} = '
        for i, line in enumerate(lines):
            if pattern in line:
                if 'React.memo' in line:
                    report.append(f"  SKIP {target}: already memo'd at L{i+1}")
                    break
                
                # Found definition. Now find the arrow =>
                # It could be on this line or a subsequent line (multi-line props)
                arrow_found = False
                for j in range(i, min(i + 20, len(lines))):
                    arrow_idx = lines[j].find('=>')
                    if arrow_idx >= 0:
                        # What comes after =>?
                        after_arrow = lines[j][arrow_idx+2:].strip()
                        if after_arrow.startswith('{'):
                            body_char = '{'
                        elif after_arrow.startswith('('):
                            body_char = '('
                        else:
                            # Arrow might be on one line, body on next
                            body_char = None
                            for k in range(j+1, min(j+3, len(lines))):
                                stripped = lines[k].strip()
                                if stripped.startswith('{') or stripped.startswith('('):
                                    body_char = stripped[0]
                                    break
                        
                        comp_defs[target] = (i, j, arrow_idx, body_char)
                        arrow_found = True
                        break
                
                if not arrow_found:
                    report.append(f"  SKIP {target}: no arrow found near L{i+1}")
                break

    report.append(f"\nFound {len(comp_defs)} component definitions")

    # Step 2: For each, find the end of the function body
    # Track from the opening { or ( after =>
    wrap_info = []  # (name, def_start, def_line_text, end_line, closing_char)

    for name, (def_line, arrow_line, arrow_col, body_char) in comp_defs.items():
        if body_char is None:
            report.append(f"  SKIP {name}: unclear body start")
            continue

        close_char = '}' if body_char == '{' else ')'
        
        # Find the opening body char position
        start_search = arrow_line
        body_depth = 0
        body_started = False
        end_line = None

        # Only count the matching bracket type, starting from the arrow
        for j in range(start_search, min(start_search + 50000, len(lines))):
            line_text = lines[j]
            start_col = arrow_col + 2 if j == arrow_line else 0
            
            for col in range(start_col, len(line_text)):
                ch = line_text[col]
                if ch == body_char:
                    body_depth += 1
                    body_started = True
                elif ch == close_char:
                    body_depth -= 1
                    if body_started and body_depth == 0:
                        end_line = j
                        break
            
            if end_line is not None:
                break

        if end_line is None:
            report.append(f"  SKIP {name}: can't find closing {close_char}")
            continue

        size = end_line - def_line + 1
        report.append(f"  {name}: L{def_line+1} to L{end_line+1} ({size} lines, {body_char}...{close_char})")
        wrap_info.append((name, def_line, end_line, body_char))

    report.append(f"\nWill wrap: {len(wrap_info)}")

    # Step 3: Apply wrapping (backwards to preserve line numbers)
    wrap_info.sort(key=lambda x: -x[1])
    
    wrapped = 0
    for name, def_line, end_line, body_char in wrap_info:
        line = lines[def_line]
        
        # Add React.memo( after "const Name = "
        search = f'const {name} = '
        idx = line.find(search)
        if idx < 0:
            report.append(f"  FAIL {name}: can't find definition on L{def_line+1}")
            continue
        
        insert_pos = idx + len(search)
        new_def = line[:insert_pos] + 'React.memo(' + line[insert_pos:]
        lines[def_line] = new_def
        
        # Add closing ) at end_line
        end = lines[end_line]
        stripped = end.rstrip()
        
        # The closing could be:
        # }) => ({ ... }  ends with  }); or };  or )  or };
        # We need to add ) to close React.memo
        
        if body_char == '{':
            # Arrow function with block body: const X = (...) => { ... };
            # end_line has the closing }; — we need };  →  });
            if stripped.endswith('};'):
                lines[end_line] = stripped[:-1] + ');'
            elif stripped.endswith('}'):
                lines[end_line] = stripped + ');'
            else:
                # The } might not be the last thing on the line
                # Find the last } and add ) after it
                last_brace = stripped.rfind('}')
                lines[end_line] = stripped[:last_brace+1] + ')' + stripped[last_brace+1:]
        else:
            # Arrow with implicit return: const X = (...) => ( ... );
            # end_line has closing );  →  ));
            if stripped.endswith(');'):
                lines[end_line] = stripped[:-2] + '));'
            elif stripped.endswith(')'):
                lines[end_line] = stripped + ')'
            else:
                last_paren = stripped.rfind(')')
                lines[end_line] = stripped[:last_paren+1] + ')' + stripped[last_paren+1:]

        wrapped += 1

    # Write
    content = '\n'.join(lines)
    with open(INPUT, 'w', encoding='utf-8') as f:
        f.write(content)

    report.append(f"\nSuccessfully wrapped: {wrapped}")

    # Verify
    with open(INPUT, 'r', encoding='utf-8') as f:
        final = f.read()

    final_lines = final.split('\n')
    memo_count = len(re.findall(r'React\.memo\(', final))
    open_b = final.count('{')
    close_b = final.count('}')
    open_p = final.count('(')
    close_p = final.count(')')

    report.append(f"\nOutput: {len(final):,} bytes, {len(final_lines):,} lines")
    report.append(f"Total React.memo: {memo_count}")
    report.append(f"Braces: {open_b} open, {close_b} close, diff={open_b - close_b}")
    report.append(f"Parens: {open_p} open, {close_p} close, diff={open_p - close_p}")

    # Verify each
    report.append(f"\n=== Verification ===")
    for target in TARGETS:
        found = any(f'const {target} = React.memo(' in line for line in final_lines)
        status = "✓" if found else "✗"
        report.append(f"  {status} {target}")

    report.append(f"\n=== DONE ===")

    with open(REPORT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))

    print(f"Wrapped {wrapped} components. Total React.memo: {memo_count}")
    print(f"See {REPORT}")

if __name__ == '__main__':
    main()
