"""Feature map audit for AlloFlow"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')
lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').readlines()

# Content types
content_types = set()
for line in lines:
    for m in re.finditer(r"""type:\s*['"](\w+)['"]""", line):
        content_types.add(m.group(1))
    for m in re.finditer(r"""type\s*===?\s*['"](\w+)['"]""", line):
        content_types.add(m.group(1))
print('Content types:', sorted(content_types))

# Word Sounds activities
activities = set()
for line in lines:
    for m in re.finditer(r"""wordSoundsActivity\s*===?\s*['"](\w+)['"]""", line):
        activities.add(m.group(1))
print('Word Sounds activities:', sorted(activities))

# Active views/tools
tools = set()
for line in lines:
    for m in re.finditer(r"""activeView\s*===?\s*['"][\w-]+['"]""", line):
        view = re.search(r"""['"](.+?)['"]""", m.group(0))
        if view:
            tools.add(view.group(1))
print('Active views:', sorted(tools))

# Teacher-specific functionality
teacher_funcs = set()
for i, line in enumerate(lines):
    if 'isTeacherMode' in line and ('const' in line or 'function' in line or '=>' in line):
        teacher_funcs.add(f'L{i+1}: {line.strip()[:100]}')
print(f'\nTeacher-mode gated functions: {len(teacher_funcs)}')
for f in sorted(teacher_funcs)[:15]:
    print(f'  {f}')
