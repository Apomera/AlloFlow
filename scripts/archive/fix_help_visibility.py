"""
Improve floating ? button discoverability.

Changes:
1. Add help-breathe keyframe near existing help-glow-pulse (L18565)
2. Update floating ? inactive styling (L68391)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = 0

# 1. Add help-breathe keyframe after help-glow-pulse
# Find the closing brace of help-glow-pulse
old_keyframe_end = """        @keyframes help-glow-pulse {
            0%, 100% { 
                box-shadow: 0 0 8px 2px rgba(59, 130, 246, 0.6),
                            0 0 15px 4px rgba(59, 130, 246, 0.3);
            }
            50% { 
                box-shadow: 0 0 15px 4px rgba(59, 130, 246, 0.9),
                            0 0 25px 8px rgba(59, 130, 246, 0.5),
                            inset 0 0 10px rgba(59, 130, 246, 0.2);
            }
        }"""

new_keyframe = old_keyframe_end + """
        @keyframes help-breathe {
            0%, 100% { 
                box-shadow: 0 0 4px 1px rgba(99, 102, 241, 0.15);
                transform: translateY(-50%) scale(1);
            }
            50% { 
                box-shadow: 0 0 8px 3px rgba(99, 102, 241, 0.25);
                transform: translateY(-50%) scale(1.05);
            }
        }"""

for nl in ['\r\n', '\n']:
    test = old_keyframe_end.replace('\n', nl)
    repl = new_keyframe.replace('\n', nl)
    if test in content:
        content = content.replace(test, repl)
        changes += 1
        print("Fix 1: Added help-breathe keyframe")
        break
else:
    print("WARN: Could not find help-glow-pulse keyframe end")

# 2. Update floating ? inactive styling
old_style = "'bg-white/60 border-slate-300/50 text-slate-400 hover:bg-white hover:border-indigo-400 hover:text-indigo-600 hover:scale-110 hover:shadow-xl backdrop-blur-sm'"
new_style = "'bg-white/90 border-indigo-300/60 text-indigo-400 hover:bg-white hover:border-indigo-400 hover:text-indigo-600 hover:scale-110 hover:shadow-xl backdrop-blur-sm animate-[help-breathe_3s_ease-in-out_infinite]'"

if old_style in content:
    content = content.replace(old_style, new_style)
    changes += 1
    print("Fix 2: Updated floating ? inactive styling")
else:
    print("WARN: Could not find floating ? inactive styling")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

# Fix double CRs
with open(FILE, 'rb') as f:
    raw = f.read()
dbl = raw.count(b'\r\r\n')
if dbl > 0:
    raw = raw.replace(b'\r\r\n', b'\r\n')
    with open(FILE, 'wb') as f:
        f.write(raw)
    print("Fixed %d double CRs" % dbl)

print("\nTotal changes: %d" % changes)
print("DONE")
