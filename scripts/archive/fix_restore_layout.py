"""
Fix regenerate-from-prompt to preserve multi-panel layout.
1. handleDeleteImage: save original layout info in _savedLayout
2. handleRestoreImage: use generateVisualPlan + executeVisualPlan when _savedLayout exists
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
# FIX 1: handleDeleteImage - preserve layout info
# Current: data: { ...prev.data, imageUrl: null, visualPlan: null }
# New: also save _savedLayout from the visualPlan
# ============================================================
for i in range(len(lines)):
    if 'handleDeleteImage' in lines[i] and '=>' in lines[i]:
        print(f"  Found handleDeleteImage at L{i+1}: {lines[i].rstrip()[:100]}")
        # Find the data spread with imageUrl: null, visualPlan: null
        for j in range(i, min(i+10, len(lines))):
            if 'imageUrl: null, visualPlan: null' in lines[j]:
                print(f"  Found data clear at L{j+1}: {lines[j].rstrip()[:120]}")
                # Replace to preserve layout metadata
                old_text = 'data: { ...prev.data, imageUrl: null, visualPlan: null }'
                new_text = 'data: { ...prev.data, imageUrl: null, visualPlan: null, _savedLayout: prev.data?.visualPlan?.layout || null, _savedPanelCount: prev.data?.visualPlan?.panels?.length || 0 }'
                lines[j] = lines[j].replace(old_text, new_text)
                fixed += 1
                print(f"  [OK] FIX 1: handleDeleteImage now saves _savedLayout and _savedPanelCount")
                break
        break

# ============================================================
# FIX 2: handleRestoreImage - use visual plan when layout was multi-panel
# Replace the entire function
# ============================================================
start_idx = None
end_idx = None
for i in range(len(lines)):
    if 'const handleRestoreImage = async' in lines[i]:
        start_idx = i
        print(f"  Found handleRestoreImage at L{i+1}")
        # Find function end by tracking braces
        brace_count = 0
        for j in range(i, min(i+30, len(lines))):
            brace_count += lines[j].count('{') - lines[j].count('}')
            if brace_count == 0 and j > i:
                end_idx = j
                print(f"  Function ends at L{j+1}")
                break
        break

if start_idx is not None and end_idx is not None:
    indent = '  '
    new_fn = [
        indent + "const handleRestoreImage = async () => {\r",
        indent + "  if (!generatedContent?.data?.prompt) return;\r",
        indent + "  setIsProcessing(true);\r",
        indent + "  setGenerationStep(t('visuals.actions.restoring'));\r",
        indent + "  setError(null);\r",
        indent + "  try {\r",
        indent + "      const targetWidth = useLowQualityVisuals ? 300 : 800;\r",
        indent + "      const targetQual = useLowQualityVisuals ? 0.5 : 0.9;\r",
        indent + "      const savedLayout = generatedContent?.data?._savedLayout;\r",
        indent + "      const savedPanelCount = generatedContent?.data?._savedPanelCount || 0;\r",
        indent + "      // If original was multi-panel, regenerate with visual plan\r",
        indent + "      if (savedLayout && savedLayout !== 'single' && savedPanelCount > 1) {\r",
        indent + "          setGenerationStep('Planning visual layout...');\r",
        indent + "          const plan = await generateVisualPlan(generatedContent?.data.prompt, gradeLevel, studentLanguage);\r",
        indent + "          setGenerationStep('Generating panels...');\r",
        indent + "          const executedPlan = await executeVisualPlan(plan, targetWidth, targetQual);\r",
        indent + "          const updatedContent = {\r",
        indent + "              ...generatedContent,\r",
        indent + "              data: { ...generatedContent?.data, imageUrl: executedPlan.panels[0]?.imageUrl || generatedContent?.data?.imageUrl, visualPlan: executedPlan, _savedLayout: null, _savedPanelCount: 0 }\r",
        indent + "          };\r",
        indent + "          setGeneratedContent(updatedContent);\r",
        indent + "          setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));\r",
        indent + "          addToast(`${executedPlan.panels.length} panels regenerated!`, \"success\");\r",
        indent + "      } else {\r",
        indent + "          // Single image: use original approach\r",
        indent + "          const imageBase64 = await callImagen(generatedContent?.data.prompt, targetWidth, targetQual);\r",
        indent + "          const updatedContent = {\r",
        indent + "              ...generatedContent,\r",
        indent + "              data: { ...generatedContent?.data, imageUrl: imageBase64 }\r",
        indent + "          };\r",
        indent + "          setGeneratedContent(updatedContent);\r",
        indent + "          setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));\r",
        indent + "          addToast(t('toasts.image_restored'), \"success\");\r",
        indent + "      }\r",
        indent + "  } catch (e) {\r",
        indent + "      warnLog(\"Image restoration failed\", e);\r",
        indent + "      setError(t('visuals.actions.restore_error'));\r",
        indent + "      addToast(t('visuals.actions.restore_failed'), \"error\");\r",
        indent + "  } finally {\r",
        indent + "      setIsProcessing(false);\r",
        indent + "  }\r",
        indent + "};\r",
    ]
    lines[start_idx:end_idx+1] = new_fn
    fixed += 1
    old_len = end_idx - start_idx + 1
    print(f"  [OK] FIX 2: Replaced handleRestoreImage ({old_len} -> {len(new_fn)} lines)")
else:
    print("[WARN] FIX 2: handleRestoreImage not found")

# Write
content = '\n'.join(lines)
new_count = len(content.split('\n'))
diff = new_count - original_count
print(f"\nLine count: {original_count} -> {new_count} (diff: {diff:+d})")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print(f"\nDone! {fixed} fixes applied.")
