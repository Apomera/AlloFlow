import re

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject handleRefineCharacter
func_injection = """  const handleRefineCharacter = async (charIdx, modificationPrompt) => {
      const char = adventureState.characters[charIdx];
      if (!char || !char.referenceImageBase64) return;
      setAdventureState(prev => {
          const newChars = [...(prev.characters || [])];
          newChars[charIdx].isGenerating = true;
          return { ...prev, characters: newChars };
      });
      try {
          const b64Raw = char.referenceImageBase64.split(',')[1];
          const newB64 = await callGeminiImageEdit(modificationPrompt, b64Raw);
          if (newB64) {
              setAdventureState(prev => {
                  const newChars = [...(prev.characters || [])];
                  newChars[charIdx].referenceImageBase64 = `data:image/jpeg;base64,${newB64}`;
                  newChars[charIdx].isGenerating = false;
                  return { ...prev, characters: newChars };
              });
              addToast(`Updated ${char.name}'s portrait!`, "success");
          } else {
              throw new Error("No image returned");
          }
      } catch (e) {
          console.error("Refine failed", e);
          addToast("Failed to edit portrait. Try again.", "error");
          setAdventureState(prev => {
              const newChars = [...(prev.characters || [])];
              newChars[charIdx].isGenerating = false;
              return { ...prev, characters: newChars };
          });
      }
  };
"""
pattern_func = r"(const handleResumeAdventure = async \(\) => \{)"
content, c1 = re.subn(pattern_func, func_injection + r"\1", content)


# 2. Inject JSX Lobby block
# We need to wrap {hasSavedAdventure && !showNewGameSetup ? ... } inside an {isReviewingCharacters ? (lobby html) : (original)}
jsx_lobby = """{isReviewingCharacters ? (
   <div className="w-full h-full bg-slate-50 p-8 overflow-y-auto custom-scrollbar flex flex-col items-center">
       <div className="w-full max-w-6xl mb-8 flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
           <div>
               <h2 className="text-3xl font-black text-indigo-900 mb-1 tracking-tight flex items-center gap-3"><Users size={32} className="text-indigo-500" /> Cast of Characters</h2>
               <p className="text-slate-500 font-medium">Review the generated cast for your adventure. Use Nano Banana to refine their appearance!</p>
           </div>
           <button 
               onClick={() => {
                   setIsReviewingCharacters(false);
                   setShowNewGameSetup(false);
                   setGenerationStep('Rendering scene visual...');
                   generateAdventureImage(adventureState.currentScene.text, 1);
               }}
               disabled={adventureState.characters?.some(c => c.isGenerating)}
               className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black text-lg rounded-2xl shadow-xl transition-all flex items-center gap-2"
           >
               {adventureState.characters?.some(c => c.isGenerating) ? <RefreshCw size={20} className="animate-spin" /> : <Play size={20} />}
               {adventureState.characters?.some(c => c.isGenerating) ? 'Casting...' : 'Begin Adventure'}
           </button>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-6xl mb-10">
           {adventureState.characters?.map((char, charIdx) => (
               <div key={char.id || charIdx} className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-md flex flex-col group hover:border-indigo-300 transition-all hover:-translate-y-1">
                   <div className="aspect-square bg-slate-100 relative w-full flex items-center justify-center overflow-hidden">
                       {char.isGenerating ? (
                           <div className="flex flex-col items-center text-slate-400">
                               <RefreshCw size={40} className="animate-spin mb-3 text-indigo-400" />
                               <span className="text-xs font-bold animate-pulse tracking-widest uppercase">Imagen Active...</span>
                           </div>
                       ) : char.referenceImageBase64 ? (
                           <img src={char.referenceImageBase64} alt={char.name} className="w-full h-full object-cover" />
                       ) : (
                           <ImageIcon size={48} className="text-slate-300" />
                       )}
                       {char.referenceImageBase64 && !char.isGenerating && (
                           <div className="absolute top-3 left-3 bg-black/50 backdrop-blur text-white text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-widest border border-white/20">
                               Locked In
                           </div>
                       )}
                   </div>
                   <div className="p-5 flex-grow flex flex-col">
                       <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight mb-1">{char.name}</h3>
                       <p className="text-xs text-slate-500 font-medium mb-5 flex-grow italic">"{char.role}"</p>
                       
                       <div className="relative mt-auto">
                           <input 
                               type="text" 
                               placeholder={char.isGenerating ? "Wait..." : "Type text to edit (e.g. 'purple hat')"} 
                               className="w-full pl-3 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                               onKeyDown={(e) => {
                                   if (e.key === 'Enter' && e.target.value.trim() && char.referenceImageBase64) {
                                        const prompt = e.target.value.trim();
                                        e.target.value = '';
                                        handleRefineCharacter(charIdx, prompt);
                                   }
                               }}
                               disabled={char.isGenerating || !char.referenceImageBase64}
                           />
                           <button 
                               onClick={(e) => {
                                   const input = e.currentTarget.previousElementSibling;
                                   if (input.value.trim() && char.referenceImageBase64) {
                                       const prompt = input.value.trim();
                                       input.value = '';
                                       handleRefineCharacter(charIdx, prompt);
                                   }
                               }}
                               className="absolute right-2 top-2 p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white disabled:opacity-30 disabled:hover:bg-indigo-100 disabled:hover:text-indigo-600 transition-colors" 
                               disabled={char.isGenerating || !char.referenceImageBase64} 
                               title="Refine Image with Nano Banana"
                           >
                               <Sparkles size={14} />
                           </button>
                       </div>
                   </div>
               </div>
           ))}
       </div>
   </div>
) : ("""

pattern_jsx = r"(\{hasSavedAdventure\s*&&\s*!showNewGameSetup\s*\?\s*\()"

content, c2 = re.subn(pattern_jsx, jsx_lobby + r"\1", content)

# 3. Add closing brace for the ternary
pattern_close = r"(</button>\s*</div>\s*</div>\s*\)}\s*</div>\s*\)}\s*{adventureState\.history)"
content, c3 = re.subn(pattern_close, r"\1) : null}\n                            {adventureState.history", content)

pattern_close_alt = r"(</button>\s*</div>\s*</div>\s*\)}\s*</div>\s*\)})(\s*\{adventureState\.history)"
content, c3_alt = re.subn(pattern_close_alt, r"\1\n                                )}\n\2", content)


print(f"Replacements: RefineFunc({c1}), JSX_Lobby({c2}), JSX_Close({c3_alt})")

if c1 > 0 and c2 > 0 and c3_alt > 0:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ Successfully patched Nano Banana JSX bindings!")
else:
    print("❌ Failed to patch JSX bindings.")

