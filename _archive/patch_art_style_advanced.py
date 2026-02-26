"""
Comprehensive patch: Art Style dropdown + Advanced Settings collapsible + Blueprint config expansion.

Targets:
1. ADV_INITIAL_STATE: Add adventureArtStyle + adventureCustomArtStyle fields
2. advState destructuring: Add new fields
3. Setter: Add setAdventureArtStyle + setAdventureCustomArtStyle
4. generateAdventureImage: Wire art style into Imagen prompt
5. Portrait generation: Wire art style into portrait prompt
6. Left panel: Wrap Low Quality + Cloud Storage in Advanced Settings collapsible, add Art Style dropdown
7. Full setup modal: Add Art Style dropdown
8. Blueprint config: Expand adventureConfig handler
9. useCallback deps: Add adventureArtStyle
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
outpath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\diag_output.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0
lines = []

# ============================================================
# PATCH 1: Add adventureArtStyle to ADV_INITIAL_STATE
# ============================================================
old_initial = '  adventureConsistentCharacters: false,\n};'
new_initial = '  adventureConsistentCharacters: false,\n  adventureArtStyle: \'auto\',\n  adventureCustomArtStyle: \'\',\n};'

if old_initial in content:
    content = content.replace(old_initial, new_initial, 1)
    fixes += 1
    lines.append("1. Added adventureArtStyle + adventureCustomArtStyle to ADV_INITIAL_STATE")
else:
    lines.append("1. SKIP - ADV_INITIAL_STATE pattern not found")

# ============================================================
# PATCH 2: Add to advState destructuring
# ============================================================
old_destruct = 'adventureConsistentCharacters } = advState;'
new_destruct = 'adventureConsistentCharacters, adventureArtStyle, adventureCustomArtStyle } = advState;'

if old_destruct in content:
    content = content.replace(old_destruct, new_destruct, 1)
    fixes += 1
    lines.append("2. Added adventureArtStyle to advState destructuring")
else:
    lines.append("2. SKIP - destruct pattern not found")

# ============================================================
# PATCH 3: Add setters (after setAdventureConsistentCharacters)
# ============================================================
old_setter = "const setAdventureConsistentCharacters = (v) => advDispatch({ type: 'ADV_SET', field: 'adventureConsistentCharacters', value: v });"
new_setter = """const setAdventureConsistentCharacters = (v) => advDispatch({ type: 'ADV_SET', field: 'adventureConsistentCharacters', value: v });
  const setAdventureArtStyle = (v) => advDispatch({ type: 'ADV_SET', field: 'adventureArtStyle', value: v });
  const setAdventureCustomArtStyle = (v) => advDispatch({ type: 'ADV_SET', field: 'adventureCustomArtStyle', value: v });"""

if old_setter in content:
    content = content.replace(old_setter, new_setter, 1)
    fixes += 1
    lines.append("3. Added setAdventureArtStyle + setAdventureCustomArtStyle setters")
else:
    lines.append("3. SKIP - setter pattern not found")

# ============================================================
# PATCH 4: Wire art style into generateAdventureImage
# Replace the hardcoded styleDescription block
# ============================================================
old_style = '''const isSocialMode = adventureInputMode === 'social_story' || (adventureState?.meta?.includes('Social Story'));
          let styleDescription = "Educational adventure game. High quality, immersive environment.";
          if (isAdventureStoryMode || isSocialMode) {
              styleDescription = "Storybook illustration. Whimsical, soft lighting, family-friendly digital painting. Vibrant and inviting.";
          }'''

new_style = '''const isSocialMode = adventureInputMode === 'social_story' || (adventureState?.meta?.includes('Social Story'));
          const ART_STYLE_MAP = {
              'auto': null,
              'storybook': 'Soft watercolor storybook illustration, rounded shapes, warm palette, family-friendly, whimsical',
              'pixel': '16-bit pixel art retro game style, vibrant colors, clean sprites, nostalgic',
              'cinematic': 'Cinematic digital painting, dramatic lighting, widescreen composition, photorealistic',
              'anime': 'Anime-style illustration, clean linework, expressive characters, vibrant colors, manga-inspired',
              'crayon': "Children's hand-drawn crayon illustration, simple and colorful, playful, sketchy lines",
          };
          let styleDescription;
          if (adventureArtStyle && adventureArtStyle !== 'auto') {
              if (adventureArtStyle === 'custom' && adventureCustomArtStyle) {
                  styleDescription = adventureCustomArtStyle;
              } else {
                  styleDescription = ART_STYLE_MAP[adventureArtStyle] || "Educational adventure game. High quality, immersive environment.";
              }
          } else if (isAdventureStoryMode || isSocialMode) {
              styleDescription = "Storybook illustration. Whimsical, soft lighting, family-friendly digital painting. Vibrant and inviting.";
          } else {
              styleDescription = "Educational adventure game. High quality, immersive environment.";
          }'''

if old_style in content:
    content = content.replace(old_style, new_style, 1)
    fixes += 1
    lines.append("4. Wired art style into generateAdventureImage")
else:
    lines.append("4. SKIP - style block not found")

# ============================================================
# PATCH 5: Wire art style into portrait generation prompt
# ============================================================
old_portrait = "const prompt = `Character portrait: ${char.name}, ${char.role}. ${char.appearance || 'fantasy character'}. Bust portrait, centered face, soft lighting, detailed, no text, no labels. Digital painting style.`;"

new_portrait = """const portraitStyleMap = {
                                'auto': 'Digital painting style',
                                'storybook': 'Soft watercolor storybook style',
                                'pixel': '16-bit pixel art retro game style',
                                'cinematic': 'Cinematic digital painting, dramatic lighting',
                                'anime': 'Anime-style illustration, clean linework',
                                'crayon': "Children's crayon hand-drawn style",
                            };
                                const portraitStyle = adventureArtStyle === 'custom' && adventureCustomArtStyle ? adventureCustomArtStyle : (portraitStyleMap[adventureArtStyle] || 'Digital painting style');
                                const prompt = `Character portrait: ${char.name}, ${char.role}. ${char.appearance || 'fantasy character'}. Bust portrait, centered face, soft lighting, detailed, no text, no labels. ${portraitStyle}.`;"""

if old_portrait in content:
    content = content.replace(old_portrait, new_portrait, 1)
    fixes += 1
    lines.append("5. Wired art style into portrait generation")
else:
    lines.append("5. SKIP - portrait prompt pattern not found")

# ============================================================
# PATCH 6: Left panel — Wrap Low Quality + Cloud Storage in Advanced Settings collapsible
# Add Art Style dropdown inside it
# ============================================================

# The block we want to wrap starts at the Low Quality div and includes Cloud Storage.
# We'll wrap them in a details/summary.

old_left_low = '''                            <div className="flex items-center gap-2 bg-purple-100/50 p-2 rounded border border-purple-200" data-help-key="adventure_low_quality">
                                <input aria-label={t('common.toggle_use_low_quality_visuals')}
                                    id="advLowQuality"
                                    type="checkbox"
                                    data-help-key="adventure_setup_chk_lowqual" checked={useLowQualityVisuals}
                                    onChange={(e) => setUseLowQualityVisuals(e.target.checked)}
                                    className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
                                />
                                <label htmlFor="advLowQuality" className="text-xs font-bold text-purple-800 cursor-pointer select-none flex items-center gap-2">
                                    <MonitorPlay size={14} className="text-purple-600"/> {t('adventure.low_quality_label')}
                                    <span className="text-[9px] font-normal opacity-70">{t('adventure.low_quality_desc')}</span>
                                </label>
                            </div>'''

new_left_low = '''                            <details className="group/adv-settings">
                                <summary className="flex items-center gap-2 bg-slate-100/50 p-2 rounded border border-slate-200 cursor-pointer select-none hover:bg-slate-100 transition-colors list-none">
                                    <Settings size={14} className="text-slate-500"/>
                                    <span className="text-xs font-bold text-slate-600">⚙️ {t('adventure.advanced_settings') || 'Advanced Settings'}</span>
                                    <ChevronDown size={12} className="text-slate-400 ml-auto transition-transform group-open/adv-settings:rotate-180"/>
                                </summary>
                                <div className="mt-1.5 space-y-1.5 pl-1 animate-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center gap-2 bg-indigo-100/50 p-2 rounded border border-indigo-200" data-help-key="adventure_art_style">
                                        <label htmlFor="advArtStyle" className="text-xs font-bold text-indigo-800 cursor-pointer select-none flex items-center gap-2 whitespace-nowrap">
                                            🎨 {t('adventure.art_style_label') || 'Art Style'}
                                        </label>
                                        <select id="advArtStyle" value={adventureArtStyle} onChange={(e) => setAdventureArtStyle(e.target.value)} className="flex-1 text-xs px-2 py-1 border border-indigo-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer">
                                            <option value="auto">🎨 {t('adventure.art_auto') || 'Auto (default)'}</option>
                                            <option value="storybook">📚 {t('adventure.art_storybook') || 'Storybook'}</option>
                                            <option value="pixel">🎮 {t('adventure.art_pixel') || 'Pixel Art'}</option>
                                            <option value="cinematic">🎬 {t('adventure.art_cinematic') || 'Cinematic'}</option>
                                            <option value="anime">🎨 {t('adventure.art_anime') || 'Anime'}</option>
                                            <option value="crayon">🖍️ {t('adventure.art_crayon') || 'Hand-drawn'}</option>
                                            <option value="custom">✏️ {t('adventure.art_custom') || 'Custom...'}</option>
                                        </select>
                                    </div>
                                    {adventureArtStyle === 'custom' && (
                                        <input type="text" value={adventureCustomArtStyle} onChange={(e) => setAdventureCustomArtStyle(e.target.value)} placeholder={t('adventure.custom_art_style_placeholder') || 'Describe your art style...'} className="w-full text-xs px-3 py-1.5 border border-indigo-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"/>
                                    )}
                                    <div className="flex items-center gap-2 bg-purple-100/50 p-2 rounded border border-purple-200" data-help-key="adventure_low_quality">
                                        <input aria-label={t('common.toggle_use_low_quality_visuals')}
                                            id="advLowQuality"
                                            type="checkbox"
                                            data-help-key="adventure_setup_chk_lowqual" checked={useLowQualityVisuals}
                                            onChange={(e) => setUseLowQualityVisuals(e.target.checked)}
                                            className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
                                        />
                                        <label htmlFor="advLowQuality" className="text-xs font-bold text-purple-800 cursor-pointer select-none flex items-center gap-2">
                                            <MonitorPlay size={14} className="text-purple-600"/> {t('adventure.low_quality_label')}
                                            <span className="text-[9px] font-normal opacity-70">{t('adventure.low_quality_desc')}</span>
                                        </label>
                                    </div>'''

if old_left_low in content:
    content = content.replace(old_left_low, new_left_low, 1)
    fixes += 1
    lines.append("6. Wrapped left-panel Low Quality in Advanced Settings + added Art Style dropdown")
else:
    lines.append("6. SKIP - left low quality pattern not found")

# Close the details element after the Cloud Storage section
# Find the closing of the cloud storage section and add closing tags
old_cloud_close = '''                                <label htmlFor="advCloudStorage" className="text-xs font-bold text-green-800 cursor-pointer select-none flex items-center gap-2">
                                    <Cloud size={14} className="text-green-600"/> {t('adventure.cloud_storage_label')}
                                    <span className="text-[9px] font-normal opacity-70">{t('adventure.cloud_storage_desc')}</span>
                                </label>
                            </div>'''

new_cloud_close = '''                                <label htmlFor="advCloudStorage" className="text-xs font-bold text-green-800 cursor-pointer select-none flex items-center gap-2">
                                    <Cloud size={14} className="text-green-600"/> {t('adventure.cloud_storage_label')}
                                    <span className="text-[9px] font-normal opacity-70">{t('adventure.cloud_storage_desc')}</span>
                                </label>
                            </div>
                                </div>
                            </details>'''

# But the cloud storage has a conditional wrapper, so we need to handle the case where
# cloud storage is shown and where it's not. The closing `)}` is after cloud storage div.
# Let me look for the pattern with the conditional closing
old_cloud_end = '''                                    <span className="text-[9px] font-normal opacity-70">{t('adventure.cloud_storage_desc')}</span>
                                </label>
                            </div>
                            )}'''

new_cloud_end = '''                                    <span className="text-[9px] font-normal opacity-70">{t('adventure.cloud_storage_desc')}</span>
                                </label>
                            </div>
                            )}
                                </div>
                            </details>'''

if old_cloud_end in content:
    content = content.replace(old_cloud_end, new_cloud_end, 1)
    fixes += 1
    lines.append("7. Closed Advanced Settings details element after Cloud Storage")
else:
    lines.append("7. SKIP - cloud end pattern not found")

# ============================================================
# PATCH 8: Full setup modal — Add Art Style dropdown
# Add it after the Consistent Characters label in the full modal
# ============================================================

old_modal_after_cc = '''                                                                    <span className="block text-[10px] text-slate-500 opacity-80">{t('adventure.consistent_characters_desc') || 'Persistent visual cast across scenes'}</span>
                                                                </div>
                                                            </label>
                                                            <label className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${useLowQualityVisuals'''

new_modal_after_cc = '''                                                                    <span className="block text-[10px] text-slate-500 opacity-80">{t('adventure.consistent_characters_desc') || 'Persistent visual cast across scenes'}</span>
                                                                </div>
                                                            </label>
                                                            <div className="flex items-center gap-3 p-2 rounded-lg border border-indigo-100 bg-indigo-50/50">
                                                                <div className="flex-1">
                                                                    <span className="block text-xs font-bold text-slate-700">🎨 {t('adventure.art_style_label') || 'Art Style'}</span>
                                                                    <select value={adventureArtStyle} onChange={(e) => setAdventureArtStyle(e.target.value)} className="mt-1 w-full text-xs px-2 py-1 border border-indigo-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer">
                                                                        <option value="auto">🎨 {t('adventure.art_auto') || 'Auto (default)'}</option>
                                                                        <option value="storybook">📚 {t('adventure.art_storybook') || 'Storybook'}</option>
                                                                        <option value="pixel">🎮 {t('adventure.art_pixel') || 'Pixel Art'}</option>
                                                                        <option value="cinematic">🎬 {t('adventure.art_cinematic') || 'Cinematic'}</option>
                                                                        <option value="anime">🎨 {t('adventure.art_anime') || 'Anime'}</option>
                                                                        <option value="crayon">🖍️ {t('adventure.art_crayon') || 'Hand-drawn'}</option>
                                                                        <option value="custom">✏️ {t('adventure.art_custom') || 'Custom...'}</option>
                                                                    </select>
                                                                    {adventureArtStyle === 'custom' && (
                                                                        <input type="text" value={adventureCustomArtStyle} onChange={(e) => setAdventureCustomArtStyle(e.target.value)} placeholder={t('adventure.custom_art_style_placeholder') || 'Describe your art style...'} className="mt-1 w-full text-xs px-2 py-1 border border-indigo-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"/>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <label className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${useLowQualityVisuals'''

if old_modal_after_cc in content:
    content = content.replace(old_modal_after_cc, new_modal_after_cc, 1)
    fixes += 1
    lines.append("8. Added Art Style dropdown to full setup modal")
else:
    lines.append("8. SKIP - modal CC pattern not found")

# ============================================================
# PATCH 9: Expand Blueprint adventureConfig handler
# ============================================================
old_blueprint = '''if (config.adventureConfig) {
        if (config.adventureConfig.mode) setAdventureInputMode(config.adventureConfig.mode);
        if (config.adventureConfig.theme) setAdventureCustomInstructions(`Theme: ${config.adventureConfig.theme}`);
    }'''

new_blueprint = '''if (config.adventureConfig) {
        if (config.adventureConfig.mode) setAdventureInputMode(config.adventureConfig.mode);
        if (config.adventureConfig.theme) setAdventureCustomInstructions(`Theme: ${config.adventureConfig.theme}`);
        if (config.adventureConfig.storyMode !== undefined) setIsAdventureStoryMode(config.adventureConfig.storyMode);
        if (config.adventureConfig.chanceMode !== undefined) setAdventureChanceMode(config.adventureConfig.chanceMode);
        if (config.adventureConfig.consistentCharacters !== undefined) setAdventureConsistentCharacters(config.adventureConfig.consistentCharacters);
        if (config.adventureConfig.artStyle) setAdventureArtStyle(config.adventureConfig.artStyle);
        if (config.adventureConfig.customArtStyle) setAdventureCustomArtStyle(config.adventureConfig.customArtStyle);
        if (config.adventureConfig.language) setAdventureLanguageMode(config.adventureConfig.language);
        if (config.adventureConfig.difficulty) setAdventureDifficulty(config.adventureConfig.difficulty);
        if (config.adventureConfig.freeResponse !== undefined) setAdventureFreeResponseEnabled(config.adventureConfig.freeResponse);
        // Cloud storage intentionally excluded (FERPA)
    }'''

if old_blueprint in content:
    content = content.replace(old_blueprint, new_blueprint, 1)
    fixes += 1
    lines.append("9. Expanded Blueprint adventureConfig handler")
else:
    lines.append("9. SKIP - blueprint pattern not found")

# ============================================================
# PATCH 10: Add adventureArtStyle to generateAdventureImage useCallback deps
# ============================================================
old_deps = 'adventureConsistentCharacters, adventureState.characters]);'
new_deps = 'adventureConsistentCharacters, adventureState.characters, adventureArtStyle, adventureCustomArtStyle]);'

if old_deps in content:
    content = content.replace(old_deps, new_deps, 1)
    fixes += 1
    lines.append("10. Added adventureArtStyle to generateAdventureImage deps")
else:
    lines.append("10. SKIP - deps pattern not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

with open(outpath, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f"Applied {fixes}/10 patches. See diag_output.txt")
