"""Search for activity-related code in AlloFlowANTI.txt"""
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = []
targets = [
    "case 'counting'",
    "counting_prompt",
    "PhonologyView",
    "isolationState",
    "generateIsolationOptions",
    "generateDistractors",
    "isoOptions",
    "ErrorBoundary",
    "glossaryView",
    "setCurrentView",
    "handleRestart",
    "onRestart",
    "blending_prompt",
    "blending_instruction",
    "Blend these sounds",
]
for t in targets:
    matches = [(i+1, l.strip()[:130]) for i, l in enumerate(lines) if t in l]
    out.append(f'\n--- {t} ({len(matches)} matches) ---')
    for ln, content in matches[:20]:
        out.append(f'  L{ln}: {content}')

with open('_search3.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('Done - wrote _search3.txt')
