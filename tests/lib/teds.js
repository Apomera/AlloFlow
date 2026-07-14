// TEDS — Tree-Edit-Distance-based Similarity for HTML tables (2026-06-14).
//
// Implements the deterministic half of the Beat-Adobe-on-3 / table-reading-order
// golden-master harness: a reproducible structural-similarity score in [0,1]
// between two HTML tables, computed via the classic Zhang-Shasha ordered-tree
// edit distance (the same TED the PubTabNet/IBM `teds` reference computes — APTED
// is only a faster route to the identical optimum). Pure JS, no DOM dependency
// (a tolerant regex table parser), so it runs in vitest AND plain Node (dev-tools
// eval). Nested tables-in-cells are NOT supported (rare; documented limitation).
//
// SEMANTICS (deliberate, per docs/table_readingorder_golden_master_plan.md):
//   - <td> and <th> are BOTH parsed as a generic 'cell' node. Header role,
//     scope, and caption are NOT part of the tree — so promoting a <td> to a
//     <th> (a legitimate accessibility edit) does NOT lower TEDS. TEDS here is a
//     PRESERVATION / structure metric, not an accessibility score. The "did we
//     add headers/scope" question is a SEPARATE deterministic + axe check.
//   - TEDS (default): cell rename cost = normalized char-edit-distance of text
//     when spans match, else 1. TEDS-Struct ({ structOnly:true }): ignore text.
//
// TEDS = 1 - TED(T1,T2) / max(nodes(T1), nodes(T2)).

// ── Tolerant HTML-table parser → tree ──
// Tree shape: { label:'table', children:[ { label:'tr', children:[ cellNode ] } ] }
// cellNode: { label:'cell', colspan:int, rowspan:int, text:string }
function _stripTags(s) {
  return String(s == null ? '' : s)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
function _attrInt(attrs, name) {
  const m = new RegExp(name + '\\s*=\\s*["\']?(\\d+)', 'i').exec(attrs || '');
  const v = m ? parseInt(m[1], 10) : 1;
  return (v >= 1 && v <= 1000) ? v : 1;
}
export function parseTableToTree(html) {
  const src = String(html == null ? '' : html);
  // Scope to the first <table>…</table> if present, else use the whole string.
  const tableMatch = /<table\b[\s\S]*?<\/table>/i.exec(src);
  const scope = tableMatch ? tableMatch[0] : src;
  const rows = [];
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let trm;
  while ((trm = trRe.exec(scope)) !== null) {
    const cells = [];
    const cellRe = /<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    let cm;
    while ((cm = cellRe.exec(trm[1])) !== null) {
      cells.push({ label: 'cell', colspan: _attrInt(cm[2], 'colspan'), rowspan: _attrInt(cm[2], 'rowspan'), text: _stripTags(cm[3]) });
    }
    rows.push({ label: 'tr', children: cells });
  }
  return { label: 'table', children: rows };
}

// ── Post-order flatten + Zhang-Shasha helpers ──
function _postorder(root) {
  // Returns { nodes:[node], ld:[1-based leftmost-leaf post-order index per node] }.
  const nodes = [];
  const ld = [];
  function visit(n) {
    let firstLeaf = null;
    const kids = n.children || [];
    for (let k = 0; k < kids.length; k++) {
      const childLeaf = visit(kids[k]);
      if (k === 0) firstLeaf = childLeaf;
    }
    nodes.push(n);
    const myIndex = nodes.length; // 1-based post-order index
    ld.push(firstLeaf == null ? myIndex : firstLeaf);
    return ld[myIndex - 1];
  }
  visit(root);
  return { nodes, ld };
}
function _keyroots(ld) {
  // keyroot = largest post-order index for each distinct leftmost-leaf value.
  const lastForLd = {};
  for (let i = 1; i <= ld.length; i++) lastForLd[ld[i - 1]] = i;
  return Object.keys(lastForLd).map((k) => lastForLd[k]).sort((a, b) => a - b);
}
function _make2D(r, c) {
  const m = new Array(r);
  for (let i = 0; i < r; i++) { m[i] = new Array(c).fill(0); }
  return m;
}
function _normEditDist(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a === b) return 0;
  const n = a.length, m = b.length;
  if (!n || !m) return 1;
  const prev = new Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    let diag = prev[0]; prev[0] = i;
    for (let j = 1; j <= m; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[m] / Math.max(n, m);
}

// Zhang-Shasha tree edit distance with a TEDS-style cost model.
export function treeEditDistance(treeA, treeB, opts) {
  opts = opts || {};
  const structOnly = !!opts.structOnly;
  const renameCost = (x, y) => {
    if (x.label !== y.label) return 1;
    if (x.label !== 'cell') return 0; // structural nodes (table/tr): same label = free
    if ((x.colspan || 1) !== (y.colspan || 1) || (x.rowspan || 1) !== (y.rowspan || 1)) return 1;
    return structOnly ? 0 : _normEditDist(x.text, y.text);
  };
  const A = _postorder(treeA), B = _postorder(treeB);
  const aN = A.nodes, bN = B.nodes, aLd = A.ld, bLd = B.ld;
  const n = aN.length, m = bN.length;
  const TD = _make2D(n + 1, m + 1);
  const krA = _keyroots(aLd), krB = _keyroots(bLd);
  for (let ai = 0; ai < krA.length; ai++) {
    const ki = krA[ai];
    for (let bi = 0; bi < krB.length; bi++) {
      const kj = krB[bi];
      const li = aLd[ki - 1], lj = bLd[kj - 1];
      const fd = _make2D(ki - li + 2, kj - lj + 2);
      for (let i = li; i <= ki; i++) fd[i - li + 1][0] = fd[i - li][0] + 1;       // delete
      for (let j = lj; j <= kj; j++) fd[0][j - lj + 1] = fd[0][j - lj] + 1;       // insert
      for (let i = li; i <= ki; i++) {
        for (let j = lj; j <= kj; j++) {
          const del = fd[i - li][j - lj + 1] + 1;
          const ins = fd[i - li + 1][j - lj] + 1;
          if (aLd[i - 1] === li && bLd[j - 1] === lj) {
            const ren = fd[i - li][j - lj] + renameCost(aN[i - 1], bN[j - 1]);
            fd[i - li + 1][j - lj + 1] = Math.min(del, ins, ren);
            TD[i][j] = fd[i - li + 1][j - lj + 1];
          } else {
            const ren = fd[aLd[i - 1] - li][bLd[j - 1] - lj] + TD[i][j];
            fd[i - li + 1][j - lj + 1] = Math.min(del, ins, ren);
          }
        }
      }
    }
  }
  return { distance: TD[n][m], nodesA: n, nodesB: m };
}

function _count(tree) { return _postorder(tree).nodes.length; }

// TEDS in [0,1]; 1 = identical structure+content. opts.structOnly = TEDS-Struct.
export function teds(htmlA, htmlB, opts) {
  const a = parseTableToTree(htmlA), b = parseTableToTree(htmlB);
  const { distance } = treeEditDistance(a, b, opts);
  const denom = Math.max(_count(a), _count(b), 1);
  return Math.max(0, 1 - distance / denom);
}
export function tedsStruct(htmlA, htmlB) { return teds(htmlA, htmlB, { structOnly: true }); }
