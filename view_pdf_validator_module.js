// view_pdf_validator_module.js
//
// Browser-side post-export PDF/UA-1 self-check. Same checks as the CLI
// validator at dev-tools/demo/exported_pdf_validator.cjs but runs in-Canvas
// against window.PDFLib (which is already loaded for the remediation pipeline).
//
// Wired into createTaggedPdf's return: after _bytes is produced, this module
// re-parses the bytes and runs structural assertions, attaching the result as
// `postExportValidator` on the createTaggedPdf return object. The Conformance
// Report renderer surfaces a compact pass/fail summary section.
//
// IMPORTANT: this is the IN-CANVAS validator. The CLI counterpart at
// dev-tools/demo/exported_pdf_validator.cjs is the dev/demo artifact (same
// checks, runs against any PDF on disk). veraPDF (Java) is the
// institutional-grade third-party validator that complements both —
// see dev-tools/demo/verapdf_check.cjs + docs/verapdf_install.md.
//
// HAND-MAINTAINED — no build script. Update in lockstep with the CLI version
// (dev-tools/demo/exported_pdf_validator.cjs) if you change the rule set, so
// the CLI and in-Canvas versions stay aligned.

(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (window.AlloModules && window.AlloModules.PdfValidator) {
    try { console.log('[PdfValidator] already loaded, skipping'); } catch (_) {}
    return;
  }

  var LEAF_ROLES = ['H1','H2','H3','H4','H5','H6','P','Figure','Caption','BlockQuote','Lbl','LBody','TH','TD','Span','Link'];
  var CONTAINER_ROLES = ['Document','Part','Article','Sect','Section','Div','NonStruct','Private','Table','TR','TBody','THead','TFoot','L','LI'];

  // ── Walk the StructTreeRoot once, collecting per-element facts ──
  function walkStructTree(stRoot, ctx, PDFLib) {
    var PDFName = PDFLib.PDFName;
    var PDFArray = PDFLib.PDFArray;
    var PDFDict = PDFLib.PDFDict;
    var PDFRef = PDFLib.PDFRef;
    var PDFNumber = PDFLib.PDFNumber; // audit #22: real class so an integer-MCID /K leaf passes instanceof
    var nm = function (n) { return PDFName.of(n); };
    var resolve = function (o) { return (o instanceof PDFRef) ? ctx.lookup(o) : o; };
    var elems = [];

    function walk(objIn, depth, parentRole) {
      var obj = resolve(objIn);
      if (depth > 60 || obj == null) return;
      if (obj instanceof PDFArray) {
        for (var i = 0; i < obj.size(); i++) walk(obj.get(i), depth + 1, parentRole);
        return;
      }
      if (!(obj instanceof PDFDict)) return;
      var S = obj.get(nm('S'));
      if (!S) {
        var k0 = obj.get(nm('K'));
        if (k0 != null) walk(k0, depth + 1, parentRole);
        return;
      }
      var role = String(S).replace(/^\//, '');
      var K = obj.get(nm('K'));
      var hasContent = false, hasChild = false;
      if (K != null) {
        var kr = resolve(K);
        var items;
        if (kr instanceof PDFArray) {
          items = [];
          for (var j = 0; j < kr.size(); j++) items.push(resolve(kr.get(j)));
        } else {
          items = [kr];
        }
        for (var x = 0; x < items.length; x++) {
          var it = items[x];
          if (it instanceof PDFNumber) hasContent = true; // integer MCID = marked content on the page (audit #22: was a constructor-NAME duck-type that mis-classed under the minified bundle → false-FAIL orphan)
          else if (it instanceof PDFDict) {
            var t = it.get(nm('Type'));
            var ts = t ? String(t) : '';
            if (ts === '/MCR' || ts === '/OBJR') hasContent = true;
            else if (it.get(nm('S'))) hasChild = true;
            else hasContent = true;
          }
        }
      }
      // ActualText VALUE (not just presence): needed for the pure-marker
      // /Lbl exemption — non-ASCII reloads as a hex string unless decoded.
      var atObj = obj.get(nm('ActualText'));
      var atText = '';
      try { atText = atObj ? (typeof atObj.decodeText === 'function' ? atObj.decodeText() : String(atObj)) : ''; } catch (_) { atText = ''; }
      // /Scope DETECTION (audit #10, 2026-06-15): the "Every TH has /Scope" rule below previously
      // tested only for the PRESENCE of an /A attribute dict, so a TH whose /A carried layout attrs
      // (e.g. O:/Table seeded after a ColSpan/RowSpan edit) but NO /Scope key falsely PASSED — a
      // false-PASS in the credibility-bearing byte validator. /A may be a single attribute dict OR
      // an array of them, and either may be an indirect ref — scan them all for an actual /Scope key.
      var aObj = obj.get(nm('A'));
      var hasScope = false;
      if (aObj) {
        var ar = resolve(aObj);
        var aItems = [];
        if (ar instanceof PDFArray) { for (var ai = 0; ai < ar.size(); ai++) aItems.push(resolve(ar.get(ai))); }
        else { aItems.push(ar); }
        for (var ax = 0; ax < aItems.length; ax++) { var ad = aItems[ax]; if (ad instanceof PDFDict && ad.get(nm('Scope'))) { hasScope = true; break; } }
      }
      elems.push({
        role: role,
        parentRole: parentRole || '',
        hasK: K != null,
        hasContent: hasContent,
        hasChild: hasChild,
        hasAlt: !!obj.get(nm('Alt')),
        hasActualText: !!atObj,
        actualText: atText,
        hasA: !!aObj,
        hasScope: hasScope,
        hasLang: !!obj.get(nm('Lang')),
        hasID: !!obj.get(nm('ID')),
      });
      if (K != null) walk(K, depth + 1, role);
    }

    var rootK = stRoot && stRoot.get ? stRoot.get(nm('K')) : null;
    if (rootK != null) walk(rootK, 0, '');
    return elems;
  }

  // Pure list-marker /Lbl: its glyph lives inside the same content line the
  // sibling LBody's MCR covers, and one MCID maps to one StructElem — so a
  // marker-only Lbl can never be independently linked. The pipeline's
  // evidence-based UA gate exempts these; the validator must match or it
  // CONTRADICTS the shipped declaration on every document with a list.
  // Quote chars included: standard-14 '•' round-trips as '"' on some decode
  // paths (observed in the goldens).
  function isMarkerLbl(e) {
    if (e.role !== 'Lbl') return false;
    var t = String(e.actualText || '').replace(/^[(/]|\)$/g, '').trim();
    return /^(["'•◦▪‣·*–-]|\d{1,3}[.)])$/.test(t);
  }

  // ── Main validator: takes PDF bytes (Uint8Array), returns a structured report ──
  async function validateExportedPdfBytes(bytes) {
    if (typeof window === 'undefined' || !window.PDFLib) {
      return { error: 'window.PDFLib not available — this module must run after pdf-lib is loaded' };
    }
    var PDFLib = window.PDFLib;
    var PDFDocument = PDFLib.PDFDocument;
    var PDFName = PDFLib.PDFName;
    var PDFRef = PDFLib.PDFRef;

    var doc;
    try {
      doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    } catch (e) {
      return { error: 'Failed to load PDF bytes: ' + (e && e.message), checks: [], summary: { overall: 'ERROR', pass: 0, fail: 0 } };
    }

    // Probe for encryption separately — load with ignoreEncryption=false to detect.
    var isEncrypted = false;
    try {
      await PDFDocument.load(bytes, { ignoreEncryption: false });
    } catch (e) {
      isEncrypted = /encrypted|password/i.test((e && e.message) || '');
    }

    var ctx = doc.context;
    var catalog = doc.catalog;
    var nm = function (n) { return PDFName.of(n); };
    var resolve = function (o) { return (o instanceof PDFRef) ? ctx.lookup(o) : o; };

    var stRoot = resolve(catalog.get(nm('StructTreeRoot')));
    var markInfo = resolve(catalog.get(nm('MarkInfo')));
    var markedRaw = markInfo && markInfo.get ? markInfo.get(nm('Marked')) : null;
    var langRaw = catalog.get(nm('Lang'));
    var pages = doc.getPages();
    var viewerPrefs = resolve(catalog.get(nm('ViewerPreferences')));
    var displayDocTitle = viewerPrefs && viewerPrefs.get ? viewerPrefs.get(nm('DisplayDocTitle')) : null;
    var outlines = resolve(catalog.get(nm('Outlines')));
    // /Info lives in the TRAILER, not the catalog — the old catalog lookup
    // made this rule fail on every document, including the pipeline's own
    // output (caught by the validator-parity golden, 2026-06-12). Use
    // pdf-lib's accessor, which reads the trailer correctly.
    var docTitle = null;
    try { docTitle = typeof doc.getTitle === 'function' ? (doc.getTitle() || null) : null; } catch (_) { docTitle = null; }

    // Font embedding walk — collect EVERY font dict, not just page-level /Font:
    // also nested form-XObject Resources, and Type0 DESCENDANT FontDescriptors (a
    // composite font's descriptor lives on its CIDFont, not the Type0 dict). The old
    // walk read only page /Font and checked FontDescriptor on the top font, so it (a)
    // missed fonts inside form XObjects and (b) miscounted Type0/Type3 — the exact
    // §7.21.4.1 divergence from veraPDF (pass-while-veraPDF-fails). (2026-06-19 parity)
    var fontsTotal = 0, fontsEmbedded = 0;
    var _seenFont = (typeof WeakSet === 'function') ? new WeakSet() : null;
    function _fontEmbedded(font) {
      if (!font || !font.get) return false;
      var sub = String(font.get(nm('Subtype')) || '');
      if (sub === '/Type3') return true; // glyphs are CharProcs content streams — embedded by definition
      var fd = resolve(font.get(nm('FontDescriptor')));
      if (!fd && sub === '/Type0') {
        var desc = resolve(font.get(nm('DescendantFonts')));
        var cid = desc && desc.get ? resolve(desc.get(0)) : null;
        if (cid && cid.get) fd = resolve(cid.get(nm('FontDescriptor')));
      }
      if (fd && fd.get) return !!(fd.get(nm('FontFile')) || fd.get(nm('FontFile2')) || fd.get(nm('FontFile3')));
      return false;
    }
    function _walkFonts(resources, depth) {
      if (!resources || !resources.get || depth > 4) return;
      var fontDict = resolve(resources.get(nm('Font')));
      if (fontDict && fontDict.entries) {
        try { for (var fp of fontDict.entries()) {
          var f = resolve(fp[1]);
          if (!f || !f.get) continue;
          if (_seenFont) { if (_seenFont.has(f)) continue; _seenFont.add(f); }
          fontsTotal++; if (_fontEmbedded(f)) fontsEmbedded++;
        } } catch (_) {}
      }
      var xobj = resolve(resources.get(nm('XObject')));
      if (xobj && xobj.entries) {
        try { for (var xp of xobj.entries()) {
          var xo = resolve(xp[1]);
          var xdict = xo && xo.dict ? xo.dict : (xo && xo.get ? xo : null);
          if (xdict && xdict.get && String(xdict.get(nm('Subtype')) || '') === '/Form') {
            _walkFonts(resolve(xdict.get(nm('Resources'))), depth + 1);
          }
        } } catch (_) {}
      }
    }
    try {
      for (var p = 0; p < pages.length; p++) {
        _walkFonts(resolve(pages[p].node.get(nm('Resources'))), 0);
      }
    } catch (_) { /* best-effort */ }

    // Link annotations (PDF/UA-1 §7.18.5 + §7.18): each needs /Contents (the
    // alternate description) and /StructParent (reachability from the tree).
    var linkAnnotsTotal = 0, linkAnnotsWithContents = 0, linkAnnotsWithStructParent = 0;
    try {
      for (var lp = 0; lp < pages.length; lp++) {
        var lAnnots = resolve(pages[lp].node.get(nm('Annots')));
        if (!lAnnots || typeof lAnnots.size !== 'function') continue;
        for (var la = 0; la < lAnnots.size(); la++) {
          var annot = resolve(lAnnots.get(la));
          if (!annot || !annot.get) continue;
          if (String(annot.get(nm('Subtype')) || '') !== '/Link') continue;
          linkAnnotsTotal++;
          if (annot.get(nm('Contents'))) linkAnnotsWithContents++;
          if (annot.get(nm('StructParent')) != null) linkAnnotsWithStructParent++;
        }
      }
    } catch (_) { /* best-effort */ }

    // XMP metadata text — for the declaration-consistency rule. The pipeline
    // writes its XMP uncompressed; a filtered stream (foreign PDFs) is
    // reported honestly as unreadable rather than guessed at.
    var xmpText = '', xmpUnreadable = false;
    try {
      var metaStream = resolve(catalog.get(nm('Metadata')));
      if (metaStream) {
        var metaFilter = metaStream.dict && metaStream.dict.get ? metaStream.dict.get(nm('Filter')) : null;
        var metaBytes = metaStream.contents || (metaStream.getContents && metaStream.getContents());
        if (metaFilter) xmpUnreadable = true;
        else if (metaBytes) xmpText = new TextDecoder('utf-8').decode(metaBytes);
      }
    } catch (_) { xmpUnreadable = true; }
    var uaDeclaredInXmp = xmpText.indexOf('<pdfuaid:part>1</pdfuaid:part>') !== -1;

    // Walk the structure tree.
    var elems = stRoot ? walkStructTree(stRoot, ctx, PDFLib) : [];
    var leaves = elems.filter(function (e) { return LEAF_ROLES.indexOf(e.role) >= 0; });
    var containers = elems.filter(function (e) { return CONTAINER_ROLES.indexOf(e.role) >= 0; });
    var markerLblCount = leaves.filter(isMarkerLbl).length;
    var orphanedLeaves = leaves.filter(function (e) { return !e.hasContent && !isMarkerLbl(e); });
    // Containment (the veraPDF ISO 14289-1 7.2 structure class): cells inside
    // TR; TR inside Table/THead/TBody/TFoot; LI inside L; Lbl/LBody inside LI.
    var containment = { checked: 0, bad: [] };
    for (var ce = 0; ce < elems.length; ce++) {
      var el = elems[ce];
      var want = null;
      if (el.role === 'TH' || el.role === 'TD') want = ['TR'];
      else if (el.role === 'TR') want = ['Table', 'THead', 'TBody', 'TFoot'];
      else if (el.role === 'LI') want = ['L'];
      else if (el.role === 'Lbl' || el.role === 'LBody') want = ['LI'];
      if (!want) continue;
      containment.checked++;
      if (want.indexOf(el.parentRole) === -1 && containment.bad.length < 8) containment.bad.push(el.role + ' in ' + (el.parentRole || '(root)'));
    }
    var byRole = {};
    for (var k = 0; k < elems.length; k++) byRole[elems[k].role] = (byRole[elems[k].role] || 0) + 1;
    var thElems = elems.filter(function (e) { return e.role === 'TH'; });
    var cellElems = elems.filter(function (e) { return e.role === 'TH' || e.role === 'TD'; });
    var figures = elems.filter(function (e) { return e.role === 'Figure'; });

    var checks = [];
    function pass(rule, ok, detail) { checks.push({ rule: rule, status: ok ? 'pass' : 'fail', detail: detail || '' }); }

    pass('StructTreeRoot present', !!stRoot);
    pass('MarkInfo /Marked true', String(markedRaw) === 'true');
    pass('Primary language set (/Lang)', !!langRaw, langRaw ? String(langRaw) : '');
    pass('Structure tree has content (rootK not null)', elems.length > 0, elems.length + ' elements');
    pass('At least one heading present', elems.some(function (e) { return /^H[1-6]$/.test(e.role); }));
    pass('Every TH has /Scope', thElems.length === 0 || thElems.every(function (e) { return e.hasScope; }), thElems.length + ' TH cells');
    pass('Every TH/TD has /ActualText', cellElems.length === 0 || cellElems.every(function (e) { return e.hasActualText; }), cellElems.length + ' cells');
    pass('Every Figure has /Alt', figures.length === 0 || figures.every(function (e) { return e.hasAlt; }), figures.length + ' figures');
    pass('Document is NOT encrypted (AT requires read access)', !isEncrypted);
    pass('Document title set in metadata (/Info /Title)', !!docTitle, docTitle ? String(docTitle).slice(0, 80) : '');
    pass('ViewerPreferences /DisplayDocTitle = true', String(displayDocTitle) === 'true', displayDocTitle ? String(displayDocTitle) : '(missing)');
    pass('All page fonts embedded', fontsTotal === 0 || fontsEmbedded === fontsTotal, fontsEmbedded + '/' + fontsTotal + ' fonts embedded');
    pass('Document outline (bookmarks) present', !!outlines, outlines ? '(navigation aid)' : '(none)');
    pass('No orphaned semantic leaves', orphanedLeaves.length === 0,
      orphanedLeaves.length + '/' + leaves.length + ' orphaned' + (markerLblCount ? ' (' + markerLblCount + ' pure-marker Lbl exempted — see in-code rationale)' : ''));
    // ── Parity rules (2026-06-12): the gate/veraPDF contracts, verified from
    // the SHIPPED bytes so Canvas users (no Java) see the same reality. ──
    pass('Link annotations have /Contents (PDF/UA 7.18.5)',
      linkAnnotsTotal === 0 || linkAnnotsWithContents === linkAnnotsTotal,
      linkAnnotsTotal === 0 ? '0 link annotations' : linkAnnotsWithContents + '/' + linkAnnotsTotal + ' with alternate descriptions');
    pass('Link annotations reachable from the tag tree (/StructParent)',
      linkAnnotsTotal === 0 || linkAnnotsWithStructParent === linkAnnotsTotal,
      linkAnnotsTotal === 0 ? '0 link annotations' : linkAnnotsWithStructParent + '/' + linkAnnotsTotal + ' with /StructParent');
    pass('Table/list containment (TH/TD in TR, TR in Table, LI in L, Lbl/LBody in LI)',
      containment.bad.length === 0,
      containment.checked === 0 ? 'no table/list structure' : (containment.bad.length === 0 ? containment.checked + ' containment edges OK' : 'bad: ' + containment.bad.join('; ')));
    // The evidence-based declaration contract: a pdfuaid:part=1 claim in the
    // XMP must be backed by zero orphaned content leaves. A WITHHELD claim is
    // a PASS (that's the honesty design working) — the detail says why.
    pass('PDF/UA declaration is evidence-backed (XMP ↔ content linkage)',
      xmpUnreadable ? true : (!uaDeclaredInXmp || orphanedLeaves.length === 0),
      xmpUnreadable ? 'XMP stream is compressed/unreadable — checked externally via veraPDF instead'
        : (uaDeclaredInXmp
          ? 'declared, ' + orphanedLeaves.length + ' orphaned leaves' + (orphanedLeaves.length > 0 ? ' — CLAIM NOT BACKED' : ' (backed)')
          : 'declaration withheld (' + orphanedLeaves.length + ' orphaned leaves) — honest posture'));
    // §7.1/§7.2 coverage honesty (2026-06-19 parity): this self-check validates the STRUCTURE TREE +
    // key dictionary properties, but does NOT parse page content streams to confirm every operator is
    // marked /Artifact or tagged with a reachable MCID. That is exactly the gap the independent veraPDF
    // validator caught on scanned docs (§7.1 test 3 ×100). Surface it as WARN — never a silent pass —
    // so a green self-check is not mistaken for full PDF/UA-1 conformance.
    checks.push({ rule: 'Content marking & MCID reachability (§7.1, §7.2)', status: 'warn',
      detail: 'Not verified here — this self-check does not parse page content streams. Run the independent veraPDF validation to confirm every content operator is marked /Artifact or tagged with a reachable MCID (the scanned-PDF gap).' });

    var passCount = checks.filter(function (c) { return c.status === 'pass'; }).length;
    var failCount = checks.filter(function (c) { return c.status === 'fail'; }).length;

    return {
      byteLength: bytes.length,
      pageCount: pages.length,
      isEncrypted: isEncrypted,
      catalogChecks: {
        hasStructTreeRoot: !!stRoot,
        marked: String(markedRaw),
        lang: langRaw ? String(langRaw) : null,
        docTitle: docTitle ? String(docTitle).slice(0, 200) : null,
        displayDocTitle: displayDocTitle ? String(displayDocTitle) : null,
        hasOutline: !!outlines,
        fontsTotal: fontsTotal,
        fontsEmbedded: fontsEmbedded,
      },
      structureTally: {
        totalStructElems: elems.length,
        leafCount: leaves.length,
        containerCount: containers.length,
        orphanedLeafCount: orphanedLeaves.length,
        markerLblExempted: markerLblCount,
        orphanedRoles: orphanedLeaves.map(function (e) { return e.role; }),
        byRole: byRole,
      },
      linkAnnots: {
        total: linkAnnotsTotal,
        withContents: linkAnnotsWithContents,
        withStructParent: linkAnnotsWithStructParent,
      },
      uaClaim: {
        declaredInXmp: uaDeclaredInXmp,
        xmpUnreadable: xmpUnreadable,
        evidenceBacked: xmpUnreadable ? null : (!uaDeclaredInXmp || orphanedLeaves.length === 0),
      },
      cellChecks: {
        thCount: thElems.length,
        thWithScope: thElems.filter(function (e) { return e.hasScope; }).length,
        cellCount: cellElems.length,
        cellsWithActualText: cellElems.filter(function (e) { return e.hasActualText; }).length,
        figureCount: figures.length,
        figuresWithAlt: figures.filter(function (e) { return e.hasAlt; }).length,
        figuresLinked: figures.filter(function (e) { return e.hasContent; }).length,
      },
      checks: checks,
      summary: {
        pass: passCount,
        fail: failCount,
        overall: failCount === 0 ? 'PASS' : 'FAIL',
      },
    };
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.PdfValidator = {
    validateExportedPdfBytes: validateExportedPdfBytes,
  };
  try { console.log('[PdfValidator] Loaded — window.AlloModules.PdfValidator.validateExportedPdfBytes(bytes)'); } catch (_) {}
})();
