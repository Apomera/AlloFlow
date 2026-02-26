import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the RhymeView div rendering to fix the highlighting overlap issue
# The main issue is likely the timeout in Play All Options: `await new Promise(r => setTimeout(r, 600));`
# The highlight class `activeIndex === i` depends on playingIndex. 
# Another issue is `isAudioBusy` blocking `onPlayAudio` locally.
# We will patch the classes applied in the non-editing mode to ensure `activeIndex === i` takes higher precedence.

old_classes = r"className=\{`p-6 rounded-2xl bg-white border-2 transition-all group text-left cursor-pointer outline-none focus:ring-2 focus:ring-orange-400 \$\{activeIndex === i \? 'border-orange-500 bg-orange-100 ring-2 ring-orange-300 scale-105 shadow-lg' : 'border-slate-100 hover:border-orange-400 hover:bg-orange-50'\}`\}"

# If activeIndex === i, we should lock it visually. 
new_classes = r"className={`p-6 rounded-2xl transition-all group text-left cursor-pointer outline-none focus:ring-2 focus:ring-orange-400 ${activeIndex === i ? 'border-orange-500 bg-orange-200 ring-4 ring-orange-400 scale-[1.05] shadow-xl font-black z-10 relative' : 'bg-white border-2 border-slate-100 hover:border-orange-400 hover:bg-orange-50'}`}"

if re.search(old_classes, text):
    text = re.sub(old_classes, new_classes, text)
    print("Patched RhymeView activeIndex classes.")
else:
    print("Could not find the className regex for RhymeView.")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(text)
