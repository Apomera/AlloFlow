"""Find all lines that reference differentiationContext in prompt template literals."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').readlines()
out = []

for i, l in enumerate(lines):
    if '${differentiationContext}' in l:
        # Find the resource type by looking backwards for type clues
        ctx = ''.join(lines[max(0,i-20):i])
        rtype = 'unknown'
        for candidate in ['simplified', 'glossary', 'quiz', 'adventure', 'concept-sort', 
                          'lesson-plan', 'brainstorm', 'faq', 'outline', 'image', 
                          'sentence-frames', 'timeline', 'analysis', 'persona']:
            if candidate in ctx:
                rtype = candidate
                break
        out.append("L%d [%s]: %s" % (i+1, rtype, l.strip()[:120]))

open('scripts/archive/diff_ctx_usage.txt', 'w', encoding='utf-8').write('\n'.join(out))
print("Found %d usages. Written to diff_ctx_usage.txt" % len(out))
