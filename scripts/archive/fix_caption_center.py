"""Add inline textAlign center to caption figcaption."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
c = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
old = 'className="visual-caption" dangerouslySetInnerHTML'
new = 'className="visual-caption" style={{ textAlign: "center" }} dangerouslySetInnerHTML'
if old in c:
    c = c.replace(old, new, 1)
    open('AlloFlowANTI.txt', 'w', encoding='utf-8').write(c)
    print('[OK] Added textAlign center to caption')
else:
    print('[WARN] Caption not found')
