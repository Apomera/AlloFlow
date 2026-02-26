"""Fix handleUpdateVisualLabel to support deletion (newText === null)."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()

old_handler = """  const handleUpdateVisualLabel = (panelIdx, labelIdx, newText) => {
      if (!generatedContent?.data?.visualPlan) return;
      const plan = generatedContent.data.visualPlan;
      const updatedPanels = [...plan.panels];
      const updatedLabels = [...(updatedPanels[panelIdx].labels || [])];
      updatedLabels[labelIdx] = { ...updatedLabels[labelIdx], text: newText };
      updatedPanels[panelIdx] = { ...updatedPanels[panelIdx], labels: updatedLabels };"""

new_handler = """  const handleUpdateVisualLabel = (panelIdx, labelIdx, newText) => {
      if (!generatedContent?.data?.visualPlan) return;
      const plan = generatedContent.data.visualPlan;
      const updatedPanels = [...plan.panels];
      const updatedLabels = [...(updatedPanels[panelIdx].labels || [])];
      if (newText === null) {
          updatedLabels.splice(labelIdx, 1);
      } else {
          updatedLabels[labelIdx] = { ...updatedLabels[labelIdx], text: newText };
      }
      updatedPanels[panelIdx] = { ...updatedPanels[panelIdx], labels: updatedLabels };"""

if old_handler in content:
    content = content.replace(old_handler, new_handler)
    print("[OK] handleUpdateVisualLabel now supports label deletion (newText === null)")
    open(filepath, 'w', encoding='utf-8').write(content)
else:
    print("[WARN] Could not find handleUpdateVisualLabel pattern")
