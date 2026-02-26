"""
Fix visual support multi-panel localization:
1. Add visual_director l10n keys to UI_STRINGS (inside visuals section)
2. Localize raw metaInfo template at L54194
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# FIX 1: Add visual_director keys to UI_STRINGS
# Insert inside visuals section, after actions block close (L15829-15830)
old_visuals_end = """        enhanced_success: "Visuals enhanced automatically!",
        enhanced_skipped: "Visual refinement skipped due to error. Showing original.",
    }
  },"""

new_visuals_end = """        enhanced_success: "Visuals enhanced automatically!",
        enhanced_skipped: "Visual refinement skipped due to error. Showing original.",
    }
  },
  visual_director: {
    multi_panel: "Multi-Panel ({{count}} panels)",
    generating_panels: "Generating multi-panel illustration...",
    refining_panel: "Refining panel...",
    refining_panel_n: "Refining panel {{n}} of {{total}}...",
    refining_all_panels: "Refining all panels...",
    all_panels_refined: "All panels refined!",
    panels_downloaded: "Panels downloaded!",
    refine_failed: "Panel refinement failed.",
  },"""

if old_visuals_end in content:
    content = content.replace(old_visuals_end, new_visuals_end, 1)
    changes.append("Added 8 visual_director l10n keys to UI_STRINGS")
else:
    print("[WARN] visuals end pattern not found")

# FIX 2: Add localized meta key for multi-part processing
old_multipart_meta = "const metaInfo = `${effectiveGrade} - ${effectiveLanguage} ${textFormat !== 'Standard Text' ? `(${textFormat})` : ''} (Multi-part)`;"
new_multipart_meta = "const metaInfo = `${effectiveGrade} - ${effectiveLanguage} ${textFormat !== 'Standard Text' ? `(${textFormat})` : ''} (${t('meta.multi_part') || 'Multi-part'})`;"
if old_multipart_meta in content:
    content = content.replace(old_multipart_meta, new_multipart_meta, 1)
    changes.append("Localized 'Multi-part' in metaInfo template")
else:
    print("[WARN] Multi-part metaInfo pattern not found")

# FIX 3: Add localized raw toast for multi-section processing
old_toast_multi = 'addToast(`Text is long. Processing ${chunks.length} sections...`, "info");'
new_toast_multi = "addToast(t('meta.processing_sections', { count: chunks.length }) || `Text is long. Processing ${chunks.length} sections...`, \"info\");"
if old_toast_multi in content:
    content = content.replace(old_toast_multi, new_toast_multi, 1)
    changes.append("Localized multi-section processing toast")
else:
    print("[WARN] Multi-section toast not found")

# FIX 4: Add the meta.multi_part and meta.processing_sections keys
# Find meta section in UI_STRINGS
old_meta_area = "meta.worksheet_mode"
if old_meta_area not in content:
    # Try to find 'meta:' section
    print("[INFO] Looking for meta section in UI_STRINGS...")

# Add meta keys near existing meta keys
# Find where meta keys are defined
old_meta_key = "meta_worksheet_mode"
if "meta:" in content:
    import re
    # Find the meta: section
    match = re.search(r'(\s+meta:\s*\{)', content)
    if match:
        print("[INFO] meta section found at offset %d" % match.start())
else:
    print("[INFO] No meta: section found")

# Let's check what exists for meta keys
import re
meta_keys = re.findall(r"t\('meta\.([^']+)'\)", content)
print("Existing meta.* keys used:", sorted(set(meta_keys)))

# Check if meta section already has multi_part
if 'multi_part' in content:
    print("[INFO] multi_part already exists somewhere")
else:
    # Add to meta section if it exists
    meta_match = re.search(r'(  meta:\s*\{[^}]*\})', content)
    if meta_match:
        old_meta = meta_match.group(1)
        if old_meta.rstrip().endswith('}'):
            new_meta = old_meta.rstrip()[:-1] + ',\n    multi_part: "Multi-part",\n    processing_sections: "Processing {{count}} sections...",\n  }'
            content = content.replace(old_meta, new_meta, 1)
            changes.append("Added meta.multi_part and meta.processing_sections keys")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n" + "=" * 60)
print("Applied %d changes:" % len(changes))
for c in changes:
    print("  + %s" % c)
print("=" * 60)
