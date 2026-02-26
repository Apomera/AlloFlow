"""
fix_immersive_themes.py — Fix immersive reader dark mode visibility and make chunk reader theme-aware.

Issues:
1. Immersive reader overlay uses hardcoded light background + dark text — invisible in dark mode
2. Chunk reader always uses dark theme — should match app theme
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    changes = 0

    # 1. Make immersive reader overlay background theme-aware
    old_immersive_bg = 'className="fixed inset-0 z-[200] bg-[#fdfbf7] overflow-y-auto animate-in fade-in zoom-in-95 duration-300 flex flex-col font-sans"'
    new_immersive_bg = 'className={`fixed inset-0 z-[200] overflow-y-auto animate-in fade-in zoom-in-95 duration-300 flex flex-col font-sans ${theme === \'dark\' ? \'bg-slate-900\' : theme === \'contrast\' ? \'bg-black\' : \'bg-[#fdfbf7]\'}`}'
    if old_immersive_bg in content:
        content = content.replace(old_immersive_bg, new_immersive_bg, 1)
        changes += 1
        print("✅ 1. Made immersive overlay background theme-aware")
    else:
        print("❌ 1. Could not find immersive bg anchor")
        return

    # 2. Make immersive reader text color theme-aware
    old_immersive_text = "className={`max-w-4xl mx-auto text-slate-900 transition-all duration-300`}"
    new_immersive_text = "className={`max-w-4xl mx-auto transition-all duration-300 ${theme === 'dark' ? 'text-slate-100' : theme === 'contrast' ? 'text-yellow-300' : 'text-slate-900'}`}"
    if old_immersive_text in content:
        content = content.replace(old_immersive_text, new_immersive_text, 1)
        changes += 1
        print("✅ 2. Made immersive text color theme-aware")
    else:
        print("❌ 2. Could not find immersive text anchor")
        return

    # 3. Make chunk reader theme-aware: container background
    old_chunk_bg = 'className="fixed inset-0 z-[300] bg-slate-950 text-white flex flex-col animate-in fade-in duration-200"'
    new_chunk_bg = "className={`fixed inset-0 z-[300] flex flex-col animate-in fade-in duration-200 ${theme === 'dark' ? 'bg-slate-950 text-white' : theme === 'contrast' ? 'bg-black text-yellow-300' : 'bg-[#fdfbf7] text-slate-900'}`}"
    if old_chunk_bg in content:
        content = content.replace(old_chunk_bg, new_chunk_bg, 1)
        changes += 1
        print("✅ 3. Made chunk reader container theme-aware")
    else:
        print("❌ 3. Could not find chunk container anchor")
        return

    # 4. Make chunk reader header border theme-aware
    old_chunk_header_border = 'border-b border-slate-800 ${showControls'
    new_chunk_header_border = "border-b ${theme === 'dark' ? 'border-slate-800' : theme === 'contrast' ? 'border-yellow-500' : 'border-slate-200'} ${showControls"
    if old_chunk_header_border in content:
        content = content.replace(old_chunk_header_border, new_chunk_header_border, 1)
        changes += 1
        print("✅ 4. Made chunk header border theme-aware")
    else:
        print("❌ 4. Could not find header border anchor (non-critical)")

    # 5. Make chunk back button theme-aware
    old_chunk_back = 'className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"'
    new_chunk_back = "className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : theme === 'contrast' ? 'hover:bg-yellow-900 text-yellow-400' : 'hover:bg-slate-100 text-slate-500'}`}"
    if old_chunk_back in content:
        content = content.replace(old_chunk_back, new_chunk_back, 1)
        changes += 1
        print("✅ 5. Made chunk back button theme-aware")
    else:
        print("❌ 5. Could not find back button anchor (non-critical)")

    # 6. Make chunk title color theme-aware
    old_chunk_title = 'className="font-bold text-lg text-amber-400"'
    new_chunk_title = "className={`font-bold text-lg ${theme === 'dark' ? 'text-amber-400' : theme === 'contrast' ? 'text-yellow-300' : 'text-amber-700'}`}"
    if old_chunk_title in content:
        content = content.replace(old_chunk_title, new_chunk_title, 1)
        changes += 1
        print("✅ 6. Made chunk title theme-aware")
    else:
        print("❌ 6. Could not find title anchor (non-critical)")

    # 7. Make visibility mode buttons theme-aware
    old_vis_inactive = "bg-slate-800 text-slate-400 hover:bg-slate-700"
    new_vis_inactive = "${theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : theme === 'contrast' ? 'bg-gray-900 text-yellow-400 hover:bg-gray-800 border border-yellow-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
    # This one appears in the chunk reader specifically
    if old_vis_inactive in content:
        content = content.replace(old_vis_inactive, new_vis_inactive, 1)
        changes += 1
        print("✅ 7. Made visibility mode buttons theme-aware")
    else:
        print("❌ 7. Could not find visibility button anchor (non-critical)")

    # 8. Make chunk text colors theme-aware (current vs dimmed chunks)
    old_chunk_text_current = "'text-white' : 'text-slate-600'"
    new_chunk_text_current = "${theme === 'dark' ? 'text-white' : theme === 'contrast' ? 'text-yellow-200' : 'text-slate-900'} : ${theme === 'dark' ? 'text-slate-600' : theme === 'contrast' ? 'text-yellow-800' : 'text-slate-400'}"
    if old_chunk_text_current in content:
        content = content.replace(old_chunk_text_current, new_chunk_text_current, 1)
        changes += 1
        print("✅ 8. Made chunk text colors theme-aware")
    else:
        print("❌ 8. Could not find chunk text anchor (non-critical)")

    # 9. Make chunk nav footer theme-aware
    old_chunk_footer = 'className="p-4 border-t border-slate-800 flex items-center gap-4 justify-center"'
    new_chunk_footer = "className={`p-4 border-t flex items-center gap-4 justify-center ${theme === 'dark' ? 'border-slate-800' : theme === 'contrast' ? 'border-yellow-500' : 'border-slate-200'}`}"
    if old_chunk_footer in content:
        content = content.replace(old_chunk_footer, new_chunk_footer, 1)
        changes += 1
        print("✅ 9. Made chunk footer theme-aware")
    else:
        print("❌ 9. Could not find footer border anchor (non-critical)")

    # 10. Make chunk nav buttons theme-aware
    old_nav_btn = 'className="p-2 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-30 transition-all"'
    new_nav_btn = "className={`p-2 rounded-full disabled:opacity-30 transition-all ${theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : theme === 'contrast' ? 'bg-gray-900 text-yellow-400 hover:bg-gray-800 border border-yellow-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}"
    # This appears twice (prev + next buttons), so use AllowMultiple equivalent
    count = content.count(old_nav_btn)
    if count > 0:
        content = content.replace(old_nav_btn, new_nav_btn)
        changes += 1
        print(f"✅ 10. Made {count} nav buttons theme-aware")
    else:
        print("❌ 10. Could not find nav button anchor (non-critical)")

    # 11. Make auto-play button theme-aware
    old_autoplay = "'bg-amber-500 text-white' : 'bg-slate-800 text-amber-400 hover:bg-slate-700'"
    new_autoplay = "'bg-amber-500 text-white' : `${theme === 'dark' ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : theme === 'contrast' ? 'bg-gray-900 text-yellow-300 hover:bg-gray-800 border border-yellow-600' : 'bg-slate-100 text-amber-700 hover:bg-slate-200'}`"
    if old_autoplay in content:
        content = content.replace(old_autoplay, new_autoplay, 1)
        changes += 1
        print("✅ 11. Made auto-play button theme-aware")
    else:
        print("❌ 11. Could not find autoplay anchor (non-critical)")

    # 12. Make progress bar background theme-aware
    old_progress_bg = 'className="h-2 bg-slate-900 w-full"'
    new_progress_bg = "className={`h-2 w-full ${theme === 'dark' ? 'bg-slate-900' : theme === 'contrast' ? 'bg-black' : 'bg-slate-100'}`}"
    if old_progress_bg in content:
        content = content.replace(old_progress_bg, new_progress_bg, 1)
        changes += 1
        print("✅ 12. Made progress bar background theme-aware")
    else:
        print("❌ 12. Could not find progress bg anchor (non-critical)")

    # 13. Pass theme prop to ChunkedReaderOverlay - update the component signature
    old_chunk_sig = 'const ChunkedReaderOverlay = React.memo(({ text, onClose, isOpen }) => {'
    new_chunk_sig = 'const ChunkedReaderOverlay = React.memo(({ text, onClose, isOpen, theme }) => {'
    if old_chunk_sig in content:
        content = content.replace(old_chunk_sig, new_chunk_sig, 1)
        changes += 1
        print("✅ 13. Added theme prop to ChunkedReaderOverlay signature")
    else:
        print("❌ 13. Could not find component signature anchor")
        return

    # 14. Pass theme in the render mount
    old_chunk_mount = '<ChunkedReaderOverlay\n                                isOpen={isChunkReaderActive}\n                                onClose={handleCloseChunkReader}'
    new_chunk_mount = '<ChunkedReaderOverlay\n                                isOpen={isChunkReaderActive}\n                                onClose={handleCloseChunkReader}\n                                theme={theme}'
    if old_chunk_mount in content:
        content = content.replace(old_chunk_mount, new_chunk_mount, 1)
        changes += 1
        print("✅ 14. Passed theme prop in render mount")
    else:
        print("❌ 14. Could not find render mount anchor")
        return

    # 15. Make hint text theme-aware
    old_hint = 'className="mt-12 text-slate-500 animate-pulse text-sm"'
    new_hint = "className={`mt-12 animate-pulse text-sm ${theme === 'dark' ? 'text-slate-500' : theme === 'contrast' ? 'text-yellow-600' : 'text-slate-400'}`}"
    if old_hint in content:
        content = content.replace(old_hint, new_hint, 1)
        changes += 1
        print("✅ 15. Made hint text theme-aware")
    else:
        print("ℹ️ 15. Hint anchor not found (non-critical)")

    SRC.write_text(content, encoding='utf-8')
    print(f"\n✅ Done! {changes} changes applied.")

if __name__ == "__main__":
    main()
