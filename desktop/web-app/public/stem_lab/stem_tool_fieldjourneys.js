// Generated journey pilot. Run dev-tools/campaign-adventure-pilot/build-in-app.cjs.
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // dev-tools/campaign-adventure-pilot/response-records.mjs
  function responseText(value) {
    if (typeof value !== "string" || !value.trim() || value.trim().length > 1200) throw Error("Write a response of 1 to 1,200 characters.");
    return value.trim();
  }
  function validateResponses(raw, commands) {
    if (!Array.isArray(raw) || raw.length > 100) throw Error("Invalid saved written responses.");
    let prior = 0, total = 0;
    const responses = raw.map((r) => {
      if (!r || !Number.isInteger(r.revision) || r.revision <= prior || r.revision > commands.length || r.actionId !== commands[r.revision - 1]) throw Error("Written response does not match its saved decision.");
      const text = responseText(r.text);
      prior = r.revision;
      total += text.length;
      return { revision: r.revision, actionId: r.actionId, text };
    });
    if (total > 36e3) throw Error("This journey has reached its written-response limit. Download the journal or continue using choices.");
    return responses;
  }
  var init_response_records = __esm({
    "dev-tools/campaign-adventure-pilot/response-records.mjs"() {
    }
  });

  // dev-tools/campaign-adventure-pilot/core.mjs
  var core_exports = {};
  __export(core_exports, {
    PREFIX: () => PREFIX,
    addNote: () => addNote,
    dispatch: () => dispatch,
    forkRun: () => forkRun,
    listRuns: () => listRuns,
    makeRun: () => makeRun,
    materialize: () => materialize,
    narrate: () => narrate,
    readRun: () => readRun,
    saveKey: () => saveKey,
    saveRun: () => saveRun,
    validateRun: () => validateRun
  });
  function makeRun(adapter, { seed = "FIELD-01", runId, config = {} } = {}) {
    if (typeof seed !== "string" || !seed.trim() || seed.length > 32) throw new Error("Use a world seed of 1 to 32 characters.");
    const id = runId || globalThis.crypto.randomUUID();
    if (!/^[a-zA-Z0-9-]{1,64}$/.test(id)) throw new Error("Invalid run ID.");
    const initial = adapter.start(seed.trim(), config);
    return {
      version: 1,
      campaignId: adapter.id,
      runId: id,
      seed: seed.trim(),
      config: adapter.config(initial),
      commands: [],
      notes: [],
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  function materialize(adapter, run) {
    if (run.campaignId !== adapter.id) throw new Error("This save belongs to a different campaign.");
    let model = adapter.start(run.seed, run.config);
    for (const id of run.commands) {
      const action = adapter.actions(model).find((a) => a.id === id);
      if (!action || action.disabled) throw new Error("Saved action is no longer valid: " + id);
      model = adapter.step(model, id);
    }
    return model;
  }
  function dispatch(adapter, run, actionId, expectedRevision = run.commands.length) {
    if (expectedRevision !== run.commands.length) throw new Error("That decision has already been handled.");
    if (run.commands.length >= MAX_COMMANDS) throw new Error("This pilot run has reached its decision limit.");
    const model = materialize(adapter, run);
    const action = adapter.actions(model).find((a) => a.id === actionId);
    if (!action || action.disabled) throw new Error("That action is unavailable in the current situation.");
    const next = { ...copy(run), commands: [...run.commands, actionId] };
    materialize(adapter, next);
    return next;
  }
  function validateRun(adapter, raw) {
    if (!raw || ![1, 2].includes(raw.version) || raw.campaignId !== adapter.id || !/^[a-zA-Z0-9-]{1,64}$/.test(raw.runId || "")) throw new Error("Unrecognized pilot save.");
    if (typeof raw.seed !== "string" || !raw.seed.trim() || raw.seed.length > 32) throw new Error("Invalid saved world seed.");
    if (!Array.isArray(raw.commands) || raw.commands.length > MAX_COMMANDS || raw.commands.some((c) => typeof c !== "string" || c.length > 120)) throw new Error("Invalid saved decisions.");
    if (!Array.isArray(raw.notes) || raw.notes.length > 100 || raw.notes.some((n) => !n || !Number.isInteger(n.revision) || n.revision < 0 || n.revision > raw.commands.length || typeof n.text !== "string" || n.text.length > 1200)) throw new Error("Invalid saved field notes.");
    if (typeof raw.createdAt !== "string" || !Number.isFinite(Date.parse(raw.createdAt))) throw new Error("Invalid saved date.");
    const run = {
      version: raw.version,
      campaignId: raw.campaignId,
      runId: raw.runId,
      seed: raw.seed,
      config: copy(raw.config),
      commands: raw.commands.slice(),
      notes: copy(raw.notes),
      createdAt: raw.createdAt
    };
    if (raw.version === 2) run.responses = validateResponses(raw.responses, run.commands);
    else if (raw.responses !== void 0) throw Error("Written responses require save version 2.");
    materialize(adapter, run);
    return run;
  }
  function saveKey(run) {
    return PREFIX + run.campaignId + ":" + run.runId;
  }
  function saveRun(storage, run) {
    try {
      const key = saveKey(run), existing = storage.getItem?.(key);
      if (existing) {
        let old;
        try {
          old = JSON.parse(existing);
        } catch {
          return { ok: false, message: "The existing saved journey needs recovery and was left untouched. Download this journey to keep your work." };
        }
        if (![1, 2].includes(old.version) || old.version === 2 && run.version !== 2 || old.campaignId !== run.campaignId || old.runId !== run.runId || old.seed !== run.seed || !Array.isArray(old.commands) || !Array.isArray(old.notes) || old.commands.some((id, i) => run.commands[i] !== id) || old.notes.some((note, i) => JSON.stringify(run.notes[i]) !== JSON.stringify(note)) || old.version === 2 && (!Array.isArray(old.responses) || old.responses.some((r, i) => JSON.stringify(run.responses?.[i]) !== JSON.stringify(r)))) {
          return { ok: false, message: "Another version of this journey is already saved. It was left untouched. Download your journal before reopening the saved version." };
        }
      }
      storage.setItem(key, JSON.stringify(run));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: "This browser could not save the journey. Keep this page open and download your journal." };
    }
  }
  function readRun(storage, key, adapters) {
    if (!key.startsWith(PREFIX)) throw new Error("Only pilot saves can be opened here.");
    const text = storage.getItem(key);
    if (!text || text.length > 18e4) throw new Error("This pilot save cannot be read. It has been left untouched.");
    const raw = JSON.parse(text);
    const adapter = adapters.find((a) => a.id === raw.campaignId);
    if (!adapter) throw new Error("This save needs a campaign that is not available in this pilot.");
    const run = validateRun(adapter, raw);
    if (saveKey(run) !== key) throw new Error("Saved journey identity does not match its storage key.");
    return run;
  }
  function listRuns(storage, adapters) {
    const result = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key || !adapters.some((a) => key.startsWith(PREFIX + a.id + ":"))) continue;
      try {
        const run = readRun(storage, key, adapters);
        result.push({ key, run });
      } catch (error) {
        result.push({ key, error: "Saved journey needs recovery; original data retained." });
      }
    }
    return result.sort((a, b) => (b.run?.createdAt || "").localeCompare(a.run?.createdAt || ""));
  }
  function addNote(run, text) {
    const value = String(text).trim();
    if (!value || value.length > 1200 || run.notes.length >= 100) throw new Error("Write a field note of 1 to 1,200 characters (up to 100 notes per journey).");
    return { ...copy(run), notes: [...run.notes, { revision: run.commands.length, text: value }] };
  }
  function forkRun(run, revision, runId = globalThis.crypto.randomUUID()) {
    if (!Number.isInteger(revision) || revision < 0 || revision > run.commands.length) throw new Error("Invalid replay point.");
    return {
      ...copy(run),
      runId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      commands: run.commands.slice(0, revision),
      notes: run.notes.filter((n) => n.revision <= revision),
      ...run.version === 2 ? { responses: (run.responses || []).filter((r) => r.revision <= revision) } : {}
    };
  }
  async function narrate(scene, provider, { timeoutMs = 1800, signal } = {}) {
    if (!provider) return { text: scene.body, status: "authored" };
    if (signal?.aborted) return { text: scene.body, status: "fallback" };
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) controller.abort();
    let timer;
    try {
      const result = await Promise.race([
        Promise.resolve().then(() => provider(copy({ title: scene.title, body: scene.body, evidence: scene.evidence }), { signal: controller.signal })),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error("timeout"));
          }, timeoutMs);
        }),
        new Promise((_, reject) => {
          controller.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        })
      ]);
      if (controller.signal.aborted) throw new Error("aborted");
      if (typeof result !== "string" || !result.trim() || result.length > 1800) throw new Error("Invalid narration.");
      return { text: result.trim(), status: "optional" };
    } catch {
      return { text: scene.body, status: "fallback" };
    } finally {
      clearTimeout(timer);
      controller.abort();
      signal?.removeEventListener("abort", abort);
    }
  }
  var PREFIX, MAX_COMMANDS, copy;
  var init_core = __esm({
    "dev-tools/campaign-adventure-pilot/core.mjs"() {
      init_response_records();
      PREFIX = "alloflow-campaign-pilot:v1:";
      MAX_COMMANDS = 500;
      copy = (x) => JSON.parse(JSON.stringify(x));
    }
  });

  // dev-tools/campaign-adventure-pilot/watershed-source.mjs
  function createWatershedRuntime() {
    const window2 = { StemLab: { findById: (items, id) => items.find((item) => item.id === id) } };
    const t = (key, fallback) => fallback == null ? key : fallback;
    const addToast = null, announceToSR = null, awardStemXP = null;
    const setTimeout2 = () => {
    }, checkWaterCycleChallenges = () => {
    };
    let steward, d = {};
    const setSteward = (patch) => {
      steward = Object.assign({}, steward, patch);
    };
    const upd = (key, value) => {
      d[key] = value;
    };
    var MAINE_WATERSHED_COMPONENTS = [
      {
        id: "headwaterStreams",
        name: "Headwater Streams",
        icon: "\u{1F3D4}\uFE0F",
        color: "#0ea5e9",
        defaultState: { quality: 62, connectivity: 78, support: 60 },
        targets: { quality: 78, connectivity: 80, support: 65 },
        // Copy lives in wcWatershedCopy() so the English sits beside its key.
        // Empty object kept so `c.deepDive ?` still offers the deep-dive button.
        deepDive: {}
      },
      {
        id: "riverMainstem",
        name: "River Mainstem",
        icon: "\u{1F30A}",
        color: "#1d4ed8",
        defaultState: { quality: 48, connectivity: 25, support: 65 },
        targets: { quality: 70, connectivity: 70, support: 70 },
        // Copy lives in wcWatershedCopy() so the English sits beside its key.
        // Empty object kept so `c.deepDive ?` still offers the deep-dive button.
        deepDive: {}
      },
      {
        id: "floodplainWetlands",
        name: "Floodplain Wetlands",
        icon: "\u{1FAB7}",
        color: "#16a34a",
        defaultState: { quality: 55, connectivity: 60, support: 50 },
        targets: { quality: 75, connectivity: 70, support: 65 },
        // Copy lives in wcWatershedCopy() so the English sits beside its key.
        // Empty object kept so `c.deepDive ?` still offers the deep-dive button.
        deepDive: {}
      },
      {
        id: "forestBuffer",
        name: "Forested Buffer Zones",
        icon: "\u{1F332}",
        color: "#15803d",
        defaultState: { quality: 58, connectivity: 50, support: 60 },
        targets: { quality: 75, connectivity: 70, support: 70 },
        // Copy lives in wcWatershedCopy() so the English sits beside its key.
        // Empty object kept so `c.deepDive ?` still offers the deep-dive button.
        deepDive: {}
      },
      {
        id: "agriculturalWatershed",
        name: "Agricultural Watershed",
        icon: "\u{1F69C}",
        color: "#a16207",
        defaultState: { quality: 45, connectivity: 55, support: 55 },
        targets: { quality: 65, connectivity: 60, support: 65 },
        // Copy lives in wcWatershedCopy() so the English sits beside its key.
        // Empty object kept so `c.deepDive ?` still offers the deep-dive button.
        deepDive: {}
      },
      {
        id: "suburbanEdges",
        name: "Suburban Edges",
        icon: "\u{1F3D8}\uFE0F",
        color: "#7c3aed",
        defaultState: { quality: 50, connectivity: 60, support: 50 },
        targets: { quality: 65, connectivity: 65, support: 65 },
        // Copy lives in wcWatershedCopy() so the English sits beside its key.
        // Empty object kept so `c.deepDive ?` still offers the deep-dive button.
        deepDive: {}
      }
    ];
    function wcWatershedCopy(t2) {
      return {
        headwaterStreams: {
          role: t2("stem.watercycle.ws_headwaterStreams_role", "Cold-water indicator"),
          desc: t2("stem.watercycle.ws_headwaterStreams_desc", "High-elevation forested streams. Native brook trout, native eastern brook trout, water temperature below 20\xB0C. The cleanest water in the watershed; everything downstream is shaped by what happens here."),
          deepDive: {
            knowledge: t2("stem.watercycle.ws_headwaterStreams_knowledge", "Headwater streams are first-order channels: small enough to step across, fed by springs and seeps, almost always shaded by mature forest. They make up roughly 60 to 80 percent of the total stream-mile length in a typical Maine watershed but receive a fraction of the regulatory attention. Native brook trout require water below about 20\xB0C, dissolved oxygen above 7 mg/L, and woody debris for cover. Every degree of warming pushes their range north and uphill."),
            casework: t2("stem.watercycle.ws_headwaterStreams_casework", "The Eastern Brook Trout Joint Venture maps the status of native populations across the species range. Maine retains an unusually large portion of historic native brook trout habitat compared to the rest of the Northeast. Most successful headwater protection has come from upper-watershed conservation easements and replacement of undersized culverts that act as warm-water bottlenecks."),
            modernContext: t2("stem.watercycle.ws_headwaterStreams_moderncontext", "Climate change is the central long-term threat to Maine headwater streams. Several Maine Audubon and Wabanaki community projects have led culvert replacement and shade-tree planting campaigns. The 2023 Maine Climate Action Plan named cold-water-fishery protection as a priority but funding has lagged.")
          }
        },
        riverMainstem: {
          role: t2("stem.watercycle.ws_riverMainstem_role", "Migratory fish corridor"),
          desc: t2("stem.watercycle.ws_riverMainstem_desc", "The big channel through the watershed. Historically the route for Atlantic salmon, alewife, sea-run brook trout, eels, sturgeon. In Maine, dam barriers block most of these runs; recent removals (Edwards Dam 1999, Fort Halifax 2008, Veazie 2012, Great Works 2013) reopened sections."),
          deepDive: {
            knowledge: t2("stem.watercycle.ws_riverMainstem_knowledge", "Anadromous fish (born in fresh water, mature at sea, return upstream to spawn) include Atlantic salmon, alewife, blueback herring, American shad, sea lamprey, and sea-run brook trout. Each species has different barrier-passage tolerance: alewife can use modest fish ladders; Atlantic salmon need near-full passage; sturgeon need almost-complete connectivity. Dam barriers degrade water quality upstream too: stagnant impoundments warm, accumulate sediment, and lose dissolved oxygen."),
            casework: t2("stem.watercycle.ws_riverMainstem_casework", "The Penobscot River Restoration Project (Penobscot Nation, NGOs, hydro companies) removed Veazie Dam in 2012 and Great Works Dam in 2013 while preserving most generation through upgrades elsewhere. River herring returns increased over 1000-fold in the first decade post-removal. The Kennebec saw Edwards Dam come down in 1999 and Fort Halifax in 2008. The Sebasticook tributary alone now hosts the largest river-herring run on the East Coast."),
            modernContext: t2("stem.watercycle.ws_riverMainstem_moderncontext", "The Penobscot Nation has led the legal, political, and ecological work on its ancestral river. Ongoing dam-removal campaigns target the Mattaceunk, Milford, and lower Kennebec dams. NOAA and the Atlantic Salmon Federation track returns annually; numbers are recovering but still well below historic.")
          }
        },
        floodplainWetlands: {
          role: t2("stem.watercycle.ws_floodplainWetlands_role", "Beaver-built flood storage"),
          desc: t2("stem.watercycle.ws_floodplainWetlands_desc", "Beaver dam complexes and adjacent wet meadows. Slow flood pulses, recharge groundwater, filter nutrients, support amphibians, waterfowl, moose, otter. Beaver Dam Analogs (BDAs) mimic this work where beavers have not returned."),
          deepDive: {
            knowledge: t2("stem.watercycle.ws_floodplainWetlands_knowledge", "Beaver-built wetlands are the textbook example of ecosystem engineering. A single beaver complex can create up to 10 acres of wet meadow that stores flood water, recharges groundwater, traps sediment, filters nutrients, and supports moose, waterfowl, river otter, brook trout, and amphibians. Wetland complexes also act as firebreaks during dry years. North American beaver populations were estimated at 60 to 400 million pre-contact; the European fur trade crashed them to under 100,000 by 1900."),
            casework: t2("stem.watercycle.ws_floodplainWetlands_casework", "Beaver populations have recovered to perhaps 10 to 15 million across North America but remain far below historic in most Northeast watersheds. Beaver Dam Analog (BDA) restoration mimics beaver work with imported wood, rock, and posts; it is increasingly used where beavers have not naturally recolonized. The Methow Beaver Project in Washington and similar Maine pilots have shown that BDAs can trigger natural beaver return within 2 to 4 years."),
            modernContext: t2("stem.watercycle.ws_floodplainWetlands_moderncontext", "Beavers face conflict with road managers and downstream landowners over flooding. Lethal trapping continues in Maine. Beaver Deceiver flow-control devices are the non-lethal alternative; Wabanaki communities have led some of the strongest beaver-protection advocacy in the region. Climate-resilience planners increasingly cite beavers as low-cost natural infrastructure.")
          }
        },
        forestBuffer: {
          role: t2("stem.watercycle.ws_forestBuffer_role", "Riparian shade and filter"),
          desc: t2("stem.watercycle.ws_forestBuffer_desc", "The strip of mature forest along stream banks. Shade keeps water cold, roots stabilize banks, leaf litter feeds aquatic insects, wood falls in to create habitat. A 50-foot intact buffer is the single most cost-effective stream protection."),
          deepDive: {
            knowledge: t2("stem.watercycle.ws_forestBuffer_knowledge", "Riparian buffers do five distinct jobs at once: shade keeps water cold for trout and salmon parr, root systems stabilize banks against erosion, leaf litter is the primary food source for stream insects (which feed fish), woody debris falls in to create pools and cover, and the buffer filters runoff from adjacent agricultural and developed land. The pioneering research by Allan and others established that even a 30-foot intact buffer captures most of the runoff-quality benefit, and a 100-foot buffer provides the full hydrological function."),
            casework: t2("stem.watercycle.ws_forestBuffer_casework", "Maine's Shoreland Zoning Act (1971) regulates the first 75 feet around great ponds and 250 feet around rivers, but enforcement is uneven and exemptions for development are routine. Land trust easements have been more effective than regulation in many Maine watersheds. The Maine Coast Heritage Trust and Atlantic Salmon Federation have funded buffer-replanting on hundreds of farm streams; cover-cropping plus tree-row plantings cut runoff measurably within 3 to 5 years."),
            modernContext: t2("stem.watercycle.ws_forestBuffer_moderncontext", "Buffer policy in Maine remains fragmented across jurisdictions. The strongest buffer protections often come from voluntary landowner agreements rather than zoning. Climate-driven storm events make buffers MORE important (they hold the streambank during high flows), so the federal Infrastructure Investment and Jobs Act has lifted buffer-restoration funding.")
          }
        },
        agriculturalWatershed: {
          role: t2("stem.watercycle.ws_agriculturalWatershed_role", "Nutrient + sediment source"),
          desc: t2("stem.watercycle.ws_agriculturalWatershed_desc", "Dairy farms, hay fields, row crops, blueberry barrens. The dominant land use in central Maine watersheds. Manure runoff, fertilizer, sediment from tilled land all flow downstream. BMPs (Best Management Practices) can cut runoff by 50-80%."),
          deepDive: {
            knowledge: t2("stem.watercycle.ws_agriculturalWatershed_knowledge", "Agricultural land delivers three primary watershed insults: sediment from tilled or overgrazed land, nutrients (nitrogen and phosphorus) from manure and fertilizer, and pathogens from livestock waste. Best Management Practices include cover cropping, contour farming, livestock fencing from streams, manure storage upgrades, riparian buffer easements, and reduced-till or no-till cropping. Documented BMP implementations cut watershed nutrient export by 50 to 80 percent on participating farms."),
            casework: t2("stem.watercycle.ws_agriculturalWatershed_casework", "Maine has roughly 7,500 farms covering about 1.3 million acres. The Maine Soil and Water Conservation Districts operate the state-side BMP outreach; USDA NRCS provides federal cost-share. Dairy farms in the Sebasticook and Kennebec watersheds have implemented manure-handling and buffer projects with measurable downstream quality improvement; comparable work in the St. John watershed has helped Aroostook potato production."),
            modernContext: t2("stem.watercycle.ws_agriculturalWatershed_moderncontext", "Farm consolidation pressures BMP adoption (the smallest farms have the thinnest margins to invest in capital improvements). PFAS contamination from historic biosolid spreading has surfaced as a major Maine farm-water issue post-2022, with state-led testing and remediation programs. The Maine Farmland Trust links farmland protection to watershed protection.")
          }
        },
        suburbanEdges: {
          role: t2("stem.watercycle.ws_suburbanEdges_role", "Stormwater + impervious surface"),
          desc: t2("stem.watercycle.ws_suburbanEdges_desc", "Subdivisions, parking lots, lawns. Impervious surfaces deliver pulses of warm polluted water to streams during storms. Lawn fertilizer and pet waste are the modern eutrophication inputs. Green stormwater infrastructure can offset the impact."),
          deepDive: {
            knowledge: t2("stem.watercycle.ws_suburbanEdges_knowledge", "Impervious surface (roads, roofs, parking lots, driveways) shapes urban and suburban hydrology more than any other variable. Above 10 percent watershed-wide impervious cover, stream biology measurably degrades; above 25 percent, most native fish populations are gone. Stormwater pulses are warm, fast, and pollutant-laden: lawn fertilizer, dog waste, vehicle drip, road salt, sediment from construction. Conventional drainage (curb, gutter, pipe) delivers all of it directly to streams."),
            casework: t2("stem.watercycle.ws_suburbanEdges_casework", "Portland, ME has documented stream impairment along the Capisic Brook and Stroudwater drainages tied directly to impervious cover. Green Stormwater Infrastructure (rain gardens, swales, permeable pavement, detention basins, green roofs) can offset 50 to 80 percent of the conventional pulse. The Maine Stormwater BMP Manual is the regulatory reference; municipal stormwater (MS4) permits require larger towns to implement."),
            modernContext: t2("stem.watercycle.ws_suburbanEdges_moderncontext", "Most suburban watershed work in Maine happens at municipal scale through MS4 permits, town stormwater ordinances, and watershed-association advocacy. Climate-resilience funding under the Infrastructure Investment and Jobs Act has dramatically increased available capital for retrofit. The biggest challenge is older developments built before stormwater regulation that have no easy retrofit path.")
          }
        }
      };
    }
    function localizeWatershedComponents(t2) {
      var copy3 = wcWatershedCopy(t2);
      return MAINE_WATERSHED_COMPONENTS.map(function(component) {
        var localized = copy3[component.id];
        if (!localized) return component;
        var merged = Object.assign({}, component, localized);
        if (component.deepDive || localized.deepDive) {
          merged.deepDive = Object.assign({}, component.deepDive, localized.deepDive);
        }
        return merged;
      });
    }
    var STEWARD_TECHNIQUES = [
      { id: "bufferPlant", name: "Riparian buffer planting", icon: "\u{1F332}", hours: 5, effects: { quality: 8, connectivity: 4 }, appliesTo: ["forestBuffer", "headwaterStreams"] },
      { id: "beaverDamAnalog", name: "Beaver Dam Analog", icon: "\u{1F9AB}", hours: 6, effects: { quality: 11, connectivity: 6 }, appliesTo: ["floodplainWetlands"] },
      { id: "damRemoval", name: "Dam removal", icon: "\u{1FAA8}", hours: 15, effects: { connectivity: 28, quality: 8, support: -12 }, appliesTo: ["riverMainstem"] },
      { id: "fishPassage", name: "Fish passage installation", icon: "\u{1F41F}", hours: 10, effects: { connectivity: 14, quality: 2 }, appliesTo: ["riverMainstem"] },
      { id: "bmpOutreach", name: "BMP outreach", icon: "\u{1F91D}", hours: 4, effects: { quality: 7, support: 4 }, appliesTo: ["agriculturalWatershed"] },
      { id: "easement", name: "Conservation easement", icon: "\u{1F4DC}", hours: 12, effects: { quality: 15, connectivity: 12, support: 3 }, appliesTo: "any" },
      { id: "stormwater", name: "Stormwater retrofit", icon: "\u{1F327}\uFE0F", hours: 8, effects: { quality: 13, connectivity: 3 }, appliesTo: ["suburbanEdges"] },
      { id: "citizenScience", name: "Citizen science monitoring", icon: "\u{1F52C}", hours: 3, effects: { quality: 2, support: 7 }, appliesTo: "any" },
      { id: "publicEd", name: "Public education + River Days", icon: "\u{1F4E3}", hours: 3, effects: { support: 9 }, appliesTo: "any" },
      { id: "rest", name: "Hold steady", icon: "\u{1F343}", hours: 0, effects: {}, appliesTo: "any" }
    ];
    var STEWARD_EVENTS = [
      { id: "majorFlood", icon: "\u{1F30A}", apply: function(comps) {
        comps.forEach(function(c) {
          if (c.id === "forestBuffer" && c.quality < 65) c.quality = Math.max(0, c.quality - 7);
          if (c.id === "floodplainWetlands") c.quality = Math.min(100, c.quality + 3);
        });
      } },
      { id: "drought", icon: "\u2600\uFE0F", apply: function(comps) {
        comps.forEach(function(c) {
          if (c.id === "headwaterStreams") c.quality = Math.max(0, c.quality - 8);
          if (c.id === "riverMainstem") c.quality = Math.max(0, c.quality - 4);
        });
      } },
      { id: "sewageRelease", icon: "\u26A0\uFE0F", apply: function(comps) {
        comps.forEach(function(c) {
          if (c.id === "riverMainstem" || c.id === "suburbanEdges") c.quality = Math.max(0, c.quality - 10);
        });
      } },
      { id: "algalBloom", icon: "\u{1F7E2}", apply: function(comps) {
        comps.forEach(function(c) {
          c.support = Math.min(100, c.support + 5);
          if (c.id === "agriculturalWatershed") c.quality = Math.max(0, c.quality - 5);
        });
      } },
      { id: "volunteerSurge", icon: "\u{1F64C}", apply: function(comps) {
        comps.forEach(function(c) {
          c.support = Math.min(100, c.support + 7);
          c.quality = Math.min(100, c.quality + 2);
        });
      } },
      { id: "farmSold", icon: "\u{1F69C}", apply: function(comps) {
        comps.forEach(function(c) {
          if (c.id === "agriculturalWatershed") c.quality = Math.max(0, c.quality - 6);
          if (c.id === "suburbanEdges") c.quality = Math.max(0, c.quality - 3);
        });
      } },
      { id: "salmonReturn", icon: "\u{1F41F}", apply: function(comps, state) {
        if (state.connectivityBoosts >= 1) comps.forEach(function(c) {
          c.support = Math.min(100, c.support + 10);
        });
        else comps.forEach(function(c) {
          c.support = Math.min(100, c.support + 4);
        });
      } },
      { id: "beaverExpand", icon: "\u{1F9AB}", apply: function(comps) {
        comps.forEach(function(c) {
          if (c.id === "floodplainWetlands") {
            c.quality = Math.min(100, c.quality + 9);
            c.connectivity = Math.min(100, c.connectivity + 5);
          }
        });
      } },
      { id: "fundingBump", icon: "\u{1F4B5}", apply: function(comps, state) {
        state.fundingBonusNextYear = (state.fundingBonusNextYear || 0) + 5;
      } },
      { id: "erosionEvent", icon: "\u{1F3DE}\uFE0F", apply: function(comps) {
        comps.forEach(function(c) {
          if (c.id === "forestBuffer") c.support = Math.min(100, c.support + 8);
        });
      } }
    ];
    var _wcById = function(arr, id) {
      return window2.StemLab && window2.StemLab.findById ? window2.StemLab.findById(arr, id) : null;
    };
    var STEWARD_FEEDBACK_RULES = [
      { id: "bufferFeedsHeadwaters", when: function(s) {
        var c = _wcById(s, "forestBuffer");
        return !!c && c.quality > 70;
      }, apply: function(s) {
        var h = _wcById(s, "headwaterStreams");
        if (h) h.quality = Math.min(100, h.quality + 4);
      } },
      { id: "beaverHelpsFloodplain", when: function(s) {
        var c = _wcById(s, "floodplainWetlands");
        return !!c && c.quality > 60;
      }, apply: function(s) {
        var m = _wcById(s, "riverMainstem");
        if (m) {
          m.quality = Math.min(100, m.quality + 3);
          m.connectivity = Math.min(100, m.connectivity + 2);
        }
      } },
      { id: "agCleansUp", when: function(s) {
        var c = _wcById(s, "agriculturalWatershed");
        return !!c && c.quality > 60;
      }, apply: function(s) {
        var m = _wcById(s, "riverMainstem");
        if (m) m.quality = Math.min(100, m.quality + 4);
      } },
      { id: "runRestoration", when: function(s) {
        var m = _wcById(s, "riverMainstem");
        var b = _wcById(s, "forestBuffer");
        return !!m && !!b && m.connectivity > 60 && b.quality > 60;
      }, apply: function(s) {
        s.forEach(function(c) {
          c.support = Math.min(100, c.support + 2);
        });
      } }
    ];
    var STEWARD_CASCADE_HINTS = [
      {
        id: "bufferFeedsHeadwaters",
        comp: "forestBuffer",
        field: "quality",
        threshold: 70
      },
      {
        id: "beaverHelpsFloodplain",
        comp: "floodplainWetlands",
        field: "quality",
        threshold: 60
      },
      {
        id: "agCleansUp",
        comp: "agriculturalWatershed",
        field: "quality",
        threshold: 60
      },
      {
        id: "runRestoration",
        comp: "riverMainstem",
        field: "connectivity",
        threshold: 60
      }
    ];
    var STEWARD_DIFFICULTIES = {
      volunteer: { id: "volunteer", hoursPerYear: 24, eventSkip: 0.3, severity: 0.8 },
      coordinator: { id: "coordinator", hoursPerYear: 18, eventSkip: 0, severity: 1 },
      director: { id: "director", hoursPerYear: 14, eventSkip: 0, severity: 1.4 }
    };
    function wcStewardCopy(t2) {
      return {
        ev: {
          majorFlood_name: t2("stem.watercycle.sw_ev_majorFlood_name", "Major flood"),
          majorFlood_desc: t2("stem.watercycle.sw_ev_majorFlood_desc", "A 10-year flood scoured stream banks and washed sediment downstream. Buffers without good root systems lost ground."),
          drought_name: t2("stem.watercycle.sw_ev_drought_name", "Drought year"),
          drought_desc: t2("stem.watercycle.sw_ev_drought_desc", "Low summer flows raised stream temperatures and concentrated pollutants. Cold-water species took a hit."),
          sewageRelease_name: t2("stem.watercycle.sw_ev_sewageRelease_name", "Sewage discharge"),
          sewageRelease_desc: t2("stem.watercycle.sw_ev_sewageRelease_desc", "A wastewater treatment plant bypass during a heavy storm released untreated discharge. Mainstem quality drops."),
          algalBloom_name: t2("stem.watercycle.sw_ev_algalBloom_name", "Cyanobacteria bloom"),
          algalBloom_desc: t2("stem.watercycle.sw_ev_algalBloom_desc", "A cyanobacteria bloom closed swim beaches and prompted advisories. Public support shifts toward stronger watershed protection."),
          volunteerSurge_name: t2("stem.watercycle.sw_ev_volunteerSurge_name", "Volunteer surge"),
          volunteerSurge_desc: t2("stem.watercycle.sw_ev_volunteerSurge_desc", "A successful River Day brought 200+ volunteers. Citizen monitoring + cleanup boost across the board."),
          farmSold_name: t2("stem.watercycle.sw_ev_farmSold_name", "Farm sold for development"),
          farmSold_desc: t2("stem.watercycle.sw_ev_farmSold_desc", "A long-running family dairy operation sold to a residential developer. BMP gains on that land reset."),
          salmonReturn_name: t2("stem.watercycle.sw_ev_salmonReturn_name", "Atlantic salmon detected"),
          salmonReturn_desc: t2("stem.watercycle.sw_ev_salmonReturn_desc", "Returning Atlantic salmon (or alewife runs) detected in the mainstem. Major morale boost and federal attention."),
          beaverExpand_name: t2("stem.watercycle.sw_ev_beaverExpand_name", "Beaver complex expands"),
          beaverExpand_desc: t2("stem.watercycle.sw_ev_beaverExpand_desc", "Beavers expanded their territory and built three new dam complexes in the floodplain."),
          fundingBump_name: t2("stem.watercycle.sw_ev_fundingBump_name", "EPA / FEMA grant"),
          fundingBump_desc: t2("stem.watercycle.sw_ev_fundingBump_desc", "A federal grant lands. Stewardship hours next year will be +5."),
          erosionEvent_name: t2("stem.watercycle.sw_ev_erosionEvent_name", "Major bank erosion"),
          erosionEvent_desc: t2("stem.watercycle.sw_ev_erosionEvent_desc", "A bend in the river undercut a road shoulder. Public attention focuses on streambank stabilization.")
        },
        tech: {
          bufferPlant_desc: t2("stem.watercycle.sw_tech_bufferPlant_desc", "Plant native trees and shrubs along stream banks. Slow buildup that pays off in shade, bank stability, and nutrient filtering for decades."),
          beaverDamAnalog_desc: t2("stem.watercycle.sw_tech_beaverDamAnalog_desc", "Build a low-cost wood-and-stone structure that mimics beaver dam function. Encourages real beaver recolonization. Restores wet meadow conditions."),
          damRemoval_desc: t2("stem.watercycle.sw_tech_damRemoval_desc", "Remove or breach a barrier dam. Huge connectivity gain. Politically expensive: some landowners and recreational users will be upset."),
          fishPassage_desc: t2("stem.watercycle.sw_tech_fishPassage_desc", "Build a fish ladder or nature-like bypass around a barrier. Cheaper than dam removal and politically easier, but less effective for some species."),
          bmpOutreach_desc: t2("stem.watercycle.sw_tech_bmpOutreach_desc", "Work with farmers on Best Management Practices: cover crops, livestock fencing, manure storage, buffer easements. Real Maine programs."),
          easement_desc: t2("stem.watercycle.sw_tech_easement_desc", "Pay a landowner to permanently protect a riparian or upland parcel. The single highest-impact and highest-cost intervention."),
          stormwater_desc: t2("stem.watercycle.sw_tech_stormwater_desc", "Install rain gardens, swales, permeable pavement, or detention basins in developed areas. Slows and filters stormwater pulses."),
          citizenScience_desc: t2("stem.watercycle.sw_tech_citizenScience_desc", "Train volunteer water-quality monitors. Slow but builds long-term community support and detects problems early."),
          publicEd_desc: t2("stem.watercycle.sw_tech_publicEd_desc", "Watershed festivals, school programs, paddle events. Build community ownership of the watershed."),
          rest_desc: t2("stem.watercycle.sw_tech_rest_desc", "No active intervention this year. Some natural recovery; some drift.")
        },
        fb: {
          bufferFeedsHeadwaters_msg: t2("stem.watercycle.sw_fb_bufferFeedsHeadwaters_msg", "Healthy forest buffers cooled and cleaned headwater streams."),
          beaverHelpsFloodplain_msg: t2("stem.watercycle.sw_fb_beaverHelpsFloodplain_msg", "Beaver-built wetlands attenuated flood pulses and improved mainstem water quality."),
          agCleansUp_msg: t2("stem.watercycle.sw_fb_agCleansUp_msg", "Lower agricultural runoff cleaned up the river mainstem."),
          runRestoration_msg: t2("stem.watercycle.sw_fb_runRestoration_msg", "Connected, shaded river segments support documented anadromous fish returns.")
        },
        hint: {
          bufferFeedsHeadwaters_fired: t2("stem.watercycle.sw_hint_bufferFeedsHeadwaters_fired", "Your forest buffers crossed 70% quality \u2014 shade cooled the water and roots filtered it, so cleaner cold water flowed downhill into the headwaters (+quality there, for free)."),
          beaverHelpsFloodplain_fired: t2("stem.watercycle.sw_hint_beaverHelpsFloodplain_fired", "Your floodplain wetlands crossed 60% \u2014 beaver-built storage slowed the flood pulses and let sediment settle, improving mainstem water quality downstream."),
          agCleansUp_fired: t2("stem.watercycle.sw_hint_agCleansUp_fired", "Farm runoff dropped enough (agricultural quality over 60) that the mainstem cleaned up on its own \u2014 less nitrogen, phosphorus, and sediment reaching the river."),
          runRestoration_fired: t2("stem.watercycle.sw_hint_runRestoration_fired", "A connected, shaded mainstem (connectivity over 60, with healthy buffers) is now supporting documented anadromous fish returns \u2014 morale rose across every component."),
          bufferFeedsHeadwaters_near: t2("stem.watercycle.sw_hint_bufferFeedsHeadwaters_near", "Forest-buffer quality is at {v}. Get it past 70 (one riparian buffer planting) and it will cool and clean the headwaters automatically every year after."),
          beaverHelpsFloodplain_near: t2("stem.watercycle.sw_hint_beaverHelpsFloodplain_near", "Floodplain wetlands sit at {v}. A single Beaver Dam Analog would push past 60 and start cleaning the mainstem for you."),
          agCleansUp_near: t2("stem.watercycle.sw_hint_agCleansUp_near", "Agricultural quality is {v}. BMP outreach is cheap (4h) and would tip it past 60, cleaning the mainstem via the runoff feedback."),
          runRestoration_near: t2("stem.watercycle.sw_hint_runRestoration_near", "Mainstem connectivity is {v}. Cross 60 with buffers already healthy and you unlock fish returns plus a support boost watershed-wide.")
        },
        diff: {
          volunteer_label: t2("stem.watercycle.sw_diff_volunteer_label", "New Volunteer"),
          coordinator_label: t2("stem.watercycle.sw_diff_coordinator_label", "Watershed Coordinator"),
          director_label: t2("stem.watercycle.sw_diff_director_label", "Watershed Director"),
          volunteer_desc: t2("stem.watercycle.sw_diff_volunteer_desc", "24 hours / year, gentler events. For first runs."),
          coordinator_desc: t2("stem.watercycle.sw_diff_coordinator_desc", "18 hours / year, standard events. Default."),
          director_desc: t2("stem.watercycle.sw_diff_director_desc", "14 hours / year, harsher events. Real constraint.")
        }
      };
    }
    function applyStewardCopy(t2) {
      if (typeof t2 !== "function") t2 = function(key, fallback) {
        return fallback == null ? key : fallback;
      };
      var copy3 = wcStewardCopy(t2);
      STEWARD_EVENTS.forEach(function(item) {
        if (copy3.ev[item.id + "_name"] != null) item.name = copy3.ev[item.id + "_name"];
        if (copy3.ev[item.id + "_desc"] != null) item.desc = copy3.ev[item.id + "_desc"];
      });
      STEWARD_TECHNIQUES.forEach(function(item) {
        if (copy3.tech[item.id + "_desc"] != null) item.desc = copy3.tech[item.id + "_desc"];
      });
      STEWARD_FEEDBACK_RULES.forEach(function(rule) {
        if (copy3.fb[rule.id + "_msg"] != null) rule.msg = copy3.fb[rule.id + "_msg"];
      });
      STEWARD_CASCADE_HINTS.forEach(function(hint) {
        if (copy3.hint[hint.id + "_fired"] != null) hint.fired = copy3.hint[hint.id + "_fired"];
        if (copy3.hint[hint.id + "_near"] != null) hint.near = copy3.hint[hint.id + "_near"];
      });
      Object.keys(STEWARD_DIFFICULTIES).forEach(function(key) {
        var d2 = STEWARD_DIFFICULTIES[key];
        if (copy3.diff[d2.id + "_label"] != null) d2.label = copy3.diff[d2.id + "_label"];
        if (copy3.diff[d2.id + "_desc"] != null) d2.desc = copy3.diff[d2.id + "_desc"];
      });
    }
    function defaultStewardState() {
      var diff = STEWARD_DIFFICULTIES.coordinator;
      return {
        phase: "setup",
        year: 1,
        maxYears: 10,
        difficulty: diff.id,
        hoursPerYear: diff.hoursPerYear,
        hoursLeft: diff.hoursPerYear,
        components: MAINE_WATERSHED_COMPONENTS.map(function(c) {
          return Object.assign({ id: c.id }, c.defaultState);
        }),
        yearActions: [],
        yearLog: [],
        lastEvent: null,
        cascadesFiredThisYear: [],
        finalOutcome: null,
        connectivityBoosts: 0,
        fundingBonusNextYear: 0,
        deepDiveComponent: null,
        firstTipDismissed: false,
        seed: "steward-" + (/* @__PURE__ */ new Date()).getFullYear() + (/* @__PURE__ */ new Date()).getMonth() + (/* @__PURE__ */ new Date()).getDate() + "-" + Math.floor(Math.random() * 9999)
      };
    }
    var _wcT = function(key, fallback) {
      return fallback == null ? key : fallback;
    };
    var _wcLocalizedCache = null;
    var _wcLocalizedFor = null;
    function watershedComponents() {
      if (_wcLocalizedCache && _wcLocalizedFor === _wcT) return _wcLocalizedCache;
      _wcLocalizedFor = _wcT;
      _wcLocalizedCache = localizeWatershedComponents(_wcT);
      return _wcLocalizedCache;
    }
    function getWatershedComponent(id) {
      var list = watershedComponents();
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    }
    function stewardRng(seed, year, purpose) {
      var s = (seed || "default") + ":" + year + ":" + purpose;
      var h = 2166136261 >>> 0;
      for (var i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = h * 16777619 >>> 0;
      }
      return function() {
        h |= 0;
        h = h + 1831565813 | 0;
        var t2 = Math.imul(h ^ h >>> 15, 1 | h);
        t2 = t2 + Math.imul(t2 ^ t2 >>> 7, 61 | t2) ^ t2;
        return ((t2 ^ t2 >>> 14) >>> 0) / 4294967296;
      };
    }
    function stewardClamp(v, lo, hi) {
      return Math.max(lo, Math.min(hi, v));
    }
    function startStewardCampaign(opts) {
      opts = opts || {};
      var fresh = defaultStewardState();
      var diffId = opts.difficulty || steward.difficulty || "coordinator";
      var diff = STEWARD_DIFFICULTIES[diffId] || STEWARD_DIFFICULTIES.coordinator;
      fresh.phase = "year";
      fresh.difficulty = diff.id;
      fresh.hoursPerYear = diff.hoursPerYear;
      fresh.hoursLeft = diff.hoursPerYear;
      if (opts.seed) fresh.seed = opts.seed;
      setSteward(fresh);
      if (addToast) addToast("\u{1F4A7} Watershed Steward begins. Year 1 of 10 on " + diff.label + ".", "success");
      awardStemXP && awardStemXP("steward_start", 10, "Watershed campaign begins");
      if (typeof announceToSR === "function") announceToSR("Watershed Steward started on " + diff.label + ". Year 1 of 10. " + diff.hoursPerYear + " hours.");
    }
    function applyStewardTech(techId, componentId) {
      var tech = STEWARD_TECHNIQUES.find(function(t2) {
        return t2.id === techId;
      });
      if (!tech) return;
      if (steward.hoursLeft < tech.hours) {
        if (addToast) addToast("Not enough stewardship hours left.", "warn");
        return;
      }
      if (tech.appliesTo !== "any" && componentId && tech.appliesTo.indexOf(componentId) < 0) {
        if (addToast) addToast(tech.name + " does not apply to that component.", "info");
        return;
      }
      var newComps = steward.components.map(function(c) {
        if (componentId && c.id !== componentId && tech.appliesTo !== "any") return c;
        if (!componentId && tech.appliesTo !== "any") return c;
        var nc = Object.assign({}, c);
        if (tech.effects.quality) nc.quality = stewardClamp(nc.quality + tech.effects.quality, 0, 100);
        if (tech.effects.connectivity) nc.connectivity = stewardClamp(nc.connectivity + tech.effects.connectivity, 0, 100);
        if (tech.effects.support !== void 0) nc.support = stewardClamp(nc.support + tech.effects.support, 0, 100);
        return nc;
      });
      var actionLog = { tech: tech.name, target: componentId ? getWatershedComponent(componentId) ? getWatershedComponent(componentId).name : componentId : "Watershed-wide", hours: tech.hours };
      var patch = { components: newComps, hoursLeft: steward.hoursLeft - tech.hours, yearActions: steward.yearActions.concat([actionLog]) };
      if (techId === "damRemoval" || techId === "fishPassage") patch.connectivityBoosts = (steward.connectivityBoosts || 0) + 1;
      setSteward(patch);
      if (typeof announceToSR === "function") announceToSR(tech.name + " applied. " + (steward.hoursLeft - tech.hours) + " hours left.");
    }
    function endStewardYear() {
      var pre = steward.components.map(function(c) {
        return Object.assign({}, c);
      });
      var drifted = steward.components.map(function(c) {
        var nc = Object.assign({}, c);
        if (nc.quality > 70) nc.quality = stewardClamp(nc.quality + 1, 0, 100);
        else if (nc.quality < 35) nc.quality = stewardClamp(nc.quality - 2, 0, 100);
        nc.support = stewardClamp(nc.support + (nc.support < 50 ? 1 : -1), 0, 100);
        return nc;
      });
      var diff = STEWARD_DIFFICULTIES[steward.difficulty || "coordinator"];
      var skipRng = stewardRng(steward.seed, steward.year, "skip");
      var pickRng = stewardRng(steward.seed, steward.year, "pick");
      var ev;
      if (skipRng() < (diff.eventSkip || 0)) {
        ev = { id: "quietYear", name: t("stem.watercycle.a_quiet_year", "A Quiet Year"), icon: "\u{1F324}\uFE0F", desc: t("stem.watercycle.no_major_event_routine_fieldwork_stead", "No major event. Routine fieldwork, steady progress."), apply: function() {
        } };
      } else {
        ev = STEWARD_EVENTS[Math.floor(pickRng() * STEWARD_EVENTS.length)];
      }
      var eventState = { fundingBonusNextYear: steward.fundingBonusNextYear || 0, connectivityBoosts: steward.connectivityBoosts || 0 };
      ev.apply(drifted, eventState);
      var sev = diff.severity || 1;
      if (sev !== 1) {
        for (var di = 0; di < drifted.length; di++) {
          var sp = drifted[di];
          var pr = pre[di];
          sp.quality = stewardClamp(pr.quality + (sp.quality - pr.quality) * sev, 0, 100);
          sp.connectivity = stewardClamp(pr.connectivity + (sp.connectivity - pr.connectivity) * sev, 0, 100);
          sp.support = stewardClamp(pr.support + (sp.support - pr.support) * sev, 0, 100);
        }
      }
      var fired = [];
      STEWARD_FEEDBACK_RULES.forEach(function(rule) {
        if (rule.when(drifted)) {
          rule.apply(drifted);
          fired.push({ id: rule.id, msg: rule.msg });
        }
      });
      var snap = {
        year: steward.year,
        eventId: ev.id,
        event: ev.name,
        eventIcon: ev.icon,
        eventDesc: ev.desc,
        pre,
        post: drifted.map(function(c) {
          return Object.assign({}, c);
        }),
        actions: steward.yearActions.slice(),
        cascades: fired
      };
      setSteward({
        phase: "review",
        components: drifted,
        lastEvent: ev,
        cascadesFiredThisYear: fired,
        yearLog: steward.yearLog.concat([snap]),
        fundingBonusNextYear: eventState.fundingBonusNextYear || 0
      });
      if (typeof announceToSR === "function") announceToSR("Year " + steward.year + " complete. Event: " + ev.name + ".");
    }
    function advanceFromStewardReview() {
      if (steward.year >= steward.maxYears) {
        var avgQ = Math.round(steward.components.reduce(function(a, c) {
          return a + c.quality;
        }, 0) / steward.components.length);
        var componentsAt75 = steward.components.filter(function(c) {
          return c.quality >= 75;
        }).length;
        var connectivityBoosts = steward.connectivityBoosts || 0;
        var outcome;
        if (componentsAt75 >= 4 && connectivityBoosts >= 1 && avgQ >= 70) outcome = { tier: "recovery", label: t("stem.watercycle.watershed_recovery", "Watershed Recovery"), color: "#16a34a", icon: "\u{1F3C6}", desc: t("stem.watercycle.the_watershed_is_healing_across_the_bo", "The watershed is healing across the board. Headwaters are cold and clean. The mainstem carries fish again. Beaver wetlands are doing the floodplain work. This is what watershed-scale recovery looks like when timing and community come together.") };
        else if (componentsAt75 >= 3 && avgQ >= 62) outcome = { tier: "recovering", label: t("stem.watercycle.recovering_watershed", "Recovering Watershed"), color: "#22c55e", icon: "\u{1F30A}", desc: t("stem.watercycle.most_components_are_improving_a_few_st", "Most components are improving. A few still need work. The trajectory is good and the community is engaged.") };
        else if (componentsAt75 >= 2 || avgQ >= 55) outcome = { tier: "mixed", label: t("stem.watercycle.mixed_recovery", "Mixed Recovery"), color: "#f59e0b", icon: "\u{1F343}", desc: t("stem.watercycle.some_wins_some_gaps_real_watershed_wor", "Some wins, some gaps. Real watershed work is rarely uniform; some pieces improved while others stalled.") };
        else outcome = { tier: "slipping", label: t("stem.watercycle.slipping_watershed", "Slipping Watershed"), color: "#ef4444", icon: "\u26A0\uFE0F", desc: t("stem.watercycle.average_quality_is_low_and_few_compone", "Average quality is low and few components reached recovery thresholds. This is how watersheds degrade quietly when stewardship cannot keep up with pressures.") };
        var success = outcome.tier === "recovery" || outcome.tier === "recovering";
        var nextState = Object.assign({}, d, { campaignSuccess: success });
        setSteward({ phase: "debrief", finalOutcome: outcome, componentsAt75 });
        upd("campaignSuccess", success);
        if (typeof announceToSR === "function") announceToSR("Campaign complete. Final outcome: " + outcome.label + ". " + outcome.desc);
        awardStemXP && awardStemXP("steward_complete", 50, outcome.label);
        setTimeout2(function() {
          checkWaterCycleChallenges(nextState);
        }, 50);
      } else {
        setSteward({
          phase: "year",
          year: steward.year + 1,
          hoursLeft: steward.hoursPerYear + (steward.fundingBonusNextYear || 0),
          fundingBonusNextYear: 0,
          yearActions: [],
          lastEvent: null
        });
        if (typeof announceToSR === "function") announceToSR("Year " + (steward.year + 1) + " begins.");
      }
    }
    applyStewardCopy(t);
    const copy2 = (value) => JSON.parse(JSON.stringify(value));
    return {
      components: copy2(watershedComponents()),
      techniques: copy2(STEWARD_TECHNIQUES),
      difficulties: copy2(STEWARD_DIFFICULTIES),
      start: (opts) => {
        steward = defaultStewardState();
        startStewardCampaign(opts);
        return copy2(steward);
      },
      apply: (state, tech, target) => {
        steward = copy2(state);
        applyStewardTech(tech, target);
        return copy2(steward);
      },
      endYear: (state) => {
        steward = copy2(state);
        endStewardYear();
        return copy2(steward);
      },
      continue: (state) => {
        steward = copy2(state);
        advanceFromStewardReview();
        return copy2(steward);
      }
    };
  }

  // dev-tools/campaign-adventure-pilot/adapters.mjs
  var round = (x) => Math.round(x);
  var delta = (x) => (x > 0 ? "+" : "") + round(x);
  function createAdapters(tree) {
    if (!tree?.groveAdvance) throw new Error("The original Tree Life Lab engine did not load.");
    const water = createWatershedRuntime();
    const avg = (model, field) => round(model.components.reduce((n, c) => n + c[field], 0) / model.components.length);
    const waterActions = (model) => {
      if (model.phase === "debrief") return [];
      if (model.phase === "review") return [{ id: "continue", label: model.year === model.maxYears ? "See the campaign outcome" : "Begin year " + (model.year + 1), hint: "Continue after reviewing the evidence." }];
      return water.techniques.filter((t) => t.id !== "rest").flatMap((tech) => {
        const targets = tech.appliesTo === "any" ? [null] : tech.appliesTo;
        return targets.map((target) => ({
          id: "tech:" + tech.id + ":" + (target || "all"),
          label: tech.name,
          location: target || "all",
          responseTerms: tech.id === "bufferPlant" ? ["plant", "plant trees", "buffer", "riparian"] : [],
          cost: tech.hours,
          disabled: tech.hours > model.hoursLeft,
          hint: (target ? water.components.find((c) => c.id === target).name : "Watershed-wide") + " \xB7 " + tech.hours + " hours",
          tradeoff: Object.entries(tech.effects).map(([key, value]) => key + " " + delta(value)).join(" \xB7 ")
        }));
      }).concat([{ id: "end-year", label: "Observe the year", hint: "Finish fieldwork. See the annual event and downstream effects." }]);
    };
    const watershed = {
      id: "watershed",
      title: "A river worth returning to",
      label: "Watershed Steward",
      eyebrow: "CENTRAL MAINE \xB7 10 YEARS",
      intro: "Follow the water from forest to mainstem. Choose where to put your effort, then return each year to see what changed.",
      disclosure: "An educational watershed model, not a forecast. Quality, connectivity, and support are 0\u2013100 model indices. Regional context recognizes Indigenous-led restoration; the narrator does not speak for a Tribal Nation.",
      start(seed, config = {}) {
        const difficulty = config.difficulty || "coordinator";
        if (!Object.hasOwn(water.difficulties, difficulty) || Object.keys(config).some((k) => k !== "difficulty")) throw new Error("Unsupported watershed settings.");
        return water.start({ seed, difficulty });
      },
      config: (model) => ({ difficulty: model.difficulty }),
      actions: waterActions,
      step(model, id) {
        if (!waterActions(model).some((a) => a.id === id && !a.disabled)) throw new Error("Unavailable watershed action.");
        if (id === "end-year") return water.endYear(model);
        if (id === "continue") return water.continue(model);
        const [, tech, target] = id.split(":");
        return water.apply(model, tech, target === "all" ? null : target);
      },
      view(model) {
        const ended = model.phase === "debrief", review = model.phase === "review";
        const latest = model.yearLog.at(-1);
        const weakest = [...model.components].sort((a, b) => a.quality - b.quality)[0];
        const weakName = water.components.find((c) => c.id === weakest.id).name;
        const start = latest?.pre || model.components;
        const resultText = latest ? latest.eventDesc + " " + (latest.cascades.map((c) => c.msg).filter(Boolean).join(" ") || "No downstream feedback rule activated this year.") : "";
        const title = ended ? model.finalOutcome.label : review ? "What the river carried forward" : model.year === 1 ? "Your first season on the river" : model.year < 4 ? "Look upstream" : model.year < 8 ? "Connections begin to matter" : "The river you leave behind";
        const body = ended ? model.finalOutcome.desc : review ? "Year " + model.year + " closes with " + latest.event.toLowerCase() + ". " + resultText : "You coordinate this year\u2019s watershed work. " + weakName + " has the lowest quality index (" + round(weakest.quality) + " of 100). You have " + model.hoursLeft + " stewardship hours left. Explore a reach, weigh the available work, and choose when to observe the year.";
        return {
          campaignId: this.id,
          title,
          body,
          phase: model.phase,
          ended,
          review,
          progress: ended ? 10 : review ? model.year : model.year - 1,
          total: 10,
          period: "Year " + model.year + " of 10",
          prompt: review ? "Read the changes before beginning the next year." : ended ? "What would you carry into another restoration effort?" : "Where will your stewardship hours make a difference?",
          metrics: [{ label: "Quality", value: avg(model, "quality"), unit: "/100" }, { label: "Connectivity", value: avg(model, "connectivity"), unit: "/100" }, { label: "Support", value: avg(model, "support"), unit: "/100" }, { label: "Hours left", value: model.hoursLeft, unit: "" }],
          locations: water.components.map((c) => ({ id: c.id, name: c.name, description: c.desc, value: round(model.components.find((m) => m.id === c.id).quality), unit: "quality index", icon: c.icon })),
          evidence: review || ended ? model.components.map((c) => ({
            label: water.components.find((x) => x.id === c.id).name,
            before: round(start.find((x) => x.id === c.id).quality),
            after: round(c.quality),
            detail: "quality; annual change " + delta(c.quality - start.find((x) => x.id === c.id).quality)
          })) : [],
          receipts: model.yearLog.map((row) => ({
            title: "Year " + row.year + " \xB7 " + row.event,
            text: (row.actions.length ? row.actions.map((a) => a.tech + " (" + a.target + ", " + a.hours + "h)").join("; ") : "No fieldwork") + ". " + row.eventDesc,
            detail: row.cascades.map((c) => c.msg).filter(Boolean).join(" ")
          })),
          event: latest?.event || "Your first field season",
          actions: waterActions(model),
          support: "Quality tracks conditions within each part of the watershed. Connectivity tracks passage and links. Some improvements trigger downstream benefits only after a threshold is crossed. The annual evidence separates fieldwork from later events and feedback.",
          sound: { atmosphere: "Calm", element: "Water", intensity: 0.2, motion: "Steady", space: "Open" }
        };
      }
    };
    const grove = {
      id: "grove",
      title: "Leave a living next generation",
      label: "Grove Journey",
      eyebrow: "TREE LIFE LAB \xB7 8 YEARS",
      intro: "Three trees. Nine habitat patches. Guide a grove through weather and renewal, and see which descendants take root.",
      disclosure: "An educational grove scenario using Tree Life Lab\u2019s existing physiology and seeded events. Shared priorities are a game abstraction. A new arrival counts as established only after surviving a later annual update.",
      start(seed, config = {}) {
        const mode = config.mode || "deck";
        if (!["deck", "generated"].includes(mode) || Object.keys(config).some((k) => k !== "mode")) throw new Error("Unsupported grove settings.");
        return tree.groveStart({ version: 1, seed, mode, choices: [] });
      },
      config: (model) => ({ mode: model.config.mode }),
      actions(model) {
        if (tree.groveSummary(model).ended) return [];
        return tree.GROVE_PRIORITIES.map((p) => ({
          id: p.id,
          label: p.name,
          hint: p.copy,
          responseTerms: p.id === "roots" ? ["root", "roots", "water access"] : p.id === "reserve" ? ["reserve", "reserves", "save food", "store", "save energy"] : ["seed", "seeds", "offspring", "reproduce", "reproduction"],
          tradeoff: p.id === "offspring" ? "Oak disperses acorns; aspen uses root suckers." : "One annual update; no reproductive attempts with this priority."
        }));
      },
      step(model, id) {
        if (!this.actions(model).some((a) => a.id === id)) throw new Error("Unavailable grove action.");
        return tree.groveAdvance(model, { priority: id, route: "mixed" });
      },
      view(model) {
        const summary = tree.groveSummary(model);
        const next = summary.ended ? null : tree.groveEvent(model.config, model.year + 1);
        const receipt = model.receipts.at(-1);
        const body = summary.ended ? summary.success ? "Living descendants now occupy " + summary.descendantPatches + " patches. The grove has a next generation." : "This run ends with " + summary.living + " living trees and established descendants in " + summary.descendantPatches + " patches. The goal was two patches by year eight. The field journal records what happened." : (model.year === 0 ? "An oak and two aspens stand at the edge of a changing woodland. " : "The grove now holds " + summary.living + " living trees. ") + "The next year brings: " + next.title.toLowerCase() + ". " + next.copy + " Choose how the trees allocate the food they make, then watch one year unfold.";
        return {
          campaignId: this.id,
          title: summary.ended ? "The next generation" : model.year === 0 ? "A small grove, a long view" : next.title,
          body,
          phase: summary.ended ? "complete" : "year",
          ended: summary.ended,
          review: false,
          progress: model.year,
          total: 8,
          period: summary.ended ? "Journey complete after " + model.year + " years" : "Preparing year " + (model.year + 1) + " of 8",
          prompt: summary.ended ? "Which choice would you revisit in the same world?" : "What will you invest in this year?",
          metrics: [{ label: "Living trees", value: summary.living, unit: "" }, { label: "Established", value: summary.established, unit: "" }, { label: "Descendant patches", value: summary.descendantPatches, unit: "/2 goal" }, { label: "Years observed", value: model.year, unit: "/8" }],
          locations: tree.GROVE_PATCHES.map((patch, i) => ({
            id: String(i),
            name: patch.name,
            description: patch.habitat + " habitat",
            value: model.trees.filter((n) => n.patch === i && n.tree.alive).length,
            unit: "living trees",
            trees: model.trees.filter((n) => n.patch === i && n.tree.alive).map((n) => ({ species: n.tree.speciesId, descendant: !!n.parent, established: !!n.parent && n.born < model.year })),
            habitat: patch.habitat,
            gap: model.gaps.includes(i)
          })),
          evidence: receipt ? [
            { label: "Reproductive attempts", before: null, after: receipt.attempts, detail: "Attempts are not surviving descendants." },
            { label: "Reproduction cost", before: null, after: Math.round(receipt.spent * 100) / 100, detail: "kg C debited by the original model." },
            { label: "Trees lost", before: null, after: receipt.deaths, detail: "Across the annual update." },
            { label: "New arrivals", before: null, after: summary.newArrivals, detail: "Must survive a later year to count as established." }
          ] : [],
          receipts: model.receipts.map((r, i) => ({
            title: "Year " + (i + 1) + " \xB7 " + r.event.title,
            text: r.event.copy,
            detail: r.attempts + " reproductive attempts \xB7 " + r.deaths + " trees lost \xB7 " + r.living + " living trees"
          })),
          event: next?.title || receipt?.event.title || "A gentle growing year",
          actions: this.actions(model),
          support: "Roots improve water access. Reserves store food. Investing in offspring enables reproductive attempts by mature trees. A seed landing is not the same as a descendant becoming established. The weather sequence stays the same when you replay the same world.",
          sound: { atmosphere: "Calm", element: next?.id === "wet" ? "Rain" : "Nature", intensity: 0.15, motion: "Still", space: "Open" }
        };
      }
    };
    return [watershed, grove];
  }

  // dev-tools/campaign-adventure-pilot/app.mjs
  init_core();

  // dev-tools/campaign-adventure-pilot/scene-art.mjs
  var NS = "http://www.w3.org/2000/svg";
  var svg = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    return n;
  };
  function treeSymbol(parent, x, y, size, aspen = false, small = false, deciduous = false) {
    const g = svg("g", { transform: "translate(" + x + " " + y + ") scale(" + size + ")" });
    g.append(svg("path", { d: "M0 0v-18", stroke: "#655943", "stroke-width": small ? 2 : 3 }));
    if (aspen) {
      g.append(svg("ellipse", { cx: 0, cy: -25, rx: 12, ry: 16, fill: small ? "#d0dd83" : "#aec783" }));
    } else if (deciduous) {
      g.append(svg("path", { d: "M-14-13C-24-20-14-34-7-31C-10-48 11-48 12-32C27-34 28-14 14-12Z", fill: small ? "#a3c7ac" : "#376650" }));
    } else g.append(svg("path", { d: "M0-44L-16-14H-9L-18-4H18L9-14H16Z", fill: small ? "#a3c7ac" : "#376650" }));
    parent.append(g);
  }
  function landscape(view, selectLocation, selected) {
    const shell = document.createElement("div");
    shell.className = "landscape " + view.campaignId;
    const drawing = svg("svg", { viewBox: "0 0 640 455", "aria-hidden": "true", focusable: "false", preserveAspectRatio: "xMidYMid slice" });
    drawing.append(svg("rect", { width: 640, height: 455, fill: view.campaignId === "watershed" ? "#dfe8d3" : "#e5e7cd" }));
    if (view.campaignId === "watershed") {
      drawing.append(svg("path", { d: "M0 0H640V115Q492 50 349 98T0 115Z", fill: "#c2d0b9" }));
      drawing.append(svg("path", { d: "M0 50Q164-13 269 47T640 60", fill: "none", stroke: "#b5c5ae", "stroke-width": 2 }));
      drawing.append(svg("path", { d: "M-30 356Q146 229 275 318T690 351V470H-30Z", fill: "#c5d8b8" }));
      for (let i = 0; i < 7; i++) drawing.append(svg("path", { d: "M-30 " + (130 + i * 38) + "Q100 " + (40 + i * 40) + " 223 " + (100 + i * 37) + "T680 " + (100 + i * 44), fill: "none", stroke: "#c9d5bd", "stroke-width": 1.5 }));
      drawing.append(svg("path", { d: "M354-25C369 75 198 78 243 170S421 195 354 290S204 357 250 475", fill: "none", stroke: "#95beba", "stroke-width": 46 }));
      drawing.append(svg("path", { d: "M354-25C369 75 198 78 243 170S421 195 354 290S204 357 250 475", fill: "none", stroke: "#d5efed", "stroke-width": 28 }));
      drawing.append(svg("path", { d: "M350-25C365 75 194 78 239 170S417 195 350 290S200 357 246 475", fill: "none", stroke: "#88babb", "stroke-width": 2, "stroke-dasharray": "20 12", opacity: 0.7 }));
      [[70, 100, 1.1], [122, 158, 0.8], [167, 63, 0.9], [80, 277, 1.1], [126, 340, 0.75], [463, 87, 0.9], [523, 142, 0.8], [573, 71, 1.1], [522, 322, 0.85], [592, 390, 0.9]].forEach((t) => treeSymbol(drawing, ...t));
      for (let i = 0; i < 5; i++) drawing.append(svg("path", { d: "M420 " + (207 + i * 12) + "l118 27", stroke: "#b7bd85", "stroke-width": 7 }));
      [[410, 354], [451, 364], [489, 385]].forEach(([x, y]) => {
        drawing.append(svg("rect", { x, y, width: 24, height: 20, rx: 2, fill: "#ddd3b7" }));
        drawing.append(svg("path", { d: "M" + (x - 4) + " " + y + "l16-12 16 12Z", fill: "#8d8b74" }));
      });
    } else {
      view.locations.forEach((patch, i) => {
        const x = 42 + i % 3 * 188, y = 29 + Math.floor(i / 3) * 135;
        drawing.append(svg("rect", { x, y, width: 178, height: 125, rx: 20, fill: patch.habitat === "damp" ? "#c3d9c9" : patch.habitat === "sheltered" ? "#cfddbc" : "#e2d9b5", stroke: "#f4f1e4", "stroke-width": 3 }));
        if (patch.gap) drawing.append(svg("ellipse", { cx: x + 87, cy: y + 46, rx: 56, ry: 29, fill: "#f4eec0", opacity: 0.8 }));
        patch.trees.forEach((t, j) => treeSymbol(drawing, x + 42 + j * 42, y + 53, t.descendant ? 0.55 : 0.9, t.species === "aspen", t.descendant, true));
      });
      drawing.append(svg("path", { d: "M606 0q-28 93 2 158t-1 153t8 180", fill: "none", stroke: "#94b9b0", "stroke-width": 9 }));
    }
    shell.append(drawing);
    const waterPositions = { headwaterStreams: [51, 17], forestBuffer: [22, 39], floodplainWetlands: [42, 60], riverMainstem: [44, 85], agriculturalWatershed: [76, 49], suburbanEdges: [76, 82] };
    const shortNames = { headwaterStreams: "Headwaters", forestBuffer: "Buffers", floodplainWetlands: "Wetlands", riverMainstem: "Mainstem", agriculturalWatershed: "Farms", suburbanEdges: "Town" };
    for (const [i, loc] of view.locations.entries()) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "map-location";
      button.setAttribute("aria-label", loc.name + ", " + loc.value + " " + loc.unit);
      button.setAttribute("aria-pressed", String(selected === loc.id));
      const coords = view.campaignId === "watershed" ? waterPositions[loc.id] : [20.5 + i % 3 * 29.3, 26 + Math.floor(i / 3) * 29.7];
      button.style.left = coords[0] + "%";
      button.style.top = coords[1] + "%";
      const label = document.createElement("span");
      label.textContent = shortNames[loc.id] || loc.name;
      const count = document.createElement("strong");
      count.textContent = loc.value;
      button.append(label, count);
      button.addEventListener("click", () => selectLocation(loc.id));
      shell.append(button);
    }
    return shell;
  }

  // dev-tools/campaign-adventure-pilot/responses.mjs
  init_response_records();
  init_core();
  var normalize = (text) => text.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  function reviewResponse(adapter, run, value, { location } = {}) {
    const text = responseText(value), model = materialize(adapter, run), view = adapter.view(model);
    const actions = adapter.actions(model).filter((a) => !a.disabled && (!location || !a.location || a.location === "all" || a.location === location));
    const input = " " + normalize(text) + " ";
    const scored = actions.map((action) => {
      const terms = action.responseTerms || [];
      const label = normalize(action.label).split(" ").filter((w) => w.length > 3);
      const score = terms.reduce((n, term) => n + (input.includes(" " + normalize(term) + " ") ? 4 : 0), 0) + label.reduce((n, w) => n + (input.includes(" " + w + " ") ? 1 : 0), 0);
      return { ...action, score, locationName: action.location === "all" ? "Across the watershed" : view.locations.find((l) => l.id === action.location)?.name || "" };
    }).sort((a, b) => b.score - a.score);
    const best = scored[0], suggested = best && best.score > 0 && (!scored[1] || best.score > scored[1].score) ? best.id : null;
    return {
      text,
      revision: run.commands.length,
      runId: run.runId,
      actions: scored,
      suggested,
      message: suggested ? "Check that this action matches what you mean. You can change it before continuing." : "Choose the available action that best fits your response. Your wording will stay in the journal."
    };
  }
  function dispatchResponse(adapter, run, proposal, actionId) {
    if (proposal.runId !== run.runId || proposal.revision !== run.commands.length) throw Error("The scene changed. Review your response again.");
    if (!proposal.actions.some((a) => a.id === actionId && !a.disabled)) throw Error("Choose an available action for this response.");
    const next = dispatch(adapter, run, actionId, proposal.revision);
    next.version = 2;
    next.responses = validateResponses([...run.responses || [], { revision: next.commands.length, actionId, text: responseText(proposal.text) }], next.commands);
    return next;
  }

  // dev-tools/campaign-adventure-pilot/app.mjs
  function mountFieldJourneys(root, options = {}) {
    const $ = (id) => root.querySelector("#" + id);
    const el = (tag, cls, text) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text !== void 0) n.textContent = text;
      return n;
    };
    const button = (label, fn, cls = "") => {
      const b = el("button", cls, label);
      b.type = "button";
      b.addEventListener("click", fn);
      return b;
    };
    const clone2 = (x) => JSON.parse(JSON.stringify(x));
    const noteDrafts = /* @__PURE__ */ new Map(), responseDrafts = /* @__PURE__ */ new Map();
    let responseMode = "both", proposal = null;
    const isSEL = options.hub === "sel";
    const authoredStatus = isSEL ? "Authored practice scene \xB7 possible responses" : "Authored scene \xB7 grounded in the simulation";
    let entryCampaign = options.initialCampaign || null;
    let adapters = [], run = null, adapter = null, view = null, selected = null, provider = null, narratorRequest = null, narratorSerial = 0;
    let notice = "", warning = false, storage = null, sound = false, audioContext = null, audioNodes = [], audioGain = null;
    let destroyed = false, soundSerial = 0, reading = null;
    const main = $("main");
    function announce(text) {
      const n = $("announcer");
      if (n) n.textContent = text;
    }
    function message(text, isWarning = false) {
      notice = text;
      warning = isWarning;
      const n = $("notice");
      if (n) {
        n.textContent = text;
        n.hidden = !text;
        n.className = "notice" + (isWarning ? " warning" : "");
      }
      announce(text);
    }
    function persist() {
      if (!storage) {
        message("Browser storage is unavailable. This run stays in memory; download your journal to keep it.", true);
        return false;
      }
      const result = saveRun(storage, run);
      if (!result.ok) message(result.message, true);
      else message(options.sessionOnly ? "Journey kept for this open SEL session. Download the journal to keep it afterward." : "Journey saved on this device.");
      return result.ok;
    }
    function cancelNarration() {
      narratorSerial++;
      narratorRequest?.abort();
      narratorRequest = null;
    }
    function stopSound() {
      soundSerial++;
      for (const node of audioNodes) {
        try {
          node.stop?.();
        } catch {
        }
        try {
          node.disconnect?.();
        } catch {
        }
      }
      audioNodes = [];
      try {
        audioGain?.disconnect();
      } catch {
      }
      audioGain = null;
    }
    async function playSound() {
      stopSound();
      if (!sound || !view || !view.sound || document.hidden || destroyed) return;
      const serial = soundSerial;
      try {
        if (options.ensureSound) await options.ensureSound();
        if (destroyed || serial !== soundSerial || !sound || document.hidden) return;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) throw new Error("Audio unavailable.");
        audioContext = audioContext || new Ctx();
        audioContext.resume().catch(() => {
          if (destroyed || serial !== soundSerial) return;
          sound = false;
          stopSound();
          message("Sound could not start. The journey remains available.", true);
        });
        audioGain = audioContext.createGain();
        audioGain.gain.value = 0.15;
        audioGain.connect(audioContext.destination);
        audioNodes = window.AlloModules.playGenerativeSoundscape(audioContext, audioGain, view.sound, { gentle: true, sceneText: view.body, themeSeed: run.seed });
      } catch {
        if (destroyed || serial !== soundSerial) return;
        sound = false;
        stopSound();
        message("Sound is unavailable. The journey remains available.", true);
      }
    }
    function stopReading() {
      if (reading) {
        window.speechSynthesis?.cancel();
        reading = null;
      }
    }
    function readScene() {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        message("Read aloud is unavailable in this browser.", true);
        return;
      }
      stopReading();
      const utterance = new SpeechSynthesisUtterance(view.title + ". " + view.body);
      reading = utterance;
      utterance.rate = 0.92;
      utterance.onstart = () => {
        if (audioGain) audioGain.gain.value = 0.035;
      };
      const restore = () => {
        if (reading === utterance) reading = null;
        if (audioGain) audioGain.gain.value = 0.15;
      };
      utterance.onend = restore;
      utterance.onerror = () => {
        restore();
        message("Read aloud could not finish. The scene text is still available.", true);
      };
      window.speechSynthesis.speak(utterance);
    }
    async function refreshNarration() {
      cancelNarration();
      if (!view) return;
      const serial = narratorSerial;
      const capturedRun = run.runId;
      const revision = run.commands.length;
      narratorRequest = new AbortController();
      const status = $("narration-status"), extra = $("optional-text");
      if (status) status.textContent = provider ? "Authored scene ready. Checking optional narration\u2026" : authoredStatus;
      if (extra) {
        extra.hidden = true;
        extra.textContent = "";
      }
      const result = await narrate(view, provider, { signal: narratorRequest.signal });
      if (serial !== narratorSerial || run?.runId !== capturedRun || run.commands.length !== revision) return;
      const current = $("narration-status");
      if (current) current.textContent = result.status === "fallback" ? "Optional narration unavailable. The authored scene remains playable." : result.status === "optional" ? "Authored scene with optional narration" : authoredStatus;
      if (result.status === "fallback") announce("Optional narration unavailable. You can continue with the authored scene.");
      if (result.status === "optional" && $("optional-text")) {
        $("optional-text").textContent = result.text;
        $("optional-text").hidden = false;
      }
    }
    function makeNotice() {
      const n = el("div", "notice" + (warning ? " warning" : ""), notice);
      n.id = "notice";
      n.hidden = !notice;
      n.setAttribute("role", "status");
      return n;
    }
    function downloadJournal() {
      const model = materialize(adapter, run);
      const payload = { ...clone2(run), journal: adapter.view(model).receipts };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob), a = el("a");
      a.href = url;
      a.download = "field-journey-" + run.campaignId + "-" + run.runId + ".json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1e3);
    }
    function activate(next, focus = true) {
      cancelNarration();
      stopReading();
      stopSound();
      proposal = null;
      run = next;
      adapter = adapters.find((a) => a.id === run.campaignId);
      selected = adapter.id === "watershed" ? "forestBuffer" : "0";
      renderJourney(focus);
    }
    function startJourney(a, seed) {
      try {
        const next = makeRun(a, { seed });
        run = next;
        adapter = a;
        persist();
        activate(next);
      } catch (error) {
        message(error.message, true);
      }
    }
    function resumeJourney(key) {
      try {
        const next = readRun(storage, key, adapters);
        message("Saved journey resumed.");
        activate(next);
      } catch (error) {
        message(error.message + " The stored data has not been changed.", true);
      }
    }
    function returnHome() {
      cancelNarration();
      stopReading();
      stopSound();
      run = null;
      adapter = null;
      view = null;
      proposal = null;
      renderHome();
      main.focus();
    }
    function renderHome() {
      main.replaceChildren();
      if (options.embedded) main.append(el("p", "embedded-label", isSEL ? "PRACTICE JOURNEYS \xB7 OPTIONAL PILOT" : "FIELD JOURNEYS \xB7 OPTIONAL PILOT"));
      const intro = el("section", "intro");
      intro.append(el("p", "eyebrow", "EXPLORE \xB7 CHOOSE \xB7 RETURN"), el("h1", "", isSEL ? "A place for\nyour voice." : "Small choices.\nLiving worlds."), el("p", "", isSEL ? "Practice asking for support through four connected encounters. Choose a response, write your own, or use both." : "Step into a place that changes with your decisions. Follow a river through ten years of restoration, or help a grove leave a next generation."));
      main.append(intro, makeNotice());
      if (entryCampaign) {
        const entry = el("div", "entry-note");
        entry.append(el("p", "", "Start a separate journey or resume one below. Your original campaign stays where you left it."), button("Show all journeys", () => {
          entryCampaign = null;
          renderHome();
          main.focus();
        }));
        if (options.returnToSource) entry.append(button("Return to Watershed tool", options.returnToSource));
        main.append(entry);
      }
      const visibleAdapters = entryCampaign ? adapters.filter((a) => a.id === entryCampaign) : adapters;
      const cards = el("div", "campaign-grid" + (visibleAdapters.length === 1 ? " single-campaign" : ""));
      visibleAdapters.forEach((a) => {
        const card = el("section", "campaign-card"), art = el("div", "card-art");
        art.setAttribute("aria-hidden", "true");
        const v = a.view(a.start("FIELD-01", {}));
        const map = a.kind === "sel" ? encounterArt(v) : landscape(v, () => {
        }, "");
        map.querySelectorAll("button").forEach((b) => b.remove());
        art.append(map);
        const body = el("div", "card-body");
        body.append(el("p", "eyebrow", a.eyebrow), el("h2", "", a.title), el("p", "", a.intro));
        const seedLabel = el("label", "seed-label", "World seed");
        const seed = el("input");
        seed.id = "seed-" + a.id;
        seed.value = "FIELD-01";
        seed.maxLength = 32;
        seed.spellcheck = false;
        seedLabel.append(seed);
        if (a.kind !== "sel") body.append(seedLabel);
        body.append(button("Begin " + a.label, () => startJourney(a, seed.value), "primary"));
        card.append(art, body);
        cards.append(card);
      });
      main.append(cards);
      const saved = el("section", "saved");
      saved.append(el("h2", "", options.sessionOnly ? "Journeys in this session" : "Your saved journeys"));
      try {
        const records = storage ? listRuns(storage, adapters) : [];
        if (!records.length) saved.append(el("p", "status-line", "Your journeys will appear here after you begin."));
        for (const item of records) {
          const row = el("div", "save-row"), text = el("div");
          if (item.run) {
            const a = adapters.find((a2) => a2.id === item.run.campaignId);
            const v = a.view(materialize(a, item.run));
            text.append(el("h3", "", a.label + (a.kind === "sel" ? "" : " \xB7 " + item.run.seed)), el("p", "", v.period + " \xB7 " + item.run.commands.length + " decisions \xB7 " + new Date(item.run.createdAt).toLocaleDateString()));
            row.append(text, button("Resume " + a.label, () => resumeJourney(item.key)));
          } else {
            text.append(el("h3", "", "Journey needs recovery"), el("p", "", item.error));
            row.append(text);
          }
          saved.append(row);
        }
      } catch {
        saved.append(el("p", "status-line", "Saved journeys cannot be read in this browser."));
      }
      main.append(saved);
      const file = el("input");
      file.type = "file";
      file.accept = ".json,application/json";
      file.hidden = true;
      file.addEventListener("change", async () => {
        const chosen = file.files[0];
        if (!chosen) return;
        try {
          if (chosen.size > 18e4) throw new Error("Choose a pilot journal smaller than 180 KB.");
          const raw = JSON.parse(await chosen.text());
          const a = adapters.find((a2) => a2.id === raw.campaignId);
          if (!a) throw new Error("This is not a recognized pilot journey.");
          const { validateRun: validateRun2 } = await Promise.resolve().then(() => (init_core(), core_exports));
          const checked = validateRun2(a, raw), next = forkRun(checked, checked.commands.length);
          run = next;
          adapter = a;
          persist();
          activate(next);
        } catch (error) {
          message(error.message, true);
        }
      });
      const tools = el("div", "footer-tools");
      tools.append(button("Open a downloaded journey", () => file.click()), file);
      main.append(tools);
      renderPilotDetails();
    }
    function renderResponses(decisions, actions) {
      if (view.ended) return;
      const modeLabel = el("label", "response-mode", "Response format");
      const mode = el("select");
      mode.id = "response-mode";
      for (const [value, label] of [["both", "Both"], ["choices", "Choices"], ["write", "Write a response"]]) {
        const option = el("option", "", label);
        option.value = value;
        option.selected = value === responseMode;
        mode.append(option);
      }
      mode.addEventListener("change", () => {
        responseMode = mode.value;
        try {
          storage?.setItem("alloflow-journey-input:v1", responseMode);
        } catch {
        }
        renderJourney();
        $("response-mode").focus();
      });
      modeLabel.append(mode);
      decisions.append(modeLabel);
      if (responseMode !== "write") {
        const choices = el("div", "choice-responses");
        choices.setAttribute("aria-label", "Available choices");
        let allLabel = false;
        actions.forEach((action) => {
          if (action.location === "all" && !allLabel) {
            choices.append(el("p", "action-group", "Across the watershed"));
            allLabel = true;
          }
          const revision = run.commands.length;
          const b = button("", () => choose(action.id, revision), "action" + (!action.location ? " primary" : ""));
          b.dataset.action = action.id;
          b.disabled = !!action.disabled;
          const title = el("span", "action-title");
          title.append(el("span", "", action.label));
          if (action.cost != null) title.append(el("span", "action-cost", action.cost + "h" + (action.disabled ? " \xB7 unavailable" : "")));
          b.append(title, el("span", "action-hint", action.location ? action.tradeoff : action.hint));
          choices.append(b);
        });
        decisions.append(choices);
      }
      if (responseMode !== "choices") {
        const form = el("section", "written-response");
        const label = el("label", "", "Write what you would do or say");
        label.htmlFor = "written-response";
        const input = el("textarea");
        input.id = "written-response";
        input.maxLength = 1200;
        input.rows = 4;
        input.placeholder = adapter.kind === "sel" ? "Use your own words. A short sentence is enough." : "Describe your next action. A short sentence is enough.";
        const draftKey = run.runId + ":" + run.commands.length;
        input.value = responseDrafts.get(draftKey) || "";
        const review = el("div", "response-review");
        review.id = "response-review";
        input.addEventListener("input", () => {
          responseDrafts.set(draftKey, input.value);
          proposal = null;
          review.replaceChildren();
        });
        form.append(label, input, el("p", "status-line", "Your confirmed response stays in your journal. Review the action before it runs."));
        const showReview = () => {
          review.replaceChildren();
          if (!proposal) return;
          review.append(el("p", "", proposal.message));
          const actionLabel = el("label", "", "Action to try"), select = el("select");
          select.id = "response-action";
          const empty = el("option", "", "Choose an action\u2026");
          empty.value = "";
          select.append(empty);
          proposal.actions.forEach((a) => {
            const option = el("option", "", a.label + (a.locationName ? " \xB7 " + a.locationName : "") + (a.cost != null ? " \xB7 " + a.cost + "h" : ""));
            option.value = a.id;
            select.append(option);
          });
          select.value = proposal.suggested || "";
          actionLabel.append(select);
          review.append(actionLabel);
          const hint = el("p", "status-line");
          const explain = () => {
            const a = proposal?.actions.find((x) => x.id === select.value);
            hint.textContent = a ? a.tradeoff || a.hint || "" : "";
          };
          select.addEventListener("change", explain);
          explain();
          review.append(hint);
          const captured = proposal;
          review.append(button("Confirm response and continue", () => {
            try {
              if (proposal !== captured) throw Error("Review your edited response again.");
              run = dispatchResponse(adapter, run, captured, select.value);
              responseDrafts.delete(draftKey);
              proposal = null;
              persist();
              stopReading();
              renderJourney(true);
              announce("Written response recorded. " + view.period + ". " + view.title);
            } catch (error) {
              message(error.message, true);
            }
          }, "primary"));
        };
        form.append(button("Review my response", () => {
          try {
            proposal = reviewResponse(adapter, run, input.value, { location: adapter.id === "watershed" ? selected : void 0 });
            showReview();
            $("response-action").focus();
            announce(proposal.message);
          } catch (error) {
            message(error.message, true);
            input.focus();
          }
        }), review);
        if (proposal?.runId === run.runId && proposal.revision === run.commands.length) showReview();
        decisions.append(form);
      }
    }
    function encounterArt(v) {
      const art = el("div", "encounter-art");
      art.append(el("span", "encounter-symbol", "\u2726"), el("p", "eyebrow", "PRACTICE \xB7 PAUSE \xB7 TRY AGAIN"), el("p", "", v.setting || "A place for your voice"));
      return art;
    }
    function renderEncounter(left) {
      const panel = el("section", "encounter-panel");
      panel.append(encounterArt(view), el("h2", "", "Who is here"));
      const people = el("ul");
      view.people.forEach((p) => people.append(el("li", "", p)));
      panel.append(people, el("p", "status-line", "You can pause or leave at any time."));
      left.append(panel);
      if (view.feedback) {
        const feedback = el("section", "encounter-feedback");
        feedback.append(el("h3", "", view.feedback.title), el("p", "", view.feedback.body), el("p", "", view.feedback.reflection));
        left.append(feedback);
      }
    }
    function choose(id, revision) {
      try {
        const next = dispatch(adapter, run, id, revision);
        run = next;
        proposal = null;
        persist();
        stopReading();
        renderJourney(true);
        announce(adapter.label + ". " + view.period + ". " + view.title + ". " + notice);
      } catch (error) {
        message(error.message, true);
      }
    }
    function selectLocation(id) {
      selected = id;
      proposal = null;
      renderJourney(false);
      root.querySelector('[data-location="' + id + '"]')?.focus();
    }
    function renderJourney(focus = false) {
      const model = materialize(adapter, run);
      view = adapter.view(model);
      if (view.locations.length && !view.locations.some((l) => l.id === selected)) selected = view.locations[0].id;
      main.replaceChildren();
      const heading = el("div", "journey-heading"), titles = el("div");
      titles.append(button(isSEL ? "\u2190 Practice journeys" : "\u2190 Field station", returnHome, "quiet"), el("p", "eyebrow", adapter.eyebrow), el("h1", "", adapter.title));
      const tools = el("div", "header-actions");
      const soundButton = button(sound ? "Sound on" : "Sound off", () => {
        sound = !sound;
        playSound();
        soundButton.textContent = sound ? "Sound on" : "Sound off";
        soundButton.setAttribute("aria-pressed", String(sound));
      });
      soundButton.setAttribute("aria-pressed", String(sound));
      if (view.sound) tools.append(soundButton);
      tools.append(button("Download journal", downloadJournal));
      heading.append(titles, tools);
      main.append(heading, makeNotice());
      const journey = el("div", "journey"), left = el("section"), right = el("section");
      left.setAttribute("aria-label", isSEL ? "People and possible responses" : "Landscape and model state");
      right.setAttribute("aria-label", "Scene and decisions");
      let location;
      if (view.kind === "sel") renderEncounter(left);
      else {
        const map = landscape(view, selectLocation, selected);
        map.querySelectorAll("button").forEach((b, i) => b.dataset.location = view.locations[i].id);
        left.append(map);
        const caption = el("div", "map-caption");
        caption.append(el("span", "", adapter.id === "watershed" ? "Choose a reach to plan fieldwork." : "Choose a patch to inspect the grove."), el("span", "", run.seed));
        left.append(caption);
        location = view.locations.find((l) => l.id === selected);
        const info = el("div", "location-info");
        info.append(el("h3", "", location.name));
        const locationText = location.description + (adapter.id === "grove" ? ". " + location.value + " living trees here. " + (location.gap ? "A storm has opened the canopy." : "") + (location.trees.some((t) => t.descendant) ? " Smaller trees show descendants." : "") : "");
        info.append(el("p", "", locationText));
        left.append(info);
        const metrics = el("div", "metrics");
        metrics.setAttribute("aria-label", "Current model values");
        view.metrics.forEach((m) => {
          const metric = el("div", "metric"), value = el("span", "metric-value", m.value);
          value.append(el("small", "", m.unit));
          metric.append(value, el("span", "metric-label", m.label));
          metrics.append(metric);
        });
        left.append(metrics);
      }
      const support = el("details");
      support.append(el("summary", "", "Help me reason through this"), el("p", "", view.support));
      left.append(support);
      const scene = el("section", "scene");
      scene.setAttribute("aria-labelledby", "scene-title");
      const meta = el("div", "scene-meta");
      meta.append(el("p", "eyebrow", view.ended ? "FIELD NOTES \xB7 FINAL CHAPTER" : "FIELD NOTES \xB7 " + view.period.toUpperCase()), button("Read aloud", readScene), button("Stop", stopReading));
      scene.append(meta);
      const title = el("h2", "", view.title);
      title.id = "scene-title";
      title.tabIndex = -1;
      const body = el("p", "scene-body", view.body);
      body.id = "scene-body";
      const extra = el("p", "optional-narration");
      extra.id = "optional-text";
      extra.hidden = true;
      const state = el("p", "status-line");
      state.id = "narration-status";
      scene.append(title, body, extra, state);
      const progressRow = el("div", "progress-row");
      progressRow.append(el("span", "", view.period), el("span", "", view.progress + " / " + view.total + " " + (view.progressLabel || "years observed")));
      const progress = el("progress");
      progress.max = view.total;
      progress.value = view.progress;
      progress.setAttribute("aria-label", view.progressLabel || "Years observed");
      scene.append(progressRow, progress);
      right.append(scene);
      const decisions = el("section", "decisions");
      decisions.append(el("h3", "", view.prompt));
      let actions = view.actions;
      if (adapter.id === "watershed" && view.phase === "year") {
        actions = actions.filter((a) => a.location === selected || a.location === "all" || !a.location);
        decisions.append(el("p", "action-group", "Fieldwork \xB7 " + location.name));
      }
      renderResponses(decisions, actions);
      if (view.ended) {
        decisions.append(el("p", "", adapter.disclosure));
        if (isSEL && options.openRelatedTool) {
          decisions.append(button("Continue in Advocacy Practice", () => options.openRelatedTool("advocacy")), button("Open Self-Advocacy Studio", () => options.openRelatedTool("selfAdvocacy")));
        }
      }
      right.append(decisions);
      if (view.evidence.length) {
        const evidence = el("section", "evidence");
        evidence.append(el("h3", "", adapter.id === "watershed" ? "After fieldwork \u2192 after the year" : "What the last year recorded"));
        const table = el("table"), head = el("thead"), tr = el("tr");
        ["Evidence", adapter.id === "watershed" ? "Before \u2192 after" : "Result"].forEach((text) => {
          const th = el("th", "", text);
          th.scope = "col";
          tr.append(th);
        });
        head.append(tr);
        table.append(head);
        const tbody = el("tbody");
        view.evidence.forEach((item) => {
          const row = el("tr"), name = el("td", "", item.label), value = el("td", "number", item.before == null ? String(item.after) : item.before + " \u2192 " + item.after);
          name.title = item.detail;
          row.append(name, value);
          tbody.append(row);
        });
        table.append(tbody);
        evidence.append(table);
        right.insertBefore(evidence, decisions);
      }
      journey.append(left, right);
      main.append(journey);
      renderJournal();
      renderPilotDetails();
      if (focus) title.focus({ preventScroll: false });
      playSound();
      refreshNarration();
    }
    function renderJournal() {
      const journal = el("section", "journal"), history = el("div"), notes = el("div", "notes");
      history.append(el("h2", "", isSEL ? "Your practice journal" : "The field journal"));
      const receipts = el("div", "receipts");
      receipts.tabIndex = 0;
      receipts.setAttribute("role", "region");
      receipts.setAttribute("aria-label", isSEL ? "Recorded practice encounters" : "Recorded annual evidence");
      if (!view.receipts.length) receipts.append(el("p", "status-line", isSEL ? "Try a response to record the encounter here." : "Observe your first year to record its event and consequences."));
      for (const record of view.receipts) {
        const item = el("article", "receipt");
        item.append(el("h3", "", record.title), el("p", "", record.text), el("p", "", record.detail));
        receipts.append(item);
      }
      history.append(receipts);
      if (run.commands.length) {
        history.append(button(view.replayLabel || "Replay the latest year", () => {
          let revision = run.commands.length - 1;
          if (adapter.id === "watershed") {
            const lastEnd = run.commands.lastIndexOf("end-year");
            const prior = run.commands.lastIndexOf("continue", lastEnd - 1);
            revision = prior >= 0 ? prior + 1 : 0;
          }
          const next = forkRun(run, revision);
          run = next;
          persist();
          message("A new branch is ready in the same world. The previous journey is still saved.");
          activate(next);
        }));
        history.append(el("p", "status-line", "Opens a separate saved branch with the same world seed."));
      }
      const label = el("label", "", "What changed, and what might you try next?");
      label.htmlFor = "field-note";
      const input = el("textarea");
      input.id = "field-note";
      input.maxLength = 1200;
      input.placeholder = "Use something you observed as evidence\u2026";
      input.value = noteDrafts.get(run.runId) || "";
      const noteRunId = run.runId;
      input.addEventListener("input", () => noteDrafts.set(noteRunId, input.value));
      notes.append(label, input, button("Save field note", () => {
        try {
          run = addNote(run, input.value);
          noteDrafts.delete(run.runId);
          persist();
          renderJourney();
          $("field-note").focus();
        } catch (error) {
          message(error.message, true);
        }
      }));
      for (const response of run.responses || []) {
        const entry = el("div", "written-record");
        entry.append(el("h3", "", "Your words \xB7 decision " + response.revision), el("p", "note", response.text));
        notes.append(entry);
      }
      for (const note of run.notes) notes.append(el("p", "note", note.text));
      journal.append(history, notes);
      main.append(journal);
    }
    function renderPilotDetails() {
      const details = el("details", "pilot-details");
      details.append(
        el("summary", "", options.embedded ? isSEL ? "About Practice Journeys" : "About Field Journeys" : "About this pilot and its isolation checks"),
        el("p", "", options.embedded ? isSEL ? "Practice a fictional group project. Several responses can work. This journey stays in the current SEL session. Download the journal to keep it after closing or reloading this tab." : "Explore two campaigns using the existing simulations. Journeys save on this device and can be downloaded. Your regular adventures and campaigns keep their own saves." : "This is a separate development host. It reads the existing Tree Life Lab engine and Adventure soundscape code unchanged. The watershed bridge copies exact source functions at build time. No app account, cloud session, API key, or regular campaign save is connected."),
        el("p", "", options.embedded ? isSEL ? "Characters\u2019 replies are authored possibilities. Written responses are kept with the action you confirm; they are not graded or sent to an AI service." : "Scenes describe results from the simulation. Written responses are kept with the action you confirm. This pilot does not require an AI connection." : "The visible scenes are authored from model results. Optional narration is an extension point only: no live AI provider is configured. These local checks simulate failure without making a network request."),
        el("p", "", adapter ? adapter.disclosure : isSEL ? "You can speak, write or use a communication tool. No personal disclosure is required." : "Both campaigns use educational models. Their indices and scenario assumptions are not real-world forecasts.")
      );
      if (run && !options.embedded) {
        details.append(
          button("Simulate narrator outage", () => {
            provider = () => Promise.reject(new Error("Simulated outage"));
            refreshNarration();
          }),
          button("Simulate malformed narration", () => {
            provider = () => ({ systemStateUpdate: { quality: 100 } });
            refreshNarration();
          }),
          button("Use authored narration", () => {
            provider = null;
            refreshNarration();
          })
        );
      }
      main.append(details);
    }
    const visibility = () => {
      if (document.hidden) {
        stopSound();
        stopReading();
      } else playSound();
    };
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelNarration();
      sound = false;
      stopSound();
      stopReading();
      audioContext?.close().catch(() => {
      });
      audioContext = null;
      noteDrafts.clear();
      responseDrafts.clear();
      proposal = null;
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", destroy);
    }
    try {
      adapters = options.adapters || createAdapters(window.__alloTreeLabEngine);
      try {
        storage = options.storage || window.localStorage;
        const savedMode = storage.getItem("alloflow-journey-input:v1");
        if (["both", "choices", "write"].includes(savedMode)) responseMode = savedMode;
      } catch {
        storage = null;
      }
      renderHome();
      document.addEventListener("visibilitychange", visibility);
      window.addEventListener("pagehide", destroy);
    } catch (error) {
      main.replaceChildren(el("h1", "", "The field station could not open"), el("p", "", error.message), el("p", "", "Your existing adventures and campaign saves have not been changed."));
    }
    return Object.freeze({ snapshot: () => run ? clone2({ run, view }) : null, setNarrator: (fn) => {
      provider = fn;
      refreshNarration();
    }, showHome: returnHome, destroy });
  }

  // dev-tools/campaign-adventure-pilot/styles.css
  var styles_default = ':root{color-scheme:light;--ink:#193d32;--muted:#58675d;--paper:#f6f4eb;--line:#d5dacb;--accent:#2d6150;--warm:#a05c2b;font-family:Inter,"Segoe UI",system-ui,sans-serif;font-size:16px;background:var(--paper);color:var(--ink)}\n*{box-sizing:border-box}body{margin:0}button,input,textarea,select{font:inherit}button,a,input,textarea,select{-webkit-tap-highlight-color:transparent}button{cursor:pointer}button:disabled{cursor:not-allowed}a{color:inherit}button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #925221;outline-offset:4px}\nbutton{min-height:44px;border-radius:8px;border:1px solid var(--line);background:#fffef8;color:var(--ink);padding:10px 16px}button:hover:not(:disabled){background:#e6eddf}button.primary{background:var(--ink);color:#fffef2;border-color:var(--ink)}button.primary:hover:not(:disabled){background:#2c5948}button:disabled{color:#687066;background:#ecece3;border-style:dashed}button.quiet{border-color:transparent;background:transparent;padding-left:0}.sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.skip{position:absolute;left:20px;top:-100px;z-index:100;padding:14px;background:white}.skip:focus{top:10px}\n.masthead{max-width:1320px;margin:auto;padding:25px 34px;display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line)}.brand{text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.8px;display:flex;align-items:center;gap:14px}.brand>span:first-child{font-size:27px;letter-spacing:0}.brand-light{font-weight:500;color:var(--muted)}.preview{font-size:10px;font-weight:700;letter-spacing:1.6px;border:1px solid #bccbb7;border-radius:30px;padding:7px 12px;white-space:nowrap}\nmain{max-width:1252px;margin:auto;padding:42px 0 20px;min-height:70vh}h1,h2,h3,p{margin-top:0}h1,h2{font-family:Georgia,"Times New Roman",serif;font-weight:400}h1{font-size:clamp(34px,4vw,56px);line-height:1.05;letter-spacing:-1.4px;margin-bottom:17px}h2{font-size:32px;line-height:1.1;letter-spacing:-.5px}h3{font-size:16px}p{line-height:1.65}.eyebrow{font-size:10px;font-weight:750;letter-spacing:2px;margin:0 0 15px;color:var(--muted)}.intro{max-width:670px;margin:15px 0 35px}.intro>p:last-child{font-size:18px;color:var(--muted);max-width:580px}\n.campaign-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px}.campaign-card{border:1px solid var(--line);border-radius:15px;overflow:hidden;background:#fffdf5}.card-art{height:165px;overflow:hidden;position:relative}.card-art .landscape{border:0;border-radius:0;width:100%;height:210px;aspect-ratio:auto;margin-top:-20px}.card-art button{display:none}.card-body{padding:30px}.card-body h2{font-size:33px;max-width:360px;margin-bottom:16px}.card-body>p:not(.eyebrow){color:var(--muted);min-height:77px}.seed-label{font-size:12px;display:flex;align-items:center;gap:12px;margin:15px 0}.seed-label input{min-width:0;width:150px;border:1px solid var(--line);background:#f8f8ef;padding:10px;border-radius:6px;color:var(--ink)}.saved{margin-top:32px;border-top:1px solid var(--line);padding-top:24px}.save-row{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:14px 0;border-bottom:1px solid var(--line)}.save-row p{margin:0;font-size:13px;color:var(--muted)}\n.journey-heading{display:flex;justify-content:space-between;gap:24px;align-items:end;margin:4px 0 30px}.journey-heading h1{font-size:42px;max-width:720px}.journey-heading .eyebrow{margin-bottom:10px}.journey-heading p{margin-bottom:0}.header-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.header-actions button{font-size:12px}.journey{display:grid;grid-template-columns:minmax(0,1.14fr) minmax(0,1fr);gap:36px;align-items:start}.landscape{position:relative;border:1px solid #c6d4bd;border-radius:13px;overflow:hidden;aspect-ratio:640/455;background:#dfe8d3}.landscape svg{width:100%;height:100%;display:block}.map-location{position:absolute;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:7px 9px;background:#fffef0ed;border:1px solid #a6bca4;box-shadow:0 3px 7px #23493412;font-size:11px;white-space:nowrap;border-radius:6px}.map-location strong{font-size:13px;border-left:1px solid #c6ceba;padding-left:7px}.map-location[aria-pressed=true]{border:2px solid #204d3c;background:#214c3e;color:#fffef4;box-shadow:0 0 0 3px #fffce6}.map-location[aria-pressed=true]:hover{background:#2c5948;color:white}.grove .map-location{font-size:9px;padding:6px;min-height:35px}.grove .map-location strong{font-size:12px}.map-caption{margin:10px 0 20px;font-size:11px;color:var(--muted);display:flex;justify-content:space-between;gap:12px}.location-info{padding:17px 19px;border-left:3px solid #90ac78;background:#e9edde;border-radius:0 8px 8px 0;min-height:123px}.location-info h3{margin-bottom:8px}.location-info p{margin:0;font-size:13px;line-height:1.6;color:#425749}\n.metrics{display:grid;grid-template-columns:repeat(4,1fr);margin:24px 0;gap:12px}.metric{padding-right:8px;border-right:1px solid var(--line)}.metric:last-child{border-right:0}.metric-value{font-size:27px;font-family:Georgia,serif;display:block}.metric-value small{font:10px Inter,"Segoe UI",sans-serif;margin-left:4px}.metric-label{font-size:11px;color:var(--muted);display:block;margin-top:6px}\n.scene{background:#fffef7;border:1px solid #dcdfcf;border-radius:12px;padding:27px 29px}.scene-meta{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:18px}.scene-meta .eyebrow{margin:0;color:#6c654f}.scene-meta button{font-size:11px;padding:6px 10px;min-height:36px}.scene h2{font-size:33px;margin-bottom:17px}.scene-body{font-size:15px;color:#405449;line-height:1.8;margin:0}.optional-narration{border-left:2px solid #b8c7a9;padding-left:12px;margin-top:16px;font-size:13px}.optional-narration .eyebrow{margin-bottom:8px}.progress-row{display:flex;justify-content:space-between;gap:10px;font-size:11px;margin:22px 0 8px;color:var(--muted)}progress{width:100%;height:5px;accent-color:var(--accent);display:block;border:0;border-radius:5px;overflow:hidden}progress::-webkit-progress-bar{background:#e0e4d6}progress::-webkit-progress-value{background:var(--accent)}.decisions{margin-top:26px}.decisions h3{font-family:Georgia,serif;font-size:24px;font-weight:400;margin:0 0 16px}.action{display:block;text-align:left;width:100%;padding:14px 16px;margin:0 0 10px;border-radius:9px;background:#fdfdf4}.action-title{display:flex;justify-content:space-between;gap:12px;font-size:14px;font-weight:650}.action-hint{display:block;font-size:12px;line-height:1.5;color:var(--muted);margin-top:5px}.action-cost{font-size:11px;font-weight:500;white-space:nowrap}.action.primary .action-hint{color:#e1ebdb}.action:disabled .action-hint{color:#687066}.action-group{font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted);margin:19px 0 9px}\n.evidence{margin-top:24px}.evidence h3{margin-bottom:12px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{text-align:left;border-bottom:1px solid var(--line);padding:10px 7px;vertical-align:top}th{font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:var(--muted)}td:first-child{padding-left:0}.number{font-variant-numeric:tabular-nums;white-space:nowrap}\ndetails{margin-top:20px;border-top:1px solid var(--line);padding-top:16px}summary{font-size:13px;cursor:pointer;min-height:35px;line-height:1.5;padding:5px 0}details p{font-size:13px;color:var(--muted)}.journal{margin-top:35px;padding-top:28px;border-top:1px solid var(--line);display:grid;grid-template-columns:1fr 1fr;gap:36px}.journal h2{font-size:30px}.receipts{max-height:330px;overflow:auto;padding-right:10px;scrollbar-width:thin}.receipt{padding:0 0 17px 17px;margin:0 0 17px;border-left:2px solid #a8bf91}.receipt h3{font-size:13px;margin-bottom:6px}.receipt p{font-size:12px;margin:0;color:var(--muted)}.notes textarea{display:block;resize:vertical;width:100%;min-height:100px;border:1px solid var(--line);border-radius:8px;background:#fffef8;padding:14px;line-height:1.5;font-size:14px;margin:10px 0}.notes label{font-size:13px;color:var(--muted)}.notes .note{margin:16px 0;border-left:2px solid #b3c7a2;padding-left:12px;font-size:13px;white-space:pre-wrap}.notice{padding:12px 15px;background:#e5edda;border:1px solid #b8cba6;border-radius:7px;font-size:13px;margin:15px 0;line-height:1.5}.notice.warning{background:#fbf0d9;border-color:#d7bd8c;color:#6c4a19}.notice[hidden]{display:none}.pilot-details{margin-top:32px}.pilot-details button{font-size:12px;margin:0 10px 10px 0}.pilot-details p{max-width:800px}.status-line{font-size:11px;color:var(--muted);min-height:17px}.footer-tools{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}footer{max-width:1252px;margin:30px auto;padding:22px 0;border-top:1px solid var(--line);font-size:12px;color:var(--muted);line-height:1.7}footer span{font-size:11px}.boot{padding:50px 0}\n@media(min-width:1400px){main{padding-top:55px}}@media(max-width:1330px){main,footer{margin-left:34px;margin-right:34px}}@media(max-width:900px){.journey{gap:22px;grid-template-columns:1fr 1fr}.scene{padding:22px}.map-location{font-size:9px;padding:5px}.grove .map-location span{max-width:55px;white-space:normal}.metrics{gap:7px}.metric-value{font-size:23px}.journey-heading h1{font-size:35px}}\n@media(max-width:720px){.masthead{padding:17px 20px}.brand{font-size:10px;gap:8px;letter-spacing:1px}.brand-light{display:none}.preview{font-size:9px;padding:6px 9px}main{margin:0 20px;padding-top:30px}.intro{margin:0 0 25px}.intro>p:last-child{font-size:16px}.campaign-grid{grid-template-columns:1fr;gap:22px}.card-body{padding:24px}.card-body>p{min-height:0}.journey-heading{display:block;margin-bottom:23px}.journey-heading h1{font-size:35px}.header-actions{margin-top:13px;gap:13px}.journey{grid-template-columns:1fr;gap:22px}.scene{padding:22px}.scene h2{font-size:29px}.scene-body{font-size:15px}.map-location{font-size:10px}.grove .map-location{font-size:9px;min-height:44px}.grove .map-location span{max-width:69px;white-space:normal}.location-info{min-height:0}.metrics{margin-bottom:0}.journal{grid-template-columns:1fr;gap:24px}.save-row{align-items:start}.save-row button{padding:9px;font-size:12px}footer{margin:25px 20px}.metric-value{font-size:26px}.status-line{line-height:1.6}.map-caption{font-size:10px}.campaign-card h2{font-size:32px}}\n@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation:none!important}}@media(forced-colors:active){button{border:1px solid ButtonText}.map-location[aria-pressed=true]{outline:3px solid Highlight}.landscape{border:1px solid CanvasText}.metric-value{color:CanvasText}}@media print{.masthead,.header-actions,.decisions,.pilot-details,button,textarea,.notes label,footer{display:none!important}main{margin:0}.journey,.journal{display:block}.landscape{max-width:550px}.receipts{max-height:none;overflow:visible}.scene{break-inside:avoid}}\n\n.response-mode{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;margin:0 0 18px}\n.response-mode select,.response-review select{max-width:100%;min-height:44px;border:1px solid var(--line);border-radius:8px;padding:8px;background:#fffef8;color:var(--ink)}\n.written-response{border:1px solid var(--line);border-radius:10px;padding:18px;margin-top:20px;background:#fffef8}\n.written-response>label,.response-review label{display:block;font-size:13px;font-weight:650;line-height:1.5}\n.written-response textarea{display:block;resize:vertical;box-sizing:border-box;width:100%;min-height:115px;padding:12px;margin:10px 0;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);line-height:1.6}\n.response-review:not(:empty){margin-top:18px;border-top:1px solid var(--line);padding-top:16px}\n.response-review select{display:block;width:100%;margin:8px 0}.response-review p{font-size:13px}\n.response-review button{width:100%;white-space:normal}.written-record{margin-top:20px}.written-record h3{font-size:12px;margin-bottom:6px}\n.entry-note{padding:18px;margin-bottom:22px;border:1px solid var(--line);border-radius:10px}.entry-note p{font-size:13px}.entry-note button{margin-right:10px}\n.single-campaign{grid-template-columns:minmax(0,1fr);max-width:760px}\n.encounter-art{min-height:165px;padding:28px;background:linear-gradient(135deg,#dcebe1,#eae3f4);color:#284c40;display:flex;flex-direction:column;justify-content:center}\n.encounter-art p{margin:0;font-size:22px;font-family:Georgia,serif}.encounter-art .eyebrow{font:10px "Segoe UI",sans-serif;margin:10px 0}\n.encounter-symbol{font-size:40px;line-height:1}.encounter-panel{overflow:hidden;border:1px solid var(--line);border-radius:12px;background:#fffef8}\n.encounter-panel h2{font-size:27px;margin:24px 24px 12px}.encounter-panel ul{padding:0 24px 0 44px;font-size:14px;line-height:1.8}.encounter-panel>.status-line{margin:20px 24px}\n.encounter-feedback{border-left:3px solid #90ac78;background:#e9edde;padding:20px;margin-top:24px;border-radius:0 8px 8px 0}.encounter-feedback p{font-size:14px}.encounter-feedback p:last-child{margin:0}\n@media(max-width:720px){.response-mode{align-items:start;flex-direction:column}.response-mode select{width:100%}.written-response{padding:14px}}\n';

  // dev-tools/campaign-adventure-pilot/sel-adapter.mjs
  var chapters = [
    {
      title: "Make room for your way of working",
      setting: "Monday \xB7 Planning table",
      body: "You, Morgan and Sam are making a class presentation. Ideas are coming quickly, and the group is about to choose roles. You want a way to contribute that works for you.",
      prompt: "How would you like to join the plan?",
      actions: [
        { id: "written-plan", label: "Ask for a written plan", hint: "\u201CCould we write down the jobs before choosing?\u201D", responseTerms: ["write", "written", "list", "on paper", "text", "type"], reply: "Sam starts a shared list. Morgan asks which part you would like to take.", reflection: "A written plan gives everyone something to return to. You can request it without explaining personal information." },
        { id: "talk-it-through", label: "Ask to talk through the roles", hint: "\u201CCould we go around and hear what each person wants to do?\u201D", responseTerms: ["talk", "turns", "discuss", "listen", "speak"], reply: "Morgan suggests taking turns. The group hears each person\u2019s preferred role.", reflection: "A turn-taking plan can make room for different ideas. Listening can look different for different people." },
        { id: "thinking-time", label: "Ask for a little thinking time", hint: "\u201CI need a minute to decide. Can you come back to me?\u201D", responseTerms: ["minute", "time", "pause", "think", "break"], reply: "The group looks at examples while you consider the roles, then checks back with you.", reflection: "Taking time can be part of participating. You do not have to answer immediately to have a useful contribution." }
      ]
    },
    {
      title: "Ask for the support you need",
      setting: "Tuesday \xB7 Working session",
      body: "The classroom is busy and several groups are talking. You are finding it hard to keep track of the next step. You can try a different way of working or ask someone to help.",
      prompt: "What support would you like to try?",
      actions: [
        { id: "quiet-space", label: "Request a quieter place to work", hint: "\u201CCould I work at the nearby quiet table and check in afterward?\u201D", responseTerms: ["quiet", "noise", "loud", "space", "nearby"], reply: "The teacher points out a quieter table. You arrange a time to check in with the group.", reflection: "Changing the environment is one option. In another classroom, you might need to discuss which spaces are available." },
        { id: "written-checkin", label: "Request the next step in writing", hint: "\u201CCould you put the next step in our shared notes?\u201D", responseTerms: ["write", "written", "notes", "text", "list", "instructions"], reply: "Sam adds the next step to the notes and asks whether you want to check it together.", reflection: "You can ask for information in a format you can use. A request can be spoken, written or shared through a communication tool." },
        { id: "adult-support", label: "Ask a trusted adult to help clarify", hint: "\u201CCould you help us work out what comes next?\u201D", responseTerms: ["teacher", "adult", "help", "clarify", "support"], reply: "The teacher helps the group divide the next task into smaller steps.", reflection: "Asking for support is a valid action. You can say what would help without sharing a diagnosis or other private information." }
      ]
    },
    {
      title: "Respond to a change in the plan",
      setting: "Wednesday \xB7 A new request",
      body: "Morgan asks, \u201CCould you present my slides too?\u201D That would add work to the role you agreed on. You can discuss the request, set a limit or get support.",
      prompt: "How would you respond?",
      actions: [
        { id: "keep-boundary", label: "Keep your agreed role and offer to plan together", hint: "\u201CI can do my section. Let\u2019s work out another plan for yours.\u201D", responseTerms: ["no", "cannot", "can t", "my part", "my section", "boundary", "limit", "own"], reply: "Morgan asks Sam about sharing the remaining slides. The group revisits the work that is still needed.", reflection: "You can set a limit without solving everything for someone else. This scene shows one possible response, not a guaranteed reaction." },
        { id: "adjust-plan", label: "Negotiate a smaller change", hint: "\u201CI could take one slide if we adjust the rest of the work.\u201D", responseTerms: ["one slide", "share", "split", "adjust", "negotiate", "trade"], reply: "The group writes down a smaller change and checks that everyone understands the new roles.", reflection: "A revised agreement can work when you choose it freely and the workload is clear." },
        { id: "ask-mediator", label: "Ask the teacher to help revisit the workload", hint: "\u201CCould we check this plan with the teacher?\u201D", responseTerms: ["teacher", "adult", "help", "support"], reply: "The teacher helps everyone compare the remaining work with the available time.", reflection: "You can involve support when a conversation is difficult. This practice does not require you to handle every disagreement alone." }
      ]
    },
    {
      title: "Follow up on what worked",
      setting: "Friday \xB7 Looking ahead",
      body: "The presentation is finished. Before another group project, you have a chance to keep a useful support, revise it or ask someone to help you plan.",
      prompt: "What would you carry into the next project?",
      actions: [
        { id: "keep-support", label: "Keep a support that helped", hint: "Name what helped and ask to use it next time.", responseTerms: ["keep", "again", "worked", "same", "next time"], reply: "You note a support you would like to request again and when you would bring it up.", reflection: "A useful next step names what helped and when you want to use it." },
        { id: "revise-support", label: "Try a different support next time", hint: "Name one part you would change and a possible alternative.", responseTerms: ["change", "different", "revise", "instead", "try"], reply: "You write one change to try and a way to check whether it helps.", reflection: "Revising a plan is part of learning what works for you. You can change your mind." },
        { id: "plan-checkin", label: "Arrange a check-in with someone you trust", hint: "Prepare a question to discuss together.", responseTerms: ["check in", "checkin", "teacher", "adult", "help", "support", "talk"], reply: "You prepare a question and choose someone you could ask for a planning conversation.", reflection: "Support can continue after a task ends. You choose what to share in that conversation." }
      ]
    }
  ];
  var clone = (x) => JSON.parse(JSON.stringify(x));
  var selfAdvocacyJourney = {
    id: "self-advocacy",
    kind: "sel",
    title: "A place for your voice",
    label: "Self-Advocacy Journey",
    eyebrow: "WORKING TOGETHER \xB7 4 ENCOUNTERS",
    intro: "Join a fictional group project, ask for support, discuss a change and decide what to try next. Respond with choices, your own words or both.",
    disclosure: "A fictional practice story with several valid approaches. Characters\u2019 replies are authored possibilities, not predictions or a score of your social skills. You may pause or leave at any time.",
    start(seed, config = {}) {
      if (Object.keys(config).length) throw Error("Unsupported practice settings.");
      return { chapter: 0, history: [] };
    },
    config: () => ({}),
    actions(model) {
      return model.chapter < chapters.length ? chapters[model.chapter].actions.map(({ id, label, hint, responseTerms }) => ({ id, label, hint, responseTerms })) : [];
    },
    step(model, id) {
      const chapter = chapters[model.chapter], action = chapter?.actions.find((a) => a.id === id);
      if (!action) throw Error("That response is unavailable here.");
      return { chapter: model.chapter + 1, history: [...clone(model.history), { title: chapter.title, action: action.label, reply: action.reply, reflection: action.reflection }] };
    },
    view(model) {
      const ended = model.chapter === chapters.length, chapter = chapters[Math.min(model.chapter, 3)], last = model.history.at(-1);
      const connection = model.chapter > 0 && !ended ? " Earlier, you chose to " + model.history[0].action.toLowerCase() + ". You can keep that approach or try another." : "";
      return {
        campaignId: this.id,
        kind: "sel",
        title: ended ? "Your next conversation" : chapter.title,
        body: ended ? "You practiced joining a plan, asking for support, responding to a change and following up. Look back at your choices and words. Which support would you want available in a real project?" : chapter.body + connection,
        phase: ended ? "complete" : "encounter",
        ended,
        review: false,
        progress: model.chapter,
        total: 4,
        period: ended ? "Practice journey complete" : "Encounter " + (model.chapter + 1) + " of 4",
        progressLabel: "encounters explored",
        replayLabel: "Replay the latest encounter",
        prompt: ended ? "What would you keep, change or ask for?" : chapter.prompt,
        setting: ended ? "Your practice notebook" : chapter.setting,
        people: ["You \xB7 choose how to participate", "Morgan \xB7 project teammate", "Sam \xB7 project teammate", "Teacher \xB7 available for support"],
        metrics: [],
        locations: [],
        evidence: [],
        actions: this.actions(model),
        receipts: model.history.map((r, i) => ({ title: "Encounter " + (i + 1) + " \xB7 " + r.title, text: "You tried: " + r.action + ". Possible response: " + r.reply, detail: r.reflection })),
        feedback: last ? { title: "A possible response", body: last.reply, reflection: last.reflection } : null,
        support: "There is more than one reasonable response. You can speak, write or use a communication tool. You do not need to disclose personal information, make eye contact or agree to extra work to participate.",
        sound: null
      };
    }
  };

  // dev-tools/campaign-adventure-pilot/session-store.mjs
  function createSessionStore(records = {}, onChange = () => {
  }) {
    const allowed = (key) => key === "alloflow-journey-input:v1" || key.startsWith("alloflow-campaign-pilot:v1:self-advocacy:");
    const values = new Map(Object.entries(records && typeof records === "object" ? records : {}).filter(([k, v]) => allowed(k) && typeof v === "string"));
    return {
      get length() {
        return values.size;
      },
      key: (index) => [...values.keys()][index] ?? null,
      getItem: (key) => values.get(key) ?? null,
      setItem(key, value) {
        if (!allowed(key) || typeof value !== "string") throw Error("Unrecognized practice record.");
        values.set(key, value);
        onChange(Object.fromEntries(values));
      }
    };
  }

  // dev-tools/campaign-adventure-pilot/native-view.mjs
  var moduleUrl = document.currentScript?.src;
  async function ensureSound() {
    if (typeof window.AlloModules?.playGenerativeSoundscape === "function") return;
    if (!moduleUrl) throw new Error("Sound asset location is unavailable.");
    const url = new URL("../adventure_module.js", moduleUrl);
    url.search = new URL(moduleUrl).search;
    await window.StemLab.loadScriptResilient([url.href], {
      cacheKey: "field-journeys-adventure-sound",
      timeoutMs: 15e3,
      check: () => typeof window.AlloModules?.playGenerativeSoundscape === "function"
    });
  }
  function JourneyHost({ ctx, kind = "stem" }) {
    const React = ctx.React, host = React.useRef(null);
    React.useEffect(() => {
      const root = host.current.shadowRoot || host.current.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = styles_default.replace(":root{", ":host{") + `
      :host{display:block;border-radius:12px;container-type:inline-size;line-height:1.5}
      main{min-height:0;padding:26px 0;margin:0 24px}
      .embedded-label{font-size:12px;letter-spacing:.06em;color:var(--muted);margin:0 0 20px}
      @container(max-width:720px){
        main{margin:0 16px;padding:22px 0}
        .campaign-grid,.journey,.journal{grid-template-columns:1fr;gap:22px}
        .journey-heading{display:block}.header-actions{margin-top:16px}
        .scene,.card-body{padding:20px}.card-body>p{min-height:0}
        .map-location{font-size:10px}.grove .map-location{min-height:44px}
        .grove .map-location span{max-width:58px;white-space:normal}
      }
      :host([data-theme="contrast"]){--ink:#fff;--muted:#eee;--paper:#000;--line:#aaa;--accent:#fff;color-scheme:dark}
      :host([data-theme="contrast"]) :is(button,input,textarea,select,.scene,.campaign-card,.action,.location-info,.notice,.written-response,.encounter-panel,.encounter-feedback,.encounter-art){background:#000;color:#fff;border-color:#fff}
      :host([data-theme="contrast"]) :is(p,.scene-meta .eyebrow,.action-hint,.map-caption,.location-info p){color:#eee}
      :host([data-theme="contrast"]) button:focus-visible{outline-color:#ff0}
      :host([data-theme="contrast"]) .map-location{background:#000;color:#fff}
      :host([data-theme="contrast"]) .map-location[aria-pressed=true]{outline:3px solid #ff0}
      @container(max-width:720px){.response-mode{align-items:start;flex-direction:column}.response-mode select{width:100%}}
    `;
      const main = document.createElement("main");
      main.id = "main";
      main.tabIndex = -1;
      main.setAttribute("aria-label", kind === "sel" ? "Practice Journeys pilot" : "Field Journeys pilot");
      const announcer = document.createElement("div");
      announcer.id = "announcer";
      announcer.className = "sr-only";
      announcer.setAttribute("role", "status");
      announcer.setAttribute("aria-live", "polite");
      announcer.setAttribute("aria-atomic", "true");
      root.replaceChildren(style, main, announcer);
      const protectTyping = (event) => {
        const path = event.composedPath();
        if (path.includes(root.host) && path.some((node) => node?.matches?.("input,textarea,select")) && !["Tab", "Escape"].includes(event.key)) event.stopPropagation();
      };
      window.addEventListener("keydown", protectTyping, true);
      const sessionStore = kind === "sel" ? createSessionStore(ctx.toolData?.practiceJourneys?.records, (records) => ctx.update("practiceJourneys", "records", records)) : void 0;
      const journey = mountFieldJourneys(root, { embedded: true, hub: kind, storage: sessionStore, sessionOnly: kind === "sel", ensureSound, adapters: kind === "sel" ? [selfAdvocacyJourney] : void 0, initialCampaign: kind === "stem" ? ctx.journeyEntry : null, returnToSource: ctx.journeyEntry ? () => ctx.setStemLabTool("waterCycle") : null, openRelatedTool: kind === "sel" ? ctx.setSelHubTool : null });
      return () => {
        journey.destroy();
        window.removeEventListener("keydown", protectTyping, true);
        root.replaceChildren();
      };
    }, []);
    return React.createElement("div", {
      ref: host,
      "data-field-journeys": "true",
      "data-journey-hub": kind,
      "data-theme": typeof ctx.theme === "string" ? ctx.theme : ctx.isContrast ? "contrast" : ctx.isDark ? "dark" : "light",
      style: { width: "100%", minWidth: 0 }
    });
  }

  // dev-tools/campaign-adventure-pilot/in-app.mjs
  window.StemLab.registerTool("fieldJourneys", {
    icon: "\u{1F33F}",
    label: "Field Journeys (Pilot)",
    category: "Ecology & Environment",
    lightBackground: true,
    render: (ctx) => ctx.React.createElement(JourneyHost, { ctx, kind: "stem" })
  });
})();
