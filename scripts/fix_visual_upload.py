#!/usr/bin/env python3
"""
Fix Visual Support: Add image upload/replace button for single-panel and standalone visuals.

Root cause: The image upload button (📷) only exists inside VisualPanelGrid, 
which is only rendered when panels.length > 1. Single-panel visuals and 
standalone imageUrl visuals have no upload option.

Fix: Add an upload button next to the existing Download and Regenerate buttons
in the single-image visual path (L73536-73539).
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ===================================================================
# 1. Add state for single-image override (near existing visual states)
# ===================================================================

# We need a state for the single-image override and a ref for the file input
# Find a good place near visual support states
old_visual_state_anchor = "  const [imageRefinementInput, setImageRefinementInput] = useState('');"
new_visual_state_anchor = """  const [imageRefinementInput, setImageRefinementInput] = useState('');
  const [singleImageOverride, setSingleImageOverride] = useState(null);
  const singleImageFileRef = React.useRef(null);"""

if old_visual_state_anchor in content:
    content = content.replace(old_visual_state_anchor, new_visual_state_anchor, 1)
    changes += 1
    print("1: Added singleImageOverride state and file ref")
else:
    print("1: SKIP - imageRefinementInput not found")

# ===================================================================
# 2. Replace the bare <img> tag with a wrapper that includes upload
# ===================================================================

old_single_img = """<img src={generatedContent?.data.imageUrl} alt={generatedContent?.data.altText || generatedContent?.data.prompt} className="w-full h-auto rounded" loading="lazy" decoding="async"/>"""

new_single_img = """<div style={{position:'relative'}}>
                                <img src={singleImageOverride || generatedContent?.data.imageUrl} alt={generatedContent?.data.altText || generatedContent?.data.prompt} className="w-full h-auto rounded" loading="lazy" decoding="async"/>
                                {isTeacherMode && (
                                  <div style={{position:'absolute',top:'8px',right:'8px',display:'flex',gap:'6px'}}>
                                    <input type="file" accept="image/*" ref={singleImageFileRef} style={{display:'none'}}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file || !file.type.startsWith('image/')) return;
                                        if (file.size > 10 * 1024 * 1024) { addToast('Image too large (max 10MB)', 'warning'); return; }
                                        const reader = new FileReader();
                                        reader.onload = (ev) => setSingleImageOverride(ev.target.result);
                                        reader.readAsDataURL(file);
                                      }}
                                    />
                                    <button
                                      aria-label={t('visuals.upload_image') || 'Upload your own image'}
                                      title={t('visuals.upload_image') || 'Upload your own image'}
                                      onClick={() => singleImageFileRef.current?.click()}
                                      className="flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm cursor-pointer"
                                    >📷 {t('visuals.replace_image') || 'Replace'}</button>
                                    {singleImageOverride && (
                                      <button
                                        aria-label={t('visuals.restore_ai_image') || 'Restore AI image'}
                                        title={t('visuals.restore_ai_image') || 'Restore AI image'}
                                        onClick={() => setSingleImageOverride(null)}
                                        className="flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-amber-200 rounded-lg px-3 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-50 transition-all shadow-sm cursor-pointer"
                                      >↩️ {t('visuals.restore_original') || 'Restore'}</button>
                                    )}
                                  </div>
                                )}
                                </div>"""

if old_single_img in content:
    content = content.replace(old_single_img, new_single_img, 1)
    changes += 1
    print("2: Added upload/replace button to single-panel visual")
else:
    print("2: SKIP - single image tag not found")

# ===================================================================
# 3. Add localization keys for visual upload
# ===================================================================

old_visual_l10n_anchor = "    upload_desc: \"PDF, Image, Doc, Audio\","
new_visual_l10n_anchor = """    upload_desc: "PDF, Image, Doc, Audio",
    upload_image: "Upload your own image",
    replace_image: "Replace",
    restore_ai_image: "Restore AI image",
    restore_original: "Restore","""

if old_visual_l10n_anchor in content:
    content = content.replace(old_visual_l10n_anchor, new_visual_l10n_anchor, 1)
    changes += 1
    print("3: Added localization keys for visual upload")
else:
    print("3: SKIP - visual l10n anchor not found")

# ===================================================================
# 4. Also add to the download bar — allow replacing even after download
#    Make download use the override if present
# ===================================================================

old_download_img = """<button onClick={handleDownloadImage} data-help-key="visuals_download" className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"><Download size={18} /> {t('visuals.download')}</button>
                            <button aria-label="Regenerate" onClick={handleRestoreImage} data-help-key="visuals_regenerate" className="flex-none flex items-center justify-center gap-2 bg-amber-50 text-amber-600 py-2 px-4 rounded-lg hover:bg-amber-100 transition-colors font-medium border border-amber-200"><RefreshCw size={18} /></button>"""

new_download_img = """<button onClick={handleDownloadImage} data-help-key="visuals_download" className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"><Download size={18} /> {t('visuals.download')}</button>
                            <button
                              aria-label={t('visuals.upload_image') || 'Upload your own image'}
                              title={t('visuals.upload_image') || 'Upload your own image'}
                              onClick={() => singleImageFileRef.current?.click()}
                              className="flex-none flex items-center justify-center gap-2 bg-purple-50 text-purple-600 py-2 px-4 rounded-lg hover:bg-purple-100 transition-colors font-medium border border-purple-200"
                            ><span style={{fontSize:'18px'}}>📷</span></button>
                            <button aria-label="Regenerate" onClick={handleRestoreImage} data-help-key="visuals_regenerate" className="flex-none flex items-center justify-center gap-2 bg-amber-50 text-amber-600 py-2 px-4 rounded-lg hover:bg-amber-100 transition-colors font-medium border border-amber-200"><RefreshCw size={18} /></button>"""

if old_download_img in content:
    content = content.replace(old_download_img, new_download_img, 1)
    changes += 1
    print("4: Added upload button to download toolbar")
else:
    print("4: SKIP - download bar not found")

# ===================================================================
# 5. Clear override when generating new content
# ===================================================================

old_restore_handler = "  const handleRestoreImage = async () => {"

# Check if handleRestoreImage exists
if old_restore_handler in content:
    # Add override reset at the start of the handler
    new_restore_handler = """  const handleRestoreImage = async () => {
    setSingleImageOverride(null);"""
    content = content.replace(old_restore_handler, new_restore_handler, 1)
    changes += 1
    print("5: Clear singleImageOverride on regenerate")
else:
    print("5: SKIP - handleRestoreImage not found")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied for visual support image replacement.")
