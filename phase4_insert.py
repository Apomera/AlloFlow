"""Phase 4: Sound Effects, Accessibility & Gamification"""

with open('stem_lab/stem_tool_coding.js', encoding='utf-8') as f:
    src = f.read()

# ═══════════════════════════════════════════
# 1. ADD ACHIEVEMENT BADGE STATE + DEFINITIONS
# ═══════════════════════════════════════════
src = src.replace(
    "          var showAIPanel = d.showAIPanel || false;",
    """          var showAIPanel = d.showAIPanel || false;
          var earnedBadges = d.earnedBadges || [];
          var highContrastMode = d.highContrastMode || false;

          // ── Achievement Badges ──
          var BADGES = [
            { id: 'first_program', icon: '🌟', title: 'First Program', desc: 'Run your first program', check: function() { return runHistory.length >= 1; } },
            { id: 'loop_master', icon: '🔄', title: 'Loop Master', desc: 'Use a Repeat block', check: function() { return blocks.some(function(b) { return b.type === 'repeat'; }); } },
            { id: 'color_artist', icon: '🎨', title: 'Color Artist', desc: 'Use 3+ different colors', check: function() { var c = {}; drawnLines.forEach(function(l) { c[l.color]=true; }); return Object.keys(c).length >= 3; } },
            { id: 'century', icon: '💯', title: 'Century Club', desc: 'Draw 100+ line segments', check: function() { return drawnLines.length >= 100; } },
            { id: 'robot_commander', icon: '🤖', title: 'Robot Commander', desc: 'Complete a robot challenge', check: function() { return robotCompleted.length >= 1; } },
            { id: 'musician', icon: '🎵', title: 'Digital Musician', desc: 'Use a Play Note block', check: function() { return blocks.some(function(b) { return b.type === 'playNote'; }); } },
            { id: 'function_pro', icon: '📋', title: 'Function Pro', desc: 'Define and call a function', check: function() { return blocks.some(function(b) { return b.type === 'function'; }) && blocks.some(function(b) { return b.type === 'callFunction'; }); } },
            { id: 'challenge_5', icon: '🏆', title: 'Puzzle Solver', desc: 'Complete 5 challenges', check: function() { return completed.length >= 5; } },
            { id: 'efficiency', icon: '⚡', title: 'Efficiency Expert', desc: 'Complete a challenge using fewer than 5 blocks', check: function() { return completed.length >= 1 && blocks.length < 5 && blocks.length > 0; } },
            { id: 'generative', icon: '🎲', title: 'Generative Artist', desc: 'Use Random block in a Repeat loop', check: function() { return blocks.some(function(b) { return b.type === 'repeat' && (b.children || []).some(function(c) { return c.type === 'random'; }); }); } }
          ];

          // Badge check — runs after program execution
          function checkBadges() {
            var newBadges = [];
            BADGES.forEach(function(badge) {
              if (earnedBadges.indexOf(badge.id) < 0 && badge.check()) {
                newBadges.push(badge.id);
                if (addToast) addToast(badge.icon + ' Badge Earned: ' + badge.title + '!', 'success');
                awardStemXP('codingPlayground', 10, 'Badge: ' + badge.title);
              }
            });
            if (newBadges.length > 0) {
              upd('earnedBadges', earnedBadges.concat(newBadges));
              if (typeof stemCelebrate === 'function') stemCelebrate();
            }
          }"""
)

# ═══════════════════════════════════════════
# 2. WIRE BADGE CHECK INTO EXECUTION COMPLETION
# ═══════════════════════════════════════════
src = src.replace(
    "                updMulti({ turtle: finalTurtle, lines: finalLines, running: false, stepIdx: -1, history: newHistory });",
    "                updMulti({ turtle: finalTurtle, lines: finalLines, running: false, stepIdx: -1, history: newHistory });\n                setTimeout(checkBadges, 100);"
)

# ═══════════════════════════════════════════
# 3. SOUND EFFECTS ON CHALLENGE COMPLETION  
# ═══════════════════════════════════════════
src = src.replace(
    "                      awardStemXP('codingPlayground', 15, 'Completed: ' + ch.title);",
    """                      awardStemXP('codingPlayground', 15, 'Completed: ' + ch.title);
                      // Victory sound effect
                      try {
                        var actx = window.__codingAudioCtx || (window.__codingAudioCtx = new (window.AudioContext || window.webkitAudioContext)());
                        var notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
                        notes.forEach(function(freq, ni) {
                          var o = actx.createOscillator(); var g = actx.createGain();
                          o.type = 'sine'; o.frequency.value = freq; g.gain.value = 0.12;
                          o.connect(g); g.connect(actx.destination);
                          o.start(actx.currentTime + ni * 0.12);
                          g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + ni * 0.12 + 0.3);
                          o.stop(actx.currentTime + ni * 0.12 + 0.35);
                        });
                      } catch(e) {}"""
)

# ═══════════════════════════════════════════
# 4. ACCESSIBILITY — screen reader announcements
# ═══════════════════════════════════════════
# Add SR announcement when blocks are added
src = src.replace(
    "            upd('blocks', updated);\r\n            if (codeMode === 'text') upd('textCode', blocksToText(updated));\r\n          }\r\n\r\n          function removeBlock",
    "            upd('blocks', updated);\r\n            if (codeMode === 'text') upd('textCode', blocksToText(updated));\r\n            if (typeof announceToSR === 'function') announceToSR('Added ' + type + ' block');\r\n          }\r\n\r\n          function removeBlock"
)

src = src.replace(
    "            upd('blocks', updated);\r\n            if (codeMode === 'text') upd('textCode', blocksToText(updated));\r\n          }\r\n\r\n          function updateBlockParam",
    "            upd('blocks', updated);\r\n            if (codeMode === 'text') upd('textCode', blocksToText(updated));\r\n            if (typeof announceToSR === 'function') announceToSR('Removed block');\r\n          }\r\n\r\n          function updateBlockParam"
)

# ═══════════════════════════════════════════
# 5. ADD BADGE GALLERY + HIGH CONTRAST TOGGLE IN SIDEBAR
#    Insert before the AI panel
# ═══════════════════════════════════════════
badge_gallery = """
              // ── Achievement Badges Gallery ──
              React.createElement("div", { className: "bg-gradient-to-br from-amber-900/30 to-orange-900/30 rounded-xl p-3 border border-amber-600/30" },
                React.createElement("h4", { className: "text-xs font-bold text-amber-300 mb-2 flex items-center gap-1" },
                  React.createElement("span", null, "🏆"), " Badges (" + earnedBadges.length + "/" + BADGES.length + ")"
                ),
                React.createElement("div", { className: "grid gap-1", style: { gridTemplateColumns: 'repeat(5, 1fr)' } },
                  BADGES.map(function(badge) {
                    var earned = earnedBadges.indexOf(badge.id) >= 0;
                    return React.createElement("div", {
                      key: badge.id,
                      title: badge.title + ': ' + badge.desc,
                      className: "flex items-center justify-center w-full aspect-square rounded-lg text-lg transition-all " +
                        (earned ? "bg-amber-500/20 scale-100 cursor-default" : "bg-slate-700/30 grayscale opacity-30 cursor-help"),
                      style: earned ? { animation: 'none' } : {}
                    }, badge.icon);
                  })
                )
              ),

              // ── Accessibility Controls ──
              React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("button", {
                  onClick: function() { upd('highContrastMode', !highContrastMode); },
                  className: "flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all " +
                    (highContrastMode ? "bg-white text-slate-900" : "bg-slate-700/50 text-slate-400 hover:text-white")
                }, highContrastMode ? "◐ Standard Mode" : "◑ High Contrast")
              ),
"""

src = src.replace(
    "              // ── AI Assistant Panel ──",
    badge_gallery + "              // ── AI Assistant Panel ──"
)

with open('stem_lab/stem_tool_coding.js', 'w', encoding='utf-8') as f:
    f.write(src)

print("Phase 4 Sound/Accessibility/Gamification insertions complete!")
print(f"New file size: {len(src)} chars, {len(src.splitlines())} lines")
