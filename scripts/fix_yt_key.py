with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Try both line ending styles
for eol in ['\r\n', '\n']:
    old = f"            const ytApiKey = apiKey;{eol}            if (!ytApiKey) throw new Error(\"No API key available for YouTube transcript extraction.\");{eol}            const ytUrl = `https://generativelanguage.googleapis.com/v1beta/models/${{GEMINI_MODELS.default}}:generateContent?key=${{ytApiKey}}`;"
    new = f"            const ytUrl = `https://generativelanguage.googleapis.com/v1beta/models/${{GEMINI_MODELS.default}}:generateContent?key=${{apiKey}}`;"
    
    if old in content:
        content = content.replace(old, new, 1)
        with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"SUCCESS with {repr(eol)} endings: Removed API key guard")
        break
else:
    # Surgical approach: find ytApiKey lines and remove them
    lines = content.split('\n')
    new_lines = []
    skip_next = False
    removed = 0
    for i, line in enumerate(lines):
        if 'const ytApiKey = apiKey;' in line:
            # Skip this line
            removed += 1
            continue
        if "if (!ytApiKey) throw new Error" in line:
            # Skip this line
            removed += 1
            continue
        if 'ytApiKey' in line:
            # Replace ytApiKey with apiKey
            line = line.replace('ytApiKey', 'apiKey')
            print(f"Replaced ytApiKey at line {i+1}: {line.rstrip()[:100]}")
        new_lines.append(line)
    
    if removed > 0:
        content = '\n'.join(new_lines)
        with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"SUCCESS (surgical): Removed {removed} lines, replaced ytApiKey references")
    else:
        print("ERROR: ytApiKey not found at all!")
