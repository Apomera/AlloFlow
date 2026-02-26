"""Analyze styling footprint in AlloFlowANTI.txt"""
from pathlib import Path
import re

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"
c = SRC.read_text(encoding='utf-8')
total = len(c)

# Inline style objects: style={{...}}
inline_styles = re.findall(r'style=\{\{[^}]*\}\}', c)
inline_bytes = sum(len(s) for s in inline_styles)

# CSS-in-string: style="..."
css_strings = re.findall(r'style="[^"]*"', c)
css_string_bytes = sum(len(s) for s in css_strings)

# Static className="..."
classnames = re.findall(r'className="[^"]*"', c)
cn_bytes = sum(len(s) for s in classnames)

# Dynamic className={...}
dyn_cn = re.findall(r'className=\{[^}]+\}', c)
dyn_cn_bytes = sum(len(s) for s in dyn_cn)

# @keyframes
kf = re.findall(r'@keyframes[^}]+\}[^}]*\}', c)
kf_bytes = sum(len(s) for s in kf)

print(f"Total file: {total:,} bytes ({total/1024/1024:.1f} MB)")
print()
print(f"style={{{{...}}}}: {len(inline_styles):,} instances, {inline_bytes:,} bytes ({inline_bytes*100/total:.1f}%)")
print(f'style="...": {len(css_strings):,} instances, {css_string_bytes:,} bytes ({css_string_bytes*100/total:.1f}%)')
print(f'className="...": {len(classnames):,} instances, {cn_bytes:,} bytes ({cn_bytes*100/total:.1f}%)')
print(f"className={{...}}: {len(dyn_cn):,} instances, {dyn_cn_bytes:,} bytes ({dyn_cn_bytes*100/total:.1f}%)")
print(f"@keyframes: {len(kf):,} instances, {kf_bytes:,} bytes")
print()
styling_total = inline_bytes + css_string_bytes + cn_bytes + dyn_cn_bytes + kf_bytes
print(f"=== Total styling: ~{styling_total:,} bytes ({styling_total/1024:.0f} KB, {styling_total*100/total:.1f}%)")
extractable = inline_bytes + css_string_bytes
print(f"=== Extractable (inline styles only): ~{extractable:,} bytes ({extractable/1024:.0f} KB, {extractable*100/total:.1f}%)")
print(f"=== Tailwind classes (NOT extractable): ~{cn_bytes+dyn_cn_bytes:,} bytes ({(cn_bytes+dyn_cn_bytes)/1024:.0f} KB)")
