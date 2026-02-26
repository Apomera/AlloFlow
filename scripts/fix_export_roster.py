"""
fix_export_roster.py — Fix the broken handleExport in RosterKeyPanel
Bug: references `importedStudents` which is out of scope
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    lines = content.split('\n')
    
    # Find the handleExport function (should be around L24135)
    export_start = None
    for i, line in enumerate(lines):
        if 'const handleExport = () =>' in line and i > 24000 and i < 25000:
            export_start = i
            break
    
    if export_start is None:
        print("ERROR: handleExport not found")
        return
    
    print(f"Found handleExport at line {export_start + 1}")
    
    # Find the end of the function (matching closing };)
    brace_depth = 0
    export_end = None
    for i in range(export_start, min(export_start + 30, len(lines))):
        brace_depth += lines[i].count('{') - lines[i].count('}')
        if brace_depth == 0 and i > export_start:
            export_end = i
            break
    
    if export_end is None:
        print("ERROR: Could not find end of handleExport")
        return
    
    print(f"Function spans lines {export_start + 1} to {export_end + 1}")
    print("Original function:")
    for i in range(export_start, export_end + 1):
        print(f"  L{i+1}: {lines[i]}")
    
    # Replace with fixed version
    fixed_lines = [
        '  const handleExport = () => {',
        '    const exportData = {',
        '            ...(rosterKey || { groups: {}, students: {} }),',
        '            exportVersion: 2,',
        '            exportDate: new Date().toISOString()',
        '        };',
        "    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });",
        '    const url = URL.createObjectURL(blob);',
        "    const a = document.createElement('a');",
        '    a.href = url;',
        "    a.download = 'roster_key_' + (rosterKey?.className || 'roster').replace(/[^a-zA-Z0-9]/g, '_') + '_' + new Date().toISOString().slice(0,10) + '.json';",
        '    document.body.appendChild(a);',
        '    a.click();',
        '    document.body.removeChild(a);',
        '    URL.revokeObjectURL(url);',
        '  };',
    ]
    
    lines[export_start:export_end + 1] = fixed_lines
    
    content = '\n'.join(lines)
    SRC.write_text(content, encoding='utf-8')
    print(f"\n✅ Fixed handleExport — removed importedStudents reference")
    print(f"New function spans {len(fixed_lines)} lines starting at L{export_start + 1}")

if __name__ == "__main__":
    main()
