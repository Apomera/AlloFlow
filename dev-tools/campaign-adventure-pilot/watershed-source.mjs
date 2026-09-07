// Generated exact-source bridge. Do not edit; run build.cjs.
// Source SHA-256: 8994f7e735887b88ff24aa97b81a53078e38851f0831a1089d9a5e053e140663
export const sourceSha256 = "8994f7e735887b88ff24aa97b81a53078e38851f0831a1089d9a5e053e140663";
export function createWatershedRuntime() {
const window = { StemLab: { findById: (items, id) => items.find(item => item.id === id) } };
const t = (key, fallback) => fallback == null ? key : fallback;
const addToast = null, announceToSR = null, awardStemXP = null;
const setTimeout = () => {}, checkWaterCycleChallenges = () => {};
let steward, d = {};
const setSteward = patch => { steward = Object.assign({}, steward, patch); };
const upd = (key, value) => { d[key] = value; };
// Original stem_lab/stem_tool_watercycle.js:646
var MAINE_WATERSHED_COMPONENTS = [
    {
      id: 'headwaterStreams', name: 'Headwater Streams', icon: '🏔️', color: '#0ea5e9',
      defaultState: {quality: 62, connectivity: 78, support: 60}, targets: {quality: 78, connectivity: 80, support: 65},
      // Copy lives in wcWatershedCopy() so the English sits beside its key.
      // Empty object kept so `c.deepDive ?` still offers the deep-dive button.
      deepDive: {}
    },
    {
      id: 'riverMainstem', name: 'River Mainstem', icon: '🌊', color: '#1d4ed8',
      defaultState: {quality: 48, connectivity: 25, support: 65}, targets: {quality: 70, connectivity: 70, support: 70},
      // Copy lives in wcWatershedCopy() so the English sits beside its key.
      // Empty object kept so `c.deepDive ?` still offers the deep-dive button.
      deepDive: {}
    },
    {
      id: 'floodplainWetlands', name: 'Floodplain Wetlands', icon: '🪷', color: '#16a34a',
      defaultState: {quality: 55, connectivity: 60, support: 50}, targets: {quality: 75, connectivity: 70, support: 65},
      // Copy lives in wcWatershedCopy() so the English sits beside its key.
      // Empty object kept so `c.deepDive ?` still offers the deep-dive button.
      deepDive: {}
    },
    {
      id: 'forestBuffer', name: 'Forested Buffer Zones', icon: '🌲', color: '#15803d',
      defaultState: {quality: 58, connectivity: 50, support: 60}, targets: {quality: 75, connectivity: 70, support: 70},
      // Copy lives in wcWatershedCopy() so the English sits beside its key.
      // Empty object kept so `c.deepDive ?` still offers the deep-dive button.
      deepDive: {}
    },
    {
      id: 'agriculturalWatershed', name: 'Agricultural Watershed', icon: '🚜', color: '#a16207',
      defaultState: {quality: 45, connectivity: 55, support: 55}, targets: {quality: 65, connectivity: 60, support: 65},
      // Copy lives in wcWatershedCopy() so the English sits beside its key.
      // Empty object kept so `c.deepDive ?` still offers the deep-dive button.
      deepDive: {}
    },
    {
      id: 'suburbanEdges', name: 'Suburban Edges', icon: '🏘️', color: '#7c3aed',
      defaultState: {quality: 50, connectivity: 60, support: 50}, targets: {quality: 65, connectivity: 65, support: 65},
      // Copy lives in wcWatershedCopy() so the English sits beside its key.
      // Empty object kept so `c.deepDive ?` still offers the deep-dive button.
      deepDive: {}
    }
  ];

// Original stem_lab/stem_tool_watercycle.js:696
function wcWatershedCopy(t) {
    return {
      headwaterStreams: {
        role: t('stem.watercycle.ws_headwaterStreams_role', 'Cold-water indicator'),
        desc: t('stem.watercycle.ws_headwaterStreams_desc', 'High-elevation forested streams. Native brook trout, native eastern brook trout, water temperature below 20°C. The cleanest water in the watershed; everything downstream is shaped by what happens here.'),
        deepDive: {
          knowledge: t('stem.watercycle.ws_headwaterStreams_knowledge', 'Headwater streams are first-order channels: small enough to step across, fed by springs and seeps, almost always shaded by mature forest. They make up roughly 60 to 80 percent of the total stream-mile length in a typical Maine watershed but receive a fraction of the regulatory attention. Native brook trout require water below about 20°C, dissolved oxygen above 7 mg/L, and woody debris for cover. Every degree of warming pushes their range north and uphill.'),
          casework: t('stem.watercycle.ws_headwaterStreams_casework', 'The Eastern Brook Trout Joint Venture maps the status of native populations across the species range. Maine retains an unusually large portion of historic native brook trout habitat compared to the rest of the Northeast. Most successful headwater protection has come from upper-watershed conservation easements and replacement of undersized culverts that act as warm-water bottlenecks.'),
          modernContext: t('stem.watercycle.ws_headwaterStreams_moderncontext', 'Climate change is the central long-term threat to Maine headwater streams. Several Maine Audubon and Wabanaki community projects have led culvert replacement and shade-tree planting campaigns. The 2023 Maine Climate Action Plan named cold-water-fishery protection as a priority but funding has lagged.'),
        },
      },
      riverMainstem: {
        role: t('stem.watercycle.ws_riverMainstem_role', 'Migratory fish corridor'),
        desc: t('stem.watercycle.ws_riverMainstem_desc', 'The big channel through the watershed. Historically the route for Atlantic salmon, alewife, sea-run brook trout, eels, sturgeon. In Maine, dam barriers block most of these runs; recent removals (Edwards Dam 1999, Fort Halifax 2008, Veazie 2012, Great Works 2013) reopened sections.'),
        deepDive: {
          knowledge: t('stem.watercycle.ws_riverMainstem_knowledge', 'Anadromous fish (born in fresh water, mature at sea, return upstream to spawn) include Atlantic salmon, alewife, blueback herring, American shad, sea lamprey, and sea-run brook trout. Each species has different barrier-passage tolerance: alewife can use modest fish ladders; Atlantic salmon need near-full passage; sturgeon need almost-complete connectivity. Dam barriers degrade water quality upstream too: stagnant impoundments warm, accumulate sediment, and lose dissolved oxygen.'),
          casework: t('stem.watercycle.ws_riverMainstem_casework', 'The Penobscot River Restoration Project (Penobscot Nation, NGOs, hydro companies) removed Veazie Dam in 2012 and Great Works Dam in 2013 while preserving most generation through upgrades elsewhere. River herring returns increased over 1000-fold in the first decade post-removal. The Kennebec saw Edwards Dam come down in 1999 and Fort Halifax in 2008. The Sebasticook tributary alone now hosts the largest river-herring run on the East Coast.'),
          modernContext: t('stem.watercycle.ws_riverMainstem_moderncontext', 'The Penobscot Nation has led the legal, political, and ecological work on its ancestral river. Ongoing dam-removal campaigns target the Mattaceunk, Milford, and lower Kennebec dams. NOAA and the Atlantic Salmon Federation track returns annually; numbers are recovering but still well below historic.'),
        },
      },
      floodplainWetlands: {
        role: t('stem.watercycle.ws_floodplainWetlands_role', 'Beaver-built flood storage'),
        desc: t('stem.watercycle.ws_floodplainWetlands_desc', 'Beaver dam complexes and adjacent wet meadows. Slow flood pulses, recharge groundwater, filter nutrients, support amphibians, waterfowl, moose, otter. Beaver Dam Analogs (BDAs) mimic this work where beavers have not returned.'),
        deepDive: {
          knowledge: t('stem.watercycle.ws_floodplainWetlands_knowledge', 'Beaver-built wetlands are the textbook example of ecosystem engineering. A single beaver complex can create up to 10 acres of wet meadow that stores flood water, recharges groundwater, traps sediment, filters nutrients, and supports moose, waterfowl, river otter, brook trout, and amphibians. Wetland complexes also act as firebreaks during dry years. North American beaver populations were estimated at 60 to 400 million pre-contact; the European fur trade crashed them to under 100,000 by 1900.'),
          casework: t('stem.watercycle.ws_floodplainWetlands_casework', 'Beaver populations have recovered to perhaps 10 to 15 million across North America but remain far below historic in most Northeast watersheds. Beaver Dam Analog (BDA) restoration mimics beaver work with imported wood, rock, and posts; it is increasingly used where beavers have not naturally recolonized. The Methow Beaver Project in Washington and similar Maine pilots have shown that BDAs can trigger natural beaver return within 2 to 4 years.'),
          modernContext: t('stem.watercycle.ws_floodplainWetlands_moderncontext', 'Beavers face conflict with road managers and downstream landowners over flooding. Lethal trapping continues in Maine. Beaver Deceiver flow-control devices are the non-lethal alternative; Wabanaki communities have led some of the strongest beaver-protection advocacy in the region. Climate-resilience planners increasingly cite beavers as low-cost natural infrastructure.'),
        },
      },
      forestBuffer: {
        role: t('stem.watercycle.ws_forestBuffer_role', 'Riparian shade and filter'),
        desc: t('stem.watercycle.ws_forestBuffer_desc', 'The strip of mature forest along stream banks. Shade keeps water cold, roots stabilize banks, leaf litter feeds aquatic insects, wood falls in to create habitat. A 50-foot intact buffer is the single most cost-effective stream protection.'),
        deepDive: {
          knowledge: t('stem.watercycle.ws_forestBuffer_knowledge', 'Riparian buffers do five distinct jobs at once: shade keeps water cold for trout and salmon parr, root systems stabilize banks against erosion, leaf litter is the primary food source for stream insects (which feed fish), woody debris falls in to create pools and cover, and the buffer filters runoff from adjacent agricultural and developed land. The pioneering research by Allan and others established that even a 30-foot intact buffer captures most of the runoff-quality benefit, and a 100-foot buffer provides the full hydrological function.'),
          casework: t('stem.watercycle.ws_forestBuffer_casework', 'Maine\'s Shoreland Zoning Act (1971) regulates the first 75 feet around great ponds and 250 feet around rivers, but enforcement is uneven and exemptions for development are routine. Land trust easements have been more effective than regulation in many Maine watersheds. The Maine Coast Heritage Trust and Atlantic Salmon Federation have funded buffer-replanting on hundreds of farm streams; cover-cropping plus tree-row plantings cut runoff measurably within 3 to 5 years.'),
          modernContext: t('stem.watercycle.ws_forestBuffer_moderncontext', 'Buffer policy in Maine remains fragmented across jurisdictions. The strongest buffer protections often come from voluntary landowner agreements rather than zoning. Climate-driven storm events make buffers MORE important (they hold the streambank during high flows), so the federal Infrastructure Investment and Jobs Act has lifted buffer-restoration funding.'),
        },
      },
      agriculturalWatershed: {
        role: t('stem.watercycle.ws_agriculturalWatershed_role', 'Nutrient + sediment source'),
        desc: t('stem.watercycle.ws_agriculturalWatershed_desc', 'Dairy farms, hay fields, row crops, blueberry barrens. The dominant land use in central Maine watersheds. Manure runoff, fertilizer, sediment from tilled land all flow downstream. BMPs (Best Management Practices) can cut runoff by 50-80%.'),
        deepDive: {
          knowledge: t('stem.watercycle.ws_agriculturalWatershed_knowledge', 'Agricultural land delivers three primary watershed insults: sediment from tilled or overgrazed land, nutrients (nitrogen and phosphorus) from manure and fertilizer, and pathogens from livestock waste. Best Management Practices include cover cropping, contour farming, livestock fencing from streams, manure storage upgrades, riparian buffer easements, and reduced-till or no-till cropping. Documented BMP implementations cut watershed nutrient export by 50 to 80 percent on participating farms.'),
          casework: t('stem.watercycle.ws_agriculturalWatershed_casework', 'Maine has roughly 7,500 farms covering about 1.3 million acres. The Maine Soil and Water Conservation Districts operate the state-side BMP outreach; USDA NRCS provides federal cost-share. Dairy farms in the Sebasticook and Kennebec watersheds have implemented manure-handling and buffer projects with measurable downstream quality improvement; comparable work in the St. John watershed has helped Aroostook potato production.'),
          modernContext: t('stem.watercycle.ws_agriculturalWatershed_moderncontext', 'Farm consolidation pressures BMP adoption (the smallest farms have the thinnest margins to invest in capital improvements). PFAS contamination from historic biosolid spreading has surfaced as a major Maine farm-water issue post-2022, with state-led testing and remediation programs. The Maine Farmland Trust links farmland protection to watershed protection.'),
        },
      },
      suburbanEdges: {
        role: t('stem.watercycle.ws_suburbanEdges_role', 'Stormwater + impervious surface'),
        desc: t('stem.watercycle.ws_suburbanEdges_desc', 'Subdivisions, parking lots, lawns. Impervious surfaces deliver pulses of warm polluted water to streams during storms. Lawn fertilizer and pet waste are the modern eutrophication inputs. Green stormwater infrastructure can offset the impact.'),
        deepDive: {
          knowledge: t('stem.watercycle.ws_suburbanEdges_knowledge', 'Impervious surface (roads, roofs, parking lots, driveways) shapes urban and suburban hydrology more than any other variable. Above 10 percent watershed-wide impervious cover, stream biology measurably degrades; above 25 percent, most native fish populations are gone. Stormwater pulses are warm, fast, and pollutant-laden: lawn fertilizer, dog waste, vehicle drip, road salt, sediment from construction. Conventional drainage (curb, gutter, pipe) delivers all of it directly to streams.'),
          casework: t('stem.watercycle.ws_suburbanEdges_casework', 'Portland, ME has documented stream impairment along the Capisic Brook and Stroudwater drainages tied directly to impervious cover. Green Stormwater Infrastructure (rain gardens, swales, permeable pavement, detention basins, green roofs) can offset 50 to 80 percent of the conventional pulse. The Maine Stormwater BMP Manual is the regulatory reference; municipal stormwater (MS4) permits require larger towns to implement.'),
          modernContext: t('stem.watercycle.ws_suburbanEdges_moderncontext', 'Most suburban watershed work in Maine happens at municipal scale through MS4 permits, town stormwater ordinances, and watershed-association advocacy. Climate-resilience funding under the Infrastructure Investment and Jobs Act has dramatically increased available capital for retrofit. The biggest challenge is older developments built before stormwater regulation that have no easy retrofit path.'),
        },
      },
    };
  }

// Original stem_lab/stem_tool_watercycle.js:757
function localizeWatershedComponents(t) {
    var copy = wcWatershedCopy(t);
    return MAINE_WATERSHED_COMPONENTS.map(function (component) {
      var localized = copy[component.id];
      if (!localized) return component;
      var merged = Object.assign({}, component, localized);
      if (component.deepDive || localized.deepDive) {
        merged.deepDive = Object.assign({}, component.deepDive, localized.deepDive);
      }
      return merged;
    });
  }

// Original stem_lab/stem_tool_watercycle.js:770
var STEWARD_TECHNIQUES = [
    { id: 'bufferPlant', name: 'Riparian buffer planting', icon: '🌲', hours: 5, effects: { quality: 8, connectivity: 4 }, appliesTo: ['forestBuffer', 'headwaterStreams'] },
    { id: 'beaverDamAnalog', name: 'Beaver Dam Analog', icon: '🦫', hours: 6, effects: { quality: 11, connectivity: 6 }, appliesTo: ['floodplainWetlands'] },
    { id: 'damRemoval', name: 'Dam removal', icon: '🪨', hours: 15, effects: { connectivity: 28, quality: 8, support: -12 }, appliesTo: ['riverMainstem'] },
    { id: 'fishPassage', name: 'Fish passage installation', icon: '🐟', hours: 10, effects: { connectivity: 14, quality: 2 }, appliesTo: ['riverMainstem'] },
    { id: 'bmpOutreach', name: 'BMP outreach', icon: '🤝', hours: 4, effects: { quality: 7, support: 4 }, appliesTo: ['agriculturalWatershed'] },
    { id: 'easement', name: 'Conservation easement', icon: '📜', hours: 12, effects: { quality: 15, connectivity: 12, support: 3 }, appliesTo: 'any' },
    { id: 'stormwater', name: 'Stormwater retrofit', icon: '🌧️', hours: 8, effects: { quality: 13, connectivity: 3 }, appliesTo: ['suburbanEdges'] },
    { id: 'citizenScience', name: 'Citizen science monitoring', icon: '🔬', hours: 3, effects: { quality: 2, support: 7 }, appliesTo: 'any' },
    { id: 'publicEd', name: 'Public education + River Days', icon: '📣', hours: 3, effects: { support: 9 }, appliesTo: 'any' },
    { id: 'rest', name: 'Hold steady', icon: '🍃', hours: 0, effects: {}, appliesTo: 'any' }
  ];

// Original stem_lab/stem_tool_watercycle.js:783
var STEWARD_EVENTS = [
    { id: 'majorFlood', icon: '🌊', apply: function(comps) { comps.forEach(function(c) { if (c.id === 'forestBuffer' && c.quality < 65) c.quality = Math.max(0, c.quality - 7); if (c.id === 'floodplainWetlands') c.quality = Math.min(100, c.quality + 3); }); } },
    { id: 'drought', icon: '☀️', apply: function(comps) { comps.forEach(function(c) { if (c.id === 'headwaterStreams') c.quality = Math.max(0, c.quality - 8); if (c.id === 'riverMainstem') c.quality = Math.max(0, c.quality - 4); }); } },
    { id: 'sewageRelease', icon: '⚠️', apply: function(comps) { comps.forEach(function(c) { if (c.id === 'riverMainstem' || c.id === 'suburbanEdges') c.quality = Math.max(0, c.quality - 10); }); } },
    { id: 'algalBloom', icon: '🟢', apply: function(comps) { comps.forEach(function(c) { c.support = Math.min(100, c.support + 5); if (c.id === 'agriculturalWatershed') c.quality = Math.max(0, c.quality - 5); }); } },
    { id: 'volunteerSurge', icon: '🙌', apply: function(comps) { comps.forEach(function(c) { c.support = Math.min(100, c.support + 7); c.quality = Math.min(100, c.quality + 2); }); } },
    { id: 'farmSold', icon: '🚜', apply: function(comps) { comps.forEach(function(c) { if (c.id === 'agriculturalWatershed') c.quality = Math.max(0, c.quality - 6); if (c.id === 'suburbanEdges') c.quality = Math.max(0, c.quality - 3); }); } },
    { id: 'salmonReturn', icon: '🐟', apply: function(comps, state) { if (state.connectivityBoosts >= 1) comps.forEach(function(c) { c.support = Math.min(100, c.support + 10); }); else comps.forEach(function(c) { c.support = Math.min(100, c.support + 4); }); } },
    { id: 'beaverExpand', icon: '🦫', apply: function(comps) { comps.forEach(function(c) { if (c.id === 'floodplainWetlands') { c.quality = Math.min(100, c.quality + 9); c.connectivity = Math.min(100, c.connectivity + 5); } }); } },
    { id: 'fundingBump', icon: '💵', apply: function(comps, state) { state.fundingBonusNextYear = (state.fundingBonusNextYear || 0) + 5; } },
    { id: 'erosionEvent', icon: '🏞️', apply: function(comps) { comps.forEach(function(c) { if (c.id === 'forestBuffer') c.support = Math.min(100, c.support + 8); }); } }
  ];

// Original stem_lab/stem_tool_watercycle.js:801
var _wcById = function(arr, id) { return window.StemLab && window.StemLab.findById ? window.StemLab.findById(arr, id) : null; };

// Original stem_lab/stem_tool_watercycle.js:802
var STEWARD_FEEDBACK_RULES = [
    { id: 'bufferFeedsHeadwaters', when: function(s) { var c = _wcById(s, 'forestBuffer'); return !!c && c.quality > 70; }, apply: function(s) { var h = _wcById(s, 'headwaterStreams'); if (h) h.quality = Math.min(100, h.quality + 4); }, },
    { id: 'beaverHelpsFloodplain', when: function(s) { var c = _wcById(s, 'floodplainWetlands'); return !!c && c.quality > 60; }, apply: function(s) { var m = _wcById(s, 'riverMainstem'); if (m) { m.quality = Math.min(100, m.quality + 3); m.connectivity = Math.min(100, m.connectivity + 2); } }, },
    { id: 'agCleansUp', when: function(s) { var c = _wcById(s, 'agriculturalWatershed'); return !!c && c.quality > 60; }, apply: function(s) { var m = _wcById(s, 'riverMainstem'); if (m) m.quality = Math.min(100, m.quality + 4); }, },
    { id: 'runRestoration', when: function(s) { var m = _wcById(s, 'riverMainstem'); var b = _wcById(s, 'forestBuffer'); return !!m && !!b && m.connectivity > 60 && b.quality > 60; }, apply: function(s) { s.forEach(function(c) { c.support = Math.min(100, c.support + 2); }); }, }
  ];

// Original stem_lab/stem_tool_watercycle.js:814
var STEWARD_CASCADE_HINTS = [
    { id: 'bufferFeedsHeadwaters', comp: 'forestBuffer', field: 'quality', threshold: 70,
      
      },
    { id: 'beaverHelpsFloodplain', comp: 'floodplainWetlands', field: 'quality', threshold: 60,
      
      },
    { id: 'agCleansUp', comp: 'agriculturalWatershed', field: 'quality', threshold: 60,
      
      },
    { id: 'runRestoration', comp: 'riverMainstem', field: 'connectivity', threshold: 60,
      
      }
  ];

// Original stem_lab/stem_tool_watercycle.js:829
var STEWARD_DIFFICULTIES = {
    volunteer:   { id: 'volunteer',   hoursPerYear: 24, eventSkip: 0.3, severity: 0.8, },
    coordinator: { id: 'coordinator', hoursPerYear: 18, eventSkip: 0,   severity: 1.0, },
    director:    { id: 'director',    hoursPerYear: 14, eventSkip: 0,   severity: 1.4, }
  };

// Original stem_lab/stem_tool_watercycle.js:838
function wcStewardCopy(t) {
    return {
      ev: {
        majorFlood_name: t('stem.watercycle.sw_ev_majorFlood_name', 'Major flood'),
        majorFlood_desc: t('stem.watercycle.sw_ev_majorFlood_desc', 'A 10-year flood scoured stream banks and washed sediment downstream. Buffers without good root systems lost ground.'),
        drought_name: t('stem.watercycle.sw_ev_drought_name', 'Drought year'),
        drought_desc: t('stem.watercycle.sw_ev_drought_desc', 'Low summer flows raised stream temperatures and concentrated pollutants. Cold-water species took a hit.'),
        sewageRelease_name: t('stem.watercycle.sw_ev_sewageRelease_name', 'Sewage discharge'),
        sewageRelease_desc: t('stem.watercycle.sw_ev_sewageRelease_desc', 'A wastewater treatment plant bypass during a heavy storm released untreated discharge. Mainstem quality drops.'),
        algalBloom_name: t('stem.watercycle.sw_ev_algalBloom_name', 'Cyanobacteria bloom'),
        algalBloom_desc: t('stem.watercycle.sw_ev_algalBloom_desc', 'A cyanobacteria bloom closed swim beaches and prompted advisories. Public support shifts toward stronger watershed protection.'),
        volunteerSurge_name: t('stem.watercycle.sw_ev_volunteerSurge_name', 'Volunteer surge'),
        volunteerSurge_desc: t('stem.watercycle.sw_ev_volunteerSurge_desc', 'A successful River Day brought 200+ volunteers. Citizen monitoring + cleanup boost across the board.'),
        farmSold_name: t('stem.watercycle.sw_ev_farmSold_name', 'Farm sold for development'),
        farmSold_desc: t('stem.watercycle.sw_ev_farmSold_desc', 'A long-running family dairy operation sold to a residential developer. BMP gains on that land reset.'),
        salmonReturn_name: t('stem.watercycle.sw_ev_salmonReturn_name', 'Atlantic salmon detected'),
        salmonReturn_desc: t('stem.watercycle.sw_ev_salmonReturn_desc', 'Returning Atlantic salmon (or alewife runs) detected in the mainstem. Major morale boost and federal attention.'),
        beaverExpand_name: t('stem.watercycle.sw_ev_beaverExpand_name', 'Beaver complex expands'),
        beaverExpand_desc: t('stem.watercycle.sw_ev_beaverExpand_desc', 'Beavers expanded their territory and built three new dam complexes in the floodplain.'),
        fundingBump_name: t('stem.watercycle.sw_ev_fundingBump_name', 'EPA / FEMA grant'),
        fundingBump_desc: t('stem.watercycle.sw_ev_fundingBump_desc', 'A federal grant lands. Stewardship hours next year will be +5.'),
        erosionEvent_name: t('stem.watercycle.sw_ev_erosionEvent_name', 'Major bank erosion'),
        erosionEvent_desc: t('stem.watercycle.sw_ev_erosionEvent_desc', 'A bend in the river undercut a road shoulder. Public attention focuses on streambank stabilization.'),
      },
      tech: {
        bufferPlant_desc: t('stem.watercycle.sw_tech_bufferPlant_desc', 'Plant native trees and shrubs along stream banks. Slow buildup that pays off in shade, bank stability, and nutrient filtering for decades.'),
        beaverDamAnalog_desc: t('stem.watercycle.sw_tech_beaverDamAnalog_desc', 'Build a low-cost wood-and-stone structure that mimics beaver dam function. Encourages real beaver recolonization. Restores wet meadow conditions.'),
        damRemoval_desc: t('stem.watercycle.sw_tech_damRemoval_desc', 'Remove or breach a barrier dam. Huge connectivity gain. Politically expensive: some landowners and recreational users will be upset.'),
        fishPassage_desc: t('stem.watercycle.sw_tech_fishPassage_desc', 'Build a fish ladder or nature-like bypass around a barrier. Cheaper than dam removal and politically easier, but less effective for some species.'),
        bmpOutreach_desc: t('stem.watercycle.sw_tech_bmpOutreach_desc', 'Work with farmers on Best Management Practices: cover crops, livestock fencing, manure storage, buffer easements. Real Maine programs.'),
        easement_desc: t('stem.watercycle.sw_tech_easement_desc', 'Pay a landowner to permanently protect a riparian or upland parcel. The single highest-impact and highest-cost intervention.'),
        stormwater_desc: t('stem.watercycle.sw_tech_stormwater_desc', 'Install rain gardens, swales, permeable pavement, or detention basins in developed areas. Slows and filters stormwater pulses.'),
        citizenScience_desc: t('stem.watercycle.sw_tech_citizenScience_desc', 'Train volunteer water-quality monitors. Slow but builds long-term community support and detects problems early.'),
        publicEd_desc: t('stem.watercycle.sw_tech_publicEd_desc', 'Watershed festivals, school programs, paddle events. Build community ownership of the watershed.'),
        rest_desc: t('stem.watercycle.sw_tech_rest_desc', 'No active intervention this year. Some natural recovery; some drift.'),
      },
      fb: {
        bufferFeedsHeadwaters_msg: t('stem.watercycle.sw_fb_bufferFeedsHeadwaters_msg', 'Healthy forest buffers cooled and cleaned headwater streams.'),
        beaverHelpsFloodplain_msg: t('stem.watercycle.sw_fb_beaverHelpsFloodplain_msg', 'Beaver-built wetlands attenuated flood pulses and improved mainstem water quality.'),
        agCleansUp_msg: t('stem.watercycle.sw_fb_agCleansUp_msg', 'Lower agricultural runoff cleaned up the river mainstem.'),
        runRestoration_msg: t('stem.watercycle.sw_fb_runRestoration_msg', 'Connected, shaded river segments support documented anadromous fish returns.'),
      },
      hint: {
        bufferFeedsHeadwaters_fired: t('stem.watercycle.sw_hint_bufferFeedsHeadwaters_fired', 'Your forest buffers crossed 70% quality — shade cooled the water and roots filtered it, so cleaner cold water flowed downhill into the headwaters (+quality there, for free).'),
        beaverHelpsFloodplain_fired: t('stem.watercycle.sw_hint_beaverHelpsFloodplain_fired', 'Your floodplain wetlands crossed 60% — beaver-built storage slowed the flood pulses and let sediment settle, improving mainstem water quality downstream.'),
        agCleansUp_fired: t('stem.watercycle.sw_hint_agCleansUp_fired', 'Farm runoff dropped enough (agricultural quality over 60) that the mainstem cleaned up on its own — less nitrogen, phosphorus, and sediment reaching the river.'),
        runRestoration_fired: t('stem.watercycle.sw_hint_runRestoration_fired', 'A connected, shaded mainstem (connectivity over 60, with healthy buffers) is now supporting documented anadromous fish returns — morale rose across every component.'),
        bufferFeedsHeadwaters_near: t('stem.watercycle.sw_hint_bufferFeedsHeadwaters_near', 'Forest-buffer quality is at {v}. Get it past 70 (one riparian buffer planting) and it will cool and clean the headwaters automatically every year after.'),
        beaverHelpsFloodplain_near: t('stem.watercycle.sw_hint_beaverHelpsFloodplain_near', 'Floodplain wetlands sit at {v}. A single Beaver Dam Analog would push past 60 and start cleaning the mainstem for you.'),
        agCleansUp_near: t('stem.watercycle.sw_hint_agCleansUp_near', 'Agricultural quality is {v}. BMP outreach is cheap (4h) and would tip it past 60, cleaning the mainstem via the runoff feedback.'),
        runRestoration_near: t('stem.watercycle.sw_hint_runRestoration_near', 'Mainstem connectivity is {v}. Cross 60 with buffers already healthy and you unlock fish returns plus a support boost watershed-wide.'),
      },
      diff: {
        volunteer_label: t('stem.watercycle.sw_diff_volunteer_label', 'New Volunteer'),
        coordinator_label: t('stem.watercycle.sw_diff_coordinator_label', 'Watershed Coordinator'),
        director_label: t('stem.watercycle.sw_diff_director_label', 'Watershed Director'),
        volunteer_desc: t('stem.watercycle.sw_diff_volunteer_desc', '24 hours / year, gentler events. For first runs.'),
        coordinator_desc: t('stem.watercycle.sw_diff_coordinator_desc', '18 hours / year, standard events. Default.'),
        director_desc: t('stem.watercycle.sw_diff_director_desc', '14 hours / year, harsher events. Real constraint.'),
      },
    };
  }

// Original stem_lab/stem_tool_watercycle.js:905
function applyStewardCopy(t) {
    // The load-time seed below runs before `var _wcT` has been assigned (var
    // hoists the declaration, not the value), and callers may reasonably pass
    // nothing. Fall back to the reviewed English rather than throwing.
    if (typeof t !== 'function') t = function (key, fallback) { return fallback == null ? key : fallback; };
    var copy = wcStewardCopy(t);
    STEWARD_EVENTS.forEach(function (item) {
      if (copy.ev[item.id + '_name'] != null) item.name = copy.ev[item.id + '_name'];
      if (copy.ev[item.id + '_desc'] != null) item.desc = copy.ev[item.id + '_desc'];
    });
    STEWARD_TECHNIQUES.forEach(function (item) {
      if (copy.tech[item.id + '_desc'] != null) item.desc = copy.tech[item.id + '_desc'];
    });
    STEWARD_FEEDBACK_RULES.forEach(function (rule) {
      if (copy.fb[rule.id + '_msg'] != null) rule.msg = copy.fb[rule.id + '_msg'];
    });
    STEWARD_CASCADE_HINTS.forEach(function (hint) {
      if (copy.hint[hint.id + '_fired'] != null) hint.fired = copy.hint[hint.id + '_fired'];
      if (copy.hint[hint.id + '_near'] != null) hint.near = copy.hint[hint.id + '_near'];
    });
    Object.keys(STEWARD_DIFFICULTIES).forEach(function (key) {
      var d = STEWARD_DIFFICULTIES[key];
      if (copy.diff[d.id + '_label'] != null) d.label = copy.diff[d.id + '_label'];
      if (copy.diff[d.id + '_desc'] != null) d.desc = copy.diff[d.id + '_desc'];
    });
  }

// Original stem_lab/stem_tool_watercycle.js:936
function defaultStewardState() {
    var diff = STEWARD_DIFFICULTIES.coordinator;
    return {
      phase: 'setup',
      year: 1,
      maxYears: 10,
      difficulty: diff.id,
      hoursPerYear: diff.hoursPerYear,
      hoursLeft: diff.hoursPerYear,
      components: MAINE_WATERSHED_COMPONENTS.map(function(c) { return Object.assign({ id: c.id }, c.defaultState); }),
      yearActions: [],
      yearLog: [],
      lastEvent: null,
      cascadesFiredThisYear: [],
      finalOutcome: null,
      connectivityBoosts: 0,
      fundingBonusNextYear: 0,
      deepDiveComponent: null,
      firstTipDismissed: false,
      seed: 'steward-' + (new Date()).getFullYear() + (new Date()).getMonth() + (new Date()).getDate() + '-' + Math.floor(Math.random() * 9999)
    };
  }

// Original stem_lab/stem_tool_watercycle.js:964
var _wcT = function (key, fallback) { return fallback == null ? key : fallback; };

// Original stem_lab/stem_tool_watercycle.js:965
var _wcLocalizedCache = null;

// Original stem_lab/stem_tool_watercycle.js:966
var _wcLocalizedFor = null;

// Original stem_lab/stem_tool_watercycle.js:968
function watershedComponents() {
    // ctx.t is rebuilt every render, so identity comparison rebuilds the cache
    // exactly once per render rather than once per lookup.
    if (_wcLocalizedCache && _wcLocalizedFor === _wcT) return _wcLocalizedCache;
    _wcLocalizedFor = _wcT;
    _wcLocalizedCache = localizeWatershedComponents(_wcT);
    return _wcLocalizedCache;
  }

// Original stem_lab/stem_tool_watercycle.js:977
function getWatershedComponent(id) {
    var list = watershedComponents();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

// Original stem_lab/stem_tool_watercycle.js:983
function stewardRng(seed, year, purpose) {
    var s = (seed || 'default') + ':' + year + ':' + purpose;
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return function() {
      h |= 0; h = (h + 0x6D2B79F5) | 0;
      var t = Math.imul(h ^ (h >>> 15), 1 | h);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

// Original stem_lab/stem_tool_watercycle.js:1660
function stewardClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Original stem_lab/stem_tool_watercycle.js:4632
function startStewardCampaign(opts) {
            opts = opts || {};
            var fresh = defaultStewardState();
            var diffId = opts.difficulty || steward.difficulty || 'coordinator';
            var diff = STEWARD_DIFFICULTIES[diffId] || STEWARD_DIFFICULTIES.coordinator;
            fresh.phase = 'year';
            fresh.difficulty = diff.id;
            fresh.hoursPerYear = diff.hoursPerYear;
            fresh.hoursLeft = diff.hoursPerYear;
            if (opts.seed) fresh.seed = opts.seed;
            setSteward(fresh);
            if (addToast) addToast('💧 Watershed Steward begins. Year 1 of 10 on ' + diff.label + '.', 'success');
            awardStemXP && awardStemXP('steward_start', 10, 'Watershed campaign begins');
            if (typeof announceToSR === 'function') announceToSR('Watershed Steward started on ' + diff.label + '. Year 1 of 10. ' + diff.hoursPerYear + ' hours.');
          }

// Original stem_lab/stem_tool_watercycle.js:4649
function applyStewardTech(techId, componentId) {
            var tech = STEWARD_TECHNIQUES.find(function(t) { return t.id === techId; });
            if (!tech) return;
            if (steward.hoursLeft < tech.hours) { if (addToast) addToast('Not enough stewardship hours left.', 'warn'); return; }
            if (tech.appliesTo !== 'any' && componentId && tech.appliesTo.indexOf(componentId) < 0) {
              if (addToast) addToast(tech.name + ' does not apply to that component.', 'info'); return;
            }
            var newComps = steward.components.map(function(c) {
              if (componentId && c.id !== componentId && tech.appliesTo !== 'any') return c;
              if (!componentId && tech.appliesTo !== 'any') return c;
              var nc = Object.assign({}, c);
              if (tech.effects.quality) nc.quality = stewardClamp(nc.quality + tech.effects.quality, 0, 100);
              if (tech.effects.connectivity) nc.connectivity = stewardClamp(nc.connectivity + tech.effects.connectivity, 0, 100);
              if (tech.effects.support !== undefined) nc.support = stewardClamp(nc.support + tech.effects.support, 0, 100);
              return nc;
            });
            var actionLog = { tech: tech.name, target: componentId ? (getWatershedComponent(componentId) ? getWatershedComponent(componentId).name : componentId) : 'Watershed-wide', hours: tech.hours };
            var patch = { components: newComps, hoursLeft: steward.hoursLeft - tech.hours, yearActions: steward.yearActions.concat([actionLog]) };
            if (techId === 'damRemoval' || techId === 'fishPassage') patch.connectivityBoosts = (steward.connectivityBoosts || 0) + 1;
            setSteward(patch);
            if (typeof announceToSR === 'function') announceToSR(tech.name + ' applied. ' + (steward.hoursLeft - tech.hours) + ' hours left.');
          }

// Original stem_lab/stem_tool_watercycle.js:4672
function endStewardYear() {
            var pre = steward.components.map(function(c) { return Object.assign({}, c); });

            // Natural drift: components with high quality slowly grow, low quality slowly decay
            var drifted = steward.components.map(function(c) {
              var nc = Object.assign({}, c);
              if (nc.quality > 70) nc.quality = stewardClamp(nc.quality + 1, 0, 100);
              else if (nc.quality < 35) nc.quality = stewardClamp(nc.quality - 2, 0, 100);
              nc.support = stewardClamp(nc.support + (nc.support < 50 ? 1 : -1), 0, 100);
              return nc;
            });

            // Seeded event
            var diff = STEWARD_DIFFICULTIES[steward.difficulty || 'coordinator'];
            var skipRng = stewardRng(steward.seed, steward.year, 'skip');
            var pickRng = stewardRng(steward.seed, steward.year, 'pick');
            var ev;
            if (skipRng() < (diff.eventSkip || 0)) {
              ev = { id: 'quietYear', name: t('stem.watercycle.a_quiet_year', 'A Quiet Year'), icon: '🌤️', desc: t('stem.watercycle.no_major_event_routine_fieldwork_stead', 'No major event. Routine fieldwork, steady progress.'), apply: function() {} };
            } else {
              ev = STEWARD_EVENTS[Math.floor(pickRng() * STEWARD_EVENTS.length)];
            }
            var eventState = { fundingBonusNextYear: steward.fundingBonusNextYear || 0, connectivityBoosts: steward.connectivityBoosts || 0 };
            ev.apply(drifted, eventState);
            // Severity scaling
            var sev = diff.severity || 1;
            if (sev !== 1) {
              for (var di = 0; di < drifted.length; di++) {
                var sp = drifted[di]; var pr = pre[di];
                sp.quality = stewardClamp(pr.quality + (sp.quality - pr.quality) * sev, 0, 100);
                sp.connectivity = stewardClamp(pr.connectivity + (sp.connectivity - pr.connectivity) * sev, 0, 100);
                sp.support = stewardClamp(pr.support + (sp.support - pr.support) * sev, 0, 100);
              }
            }

            // Cascade rules
            var fired = [];
            STEWARD_FEEDBACK_RULES.forEach(function(rule) {
              if (rule.when(drifted)) { rule.apply(drifted); fired.push({ id: rule.id, msg: rule.msg }); }
            });

            var snap = {
              year: steward.year, eventId: ev.id, event: ev.name, eventIcon: ev.icon, eventDesc: ev.desc,
              pre: pre, post: drifted.map(function(c) { return Object.assign({}, c); }),
              actions: steward.yearActions.slice(), cascades: fired
            };

            setSteward({
              phase: 'review',
              components: drifted,
              lastEvent: ev,
              cascadesFiredThisYear: fired,
              yearLog: steward.yearLog.concat([snap]),
              fundingBonusNextYear: eventState.fundingBonusNextYear || 0
            });
            if (typeof announceToSR === 'function') announceToSR('Year ' + steward.year + ' complete. Event: ' + ev.name + '.');
          }

// Original stem_lab/stem_tool_watercycle.js:4730
function advanceFromStewardReview() {
            if (steward.year >= steward.maxYears) {
              // Final outcome
              var avgQ = Math.round(steward.components.reduce(function(a, c) { return a + c.quality; }, 0) / steward.components.length);
              var componentsAt75 = steward.components.filter(function(c) { return c.quality >= 75; }).length;
              var connectivityBoosts = steward.connectivityBoosts || 0;
              var outcome;
              if (componentsAt75 >= 4 && connectivityBoosts >= 1 && avgQ >= 70) outcome = { tier: 'recovery', label: t('stem.watercycle.watershed_recovery', 'Watershed Recovery'), color: '#16a34a', icon: '🏆', desc: t('stem.watercycle.the_watershed_is_healing_across_the_bo', 'The watershed is healing across the board. Headwaters are cold and clean. The mainstem carries fish again. Beaver wetlands are doing the floodplain work. This is what watershed-scale recovery looks like when timing and community come together.') };
              else if (componentsAt75 >= 3 && avgQ >= 62) outcome = { tier: 'recovering', label: t('stem.watercycle.recovering_watershed', 'Recovering Watershed'), color: '#22c55e', icon: '🌊', desc: t('stem.watercycle.most_components_are_improving_a_few_st', 'Most components are improving. A few still need work. The trajectory is good and the community is engaged.') };
              else if (componentsAt75 >= 2 || avgQ >= 55) outcome = { tier: 'mixed', label: t('stem.watercycle.mixed_recovery', 'Mixed Recovery'), color: '#f59e0b', icon: '🍃', desc: t('stem.watercycle.some_wins_some_gaps_real_watershed_wor', 'Some wins, some gaps. Real watershed work is rarely uniform; some pieces improved while others stalled.') };
              else outcome = { tier: 'slipping', label: t('stem.watercycle.slipping_watershed', 'Slipping Watershed'), color: '#ef4444', icon: '⚠️', desc: t('stem.watercycle.average_quality_is_low_and_few_compone', 'Average quality is low and few components reached recovery thresholds. This is how watersheds degrade quietly when stewardship cannot keep up with pressures.') };
              var success = (outcome.tier === 'recovery' || outcome.tier === 'recovering');
              var nextState = Object.assign({}, d, { campaignSuccess: success });
              setSteward({ phase: 'debrief', finalOutcome: outcome, componentsAt75: componentsAt75 });
              upd('campaignSuccess', success);
              if (typeof announceToSR === 'function') announceToSR('Campaign complete. Final outcome: ' + outcome.label + '. ' + outcome.desc);
              awardStemXP && awardStemXP('steward_complete', 50, outcome.label);
              setTimeout(function() { checkWaterCycleChallenges(nextState); }, 50);
            } else {
              setSteward({
                phase: 'year', year: steward.year + 1,
                hoursLeft: steward.hoursPerYear + (steward.fundingBonusNextYear || 0),
                fundingBonusNextYear: 0,
                yearActions: [], lastEvent: null
              });
              if (typeof announceToSR === 'function') announceToSR('Year ' + (steward.year + 1) + ' begins.');
            }
          }
applyStewardCopy(t);
const copy = value => JSON.parse(JSON.stringify(value));
return {
  components: copy(watershedComponents()), techniques: copy(STEWARD_TECHNIQUES), difficulties: copy(STEWARD_DIFFICULTIES),
  start: opts => { steward = defaultStewardState(); startStewardCampaign(opts); return copy(steward); },
  apply: (state, tech, target) => { steward = copy(state); applyStewardTech(tech, target); return copy(steward); },
  endYear: state => { steward = copy(state); endStewardYear(); return copy(steward); },
  continue: state => { steward = copy(state); advanceFromStewardReview(); return copy(steward); }
};
}
