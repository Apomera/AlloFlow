#!/usr/bin/env python3
"""Patch AlloFlowANTI.txt to add PDF batch remediation pipeline.
Uses file-based patch content to avoid triple-quote conflicts."""

import sys
import os

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# ═══════════════════════════════════════════════
# PATCH 1: Add batch state variables
# ═══════════════════════════════════════════════

OLD1 = '  const pdfPreviewRef = useRef(null);\n  // \u2500\u2500 Custom Export Style \u2500\u2500'
NEW1 = ('  const pdfPreviewRef = useRef(null);\n'
        '  // \u2500\u2500 PDF Batch Mode \u2500\u2500\n'
        '  const [pdfBatchMode, setPdfBatchMode] = useState(false);\n'
        '  const [pdfBatchQueue, setPdfBatchQueue] = useState([]);\n'
        '  const [pdfBatchProcessing, setPdfBatchProcessing] = useState(false);\n'
        '  const [pdfBatchCurrentIndex, setPdfBatchCurrentIndex] = useState(-1);\n'
        '  const [pdfBatchStep, setPdfBatchStep] = useState(\'\');\n'
        '  const [pdfBatchSummary, setPdfBatchSummary] = useState(null);\n'
        '  // \u2500\u2500 Custom Export Style \u2500\u2500')

# Try both LF and CRLF
for le_name, le in [('LF', '\n'), ('CRLF', '\r\n')]:
    old = OLD1.replace('\n', le)
    if content.count(old) == 1:
        content = content.replace(old, NEW1.replace('\n', le))
        changes += 1
        print(f'1. Batch state variables added ({le_name})')
        break
else:
    print(f'1. SKIP')

# ═══════════════════════════════════════════════
# PATCH 2: Add batch functions before proceedWithPdfTransform
# Read patch content from file
# ═══════════════════════════════════════════════

with open('_batch_functions.js', 'r', encoding='utf-8') as f:
    batch_js = f.read()

OLD2 = '  const proceedWithPdfTransform = async () => {'
for le_name, le in [('LF', '\n'), ('CRLF', '\r\n')]:
    old = OLD2.replace('\n', le)
    if content.count(old) == 1:
        # Normalize the batch_js line endings to match the file
        normalized_batch = batch_js.replace('\r\n', '\n').replace('\n', le)
        content = content.replace(old, normalized_batch + le + old)
        changes += 1
        print(f'2. Batch processing functions added ({le_name})')
        break
else:
    print(f'2. SKIP: target not found')

# ═══════════════════════════════════════════════
# PATCH 3: Add batch mode toggle to choice modal
# Read patch content from file
# ═══════════════════════════════════════════════

with open('_batch_ui.js', 'r', encoding='utf-8') as f:
    batch_ui = f.read()

OLD3_LINES = [
    '              <div className="p-8 text-center">',
    '                <div className="text-5xl mb-4">\U0001f4c4</div>',
    '                <h3 className="text-lg font-black text-slate-800 mb-2">PDF Uploaded: {pdfAuditResult.fileName}</h3>',
    '                <p className="text-sm text-slate-500 mb-1">{(pdfAuditResult.fileSize / (1024*1024)).toFixed(1)} MB</p>',
    '                <p className="text-sm text-slate-500 mb-4">Choose how to process this PDF:</p>',
]

for le_name, le in [('LF', '\n'), ('CRLF', '\r\n')]:
    old3 = le.join(OLD3_LINES)
    if content.count(old3) == 1:
        normalized_ui = batch_ui.replace('\r\n', '\n').replace('\n', le)
        content = content.replace(old3, normalized_ui)
        changes += 1
        print(f'3. Batch mode UI added ({le_name})')
        break
else:
    print(f'3. SKIP')

# ═══════════════════════════════════════════════
# PATCH 4: Close the ternary after single-file section
# ═══════════════════════════════════════════════

OLD4 = '                <p className="text-[10px] text-slate-400 text-center mt-2">"Audit & Remediate" analyzes accessibility, fixes issues, and verifies with axe-core. "Text Extraction" extracts raw text for content generation.</p>'

for le_name, le in [('LF', '\n'), ('CRLF', '\r\n')]:
    old4 = OLD4.replace('\n', le)
    if content.count(old4) == 1:
        new4 = old4 + le + '                  </>' + le + '                )}'
        content = content.replace(old4, new4)
        changes += 1
        print(f'4. Closed ternary ({le_name})')
        break
else:
    print(f'4. SKIP')

# ═══════════════════════════════════════════════
# Write result
# ═══════════════════════════════════════════════

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nTotal changes applied: {changes}/4')
if changes < 4:
    print('WARNING: Some patches did not apply.')
    sys.exit(1)
else:
    print('SUCCESS: All patches applied.')
    # Clean up temp files
    for f in ['_batch_functions.js', '_batch_ui.js']:
        if os.path.exists(f):
            os.remove(f)
    print('Temp files cleaned up.')
