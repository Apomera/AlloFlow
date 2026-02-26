import re
from pathlib import Path

INDEX_PATH = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\index.html")
SLIDES_PATH = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\architecture_slides_v2.html")

index_text = INDEX_PATH.read_text(encoding="utf-8")
slides_text = SLIDES_PATH.read_text(encoding="utf-8")

# Extract CSS from slides
css_match = re.search(r'<style>(.*?)</style>', slides_text, re.DOTALL)
css_content = css_match.group(1) if css_match else ""

# Extract Slider HTML
html_match = re.search(r'<div id="slider-container">(.*?)</div>\s*<script>', slides_text, re.DOTALL)
html_content = f'<div id="slider-container">{html_match.group(1)}</div>' if html_match else ""

# Extract Scripts
script_match = re.search(r'<script>\s*lucide\.createIcons\(\);\s*(const s = .*?)</script>', slides_text, re.DOTALL)
script_content = f'<script>\n{script_match.group(1)}</script>' if script_match else ""

if not html_content or not css_content or not script_content:
    print("Failed to extract content from architecture_slides_v2.html")
    print(f"CSS Found: {bool(css_content)}")
    print(f"HTML Found: {bool(html_content)}")
    print(f"Script Found: {bool(script_content)}")
    exit(1)

# Format the injection block
injection_block = f"""
                    <!-- Integrated Architecture Slider -->
                    <style>{css_content}</style>
{html_content}
{script_content}
"""

# Find the placeholder in index.html to replace
deck_start_pattern = r'<div class="card"\s*style="padding:0;overflow:hidden;border:1px solid #cbd5e1;display:flex;flex-direction:column">'
math_idx = re.search(deck_start_pattern, index_text)

if math_idx:
    start_pos = math_idx.start()
    
    # Find the end of this block
    end_pattern = '</div>\n                    </div>\n                </div>\n            </div>\n        </section>'
    end_pos = index_text.find(end_pattern, start_pos)
    
    if end_pos != -1:
        # We replace from start_pos to end_pos with our injection block
        new_index = index_text[:start_pos] + injection_block + index_text[end_pos:]
        INDEX_PATH.write_text(new_index, encoding="utf-8")
        print("✅ Replaced Slider Successfully.")
    else:
        # Maybe the end pattern is slightly different because of spacing
        # Let's try to just replace up to </div> </div> </div> </div> </section> ignoring whitespace
        print("❌ Could not find exact end pattern. Trying regex...")
        end_regex = re.compile(r'</div>\s*</div>\s*</div>\s*</div>\s*</section>')
        end_match = end_regex.search(index_text, start_pos)
        if end_match:
            new_index = index_text[:start_pos] + injection_block + index_text[end_match.start():]
            INDEX_PATH.write_text(new_index, encoding="utf-8")
            print("✅ Replaced Slider Successfully (via regex).")
        else:
            print("❌ Still failed to find end pattern.")
else:
    # Maybe it was already injected? Let's check if "Integrated Architecture Slider" exists
    if "<!-- Integrated Architecture Slider -->" in index_text:
        print("Slider might already be injected. Attempting to replace existing injected slider.")
        start_pattern = r'<!-- Integrated Architecture Slider -->'
        start_match = re.search(start_pattern, index_text)
        start_pos = start_match.start()
        
        end_pattern = r'</script>'
        # find the next </script> after the slider container
        container_start = index_text.find('id="slider-container"', start_pos)
        script_end_pos = index_text.find('</script>', container_start) + len('</script>')
        
        new_index = index_text[:start_pos] + injection_block + index_text[script_end_pos:]
        INDEX_PATH.write_text(new_index, encoding="utf-8")
        print("✅ Replaced Existing Slider Successfully.")
    else:
        print("❌ Could not find deck start pattern or existing slider.")
