// Generated journey pilot. Run dev-tools/campaign-adventure-pilot/build-in-app.cjs.
(() => {
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
          // Accuracy audit 2026-11-24. Virginia DWR (dwr.virginia.gov/blog/cool-clear-water-is-key-for-the-brook-trouts-future):
          // "Brook trout prefer water temperatures below 65˚F." / "Temperatures of about 70 degrees are going to be stressful or fatal".
          // Old text repeated "native brook trout" and called this "the cleanest water" (unsourced superlative): cut.
          desc: t2("stem.watercycle.ws_headwaterStreams_desc_v2", "Small, shaded forest streams high in the watershed. Native brook trout live here because the water stays cold; water near 21\xB0C (70\xB0F) stresses them. Whatever happens here flows down to every reach below."),
          deepDive: {
            // EPA ORD headwater dataset (catalog.data.gov "Headwater streams and catchments across the conterminous United States"):
            // "approximately 8.4 million kilometers of headwater streams – 77% of the total stream network". Old "60 to 80 percent
            // in a typical Maine watershed", the 7 mg/L trout rule and "every degree pushes their range" had no source: cut.
            knowledge: t2("stem.watercycle.ws_headwaterStreams_knowledge_v2", "Headwater streams are the smallest channels, often fed by springs and shaded by forest. Across the lower 48 states, an EPA study counted about 77 percent of all stream length as headwater streams. Brook trout need this cold, clean, shaded water."),
            // Maine IF&W release (maine.gov/ifw, wild brook trout): "today Maine is home to 97% of the intact wild brook trout lake and pond
            // habitat in the eastern United States." Old "most successful protection came from easements and culverts" unsourced: cut.
            casework: t2("stem.watercycle.ws_headwaterStreams_casework_v2", "Wild brook trout have declined across much of their eastern range. Maine's fish and wildlife agency reports that Maine holds 97 percent of the intact wild brook trout lake and pond habitat in the eastern United States."),
            // Old "2023 Maine Climate Action Plan" (the plan is Maine Won't Wait, 2020, updated 2024) and named-group claims: cut.
            // USGS drought page (usgs.gov/special-topics/drought): drought "raises water temperatures, and stresses fish populations,
            // particularly cold-water species like trout."
            modernContext: t2("stem.watercycle.ws_headwaterStreams_moderncontext_v2", "Warmer, drier summers are a growing threat. The USGS notes that drought raises water temperatures and stresses cold-water fish like trout. Shade trees along the banks help keep the water cool.")
          }
        },
        riverMainstem: {
          role: t2("stem.watercycle.ws_riverMainstem_role", "Migratory fish corridor"),
          // Accuracy audit 2026-11-24: the old text had Veazie 2012 / Great Works 2013; it is the other way round.
          // USFWS 2016-06 release (fws.gov/press-release/2016-06/penobscot-river-restoration-project-celebrates-final-milestone-reconnects):
          // "in June 2012, the Great Works Dam removal began" ... "the removal of the Veazie Dam at the head of tide in 2013."
          // NOAA (fisheries.noaa.gov/feature-story/finding-next-sebasticook): "The restoration began in 1999, with the removal of the
          // Edwards Dam on the Kennebec River in Augusta, Maine." Fort Halifax: NRCM (nrcm.org/waters/fort-halifax-dam-removed-to-open-
          // fish-passage-in-sebasticook): "On July 17, 2008 dam owner FPL Energy Maine Hydro breached the Fort Halifax Dam".
          // NOAA Atlantic salmon spotlight: "More than 90 percent of Maine's rivers and streams are affected by dams".
          // Eels dropped from the list: American eels spawn at sea and swim upriver to grow, so "up rivers to spawn" is wrong for them.
          desc: t2("stem.watercycle.ws_riverMainstem_desc_v2", "The big channel through the watershed. Sea-run fish such as Atlantic salmon, alewife, American shad and sturgeon once swam up rivers like this to spawn. Dams still block many of these runs in Maine. Removing dams reopened some rivers: Edwards Dam (Kennebec, 1999), Fort Halifax Dam (Sebasticook, 2008), Great Works Dam (Penobscot, 2012) and Veazie Dam (Penobscot, 2013)."),
          deepDive: {
            // Old per-species passage claims ("sturgeon need almost-complete connectivity") had no source: cut. Kept the general point.
            knowledge: t2("stem.watercycle.ws_riverMainstem_knowledge_v2", "Anadromous fish are born in fresh water, grow up at sea, and return upriver to spawn. Atlantic salmon, alewife, blueback herring, American shad and sea lamprey are examples. A dam can block them from the cold, clean water upstream where they lay eggs."),
            // USFWS 2016-06 release: "more than 1.7 million river herring have already passed above dams removed by the Penobscot Project";
            // "significantly improving access to nearly 1,000 miles of Maine's largest river". NOAA finding-next-sebasticook: "more than
            // 5 million sea-run fish returned, making this the largest alewife run in the United States." Old "over 1000-fold" and
            // "largest river-herring run on the East Coast": no source found, replaced.
            casework: t2("stem.watercycle.ws_riverMainstem_casework_v2", "The Penobscot River Restoration Project removed Great Works Dam (2012) and Veazie Dam (2013), improving fish access to nearly 1,000 miles of Maine's largest river. By 2016, more than 1.7 million river herring had passed above the removed dams. On the Sebasticook River, NOAA reported a year when more than 5 million sea-run fish returned, the largest alewife run in the United States."),
            // NOAA Atlantic salmon spotlight: the Gulf of Maine DPS "is listed as endangered under the Endangered Species Act" and "was
            // initially listed as an endangered species in 2000"; "the average number of salmon returning to GOM rivers annually is only
            // around 1,200." USFWS 2016 release names the Penobscot Indian Nation among the project partners. Old "campaigns target
            // the Mattaceunk, Milford, and lower Kennebec dams" and "led the legal, political, and ecological work": unsourced, cut.
            modernContext: t2("stem.watercycle.ws_riverMainstem_moderncontext_v2", "Atlantic salmon in Maine (the Gulf of Maine population) have been listed as endangered since 2000. NOAA reports that only about 1,200 adults return to these rivers in an average year. The Penobscot Indian Nation was one of the partners in the Penobscot project.")
          }
        },
        floodplainWetlands: {
          role: t2("stem.watercycle.ws_floodplainWetlands_role", "Beaver-built flood storage"),
          // Accuracy audit 2026-11-24. NPS "Shapers of a Continent" (nps.gov/gaar/learn/nature/shapers-of-a-continent.htm): beavers are
          // "helping to control flooding and erosion" and their wetlands are "homes for a large number of species, including insects,
          // amphibians, fish, birds, and mammals." DOI Nature-Based Solutions Roadmap (nicholasinstitute.duke.edu ... beaver-management-
          // bdas.pdf): BDAs are "human built structures meant to mimic the design and function of beaver dams".
          desc: t2("stem.watercycle.ws_floodplainWetlands_desc_v2", "Beaver ponds and the wet meadows around them. They slow floods and give homes to insects, amphibians, fish, birds and mammals. A Beaver Dam Analog (BDA) is a human-built copy of a beaver dam, used where beavers are missing."),
          deepDive: {
            // Baker & Hill beaver chapter (aphis.usda.gov/sites/default/files/baker-and-hill-beaver-chapter.pdf): "Seton (1929) estimated
            // the beaver population at 60-400 million" before European settlement; "beaver populations in the eastern United States were
            // largely extirpated by fur trappers before 1900." Old "up to 10 acres", firebreak and "under 100,000 by 1900": cut.
            knowledge: t2("stem.watercycle.ws_floodplainWetlands_knowledge_v2", "Beavers are ecosystem engineers: their dams turn a stream into ponds and wet meadows that hold water, slow floods and shelter many other animals. One early estimate (from 1929) put North America's beavers before European settlement at 60 to 400 million. Fur trapping wiped them out across much of the eastern United States before 1900."),
            // Old "10 to 15 million today" and "Methow and Maine pilots ... return within 2 to 4 years": no source found, cut.
            // Baker & Hill: "beaver now occupy much of their former range in North America". Wyoming Game and Fish (wgfd.wyo.gov, Ask
            // Game and Fish, BDAs): "wooden fence posts pounded into the stream bed with a mattress of willow or cottonwood limbs woven
            // through"; "like a real beaver dam, analogs are temporary and can get breached if the water flows high and fast."
            casework: t2("stem.watercycle.ws_floodplainWetlands_casework_v2", "Beavers have come back to much of their old range. Where they are missing, restoration crews sometimes build Beaver Dam Analogs from posts and woven branches. Like real beaver dams, these are temporary and can wash out in high water."),
            // Old "Wabanaki communities have led some of the strongest beaver-protection advocacy" and "planners increasingly cite": cut.
            // Minnesota legislative beaver fence and pipe flow device sheet (lrl.mn.gov ... SF3444-Beaver-Fence-and-Pipe-Flow-Device.pdf):
            // a pond leveler pipe "maintains a steady flow of water" through a beaver dam.
            modernContext: t2("stem.watercycle.ws_floodplainWetlands_moderncontext_v2", "Beaver ponds can flood roads and fields, so people and beavers sometimes clash. Flow devices that keep a pond from rising too high are one non-lethal way to live with beavers.")
          }
        },
        forestBuffer: {
          role: t2("stem.watercycle.ws_forestBuffer_role", "Riparian shade and filter"),
          // Accuracy audit 2026-11-24. Penn State Extension (extension.psu.edu/the-role-of-trees-and-forests-in-healthy-watersheds):
          // "Riparian forest buffers filter sediment from streams during storm events", "provide stability to the bank (wood root systems)",
          // "shade and modify stream temperatures". Penn State (extension.psu.edu/riparian-buffers-pennsylvanias-best-solution-for-protecting-
          // its-waters): "Many of the stream's residents depend on the surrounding trees for their food source." and "Allowing trees and
          // shrubs to create a forest buffer along a stream is the most impactful solution." Old "A 50-foot intact buffer is the single most
          // cost-effective stream protection": no source for the width or the cost ranking, cut.
          desc: t2("stem.watercycle.ws_forestBuffer_desc_v2", "The strip of trees and shrubs along stream banks. Shade keeps the water cool, roots hold the banks in place, many stream animals feed on what falls from the trees, and the plants catch soil washing off the land in storms."),
          deepDive: {
            // Old "pioneering research by Allan ... 30-foot ... 100-foot" had no citation we could find: cut.
            knowledge: t2("stem.watercycle.ws_forestBuffer_knowledge_v2", "A forested buffer does several jobs at once. Shade keeps water cool for trout and young salmon. Roots hold the banks. Leaves and insects that fall in feed the stream. The plants slow runoff and catch soil, nitrogen and phosphorus before they reach the water. Penn State Extension calls a forest buffer along a stream the most effective fix for protecting it."),
            // The old text had the distances reversed ("75 feet around great ponds and 250 feet around rivers"). Maine DEP Shoreland
            // Zoning (maine.gov/dep/land/slz/ip-shore.html, via search excerpt): the zone covers "250 feet, horizontal distance, of the
            // normal high-water line of great ponds, rivers, and tidal waters"; 75 feet applies to streams. DEP's setback and
            // vegetation pages (maine.gov/dep/land/slz/ip-setback.html, ip-szveg.html) cover building setbacks and tree-cutting limits. "Enforcement is uneven",
            // "land trusts more effective" and the MCHT/ASF replanting claims: unsourced, cut.
            casework: t2("stem.watercycle.ws_forestBuffer_casework_v2", "Maine's Mandatory Shoreland Zoning Act makes towns regulate land use within 250 feet of great ponds, rivers and tidal waters, and within 75 feet of many streams. Cutting trees and building close to the water are limited inside that zone."),
            // Old "fragmented", "strongest protections from voluntary agreements" and "IIJA has lifted buffer-restoration funding": cut.
            modernContext: t2("stem.watercycle.ws_forestBuffer_moderncontext_v2", "Tree roots help hold stream banks together during high water, so a buffer protects land and roads beside the stream too.")
          }
        },
        agriculturalWatershed: {
          role: t2("stem.watercycle.ws_agriculturalWatershed_role", "Nutrient + sediment source"),
          // Accuracy audit 2026-11-24. Old "The dominant land use in central Maine watersheds" is wrong for Maine, which is mostly forest:
          // USDA Forest Service FIA (fs.usda.gov/nrs/pubs/ru/ru_fs366.pdf, via search excerpt) gives 89% forest with water removed from the
          // total. Old "BMPs can cut runoff by 50-80%": no source, cut. EPA (epa.gov/nps/nonpoint-source-agriculture): "Runoff, infiltration,
          // and irrigation return flows can move these contaminants into local streams"; farmers can "plant cover crops to uptake residual
          // nutrients"; "A fenced stream crossing restricts livestock access"; "maintain vegetated buffer strips around fields and streams
          // to intercept runoff".
          desc: t2("stem.watercycle.ws_agriculturalWatershed_desc_v2", "Dairy farms, hay fields, row crops and blueberry fields. Rain can wash soil, fertilizer and manure from fields into streams. Best Management Practices (BMPs) such as cover crops, fencing cows away from streams and grassy buffer strips keep more of it on the farm."),
          deepDive: {
            // Old "Documented BMP implementations cut watershed nutrient export by 50 to 80 percent": no source, cut.
            knowledge: t2("stem.watercycle.ws_agriculturalWatershed_knowledge_v2", "Farm runoff can carry three kinds of pollution: soil from bare or tilled ground, nutrients (nitrogen and phosphorus) from manure and fertilizer, and germs from animal waste. Best Management Practices include cover crops, fencing livestock out of streams, covered manure storage and planted buffer strips."),
            // USDA NASS 2022 Census of Agriculture, Maine state profile (nass.usda.gov/Publications/AgCensus/2022/Online_Resources/
            // County_Profiles/Maine/cp99023.pdf): 7,036 farms and 1,225,046 acres of land in farms. Old "roughly 7,500 farms covering about
            // 1.3 million acres" was the 2017 count; the Sebasticook / St. John success claims were unsourced: cut.
            casework: t2("stem.watercycle.ws_agriculturalWatershed_casework_v2", "The 2022 Census of Agriculture counted about 7,000 farms in Maine on about 1.2 million acres. Most of Maine is forest, so farms are one part of a mostly wooded landscape. Local Soil and Water Conservation Districts and the USDA Natural Resources Conservation Service help farmers plan and pay for BMPs."),
            // Maine LD 1911 (2022, Public Law 2021 ch. 641; lldc.mainelegislature.org/Open/LDs/130/130-LD-1911.pdf, via search excerpt): prohibits "the
            // application or spreading on any land in the State of sludge" (biosolids), a response to PFAS found on farms. Old "post-2022"
            // timing and consolidation claim: cut.
            modernContext: t2("stem.watercycle.ws_agriculturalWatershed_moderncontext_v2", "Some Maine farm fields were polluted with PFAS (\"forever chemicals\") from sewage sludge spread as fertilizer years ago. In 2022, Maine passed a law banning the spreading of sludge on land.")
          }
        },
        suburbanEdges: {
          role: t2("stem.watercycle.ws_suburbanEdges_role", "Stormwater + impervious surface"),
          // Accuracy audit 2026-11-24. Maine DEP algal blooms (maine.gov/dep/water/lakes/algalbloom.html): nutrients wash into lakes
          // "where water washes over lawns, farm fields, roads, driveways, and construction sites." EPA (epa.gov/green-infrastructure):
          // runoff "can pick up trash, chemicals, and other pollutants"; green infrastructure helps "to help reduce and treat stormwater
          // where it falls." Old "the modern eutrophication inputs" overstated a single cause: reworded.
          desc: t2("stem.watercycle.ws_suburbanEdges_desc_v2", "Neighborhoods, roads and parking lots. Rain runs off roofs and pavement instead of soaking in, and it carries soil, lawn fertilizer, pet waste and other pollution to streams. Rain gardens and other green stormwater fixes help treat rain where it falls."),
          deepDive: {
            // Center for Watershed Protection, Impacts of Impervious Cover on Aquatic Systems (2003; EPA-hosted copy at www3.epa.gov/
            // region1/npdes/rda/ar/2003-Center-for-watershed-protection-impacts-of-impervious-cover-on-aquatic-systems.pdf), as summarized
            // in a California review: "non-impacted when IC was less than 10%, b) impacted when IC was between 10 and 25%, and c) degraded
            // waterways when IC exceeded 25%". EPA Recovery Potential notes the start point varies by study (4-5% to 10-12%).
            // Old "more than any other variable" and "most native fish populations are gone": overstated, cut.
            knowledge: t2("stem.watercycle.ws_suburbanEdges_knowledge_v2", "Impervious surfaces (roads, roofs, parking lots, driveways) do not let rain soak in. Many studies find streams start to show harm when roughly 10 percent of the land around them is paved or roofed, and are badly degraded above about 25 percent. The exact tipping point differs from place to place."),
            // Maine DEP impervious cover TMDL, Capisic Brook appendix (www1.maine.gov/dep/water/monitoring/tmdl/2012/Appendix_6_Capisic_
            // Brook.pdf, via search excerpt): the 1,418-acre watershed "has an impervious surface area of 31%". Portland Press Herald
            // (pressherald.com/?p=250590): "an urban impaired stream that does not meet minimum standards of the Clean Water Act". "Stroudwater" and
            // "offset 50 to 80 percent": unsourced, cut. Maine DEP publishes the Maine Stormwater Best Management Practices Manual.
            casework: t2("stem.watercycle.ws_suburbanEdges_casework_v2", "Capisic Brook in Portland is an urban stream that does not meet Maine's water quality standards. Maine DEP measured about 31 percent of its watershed as paved or roofed. Rain gardens, swales, porous pavement and detention basins are common fixes listed in Maine's stormwater manual."),
            // Old "IIJA has dramatically increased capital" and "biggest challenge": unsourced, cut. Maine DEP posts each MS4 town's
            // Stormwater Management Plan (e.g. maine.gov/dep/ftp/temp/2022-ms4-noi-swmp/modified-swmp/MER041024 Portland SWMP).
            modernContext: t2("stem.watercycle.ws_suburbanEdges_moderncontext_v2", "Much stormwater work happens town by town. Maine's more urban towns hold a municipal stormwater (MS4) permit and file a stormwater management plan with the state.")
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
          // Accuracy audit 2026-11-24: each event sentence below was checked against the event's apply() (run, not read; see
          // tests/fieldjourneys_accuracy_audit_2026_11_24.test.js). USGS 100-year flood page (usgs.gov/special-topics/water-science-
          // school/science/100-year-flood): "The recurrence interval is based on the probability that the given event will be equaled or
          // exceeded in any given year"; its table pairs a 10-year interval with a 10 percent annual chance. Model: buffers under 65
          // quality lose 7, floodplain wetlands gain 3.
          majorFlood_desc: t2("stem.watercycle.sw_ev_majorFlood_desc_v2", "A 10-year flood (a flood this big has about a 1-in-10 chance each year) scoured stream banks and washed soil downstream. Weak forest buffers (under 65 quality in this game) lost ground, while floodplain wetlands soaked up water."),
          drought_name: t2("stem.watercycle.sw_ev_drought_name", "Drought year"),
          // USGS drought page (usgs.gov/special-topics/drought): drought "reduces streamflows, raises water temperatures, and stresses fish
          // populations, particularly cold-water species like trout." Model: headwaters -8, mainstem -4 quality.
          drought_desc: t2("stem.watercycle.sw_ev_drought_desc_v2", "Low summer flows warmed the streams and left less water to dilute pollution. Cold-water fish like brook trout were stressed, so headwater and mainstem quality dropped."),
          sewageRelease_name: t2("stem.watercycle.sw_ev_sewageRelease_name", "Sewage discharge"),
          // EPA CSO page (epa.gov/npdes/combined-sewer-overflows-csos): "Sometimes the amount of runoff exceeds the capacity of the system.
          // When that happens, untreated stormwater and wastewater flows into nearby waterbodies." Model: mainstem and suburban -10
          // (the old text named only the mainstem).
          sewageRelease_desc: t2("stem.watercycle.sw_ev_sewageRelease_desc_v2", "A heavy storm sent more water into the sewer pipes than they could hold, and untreated wastewater overflowed into the river. Mainstem and town-stream quality drop."),
          algalBloom_name: t2("stem.watercycle.sw_ev_algalBloom_name", "Cyanobacteria bloom"),
          // Maine DEP (maine.gov/dep/water/lakes/algalbloom.html): "High levels of nutrients such as phosphorus and nitrogen are often
          // necessary for HAB formation"; "In Maine most of these nutrients are washed into our lakes during storms and snowmelt events".
          // Model: farm quality -5 and support +5 everywhere; the support rise is a game rule, so it is labelled as one.
          algalBloom_desc: t2("stem.watercycle.sw_ev_algalBloom_desc_v2", "Phosphorus and nitrogen washed off fields, lawns and roads fed a cyanobacteria (blue-green algae) bloom, and swim beaches closed. Farm-area quality drops. In this game, the closures also make people more willing to support watershed work."),
          volunteerSurge_name: t2("stem.watercycle.sw_ev_volunteerSurge_name", "Volunteer surge"),
          volunteerSurge_desc: t2("stem.watercycle.sw_ev_volunteerSurge_desc", "A successful River Day brought 200+ volunteers. Citizen monitoring + cleanup boost across the board."),
          farmSold_name: t2("stem.watercycle.sw_ev_farmSold_name", "Farm sold for development"),
          // Model: farm quality -6 and suburban -3, not a full reset of earlier gains (old "BMP gains on that land reset").
          farmSold_desc: t2("stem.watercycle.sw_ev_farmSold_desc_v2", "A family dairy farm was sold to a housing developer. Some of the farm's runoff protections are lost, and the new roofs and roads add runoff downstream."),
          salmonReturn_name: t2("stem.watercycle.sw_ev_salmonReturn_name_v2", "Sea-run fish return"),
          // NOAA Atlantic salmon spotlight (fisheries.noaa.gov/species/atlantic-salmon-protected/spotlight): the Gulf of Maine DPS "is
          // listed as endangered under the Endangered Species Act"; "the average number of salmon returning to GOM rivers annually is only
          // around 1,200." NOAA finding-next-sebasticook: "more than 5 million sea-run fish returned, making this the largest alewife run in
          // the United States." Model (run): support rises in every reach, about +10 before yearly drift if a dam removal or fish passage
          // was done earlier, otherwise about +4.
          salmonReturn_desc: t2("stem.watercycle.sw_ev_salmonReturn_desc_v2", "Alewives and a few Atlantic salmon were counted coming up the river. Alewives can return by the millions, but Maine's Atlantic salmon are endangered, with only about 1,200 adults returning in an average year, so each one is news. In this game, support rises more if you already opened fish passage."),
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
          // Accuracy audit 2026-11-24: "the single highest-impact" was an unsourced real-world ranking; in the game it is the biggest
          // watershed-wide action (quality +15, connectivity +12, support +3 for 12 hours).
          easement_desc: t2("stem.watercycle.sw_tech_easement_desc_v2", "Pay a landowner to protect a stream-side or upland parcel for good. In this game it is the biggest and most expensive watershed-wide action."),
          stormwater_desc: t2("stem.watercycle.sw_tech_stormwater_desc", "Install rain gardens, swales, permeable pavement, or detention basins in developed areas. Slows and filters stormwater pulses."),
          citizenScience_desc: t2("stem.watercycle.sw_tech_citizenScience_desc", "Train volunteer water-quality monitors. Slow but builds long-term community support and detects problems early."),
          publicEd_desc: t2("stem.watercycle.sw_tech_publicEd_desc", "Watershed festivals, school programs, paddle events. Build community ownership of the watershed."),
          rest_desc: t2("stem.watercycle.sw_tech_rest_desc", "No active intervention this year. Some natural recovery; some drift.")
        },
        fb: {
          bufferFeedsHeadwaters_msg: t2("stem.watercycle.sw_fb_bufferFeedsHeadwaters_msg", "Healthy forest buffers cooled and cleaned headwater streams."),
          // Accuracy audit 2026-11-24: plainer words; "documented" implied real survey data, but this is the game's own rule
          // (mainstem connectivity > 60 and buffer quality > 60 gives +2 support everywhere).
          beaverHelpsFloodplain_msg: t2("stem.watercycle.sw_fb_beaverHelpsFloodplain_msg_v2", "Beaver wetlands slowed flood water and let soil settle out, so the mainstem got cleaner."),
          agCleansUp_msg: t2("stem.watercycle.sw_fb_agCleansUp_msg", "Lower agricultural runoff cleaned up the river mainstem."),
          runRestoration_msg: t2("stem.watercycle.sw_fb_runRestoration_msg_v2", "A connected, shaded mainstem lets sea-run fish (fish that grow up in the ocean and swim upriver to spawn) reach good habitat. In this game, that raises support everywhere.")
        },
        hint: {
          // The old hint said cold water "flowed downhill into the headwaters"; headwaters are the top of the watershed, so the
          // buffers along them shade them directly.
          bufferFeedsHeadwaters_fired: t2("stem.watercycle.sw_hint_bufferFeedsHeadwaters_fired_v2", "Your forest buffers crossed 70 quality. Trees along the headwater streams shade and filter them, so headwater quality rises too."),
          beaverHelpsFloodplain_fired: t2("stem.watercycle.sw_hint_beaverHelpsFloodplain_fired", "Your floodplain wetlands crossed 60% \u2014 beaver-built storage slowed the flood pulses and let sediment settle, improving mainstem water quality downstream."),
          agCleansUp_fired: t2("stem.watercycle.sw_hint_agCleansUp_fired", "Farm runoff dropped enough (agricultural quality over 60) that the mainstem cleaned up on its own \u2014 less nitrogen, phosphorus, and sediment reaching the river."),
          // Accuracy audit 2026-11-24: "one riparian buffer planting" cannot lift the starting 58 past 70 (+8 gives 66), and one BMP
          // outreach cannot lift the starting 45 past 60 (+7 gives 52); the near-hints now state each action's real step size from
          // STEWARD_TECHNIQUES instead of promising one action is enough. "documented" implied real survey data: removed.
          runRestoration_fired: t2("stem.watercycle.sw_hint_runRestoration_fired_v2", "A connected, shaded mainstem (connectivity over 60, with buffers over 60 quality) lets sea-run fish reach good habitat. In this game, support rose in every part of the watershed."),
          bufferFeedsHeadwaters_near: t2("stem.watercycle.sw_hint_bufferFeedsHeadwaters_near_v2", "Forest-buffer quality is at {v}. Each riparian buffer planting adds 8. Get it past 70 and it will cool and clean the headwaters every year after."),
          beaverHelpsFloodplain_near: t2("stem.watercycle.sw_hint_beaverHelpsFloodplain_near_v2", "Floodplain wetlands sit at {v}. Each Beaver Dam Analog adds 11. Get them past 60 and they start cleaning the mainstem for you."),
          agCleansUp_near: t2("stem.watercycle.sw_hint_agCleansUp_near_v2", "Agricultural quality is {v}. BMP outreach is cheap (4 hours) and adds 7 each time. Get it past 60 and the mainstem cleans up through the runoff feedback."),
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
        yearStart: null,
        decisionPreview: null,
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
      fresh.yearStart = fresh.components.map(function(c) {
        return Object.assign({}, c);
      });
      if (opts.seed) fresh.seed = opts.seed;
      setSteward(fresh);
      if (addToast) addToast("\u{1F4A7} Watershed Steward begins. Year 1 of 10 on " + diff.label + ".", "success");
      awardStemXP && awardStemXP("steward_start", 10, "Watershed campaign begins");
      if (typeof announceToSR === "function") announceToSR("Watershed Steward started on " + diff.label + ". Year 1 of 10. " + diff.hoursPerYear + " hours.");
    }
    function applyStewardTech(techId, componentId, previewOnly) {
      var tech = STEWARD_TECHNIQUES.find(function(t2) {
        return t2.id === techId;
      });
      if (!tech) return;
      var reason = steward.phase !== "year" ? t("stem.watercycle.steward_decision_begin_year", "Begin a campaign year to use this action.") : steward.hoursLeft < tech.hours ? t("stem.watercycle.steward_decision_insufficient", "Not enough stewardship hours left.") : "";
      if (tech.appliesTo !== "any" && componentId && tech.appliesTo.indexOf(componentId) < 0) {
        reason = tech.name + " does not apply to that component.";
      }
      if (tech.appliesTo !== "any" && (!componentId || !steward.components.some(function(c) {
        return c.id === componentId;
      }))) reason = t("stem.watercycle.steward_decision_choose_component", "Choose an eligible watershed component.");
      var newComps = steward.components.map(function(c) {
        if (componentId && c.id !== componentId && tech.appliesTo !== "any") return c;
        if (!componentId && tech.appliesTo !== "any") return c;
        var nc = Object.assign({}, c);
        if (tech.effects.quality) nc.quality = stewardClamp(nc.quality + tech.effects.quality, 0, 100);
        if (tech.effects.connectivity) nc.connectivity = stewardClamp(nc.connectivity + tech.effects.connectivity, 0, 100);
        if (tech.effects.support !== void 0) nc.support = stewardClamp(nc.support + tech.effects.support, 0, 100);
        return nc;
      });
      var targetName = componentId ? getWatershedComponent(componentId) ? getWatershedComponent(componentId).name : componentId : "Watershed-wide";
      var before = steward.components.map(function(c) {
        return Object.assign({}, c);
      });
      var decision = { tech, target: targetName, before, after: newComps, hoursAfter: steward.hoursLeft - tech.hours, canApply: !reason, reason };
      if (previewOnly) return decision;
      if (reason) {
        if (addToast) addToast(reason, "warn");
        return;
      }
      var actionLog = { tech: tech.name, techId, target: targetName, targetId: componentId || null, hours: tech.hours, before, after: newComps.map(function(c) {
        return Object.assign({}, c);
      }) };
      var patch = { components: newComps, hoursLeft: decision.hoursAfter, yearActions: steward.yearActions.concat([actionLog]), decisionPreview: null };
      if (!steward.yearStart && !steward.yearActions.length) patch.yearStart = before;
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
      var annualStages = [{ id: "actions", label: t("stem.watercycle.steward_decision_after_actions", "After your actions"), components: pre }, { id: "drift", label: t("stem.watercycle.steward_decision_routine", "Routine yearly change"), components: drifted.map(function(c) {
        return Object.assign({}, c);
      }) }];
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
      annualStages.push({ id: "event", label: ev.name || t("stem.watercycle.steward_decision_event", "Yearly event"), components: drifted.map(function(c) {
        return Object.assign({}, c);
      }) });
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
      annualStages.push({ id: "difficulty", label: t("stem.watercycle.steward_decision_difficulty", "Difficulty adjustment"), components: drifted.map(function(c) {
        return Object.assign({}, c);
      }) });
      var fired = [];
      STEWARD_FEEDBACK_RULES.forEach(function(rule) {
        if (rule.when(drifted)) {
          rule.apply(drifted);
          fired.push({ id: rule.id, msg: rule.msg });
        }
      });
      annualStages.push({ id: "cascade", label: t("stem.watercycle.steward_decision_connected", "Connected watershed effects"), components: drifted.map(function(c) {
        return Object.assign({}, c);
      }) });
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
        yearStart: steward.yearStart ? steward.yearStart.map(function(c) {
          return Object.assign({}, c);
        }) : null,
        stages: annualStages,
        actions: steward.yearActions.slice(),
        cascades: fired
      };
      setSteward({
        phase: "review",
        decisionPreview: null,
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
          lastEvent: null,
          decisionPreview: null,
          yearStart: steward.components.map(function(c) {
            return Object.assign({}, c);
          })
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
          hint: (target ? (water.components.find((c) => c.id === target) || { name: target }).name : "Watershed-wide") + " \xB7 " + tech.hours + " hours",
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
        if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("Unsupported watershed settings.");
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
        const weakName = (water.components.find((c) => c.id === weakest.id) || { name: weakest.id }).name;
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
          locations: water.components.flatMap((c) => {
            const m = model.components.find((x) => x.id === c.id);
            return m ? [{ id: c.id, name: c.name, description: c.desc, value: round(m.quality), unit: "quality index", icon: c.icon }] : [];
          }),
          evidence: review || ended ? model.components.map((c) => {
            const info = water.components.find((x) => x.id === c.id), prev = start.find((x) => x.id === c.id);
            return {
              label: info ? info.name : c.id,
              before: prev ? round(prev.quality) : null,
              after: round(c.quality),
              detail: prev ? "quality; annual change " + delta(c.quality - prev.quality) : "quality"
            };
          }) : [],
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
        if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("Unsupported grove settings.");
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

  // dev-tools/campaign-adventure-pilot/core.mjs
  var PREFIX = "alloflow-campaign-pilot:v1:";
  var MAX_COMMANDS = 500;
  var copy = (x) => JSON.parse(JSON.stringify(x));
  function makeRunId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      bytes[6] = bytes[6] & 15 | 64;
      bytes[8] = bytes[8] & 63 | 128;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    return "run-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }
  function makeRun(adapter, { seed = "FIELD-01", runId, config = {} } = {}) {
    if (typeof seed !== "string" || !seed.trim() || seed.length > 32) throw new Error("Use a world seed of 1 to 32 characters.");
    const id = runId || makeRunId();
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
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || ![1, 2].includes(raw.version) || raw.campaignId !== adapter.id || !/^[a-zA-Z0-9-]{1,64}$/.test(raw.runId || "")) throw new Error("Unrecognized pilot save.");
    if (typeof raw.seed !== "string" || !raw.seed.trim() || raw.seed.length > 32) throw new Error("Invalid saved world seed.");
    if (!raw.config || typeof raw.config !== "object" || Array.isArray(raw.config)) throw new Error("Invalid saved campaign settings.");
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
  function forkRun(run, revision, runId = makeRunId()) {
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
    const waterPositions = { headwaterStreams: [51, 17], forestBuffer: [22, 39], floodplainWetlands: [42, 60], riverMainstem: [44, 85], agriculturalWatershed: [76, 49], suburbanEdges: [76, 82] };
    const shortNames = { headwaterStreams: "Headwaters", forestBuffer: "Buffers", floodplainWetlands: "Wetlands", riverMainstem: "Mainstem", agriculturalWatershed: "Farms", suburbanEdges: "Town" };
    if (view.campaignId === "watershed") {
      drawing.append(svg("path", { d: "M0 0H640V115Q492 50 349 98T0 115Z", fill: "#c2d0b9" }));
      drawing.append(svg("path", { d: "M0 50Q164-13 269 47T640 60", fill: "none", stroke: "#b5c5ae", "stroke-width": 2, class: "fj-contour" }));
      drawing.append(svg("path", { d: "M-30 356Q146 229 275 318T690 351V470H-30Z", fill: "#c5d8b8" }));
      for (let i = 0; i < 7; i++) drawing.append(svg("path", { d: "M-30 " + (130 + i * 38) + "Q100 " + (40 + i * 40) + " 223 " + (100 + i * 37) + "T680 " + (100 + i * 44), fill: "none", stroke: "#c9d5bd", "stroke-width": 1.5, class: i % 2 === 0 ? "fj-contour" : "fj-contour fj-contour-alt" }));
      drawing.append(svg("path", { d: "M354-25C369 75 198 78 243 170S421 195 354 290S204 357 250 475", fill: "none", stroke: "#95beba", "stroke-width": 46 }));
      drawing.append(svg("path", { d: "M354-25C369 75 198 78 243 170S421 195 354 290S204 357 250 475", fill: "none", stroke: "#d5efed", "stroke-width": 28 }));
      drawing.append(svg("path", { d: "M350-25C365 75 194 78 239 170S417 195 350 290S200 357 246 475", fill: "none", stroke: "#7eb4b6", "stroke-width": 2.2, "stroke-dasharray": "20 12", "stroke-linecap": "round", opacity: 0.78, class: "fj-river-flow" }));
      drawing.append(svg("path", { d: "M326 77 C240 116 184 152 141 177 C185 232 232 254 269 273 C325 256 410 242 486 223 C492 285 492 332 486 373 C418 386 340 390 282 387", fill: "none", stroke: "#2d6150", "stroke-width": 2, "stroke-dasharray": "7 5", "stroke-linecap": "round", opacity: 0.52, class: "fj-route-trail" }));
      [[70, 100, 1.1], [122, 158, 0.8], [167, 63, 0.9], [80, 277, 1.1], [126, 340, 0.75], [463, 87, 0.9], [523, 142, 0.8], [573, 71, 1.1], [522, 322, 0.85], [592, 390, 0.9]].forEach((t) => treeSymbol(drawing, ...t));
      for (let i = 0; i < 5; i++) drawing.append(svg("path", { d: "M420 " + (207 + i * 12) + "l118 27", stroke: "#b7bd85", "stroke-width": 7 }));
      [[410, 354], [451, 364], [489, 385]].forEach(([x, y]) => {
        drawing.append(svg("rect", { x, y, width: 24, height: 20, rx: 2, fill: "#ddd3b7" }));
        drawing.append(svg("path", { d: "M" + (x - 4) + " " + y + "l16-12 16 12Z", fill: "#8d8b74" }));
      });
    } else {
      for (let i = 0; i < 4; i++) drawing.append(svg("path", { d: "M-20 " + (88 + i * 98) + "Q190 " + (54 + i * 96) + " 360 " + (108 + i * 94) + "T660 " + (92 + i * 96), fill: "none", stroke: "#d4d8bd", "stroke-width": 1.4, class: i % 2 === 0 ? "fj-contour" : "fj-contour fj-contour-alt" }));
      view.locations.forEach((patch, i) => {
        const x = 42 + i % 3 * 188, y = 29 + Math.floor(i / 3) * 135;
        drawing.append(svg("rect", { x, y, width: 178, height: 125, rx: 20, fill: patch.habitat === "damp" ? "#c3d9c9" : patch.habitat === "sheltered" ? "#cfddbc" : "#e2d9b5", stroke: "#f4f1e4", "stroke-width": 3 }));
        if (patch.gap) drawing.append(svg("ellipse", { cx: x + 87, cy: y + 46, rx: 56, ry: 29, fill: "#f4eec0", opacity: 0.8, class: "fj-canopy-glint" }));
        patch.trees.forEach((t, j) => treeSymbol(drawing, x + 42 + j * 42, y + 53, t.descendant ? 0.55 : 0.9, t.species === "aspen", t.descendant, true));
      });
      drawing.append(svg("path", { d: "M131 118 L319 118 L507 118 C538 164 538 206 507 253 L319 253 L131 253", fill: "none", stroke: "#2d6150", "stroke-width": 1.9, "stroke-dasharray": "7 5", "stroke-linecap": "round", opacity: 0.45, class: "fj-route-trail" }));
      drawing.append(svg("path", { d: "M606 0q-28 93 2 158t-1 153t8 180", fill: "none", stroke: "#94b9b0", "stroke-width": 9 }));
      drawing.append(svg("path", { d: "M606 0q-28 93 2 158t-1 153t8 180", fill: "none", stroke: "#e0f4f1", "stroke-width": 2, "stroke-dasharray": "16 12", "stroke-linecap": "round", opacity: 0.82, class: "fj-river-flow" }));
    }
    const beaconLayer = svg("g", { class: "fj-beacons" });
    for (const [i, loc] of view.locations.entries()) {
      const coords = view.campaignId === "watershed" ? waterPositions[loc.id] : [20.5 + i % 3 * 29.3, 26 + Math.floor(i / 3) * 29.7];
      if (!coords) continue;
      const bx = +(coords[0] * 6.4).toFixed(1), by = +(coords[1] * 4.55).toFixed(1);
      const isSelected = selected === loc.id;
      beaconLayer.append(svg("circle", { cx: bx, cy: by, r: isSelected ? 22 : 16, fill: "none", stroke: isSelected ? "#1d5c47" : "#4b7b67", "stroke-width": isSelected ? 2.2 : 1.5, class: isSelected ? "fj-beacon-ring fj-beacon-active" : "fj-beacon-ring", style: "animation-delay:" + (i * 0.45).toFixed(2) + "s" }));
      beaconLayer.append(svg("circle", { cx: bx, cy: by, r: 4.5, fill: isSelected ? "#1d5c47" : "#6b9078", opacity: 0.55, class: "fj-beacon-core" }));
    }
    drawing.append(beaconLayer);
    const compass = svg("g", { transform: "translate(52 406)", class: "fj-compass" });
    compass.append(svg("circle", { cx: 0, cy: 0, r: 22, fill: "#f6f4eb", "fill-opacity": 0.72, stroke: "#6c8475", "stroke-width": 1.3 }));
    compass.append(svg("circle", { cx: 0, cy: 0, r: 16.5, fill: "none", stroke: "#99ad9f", "stroke-width": 0.9, "stroke-dasharray": "2 3" }));
    compass.append(svg("path", { d: "M0-22V-17M0 17V22M-22 0H-17M17 0H22", stroke: "#486858", "stroke-width": 1.4, "stroke-linecap": "round" }));
    const needle = svg("g", { class: "fj-compass-needle" });
    needle.append(svg("polygon", { points: "0,-15 3.6,0 0,-2.6 -3.6,0", fill: "#a05c2b" }));
    needle.append(svg("polygon", { points: "0,15 3.6,0 0,2.6 -3.6,0", fill: "#2d6150" }));
    needle.append(svg("circle", { cx: 0, cy: 0, r: 2.3, fill: "#f6f4eb", stroke: "#2d6150", "stroke-width": 1.1 }));
    compass.append(needle);
    drawing.append(compass);
    shell.append(drawing);
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
    // Predict-first (2026-11-24): the learner's guess of which reach changes most, keyed by run + year. UI-only, so saved
    // command logs (and their replay) are unchanged.
    const predictions = /* @__PURE__ */ new Map();
    let predictionNote = "";
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
    function syncSoundButton() {
      const btn = $("sound-toggle");
      if (!btn) return;
      btn.textContent = sound ? "Sound on" : "Sound off";
      btn.setAttribute("aria-pressed", String(sound));
    }
    async function playSound() {
      stopSound();
      if (!sound || !view || !view.sound || document.hidden || destroyed || window._alloGlobalMuted || window.__alloAudio && window.__alloAudio.muted) return;
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
          syncSoundButton();
          message("Sound could not start. The journey remains available.", true);
        });
        audioGain = audioContext.createGain();
        audioGain.gain.value = 0.15;
        audioGain.connect(audioContext.destination);
        const nodes = window.AlloModules.playGenerativeSoundscape(audioContext, audioGain, view.sound, { gentle: true, sceneText: view.body, themeSeed: run.seed });
        audioNodes = Array.isArray(nodes) ? nodes : [];
      } catch {
        if (destroyed || serial !== soundSerial) return;
        sound = false;
        stopSound();
        syncSoundButton();
        message("Sound is unavailable. The journey remains available.", true);
      }
    }
    function stopReading() {
      if (reading) {
        reading = null;
        window.speechSynthesis?.cancel();
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
      utterance.onerror = (ev) => {
        const stale = reading !== utterance;
        restore();
        if (stale || ev?.error === "canceled" || ev?.error === "interrupted") return;
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
          const text = await chosen.text();
          if (destroyed) return;
          const raw = JSON.parse(text);
          if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("This is not a recognized pilot journey.");
          const a = adapters.find((a2) => a2.id === raw.campaignId);
          if (!a) throw new Error("This is not a recognized pilot journey.");
          const checked = validateRun(a, raw), next = forkRun(checked, checked.commands.length);
          if (destroyed) return;
          run = next;
          adapter = a;
          persist();
          activate(next);
        } catch (error) {
          if (!destroyed) message(error.message, true);
        } finally {
          file.value = "";
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
        $("response-mode")?.focus();
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
        input.addEventListener("blur", () => {
          options.onFreeText?.(input.value);
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
              announce("Written response recorded. " + view.period + ". " + view.title + (view.review && predictionNote ? ". " + predictionNote : ""));
            } catch (error) {
              message(error.message, true);
            }
          }, "primary"));
        };
        form.append(button("Review my response", () => {
          if (options.onFreeText?.(input.value) === true) {
            message("Practice paused. Support resources are shown above if you want to talk with someone.", true);
            return;
          }
          try {
            proposal = reviewResponse(adapter, run, input.value, { location: adapter.id === "watershed" ? selected : void 0 });
            showReview();
            $("response-action")?.focus();
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
        announce(adapter.label + ". " + view.period + ". " + view.title + ". " + (view.review && predictionNote ? predictionNote + " " : "") + notice);
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
        syncSoundButton();
        playSound();
      });
      soundButton.id = "sound-toggle";
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
        const predictKey = run.runId + ":" + view.period;
        const predictBox = el("div", "fj-prediction");
        const predictLabel = el("label", "", "Predict first: when the year plays out, which reach's quality will change the most (up or down)?");
        predictLabel.htmlFor = "fj-predict";
        const predictSelect = el("select");
        predictSelect.id = "fj-predict";
        const noGuess = el("option", "", "Choose a reach…");
        noGuess.value = "";
        predictSelect.append(noGuess);
        view.locations.forEach((l) => {
          const option = el("option", "", l.name);
          option.value = l.id;
          predictSelect.append(option);
        });
        predictSelect.value = predictions.get(predictKey) || "";
        predictSelect.addEventListener("change", () => {
          if (predictSelect.value) predictions.set(predictKey, predictSelect.value);
          else predictions.delete(predictKey);
        });
        predictBox.append(predictLabel, predictSelect, el("p", "status-line", "You will see how your guess did after you choose Observe the year."));
        decisions.append(predictBox, el("p", "status-line", "The effect numbers on each action are game points on a 0–100 scale, not field measurements."));
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
        predictionNote = "";
        if (adapter.id === "watershed" && view.review) {
          // Compare the guess with the same rounded before/after numbers the table shows.
          const rows = view.evidence.map((e) => ({ name: e.label, before: e.before, after: e.after, change: e.after - e.before }));
          const top = Math.max(...rows.map((r) => Math.abs(r.change)));
          const winners = rows.filter((r) => Math.abs(r.change) === top);
          const fmt = (r) => r.name + " (" + r.before + " → " + r.after + ")";
          const guessId = predictions.get(run.runId + ":" + view.period);
          const guessName = guessId ? (view.locations.find((l) => l.id === guessId) || {}).name : null;
          let text = top === 0 ? "No reach's quality changed when the year played out." : "Biggest change: " + winners.map(fmt).join(", ") + ".";
          if (guessName) {
            const guessRow = rows.find((r) => r.name === guessName);
            const verdict = top === 0 ? "" : winners.some((r) => r.name === guessName) ? " Your prediction matched." : " Your prediction did not match. Read this year's event to see why.";
            text = "You predicted " + (guessRow ? fmt(guessRow) : guessName) + ". " + text + verdict;
          } else text += " Next year, make a prediction before you observe.";
          predictionNote = text;
          const result = el("p", "fj-prediction-result", text);
          result.id = "fj-prediction-result";
          evidence.append(result);
        }
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
      input.addEventListener("blur", () => {
        options.onFreeText?.(input.value);
      });
      notes.append(label, input, button("Save field note", () => {
        if (options.onFreeText?.(input.value) === true) {
          message("Practice paused. Support resources are shown above if you want to talk with someone.", true);
          return;
        }
        try {
          run = addNote(run, input.value);
          noteDrafts.delete(run.runId);
          persist();
          renderJourney();
          $("field-note")?.focus();
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
      predictions.clear();
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
  var styles_default = ':root{color-scheme:light;--ink:#193d32;--muted:#58675d;--paper:#f6f4eb;--line:#d5dacb;--control-line:#7d8d83;--accent:#2d6150;--warm:#a05c2b;font-family:Inter,"Segoe UI",system-ui,sans-serif;font-size:16px;background:var(--paper);color:var(--ink)}\n*{box-sizing:border-box}body{margin:0}button,input,textarea,select{font:inherit}button,a,input,textarea,select{-webkit-tap-highlight-color:transparent}button{cursor:pointer}button:disabled{cursor:not-allowed}a{color:inherit}button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #925221;outline-offset:4px}\nbutton{min-height:44px;border-radius:8px;border:1px solid var(--control-line);background:#fffef8;color:var(--ink);padding:10px 16px}button:hover:not(:disabled){background:#e6eddf}button.primary{background:var(--ink);color:#fffef2;border-color:var(--ink)}button.primary:hover:not(:disabled){background:#2c5948}button:disabled{color:#596057;background:#ecece3;border-style:dashed}button.quiet{border-color:transparent;background:transparent;padding-left:0}.sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.skip{position:absolute;left:20px;top:-100px;z-index:100;padding:14px;background:white}.skip:focus{top:10px}\n.masthead{max-width:1320px;margin:auto;padding:25px 34px;display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line)}.brand{text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.8px;display:flex;align-items:center;gap:14px}.brand>span:first-child{font-size:27px;letter-spacing:0}.brand-light{font-weight:500;color:var(--muted)}.preview{font-size:10px;font-weight:700;letter-spacing:1.6px;border:1px solid #bccbb7;border-radius:30px;padding:7px 12px;white-space:nowrap}\nmain{max-width:1252px;margin:auto;padding:42px 0 20px;min-height:70vh}h1,h2,h3,p{margin-top:0}h1,h2{font-family:Georgia,"Times New Roman",serif;font-weight:400}h1{font-size:clamp(34px,4vw,56px);line-height:1.05;letter-spacing:-1.4px;margin-bottom:17px}h2{font-size:32px;line-height:1.1;letter-spacing:-.5px}h3{font-size:16px}p{line-height:1.65}.eyebrow{font-size:12px;font-weight:750;letter-spacing:2px;margin:0 0 15px;color:var(--muted)}.intro{max-width:670px;margin:15px 0 35px}.intro>p:last-child{font-size:18px;color:var(--muted);max-width:580px}\n.campaign-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px}.campaign-card{border:1px solid var(--line);border-radius:15px;overflow:hidden;background:#fffdf5}.card-art{height:165px;overflow:hidden;position:relative}.card-art .landscape{border:0;border-radius:0;width:100%;height:210px;aspect-ratio:auto;margin-top:-20px}.card-art button{display:none}.card-body{padding:30px}.card-body h2{font-size:33px;max-width:360px;margin-bottom:16px}.card-body>p:not(.eyebrow){color:var(--muted);min-height:77px}.seed-label{font-size:12px;display:flex;align-items:center;gap:12px;margin:15px 0}.seed-label input{min-width:0;width:150px;border:1px solid var(--line);background:#f8f8ef;padding:10px;border-radius:6px;color:var(--ink)}.saved{margin-top:32px;border-top:1px solid var(--line);padding-top:24px}.save-row{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:14px 0;border-bottom:1px solid var(--line)}.save-row p{margin:0;font-size:13px;color:var(--muted)}\n.journey-heading{display:flex;justify-content:space-between;gap:24px;align-items:end;margin:4px 0 30px}.journey-heading h1{font-size:42px;max-width:720px}.journey-heading .eyebrow{margin-bottom:10px}.journey-heading p{margin-bottom:0}.header-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.header-actions button{font-size:12px}.journey{display:grid;grid-template-columns:minmax(0,1.14fr) minmax(0,1fr);gap:36px;align-items:start}.landscape{position:relative;border:1px solid #c6d4bd;border-radius:13px;overflow:hidden;aspect-ratio:640/455;background:#dfe8d3}.landscape svg{width:100%;height:100%;display:block}.map-location{position:absolute;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:7px 9px;background:#fffef0ed;border:1px solid #a6bca4;box-shadow:0 3px 7px #23493412;font-size:12px;white-space:nowrap;border-radius:6px}.map-location strong{font-size:13px;border-left:1px solid #c6ceba;padding-left:7px}.map-location[aria-pressed=true]{border:2px solid #204d3c;background:#214c3e;color:#fffef4;box-shadow:0 0 0 3px #fffce6}.map-location[aria-pressed=true]:hover{background:#2c5948;color:white}.grove .map-location{font-size:12px;padding:6px;min-height:44px}.grove .map-location strong{font-size:12px}.map-caption{margin:10px 0 20px;font-size:12px;color:var(--muted);display:flex;justify-content:space-between;gap:12px}.location-info{padding:17px 19px;border-left:3px solid #90ac78;background:#e9edde;border-radius:0 8px 8px 0;min-height:123px}.location-info h3{margin-bottom:8px}.location-info p{margin:0;font-size:13px;line-height:1.6;color:#425749}\n.metrics{display:grid;grid-template-columns:repeat(4,1fr);margin:24px 0;gap:12px}.metric{padding-right:8px;border-right:1px solid var(--line)}.metric:last-child{border-right:0}.metric-value{font-size:27px;font-family:Georgia,serif;display:block}.metric-value small{font:12px Inter,"Segoe UI",sans-serif;margin-left:4px}.metric-label{font-size:12px;color:var(--muted);display:block;margin-top:6px}\n.scene{background:#fffef7;border:1px solid #dcdfcf;border-radius:12px;padding:27px 29px}.scene-meta{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:18px}.scene-meta .eyebrow{margin:0;color:#6c654f}.scene-meta button{font-size:12px;padding:6px 12px;min-height:44px}.scene h2{font-size:33px;margin-bottom:17px}.scene-body{font-size:15px;color:#405449;line-height:1.8;margin:0}.optional-narration{border-left:2px solid #b8c7a9;padding-left:12px;margin-top:16px;font-size:13px}.optional-narration .eyebrow{margin-bottom:8px}.progress-row{display:flex;justify-content:space-between;gap:10px;font-size:12px;margin:22px 0 8px;color:var(--muted)}progress{width:100%;height:5px;accent-color:var(--accent);display:block;border:0;border-radius:5px;overflow:hidden}progress::-webkit-progress-bar{background:#e0e4d6}progress::-webkit-progress-value{background:var(--accent)}.decisions{margin-top:26px}.decisions h3{font-family:Georgia,serif;font-size:24px;font-weight:400;margin:0 0 16px}.action{display:block;text-align:left;width:100%;padding:14px 16px;margin:0 0 10px;border-radius:9px;background:#fdfdf4}.action-title{display:flex;justify-content:space-between;gap:12px;font-size:14px;font-weight:650}.action-hint{display:block;font-size:12px;line-height:1.5;color:var(--muted);margin-top:5px}.action-cost{font-size:12px;font-weight:500;white-space:nowrap}.action.primary .action-hint{color:#e1ebdb}.action:disabled .action-hint{color:#596057}.action-group{font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted);margin:19px 0 9px}\n.evidence{margin-top:24px}.evidence h3{margin-bottom:12px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{text-align:left;border-bottom:1px solid var(--line);padding:10px 7px;vertical-align:top}th{font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:var(--muted)}td:first-child{padding-left:0}.number{font-variant-numeric:tabular-nums;white-space:nowrap}\ndetails{margin-top:20px;border-top:1px solid var(--line);padding-top:16px}summary{font-size:13px;cursor:pointer;min-height:44px;line-height:1.5;padding:5px 0}details p{font-size:13px;color:var(--muted)}.journal{margin-top:35px;padding-top:28px;border-top:1px solid var(--line);display:grid;grid-template-columns:1fr 1fr;gap:36px}.journal h2{font-size:30px}.receipts{max-height:330px;overflow:auto;padding-right:10px;scrollbar-width:thin}.receipt{padding:0 0 17px 17px;margin:0 0 17px;border-left:2px solid #a8bf91}.receipt h3{font-size:13px;margin-bottom:6px}.receipt p{font-size:12px;margin:0;color:var(--muted)}.notes textarea{display:block;resize:vertical;width:100%;min-height:100px;border:1px solid var(--line);border-radius:8px;background:#fffef8;padding:14px;line-height:1.5;font-size:14px;margin:10px 0}.notes label{font-size:13px;color:var(--muted)}.notes .note{margin:16px 0;border-left:2px solid #b3c7a2;padding-left:12px;font-size:13px;white-space:pre-wrap}.notice{padding:12px 15px;background:#e5edda;border:1px solid #b8cba6;border-radius:7px;font-size:13px;margin:15px 0;line-height:1.5}.notice.warning{background:#fbf0d9;border-color:#d7bd8c;color:#6c4a19}.notice[hidden]{display:none}.pilot-details{margin-top:32px}.pilot-details button{font-size:12px;margin:0 10px 10px 0}.pilot-details p{max-width:800px}.status-line{font-size:12px;color:var(--muted);min-height:17px}.footer-tools{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}footer{max-width:1252px;margin:30px auto;padding:22px 0;border-top:1px solid var(--line);font-size:12px;color:var(--muted);line-height:1.7}footer span{font-size:11px}.boot{padding:50px 0}\n@media(min-width:1400px){main{padding-top:55px}}@media(max-width:1330px){main,footer{margin-left:34px;margin-right:34px}}@media(max-width:900px){.journey{gap:22px;grid-template-columns:1fr 1fr}.scene{padding:22px}.map-location{font-size:12px;padding:5px}.grove .map-location span{max-width:55px;white-space:normal}.metrics{gap:7px}.metric-value{font-size:23px}.journey-heading h1{font-size:35px}}\n@media(max-width:720px){.masthead{padding:17px 20px}.brand{font-size:10px;gap:8px;letter-spacing:1px}.brand-light{display:none}.preview{font-size:9px;padding:6px 9px}main{margin:0 20px;padding-top:30px}.intro{margin:0 0 25px}.intro>p:last-child{font-size:16px}.campaign-grid{grid-template-columns:1fr;gap:22px}.card-body{padding:24px}.card-body>p{min-height:0}.journey-heading{display:block;margin-bottom:23px}.journey-heading h1{font-size:35px}.header-actions{margin-top:13px;gap:13px}.journey{grid-template-columns:1fr;gap:22px}.scene{padding:22px}.scene h2{font-size:29px}.scene-body{font-size:15px}.map-location{font-size:12px}.grove .map-location{font-size:12px;min-height:44px}.grove .map-location span{max-width:69px;white-space:normal}.location-info{min-height:0}.metrics{margin-bottom:0}.journal{grid-template-columns:1fr;gap:24px}.save-row{align-items:start}.save-row button{padding:9px;font-size:12px}footer{margin:25px 20px}.metric-value{font-size:26px}.status-line{line-height:1.6}.map-caption{font-size:12px}.campaign-card h2{font-size:32px}}\n@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation:none!important}}@media(forced-colors:active){button{border:1px solid ButtonText}.map-location[aria-pressed=true]{outline:3px solid Highlight}.landscape{border:1px solid CanvasText}.metric-value{color:CanvasText}}@media print{.masthead,.header-actions,.decisions,.pilot-details,button,textarea,.notes label,footer{display:none!important}main{margin:0}.journey,.journal{display:block}.landscape{max-width:550px}.receipts{max-height:none;overflow:visible}.scene{break-inside:avoid}}\n\n.response-mode{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;margin:0 0 18px}\n.response-mode select,.response-review select{max-width:100%;min-height:44px;border:1px solid var(--line);border-radius:8px;padding:8px;background:#fffef8;color:var(--ink)}\n.written-response{border:1px solid var(--line);border-radius:10px;padding:18px;margin-top:20px;background:#fffef8}\n.written-response>label,.response-review label{display:block;font-size:13px;font-weight:650;line-height:1.5}\n.written-response textarea{display:block;resize:vertical;box-sizing:border-box;width:100%;min-height:115px;padding:12px;margin:10px 0;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);line-height:1.6}\n.response-review:not(:empty){margin-top:18px;border-top:1px solid var(--line);padding-top:16px}\n.response-review select{display:block;width:100%;margin:8px 0}.response-review p{font-size:13px}\n.response-review button{width:100%;white-space:normal}.written-record{margin-top:20px}.written-record h3{font-size:12px;margin-bottom:6px}\n.entry-note{padding:18px;margin-bottom:22px;border:1px solid var(--line);border-radius:10px}.entry-note p{font-size:13px}.entry-note button{margin-right:10px}\n.single-campaign{grid-template-columns:minmax(0,1fr);max-width:760px}\n.encounter-art{min-height:165px;padding:28px;background:linear-gradient(135deg,#dcebe1,#eae3f4);color:#284c40;display:flex;flex-direction:column;justify-content:center}\n.encounter-art p{margin:0;font-size:22px;font-family:Georgia,serif}.encounter-art .eyebrow{font:12px "Segoe UI",sans-serif;margin:10px 0}\n.encounter-symbol{font-size:40px;line-height:1}.encounter-panel{overflow:hidden;border:1px solid var(--line);border-radius:12px;background:#fffef8}\n.encounter-panel h2{font-size:27px;margin:24px 24px 12px}.encounter-panel ul{padding:0 24px 0 44px;font-size:14px;line-height:1.8}.encounter-panel>.status-line{margin:20px 24px}\n.encounter-feedback{border-left:3px solid #90ac78;background:#e9edde;padding:20px;margin-top:24px;border-radius:0 8px 8px 0}.encounter-feedback p{font-size:14px}.encounter-feedback p:last-child{margin:0}\n@media(max-width:720px){.response-mode{align-items:start;flex-direction:column}.response-mode select{width:100%}.written-response{padding:14px}}\n';

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
      if (!config || typeof config !== "object" || Array.isArray(config) || Object.keys(config).length) throw Error("Unsupported practice settings.");
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
  var moduleUrl = typeof document !== "undefined" ? document.currentScript?.src : void 0;
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
    const [crisisTier, setCrisisTier] = React.useState(0);
    const onSafetyFlagRef = React.useRef(ctx.onSafetyFlag || null);
    onSafetyFlagRef.current = ctx.onSafetyFlag || null;
    const updateRef = React.useRef(ctx.update || null);
    updateRef.current = ctx.update || null;
    const setSelToolRef = React.useRef(ctx.setSelHubTool || null);
    setSelToolRef.current = ctx.setSelHubTool || null;
    const setStemToolRef = React.useRef(ctx.setStemLabTool || null);
    setStemToolRef.current = ctx.setStemLabTool || null;
    const lastFlaggedRef = React.useRef({ text: "", at: 0, blocked: false });
    React.useEffect(() => {
      if (!host.current) return;
      const toolId = kind === "sel" ? "practiceJourneys" : "fieldJourneys";
      const toolName = kind === "sel" ? "Practice Journeys" : "Field Journeys";
      const onFreeText = (text) => {
        const trimmed = String(text || "").trim();
        if (!trimmed) return false;
        const now = Date.now();
        if (lastFlaggedRef.current.text === trimmed && now - lastFlaggedRef.current.at < 1500) {
          return lastFlaggedRef.current.blocked;
        }
        const onFlag = typeof onSafetyFlagRef.current === "function" ? onSafetyFlagRef.current : null;
        let blocked = false;
        if (window.SelHub && typeof window.SelHub.safeRehearseCheck === "function") {
          const chk = window.SelHub.safeRehearseCheck(trimmed, { toolId, onSafetyFlag: onFlag });
          if (chk && chk.action === "block") blocked = true;
        } else {
          const checker = window.__alloShared && window.__alloShared.SafetyContentChecker || window.SafetyContentChecker || null;
          let flags = null;
          try {
            flags = checker && checker.check ? checker.check(trimmed) : null;
          } catch (_) {
            flags = null;
          }
          if (Array.isArray(flags) && flags.length) {
            const rank = { low: 1, medium: 2, high: 3, critical: 4 };
            const top = flags.reduce((a, f) => f && (rank[f.severity] || 0) > (rank[a.severity] || 0) ? f : a, flags[0] || {});
            if (onFlag) {
              try {
                onFlag(Object.assign({}, top, { source: (kind === "sel" ? "sel_rehearse_" : "stem_") + toolId, context: trimmed.slice(0, 100), aiGenerated: false }));
              } catch (_) {
              }
            }
            if (top.severity === "critical") blocked = true;
          }
        }
        if (!blocked && window.SelHub && typeof window.SelHub.scanForCrisis === "function") {
          const scan = window.SelHub.scanForCrisis(trimmed);
          if (scan && (scan.triggered || scan.tier >= 3)) {
            blocked = true;
            if (onFlag) {
              try {
                onFlag({ toolId, tier: 3, snippet: trimmed.slice(0, 120) });
              } catch (_) {
              }
            }
          }
        }
        lastFlaggedRef.current = { text: trimmed, at: now, blocked };
        if (blocked) {
          setCrisisTier(3);
          if (window.SelHub && typeof window.SelHub.showCrisisModal === "function") {
            window.SelHub.showCrisisModal({ toolName, contentSnippet: trimmed });
          }
        }
        return blocked;
      };
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
        .map-location{font-size:12px}.grove .map-location{min-height:44px}
        .grove .map-location span{max-width:58px;white-space:normal}
      }
      :host([data-theme="dark"]){--ink:#f1f5f9;--muted:#cbd5e1;--paper:#0f172a;--line:#334155;--control-line:#64748b;--accent:#34d399;color-scheme:dark}
      :host([data-theme="dark"]) :is(.scene,.campaign-card,.action,.written-response,.encounter-panel,input,textarea,select){background:#1e293b;color:#f1f5f9;border-color:#475569}
      :host([data-theme="dark"]) :is(.location-info,.encounter-feedback,.notice){background:#1e293b;color:#e2e8f0;border-color:#475569}
      :host([data-theme="dark"]) :is(.scene-body,.scene-meta .eyebrow,.location-info p){color:#cbd5e1}
      :host([data-theme="dark"]) .encounter-art{background:linear-gradient(135deg,#134e4a,#312e81);color:#f1f5f9}
      :host([data-theme="dark"]) button{background:#1e293b;color:#f1f5f9;border-color:#64748b}
      :host([data-theme="dark"]) button:hover:not(:disabled){background:#334155;color:#ffffff}
      :host([data-theme="dark"]) button.primary{background:#0f766e;color:#ffffff;border-color:#14b8a6}
      :host([data-theme="dark"]) button.primary:hover:not(:disabled){background:#115e59;color:#ffffff}
      :host([data-theme="dark"]) .action.primary .action-hint{color:#ffffff}
      :host([data-theme="dark"]) button:disabled{background:#0f172a;color:#94a3b8;border-style:dashed}
      :host([data-theme="dark"]) .action:disabled .action-hint{color:#94a3b8}
      :host([data-theme="dark"]) .map-location[aria-pressed=true]{background:#0f766e;color:#ffffff;border:2px solid #5eead4}
      :host([data-theme="dark"]) .fj-prediction{background:#1e293b;border-color:#475569}
      :host([data-theme="contrast"]){--ink:#fff;--muted:#eee;--paper:#000;--line:#ff0;--control-line:#ff0;--accent:#ff0;color-scheme:dark}
      :host([data-theme="contrast"]) :is(button,input,textarea,select,.scene,.campaign-card,.action,.location-info,.notice,.written-response,.encounter-panel,.encounter-feedback,.encounter-art){background:#000;color:#fff;border-color:#ff0}
      :host([data-theme="contrast"]) button:hover:not(:disabled),
      :host([data-theme="contrast"]) button.primary,
      :host([data-theme="contrast"]) button.primary:hover:not(:disabled){background:#ff0;color:#000;border-color:#ff0}
      :host([data-theme="contrast"]) button.primary .action-hint{color:#000}
      :host([data-theme="contrast"]) :is(p,.scene-meta .eyebrow,.action-hint,.map-caption,.location-info p){color:#eee}
      :host([data-theme="contrast"]) :is(button,a,input,textarea,select,summary,.receipts):focus-visible{outline:3px solid #ff0;outline-offset:4px}
      :host([data-theme="contrast"]) .map-location{background:#000;color:#fff}
      :host([data-theme="contrast"]) .map-location[aria-pressed=true]{outline:3px solid #ff0}
      @keyframes fjRiverFlow{from{stroke-dashoffset:0}to{stroke-dashoffset:-64}}
      @keyframes fjRouteFlow{from{stroke-dashoffset:0}to{stroke-dashoffset:-36}}
      @keyframes fjBeaconPulse{0%,100%{transform:scale(.84);opacity:.58}50%{transform:scale(1.42);opacity:.12}}
      @keyframes fjBeaconActive{0%,100%{transform:scale(.92);opacity:.84}50%{transform:scale(1.62);opacity:.14}}
      @keyframes fjCompassDrift{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(6deg)}}
      @keyframes fjContourGlint{0%,100%{opacity:.54}50%{opacity:.95}}
      @keyframes fjCanopyBreath{0%,100%{opacity:.64}50%{opacity:.88}}
      @keyframes fjSymbolBreath{0%,100%{opacity:.82;transform:scale(.96)}50%{opacity:1;transform:scale(1.06)}}
      .fj-river-flow{animation:fjRiverFlow 4.2s linear infinite}
      .fj-route-trail{animation:fjRouteFlow 3.6s linear infinite}
      .fj-beacon-ring{transform-box:fill-box;transform-origin:center;animation:fjBeaconPulse 3.4s ease-in-out infinite;pointer-events:none}
      .fj-beacon-ring.fj-beacon-active{animation:fjBeaconActive 2.6s ease-in-out infinite}
      .fj-compass-needle{transform-box:fill-box;transform-origin:center;animation:fjCompassDrift 6.8s ease-in-out infinite}
      .fj-contour{animation:fjContourGlint 5.6s ease-in-out infinite}
      .fj-contour-alt{animation-delay:-2.8s}
      .fj-canopy-glint{animation:fjCanopyBreath 5.2s ease-in-out infinite}
      .encounter-symbol{display:inline-block;transform-origin:center;animation:fjSymbolBreath 4.6s ease-in-out infinite}
      :host([data-theme="dark"]) .landscape{border-color:#334155}
      :host([data-theme="contrast"]) .fj-beacon-ring,:host([data-theme="contrast"]) .fj-canopy-glint{display:none!important}
      :host([data-theme="contrast"]) :is(.fj-river-flow,.fj-route-trail,.fj-compass-needle,.fj-contour,.encounter-symbol){animation:none!important}
      @media(forced-colors:active){.fj-beacon-ring,.fj-canopy-glint{display:none!important}.fj-river-flow,.fj-route-trail,.fj-compass-needle,.fj-contour,.encounter-symbol{animation:none!important}}
      @media(prefers-reduced-motion:reduce){.fj-river-flow,.fj-route-trail,.fj-beacon-ring,.fj-beacon-ring.fj-beacon-active,.fj-compass-needle,.fj-contour,.fj-canopy-glint,.encounter-symbol{animation:none!important}}
      @container(max-width:720px){.response-mode{align-items:start;flex-direction:column}.response-mode select{width:100%}}
      .fj-prediction{border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:0 0 12px;background:#fffef8}
      .fj-prediction label{display:block;font-size:13px;font-weight:650;line-height:1.5}
      .fj-prediction select{display:block;width:100%;max-width:100%;min-height:44px;margin:8px 0 4px;border:1px solid var(--control-line);border-radius:8px;padding:8px;background:#fffef8;color:var(--ink)}
      .fj-prediction-result{margin:14px 0 0;padding:12px 14px;border-left:3px solid var(--accent);font-size:14px;line-height:1.6}
      :host([data-theme="contrast"]) .fj-prediction{background:#000;border-color:#ff0}
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
      const sessionStore = kind === "sel" ? createSessionStore(ctx.toolData?.practiceJourneys?.records, (records) => {
        if (typeof updateRef.current === "function") updateRef.current("practiceJourneys", "records", records);
      }) : void 0;
      const journey = mountFieldJourneys(root, { embedded: true, hub: kind, storage: sessionStore, sessionOnly: kind === "sel", ensureSound, adapters: kind === "sel" ? [selfAdvocacyJourney] : void 0, initialCampaign: kind === "stem" ? ctx.journeyEntry : null, returnToSource: ctx.journeyEntry ? () => {
        if (typeof setStemToolRef.current === "function") setStemToolRef.current("waterCycle");
      } : null, openRelatedTool: kind === "sel" ? ((id) => {
        if (typeof setSelToolRef.current === "function") setSelToolRef.current(id);
      }) : null, onFreeText });
      return () => {
        journey.destroy();
        window.removeEventListener("keydown", protectTyping, true);
        root.replaceChildren();
      };
    }, []);
    const crisisBanner = crisisTier >= 3 && window.SelHub && typeof window.SelHub.renderCrisisResources === "function" ? window.SelHub.renderCrisisResources(React.createElement, ctx.gradeBand || "high") : null;
    const themeObj = ctx && typeof ctx.theme === "object" && ctx.theme !== null ? ctx.theme : null;
    const resolvedTheme = typeof ctx.theme === "string" ? ctx.theme : ctx.isContrast || themeObj?.isContrast ? "contrast" : ctx.isDark || themeObj?.isDark ? "dark" : "light";
    return React.createElement(
      React.Fragment,
      null,
      crisisBanner,
      React.createElement("div", {
        ref: host,
        "data-field-journeys": "true",
        "data-journey-hub": kind,
        "data-theme": resolvedTheme,
        style: { width: "100%", minWidth: 0 }
      })
    );
  }

  // dev-tools/campaign-adventure-pilot/in-app.mjs
  if (typeof window !== "undefined" && window.StemLab && typeof window.StemLab.registerTool === "function") {
    window.StemLab.registerTool("fieldJourneys", {
      icon: "\u{1F33F}",
      label: "Field Journeys (Pilot)",
      category: "Ecology & Environment",
      desc: "Try a story-led Watershed or Grove campaign. Explore the landscape, make decisions, and keep a field journal. Optional pilot with separate saves.",
      lightBackground: true,
      render: (ctx) => ctx.React.createElement(JourneyHost, { ctx, kind: "stem" })
    });
  }
  if (typeof window !== "undefined" && window.__RR_TEST_EXPORTS__) {
    window.__RR_TEST_EXPORTS__.fieldJourneys = {
      makeRun,
      makeRunId,
      dispatch,
      materialize,
      validateRun,
      validateResponses,
      createWatershedRuntime,
      createAdapters,
      mountFieldJourneys,
      saveRun,
      readRun,
      saveKey,
      MAX_COMMANDS
    };
  }
})();
