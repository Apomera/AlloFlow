"""Find the UNKNOWN type dispatchEscape call"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

import re
for i, line in enumerate(lines):
    if 'dispatchEscape' in line and "'UPDATE'" not in line and "'FUNC_UPDATE'" not in line and "'SET_TIME_LEFT'" not in line and "'SET_TIMER_RUNNING'" not in line and "'RESET'" not in line and 'function escapeReducer' not in line and "case '" not in line:
        print(f"L{i+1}: {line.strip()[:240]}")
