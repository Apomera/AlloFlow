"""
Wrap major unwrapped components with ErrorBoundary.
Strategy: Find <ComponentName in the render tree and wrap with ErrorBoundary.
Only wrap the top-level render (not internal self-references or definitions).
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

# Components to wrap and their error messages
TARGETS = {
    'QuickStartWizard': 'The setup wizard encountered an error. Please close and try again.',
    'TeacherDashboard': 'The teacher dashboard encountered an error. Please close and reopen.',
    'StudentAnalyticsPanel': 'Student analytics encountered an error. Please close and reopen.',
    'DraftFeedbackInterface': 'Draft feedback encountered an error. Please try again.',
    'StudentEscapeRoomOverlay': 'Student escape room encountered an error. Reconnecting...',
    'TeacherLiveQuizControls': 'Live quiz controls encountered an error. Refreshing...',
    'EscapeRoomTeacherControls': 'Escape room controls encountered an error. Refreshing...',
    'SpeedReaderOverlay': 'Speed reader encountered an error. Please close and reopen.',
    'LargeFileTranscriptionModal': 'File transcription encountered an error. Please try again.',
    'AdventureShop': 'The adventure shop encountered an error.',
    'StudentBingoGame': 'Student Bingo game encountered an error.',
    'TimelineGame': 'Timeline Game encountered an error.',
}

content = ''.join(lines)
insertions = 0

for comp_name, error_msg in TARGETS.items():
    # Find JSX usage: <ComponentName  (not inside the component definition itself)
    # We need to find it in the render tree, not in the const definition
    pattern = re.compile(rf'(\s*)(<{comp_name}\s)')
    
    matches = list(pattern.finditer(content))
    
    for match in matches:
        indent = match.group(1)
        tag_start = match.start()
        
        # Skip if this is inside the component definition (const CompName = React.memo)
        line_start = content.rfind('\n', 0, tag_start)
        line_content = content[line_start:tag_start+100]
        if f'const {comp_name}' in line_content:
            continue
            
        # Skip if already wrapped in ErrorBoundary (check 500 chars before)
        before = content[max(0,tag_start-500):tag_start]
        if '<ErrorBoundary' in before:
            last_open = before.rfind('<ErrorBoundary')
            last_close = before.rfind('</ErrorBoundary>')
            if last_open > last_close:
                print(f"  SKIP {comp_name}: already wrapped")
                continue
        
        # Find the end of this JSX element
        # Look for either /> (self-closing) or </ComponentName>
        after_start = tag_start
        
        # Check if self-closing by finding the next /> or >
        search_area = content[after_start:after_start+5000]
        
        # Find closing: either /> or </ComponentName>
        self_close = re.search(r'/>', search_area)
        full_close = re.search(rf'</{comp_name}>', search_area)
        
        if full_close and (not self_close or full_close.start() > self_close.start()):
            # Has children — use </ComponentName>
            close_pos = after_start + full_close.end()
            close_tag = f'</{comp_name}>'
        elif self_close:
            close_pos = after_start + self_close.end()
            close_tag = '/>'
        else:
            print(f"  SKIP {comp_name}: could not find closing tag")
            continue
        
        # Determine indentation
        newline_before = content.rfind('\n', 0, tag_start)
        existing_indent = content[newline_before+1:tag_start]
        # Only use whitespace as indent
        ws_indent = ''
        for c in existing_indent:
            if c in ' \t':
                ws_indent += c
            else:
                break
        if not ws_indent:
            ws_indent = '                '  # fallback
        
        # Insert ErrorBoundary wrapper 
        # Before the component tag
        eb_open = f'<ErrorBoundary fallbackMessage="{error_msg}">\n{ws_indent}  '
        # After the closing tag
        eb_close = f'\n{ws_indent}</ErrorBoundary>'
        
        content = content[:tag_start] + eb_open + content[tag_start:close_pos] + eb_close + content[close_pos:]
        insertions += 1
        print(f"  WRAPPED: {comp_name}")
        break  # Only wrap the first non-already-wrapped usage

print(f"\nTotal ErrorBoundary wrappers added: {insertions}")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("DONE")
