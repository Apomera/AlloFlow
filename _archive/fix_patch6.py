"""Apply PATCH 6: Clear processing flag on completion"""
with open('AlloFlowANTI.txt', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

target = '             onStartGame(processed, sequence, lessonPlanConfig, configSummary);\n             setIsProcessing(false);\n        };'

replacement = '             onStartGame(processed, sequence, lessonPlanConfig, configSummary);\n             setIsProcessing(false);\n             if (setIsWordSoundsProcessing) setIsWordSoundsProcessing(false); // Signal parent: processing complete\n        };'

if 'setIsWordSoundsProcessing) setIsWordSoundsProcessing(false)' in content:
    print('Already present!')
else:
    if target in content:
        content = content.replace(target, replacement, 1)
        with open('AlloFlowANTI.txt', 'w', encoding='utf-8', newline='') as f:
            f.write(content)
        print('PATCH 6 applied!')
    else:
        print('ERROR: Target not found!')

# Verify all patches
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    v = f.read()

checks = [
    ('isWordSoundsProcessing state', 'const [isWordSoundsProcessing, setIsWordSoundsProcessing] = useState(false)' in v),
    ('handleRestoreView guard', 'Word Sounds is still loading words' in v),
    ('Prop passed to WSGenerator', 'setIsWordSoundsProcessing={setIsWordSoundsProcessing}' in v),
    ('Flag set in handleStart', 'setIsWordSoundsProcessing) setIsWordSoundsProcessing(true)' in v),
    ('Flag cleared on completion', 'setIsWordSoundsProcessing) setIsWordSoundsProcessing(false)' in v),
]

all_pass = True
for label, ok in checks:
    status = 'PASS' if ok else 'FAIL'
    print(f'  {status}: {label}')
    if not ok:
        all_pass = False

if all_pass:
    print('\nALL CHECKS PASSED')
else:
    print('\nSOME CHECKS FAILED')
