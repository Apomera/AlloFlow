"""Extract key findings only"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
lines = open('write_only_audit.txt','r',encoding='utf-8').readlines()

# Print only lines with verdicts and summary items
for l in lines:
    s = l.strip()
    if any(k in s for k in ['SAFE TO REMOVE', 'FULLY DEAD', 'PERF CONCERN', 'Write-only', 'Debug-only', 'Performance']):
        print(s[:100])
    elif s.startswith('- ') and ('writes' in s or 'called' in s or 'read' in s):
        print(s[:100])
