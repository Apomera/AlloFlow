"""
Consistent Characters Enhancement - Full Implementation Patch
Applies 7 changes:
1. Multi-character prompt templates (opening scene prompts)
2. Character manifest injection into continuation prompts
3. charactersInScene field in continuation JSON response
4. Character-aware generateAdventureImage
5. NanoBanana character consistency pass + callGeminiImageEdit reference image support
6. Persist characters in adventure save snapshots
7. Narrative Ledger character tracking
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# ============================================================
# 1. Multi-character prompt template: SYSTEM SIMULATION
# ============================================================
old_sys_char = '''${adventureConsistentCharacters ? `,
              "characters": [{"name": "Character Name", "role": "Their role", "appearance": "Brief visual description"}]` : ''}
            }
          `;'''

new_sys_char = '''${adventureConsistentCharacters ? `,
              "characters": [
                {"name": "Protagonist Name", "role": "Protagonist", "appearance": "Age, hair color, clothing, distinguishing features"},
                {"name": "Advisor Name", "role": "Mentor/Advisor", "appearance": "Age, hair, clothing, distinguishing traits"},
                {"name": "Rival or Obstacle", "role": "Antagonist", "appearance": "Distinguishing visual traits"}
              ]` : ''}
            }
            ${adventureConsistentCharacters ? `CHARACTERS: Generate 2-4 named characters with distinct visual appearances.
              - ALWAYS include the Protagonist (the student's in-story character).
              - Include at least one supporting character (mentor, companion, rival, or antagonist).
              - Each character MUST have a unique, detailed visual description (hair, clothing, build, distinguishing features) for image generation consistency.` : ''}
          `;'''

if old_sys_char in content:
    content = content.replace(old_sys_char, new_sys_char, 1)
    fixes += 1
    print("1. ✅ Updated system simulation prompt with multi-character template")
else:
    print("1. ❌ SKIP - system simulation character prompt not found")

# ============================================================
# 2. Multi-character prompt template: STANDARD RPG
# ============================================================
old_rpg_char = '''${adventureConsistentCharacters ? `,
              "characters": [{"name": "Character Name", "role": "Their role in the story", "appearance": "Brief visual description: hair color, clothing, distinguishing features"}]` : ''}
            }
          `;'''

new_rpg_char = '''${adventureConsistentCharacters ? `,
              "characters": [
                {"name": "Protagonist Name", "role": "Protagonist", "appearance": "Age, hair color, clothing, distinguishing features"},
                {"name": "Supporting Character", "role": "Companion/Mentor", "appearance": "Age, hair, clothing, distinguishing traits"},
                {"name": "Third Character", "role": "Antagonist/Rival", "appearance": "Distinguishing visual traits"}
              ]` : ''}
            }
            ${adventureConsistentCharacters ? `CHARACTERS: Generate 2-4 named characters with distinct visual appearances.
              - ALWAYS include the Protagonist (the student's in-story character).
              - Include at least one supporting character (mentor, companion, rival, or antagonist).
              - Each character MUST have a unique, detailed visual description (hair, clothing, build, distinguishing features) for image generation consistency.` : ''}
          `;'''

if old_rpg_char in content:
    content = content.replace(old_rpg_char, new_rpg_char, 1)
    fixes += 1
    print("2. ✅ Updated standard RPG prompt with multi-character template")
else:
    print("2. ❌ SKIP - standard RPG character prompt not found")

# ============================================================
# 3. Inject character manifest into STANDARD RPG continuation prompt
# ============================================================
old_continuation_rpg = '''          } else {
              prompt = `
                You are a Dungeon Master.
                ${historyContext}
                ${INVISIBLE_NARRATOR_INSTRUCTIONS}
                Source Material: "${sourceText.substring(0, 1500)}..."
                Current Scenario: "${adventureState.currentScene?.text}",
                --- USER INPUT START ---
                Student's Action: "${currentInput}"
                --- USER INPUT END ---
                ${ADVENTURE_GUARDRAIL}
                Inventory: [${currentInventoryNames}]
                Energy: ${adventureState.energy}/100
                ${langInstruction}
                ${adventureCustomInstructions ? `Custom Instructions: ${adventureCustomInstructions}` : ''}
                ${socialStoryInstruction}
                ${mechanicsInstruction}
                ${optionsInstruction}'''

new_continuation_rpg = '''          } else {
              let characterManifest = '';
              if (adventureConsistentCharacters && adventureState.characters?.length > 0) {
                  const charList = adventureState.characters.map(c =>
                      `- "${c.name}" (${c.role}): ${c.appearance}`
                  ).join('\\n');
                  characterManifest = `
--- CONSISTENT CAST ---
${charList}
INSTRUCTIONS: Refer to these characters by name. Keep their descriptions consistent.
Return "charactersInScene": ["Name1", "Name2"] listing ONLY the characters visually present in this scene.
The Protagonist should appear in most scenes unless it is a cutaway.
Do NOT force all characters into every scene — let the narrative decide naturally.
`;
              }
              prompt = `
                You are a Dungeon Master.
                ${historyContext}
                ${INVISIBLE_NARRATOR_INSTRUCTIONS}
                Source Material: "${sourceText.substring(0, 1500)}..."
                Current Scenario: "${adventureState.currentScene?.text}",
                ${characterManifest}
                --- USER INPUT START ---
                Student's Action: "${currentInput}"
                --- USER INPUT END ---
                ${ADVENTURE_GUARDRAIL}
                Inventory: [${currentInventoryNames}]
                Energy: ${adventureState.energy}/100
                ${langInstruction}
                ${adventureCustomInstructions ? `Custom Instructions: ${adventureCustomInstructions}` : ''}
                ${socialStoryInstruction}
                ${mechanicsInstruction}
                ${optionsInstruction}'''

if old_continuation_rpg in content:
    content = content.replace(old_continuation_rpg, new_continuation_rpg, 1)
    fixes += 1
    print("3. ✅ Injected character manifest into standard RPG continuation prompt")
else:
    print("3. ❌ SKIP - standard RPG continuation prompt not found")

# ============================================================
# 4. Add charactersInScene to continuation JSON response
# ============================================================
old_continuation_json = '''                    "scene": { "text": "Outcome...", "options": ${isLastTurn ? "[]" : jsonOptionsExample} },
                    "soundParams": {
                        "atmosphere": "One of: Tense, Calm, Ethereal, Dark, Joyful",
                        "element": "One of: Fire, Water, Wind, Machinery, Nature, Silence"
                    }
                }
              `;'''

new_continuation_json = '''                    "scene": { "text": "Outcome...", "options": ${isLastTurn ? "[]" : jsonOptionsExample} },
                    "soundParams": {
                        "atmosphere": "One of: Tense, Calm, Ethereal, Dark, Joyful",
                        "element": "One of: Fire, Water, Wind, Machinery, Nature, Silence"
                    }${adventureConsistentCharacters && adventureState.characters?.length > 0 ? `,
                    "charactersInScene": ["Protagonist Name", "Other Character Present"]` : ''}
                }
              `;'''

if old_continuation_json in content:
    content = content.replace(old_continuation_json, new_continuation_json, 1)
    fixes += 1
    print("4. ✅ Added charactersInScene to continuation JSON response")
else:
    print("4. ❌ SKIP - continuation JSON response pattern not found")

# ============================================================
# 5. Enhance generateAdventureImage with character-aware prompts
#    Replace the characterContext building logic
# ============================================================
old_char_context = '''          let characterContext = "";
          const isCreature = /animal|creature|dragon|alien|robot|monster|fox|cat|dog|dinosaur/i.test(adventureCustomInstructions || "");
          if (!isCreature) {
             const gradeMap = {
                 'Kindergarten': '5 year old child', '1st Grade': '6 year old child', '2nd Grade': '7 year old child',
                 '3rd Grade': '8 year old child', '4th Grade': '9 year old child', '5th Grade': '10 year old child',
                 '6th Grade': '11 year old child', '7th Grade': '12 year old child', '8th Grade': '13 year old teen',
                 '9th Grade': '14 year old teen', '10th Grade': '15 year old teen', '11th Grade': '16 year old teen',
                 '12th Grade': '17 year old teen', 'Higher Ed': 'young adult student', 'Adult': 'adult professional',
             };
             const ageDesc = gradeMap[gradeLevel] || 'student';
             const storedAppearance = adventureState.characterAppearance;
             if (storedAppearance) {
                 characterContext = `Main character: ${storedAppearance}. `;
             } else {
                 const hairOptions = ['brown hair', 'black hair', 'blonde hair', 'red hair'];
                 const outfitOptions = ['casual clothes', 'adventure outfit', 'school uniform', 'colorful attire'];
                 const randomHair = hairOptions[Math.floor(Math.random() * hairOptions.length)];
                 const randomOutfit = outfitOptions[Math.floor(Math.random() * outfitOptions.length)];
                 const generatedAppearance = `${ageDesc} with ${randomHair}, wearing ${randomOutfit}, friendly expression`;
                 setAdventureState(prev => ({ ...prev, characterAppearance: generatedAppearance }));
                 characterContext = `Main character: ${generatedAppearance}. `;
             }
          } else {
             const storedAppearance = adventureState.characterAppearance;
             if (storedAppearance) {
                 characterContext = `Main character: ${storedAppearance}. `;
             } else {
                 const creatureMatch = (adventureCustomInstructions || "").match(/(?:a|an|the)?\\s*([\\w\\s]+(?:dragon|fox|cat|dog|robot|alien|creature|monster|dinosaur|animal|bird|wolf|bear|owl|bunny|rabbit))/i);
                 let creatureType = creatureMatch ? creatureMatch[1].trim() : 'friendly creature';
                 const colorOptions = ['golden', 'silver', 'emerald green', 'sapphire blue', 'sunset orange', 'midnight black', 'snow white'];
                 const featureOptions = ['bright curious eyes', 'a fluffy appearance', 'sleek shiny fur', 'colorful markings', 'a gentle demeanor'];
                 const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
                 const randomFeature = featureOptions[Math.floor(Math.random() * featureOptions.length)];
                 const generatedAppearance = `${randomColor} ${creatureType} with ${randomFeature}`;
                 setAdventureState(prev => ({ ...prev, characterAppearance: generatedAppearance }));
                 characterContext = `Main character: ${generatedAppearance}. `;
             }
          }'''

new_char_context = '''          let characterContext = "";
          if (adventureConsistentCharacters && adventureState.characters?.length > 0) {
              // Character-aware context: use stored cast descriptions
              const sceneChars = adventureState.currentScene?.charactersInScene;
              let relevantChars;
              if (sceneChars && Array.isArray(sceneChars) && sceneChars.length > 0) {
                  relevantChars = adventureState.characters.filter(c =>
                      sceneChars.some(name => c.name.toLowerCase() === name.toLowerCase())
                  );
                  if (relevantChars.length === 0) relevantChars = [adventureState.characters[0]];
              } else {
                  // Fallback: protagonist only
                  relevantChars = adventureState.characters.filter(c =>
                      c.role?.toLowerCase().includes('protagonist') ||
                      c.role?.toLowerCase().includes('player')
                  );
                  if (relevantChars.length === 0) relevantChars = [adventureState.characters[0]];
              }
              characterContext = relevantChars.map(c =>
                  `${c.name} (${c.role}): ${c.appearance}`
              ).join('. ') + '. ';
          } else {
              // Default logic: random appearance generation
              const isCreature = /animal|creature|dragon|alien|robot|monster|fox|cat|dog|dinosaur/i.test(adventureCustomInstructions || "");
              if (!isCreature) {
                 const gradeMap = {
                     'Kindergarten': '5 year old child', '1st Grade': '6 year old child', '2nd Grade': '7 year old child',
                     '3rd Grade': '8 year old child', '4th Grade': '9 year old child', '5th Grade': '10 year old child',
                     '6th Grade': '11 year old child', '7th Grade': '12 year old child', '8th Grade': '13 year old teen',
                     '9th Grade': '14 year old teen', '10th Grade': '15 year old teen', '11th Grade': '16 year old teen',
                     '12th Grade': '17 year old teen', 'Higher Ed': 'young adult student', 'Adult': 'adult professional',
                 };
                 const ageDesc = gradeMap[gradeLevel] || 'student';
                 const storedAppearance = adventureState.characterAppearance;
                 if (storedAppearance) {
                     characterContext = `Main character: ${storedAppearance}. `;
                 } else {
                     const hairOptions = ['brown hair', 'black hair', 'blonde hair', 'red hair'];
                     const outfitOptions = ['casual clothes', 'adventure outfit', 'school uniform', 'colorful attire'];
                     const randomHair = hairOptions[Math.floor(Math.random() * hairOptions.length)];
                     const randomOutfit = outfitOptions[Math.floor(Math.random() * outfitOptions.length)];
                     const generatedAppearance = `${ageDesc} with ${randomHair}, wearing ${randomOutfit}, friendly expression`;
                     setAdventureState(prev => ({ ...prev, characterAppearance: generatedAppearance }));
                     characterContext = `Main character: ${generatedAppearance}. `;
                 }
              } else {
                 const storedAppearance = adventureState.characterAppearance;
                 if (storedAppearance) {
                     characterContext = `Main character: ${storedAppearance}. `;
                 } else {
                     const creatureMatch = (adventureCustomInstructions || "").match(/(?:a|an|the)?\\s*([\\w\\s]+(?:dragon|fox|cat|dog|robot|alien|creature|monster|dinosaur|animal|bird|wolf|bear|owl|bunny|rabbit))/i);
                     let creatureType = creatureMatch ? creatureMatch[1].trim() : 'friendly creature';
                     const colorOptions = ['golden', 'silver', 'emerald green', 'sapphire blue', 'sunset orange', 'midnight black', 'snow white'];
                     const featureOptions = ['bright curious eyes', 'a fluffy appearance', 'sleek shiny fur', 'colorful markings', 'a gentle demeanor'];
                     const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
                     const randomFeature = featureOptions[Math.floor(Math.random() * featureOptions.length)];
                     const generatedAppearance = `${randomColor} ${creatureType} with ${randomFeature}`;
                     setAdventureState(prev => ({ ...prev, characterAppearance: generatedAppearance }));
                     characterContext = `Main character: ${generatedAppearance}. `;
                 }
              }
          }'''

if old_char_context in content:
    content = content.replace(old_char_context, new_char_context, 1)
    fixes += 1
    print("5. ✅ Enhanced generateAdventureImage with character-aware prompts")
else:
    print("5. ❌ SKIP - characterContext generation pattern not found")

# ============================================================
# 6. Add NanoBanana character consistency pass
#    Insert after the existing text-removal refinement pass
# ============================================================
old_refinement_end = '''          try {
              const rawBase64 = imageUrl.split(',')[1];
              const editPrompt = `
                Refine this image to look like a ${(isAdventureStoryMode || isSocialMode) ? 'high-quality storybook illustration' : 'high-quality, cinematic screenshot'} of: "${sceneText.substring(0, 200)}...".
                CRITICAL INSTRUCTION: REMOVE ALL TEXT.
                1. Erase any text, letters, numbers, speech bubbles, labels, or UI elements visible in the image.
                2. Paint over these areas to seamlessly match the background scenery.
                3. Ensure the image is purely visual with zero writing.
                ${(isAdventureStoryMode || isSocialMode) ? "4. Ensure it looks friendly and inviting." : ""}
              `;
              const refinedUrl = await callGeminiImageEdit(editPrompt, rawBase64, targetWidth, targetQual);
              if (refinedUrl) {
                  imageUrl = refinedUrl;
              }
          } catch (refineErr) {
              warnLog("Adventure image refinement failed, using original.", refineErr);
          }'''

new_refinement_end = '''          try {
              const rawBase64 = imageUrl.split(',')[1];
              const editPrompt = `
                Refine this image to look like a ${(isAdventureStoryMode || isSocialMode) ? 'high-quality storybook illustration' : 'high-quality, cinematic screenshot'} of: "${sceneText.substring(0, 200)}...".
                CRITICAL INSTRUCTION: REMOVE ALL TEXT.
                1. Erase any text, letters, numbers, speech bubbles, labels, or UI elements visible in the image.
                2. Paint over these areas to seamlessly match the background scenery.
                3. Ensure the image is purely visual with zero writing.
                ${(isAdventureStoryMode || isSocialMode) ? "4. Ensure it looks friendly and inviting." : ""}
              `;
              const refinedUrl = await callGeminiImageEdit(editPrompt, rawBase64, targetWidth, targetQual);
              if (refinedUrl) {
                  imageUrl = refinedUrl;
              }
          } catch (refineErr) {
              warnLog("Adventure image refinement failed, using original.", refineErr);
          }
          // NanoBanana Character Consistency Pass (only when Consistent Characters is ON)
          if (adventureConsistentCharacters && adventureState.characters?.length > 0) {
              const protagonist = adventureState.characters.find(c =>
                  c.role?.toLowerCase().includes('protagonist') ||
                  c.role?.toLowerCase().includes('player')
              ) || adventureState.characters[0];
              if (protagonist?.portrait) {
                  try {
                      const currentBase64 = imageUrl.split(',')[1];
                      const portraitBase64 = protagonist.portrait.split(',')[1];
                      const consistencyPrompt = `
                          Refine the main character in this scene to visually match this reference portrait.
                          Character: ${protagonist.name} — ${protagonist.appearance}.
                          Keep the scene composition, background, lighting, and any other characters unchanged.
                          Only adjust the protagonist's facial features, hair, and clothing to match the reference.
                          NO TEXT. NO LABELS. NO UI ELEMENTS.
                      `;
                      const consistentUrl = await callGeminiImageEdit(consistencyPrompt, currentBase64, targetWidth, targetQual, portraitBase64);
                      if (consistentUrl) {
                          imageUrl = consistentUrl;
                          debugLog("🎭 Character consistency pass applied successfully");
                      }
                  } catch (consistencyErr) {
                      warnLog("Character consistency pass failed, using previous result.", consistencyErr);
                  }
              }
          }'''

if old_refinement_end in content:
    content = content.replace(old_refinement_end, new_refinement_end, 1)
    fixes += 1
    print("6. ✅ Added NanoBanana character consistency pass to scene image generation")
else:
    print("6. ❌ SKIP - refinement pass pattern not found")

# ============================================================
# 7. Extend callGeminiImageEdit to accept optional reference image
# ============================================================
old_edit_fn = '''  const callGeminiImageEdit = async (prompt, base64Image, width = 800, qual = 0.9) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.image}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/png", data: base64Image } }
        ]
      }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
    };'''

new_edit_fn = '''  const callGeminiImageEdit = async (prompt, base64Image, width = 800, qual = 0.9, referenceBase64 = null) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.image}:generateContent?key=${apiKey}`;
    const parts = [
      { text: prompt },
      { inlineData: { mimeType: "image/png", data: base64Image } }
    ];
    if (referenceBase64) {
      parts.push({ text: "Reference portrait to match:" });
      parts.push({ inlineData: { mimeType: "image/png", data: referenceBase64 } });
    }
    const payload = {
      contents: [{
        parts: parts
      }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
    };'''

if old_edit_fn in content:
    content = content.replace(old_edit_fn, new_edit_fn, 1)
    fixes += 1
    print("7. ✅ Extended callGeminiImageEdit with optional reference image parameter")
else:
    print("7. ❌ SKIP - callGeminiImageEdit function pattern not found")

# ============================================================
# 8. Persist characters in adventure save snapshots
# ============================================================
old_save_snapshot = '''          data: {
              snapshot: {
                  currentScene: sceneData,
                  history: [],
                  level: 1,
                  xp: 0,
                  energy: 100,
                  gold: initialGold,
                  inventory: initialInventory,
                  systemResources: initialSystemResources,
                  voiceMap: sceneData.voices || {},
                  turnCount: 1,
                  isGameOver: false
              }
          },'''

new_save_snapshot = '''          data: {
              snapshot: {
                  currentScene: sceneData,
                  history: [],
                  level: 1,
                  xp: 0,
                  energy: 100,
                  gold: initialGold,
                  inventory: initialInventory,
                  systemResources: initialSystemResources,
                  voiceMap: sceneData.voices || {},
                  turnCount: 1,
                  isGameOver: false,
                  characters: sceneCharacters
              }
          },'''

if old_save_snapshot in content:
    content = content.replace(old_save_snapshot, new_save_snapshot, 1)
    fixes += 1
    print("8. ✅ Added characters to adventure save snapshot")
else:
    print("8. ❌ SKIP - save snapshot pattern not found")

# ============================================================
# 9. Enhance Narrative Ledger to track character state
# ============================================================
old_ledger_task = '''            Task:
            1. Consolidate the "Current History Log" and the "Previous Ledger" into a single, updated narrative summary.
            2. Focus on:
               - Major Plot Points & Decisions made.
               - Current Location.
               - Player Status (Allies, Reputation, Health state).'''

new_ledger_task = '''            Task:
            1. Consolidate the "Current History Log" and the "Previous Ledger" into a single, updated narrative summary.
            2. Focus on:
               - Major Plot Points & Decisions made.
               - Current Location.
               - Player Status (Allies, Reputation, Health state).
               - Cast Status: For each named character, note whether they are currently with the protagonist, absent, or if their relationship has changed.'''

if old_ledger_task in content:
    content = content.replace(old_ledger_task, new_ledger_task, 1)
    fixes += 1
    print("9. ✅ Enhanced Narrative Ledger with character tracking")
else:
    print("9. ❌ SKIP - Narrative Ledger task pattern not found")

# ============================================================
# 10. Store charactersInScene from LLM response in adventureState
#     Find where sceneData is stored back into state after continuation
# ============================================================
old_scene_update = '''              currentScene: data.scene, pendingChoice: null,
              isLoading: false,'''

new_scene_update = '''              currentScene: { ...data.scene, charactersInScene: data.charactersInScene || [] }, pendingChoice: null,
              isLoading: false,'''

if old_scene_update in content:
    content = content.replace(old_scene_update, new_scene_update, 1)
    fixes += 1
    print("10. ✅ Stored charactersInScene from LLM response in adventureState")
else:
    print("10. ❌ SKIP - scene update pattern not found")

# ============================================================
# 11. Add adventureConsistentCharacters to generateAdventureImage deps
# ============================================================
old_img_deps = '''  }, [useLowQualityVisuals, adventureState.isImmersiveMode, isAdventureStoryMode, adventureInputMode, gradeLevel, adventureCustomInstructions]);'''

new_img_deps = '''  }, [useLowQualityVisuals, adventureState.isImmersiveMode, isAdventureStoryMode, adventureInputMode, gradeLevel, adventureCustomInstructions, adventureConsistentCharacters]);'''

if old_img_deps in content:
    content = content.replace(old_img_deps, new_img_deps, 1)
    fixes += 1
    print("11. ✅ Added adventureConsistentCharacters to generateAdventureImage deps")
else:
    print("11. ❌ SKIP - image generation deps pattern not found")

# ============================================================
# Write output
# ============================================================
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n{'='*50}")
print(f"Applied {fixes}/11 changes")
if fixes == 11:
    print("🎉 All patches applied successfully!")
elif fixes > 0:
    print(f"⚠️ {11 - fixes} patches could not be applied — check SKIP messages above")
else:
    print("❌ No patches applied — file content may have changed")
