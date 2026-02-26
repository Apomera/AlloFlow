"""
Fix art style + custom instructions for multi-panel visual generation.
1. Add artStyle + customInstructions params to generateVisualPlan
2. Inject these into the AI prompt and each panel's imagenPrompt 
3. Pass them from the call sites (L52795, L52800)
4. Also inject style in executeVisualPlan when calling callImagen
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
lines = content.split('\n')
original_count = len(lines)
fixed = 0

# ============================================================
# FIX 1: Update generateVisualPlan signature and prompt
# Add artStyle, customInstructions params and inject into prompt
# ============================================================
for i in range(len(lines)):
    if 'const generateVisualPlan = async (concept, gradeLevel, studentLanguage)' in lines[i]:
        print(f"  Found generateVisualPlan at L{i+1}")
        # Update signature to accept art style and custom instructions
        lines[i] = lines[i].replace(
            'const generateVisualPlan = async (concept, gradeLevel, studentLanguage)',
            'const generateVisualPlan = async (concept, gradeLevel, studentLanguage, artStyle = "", customInstructions = "")'
        )
        fixed += 1
        print(f"  [OK] FIX 1a: Updated generateVisualPlan signature")
        
        # Find the imagenPrompt description line and add art style instruction
        for j in range(i, min(i+20, len(lines))):
            if '"imagenPrompt": "Detailed prompt for Imagen' in lines[j]:
                # Replace with style-aware description
                lines[j] = lines[j].replace(
                    '"imagenPrompt": "Detailed prompt for Imagen. Educational vector art, white background, no text."',
                    '"imagenPrompt": "Detailed prompt for Imagen. IMPORTANT: Use the ART STYLE specified below. White background, no text in the image."'
                )
                fixed += 1
                print(f"  [OK] FIX 1b: Updated imagenPrompt description at L{j+1}")
                break
        
        # Find the closing of the planPrompt template literal and add style/custom instructions before it
        for j in range(i, min(i+40, len(lines))):
            if 'Return ONLY valid JSON:' in lines[j]:
                # Insert art style and custom instructions lines before "Return ONLY valid JSON"
                indent = lines[j][:len(lines[j]) - len(lines[j].lstrip())]
                art_style_line = indent + '${artStyle ? `ART STYLE: Use "${artStyle}" style for ALL panel imagenPrompts. This means each prompt must specify "${artStyle}" style rendering.` : "ART STYLE: Clean educational vector art."}\r'
                custom_instr_line = indent + '${customInstructions ? `ADDITIONAL INSTRUCTIONS: ${customInstructions}` : ""}\r'
                lines.insert(j, custom_instr_line)
                lines.insert(j, art_style_line)
                fixed += 1
                print(f"  [OK] FIX 1c: Injected art style and custom instructions into AI prompt")
                break
        break

# ============================================================
# FIX 2: Update executeVisualPlan to append style to imagenPrompt
# ============================================================
for i in range(len(lines)):
    if 'const executeVisualPlan = async (plan, targetWidth' in lines[i]:
        print(f"  Found executeVisualPlan at L{i+1}")
        # Update signature to accept artStyle
        lines[i] = lines[i].replace(
            'const executeVisualPlan = async (plan, targetWidth = 400, targetQual = 0.8)',
            'const executeVisualPlan = async (plan, targetWidth = 400, targetQual = 0.8, artStyle = "")'
        )
        
        # Find where callImagen is called with panel.imagenPrompt
        for j in range(i, min(i+20, len(lines))):
            if 'callImagen(panel.imagenPrompt' in lines[j]:
                # Replace to append art style to the prompt
                lines[j] = lines[j].replace(
                    'callImagen(panel.imagenPrompt',
                    'callImagen(panel.imagenPrompt + (artStyle ? `. Style: ${artStyle}.` : "")'
                )
                fixed += 1
                print(f"  [OK] FIX 2: executeVisualPlan appends artStyle to callImagen at L{j+1}")
                break
        break

# ============================================================
# FIX 3: Update call sites to pass art style and custom instructions
# L52795: generateVisualPlan(textToProcess..., effectiveGrade, effectiveLanguage)
# L52800: generateVisualPlan(concept + ...)
# L52812: executeVisualPlan(visualPlan, targetWidth, targetQual)
# ============================================================
# Need to find these lines precisely
for i in range(len(lines)):
    # Call site 1: auto mode
    if 'generateVisualPlan(textToProcess.substring(0, 500), effectiveGrade, effectiveLanguage)' in lines[i]:
        lines[i] = lines[i].replace(
            'generateVisualPlan(textToProcess.substring(0, 500), effectiveGrade, effectiveLanguage)',
            'generateVisualPlan(textToProcess.substring(0, 500), effectiveGrade, effectiveLanguage, effectiveVisualStyle, effCustomInstructions)'
        )
        fixed += 1
        print(f"  [OK] FIX 3a: Updated auto-mode call site at L{i+1}")

    # Call site 2: template mode
    if "generateVisualPlan(concept + '\\n\\n' + templateHint, effectiveGrade, effectiveLanguage)" in lines[i]:
        lines[i] = lines[i].replace(
            "generateVisualPlan(concept + '\\n\\n' + templateHint, effectiveGrade, effectiveLanguage)",
            "generateVisualPlan(concept + '\\n\\n' + templateHint, effectiveGrade, effectiveLanguage, effectiveVisualStyle, effCustomInstructions)"
        )
        fixed += 1
        print(f"  [OK] FIX 3b: Updated template-mode call site at L{i+1}")

    # Call site 3: executeVisualPlan
    if 'executeVisualPlan(visualPlan, targetWidth, targetQual)' in lines[i] and 'generating_panels' in lines[i-1]:
        lines[i] = lines[i].replace(
            'executeVisualPlan(visualPlan, targetWidth, targetQual)',
            'executeVisualPlan(visualPlan, targetWidth, targetQual, effectiveVisualStyle)'
        )
        fixed += 1
        print(f"  [OK] FIX 3c: Updated executeVisualPlan call site at L{i+1}")

# ============================================================
# FIX 4: Also update the handleRestoreImage call to executeVisualPlan
# ============================================================
for i in range(len(lines)):
    if 'executeVisualPlan(plan, targetWidth, targetQual)' in lines[i] and 'handleRestoreImage' not in lines[i]:
        # Check if this is inside handleRestoreImage by looking for context
        for j in range(max(0, i-15), i):
            if 'handleRestoreImage' in lines[j]:
                # This is the call from handleRestoreImage - can't easily pass effectiveVisualStyle
                # since it reads from stored data. Let's just leave it for now.
                print(f"  [INFO] handleRestoreImage executeVisualPlan call at L{i+1} (no style available)")
                break

# Write
content = '\n'.join(lines)
new_count = len(content.split('\n'))
diff = new_count - original_count
print(f"\nLine count: {original_count} -> {new_count} (diff: {diff:+d})")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print(f"\nDone! {fixed} fixes applied.")
