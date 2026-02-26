import re
from pathlib import Path

index_path = Path(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\index.html')
v3_path = Path(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\architecture_slides_v3.html')

index_content = index_path.read_text(encoding='utf-8')
v3_content = v3_path.read_text(encoding='utf-8')

# Extract <style> ... </style>
style_match = re.search(r'(<style>.*?</style>)', v3_content, re.DOTALL)
# Extract <div id="slider-container"> ... </div>
slider_match = re.search(r'(<div id="slider-container">.*?</div>\s*<script>.*?</script>)', v3_content, re.DOTALL)

if not style_match or not slider_match:
    print("Failed to find style or slider container in V3.")
    exit(1)

v3_injection = style_match.group(1) + '\n' + slider_match.group(1)

# In index.html, the old block looks like:
# <style> ... </style> <div id="slider-container"> ... <footer> (well, up to </script> </div>)
# We can find <style> and <script>... </script></div>
old_block_match = re.search(r'<style>\s*\* \{.*?</script>\s*</div>', index_content, re.DOTALL)

if old_block_match:
    new_index = index_content[:old_block_match.start()] + v3_injection + "\n</div>" + index_content[old_block_match.end():]
    index_path.write_text(new_index, encoding='utf-8')
    print("Slider V3 Injected Successfully.")
else:
    print("Could not find the existing slider in index.html to replace.")
