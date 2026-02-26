"""Fix EDIT4: Wire flag summaries — use line-number-based insertion"""
import os
FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the gameScoreHistory line
target_line = None
for i, line in enumerate(lines):
    if 'gameScoreHistory:' in line and i > 39000:
        target_line = i
        break

if target_line is None:
    print("❌ Could not find gameScoreHistory line")
    exit(1)

# The next line should be the closing "          };"
closing_line = target_line + 1
if '};' not in lines[closing_line]:
    print(f"❌ Expected '}}' at line {closing_line+1}, got: {lines[closing_line].strip()}")
    exit(1)

# Add comma to gameScoreHistory line (replace trailing \n with ,\n)
lines[target_line] = lines[target_line].rstrip('\r\n') + ',\r\n'

# Insert flag summary block before the closing };
flag_block = [
    '              // Flag summary (categories + counts only — NO raw content for FERPA)\r\n',
    '              flagSummary: (() => {\r\n',
    '                  try {\r\n',
    '                      const allText = [];\r\n',
    "                      if (typeof socraticChatHistory !== 'undefined' && socraticChatHistory?.messages) {\r\n",
    "                          socraticChatHistory.messages.filter(m => m.role === 'user').forEach(m => allText.push(m.text || m.content || ''));\r\n",
    '                      }\r\n',
    '                      const flags = allText.flatMap(t => SafetyContentChecker.check(t));\r\n',
    '                      const summary = {};\r\n',
    '                      flags.forEach(f => { summary[f.category] = (summary[f.category] || 0) + 1; });\r\n',
    "                      return { total: flags.length, categories: summary, hasCritical: flags.some(f => f.severity === 'critical') };\r\n",
    '                  } catch (e) { return { total: 0, categories: {}, hasCritical: false }; }\r\n',
    '              })()\r\n',
]

lines[closing_line:closing_line] = flag_block

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"✅ EDIT4: Inserted flag summary block after L{target_line+1}")
