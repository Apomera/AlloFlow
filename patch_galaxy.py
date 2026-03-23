import sys

with open('stem_lab_module.js', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Fix the width constraint
old_wrapper = "className: (simMode === 'star' ? 'max-w-7xl' : 'max-w-4xl')"
new_wrapper = "className: (simMode === 'star' ? 'w-full max-w-[98%] px-2' : 'max-w-4xl')"
text = text.replace(old_wrapper, new_wrapper)

# 2. Fix the Canvas stale closure
old_ref = """                  ref: function (cvEl) {
                    if (!cvEl || cvEl._starLifeInit) return;
                    cvEl._starLifeInit = true;"""

new_ref = """                  ref: function (cvEl) {
                    if (!cvEl) return;
                    cvEl._lifecycleMass = lifecycleMass;
                    cvEl._activeStage = activeStage;
                    if (cvEl._starLifeInit) return;
                    cvEl._starLifeInit = true;"""
text = text.replace(old_ref, new_ref)

old_draw_vars = """                      var mass = lifecycleMass;
                      var stage = activeStage;"""

new_draw_vars = """                      var mass = cvEl._lifecycleMass || lifecycleMass;
                      var stage = cvEl._activeStage || activeStage;"""
text = text.replace(old_draw_vars, new_draw_vars)

# 3. Add Timelapse Button
old_flowchart_header = """              // ── Lifecycle Flowchart ──
              React.createElement("div", { className: "bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl border border-indigo-400/30 p-5 shadow-lg" },
                React.createElement("div", { className: "flex items-center gap-2 mb-4" },
                  React.createElement("h4", { className: "text-sm font-bold text-white" }, "\u2728 Stellar Lifecycle Journey"),
                  React.createElement("span", { className: "ml-auto text-[9px] text-indigo-400 bg-indigo-900/50 px-2 py-0.5 rounded-full border border-indigo-700/50" },
                    lifecycleMass < 8 ? "\u2193 Gentle path" : "\u2193 Violent path")
                ),"""

new_flowchart_header = """              // ── Lifecycle Flowchart ──
              React.createElement("div", { className: "bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl border border-indigo-400/30 p-5 shadow-lg" },
                React.createElement("div", { className: "flex items-center gap-2 mb-4" },
                  React.createElement("h4", { className: "text-sm font-bold text-white flex-shrink-0" }, "\u2728 Stellar Lifecycle Journey"),
                  React.createElement("button", {
                    onClick: function () {
                      if (window._starTimeLapse) { clearInterval(window._starTimeLapse); window._starTimeLapse = null; upd("starPlaying", false); return; }
                      upd("starPlaying", true);
                      var endStageMap = {'Planetary Nebula': 'planetary_nebula', 'White Dwarf': 'white_dwarf', 'Supernova': 'supernova', 'Neutron Star': 'neutron_star', 'Black Hole': 'black_hole'};
                      var sequence = ['nebula', 'protostar', 'main_sequence', 'red_giant'];
                      var endStages = (lifecycleMass < 8 ? LIFECYCLE.lowMass : LIFECYCLE.highMass.filter(function(s) { return !(s.minMass && lifecycleMass < s.minMass) && !(s.maxMass && lifecycleMass > s.maxMass); }));
                      endStages.forEach(function(es) { for(var ek in endStageMap) { if(es.name.indexOf(ek) >= 0) { sequence.push(endStageMap[ek]); break; } } });
                      var sIdx = sequence.indexOf(activeStage);
                      if (sIdx < 0 || sIdx >= sequence.length - 1) sIdx = -1;
                      window._starTimeLapse = setInterval(function() {
                        sIdx++;
                        if (sIdx >= sequence.length) { clearInterval(window._starTimeLapse); window._starTimeLapse = null; upd("starPlaying", false); return; }
                        upd("activeStage", sequence[sIdx]);
                      }, 2500);
                    },
                    className: "ml-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all shadow-md active:scale-95 " + (d.starPlaying ? "bg-red-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-500")
                  }, d.starPlaying ? "\u23F9 Stop Timelapse" : "\u25B6 Play Timelapse"),
                  React.createElement("span", { className: "ml-auto text-[9px] text-indigo-400 bg-indigo-900/50 px-2 py-0.5 rounded-full border border-indigo-700/50 flex-shrink-0 hidden sm:block" },
                    lifecycleMass < 8 ? "\u2193 Gentle path" : "\u2193 Violent path")
                ),"""
                
text = text.replace(old_flowchart_header, new_flowchart_header)

with open('stem_lab_module.js', 'w', encoding='utf-8', newline='') as f:
    f.write(text)

print("Patch applied to Star Life Galaxy Explorer!")
