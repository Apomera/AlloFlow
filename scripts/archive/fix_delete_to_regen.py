"""
Replace delete button with regenerate button.
Also simplify handleRestoreImage since it no longer needs saved layout detection.
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
# FIX 1: Replace delete button with regenerate button
# ============================================================
for i in range(len(lines)):
    if 'handleDeleteImage' in lines[i] and 'Trash2' in lines[i] and 'button' in lines[i]:
        print(f"  Found delete button at L{i+1}")
        old_line = lines[i]
        # Replace: onClick=handleDeleteImage, icon=Trash2, red styling -> onClick=handleRestoreImage, icon=RefreshCw, amber styling
        new_line = old_line.replace(
            'aria-label="Delete"', 'aria-label="Regenerate"'
        ).replace(
            'onClick={handleDeleteImage}', 'onClick={handleRestoreImage}'
        ).replace(
            'data-help-key="visuals_delete"', 'data-help-key="visuals_regenerate"'
        ).replace(
            'bg-red-50 text-red-600', 'bg-amber-50 text-amber-600'
        ).replace(
            'hover:bg-red-100', 'hover:bg-amber-100'
        ).replace(
            'border-red-100', 'border-amber-200'
        ).replace(
            '<Trash2 size={18} />', '<RefreshCw size={18} />'
        )
        lines[i] = new_line
        fixed += 1
        print(f"  [OK] FIX 1: Replaced delete button with regenerate button")
        break

# ============================================================
# FIX 2: Simplify handleRestoreImage for multi-panel
# Since we no longer delete first, the visual plan is still in data
# We can just re-execute the plan or do a fresh single image
# ============================================================
start_idx = None
end_idx = None
for i in range(len(lines)):
    if 'const handleRestoreImage = async' in lines[i]:
        start_idx = i
        print(f"  Found handleRestoreImage at L{i+1}")
        brace_count = 0
        for j in range(i, min(i+50, len(lines))):
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
        indent + "  setGenerationStep(t('visuals.actions.restoring') || 'Regenerating...');\r",
        indent + "  setError(null);\r",
        indent + "  try {\r",
        indent + "      const targetWidth = useLowQualityVisuals ? 300 : 800;\r",
        indent + "      const targetQual = useLowQualityVisuals ? 0.5 : 0.9;\r",
        indent + "      // Multi-panel: regenerate full visual plan\r",
        indent + "      if (generatedContent?.data?.visualPlan && generatedContent?.data?.visualPlan?.panels?.length > 1) {\r",
        indent + "          setGenerationStep('Planning visual layout...');\r",
        indent + "          const plan = await generateVisualPlan(generatedContent?.data.prompt, gradeLevel, studentLanguage);\r",
        indent + "          setGenerationStep('Generating panels...');\r",
        indent + "          const executedPlan = await executeVisualPlan(plan, targetWidth, targetQual);\r",
        indent + "          const updatedContent = {\r",
        indent + "              ...generatedContent,\r",
        indent + "              data: { ...generatedContent?.data, imageUrl: executedPlan.panels[0]?.imageUrl || generatedContent?.data?.imageUrl, visualPlan: executedPlan }\r",
        indent + "          };\r",
        indent + "          setGeneratedContent(updatedContent);\r",
        indent + "          setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));\r",
        indent + "          addToast(`${executedPlan.panels.length} panels regenerated!`, \"success\");\r",
        indent + "      } else {\r",
        indent + "          // Single image regeneration\r",
        indent + "          const imageBase64 = await callImagen(generatedContent?.data.prompt, targetWidth, targetQual);\r",
        indent + "          const updatedContent = {\r",
        indent + "              ...generatedContent,\r",
        indent + "              data: { ...generatedContent?.data, imageUrl: imageBase64 }\r",
        indent + "          };\r",
        indent + "          setGeneratedContent(updatedContent);\r",
        indent + "          setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));\r",
        indent + "          addToast(t('toasts.image_restored') || 'Image regenerated!', \"success\");\r",
        indent + "      }\r",
        indent + "  } catch (e) {\r",
        indent + "      warnLog(\"Image regeneration failed\", e);\r",
        indent + "      setError(t('visuals.actions.restore_error'));\r",
        indent + "      addToast(t('visuals.actions.restore_failed') || 'Regeneration failed', \"error\");\r",
        indent + "  } finally {\r",
        indent + "      setIsProcessing(false);\r",
        indent + "  }\r",
        indent + "};\r",
    ]
    lines[start_idx:end_idx+1] = new_fn
    fixed += 1
    print(f"  [OK] FIX 2: Simplified handleRestoreImage ({end_idx - start_idx + 1} -> {len(new_fn)} lines)")

# Write
content = '\n'.join(lines)
new_count = len(content.split('\n'))
diff = new_count - original_count
print(f"\nLine count: {original_count} -> {new_count} (diff: {diff:+d})")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print(f"\nDone! {fixed} fixes applied.")
