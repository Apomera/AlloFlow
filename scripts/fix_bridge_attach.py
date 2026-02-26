#!/usr/bin/env python3
"""
Fix Bridge Attach Image: Add file upload input instead of DOM scanning.
The button should open a file picker to let users upload their own image.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# Replace the entire attach image button block
old_attach = """<button
                  id="bridge-attach-image-btn"
                  onClick={() => {
                    // Try multiple sources for generated images
                    let src = null;
                    // 1. Check generatedContent state (React-managed)
                    if (generatedContent?.imageUrl) { src = generatedContent.imageUrl; }
                    // 2. Check for any displayed images with data URI source
                    if (!src) {
                      const allImgs = document.querySelectorAll('img[src^="data:image"]');
                      if (allImgs.length > 0) src = allImgs[allImgs.length - 1].src;
                    }
                    // 3. Check for Imagen-generated images via class
                    if (!src) {
                      const genImgs = document.querySelectorAll('.generated-image, [data-generated-image], img[alt*="Generated"], img[alt*="Illustration"]');
                      if (genImgs.length > 0) src = genImgs[genImgs.length - 1].src || genImgs[genImgs.length - 1].getAttribute('data-generated-image');
                    }
                    if (!src) { addToast('No generated images found. Generate a visual first using Text Adaptation.', 'warning'); return; }
                    window.__bridgeAttachedImage = src;
                    const btn = document.getElementById('bridge-attach-image-btn');
                    if (btn) btn.textContent = '✅ Image Attached';
                    addToast('Image attached to bridge message', 'success');
                  }}
                  aria-label="Attach a generated image"
                  style={{background:'rgba(168,85,247,0.1)',border:'1px solid rgba(168,85,247,0.25)',borderRadius:'10px',padding:'8px 14px',color:'#c084fc',fontSize:'12px',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',transition:'all 0.2s'}}
                ><span>🖼️</span> Attach Image</button>"""

new_attach = """<input type="file" accept="image/*" id="bridge-image-file-input" style={{display:'none'}}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith('image/')) { addToast('Please select an image file.', 'warning'); return; }
                    if (file.size > 10 * 1024 * 1024) { addToast('Image too large (max 10MB).', 'warning'); return; }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      window.__bridgeAttachedImage = ev.target.result;
                      const btn = document.getElementById('bridge-attach-image-btn');
                      if (btn) btn.innerHTML = '<span>✅</span> ' + file.name.substring(0, 20) + (file.name.length > 20 ? '…' : '');
                      const rmBtn = document.getElementById('bridge-remove-image-btn');
                      if (rmBtn) rmBtn.style.display = 'flex';
                      addToast('Image attached: ' + file.name, 'success');
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
                <button
                  id="bridge-attach-image-btn"
                  onClick={() => document.getElementById('bridge-image-file-input')?.click()}
                  aria-label="Upload and attach an image"
                  style={{background:'rgba(168,85,247,0.1)',border:'1px solid rgba(168,85,247,0.25)',borderRadius:'10px',padding:'8px 14px',color:'#c084fc',fontSize:'12px',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',transition:'all 0.2s'}}
                ><span>🖼️</span> Attach Image</button>
                <button
                  id="bridge-remove-image-btn"
                  onClick={() => {
                    window.__bridgeAttachedImage = null;
                    const btn = document.getElementById('bridge-attach-image-btn');
                    if (btn) btn.innerHTML = '<span>🖼️</span> Attach Image';
                    document.getElementById('bridge-remove-image-btn').style.display = 'none';
                    addToast('Image removed', 'info');
                  }}
                  aria-label="Remove attached image"
                  style={{display:'none',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'10px',padding:'8px 10px',color:'#f87171',fontSize:'12px',fontWeight:700,cursor:'pointer',alignItems:'center',gap:'4px',transition:'all 0.2s'}}
                ><span>✕</span></button>
                {generatedContent?.data?.imageUrl && (
                  <button
                    onClick={() => {
                      window.__bridgeAttachedImage = generatedContent.data.imageUrl;
                      const btn = document.getElementById('bridge-attach-image-btn');
                      if (btn) btn.innerHTML = '<span>✅</span> AI Image';
                      const rmBtn = document.getElementById('bridge-remove-image-btn');
                      if (rmBtn) rmBtn.style.display = 'flex';
                      addToast('Generated image attached', 'success');
                    }}
                    aria-label="Use current generated image"
                    style={{background:'rgba(20,184,166,0.1)',border:'1px solid rgba(20,184,166,0.25)',borderRadius:'10px',padding:'8px 14px',color:'#5eead4',fontSize:'12px',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',transition:'all 0.2s'}}
                  ><span>🎨</span> Use Generated</button>
                )}"""

if old_attach in content:
    content = content.replace(old_attach, new_attach, 1)
    changes += 1
    print("1: Replaced attach image with file upload + generated image fallback")
else:
    print("1: SKIP - old attach button not found")
    # Debug: try to find partial match
    if "bridge-attach-image-btn" in content:
        print("   NOTE: bridge-attach-image-btn ID exists but full pattern didn't match")
    else:
        print("   NOTE: bridge-attach-image-btn not found at all")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
