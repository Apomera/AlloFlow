"""
Fix build error from broken @keyframes spin injection.
Removes the style tag and replaces the CSS spinner with an emoji spinner.
"""

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)
fixes = []

# FIX 1: Remove the injected style tag
style_tag_crlf = "<style dangerouslySetInnerHTML={{__html: `@keyframes spin { to { transform: rotate(360deg) } }`}} />\r\n                  "
style_tag_lf = "<style dangerouslySetInnerHTML={{__html: `@keyframes spin { to { transform: rotate(360deg) } }`}} />\n                  "

for tag in [style_tag_crlf, style_tag_lf]:
    if tag in content:
        content = content.replace(tag, '')
        fixes.append("Removed broken style tag")
        break
else:
    if '@keyframes spin' in content:
        lines = content.split('\n')
        new_lines = [l for l in lines if '@keyframes spin' not in l]
        removed = len(lines) - len(new_lines)
        if removed > 0:
            content = '\n'.join(new_lines)
            fixes.append("Removed " + str(removed) + " lines with @keyframes spin")
    else:
        fixes.append("No @keyframes spin found (already clean)")

# FIX 2: Remove fragment opening
if 'bridgeSending && (<>' in content:
    content = content.replace('bridgeSending && (<>', 'bridgeSending && (')
    fixes.append("Removed broken fragment opening")
else:
    fixes.append("No broken fragment found")

# FIX 3: Remove stray fragment close
gen_idx = content.find('Generating your Bridge message')
if gen_idx > 0:
    area = content[gen_idx:gen_idx+500]
    if '</>' in area:
        frag_local = area.find('</>')
        abs_pos = gen_idx + frag_local
        # Remove the line containing </>
        line_start = content.rfind('\n', 0, abs_pos)
        line_end = content.find('\n', abs_pos)
        if line_start >= 0 and line_end >= 0:
            line_content = content[line_start+1:line_end].strip()
            if line_content == '</>' or line_content == '</>\r':
                content = content[:line_start] + content[line_end:]
                fixes.append("Removed stray fragment close line")
            else:
                content = content[:abs_pos] + content[abs_pos+3:]
                fixes.append("Removed stray fragment close inline")

# FIX 4: Replace CSS spinner animation with pulse (which already works in the codebase)
if "animation:'spin 0.8s linear infinite'" in content:
    content = content.replace(
        "animation:'spin 0.8s linear infinite'",
        "animation:'pulse 1.5s ease-in-out infinite'"
    )
    fixes.append("Changed spinner from spin to pulse animation")
else:
    fixes.append("Spinner already uses compatible animation")

# Write
with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied " + str(len(fixes)) + " fixes:")
for fix in fixes:
    print("  " + fix)
print("File size: " + str(original_len) + " -> " + str(len(content)) + " (" + str(len(content)-original_len) + ")")

# Verify
print("\nVerification:")
print("  @keyframes spin: " + str('@keyframes spin' in content))
print("  Fragment <>: " + str('&& (<>' in content))
print("  spin anim: " + str("'spin " in content))
