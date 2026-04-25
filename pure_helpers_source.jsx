// pure_helpers_source.jsx - Phase I.1 of CDN modularization.
// Four low-coupling helpers (3 fully pure + generateBingoCards which has 3 deps).

const repairSourceMarkdown = (rawText, deps) => {
  // No closure deps — fully pure helper.
  try { if (window._DEBUG_PURE_HELPERS) console.log("[PureHelpers] repairSourceMarkdown fired"); } catch(_) {}
    if (!rawText) return rawText;

    const bibMatch = rawText.match(/(\n---\n|\n#{2,3} Source Text References)/s);
    let body = bibMatch ? rawText.substring(0, bibMatch.index) : rawText;
    const bib = bibMatch ? rawText.substring(bibMatch.index) : '';
    const trimmedBody = body.trimEnd();
    if (trimmedBody.length > 50) {
        const lastSentenceEnd = Math.max(
            trimmedBody.lastIndexOf('.'),
            trimmedBody.lastIndexOf('!'),
            trimmedBody.lastIndexOf('?')
        );
        if (lastSentenceEnd > 0 && (trimmedBody.length - lastSentenceEnd) < 120) {
            const afterPunctuation = trimmedBody.substring(lastSentenceEnd + 1).trim();
            if (afterPunctuation.length > 5 && !/[.!?]/.test(afterPunctuation)) {
                body = trimmedBody.substring(0, lastSentenceEnd + 1);
            }
        }
    }
    rawText = body + bib;

    rawText = rawText.replace(/([.!?])\s*(#{1,6}\s+)/g, '$1\n\n$2');

    let lines = rawText.split('\n');
    let titleProcessed = false;
    const repairedLines = lines.map((line, index) => {
        let trimmed = line.trim();
        
        if (!titleProcessed && trimmed.length > 0) {
            if (/^Title:\s*/i.test(trimmed)) {
                titleProcessed = true;
                return trimmed.replace(/^Title:\s*/i, '# ');
            }
            if (!/^[#\-*]/.test(trimmed) && !/^\*\*/.test(trimmed) && !/^\[/.test(trimmed) && !/^\d+\.\s/.test(trimmed) && trimmed.length < 80 && index < 3) {
                titleProcessed = true;
                return '# ' + trimmed;
            }
        }
        
        if (titleProcessed === false && trimmed.length >= 80) {
            titleProcessed = true;
        }
        if (/^#{1,6}\s+/.test(trimmed) && trimmed.length > 150) {
            return line.replace(/^#{1,6}\s+/, '');
        }
        return line;
    });

    const finalLines = [];
    for (let i = 0; i < repairedLines.length; i++) {
        const line = repairedLines[i];
        if (/^#{1,6}\s+/.test(line.trim()) && i > 0) {
            const prevLine = finalLines[finalLines.length - 1];
            if (prevLine && prevLine.trim().length > 0) {
                finalLines.push('');
            }
        }
        finalLines.push(line);
    }
    return finalLines.join('\n');
};

const splitTextToSentences = (text, deps) => {
  // No closure deps — fully pure helper.
  try { if (window._DEBUG_PURE_HELPERS) console.log("[PureHelpers] splitTextToSentences fired"); } catch(_) {}
      if (!text) return [];
      const linkMap = [];
      let protectedText = text.replace(/(\[.*?\]\(.*?\))/g, (match) => {
          linkMap.push(match);
          return `{{LINK_${linkMap.length - 1}}}`;
      });
      const latexMap = [];
      protectedText = protectedText.replace(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g, (match) => {
          latexMap.push(match);
          return `{{LATEX_${latexMap.length - 1}}}`;
      });
      protectedText = protectedText.replace(/(^|\s)([A-Z])\.(\s)/g, "$1$2{{DOT}}$3");
      const honorifics = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Gen', 'Rep', 'Sen'];
      honorifics.forEach(h => {
          protectedText = protectedText.replace(new RegExp(`(b${h}).(s)`, 'g'), `$1{{DOT}}$2`);
      });
      const sentences = protectedText
        .replace(/([.!?]+["']?)(\s+|$)/g, "$1|")
        .split("|")
        .map(s => {
            let restored = s.replace(/{{DOT}}/g, ".").trim();
            restored = restored.replace(/{{LATEX_(\d+)}}/g, (_, index) => {
                return latexMap[parseInt(index, 10)] || "";
            });
            restored = restored.replace(/{{LINK_(\d+)}}/g, (_, index) => {
                return linkMap[parseInt(index, 10)] || "";
            });
            return restored;
        })
        .filter(s => s.length > 0);
      return sentences;
};

const diffWords = (oldText, newText, deps) => {
  // No closure deps — fully pure helper.
  try { if (window._DEBUG_PURE_HELPERS) console.log("[PureHelpers] diffWords fired"); } catch(_) {}
      if (!oldText || !newText) return [];
      const oldWords = oldText.trim().split(/\s+/);
      const newWords = newText.trim().split(/\s+/);
      const m = oldWords.length;
      const n = newWords.length;
      const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
      for (let i = 1; i <= m; i++) {
          for (let j = 1; j <= n; j++) {
              if (oldWords[i-1] === newWords[j-1]) {
                  dp[i][j] = dp[i-1][j-1] + 1;
              } else {
                  dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
              }
          }
      }
      let i = m, j = n;
      const diff = [];
      while (i > 0 && j > 0) {
          if (oldWords[i-1] === newWords[j-1]) {
              diff.push({ type: 'same', value: oldWords[i-1] });
              i--; j--;
          } else if (dp[i-1][j] >= dp[i][j-1]) {
              diff.push({ type: 'del', value: oldWords[i-1] });
              i--;
          } else {
              diff.push({ type: 'add', value: newWords[j-1] });
              j--;
          }
      }
      while (i > 0) { diff.push({ type: 'del', value: oldWords[i-1] }); i--; }
      while (j > 0) { diff.push({ type: 'add', value: newWords[j-1] }); j--; }
      return diff.reverse();
};

const generateBingoCards = (glossaryData, count, size, deps) => {
  const { addToast, t, fisherYatesShuffle } = deps;
  try { if (window._DEBUG_PURE_HELPERS) console.log("[PureHelpers] generateBingoCards fired"); } catch(_) {}
      const totalCells = size * size;
      const centerIndex = size % 2 !== 0 ? Math.floor(totalCells / 2) : -1;
      const termsNeeded = centerIndex !== -1 ? totalCells - 1 : totalCells;
      let pool = [...glossaryData];
      if (!pool || pool.length === 0) {
          addToast(t('toasts.no_glossary_terms'), "error");
          return null;
      }
      if (pool.length < termsNeeded) {
          addToast(`Repeating terms to fill ${size}x${size} grid.`, "info");
          while (pool.length < termsNeeded) {
              pool = [...pool, ...glossaryData];
          }
      }
      const newCards = [];
      for (let i = 0; i < count; i++) {
          const shuffled = fisherYatesShuffle(pool);
          const cardContent = shuffled.slice(0, termsNeeded).map(item => ({ ...item, type: 'term' }));
          if (centerIndex !== -1) {
              cardContent.splice(centerIndex, 0, {
                  type: 'free',
                  term: 'FREE SPACE',
                  def: t('bingo.free_space'),
                  image: null
              });
          }
          newCards.push(cardContent);
      }
      return newCards;
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.PureHelpers = {
  repairSourceMarkdown,
  splitTextToSentences,
  diffWords,
  generateBingoCards,
};
