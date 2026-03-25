"""Phase 3: AI Integration & Export — Explain, Suggest, Debug, SVG export, Share link"""

with open('stem_lab/stem_tool_coding.js', encoding='utf-8') as f:
    src = f.read()

# ═══════════════════════════════════════════
# 1. ADD AI STATE DEFAULTS
# ═══════════════════════════════════════════
src = src.replace(
    "          var showGrid = d.showGrid !== false;",
    "          var showGrid = d.showGrid !== false;\r\n          var aiExplanation = d.aiExplanation || '';\r\n          var aiLoading = d.aiLoading || false;\r\n          var showAIPanel = d.showAIPanel || false;"
)

# ═══════════════════════════════════════════
# 2. ADD AI HANDLER FUNCTIONS (before Export PNG)
# ═══════════════════════════════════════════
ai_functions = """
          // ── AI Assistant Functions ──
          function handleExplainCode() {
            if (!callGemini || blocks.length === 0) {
              if (addToast) addToast('Add some blocks first!', 'info');
              return;
            }
            upd('aiLoading', true);
            upd('showAIPanel', true);
            var code = blocksToText(blocks);
            var prompt = 'You are a friendly coding tutor for kids. The student wrote this turtle graphics program:\\n\\n' + code + '\\n\\nExplain in 2-3 simple sentences what this program does and what shape it will draw. Use encouraging language and emojis.';
            callGemini(prompt).then(function(result) {
              upd('aiExplanation', result || 'I could not analyze this code right now.');
              upd('aiLoading', false);
            }).catch(function() {
              upd('aiExplanation', 'Oops! AI is not available right now. Try again later.');
              upd('aiLoading', false);
            });
          }

          function handleSuggestNext() {
            if (!callGemini) {
              if (addToast) addToast('AI not available', 'info');
              return;
            }
            upd('aiLoading', true);
            upd('showAIPanel', true);
            var code = blocks.length > 0 ? blocksToText(blocks) : '(empty program)';
            var prompt = 'You are a friendly coding tutor. The student has this turtle graphics program so far:\\n\\n' + code + '\\n\\nSuggest ONE specific next step they could try to make their drawing more interesting. Be encouraging, use emojis, and keep it to 1-2 sentences. Mention the exact block name they should add.';
            callGemini(prompt).then(function(result) {
              upd('aiExplanation', '💡 ' + (result || 'Try adding a Repeat block to create a pattern!'));
              upd('aiLoading', false);
            }).catch(function() {
              upd('aiExplanation', '💡 Try adding a Repeat block around your moves to create a pattern!');
              upd('aiLoading', false);
            });
          }

          function handleDebugHelp() {
            if (!callGemini || challengeIdx < 0) {
              if (addToast) addToast('Select a challenge first!', 'info');
              return;
            }
            upd('aiLoading', true);
            upd('showAIPanel', true);
            var code = blocks.length > 0 ? blocksToText(blocks) : '(empty program)';
            var ch = CHALLENGES[challengeIdx];
            var prompt = 'You are a friendly coding tutor. The student is trying to solve this challenge:\\n\\nTitle: ' + ch.title + '\\nGoal: ' + ch.desc + '\\nHint: ' + ch.hint + '\\n\\nTheir current code:\\n' + code + '\\n\\nGive them a specific, encouraging hint about what might be wrong or what to try next. Do NOT give the full solution. Use emojis and keep it to 2-3 sentences.';
            callGemini(prompt).then(function(result) {
              upd('aiExplanation', '🐛 ' + (result || ch.hint));
              upd('aiLoading', false);
            }).catch(function() {
              upd('aiExplanation', '🐛 Hint: ' + ch.hint);
              upd('aiLoading', false);
            });
          }

          // ── Export SVG ──
          function handleExportSVG() {
            if (drawnLines.length === 0) {
              if (addToast) addToast('Draw something first!', 'info');
              return;
            }
            var svgLines = drawnLines.map(function(l) {
              return '<line x1="' + l.x1 + '" y1="' + l.y1 + '" x2="' + l.x2 + '" y2="' + l.y2 + '" stroke="' + l.color + '" stroke-width="' + l.width + '" stroke-linecap="round"/>';
            }).join('\\n  ');
            var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">\\n  <rect width="500" height="500" fill="#0f172a"/>\\n  ' + svgLines + '\\n</svg>';
            var blob = new Blob([svg], { type: 'image/svg+xml' });
            var url = URL.createObjectURL(blob);
            var link = document.createElement('a');
            link.download = 'coding_playground_' + Date.now() + '.svg';
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            if (addToast) addToast('📥 SVG exported!', 'success');
          }

          // ── Share Link ──
          function handleShareLink() {
            if (blocks.length === 0) {
              if (addToast) addToast('Add some blocks first!', 'info');
              return;
            }
            try {
              var encoded = btoa(JSON.stringify(blocks));
              var url = window.location.origin + window.location.pathname + '?codingShare=' + encoded;
              navigator.clipboard.writeText(url).then(function() {
                if (addToast) addToast('🔗 Share link copied to clipboard!', 'success');
              });
            } catch(e) {
              if (addToast) addToast('Could not generate share link', 'error');
            }
          }

"""

src = src.replace(
    "          // ── Export PNG ──",
    ai_functions + "          // ── Export PNG ──"
)

# ═══════════════════════════════════════════
# 3. ADD AI PANEL + SVG/SHARE BUTTONS IN HEADER  
# ═══════════════════════════════════════════
# Add AI buttons right after the Templates button
ai_buttons = """
              // AI Assistant buttons
              callGemini && React.createElement("div", { className: "flex rounded-lg overflow-hidden border border-white/20" },
                React.createElement("button", {
                  onClick: handleExplainCode,
                  disabled: aiLoading || blocks.length === 0,
                  title: "AI explains what your code does",
                  className: "px-2.5 py-1.5 text-[10px] font-bold transition-all " +
                    (aiLoading ? "bg-white/5 text-white/30 cursor-wait" : "bg-white/10 text-white/80 hover:bg-white/20")
                }, aiLoading ? "⏳" : "🤖 Explain"),
                React.createElement("button", {
                  onClick: handleSuggestNext,
                  disabled: aiLoading,
                  title: "AI suggests what to try next",
                  className: "px-2.5 py-1.5 text-[10px] font-bold transition-all border-l border-white/20 " +
                    (aiLoading ? "bg-white/5 text-white/30" : "bg-white/10 text-white/80 hover:bg-white/20")
                }, "💡 Suggest"),
                React.createElement("button", {
                  onClick: handleDebugHelp,
                  disabled: aiLoading || challengeIdx < 0,
                  title: "AI helps debug your challenge attempt",
                  className: "px-2.5 py-1.5 text-[10px] font-bold transition-all border-l border-white/20 " +
                    (aiLoading || challengeIdx < 0 ? "bg-white/5 text-white/30" : "bg-white/10 text-white/80 hover:bg-white/20")
                }, "🐛 Debug")
              ),
              // SVG Export + Share
              React.createElement("button", {
                onClick: handleExportSVG,
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/15 text-white hover:bg-white/25 transition-all"
              }, "📐 SVG"),
              React.createElement("button", {
                onClick: handleShareLink,
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/15 text-white hover:bg-white/25 transition-all"
              }, "🔗 Share"),"""

src = src.replace(
    "              // Canvas controls",
    ai_buttons + "\n              // Canvas controls"
)

# ═══════════════════════════════════════════
# 4. ADD AI EXPLANATION PANEL in the sidebar (before Variable Inspector)
# ═══════════════════════════════════════════
ai_panel = """
              // ── AI Assistant Panel ──
              showAIPanel && React.createElement("div", { className: "bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-xl p-3 border border-blue-500/30 shadow-lg" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("h4", { className: "text-xs font-bold text-blue-300 flex items-center gap-1" },
                    React.createElement("span", null, "🤖"), " AI Assistant"
                  ),
                  React.createElement("button", {
                    onClick: function() { updMulti({ showAIPanel: false, aiExplanation: '' }); },
                    className: "text-slate-400 hover:text-white text-sm px-1"
                  }, "×")
                ),
                aiLoading ?
                  React.createElement("div", { className: "flex items-center gap-2 py-2" },
                    React.createElement("div", { className: "animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full" }),
                    React.createElement("span", { className: "text-[11px] text-blue-300" }, "Thinking...")
                  ) :
                  React.createElement("p", { className: "text-[11px] text-blue-200/80 leading-relaxed whitespace-pre-wrap" }, aiExplanation || "Click 'Explain', 'Suggest', or 'Debug' to get AI help!")
              ),
"""

src = src.replace(
    "              // ── Variable Inspector / Debug Panel ──",
    ai_panel + "              // ── Variable Inspector / Debug Panel ──"
)

with open('stem_lab/stem_tool_coding.js', 'w', encoding='utf-8') as f:
    f.write(src)

print("Phase 3 AI + Export insertions complete!")
print(f"New file size: {len(src)} chars, {len(src.splitlines())} lines")
