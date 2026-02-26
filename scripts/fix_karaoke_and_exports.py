#!/usr/bin/env python3
"""
Fix karaoke audio stacking, localize bot speech, add content types to slide export.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ===================================================================
# FIX 1a: Karaoke — invalidate session in stopPlayback
# ===================================================================
old1a = "  const stopPlayback = () => {\n    if (audioRef.current) {"
new1a = "  const stopPlayback = () => {\n    // FIX: Invalidate session to abort in-flight playSequence chains\n    playbackSessionRef.current = -1;\n    // FIX: Cancel any browser TTS to prevent voice doubling\n    if (window.speechSynthesis) window.speechSynthesis.cancel();\n    if (audioRef.current) {"
if old1a in content:
    content = content.replace(old1a, new1a, 1)
    changes += 1
    print("✅ 1a: Session invalidation added to stopPlayback()")
else:
    print("❌ 1a: stopPlayback target not found")

# ===================================================================
# FIX 1b: Clear audio buffer on content switch
# ===================================================================
old1b = "        const wasPlayingThis = playingContentId === contentId;\n        stopPlayback();\n        if (wasPlayingThis && startIndex === 0) {"
new1b = "        const wasPlayingThis = playingContentId === contentId;\n        stopPlayback();\n        // FIX: Clear preloaded audio buffer from previous session\n        audioBufferRef.current = {};\n        if (wasPlayingThis && startIndex === 0) {"
if old1b in content:
    content = content.replace(old1b, new1b, 1)
    changes += 1
    print("✅ 1b: Audio buffer cleanup on content switch")
else:
    print("❌ 1b: handleSpeak target not found")

# ===================================================================
# FIX 2a: Localize bot speech in handleExport
# ===================================================================
old2a = '''alloBotRef.current.speak(mode === 'worksheet' ? "Generating a worksheet? I'll make sure it's formatted perfectly for your students!" : "Preparing your document for print. You can select valid pages in the print preview.", 'happy');'''
new2a = '''alloBotRef.current.speak(mode === 'worksheet' ? t('bot_events.export_worksheet') : t('bot_events.export_print'), 'happy');'''
if old2a in content:
    content = content.replace(old2a, new2a, 1)
    changes += 1
    print("✅ 2a: Bot speech localized in export")
else:
    print("❌ 2a: Bot speech target not found")

# ===================================================================
# FIX 2b: Localize 'Duration' in clipboard copy
# ===================================================================
old2b = "                   if (act.duration) textContent += `   Duration: ${act.duration}"
new2b = "                   if (act.duration) textContent += `   ${t('lesson_plan.duration_label') || 'Duration'}: ${act.duration}"
if old2b in content:
    content = content.replace(old2b, new2b, 1)
    changes += 1
    print("✅ 2b: Duration label localized")
else:
    print("❌ 2b: Duration target not found")

# ===================================================================
# FIX 2c: Add UI_STRINGS keys
# ===================================================================
# Add bot_events keys
anchor_bot = "bot_events: {"
if anchor_bot in content and "export_worksheet:" not in content:
    content = content.replace(
        anchor_bot,
        """bot_events: {
    export_worksheet: "Generating a worksheet? I'll make sure it's formatted perfectly for your students!",
    export_print: "Preparing your document for print. You can select valid pages in the print preview.",""",
        1
    )
    changes += 1
    print("✅ 2c: Added bot_events l10n keys")

# Add lesson_plan.duration_label
if "duration_label:" not in content:
    anchor_lp = "    activities_header:"
    idx = content.find(anchor_lp)
    if idx != -1:
        eol = content.index('\n', idx)
        content = content[:eol+1] + '    duration_label: "Duration",\n' + content[eol+1:]
        changes += 1
        print("✅ 2d: Added duration_label key")

# ===================================================================
# FIX 3: Add FAQ, brainstorm, sentence-frames, math to slide export
# ===================================================================

# Target: between the concept-sort closing } and the history.forEach closing });
# The exact text at L48948-48953 is:
old3 = """                          yOffset += 0.5;
                      });
                  });
              }
          });
          const safeTopic"""

new3 = """                          yOffset += 0.5;
                      });
                  });
              } else if (type === 'faq') {
                  const faqs = Array.isArray(item.data) ? item.data : [];
                  const FAQS_PER_SLIDE = 3;
                  for (let i = 0; i < faqs.length; i += FAQS_PER_SLIDE) {
                      const chunk = faqs.slice(i, i + FAQS_PER_SLIDE);
                      const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                      slide.addText(i === 0 ? itemTitle : itemTitle + ` (${t('common.continued') || 'Cont.'})`, { x: 0.5, y: 0.15, w: 9, h: 0.5, fontSize: 20, bold: true, color: lightText });
                      const richText = [];
                      chunk.forEach((faq, idx) => {
                          richText.push({ text: `Q${i + idx + 1}: ${faq.question || ''}`, options: { fontSize: 14, bold: true, color: themeColor, breakLine: true, bullet: false } });
                          richText.push({ text: `A: ${(faq.answer || '').replace(/\\*\\*/g, '').replace(/\\*/g, '')}`, options: { fontSize: 12, color: darkText, breakLine: true, bullet: false, paraSpaceAfter: 12 } });
                      });
                      slide.addText(richText, { x: 0.5, y: 1.0, w: 9, h: 4.0, valign: 'top' });
                  }
              } else if (type === 'brainstorm') {
                  const ideas = Array.isArray(item.data) ? item.data : [];
                  const IDEAS_PER_SLIDE = 4;
                  for (let i = 0; i < ideas.length; i += IDEAS_PER_SLIDE) {
                      const chunk = ideas.slice(i, i + IDEAS_PER_SLIDE);
                      const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                      slide.addText(i === 0 ? itemTitle : itemTitle + ` (${t('common.continued') || 'Cont.'})`, { x: 0.5, y: 0.15, w: 9, h: 0.5, fontSize: 20, bold: true, color: lightText });
                      const richText = [];
                      chunk.forEach(idea => {
                          const title = typeof idea === 'string' ? idea : (idea.title || idea.name || idea.text || JSON.stringify(idea));
                          const desc = typeof idea === 'object' ? (idea.description || idea.details || '') : '';
                          richText.push({ text: title.replace(/\\*\\*/g, '').replace(/\\*/g, ''), options: { fontSize: 14, bold: true, color: themeColor, breakLine: true, bullet: { type: 'number', color: themeColor } } });
                          if (desc) richText.push({ text: desc.replace(/\\*\\*/g, '').replace(/\\*/g, ''), options: { fontSize: 12, color: darkText, breakLine: true, indentLevel: 1, paraSpaceAfter: 8 } });
                      });
                      slide.addText(richText, { x: 0.5, y: 1.0, w: 9, h: 4.0, valign: 'top' });
                  }
              } else if (type === 'sentence-frames') {
                  const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                  slide.addText(itemTitle, { x: 0.5, y: 0.15, w: 9, h: 0.5, fontSize: 20, bold: true, color: lightText });
                  if (item.data && item.data.mode === 'list' && Array.isArray(item.data.items)) {
                      const richText = [];
                      item.data.items.forEach((frame, idx) => {
                          const frameText = typeof frame === 'string' ? frame : (frame.text || frame.sentence || JSON.stringify(frame));
                          richText.push({ text: frameText.replace(/\\*\\*/g, '').replace(/\\*/g, ''), options: { fontSize: 13, color: darkText, breakLine: true, bullet: { type: 'number', color: themeColor }, paraSpaceAfter: 6 } });
                      });
                      slide.addText(richText, { x: 0.5, y: 1.0, w: 9, h: 4.0, valign: 'top' });
                  } else if (item.data && item.data.text) {
                      slide.addText(item.data.text.replace(/\\*\\*/g, '').replace(/\\*/g, ''), { x: 0.5, y: 1.0, w: 9, h: 4.0, fontSize: 14, color: darkText, valign: 'top', lineSpacing: 18 });
                  }
              } else if (type === 'math') {
                  const mathText = typeof item.data === 'string' ? item.data : JSON.stringify(item.data);
                  const mathParas = mathText.split(/\\n{2,}/);
                  let mathParts = [];
                  let mathLen = 0;
                  const MAX_MATH = 800;
                  mathParas.forEach(para => {
                      const raw = para.replace(/\\*\\*/g, '').replace(/\\*/g, '').replace(/\\$\\$/g, '').replace(/\\$/g, '');
                      if (mathLen + raw.length > MAX_MATH && mathParts.length > 0) {
                          const mSlide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                          mSlide.addText(itemTitle, { x: 0.5, y: 0.15, w: 9, h: 0.5, fontSize: 20, bold: true, color: lightText });
                          mSlide.addText(mathParts, { x: 0.5, y: 1.0, w: 9, h: 4.0, fontSize: 13, color: darkText, valign: 'top', lineSpacing: 16 });
                          mathParts = [];
                          mathLen = 0;
                      }
                      if (mathParts.length > 0) { mathParts.push({ text: "\\n\\n" }); mathLen += 2; }
                      mathParts.push({ text: raw });
                      mathLen += raw.length;
                  });
                  if (mathParts.length > 0) {
                      const mSlide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                      mSlide.addText(itemTitle, { x: 0.5, y: 0.15, w: 9, h: 0.5, fontSize: 20, bold: true, color: lightText });
                      mSlide.addText(mathParts, { x: 0.5, y: 1.0, w: 9, h: 4.0, fontSize: 13, color: darkText, valign: 'top', lineSpacing: 16 });
                  }
              }
          });
          const safeTopic"""

if old3 in content:
    content = content.replace(old3, new3, 1)
    changes += 1
    print("✅ 3: Added FAQ/brainstorm/sentence-frames/math to slide export")
else:
    print("❌ 3: Slide export insertion point not found")
    # Debug: show what's actually there
    marker = "yOffset += 0.5;"
    idx = content.find(marker)
    if idx != -1:
        snippet = content[idx:idx+200]
        print(f"[DEBUG] Found yOffset at position {idx}:")
        for i, line in enumerate(snippet.split('\n')[:8]):
            print(f"  {i}: {repr(line)}")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
