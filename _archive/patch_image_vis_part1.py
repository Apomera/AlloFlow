
import os

file_path = "c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt"

def patch_part1():
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. ADD STATE TO GENERATOR
    # Find: const [imageTheme, setImageTheme] = React.useState('');
    # Add: const [imageVisibility, setImageVisibility] = React.useState('after_response'); 
    search_state = "const [imageTheme, setImageTheme] = React.useState('');"
    replace_state = """const [imageTheme, setImageTheme] = React.useState('');
        const [imageVisibility, setImageVisibility] = React.useState('after_response');"""
    
    if search_state in content:
        content = content.replace(search_state, replace_state)
        print("1. Added State")
    else:
        print("Warning: State anchor not found")

    # 2. ADD UI TO GENERATOR
    # Anchor: The closing div of the 'Image Theme' block. 
    # Logic: Search for `value={imageTheme}` then find the next `</div>` which closes that input group (lines 1576-1589).
    # Then insert the new block.
    
    idx_theme = content.find('value={imageTheme}')
    if idx_theme != -1:
        # Find next </div>
        idx_div = content.find('</div>', idx_theme)
        if idx_div != -1:
            idx_insert = idx_div + 6 # After </div>
            
            new_ui = """
                                
                                {/* Image Visibility Settings */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-700">{t('word_sounds.image_visibility', 'Image Visibility')}</span>
                                        <Eye size={18} className="text-purple-500" />
                                    </div>
                                    <select 
                                        value={imageVisibility} 
                                        onChange={(e) => setImageVisibility(e.target.value)}
                                        className="w-full p-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-purple-400 outline-none bg-white"
                                    >
                                        <option value="after_response">{t('ws.vis.after', 'Show After Response (Default)')}</option>
                                        <option value="never">{t('ws.vis.never', 'Never Show (Pure Phonemic)')}</option>
                                        <option value="progressive">{t('ws.vis.progressive', 'Progressive Reveal (On Retry)')}</option>
                                        <option value="always">{t('ws.vis.always', 'Always Show')}</option>
                                    </select>
                                    <p className="text-xs text-slate-500 mt-2">
                                        {imageVisibility === 'never' && "Images hidden to urge auditory focus."}
                                        {imageVisibility === 'after_response' && "Images reveal after correct answer."}
                                        {imageVisibility === 'progressive' && "Images reveal if student struggles."}
                                        {imageVisibility === 'always' && "Images visible for full support."}
                                    </p>
                                </div>"""
                                
            content = content[:idx_insert] + new_ui + content[idx_insert:]
            print("2. Added UI Dropdown")
        else:
            print("Warning: Closing div for UI not found")
    else:
        print("Warning: UI anchor not found")

    # 3. PASS TO onStartGame (Generator side)
    # Find: onStartGame(processed, sequence, lessonPlanConfig, configSummary);
    # Replace: onStartGame(processed, sequence, lessonPlanConfig, configSummary, { imageVisibility });
    
    # We need to reuse the find logic but handle potential whitespace differences.
    # The call is at line 1426.
    
    search_call = "onStartGame(processed, sequence, lessonPlanConfig, configSummary);"
    replace_call = "onStartGame(processed, sequence, lessonPlanConfig, configSummary, { imageVisibility });"
    
    if search_call in content:
        content = content.replace(search_call, replace_call)
        print("3. Updated Generator Call")
    else:
        # Try finding simpler match
        if "onStartGame(processed, sequence" in content:
             print("Warning: Exact call match failed. Searching stricter...")
             # ... implementation left simple for now
             
    # 4. RECEIVE IN Main App (Callback)
    # Line 70971
    search_cb = "onStartGame={(words, sequence, lessonPlanConfig, configSummary) => {"
    replace_cb = "onStartGame={(words, sequence, lessonPlanConfig, configSummary, extraConfig) => {"
    
    if search_cb in content:
        content = content.replace(search_cb, replace_cb)
        print("4. Updated Main Callback Signature")
        
        # 5. Extract and Store in Resource
        # Find: const resourceId = ...
        # Add: const imageVisibility = extraConfig?.imageVisibility || 'after_response';
        
        idx_res = content.find("const resourceId = `ws-${Date.now()}`;")
        if idx_res != -1:
            insertion_res = "\n                   const imageVisibility = extraConfig?.imageVisibility || 'after_response';"
            content = content[:idx_res + len("const resourceId = `ws-${Date.now()}`;")] + insertion_res + content[idx_res + len("const resourceId = `ws-${Date.now()}`;"):]
            print("5. Extracted Config in Callback")
            
            # 6. Add to Resource Object
            # Find: lessonPlanConfig: lessonPlanConfig || null,
            # (Line 70981)
            search_obj = "lessonPlanConfig: lessonPlanConfig || null,"
            replace_obj = """lessonPlanConfig: lessonPlanConfig || null,
                       imageVisibility: imageVisibility,"""
            # Use replace count=1 to targeted area if possible, but distinct enough string.
            content = content.replace(search_obj, replace_obj)
            print("6. Stored in Resource Object")
        else:
            print("Warning: Resource ID anchor not found")

    # 7. PASS TO MODAL
    # Line 64530 area.
    # Anchor: lessonPlanConfig={generatedContent?.lessonPlanConfig}
    search_prop = "lessonPlanConfig={generatedContent?.lessonPlanConfig}"
    replace_prop = """imageVisibility={generatedContent?.imageVisibility || 'after_response'}
                                lessonPlanConfig={generatedContent?.lessonPlanConfig}"""
                                
    if search_prop in content:
        content = content.replace(search_prop, replace_prop)
        print("7. Passed Prop to Modal")
    else:
        print("Warning: Modal Prop anchor not found")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Part 1 Complete")

if __name__ == "__main__":
    patch_part1()
