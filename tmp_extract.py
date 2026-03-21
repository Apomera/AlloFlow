#!/usr/bin/env python3
"""Extract StudentAnalyticsPanel from AlloFlowANTI.txt into student_analytics_module.js"""
import sys, io, shutil
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
OUT  = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\student_analytics_module.js'
BACKUP = FILE + '.pre_analytics.bak'

shutil.copy2(FILE, BACKUP)
print(f"Backup: {BACKUP}")

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

orig_size = len(content)

# ── 1. Find the StudentAnalyticsPanel boundaries ──
start_marker = "const StudentAnalyticsPanel = React.memo(("
start_idx = content.find(start_marker)
if start_idx < 0:
    print("ERROR: StudentAnalyticsPanel not found")
    exit(1)

# Find the line containing the @section comment before it
section_comment = content.rfind("@section STUDENT_ANALYTICS", max(0, start_idx - 200), start_idx)
if section_comment >= 0:
    # Go to start of that line
    line_start = content.rfind('\n', max(0, section_comment - 5), section_comment)
    extract_start = line_start + 1 if line_start >= 0 else section_comment
else:
    extract_start = start_idx

# Find the end of the component
# It ends with ");\n" after the React.memo closing
# The pattern is: }, document.body\n    );\n});\n
end_marker = "document.body\n    );\n});"
# Search from the component start
search_from = start_idx
end_idx = content.find(end_marker, search_from)
if end_idx < 0:
    # Try with \r\n
    end_marker2 = "document.body\r\n    );\r\n});"
    end_idx = content.find(end_marker2, search_from)
    if end_idx >= 0:
        end_idx += len(end_marker2)
    else:
        print("ERROR: Could not find end of StudentAnalyticsPanel")
        # Try a more flexible search
        pos = content.find("document.body", search_from)
        while pos < len(content) and pos >= 0:
            # Check if the next few lines match the closing pattern
            remaining = content[pos:pos+100]
            if 'document.body' in remaining and ');' in remaining:
                # Find the ); closing
                close = content.find(');', pos)
                close = content.find(');', close + 2)  # skip the first );
                end_idx = close + 2
                break
            pos = content.find("document.body", pos + 20)
        if end_idx < 0:
            print("ERROR: Really could not find end")
            exit(1)
else:
    end_idx += len(end_marker)

# Make sure we capture the full closing line
end_line = content.find('\n', end_idx)
if end_line >= 0:
    end_idx = end_line + 1

extracted = content[extract_start:end_idx]
extract_lines = extracted.count('\n')
print(f"Extracted: {extract_lines} lines, {len(extracted)//1024} KB")
print(f"  From line: {content[:extract_start].count(chr(10)) + 1}")
print(f"  To line:   {content[:end_idx].count(chr(10)) + 1}")

# ── 2. Create the module file ──
module_content = f"""// ═══════════════════════════════════════════════════════════════
// student_analytics_module.js — StudentAnalyticsPanel v1.0.0
// Assessment Center / RTI Probes / Research Dashboard
// Extracted from AlloFlowANTI.txt for modular CDN loading
// ═══════════════════════════════════════════════════════════════
(function() {{
  'use strict';
  
  // Ensure React and ReactDOM are available
  var React = window.React;
  var ReactDOM = window.ReactDOM;
  if (!React || !ReactDOM) {{
    console.error('[StudentAnalytics] React/ReactDOM not found on window');
    return;
  }}
  
  // Re-export React hooks for use in the component
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var useCallback = React.useCallback;
  var useMemo = React.useMemo;
  var memo = React.memo;
  
{extracted}

  // Register module
  window.AlloModules = window.AlloModules || {{}};
  window.AlloModules.StudentAnalytics = StudentAnalyticsPanel;
  console.log('[CDN] StudentAnalytics module registered');
}})();
"""

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(module_content)
print(f"Module written: {OUT} ({len(module_content)//1024} KB)")

# ── 3. Replace inline code with module loader ──
# Replace the extracted section with a module-aware stub
replacement = """// @section STUDENT_ANALYTICS — RTI probes and student analytics (MODULARIZED → student_analytics_module.js)
const StudentAnalyticsPanel = (window.AlloModules && window.AlloModules.StudentAnalytics) || React.memo(({ isOpen, onClose, t }) => {
    if (!isOpen) return null;
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="text-4xl mb-3">📊</div>
                <p className="text-lg font-bold text-slate-700">Loading Assessment Center...</p>
                <p className="text-sm text-slate-400 mt-2">Module loading from CDN. If this persists, check your connection.</p>
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all">Close</button>
            </div>
        </div>,
        document.body
    );
});
"""

content = content[:extract_start] + replacement + content[end_idx:]

# ── 4. Add CDN loading ──
if 'StudentAnalytics' not in content.split('loadModule')[0] + content[content.find("loadModule('StemLab'"):content.find("loadModule('StemLab'") + 500]:
    load_marker = "loadModule('StemLab',"
    load_idx = content.find(load_marker)
    if load_idx >= 0:
        line_end = content.find('\n', load_idx)
        insert = "\n    loadModule('StudentAnalytics', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@main/student_analytics_module.js');"
        content = content[:line_end] + insert + content[line_end:]
        print("Added CDN loading for StudentAnalytics")

# ── Safety checks ──
assert 'AlloFlowContent' in content, "ABORT: AlloFlowContent missing"
assert 'StudentAnalyticsPanel' in content, "ABORT: StudentAnalyticsPanel reference missing"
assert len(content) > 100000, f"ABORT: file too small ({len(content)})"

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

new_size = len(content)
removed_lines = extract_lines - replacement.count('\n')
print(f"\nRemoved: ~{removed_lines} lines")
print(f"Size: {orig_size:,} -> {new_size:,} ({new_size - orig_size:,})")
print("SUCCESS")
