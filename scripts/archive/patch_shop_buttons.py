"""
Quick fix: Prevent adventure shop purchase buttons from being cut off.
- Add shrink-0 to buttons so they don't compress
- Add flex-1 to description area so cards equalize and buttons align at bottom
- Increase minimum card height to prevent overflow
"""

FILE = r"AlloFlowANTI.txt"

def main():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    fixes = 0

    # Fix 1: Add shrink-0 to the purchase button so it never compresses
    old_btn = "className={`w-full py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${"
    new_btn = "className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 ${"

    if old_btn in content:
        content = content.replace(old_btn, new_btn, 1)
        fixes += 1
        print("FIX 1: Added shrink-0 and increased padding on purchase button")
    else:
        print("FIX 1 WARNING: Button class not found")

    # Fix 2: Make card description flex-grow so button stays at bottom
    old_desc = '<p className="text-slate-500 text-xs leading-relaxed mb-4 min-h-[2.5em]">'
    new_desc = '<p className="text-slate-500 text-xs leading-relaxed mb-4 min-h-[2.5em] flex-1">'

    if old_desc in content:
        content = content.replace(old_desc, new_desc, 1)
        fixes += 1
        print("FIX 2: Added flex-1 to description for equal card heights")
    else:
        print("FIX 2 WARNING: Description class not found")

    # Fix 3: Ensure the inner content div uses flex-1 to push button down
    old_inner = '<div className="relative z-10">'
    # We need to be careful - this pattern may appear elsewhere
    # Only replace the one right after the icon/cost section in the shop
    # Let's use a more specific marker
    old_specific = """</div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-white font-bold text-lg mb-1 group-hover:text-indigo-300 transition-colors">"""
    new_specific = """</div>
                    </div>
                    <div className="relative z-10 flex flex-col flex-1">
                        <h3 className="text-white font-bold text-lg mb-1 group-hover:text-indigo-300 transition-colors">"""

    if old_specific in content:
        content = content.replace(old_specific, new_specific, 1)
        fixes += 1
        print("FIX 3: Made inner content div flex-col flex-1")
    else:
        print("FIX 3 WARNING: Inner div pattern not found, trying alternate")
        # Try without exact whitespace
        if '<div className="relative z-10">' in content:
            # Count occurrences; we want the one in AdventureShop
            idx = content.find('ADVENTURE_SHOP_ITEMS.map')
            if idx > 0:
                # Find the next occurrence of the pattern after the map
                inner_idx = content.find('<div className="relative z-10">', idx)
                if inner_idx > 0:
                    content = content[:inner_idx] + '<div className="relative z-10 flex flex-col flex-1">' + content[inner_idx + len('<div className="relative z-10">'):]
                    fixes += 1
                    print("FIX 3 (alt): Made inner content div flex-col flex-1")

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\nTotal fixes: {fixes}")

if __name__ == "__main__":
    main()
