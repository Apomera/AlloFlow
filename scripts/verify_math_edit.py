#!/usr/bin/env python3
"""Verify all math editing components are present."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
c = open('AlloFlowANTI.txt', 'r', encoding='utf-8', errors='replace').read()
checks = [
    ('state: mathEditingProblem', 'mathEditingProblem'),
    ('handler: handleMathProblemEdit', 'handleMathProblemEdit'),
    ('handler: toggleMathEdit', 'toggleMathEdit'),
    ('handler: isMathEditing', 'isMathEditing'),
    ('UI: question textarea', 'Enter problem question'),
    ('UI: answer input', 'Enter answer'),
    ('UI: step_explanation', 'step_explanation'),
    ('UI: step_latex', 'step_latex'),
    ('UI: realWorld textarea', 'Real-world connection'),
    ('UI: edit button', 'Edit problem'),
    ('UI: amber edit border', 'border-amber-300 ring-2'),
    ('UI: edited badge', '_verification.edited'),
]
all_ok = True
for name, pattern in checks:
    found = pattern in c
    status = 'OK' if found else 'MISS'
    if not found:
        all_ok = False
    print(f'  [{status}] {name}')
result = 'ALL CHECKS PASS' if all_ok else 'SOME CHECKS FAILED'
print(f'Result: {result}')
