"""
Fix all unsafe generatedContent.data accesses by adding optional chaining.
Replace 'generatedContent.data' with 'generatedContent?.data' where not already safe.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
original_lines = len(content.split('\n'))

# Count unsafe occurrences before fix
unsafe_before = content.count('generatedContent.data') - content.count('generatedContent?.data')
print(f"Unsafe 'generatedContent.data' occurrences: {unsafe_before}")

# Replace all 'generatedContent.data' with 'generatedContent?.data'
# But avoid double-fixing already-safe '?.data'
content = content.replace('generatedContent.data', 'generatedContent?.data')

# Verify
unsafe_after = content.count('generatedContent.data') - content.count('generatedContent?.data')
total_safe = content.count('generatedContent?.data')
print(f"After fix: {total_safe} safe accesses, {unsafe_after} still unsafe")

new_lines = len(content.split('\n'))
print(f"Line count: {original_lines} -> {new_lines} (diff: {new_lines - original_lines:+d})")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\n[OK] Fixed {unsafe_before} unsafe generatedContent.data accesses")
