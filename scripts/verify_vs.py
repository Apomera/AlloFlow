"""Verify visual_director l10n keys"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()
keys = ['multi_panel','generating_panels','refining_panel','refining_panel_n','refining_all_panels','all_panels_refined','panels_downloaded','refine_failed']
print('visual_director keys in UI_STRINGS:')
for k in keys:
    present = ('    ' + k + ':') in c
    print('  %s: %s' % (k, present))
print()
print('visual_director section:', 'visual_director:' in c)
print('meta.multi_part usage:', "meta.multi_part" in c)
print('meta.processing_sections usage:', "meta.processing_sections" in c)
