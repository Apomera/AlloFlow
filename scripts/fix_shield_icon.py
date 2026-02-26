"""Fix: Replace Shield with ShieldCheck in safety toggle button"""
import os
FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

target = """                                    <Shield size={16} /> {safetyFlaggingVisible ? '🛡️ Safety On' : '🛡️ Off'}"""
replacement = """                                    <ShieldCheck size={16} /> {safetyFlaggingVisible ? '🛡️ Safety On' : '🛡️ Off'}"""

if target in content:
    content = content.replace(target, replacement, 1)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ Fixed: Shield → ShieldCheck (already imported)")
else:
    print("❌ Could not find target")
