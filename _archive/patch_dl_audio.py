"""
Move the Download Audio button (line 62553) inside the 
isTeacherToolbarExpanded expandable div.

Currently:
  ...Copy Text button...
  </div>  <- expandable div closes (line 62539)
  </div>  <- teacher tools wrapper closes (line 62540)
  )}      <- isTeacherMode guard closes (line 62541 area)
  ...
  <button Download Audio... /> (line 62553)

After:
  ...Copy Text button...
  <button Download Audio... />   <- MOVED INSIDE expandable div
  </div>  <- expandable div closes
  </div>  <- teacher tools wrapper closes
  )}
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# The Download Audio button is this exact single line
dl_button_pattern = """<button onClick={() => handleDownloadAudio(generatedContent?.data, `leveled-text-${gradeLevel}`, 'dl-simplified-main')} disabled={downloadingContentId === 'dl-simplified-main'} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-all shadow-sm" data-help-key="simplified_download_audio">{downloadingContentId === 'dl-simplified-main' ? <RefreshCw size={14} className="animate-spin"/> : <Download size={14} />}{downloadingContentId === 'dl-simplified-main' ? t('common.downloading') : t('common.download_audio')}</button>"""

if dl_button_pattern not in content:
    print("FAILED: Download Audio button pattern not found")
    # Debug
    idx = content.find('dl-simplified-main')
    if idx >= 0:
        print(f"Found dl-simplified-main at char {idx}")
        print(repr(content[idx-50:idx+200]))
    exit()

# Step 1: Remove the button from its current location
# It's at line 62553 with leading whitespace
old_line = "                                " + dl_button_pattern
if old_line not in content:
    # Try with slightly less whitespace
    lines_list = content.split('\n')
    for i, line in enumerate(lines_list):
        if dl_button_pattern in line:
            old_line = line
            print(f"Found button at line {i+1} with indent: {repr(line[:40])}")
            break

# Step 2: The insertion point is right before the closing </div> of the expandable toolbar
# The Copy Text button ends before `</div>` at the expandable div level
# Current structure near line 62537-62539:
#     <Copy .../> {t('common.copy_text')}
#     </button>
#     </div>    <- this is the end of expandable toolbar div

insert_after = """                                <Copy size={14} /> {t('common.copy_text')}
                                            </button>
                                        </div>"""

insert_replacement = """                                <Copy size={14} /> {t('common.copy_text')}
                                            </button>
                                            """ + dl_button_pattern + """
                                        </div>"""

count_insert = content.count(insert_after)
if count_insert != 1:
    print(f"Insert point found {count_insert} times, expected 1")
    # Try alternate
    idx = content.find("common.copy_text")
    if idx >= 0:
        print(f"Found common.copy_text at char {idx}")
        snippet = content[idx:idx+200]
        print(repr(snippet))
    exit()

# Apply: insert the button, then remove from old location
content = content.replace(insert_after, insert_replacement, 1)

# Now remove the original standalone button line
# After insertion, the old button still exists at its original location
# It starts with whitespace and ends with </button>
# The original pattern is on a line by itself
old_standalone = "\n                                " + dl_button_pattern
if old_standalone in content:
    # Only remove the SECOND occurrence (the one we didn't just insert)
    first_idx = content.find(dl_button_pattern)
    second_idx = content.find(dl_button_pattern, first_idx + len(dl_button_pattern))
    if second_idx > 0:
        # Find the start of the line
        line_start = content.rfind('\n', 0, second_idx)
        # Find the end of the line 
        line_end = content.find('\n', second_idx)
        if line_end > 0:
            content = content[:line_start] + content[line_end:]
            print("Removed standalone button from original location")
        else:
            print("WARNING: Could not find line end for original button")
    else:
        print("WARNING: Second occurrence not found, removing might not be needed")
else:
    print("WARNING: Old standalone pattern not found, might already be removed")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: Moved Download Audio button inside the Teacher Tools expandable toolbar")
