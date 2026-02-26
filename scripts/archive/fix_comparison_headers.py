"""Fix comparison headers: derive dynamic titles from captions for left/right roles."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
lines = content.split('\n')
original_count = len(lines)
fixed = 0

# Find the role badge rendering block (around L1822-1829)
for i in range(len(lines)):
    if 'panel.role &&' in lines[i] and i > 1400 and i < 2000:
        print(f"  Found role block at L{i+1}")
        # Find the end of this block (</span>)
        end_i = None
        for j in range(i, min(i+10, len(lines))):
            if '</span>' in lines[j]:
                end_i = j
                break
        
        if end_i:
            # Replace the entire role block with smart titles
            indent = '                            '
            new_block = [
                indent + '{panel.role && (\r',
                indent + '    <span className="visual-panel-role" style={{ display: "block", textAlign: "center", fontWeight: 800 }}>\r',
                indent + "        {panel.role === 'before' ? '\u2B05\uFE0F Before' :\r",
                indent + "         panel.role === 'after' ? '\u27A1\uFE0F After' :\r",
                indent + "         panel.role === 'step' ? `Step ${panelIdx + 1}` :\r",
                indent + "         panel.role === 'left' || panel.role === 'right' ?\r",
                indent + "           (panel.caption ? panel.caption.replace(/\\*\\*(.+?)\\*\\*/g, '$1').split(/[.!?]/)[0].substring(0, 40) + (panel.caption.split(/[.!?]/)[0].length > 40 ? '...' : '') : `Panel ${panelIdx + 1}`) :\r",
                indent + "         panel.role}\r",
                indent + '    </span>\r',
                indent + ')}\r',
            ]
            lines[i:end_i+1] = new_block
            fixed += 1
            print(f"  [OK] Replaced role block L{i+1}-L{end_i+1} ({end_i-i+1} -> {len(new_block)} lines)")
            print(f"  Left/right now uses first sentence of caption as header")
        break

# Write
content = '\n'.join(lines)
new_count = len(content.split('\n'))
diff = new_count - original_count
print(f"\nLine count: {original_count} -> {new_count} (diff: {diff:+d})")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print(f"\nDone! {fixed} fixes applied.")
