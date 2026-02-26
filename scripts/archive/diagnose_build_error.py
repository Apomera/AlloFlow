"""Scan for any stray backticks that might cause esbuild errors"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Check for lines ending with )` which is suspicious
# (a template literal right after a closing paren with no operator)
issues = []
for i, line in enumerate(lines, 1):
    stripped = line.rstrip()
    # Pattern: closing paren followed by backtick with nothing useful after
    if stripped.endswith(')`') or stripped.endswith(')`\r'):
        real = stripped.rstrip('\r')
        if real.endswith(')`') and not real.endswith("')`") and not real.endswith('")`'):
            issues.append((i, stripped[:200]))

print(f"Found {len(issues)} lines ending with ')` pattern:")
for ln, text in issues[:20]:
    print(f"  L{ln}: {text}")

# Also check for general backtick balance issues in critical zones
print(f"\nNo more issues found." if not issues else "")
