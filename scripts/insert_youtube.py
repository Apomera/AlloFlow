with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Check if isGoogleRedirect definition exists
has_definition = False
for i, line in enumerate(lines):
    if 'const isGoogleRedirect' in line:
        has_definition = True
        print(f"isGoogleRedirect definition found at L{i+1}: {line.rstrip()[:100]}")
        break

if not has_definition:
    print("isGoogleRedirect definition is MISSING. Inserting before isYouTubeUrl...")
    # Find isYouTubeUrl line
    for i, line in enumerate(lines):
        if 'const isYouTubeUrl' in line:
            print(f"Found isYouTubeUrl at L{i+1}")
            # Insert isGoogleRedirect before it
            new_lines = [
                "const isGoogleRedirect = (url) => {\r\n",
                "    if (!url) return false;\r\n", 
                "    return url.includes('google.com/url') || url.includes('google.com/search');\r\n",
                "};\r\n",
            ]
            for j, nl in enumerate(new_lines):
                lines.insert(i + j, nl)
            
            with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
                f.writelines(lines)
            print("SUCCESS: isGoogleRedirect restored!")
            
            # Verify
            for k in range(i, i + 10):
                print(f"L{k+1}: {lines[k].rstrip()[:100]}")
            break
else:
    print("isGoogleRedirect already exists. No action needed.")
