filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# The structure is:
#   {isReviewingCharacters ? (
#       ...lobby...
#   ) : (hasSavedAdventure && !showNewGameSetup ? (
#       ...resume screen...
#   ) : (
#       ...new game setup...  
#       </div>   <- line 66289
#   )}           <- line 66290 - WRONG, needs ))}
#
# Line 66290's `)}` only closes one paren and the expression brace.
# But the ternary needs TWO closing parens: one for the `: (` on line 66049 
# and one for the outer `(hasSavedAdventure` on line 66023.
# So we need `))}` instead of `)}`.

# Target the specific pattern: the </div> + )} + </div> sequence near line 66290
old = """                                        </div>
                                     )}
                                 </div>"""

new = """                                        </div>
                                     ))}
                                 </div>"""

count = content.count(old)
if count == 1:
    content = content.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ Fixed: Changed `)}` to `))}` to close both the inner ternary and the outer {isReviewingCharacters} expression.")
elif count == 0:
    print("Pattern not found. Trying line-based approach...")
    lines = content.split('\n')
    # Find the line with just `)}` that's right after `</div>` and before `</div>`
    for i in range(len(lines)):
        stripped = lines[i].strip()
        if stripped == ')}' and i > 0 and i < len(lines) - 1:
            prev_stripped = lines[i-1].strip()
            next_stripped = lines[i+1].strip()
            if prev_stripped == '</div>' and next_stripped == '</div>':
                # Check we're in the adventure section (near line 66290)
                if i > 66200 and i < 66400:
                    lines[i] = lines[i].replace(')}', '))}')
                    print(f"✅ Fixed line {i+1}: Changed `)}}`  to `))}}` ")
                    content = '\n'.join(lines)
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)
                    break
    else:
        print("❌ Could not find the target line.")
else:
    print(f"⚠️ Found {count} matches, expected 1. Aborting to be safe.")
