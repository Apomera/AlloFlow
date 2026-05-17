// ═══════════════════════════════════════════════════════════════
// stem_tool_fisherlab.js — FisherLab: Boating & Fishing Sim
//
// 3D immersive simulator powered by three.js (r128, lazy-loaded
// from cdnjs). Player pilots a Maine skiff from Portland Harbor
// out to the fishing grounds, learning boating navigation
// fundamentals (IALA-B buoyage, COLREGS rules of the road,
// nautical charts, tides, dead reckoning) alongside fishing
// fundamentals (species ID, gear & methods, DMR regs, lobster
// license ladder, sustainable catch).
//
// Maine-default with region toggle (Chesapeake / PNW / Great
// Lakes are v1 placeholders). Built for King Middle School EL
// Education place-based learning expeditions.
//
// Sources cited inline:
//  - Maine Department of Marine Resources (DMR)
//  - NOAA Office of Coast Survey + Fisheries (NEFSC)
//  - USCG COLREGS Rules 1–19
//  - IALA Region B Buoyage System
//  - Maine Lobstermen's Association
//  - Gulf of Maine Research Institute
//
// Registered tool ID: "fisherLab"
// Category: science (marine biology + vocational/place-based)
// ═══════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('fisherLab'))) {

(function() {
  'use strict';

  // ─── Live region (ARIA polite announcements) ───
  (function() {
    if (document.getElementById('allo-live-fl')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-fl';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();
  function flAnnounce(msg) {
    var lr = document.getElementById('allo-live-fl');
    if (lr) { lr.textContent = ''; setTimeout(function() { lr.textContent = msg; }, 30); }
  }

  // ─── Tool-scoped CSS (focus rings, reduced motion overrides) ───
  (function() {
    if (document.getElementById('fisherlab-css')) return;
    var s = document.createElement('style');
    s.id = 'fisherlab-css';
    s.textContent = [
      '.fl-btn:focus-visible { outline: 2px solid #38bdf8; outline-offset: 2px; }',
      '.fl-card { background: linear-gradient(135deg, rgba(14,30,48,0.92), rgba(8,18,32,0.92)); border: 1px solid rgba(56,189,248,0.22); border-radius: 12px; padding: 14px 16px; color: #e2e8f0; }',
      '.fl-pill { display:inline-block; padding: 2px 8px; border-radius: 999px; background: rgba(56,189,248,0.12); color:#bae6fd; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; }',
      '@media (prefers-reduced-motion: reduce) { .fl-bob { animation: none !important; } .fl-pulse { animation: none !important; } }',
      '@keyframes fl-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }',
      '.fl-pulse { animation: fl-pulse 1.6s ease-in-out infinite; }'
    ].join('\n');
    document.head.appendChild(s);
  })();

  // ───────────────────────────────────────────────────────────
  // DATA: REGIONS
  // ───────────────────────────────────────────────────────────
  // Maine ships complete. Chesapeake / PNW / Great Lakes are
  // placeholders so the toggle works without breaking v1.
  var REGIONS = {
    maine: {
      id: 'maine', label: 'Maine (Gulf of Maine)',
      buoyage: 'IALA-B', // red-right-returning
      portName: 'Portland Harbor',
      portCoords: 'Custom House Wharf · 43.6571° N, 70.2476° W',
      landmarks: ['Portland Head Light', 'Ram Island Ledge', 'Halfway Rock', 'Casco Bay'],
      dmrAuthority: 'Maine Department of Marine Resources',
      complete: true
    },
    chesapeake: {
      id: 'chesapeake', label: 'Chesapeake Bay',
      buoyage: 'IALA-B', portName: 'Annapolis', complete: false
    },
    pnw: {
      id: 'pnw', label: 'Pacific Northwest',
      buoyage: 'IALA-B', portName: 'Anacortes', complete: false
    },
    greatlakes: {
      id: 'greatlakes', label: 'Great Lakes',
      buoyage: 'IALA-B', portName: 'Sault Ste. Marie', complete: false
    }
  };
  var DEFAULT_REGION = 'maine';

  // ───────────────────────────────────────────────────────────
  // DATA: MAINE SPECIES (Gulf of Maine focus)
  // Slot limits & seasons reflect DMR rules; cite DMR for live
  // current values — treat in-tool numbers as instructional.
  // ───────────────────────────────────────────────────────────
  var MAINE_SPECIES = [
    { id: 'cod', name: 'Atlantic Cod', sci: 'Gadus morhua', emoji: '🐟', group: 'groundfish',
      minSize: 22, slot: null, dailyBag: 1, season: 'Restricted — check NOAA/DMR groundfish bulletin',
      idMarks: 'Three dorsal fins; barbel on chin; lateral line pale + curved upward over pectoral.',
      gear: ['jigging', 'longline', 'bottom-trolling'], depth: '30-180 m',
      habitat: 'Rocky reefs + ledges, cold water 4-8°C',
      stewardship: 'Severely depleted in Gulf of Maine. Reproductive biomass below 10% of historical. Strict quotas in effect.',
      cite: 'NEFSC stock assessment 2024' },
    { id: 'haddock', name: 'Haddock', sci: 'Melanogrammus aeglefinus', emoji: '🐟', group: 'groundfish',
      minSize: 18, slot: null, dailyBag: 15, season: 'Open year-round (recreational); check DMR',
      idMarks: 'Black "thumbprint" above pectoral; dark lateral line (cod\'s is pale); pointed first dorsal.',
      gear: ['jigging', 'bottom-rig', 'longline'], depth: '40-150 m',
      habitat: 'Smooth bottom, often near ledges',
      stewardship: 'Stock recovered in Gulf of Maine — a fisheries success story.',
      cite: 'NEFSC 2023' },
    { id: 'pollock', name: 'Pollock', sci: 'Pollachius virens', emoji: '🐟', group: 'groundfish',
      minSize: 19, slot: null, dailyBag: null, season: 'Open',
      idMarks: 'Slim body, slightly forked tail, dark olive-green back, pale belly. Active mid-water schooler.',
      gear: ['jigging', 'trolling', 'mid-water rig'], depth: 'surface to 200 m',
      habitat: 'Mid-water schools chasing herring/squid',
      stewardship: 'Healthy stock. Often replaces cod in chowder.', cite: 'NEFSC 2024' },
    { id: 'striper', name: 'Striped Bass', sci: 'Morone saxatilis', emoji: '🐟', group: 'inshore',
      minSize: 28, slot: '28-31 inches (slot)', dailyBag: 1, season: 'May 1 – Oct 31 (typical)',
      idMarks: 'Seven or eight dark horizontal stripes; silvery sides; large mouth.',
      gear: ['rod-and-reel', 'fly', 'topwater'], depth: 'inshore to 30 m',
      habitat: 'Estuaries, rivers, surf; migratory along Atlantic seaboard',
      stewardship: 'Recovered through 1990s moratorium; recent declines triggered new slot limit. Release fish outside slot.',
      cite: 'ASMFC stock assessment 2023' },
    { id: 'mackerel', name: 'Atlantic Mackerel', sci: 'Scomber scombrus', emoji: '🐟', group: 'pelagic',
      minSize: 10, slot: null, dailyBag: null, season: 'Open',
      idMarks: 'Iridescent blue-green back with dark wavy bars; sleek torpedo body; deeply forked tail.',
      gear: ['sabiki rig', 'small jigs', 'cast-and-retrieve'], depth: 'surface to 200 m',
      habitat: 'Open water schools — often visible from shore in June',
      stewardship: 'Stock under rebuilding plan; excellent bait fish + light tackle target.',
      cite: 'NEFSC 2024' },
    { id: 'alewife', name: 'Alewife', sci: 'Alosa pseudoharengus', emoji: '🐟', group: 'anadromous',
      minSize: null, slot: null, dailyBag: 'Permit required; town-managed runs',
      season: 'Mid-April to early June (river runs)',
      idMarks: 'Silver body, single black spot behind gill; large eye; deeply forked tail.',
      gear: ['dip net at fish ladders only — permit required'], depth: 'rivers + shore',
      habitat: 'Saltwater adults, spawn in fresh — alewife runs feed everything from osprey to striper',
      stewardship: 'Keystone forage species. Dam removal + fishways have revived several Maine runs (Damariscotta is famous).',
      cite: 'Maine DMR sea-run fish program' },
    { id: 'lobster', name: 'American Lobster', sci: 'Homarus americanus', emoji: '🦞', group: 'shellfish',
      minSize: '3-1/4" carapace (min) / 5" (max)', slot: '3.25" – 5" carapace', dailyBag: 'License-dependent',
      season: 'Year-round (with conservation closures)',
      idMarks: 'Two unequal claws (crusher + ripper); dark green-brown, occasional blue/red/calico genetic variants.',
      gear: ['traps (parlor + kitchen)', 'commercial only above 5 traps; recreational permit ≤5'],
      depth: '5-200 m',
      habitat: 'Rocky bottom, kelp beds, mud burrows',
      stewardship: 'Conservation pillars: v-notch egg-bearer females (released, notch protects them for life); maximum size cap protects breeders; "double-gauge" measure check at every haul.',
      cite: 'Maine DMR lobster regs 2024' },
    { id: 'bluefin',
      name: 'Bluefin Tuna', sci: 'Thunnus thynnus', emoji: '🐟', group: 'pelagic',
      minSize: '73"', slot: '73-81" (school) / harvest limits', dailyBag: 1, season: 'June–November (varies)',
      idMarks: 'Massive torpedo body, dark blue back, silvery sides; second dorsal + anal yellow; finlets yellow with black edge.',
      gear: ['heavy stand-up rod', 'harpoon (commercial)', 'commercial purse seine — not recreational'],
      depth: 'surface to 1000 m (forages broadly)', habitat: 'Open Gulf of Maine + Stellwagen Bank',
      stewardship: 'Stock rebuilding. Eastern Atlantic + Mediterranean populations under ICCAT quotas. A single 800-lb bluefin can sell for over $100,000.',
      cite: 'ICCAT 2024 + NOAA HMS' },
    { id: 'hake', name: 'White Hake', sci: 'Urophycis tenuis', emoji: '🐟', group: 'groundfish',
      minSize: null, slot: null, dailyBag: null, season: 'Open',
      idMarks: 'Brown back fading to white belly; second dorsal long + low. Single chin barbel. Often confused with red hake (which has chin barbel + cape pelvic ray).',
      gear: ['bottom rig', 'jigging', 'longline (commercial)'], depth: '50-300 m',
      habitat: 'Soft muddy bottoms in basins between ledges',
      stewardship: 'Status: marginal. Often comes up incidentally with cod/haddock fishing. Less premium-priced than cod but excellent baked fish.',
      cite: 'NEFSC 2023' },
    { id: 'monkfish', name: 'Monkfish (Goosefish)', sci: 'Lophius americanus', emoji: '🐟', group: 'groundfish',
      minSize: '17" tail length', slot: null, dailyBag: null, season: 'Commercial quota-managed',
      idMarks: 'Massive flat head, jaw lined with inward-curving fangs, "lure" fishing rod on forehead (illicium with esca bait). Sandy-brown camouflage. Often called "poor man\'s lobster" for the meaty tail.',
      gear: ['gillnet', 'trawl (commercial)', 'rare on rod-and-reel'], depth: '20-700 m',
      habitat: 'Sand + mud bottom; ambush predator from depth',
      stewardship: 'Stock rebuilt since 2000s collapse. Now sustainably managed under NEFMC plan.',
      cite: 'NEFSC + NEFMC monkfish plan' },
    { id: 'flounder-winter', name: 'Winter Flounder', sci: 'Pseudopleuronectes americanus', emoji: '🐟', group: 'groundfish',
      minSize: 12, slot: null, dailyBag: 8, season: 'Year-round (recreational)',
      idMarks: 'Right-eyed flatfish (eyes both on right side when lying flat). Brown mottled top side, white bottom. Small mouth.',
      gear: ['rod-and-reel with sinker rig', 'longline', 'trawl'], depth: '5-90 m',
      habitat: 'Sandy/muddy bottoms in bays + inshore. Spawns Jan-Apr in shallow estuaries.',
      stewardship: 'Inshore Maine populations declined; recovering slowly with size limits + closures.',
      cite: 'Maine DMR 2024' },
    { id: 'flounder-yellowtail', name: 'Yellowtail Flounder', sci: 'Limanda ferruginea', emoji: '🐟', group: 'groundfish',
      minSize: 13, slot: null, dailyBag: null, season: 'Commercial-only typical',
      idMarks: 'Right-eyed flatfish like winter flounder but with bright yellow tail. Reddish-brown back, white belly.',
      gear: ['trawl (commercial)'], depth: '20-90 m',
      habitat: 'Smooth sand near Georges Bank + offshore Maine',
      stewardship: 'Recovering from severe decline. Iconic Georges Bank fish historically.',
      cite: 'NEFSC' },
    { id: 'redfish', name: 'Acadian Redfish (Ocean Perch)', sci: 'Sebastes fasciatus', emoji: '🐟', group: 'groundfish',
      minSize: 9, slot: null, dailyBag: null, season: 'Open',
      idMarks: 'Bright orange-red body, large bulging eyes, spiny dorsal. Lives 50+ years. Slow-growing.',
      gear: ['jigging', 'bottom rig'], depth: '70-400 m',
      habitat: 'Cold deep water along ledges + shelf edge',
      stewardship: 'Sustainability success story. Rebuilt by 2012 after collapse. Long-lived = vulnerable to overfishing — manage carefully.',
      cite: 'NEFSC redfish assessment 2023' },
    { id: 'tautog', name: 'Tautog (Blackfish)', sci: 'Tautoga onitis', emoji: '🐟', group: 'inshore',
      minSize: 16, slot: null, dailyBag: 3, season: 'Open Apr-May + Aug-Oct (varies)',
      idMarks: 'Dark mottled body, blunt head, thick lips, strong crushing teeth. Often confused with cunner (smaller, more colorful).',
      gear: ['rod-and-reel with green crab bait — that\'s the magic'], depth: '5-30 m',
      habitat: 'Rocky structure, wrecks, jetties. Inshore around southern Maine + New England.',
      stewardship: 'Slow-growing; Maine populations are northern edge of range, fragile.',
      cite: 'ASMFC' },
    { id: 'sculpin', name: 'Longhorn Sculpin', sci: 'Myoxocephalus octodecemspinosus', emoji: '🐟', group: 'inshore',
      minSize: null, slot: null, dailyBag: null, season: 'Open',
      idMarks: 'Huge head with prominent dorsal + cheek spines. Mottled brown/red. "Toad" of Maine docks — bycatch when you\'re after cod.',
      gear: ['will hit anything on bottom rig'], depth: '5-100 m',
      habitat: 'Everywhere',
      stewardship: 'Abundant. Educational interest: handle carefully (spines), then release.',
      cite: 'Maine DMR' },
    { id: 'cunner', name: 'Cunner', sci: 'Tautogolabrus adspersus', emoji: '🐟', group: 'inshore',
      minSize: null, slot: null, dailyBag: null, season: 'Open',
      idMarks: 'Small, colorful (brown/green/red mottling). Slow swimming. Often nibbles dock baits — the "bergall" of Maine docks. Bony but edible.',
      gear: ['kid-friendly bottom rig'], depth: '1-30 m',
      habitat: 'Rocky inshore everywhere',
      stewardship: 'Stable. Great gateway fish for new anglers.',
      cite: 'Maine DMR' },
    { id: 'shad', name: 'American Shad', sci: 'Alosa sapidissima', emoji: '🐟', group: 'anadromous',
      minSize: null, slot: null, dailyBag: 'No-kill (Maine)', season: 'May-June river runs (varies)',
      idMarks: 'Silvery body with single dark shoulder spot + small line of spots behind. Large eye. Forked tail.',
      gear: ['fly + small dart jigs in rivers'], depth: 'rivers + estuaries',
      habitat: 'Atlantic ocean adults; spawns in freshwater. Maine populations heavily reduced by dams.',
      stewardship: 'NO-KILL fishery in most Maine waters. Restoration ongoing. Penobscot Project dam removals have helped.',
      cite: 'Maine DMR sea-run + ASMFC' },
    { id: 'bluefish', name: 'Bluefish', sci: 'Pomatomus saltatrix', emoji: '🐟', group: 'pelagic',
      minSize: null, slot: null, dailyBag: 3, season: 'June-Oct',
      idMarks: 'Sleek blue-green back, silver sides, deeply forked tail, MOUTH FULL OF TEETH — wire leader required. Voracious schooling predator.',
      gear: ['topwater plugs', 'wire-leader trolling', 'metal lures'], depth: 'surface to 50 m',
      habitat: 'Inshore estuaries to offshore. Hit hard, fight hard.',
      stewardship: 'Stock down in Maine recently. Slot rules to protect biomass.',
      cite: 'ASMFC bluefish 2024' },
    { id: 'pollock-young', name: 'Pollock (small "harbor pollock")', sci: 'Pollachius virens', emoji: '🐟', group: 'inshore',
      minSize: null, slot: null, dailyBag: null, season: 'Open',
      idMarks: 'Juveniles 8-14" hold tight to harbor structure (docks, lobster cars, breakwaters). Same species as adult pollock listed above.',
      gear: ['Sabiki rig', 'small jigs'], depth: '1-15 m',
      habitat: 'Harbors + bays — great kid fishing.',
      stewardship: 'Stable. Important inshore prey + light tackle target.',
      cite: 'NEFSC' },
    { id: 'cusk', name: 'Cusk', sci: 'Brosme brosme', emoji: '🐟', group: 'groundfish',
      minSize: 21, slot: null, dailyBag: 'Restricted', season: 'Limited recreational',
      idMarks: 'Long brown eel-like body with single chin barbel. Long continuous dorsal fin. Lives in deep cold water.',
      gear: ['jigging', 'longline (commercial)'], depth: '100-500 m',
      habitat: 'Cold rocky deep water along ledges',
      stewardship: 'Depleted; not currently rebuilding. Slow-growing + long-lived. Treat as catch-and-release if unsure.',
      cite: 'NEFSC' },
    { id: 'wolffish', name: 'Atlantic Wolffish', sci: 'Anarhichas lupus', emoji: '🐟', group: 'groundfish',
      minSize: null, slot: null, dailyBag: 'NO TAKE (federal prohibition)', season: 'Closed — release any caught',
      idMarks: 'Eel-like body, blue-grey, BIG canine teeth (crushes shellfish). Solitary.',
      gear: ['bycatch only — must release'], depth: '20-500 m',
      habitat: 'Rocky bottom; lives in same caves for years',
      stewardship: 'NOAA Species of Concern. NEVER keep. Slow growth + cave fidelity = highly vulnerable. Release with care.',
      cite: 'NOAA Species of Concern + ESA petitioning' },
    { id: 'spinydogfish', name: 'Spiny Dogfish', sci: 'Squalus acanthias', emoji: '🦈', group: 'shark',
      minSize: 24, slot: null, dailyBag: null, season: 'Year-round commercial',
      idMarks: 'Small shark with two spines (one before each dorsal fin). Grey above, white below. Schools.',
      gear: ['bottom rig — often a nuisance bycatch', 'commercial longline / gillnet'], depth: '50-400 m',
      habitat: 'Coastal + offshore. Migrates north/south seasonally.',
      stewardship: 'Recovered from collapse. Now sustainably managed. Sold as "rock salmon" in UK fish-and-chips.',
      cite: 'NEFSC' },
    { id: 'eel', name: 'American Eel (Elver)', sci: 'Anguilla rostrata', emoji: '🐍', group: 'anadromous',
      minSize: null, slot: null, dailyBag: 'License-only; ELVER fishery is one of Maine\'s most valuable per-pound fisheries',
      season: 'March-June (elver run)',
      idMarks: 'Snake-like body. Adults yellow/brown; elvers transparent + tiny. Returns to Sargasso Sea to spawn.',
      gear: ['fyke net + dip net for elvers — by license only'], depth: 'rivers + estuaries; deep ocean as adult',
      habitat: 'Catadromous — opposite of salmon. Lives in fresh, spawns in sea.',
      stewardship: 'Maine elver fishery is restricted to ~425 license-holders, individual quotas. $2,000-$3,000/lb elvers in good years (premium goes to Asian eel-farm market). Watch out for poaching prosecutions.',
      cite: 'Maine DMR elver program' },
    { id: 'sturgeon', name: 'Atlantic Sturgeon', sci: 'Acipenser oxyrinchus', emoji: '🐟', group: 'anadromous',
      minSize: null, slot: null, dailyBag: 'PROTECTED — no take', season: 'Closed year-round',
      idMarks: 'Prehistoric appearance: bony plates ("scutes") along sides, sucking mouth on bottom, four barbels under snout. Up to 14 feet.',
      gear: ['NEVER targeted'], depth: 'rivers + bays + offshore',
      habitat: 'Penobscot + Kennebec spawning runs restored after dam removals.',
      stewardship: 'Federally ENDANGERED (Gulf of Maine DPS). Penobscot population recovering through restoration. If caught, release IMMEDIATELY with minimal handling.',
      cite: 'NMFS ESA listing 2012' },
    { id: 'salmon-atlantic', name: 'Atlantic Salmon', sci: 'Salmo salar', emoji: '🐟', group: 'anadromous',
      minSize: null, slot: null, dailyBag: 'NO TAKE in Maine wild streams', season: 'Effectively closed',
      idMarks: 'Silver in sea phase, develops dark bars + spots in freshwater. Distinguish from chinook (no spotted tail) + from brown trout (less spotting).',
      gear: ['heavily restricted'], depth: 'rivers + Atlantic',
      habitat: 'Maine wild populations restricted to Penobscot, Sheepscot, narrowed range.',
      stewardship: 'Federally ENDANGERED (Gulf of Maine DPS). Total restoration program through NOAA + USFWS + tribes. Tag-and-release research only.',
      cite: 'ESA 2009 listing + Penobscot Restoration Project' },
    { id: 'herring-atlantic', name: 'Atlantic Herring', sci: 'Clupea harengus', emoji: '🐟', group: 'forage',
      minSize: null, slot: null, dailyBag: null, season: 'Commercial purse seine + weir',
      idMarks: 'Silver, deeply forked tail, single dorsal mid-back, schooling. Distinguish from alewife by deeper body + no shoulder spot.',
      gear: ['weir', 'purse seine', 'sardine fishery historically'], depth: '5-200 m',
      habitat: 'Open water + nearshore. Maine\'s historical sardine fishery (long collapsed).',
      stewardship: 'Critical forage species — feeds cod, striper, whales, seabirds. Stock under pressure; quotas tightened.',
      cite: 'NEFMC herring plan' },
    { id: 'smelt', name: 'Rainbow Smelt', sci: 'Osmerus mordax', emoji: '🐟', group: 'anadromous',
      minSize: null, slot: null, dailyBag: 'Restricted; ice-fishing tradition', season: 'Winter ice fishing + spring runs',
      idMarks: 'Small (5-10"), silver with pale violet sheen, mouth has visible teeth + tongue ridge. Smells like cucumber when fresh.',
      gear: ['dip net (river runs, restricted)', 'ice fishing tip-ups'], depth: 'rivers in spring; deeper bays in winter',
      habitat: 'Estuarine. Maine smelt runs are iconic + culturally important.',
      stewardship: 'Declining. Climate change + habitat loss. Increasingly restricted recreational rules.',
      cite: 'Maine DMR sea-run fish program' },
    { id: 'wrasse-cunner', // duplicate placeholder removed; see cunner
      name: 'Sea Bass (Black)', sci: 'Centropristis striata', emoji: '🐟', group: 'inshore',
      minSize: 15, slot: null, dailyBag: 5, season: 'May-Dec (varies by year)',
      idMarks: 'Steely blue-black body, white belly, pointed dorsal spines, distinctive forked tail with extension. CLIMATE INDICATOR — range shifting north into Maine waters.',
      gear: ['rod-and-reel bottom rig'], depth: '5-100 m',
      habitat: 'Rocky structure inshore. Historically Chesapeake/NJ; now reliably in Maine — a warming-water marker species.',
      stewardship: 'Range-shifting north as Gulf warms. Maine landings have grown 10×+ in past decade. New regulations being developed.',
      cite: 'ASMFC + climate.gov' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: GEAR & METHODS
  // ───────────────────────────────────────────────────────────
  var GEAR = [
    { id: 'rodReel', name: 'Rod & Reel', emoji: '🎣',
      use: 'General recreational — striper, mackerel, cod, haddock',
      tradeoff: 'Most selective gear: you decide every fish kept or released. Low efficiency vs commercial gear.',
      tips: 'Match line strength to target; circle hooks reduce gut-hooking on catch-and-release.' },
    { id: 'jigging', name: 'Jigging', emoji: '🎯',
      use: 'Vertical fishing for groundfish (cod, haddock, pollock)',
      tradeoff: 'Effective when fish are tight to bottom or holding mid-water on bait. Cardio workout.',
      tips: 'Use a "diamond jig" or "Norwegian jig" 6-20 oz depending on depth + drift.' },
    { id: 'fly', name: 'Fly Tying & Fly Fishing', emoji: '🪶',
      use: 'Striper, bluefish in salt; brook trout in fresh',
      tradeoff: 'Highly selective + low impact. Skill-intensive.',
      tips: 'Clouser minnow + Deceiver are workhorse saltwater patterns.' },
    { id: 'trap', name: 'Lobster Trap', emoji: '🪤',
      use: 'Lobster + crab harvesting',
      tradeoff: 'Highly target-specific bycatch is minimal; requires license (apprentice → student → Class I/II/III).',
      tips: 'Trap has "kitchen" (entry) and "parlor" (holding chamber). Escape vents required for sub-legal lobster.' },
    { id: 'troll', name: 'Trolling', emoji: '⛴️',
      use: 'Striper, mackerel, bluefish, pollock — moving boat with lure behind',
      tradeoff: 'Covers a lot of water. Burns fuel.',
      tips: 'Watch your spread: 3-5 lines at staggered depths/distances.' },
    { id: 'longline', name: 'Longline (commercial only)', emoji: '🪢',
      use: 'Cod, haddock, halibut, swordfish — long horizontal line with baited hooks',
      tradeoff: 'High catch volume; bycatch of seabirds + non-target fish a known issue. Mitigation gear required.',
      tips: 'Recreational alternative is "rod-and-reel mooching" — same idea, one fish at a time.' },
    { id: 'gillnet', name: 'Gillnet (commercial / restricted)', emoji: '🪟',
      use: 'Cod, monkfish, herring — vertical mesh wall',
      tradeoff: 'Efficient but bycatch of seals, porpoises, sea turtles depending on configuration. Heavy regulation + closed-time periods.',
      tips: 'Not playable in this sim — included for awareness.' },
    { id: 'sabiki', name: 'Sabiki Rig', emoji: '✨',
      use: 'Mackerel, herring, smelt — catching bait',
      tradeoff: 'Multi-hook string of tiny shiny flies. Catches many fish per drop.',
      tips: 'Drop to depth, slowly jig. Don\'t let kids handle (multi-hook = tangle risk).' },
    { id: 'chumming', name: 'Chumming', emoji: '🩸',
      use: 'Striper, bluefish, mackerel, tuna — create scent trail to draw fish',
      tradeoff: 'Effective when fish are scattered. Wasteful of bait + creates nontarget attraction.',
      tips: 'Frozen menhaden ground in a mesh bag at the stern. Maine regs vary by species — some prohibit chumming for stripers in certain zones.' },
    { id: 'fly-tying', name: 'Fly Tying', emoji: '🪡',
      use: 'Custom flies for striped bass, brook trout, salmon, bluefish.',
      tradeoff: 'Skill + time investment. Custom matches local forage.',
      tips: 'Workhorse Maine saltwater patterns: Clouser Minnow (sand-eel imitation), Lefty\'s Deceiver (general baitfish), surf candy, Glog bug. Materials: bucktail, flash, dumbbell eyes.' },
    { id: 'spear', name: 'Spear / Hand Harvest (regulated)', emoji: '🔱',
      use: 'Pole-spear and Hawaiian sling for free-divers; surf-clam digging by hand.',
      tradeoff: 'Highly selective by definition. Requires DMR endorsement for some species.',
      tips: 'Maine permits spear for some species but check rules — many fish species are prohibited from spear take.' },
    { id: 'icefishing', name: 'Ice Fishing (winter)', emoji: '❄️',
      use: 'Smelt, perch, pickerel, brook trout — Maine\'s winter pastime.',
      tradeoff: 'Cold + risk (ice safety). Cultural foundation in rural Maine.',
      tips: 'Minimum 4" of clear blue ice for foot travel; 6"+ for snowmobile; 8"+ for trucks. Test ice depth EVERY trip. Carry ice picks + flotation.' },
    { id: 'wading-flats', name: 'Wading the Flats', emoji: '👢',
      use: 'Striper, flatfish in shallow estuary flats. Cast from foot.',
      tradeoff: 'No boat = no fuel cost + no boat capital. Limited range.',
      tips: 'Best on incoming tide. Watch your retreat — tides come faster than people expect on flat estuaries.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MAINE PORTS + HARBORS
  // ───────────────────────────────────────────────────────────
  // Major working ports on the Maine coast. Each entry documents
  // the working-waterfront character, primary fisheries, and
  // navigation notes. This is curriculum content — students
  // identify the port that matches a scenario.
  var MAINE_PORTS = [
    { id: 'portland', name: 'Portland', emoji: '⚓', coords: '43°39′N 70°15′W',
      population: '~68,000',
      primary: 'Lobster, groundfish (cod/haddock/pollock), striper sport',
      character: 'Maine\'s largest working waterfront. Custom House Wharf, Maine Wharf, Portland Fish Pier. Mix of commercial + tourism + ferry.',
      notable: ['Custom House Wharf (oldest working pier)', 'Portland Head Light (1791, oldest US lighthouse)', 'Portland Fish Exchange (groundfish auction)'],
      navigation: 'Casco Bay approach via The Hussey Sound or East Approach. Heavy ferry traffic from Casco Bay Lines — always give way to commercial vessels.',
      culture: 'Year-round working waterfront. "The Working Waterfront Coalition" — Portland is the symbol of Maine fishing\'s economic + cultural survival.',
      cite: 'Maine Working Waterfront Coalition' },
    { id: 'stonington', name: 'Stonington', emoji: '🦞', coords: '44°09′N 68°40′W',
      population: '~1,000', primary: 'LOBSTER — Maine\'s #1 lobster port by landings',
      character: 'Granite quarry heritage; now the lobster capital of Maine.',
      notable: ['Stonington Lobster Co-op', 'Deer Isle Granite Museum', 'Annual Lobster Boat Races'],
      navigation: 'East Penobscot Bay; ledges everywhere; chart 13305 essential. Local knowledge required for non-channel passage.',
      culture: 'Heritage lobstering town. Multi-generation family operations dominate. Limited-entry zone with deep tradition.',
      cite: 'NOAA + Maine DMR landings 2023' },
    { id: 'boothbay', name: 'Boothbay Harbor', emoji: '⚓', coords: '43°51′N 69°37′W',
      population: '~2,200', primary: 'Lobster + groundfish + charter sport + boatbuilding',
      character: 'Mixed working + tourism. Active boatyards (Hodgdon Yachts, Washburn & Doughty). Aquaculture growing on outer Sheepscot.',
      notable: ['Maine State Aquarium', 'McMahan Island', 'Coastal Maine Botanical Gardens', 'Bigelow Laboratory for Ocean Sciences (nearby East Boothbay)'],
      navigation: 'Sheepscot River approach. Tide rips at the southern entrance.',
      culture: 'Big tourism overlay over working roots. Bigelow Lab makes this a marine-science hub.',
      cite: 'DMR + Bigelow Lab' },
    { id: 'camden', name: 'Camden / Rockport / Rockland', emoji: '⛵', coords: '44°06′N 69°06′W',
      population: 'Combined ~12,000', primary: 'Lobster + windjammer charter + boatbuilding',
      character: 'Camden = postcard tourist harbor; Rockland = working port (Maine\'s 2nd biggest fishing port); Rockport = quieter, schooner roots.',
      notable: ['Windjammer fleet (historic schooner charters)', 'Penobscot Bay approach', 'Maine Maritime Heritage Trail'],
      navigation: 'Penobscot Bay is HUGE — outer islands (Vinalhaven, North Haven, Matinicus) all need offshore-grade prep.',
      culture: 'Tourism + commercial mixed economy. Windjammer captains still hand-bomb sails out of Camden harbor.',
      cite: 'Maine Windjammer Association' },
    { id: 'eastport', name: 'Eastport / Lubec', emoji: '🗺️', coords: '44°54′N 66°59′W',
      population: '~1,300', primary: 'Aquaculture (salmon — declining), lobster, sardine canning heritage',
      character: 'Easternmost US city. Reversing Falls. Saltwater changes 18-25 ft tide-to-tide.',
      notable: ['Old Sow whirlpool (largest in N hemisphere)', 'West Quoddy Head Light (easternmost US)', 'Cobscook Bay Sardine Cannery Museum'],
      navigation: 'INSANE tides + currents. Reversing Falls run 8+ knots on the change. NOT for novices. Local guide recommended.',
      culture: 'Cross-cultural — Passamaquoddy + Pleasant Point Reservation are the cultural anchors. Bay-of-Fundy economic ties to Canada.',
      cite: 'Passamaquoddy Tribe + Maine Department of Marine Resources' },
    { id: 'bar-harbor', name: 'Bar Harbor / Northeast Harbor', emoji: '🏔️', coords: '44°23′N 68°12′W',
      population: '~5,500', primary: 'Lobster, charter sport, tourism, Acadia tie-ins',
      character: 'Tourism-dominated; commercial fishing co-exists. Lobster + scallop landings still significant.',
      notable: ['Acadia National Park', 'Frenchman Bay', 'College of the Atlantic (marine + environmental science)'],
      navigation: 'Frenchman Bay + Eastern Way. Watch for cruise ship traffic in season.',
      culture: 'Frenchman Bay still has independent lobstermen alongside the tourism overlay.',
      cite: 'Acadia NP + COA' },
    { id: 'jonesport', name: 'Jonesport / Beals Island', emoji: '🦞', coords: '44°31′N 67°35′W',
      population: '~1,500', primary: 'Heritage lobstering town; boatbuilding',
      character: 'Birthplace of the Maine lobster-boat racing tradition. World-renowned wooden boatbuilders.',
      notable: ['Jonesport Lobster Boat Races (4th of July)', 'Beals Island Heritage Center'],
      navigation: 'Open Atlantic exposure. Eastern Bay. Chart 13326.',
      culture: 'Boat designers Jonesport-built lobster boats are legendary — "Holland 32" hull design originated here.',
      cite: 'Maine Boats Homes & Harbors' },
    { id: 'searsport', name: 'Searsport / Belfast', emoji: '⛴️', coords: '44°27′N 68°55′W',
      population: 'Combined ~9,000', primary: 'Mixed; deep-water cargo (Mack Point), historic Penobscot fishing',
      character: 'Penobscot River mouth. Mack Point is one of two deep-draft cargo terminals in Maine.',
      notable: ['Penobscot Marine Museum', 'Mack Point deep-water terminal', 'Belfast waterfront revival'],
      navigation: 'Penobscot River channel — well-marked but commercial-priority. Wind funnels here.',
      culture: 'Belfast renaissance — combo of old shoe-mill town + new arts + agriculture.',
      cite: 'Penobscot Marine Museum' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MAINE LOBSTER ZONES (DMR-managed)
  // ───────────────────────────────────────────────────────────
  // Maine is divided into 7 lobster management zones. Each has
  // a Zone Council that sets entry/exit, trap-limits, and
  // local rules. Limited-entry; some zones have multi-year
  // waitlists.
  var LOBSTER_ZONES = [
    { id: 'A', name: 'Zone A — Far North/East',
      area: 'Cobscook Bay through Cutler. Eastern Washington County.',
      traps: '800',
      character: 'Cold-water lobstering. Tides + currents brutal. Multi-generation family operations.',
      entry: 'Limited-entry. 5:1 exit:entry ratio (5 retiring license-holders before 1 new license issued).',
      towns: ['Eastport', 'Lubec', 'Cutler', 'Machias'] },
    { id: 'B', name: 'Zone B — Eastern Penobscot Bay',
      area: 'Eastern Penobscot Bay through Stonington & Deer Isle.',
      traps: '800',
      character: 'Maine\'s most-iconic lobster region. Stonington leads landings.',
      entry: 'Limited-entry. 5:1 ratio. Multi-year waitlists.',
      towns: ['Stonington', 'Deer Isle', 'Castine', 'Brooksville'] },
    { id: 'C', name: 'Zone C — Western Penobscot/Mid-Coast',
      area: 'Camden/Rockland through Penobscot Bay west.',
      traps: '800',
      character: 'Mixed bag — heavy tourism alongside commercial.',
      entry: 'Limited-entry. 5:1 ratio.',
      towns: ['Rockland', 'Camden', 'Vinalhaven', 'Owls Head'] },
    { id: 'D', name: 'Zone D — Midcoast',
      area: 'Pemaquid Point to Damariscotta.',
      traps: '800',
      character: 'Some of the densest lobster grounds.',
      entry: 'Limited-entry. 3:1 ratio (slightly easier than A-C).',
      towns: ['New Harbor', 'Boothbay', 'Pemaquid', 'Damariscotta'] },
    { id: 'E', name: 'Zone E — Casco Bay',
      area: 'Casco Bay including Portland, Cape Elizabeth, Harpswell.',
      traps: '800',
      character: 'Heavy boat traffic near Portland; mixed commercial + sport overlap.',
      entry: 'Limited-entry.',
      towns: ['Portland', 'South Portland', 'Cape Elizabeth', 'Harpswell', 'Chebeague Island'] },
    { id: 'F', name: 'Zone F — Southern',
      area: 'Cape Elizabeth to Kittery (southern Maine coast).',
      traps: '800',
      character: 'Warmer waters; range-shift concerns. Heavy tourism overlay.',
      entry: 'Limited-entry.',
      towns: ['York', 'Kennebunkport', 'Wells', 'Old Orchard Beach', 'Saco'] },
    { id: 'G', name: 'Zone G — Far South',
      area: 'Kittery + offshore overlap.',
      traps: '800',
      character: 'Crosses NH border interest. Climate-shift edge zone.',
      entry: 'Limited-entry.',
      towns: ['Kittery'] }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: WEATHER SCENARIOS
  // ───────────────────────────────────────────────────────────
  // Common Maine marine weather patterns + decision frameworks.
  // Used in sim weather state machine and in tutorial content.
  var WEATHER_SCENARIOS = [
    { id: 'small-craft-advisory', name: 'Small Craft Advisory',
      trigger: 'Sustained winds 21-33 kt OR seas 4+ ft hazardous to small craft',
      visibility: 'Generally clear', risk: 'High',
      action: 'EXPERIENCED captains only. New boaters should stay in protected water. Wear PFDs.',
      duration: 'Often issued midday for afternoon onset.' },
    { id: 'gale-warning', name: 'Gale Warning',
      trigger: 'Sustained winds 34-47 kt',
      visibility: 'May have rain/squalls', risk: 'Very High',
      action: 'STAY IN PORT. Even commercial boats avoid gale conditions unless necessary.',
      duration: 'Often 24-48 hr events.' },
    { id: 'storm-warning', name: 'Storm Warning',
      trigger: 'Sustained winds 48-63 kt',
      visibility: 'Squalls, rain', risk: 'Extreme',
      action: 'PORT closed for non-essential traffic. Even Coast Guard limits ops.',
      duration: 'Major storms.' },
    { id: 'dense-fog', name: 'Dense Fog Advisory',
      trigger: 'Visibility < 1 nm',
      visibility: '0-1 nm', risk: 'High (collision)',
      action: 'Reduce speed (COLREGS Rule 6 — safe speed). Sound fog signal (long blast every 2 min for power vessel underway). Monitor radar + VHF Ch 16.',
      duration: 'Often morning fog burns off by 10am in summer. Coastal radiation fog vs advection fog have different prognoses.' },
    { id: 'thunderstorms', name: 'Thunderstorm Watch / Warning',
      trigger: 'Cumulonimbus + lightning',
      visibility: 'Variable', risk: 'Extreme (lightning + downbursts)',
      action: 'GET TO SHORE BEFORE STORM. If caught: lower antenna, stay low, avoid metal contact, head for safer water (not under high topography).',
      duration: 'Localized; passes in 30-60 min typically.' },
    { id: 'nor-easter', name: 'Nor\'easter',
      trigger: 'Low pressure system with NE winds; classic Maine winter pattern',
      visibility: 'Snow/rain heavy',
      risk: 'Extreme',
      action: 'NO BOATING. Lobster traps + gear should be secured ahead of season.',
      duration: '24-72 hr events. Multiple per Maine winter.' },
    { id: 'hurricane', name: 'Tropical Storm / Hurricane',
      trigger: 'Tropical or post-tropical system',
      visibility: 'Variable',
      risk: 'Extreme',
      action: 'Pull all gear AHEAD of storm. Haul boats from moorings. Storm surge biggest risk.',
      duration: 'Days. Maine gets ~1-2 significant systems most years.' },
    { id: 'clear-light-winds', name: 'Clear, Light & Variable Winds',
      trigger: 'High pressure dome', visibility: 'Excellent',
      risk: 'Low',
      action: 'PRIME WORKING CONDITIONS. Most days you\'re grateful for.',
      duration: 'Often 24-48 hrs between weather systems.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: VHF RADIO SCRIPTS
  // ───────────────────────────────────────────────────────────
  // Marine VHF Ch 16 is the international hailing + distress
  // channel — required monitoring when underway. Below are the
  // common call types every boater should know.
  var VHF_SCRIPTS = [
    { id: 'mayday', type: 'MAYDAY (distress — life-threatening)', channel: '16',
      when: 'Imminent threat to life: fire, sinking, person overboard, severe medical, abandon ship.',
      script: [
        '"MAYDAY MAYDAY MAYDAY — this is [vessel name] [vessel name] [vessel name]"',
        '"Position: [lat/lon OR bearing + distance from known point]"',
        '"Nature of emergency: [taking on water / fire / medical / etc.]"',
        '"Number of persons on board: [N]"',
        '"Description of vessel: [length, color, type]"',
        '"Standing by on Channel 16."'
      ],
      followUp: 'Wait for Coast Guard response. Repeat call every minute if no response. Activate EPIRB if equipped.',
      legal: 'False MAYDAY is a federal felony (up to 6 years + $250K fine). Never use as a joke.' },
    { id: 'panpan', type: 'PAN-PAN (urgency — situation requires assistance)', channel: '16',
      when: 'Urgent but not immediately life-threatening: disabled but stable, lost, medical that\'s not immediate.',
      script: [
        '"PAN-PAN PAN-PAN PAN-PAN — all stations all stations all stations — this is [vessel name] [vessel name] [vessel name]"',
        '"Position: [...]"',
        '"Nature of urgency: [...]"',
        '"Assistance needed: [...]"',
        '"Standing by on Channel 16."'
      ],
      followUp: 'Coast Guard answers; will coordinate response or refer to TowBoatUS/Sea Tow.' },
    { id: 'securite', type: 'SÉCURITÉ (sécurité — safety message)', channel: '16',
      when: 'Important safety information to broadcast — debris in channel, navigation aid out, etc.',
      script: [
        '"SÉCURITÉ SÉCURITÉ SÉCURITÉ — all stations all stations all stations — this is [vessel name]"',
        '"Safety message follows on Channel [22A or 9 — alternate channel]: shift to [channel]."'
      ],
      followUp: 'Switch to alternate channel before transmitting message body. Keep 16 clear.' },
    { id: 'general-hail', type: 'General hail (calling another vessel)', channel: '16 → switch to working channel',
      when: 'Calling someone for non-emergency contact.',
      script: [
        '"[Other vessel name] [Other vessel name] — this is [your vessel name], over."',
        '(After response): "Switch to Channel [9, 68, 69, 71, 72, 78] — over."',
        '(Move to working channel; do business there; return to 16 for monitoring.)'
      ],
      followUp: 'Keep working-channel chatter brief. 16 stays clear.' },
    { id: 'radio-check', type: 'Radio Check', channel: 'NEVER on 16 (use 9)',
      when: 'Testing your radio.',
      script: [
        '"This is [vessel name] requesting radio check on Channel 9 — over."',
        '"This is [responding station]. Reading you loud and clear, over."'
      ],
      followUp: 'Do NOT do radio checks on 16 — federal rules. Use channel 9 (alternate hailing).' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: KNOTS (essential for mariners)
  // ───────────────────────────────────────────────────────────
  // The "knots every boater should know." Each entry describes
  // the use case + key features.
  var KNOTS = [
    { id: 'bowline', name: 'Bowline', emoji: '🪢',
      use: 'Forms a loop at the end of a line that won\'t slip. The "king of knots."',
      where: 'Tying a line to a piling, mooring, person being hoisted, sail clew.',
      mnemonic: '"The rabbit comes out of the hole, around the tree, and back down the hole."',
      strength: 'Reduces line strength to ~60% (all knots reduce strength).' },
    { id: 'clove-hitch', name: 'Clove Hitch', emoji: '🪢',
      use: 'Quickly secures a line to a post, rail, or piling.',
      where: 'Temporary dock-line, fender, light tow.',
      mnemonic: 'Two half-hitches around a post.',
      strength: '~60%. Slips under load reversal — use only for temporary hold.' },
    { id: 'cleat-hitch', name: 'Cleat Hitch (cleating a line)', emoji: '🪢',
      use: 'Securing a dock line to a horn cleat.',
      where: 'Every dock + most boat fittings.',
      mnemonic: 'Bottom turn → cross over → underhand loop → finish with locked overhand.',
      strength: 'Strong + quick-release if cleated correctly.' },
    { id: 'figure-eight', name: 'Figure-Eight Stopper', emoji: '🪢',
      use: 'Prevents line end from passing through a block, fairlead, or cleat.',
      where: 'Bitter end of any line you don\'t want to lose through hardware.',
      mnemonic: 'Make a loop, twist once, pass tail through. Looks like the number 8.',
      strength: 'No load-bearing — just a stopper.' },
    { id: 'fisherman-bend', name: 'Anchor Bend (Fisherman\'s Bend)', emoji: '🪢',
      use: 'Securing a line to an anchor ring or to a mooring shackle.',
      where: 'Anchor rode termination.',
      mnemonic: 'Two turns around the ring, then a half-hitch back through, then a half-hitch above.',
      strength: 'Holds well under load + cyclic motion.' },
    { id: 'sheet-bend', name: 'Sheet Bend', emoji: '🪢',
      use: 'Joining two lines of unequal thickness.',
      where: 'When you need to extend a line + don\'t have a same-size second line.',
      mnemonic: 'Bend (loop) in larger line, smaller goes through + around + tucks under itself.',
      strength: 'Better than square knot for unequal lines.' },
    { id: 'square-knot', name: 'Square Knot (Reef Knot)', emoji: '🪢',
      use: 'Joining two lines of EQUAL diameter — temporary use only.',
      where: 'Reefing a sail, tying a bandage. NOT for load-bearing applications.',
      mnemonic: '"Right over left, left over right."',
      strength: 'Capsizes under load with unequal diameters — use sheet bend instead.' },
    { id: 'rolling-hitch', name: 'Rolling Hitch', emoji: '🪢',
      use: 'Securing a line to another rope, spar, or pole when load comes along the long axis.',
      where: 'Snubbing an anchor rode, hanging a fender, attaching to a stay.',
      mnemonic: 'Two diagonal turns, then a hitch above on the loaded side.',
      strength: 'Excellent grip; doesn\'t slip in line direction.' },
    { id: 'trucker-hitch', name: 'Trucker\'s Hitch', emoji: '🪢',
      use: 'Creates a mechanical advantage (~2:1 or 3:1) for tensioning a line.',
      where: 'Lashing down deck gear, tarps, traps.',
      mnemonic: 'Sheepshank-style loop in line, pull bitter end through, secure with two half-hitches.',
      strength: 'Tightens efficiently; releases cleanly.' },
    { id: 'palomar', name: 'Palomar Knot', emoji: '🪢',
      use: 'Strongest knot for joining line to hook eye.',
      where: 'Terminal tackle (rigging hooks, swivels).',
      mnemonic: 'Double the line, pass through eye, simple overhand, pass loop over hook.',
      strength: 'Retains ~95%+ of line strength — knot of choice for braid + mono.' },
    { id: 'improved-clinch', name: 'Improved Clinch Knot', emoji: '🪢',
      use: 'Terminal tackle when palomar is awkward (e.g., for heavy mono).',
      where: 'Hook + swivel attachment.',
      mnemonic: 'Pass line through eye, wrap line 5-7 times, tuck back through small loop above the hook, then through big loop you formed.',
      strength: '~85-90% line strength. Standard freshwater knot.' },
    { id: 'haywire-twist', name: 'Haywire Twist', emoji: '🪢',
      use: 'Terminating single-strand wire leader to a hook for toothy fish.',
      where: 'Bluefish, mackerel, barracuda, tuna leader rigging.',
      mnemonic: 'Twist wire around itself 8-10 times in tight cylinder, then wrap a barrel.',
      strength: 'Required when teeth threaten to bite through line.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: BAIT GUIDE
  // ───────────────────────────────────────────────────────────
  var BAIT = [
    { id: 'mackerel-chunks', name: 'Mackerel chunks (cut bait)', use: 'Striper, bluefish, cod, haddock, lobster trap',
      acquisition: 'Catch your own with sabiki rig, freeze for later use.',
      effective: 'Universal saltwater bait. Oil content + scent travel well.',
      cost: 'Free if you catch your own; $2-$4/lb at bait shop.' },
    { id: 'sand-eels', name: 'Sand Eels (sand lances)', use: 'Striper, bluefish, cod, mackerel',
      acquisition: 'Buy frozen at bait shop ($6-$10/dozen); or rake from sandy flats at low tide (some areas restricted).',
      effective: 'Most-imitated forage fish in N. Atlantic. Stripers crash on these in spring.',
      cost: 'Moderate.' },
    { id: 'menhaden', name: 'Menhaden / "Pogies / Bunker"', use: 'Striper (THE bait), bluefish, tuna chumming',
      acquisition: 'Catch with cast net (where legal) or buy at bait shop.',
      effective: 'Oily + smelly = striped bass magnet. Live-line menhaden = trophy striper rig.',
      cost: 'Moderate to high.' },
    { id: 'sea-worms', name: 'Sea Worms (sandworms, bloodworms, clamworms)', use: 'Striper, flounder, tautog, cod',
      acquisition: 'Buy at bait shop ($10-$20/dozen) OR dig your own at low tide (some flats restricted).',
      effective: 'Universal inshore bait. Use small hooks; thread fully.',
      cost: 'Premium.' },
    { id: 'clams', name: 'Clams (necks + tongues)', use: 'Flounder, tautog, cod, striper',
      acquisition: 'Buy at fish market, or dig soft-shells at low tide with town clam permit.',
      effective: 'Clam tongues are tougher (better hook hold); necks are smellier.',
      cost: 'Cheap if you dig.' },
    { id: 'green-crabs', name: 'Green Crabs', use: 'Tautog (THE bait), tog, sea bass',
      acquisition: 'Free — they\'re invasive in Maine. Trap or hand-pick at low tide.',
      effective: 'Cut in half + thread on hook. Cracks open easily; tautog love the soft inside.',
      cost: 'FREE. Help by removing them — green crabs are devastating clam flats.' },
    { id: 'shrimp', name: 'Shrimp (peeled)', use: 'Sea bass, flounder, cunner, tautog',
      acquisition: 'Buy in grocery or frozen at bait shop.',
      effective: 'Hooks small fish quickly. Limited use for larger sport species.',
      cost: 'Variable.' },
    { id: 'mackerel-strip', name: 'Mackerel Strips (cut from belly)', use: 'Tuna trolling, sailfish (S of Maine)',
      acquisition: 'Cut from frozen mackerel.', effective: 'Trail behind a teaser on offshore troll rig.',
      cost: 'Free if you have mackerel.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: BOAT TYPES (Maine fleet variety)
  // ───────────────────────────────────────────────────────────
  var BOAT_TYPES = [
    { id: 'skiff', name: 'Open Skiff (14-18 ft)', emoji: '🚤',
      use: 'Inshore lobstering (recreational), striper, harbor work',
      power: '25-90 hp outboard',
      crew: '1-3',
      pros: 'Cheap to operate; nimble; easy to trailer.',
      cons: 'Limited weather window; tiny payload.',
      typical: '$5,000-$15,000 used.' },
    { id: 'lobsterboat', name: 'Maine Lobsterboat (28-42 ft)', emoji: '⚓',
      use: 'Commercial lobstering (Class I-III), some groundfish',
      power: 'Diesel inboard 250-650 hp',
      crew: '2-4 (captain + sternman x 1-2)',
      pros: 'Maine icon. Deep V (semi-displacement) — works heavy weather. Big aft deck for traps + bait.',
      cons: '$200K-$600K to build new. Insurance + fuel substantial.',
      typical: 'New: $350K+; used 20-yr-old hull with refit: $100K-$200K.' },
    { id: 'dragger', name: 'Dragger / Trawler (40-90 ft)', emoji: '🚢',
      use: 'Commercial groundfish, shrimp, scallop',
      power: 'Heavy diesel, sometimes twin-engine',
      crew: '3-6',
      pros: 'High catch volume; offshore-capable.',
      cons: 'Capital-intensive ($1M+); fuel costs; permit + crew complexity.',
      typical: 'Dwindling Maine fleet; many vessels date to the 70s-80s.' },
    { id: 'charter', name: 'Sport-Fishing Charter Boat (28-50 ft)', emoji: '🎣',
      use: 'Paying charter clients — striper, tuna, groundfish',
      power: 'Twin diesel or gas inboards 300-1000 hp combined',
      crew: '1-2 (Captain + mate)',
      pros: 'Multiple lines, comfortable for clients, range.',
      cons: 'Insurance heavy; USCG license + medical required; seasonal business.',
      typical: '$100K-$500K depending on size + age.' },
    { id: 'sailboat', name: 'Sailing Vessel', emoji: '⛵',
      use: 'Cruising + day-sailing; some heritage workboats (windjammers)',
      power: 'Wind + auxiliary diesel',
      crew: '1-many',
      pros: 'Wind = free. Lower carbon. COLREGS gives sail right-of-way over power in many encounters.',
      cons: 'Slower; skill curve.',
      typical: 'Wide range; entry sailboat used $5K-$20K.' },
    { id: 'pontoon', name: 'Pontoon Boat (lakes only)', emoji: '🛥️',
      use: 'Maine inland lakes — Sebago, Moosehead, Rangeley',
      power: 'Outboard 25-150 hp',
      crew: '1-10',
      pros: 'Comfortable + roomy for families. Stable on flat water.',
      cons: 'NOT a saltwater boat. Will not survive Atlantic chop.',
      typical: '$15K-$50K.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: WABANAKI FISHING HERITAGE
  // ───────────────────────────────────────────────────────────
  // Maine's marine ecology has been shaped by 12,000+ years of
  // Indigenous stewardship. The Wabanaki Confederacy (Penobscot,
  // Passamaquoddy, Maliseet, Mi'kmaq) holds treaty rights and
  // continuing connections to Maine waters. Content checked
  // against Penobscot Nation's public statements + Maine-Wabanaki
  // commission reports.
  var WABANAKI = [
    { id: 'overview', title: 'The Wabanaki Confederacy',
      body: 'The "People of the Dawn" — four tribal nations whose traditional territory covers what is now Maine, the Maritimes, and parts of New Hampshire + Vermont. The four nations: Penobscot (Penobscot River watershed), Passamaquoddy (Eastern Maine + St. Croix), Maliseet (St. John River), Mi\'kmaq (Eastern Maine + Maritimes). Their relationship with Maine fisheries predates European contact by millennia.' },
    { id: 'fisheries', title: 'Traditional Fisheries',
      body: 'Atlantic salmon, eel, alewife/blueback herring, shad, lampreys, sea-run brook trout, smelt, sturgeon, lobster, oyster, clam, scallop. Most species reached spawning beds via rivers — dam removals (e.g., Penobscot Project) restore both fish + cultural practice.' },
    { id: 'penobscot-project', title: 'Penobscot River Restoration',
      body: 'Multi-tribal + state + federal partnership 2004-2016. Removed Great Works + Veazie dams; bypassed Howland Dam; opened 1,000+ miles of river habitat for shad, alewife, salmon, sturgeon. Penobscot Nation co-led design. One of the largest river restoration projects in N. America.',
      cite: 'Penobscot River Restoration Trust' },
    { id: 'sea-run-fish', title: 'Sea-run Fish Cultural Importance',
      body: 'Alewives return up Maine rivers in massive spring runs. Historically these runs sustained tribal villages + brought nutrients inland. Damariscotta Mills fishladder + Maine alewife festivals continue this connection. Schools at King Middle have toured alewife fishways.',
      cite: 'Maine DMR sea-run + Maine Rivers' },
    { id: 'modern-rights', title: 'Modern Tribal Fishing Rights',
      body: 'The 1980 Maine Indian Claims Settlement Act + subsequent Maine Implementing Act define ongoing tribal fishing rights — including subsistence + ceremonial harvest of species like alewife + eel. Tensions over sovereignty + jurisdiction continue.',
      cite: 'Maine-Wabanaki State Child Welfare Truth & Reconciliation Commission' },
    { id: 'elver-controversy', title: 'Elver (Baby Eel) Fishery',
      body: 'Maine\'s elver fishery (~$10M-$30M/yr) includes tribal sovereignty issues. Passamaquoddy + Penobscot have asserted treaty-based rights to additional harvest beyond state quota. Ongoing legal disputes — important context for any Maine elver discussion.',
      cite: 'Press Herald + Maine DMR + tribal communiques' },
    { id: 'pedagogy', title: 'How to teach this',
      body: 'Start from current-day tribal nations as living communities (NOT "ancient peoples"). Identity-first language where preferred. Use tribal-authored sources (Penobscot Nation, Passamaquoddy Tribe websites). Don\'t conflate the four nations. Wabanaki Reach + Maine Indian Education are good Maine-specific curricular partners.',
      cite: 'Wabanaki Reach + ME Indian Education' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: CLIMATE IMPACTS ON GULF OF MAINE
  // ───────────────────────────────────────────────────────────
  // The Gulf of Maine is warming faster than 99% of the global
  // ocean. These impacts shape every fishing decision today.
  var CLIMATE_IMPACTS = [
    { id: 'warming-rate', title: 'Warming Rate',
      body: 'The Gulf of Maine warmed at 0.03°C/yr from 2004-2013 — about 4× faster than the global ocean average. Now ~3°C warmer than 1900 baseline (annual mean SST).',
      cite: 'Pershing et al. 2015 Science; GMRI 2024' },
    { id: 'cod-collapse', title: 'Cod Collapse + Warming Linkage',
      body: 'Historical overfishing pushed cod past breaking point; warming has prevented recovery. Cod larvae develop poorly above ~12°C. Gulf summer SSTs now regularly exceed this threshold inshore.',
      cite: 'Pershing 2015 + NOAA Fisheries' },
    { id: 'lobster-shift', title: 'Lobster Range Shift',
      body: 'Maine landings up dramatically in past 20 years (climate winner — for now). But lobster shell-disease + abnormal molting also rising. Southern lobster stocks (LIS + RI) have collapsed; Maine\'s turn could come.',
      cite: 'GMRI + ASMFC lobster assessment' },
    { id: 'green-crab', title: 'Green Crab Invasion',
      body: 'Carcinus maenas — invasive. Warming + reduced winter ice have let populations explode. Devastating soft-shell clam flats + eelgrass meadows.',
      cite: 'Maine Sea Grant + DMR' },
    { id: 'kelp-decline', title: 'Kelp Decline + Recovery Opportunity',
      body: 'Native kelp forests have declined in S Maine. But sugar kelp + winged kelp aquaculture is climate-positive — a way to USE the cold winter waters as they become rarer.',
      cite: 'Bigelow Lab + UMaine Sea Grant' },
    { id: 'mackerel-shift', title: 'Pelagic Species Shift',
      body: 'Mackerel + butterfish + black sea bass shifting north. Black sea bass landings in Maine grew 10×+ in past decade. Stripers stay later into autumn.',
      cite: 'NEFSC climate vulnerability assessment 2016' },
    { id: 'right-whale', title: 'Right Whale + Fisheries Conflict',
      body: 'North Atlantic right whale is critically endangered (~340 individuals). Vertical lobster trap lines are a major entanglement risk. New rules require ropeless gear or seasonal closures — economic + legal turmoil in Maine.',
      cite: 'NOAA Office of Protected Resources + NEFMC' },
    { id: 'acidification', title: 'Ocean Acidification',
      body: 'Atmospheric CO₂ → ocean pH drop. Larval shellfish + lobster vulnerable to weak shell formation. Gulf of Maine acidification accelerated by freshwater inputs from spring runoff.',
      cite: 'Bigelow Lab' },
    { id: 'precipitation', title: 'Coastal Precipitation Patterns',
      body: 'Heavier short rain events; longer summer droughts. Salinity swings stress shellfish farms + change spawning runs for sea-run species.',
      cite: 'Maine Climate Council' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: CONSERVATION CASE STUDIES
  // ───────────────────────────────────────────────────────────
  var CONSERVATION_CASES = [
    { id: 'cod-grand-banks', title: 'Grand Banks Cod Collapse (1992)',
      summary: 'Centuries-old cod fishery off Newfoundland collapsed in 1992. Canada imposed moratorium; 30,000+ people lost livelihoods overnight. Stock still has not recovered fully 30+ years later.',
      lessons: 'Multi-decade overfishing past biological limits is irreversible on human timescales. Slow-growing fish + cold metabolism + late maturity = vulnerable.',
      action: 'Strict TAC + science-based management + observer programs + protected spawning closures.' },
    { id: 'lobster-vnotch', title: 'Maine Lobster V-Notch Program',
      summary: 'Maine lobstermen self-enforce v-notching of egg-bearing females since the early 1900s. Federal law since 1985.',
      lessons: 'When fishermen own the conservation tool, compliance is universal. V-notched females remain protected for LIFE.',
      action: 'Combination of self-enforcement + state inspectors + lobster zone councils.' },
    { id: 'striper-moratorium', title: 'Atlantic Striped Bass Moratorium (1985-1990)',
      summary: 'Striped bass collapsed in early 80s. Multi-state moratorium banned all sales; recreational catch severely limited.',
      lessons: 'Coordinated multi-state action under ASMFC works when there\'s political will. Stocks rebuilt by 1995.',
      action: 'Slot limits + circle hook requirements + reduced bag limits + recreational seasons.' },
    { id: 'penobscot-restoration', title: 'Penobscot River Restoration (2004-2016)',
      summary: 'Multi-tribal + agency + ngo partnership removed 2 dams + bypassed 1, restoring 1000+ river miles for sea-run fish.',
      lessons: 'Tribal leadership + multi-partner trust-building can deliver landscape-scale restoration that benefits fisheries + tribes + recreation.',
      action: 'Continued monitoring of shad, alewife, salmon, sturgeon returns.' },
    { id: 'redfish-recovery', title: 'Acadian Redfish Recovery',
      summary: 'Redfish collapsed by 80s. Decades of low quota + closures + monitoring rebuilt the stock by 2012.',
      lessons: 'Long-lived (50+ year) species DO recover, but it takes decades of restraint. The math of generation time matters.',
      action: 'Continued precautionary quotas.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COLD-WATER SURVIVAL (life-saving content)
  // ───────────────────────────────────────────────────────────
  var COLD_WATER = [
    { phase: '1. Cold Shock (first 1 minute)',
      what: 'Sudden gasping reflex on entering cold water (<15°C/60°F). Can lead to drowning if face is underwater during the gasp.',
      survival: 'PFD ON BEFORE you fall in. Cover your nose+mouth with hand on impact if possible.',
      time: 'First 60 seconds.' },
    { phase: '2. Swim Failure (minutes 1-10)',
      what: 'Cold causes muscle dexterity loss — your hands fail before your core cools. You may have only 5-10 min of useful swimming.',
      survival: 'Don\'t swim unless shore is very close. Reaching the boat (HUP — Heat Escape Lessening Posture) preserves heat.',
      time: '~10 min in Maine summer water.' },
    { phase: '3. Hypothermia (10 min - 1 hr)',
      what: 'Core temp drops. Confusion, weakness, slowed heart rate, slurred speech.',
      survival: 'Stay still in PFD. Conserve heat — HELP/huddle position. Wait for rescue. DO NOT remove clothing.',
      time: '~1 hr in 50°F water until incapacitation.' },
    { phase: '4. Post-rescue Collapse',
      what: 'Once rescued, blood pressure drops + heart can fail. Don\'t rush.',
      survival: 'Lay flat. Cover with blankets. Warm rooms slowly. Do not give alcohol. Medical evaluation.',
      time: 'Hours-to-days monitoring after.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: ACHIEVEMENTS
  // ───────────────────────────────────────────────────────────
  var ACHIEVEMENTS = [
    { id: 'first-cast', name: 'First Cast', icon: '🎣', desc: 'Cast off from the dock for the first time.' },
    { id: 'red-right', name: 'Red Right Returning', icon: '🟥', desc: 'Pass a red nun on starboard correctly.' },
    { id: 'first-keeper', name: 'First Keeper', icon: '🐟', desc: 'Land your first legal-size fish.' },
    { id: 'cod-cracker', name: 'Cod Cracker', icon: '🐟', desc: 'Land 5 keeper cod.' },
    { id: 'slot-master', name: 'Slot Master', icon: '📏', desc: 'Correctly release 10 fish outside the slot.' },
    { id: 'v-notch-hero', name: 'V-Notch Hero', icon: '🦞', desc: 'V-notch 5 egg-bearing females.' },
    { id: 'fog-walker', name: 'Fog Walker', icon: '🌫️', desc: 'Complete a mission in dense fog.' },
    { id: 'storm-survivor', name: 'Storm Survivor', icon: '⛈️', desc: 'Run a storm scenario without capsizing.' },
    { id: 'navigator', name: 'Navigator', icon: '🧭', desc: 'Plot a fix using two bearings.' },
    { id: 'mayday', name: 'Knows Mayday', icon: '🚨', desc: 'Complete the VHF distress procedure correctly.' },
    { id: 'knot-tier', name: 'Knot Tier', icon: '🪢', desc: 'Identify all 12 knots correctly in quiz.' },
    { id: 'species-id-bronze', name: 'Species ID Bronze', icon: '🐟', desc: 'Identify 5 different species in your life log.' },
    { id: 'species-id-silver', name: 'Species ID Silver', icon: '🐟', desc: 'Identify 12 different species.' },
    { id: 'species-id-gold', name: 'Species ID Gold', icon: '🐟', desc: 'Identify 20 different species.' },
    { id: 'lobster-apprentice', name: 'Lobster Apprentice', icon: '🦞', desc: 'Complete the apprenticeship mission.' },
    { id: 'quiz-master', name: 'Quiz Master', icon: '🏆', desc: 'Score 90%+ on the full quiz.' },
    { id: 'sustainable-fisher', name: 'Sustainable Fisher', icon: '🌱', desc: 'Complete a mission with zero conservation violations.' },
    { id: 'wabanaki-historian', name: 'Wabanaki Heritage Reader', icon: '📜', desc: 'Read all 7 Wabanaki heritage entries.' },
    { id: 'climate-aware', name: 'Climate Aware', icon: '🌡️', desc: 'Read all climate impact entries.' },
    { id: 'port-explorer', name: 'Port Explorer', icon: '⚓', desc: 'Visit (sim) at least 3 Maine ports.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: SAFETY EQUIPMENT (USCG requirements + best practice)
  // ───────────────────────────────────────────────────────────
  var SAFETY_EQUIPMENT = [
    { id: 'pfd', name: 'Personal Flotation Devices (PFDs)', emoji: '🦺',
      required: 'One USCG-approved Type I, II, III, or V PFD per person aboard. Children under 13 MUST wear one underway in Maine (state law).',
      types: 'Type I (offshore, turns unconscious wearer face-up); Type II (near-shore buoyancy); Type III (flotation aid for water sports); Type V (special use — inflatable, work vests).',
      maintenance: 'Inspect annually for tears, mildew, broken buckles. Inflatables: check CO₂ cylinder. Replace every 10 years.',
      reality: 'Statistically, ~85% of boating drownings involve people NOT wearing a PFD. They were "right there" but not on. Wear yours.' },
    { id: 'flares', name: 'Visual Distress Signals (VDS)', emoji: '🚩',
      required: 'For boats >16 ft on coastal waters: 3 day + 3 night signals OR 3 day/night flares. Pyrotechnic flares have 3.5-year expiration.',
      types: 'Pyrotechnic (handheld + aerial flares), electronic (LED SOS strobe — replaces night-only requirement), orange smoke (day), flags + dye marker (day-only).',
      maintenance: 'Replace before expiration. Keep dry. Store accessibly.',
      reality: 'Aerial parachute flares visible 25+ nm at night. Use sparingly — when help is in range to see.' },
    { id: 'sound-signal', name: 'Sound-Producing Device', emoji: '📢',
      required: 'Whistle, horn, or bell. Required by COLREGS for fog signals + maneuvering signals.',
      types: 'Compressed-air horn (loudest, most reliable), electric horn (mounted), athletic whistle (PFD-attached backup).',
      maintenance: 'Test before each trip. Air horn cans should be full.',
      reality: 'You\'ll use this for routine docking + meeting signals AND for fog/distress. Always keep one in PFD pocket.' },
    { id: 'navigation-lights', name: 'Navigation Lights', emoji: '🔦',
      required: 'Sunset to sunrise + restricted visibility. Configuration depends on vessel type + size.',
      types: 'Red (port side) + Green (starboard side) + White stern light. Smaller boats may have all-around white in place of separate side+stern.',
      maintenance: 'Verify bulbs work BEFORE casting off in evening. Carry spare bulbs.',
      reality: 'Failure to display proper nav lights = primary fault in many collisions. Don\'t assume "we\'ll be back before dark."' },
    { id: 'fire-extinguisher', name: 'Fire Extinguisher(s)', emoji: '🧯',
      required: 'B-I or B-II rated. Number depends on vessel length + permanent vs portable fuel tanks.',
      types: 'Dry chemical (most common), CO₂ (cleaner but no residual coverage), AFFF (foam for liquid fires).',
      maintenance: 'Check pressure gauge monthly. Discharge + replace every 5-12 years.',
      reality: 'Boat fires often start in engine room from fuel-line leaks. Halon/CO₂ engine-room systems exist for inboards.' },
    { id: 'epirb-plb', name: 'EPIRB / PLB', emoji: '📡',
      required: 'EPIRB required for some commercial vessels; recommended for any offshore. PLB recommended for any waterman.',
      types: 'EPIRB (vessel-registered, on the boat); PLB (person-registered, worn on PFD). Both use 406 MHz satellite system.',
      maintenance: 'Test self-diagnostic monthly. Replace battery per manufacturer (5-7 years typical). Register with NOAA.',
      reality: 'A 406 EPIRB gets your distress + position to Coast Guard within minutes of activation. Single most life-saving device after PFD.' },
    { id: 'first-aid', name: 'First Aid Kit (Marine-Grade)', emoji: '🩹',
      required: 'Not legally mandated for recreational but essential.',
      types: 'At minimum: cuts (hooks happen), seasickness (Bonine + ginger), burns, cold-water rewarming, motion-sickness meds, emergency blanket, tourniquet for severe bleeding.',
      maintenance: 'Inspect annually; replace expired items.',
      reality: 'Hook in finger? Push through + cut barb. Severe cut? Tourniquet + radio for help.' },
    { id: 'vhf-radio', name: 'VHF Marine Radio', emoji: '📻',
      required: 'Not required for recreational, but federally licensed for use. Essential for safety.',
      types: 'Fixed-mount (most reliable, more power 25W); handheld (5W typical, waterproof). DSC-equipped radios can send instant distress with position.',
      maintenance: 'Check annually with radio check on Ch 9. Replace handheld batteries every 2-3 years.',
      reality: 'Cell phones don\'t work offshore + Coast Guard doesn\'t monitor them. VHF is THE safety tool.' },
    { id: 'anchor', name: 'Anchor + Rode', emoji: '⚓',
      required: 'Not legally required but essential for safety.',
      types: 'Fluke/Danforth (mud/sand), plow/CQR (versatile), Bruce (mixed bottom), grapnel (rocks).',
      maintenance: 'Inspect shackle + chain for wear. Mark rode every 25 ft so you know scope.',
      reality: 'When engine fails near rocks, the anchor is what stops you drifting onto them. Practice setting yours.' },
    { id: 'bilge-pump', name: 'Bilge Pump (with backup)', emoji: '💧',
      required: 'Required for inboard boats. Hand-bailer or manual pump for small open boats.',
      types: 'Automatic float-switch electric (primary); manual hand pump (backup); bucket (last resort).',
      maintenance: 'Test float switch + flow rate monthly. Clear bilge of debris that fouls the impeller.',
      reality: 'Most boats sink at the dock from a stuck bilge pump float OR a small leak that exceeds pump capacity over weeks.' },
    { id: 'tools-spares', name: 'Tools + Spare Parts', emoji: '🔧',
      required: 'Not legally mandated. Common sense.',
      types: 'Multi-tool, spare belts/impellers for inboard, spare propeller (small outboard), engine oil, electrical tape, hose clamps, hose.',
      maintenance: 'Refresh annually. Test that you can change a propeller before you need to.',
      reality: 'Spare prop has gotten more Maine fishermen home than spare anything else.' },
    { id: 'throw-bag', name: 'Throw Bag / Rescue Line', emoji: '🪢',
      required: 'Not federally required for non-commercial. Essential for crew safety.',
      types: '50-75 ft of buoyant line in a deployable bag. Throw to person overboard from beyond their reach.',
      maintenance: 'Repack annually; check line for UV damage.',
      reality: 'You can\'t reach a thrown PIB if they\'re drifting downwind. Throw bag gets them attached + recoverable.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MARITIME LAW PRIMER
  // ───────────────────────────────────────────────────────────
  var MARITIME_LAW = [
    { id: 'msa', title: 'Magnuson-Stevens Fishery Conservation + Management Act (1976, amended 2006)',
      body: 'Foundational US federal fisheries law. Created the 200-nm Exclusive Economic Zone (EEZ) + 8 Regional Fishery Management Councils (NEFMC is ours). Mandates science-based catch limits + rebuilding plans for overfished stocks. Major 2006 amendment added Annual Catch Limits + Accountability Measures.',
      relevance: 'Why we have quotas + closures. Why stock assessments matter politically.' },
    { id: 'colregs', title: 'COLREGS (International Regulations for Preventing Collisions at Sea)',
      body: 'International treaty effective 1977. Adopted by US as 33 CFR 83. Contains 38 rules organized by visibility (any, in sight, restricted visibility) + by lights/sounds/distress signals. Inland Navigation Rules (33 CFR 84-90) apply on US inland waters with minor differences.',
      relevance: 'These are the legal rules of the road. Violation can result in liability after a collision.' },
    { id: 'lobster-act', title: 'Federal Lobster Conservation + Management Act + State Implementation',
      body: 'Atlantic States Marine Fisheries Commission (ASMFC) coordinates 7 lobster management zones. Maine implements via Title 12 (Department of Marine Resources). V-notch rule federalized 1985.',
      relevance: 'Why Maine\'s lobster fishery has such a distinctive multi-tier license system + zone councils.' },
    { id: 'ramp', title: 'Ramp/Access Law',
      body: 'Maine\'s public coastal access is governed by "the colonial ordinance" — intertidal zone (between high + low tide marks) is public for fishing, fowling, navigation. Above high tide is private. Don\'t cut across private uplands.',
      relevance: 'Maine has comparatively limited public-access points to working waterfront. The Working Waterfront Access Protection Program is preserving + expanding access.' },
    { id: 'esa', title: 'Endangered Species Act (1973)',
      body: 'Protects federally-listed species + their critical habitat. In Maine fisheries: Atlantic salmon (Gulf of Maine DPS), Atlantic sturgeon (GOM DPS), shortnose sturgeon, NA right whale, sea turtles. Take is generally prohibited — even incidentally.',
      relevance: 'Why lobster gear is being reconfigured (right whale entanglement). Why sturgeon/salmon catches require immediate release.' },
    { id: 'jonesact', title: 'Jones Act (Merchant Marine Act of 1920)',
      body: 'Requires goods shipped between US ports to be on US-built, US-owned, US-crewed vessels. Affects Maine working waterfront (American fishing fleet).',
      relevance: 'Why some imported boats can\'t be used commercially in Maine waters; why charter limits matter.' },
    { id: 'shellfish-sanitation', title: 'NSSP (National Shellfish Sanitation Program)',
      body: 'Federal-state cooperative program managing the safety of commercially harvested shellfish (clams, oysters, mussels, scallops). Maine DMR Bureau of Public Health classifies waters as approved / restricted / prohibited / unclassified.',
      relevance: 'Why DMR closes shellfish flats after rain + HABs. Cross-reference AquacultureLab.' },
    { id: 'msfca', title: 'Marine Mammal Protection Act (1972)',
      body: 'Prohibits "take" (harassment, killing, capture) of marine mammals. Permits research + Indigenous subsistence harvest. Whales, dolphins, seals, sea otters all covered.',
      relevance: 'Why Coast Guard tickets approach to whales. Why seal interactions require minimum distances.' },
    { id: 'iuu', title: 'IUU Fishing (Illegal, Unreported, Unregulated)',
      body: 'Major global problem. US enforcement: SIMP (Seafood Import Monitoring Program) requires reporting + chain-of-custody for high-risk species. Coast Guard + NOAA OLE enforce at sea.',
      relevance: 'Why "Maine lobster" branding + certification matters. Why poaching prosecutions are aggressive.' },
    { id: 'maine-title-12', title: 'Maine Title 12 — Conservation Laws',
      body: 'Maine\'s state-level fisheries + marine resources law. DMR enforces. Topics: licensing, gear regulations, season + bag limits, marine patrol.',
      relevance: 'The source-of-truth for Maine state-waters fisheries rules.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: SEABIRDS OF MAINE
  // ───────────────────────────────────────────────────────────
  // Birds are part of the working ecosystem — they signal fish,
  // weather, and ecosystem health. Cross-references BirdLab.
  var SEABIRDS = [
    { id: 'osprey', name: 'Osprey', sci: 'Pandion haliaetus', emoji: '🦅',
      idMarks: 'Brown above, white below, distinctive M-shaped wing profile in flight. Recovering from DDT decline.',
      behavior: 'Plunge-dives feet-first for fish. Hunts visible from above water surface.',
      indicator: 'Active osprey = active surface forage fish (alewives, herring, mackerel).',
      season: 'Returns to Maine April; departs September-October.' },
    { id: 'cormorant', name: 'Double-crested Cormorant', sci: 'Nannopterum auritum', emoji: '🦆',
      idMarks: 'Black body, long snake-like neck, hooked beak, orange throat patch. Holds wings spread to dry.',
      behavior: 'Diving pursuit-fish predator. Group fishing rare but documented in Maine.',
      indicator: 'Diving cormorants suggest baitfish school + structure.',
      season: 'Year-round resident in Maine.' },
    { id: 'common-loon', name: 'Common Loon', sci: 'Gavia immer', emoji: '🐦',
      idMarks: 'Summer: black head, white-checkered back, red eye. Winter: gray-brown above, pale below. Iconic Maine call.',
      behavior: 'Pursuit divers for fish. Need silent unbroken water surface for takeoff (~100+ yards run).',
      indicator: 'Maine\'s sentinel species — sensitive to lead tackle (poisoning) + boat wake (chick separation).',
      season: 'Fresh-water summer breeders; saltwater winter visitors to Maine coast.' },
    { id: 'tern-common', name: 'Common Tern', sci: 'Sterna hirundo', emoji: '🕊️',
      idMarks: 'Slender, black cap in breeding plumage, deeply forked tail, red bill with black tip.',
      behavior: 'Aerial pluck divers — hover + drop. Will dive on schools of small forage fish.',
      indicator: 'Working terns = baitfish at surface — perfect striper feeding cue.',
      season: 'Migrant; nests on Maine islands May-September.' },
    { id: 'tern-roseate', name: 'Roseate Tern', sci: 'Sterna dougallii', emoji: '🕊️',
      idMarks: 'Like Common Tern but with rosy breast tint + entirely black bill in spring. Federally endangered.',
      behavior: 'Similar feeding behavior to common tern.',
      indicator: 'Most colonies in Maine on a few islands (Eastern Egg Rock, Petit Manan, Stratton). Strict approach restrictions.',
      season: 'Migrant.' },
    { id: 'puffin', name: 'Atlantic Puffin', sci: 'Fratercula arctica', emoji: '🐧',
      idMarks: 'Black + white body, comical orange-red beak in breeding season. Stubby wings; rapid wingbeats.',
      behavior: 'Pursuit-dives for small fish (herring, sand lance). Carries multiple fish at once in beak.',
      indicator: 'Project Puffin (Audubon) restored breeding colonies to Maine after 19th-century extirpation. Climate-vulnerable.',
      season: 'Nests on outer islands April-August; pelagic remainder of year.' },
    { id: 'gull-herring', name: 'Herring Gull', sci: 'Larus argentatus', emoji: '🐦',
      idMarks: 'Largest common Maine gull. Gray back, white head + belly, pink legs, yellow bill with red spot.',
      behavior: 'Opportunistic — follows boats, scavenges, occasionally hunts.',
      indicator: 'Universal dock-side companion. Reduced inshore presence often signals offshore food.',
      season: 'Year-round.' },
    { id: 'gull-blackback', name: 'Great Black-backed Gull', sci: 'Larus marinus', emoji: '🐦',
      idMarks: 'Maine\'s largest gull. Slate-black back + wings, white head + belly, massive yellow beak.',
      behavior: 'Apex avian predator on shore — will take fish, smaller seabirds, chicks.',
      indicator: 'Apex aggression on docks; competitor for table scraps.',
      season: 'Year-round.' },
    { id: 'eider', name: 'Common Eider', sci: 'Somateria mollissima', emoji: '🦆',
      idMarks: 'Sea duck. Males: striking black + white pattern. Females: warm brown. Maine has unique "dresseri" subspecies.',
      behavior: 'Dives for mussels + crabs + sea urchins in shallow coastal water.',
      indicator: 'Eider rafts = mussel bed activity. Eider populations declined recently — under study.',
      season: 'Year-round resident; nests on coastal islands.' },
    { id: 'shearwater-sooty', name: 'Sooty Shearwater', sci: 'Ardenna grisea', emoji: '🐦',
      idMarks: 'Pelagic seabird. Brown overall, long slender wings, silvery underwing flash.',
      behavior: 'Pelagic; rides air currents above waves. Visible mid-summer in offshore Maine.',
      indicator: 'Long-haul migrant from S Atlantic; appears with offshore baitfish abundance.',
      season: 'Summer visitor.' },
    { id: 'storm-petrel', name: 'Wilson\'s Storm-Petrel', sci: 'Oceanites oceanicus', emoji: '🐦',
      idMarks: 'Tiny (sparrow-size) all-black seabird with white rump patch + yellow webbing between toes.',
      behavior: 'Hops along water surface, picking at plankton + oily slicks.',
      indicator: 'Pelagic; offshore-only. Trans-equatorial migrant.',
      season: 'Summer visitor offshore.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MARINE MAMMALS OF MAINE
  // ───────────────────────────────────────────────────────────
  var MARINE_MAMMALS = [
    { id: 'harbor-seal', name: 'Harbor Seal', sci: 'Phoca vitulina', emoji: '🦭',
      idMarks: 'Spotted, V-shaped nostrils, no external ears. Adults ~5 ft, 200 lbs.',
      behavior: 'Hauls out on rocks + sandbars. Curious — may "spy hop" near boats.',
      population: 'Year-round Maine resident. Population recovered + stable (~30K+ Maine coast).',
      regulation: 'Federally protected (MMPA). Minimum approach distance 50 yds. Do NOT feed.' },
    { id: 'gray-seal', name: 'Gray Seal', sci: 'Halichoerus grypus', emoji: '🦭',
      idMarks: 'Larger than harbor seal. "Horse-head" profile. Males up to 800+ lbs.',
      behavior: 'Hauls out in larger groups than harbor seals. Aggressive feeders on cod, herring, mackerel.',
      population: 'Returning after near-extirpation; now ~30K+ Northeast US. Maine population growing.',
      regulation: 'MMPA-protected. Conflict with fishermen growing — seals damaging gear + competing for fish.' },
    { id: 'harbor-porpoise', name: 'Harbor Porpoise', sci: 'Phocoena phocoena', emoji: '🐬',
      idMarks: 'Smallest Maine cetacean (~5 ft). Dark gray-black; triangular dorsal fin. Often surfaces briefly with little splash.',
      behavior: 'Solo or small groups. Feeds on herring, mackerel, squid, small cod.',
      population: 'Year-round Maine resident.',
      regulation: 'MMPA + ESA concerns from bycatch in gillnet + sink-gillnet fisheries. Pinger requirements in effect.' },
    { id: 'minke-whale', name: 'Minke Whale', sci: 'Balaenoptera acutorostrata', emoji: '🐋',
      idMarks: 'Maine\'s smallest baleen whale (~30 ft). Black back, white underside, distinctive white wing-bands on flippers.',
      behavior: 'Often solo. May approach boats. Feeds on schooling fish + krill.',
      population: 'Common summer visitor.',
      regulation: 'MMPA-protected. Slow approach. Don\'t parallel-chase.' },
    { id: 'finback-whale', name: 'Fin Whale', sci: 'Balaenoptera physalus', emoji: '🐋',
      idMarks: 'Maine\'s most common large whale (~70 ft). Asymmetric jaw — right white, left dark.',
      behavior: 'Feeds on krill + small fish. Spends most time offshore.',
      population: 'Summer visitor to Gulf of Maine; endangered globally.',
      regulation: 'MMPA + ESA. NOAA whale-watching guidelines apply.' },
    { id: 'humpback', name: 'Humpback Whale', sci: 'Megaptera novaeangliae', emoji: '🐋',
      idMarks: 'Distinctive long flippers (up to 1/3 body length), knobby head, fluke-up dive. Individuals ID-able by tail markings.',
      behavior: 'Acrobatic — breaches + tail-slaps. Bubble-net feeding cooperatively.',
      population: 'Summer visitor; population recovering after commercial whaling. ~1000+ in Gulf of Maine.',
      regulation: 'MMPA-protected.' },
    { id: 'right-whale', name: 'North Atlantic Right Whale', sci: 'Eubalaena glacialis', emoji: '🐋',
      idMarks: 'No dorsal fin. Massive head with white callosities. Often shows fluke on dive.',
      behavior: 'Slow-moving surface feeder on copepods. Migrate Gulf of Maine to SE US calving grounds.',
      population: '~340 individuals total. CRITICALLY ENDANGERED.',
      regulation: 'Vessel speed restrictions (10 kt zones), seasonal closures, ropeless gear mandates. Reshapes lobster industry.' },
    { id: 'pilot-whale', name: 'Long-finned Pilot Whale', sci: 'Globicephala melas', emoji: '🐋',
      idMarks: 'Large (15-20 ft) member of dolphin family. All-black body, bulbous head, long flippers.',
      behavior: 'Highly social pods.',
      population: 'Mostly offshore visitors.',
      regulation: 'MMPA.' },
    { id: 'orca', name: 'Orca (Killer Whale)', sci: 'Orcinus orca', emoji: '🐋',
      idMarks: 'Iconic black + white pattern, massive dorsal fin (esp. males up to 6 ft tall).',
      behavior: 'Rarely seen in Maine — when sighted, news event.',
      population: 'Rare visitor.',
      regulation: 'MMPA.' },
    { id: 'dolphin-bottlenose', name: 'Common Bottlenose Dolphin', sci: 'Tursiops truncatus', emoji: '🐬',
      idMarks: 'Maine sightings rare but increasing with warming. Gray, hooked dorsal, ~10 ft.',
      behavior: 'Often surfs boat wakes.',
      population: 'Increasingly common climate visitor.',
      regulation: 'MMPA.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: TIDE PRIMER (essential nav knowledge)
  // ───────────────────────────────────────────────────────────
  var TIDE_PRIMER = [
    { id: 'basics', title: 'Tide Basics',
      body: 'Maine has semidiurnal tides: 2 highs + 2 lows daily, roughly 12.5 hours between same-state cycles. Mean range in Casco Bay ~9 ft; Eastport up to 25+ ft (Bay of Fundy). Tides driven by Moon (most) + Sun (less); maximum range at full + new moon ("spring tides"); minimum at quarter moons ("neap tides").',
      practical: 'Plan trips around tide for: shallow channel passage, fishing windows (slack), shellfish digging (low tide), launching at ramps.' },
    { id: 'rule-12', title: 'Rule of Twelfths (estimating water level)',
      body: 'Between high + low tide, water rises (or falls) in this pattern: 1/12 in first hour, 2/12 in second, 3/12 in third, 3/12 in fourth, 2/12 in fifth, 1/12 in sixth. So mid-tide depth is ~6/12 = HALF the range below high.',
      practical: 'If high tide is 4:00 + low is 10:00 + range is 9 ft, at 7:00 water has dropped ~4.5 ft from peak.' },
    { id: 'currents', title: 'Tidal Currents — Set + Drift',
      body: 'Tidal CURRENTS are different from tidal HEIGHTS. Currents lag high/low by ~3 hours typically. Maximum flood current is mid-flood; max ebb is mid-ebb. Slack (no current) coincides roughly with high + low.',
      practical: 'Current speed varies by location. Reversing Falls in Eastport: 8+ kt. Casco Bay typical: 0.5-1.5 kt.' },
    { id: 'slack-water', title: 'Slack Water Window',
      body: 'The brief (~30 min) period when current stops + reverses. Fishing improves: predators move into shallow water + baitfish hold without being swept downstream.',
      practical: 'Time your fishing trips to hit slack at productive spots. Many Maine guides build the day around tide stages.' },
    { id: 'wind-tide', title: 'Wind + Tide Interaction',
      body: 'Wind blowing against current makes much rougher water than either alone. "Wind-over-tide" can produce 6-ft standing waves in 20 kt SW wind on a flooding tide in Casco Bay. NW wind + flood is friendly; SW wind + ebb is rough.',
      practical: 'Check forecast wind direction + match to expected tide for safety call.' },
    { id: 'storm-surge', title: 'Storm Surge',
      body: 'Low pressure + onshore wind can push the high tide 1-4+ ft above predicted. King tides (highest astronomical tides of year) + storm surge = coastal flooding events.',
      practical: 'For coastal moorings: add 3-5 ft of pennant scope before predicted nor\'easter.' },
    { id: 'tide-tables', title: 'Where to Get Tide Data',
      body: 'NOAA Tides + Currents (tidesandcurrents.noaa.gov) — primary station: Portland, ME. Free + authoritative. Subordinate stations for other harbors.',
      practical: 'Print weekly tide table. Phone apps (DeepZoom, Tide Charts Free) cache for offline.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: REFERENCE BIBLIOGRAPHY (curated reading list)
  // ───────────────────────────────────────────────────────────
  var BIBLIOGRAPHY = [
    { id: 'cod', authors: 'Kurlansky, Mark', year: 1997, title: 'Cod: A Biography of the Fish That Changed the World',
      type: 'book', notes: 'Foundational popular history of cod fisheries. Required reading for fishery managers.' },
    { id: 'lobster-trap', authors: 'Corson, Trevor', year: 2004, title: 'The Secret Life of Lobsters',
      type: 'book', notes: 'Maine lobsterman + biologist interweave. Great intro to lobster biology + Maine\'s industry.' },
    { id: 'maine-lobster', authors: 'Acheson, James M.', year: 1988, title: 'The Lobster Gangs of Maine',
      type: 'book', notes: 'Anthropology of Maine lobstering communities. Why zone councils + harbor gangs work.' },
    { id: 'pershing-2015', authors: 'Pershing, A. J. et al.', year: 2015,
      title: 'Slow adaptation in the face of rapid warming leads to collapse of the Gulf of Maine cod fishery',
      type: 'journal', journal: 'Science 350:809-812',
      notes: 'Definitive paper on Gulf of Maine warming + cod collapse.' },
    { id: 'glandner-2015', authors: 'Le Bris, A., et al.', year: 2018,
      title: 'Climate vulnerability + resilience in the most valuable North American fishery (American lobster)',
      type: 'journal', journal: 'PNAS 115:1831-1836',
      notes: 'Climate vulnerability of Maine lobster.' },
    { id: 'practical-navigator', authors: 'Bowditch, N.', year: '1802 (regularly updated)',
      title: 'The American Practical Navigator', type: 'book',
      notes: 'The standard work. NOAA publishes free updated editions. Every USCG-licensed officer studies this.' },
    { id: 'colregs-text', authors: 'IMO / US Coast Guard', year: '1972/1977',
      title: 'COLREGS — Convention on the International Regulations for Preventing Collisions at Sea',
      type: 'regulation', notes: 'The treaty text + USCG-published amplifying material. Required for licensing.' },
    { id: 'wabanaki-reach', authors: 'Wabanaki REACH', year: 'ongoing',
      title: 'Wabanaki REACH curriculum', type: 'curriculum',
      url: 'wabanakireach.org', notes: 'Maine\'s leading Wabanaki history + culture education resource.' },
    { id: 'maine-indian-edu', authors: 'Maine Department of Education', year: 'ongoing',
      title: 'Maine Indian Education curriculum (LD 291)', type: 'curriculum',
      notes: 'Required Maine K-12 Wabanaki content per state law since 2001.' },
    { id: 'gmri', authors: 'Gulf of Maine Research Institute', year: 'ongoing',
      title: 'GMRI Annual State of the Gulf of Maine report', type: 'report',
      url: 'gmri.org', notes: 'Annual science synthesis. Plain-language for general audiences.' },
    { id: 'dmr-website', authors: 'Maine Department of Marine Resources', year: 'ongoing',
      title: 'Maine DMR website + publications', type: 'state', url: 'maine.gov/dmr',
      notes: 'Source-of-truth for current Maine state-waters fishery rules.' },
    { id: 'noaa-fisheries', authors: 'NOAA Fisheries', year: 'ongoing',
      title: 'NOAA Fisheries Northeast Region', type: 'federal', url: 'fisheries.noaa.gov/region/new-england-mid-atlantic',
      notes: 'Stock assessments, rules, climate vulnerability.' },
    { id: 'maine-sea-grant', authors: 'Maine Sea Grant', year: 'ongoing',
      title: 'Maine Sea Grant publications + extension', type: 'university', url: 'seagrant.umaine.edu',
      notes: 'UMaine-affiliated; bridges research + working waterfront.' },
    { id: 'island-institute', authors: 'Island Institute', year: 'ongoing',
      title: 'Island Institute working waterfront program', type: 'ngo', url: 'islandinstitute.org',
      notes: 'Rockland, ME nonprofit. Climate, fisheries, working-waterfront preservation.' },
    { id: 'bigelow-lab', authors: 'Bigelow Laboratory for Ocean Sciences', year: 'ongoing',
      title: 'Bigelow Lab research', type: 'research', url: 'bigelow.org',
      notes: 'East Boothbay, ME. Ocean acidification + biogeochemistry research.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: LESSON PLAN TEMPLATES (for teachers)
  // ───────────────────────────────────────────────────────────
  var LESSON_PLANS = [
    { id: 'lp-1', title: '6th Grade: Buoyage 101 (60 min lesson)',
      grade: '6', subject: 'Marine Science / Place-Based Geography',
      objectives: [
        'Identify the four IALA-B lateral marks by shape + color',
        'Apply "red-right-returning" rule to a chart scenario',
        'Explain why color + shape redundancy supports colorblind navigators'
      ],
      materials: ['FisherLab Buoyage tab', 'Printable Casco Bay chart excerpt', 'Cardboard nun + can models'],
      flow: '5 min hook (video: Maine harbor entrance) → 15 min direct teach (Buoyage tab) → 20 min sim activity (FisherLab 3D sim Mission 1) → 15 min reflection (chart-marking worksheet) → 5 min exit ticket',
      assessment: 'Exit ticket: 3 questions on red-right-returning + cardinal marks. Sim accomplishment of Mission 1.',
      crosscuts: ['Science: light + color', 'Math: angles + bearings', 'Civics: international cooperation (IALA treaty)'] },
    { id: 'lp-2', title: '7th Grade: Stewardship + V-Notch (90 min)',
      grade: '7', subject: 'Marine Science / Civics',
      objectives: [
        'Explain how v-notching protects breeding biomass',
        'Trace the history of Maine\'s self-enforced conservation',
        'Compare top-down vs bottom-up fishery management'
      ],
      materials: ['FisherLab License + Conservation tabs', 'Real v-notched lobster tail (if available, frozen from supplier)', 'Lobsterman guest speaker recommended'],
      flow: '10 min hook (lobsterman story) → 20 min direct teach → 30 min sim Mission 2 (apprenticeship + v-notching) → 20 min group discussion → 10 min closure',
      assessment: 'Pair-share + Mission 2 conservation score.',
      crosscuts: ['Civics: self-governance', 'Biology: reproduction + biomass', 'Economics: tragedy-of-the-commons reversal'] },
    { id: 'lp-3', title: '8th Grade: Climate Impact Inquiry (90 min, plus optional field trip)',
      grade: '8', subject: 'Earth Science / Marine Science',
      objectives: [
        'Read + interpret Pershing 2015 (cod-warming linkage) at age-appropriate level',
        'Connect Gulf of Maine warming to species range shifts',
        'Predict near-future Maine fishery trends based on data'
      ],
      materials: ['FisherLab Climate tab', 'Pershing 2015 figure 1 + 2 (or GMRI summary)', 'Local fisherman audio interviews'],
      flow: '10 min current event reading → 25 min data inquiry (chart climate-vulnerability scores by species) → 30 min sim (Mission 5 Storm Run) → 20 min Socratic seminar → 5 min closure',
      assessment: 'Climate impact prediction essay (1 page).',
      crosscuts: ['Climate science', 'Statistics + regression', 'Maine-specific case study'] },
    { id: 'lp-4', title: 'High School: COLREGS Decision-Making (~2 class periods)',
      grade: '9-12', subject: 'Marine Science / Logic / Ethics',
      objectives: [
        'Identify the give-way + stand-on vessel in each of 6 standard COLREGS encounters',
        'Defend a decision after-the-fact using rules 13-18',
        'Recognize ambiguous situations requiring judgement (Rule 17 exception)'
      ],
      materials: ['FisherLab COLREGS tab', 'Day-shapes + lights flashcards', 'YouTube collision case-study videos'],
      flow: 'Day 1: 90 min — direct teach + flashcard practice + Mission 6 sim. Day 2: 90 min — case studies + debate + assessment.',
      assessment: 'Case-study analysis (1 page) + Mission 6 result.',
      crosscuts: ['Logic', 'Ethics', 'Decision-theory', 'Civics'] },
    { id: 'lp-5', title: 'High School: Wabanaki Sea-Run Stewardship (~3-4 class periods + community visit)',
      grade: '9-12', subject: 'Social Studies / Maine Indigenous History',
      objectives: [
        'Describe the four Wabanaki nations + their traditional territories',
        'Connect dam removals to sea-run fish recovery + cultural revival',
        'Identify modern tribal-sovereignty issues in Maine fisheries'
      ],
      materials: ['FisherLab Wabanaki tab', 'Wabanaki REACH curriculum materials', 'Penobscot Nation cultural educator (invited speaker)', 'Damariscotta Mills alewife fishway field trip (May)'],
      flow: 'Spread over 1-2 weeks. Combine direct teach + primary-source readings (tribal websites, Wabanaki REACH) + ideally a community visit + speaker.',
      assessment: 'Research project on one Maine river\'s restoration story (Penobscot, Sheepscot, etc.).',
      crosscuts: ['Maine Indian Education (LD 291 compliance)', 'History', 'Ecology', 'Civics', 'Treaty law'] }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: WATER COLUMN BIOLOGY
  // ───────────────────────────────────────────────────────────
  var WATER_COLUMN = [
    { zone: 'Surface (0-5 m)', light: 'Bright',
      species: 'Pelagic forage (mackerel, herring, alewife, smelt), surface predators (striper, bluefish, tuna feeding at surface), seabirds working from above.',
      indicators: 'Birds working = bait at surface = predator opportunity below.' },
    { zone: 'Sub-surface (5-30 m)', light: 'Bright to dim',
      species: 'Striper holding on structure, mid-water schools of pollock, mackerel, occasional cod when feeding upward.',
      indicators: 'Sonar shows scattered marks; fish often hold near bottom features rising into this zone.' },
    { zone: 'Mid-water (30-100 m)', light: 'Dim',
      species: 'Adult cod cruising, pollock, hake, schools of redfish near ledges.',
      indicators: 'Sonar shows clean bottom + suspended fish marks. Jigging zone.' },
    { zone: 'Deep (100-300 m)', light: 'Twilight',
      species: 'White hake, cusk, redfish, monkfish on bottom, wolffish in caves, deep-water shrimp historically.',
      indicators: 'Heavy gear required. Slow boat speeds on drift.' },
    { zone: 'Continental Slope (300+ m)', light: 'Dark',
      species: 'Tilefish, deep-water sharks, halibut at the edge, gas-rich deep-sea bottomfish.',
      indicators: 'Long-line + commercial dragger territory. Not recreational.' },
    { zone: 'Benthic (on the seabed)', light: 'Variable',
      species: 'Lobster, crabs, scallops, clams (intertidal), flatfish (winter + yellowtail flounder), monkfish, hake on bottom.',
      indicators: 'Trap fishery, dredge fishery, bottom rod-and-reel.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MAINE MARITIME HISTORY (deep dive)
  // ───────────────────────────────────────────────────────────
  var MARITIME_HISTORY = [
    { era: 'Wabanaki Era (12,000+ years ago — 1600s)',
      events: [
        'Wabanaki Confederacy peoples (Penobscot, Passamaquoddy, Maliseet, Mi\'kmaq) developed sophisticated marine + estuarine resource management over millennia.',
        'Damariscotta + Whaleback oyster + shell middens — among the largest on the Atlantic coast — show 6,000+ years of sustained, sustainable harvest.',
        'Seasonal migrations: inland in winter (hunting + ice fishing); coastal in summer (shellfish, sea-run fish).',
        'Sea-run fish (alewife, shad, salmon, eel, sturgeon, smelt) sustained communities + brought marine nutrients inland.',
        'Wabanaki nations traded fish + furs along the coast + into the St. Lawrence.',
        'Spiritual + cultural relationships with marine species deeply intertwined with practical harvest.'
      ],
      cite: 'Maine Historical Society + Wabanaki oral history' },
    { era: 'European Contact + Colonial Era (1600s-1700s)',
      events: [
        'Basque + Portuguese cod fishermen visited Maine waters by 1500s, possibly earlier.',
        'English + French settlements concentrated on the coast for fishing + trade.',
        'Cod, salmon, herring become major export industries.',
        'Coastal land conflicts + disease outbreaks displaced Wabanaki peoples from large parts of traditional territory.',
        'Beaver Wars + King Philip\'s War (1675-1678) disrupted Wabanaki coastal access.',
        'Maine ports (Falmouth, Casco, York) ship cod + salt fish to West Indies + Europe.'
      ],
      cite: 'Penobscot Marine Museum + Maine Historical Society' },
    { era: 'Maine Statehood + Sailing Era (1800s)',
      events: [
        'Maine becomes a state in 1820 (separating from Massachusetts).',
        'Shipbuilding booms — Bath, Camden, Searsport, Castine all major shipyards.',
        'Maine builds half of all wooden vessels in US at peak.',
        'Cod + mackerel fisheries peak; tens of thousands employed.',
        'Sardine canning industry emerges (1860s) — Lubec + Eastport become "sardine capitals."',
        'Atlantic salmon collapses commercially by mid-1800s due to dams + pollution.',
        'Oysters become rare in Damariscotta due to overharvest + sedimentation.',
        'Granite + ice + lumber + fish + shipbuilding are Maine\'s "Big 5" economic pillars.'
      ],
      cite: 'Maine State Museum + Penobscot Marine Museum' },
    { era: 'Lobster Era (1800s-1900s)',
      events: [
        'Lobster initially considered "poor people\'s food" — fed to indentured servants + prisoners.',
        '1880s: Maine lobster canning industry peaks (eastern Maine).',
        '1900: Maine first state to establish lobster size limits.',
        '1907-1933: Lobster license requirements established.',
        '1920s-30s: Conservation movement establishes v-notching, escape vents.',
        '1933: First lobster wardens (predecessors of Marine Patrol).',
        '1960s-70s: Lobster zones + zone councils established.',
        '1985: V-notch becomes federal law.',
        '1990s: Maine landings climb above 25M lb annually.',
        '2010s-2020s: Maine landings exceed 100M lb annually at peak (climate + management both contributing).'
      ],
      cite: 'Maine Lobstermen\'s Association + Maine DMR + Maine Historical Society' },
    { era: 'Industrial Fisheries Era (1900s-1970s)',
      events: [
        'Steam + diesel trawlers replace sail; offshore fleet grows.',
        'Sardine canning peaks 1900s-1940s; over 75 canneries in Maine.',
        'Sardine industry collapses 1950s-70s due to canning automation + supply decline.',
        'Last Maine sardine cannery closes 2010 (Stinson, Prospect Harbor).',
        'Cod + groundfish landings rise then begin to decline in 1960s-70s.',
        'Magnuson Fishery Conservation + Management Act (1976) creates 200-nm EEZ + Regional Councils.',
        'New England Fishery Management Council formed.'
      ],
      cite: 'Maine Historical Society + NEFMC' },
    { era: 'Modern + Climate Era (1980s-present)',
      events: [
        '1992: Grand Banks cod collapse — moratorium imposed by Canada. Maine cod also severely depleted.',
        '1990s-2000s: Atlantic Sea Farms + commercial aquaculture grows.',
        '2010s: Climate warming becomes a defining narrative — black sea bass arrives, lobster shifts north.',
        '2012: Atlantic sturgeon listed as endangered (Gulf of Maine DPS).',
        '2015: Pershing et al. paper documents Gulf of Maine warming at ~4× global rate.',
        '2017: Penobscot River Restoration Project completion — major sea-run fish recovery effort.',
        '2020s: Right whale rules reshape lobster industry. Climate-positive aquaculture emerges. Tribal sovereignty conversations intensify.'
      ],
      cite: 'Pershing 2015, NEFSC, GMRI' },
    { era: 'Notable Maine Maritime Figures',
      events: [
        'Donald McKay — born in Nova Scotia, built fastest clipper ships in America (mid-1800s).',
        'Henry Hudson — sailed New York Harbor but also Maine coast 1609.',
        'Captain Will Stinson — last Maine sardine cannery operator (closed 2010).',
        'Linda Greenlaw — Maine swordfish captain (The Hungry Ocean, 1999) + author.',
        'Larry Wahl + the Lobsterman\'s Manual — long-time educator + author.',
        'Captain Frank Tarbox — apprentice-system reformer (1970s-90s).',
        'Susan Bartlett — first female Stonington lobsterman (1973).',
        'Carl Wilson — DMR lobster biologist, decades of stock assessment work.'
      ],
      cite: 'Various Maine maritime histories' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: ECOSYSTEM CASE STUDIES (deeper than CONSERVATION_CASES)
  // ───────────────────────────────────────────────────────────
  var ECOSYSTEM_CASES = [
    { id: 'cascading-cod', name: 'Cod-Mediated Trophic Cascade',
      summary: 'Removal of cod + other top predators in Gulf of Maine allowed lower-trophic species (especially crustaceans like green crab + American lobster) to thrive.',
      lessons: 'Top-down ecology really works. Predator collapse cascades through entire ecosystem. Lobster boom is partly an "ecological vacuum" effect.',
      implications: 'When/if cod recover, lobster + crab abundance may decline. Maine\'s lobster economy is partly dependent on continued depleted groundfish.',
      cite: 'Frank et al. 2005 Science + multiple NEFSC papers' },
    { id: 'green-crab', name: 'Green Crab Invasion + Clam Collapse',
      summary: 'Carcinus maenas (green crab) was introduced from Europe centuries ago + has thrived in warming Gulf of Maine. Devastates juvenile soft-shell clams + young oysters + eelgrass meadows.',
      lessons: 'Invasive species + climate change can compound. Native species + cultural fisheries collapse on multi-decade timescales.',
      implications: 'Clam flats town-managed in Maine, many declining. Some restoration via clam stocking + green crab trapping.',
      cite: 'Maine Sea Grant + DMR' },
    { id: 'eelgrass', name: 'Eelgrass Decline',
      summary: 'Eelgrass (Zostera marina) is foundation species for nursery habitat. Maine eelgrass declining due to wasting disease, propeller scarring, warming water.',
      lessons: 'Foundation species loss has cascading consequences. Eelgrass restoration is multi-decade + uncertain.',
      implications: 'Loss of nursery habitat = reduced recruitment of juvenile cod, scallops, bay scallops, striper.',
      cite: 'NOAA + Maine Sea Grant' },
    { id: 'mahogany', name: 'Atlantic Mahogany Quahog',
      summary: 'Maine\'s "mahogany quahog" (Arctica islandica) — a deep-water, long-lived clam — has the longest documented lifespan of any animal (~500 years documented).',
      lessons: 'Marine animals can live extraordinarily long. Slow growth + late maturity make populations vulnerable to overfishing.',
      implications: 'Fishery closed or restricted in some areas. Symbolizes Maine\'s deep-time marine biology.',
      cite: 'Wanamaker et al. 2008 Quat Sci Rev' },
    { id: 'puffin-restoration', name: 'Project Puffin (Atlantic Puffin Restoration)',
      summary: 'Atlantic puffins nearly extirpated from Maine by 1900 due to harvest. Stephen Kress + Audubon began restoration 1973 on Eastern Egg Rock. Decoy + recorded-call approach restored multiple colonies.',
      lessons: 'Conservation works. Multi-decade investment + clever ecology can restore lost species.',
      implications: 'Maine has thriving puffin colonies. Eastern Egg Rock + Petit Manan + Matinicus Rock all visitable on tours.',
      cite: 'Project Puffin (Audubon)' },
    { id: 'penobscot-dam', name: 'Penobscot Dam Removal',
      summary: 'Penobscot River Restoration Project (2004-2016) removed Great Works + Veazie dams + bypassed Howland Dam. Opened 1,000+ miles of habitat to sea-run fish.',
      lessons: 'Major river restoration is possible with multi-tribal + state + federal + ngo partnership. Tribal leadership essential.',
      implications: 'Increases in alewife, shad, salmon, sturgeon returns documented. Cascading ecosystem benefits.',
      cite: 'Penobscot River Restoration Trust' },
    { id: 'menhaden', name: 'Menhaden Industrial Fishery + Forage Recovery',
      summary: 'Atlantic menhaden harvested at industrial scale for reduction (fishmeal + oil). Stock declined 1990s-2010s; ASMFC tightened quotas. Stock recovering.',
      lessons: 'Forage fish are ecosystem foundation. Industrial-scale harvest needs ecosystem-aware quota math (ABLE — Atlantic menhaden Ecological Reference Points).',
      implications: 'More menhaden = more striped bass + tuna + bluefish forage; more whale food.',
      cite: 'ASMFC menhaden 2024' },
    { id: 'shellfish-toxin-monitoring', name: 'PSP + Closure Surveillance',
      summary: 'Maine DMR + Bigelow Lab run a sophisticated PSP toxin monitoring network. Weekly sampling + real-time alerts enable closures before consumer illness.',
      lessons: 'Public health surveillance is invisible infrastructure that prevents disasters.',
      implications: 'Maine has had no commercial PSP outbreaks since modern monitoring began. Stockpile of trust in seafood safety.',
      cite: 'Maine DMR + Bigelow' },
    { id: 'right-whale-gear', name: 'Right Whale + Gear Innovation',
      summary: 'North Atlantic right whale population dropped below 350. Fishing gear entanglement is leading mortality cause. New ropeless + breakaway gear systems being developed + tested.',
      lessons: 'Conservation pressure can drive technological innovation. Industry + research + government collaboration accelerates change.',
      implications: 'Maine lobster industry reshaping. Costs + adaptations rolling through fleet.',
      cite: 'NOAA Office of Protected Resources' },
    { id: 'climate-rangeshift', name: 'Black Sea Bass + Climate Range Shift',
      summary: 'Black sea bass have moved north into Maine waters as the Gulf has warmed. Maine landings up 10×+ in past decade. Stock + management still catching up.',
      lessons: 'Climate is rapidly rearranging Atlantic fisheries. State + federal management lags species distribution.',
      implications: 'Maine fishermen newly target black sea bass. Other species may follow.',
      cite: 'NEFSC climate vulnerability + Maine DMR' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: NAVIGATION MATH (compass, bearings, dead reckoning)
  // ───────────────────────────────────────────────────────────
  var NAV_MATH = [
    { id: 'compass-card', title: 'The Compass Card',
      body: 'Marine compass shows 360° around a card. 0°/360° = North; 90° = East; 180° = South; 270° = West. Card is liquid-filled + gimbaled so it stays level despite boat motion.',
      formula: 'Bearing = degrees clockwise from North to a target.' },
    { id: 'magnetic-true', title: 'Magnetic vs True Bearings',
      body: 'Magnetic compass points to magnetic north (variable + drifting). True north = actual geographic North Pole. Difference = "variation" or "declination." Maine variation ~16° W. Adjust: magnetic + W var = true.',
      formula: 'True = Magnetic - West Variation (Maine). Modern charts show both compass roses.' },
    { id: 'deviation', title: 'Compass Deviation (Vessel-Specific Error)',
      body: 'Boat\'s metal + electronics distort the magnetic field at the compass. "Deviation" varies by heading + must be recorded on a "deviation card." Adjusters professional swing compass.',
      formula: 'Compass + Deviation = Magnetic. Magnetic + Variation = True. Mnemonic: "Can Dead Men Vote Twice" (Compass, Deviation, Magnetic, Variation, True).' },
    { id: 'speed-time-distance', title: 'Speed-Time-Distance Triangle',
      body: 'Distance = Speed × Time. Speed in knots (nautical miles per hour); Time in hours; Distance in nautical miles.',
      formula: 'D = S × T. Or S = D/T. Or T = D/S. 1 nm = 1.15 statute miles = 1.85 km.' },
    { id: 'dead-reckoning', title: 'Dead Reckoning',
      body: 'Plot course + distance run since last known fix. "DR" position is your best estimate when GPS is unavailable. Always includes adjustments for current set + drift.',
      formula: 'New position = old position + (course × time × speed). Plot on chart with course-line + distance markings.' },
    { id: 'plotting-fix', title: 'Plotting a Fix from Two Bearings',
      body: 'Take a compass bearing to landmark A. Draw a line on chart from A at the reciprocal bearing. Repeat for landmark B. Where lines cross = your position.',
      formula: 'Reciprocal bearing = original + 180° (or -180°). Use a parallel ruler + plotter to draw on chart.' },
    { id: 'set-drift', title: 'Set + Drift (Current Correction)',
      body: 'Set = direction current is flowing TO. Drift = speed. Boat\'s actual course over ground (COG) = vector sum of boat heading + current.',
      formula: 'When current pushes you sideways, increase heading upcurrent to compensate. Tide tables give predicted set + drift.' },
    { id: 'distance-horizon', title: 'Distance to Horizon',
      body: 'Earth curves. From a height "h" above sea level, horizon is at distance d ≈ 1.17 × √h (in nm, h in ft).',
      formula: 'd_nm ≈ 1.17 × √(height_ft). Example: 10 ft eye height → 3.7 nm horizon. Lighthouse 100 ft → 11.7 nm visible.' },
    { id: 'lat-long', title: 'Latitude + Longitude Notation',
      body: 'Lat: ° N or S of equator (0-90°). Lon: ° E or W of prime meridian (0-180°). Each ° = 60 minutes (\') = 3600 seconds (\').',
      formula: 'Maine: ~43-47° N, 67-71° W. Modern GPS gives decimal-degree notation (43.6571° N, 70.2476° W).' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MAINE FISHING + AQUACULTURE FAMILIES (oral histories)
  // ───────────────────────────────────────────────────────────
  // Each "profile" represents a TYPE of multigenerational Maine
  // family/operation. Specific names anonymized; representative
  // of broad pattern Maine families share.
  var FAMILY_PROFILES = [
    { generation: 'Generations 1-2 (1920s-1940s)',
      story: 'Great-grandfather + grandfather built family wharf + workshop, ran wooden boats, set 200-400 lobster traps by hand-haul, fished cod inshore. Lived close to water, scarce cash, lots of barter, deeply community-rooted.',
      tools: 'Wooden traps with cotton webbing, sail + later diesel inboard, hand-hauled gear, no electronics.',
      catch: 'Lobster + cod + winter flounder + herring. Sold to local cannery + buyer.',
      lessons: 'Multi-generation continuity. Community-managed flats + harbor gangs. Pre-license tier era.' },
    { generation: 'Generations 3 (1950s-1970s)',
      story: 'Father took over: power-hauler revolution lets one fisherman work 600-1000 traps. Sardine canning still major employer for kids + women in community. Cod still abundant but starting decline.',
      tools: 'Power-hauler hydraulic; better radar + nav electronics; outboard winches.',
      catch: 'Lobster + cod. Sardine work on shore for some family.',
      lessons: 'Mechanization changes the labor + crew structure. Limited-entry license era beginning.' },
    { generation: 'Generation 4 (1980s-2000s)',
      story: 'Current generation: full Class I license (after 2-year apprenticeship). 800 traps. Cod gone or restricted. Bluefin tuna a side income in summer. Heated debate about climate, right whales, gear changes.',
      tools: 'GPS chartplotter, digital sonar, computer-controlled trap-warp count, banded radios.',
      catch: 'Lobster (~90% income). Tuna + striper (~10%). No more cod.',
      lessons: 'Capital-intensive operation; significant debt to enter; zone councils + state DMR very involved in operations.' },
    { generation: 'Generation 5 (2010s-present)',
      story: 'Grandchildren may + may not stay in lobstering. Some pivoting to aquaculture (LPA leases, kelp partnerships with Atlantic Sea Farms). Climate + market uncertainty cause family debates.',
      tools: 'Real-time NERACOOS data on phone, drone surveillance of gear, RFID-tagged traps.',
      catch: 'Diversified: lobster + aquaculture seasonal stack.',
      lessons: 'Climate adaptation + diversification + tribal-sovereignty conversations becoming normal. Industry transforming.' },
    { type: 'Aquaculture-Pioneer Family',
      story: 'Different track: family started oyster farming on Damariscotta in 1990s. 1-acre LPA at first, expanded to 5-acre standard. Mom + dad operate; both kids interested. Restaurant accounts + farmers market direct.',
      tools: 'Outboard skiff, oyster cages + tumblers, walk-in cooler at packing shed, direct-to-consumer email list.',
      product: 'Branded oysters under named operation. Premium prices.',
      lessons: 'Aquaculture can be a family business with intergenerational possibility. Direct sales doubles farm income.' },
    { type: 'Kelp Diversification Family',
      story: 'Lobstering family added 3-acre kelp lease in 2018. Atlantic Sea Farms buys all kelp. Winter income smooths cash flow. No additional boat or major investment needed.',
      tools: 'Same lobster boat, kelp longlines + buoys.',
      product: 'Sugar kelp + winged kelp.',
      lessons: 'Kelp + lobster + Maine winter = climate-resilient income stack. Industry-strategic for working waterfront preservation.' },
    { type: 'Tribal Aquaculture Initiative',
      story: 'Passamaquoddy Tribe restarted shellfish + seaweed harvest 2010s. Trial aquaculture in tribal-claim waters. Tribal-led, partnered with UMaine Sea Grant + Bigelow Lab.',
      tools: 'Tribal-owned boats; collaboration with hatcheries.',
      product: 'Multiple — kelp + clam + experimental species.',
      lessons: 'Sovereignty + science + economic development converge in tribal aquaculture. Will shape Maine\'s industry future.' },
    { type: 'Charter Fishing Family',
      story: 'Coastal Maine family running summer striper + groundfish charters out of Boothbay. Captain has USCG OUPV; multi-generational customer base. Slow off-season balanced by family farm work + retail.',
      tools: 'Charter sportfishing boat 38 ft. Heavy rods, electronics, mate.',
      product: 'Trips. Memorable experiences.',
      lessons: 'Tourism-fishing is climate-resilient + value-added. Captain license + customer service skills critical.' },
    { type: 'Female-Led Operation',
      story: 'Maine has growing cohort of female captains + farmers. Linda Greenlaw (swordfish), Susan Bartlett (lobsterman), many aquaculture operators. Still minority but visible + influential.',
      tools: 'Same as male peers; gear designed for upper-body strength still a gap area.',
      product: 'Multi-species.',
      lessons: 'Maine fishing + aquaculture are gendered legacies; current generation is reshaping that.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MAINE FISHING ETHICS + SPORT
  // ───────────────────────────────────────────────────────────
  var ETHICS = [
    { id: 'release-mortality', title: 'Catch-and-Release Mortality',
      body: 'Released fish die at varying rates depending on species, handling, gear. Cod released from deep water: 25-50% die from barotrauma. Striper from rod-and-reel handled gently + released quickly: <5% mortality.',
      practical: 'Use circle hooks. Minimize handling time. Don\'t lift large fish vertically. Keep fish in water during photos. Use proper release devices for barotrauma fish.' },
    { id: 'spawning-respect', title: 'Spawning Aggregation Respect',
      body: 'Fishing on spawning aggregations is hugely destructive — fish are concentrated + reproductive opportunity is being eliminated simultaneously. Most jurisdictions close these areas seasonally.',
      practical: 'If you stumble onto a school of obviously-pregnant fish, leave them alone. Personal ethic.' },
    { id: 'native-species', title: 'Native vs Invasive',
      body: 'Don\'t release green crabs alive. Don\'t move ballast water between bays. Don\'t release aquarium fish.',
      practical: 'Aware boater = ecosystem-friendly boater.' },
    { id: 'fair-chase', title: 'Fair-Chase Ethics',
      body: 'Sport-fishing tradition includes "fair-chase" ethics: give fish a sporting chance. Don\'t snag. Don\'t use prohibited methods. Use appropriate tackle.',
      practical: 'Tournament rules codify fair-chase. Personal ethic counts more.' },
    { id: 'commercial-recreational', title: 'Commercial vs Recreational Conflict',
      body: 'Sometimes recreational + commercial fleets compete for same fish. Maine\'s zone councils + ASMFC + NEFMC try to balance. Civility on the water + at hearings helps.',
      practical: 'Respect commercial fishermen as community + economic anchors. Respect recreational as access + species advocates.' },
    { id: 'subsistence-rights', title: 'Subsistence + Treaty Rights',
      body: 'Wabanaki nations hold subsistence + ceremonial fishing rights. These take precedence over recreational rules in tribal-claim waters.',
      practical: 'Educate yourself on tribal rights before fishing in Wabanaki territory. Respect signs + closures.' },
    { id: 'kid-engagement', title: 'Including Kids',
      body: 'Best ethics: include kids in catch decisions. Explain why you released that fish. Build the next generation of stewards.',
      practical: 'Photo + release is more memorable than fillet + grill — kids talk about released fish for years.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: FAMOUS MAINE FISHING SPOTS
  // ───────────────────────────────────────────────────────────
  var FISHING_SPOTS = [
    { name: 'Cashes Ledge', region: 'Offshore Massachusetts Bay',
      coords: '~42°55\' N, 68°40\' W (offshore)',
      species: 'Cod (historically), striped bass, bluefin tuna, deep-water rockfish',
      character: 'Underwater mountain rising from 400 ft to 40 ft from surface. One of the most productive offshore spots historically. Now partly closed to protect spawning cod.',
      practical: 'Outside state-waters; requires offshore-capable boat + experience. Federally managed zones + closures.' },
    { name: 'Stellwagen Bank', region: 'South Gulf of Maine',
      coords: '~42°15\' N, 70°20\' W',
      species: 'Cod, haddock, pollock, striped bass, bluefin tuna',
      character: 'Underwater plateau extending NE from Cape Cod. National Marine Sanctuary. Famous whale-watching grounds too.',
      practical: 'Boundary lines important; check NOAA charts.' },
    { name: 'Jeffreys Ledge', region: 'New Hampshire / Maine border offshore',
      coords: '~42°50\' N, 70°25\' W',
      species: 'Cod, haddock, pollock, hake',
      character: 'Submerged ridge running NE-SW. Productive groundfishing.',
      practical: 'Mostly federal water. Check current quotas + open seasons.' },
    { name: 'Halfway Rock', region: 'Casco Bay (Portland)',
      coords: '~43°39\' N, 70°02\' W',
      species: 'Cod (declining), pollock, striper, mackerel, lobster',
      character: 'Iconic Casco Bay landmark. Granite outcrop midway from Portland to outer bay. Productive nearshore fishing.',
      practical: 'Approach from Custom House Wharf or East End boat ramp. Watch for ledge + tide.' },
    { name: 'Mount Desert Rock', region: 'Offshore Acadia / Bar Harbor',
      coords: '~43°58\' N, 68°08\' W',
      species: 'Cod (historic), pollock, redfish, whale-watching',
      character: 'Lonely small island 25 nm offshore. College of the Atlantic field station.',
      practical: 'Offshore-grade boating only. Whale-friendly approach guidelines.' },
    { name: 'Penobscot River Mouth (Castine)', region: 'Penobscot Bay',
      species: 'Striped bass, alewife (spring runs), shad (declining), lobster',
      character: 'Estuary where Penobscot meets Penobscot Bay. Wabanaki traditional fishing grounds.',
      practical: 'Strong tidal currents at change. Cooperate with Penobscot Nation regulations.' },
    { name: 'Damariscotta River', region: 'Midcoast Maine',
      species: 'Striper, alewife (spring), eel (elver season), aquaculture oysters',
      character: 'World-class oyster aquaculture water + small striper fishery. Damariscotta Mills alewife run is historic event.',
      practical: 'Narrow channel; respect aquaculture leases + alewife fishway.' },
    { name: 'Eastport Reversing Falls', region: 'Far Eastern Maine',
      species: 'Bait-fish + striper + tuna (offshore)',
      character: 'World\'s 2nd-largest tidal range. Current up to 8 kt. Old Sow whirlpool nearby.',
      practical: 'Not for novices. Local pilot recommended.' },
    { name: 'Mosquito Lake (inland salmon)', region: 'Penobscot watershed',
      species: 'Atlantic salmon (no-kill), brook trout',
      character: 'Restoration zone for endangered Atlantic salmon. Tag-and-release research only.',
      practical: 'Strict regulations. ESA-protected species. Some catch-and-release for science permits only.' },
    { name: 'Sebago Lake', region: 'Inland (south)',
      species: 'Landlocked salmon, lake trout, brook trout, brown trout',
      character: 'Maine\'s deepest lake. Ice fishing tradition.',
      practical: 'Different rules from saltwater. Inland Fisheries + Wildlife jurisdiction.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: KNOT-TYING STEP-BY-STEP (deeper than KNOTS array)
  // ───────────────────────────────────────────────────────────
  var KNOT_STEPS = [
    { id: 'bowline-detailed', name: 'Bowline — Step by Step',
      steps: [
        '1. Form a small "loop" (called the "rabbit hole") in the standing part of the line.',
        '2. Pass the working end UP through the loop from underneath. (The rabbit comes out of the hole.)',
        '3. Pass the working end behind the standing part. (Around the tree.)',
        '4. Pass the working end back DOWN through the same loop. (Back into the hole.)',
        '5. Pull standing part + loop to tighten. The bowline is set.'
      ],
      check: 'The resulting loop should not slip or close. There should be a "rabbit-eye" shape.' },
    { id: 'clove-detailed', name: 'Clove Hitch — Step by Step',
      steps: [
        '1. Wrap the working end of the line over the post (pile, rail) once.',
        '2. Cross the line over itself.',
        '3. Wrap the working end over the post a second time, crossing the line again.',
        '4. Tuck the working end UNDER the second wrap (between line + post).',
        '5. Pull both ends to tighten.'
      ],
      check: 'Two parallel wraps with the working end tucked. Quick + reliable temporary attachment.' },
    { id: 'cleat-detailed', name: 'Cleat Hitch — Step by Step',
      steps: [
        '1. Take a "round turn" — wrap line around the BASE of the cleat from the far side toward you.',
        '2. Cross the line OVER the top of the cleat to the opposite horn.',
        '3. Take a wrap around the far horn (figure-eight style).',
        '4. Continue figure-eight under the near horn back over.',
        '5. Finish with a locking overhand: take the working end + flip it back UNDERNEATH the previous wrap to lock.'
      ],
      check: 'Lines lie cleanly with no overlaps. The locking overhand secures without binding.' },
    { id: 'figure-eight-detailed', name: 'Figure-Eight Stopper — Step by Step',
      steps: [
        '1. Make a single loop near the end of the line.',
        '2. Take the working end OVER and BEHIND the standing line.',
        '3. Pass the working end through the original loop.',
        '4. Pull tight. The knot should look like the figure 8.'
      ],
      check: 'A simple knot bulkier than a single overhand. Prevents passing through hardware.' },
    { id: 'palomar-detailed', name: 'Palomar Knot (terminal fishing) — Step by Step',
      steps: [
        '1. Double the line + pass the doubled end through the eye of the hook.',
        '2. Tie a simple overhand knot with the doubled line, leaving the hook hanging.',
        '3. Pass the loop of doubled line OVER the hook.',
        '4. Pull both ends to tighten. Trim excess.'
      ],
      check: 'Strongest fishing knot. Retains ~95% line strength.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: SAFETY CHECKLISTS — print/laminate for boat use
  // ───────────────────────────────────────────────────────────
  var SAFETY_CHECKLISTS = [
    { title: 'Pre-Departure (every trip)',
      items: [
        'File float plan with someone ashore (where going, when returning, boat description, who is aboard)',
        'Check weather: current conditions + 6-hr forecast + small-craft advisories + frontal passages',
        'Check tide table + plan return for slack/flood/ebb advantage',
        'Fuel: full tank + reserve calculation (1/3 out, 1/3 back, 1/3 reserve)',
        'Engine oil + coolant + belts visually inspected',
        'Battery: ≥12.6V at rest; check connections',
        'Bilge pump functional; bilge dry',
        'Kill switch lanyard attached to operator',
        'Telltale check on engine start (cooling water stream)',
        'Sound signaling device (horn/whistle) accessible + working',
        'VHF radio Ch 16 monitored; test call to radio check if possible',
        'GPS plotter + charts loaded; backup paper chart aboard',
        'All persons assigned a PFD; children + nonswimmers wearing',
        'Required visual distress signals (flares) within date',
        'Anchor + rode ready + accessible',
        'First aid kit accessible',
        'Throwable Type IV PFD aboard if boat ≥16 ft',
        'Fire extinguisher inspected within date'
      ] },

    { title: 'Underway (continuous)',
      items: [
        'PFDs on for: children, nonswimmers, all hands in rough water, all hands at night, all hands in fog',
        'Maintain visual lookout 360° regularly',
        'Monitor VHF Ch 16',
        'Speed appropriate for conditions (Rule 6 — safe speed)',
        'Engine gauges normal (temp, oil, RPM)',
        'Bilge check every 30 min',
        'Position awareness — know your location on chart',
        'Wave direction managed — quartering vs head-on vs following sea',
        'Wake awareness — no wake near docks, anchored boats, swimmers',
        'COLREGS — give-way / stand-on clearly understood for each crossing',
        'Communicate intent — sound signals when overtaking or restricted-visibility',
        'Fatigue management — break passenger seating, hydrate, eat'
      ] },

    { title: 'Anchoring',
      items: [
        'Confirm holding ground (sand/mud good; rock + grass poor)',
        'Scope ratio 5:1 minimum (7:1 better, 10:1 in blow)',
        'Set anchor by reversing slowly with rode taut',
        'Check anchor set: 360° swing room from other boats + hazards',
        'Set anchor alarm on GPS if available',
        'Confirm anchor light at night',
        'Note bearings to fixed objects to check for drag',
        'Reset if drag detected'
      ] },

    { title: 'Fog Protocol',
      items: [
        'Reduce to safe speed (Rule 19 — restricted visibility)',
        'Post lookout (no other duties — eyes + ears only)',
        'Sound signal: power vessel underway = one long blast every 2 min max',
        'Sound signal: at anchor = bell rung 5 sec every minute (if ≥12m)',
        'Monitor VHF Ch 16',
        'Use radar if available; identify all targets',
        'Use GPS for position; mark known hazards',
        'Avoid narrow channels + busy shipping lanes if possible',
        'Have horn/whistle in hand; PFDs on all hands',
        'Anchor in a safe place + wait it out if conditions warrant'
      ] },

    { title: 'Crew Overboard',
      items: [
        'Shout "CREW OVERBOARD" + designate spotter (pointing finger at person)',
        'Hit MOB button on GPS (marks position)',
        'Maneuver — turn boat back (figure-8 or Williamson turn)',
        'Throw floatation (Type IV throwable + line if available)',
        'Approach upwind/upcurrent of person — drift down',
        'Engine in NEUTRAL when at person (avoid prop strike)',
        'Have boat hook + retrieval gear ready',
        'Stronger person in water as second rescuer if needed; secure with line',
        'Pull person aboard — recovery devices help (lifesling, MOB platform)',
        'Once aboard: warmth + dry clothes + medical attention as needed'
      ] },

    { title: 'Sinking / Taking Water',
      items: [
        'PFDs on everyone immediately',
        'MAYDAY call on VHF Ch 16 — position, vessel name, nature of distress, # persons',
        'Activate EPIRB if equipped',
        'Bilge pumps full power; identify source of water if possible',
        'Plug hole if visible (rags, cushions, anything to slow flow)',
        'Buckets / manual bailers — every hand bailing',
        'Prepare to abandon ship: life raft, ditch bag, flares',
        'Stay with boat as long as possible (boat = bigger target for search, more flotation)',
        'Stay together if abandoning — huddle/help posture'
      ] },

    { title: 'Fire',
      items: [
        'Cut fuel supply if possible (fuel shutoff valves)',
        'Get crew clear; PFDs on; ready life raft',
        'MAYDAY on VHF Ch 16',
        'Fire extinguisher — sweep base of fire (PASS — Pull, Aim, Squeeze, Sweep)',
        'If electrical: cut battery switch if accessible',
        'If grease galley fire: smother (do not water)',
        'Plan escape route off boat',
        'Abandon ship if uncontrollable'
      ] },

    { title: 'Lightning / Severe Storm',
      items: [
        'Run to safe harbor if time + distance allow',
        'Lower antennas + fishing rods',
        'Stay low in boat; avoid metal contact',
        'Disconnect electronics if possible',
        'Crew below if cabin available',
        'Avoid water contact (don\'t hold rails dipped in water)',
        'Wait 30 min after last thunder before resuming outdoor activity'
      ] },

    { title: 'Hypothermia Treatment',
      items: [
        'Get person out of cold/wet environment',
        'Remove wet clothing — replace with dry layers + blankets',
        'Insulate from cold surfaces (off floor)',
        'Warm trunk first (chest + abdomen) NOT extremities — central rewarming',
        'Mild hypothermia: warm sweet drinks + food if alert',
        'Moderate/severe: handle gently (cardiac risk), no rapid rewarming, evacuate',
        'CPR if no pulse — continue until medical help arrives (cold heart can be revived)',
        'Call 911 / VHF Ch 16 mayday for medical emergency at sea'
      ] },

    { title: 'End-of-Trip',
      items: [
        'Notify shore contact of safe return',
        'Wash deck + rinse engine with fresh water',
        'Drain bilge fully',
        'Charge batteries; cover boat',
        'Restock first aid + flares as needed',
        'Log trip: distance, fuel, time, catches, observations',
        'Engine maintenance schedule check — note hours for next service',
        'Trailer (if used): bearings, lights, tires checked next trip'
      ] }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: INVASIVE SPECIES — Gulf of Maine biological threats
  // ───────────────────────────────────────────────────────────
  var INVASIVES = [
    { name: 'European Green Crab (Carcinus maenas)',
      arrival: 'Introduced to US East Coast ~1817 via ship ballast or hull fouling. Reached Maine by mid-1900s. Population exploded in 1990s + 2000s as Gulf warmed.',
      impact: 'Voracious predator of soft-shell clam spat, juvenile mussels, eelgrass roots. Maine soft-shell clam landings have declined dramatically since green crab expansion — estimated $20M+/yr economic loss.',
      identification: 'Up to 4" carapace, 5 marginal teeth on each side of carapace, color variable (mostly dark green-mottled but can be red, orange, brown). Aggressive, fast.',
      management: 'Town clam committees trap + remove tens of thousands annually. Some experimental fisheries (crab cake products, soft-shell crab market, compost). Cold winters historically suppressed populations — climate warming reduces this natural control.' },

    { name: 'Asian Shore Crab (Hemigrapsus sanguineus)',
      arrival: 'First detected Maine ~2005. Spreading rapidly since.',
      impact: 'Competes with green crabs + native species. Eats small invertebrates + mussel spat. Adds to invasive crab pressure.',
      identification: 'Smaller than green crab (~1.5" carapace). Square-shaped carapace. Banded legs. 3 marginal teeth (vs 5 in green crab).',
      management: 'No effective control. Monitoring + research ongoing.' },

    { name: 'Codium fragile (Dead Man\'s Fingers)',
      arrival: 'Invasive macroalga from Asia. Established Maine coast 1980s+. Spreading.',
      impact: 'Outcompetes native kelp + rockweed. Forms thick mats that smother shellfish + reduce habitat complexity. Detaches in storms + can foul beaches.',
      identification: 'Dark green branched seaweed, finger-like growth, slippery texture.',
      management: 'Mechanical removal in some areas. Difficult to eradicate once established.' },

    { name: 'Membranipora membranacea (Lacy Crust Bryozoan)',
      arrival: 'Spread to Atlantic from Pacific. Maine coast established 1980s+.',
      impact: 'Coats kelp blades, weakens them, increases breakage in storms. Contributes to kelp forest decline. Reduces habitat for kelp-dependent species.',
      identification: 'Tiny white lacy crust covering kelp blades.',
      management: 'No direct control. Kelp populations recovering depend partly on biological controls + cooler water that bryozoans prefer less.' },

    { name: 'Botrylloides violaceus (Chain Tunicate)',
      arrival: 'Invasive sea squirt. Established Maine 1990s+.',
      impact: 'Fouls dock pilings, aquaculture gear, mussel beds. Smothers native species. Major aquaculture maintenance burden — adds cost to gear cleaning.',
      identification: 'Orange or red colonial sea squirt forming flat mats on hard surfaces underwater.',
      management: 'Pressure-wash gear, dry-out cycles, vinegar treatment in some applications.' },

    { name: 'Vibrio parahaemolyticus + Vibrio vulnificus',
      arrival: 'Native bacteria but populations expanding with warmer water.',
      impact: 'Public health risk in raw shellfish during warm months. State-mandated harvest restrictions during high-temperature periods. Affects shellfish industry — both food safety + consumer confidence.',
      management: 'Time + temperature controls on harvest. Cool shellfish within hours of harvest. FDA-required handling protocols. Risk increasing with climate.' },

    { name: 'Sea Lampreys',
      arrival: 'Native to Maine but with restoration of fish ladders + dam removals, populations now reaching watersheds where they were absent for decades.',
      impact: 'Parasitic on lake trout + other freshwater fish in Great Lakes (notorious there). In Maine context: more complex — native sea-run population that has cultural + ecosystem significance vs landlocked populations that can devastate.',
      management: 'Differentiate populations. Maine generally protects sea-run lampreys (native + ecologically important); landlocked treated differently.' },

    { name: 'Black Sea Bass (Centropristis striata)',
      arrival: 'Historically rare north of Massachusetts. Population shifting north into Gulf of Maine 2010s+ due to warming.',
      impact: 'Not technically "invasive" (native to East Coast) but range-shifting. New species mixing with native communities; ecological consequences uncertain. Recreational anglers welcome them; biologists watch ecosystem interactions.',
      management: 'Maine recreational regs now address black sea bass. Federal HMS management for commercial scale.' },

    { name: 'Asian Tunicate (Styela clava)',
      arrival: 'East Coast 1970s+. Reached Maine. Established.',
      impact: 'Fouling organism — competes with native mussel + sea squirt populations, fouls aquaculture gear.',
      identification: 'Long stalked sea squirt (5" stalk + body), often clustered.',
      management: 'Mechanical removal. Heat treatment of gear. Limited control options.' },

    { name: 'Didemnum vexillum (Carpet Tunicate)',
      arrival: 'Mid-2000s Maine. Spreading.',
      impact: 'Forms thick gel-like mats covering hard substrate. Smothers scallops, mussels, native invertebrates. Particularly damaging on Georges Bank where it impacts sea scallop habitat.',
      identification: 'Pale yellow/cream/white gelatinous mat with pin-prick incurrent siphons.',
      management: 'No effective wild-population control. Aquaculture: regular gear cleaning + acid treatment.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: STUDENT FAQ — common questions from middle-schoolers
  // ───────────────────────────────────────────────────────────
  var STUDENT_FAQ = [
    { q: 'Why can\'t I just keep every fish I catch?',
      a: 'Slot + size limits exist so fish reach reproductive age + replace themselves. Cod collapsed in 1992 partly because too many young fish were taken. Bag limits + slot limits = your share of a finite resource. Taking too much now means nothing for next year. Maine + federal regs are not arbitrary — they are based on stock assessments by NOAA + state biologists.' },
    { q: 'Why do lobstermen V-notch female lobsters?',
      a: 'A V-notch is a small triangular cut in the tail of an egg-bearing female. The notch tells every other lobsterman: this is a proven breeder, return her to the water for at least 3 years (until the notch grows out). Maine\'s lobster population stays healthy partly because of v-notching — a community-wide conservation tool not required by law in all states but practiced near-universally in Maine.' },
    { q: 'Why are right whales such a big deal?',
      a: 'North Atlantic right whales are down to ~340 individuals. They migrate through Gulf of Maine + Cape Cod Bay where they entangle in fishing gear (especially vertical buoy ropes for lobster + crab pots). Federal rules require Maine lobstermen to use weak-link gear + reduced rope + seasonal closures. Many lobstermen feel rules are too strict; many scientists feel rules are too weak. Both sides agree the whales need help — disagreement is on how much fishing must change.' },
    { q: 'Is commercial fishing dangerous?',
      a: 'Yes. Commercial fishing has one of the highest fatality rates of any US occupation — many times the average. Cold water + heavy gear + unpredictable weather + 14-hour days create real risk. Almost every Maine fishing community has lost people. Modern safety equipment (EPIRBs, immersion suits, life rafts) + training reduce but don\'t eliminate risk. Decisions about going out in marginal weather decide who comes home.' },
    { q: 'Can I make a living as a fisherman?',
      a: 'Possible but not easy. Lobster fishing is the strongest Maine path — Class III license takes 4–6 years of apprenticeship + has wait lists. Charter operations require USCG license + boat investment + customer marketing. Marine sciences (research, regulation, education) require degrees. Most successful entry stories include: starting young as crew, sticking with apprenticeships, building reputation, and saving capital for boat/license costs.' },
    { q: 'What do I need to legally fish in Maine?',
      a: 'Saltwater recreational: free saltwater registration via DMR + Maine resident if applicable. Saltwater commercial: commercial fishing license + species endorsements + landing permits. Lobster: tiered license (apprentice → student → Class I/II/III). Lobster license requires apprenticeship + log + community application. Freshwater fishing requires a Maine fishing license (resident/non-resident different). Always check current DMR + IF&W regs — they change.' },
    { q: 'How do I know if a fish is keeper-size?',
      a: 'Carry a measuring device (ruler, stretchy fish-measure, even a marked rod). Measure from tip of nose to fork of tail (FL) — confirm species rules (some use total length). When in doubt: release. Sublegal harvest = fine + reputation damage. State enforcement officers do dock checks. Wardens are not your enemy if you fish legally.' },
    { q: 'What\'s the difference between cod, haddock, and pollock?',
      a: 'All three are in the cod family (Gadidae) + look superficially similar. Cod: blunt head, slightly mottled gray-brown, small chin barbel. Haddock: black "thumbprint" on side, smaller eyes, no chin barbel. Pollock: greenish-gray, deeply forked tail, slightly different body shape. Field guides + practice make ID easier. Misidentification = wrong regs applied = trouble.' },
    { q: 'Should I keep or release a striper?',
      a: 'Depends on size + current regs. Striped bass have a "slot limit" in most northeast states — keep only fish within a defined range (e.g., 28–35"). Larger (older, breeding-age) fish must be released. Sublegal must be released. Circle hooks help avoid deep-hooking + improve release survival. Even "keeper" fish can be released — many anglers practice catch-and-release for conservation.' },
    { q: 'What\'s the most sustainable seafood to eat?',
      a: 'In Maine: farmed mussels + farmed oysters + farmed kelp are excellent — low ecological footprint, filter water, no feed inputs. Wild Maine pollock + haddock are reasonably managed. Wild Maine lobster currently sustainable but climate-stressed. Avoid: imported shrimp (mangrove destruction + labor concerns), bluefin tuna (overfished globally), shark (top predator depletion). Seafood Watch + Monterey Bay Aquarium have updated guides.' },
    { q: 'Why does fishing matter to Maine specifically?',
      a: 'Maine has 5,000+ miles of coastline + 30,000+ commercial fishing-related jobs + $1B+/yr value. Lobster alone is $400M+/yr. Coastal towns from Portland to Eastport are economically + culturally built around the water. Working waterfronts (commercial wharves, processing plants, fuel docks) are disappearing as gentrification pressure mounts. Saving fishing = saving coastal communities.' },
    { q: 'What if I don\'t want to fish but I love the ocean?',
      a: 'Many paths: marine biology, oceanography, coastal engineering, harbor management, marine education, fisheries regulation, aquaculture, marine policy, ocean conservation, marine art + writing, charter business operations, boatbuilding, marine electronics, sailmaking, dock construction, marine insurance. The ocean economy is huge + diverse.' },
    { q: 'How is climate change affecting Maine fish?',
      a: 'Gulf of Maine is warming ~4× faster than global ocean average. Effects: cod struggling (cold-water species), lobster moving north (shifting into Canadian waters), green crabs invading (warm-tolerant predators of clams + mussels), new species arriving (black sea bass, blueline tilefish further north), ocean acidification stressing shellfish larval shells. Adaptation is ongoing + uncertain.' },
    { q: 'Are there opportunities for Indigenous students in fishing?',
      a: 'Yes. Wabanaki peoples — Penobscot, Passamaquoddy, Maliseet, Mi\'kmaq, Abenaki — have fished + harvested shellfish in this region for ~13,000 years. Treaty rights affirm continued harvest. Tribal natural resource departments hire scientists, technicians, educators. Wabanaki students can also pursue any career path while maintaining cultural connection. Maine\'s LD 291 requires Wabanaki Studies in K-12 curriculum.' },
    { q: 'How do I get started if I want to try fishing?',
      a: 'Start small + safe: shore fishing or pier fishing first — no boat needed. Saltwater registration is free. Borrow gear from a friend or buy basic at any sporting-goods store. Learn 2–3 knots (improved clinch, palomar). Watch YouTube + read regs. Join a local fishing club. Maine has free family-fishing days at state parks. The community welcomes newcomers who fish ethically + with respect.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: NAVIGATION PROBLEMS — worked examples with full solutions
  // ───────────────────────────────────────────────────────────
  var NAV_PROBLEMS = [
    { id: 1, title: 'Basic Dead Reckoning — Time + Speed = Distance',
      problem: 'You depart Custom House Wharf at 0700 on a course of 095°M, speed 12 kt. The forecast destination, Halfway Rock, is 5.4 nm bearing 095°M from departure. Estimated arrival time?',
      knowns: 'Distance = 5.4 nm, Speed = 12 kt = 12 nm/hr',
      solve: 'Time = Distance / Speed = 5.4 / 12 = 0.45 hr = 27 min',
      answer: 'ETA at Halfway Rock = 0727. Captain should plan to arrive ~0727, with fuel reserve to abort if conditions deteriorate.',
      learning: 'Speed in kt is by definition nm/hr — math is straightforward. Watch for unit confusion (sm vs nm vs kt vs mph).' },

    { id: 2, title: 'Compass Bearing Fix — Two-Line Triangulation',
      problem: 'You are offshore and want a position fix. You sight Portland Head Light bearing 270°M and Halfway Rock bearing 040°M. How do you determine your position?',
      knowns: 'Bearing to PHL = 270°M, Bearing to HFR = 040°M',
      solve: 'On chart, from PHL, plot a line running 090° (reciprocal of 270°). From HFR, plot a line running 220° (reciprocal of 040°). Where they intersect is your position. This is a "two-line position fix" — basic navigation.',
      answer: 'Position = intersection of the two reciprocal lines on chart. Plot both lines, mark fix, label with time + bearings (e.g., "Fix 0815: PHL 270°/HFR 040°").',
      learning: 'You need RECIPROCAL of bearing from object back to you. Bearing TO an object is from you; reciprocal points FROM the object to you. Two-line fix has small error; three-line fix is more accurate (creates a triangle "cocked hat" of probable error).' },

    { id: 3, title: 'Current Effects on Course Made Good',
      problem: 'Your boat speed through water is 10 kt on a heading of 180°M. Tidal current is 2 kt setting east (090°). What is your actual course made good + speed over ground?',
      knowns: 'Boat speed (through water) = 10 kt @ 180°M; Current = 2 kt @ 090°',
      solve: 'Vector addition. Draw boat velocity vector (10 kt south). Add current vector (2 kt east). Resulting vector: south + east components. Magnitude = sqrt(10² + 2²) = sqrt(104) ≈ 10.2 kt. Direction: arctan(2/10) east of south = ~11° east of 180° = 169° (read clockwise) which translates to 169° — wait, let me re-orient. South = 180°. Adding east push moves direction toward east of south, which is toward LOWER angle values (closer to 90°/east). So actual course ≈ 180° − 11° = 169°.',
      answer: 'SOG ≈ 10.2 kt, COG ≈ 169°M. You drift 11° west of your intended south course. To make good 180°, you must steer ~191° to compensate.',
      learning: 'Current matters. A 20% cross-current produces a 10°+ steering correction. Over an hour of travel, you would be 2 nm off-course if you ignore it.' },

    { id: 4, title: 'Fuel Burn + Range — Reserve Calculation',
      problem: 'Your boat burns 8 gal/hr at 22 kt cruise. Fuel tank holds 80 gal. You always reserve 25% (USCG good-practice rule of "1/3 out, 1/3 back, 1/3 reserve"). What is your safe operating range?',
      knowns: 'Burn rate = 8 gph @ 22 kt; Tank = 80 gal; Reserve = 25% × 80 = 20 gal',
      solve: 'Usable fuel = 80 − 20 = 60 gal. Time on usable fuel = 60 / 8 = 7.5 hr. Range at cruise = 7.5 × 22 = 165 nm.',
      answer: 'Safe operating range = 165 nm round-trip (so 82.5 nm out + 82.5 nm back). Plan trips within this envelope.',
      learning: 'The "1/3 out, 1/3 back, 1/3 reserve" Navy/USCG rule is conservative but appropriate for unforgiving Maine waters. Fog, headwinds, mechanical issues can demand reserve.' },

    { id: 5, title: 'Tidal Window Planning',
      problem: 'You need to enter a shallow harbor with a 4-ft draft boat. Mean low water depth at the entrance is 3 ft. Tonight\'s tide: low at 1830, high at 0040 (next morning) with a range of 9 ft. You want safety margin of 2 ft under your keel.',
      knowns: 'Boat draft = 4 ft, Chart depth = 3 ft, Tide low 1830, High 0040, Range = 9 ft, Margin = 2 ft',
      solve: 'You need total depth = draft + margin = 4 + 2 = 6 ft. Chart shows 3 ft at MLW. So you need tide height ≥ 3 ft above MLW. Using the rule of twelfths (tide rises 1/12 in 1st hr, 2/12 2nd, 3/12 3rd, 3/12 4th, 2/12 5th, 1/12 6th hr): 3 ft is 33% of range (3/9). Reached at approximately 2.5 hr after low. So enter no earlier than 1830 + 2.5 hr = 2100, and depart again before 0040 + 2.5 hr = 0310.',
      answer: 'Safe window for entry: 2100–0310. Plan accordingly.',
      learning: 'The "rule of twelfths" is approximate but useful. Slack water + max current also matter for safety + fuel efficiency. Always cross-check with a real tide table app.' },

    { id: 6, title: 'Lateral Buoy Interpretation — IALA Region B',
      problem: 'You are returning to Portland Harbor from offshore. You see two buoys: red conical (nun) and green cylindrical (can). On which side should each pass?',
      knowns: 'IALA Region B (US): red on right when entering harbor, green on left.',
      solve: 'You are entering (returning to harbor). Therefore: red nun on your right (starboard), green can on your left (port).',
      answer: 'Red-right-returning (RRR). Keep red on starboard.',
      learning: 'This is the foundational rule of US buoyage. Memorize. Reversed in Europe (Region A — green on right returning).' },

    { id: 7, title: 'Cardinal Mark Identification',
      problem: 'You see a buoy with two black triangles pointing upward (▲▲), painted black on top, yellow on bottom. What does this mean?',
      knowns: 'Cardinal mark scheme: top-marks indicate direction; safe water lies in that direction.',
      solve: 'Two triangles pointing UP = "north" cardinal mark. Safe water lies NORTH of this mark. Coloring: black on top, yellow on bottom (mnemonic: "pointing up = black up").',
      answer: 'North cardinal mark. Pass on the NORTH side of the buoy (keep buoy to your south).',
      learning: 'Cardinal marks: N (▲▲ up), S (▼▼ down), E (◇ diamond), W (hourglass shape). Less common in Maine inshore than lateral; more common in narrow channels + offshore navigation.' },

    { id: 8, title: 'COLREGS — Crossing Situation',
      problem: 'You are powerboat A heading north at 10 kt. Powerboat B is approaching from your starboard (right) side heading west at 8 kt. Both at risk of collision in 4 minutes. Who is stand-on, who is give-way?',
      knowns: 'Rule 15 — Crossing situation: vessel with the other on her starboard side is the give-way vessel.',
      solve: 'B is on A\'s starboard. Therefore A (you) are the give-way vessel. You must take avoiding action — typically alter to starboard to pass behind B.',
      answer: 'You are give-way. Slow + turn starboard to pass astern of B. Maintain large + early action to be clearly seen.',
      learning: 'Rule 15: starboard has right-of-way in crossings. Action must be EARLY + LARGE so the stand-on vessel sees + understands. Last-minute small adjustments cause confusion + collisions.' },

    { id: 9, title: 'COLREGS — Sail vs Power',
      problem: 'You are in a 35-ft powerboat. A sailboat under sail is on a collision course. Who has right of way?',
      knowns: 'Rule 18 — sail has right-of-way over power except in special circumstances (overtaking, narrow channels for vessels >20m, etc.).',
      solve: 'Power gives way to sail under normal circumstances.',
      answer: 'You (power) must give way to sail. Alter course or slow. Sailboat is stand-on.',
      learning: 'Sail-over-power applies when sailboat is actively under sail. Sailboat under engine power is treated as a power vessel (Rule 25(e)). The boat-flag "cone point-down" technically signals sail-under-power but is rarely flown.' },

    { id: 10, title: 'Fog — Restricted Visibility Sound Signals',
      problem: 'Visibility drops to 0.25 nm in fog. You are underway in a 25-ft powerboat at 5 kt. What sound signal do you make + how often?',
      knowns: 'Rule 35 (a) — power vessels underway, making way, in restricted visibility: one prolonged blast (4–6 sec) at intervals not exceeding 2 minutes.',
      solve: 'One long blast (4–6 sec) every 2 min maximum interval. (Best practice: every 1 min in busy water.)',
      answer: 'One long blast (4–6 sec) at maximum 2-min intervals. Also: reduce to safe speed (Rule 19 c), post lookout, use radar if available, monitor VHF Ch 16.',
      learning: 'Fog signals matter; collisions in fog are common when one or both vessels do not signal. A radar reflector + radar-alarm + VHF watch are the modern complement.' },

    { id: 11, title: 'Set + Drift — Compass Correction',
      problem: 'You want to travel from A to B on a heading of 100°M. There is a 1.5 kt current setting south (180°). Your boat speed is 8 kt. What heading must you steer?',
      knowns: 'Desired track = 100°M, Current = 1.5 kt @ 180°, Boat speed = 8 kt',
      solve: 'Vector triangle. Current vector pushes you south; you must compensate by steering NORTH of your desired track. Approximation for small corrections: drift angle ≈ arcsin(current/boat_speed) × sin(angle between desired track + current). Current is perpendicular-ish to 100° track (90° offset roughly). Steering correction ≈ arcsin(1.5/8) × sin(80°) ≈ 10.8° × 0.98 ≈ 10.6°. Steer 100° − 11° = 089° to compensate.',
      answer: 'Steer 089°M to make good 100°M ground track.',
      learning: 'Cross-current correction is a vector problem. Approximate solutions OK for short legs; for longer legs, plot a triangle on chart. GPS COG/SOG modern shortcut, but understand the underlying math for backup.' },

    { id: 12, title: 'Speed Made Good Against Current',
      problem: 'Your boat speed through water is 18 kt. You are running directly into a 3 kt ebb tide current. What is your speed over ground?',
      knowns: 'STW = 18 kt, Current = 3 kt against you',
      solve: 'SOG = STW − current opposed = 18 − 3 = 15 kt. Or, with current with you: SOG = 18 + 3 = 21 kt.',
      answer: 'SOG = 15 kt into the current.',
      learning: 'Currents matter for ETA. A 6 hr trip with 3 kt opposing = 18 nm penalty vs slack water. Plan tide windows for efficiency.' },

    { id: 13, title: 'Visibility + Radar Range',
      problem: 'Visibility is 4 nm in haze. A target appears on radar 8 nm out, closing at relative speed 22 kt. At what time should you be visually able to identify the target?',
      knowns: 'Target 8 nm out, closing 22 kt, visibility 4 nm',
      solve: 'Distance to visibility threshold = 8 − 4 = 4 nm. Time to close 4 nm at 22 kt = 4/22 hr = 0.18 hr = 11 min.',
      answer: 'Visual contact in approximately 11 minutes.',
      learning: 'Radar gives you advance warning. Use the time for ID + planning. Cross-check radar range with visual + AIS if available.' },

    { id: 14, title: 'AIS — Closest Point of Approach',
      problem: 'AIS shows two vessels on collision course. Vessel A: 250 m at 020° relative, course 220° at 12 kt. Vessel B (you): course 040° at 10 kt. CPA?',
      knowns: 'Relative velocity components + relative position from AIS',
      solve: 'Modern AIS gives CPA directly — but conceptually, CPA = minimum distance during approach. If CPA < 0.5 nm in open water or < 0.25 nm in restricted area, action is required.',
      answer: 'Read CPA + TCPA directly from AIS display. Take avoiding action well before TCPA (Time to CPA).',
      learning: 'AIS is invaluable for offshore + harbor traffic. Even small craft increasingly carry transponders. Don\'t over-rely — radar + visual still primary.' },

    { id: 15, title: 'Anchor Scope — Length of Rode',
      problem: 'You anchor in 18 ft of water at low tide. Tidal range is 9 ft (so 27 ft at high tide). You want 7:1 scope ratio. How much anchor rode (chain + line) do you let out?',
      knowns: 'Max depth at high tide = 27 ft. From deck height add ~3 ft. Total depth from bow = 30 ft. Scope ratio = 7:1.',
      solve: 'Rode = 7 × 30 = 210 ft.',
      answer: 'Pay out 210 ft of rode for 7:1 scope in this anchorage.',
      learning: '7:1 scope is good for moderate conditions. In a blow, increase to 10:1 if swing room allows. Less scope = anchor lifts + drags. Anchor chain (vs all-line rode) provides extra holding via catenary; 5–6:1 may suffice with significant chain.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COMPOSITE VOYAGES — narrated 8-12 hour fishing days
  // Each voyage walks through start-to-finish decision-making
  // ───────────────────────────────────────────────────────────
  var COMPOSITE_VOYAGES = [
    { title: 'June Cod Trip — Halfway Rock',
      crew: 'Solo, 21-ft center-console, 150 HP outboard',
      goal: 'Land two keeper cod (≥22") + observe daily bag limit, return before tide turns',
      conditions: 'Cool June morning, light SW wind 5–10 kt forecast building to 15 kt afternoon, slack low at 0615, high at 1218, visibility 8 nm, water temp 51°F',
      narrative: [
        '0445: Coffee. Check forecast on NOAA marine app: small craft advisory possible after 1500 — must be back by 1400. Tide table confirms 1218 high; outgoing afterward means a bit of chop building against SW wind.',
        '0515: Boat checks at dock — fuel ~22 gal (need ~12 gal round trip + reserve), oil, kill switch lanyard, PFD, VHF (Ch 16 selected), flares within date, GPS plotter waypoints set.',
        '0530: Cast off Custom House Wharf. Idle out through harbor at 5 kt — no-wake zone past ferry terminal. Sight Portland Head Light. Note one inbound lobsterboat to port (overtaking on his port side, keep clear).',
        '0610: Outside Spring Point Ledge. Increase throttle to 22 kt. Heading 095°M for Halfway Rock — 4.5 nm. ETA ~12 min.',
        '0625: Halfway Rock visible 1 nm off bow. Slow to 8 kt, switch sonar to bottom mode. Drop GPS waypoint. Bottom showing 110 ft, jagged rocky structure — promising cod habitat.',
        '0635: Drift over peak of ledge. Drop jig rigged with squid bait. Hook bottom immediately on first drop — clear hangup. Free with sharp upward jerk. Replace lost terminal tackle (extra rigs in tray).',
        '0700: First cod strikes. Set hook with smooth lift. Fish runs strong. Work to surface — measure: 24". Keeper. Stun, bleed at gill arch, ice immediately in cooler.',
        '0730: Second strike. Smaller fish, 19". Below 22" slot — gently release at side of boat, never lift. Watch swim down healthy. Slot management = future stocks.',
        '0815: Third strike, big run. Larger fish, 28". Bleed + ice. Daily bag for personal cod stands at 2 — limit reached for personal use (check current DMR table; rules change).',
        '0820: Pack up. Cooler latched. Tools secured. PFD on (Maine law children + best practice all hands during transit).',
        '0830: Spinning home. Wind has built to 12 kt — quartering chop. Trim down to keep bow into seas. Slow to 18 kt to reduce pounding.',
        '0915: Inside Spring Point. Slow to 6 kt. Wake control past anchored sailboats.',
        '0935: Tied up. Wash deck, fillet on dock-side table (head + frames into chum bin for next trip), bag fillets, ice cooler home. Log: 2 keepers (24" + 28"), ~5.5 lb fillets, 0 bycatch issues, ~10 gal fuel, return at 0935 — well before forecast change.'
      ],
      lessons: 'Tide window planning. Wave-direction trim. Slot-limit release without harm. Bleed-at-catch quality. Knowing when to stop (bag limit not maximum — limit reached).',
      lesson_id: 'voyage-cod-halfway-rock' },

    { title: 'September Striper Run — Saco Bay',
      crew: 'Two anglers, 18-ft skiff, 70 HP outboard',
      goal: 'Catch + release one striped bass over 28" (a "keeper" by federal slot, though Maine often more restrictive — confirm current regs)',
      conditions: 'Pre-dawn 55°F, dead-flat calm, fog burning off at sunrise. Tide ebbing strongly from 0500–1100. Bait: live mackerel + soft-plastic shad.',
      narrative: [
        '0430: Launch ramp at Pine Point. Coffee, gear check, GPS waypoints set on three known rip lines.',
        '0500: Idle out in fog — radar reflector hoisted. VHF Ch 16. Speed limited to 6 kt — fog Rules 19 + 35 — sound long blast every 2 min.',
        '0530: At outer rip line. Anchor up-current of break, position lure to drift through. Fish-finder shows bait balls 18 ft down.',
        '0600: Fog lifts. First strike on live mackerel — heavy fish. Work for 8 min. Net at boat: 35" striper. Photo, measure, revive in water (fish facing into current), release. Educational moment: c+r technique = wet hands, no gill contact, minimize air exposure to <10 sec.',
        '0645: Move to second rip — fading. No strikes. Switch to soft-plastic shad on jighead, work along current edge.',
        '0730: Smaller striper, 24" — sublegal (below slot). Quick release boat-side.',
        '0810: Third rip line. Birds working — terns + gulls diving on bait pushed to surface by predators. Cast into the boil.',
        '0820: Hookup. Long run — 32" striper. Fight, land, photo, release. Day goal met.',
        '0900: Decision to head in early. Fish quality experiences > quantity. Run back at 22 kt over flat water.',
        '0930: Trailered. Logged: 3 stripers landed, all released, 0 takes from gut-hooks (circle hooks reduce deep-hooking dramatically).'
      ],
      lessons: 'Slot-aware release. Circle hooks for conservation. Fog Rule sound signals. Reading birds as biological indicators. Quality > quantity as ethical stance.',
      lesson_id: 'voyage-striper-saco-bay' },

    { title: 'July Mackerel + Family Day',
      crew: 'Adult + two children ages 8 + 11, 19-ft bowrider, 115 HP',
      goal: 'Introduce kids to fishing safely — catch 8–12 mackerel for grilling',
      conditions: 'Sunny 72°F, light SW 5 kt, slack high tide at 1030 — fish active.',
      narrative: [
        '0830: Family loading. Kids in properly fitted PFDs (sized child + Type II). Sunscreen, hats, water, snacks. Booklet review of safety rules with kids: stay seated when underway, no running, leave hooks alone unless adult helping.',
        '0900: Cast off at no-wake to harbor exit. Show kids the chart on plotter — explain "we are here, we are going there." Builds spatial reasoning.',
        '0920: At Bug Light area. Anchor in 15 ft. Mackerel jigs rigged — 3-hook string with shiny silver flutters. Kids each hold rod with adult guidance on the cast.',
        '0935: First mackerel — 11-year-old reels in two fish at once on the same jig string. Excitement is enormous. Adult demonstrates ungentle but quick dispatch — explain that humane handling is part of taking food responsibly.',
        '1000: Steady action. 8-year-old lands his first ever fish. Photo. Released — too small for the kid to be confident handling. He is thrilled either way.',
        '1100: Cooler has 9 mackerel. Adult calls "limit": catching more than the family will eat = waste. Lesson: take only what you need.',
        '1130: Pull anchor, run home easy. Show kids how to clean fish at dock — they watch the first one, help with the second.',
        'Evening: Grilled fresh mackerel with lemon. Kids tell the story for a week. The hook is set — for the lifestyle, not the fish.'
      ],
      lessons: 'Child fishing safety: PFDs sized, supervision, hook awareness. Conservation framed early. Boat as classroom. Bag-as-need not bag-as-limit.',
      lesson_id: 'voyage-family-mackerel' },

    { title: 'October Bluefin Tuna — Outside Casco Bay',
      crew: 'Captain + mate + two charter customers, 35-ft sportfisher, twin 350 HP diesels',
      goal: 'Hook into a 60–80" school bluefin (HMS rules apply — federal management)',
      conditions: 'Pre-dawn 0400, water 60°F, light NW 10 kt forecast easing midday, swells 3 ft. Sat-sea-surface-temp data shows a thermal break ~22 nm offshore.',
      narrative: [
        '0345: Crew briefing. Customers reminded: bluefin are HMS-regulated, must have a permit on board (captain has Angling category permit), strict size + bag limits enforced by federal observers + dock checks. Captain holds the final say on keep vs release.',
        '0430: Underway. 22 kt cruise. 1.5 hr offshore run.',
        '0600: At thermal break. Mate sets a spread: cedar plugs at long-rigger, ballyhoo on flat lines, daisy chain teasers. 6 kt troll speed.',
        '0645: Bird activity. Sat-photos showed warm-water eddy here. Whale spouts off port.',
        '0712: First strike — flat line. Reel screams. Customer in fighting chair. 45-min fight. Fish surfaces — 72" school bluefin, within slot. Mate gaffs, secures, ices in cockpit fish box.',
        '0800: Another strike, dropped. Mate re-rigs.',
        '0930: Second hookup. 30-min fight. Fish ~52" — sublegal under current rules. Released boat-side. Customer disappointed, captain explains: regulations save the species long-term + violations cost the boat its permit.',
        '1100: Decision to head in — single keeper trip, customers exhausted, fish quality preserved.',
        '1330: Tied up. NOAA observer at dock checks length + records data. Customer goes home with vacuum-sealed steaks.'
      ],
      lessons: 'HMS permits + federal authority. Slot regulations enforced rigorously. Quality over quantity. Captain authority on keep/release decisions.',
      lesson_id: 'voyage-bluefin-tuna' },

    { title: 'November Lobsterboat Day — Class III License Holder',
      crew: 'Captain (Class III) + sternman, 38-ft Northern Bay lobsterboat, 425 HP diesel',
      goal: 'Pull, bait, set 300 traps. Observe v-notch, escape vents, daily bag, oversize/undersize rules',
      conditions: '38°F, NE wind 15 kt building, swell 5 ft. Working zone D outside Two Lights.',
      narrative: [
        '0430: Wharf. Bait pickup: 8 totes of pogies + redfish racks. Engine warmup. Hydraulics check.',
        '0530: Steam out. Captain at helm, sternman re-banding buoy lines + organizing bait.',
        '0610: First trawl. Pull pot — 4 lobsters: one v-notch (egg-bearing notch, return immediately), one short (under 3¼" carapace, return), one keeper (3 7/8"), one oversize (over 5" — return, breeding-class protection).',
        '0610–1300: Steady work. ~300 traps. Each pull <60 sec from buoy to back in water. Wind building, swell 6–7 ft midday.',
        '0930: Sternman fingers stiff — gloves changed for dry pair. Lunch passed back hot from thermos.',
        '1100: Right-whale gear-marking inspection — captain confirms color-coded line + weak links per current NMFS rules; gear must be compliant or face violation.',
        '1300: Last string. Total catch ~145 lbs marketable + 30+ v-notch/short/oversize returns. Bilge pumps cycling — captain notes minor leak, will tend to it dockside.',
        '1500: Tied up. Lobsters into co-op tank — graded by size for market. Captain at desk: log catch in DMR landings book.',
        'Evening: Diesel for tomorrow. Bait order. Net mend. Weather check.'
      ],
      lessons: 'V-notch + oversize protection as long-term insurance. Whale-gear compliance is non-optional. Physical demand + cold-weather management. Co-op economics.',
      lesson_id: 'voyage-lobster-zonefour' },

    { title: 'May Alewife Run — Damariscotta',
      crew: 'Town volunteers + DMR fisheries technician',
      goal: 'Count + monitor alewife passage at the Damariscotta Mills fish ladder — community science',
      conditions: 'Cool 52°F, overcast, freshwater 48°F, fish moving on rising temperature.',
      narrative: [
        '0700: Volunteers arrive at the ladder. DMR tech briefs on safety + protocol: stand back from pools, no handling without gloves, count = visual sample of fish moving through observation window during 10-min slots.',
        '0730: First counts begin. Volunteers in pairs at each pool — one counting passage during 10-min window, partner timing + recording on form.',
        '0830: Run peaking — counts of 40–60 fish per 10 min at lower pools. Above seasonal average for this date — encouraging.',
        '1000: Data collected, totals tallied. Numbers fed to DMR central database — feeds into population models.',
        '1100: Tour for school group — kids see fish ladders, learn watershed connection, understand alewives as foundation species for cod + striper + osprey.',
        'Afternoon: Volunteers reflect — community-driven counts have driven harvest decisions for two decades; town earns small annual income from regulated harvest of surplus.'
      ],
      lessons: 'Anadromous biology basics. Foundation species concept. Community science contribution. Town-owned commons + sustainable harvest.',
      lesson_id: 'voyage-alewife-damariscotta' },

    { title: 'August Bluefish Blitz — Casco Bay',
      crew: 'Two anglers, 22-ft center-console',
      goal: 'Find + cast into a surface blitz of bluefish chasing bait',
      conditions: 'Mid-summer warm water (72°F surface), wind variable, scattered cloud, recent reports of "birds working" along shoreline ledges.',
      narrative: [
        '1430: Out from Falmouth town landing. Cruise eastward — looking for diving birds + surface boils.',
        '1510: Visual: terns + gulls diving 0.4 nm off Cousins Island. Surface boil — bluefish smashing pogies.',
        '1515: Approach upwind, idle to 100 yd off the school. Cast metal lures (Hopkins No=Equal style) into the boil. Hookups immediate.',
        '1520: First bluefish — 6 lb, sharp teeth, dangerous to handle barehanded. Wire leader prevents bite-offs. Pliers for hook removal.',
        '1530: 5 fish in 10 min. Action wild. School moves — boat follows at low speed.',
        '1610: Action slows. Sun lower. Adults discuss conservation: bluefish are not flesh-quality after a day in heat — bleed immediately or release. They release.',
        '1700: Run home. Clean tackle. Wire leaders saved many lures.'
      ],
      lessons: 'Predator-prey signal of birds. Surface fishing tactics. Bluefish bite-handling safety (no fingers in mouth). Bleed/release for flesh quality.',
      lesson_id: 'voyage-bluefish-blitz' },

    { title: 'February Smelt — Kennebec Ice',
      crew: 'Two anglers, ice-fishing shack rented from outfitter on Kennebec at Bowdoinham',
      goal: 'Catch a bucket of smelt for spring frying — winter community tradition',
      conditions: 'Hardwater season, 22°F air, 18" ice, tide influencing river smelt under ice. Smelt run when temperatures + tide align.',
      narrative: [
        '0500: Outfitter has shack on the ice, wood stove already warming. Smelt lines pre-rigged (multiple small hooks on a vertical rig, tiny shrimp or bloodworm bait).',
        '0530: Lines down through hole. Tide rising into the river.',
        '0600: First flurry — 4 smelt in 10 min. Quick action, gentle dispatch into bucket.',
        '0700–0930: Steady action through main tide. ~80 smelt landed.',
        '1000: Bite slowed as tide topped. Pack up.',
        '1100: Home. Clean smelt (cut head + tail off, flour-dust whole, pan-fry — eat bones + all).'
      ],
      lessons: 'Ice safety (always confirm thickness; use spud bar; carry picks + rope; do not go alone on questionable ice). Tide-influenced river fish under ice. Smelt as winter food tradition.',
      lesson_id: 'voyage-smelt-kennebec' },

    { title: 'April Striper Pre-Season + Boat Recommissioning',
      crew: 'Solo, 21-ft skiff coming off winter storage',
      goal: 'De-winterize boat, sea-trial, fish opening week of striper season (mid-April depending on regs)',
      conditions: '48°F air, water 44°F, winds light, first stripers reported on Saco River trickle.',
      narrative: [
        'Morning: Boat at storage facility. Check hull for cracks, drain plug installed, battery charged + reinstalled, lower-unit oil checked, fuel-water separator drained, fuel stabilizer cleared, water-pump impeller condition checked.',
        'Trailer: lights working, tire pressure 50 psi, bearings greased.',
        '1100: Launch. Engine starts after priming. Idle 5 min checking telltale + temp gauge + bilge.',
        '1200: Sea-trial at planing speed in protected water. All systems normal. RPM under load 4800. Steering, trim, gauges all OK.',
        '1300: To river mouth. First stripers of season — 19" schoolies. Release all (some seasons opening week is c+r-only). Confirmed run is on.',
        '1500: Home. Plan opener strategy for next week.'
      ],
      lessons: 'Spring boat re-commissioning checklist. Cold-water safety (hypothermia in 5 min if in water — wet suit or dry suit + PFD nonneg). Season opener regulations are complex + change yearly.',
      lesson_id: 'voyage-april-recommission' },

    { title: 'September Charter Trip — Captain + 4 Customers',
      crew: 'Captain (USCG OUPV "6-pack" licensed) + first mate, 32-ft charter boat',
      goal: 'Half-day inshore charter — light tackle for striper + bluefish',
      conditions: 'Mid-Sept, water 68°F, light wind, half-day trip 0700–1230.',
      narrative: [
        '0630: Customers arrive at dock. Captain greets, reviews safety briefing (PFDs, head pump-out only, emergency procedures, mate as primary contact). Tax + tip discussed before departure.',
        '0700: Cast off. Captain at helm, mate setting trolling spread of soft-plastic shad on jigheads.',
        '0745: First strike — striper 26" (slot fish under most current rules — but customer wants to release; captain supports). Photo, release.',
        '0800–1100: Trolling productive — 7 stripers + 2 bluefish landed, mix of slot + sublegal, all released.',
        '1115: Last drift past the rip. Big striper 36" — within slot if rules allow, captain notes regs + asks customer preference. Released.',
        '1230: Back at dock. Captain logs trip in charter logbook (USCG-required), bills customers, mate cleans boat for afternoon trip.',
        'Lessons for any aspiring captain: Charter is service work + boat work + customer-management; the boat is the easy part.'
      ],
      lessons: 'Charter business basics. Captain liability + safety briefing duty. Customer service as core skill. USCG OUPV licensing.',
      lesson_id: 'voyage-charter-half-day' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: ENGINE MAINTENANCE — outboard + diesel fundamentals
  // ───────────────────────────────────────────────────────────
  var ENGINE_MAINT = [
    { system: 'Outboard 4-Stroke (50–250 HP)',
      schedule: 'Every 100 hr or annually (whichever first): oil + filter, lower-unit gear oil, water-pump impeller every 2 yr or 200 hr, plugs every 200 hr, fuel filter, anodes inspect/replace.',
      daily: 'Visual check: cowling secure, kill switch lanyard, fuel level, telltale running on start (cooling water stream — if not, shut down immediately), gauge temp + oil pressure normal at idle.',
      common_failures: '(1) Impeller failure — overheating, expensive damage if ignored. (2) Stale fuel + ethanol phase-separation — winter storage stabilizer essential. (3) Lower-unit water intrusion through worn seal — milky gear oil = bad seal.',
      diy_or_shop: 'DIY: oil change, plugs, anodes, fuel filter, prop swap. Shop: impeller (special tools), lower-unit reseal, electronic diagnostics.',
      tools_needed: 'Sockets, plug wrench, oil-extraction pump, gear-oil pump, torque wrench, drain pan, paper towels, fuel-line clamp.',
      common_mistakes: '(1) Skipping the telltale check on start. (2) Running ethanol-blend fuel + leaving boat for weeks without stabilizer. (3) Tightening plugs too aggressively — strip aluminum threads = $500 repair.' },

    { system: 'Outboard 2-Stroke (legacy, still common 25 HP and under)',
      schedule: 'Every 50 hr: plugs, gear oil. Every season: fuel system, impeller every 2 yr, anodes.',
      daily: 'Mix fuel correctly (often 50:1 ratio — check engine spec). Telltale check. Visual.',
      common_failures: 'Plug fouling from over-rich mix or sustained idle. Bad oil pump on oil-injected models. Cylinder scoring from oil-starvation.',
      diy_or_shop: 'DIY most maintenance. Shop: powerhead work.',
      tools_needed: 'As above + mixing container clearly marked.',
      common_mistakes: 'Forgetting oil-mix proportion (catastrophic if running unmixed gas). Pre-mix gas going stale.' },

    { system: 'Inboard Diesel (e.g., lobsterboat — Cummins, Volvo, Yanmar)',
      schedule: 'Every 200 hr: oil + filters (engine + fuel + air). Coolant every 2 yr. Belts, hoses, anodes annual. Heat exchanger flush every 5 yr.',
      daily: 'Engine room walk: belts, hoses, fluid levels, raw-water strainer (clear it), bilge dry, exhaust elbow not weeping, gauges at idle (temp, oil pressure, alternator output).',
      common_failures: '(1) Raw-water pump impeller (similar to outboard). (2) Heat exchanger fouling — internal salt buildup reduces cooling. (3) Injector fouling from dirty fuel — fuel filtration critical. (4) Exhaust elbow corrosion — common rebuild item on saltwater diesels.',
      diy_or_shop: 'DIY: oil + filters, belts, raw-water strainer, daily checks. Shop: injectors, turbo, heat exchanger, major rebuilds.',
      tools_needed: 'As above + bigger sockets, oil-evacuation pump (large), fuel-system priming pump.',
      common_mistakes: 'Forgetting to seacock-close + drain raw-water system in winter — freeze crack of heat exchanger = $3000+ repair. Running dirty fuel that fouls injectors. Skipping the heat exchanger flush.' },

    { system: 'Sterndrive (I/O — gas inboard with outdrive)',
      schedule: 'Every 100 hr: oil, plugs, lower-unit gear oil, drive bellows inspect.',
      daily: 'Telltale, drive trim function, bellows look intact (cracked bellows = water in engine).',
      common_failures: 'Bellows failure — most expensive single I/O risk. U-joints. Drive seals.',
      diy_or_shop: 'DIY: oil + plugs + drive oil. Shop: bellows (drive removal required), seal work.',
      tools_needed: 'Standard + specialty drive tools.',
      common_mistakes: 'Leaving bellows degraded. Letting drive sit raised through winter.' },

    { system: 'Fuel System (gasoline)',
      schedule: 'Annual: fuel filter + water separator. Pre-season + post-season: fuel inspection.',
      daily: 'Visual: no leaks at primer bulb, fuel line, tank vent clear.',
      common_failures: 'Ethanol phase-separation (gas + water + ethanol layer at bottom of tank, gums up engine). Water in fuel. Bulb deterioration. Fill-deck o-ring leak.',
      diy_or_shop: 'DIY: filters, primer bulb, hose. Shop: tank work, leak repair.',
      tools_needed: 'Fuel-line clamps, fuel-safe container, filter wrench.',
      common_mistakes: 'No fuel stabilizer over winter. Tank vent obstructed (creates vacuum, engine stalls).' },

    { system: 'Electrical (12V house + start batteries)',
      schedule: 'Annual: battery load test, terminal corrosion clean, connection torque.',
      daily: 'Voltage at gauge ≥12.6V at rest, ≥13.8V running.',
      common_failures: 'Sulfation from undercharging. Loose terminals (intermittent failures). Corrosion at deck-fitting wire entries.',
      diy_or_shop: 'DIY most.',
      tools_needed: 'Multimeter, terminal brush, dielectric grease, torque wrench (light scale).',
      common_mistakes: 'Mixing battery ages (weaker pulls stronger down). Not isolating with switch off when stored.' },

    { system: 'Hull + Bottom Paint (annual)',
      schedule: 'Annual sanding + repaint of antifouling. Wax topsides 2x/yr. Check thru-hulls + seacocks.',
      tools_needed: 'Random-orbital sander (dust mask + ventilation), masking tape, antifouling paint (ablative vs hard).',
      common_mistakes: 'Painting incompatible types over previous. Forgetting to scuff for adhesion. Skipping the keel + transom edges.' },

    { system: 'Trailer (often overlooked)',
      schedule: 'Annual: bearings (re-pack), tires (replace every 5 yr regardless of tread), lights, winch strap, safety chains.',
      daily: 'Pre-launch: tires inflated, lights working, drain plug installed before launch.',
      common_failures: '(1) Bearing failure on highway — $$ tow + roadside disaster. (2) Tire age cracking. (3) Wires fraying at frame-flex points.',
      tools_needed: 'Jack, lug wrench, hub-puller, grease, multimeter for lights.',
      common_mistakes: 'Leaving trailer wet for weeks without lubing. Underestimating tire age (treads can look OK while sidewalls dry-rot).' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: STUDENT CAREER DECISION GUIDE
  // ───────────────────────────────────────────────────────────
  var STUDENT_CAREER = [
    { question: 'Should I pursue commercial fishing as a career?',
      consider: 'Love being on water? Comfortable with physical work + weather + long hours? Patient + adaptive? Comfortable with risk? Multi-generation family in industry?',
      pathways: 'Crewing on existing boat → apprenticeship → Class I license. Or charter operation: USCG OUPV → commercial. Or marine sciences degree → research role.',
      key_steps: '(1) Crew on existing boat; (2) Apprentice formally for lobster; (3) Complete USCG license for charter; (4) Marine science degree for research role.',
      timeline: '5-10 years from interest to commercial operation.' },
    { question: 'What fishing role fits my interests?',
      consider: 'Outdoor + physical: lobsterman, charter captain, commercial fisherman. Tourism + people: charter captain. Science + research: marine biologist, NOAA observer. Policy: DMR officer, NOAA staff. Engineering: gear development, boat design.',
      pathways: 'Each role has different training pathway.',
      key_steps: 'Sample roles via internship + crewing. Identify your specialty.',
      timeline: '2-5 years to identify + train.' },
    { question: 'Should I become a lobsterman?',
      consider: 'Maine\'s most-iconic fishery. Limited-entry. Multi-year apprenticeship. Capital-intensive ($200K+ to start). Multi-generation tradition + community.',
      pathways: '2-year apprenticeship → Class I license → zone-specific entry.',
      key_steps: 'Find a mentor lobsterman; apprentice diligently; save capital; apply for Class I.',
      timeline: '5-7 years from start to independent operation.' },
    { question: 'Should I become a charter captain?',
      consider: 'Combines fishing + customer service + business. Seasonal business. USCG license required. Less capital than commercial lobstering.',
      pathways: '90-day boating experience → USCG OUPV course → license → start business.',
      key_steps: 'Complete USCG OUPV; gain customer service experience; develop reputation.',
      timeline: '3-5 years to established operation.' },
    { question: 'Should I become a marine biologist?',
      consider: 'Science career. Government, university, or NGO. BS minimum; MS or PhD for research. Steady salary + benefits.',
      pathways: 'BS Marine Biology → graduate school → research position.',
      key_steps: 'Major in marine science; internship at NEFSC or GMRI or Bigelow; graduate program.',
      timeline: '6-10 years through PhD.' },
    { question: 'What\'s the future of Maine commercial fishing?',
      consider: 'Lobster industry strong but adapting (right whale, climate). Cod gone. Charter + striper + tuna growing. Aquaculture expanding. Tribal sovereignty + climate adaptation reshaping.',
      pathways: 'Multi-species + multi-skill operators most resilient.',
      key_steps: 'Stay current; diversify skills; engage with industry community.',
      timeline: '20+ year career horizon. Plan for change.' },
    { question: 'How do I make it economically viable?',
      consider: 'Diversification + cost discipline + smart business. Many operators have multiple revenue streams.',
      pathways: 'Lobster + aquaculture; lobster + charter; commercial + tourism.',
      key_steps: 'Develop business plan + financial reserves; diversify income streams.',
      timeline: '3-5 years to economic stability.' },
    { question: 'What if I\'m from a non-traditional background?',
      consider: 'Industry historically male-dominated + concentrated in coastal white families. But opening. Persistence + good mentors are key.',
      pathways: 'Same as anyone else: education + apprenticeship + license.',
      key_steps: 'Find mentors; build community; don\'t give up.',
      timeline: 'Same as anyone else with extra patience.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: CLIMATE CHANGE DEEP DIVE FOR FISHERIES
  // ───────────────────────────────────────────────────────────
  var CLIMATE_DEEP = [
    { topic: 'Gulf of Maine Warming Rate',
      content: 'Pershing et al. 2015 documented Gulf of Maine warming at ~4× global ocean rate during 2004-2013. Continued rapid warming. Among fastest-warming marine regions on Earth.',
      relevance: 'Foundation of climate-fisheries science. All Maine management increasingly climate-aware.' },
    { topic: 'Climate Drivers',
      content: 'Gulf Stream + Labrador Current shifts. Semi-enclosed geography limits water exchange. Atlantic Multidecadal Oscillation. Climate change accelerates these dynamics.',
      relevance: 'Maine\'s situation is geographically unique + magnifies climate impacts.' },
    { topic: 'Cod Recovery Failure',
      content: 'Cod larvae fail to develop above ~12°C. Gulf of Maine summer SSTs now regularly exceed. Even with strict management, cod cannot recover in current climate.',
      relevance: 'Climate cautionary tale. Maine industry pivoted from cod.' },
    { topic: 'Range Shifts (Northward)',
      content: 'Cold-water species (cod, herring, mackerel) shifting north over decades. Warm-water species (black sea bass, summer flounder, butterfish) arriving in Maine.',
      relevance: 'Industry must adapt species mix.' },
    { topic: 'Lobster Climate Shift',
      content: 'Maine lobster currently climate winner (range expanded north as Gulf warmed). Long-term: lobster may continue shifting north, eventually leaving Maine waters or concentrating in colder northern Maine.',
      relevance: 'Maine lobster industry climate-dependent.' },
    { topic: 'Ocean Acidification',
      content: 'CO₂ dissolution in seawater lowers pH. Affects calcium carbonate larval shells. Maine\'s shellfish + lobster larvae vulnerable. Hatcheries buffer water; selective breeding for tolerance.',
      relevance: 'Long-term shellfish industry challenge.' },
    { topic: 'HAB Frequency + Timing',
      content: 'Harmful Algal Blooms more frequent + earlier in season as waters warm. PSP closures expected to extend.',
      relevance: 'Shellfish industry operational impact.' },
    { topic: 'Stream Temperature + Sea-Run Fish',
      content: 'Warming stream temperatures stress sea-run fish (alewife, salmon). Spawning success affected. Multi-year recovery efforts complicated by climate.',
      relevance: 'Sea-run fish recovery climate-dependent.' },
    { topic: 'Storm Frequency + Intensity',
      content: 'Climate change increasing storm intensity + frequency. Damages gear + working-waterfront infrastructure. Industry adaptation costs rising.',
      relevance: 'Operational + financial impact.' },
    { topic: 'Adaptation Strategies',
      content: 'Species diversification, climate-resilient breeding, site rotation, working-waterfront preservation, gear modifications, business model adaptation. Multi-decade effort.',
      relevance: 'Industry actively adapting.' },
    { topic: 'Tribal Climate Adaptation',
      content: 'Wabanaki nations integrating traditional ecological knowledge with modern climate science. Multi-generational time horizons + community resilience.',
      relevance: 'Indigenous knowledge informs adaptation.' },
    { topic: 'Climate Future for Maine Fisheries',
      content: 'Industry will adapt or shrink. Diversification + innovation essential. Climate is not optional concern; it\'s defining force.',
      relevance: 'Industry transformation underway.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: WORKING WATERFRONT DEEP DIVE (Fisheries focus)
  // ───────────────────────────────────────────────────────────
  var WATERFRONT_DEEP = [
    { topic: 'What is Maine Working Waterfront',
      content: 'Maine\'s "working waterfront" is the system of docks, ice plants, processing facilities, gear sheds, boat ramps, fuel docks, cold storage, and supporting infrastructure that enables Maine commercial fishing + aquaculture. Without this infrastructure, the industries collapse.',
      relevance: 'Industry depends entirely on working-waterfront infrastructure.' },
    { topic: 'Coastal Gentrification Threat',
      content: 'Coastal Maine property values have risen dramatically since 1990s. Working-waterfront sites converted to residential + tourist uses. Family-owned + community-owned infrastructure lost to higher-value real estate.',
      relevance: 'Major industry threat. Ongoing.' },
    { topic: 'Maine Working Waterfront Access Protection Program',
      content: 'State-level program using conservation easements + zoning protections. Multi-million-dollar state appropriations + nonprofit partnerships (Maine Coast Heritage Trust + Island Institute) preserve sites.',
      relevance: 'State-led preservation effort. Limited but real.' },
    { topic: 'Multi-Generation Family Operations',
      content: 'Many Maine working-waterfront sites are multi-generation family operations. Lobster co-ops, family piers, processing facilities. Cultural + economic + community anchors.',
      relevance: 'Family operations under particular pressure.' },
    { topic: 'Tribal Working Waterfront',
      content: 'Wabanaki nations have ancestral connections to specific shorelines + harbors. Tribal-led restoration + aquaculture include working-waterfront elements.',
      relevance: 'Tribal sovereignty + waterfront preservation intersect.' },
    { topic: 'Climate Change + Sea Level Rise',
      content: 'Sea level rise + storm surge threatens working-waterfront infrastructure. Multi-decade challenge. Adaptation requires investment.',
      relevance: 'Climate overlay on preservation effort.' },
    { topic: 'Public Access',
      content: 'Maine\'s "colonial ordinance" + working-waterfront access laws preserve some public access to coast. But specific access points threatened. State + tribal + community advocacy continues.',
      relevance: 'Public access + working waterfront intertwined.' },
    { topic: 'Industry Advocacy',
      content: 'Maine Lobstermen\'s Association, Maine Aquaculture Association, Maine Coast Fishermen\'s Association, Island Institute, Maine Coast Heritage Trust + others all advocate. Multi-stakeholder coordination.',
      relevance: 'Active advocacy required.' },
    { topic: 'Working Waterfront + Workforce',
      content: 'Working waterfront enables industry workforce. Industry employment depends on continued access to docks + facilities. Without waterfront, no industry, no jobs.',
      relevance: 'Workforce + waterfront linked.' },
    { topic: 'Future Outlook',
      content: 'Continued preservation effort essential. Industry growth + tribal sovereignty + community advocacy all part of long-term solution.',
      relevance: 'Multi-stakeholder + multi-decade effort.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MARINE PROTECTED AREAS + CONSERVATION
  // ───────────────────────────────────────────────────────────
  var MPAS_CONSERVATION = [
    { topic: 'Cashes Ledge Closure',
      content: 'Cashes Ledge in Gulf of Maine is closed seasonally to protect cod spawning aggregations. Federal management; NEFMC + NOAA.',
      relevance: 'Major closure affecting cod fishing.' },
    { topic: 'Stellwagen Bank National Marine Sanctuary',
      content: 'Federal marine sanctuary southwest of Maine in Massachusetts Bay. Conservation + recreation + commercial fishing balance. Whale watching + offshore charter operations.',
      relevance: 'Demonstrates federal marine sanctuary model.' },
    { topic: 'Atlantic Right Whale Critical Habitat',
      content: 'NOAA-designated critical habitat for endangered right whales. Includes Maine waters seasonally. Speed restrictions + gear modifications required.',
      relevance: 'Conservation reshaping Maine industry.' },
    { topic: 'Maine State Closed Areas',
      content: 'Maine DMR maintains seasonal closures for spawning + sensitive species. Striper rivers during spawning + alewife runs + cod spawning grounds + sturgeon habitat.',
      relevance: 'State-level conservation tools.' },
    { topic: 'Marine Spatial Planning',
      content: 'Maine + federal coordination on marine area use: fisheries + aquaculture + offshore wind + recreation + conservation. Multiple uses + competing claims.',
      relevance: 'Planning balances multiple uses.' },
    { topic: 'Eelgrass Protection',
      content: 'Eelgrass is foundation species for nursery habitat. Maine eelgrass declining in many areas. State + federal protections; restoration efforts.',
      relevance: 'Protecting foundation species.' },
    { topic: 'Tribal-Designated Areas',
      content: 'Tribal authorities may designate areas for tribal-rights protection + traditional harvest. Penobscot + Passamaquoddy actively asserting.',
      relevance: 'Tribal sovereignty in spatial management.' },
    { topic: 'Offshore Wind Impact',
      content: 'Maine + federal offshore wind development creating new tensions. Wind farm areas overlap with fishing + aquaculture grounds. Industry must engage in planning.',
      relevance: 'New industry creating challenges for traditional fisheries.' },
    { topic: 'Conservation Mosaic',
      content: 'Maine + federal conservation includes closures + protections + sanctuaries + tribal areas. Each contributes to overall ecosystem protection.',
      relevance: 'Diverse + layered approach.' },
    { topic: 'Future of Marine Conservation',
      content: 'Climate adaptation + species recovery + competing uses all reshape marine conservation. Multi-stakeholder coordination essential.',
      relevance: 'Continuing evolution.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: TUNA + OFFSHORE INDUSTRY DEEP
  // ───────────────────────────────────────────────────────────
  var TUNA_INDUSTRY = [
    { topic: 'Atlantic Bluefin Tuna',
      content: 'Atlantic bluefin tuna (Thunnus thynnus) is highly migratory + extremely high-value. Maine + Massachusetts waters are summer feeding grounds. Charter + commercial fishing for bluefin a Maine offshore tradition.',
      relevance: 'Premium offshore species; significant industry value.' },
    { topic: 'ICCAT Management',
      content: 'International Commission for the Conservation of Atlantic Tunas (ICCAT) manages global bluefin tuna quotas. US bluefin allocation distributed by NOAA HMS Division. Permit requirements + bag limits + size limits strict.',
      relevance: 'International coordination for highly migratory species.' },
    { topic: 'Maine Bluefin Charter',
      content: 'Charter operations from Boothbay + Bar Harbor + Cape Cod + Maine offshore. Trips out to Cashes Ledge + Stellwagen + similar. Daily charter $1,500-$3,000+.',
      relevance: 'Significant Maine charter industry.' },
    { topic: 'Premium Pricing',
      content: 'Sushi-grade Maine bluefin commands $20-$50+/lb at auction. Trophy fish (700+ lbs) sell for $10,000+. Industry record sales for individual fish exceed $100,000.',
      relevance: 'High-value commercial + charter species.' },
    { topic: 'Stock Status',
      content: 'Atlantic bluefin has been rebuilding from historic lows. ICCAT quotas tighter over time. Population is recovering but population pre-industrial level not yet reached.',
      relevance: 'Conservation working but slow.' },
    { topic: 'Climate + Range Shifts',
      content: 'Bluefin distribution shifting with ocean temperatures. Maine may become more important seasonal habitat as Gulf of Maine warms.',
      relevance: 'Climate adaptation: more Maine bluefin opportunity.' },
    { topic: 'Other Offshore Species',
      content: 'Yellowfin tuna + bigeye tuna + mahi-mahi all increasing Maine summer presence with warming. Recreational + commercial interest growing.',
      relevance: 'Climate-driven new opportunities.' },
    { topic: 'Sharks',
      content: 'Maine waters host blue shark + makos + thresher sharks. Some recreational shark fishing (tag + release primarily). Federal HMS permits required.',
      relevance: 'Niche but growing recreational activity.' },
    { topic: 'Tag-and-Release Science',
      content: 'Maine charter captains often tag bluefin for science. Tagged fish contribute to stock assessment science. Charter-science partnership.',
      relevance: 'Industry contribution to management.' },
    { topic: 'Industry Future',
      content: 'Maine offshore industry likely to grow with climate shifts + bluefin recovery. New species + opportunities. Need offshore-capable boats + skilled captains.',
      relevance: 'Workforce + investment pipeline matters.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: ALEWIFE + SEA-RUN FISH DEEP CASE STUDY
  // ───────────────────────────────────────────────────────────
  var ALEWIFE_INDUSTRY = [
    { topic: 'Alewife Biology + Importance',
      content: 'Atlantic alewife (Alosa pseudoharengus) is an anadromous fish — adults live in saltwater, spawn in freshwater. Maine alewife migrate from Gulf of Maine into rivers + ponds each spring (April-June). Foundation forage species; feeds osprey, eagle, seal, striper, cod.',
      relevance: 'Alewife are ecosystem foundation. Their migrations bring nutrients inland + sustain ecosystems.' },
    { topic: 'Wabanaki Tradition',
      content: 'Wabanaki peoples have managed Maine alewife runs for 12,000+ years. Seasonal harvest aligned with run; cultural + spiritual significance; nutrient transfer to inland.',
      relevance: 'Indigenous stewardship is ancient + ongoing.' },
    { topic: 'Industrial Decline',
      content: '19th + 20th centuries: dams blocked spawning runs in most Maine rivers. Industrial pollution further degraded. Many runs were lost or drastically reduced.',
      relevance: 'Pre-Industrial wild alewife populations vastly reduced.' },
    { topic: 'Damariscotta Mills',
      content: 'Damariscotta Mills (Lincoln County, Maine) had one of the most-iconic surviving alewife runs. Fishway construction + community maintenance preserved run. Annual May celebration draws thousands.',
      relevance: 'Cultural anchor + community-led restoration.' },
    { topic: 'Penobscot River Restoration (2004-2016)',
      content: 'Multi-tribal-led restoration: 2 dams removed + 1 bypassed. 1,000+ river miles reopened. Alewife + shad + salmon + sturgeon returning.',
      relevance: 'Model for other Maine rivers. Tribal leadership essential.' },
    { topic: 'Modern Status',
      content: 'Some Maine alewife runs increasing through restoration. Other rivers still constrained by dams + degraded habitat. Long-term recovery effort.',
      relevance: 'Mixed picture; sustained investment needed.' },
    { topic: 'Sustainable Harvest',
      content: 'Maine sustainable alewife harvest (where allowed) is town-managed. Some towns have dip-net permits; some have no-harvest restoration zones. Each town\'s decision.',
      relevance: 'Local democratic management.' },
    { topic: 'Climate Vulnerability',
      content: 'Alewife runs sensitive to climate: stream temperatures + flow patterns + spawning timing. Climate change affecting habitat.',
      relevance: 'Climate adaptation needed.' },
    { topic: 'Ecosystem Service',
      content: 'Alewife runs transfer marine nutrients inland; feed terrestrial wildlife + birds. Functional ecosystem-engineering service.',
      relevance: 'Beyond commercial value, alewife provide ecosystem services.' },
    { topic: 'Future of Maine Sea-Run Fish',
      content: 'Ongoing restoration through dam removals + tribal partnerships + climate adaptation. Multi-decade effort.',
      relevance: 'Sea-run fish recovery is multi-decade tribal-led + agency partnership.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: STRIPED BASS DEEP CASE STUDY
  // ───────────────────────────────────────────────────────────
  var STRIPER_INDUSTRY = [
    { topic: 'Pre-Industrial Striper',
      content: 'Atlantic striped bass (Morone saxatilis) historically abundant on Atlantic seaboard. Wabanaki + colonial fishery. Multi-state migrations from Chesapeake + Hudson + Delaware spawning grounds to New England summer waters.',
      relevance: 'Multi-state migratory species; coordinated management needed.' },
    { topic: 'Industrial Decline (1970s-1980s)',
      content: 'Increasing pressure from commercial + recreational fishing. Habitat degradation in spawning rivers (pollution + dams). Striper populations declined sharply.',
      relevance: 'Showed even abundant + tough species can be overharvested.' },
    { topic: '1985-1990 Moratorium',
      content: 'ASMFC + multi-state moratorium banned commercial sale of striped bass. Recreational fishery severely limited. Coordinated multi-state action.',
      relevance: 'Major coordinated conservation effort.' },
    { topic: 'Stock Rebuilding (1990-1995)',
      content: 'Stocks rebuilt by mid-1990s. Multi-state cooperation under ASMFC framework worked. Striper became iconic recovery story.',
      relevance: 'Showed coordinated multi-state action can rebuild stocks.' },
    { topic: 'Recreational Fishery Reopened',
      content: 'Recreational catch + commercial sale (with state-specific rules) reopened gradually. Maine recreational fishery operates within ASMFC framework.',
      relevance: 'Industry adapted to new rules.' },
    { topic: 'Modern Slot Limits',
      content: 'Maine + other states now manage striper with slot limits. Maine slot 28-31"; release everything outside. Slot designed to protect both juveniles (below) + large breeders (above).',
      relevance: 'Slot limits protect both ends of distribution.' },
    { topic: 'Circle Hook Requirement',
      content: 'States increasingly require circle hooks for bait fishing. Reduces gut-hooking + improves release mortality. Maine + ASMFC mandates.',
      relevance: 'Conservation through gear technology.' },
    { topic: 'Mid-2010s Decline',
      content: 'Striper population began declining again in mid-2010s. ASMFC implemented additional restrictions: smaller slot, tighter bag limits.',
      relevance: 'Population biology + management remain challenging.' },
    { topic: 'Climate Change Considerations',
      content: 'Climate change may affect striper spawning + migration. Warming Maine waters allowing later season but spawning rivers vulnerable. Long-term outlook uncertain.',
      relevance: 'Climate complicates recovery.' },
    { topic: 'Charter + Recreational Industry',
      content: 'Maine charter + recreational striper fishery is significant economic + cultural activity. Charter captains advocate strongly for slot limits + circle hooks.',
      relevance: 'Industry voice in conservation.' },
    { topic: 'Future of Striped Bass',
      content: 'Ongoing management challenge. ASMFC + state coordination essential. Climate adaptation needed. Recreational + commercial users balance interests.',
      relevance: 'Continuing case study of fisheries management.' },
    { topic: 'Lessons',
      content: 'Multi-state coordination works; circle hooks + slot limits effective; climate change creates new uncertainties; stakeholder engagement essential.',
      relevance: 'Applicable to other migratory species management.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COD INDUSTRY DEEP CASE STUDY
  // ───────────────────────────────────────────────────────────
  var COD_INDUSTRY = [
    { topic: 'Pre-Industrial Era (Wabanaki + Colonial)',
      content: 'Atlantic cod (Gadus morhua) sustained Wabanaki coastal communities + early colonial settlers. Cod were so abundant on Grand Banks + Gulf of Maine that early European visitors described them as "paved with cod." Drying + salting cod created exportable product. Cod was foundation of New England export economy from 1600s onward.',
      relevance: 'Cod literally built New England as we know it. Cultural + economic anchor for centuries.' },
    { topic: 'Industrial Fishing Era (1900s-1980s)',
      content: 'Steam + diesel trawlers + factory ships scaled extraction. Foreign trawler fleets (Soviet, etc.) joined US + Canadian boats. Annual catches exceeded 100,000+ tons in Gulf of Maine alone. Industry employed tens of thousands across New England + Atlantic Canada.',
      relevance: 'Industrial-scale fishing maintained high catches even as stocks were being drawn down.' },
    { topic: '1976 Magnuson-Stevens Act',
      content: 'Created US 200-nm Exclusive Economic Zone + Regional Councils (NEFMC for our area). Drove out foreign fleets. Domesticated cod fishery. Foundation of modern management.',
      relevance: 'Major management reform but came late — cod stocks already stressed.' },
    { topic: '1980s Decline',
      content: 'NEFMC quotas + closures attempted to manage cod sustainably. But political pressure + scientific uncertainty + persistent overfishing reduced spawning biomass.',
      relevance: 'Even with management, stocks continued declining.' },
    { topic: '1992 Grand Banks Collapse',
      content: 'Canadian government imposed moratorium on northern cod (Grand Banks). 30,000+ people lost livelihoods overnight. Industry-defining event.',
      relevance: 'Demonstrated that cod stocks could collapse despite management. Wake-up call for Maine + New England.' },
    { topic: '1990s-2010s Management Attempts',
      content: 'NEFMC implemented increasingly strict quotas + closed areas + reduced effort. Cod stock continued to be stressed. Multiple rebuilding plans implemented + adjusted.',
      relevance: 'Management attempts persistent + failing despite reduced fishing pressure.' },
    { topic: '2015 Pershing Paper (Climate Link)',
      content: 'Pershing et al. 2015 published "Slow adaptation in the face of rapid warming leads to collapse of the Gulf of Maine cod fishery" in Science. Documented Gulf of Maine warming ~4× global average + showed cod larvae fail above ~12°C. Climate identified as primary obstacle to recovery.',
      relevance: 'Changed framing from "fishery management problem" to "climate-fishery problem." No amount of management can recover cod under current climate trajectory.' },
    { topic: 'Current Status (2020s)',
      content: 'Gulf of Maine cod spawning biomass below 10% of historical. Strict quotas in effect. Recreational + commercial catches severely limited. Stock not recovering.',
      relevance: 'Maine cod fishery has effectively ended for foreseeable future.' },
    { topic: 'Impact on Maine Industry',
      content: 'Maine fishing industry has pivoted: lobster has become dominant (~85%+ of fishing value). Groundfish (haddock + pollock substitute for cod) + striper + tuna + scallop diversify. Aquaculture growing rapidly.',
      relevance: 'Industry adapted; communities transformed.' },
    { topic: 'Climate Cautionary Tale',
      content: 'Cod is now textbook example of how climate change can prevent fishery recovery. Other cold-water species face similar risks. Climate adaptation is required.',
      relevance: 'Cod story informs Maine\'s broader fisheries climate-adaptation strategy.' },
    { topic: 'Lessons for Other Fisheries',
      content: 'Management must include climate. Stocks may not recover under changing conditions. Diversification + adaptation are essential. Don\'t over-target single species.',
      relevance: 'Maine industry now broadly climate-aware.' },
    { topic: 'Future of Maine Cod',
      content: 'Stock may shift north to colder waters (Newfoundland, Canadian Maritimes) over decades. Maine may have minimal cod fishery for foreseeable future.',
      relevance: 'Industry needs to plan accordingly.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: DETAILED CASE STUDIES — RIGHT WHALE COMPLIANCE
  // ───────────────────────────────────────────────────────────
  var RIGHT_WHALE_DEEP = [
    { aspect: 'Population Status',
      content: 'North Atlantic right whale (Eubalaena glacialis) population: ~340 individuals. Critically endangered + declining. Down from estimated 480 in 2010. Major non-natural mortality cause: entanglement in fishing + aquaculture gear (vertical mooring lines). Vessel strikes also significant. Reproduction rate too low to recover at current mortality.',
      maine_implications: 'Maine\'s fishing industry contributes to vertical line entanglement risk. Industry transition required.' },
    { aspect: 'Right Whale Range + Migration',
      content: 'NA right whales summer feed in Maine + Gulf of Maine + Bay of Fundy. Winter calving grounds off Georgia + Florida. Migrate annually. NOAA tracks individuals via photo-identification + acoustic monitoring.',
      maine_implications: 'Maine waters are critical right whale habitat. Maine activities have outsized impact.' },
    { aspect: 'Gear Entanglement Mechanism',
      content: 'Right whales swim into vertical lines (mooring + dropper + buoy lines). Lines may wrap around mouth, flippers, or tail. Entangled whales die slowly from infection, starvation, or drowning. Disentanglement teams attempt to free entangled whales but success rate is low.',
      maine_implications: 'Vertical line gear = highest entanglement risk. Lobster + aquaculture gear both affected.' },
    { aspect: 'NOAA Speed Restriction Rule (2008+)',
      content: 'Seasonal mandatory 10-knot speed restriction zones implemented along NA right whale migration routes. Maine waters covered seasonally. Expansion considered + may extend further.',
      maine_implications: 'Reduced commercial + recreational speed. Trip planning + commercial timing affected.' },
    { aspect: 'Ropeless Gear (On-Demand / Pop-Up)',
      content: 'New technology: acoustic-release buoys stored on seafloor. Vessel sends acoustic signal; release activates; buoy + line floats to surface. Eliminates persistent vertical lines.',
      maine_implications: 'Industry transitioning. Cost: $1000s per unit. Adoption + training required.' },
    { aspect: 'Seasonal Pull (Alternative)',
      content: 'Alternative to ropeless: seasonal gear pull. Industry pulls gear during right whale presence. Lower technical bar but reduces fishing seasons.',
      maine_implications: 'Some operators using this approach. Income reduction during closure period.' },
    { aspect: 'Industry Adaptation Costs',
      content: 'Industry-wide retrofitting cost: $10s of millions. Federal + state cost-sharing programs exist. Many operators struggling with capital.',
      maine_implications: 'Maine lobster industry economic + cultural transition. Major investment needed.' },
    { aspect: 'Legal Challenges',
      content: 'Maine fishing industry has challenged some NOAA rules in court. Some rules upheld; others modified. Continuing legal + political process.',
      maine_implications: 'Industry voice in shaping regulation continues.' },
    { aspect: 'Conservation Outcomes',
      content: 'Compliance + technology innovation reduce entanglement risk over time. Mortality rate improving but still above replacement level. Recovery uncertain.',
      maine_implications: 'Industry contribution to conservation is real but requires continued investment.' },
    { aspect: 'Tribal Considerations',
      content: 'Some Wabanaki nations have traditional + spiritual connections to whales. Tribal-led conservation initiatives may emerge.',
      maine_implications: 'Tribal sovereignty intersects with whale conservation.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: DETAILED CASE STUDIES — LOBSTER CONSERVATION
  // ───────────────────────────────────────────────────────────
  var LOBSTER_CONSERVATION = [
    { tool: 'V-Notch (Tail Flipper Cut)',
      content: 'Maine lobstermen cut a V-shape into the tail flipper of any female caught carrying eggs. The notch persists through molts. V-notched females are permanently protected from harvest by both state + federal law (since 1985).',
      science: 'Egg-bearing females are reproductive engine of population. V-notching preserves them across multiple spawning cycles.',
      result: 'Multi-decade success. Maine lobster spawning biomass protected. Industry self-enforced + culturally embedded.',
      lesson: 'Community-based self-enforcement works when culture supports it.' },
    { tool: 'Minimum Size Limit (3-1/4" carapace)',
      content: 'Lobsters smaller than 3.25" carapace measure must be released. This is below typical reproductive size + protects juveniles.',
      science: 'Allows lobsters to spawn at least once before legal harvest. Carapace measure is reliable + repeatable.',
      result: 'Effective. Industry compliant; verification by Marine Patrol routine.',
      lesson: 'Simple measurable rule + easy enforcement = good policy.' },
    { tool: 'Maximum Size Limit (5" carapace)',
      content: 'Lobsters larger than 5" carapace must ALSO be released. This protects largest breeders (which produce disproportionately many eggs).',
      science: 'Large breeders are reproductively critical. Egg production scales nonlinearly with size.',
      result: 'Industry compliant. Protects breeders.',
      lesson: 'Don\'t harvest big breeders. They\'re worth more alive.' },
    { tool: 'Escape Vent in Traps',
      content: 'Lobster traps must have sized escape vents that allow sub-legal lobsters to escape. Reduces handling stress + post-release mortality.',
      science: 'Lobsters caught + released suffer some mortality. Escape vents eliminate the catch-release step for sub-legal animals.',
      result: 'Effective + non-controversial in industry.',
      lesson: 'Gear design can encode conservation.' },
    { tool: 'Zone Council Self-Governance',
      content: 'Maine\'s 7 lobster zones each governed by elected councils that set local rules + entry within state framework. Democratic + community-based.',
      science: 'Each zone has unique ecology + community. Local management responsive to local conditions.',
      result: 'Distinctive Maine institution. Provides local input + state oversight.',
      lesson: 'Common-pool resource management can scale via federalism.' },
    { tool: 'Limited Entry (5:1 retire:new ratio)',
      content: 'In many Maine lobster zones, 5 retired licenses are required before 1 new license is issued. Multi-year waitlists in popular zones.',
      science: 'Limits effort + prevents over-investment.',
      result: 'Industry concentrated in established families + multi-generation traditions.',
      lesson: 'Limited entry can preserve resource + community character but creates barriers.' },
    { tool: 'Apprenticeship Requirement',
      content: '≥1000 hours over 2 years required before applying for Class I commercial license. Documented sea time under licensed lobsterman.',
      science: 'Ensures new entrants have skills + judgment + community connections.',
      result: 'Multi-generation industry continuity.',
      lesson: 'Skill + culture transmission needs structured time.' },
    { tool: 'Right Whale Compliance',
      content: 'Recent NOAA rules require ropeless gear or seasonal pulls during NA right whale presence. Industry transition.',
      science: 'Right whale population critically endangered; entanglement is leading mortality.',
      result: 'Industry investment + technology innovation; ongoing transition.',
      lesson: 'Conservation responses to endangered species create industry transitions.' },
    { tool: 'Sustainable Fishing Practices Combined',
      content: 'V-notch + size limits + escape vents + zone councils + apprenticeship + right-whale compliance combine to make Maine lobster fishery model of sustainability.',
      science: 'Multiple management tools layered create robust framework.',
      result: 'Maine lobster industry remains viable + culturally vibrant.',
      lesson: 'Multiple tools layered work better than single rules.' },
    { tool: 'Climate Adaptation (Ongoing)',
      content: 'Climate shifting lobster range + abundance. Industry adapting via species diversification + gear changes + climate-informed planning.',
      science: 'Climate change creating new challenges + opportunities.',
      result: 'Industry actively adapting.',
      lesson: 'Adaptation is multi-decade ongoing process.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: NOTABLE PEOPLE IN MAINE FISHERIES
  // ───────────────────────────────────────────────────────────
  var NOTABLE_PEOPLE = [
    { name: 'Linda Greenlaw',
      role: 'Swordfish boat captain + author',
      era: '1980s-present',
      contribution: 'Author of "The Hungry Ocean" + "The Lobster Chronicles" + multiple books. Maine\'s most-public female commercial fisherman. Lecturer + industry advocate.',
      legacy: 'Greenlaw\'s books shaped public understanding of Maine fishing. She continues to influence + advocate.' },
    { name: 'Bill Acheson (anthropologist)',
      role: 'Maine lobstering anthropologist',
      era: '1970s-2010s',
      contribution: 'Author of "The Lobster Gangs of Maine" (1988) + "Capturing the Commons" (2003). Foundational academic studies of Maine lobster industry.',
      legacy: 'Acheson\'s work is required reading for anyone studying Maine commons management + lobster culture.' },
    { name: 'Mark Kurlansky',
      role: 'Author of "Cod: A Biography of the Fish That Changed the World" (1997)',
      era: '1990s-present',
      contribution: 'Definitive popular history of cod + its role in shaping Atlantic economies.',
      legacy: 'Required reading for fisheries managers + working fishermen.' },
    { name: 'Trevor Corson',
      role: 'Author of "The Secret Life of Lobsters" (2004)',
      era: '2000s-present',
      contribution: 'Accessible popular biology + Maine lobsterman portrait. Great teacher resource.',
      legacy: 'Bridge between scientific knowledge + general public understanding of Maine lobster industry.' },
    { name: 'Andy Pershing',
      role: 'GMRI senior scientist',
      era: '2010s-present',
      contribution: '2015 paper on Gulf of Maine warming + cod recovery failure. Foundation for climate-fisheries science.',
      legacy: 'Maine fisheries management increasingly climate-aware. Continues active research.' },
    { name: 'Susan Bartlett',
      role: 'First female Maine commercial lobsterman',
      era: '1973-present',
      contribution: 'Broke gender barrier in Maine lobstering 1973. Multi-decade career.',
      legacy: 'Opened path for subsequent female lobstermen. Cultural marker.' },
    { name: 'Stephen Kress (Project Puffin)',
      role: 'Founded Project Puffin (Audubon) 1973',
      era: '1973-present',
      contribution: 'Restored Atlantic Puffin nesting colonies to Maine using decoy + recorded-call methods. Multiple Maine colonies revived.',
      legacy: 'Conservation success story. Maine has thriving puffin colonies thanks to Kress\'s work.' },
    { name: 'Penobscot River Restoration Trust Leadership',
      role: 'Multi-tribal-led restoration project',
      era: '2004-2016',
      contribution: 'Coordinated removal of 2 dams + bypass of 1 on Penobscot River. Opened 1,000+ river miles to sea-run fish.',
      legacy: 'Model for other Maine river restorations. Sea-run fish returning.' },
    { name: 'Maine Lobstermen\'s Association Leadership',
      role: 'Multi-decade industry advocacy',
      era: '1950s-present',
      contribution: 'Industry trade association building + advocacy + crisis response (recently right whale + climate).',
      legacy: 'Maine lobster industry has stable industry voice + apprenticeship coordination.' },
    { name: 'Donna Loring (Penobscot Tribal Rep to Maine Legislature)',
      role: 'Penobscot Nation Representative + tribal sovereignty advocate',
      era: '1990s-2010s',
      contribution: 'Multi-decade advocacy for tribal sovereignty + LD 291 Maine Indian Education + sovereignty bills.',
      legacy: 'Penobscot Nation Representative continues role she shaped.' },
    { name: 'Maulian Bryant (Penobscot Ambassador)',
      role: 'Penobscot Nation Ambassador',
      era: '2010s-present',
      contribution: 'Tribal sovereignty + cultural preservation + truth + reconciliation advocacy.',
      legacy: 'Current Penobscot leadership; ongoing influence.' },
    { name: 'Sherri Mitchell (Penobscot author + activist)',
      role: 'Penobscot author + Indigenous rights advocate',
      era: '2000s-present',
      contribution: 'Author of "Sacred Instructions" + multiple advocacy contributions.',
      legacy: 'Bridge between tribal traditions + contemporary Indigenous + environmental advocacy.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: GLOBAL CONTEXT FOR MAINE FISHERIES
  // ───────────────────────────────────────────────────────────
  var GLOBAL_CONTEXT = [
    { region: 'North Atlantic — Maine\'s Ecosystem',
      content: 'The Gulf of Maine is part of the North Atlantic ecosystem, bordered by Cape Cod + Nova Scotia. Connected to broader Atlantic + influenced by Gulf Stream + Labrador Current dynamics. Maine cod + lobster + striper populations are interconnected with broader Atlantic stocks. Climate change is reshaping entire ocean.',
      maine_relevance: 'Maine fisheries climate trajectory tied to broader North Atlantic dynamics. International coordination essential.' },
    { region: 'New England — Multi-State Coordination',
      content: 'Massachusetts, New Hampshire, Maine + Rhode Island all manage Atlantic-coast species cooperatively through ASMFC + NEFMC. Migrant species (striper, menhaden, lobster) cross state lines. Coordinated management essential.',
      maine_relevance: 'Maine\'s management actions affect + are affected by other New England states + Canada.' },
    { region: 'Canadian Maritime Coordination',
      content: 'Maine\'s lobster + cod + salmon populations overlap with Canadian waters. Treaty-based coordination + diplomatic relationships shape management. Climate-driven range shifts complicate.',
      maine_relevance: 'Maine fishermen need Canadian context for full picture.' },
    { region: 'Federal-State Cooperative Framework',
      content: 'US federal-state fisheries management is unusual + complex. Magnuson-Stevens Act framework. State waters (0-3 nm) + federal waters (3-200 nm) different jurisdictions. ASMFC + Regional Councils + NOAA + state agencies all interact.',
      maine_relevance: 'Maine fishermen work within multiple regulatory layers. Knowing each matters.' },
    { region: 'International Coordination (ICCAT, etc.)',
      content: 'Highly migratory species (bluefin tuna, swordfish, shark) managed by international commissions like ICCAT (Atlantic) + IATTC (Pacific). Maine bluefin charter operations interact with ICCAT framework.',
      maine_relevance: 'Maine offshore fishing intersects with international management.' },
    { region: 'Global Fish Markets',
      content: 'Maine seafood exports to global markets — Maine lobster + bluefin tuna + premium oysters all reach international buyers. Imported seafood (farmed salmon from Norway/Chile; fresh fish from Iceland; etc.) competes in US markets.',
      maine_relevance: 'Maine producers compete in global markets. Premium positioning + brand + provenance matter.' },
    { region: 'Climate Change as Global Force',
      content: 'Climate change is global but impacts vary regionally. Gulf of Maine warming ~4× global average; other regions warming less. Climate adaptation is local but informed by global science.',
      maine_relevance: 'Maine\'s response is unique to its conditions but informed by global research.' },
    { region: 'Indigenous Sovereignty in Global Context',
      content: 'Wabanaki sovereignty + Indigenous fishing rights in Maine parallel broader Indigenous movements globally. Maori in NZ, Indigenous Australians, First Nations in Canada all asserting + winning fishing rights.',
      maine_relevance: 'Maine\'s tribal sovereignty conversation is part of broader global movement.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MAINE FISHERIES INDUSTRY ASSOCIATIONS
  // ───────────────────────────────────────────────────────────
  var INDUSTRY_GROUPS = [
    { group: 'Maine Lobstermen\'s Association (MLA)',
      role: 'Industry trade group representing Maine commercial lobstermen.',
      function: 'Advocacy at state + federal level. Apprentice program coordination. Crisis response (right whale rules + climate adaptation).',
      contact: 'mainelobstermens.com. Multi-zone councils.',
      relevance: 'New + experienced lobstermen should engage.' },
    { group: 'Maine Coast Fishermen\'s Association (MCFA)',
      role: 'Independent voice for Maine commercial fishermen.',
      function: 'Advocacy + community + working-waterfront preservation.',
      contact: 'mainecoastfishermen.org.',
      relevance: 'Alternative voice; engaged with policy debate.' },
    { group: 'Maine Aquaculture Association (MAA)',
      role: 'Industry trade group; 200+ member operations.',
      function: 'Advocacy + training + technical consultation + lease application help. Annual conference.',
      contact: 'maineaquaculture.org. Augusta-based.',
      relevance: 'New aquaculture entrants should join.' },
    { group: 'Maine Charterboat Association',
      role: 'Charter fishing industry trade group.',
      function: 'Advocacy + training + community for Maine charter captains.',
      contact: 'mainecharterboats.org.',
      relevance: 'Charter operators benefit from association.' },
    { group: 'Atlantic States Marine Fisheries Commission (ASMFC)',
      role: 'Multi-state commission coordinating Atlantic coast fisheries.',
      function: '15-state coordination; stock assessments; quotas; species-specific management plans.',
      contact: 'asmfc.org.',
      relevance: 'Migratory species (striper, menhaden, lobster) managed here.' },
    { group: 'New England Fishery Management Council (NEFMC)',
      role: 'Federal council for New England federal-waters fisheries.',
      function: 'Develops federal fisheries management plans; sets quotas + closed areas.',
      contact: 'nefmc.org.',
      relevance: 'Cod + haddock + scallop + groundfish federal management.' },
    { group: 'NOAA Northeast Fisheries Science Center (NEFSC)',
      role: 'Federal science agency conducting stock assessments.',
      function: 'Stock assessments; ecosystem science; climate science; observer programs.',
      contact: 'nefsc.noaa.gov. Woods Hole + Sandwich + Maine offices.',
      relevance: 'Foundation of modern fisheries management.' },
    { group: 'Gulf of Maine Research Institute (GMRI)',
      role: 'Portland-based marine science nonprofit.',
      function: 'Research + outreach + education. Annual State of the Gulf reports.',
      contact: 'gmri.org.',
      relevance: 'Maine\'s primary fisheries-science org.' },
    { group: 'Maine DMR',
      role: 'Maine state agency.',
      function: 'State fisheries management + aquaculture leases + marine patrol.',
      contact: 'maine.gov/dmr.',
      relevance: 'Direct regulator. Every operator interacts.' },
    { group: 'Maine Coast Heritage Trust',
      role: 'Conservation NGO.',
      function: 'Working-waterfront conservation easements + advocacy.',
      contact: 'mcht.org.',
      relevance: 'Industry depends on preserved working waterfront.' },
    { group: 'Island Institute',
      role: 'Maine coastal community advocacy NGO.',
      function: 'Climate + fisheries + working-waterfront support.',
      contact: 'islandinstitute.org. Rockland-based.',
      relevance: 'Maine coastal community advocacy.' },
    { group: 'Penobscot Marine Museum',
      role: 'Maritime history museum.',
      function: 'Preserves Maine\'s maritime heritage; education + research.',
      contact: 'penobscotmarinemuseum.org. Searsport.',
      relevance: 'Cultural anchor + education resource.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX — FAMOUS WABANAKI HISTORICAL FIGURES
  // ───────────────────────────────────────────────────────────
  var WABANAKI_FIGURES = [
    { name: 'John Neptune (Penobscot)', era: 'Early 1800s',
      role: 'Penobscot statesman + tribal leader; signed multiple treaties.',
      contribution: 'Negotiated agreements affecting Penobscot fishing + harvesting rights. Maintained tribal connections during colonial pressure.',
      legacy: 'Penobscot Nation continues to honor Neptune\'s leadership. Cultural memory preserved.' },
    { name: 'Sopiel Soccabasin (Passamaquoddy)', era: 'Mid 1800s',
      role: 'Passamaquoddy chief + diplomat.',
      contribution: 'Worked to preserve Passamaquoddy fishing + cultural rights through period of intense colonial pressure.',
      legacy: 'Passamaquoddy Tribe continues to honor leaders of his era.' },
    { name: 'Molly Spotted Elk (Penobscot)', era: '1900s',
      role: 'Penobscot dancer + ethnographer + cultural advocate.',
      contribution: 'Documented Penobscot culture + traditions including fishing + waterway relationships.',
      legacy: 'Cultural preservation work continues to inform contemporary tribal sovereignty.' },
    { name: 'Charles Norman Shay (Penobscot)', era: '1900s-2000s',
      role: 'Penobscot WWII veteran + cultural advocate.',
      contribution: 'Advocated for Penobscot rights + sovereignty + cultural preservation.',
      legacy: 'Shay\'s WWII Normandy service brought attention to Penobscot Nation veterans.' },
    { name: 'Donna Loring (Penobscot)', era: '1900s-Present',
      role: 'Penobscot Nation Representative to Maine Legislature.',
      contribution: 'Advocated for tribal sovereignty + LD 291 Maine Indian Education + multiple sovereignty bills.',
      legacy: 'Penobscot Nation Representative continues to influence Maine politics + sovereignty.' },
    { name: 'Wabanaki REACH Founders', era: '2000s-Present',
      role: 'Organizational founders of Wabanaki REACH curriculum + education initiative.',
      contribution: 'Built Maine\'s leading Wabanaki history + culture educational resource. Engages with schools + communities statewide.',
      legacy: 'Wabanaki REACH curriculum is foundational for LD 291 compliance + tribal education.' },
    { name: 'Maulian Bryant (Penobscot)', era: '2000s-Present',
      role: 'Penobscot Nation Ambassador.',
      contribution: 'Advocates for tribal sovereignty + cultural preservation + truth + reconciliation in Maine.',
      legacy: 'Current generation Penobscot leadership; ongoing influence.' },
    { name: 'Sherri Mitchell (Penobscot)', era: '2000s-Present',
      role: 'Penobscot author + activist + lawyer.',
      contribution: 'Author of "Sacred Instructions: Indigenous Wisdom for Living Spirit-Based Change." Advocates for Indigenous sovereignty + environmental protection.',
      legacy: 'Bridge between tribal traditions + contemporary advocacy.' },
    { name: 'Maine-Wabanaki Truth + Reconciliation Commission', era: '2012-2015',
      role: 'Truth-telling commission documenting wrongs against Wabanaki children + families.',
      contribution: 'Final report (2015) documented systemic discrimination in child welfare + made reform recommendations.',
      legacy: 'Foundation for ongoing reconciliation work. Influenced Maine Indian Implementing Act discussions.' },
    { name: 'Tribal Aquaculture Coordinators (multiple, ongoing)',
      era: '2020s-Present',
      role: 'Tribal-led aquaculture initiative coordinators across Wabanaki nations.',
      contribution: 'Building tribal capacity for aquaculture; protecting tribal rights in coastal waters; cultural + economic benefit.',
      legacy: 'Future of Maine aquaculture increasingly tribal-led.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX — FISHERIES MANAGEMENT MILESTONES
  // ───────────────────────────────────────────────────────────
  var MGMT_MILESTONES = [
    { milestone: 'Magnuson-Stevens Act (1976)',
      year: 1976,
      summary: 'Foundation US federal fisheries law. Created 200-nm EEZ + 8 Regional Councils.',
      impact: 'Drove out foreign fleets; created federal-state coordination framework.',
      current_relevance: 'Foundation of all US federal fisheries management. Reauthorized periodically.' },
    { milestone: 'Sustainable Fisheries Act (1996)',
      year: 1996,
      summary: 'Amendment to Magnuson-Stevens. Added sustainability requirements + rebuilding plans.',
      impact: 'Made sustainability a legal mandate; rebuilding overfished stocks required.',
      current_relevance: 'Foundation of modern stock rebuilding.' },
    { milestone: 'V-Notch becomes federal law (1985)',
      year: 1985,
      summary: 'Maine\'s informal v-notch tradition codified into federal law.',
      impact: 'Lifetime protection for egg-bearing female lobsters made enforceable nationally.',
      current_relevance: 'Maine\'s distinctive conservation tool. Still working after 40+ years.' },
    { milestone: 'Striper Atlantic Coast Moratorium (1985-1990)',
      year: '1985-1990',
      summary: 'ASMFC + multi-state moratorium banned commercial sale of striped bass.',
      impact: 'Stock recovered by mid-1990s. Modern slot limits + circle-hook rules followed.',
      current_relevance: 'Stripers under management challenge again (2020s).' },
    { milestone: 'Atlantic Salmon ESA Listing (2009)',
      year: 2009,
      summary: 'Wild Atlantic salmon Gulf of Maine DPS listed as Endangered.',
      impact: 'Strict take prohibitions; conservation hatcheries; dam-removal partnerships.',
      current_relevance: 'Multi-decade restoration effort ongoing.' },
    { milestone: 'Penobscot River Restoration Project (2004-2016)',
      year: '2004-2016',
      summary: 'Two dams removed + one bypassed. 1,000+ river miles reopened.',
      impact: 'Sea-run fish returning; ecosystem recovery; tribal sovereignty affirmed.',
      current_relevance: 'Model for other Maine river restorations.' },
    { milestone: 'Atlantic Sturgeon ESA Listing (2012)',
      year: 2012,
      summary: 'Gulf of Maine sturgeon DPS listed as Endangered.',
      impact: 'Bycatch concerns + handling rules; restoration efforts.',
      current_relevance: 'Population recovering through restoration.' },
    { milestone: 'Right Whale Vessel Speed Rule (2008)',
      year: 2008,
      summary: 'NOAA implements seasonal 10-knot speed restrictions in NA right whale zones.',
      impact: 'Industry adapting; technology innovations.',
      current_relevance: 'Continuing strict enforcement.' },
    { milestone: 'Pershing et al. (2015) Cod-Climate Paper',
      year: 2015,
      summary: 'Documents Gulf of Maine warming + cod recovery failure.',
      impact: 'Changed scientific + management framing of climate + fisheries.',
      current_relevance: 'Foundation for climate-aware management.' },
    { milestone: 'Maine Indian Implementing Act (1980)',
      year: 1980,
      summary: 'Settled major Maine tribal land claims + defined tribal rights.',
      impact: 'Foundation for ongoing tribal sovereignty in Maine.',
      current_relevance: 'Continues to shape Maine fisheries + aquaculture.' },
    { milestone: 'Maine Indian Education Law LD 291 (2001)',
      year: 2001,
      summary: 'Maine state law requires Wabanaki content in K-12 curriculum.',
      impact: 'Wabanaki history + culture taught in schools statewide.',
      current_relevance: 'Wabanaki REACH curriculum implementation continues.' },
    { milestone: 'Atlantic Coastal Fisheries Cooperative Management Act (1993)',
      year: 1993,
      summary: 'Federal-state cooperative management framework for Atlantic coast fisheries.',
      impact: 'Foundation for ASMFC role + multi-state coordination.',
      current_relevance: 'Striped bass + menhaden + lobster all managed under this framework.' },
    { milestone: 'NSSP National Shellfish Sanitation Program (1925-)',
      year: '1925-',
      summary: 'Federal-state cooperative program managing shellfish safety.',
      impact: 'Foundation of US shellfish industry food safety.',
      current_relevance: 'Continuing modernization.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COMMON BOATING + FISHING TERMINOLOGY ESSAYS
  // ───────────────────────────────────────────────────────────
  // Expanded explanations of common terms.
  var TERMINOLOGY_ESSAYS = [
    { term: 'Astern', essay: 'Means "behind the boat." Origin: from Old English. Used by mariners to describe the direction behind the vessel. Often paired with "ahead" (in front). Practical: "Vessel astern" = vessel behind us. Important for collision avoidance + spatial awareness.' },
    { term: 'Anchor', essay: 'A device + technique for holding a boat in position via the bottom. Anchor types: Danforth (sand/mud, lightweight + good hold); Plow/CQR (versatile); Bruce (mixed bottom); mushroom (permanent moorings); grapnel (rocks). Scope ratio: 5:1 typical fair-weather; 7:1 storm; 10:1+ hurricane. Proper anchoring is mariner literacy.' },
    { term: 'Beam', essay: 'The width of the boat at its widest point. Determines stability + capacity. Wide beam = more stable but harder to tow + faster turn. Narrow beam = less stable but more efficient through water. Maine boatbuilding has both styles. Most Maine lobsterboats are wide-beamed for working stability.' },
    { term: 'Bilge', essay: 'The lowest interior part of the hull. Where water accumulates from leaks, rain, hose breaks. Should be kept dry; bilge pumps remove water. Bilge pump is one of the most important safety devices on a boat.' },
    { term: 'Bow', essay: 'The front of the boat. Pronounced like "down" — not like "bow" (arrow). The opposite of stern. Maine boats often have raised + sharp bows for cutting through chop. Most commercial fishing happens from the stern, so the bow design is mostly about handling waves.' },
    { term: 'Buoy', essay: 'A floating marker. Multiple types: lateral marks (channel boundaries), cardinal marks (safe quadrant), special marks (mooring, fairway, isolated danger). Color + shape + topmark indicate function. Red right returning is the foundation in IALA-B (North America).' },
    { term: 'Bycatch', essay: 'Non-target species caught incidentally. Major sustainability concern. Different gear types have very different bycatch profiles. Lobster traps = highly target-specific (few bycatch). Gillnets + longlines historically had high bycatch + ecological impact. Modern management increasingly emphasizes bycatch reduction.' },
    { term: 'Cardinal Mark', essay: 'A buoy indicating the SAFE quadrant relative to the mark. Black-over-yellow with up-cones = north (safe water to north of mark). Black-yellow-black with up-down cones = east. Yellow-over-black with down-cones = south. Yellow-black-yellow with down-up cones = west. The shape + color combination signals direction.' },
    { term: 'COLREGS', essay: 'COLlision REGulations — the international rules of the road for vessels. 1972 convention. 38 rules organized by visibility (any visibility, in sight, restricted visibility) and by lights/sounds/distress signals. Every mariner should master Rules 5-18 (look-out, safe speed, encounters, give-way + stand-on rules, vessel hierarchy).' },
    { term: 'Crew', essay: 'Person or persons operating a boat. Single-hand operation possible for small boats. Larger commercial vessels have multiple crew with specific roles. Maine lobstering: captain + sternman is the standard 2-person crew. Charter operations: captain + mate.' },
    { term: 'Dead Reckoning (DR)', essay: 'Navigation method using course + speed + time + last known fix. Distance = speed × time. Heading + distance from last fix gives estimated position. Pre-GPS standard. Still required backup when GPS fails. Foundation of mariner literacy.' },
    { term: 'Displacement', essay: 'Weight of water a floating boat displaces — equal to boat weight by Archimedes\' Principle. Displacement hull plows through water (slower but steadier). Planing hull rises onto bow wave at speed (faster but less stable). Maine lobsterboats are typically semi-displacement (a hybrid).' },
    { term: 'EPIRB', essay: 'Emergency Position-Indicating Radio Beacon. 406 MHz satellite signal activated automatically (in water) or manually. Registered to vessel. Transmits position to Coast Guard within minutes of activation. Single most life-saving device after PFD.' },
    { term: 'Fathom', essay: 'Traditional unit of depth = 6 feet. Older charts may use fathoms. Modern charts use meters or feet. "Fathom of water" = 6 feet of depth. The word comes from Old English "fæthm" = embrace, referring to outstretched arms.' },
    { term: 'Gunwale (pronounced "gun-nul")', essay: 'The upper edge of a boat\'s side. Where you grip when boarding. Where rod holders attach. Where lobsters get banded over before going in the tank. Word from "gun + wale" — historic term for area where guns were mounted on warships.' },
    { term: 'Helm', essay: 'The steering apparatus + the act of steering. "At the helm" = steering the boat. "Helmsman" = person steering. Maine commercial lobster boats: helm is enclosed in pilothouse. Recreational + smaller boats: helm may be open.' },
    { term: 'IALA Region B', essay: 'The buoyage system used in the Americas, Japan, Korea, Philippines. Red marks on starboard when returning to harbor (red-right-returning). Reversed in Region A (Europe + Africa + most of Asia). Universal within each region. Conventions identical so foreign mariners can navigate any port.' },
    { term: 'Jib', essay: 'A triangular sail set forward of the mast. Sailing vessels have multiple jib + foresail configurations. Less relevant to commercial fishing (mostly power-driven) but central to recreational + heritage sailing.' },
    { term: 'Knot', essay: '(1) Unit of speed = 1 nautical mile per hour. (2) Tied loop or hitch in rope. Mariners use both meanings constantly. Speed of 10 knots = 10 nautical miles per hour = ~11.5 statute miles per hour. Knot tying is foundational mariner literacy.' },
    { term: 'Lobster Trap', essay: 'Wire-mesh wood-frame trap with 2 chambers ("kitchen" + "parlor") + escape vents. Set on rocky bottom. Lobsters enter for bait, end up in parlor where exit is difficult. Surface marked by color-coded buoy. Required gear features: escape vents (release sub-legal), identifying tags, color codes by license number.' },
    { term: 'MAYDAY', essay: 'International distress call. Triple repetition ("MAYDAY MAYDAY MAYDAY") + triple identification ("This is [vessel] [vessel] [vessel]") + position + nature + people + vessel description + "Standing by Ch 16." Origin: French "m\'aider" (help me). VHF Channel 16. Federal felony to misuse (up to 6 years + $250K fine).' },
    { term: 'Nun', essay: 'Red conical lateral buoy. Even-numbered. In IALA-B: keep on starboard when entering harbor. Shape is conical to distinguish from cylindrical "can" (green). Color + shape redundancy lets colorblind mariners navigate by shape alone.' },
    { term: 'PFD', essay: 'Personal Flotation Device. USCG-approved per type. Required on every boat for every person. Maine state law: children under 13 MUST WEAR underway. Statistically most boating drowning deaths involve PFD aboard but not worn. Wear yours.' },
    { term: 'Port + Starboard', essay: '"Port" = left side facing forward (boat\'s left). "Starboard" = right side facing forward. Origin: "port" because ships once moored to port (left) side. "Starboard" from "steerboard" — old steering oar on right side. Universal mariner vocabulary; no confusion.' },
    { term: 'Right of Way', essay: 'Who has priority in a vessel encounter. Per COLREGS hierarchy: vessels not under command > vessels restricted in maneuverability > fishing vessels > sail vessels > power vessels. Power gives way to sail. Sail gives way to all others. Special case Rule 13: overtaking vessel gives way regardless.' },
    { term: 'Scope', essay: 'Anchor line length ratio. Scope ratio = rode length ÷ water depth + freeboard. 5:1 fair-weather; 7:1 typical storms; 10:1+ extreme conditions. Insufficient scope = anchor pulls + drags. Mariners memorize this; many anchor failures = wrong scope.' },
    { term: 'Slack Tide', essay: 'The brief period (~30 minutes) when tidal current changes direction. Maximum velocity is mid-flood + mid-ebb. Slack is when current = 0. Often the best fishing window because predators move into shallow water + baitfish hold without being swept.' },
    { term: 'Stern', essay: 'The back of the boat. Opposite of bow. Most commercial fishing happens from the stern. Lobster boats have wide aft decks for trap handling. Charter sport-fishing boats often have a "transom" (flat stern) for stand-up tuna fishing.' },
    { term: 'Tide', essay: 'The periodic rise + fall of water level driven by lunar + solar gravity. Maine has semidiurnal tides: 2 highs + 2 lows daily. Range varies: ~9 ft Casco Bay; up to 25 ft Eastport. Springs (full + new moon) have maximum range; neaps (quarter moons) have minimum.' },
    { term: 'VHF Marine Radio', essay: 'Very High Frequency marine radio. Channel 16 (156.8 MHz) is the international distress + hailing channel. Required monitoring while underway. DSC-equipped radios can send automated distress with position. Mariner\'s phone — but better-quality + safety-critical.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: GEAR + EQUIPMENT MASTER LIST
  // ───────────────────────────────────────────────────────────
  var GEAR_MASTER = [
    { category: 'Navigation Electronics',
      items: [
        'GPS Chartplotter — combines GPS receiver + electronic charts + display',
        'Radar — radio-frequency object detection; essential in fog',
        'AIS (Automatic Identification System) — broadcasts your position; receives others',
        'Depth Sounder / Fishfinder — measures water depth + displays fish + bottom features',
        'VHF Marine Radio — Channel 16 monitoring; DSC capability recommended',
        'Compass — magnetic + true; gimbaled for boat motion',
        'Anemometer — wind speed + direction',
        'Barometer — atmospheric pressure',
        'EPIRB — Emergency Position Indicating Radio Beacon',
        'PLB — Personal Locator Beacon (worn on PFD)'
      ] },
    { category: 'Safety Equipment',
      items: [
        'PFDs — Type I (offshore turn-up), II (near-shore), III (water sports), V (special use)',
        'Fire Extinguishers — B-I or B-II rated',
        'Visual Distress Signals — pyrotechnic flares + LED SOS strobes',
        'Sound Signal — air horn + athletic whistle backup',
        'Navigation Lights — red port + green starboard + white stern',
        'Anchor + Rode + Chain',
        'First Aid Kit — marine-grade',
        'Throw Bag / Rescue Line — 50-75 ft floating line in deployable bag',
        'Bilge Pump — automatic + manual backup',
        'Tools + Spare Parts',
        'Survival Suits / Immersion Suits — for offshore vessels',
        'Life Raft — for offshore vessels'
      ] },
    { category: 'Fishing Gear (General)',
      items: [
        'Rods — light spinning to heavy offshore stand-up',
        'Reels — spinning, conventional, electric (offshore)',
        'Line — monofilament, fluorocarbon, braided',
        'Hooks — barbless (release), barbed, circle (recommended), J-hook, treble',
        'Sinkers — egg, pyramid, bullet, banana, jigging head',
        'Lures — jigs, spoons, plugs, soft plastic, flies',
        'Bait — sea worm, sand eel, mackerel chunks, menhaden, green crab, clam',
        'Hooks-and-sinker rigs — pre-tied',
        'Wire leader — for toothy fish (bluefish)',
        'Fluorocarbon leader — for clear-water fish (striper)'
      ] },
    { category: 'Lobster Trapping',
      items: [
        'Lobster traps — kitchen + parlor design',
        'Escape vents — required size',
        'Trap warp — line connecting trap to surface buoy',
        'Surface buoys — color-coded per Maine DMR',
        'Pot hauler — hydraulic winch on boat',
        'Lobster gauge — brass measuring tool',
        'Banding tool — for putting bands on claws',
        'V-notching tool — for marking egg-bearing females',
        'Catch tanks / live wells',
        'Bait bags + bait — herring, mackerel, alewives'
      ] },
    { category: 'Charter / Sport-Fishing',
      items: [
        'Multiple rods + reels in appropriate weights',
        'Outriggers — spread fishing lines',
        'Downriggers — run lures at specific depths',
        'Gaff hooks + nets',
        'Priest (humane dispatch tool)',
        'Fillet knife + sharpener',
        'Cooler — large insulated',
        'Charter packing materials',
        'First aid + safety equipment for clients',
        'PFDs sized for multiple body types'
      ] },
    { category: 'Boat Maintenance',
      items: [
        'Engine oil + filters',
        'Fuel filter',
        'Spark plugs (if applicable)',
        'Anodes (zinc/aluminum sacrificial)',
        'Belts + hoses (inboard)',
        'Impeller (raw-water pump)',
        'Coolant',
        'Battery + terminals + charger',
        'Tools — wrenches, screwdrivers, pliers',
        'Fresh-water flush attachment (for outboard)',
        'Marine grease + lubricants',
        'Sealant + epoxy + glue (marine-grade)'
      ] },
    { category: 'Cold Weather + Wet Gear',
      items: [
        'Foul-weather jacket + pants',
        'Bib overalls',
        'Boots — neoprene + Wellingtons',
        'Insulated gloves',
        'Hat + balaclava',
        'Sunglasses (polarized)',
        'Sunscreen',
        'Insulated mug',
        'Survival blanket'
      ] },
    { category: 'Communication',
      items: [
        'Mobile phone + waterproof case',
        'Satellite phone (for offshore)',
        'Spare batteries / portable charger',
        'Notebook + pencil + waterproof bag',
        'Compass + chart book backup'
      ] }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX — DETAILED MENTORSHIP + APPRENTICESHIP CONTENT
  // ───────────────────────────────────────────────────────────
  var MENTORSHIP_GUIDE = [
    { topic: 'Why Maine Lobster Has an Apprenticeship',
      content: 'Maine\'s lobster industry uses a structured apprenticeship system because lobstering is a complex multi-year skill requiring practical experience that can\'t be learned from books. The 1000-hour requirement reflects what experienced lobstermen know: making consistent good decisions about trap placement, weather, gear maintenance, regulation compliance, and crew handling takes years. The apprenticeship also serves social purposes: building relationships between generations of fishermen, transmitting cultural knowledge, vetting new entrants for trustworthiness in a tight-knit industry.',
      practical: 'For aspiring lobstermen: find a mentor early; document hours carefully; absorb everything; treat the mentor with respect.' },
    { topic: 'Apprentice + Mentor Relationship Dynamics',
      content: 'The apprentice + mentor relationship is professional but also personal. Apprentices crew on the mentor\'s boat, sharing the mentor\'s daily rhythm + season. Mentors invest time in teaching, often without direct compensation. The exchange is implicit: time + knowledge + access in exchange for labor + dedication + future industry stewardship. Some apprentices become like family. Disagreements happen; conflict resolution often informal but real.',
      practical: 'Approach as long-term relationship not transaction. Be patient + respectful + reliable.' },
    { topic: 'What Apprentices Learn (Technical)',
      content: 'Technical skills: navigation in your area\'s waters; tide + weather pattern recognition; specific bottom features + lobster habitat; trap setting + hauling technique; gear maintenance; conservation rules (v-notch, size, escape vents); legal + regulatory framework; boat handling in your boat type; emergency procedures; record-keeping; market timing; relationships with buyers + co-op + dock workers; off-season maintenance.',
      practical: 'Master each before moving on. Take notes. Ask questions.' },
    { topic: 'What Apprentices Learn (Cultural)',
      content: 'Cultural knowledge: harbor gang dynamics + decision-making; multi-generational family lineages + reputations; informal codes of behavior; conflict resolution patterns; communication norms (radio, dock, harbor); Wabanaki sovereignty + history if relevant to local waters; community ethics + sustainability mindset; how to handle difficult customers + buyers; how to read other fishermen\'s intentions.',
      practical: 'Listen + observe. Cultural knowledge is harder than technical; takes years.' },
    { topic: 'After Apprenticeship — Class I License + Beyond',
      content: 'After completing 1000+ documented hours over 2 years, apprentices apply for Class I commercial lobster license through DMR. Some zones have waiting lists (5:1 ratio: 5 retirements before 1 new license). Once licensed, options: Class I solo (800 traps; no sternman); Class II (800 traps + sternman); Class III (800 traps + 2 sternmen). License + zone-specific entry continue throughout career.',
      practical: 'Plan financially for license + boat + gear once Class I issued. Some apprentices buy boat during apprenticeship; others wait.' },
    { topic: 'Mentoring Next Generation',
      content: 'Class I licensed lobstermen who become mentors continue the cycle. Mentorship is industry infrastructure — without it, knowledge gets lost; without new entrants, industry shrinks. Many lobstermen actively recruit + train. Mentorship is both professional duty + personal reward.',
      practical: 'As you become experienced: take on apprentices. Document mentorship hours for them. Pass on the knowledge.' },
    { topic: 'Apprenticeship in Other Maine Fisheries',
      content: 'Most other Maine fisheries don\'t have formal apprenticeship like lobster, but informal mentor systems exist. Striper fishing, tuna fishing, ground fish, scallop — newcomers often start by crewing on existing boats. Charter operations have informal training networks. Aquaculture has more structured training through Maine Aquaculture Association + UMaine + Maine Sea Grant.',
      practical: 'Talk to operators in your target fishery. Express interest in learning. Be willing to start at the bottom.' },
    { topic: 'Female + Tribal + Diverse Apprentices',
      content: 'Maine\'s commercial fishing has historically been male-dominated + concentrated in coastal white families. Recent years: more women + diverse + tribal apprentices entering. Mentorship + community support help break barriers. Maine Lobstermen\'s Association + Maine Aquaculture Association + tribal-led organizations all expanding outreach.',
      practical: 'Industry needs new voices + perspectives. If you\'re from a non-traditional background, persistence + finding good mentors are key.' },
    { topic: 'Workforce + Community Development',
      content: 'Apprenticeship + mentorship are foundational to working-waterfront sustainability. Multi-generational families + community continuity require new entrants. Maine\'s rural coastal communities depend on continued industry vitality. Apprentices = future industry leaders + community anchors.',
      practical: 'Approach apprenticeship as community investment + your career investment.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX — VOICES FROM MAINE WORKING WATERFRONT
  // ───────────────────────────────────────────────────────────
  var VOICES = [
    { speaker: 'Stonington Lobsterman (multi-generation, age 60s)',
      quote: 'I started apprenticing with my dad at 14. Got my license at 22. Now I\'m teaching my grandson at 14. Three generations on the same waters. The lobster is different now — bigger, more abundant, but the climate changes are real. We see it. We adapt. That\'s what we do.',
      context: 'Multi-generation continuity in Maine lobstering. Adaptation is part of tradition.' },
    { speaker: 'Damariscotta Oyster Farmer (first-generation, age 35)',
      quote: 'I didn\'t grow up on the water. I came from suburban Connecticut. Three years ago I got an LPA from DMR. The first year was zero income. Now I sell at the farmers market every Saturday + to three restaurants in Portland. I tell people: Maine oysters taste of cold + minerals + place. That story sells.',
      context: 'First-generation entrant succeeding through D2C + storytelling.' },
    { speaker: 'Passamaquoddy Tribal Fisheries Coordinator',
      quote: 'My nation has fished these waters for 12,000 years. We managed alewife runs sustainably for millennia. State + federal management is recent + has often disregarded our knowledge + rights. We\'re asserting sovereignty again — through aquaculture projects, through restoration partnerships, through education. The future of Maine fisheries is more tribal-led.',
      context: 'Tribal sovereignty + traditional knowledge converging with modern management.' },
    { speaker: 'Female Charter Captain (USCG Master license, age 40s)',
      quote: 'I was the only woman in my OUPV class. That was 20 years ago. Now there are 5-10 female captains in southern Maine. We\'re changing the industry. Our customers love it — multi-generational families especially. Industry is opening up.',
      context: 'Gender inclusion in Maine charter industry.' },
    { speaker: 'Penobscot Marine Biologist',
      quote: 'Restoring the Penobscot River took decades + multi-tribal + federal + state + ngo coordination. Removing dams was just one piece. The fish came back faster than we thought possible. Now we\'re working on the Sheepscot + other rivers. Restoration works if you commit.',
      context: 'Multi-decade restoration commitment + tribal leadership.' },
    { speaker: 'Atlantic Sea Farms Kelp Operator',
      quote: 'I lobster in summer + grow kelp in winter. Atlantic Sea Farms gives me seed + buys back the crop. My income is now seasonal-stacked. Climate-friendly + community-building + diversified.',
      context: 'Diversification + cooperative model = climate-resilient industry.' },
    { speaker: 'Boothbay Boatyard Owner',
      quote: 'I build lobster boats for the next generation. Each boat has its captain\'s personality + the area\'s specific waters. Building a boat is multi-month conversation with the customer. We\'re preserving Maine boatbuilding tradition while incorporating new tech + materials.',
      context: 'Maine boatbuilding heritage continuing + adapting.' },
    { speaker: 'Maine DMR Aquaculture Coordinator',
      quote: 'I process 50-100 lease applications a year. Each is unique — different waters, different applicants, different objections from abutters. Tribal sovereignty + climate adaptation + working waterfront preservation all factor in. The future of Maine aquaculture is being shaped one decision at a time.',
      context: 'State-level shaping of industry through case-by-case decisions.' },
    { speaker: 'Maine High School Marine Sciences Teacher',
      quote: 'My students live in coastal Maine but most don\'t know about the working waterfront. We take field trips to lobster boats + aquaculture farms. We invite working fishermen + tribal speakers. We connect to climate science. By senior year, my students think differently about the ocean + their place.',
      context: 'Education connecting next generation to industry + ecosystem.' },
    { speaker: 'Senior NOAA Right Whale Researcher',
      quote: 'The right whale crisis is unfolding in real time. Population ~340 + declining. Maine\'s industry transition to ropeless gear is among the most difficult in fisheries history. But we have no choice if we want right whales to survive. The next 10 years will determine.',
      context: 'Conservation urgency + industry transition.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: FISHERIES FUTURE OUTLOOK + RESEARCH FRONTIERS
  // ───────────────────────────────────────────────────────────
  var FUTURE_OUTLOOK = [
    { topic: 'Climate-Adapted Fisheries Management',
      content: 'Stock assessments increasingly incorporate climate models. Range-shift forecasting tools developed at NEFSC + GMRI. Management plans being redesigned to anticipate climate-driven changes in fish distribution + recruitment.',
      maine_implications: 'Maine fisheries science + management increasingly climate-aware. Adaptive management framework emerging.' },
    { topic: 'Range Shifts + Northern Migration',
      content: 'Warm-water species (black sea bass, summer flounder, butterfish) reliably arriving in Maine. Cold-water species (cod, mussel) may shift further north over decades. Maine may become climate refuge for some species.',
      maine_implications: 'Industry adaptation: target shifting species. Some fisheries close; others open.' },
    { topic: 'Right Whale Recovery Effort',
      content: 'NA right whale population ~340 + critically endangered. Major recovery effort: vessel speed zones, ropeless gear mandates, seasonal closures, real-time monitoring. Industry transitioning rapidly.',
      maine_implications: 'Maine lobster industry economic + cultural transition.' },
    { topic: 'Atlantic Salmon Restoration',
      content: 'Penobscot River Restoration completed 2016. Other Maine rivers similarly being prepared. Hatchery + dam-removal + habitat-restoration coordinated. Long-term recovery prospects guarded.',
      maine_implications: 'Multi-decade tribal-led restoration; potential commercial fishery future generations.' },
    { topic: 'Aquaculture Industry Growth',
      content: 'Maine aquaculture growing 10-20% annually in oyster + kelp + RAS segments. Industry expanding from $50M (2010) to $100M+ (2024). Climate-resilient food production.',
      maine_implications: 'Major economic + employment growth. Climate-adaptive future for Maine working waterfront.' },
    { topic: 'Tribal Sovereignty + Fisheries',
      content: 'Continuing legal + cultural evolution of Wabanaki sovereignty in Maine fisheries. Tribal-led restoration projects + fishery management roles + aquaculture initiatives expanding.',
      maine_implications: 'Future of Maine fisheries is more tribally-led. Honor sovereignty.' },
    { topic: 'Working Waterfront Preservation',
      content: 'Maine Working Waterfront Access Protection Program continues. Conservation easements + zoning preserve commercial fishing + aquaculture infrastructure against coastal gentrification.',
      maine_implications: 'Industry depends on continued waterfront access. Active advocacy required.' },
    { topic: 'Forage Fish Management Reform',
      content: 'Atlantic menhaden + alewife + herring increasingly managed for ecosystem services (feeding predators) not just direct extraction. ASMFC + state agencies coordinating.',
      maine_implications: 'Stronger forage = stronger striper + tuna + whales. Long-term benefit.' },
    { topic: 'Stock Recovery Successes',
      content: 'Striped bass (1985-1995), haddock (2010s), monkfish (2000s), Acadian redfish (2012) all rebuilt. Demonstrates effective management can succeed.',
      maine_implications: 'Recovery is possible. Cod recovery in Gulf of Maine remains elusive due to climate. Continue investment.' },
    { topic: 'Climate-Driven Migration Disputes',
      content: 'As species shift range, jurisdictional boundaries become contested. Maine + Canadian + Mass + RI + CT + NY + NJ all interested in shifting striper + sea bass + lobster.',
      maine_implications: 'Diplomatic + management coordination critical. ASMFC role expanded.' },
    { topic: 'Workforce Pipeline Development',
      content: 'Aging industry workforce + climate-driven changes require new entrants. UMaine + community colleges + Maine Sea Grant + tribal-led training expanding.',
      maine_implications: 'Education pipeline = industry sustainability.' },
    { topic: 'Marine Spatial Planning',
      content: 'Maine + federal coordination on use of coastal + offshore waters: fisheries + aquaculture + offshore wind + recreation + conservation. Tradeoffs being made.',
      maine_implications: 'Industry must engage in planning process. Marine spatial conflicts emerging with offshore wind.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX — COMPREHENSIVE NAUTICAL CHART READING GUIDE
  // ───────────────────────────────────────────────────────────
  var CHART_GUIDE = [
    { topic: 'Chart Datum + Vertical Reference',
      content: 'NOAA US coastal charts use Mean Lower Low Water (MLLW) as the depth datum. Chart depths are measured FROM this reference. At low tide, actual water depth ≈ charted depth. At high tide, actual depth = charted + tidal height above MLLW. Tide tables give corrections for any given hour.',
      practical: 'Plan shallow-water transits for high tide. At low tide, charted depths are reality.' },
    { topic: 'Soundings + Depth Contours',
      content: 'Numbers on charts = depth (feet or meters; see chart legend). Contour lines = lines of equal depth: 6 ft, 12 ft, 18 ft, 30 ft, 60 ft, 90 ft, etc. Color shading: pale blue = shallowest (≤6 ft); deeper blue = progressively deeper. White = deeper than chart\'s deepest contour.',
      practical: 'Read contours like topographic lines. Shallow areas = potential hazards.' },
    { topic: 'Bottom Type Indicators',
      content: 'Codes near soundings: S = sand, M = mud, Rk = rock, Co = coral (rare in Maine), Sh = shells, Sft = soft, Hrd = hard, Gr = gravel, Wd = weeds, Sk = sticky.',
      practical: 'Bottom type matters for anchoring (mud/sand best), fishing (rocky = lobster + cod habitat), navigation (rock = hazard).' },
    { topic: 'Buoyage Markers',
      content: 'Triangle (solid) = nun (red, even-numbered). Square (solid) = can (green, odd-numbered). Circle = mooring or special buoy. Various cardinal mark patterns. Lighthouse symbol = star with rays. Light = magenta or red exclamation mark with light character codes.',
      practical: 'Learn standard symbols; reference chart legend for unique markers.' },
    { topic: 'Light Characteristics',
      content: 'Code patterns near lights describe flash pattern + color + range. Example: "Fl R 4s 18ft 6M" = single red flash every 4 seconds, 18 feet above mean high water, visible 6 nautical miles. "Iso" = isochronous (equal periods); "Mo(A)" = Morse "A" (.-); "Q" = quick flash; "VQ" = very quick.',
      practical: 'Match flash pattern visible at night to chart to identify navigation aids.' },
    { topic: 'Aids to Navigation Schedule',
      content: 'Some buoys are seasonal (placed in spring, removed before winter). Charts note which. USCG Light List (free online) provides current status + characteristics.',
      practical: 'Don\'t rely on memory; check USCG Notices to Mariners + Light List for current status.' },
    { topic: 'Compass Roses',
      content: 'Compass roses on charts show 360° in two scales: inner (degrees magnetic) + outer (degrees true). Difference = magnetic variation. Maine variation typically ~14-16° West. Updated periodically as magnetic North moves.',
      practical: 'Magnetic + W variation = True. Use the appropriate ring for the kind of bearing you\'re plotting.' },
    { topic: 'Chart Scale + Detail',
      content: 'Different chart scales: Sailing (1:600,000+), General (1:150,000-600,000), Coastal (1:50,000-150,000), Harbor (1:5,000-50,000). Larger scale = more detail. Always use largest-scale chart available for current location.',
      practical: 'Multi-scale chart portfolio for any planned trip. Use largest-scale for harbor approach.' },
    { topic: 'Notice to Mariners',
      content: 'USCG publishes weekly notices of buoy changes, dredging, restricted areas, etc. Charts get periodically updated; in between updates, the notice is current authority.',
      practical: 'Sign up for USCG Notice to Mariners email. Update charts seasonally.' },
    { topic: 'Electronic Chart Reading',
      content: 'GPS chartplotters display electronic versions of NOAA charts. ENC (Electronic Navigational Chart) format. Same symbology as paper. Tap features for additional info. Update charts via internet.',
      practical: 'Electronic chart + GPS + paper backup = best modern setup.' },
    { topic: 'Tide + Current Diamonds',
      content: 'On larger-scale Maine charts, rotated diamonds mark tide stations + current observation points. Pull data from NOAA tidesandcurrents.noaa.gov for predicted heights + current speeds.',
      practical: 'Plan trips around tide stages; check current at narrow passages.' },
    { topic: 'Wrecks + Submerged Hazards',
      content: 'Outlined hull symbol = sunken wreck; depth notation if known. Plus signs (+) = submerged rocks. Circles around plus = isolated dangers requiring wide berth. Dotted-line contours = uncertainty in depth.',
      practical: 'Plot routes to avoid known hazards. Local knowledge often supplements chart data.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX — COMPREHENSIVE SAFETY MANUAL
  // ───────────────────────────────────────────────────────────
  var SAFETY_MANUAL = [
    { topic: 'Personal Flotation Devices (PFDs)',
      detail: 'USCG-approved PFD required for every person on every boat. Types: I (offshore, turns unconscious face-up); II (near-shore); III (water sports); V (special use, inflatable). Maine state law: children under 13 MUST WEAR underway. Many adult drowning deaths involve PFD aboard but not worn. Wear yours.',
      training: 'Inspect annually for damage. Replace 10-year-old PFDs. Test inflatable CO₂ + fabric annually.',
      best_practice: 'WEAR your PFD whenever underway. Don\'t stow it in cabin.' },
    { topic: 'Cold-Water Survival (1-10-1 Rule)',
      detail: 'Maine waters are dangerously cold most of year (50-65°F May-September; below 50°F rest). Cold shock: first 1 minute of immersion can cause gasping reflex + drowning. Useful muscle function: ~10 minutes before hands fail. Hypothermia: ~1 hour to incapacitation in 50°F water.',
      training: 'Take a cold-water survival course (Maine Maritime Academy, USCG Auxiliary). Practice in pool first; never alone.',
      best_practice: 'PFD on; minimize movement to conserve heat; HELP/huddle positions; signal + wait for rescue.' },
    { topic: 'VHF Marine Radio — Use + Distress',
      detail: 'Channel 16 (156.8 MHz) is the international distress + hailing channel. Required monitoring while underway. Channel 9 is alternate hailing. Channels 22A, 68, 69, 71, 72, 78 are working channels. MAYDAY: life-threatening; PAN-PAN: urgent but not immediate; SÉCURITÉ: safety information.',
      training: 'Practice radio checks on Ch 9. Memorize MAYDAY format. Get FCC marine VHF license if required (commercial only).',
      best_practice: 'Monitor Ch 16. Keep transmissions brief. Don\'t test on 16.' },
    { topic: 'EPIRB + PLB',
      detail: 'EPIRB: Emergency Position-Indicating Radio Beacon. Registered to vessel; activated automatically (in water) or manually. 406 MHz satellite signal. PLB: Personal Locator Beacon; smaller, worn on PFD. Both reach Coast Guard within minutes of activation.',
      training: 'Test self-diagnostic monthly. Replace battery per manufacturer (5-7 years). Register with NOAA.',
      best_practice: 'Carry one + know how to activate. Could be life-saving.' },
    { topic: 'Float Plan',
      detail: 'Before each trip, file a float plan with a person ashore. Information: vessel description + crew names + departure time + planned route + expected return + emergency contact + signal flags + radio channels you\'ll monitor.',
      training: 'Develop float plan template. Use it consistently.',
      best_practice: 'If you don\'t return, person ashore can alert USCG. Has saved countless lives.' },
    { topic: 'Fire Onboard',
      detail: 'Boat fires often start in engine compartment (fuel-line leaks, electrical) or galley. PASS technique with fire extinguisher: Pull pin, Aim base, Squeeze handle, Sweep base.',
      training: 'Practice with empty extinguisher. Know location of all extinguishers + fire-source areas.',
      best_practice: 'Required + readily-accessible extinguishers. Crew briefing on locations + use.' },
    { topic: 'Man Overboard Procedure',
      detail: '1. Shout "MAN OVERBOARD" + identify side. 2. Throw flotation immediately. 3. Keep visual contact. 4. Reduce speed + circle back. 5. Approach from downwind. 6. Get victim aboard or attached.',
      training: 'Practice quarterly with buoy. Time yourself.',
      best_practice: 'Practice in calm conditions before need.' },
    { topic: 'Lightning Safety',
      detail: 'Stay low + away from metal contacts. Don\'t use radio during active storm. After strike: inspect electronics + electrical for damage. Lightning strike + medical evaluation if anyone struck.',
      training: 'Storm tracking + return-to-harbor protocols.',
      best_practice: 'Best safety: be in harbor when lightning threatens.' },
    { topic: 'Capsize + Foundering',
      detail: 'Stay with the boat if possible (more visible to rescuers). Get PFDs on everyone. MAYDAY on VHF if functional. Deploy emergency signals. HELP/huddle for heat conservation.',
      training: 'Cold-water survival course.',
      best_practice: 'Never overload. Maintain trim + stability.' },
    { topic: 'Fog Operations',
      detail: 'COLREGS Rule 6 — safe speed (you can stop in distance of visibility). Sound 1 prolonged blast (4-6 sec) every 2 minutes for power vessel underway. Use radar + GPS chart. Monitor VHF Ch 16. Heightened lookout.',
      training: 'Practice fog signals + radar interpretation.',
      best_practice: 'Avoid fog operations if possible. Plan + monitor.' },
    { topic: 'Heavy-Weather Operations',
      detail: 'Reduce speed. Head into seas at moderate angle (avoid pounding + broaching). Crew below + PFDs on. Deploy drogue or sea anchor if needed. Maintain radio contact.',
      training: 'Develop heavy-weather protocols + practice in moderate conditions.',
      best_practice: 'Plan + don\'t go out in deteriorating weather.' },
    { topic: 'Medical Emergency at Sea',
      detail: 'Stabilize victim; basic first aid. VHF Ch 16 for MEDEVAC if life-threatening. Provide position + nature + crew count. Document everything.',
      training: 'CPR + first aid certification. Annual refresher.',
      best_practice: 'Marine first aid kit + training.' },
    { topic: 'Running Aground',
      detail: 'Stop engine immediately to prevent damage. Assess: tide rising or falling? If rising: may float free; check hull damage; secure. If falling: stay with boat until next tide cycle. Document for insurance.',
      training: 'Recognize grounding hazards + plan + chart properly.',
      best_practice: 'Maintain proper chart + GPS. Recognize bottom signatures.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX — DETAILED OPERATIONAL PLAYBOOKS
  // ───────────────────────────────────────────────────────────
  var PLAYBOOKS = [
    { situation: 'Day 1 on a New Lobster Boat',
      walkthrough: [
        'Before sunrise: arrive at boat. Check tide + weather. Pre-trip safety inspection.',
        'Cast off + leave harbor (idle speed; pass commercial traffic; sound signals if needed).',
        'Reach trap line (use chartplotter + visual landmarks; identify your trap line by buoy color + tag).',
        'Pull first trap: turn boat into wind/current; engage hydraulic pot-hauler; bring trap aboard onto rail.',
        'Open trap: bait bag inspection + replacement; check for lobster.',
        'Measure each lobster: brass gauge eye-socket to back of body shell. Below 3.25" → release immediately. Above 5" → release immediately. V-notched females → release immediately.',
        'For keepers: band claws. Place in tank.',
        'For egg-bearing females: V-notch tail flipper. Release.',
        'Close trap + redeploy in correct depth + bottom type. Repeat 200-800 traps depending on day.',
        'Return to dock. Unload catch. Sort for market.',
        'Clean boat + flush outboard with fresh water.',
        'Log catch + observations. Plan tomorrow.'
      ],
      learning: 'Experience matters; each lobsterman has personal rhythm; multi-year apprenticeship necessary.' },
    { situation: 'Setting Out for a Charter Trip',
      walkthrough: [
        'Pre-trip prep: confirm weather forecast; brief customers on safety; check VHF + EPIRB.',
        'Welcome customers to boat: safety briefing (PFDs, MOB procedure, signals); explain trip plan.',
        'Cast off: pass commercial traffic + maintain idle through harbor.',
        'Steam to fishing grounds (offshore for tuna; inshore for striper).',
        'Set lines (multiple rods if applicable). Watch for bird activity + sonar marks.',
        'Hook + fight fish: customer experience first; minimize fish stress.',
        'For released fish: photograph + return quickly + safely.',
        'For kept fish: maintain cold; comply with bag limits + slot limits.',
        'Steam back to dock for sunset.',
        'Customers disembark; tip + farewell.',
        'Clean boat; ice fish; communicate next trips.',
        'Maintenance + repair if needed.'
      ],
      learning: 'Customer service skill + fish-handling expertise + technical operation = complex profession.' },
    { situation: 'Rescue at Sea (You\'re the Responder)',
      walkthrough: [
        'Hear distress call on VHF Ch 16.',
        'Acknowledge if in range: "Vessel [your name] standing by. State your emergency."',
        'Plot fastest course to distressed vessel.',
        'Communicate with USCG via Ch 16: notify response; coordinate.',
        'Approach distressed vessel cautiously (downwind, slow speed).',
        'Render assistance: take aboard; tow; or relay coordinates for USCG response.',
        'Continue communication with USCG; document all actions.',
        'After rescue: maintain care for crew; transport to medical if needed.',
        'Document for legal + investigative purposes.',
        'Debrief crew + family; emotional impact normal.'
      ],
      learning: 'Mariner culture is mutual aid; everyone rescues at some point; preparation matters.' },
    { situation: 'Storm Run from Offshore',
      walkthrough: [
        'Hear forecast deterioration on Marine Forecast or NOAA Weather Radio.',
        'Assess: time to safe harbor; sea state; fuel status; crew preparedness.',
        'Decide: run for harbor (if reachable safely); anchor in protected lee; ride out at sea (last resort).',
        'Prepare crew: PFDs + harnesses; secure loose gear; brief on procedures.',
        'Run: reduce speed to safe for conditions; head into seas at moderate angle.',
        'Maintain VHF contact + GPS position; update shore + USCG periodically.',
        'Approach harbor mouth cautiously: wave patterns + shoal positions critical.',
        'Dock: secure in extra-storm configuration.',
        'Crew rest + warming + meal.',
        'Inspect boat for damage; report any concerns.',
        'Reflect on decision-making for next time.'
      ],
      learning: 'Heavy-weather decisions are made in advance via training + practice. Don\'t improvise.' },
    { situation: 'V-Notching Decision',
      walkthrough: [
        'Pull trap. Check for lobster.',
        'Find female lobster carrying eggs externally on swimmerets.',
        'Confirm: eggs externally + female (look at carapace size + claw symmetry).',
        'Decision: ALWAYS V-notch. Federal + state law.',
        'V-notch tool: use sharp marine knife or specialized notcher.',
        'Cut: small V into right or left tail flipper. ~1/4 inch wide; clear V shape.',
        'Release immediately: gentle return to water.',
        'Log: notched. Track V-notch frequency in your area as informal stock indicator.',
        'This female is now protected for life: even when not visibly carrying eggs.',
        'Other lobstermen catching her later will see notch + release.'
      ],
      learning: 'Industry self-enforcement; intergenerational benefit; cultural anchor of Maine lobstering.' },
    { situation: 'Climate Adaptation Decision (Lobsterman)',
      walkthrough: [
        'Multi-year trends: water temperature data; landing trends; gear-handling concerns.',
        'Review NEFSC + GMRI + Maine DMR data for your zone.',
        'Consider: should I migrate gear to cooler/deeper waters? Diversify gear types? Reduce traps to match changed conditions?',
        'Discuss with peers at zone council + harbor gang.',
        'Plan: 2-5 year adjustment plan.',
        'Execute incremental changes: don\'t rush.',
        'Monitor outcomes + adjust.',
        'Consider broader: aquaculture diversification + multi-species portfolio.',
        'Engage management process: voice concerns at DMR + ASMFC + NEFMC public comment periods.',
        'Mentor next generation: pass knowledge + perspective.'
      ],
      learning: 'Adaptation is multi-decade + collaborative + iterative.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COMPREHENSIVE BIBLIOGRAPHY EXTENSION
  // ───────────────────────────────────────────────────────────
  var BIBLIOGRAPHY_EXT = [
    { author: 'Acheson, James M.', year: 1988, title: 'The Lobster Gangs of Maine',
      publisher: 'University Press of New England',
      type: 'book + academic anthropology',
      relevance: 'Foundational study of Maine lobstering communities + zone councils + harbor gangs.',
      use: 'Required reading for understanding Maine lobster industry culture + governance.' },
    { author: 'Acheson, James M.', year: 2003, title: 'Capturing the Commons',
      publisher: 'University Press of New England',
      type: 'book + economics',
      relevance: 'Followup work on commons management + lobster industry.',
      use: 'Advanced study of Maine lobstering governance.' },
    { author: 'Bigelow, Henry B.', year: '1925-1953', title: 'Fishes of the Gulf of Maine (with William Schroeder)',
      publisher: 'US Government Printing Office',
      type: 'reference book (taxonomic + identification)',
      relevance: 'Foundational reference. Multiple editions; still widely cited.',
      use: 'Authoritative species ID + Maine ichthyology reference.' },
    { author: 'Bowditch, Nathaniel', year: '1802, regularly updated', title: 'The American Practical Navigator',
      publisher: 'US Government Printing Office',
      type: 'navigation textbook',
      relevance: 'The standard work for marine navigation. Required reading for USCG officers.',
      use: 'Free online from NOAA.' },
    { author: 'Corson, Trevor', year: 2004, title: 'The Secret Life of Lobsters',
      publisher: 'Harper Collins',
      type: 'popular nonfiction',
      relevance: 'Accessible introduction to lobster biology + Maine industry.',
      use: 'Excellent teacher resource. Engaging narrative.' },
    { author: 'Greenlaw, Linda', year: 1999, title: 'The Hungry Ocean',
      publisher: 'Hyperion',
      type: 'memoir',
      relevance: 'Maine swordfish captain memoir. Inside view of offshore commercial fishing.',
      use: 'Engaging primary source for Maine fishing culture.' },
    { author: 'Greenlaw, Linda', year: 2002, title: 'The Lobster Chronicles',
      publisher: 'Hyperion',
      type: 'memoir',
      relevance: 'Greenlaw\'s account of returning to Maine + lobstering.',
      use: 'Companion to The Hungry Ocean; deepens Maine lobstering portrait.' },
    { author: 'Hilborn, Ray + Walters, Carl', year: 1992, title: 'Quantitative Fisheries Stock Assessment',
      publisher: 'Chapman + Hall',
      type: 'academic textbook',
      relevance: 'Standard reference for fisheries science.',
      use: 'Required for fisheries science graduate work.' },
    { author: 'Kurlansky, Mark', year: 1997, title: 'Cod: A Biography of the Fish That Changed the World',
      publisher: 'Walker + Company',
      type: 'popular history',
      relevance: 'Foundational popular history of cod fishing + Atlantic economy.',
      use: 'Required reading for any fisheries manager or working fisherman.' },
    { author: 'Mongtomery, Robert', year: 2018, title: 'A Furious Sky: The Five-Hundred-Year History of America\'s Hurricanes',
      publisher: 'W.W. Norton',
      type: 'historical narrative',
      relevance: 'Background on Atlantic hurricane history + maritime impacts.',
      use: 'Climate + weather context.' },
    { author: 'Mosher, Bob', year: 2020, title: 'Northeast Lobstering',
      publisher: 'Maine + regional publishing',
      type: 'how-to + technical',
      relevance: 'Modern Maine lobstering practical guide.',
      use: 'For new + active operators.' },
    { author: 'NOAA Office of Coast Survey', year: 'Ongoing', title: 'NOAA Nautical Charts',
      publisher: 'NOAA',
      type: 'official navigation charts',
      relevance: 'Authoritative Maine coast nautical charts.',
      use: 'Free online; print versions for backup. Every mariner needs.' },
    { author: 'NEFSC (NOAA)', year: 'Ongoing', title: 'NEFSC Annual Reports + Stock Assessments',
      publisher: 'NOAA',
      type: 'agency publications',
      relevance: 'Annual fisheries science reports.',
      use: 'Latest information on stock status + management.' },
    { author: 'NEFMC', year: 'Ongoing', title: 'New England Fishery Management Council documents',
      publisher: 'NEFMC',
      type: 'agency publications',
      relevance: 'Management plans + fishery plans.',
      use: 'Foundation for industry compliance + advocacy.' },
    { author: 'Maine Department of Marine Resources', year: 'Ongoing', title: 'Maine DMR website + publications',
      publisher: 'Maine DMR',
      type: 'state agency',
      relevance: 'Source-of-truth for Maine state-waters rules.',
      use: 'Daily reference for operators. maine.gov/dmr' },
    { author: 'GMRI (Gulf of Maine Research Institute)', year: 'Ongoing', title: 'GMRI publications + State of the Gulf reports',
      publisher: 'GMRI',
      type: 'research + outreach',
      relevance: 'Annual climate + fisheries science synthesis.',
      use: 'gmri.org for current research.' },
    { author: 'Maine Sea Grant', year: 'Ongoing', title: 'Maine Sea Grant publications',
      publisher: 'UMaine + NOAA',
      type: 'university extension',
      relevance: 'Maine-specific technical + business resources.',
      use: 'seagrant.umaine.edu. Many programs + publications.' },
    { author: 'Wabanaki REACH', year: 'Ongoing', title: 'Wabanaki REACH curriculum',
      publisher: 'Wabanaki Reach',
      type: 'tribal-led curriculum',
      relevance: 'Maine\'s leading Wabanaki history + culture education resource.',
      use: 'wabanakireach.org. Required for Maine LD 291 compliance.' },
    { author: 'Maine Indian Education', year: 'Ongoing', title: 'Maine Indian Education curriculum (LD 291)',
      publisher: 'Maine DOE',
      type: 'state curriculum',
      relevance: 'Required Maine K-12 tribal content per state law since 2001.',
      use: 'Maine.gov/doe; resources for K-12 teachers.' },
    { author: 'Pershing, Andrew J., et al.', year: 2015,
      title: 'Slow adaptation in the face of rapid warming leads to collapse of the Gulf of Maine cod fishery',
      publisher: 'Science 350:809-812',
      type: 'academic journal',
      relevance: 'Defining paper on Gulf of Maine cod + climate.',
      use: 'Cited everywhere; foundational for Maine climate-fisheries conversation.' },
    { author: 'Stewart, Susan', year: 2024, title: 'Edge of the Sea: Maine Working Waterfront (forthcoming)',
      publisher: 'Maine publishers',
      type: 'forthcoming',
      relevance: 'Working waterfront preservation perspective.',
      use: 'Watch for publication.' },
    { author: 'Maine Lobstermen\'s Association', year: 'Ongoing', title: 'Maine Lobstermen\'s Association communications',
      publisher: 'Maine Lobstermen\'s Association',
      type: 'industry trade group',
      relevance: 'Industry voice + advocacy.',
      use: 'mainelobstermens.com' },
    { author: 'Island Institute', year: 'Ongoing', title: 'Island Institute working waterfront publications',
      publisher: 'Island Institute',
      type: 'NGO',
      relevance: 'Rockland, ME-based; advocates working-waterfront preservation.',
      use: 'islandinstitute.org' },
    { author: 'Bigelow Laboratory for Ocean Sciences', year: 'Ongoing', title: 'Bigelow Lab research',
      publisher: 'Bigelow Lab',
      type: 'research institute',
      relevance: 'East Boothbay, ME; ocean biogeochemistry + acidification research.',
      use: 'bigelow.org' },
    { author: 'Penobscot Marine Museum', year: 'Ongoing', title: 'Penobscot Marine Museum publications',
      publisher: 'Penobscot Marine Museum',
      type: 'museum',
      relevance: 'Maine maritime history museum in Searsport.',
      use: 'penobscotmarinemuseum.org' },
    { author: 'Bigelow + Schroeder', year: '1953', title: 'Fishes of the Gulf of Maine (revised edition)',
      publisher: 'US GPO',
      type: 'taxonomic reference',
      relevance: 'Foundational Maine fish biology + identification.',
      use: 'Classic reference; still cited in modern stock assessments.' },
    { author: 'Maine Coast Heritage Trust', year: 'Ongoing', title: 'Maine Coast Heritage Trust working waterfront publications',
      publisher: 'Maine Coast Heritage Trust',
      type: 'conservation NGO',
      relevance: 'Maine working-waterfront easements + preservation.',
      use: 'mcht.org' },
    { author: 'Atlantic States Marine Fisheries Commission', year: 'Ongoing', title: 'ASMFC publications + stock assessments',
      publisher: 'ASMFC',
      type: 'multi-state commission',
      relevance: 'Migratory species coordination across 15 Atlantic states.',
      use: 'asmfc.org' },
    { author: 'Maine Coast Fishermen\'s Association', year: 'Ongoing', title: 'MCFA publications',
      publisher: 'MCFA',
      type: 'fishermen\'s association',
      relevance: 'Independent voice for Maine commercial fishermen.',
      use: 'mainecoastfishermen.org' },
    { author: 'Audubon Society + Project Puffin', year: 'Ongoing', title: 'Project Puffin publications',
      publisher: 'National Audubon Society',
      type: 'conservation NGO',
      relevance: 'Maine puffin restoration since 1973.',
      use: 'projectpuffin.org' },
    { author: 'College of the Atlantic', year: 'Ongoing', title: 'COA marine + environmental publications',
      publisher: 'College of the Atlantic',
      type: 'small college research',
      relevance: 'Bar Harbor-based; marine + environmental research + education.',
      use: 'coa.edu' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX — CHARTS + REFERENCE NUMBERS
  // ───────────────────────────────────────────────────────────
  var REFERENCE_NUMBERS = [
    { metric: 'Maine coastline (jagged + measured by 1:24,000 chart)',
      value: '~3,400+ miles',
      context: 'More than California. Vast working waterfront.',
      practical: 'Many small ports + harbors; vast access to ocean from many points.' },
    { metric: 'Maine lobster industry annual landings (peak)',
      value: '~110+ million pounds',
      context: 'Peak years 2010s-early 2020s. Industry climate winner so far.',
      practical: '~6,500 active licenses. ~$500M+ industry at peak.' },
    { metric: 'Maine lobster industry value (peak)',
      value: '~$500M+ annual',
      context: '2021-2022 peak years. Down from 2022 due to climate + market shifts.',
      practical: 'Largest commercial fishery in Maine by value.' },
    { metric: 'Maine commercial lobster licenses',
      value: '~6,500 active',
      context: 'Limited-entry. ~5:1 retirement-to-new license ratio in most zones.',
      practical: 'Apprenticeship + zone waitlists. Major industry employer.' },
    { metric: 'Maine apprenticeship requirement',
      value: '≥1000 hours over 2 years',
      context: 'Documented sea time under licensed lobsterman.',
      practical: 'Significant time + commitment for industry entry.' },
    { metric: 'Maine lobster zones',
      value: '7 zones (A-G)',
      context: 'Each governed by zone council.',
      practical: 'Local rules + entry vary by zone. A + B are most-restricted.' },
    { metric: 'Maine lobster minimum size',
      value: '3-1/4" carapace',
      context: 'State + federal law. Measured eye-socket to back of body shell.',
      practical: 'Every lobster gets measured. Smaller = release.' },
    { metric: 'Maine lobster maximum size',
      value: '5" carapace',
      context: 'Protects large breeders.',
      practical: 'Larger lobsters must also be released.' },
    { metric: 'Maine v-notch rule',
      value: 'Any egg-bearing female; permanent lifetime protection',
      context: 'Self-enforced + federal law since 1985.',
      practical: 'Cut V into tail flipper. Release. Don\'t keep notched females ever.' },
    { metric: 'Maine striped bass slot',
      value: '28-31 inches',
      context: 'Slot designed to protect both juveniles + large breeders.',
      practical: '1/day. Use circle hooks. Release everything outside slot.' },
    { metric: 'Atlantic right whale population',
      value: '~340 individuals total',
      context: 'Critically endangered. Trend declining.',
      practical: 'Industry transitioning to ropeless gear; vessel speed restrictions.' },
    { metric: 'Gulf of Maine warming rate (2004-2013)',
      value: '~4× global ocean average',
      context: 'Pershing et al. 2015 Science. Among fastest-warming marine regions on Earth.',
      practical: 'Climate adaptation is permanent feature of Maine fisheries.' },
    { metric: 'NA Atlantic salmon Gulf of Maine DPS',
      value: 'Federally ENDANGERED (2009)',
      context: 'Restricted to a few Maine rivers; severely reduced.',
      practical: 'NEVER target. Always release. Support restoration.' },
    { metric: 'Atlantic sturgeon Gulf of Maine DPS',
      value: 'Federally ENDANGERED (2012)',
      context: 'Penobscot + Kennebec populations recovering through restoration.',
      practical: 'Release immediately; minimal handling.' },
    { metric: 'Atlantic wolffish status',
      value: 'NOAA Species of Concern; ESA petitioning',
      context: 'Slow-growing + late-maturing + cave-fidelity = highly vulnerable.',
      practical: 'NEVER keep. Release with care. Federal "take prohibition" effectively in place.' },
    { metric: 'Maine sardine industry peak',
      value: '~75+ canneries',
      context: 'Early 1900s. Collapsed mid-20th century.',
      practical: 'Cultural memory in eastern Maine. Last cannery Stinson 2010.' },
    { metric: 'Pre-contact Wabanaki occupation',
      value: '~12,000+ years',
      context: 'Multiple millennia of Maine coastal management.',
      practical: 'Indigenous stewardship is ancient + ongoing. Tribal sovereignty is legal + ethical reality.' },
    { metric: 'Damariscotta + Whaleback shell middens',
      value: '6,000+ years',
      context: 'Among largest Atlantic-coast shell middens.',
      practical: 'Evidence of sustainable Indigenous harvest patterns.' },
    { metric: 'Maine lighthouses',
      value: '~60+',
      context: 'Many still active aids to navigation; some museums.',
      practical: 'Cultural + functional navigation infrastructure.' },
    { metric: 'NOAA chart Maine coast tile count',
      value: '~150+ official charts',
      context: 'NOAA Office of Coast Survey maintains.',
      practical: 'Detailed coverage for safe navigation.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX — CASE STUDIES OF NOTABLE EVENTS
  // ───────────────────────────────────────────────────────────
  var NOTABLE_EVENTS = [
    { event: '1992 Grand Banks Cod Collapse',
      year: 1992,
      cause: 'Centuries of overfishing + warming + reduced recruitment.',
      response: 'Canada imposed moratorium. 30,000+ people lost livelihoods overnight.',
      lessons: 'Multi-decade overfishing past biological limits is irreversible on human timescales. Slow-growing species particularly vulnerable.',
      maine_implications: 'Maine cod stocks also stressed; Gulf of Maine cod has not recovered to date due to warming.' },
    { event: '1985-1990 Striped Bass Moratorium',
      year: '1985-1990',
      cause: 'Multi-state coordinated response to depleted striper stocks.',
      response: 'ASMFC + multi-state moratorium banned commercial sale + restricted recreational severely.',
      lessons: 'Coordinated multi-state action under federal-state cooperative framework works when political will exists.',
      maine_implications: 'Maine recreational striper fishery temporarily restricted. Stocks rebuilt by mid-1990s. Slot limits + circle-hook requirements added later.' },
    { event: '2010 Stinson Cannery Closes (Last Maine Sardine)',
      year: 2010,
      cause: 'Decades of decline; cheaper canned tuna + technology shift; supply constraints.',
      response: 'End of an iconic Maine industry. Building preserved as museum.',
      lessons: 'Industries decline + sometimes end. Maritime heritage requires active preservation.',
      maine_implications: 'Cultural loss in Lubec + Prospect Harbor + Eastport. Some sardine-style products continue from other regions.' },
    { event: '2014 Maine Shrimp Fishery Closed',
      year: 2014,
      cause: 'Recruitment collapse linked to warming Gulf of Maine.',
      response: 'NEFMC closed fishery indefinitely. Hasn\'t reopened.',
      lessons: 'Climate-driven recruitment failure can close fisheries permanently. Cold-water species especially vulnerable.',
      maine_implications: 'Loss of traditional fishery + community + cuisine.' },
    { event: '2015 Pershing et al. Cod-Warming Paper',
      year: 2015,
      cause: 'Multi-year scientific analysis of Gulf of Maine cod + warming.',
      response: 'Published in Science. Changed understanding of cod recovery + climate.',
      lessons: 'Climate is a driver of fisheries outcomes; management must address climate.',
      maine_implications: 'Cod recovery in Gulf of Maine is unlikely under current climate trajectory.' },
    { event: '2016 Penobscot River Restoration Completion',
      year: 2016,
      cause: 'Multi-tribal-led river restoration project (2004-2016).',
      response: 'Two dams removed (Great Works + Veazie); one bypassed (Howland).',
      lessons: 'Multi-stakeholder + multi-tribal partnership can achieve landscape-scale restoration.',
      maine_implications: 'Sea-run fish (alewife, shad, salmon, sturgeon) returning. Cascading ecosystem benefits.' },
    { event: '2009 Atlantic Salmon ESA Listing',
      year: 2009,
      cause: 'Critically reduced Gulf of Maine wild salmon populations.',
      response: 'NMFS federal Endangered Species Act listing.',
      lessons: 'Long-term decline can result in federal protection + take restrictions.',
      maine_implications: 'Maine wild salmon are protected; restoration programs continue.' },
    { event: '2012 Atlantic Sturgeon ESA Listing',
      year: 2012,
      cause: 'Critically reduced Gulf of Maine sturgeon populations.',
      response: 'NMFS federal Endangered Species Act listing for Gulf of Maine DPS.',
      lessons: 'Bycatch + habitat loss + slow life history = federal protection.',
      maine_implications: 'Penobscot + Kennebec sturgeon recovering. Strict release rules.' },
    { event: '2017 Maine Implementing Act Anniversary',
      year: 2017,
      cause: 'Multi-year tribal sovereignty conversations.',
      response: 'Maine-Wabanaki Truth + Reconciliation Commission published report.',
      lessons: 'Tribal sovereignty is legal + ethical reality. Ongoing political + legal evolution.',
      maine_implications: 'Increasing tribal voice in Maine fisheries + aquaculture conversations.' },
    { event: '2020-2024 Right Whale Crisis Intensifies',
      year: '2020-2024',
      cause: 'NA right whale population continues decline; entanglement leading mortality.',
      response: 'NOAA implements 10-knot vessel speed zones + ropeless gear requirements.',
      lessons: 'Conservation responses to critically-endangered species create economic + cultural transitions.',
      maine_implications: 'Maine lobster industry reshaping toward ropeless + seasonal-pull gear. Economic + cultural cost.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX — MAINE CULINARY TRADITIONS
  // ───────────────────────────────────────────────────────────
  var CULINARY = [
    { dish: 'Maine Lobster Roll',
      species: 'Lobster',
      ingredients: 'Lobster meat (claws + tail), mayonnaise OR butter, salt, pepper, butter-toasted split-top hot dog bun, optional chives or celery.',
      preparation: 'Cook lobster (steam ~15 min). Cool. Pick meat from shell. Mix with mayo (cold roll) or warm butter (hot roll). Pile onto split-top buns.',
      history: 'Originated in Connecticut (1930s); refined in Maine. Maine roll = mayo-based cold; Connecticut roll = warm butter. Maine roll is iconic statewide.',
      cultural_significance: 'Maine\'s signature seafood dish. Tourist + local favorite. Cost varies $15-$30+ per roll.' },
    { dish: 'New England Clam Chowder',
      species: 'Soft-shell clam (steamer)',
      ingredients: 'Clams, potato, salt pork or bacon, onion, milk, cream, butter, salt, pepper.',
      preparation: 'Steam clams; reserve liquor. Fry salt pork; sauté onion. Add potato + clam liquor; simmer. Add chopped clams + milk + cream. Heat through but don\'t boil.',
      history: 'Maine + Mass. tradition. New England-style is white (vs Manhattan red).',
      cultural_significance: 'Comfort food + winter staple. Many regional variations.' },
    { dish: 'Mussels Marinière (Maine-style)',
      species: 'Blue mussel',
      ingredients: 'Mussels, white wine OR cider, shallots, garlic, butter, parsley.',
      preparation: 'Clean mussels (debeard + scrub). Sauté shallots + garlic in butter. Add wine; bring to simmer. Add mussels; cover; cook 5 min until shells open. Serve in broth.',
      history: 'French + Belgian classic adapted for Maine\'s mussels.',
      cultural_significance: 'Premium Maine restaurant dish. Showcases local mussels.' },
    { dish: 'Oysters on the Half Shell',
      species: 'Eastern oyster',
      ingredients: 'Live oysters, lemon, cocktail sauce, mignonette, fresh black pepper.',
      preparation: 'Shuck oysters (knife into hinge; release adductor); serve immediately on ice.',
      history: 'Ancient Wabanaki tradition; refined European tradition; Maine premium variant.',
      cultural_significance: 'Maine oysters now nationally-recognized; restaurant + raw bar staple.' },
    { dish: 'Fried Smelt',
      species: 'Rainbow smelt',
      ingredients: 'Whole smelt (gutted), flour, cornmeal, salt, pepper, oil.',
      preparation: 'Coat smelts in flour-cornmeal mixture. Fry in hot oil ~2 min/side until crispy. Serve with lemon + tartar.',
      history: 'Maine traditional ice-fishing catch. Whole-eaten (bones-and-all).',
      cultural_significance: 'Winter ice-fishing tradition. Family meal staple.' },
    { dish: 'Lobster Bake (Maine Clambake)',
      species: 'Lobster + clams + corn + potato',
      ingredients: 'Live lobsters, soft-shell clams, corn-on-cob, red potatoes, onion, butter, seaweed (rockweed).',
      preparation: 'Dig pit; line with rocks. Heat rocks with fire. Layer in: seaweed → potatoes → corn → clams → lobsters → seaweed. Steam 1-2 hours under tarp.',
      history: 'Pre-contact Wabanaki tradition adapted by colonists.',
      cultural_significance: 'Iconic Maine summer ritual. Community + family gathering.' },
    { dish: 'Mussel Chowder',
      species: 'Blue mussel',
      ingredients: 'Mussels, potato, onion, leek, butter, cream, white wine, herbs.',
      preparation: 'Steam mussels + reserve broth. Pick meat. Make chowder base with leek + potato + butter + wine + reserved broth. Add mussel meat + cream. Heat through.',
      history: 'Maine adaptation of mussel-rich coastal traditions.',
      cultural_significance: 'Restaurant favorite; showcases local mussels.' },
    { dish: 'Cod Cakes',
      species: 'Atlantic cod (or pollock as cod substitute)',
      ingredients: 'Cod (fresh or salted), potato, onion, butter, eggs, parsley, breadcrumbs.',
      preparation: 'Cook + flake cod. Mix with mashed potato + sautéed onion + egg + herbs. Form patties; coat with breadcrumbs. Pan-fry until golden.',
      history: 'New England staple from cod\'s historic abundance.',
      cultural_significance: 'Traditional Maine peasant + farmhouse dish; now restaurant comfort food.' },
    { dish: 'Smoked Mackerel',
      species: 'Atlantic mackerel',
      ingredients: 'Whole mackerel (gutted), salt, sugar, alder or apple wood chips, optional herbs.',
      preparation: 'Brine mackerel 4-6 hr. Pat dry; air-dry to pellicle. Smoke over alder/applewood chips 2-4 hr at 180°F.',
      history: 'Mackerel preservation tradition. Maine sardine industry adapted similar methods.',
      cultural_significance: 'Specialty + farmer\'s market product; Maine smoke-houses.' },
    { dish: 'Steamers (Soft-Shell Clams)',
      species: 'Soft-shell clam',
      ingredients: 'Soft-shell clams, hot water or beer, butter, lemon.',
      preparation: 'Soak clams in salt water to purge sand. Steam 5-7 min until shells open. Serve with drawn butter for dipping.',
      history: 'Pre-contact + colonial Maine staple. Town-managed harvest.',
      cultural_significance: 'Casual + family-style summer meal. Maine\'s signature shellfish dish.' },
    { dish: 'Lobster Stew (Maine-Style)',
      species: 'Lobster',
      ingredients: 'Lobster meat (claws + tail), butter, milk, cream, salt, pepper, optional sherry.',
      preparation: 'Cook lobster; pick meat. Make rich stew base: warm milk + butter; add cream + sherry; add lobster meat; warm gently.',
      history: 'Maine traditional. Less common than chowder but rich + premium.',
      cultural_significance: 'Special-occasion meal; multi-generation Maine recipe.' },
    { dish: 'Stuffed Bluefish',
      species: 'Bluefish',
      ingredients: 'Whole bluefish, breadcrumbs, herbs, onion, butter, lemon.',
      preparation: 'Clean + scale bluefish. Make breadcrumb stuffing with herbs + butter + sautéed onion. Stuff cavity; bake 25 min at 400°F.',
      history: 'Maine sport-fish tradition.',
      cultural_significance: 'Catch + cook your own.' },
    { dish: 'Maine Cod + Haddock Fish + Chips',
      species: 'Haddock primarily (pollock substitute; cod traditionally)',
      ingredients: 'White-fleshed fish fillets, beer batter, potato fries, tartar sauce.',
      preparation: 'Dip fillets in beer batter. Deep-fry until golden. Serve with thick-cut fries + tartar.',
      history: 'English colonial tradition adapted for Maine fish.',
      cultural_significance: 'Restaurant + pub staple. Haddock has largely replaced cod due to stock issues.' },
    { dish: 'Sushi-Grade Bluefin Tuna',
      species: 'Bluefin tuna',
      ingredients: 'Sushi-grade bluefin, soy sauce, wasabi, pickled ginger.',
      preparation: 'Slice against grain into 1/8-inch slabs. Serve raw with traditional accompaniments.',
      history: 'Japanese sushi tradition meets Maine offshore tuna fishery.',
      cultural_significance: 'Maine bluefin is premium sushi-grade product. Charter captains land them; Japanese buyers compete at auctions.' },
    { dish: 'Pickled Alewife (Maine Tradition)',
      species: 'Alewife',
      ingredients: 'Alewife, vinegar, sugar, spices.',
      preparation: 'Brine alewives. Pack in jars with vinegar + spices. Refrigerate 1+ weeks.',
      history: 'Maine + Wabanaki preservation tradition.',
      cultural_significance: 'Damariscotta Mills run brings this tradition into focus annually.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX — COMPREHENSIVE WORKFORCE PIPELINE
  // ───────────────────────────────────────────────────────────
  var WORKFORCE_PIPELINE = [
    { stage: 'High School (Grades 9-12)',
      activities: 'Introduction to marine science + boating safety + Maine fisheries history + Wabanaki heritage. EL Education partnerships (King Middle School). Boat-handling experience.',
      partnerships: 'Maine Sea Grant + Maine Aquaculture Association + Wabanaki REACH + local fishermen + tribal nations.',
      outcomes: 'Maine boater education certification; informed students choosing careers; pipeline to apprenticeship + post-secondary.' },
    { stage: 'Community College / 2-Year Certificate',
      activities: 'Aquaculture certificate (UMaine + Maine community college). Practical training in field + hatchery. NASBLA + HACCP certifications. Boat handling.',
      partnerships: 'UMaine Cooperative Extension; Maine Aquaculture Association; commercial farms hosting interns.',
      outcomes: 'Hatchery tech-level employment + farm crew positions + entry to apprenticeship + path to 4-year degree.' },
    { stage: '4-Year College (BS in Marine Biology / Aquaculture)',
      activities: 'Comprehensive marine science training. Research experience. Industry internships. Graduate-school preparation.',
      partnerships: 'Bigelow Lab + GMRI + NOAA NEFSC + Maine industry partners.',
      outcomes: 'Entry to research positions + NOAA + agency careers + graduate school + industry technical roles.' },
    { stage: 'Apprenticeship (Maine Lobster Tier)',
      activities: '≥1000 documented hours over 2 years under licensed lobsterman. Includes trap setting + hauling + measuring + v-notching + boat handling.',
      partnerships: 'Maine Lobstermen\'s Association + zone councils + DMR.',
      outcomes: 'Eligibility for Class I license + zone-specific entry.' },
    { stage: 'Charter Captain Path (USCG)',
      activities: '90-day documented experience + USCG OUPV course + medical + drug testing + exams. Boat experience.',
      partnerships: 'USCG Auxiliary + USCG-approved training centers + experienced captains.',
      outcomes: 'OUPV license (six-pack) for charter operations.' },
    { stage: 'Graduate School (MS/PhD)',
      activities: 'Specialized research in fisheries science, marine ecology, aquaculture science, or marine policy.',
      partnerships: 'UMaine Marine Biology; Bigelow Lab; GMRI; NOAA NEFSC; other institutions.',
      outcomes: 'PhD-track research positions; faculty; agency leadership; specialized industry roles.' },
    { stage: 'Continuing Professional Development',
      activities: 'Annual training in: HACCP refresher, climate adaptation, sustainability certifications, new technologies, regulations.',
      partnerships: 'Maine Aquaculture Association + Maine Sea Grant + UMaine + industry conferences.',
      outcomes: 'Maintained certification + adaptation to industry change + mentorship of next generation.' },
    { stage: 'Mentor + Master Operator Stage',
      activities: 'Mentoring apprentices; community advocacy; participating in management process (DMR + zone councils + ASMFC + NEFMC); workforce-building.',
      partnerships: 'Multi-stakeholder partnerships across industry + government + nonprofit.',
      outcomes: 'Industry sustainability; community resilience; preservation of Maine working waterfront tradition.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX — EMERGENCY RESPONSE PROCEDURES
  // ───────────────────────────────────────────────────────────
  var EMERGENCY_PROCEDURES = [
    { emergency: 'Man Overboard',
      response: [
        '1. SHOUT "MAN OVERBOARD" + identify side',
        '2. Throw flotation toward victim immediately',
        '3. Keep visual contact at all costs',
        '4. Reduce speed + circle back from downwind',
        '5. Approach victim slowly; turn engine off when close',
        '6. Get victim aboard or attached to throw bag',
        '7. If unable to retrieve immediately, call USCG via VHF Ch 16',
        '8. After rescue: keep warm + monitor for hypothermia; medical evaluation'
      ],
      training: 'Practice quarterly with buoy in calm conditions; time yourself.' },
    { emergency: 'Engine Failure',
      response: [
        '1. Anchor immediately if near hazard',
        '2. Drift assess: where will current take you?',
        '3. Diagnose: fuel? overheating? mechanical?',
        '4. Try basic fixes (replace fuel filter, check connections)',
        '5. If can\'t restart: VHF Ch 16 for assistance',
        '6. Coast Guard or Sea Tow or commercial towing'
      ],
      training: 'Know common failure modes + carry spare parts.' },
    { emergency: 'Fire Onboard',
      response: [
        '1. Crew don PFDs immediately',
        '2. Position downwind from fire if possible',
        '3. Use fire extinguisher: pull pin, aim at base, squeeze, sweep',
        '4. If fire in engine compartment: shut fuel + electrical immediately',
        '5. If fire uncontrollable: MAYDAY on Ch 16; prepare to abandon',
        '6. Once ashore: medical + USCG report'
      ],
      training: 'Practice with empty extinguisher; identify fire-source locations.' },
    { emergency: 'Taking on Water',
      response: [
        '1. Activate bilge pump',
        '2. Manual hand-pump or bucket as backup',
        '3. Identify source: hull damage? thru-hull failure? engine cooling?',
        '4. Patch with emergency materials if possible',
        '5. If unable to control: MAYDAY on Ch 16',
        '6. Prepare to abandon ship if rapid sinking imminent',
        '7. PFDs on; gather emergency kit; deploy life raft if applicable'
      ],
      training: 'Know location of all thru-hulls + emergency repair materials.' },
    { emergency: 'Medical Emergency at Sea',
      response: [
        '1. Stabilize victim; basic first aid',
        '2. VHF Ch 16 for MEDEVAC if life-threatening (use MAYDAY format)',
        '3. Provide position + nature of emergency + person count',
        '4. Continue care while awaiting USCG response',
        '5. If non-life-threatening: PAN-PAN for assistance + transport',
        '6. Document everything; medical evaluation post-rescue'
      ],
      training: 'CPR + first aid certification; have first aid kit accessible.' },
    { emergency: 'Severe Weather',
      response: [
        '1. Reduce speed for safe conditions',
        '2. Head into seas at moderate angle',
        '3. Crew below; PFDs + harnesses',
        '4. Deploy drogue if necessary',
        '5. Maintain radio contact with shore',
        '6. Plan alternate harbor if possible',
        '7. If overwhelmed: MAYDAY for assistance',
        '8. After: assess damage; check crew condition'
      ],
      training: 'Practice heavy-weather procedures in moderate conditions first.' },
    { emergency: 'Lightning Strike',
      response: [
        '1. Stay low + away from metal contacts',
        '2. Don\'t use radio during active storm',
        '3. If on sailboat: stay below decks',
        '4. After strike: inspect electronics + electrical for damage',
        '5. Medical evaluation if anyone struck'
      ],
      training: 'Know lightning safety + lower antennas if possible.' },
    { emergency: 'Capsize or Foundering',
      response: [
        '1. Stay with the boat if possible (more visible to rescuers)',
        '2. Get PFDs on everyone',
        '3. MAYDAY on VHF if functional',
        '4. Deploy emergency signals + flares',
        '5. Heat Escape Lessening Posture (HELP) for solo; huddle for multiple',
        '6. Wait for rescue; conserve heat + energy'
      ],
      training: 'Cold-water survival training; know HELP/huddle techniques.' },
    { emergency: 'Running Aground',
      response: [
        '1. Stop engine immediately to prevent damage',
        '2. Assess: tide rising or falling?',
        '3. If tide rising: may float free; check for hull damage; secure',
        '4. If tide falling: stay with boat until next tide cycle',
        '5. Document for insurance',
        '6. Don\'t leave grounded boat unattended in heavy surf'
      ],
      training: 'Recognize grounding hazards + plan + chart properly.' },
    { emergency: 'Lost at Sea / Disoriented',
      response: [
        '1. Stop boat; gather information',
        '2. Use GPS chartplotter to determine position',
        '3. Take compass bearings to landmarks if visible',
        '4. Plot position on paper chart',
        '5. Identify route to nearest harbor or aid',
        '6. If totally disoriented: PAN-PAN on Ch 16 for assistance'
      ],
      training: 'Practice navigation in fog or low visibility before emergency.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: TRAINING CHECKLIST + APPRENTICE PATHWAY
  // ───────────────────────────────────────────────────────────
  var TRAINING_CHECKLIST = [
    { module: 'Module 1: Boating Basics',
      skills: [
        'NASBLA-approved Maine boater education',
        'Use VHF Ch 16 + hail another vessel + run radio check',
        'Operate small boat safely + idle through harbor',
        'Tie 6 essential knots correctly + identify their uses',
        'Recognize navigation lights + day-shapes',
        'Apply COLREGS Rules 13-18 in standard encounters'
      ],
      duration: '2 weeks training + on-water practice',
      certification: 'Maine boater education certificate' },
    { module: 'Module 2: Navigation',
      skills: [
        'Read NOAA charts (Chart 1 symbology + scale)',
        'Take a compass bearing + plot on chart',
        'Plot a fix from 2 bearings',
        'Calculate course + distance via dead reckoning',
        'Adjust for magnetic variation',
        'Use GPS chartplotter + understand limitations'
      ],
      duration: '1 month training + practice',
      certification: 'Pass navigation competency exam' },
    { module: 'Module 3: Buoyage + IALA Region B',
      skills: [
        'Identify all 4 lateral marks',
        'Identify all 4 cardinal marks + topmarks',
        'Apply "red right returning" rule',
        'Recognize light characteristics + chart codes',
        'Practice via Casco Bay + similar Maine charts'
      ],
      duration: '1 week dedicated study + ongoing practice',
      certification: 'Buoyage identification quiz' },
    { module: 'Module 4: Species ID + Regulations',
      skills: [
        'Identify 20+ Maine commercial species',
        'Recognize legal size + bag + slot limits',
        'Recognize protected species (must release)',
        'Apply dichotomous key for unknowns',
        'Tag + record commercial catch correctly'
      ],
      duration: '2 weeks + ongoing review',
      certification: 'Species ID quiz + clean tagging audit' },
    { module: 'Module 5: Lobster Apprenticeship (Maine state requirement)',
      skills: [
        '≥1000 documented hours over 2 years working under licensed lobsterman',
        'Demonstrate competency in trap setting + hauling + sorting',
        'V-notch egg-bearing females correctly',
        'Apply size limits + escape vent rules',
        'Maintain trap + gear properly',
        'Operate lobster boat safely'
      ],
      duration: '2 years minimum',
      certification: 'Apprenticeship hours documented to Maine DMR' },
    { module: 'Module 6: USCG OUPV License (charter)',
      skills: [
        '90-day boating experience over 3 years',
        'USCG OUPV course (typically 56 hours)',
        'USCG medical exam',
        'Drug + alcohol testing',
        'Maritime regulations exam',
        'Navigation exam',
        'Rules of the road exam'
      ],
      duration: '3-6 months course + testing',
      certification: 'USCG OUPV ("six-pack") license' },
    { module: 'Module 7: First Aid + Cold-Water Survival',
      skills: [
        'CPR + basic first aid (Red Cross or similar)',
        '1-10-1 cold-water survival rule',
        'HELP + huddle positions',
        'Hypothermia recognition + response',
        'Man-overboard drill execution',
        'Emergency communication via VHF'
      ],
      duration: '2-3 day course',
      certification: 'Red Cross or equivalent CPR + first aid card' },
    { module: 'Module 8: Conservation + Stewardship',
      skills: [
        'Understand fishery management framework (Magnuson-Stevens, ASMFC)',
        'V-notch lobster correctly',
        'Apply circle hook + careful release',
        'Recognize protected species + closed areas',
        'Engage with stock assessment + management process'
      ],
      duration: 'Ongoing learning',
      certification: 'Demonstrated competence + active advocacy' },
    { module: 'Module 9: Weather + Tides',
      skills: [
        'Read NOAA Marine Forecast',
        'Use tide tables + rule of twelfths',
        'Recognize weather signs (clouds, barometer)',
        'Plan trips around tide stages',
        'Recognize storm onset + take appropriate action'
      ],
      duration: '1 month ongoing observation',
      certification: 'Weather + tide log demonstrating proficiency' },
    { module: 'Module 10: Business + Career Development',
      skills: [
        'Develop business plan for fishing/charter operation',
        'Maintain financial records + tax preparation',
        'Build relationships in industry community',
        'Engage with Maine fishing associations (MLA, Maine Charterboat Assoc.)',
        'Participate in management process (DMR + ASMFC public input)',
        'Mentor next generation'
      ],
      duration: 'Career-long',
      certification: 'Continuous learning + community engagement' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX — DETAILED REGULATORY FRAMEWORK
  // ───────────────────────────────────────────────────────────
  var REG_FRAMEWORK = [
    { law: 'Magnuson-Stevens Fishery Conservation + Management Act (1976; amended 2006)',
      year: 1976,
      scope: 'Foundation US federal fisheries law. Created 200-nm EEZ + 8 Regional Councils. Mandates science-based catch limits + rebuilding plans.',
      maine_relevance: 'Why we have quotas + closures + stock assessments. Why Maine\'s NEFMC is one of the 8 councils.',
      keys: 'Annual Catch Limits (ACLs) since 2006; Accountability Measures (AMs); Magnuson-Stevens Reauthorization expected periodically.' },
    { law: 'Atlantic States Marine Fisheries Compact (1942)',
      year: 1942,
      scope: 'Created ASMFC (Atlantic States Marine Fisheries Commission) to coordinate 15 Atlantic states\' fishery management.',
      maine_relevance: 'ASMFC sets striper, menhaden, river herring, lobster (with NEFMC), sturgeon, etc. quotas. Maine\'s seat on commissions.',
      keys: 'Coordinated state action; compulsory if necessary; rebuilding plans.' },
    { law: 'Endangered Species Act (1973)',
      year: 1973,
      scope: 'Protects federally-listed species + their critical habitat. NMFS lead for marine.',
      maine_relevance: 'Atlantic salmon, Atlantic sturgeon, NA right whale, shortnose sturgeon — all relevant in Maine. Strict take prohibitions.',
      keys: 'Listing process; recovery plans; consultation requirements; take prohibitions.' },
    { law: 'Marine Mammal Protection Act (1972)',
      year: 1972,
      scope: 'Prohibits "take" (harassment, killing, capture) of marine mammals. NMFS lead for cetaceans + pinnipeds.',
      maine_relevance: 'Right whales, harbor + gray seals, harbor porpoise. Vessel speed zones + entanglement rules.',
      keys: 'Take definition includes harassment; specific permits required for research.' },
    { law: 'Clean Water Act (1972)',
      year: 1972,
      scope: 'Federal water pollution law. EPA + state administration.',
      maine_relevance: 'Aquaculture facilities + processing plants require NPDES discharge permits in some cases. Coastal water quality.',
      keys: 'NPDES (National Pollutant Discharge Elimination System); water quality standards.' },
    { law: 'Jones Act / Merchant Marine Act of 1920',
      year: 1920,
      scope: 'Requires goods shipped between US ports to be on US-built, US-owned, US-crewed vessels.',
      maine_relevance: 'Affects Maine working waterfront — US-flagged commercial fishing fleet. Imported boats can\'t be used commercially.',
      keys: 'Vessel registration; flag-state requirements; crewing rules.' },
    { law: 'COLREGS — International Regulations for Preventing Collisions at Sea (1972 convention)',
      year: 1972,
      scope: 'International treaty; adopted by US as 33 CFR 83. Rules of the road for vessels.',
      maine_relevance: 'Every Maine boater + commercial captain must know.',
      keys: '38 rules organized by visibility, lights/sounds, vessel hierarchy.' },
    { law: 'Section 10 (Rivers + Harbors Act of 1899)',
      year: 1899,
      scope: 'USACE jurisdiction over structures in navigable waters.',
      maine_relevance: 'Aquaculture leases + docks + similar require Section 10 permit.',
      keys: 'Federal navigation authority.' },
    { law: 'Maine Title 12 (Conservation Laws)',
      year: 'Current',
      scope: 'Maine\'s state-level fisheries + marine resources law. DMR enforces.',
      maine_relevance: 'Source-of-truth for Maine state-waters rules.',
      keys: 'Licensing, gear regs, season + bag limits, marine patrol.' },
    { law: 'Maine Indian Implementing Act + Maine Indian Claims Settlement Act (1980)',
      year: 1980,
      scope: 'Settled major land claims + defined ongoing tribal sovereignty + fishing rights in Maine.',
      maine_relevance: 'Tribal fishing + harvest rights apply in tribal-claim waters. Continuing legal evolution.',
      keys: 'Treaty-based rights; ongoing legal interpretation.' },
    { law: 'NSSP National Shellfish Sanitation Program',
      year: 'Multi-decade',
      scope: 'Federal-state cooperative for shellfish food safety.',
      maine_relevance: 'Every commercial Maine shellfish harvest operates under NSSP.',
      keys: 'Water classification; tagging; time-temperature; closures.' },
    { law: 'Maine Atlantic Salmon Recovery Plan',
      year: 'Ongoing',
      scope: 'Federal-state plan to recover endangered Gulf of Maine Atlantic salmon.',
      maine_relevance: 'Strict take prohibitions; conservation hatcheries; dam removal partnerships.',
      keys: 'Multi-agency coordination; long-term commitment.' },
    { law: 'Right Whale Vessel Speed Rule',
      year: '2008-',
      scope: 'NOAA-implemented 10-knot speed restriction in seasonal Right Whale zones.',
      maine_relevance: 'Affects commercial + recreational + ferry traffic.',
      keys: 'Real-time monitoring; enforcement; vessel speed compliance.' },
    { law: 'Atlantic Coastal Fisheries Cooperative Management Act (1993)',
      year: 1993,
      scope: 'Defines federal-state cooperative management for Atlantic coastal fisheries.',
      maine_relevance: 'Foundation for state authority + ASMFC coordination.',
      keys: 'Compact between states + federal authority.' },
    { law: 'Sustainable Fisheries Act (1996)',
      year: 1996,
      scope: 'Amendment to Magnuson-Stevens; added sustainability requirements.',
      maine_relevance: 'Sustainability is now legal mandate; rebuilding overfished stocks required.',
      keys: 'Stock-rebuilding plans; ecosystem-based management.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: FREQUENTLY ASKED QUESTIONS (PUBLIC + STUDENT)
  // ───────────────────────────────────────────────────────────
  var FAQ_PUBLIC = [
    { q: 'Why is Maine lobster so expensive?',
      a: 'Multiple factors: (1) Limited-entry license system means supply is constrained. (2) Wholesale prices vary $4-$10+/lb depending on season + size + shell hardness. (3) Lobster takes 6-8 years to reach legal size — long capital tie-up. (4) Maine has strict conservation rules (v-notch, size limits, escape vents) protecting stock. (5) Premium brand + global demand. Maine lobster commands a premium for quality + provenance.' },
    { q: 'What\'s the difference between hard-shell and soft-shell lobster?',
      a: 'Hard-shell lobsters have fully-formed shells from completing molt months ago. They\'re commercially shippable + command premium prices ($6-$10+/lb wholesale). Soft-shell (a.k.a. "shedder") lobsters are recently-molted; shell is soft + body is full of water. They\'re fragile + sold locally for lower price. Best for steaming + local consumption. Maine\'s "shedder season" is mid-summer to early fall.' },
    { q: 'Are striped bass good to eat?',
      a: 'Yes, striped bass is excellent eating. Best to harvest within slot (28-31" in Maine). White flaky meat; mild flavor. Concerns: PCBs + mercury in fish from polluted waters. Recommendation: limit consumption of large bass + pregnant women + young children should be cautious. Maine waters generally cleaner than mid-Atlantic + Chesapeake.' },
    { q: 'Why are some Maine waters closed to shellfish harvest?',
      a: 'NSSP classifies waters by sanitary quality: Approved (harvest always), Conditionally Approved (harvest except after rain), Restricted (depuration only), Prohibited (no harvest). Closures protect public from bacteria + biotoxin contamination. Heavy rain runs untreated runoff + sewage into coastal waters. Maine DMR maintains classification map.' },
    { q: 'What\'s the right whale issue?',
      a: 'North Atlantic right whale is critically endangered (~340 individuals total). Vertical lobster + aquaculture gear lines are leading entanglement cause. NOAA implementing 10-knot vessel speed zones + new ropeless gear rules. Reshaping Maine lobster industry.' },
    { q: 'Why has cod fishing collapsed?',
      a: 'Decades of overfishing (1960s-1990s) reduced cod stocks. Warming Gulf of Maine prevents recovery — cod larvae fail above ~12°C. Stricter management has not been enough. Maine cod is a climate cautionary tale.' },
    { q: 'Can I keep a striped bass under the slot?',
      a: 'No. Maine striper slot is 28-31"; release everything outside. Sub-slot stripers are juveniles needing to mature. Over-slot stripers are large breeders contributing most to next generation\'s recruitment.' },
    { q: 'How does v-notching work?',
      a: 'Maine lobstermen cut a v-shape into the tail flipper of any female caught carrying eggs. The notch persists through molts. V-notched females are permanently protected from harvest by both state + federal law. Self-enforced + mutually beneficial.' },
    { q: 'Why are puffins endangered in Maine?',
      a: 'Atlantic puffin populations were extirpated from Maine by ~1900 due to harvest. Project Puffin (Audubon, 1973-) has restored multiple Maine colonies. Climate change is now affecting puffin food supply + nesting success. Population stable but vulnerable.' },
    { q: 'Can I see whales from Maine boats?',
      a: 'Yes. Whale-watching tours operate from many Maine ports. Common species: humpback, minke, fin, North Atlantic right whale (critically endangered + protected with strict distance rules). NOAA Whale Watching Guidelines: 100+ yards minimum from non-right-whale; 500 yards from right whale.' },
    { q: 'Why is the Gulf of Maine warming so fast?',
      a: 'Multiple factors: (1) Shifts in Gulf Stream + Labrador Current dynamics; (2) Semi-enclosed geography limits water exchange; (3) Atlantic Multidecadal Oscillation. Combined: Gulf of Maine warmed at ~4× global ocean rate (2004-2013, Pershing 2015). Among fastest-warming marine regions on Earth.' },
    { q: 'How do I start lobster fishing in Maine?',
      a: 'Apprentice (age ~16+) under licensed lobsterman for 2 years + ≥1000 documented hours. Apply for Class I license through DMR. Many zones have multi-year waitlists. Significant time + capital investment. Maine Lobstermen\'s Association provides guidance.' },
    { q: 'Can I dig my own clams in Maine?',
      a: 'Yes, with proper town permit. Maine soft-shell clams are town-managed; each town has clam committee setting rules + issuing recreational + commercial permits. Check NSSP classification before digging — many flats are conditionally closed after rain.' },
    { q: 'What does it cost to start a charter operation?',
      a: 'Variable. Boat: $30K-$300K used; $300K-$600K new. USCG OUPV license: $500+ training + medical + drug testing. Insurance: $5K-$20K/year. Permits + licenses + registration: $500-$2000/year. Marketing + customer acquisition: ongoing. Plan for $200K+ in startup capital + savings to cover first year.' },
    { q: 'Why are some Maine fish protected?',
      a: 'Endangered Species Act (Atlantic salmon, Atlantic sturgeon, North Atlantic right whale). NOAA Species of Concern (Atlantic wolffish). Maine state-level protections. Climate-driven declines + historical overharvest both factors.' },
    { q: 'Can I fish without a license?',
      a: 'Maine saltwater requires recreational license (residents + non-residents; modest fee). Lobster requires non-commercial recreational permit (up to 5 traps; personal use only; no sale). Commercial requires Class I-III license through apprenticeship. Tribal members may have different rules per tribal sovereignty.' },
    { q: 'What\'s the lobsterman\'s "lay"?',
      a: 'Crew compensation structure. Captain often takes 60-70% of catch revenue; crew (sternman) gets 30-40%. Day-rate alternative: $200-$500/day. "Lay" model encourages crew productivity + ties pay to success.' },
    { q: 'How do I become a marine biologist in Maine?',
      a: 'BS in marine biology or related (UMaine, Maine Maritime Academy, others). MS or PhD for research roles. Internship at Bigelow Lab, GMRI, NOAA NEFSC, UMaine Sea Grant. Pay $35K-$110K depending on degree + agency.' },
    { q: 'Why is Atlantic salmon so endangered in Maine?',
      a: 'Multiple factors: dams blocking spawning runs; industrial-era harvest; pollution; competition from farmed escapees; warming ocean conditions. Maine wild populations restricted to a few rivers. Federal ESA listing 2009. Conservation hatcheries supplement; Penobscot Project + similar removing dams.' },
    { q: 'How safe is Maine boating?',
      a: 'Boating safety depends on preparation + skill + weather. Maine waters are cold (50-65°F most of year); hypothermia kills fast. Wear PFD. Carry safety equipment. Take USCG-approved boater education. Most accidents involve human error + inadequate safety equipment.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: STUDENT-FACING ACTIVITIES (hands-on)
  // ───────────────────────────────────────────────────────────
  var STUDENT_ACTIVITIES = [
    { activity: 'Activity 1: Tidal Observation Journal',
      content: 'Maintain a daily tidal-observation journal for one lunar cycle. Visit a coastal location at high + low tide on at least 5 days. Document: time, water level, observed wildlife, weather conditions, tidal range. After 30 days, graph tide heights + compare to predicted tide table.',
      learning_objectives: ['Apply tide table reading', 'Develop sustained observation habit', 'Connect data to lived experience'],
      materials: ['Field journal', 'Phone for photos + time', 'Print tide table'],
      time: '4 weeks ongoing; total ~10 hours observation' },
    { activity: 'Activity 2: Knot Tying Practice + Identification',
      content: 'Learn + practice 6 essential knots. Tie each correctly + describe its use. Demonstrate in 3-minute oral presentation. Knots: bowline, clove hitch, cleat hitch, figure-eight, sheet bend, fisherman\'s bend.',
      learning_objectives: ['Practical seamanship skill', 'Engineering understanding', 'Communication skill'],
      materials: ['6 ft of rope per student', 'Practice instructions'],
      time: '2-3 class periods' },
    { activity: 'Activity 3: Chart Reading + Plotting a Fix',
      content: 'Using a NOAA chart of Casco Bay, practice: identifying buoys + lighthouses, taking compass bearings to landmarks, plotting a fix from 2 bearings, plotting a dead reckoning position. Final assessment: plot a sequence of fixes for a hypothetical 3-hour boating trip.',
      learning_objectives: ['Read nautical charts', 'Use compass + bearings', 'Apply dead reckoning'],
      materials: ['NOAA chart', 'Parallel ruler + plotter', 'Pencil'],
      time: '2 class periods + homework' },
    { activity: 'Activity 4: Species Identification Quiz',
      content: 'Using photo cards + field guide, identify 20 Maine species. Mix of common + less-common species. Some are climate-shifted (black sea bass, summer flounder). Apply identification key (dichotomous) for each.',
      learning_objectives: ['Master species ID', 'Apply scientific keys', 'Recognize climate-shift species'],
      materials: ['Photo cards', 'Field guide', 'ID key worksheet'],
      time: '90 min + studying' },
    { activity: 'Activity 5: Mock Fishing Trip Plan',
      content: 'Plan a hypothetical fishing trip: time of year, target species, departure port, route, gear, regulations to follow, weather considerations, safety equipment. Present as 2-page plan + 10-min oral presentation. Defend choices.',
      learning_objectives: ['Synthesize curriculum content', 'Communication skill', 'Apply regulations'],
      materials: ['Trip plan template', 'Chart access'],
      time: '1 week project' },
    { activity: 'Activity 6: Climate Vulnerability Matrix',
      content: 'Build a matrix showing climate vulnerability for 10 Maine species. Score each on: temperature sensitivity, salinity sensitivity, range shift likelihood, food web dependence. Predict near-future trends.',
      learning_objectives: ['Apply climate vulnerability framework', 'Data synthesis', 'Predict future'],
      materials: ['Vulnerability score sheet', 'Climate references', 'Spreadsheet'],
      time: '2 class periods + research' },
    { activity: 'Activity 7: Mock Public Hearing',
      content: 'Class divides into stakeholder roles for hypothetical aquaculture lease hearing. Roles: applicant, abutter, local fisherman, tribal representative, DMR adjudicator, environmental advocate. Hold 90-min hearing with prepared statements + Q&A.',
      learning_objectives: ['Understand multi-stakeholder governance', 'Public speaking + persuasion', 'Respect tribal sovereignty'],
      materials: ['Stakeholder background packets', 'Hearing rules'],
      time: '2 class periods preparation + 90-min hearing + 1 class debrief' },
    { activity: 'Activity 8: Knot + Line Strength Test',
      content: 'Tie test knots in identical rope. Apply tension until knot fails. Measure failure point. Compare to manufacturer rated strength (typically reduced ~30-50% by knot). Discuss why this matters in marine safety.',
      learning_objectives: ['Empirical engineering', 'Apply physics', 'Marine safety awareness'],
      materials: ['Rope samples', 'Spring scale or testing rig', 'Safety glasses'],
      time: '90 min + write-up' },
    { activity: 'Activity 9: Field Trip to Aquaculture Farm or Lobsterman',
      content: 'Visit a working Maine aquaculture farm or lobsterman. Observe daily operations. Interview operator. Document via photo + journal + audio. Write field report.',
      learning_objectives: ['Place-based learning', 'Build relationships with industry', 'Connect classroom + workplace'],
      materials: ['Field journal', 'Camera/phone', 'Permission slips', 'Interview question sheet'],
      time: 'Full day or half-day + class debrief' },
    { activity: 'Activity 10: Wabanaki Heritage Research',
      content: 'Research one Wabanaki nation\'s relationship with Maine fisheries. Visit Wabanaki REACH or tribal-website resources. Prepare 5-page report or video. Center living tribal voices, not historical artifacts.',
      learning_objectives: ['Maine Indian Education compliance', 'Cultural literacy', 'Historical understanding'],
      materials: ['Wabanaki REACH curriculum', 'Tribal websites', 'Research guide'],
      time: '1-2 weeks ongoing project' },
    { activity: 'Activity 11: Cooking + Tasting',
      content: 'Acquire commercial Maine seafood (with permission + budget). Cook simple dishes: mussels marinière, oyster on the half shell, codfish chowder, lobster roll. Taste + discuss flavor + texture differences.',
      learning_objectives: ['Connect classroom to kitchen', 'Cultural appreciation', 'Cooking skills'],
      materials: ['Seafood + ingredients', 'Cooking facility', 'Plates + utensils'],
      time: 'Half-day + lunch' },
    { activity: 'Activity 12: Climate Adaptation Plan Design',
      content: 'Design a 10-year climate-adaptation plan for a hypothetical Maine commercial operation. Include: species diversification, site selection, gear changes, training, market positioning. Present as illustrated plan.',
      learning_objectives: ['Long-term planning', 'Climate science application', 'Business design'],
      materials: ['Plan template', 'Climate data', 'Spreadsheet'],
      time: '2 weeks project' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COMMUNITY ENGAGEMENT MODELS
  // ───────────────────────────────────────────────────────────
  var COMMUNITY_MODELS = [
    { model: 'Harbor Gang Self-Governance',
      description: 'Maine lobstering communities (Stonington + Vinalhaven + others) have informal self-governance — "harbor gangs" of long-time fishermen decide who can fish where, who can apprentice, what local rules are. Decisions are made through informal social pressure + reputation, not formal voting.',
      example: 'Stonington harbor gang has multi-generation memory of family lineages + apprenticeship. New entrants without established family connection face high hurdles.',
      strengths: 'Place-based + sustained over generations. Knowledge of local conditions exceeds outside experts.',
      limitations: 'Can perpetuate exclusion + resist change. Less transparent than formal process.',
      lesson: 'Self-governance works in tight communities + with specific resource conditions. Doesn\'t scale easily.' },
    { model: 'Zone Council Formal Self-Governance',
      description: 'Maine lobster zones have elected councils that propose + vote on local rules within state-level framework. Includes representation from licensed lobstermen + DMR liaison.',
      example: 'Zone B Council (East Penobscot) sets trap limits + entry rules.',
      strengths: 'Combines self-governance with state framework. Democratic process.',
      limitations: 'Slow + sometimes contentious. State oversight required.',
      lesson: 'Codified self-governance can scale where harbor gang doesn\'t. Maine zone council is national model.' },
    { model: 'Cooperative Business Model',
      description: 'Lobster co-ops + Atlantic Sea Farms partnership are examples. Members share infrastructure (cooler, dock, processing) + collective marketing power.',
      example: 'Stonington Lobster Co-op pools landings + negotiates with buyers.',
      strengths: 'Lowers individual risk + costs. Increases collective bargaining power.',
      limitations: 'Governance complexity. Trust + relationships matter.',
      lesson: 'Cooperatives work when culture + economics align. Multi-generation in Maine.' },
    { model: 'Tribal Self-Governance',
      description: 'Wabanaki nations exercise sovereignty over tribal-claim waters. Tribal-led aquaculture initiatives emerging.',
      example: 'Passamaquoddy + Penobscot exploring tribally-owned operations.',
      strengths: 'Cultural + sovereignty-affirming. Inter-generational continuity.',
      limitations: 'Capacity-building takes time. Outside engagement requires respect + investment.',
      lesson: 'Tribal sovereignty is legal + ethical principle, not optional. Honor it.' },
    { model: 'NGO + Advocacy Models',
      description: 'Maine Lobstermen\'s Association, Maine Aquaculture Association, Island Institute, Maine Coast Heritage Trust — non-profit advocacy + service.',
      example: 'Maine Aquaculture Association advocates at state + federal policy + provides training.',
      strengths: 'Cross-stakeholder coordination. Long-term planning capacity.',
      limitations: 'Funding-dependent. Multiple voices to balance.',
      lesson: 'Strong civil society anchors industry resilience.' },
    { model: 'Research-Industry Partnerships',
      description: 'Bigelow Lab + GMRI + UMaine + commercial operators collaborate. Research informs practice; practice informs research.',
      example: 'Climate-adapted breeding programs at UMaine + Bigelow.',
      strengths: 'Knowledge flows both ways. Innovation accelerated.',
      limitations: 'Funding cycles + competing priorities.',
      lesson: 'Strong research-industry pipeline is competitive advantage.' },
    { model: 'Working Waterfront Coalitions',
      description: 'Maine Working Waterfront Coalition + similar groups advocate for commercial-fishing infrastructure preservation against coastal gentrification.',
      example: 'Conservation easements + tax provisions to keep working docks working.',
      strengths: 'Coordinated advocacy for preservation. Tangible policy outcomes.',
      limitations: 'Slow gains; ongoing struggle.',
      lesson: 'Working waterfront preservation requires sustained collective action.' },
    { model: 'Government-Industry Partnerships',
      description: 'Maine DMR + Marine Patrol + Coast Guard + NEFMC + NOAA operate in partnership with industry. Industry input shapes regulation; regulation shapes industry behavior.',
      example: 'V-notch became federal law because industry self-enforced first; ASMFC striper management based on industry + scientific consensus.',
      strengths: 'Practical regulations reflecting real conditions.',
      limitations: 'Asymmetric power; industry sometimes captures regulatory process.',
      lesson: 'Healthy regulator-industry relationships require ongoing dialogue + accountability.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: CONSERVATION SUCCESS STORIES
  // ───────────────────────────────────────────────────────────
  var SUCCESS_STORIES = [
    { name: 'Maine Lobster V-Notch Program (1907-)',
      story: 'Maine lobstermen began informally v-notching egg-bearing females in early 1900s. State regulation adopted progressively; federal law since 1985. Today: 90%+ self-enforcement among Maine lobstermen.',
      keys: 'Individual practice + state regulation + federal codification + community self-enforcement.',
      result: 'Maine lobster industry remains viable despite massive harvest pressure. V-notch provides multi-year lifetime protection per female; provides "buffer" of breeding stock.',
      lessons: 'Conservation can emerge from industry practice + scale to law. Self-enforcement works when culture supports it.' },
    { name: 'Atlantic Striped Bass Recovery (1985-1995)',
      story: 'Striper stock collapsed in early 1980s. Multi-state moratorium (1985-1990) banned commercial sale; recreational severely limited. State-coordinated through ASMFC.',
      keys: 'Coordinated multi-state action under federal-state cooperation framework. Pressure from recreational + conservation interests.',
      result: 'Stock rebuilt by mid-1990s. Currently under management challenge again with recent declines + tighter rules.',
      lessons: 'Coordinated action works when there\'s political will. Stocks can recover within human timescales.' },
    { name: 'Penobscot River Restoration (2004-2016)',
      story: 'Multi-tribal-led project removed Great Works + Veazie dams; bypassed Howland Dam. Opened 1,000+ river miles to sea-run fish.',
      keys: 'Tribal leadership + state + federal + NGO partnership. Long-term commitment + funding.',
      result: 'Sea-run fish (alewife, shad, salmon, sturgeon) returning. Cascading ecosystem benefits including downstream water quality.',
      lessons: 'River-scale restoration works with multi-stakeholder + multi-decade commitment. Tribal sovereignty + leadership essential.' },
    { name: 'Haddock Recovery in Gulf of Maine',
      story: 'Haddock collapsed 1990s due to overfishing. Aggressive quota reductions + closed areas + reduced effort allowed recovery by 2010s.',
      keys: 'NOAA + NEFMC stock assessment + management plan. Industry compliance.',
      result: 'Stock fully rebuilt. Haddock is now a sustainable + abundant fishery.',
      lessons: 'Aggressive management can rebuild stocks faster than expected when politically feasible.' },
    { name: 'Project Puffin (1973-)',
      story: 'Atlantic puffin nearly extirpated from Maine by 1900 due to harvest. Stephen Kress + National Audubon Society began restoration on Eastern Egg Rock. Decoy + recorded-call approach.',
      keys: 'Long-term ecological investment. Specific island-by-island restoration. Adaptive management.',
      result: 'Multiple Maine colonies restored: Eastern Egg Rock, Matinicus Rock, Petit Manan, Seal Island. Maine puffin populations stable + visitable.',
      lessons: 'Conservation works when sustained. 50+ year horizon for full restoration.' },
    { name: 'Acadian Redfish Recovery',
      story: 'Redfish collapsed by 1980s after decades of trawling. Slow-growing (50+ year lifespan) + late maturity = particularly vulnerable. Federal quota reductions + closed areas implemented.',
      keys: 'Federal management + industry adaptation + sustained reduced harvest pressure.',
      result: 'Stock rebuilt by 2012. Now sustainable commercial fishery.',
      lessons: 'Long-lived species CAN recover, but requires multi-decade restraint. The biological math is brutal.' },
    { name: 'Monkfish Sustainable Management',
      story: 'Monkfish stock declined by 1990s. Modern federal management under NEFMC plan; industry-led research partnership.',
      keys: 'Quota system + observer programs + research investment.',
      result: 'Stock rebuilt + currently sustainable. "Poor man\'s lobster" now nationally-known seafood.',
      lessons: 'Modern fisheries science + management can succeed; partnership models work.' },
    { name: 'Maine Working Waterfront Access Protection Program',
      story: 'State legislation + conservation easements protecting commercial fishing + aquaculture infrastructure against coastal gentrification.',
      keys: 'State-funded grants + nonprofit (Maine Coast Heritage Trust) implementation + community engagement.',
      result: 'Multiple Maine working-waterfront sites protected through easements. Continuing program.',
      lessons: 'Preservation programs work but require sustained funding + political support. Lose without ongoing advocacy.' },
    { name: 'Damariscotta Mills Alewife Restoration',
      story: 'Community-led restoration of historic alewife fishway. Renovations 2000s-present. Annual celebration draws thousands.',
      keys: 'Community ownership + state + nonprofit + tribal partnership. Cultural anchor.',
      result: 'Alewife run continuing + growing. Cultural revival.',
      lessons: 'Community ownership of restoration is durable. Cultural celebration sustains political will.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: EXTENDED GLOSSARY Q-Z
  // ───────────────────────────────────────────────────────────
  var EXTENDED_GLOSSARY_QZ = [
    { letter: 'Q', entries: [
      'QUAHOG — Hard-shell clam (Mercenaria mercenaria).',
      'QUARANTINE — Isolation to prevent disease spread.',
      'QUARTER — One of four equal parts.',
      'QUARTER MOON — Moon phase (associated with neap tides).',
      'QUARTERLY — Every three months.',
      'QUAY — Waterfront landing structure (rare in Maine usage).',
      'QUOTA — Allowed harvest amount.'
    ]},
    { letter: 'R', entries: [
      'RACK + BAG — Oyster culture method.',
      'RADAR — Radio detection + ranging.',
      'RADIO — VHF marine radio.',
      'RAFT — Floating platform.',
      'RAINBOW SMELT — Anadromous Maine species.',
      'RANGE — Geographic extent.',
      'RANGE SHIFT — Migration of species range with climate.',
      'RAS — Recirculating Aquaculture System.',
      'RAT GUARDS — Devices preventing rodent access to ships.',
      'RAY — Cartilaginous fish related to sharks.',
      'REACH — Sailing direction with wind perpendicular.',
      'RECEIVER — Wholesale buyer.',
      'RECORDKEEPING — Daily logs.',
      'RECREATIONAL — For sport, not commercial.',
      'RECRUITMENT — Young joining adult population.',
      'RED CAN — (Confusing; cans are green).',
      'RED NUN — Red conical buoy.',
      'RED RIGHT RETURNING — IALA Region B mnemonic.',
      'REDFISH — Acadian redfish.',
      'REDUCTION FISHERY — Catching fish for industrial fishmeal.',
      'REEF — Underwater ridge or barrier.',
      'REFRIGERATION — Cold storage.',
      'REFRACTOMETER — Salinity measurement tool.',
      'REGISTRATION — Vessel registration with state.',
      'REGULATION — Rule or law.',
      'RELAY — Moving shellfish for natural purging.',
      'RELEASE — Returning fish to water.',
      'RELIABILITY — Consistency of equipment + supply.',
      'REMOTE SETTING — Settling spat on grower\'s own substrate.',
      'REPRODUCTION — Generating offspring.',
      'RESEARCH — Scientific investigation.',
      'RESERVE — Stockpile or insurance fund.',
      'RESPIRATION — Oxygen consumption.',
      'RESTRICTED — NSSP partial harvest classification.',
      'RETIREMENT — License retirement (Maine 5:1 retire-to-new).',
      'RETURN — Sea-run fish returning.',
      'REVENUE — Income from operations.',
      'RIGHT WHALE — North Atlantic right whale (critically endangered).',
      'RISK — Probability of loss.',
      'RIVER — Flowing water body.',
      'ROAD — Open water (e.g., "anchorage in the road").',
      'ROCK — Stone, also: rock crab, rock cod.',
      'ROCK CRAB — Cancer irroratus.',
      'ROD — Fishing rod.',
      'ROE — Fish or shellfish eggs.',
      'RODENT — Pest concern in shore facilities.',
      'ROOM — Onboard space (cabin etc.).',
      'ROPE — Marine line.',
      'ROPELESS GEAR — Anti-entanglement aquaculture/lobster gear.',
      'ROUND TURN — Wrap around object.',
      'ROUNDS — Routine inspections.',
      'ROUTING — Path planning.',
      'RUBY — Researcher (Edward Ruby, microbiology).',
      'RUDDER — Steering surface.',
      'RUNNING — Sailing downwind; also: vessel underway.',
      'RUNNING LIGHTS — Required navigation lights.'
    ]},
    { letter: 'S', entries: [
      'SACRIFICIAL ANODE — Zinc or aluminum piece protecting hull metal.',
      'SAFETY — Boating + fishing safety.',
      'SAFETY EQUIPMENT — Required + recommended gear.',
      'SAFETY OFFICER — Person responsible for safety on vessel.',
      'SAFE WATER — NSSP-approved water classification.',
      'SAFE WATER MARK — Red + white buoy.',
      'SAIL — Wind-catching surface.',
      'SAILING — Wind-powered boating.',
      'SAILING DIRECTIONS — Navigation publication.',
      'SALINITY — Salt content.',
      'SALINITY GRADIENT — Salinity change in estuary.',
      'SALMON — Atlantic salmon (Salmo salar).',
      'SALT — Sodium chloride.',
      'SAMPLE — Take a representative portion.',
      'SAND — Granular sediment.',
      'SAND LANCE — Sand eels; forage fish.',
      'SANDWORM — Annelid worm bait.',
      'SARDINE — Small canned herring; historic Maine industry.',
      'SASHIMI — Raw fish dish (tuna).',
      'SATELLITE — Space-based observation + positioning.',
      'SAVE — Reserve or preserve.',
      'SAW — Sawing tool.',
      'SAXITOXIN — PSP biotoxin.',
      'SCALE — (1) Fish scale. (2) Measurement scale.',
      'SCALER — Tool for removing scales.',
      'SCALLOP — Sea scallop or bay scallop.',
      'SCHOOLER — Schooling fish.',
      'SCIENCE — Knowledge from systematic study.',
      'SCOPE — Anchor line length ratio.',
      'SCUM — Foam or film on water.',
      'SCUPPER — Drain hole.',
      'SEA — Body of water; also: sea state.',
      'SEA BASS — Black sea bass (climate indicator).',
      'SEA BAG — Personal effects bag.',
      'SEA COW — Slang for slow boat.',
      'SEA-RUN — Anadromous fish (alewife, shad, salmon).',
      'SEA URCHIN — Echinoderm; commercial fishery.',
      'SEABED — Floor of ocean.',
      'SEABIRD — Marine bird.',
      'SEAFOOD — Marine food.',
      'SEAGRASS — Submerged grass.',
      'SEAL — Marine mammal (harbor + gray).',
      'SEAMANSHIP — Boating skills.',
      'SEAMOUNT — Underwater mountain.',
      'SEASON — Calendar period.',
      'SEAWORTHY — Capable of sea conditions.',
      'SEDIMENT — Bottom material (mud, sand, rock).',
      'SEED — Spat or juvenile organism for aquaculture.',
      'SEINE — Encircling fishing net.',
      'SEMIDIURNAL — Two highs + two lows per day.',
      'SET — (1) Direction of current. (2) Larval settlement.',
      'SETTING — Larval metamorphosis to spat.',
      'SETTLE — Anchor digging in OR larval settling.',
      'SHAD — American shad (declining).',
      'SHALE — Sedimentary rock; bottom type.',
      'SHARK — Cartilaginous fish.',
      'SHEDDER — Soft-shell lobster.',
      'SHEET — (1) Sail control line. (2) Bedding.',
      'SHEET BEND — Knot for joining unequal-diameter lines.',
      'SHELL — Hard outer covering of bivalves + crustaceans.',
      'SHELLFISH — Bivalves + crustaceans + gastropods.',
      'SHELL MIDDEN — Archaeological shell mound.',
      'SHELL TOXICITY — Biotoxin accumulation in shell.',
      'SHIP — Large vessel.',
      'SHOAL — Shallow area.',
      'SHORE — Edge of land + water.',
      'SHORT — Sub-legal size fish.',
      'SHRIMP — Northern shrimp historically; not currently fishable.',
      'SHRINKAGE — Loss in transit or storage.',
      'SIDE — Of a boat.',
      'SIDE LIGHTS — Red + green nav lights.',
      'SIGN — Indicator.',
      'SILT — Fine sediment.',
      'SINK — (1) Sinking (boats!). (2) Carbon sink.',
      'SIZE LIMIT — Minimum harvest size.',
      'SLACK TIDE — Brief calm period at tide change.',
      'SLOOP — Sailing rig type.',
      'SLOT LIMIT — Harvest only within size range.',
      'SLOUGH — Stagnant body; also: shedding (kelp slough).',
      'SMACK — Vessel transporting live fish.',
      'SMELT — Rainbow smelt; small anadromous fish.',
      'SMOKE — (1) Tobacco. (2) Smoked fish (preservation).',
      'SNAFU — Boat slang for problem.',
      'SNAG — Hooking bottom or obstacles.',
      'SOCK — Mesh tube for mussel seed.',
      'SOFT-BOTTOM — Mud + sand bottom.',
      'SOFT-SHELL — Recently-molted (lobster, crab).',
      'SOFT-SHELL CLAM — Mya arenaria (Maine\'s "steamer").',
      'SOLAR — Of the sun.',
      'SOLE — Boat floor.',
      'SOLE FISH — Type of flatfish.',
      'SONAR — Sound navigation + ranging.',
      'SOUND — (1) Body of water. (2) To measure depth. (3) Audible signal.',
      'SOUNDING — Depth measurement.',
      'SOUR — Pickled (e.g., sour mussels).',
      'SOUTHERN — South direction.',
      'SOY — Soybean (feed component).',
      'SPACE — Onboard or stowage space.',
      'SPAR — Mast, boom, gaff.',
      'SPAT — Newly-set bivalve.',
      'SPECIES — Biological category.',
      'SPECIFICITY — Selectivity of gear or method.',
      'SPECIES DIVERSITY — Variety of species.',
      'SPECIMEN — Sample organism.',
      'SPEED — Vessel velocity.',
      'SPENT — Post-spawn (used up).',
      'SPILLWAY — Water release structure.',
      'SPILL — Accidental release of fuel or pollutants.',
      'SPLICE — Joining ropes by interweaving.',
      'SPOIL — (1) Excavated material. (2) Going bad (food).',
      'SPONGE — Aquatic invertebrate.',
      'SPRING TIDE — Highest tidal range (full + new moon).',
      'STABILITY — Ship\'s resistance to tipping.',
      'STAGE — Phase of life or process.',
      'STAGGER — Spread events over time.',
      'STAGING — Pre-positioning gear.',
      'STAINLESS STEEL — Corrosion-resistant alloy.',
      'STANCHION — Vertical post.',
      'STAND-ON VESSEL — Vessel maintaining course per COLREGS.',
      'STANDARD LEASE — Maine larger aquaculture lease type.',
      'STARBOARD — Right side facing forward.',
      'STARFISH — Sea star; aquaculture pest.',
      'STAR NAV — Celestial navigation.',
      'START — Begin operation.',
      'STATE — Government level; also: condition.',
      'STATIONARY — Not moving.',
      'STATISTICS — Data analysis.',
      'STAY — Sailboat rigging line.',
      'STEAM — Vessel propulsion type (historic).',
      'STEAMER — Soft-shell clam.',
      'STEEL — Material.',
      'STELL — Maine Italian fishing community.',
      'STELLWAGEN — Stellwagen Bank.',
      'STEM — Forward upright timber/keel.',
      'STERN — Back of boat.',
      'STERN LINE — Dock line at stern.',
      'STERNMAN / STERN-PERSON — Crew member on lobster boat.',
      'STEWARDSHIP — Caring for resource.',
      'STIFF — Resistant to tipping.',
      'STOCK — Population.',
      'STOCK ASSESSMENT — Population analysis.',
      'STONINGTON — Maine lobster capital.',
      'STOPPER — Knot preventing line passage.',
      'STORAGE — Holding facility.',
      'STORM — Severe weather.',
      'STRAITS — Narrow water passage.',
      'STRAIN — Genetic line.',
      'STRESS — Physiological strain.',
      'STRIPED BASS — Morone saxatilis.',
      'STRIP — Cut strip of bait.',
      'STROKE — Engine stroke or rowing motion.',
      'STRUCTURE — Underwater feature.',
      'STUB — Boat slang for short cigarette or pipe.',
      'STUNT — Trick maneuver (avoid in commercial work).',
      'SUBSISTENCE — For personal/family use.',
      'SUBSURFACE — Below water surface.',
      'SUBSTRATE — Bottom material.',
      'SUBSURFACE FLOAT — Aquaculture flotation below surface.',
      'SUBTIDAL — Below low tide line.',
      'SUMMER — Season.',
      'SUMMER FLOUNDER — Fluke (climate-shifted).',
      'SUNRISE/SUNSET — Diurnal cycle (relevant for nav lights).',
      'SUPPLY CHAIN — Producer-to-consumer pathway.',
      'SURFCASTING — Beach fishing.',
      'SURFACE FLOAT — Marker at water surface.',
      'SURPLUS — More than required.',
      'SURVEY — Systematic observation.',
      'SUSPENDED CULTURE — Aquaculture method in mid-water.',
      'SUSTAINABILITY — Practices supporting long-term resource health.',
      'SWORDFISH — Highly migratory species.'
    ]},
    { letter: 'T', entries: [
      'TACK — Sailing maneuver.',
      'TAG — NSSP harvest identifier.',
      'TAGGING — Marking for trace-back.',
      'TAIL — Fish tail.',
      'TANK — Storage container.',
      'TAUTOG — Blackfish.',
      'TAX — Government revenue.',
      'TAXES — Plural of tax.',
      'TAXONOMY — Biological classification.',
      'TEMPERATURE — Water + air temperature.',
      'TENDER — Small auxiliary boat.',
      'TERMINAL — Cargo terminal at port.',
      'TERN — Seabird.',
      'TERRAIN — Landscape (rarely apt for underwater).',
      'TERROIR — Place-based character of food.',
      'TEST — (1) Echinoderm shell. (2) Examination.',
      'THERMOCLINE — Sharp temperature transition layer.',
      'THERMOMETER — Temperature meter.',
      'THEFT — Stolen gear.',
      'TIDE — Water level cycle.',
      'TIDAL — Of tides.',
      'TIDAL RANGE — High-to-low water height.',
      'TIDAL CURRENT — Water motion driven by tides.',
      'TIDE GAUGE — Tide-measuring station.',
      'TIDE TABLE — Predicted tide table.',
      'TILE FISH — Tilefish.',
      'TIME — Temporal measurement.',
      'TIME-TEMPERATURE — Shellfish safety control.',
      'TIPS — Practical guidance.',
      'TOMALLEY — Lobster liver/pancreas.',
      'TON — Mass unit.',
      'TOOLS — Equipment.',
      'TOP-DOWN — Predator-driven ecosystem.',
      'TOPMARK — Symbol atop cardinal mark.',
      'TOPWATER — Surface lure.',
      'TORQUE — Rotational force.',
      'TOTE — Plastic transport container.',
      'TOW — Pull behind boat.',
      'TOWING — Pulling another boat or gear.',
      'TOXIC — Poisonous.',
      'TOXIN — Poisonous substance.',
      'TRACE-BACK — Following product back to source.',
      'TRACING — Following.',
      'TRACK — Recorded path; also: predict.',
      'TRADE — Commercial activity.',
      'TRADITIONAL — Long-established practice.',
      'TRADITION — Long-established practice.',
      'TRAIL — Mark visible behind.',
      'TRAINING — Education + skill development.',
      'TRAINING HOURS — Documented learning time.',
      'TRANS — Across (prefix).',
      'TRANS-ATLANTIC — Across Atlantic Ocean.',
      'TRANSMITTING — Sending signal.',
      'TRANSOM — Flat back of boat.',
      'TRANSOM EXIT — How outboard exits transom.',
      'TRAP — Lobster trap or fish trap.',
      'TRAP-MAKER — Person who builds traps.',
      'TRAVEL — Move from place to place.',
      'TRAWL — Bottom-dragging fishing net.',
      'TRAWLER — Boat using trawl.',
      'TRENCH — Deep channel or sediment trench.',
      'TRIAL — Experiment.',
      'TRIBE — Indigenous nation.',
      'TRIBAL — Of tribe.',
      'TRIBAL SOVEREIGNTY — Tribal self-governance.',
      'TRICKLE — Slow flow.',
      'TRIGEMINUS — (Anatomy term; not aquaculture).',
      'TRIM — Adjust sail or load distribution.',
      'TRIMARAN — Three-hulled boat.',
      'TRIPLOID — 3 sets of chromosomes (e.g., triploid oyster).',
      'TROLLING — Pulling lures behind moving boat.',
      'TROLLEY — Tow line system.',
      'TROPHIC — Of feeding levels.',
      'TROPHIC LEVEL — Position in food web.',
      'TROUT — Salmonid fish.',
      'TRUE NORTH — Geographic north (vs magnetic).',
      'TUBE — Cylindrical container.',
      'TUNA — Bluefin + other tunas.',
      'TUNICATE — Sea squirt; biofouling.',
      'TURBIDITY — Water cloudiness.',
      'TURBULENCE — Water motion.',
      'TURN — Change direction.'
    ]},
    { letter: 'U-V', entries: [
      'UMaine — University of Maine.',
      'UNDER WAY — Vessel not anchored, made fast, or aground.',
      'UNICOLOR — Single color.',
      'UNREGULATED — Without rules.',
      'UPDRAFT — Wind blowing upward.',
      'UPDATE — Latest information.',
      'UPHILL — Uphill, gradient (rarely apt).',
      'UPSTREAM — Toward water source.',
      'UPWELLER — Hatchery flow-through tank.',
      'UPWELLING — Cold deep water rising.',
      'UPWIND — Direction toward wind source.',
      'URCHIN — Sea urchin.',
      'URGENT — Quickly needed.',
      'US — United States.',
      'USCG — US Coast Guard.',
      'USDA — Department of Agriculture.',
      'UTILITY — Useful purpose.',
      'V-NOTCH — Lifetime protection mark for egg-bearing lobster.',
      'VACATION — Recreational period.',
      'VALUE — Worth.',
      'VALVE — Closing mechanism.',
      'VARIABLE — Changing.',
      'VARIATION — Compass declination from true north.',
      'VECTOR — Direction + magnitude.',
      'VENT — Trap escape vent.',
      'VENTILATION — Air or water flow.',
      'VENTURE — Business undertaking.',
      'VESSEL — Boat or ship.',
      'VHF — Very High Frequency marine radio.',
      'VIBRIO — Marine bacterium causing illness.',
      'VICTUAL — Food provisions.',
      'VIDEO — Recorded imagery.',
      'VIEW — Sight; visual line.',
      'VIRUS — Pathogen.',
      'VISIBILITY — Visual range.',
      'VOLUNTARY — Not mandatory.',
      'VOLUME — Quantity.',
      'VORTEX — Spinning water motion.'
    ]},
    { letter: 'W-Z', entries: [
      'WABANAKI — Confederacy of 4 Maine tribal nations.',
      'WAKE — Wave pattern behind boat.',
      'WAKE-FREE ZONE — No-wake speed limit.',
      'WALL — (1) Structure. (2) Walleye (no Maine).',
      'WARM — Higher temperature.',
      'WARMING — Temperature increase trend.',
      'WARP — Cable connecting trap or trawl to boat.',
      'WATER — H₂O.',
      'WATER QUALITY — Suitability for life or aquaculture.',
      'WATERLINE — Surface of water on hull.',
      'WAVE — Water surface oscillation.',
      'WAVELENGTH — Distance between wave crests.',
      'WEATHER — Atmospheric conditions.',
      'WEATHER SIDE — Windward side.',
      'WHARF — Landing parallel to shore.',
      'WHEEL — Steering wheel.',
      'WHELK — Marine snail.',
      'WHITE — Color.',
      'WHITE FISH — Various species.',
      'WILD — Not captive.',
      'WILDLIFE — Non-domesticated animals.',
      'WINCH — Mechanical rope-handling system.',
      'WIND — Air motion.',
      'WIND POWER — Wind-driven energy.',
      'WINDLASS — Anchor winch.',
      'WINDWARD — Toward the wind.',
      'WINE — Beverage (related: terroir).',
      'WINTER — Cold season.',
      'WINTER FLOUNDER — Pseudopleuronectes americanus.',
      'WIRELESS — Without wires.',
      'WIRE LEADER — Wire-class fishing leader.',
      'WOLFFISH — Atlantic wolffish (endangered).',
      'WOMAN — Female crew member.',
      'WORK — Labor.',
      'WORKING WATERFRONT — Commercial fishing + aquaculture infrastructure.',
      'WORKING WATERFRONT PROGRAM — Maine preservation initiative.',
      'WORKBOAT — General work vessel.',
      'WORLD — Globe.',
      'WORM — Sandworm; bait.',
      'WRECK — Sunken vessel.',
      'WTW — Working Waterfront preserved.',
      'WWII — World War II era.',
      'X — Coordinate.',
      'XENO — Strange (prefix).',
      'YACHT — Recreational boat.',
      'YANKEE — Northern person/boat.',
      'YEAR — Calendar year.',
      'YEAR-CLASS — Cohort born in same year.',
      'YIELD — Harvest amount.',
      'YOUNG-OF-YEAR — Born this year.',
      'YOUTH — Young people.',
      'ZIPPER — Boat zipper (rare aquaculture).',
      'ZONE — Designated area.',
      'ZONE COUNCIL — Maine lobster zone governance.',
      'ZOOPLANKTON — Animal microplankton.'
    ]}
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX — REGIONAL FISHING TRADITIONS
  // ───────────────────────────────────────────────────────────
  var REGIONAL_TRADITIONS = [
    { region: 'Northern Maine Coast (Eastport, Lubec, Cobscook)',
      tradition: 'Salmon aquaculture (Cooke), heritage clamming + scalloping, smelt + alewife runs, Indigenous Passamaquoddy fishing heritage. Extreme tides (18-25 ft).',
      tradition_continued: 'Boatbuilding heritage in Jonesport-Beals + traditional designs. Marine economies tied to local processing + cross-border ties.',
      changes: 'Salmon industry shrinking; aquaculture diversification + tribal-led initiatives growing.' },
    { region: 'Penobscot Bay (Stonington, Vinalhaven, North Haven)',
      tradition: 'Iconic Maine lobstering. Multi-generational family operations. Strong harbor gangs + zone council governance. Wabanaki Penobscot heritage.',
      tradition_continued: 'Some scallop + finfish work. Granite quarry heritage gives way to lobstering.',
      changes: 'Lobster industry adapting to right whale rules + climate. Some operators diversifying to aquaculture.' },
    { region: 'Midcoast Maine (Boothbay, Damariscotta, Pemaquid)',
      tradition: 'World-class oyster aquaculture (Damariscotta). Boatyards. Tourism + recreational fishing.',
      tradition_continued: 'Bigelow Lab + marine research presence. Working waterfront + tourism balance.',
      changes: 'Aquaculture industry rapidly expanding; tourism intensifying.' },
    { region: 'Casco Bay + Portland',
      tradition: 'Maine\'s largest working waterfront. Mixed commercial + recreational + sport fishing. Multiple ports. Strong charter operations.',
      tradition_continued: 'Diversified industry — lobster + groundfish + striper + aquaculture.',
      changes: 'Climate shifts visible (sea bass arriving); industrial salmon aquaculture in nearby Saco area.' },
    { region: 'Southern Maine (Cape Elizabeth, Kennebunkport, York)',
      tradition: 'Sport fishing + striper + summer recreational. Smaller commercial fleet. Tourism-dominated economy.',
      tradition_continued: 'Beach + surf casting + offshore charter.',
      changes: 'Climate-driven species shifts most pronounced; warmer waters allow southern species.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX — EXTENDED VOCABULARY (E-Z) for glossary
  // ───────────────────────────────────────────────────────────
  // Extension of GLOSSARY_A_TO_Z. Each letter adds 10-15 entries.
  // This is reference content for high school + community college courses.
  var EXTENDED_GLOSSARY = [
    { letter: 'E', entries: [
      'EBB TIDE — Falling tide; water flowing out to sea.',
      'EBB-TIDE BAR — Sandbar formed by ebb current at river mouth.',
      'EELGRASS — Submerged grass (Zostera marina); nursery habitat; declining.',
      'EEZ — Exclusive Economic Zone; 200-nm zone of US federal fishery jurisdiction.',
      'EPIRB — Emergency Position-Indicating Radio Beacon.',
      'ESA — Endangered Species Act (1973).',
      'ESCAPE VENT — Required opening in lobster traps for sub-legal lobsters to exit.',
      'ESTUARY — Where freshwater meets saltwater.',
      'EYED LARVAE — Late-stage shellfish larvae ready to settle.',
      'EXTRA TIDAL FLOW — Strong tidal current.'
    ]},
    { letter: 'F', entries: [
      'FAIRLEAD — Hardware fitting guiding a line direction.',
      'FASTNET — Particular knot or attachment method.',
      'FATHOM — 6 feet; old depth unit.',
      'FENDER — Cushion between boat + dock or other boat.',
      'FIBERGLASS — Common boat hull material.',
      'FILLET KNIFE — Flexible thin-bladed knife for filleting fish.',
      'FIRE EXTINGUISHER — Required safety equipment.',
      'FISH FINDER — Echo-sounding electronics displaying water depth + fish marks.',
      'FISHING BOAT — Vessel used for commercial or recreational fishing.',
      'FISH PROCESSOR — Facility cleaning + filleting + packaging fish.',
      'FIX — Position determined by observations.',
      'FLOOD TIDE — Rising tide; water flowing into bays.',
      'FLOATATION — Buoyancy; PFD; cushioned support.',
      'FOG — Reduced visibility from condensation in air.',
      'FOG SIGNAL — Sound emitted by vessel in fog (COLREGS Rule 35).',
      'FORE — Toward the bow.',
      'FOREPEAK — Stowage compartment at the very bow.',
      'FORWARD — Direction toward bow.',
      'FUEL DOCK — Dock providing fuel for vessels.',
      'FULL-WATER MARK — High tide mark.'
    ]},
    { letter: 'G', entries: [
      'GAFF — Spar holding head of four-sided sail; also: hook on pole for landing big fish.',
      'GAFF HOOK — Pole with sharp hook for landing fish.',
      'GALLEY — Kitchen onboard.',
      'GANGION — Short branch line connecting hook to longline.',
      'GANGWAY — Walkway for boarding.',
      'GARLIC PRESS BRACKETS — Hardware for some fishing rigs.',
      'GEAR — Equipment used for fishing (rods, reels, traps, nets).',
      'GENNAKER — Asymmetric spinnaker sail.',
      'GIBE/JIBE — Turning stern through wind in sailing.',
      'GILLNET — Mesh net used to entangle fish by gills.',
      'GIVE-WAY VESSEL — Vessel required to maneuver under COLREGS Rule 15.',
      'GLOSSARY — Reference list of terms (you\'re reading one now).',
      'GMDSS — Global Maritime Distress + Safety System.',
      'GMRI — Gulf of Maine Research Institute.',
      'GOOSENECK — Connecting fitting between mast + boom.',
      'GOUGEON — Boatbuilding family + epoxy products.',
      'GPS — Global Positioning System.',
      'GRAB BAG — Emergency kit ready to take in abandoning ship.',
      'GRANDFATHER CLAUSE — Provision allowing pre-existing operations to continue.',
      'GREEN CAN — Cylindrical green buoy (IALA-B port side returning).',
      'GREEN CRAB — Invasive species devastating Maine clam flats.',
      'GROUNDFISH — Bottom-dwelling commercial species: cod, haddock, pollock, hake.',
      'GROUND TACKLE — Anchor + rode + hardware.',
      'GULL — Multiple species of seabirds.',
      'GUNNEL/GUNWALE — Upper edge of boat\'s side.',
      'GYBE — Same as jibe.',
      'GYRE — Large-scale circular ocean current pattern.'
    ]},
    { letter: 'H', entries: [
      'HABITAT — Type of place an organism lives.',
      'HABS — Harmful Algal Blooms.',
      'HACCP — Hazard Analysis Critical Control Points; food safety framework.',
      'HALYARD — Line used to raise a sail.',
      'HARBOR — Sheltered body of water for boats.',
      'HARBOR PILOT — Person navigating large vessels in + out of harbor.',
      'HARD CHINE — Hull with angular edge between bottom + side.',
      'HARNESS — Wearable safety system for clipping into jacklines.',
      'HASTY KNOT — Quick basic knot for temporary use.',
      'HATCH — Door in deck.',
      'HEAD — Bathroom onboard.',
      'HEAD SEA — Waves approaching from bow.',
      'HEEL — Tilt of vessel from upright (sailing) or carry list (motor).',
      'HELM — Steering position; also: control.',
      'HIGH TIDE — Maximum water level in tidal cycle.',
      'HMS — Highly Migratory Species (tuna, sharks, swordfish).',
      'HORN — Sound-producing device for safety + COLREGS.',
      'HORSE LATITUDES — Subtropical high-pressure zones; light winds.',
      'HOLD — Cargo storage area below deck.',
      'HOOK — Fish hook in many sizes + shapes.',
      'HOPI — Term for fishing zone (regional).',
      'HORN CLEAT — T-shaped cleat with two horns.',
      'HOUSE FLAG — Vessel\'s identifying flag.',
      'HULL — Boat\'s outer body.',
      'HULL SPEED — Maximum theoretical speed of displacement hull.',
      'HUNG SAIL — Sail hoisted but not yet trimmed.',
      'HUNKER — To hunch down (heavy-weather posture).'
    ]},
    { letter: 'I', entries: [
      'ICE — Frozen water; navigation hazard.',
      'IDLE SPEED — Lowest speed maintaining steerage.',
      'IFQ — Individual Fishing Quota.',
      'IIPC — International Ice Patrol Commission.',
      'IMO — International Maritime Organization.',
      'INBOARD — Inside the boat; also: engine type with internal mounting.',
      'INCOMING TIDE — Flood tide.',
      'INLET — Narrow body of water between landmasses.',
      'INSHORE — Near the coast; not offshore.',
      'INTEGRATED MULTI-TROPHIC AQUACULTURE — Combining species so waste of one feeds another.',
      'INTERTIDAL — Zone between high + low tide.',
      'INVERTEBRATE — Animal without backbone.',
      'IRRADIATION — Treatment process (rarely for seafood).',
      'ISOLATED DANGER MARK — Buoy indicating specific hazard.',
      'IUU — Illegal, Unreported, Unregulated fishing.'
    ]},
    { letter: 'J', entries: [
      'JIB — Triangular sail forward of mast.',
      'JIBE — Turning stern through wind.',
      'JIG — Weighted hook for vertical fishing.',
      'JIGGING — Vertical fishing technique.',
      'JIG BOX — Storage for jigs.',
      'JONESPORT — Maine coastal town; lobsterboat heritage.',
      'JOURNAL — Daily log.',
      'JURY MAST — Temporary mast.',
      'JURY RIG — Temporary repair or rigging.'
    ]},
    { letter: 'K', entries: [
      'KEEL — Center spine of hull.',
      'KEELSON — Internal beam strengthening the keel.',
      'KELP — Brown algae; sugar kelp + winged kelp in Maine.',
      'KELP FOREST — Underwater habitat dominated by kelp.',
      'KELP LINE — Aquaculture longline for kelp.',
      'KIM\'S RAIL — Specific railing design (regional term).',
      'KING TIDE — Highest astronomical tide of year.',
      'KITCHEN (TRAP) — First chamber of lobster trap.',
      'KNOCKDOWN — Sailboat tipping severely from gust.',
      'KNOT — (1) Unit of speed = 1 nautical mile/hour. (2) Tied loop or hitch.',
      'KNOTMETER — Speed indicator.',
      'KOBE — Term for some Japanese kelp.'
    ]},
    { letter: 'M', entries: [
      'MACK POINT — Searsport deep-water cargo terminal.',
      'MACKEREL — Atlantic mackerel (Scomber scombrus).',
      'MAGNUSON ACT — Magnuson-Stevens Fishery Conservation + Management Act.',
      'MAILSAIL — Largest sail on a sailboat.',
      'MAINSHEET — Line controlling mainsail trim.',
      'MAINSTAY — Forward stay supporting mast.',
      'MAINTENANCE — Routine vessel + gear upkeep.',
      'MAKE FAST — Tie up; secure.',
      'MAKING WAY — Vessel underway under propulsion.',
      'MARITIME — Pertaining to the sea.',
      'MARLINSPIKE — Spike for working with rope splicing.',
      'MASS MORTALITY — Sudden death of large number of organisms.',
      'MAST — Vertical spar holding sails.',
      'MATE — Crew member; also: USCG license tier.',
      'MAYDAY — International distress call.',
      'MAYDAY-RELAY — Repeating mayday for vessel that can\'t communicate.',
      'MEAN HIGH WATER — Average of all high tides.',
      'MEAN LOWER LOW WATER — Common chart datum.',
      'MERIDIAN — Longitude line.',
      'MERROIR — Place-based seafood character (terroir analog).',
      'MESHED — Caught by gillnet via gills.',
      'METAMORPHOSIS — Transformation between life stages.',
      'METHOD — Approach or technique.',
      'METRIC — Measurement system.',
      'MICROCLIMATE — Local climate distinct from regional.',
      'MIDCHANNEL — Center of channel.',
      'MIDSHIPS — Middle of vessel fore-aft.',
      'MIGRATION — Seasonal movement of species.',
      'MISHAP — Boating incident or near-miss.',
      'MIXED USE — Multiple uses of same waters.',
      'MMPA — Marine Mammal Protection Act.',
      'MOLT — Shedding shell to grow (lobster).',
      'MOORING — Permanent anchor + chain + buoy.',
      'MOORING SCOPE — Anchor line length ratio.',
      'MOUNTAIN — Underwater mountain or seamount.',
      'MULTI-SPECIES — Catching multiple species in same operation.',
      'MUSCLE — Boat\'s power.',
      'MUSSEL — Blue mussel (Mytilus edulis).',
      'MYTILUS — Mussel genus.'
    ]},
    { letter: 'N', entries: [
      'NAEFC — New England Fishery Management Council.',
      'NARROWS — Narrow channel.',
      'NAUTICAL MILE — 6076 feet; 1 minute of latitude.',
      'NAVAID — Aid to navigation.',
      'NAVIGATION — Determining + following safe course.',
      'NAVIGATION LIGHTS — Required colored lights at night.',
      'NEAP TIDE — Lower-than-average tidal range (quarter moon).',
      'NEFMC — New England Fishery Management Council.',
      'NEFSC — NOAA Northeast Fisheries Science Center.',
      'NERACOOS — Northeast regional ocean observing network.',
      'NET — Mesh for catching fish; also: bivalve mesh container.',
      'NETTING — Mesh material.',
      'NMFS — National Marine Fisheries Service (within NOAA).',
      'NOAA — National Oceanic + Atmospheric Administration.',
      'NOMENCLATURE — System of naming organisms.',
      'NON-WAKE — No-wake zone speed limit.',
      'NORTHERN HEMISPHERE — Earth half north of equator.',
      'NOTICE TO MARINERS — USCG navigation alerts.',
      'NOZZLE — Spray nozzle on washing equipment.',
      'NSSP — National Shellfish Sanitation Program.',
      'NUMBERS — Numbering system for buoys (even-red, odd-green).',
      'NURSERY — Habitat where juveniles develop; also: aquaculture nursery tanks.'
    ]},
    { letter: 'O', entries: [
      'OAR — Wooden pole + blade for rowing.',
      'OARLOCK — U-shaped fitting on gunwale holding oars.',
      'OBSERVATION — Direct seeing or measuring.',
      'OBSERVATIONS — Multiple individual observations; data.',
      'OBSERVER (FISHERIES) — Person riding boat to record catch + bycatch.',
      'OBSTRUCTION — Obstacle to navigation.',
      'OCEAN — Large saltwater body.',
      'OCEAN ACIDIFICATION — Decline of ocean pH from CO₂ absorption.',
      'OCEAN CURRENTS — Major water flows.',
      'OCEANOGRAPHY — Study of oceans.',
      'OCTOPUS — Cephalopod; not Maine commercial species.',
      'OFFSHORE — Beyond inshore waters; typically beyond state waters.',
      'OFFSHORE WIND — Strong wind blowing from shore to sea.',
      'OFFSEASON — Time when fishery is closed or off-peak.',
      'OFFLOAD — Unload cargo or catch.',
      'OIL — Fuel; lubricant.',
      'OPEN — Available for fishing.',
      'OPEN OCEAN — Pelagic waters.',
      'OPTION — Choice in management or operation.',
      'ORGANIC — From organism; chemistry term.',
      'ORGANISM — Living thing.',
      'OSHV-1 — Oyster herpes virus.',
      'OUTBOARD — Engine type mounted on transom.',
      'OUTDRIVE — Steering + propulsion unit.',
      'OUT-OF-WATER — Lifted from water.',
      'OUTPUT — Result; production.',
      'OVERFISHED — Population below sustainable level.',
      'OVERTAKING — One vessel passing another from behind.',
      'OXIDATION — Chemical reaction with oxygen.',
      'OYSTER — Eastern oyster (Crassostrea virginica).'
    ]},
    { letter: 'P', entries: [
      'PACIFIC — Pacific Ocean.',
      'PAINT — Bottom paint to prevent biofouling.',
      'PALOMAR — Strong fishing knot.',
      'PAN-PAN — Urgency call on VHF (not distress).',
      'PARASITES — Organisms living off other organisms.',
      'PARLOR (TRAP) — Second chamber of lobster trap.',
      'PASSAMAQUODDY — Wabanaki nation.',
      'PASSING CLOUD — Cuttlefish display (not Maine but in glossary tradition).',
      'PASSAGE — Trip; voyage.',
      'PASSING — Passing other vessels (overtaking).',
      'PATHOGEN — Disease-causing organism.',
      'PCB — Polychlorinated biphenyl; toxic chemical.',
      'PCR — Polymerase chain reaction.',
      'PEDOLOGY — Soil science (rarely applicable).',
      'PEDIVELIGER — Late larval stage with foot.',
      'PEDIGREE — Lineage record.',
      'PELAGIC — Open-water; mid-water.',
      'PENNANT — Short line from mooring buoy to boat.',
      'PENOBSCOT — Wabanaki nation + Maine river.',
      'PENOBSCOT BAY — Major Maine bay.',
      'PERIWINKLE — Snail; harvested for Asian markets.',
      'PESCATARIAN — Person who eats fish but not other meat.',
      'PESTS — Unwanted organisms affecting aquaculture.',
      'PFD — Personal Flotation Device.',
      'PH — Hydrogen ion concentration.',
      'PHENOTYPE — Observable trait.',
      'PHYTOPLANKTON — Microscopic photosynthetic plankton.',
      'PIER — Landing structure projecting into water.',
      'PIG — Specific tank cleaning device or seal.',
      'PILE — Vertical timber driven into bottom.',
      'PILOT — Person navigating vessel into harbor.',
      'PINTLE — Hinge pin for rudder.',
      'PISCIVORE — Fish-eating predator.',
      'PISTOL — Lobster with no claws.',
      'PLANING — Hull lifting + skimming.',
      'PLANKTON — Drifting microorganisms.',
      'PLAYBOOK — Standard procedures.',
      'PLB — Personal Locator Beacon.',
      'PLOTTER — GPS chart display.',
      'POACHING — Illegal fishing.',
      'POINT — Specific location.',
      'POLLUTION — Contamination.',
      'POLLOCK — Pollachius virens (Atlantic pollock).',
      'POLLINATION — Plant reproduction (not relevant to aquaculture).',
      'POND — Small body of water.',
      'POOL — Specific area of water.',
      'PORT (BOAT) — Left side facing forward.',
      'PORT (HARBOR) — Place for boats.',
      'PORTLAND — Maine\'s largest port.',
      'POSITION — Location.',
      'POT — Lobster trap.',
      'POUND — Lobster pound; holding facility.',
      'POWER — Vessel propulsion type (vs sail).',
      'POWER BOAT — Motor-driven vessel.',
      'PRAM — Small flat-bottomed boat.',
      'PRE-COMMERCIAL — Before reaching market.',
      'PREDATOR — Organism that eats others.',
      'PRE-FISHING — Before active fishing.',
      'PRE-MARITAL — Before mating.',
      'PRESS — Public press; communication.',
      'PRIEST — Short heavy club for dispatching fish humanely.',
      'PROBE — Water quality measurement device.',
      'PRODUCTION — Output (volumes harvested).',
      'PROHIBITED — NSSP closed classification.',
      'PROP — Propeller; also: prop bracket.',
      'PROPELLER — Rotating screw providing thrust.',
      'PROTOZOAN — Single-celled animal organism.',
      'PSP — Paralytic Shellfish Poisoning.',
      'PUMP — Bilge pump; transfer pump.'
    ]}
  ];

  var EXTENDED_GLOSSARY_LT = [
    { letter: 'L', entries: [
      'LABRADOR CURRENT — Cold southward Atlantic current.',
      'LANDFALL — Reaching land at end of voyage.',
      'LANTERN NET — Stacked disc-shaped chambers for aquaculture.',
      'LARGE FISH HOOK — Big hook for tuna or shark.',
      'LARGE VESSEL — Generally >65 ft (commercial).',
      'LARVAE — Early life stage; pelagic for many species.',
      'LASHING — Wrapping lines around objects to secure.',
      'LATERAL MARK — Buoy indicating port or starboard side of channel.',
      'LATITUDE — North-south position on Earth.',
      'LAY — Crew compensation as percentage of catch value.',
      'LAYDAYS — Allowable days for cargo loading.',
      'LAZARETTO — Stowage compartment in stern.',
      'LEAD LINE — Line with weight for measuring depth.',
      'LEE — Sheltered side away from wind.',
      'LEE SHORE — Coastline downwind of you (dangerous).',
      'LEECH — Aft edge of a sail.',
      'LEEWARD — Downwind direction.',
      'LIFE PRESERVER — PFD.',
      'LIGHT — (1) Lighthouse light. (2) Vessel running light.',
      'LIGHTHOUSE — Tall lighted aid to navigation.',
      'LIGHTING TYPE — Pattern of flash on aid to navigation.',
      'LIMBECKER — Maine slang for fishing boat.',
      'LINESMAN — Crew handling dock lines.',
      'LITTORAL ZONE — Coastal water zone.',
      'LIVE BAIT — Fresh living bait fish.',
      'LIVE WELL — Tank holding bait or catch alive.',
      'LOAD WATERLINE — Waterline when vessel is fully loaded.',
      'LOBSTER — Maine\'s premier commercial shellfish (Homarus americanus).',
      'LOBSTER BOAT — Maine working boat for lobster fishing.',
      'LOBSTER POT — Trap for lobster.',
      'LOG — Recording device or written log of voyage.',
      'LOG BOOK — Written daily journal of voyage.',
      'LONGITUDE — East-west position on Earth.',
      'LONGITUDE OF SUN — Used for celestial navigation.',
      'LONGLINE — Horizontal line with multiple baited hooks (fishing) or droppers (aquaculture).',
      'LONGSHORE CURRENT — Coastal current parallel to shore.',
      'LOOKOUT — Person watching for hazards (required per COLREGS Rule 5).',
      'LORAN — Old radio navigation system (mostly replaced by GPS).',
      'LOW TIDE — Minimum water level in tidal cycle.',
      'LUFF — Forward edge of sail; also: sail flapping when not trimmed.'
    ]}
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COMPREHENSIVE STUDY GUIDE QUESTIONS
  // ───────────────────────────────────────────────────────────
  var STUDY_GUIDE = [
    { unit: 'Unit 1: Maine Maritime History',
      essential_questions: [
        'How have Maine\'s coastal economies evolved from Wabanaki times through industrial fishing through current climate-shifted fisheries?',
        'What were the key social + economic + ecological turning points in Maine\'s commercial fishing history?',
        'How do Maine\'s working waterfront infrastructure + community traditions support modern fishing + aquaculture?',
        'What roles have Wabanaki nations played in Maine\'s marine heritage from pre-contact to present?',
        'How are climate change + sovereignty + working-waterfront preservation reshaping Maine\'s maritime future?'
      ],
      key_concepts: 'shell middens, sea-run fish migration, Wabanaki Confederacy, colonial fishing, sardine industry, lobster license tiers, COLREGS, climate-driven range shifts, working waterfront preservation.',
      assessments: 'Timeline of Maine maritime history (poster); essay on a specific era; oral presentation on chosen species.' },
    { unit: 'Unit 2: Maine Species + Ecology',
      essential_questions: [
        'What species are foundational to Maine\'s commercial fisheries + ecosystem health?',
        'How does each species\' life history shape its fisheries management?',
        'How do food web + trophic dynamics + climate interact to drive species distribution?',
        'What are the key indicator species + what do they tell us about ecosystem health?',
        'How does habitat-specific community structure shape fishery management strategies?'
      ],
      key_concepts: 'pelagic vs benthic, anadromous vs catadromous, trophic level, recruitment, biomass, range shift, climate vulnerability, foundation species, keystone species, ecosystem service.',
      assessments: 'Species profile cards; food web diagram; field journal of observation; species ID quiz.' },
    { unit: 'Unit 3: Fisheries Management + Policy',
      essential_questions: [
        'What is the legal + administrative framework for managing Maine fisheries?',
        'Who are the key stakeholders + what are their roles?',
        'How does fisheries science (stock assessments + catch limits) translate into management decisions?',
        'What role does tribal sovereignty play in Maine fisheries?',
        'How is climate change forcing changes in management approaches?'
      ],
      key_concepts: 'Magnuson-Stevens Act, NEFMC, DMR, ASMFC, NOAA, stock assessment, MSY, TAC, slot limit, v-notch, public hearing, tribal sovereignty.',
      assessments: 'Mock public hearing role-play; analyze a real recent management decision; write a stakeholder memo.' },
    { unit: 'Unit 4: Boating + Navigation',
      essential_questions: [
        'What rules govern safe vessel operation + collision avoidance?',
        'How do navigation aids (buoyage, lighthouses, charts) work?',
        'What are essential boating skills + how are they developed?',
        'How do tides + currents affect boating + fishing?',
        'What weather + safety considerations are essential for Maine boating?'
      ],
      key_concepts: 'COLREGS Rules 13-18, IALA Region B buoyage, chart symbols + symbology, dead reckoning, magnetic vs true bearings, slack tide, scope, MAYDAY/PAN-PAN procedures.',
      assessments: 'Chart-reading exercise; knot-tying practical; boating-knowledge written test; mock MAYDAY call.' },
    { unit: 'Unit 5: Sustainable Fishing + Stewardship',
      essential_questions: [
        'What is sustainable fishing + how is it measured?',
        'What are the major sustainability challenges in Maine fisheries?',
        'How do v-notch, slot limits, escape vents work as conservation tools?',
        'How does community self-governance (zone councils, harbor gangs) function?',
        'What role does fishing ethics play in fisheries management?'
      ],
      key_concepts: 'sustainability, slot limit, v-notch, escape vent, bycatch, MSY, recruitment, climate adaptation, stewardship ethic.',
      assessments: 'Stewardship pledge; design a regulation; case study analysis; podcast or video.' },
    { unit: 'Unit 6: Climate Change + Maine Fisheries',
      essential_questions: [
        'Why is the Gulf of Maine warming faster than the global ocean?',
        'What are the climate impacts on each major species?',
        'How is Maine industry adapting to climate change?',
        'What are the implications of right whale rules for the industry?',
        'What is the long-term outlook for Maine fisheries?'
      ],
      key_concepts: 'climate vulnerability, range shift, ocean acidification, HAB, right whale entanglement, ropeless gear, RAS aquaculture, climate-resilient species.',
      assessments: 'Climate impact prediction essay; species vulnerability matrix; design a climate-adaptive farm; interview a Maine fisherman.' },
    { unit: 'Unit 7: Career Pathways',
      essential_questions: [
        'What career paths exist in Maine\'s marine industries?',
        'What education + training do different paths require?',
        'How do you build relationships + reputation in Maine\'s working waterfront?',
        'How is climate change changing career opportunities?',
        'What support exists for new entrants?'
      ],
      key_concepts: 'apprentice ladder, USCG license, OUPV vs Master, charter operation, aquaculture coordinator, RAS operator, working waterfront.',
      assessments: 'Career interest exploration; informational interview; career-path proposal; mentorship plan.' },
    { unit: 'Unit 8: Maine Wabanaki + Indigenous Marine Heritage',
      essential_questions: [
        'What is the Wabanaki Confederacy?',
        'How have Wabanaki peoples managed Maine\'s marine + estuarine resources for 12,000+ years?',
        'What is the legal framework of modern tribal sovereignty in Maine?',
        'How are tribal-led aquaculture + restoration initiatives shaping Maine\'s marine future?',
        'How should non-tribal operators engage respectfully with tribal sovereignty?'
      ],
      key_concepts: 'Wabanaki Confederacy, Penobscot, Passamaquoddy, Maliseet, Mi\'kmaq, shell middens, sea-run fish, Penobscot River Restoration, tribal sovereignty, Maine Indian Implementing Act.',
      assessments: 'Research project on one Wabanaki nation; guest speaker reflection; field visit to fishway or midden; reflection on sovereignty.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX D — DETAILED FISHERIES FACTS
  // ───────────────────────────────────────────────────────────
  var FISHERIES_FACTS = [
    { fact: 'Maine has ~3,400 miles of coastline (more than California).',
      context: 'Despite a small total area, Maine\'s coast is extraordinarily long due to deeply-indented embayments + thousands of islands.',
      implication: 'Many small ports + harbors + working waterfront communities. Limited resources to maintain infrastructure across vast coastline.' },
    { fact: 'Maine lobster industry value: ~$500M annually at peak (2021-2022).',
      context: 'One of the highest-value commercial fisheries by state. Multi-generational industry.',
      implication: 'Climate threats + right whale rules are existential for many communities.' },
    { fact: 'Gulf of Maine warmed at ~4× global ocean rate during 2004-2013 (Pershing 2015).',
      context: 'One of the fastest-warming marine regions on Earth. Driven by Gulf Stream + Labrador Current dynamics.',
      implication: 'Maine fisheries are climate-leading-edge; adaptation is urgent + ongoing.' },
    { fact: 'Atlantic cod biomass in Gulf of Maine is below 10% of historical levels.',
      context: 'Once Maine\'s foundational fishery; collapsed due to overfishing + warming.',
      implication: 'Recovery unlikely under current climate. Industry has largely pivoted to lobster + other species.' },
    { fact: 'Maine has 7 lobster management zones (A-G) with limited entry + 5:1 retire-to-new ratio in many zones.',
      context: 'Limited-entry preserves resource + community structure.',
      implication: 'New entrants apprentice for years; license + zone access are valuable assets.' },
    { fact: 'North Atlantic right whale population is ~340 individuals (decreasing).',
      context: 'Critically endangered. Vertical lobster gear lines = entanglement risk.',
      implication: 'Maine industry reshaping toward ropeless or seasonal gear; major economic + cultural transition.' },
    { fact: 'Wabanaki shell middens at Damariscotta show 6,000+ years of continuous sustainable shellfish harvest.',
      context: 'Indigenous stewardship is ancient + ongoing. Tribal sovereignty is legally + ethically real.',
      implication: 'Modern fisheries management benefits from Indigenous knowledge + perspectives.' },
    { fact: 'Maine lobster license tier requires ≥1000 hours over 2 years apprenticeship.',
      context: 'Maine industry investments in next generation through structured training.',
      implication: 'Educational opportunity for youth + young adults in coastal communities.' },
    { fact: 'Maine v-notch rule: any female lobster caught carrying eggs gets a v-shape cut into tail flipper + permanently protected from harvest.',
      context: 'Industry self-enforced conservation since early 1900s; federal since 1985.',
      implication: 'Example of "tragedy of commons reversed" — community-based self-governance works.' },
    { fact: 'Penobscot River Restoration Project (2004-2016) removed 2 dams + bypassed 1, opening 1,000+ river miles for sea-run fish.',
      context: 'Multi-tribal + federal + state + NGO partnership. One of largest river restorations in North America.',
      implication: 'Sea-run fish (alewife, shad, salmon, sturgeon) populations responding positively.' },
    { fact: 'Maine has 8 major commercial fishing ports: Portland, Stonington, Boothbay, Camden/Rockland, Eastport, Bar Harbor, Jonesport, Searsport.',
      context: 'Each has distinct character + primary fisheries.',
      implication: 'Diverse industry; loss of one port wouldn\'t collapse the industry but would damage specific communities.' },
    { fact: 'Maine sardine industry once had 75+ canneries; last cannery closed 2010 (Stinson, Prospect Harbor).',
      context: 'Industry collapsed mid-20th century from automation + supply decline.',
      implication: 'Industries can disappear; maritime heritage requires active preservation.' },
    { fact: 'Damariscotta River is world-class oyster water + supports Maine\'s premium oyster industry.',
      context: 'Saline + tidally well-flushed + cold-enough estuary. Mook Sea Farms founded 1985.',
      implication: 'Place-based terroir + branding creates premium markets.' },
    { fact: 'Maine had 0 commercial aquaculture in 1970; ~$100M industry by 2024.',
      context: 'Industry expanded with state lease policy + research investment + market development.',
      implication: 'Growing industry; opportunity for new entrants + community development.' },
    { fact: 'Maine eel fishery: ~425 license holders + among highest per-pound prices in US ($2,000-$3,000+/lb in good years).',
      context: 'Limited-entry; elver run March-June; premium Asian market.',
      implication: 'Strict enforcement against poaching; tribal sovereignty disputes; example of high-value low-volume fishery.' },
    { fact: 'Maine has ~60+ historic lighthouses; many still active aids to navigation.',
      context: 'Portland Head Light (1791) was first US-built lighthouse.',
      implication: 'Both working navigation infrastructure + cultural heritage.' },
    { fact: 'Maine Working Waterfront Access Protection Program uses conservation easements to preserve commercial fishing + aquaculture infrastructure.',
      context: 'Counters coastal gentrification + maintains industry viability.',
      implication: 'Active preservation effort; advocate + participate.' },
    { fact: 'Maine boater education required for anyone born after Jan 1, 1989 operating motorized vessel.',
      context: 'NASBLA-approved courses online + in person.',
      implication: 'Knowledge-based safety standard; check certification.' },
    { fact: 'Atlantic salmon in Maine wild populations are critically endangered (federal ESA listing 2009).',
      context: 'Restricted to Penobscot, Sheepscot, Narraguagus, Pleasant + a few other rivers.',
      implication: 'Strict catch-and-release; conservation hatcheries; ongoing restoration.' },
    { fact: 'Bigelow Lab (East Boothbay) is among the world\'s leading ocean biogeochemistry research institutions.',
      context: 'Maine\'s research ecosystem includes Bigelow, GMRI, UMaine, Cornell Cooperative Extension.',
      implication: 'Strong science base supports Maine industry adaptation.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX A — SPECIES PROFILE TEMPLATES (full taxonomy)
  // ───────────────────────────────────────────────────────────
  // Each species has a complete profile including kingdom-phylum-class-order-family,
  // common names in multiple Maine languages where applicable,
  // identification features, habitat, behavior, diet, predators,
  // reproductive strategy, life span, conservation status, regulation summary,
  // fishery history, climate vulnerability, + practical guidance.
  var SPECIES_PROFILES_FULL = [
    { commonName: 'Atlantic Cod',
      sci: 'Gadus morhua',
      taxonomy: 'Kingdom Animalia → Phylum Chordata → Class Actinopterygii → Order Gadiformes → Family Gadidae',
      wabanakiName: 'Records of Wabanaki names for cod exist; tribal language specialists can provide accurate transliterations.',
      idDetail: 'Three dorsal fins (distinctive). Single barbel on chin. Pale curved lateral line over pectoral. Brown-spotted overall in older fish; greenish in younger. Adult to 50+ inches historically; modern Maine catches typically 20-40 inches.',
      habitat: 'Cold rocky reefs + ledges. Historic Gulf of Maine spawning grounds: Bigelow Bight, Cashes Ledge, Stellwagen Bank, Jeffreys Ledge.',
      behavior: 'Solitary or in loose aggregations. Spawn in winter-spring at cold-water aggregations. Active feeders at all hours.',
      diet: 'Herring, capelin, sand lance, squid, crab, small flatfish. Top-tier piscivore.',
      predators: 'Larger sharks (historically), seals (increasingly), humans.',
      reproduction: 'Spawn winter-spring. Female produces 3-9 million eggs per spawn. Pelagic eggs + larvae 3-6 months before juveniles settle to bottom. Mature at 2-5 years (smaller now from fishing pressure).',
      lifespan: 'Historically 25+ years; currently <10 years typical due to fishing.',
      conservationStatus: 'Severely depleted in Gulf of Maine. Federal stock rebuilding plan in effect.',
      regulations: 'Min size 22"; recreational 1/day; strict commercial quotas; closed areas + seasons.',
      fisheryHistory: 'Foundational New England fishery from 1600s. Grand Banks fishery peaked 1980s + collapsed 1992. Gulf of Maine never recovered.',
      climateVulnerability: 'HIGH. Cold-water specialist; warming Gulf prevents larval development.',
      practical: 'Catch-and-release. Buy haddock or pollock as substitute. Support climate mitigation.',
      cite: 'Pershing 2015 Science; NEFSC stock assessments' },
    { commonName: 'American Lobster',
      sci: 'Homarus americanus',
      taxonomy: 'Kingdom Animalia → Phylum Arthropoda → Class Malacostraca → Order Decapoda → Family Nephropidae',
      wabanakiName: 'Wabanaki nations have multiple lobster traditions; tribal language specialists can provide accurate names.',
      idDetail: 'Two unequal claws (large crusher + smaller ripper). Dark green-brown overall; occasional blue/red/calico genetic variants. Adults to 20+ pounds; commercial catch typically 1-3 pounds.',
      habitat: 'Rocky bottom, kelp beds, mud burrows. Maine inshore + offshore. Move seasonally — inshore summer, deeper winter.',
      behavior: 'Mostly solitary but somewhat social. Use shelter + claws to defend territory. Pheromone communication.',
      diet: 'Omnivore: crabs, mussels, fish, urchins, kelp.',
      predators: 'Cod (historically), seals, octopus, large fish, humans.',
      reproduction: 'Female molts + then mates; sperm stored for later fertilization. Female carries eggs externally on swimmerets 9-12 months. Single female can carry 5,000-100,000 eggs. Pelagic larvae 3-5 weeks before settling.',
      lifespan: 'Up to 100+ years documented.',
      conservationStatus: 'Healthy Maine population; uncertain long-term with climate warming.',
      regulations: 'Min 3.25" carapace; max 5"; v-notch protection for life of egg-bearing females; escape vents required.',
      fisheryHistory: 'Initially considered "poor people\'s food" — fed to prisoners. Modern industry built on 1900-1933 conservation pillars. Maine peak ~100M+ lbs annually 2010s.',
      climateVulnerability: 'CURRENTLY POSITIVE (climate winner so far). LONG-TERM VULNERABLE (range shifting north).',
      practical: 'V-notch any egg-bearing female. Release oversized + sub-legal + v-notched. Respect zone council rules.',
      cite: 'Maine DMR; Maine Lobstermen\'s Association' },
    { commonName: 'Striped Bass',
      sci: 'Morone saxatilis',
      taxonomy: 'Kingdom Animalia → Phylum Chordata → Class Actinopterygii → Order Perciformes → Family Moronidae',
      wabanakiName: 'Multiple Wabanaki cultural traditions involve striped bass; tribal specialists can provide cultural depth.',
      idDetail: 'Silvery sides with 7-8 dark horizontal stripes (sometimes broken). Pale lateral line. Distinct dorsal fins separate by gap. Large mouth.',
      habitat: 'Anadromous: adults in saltwater, spawn in freshwater rivers. Migrate Mid-Atlantic to Maine seasonally.',
      behavior: 'Schooling. Voracious predator on baitfish. Move with bait + tide. Major sport target.',
      diet: 'Menhaden, alewife, herring, mackerel, eel; juveniles also crustaceans.',
      predators: 'Sharks, marine mammals (limited).',
      reproduction: 'Mature at 4-8 years (~24-28"). Spawn in spring (April-June) in rivers. Single large female produces millions of eggs. Eggs pelagic in flowing river.',
      lifespan: '30+ years; slow growth + late maturity.',
      conservationStatus: 'Recovering after 1985 moratorium; recent (2010s-20s) decline triggered new restrictions.',
      regulations: 'Maine slot 28-31"; 1/day; circle hook required for bait; closed areas.',
      fisheryHistory: 'Major recreational + commercial fishery. Multi-state moratorium 1985-1990; population rebuilt. Mid-2010s decline triggered tighter rules.',
      climateVulnerability: 'MODERATE. Range may shift; spawning rivers vulnerable to drought + flow alterations.',
      practical: 'Catch-and-release for everything outside slot. Use circle hooks. Photograph + release big breeders.',
      cite: 'ASMFC striped bass 2024' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX B — DETAILED CLIMATE CHANGE NARRATIVE
  // ───────────────────────────────────────────────────────────
  var CLIMATE_NARRATIVE = [
    { era: 'Pre-1970s — Pre-Climate-Awareness Baseline',
      content: 'Gulf of Maine waters in the early-mid 20th century were colder + more stable. Cod stocks were large despite heavy fishing pressure; lobster populations were stable; sea-run fish runs were declining due to dams but climate was not the driver. Maine fishermen worked from family knowledge passed across generations.' },
    { era: '1970s-1980s — Industrial Pressure',
      content: 'Industrial-scale offshore fishing (foreign trawlers + factory ships) intensified pressure on US Atlantic stocks. Magnuson-Stevens Act (1976) created the 200-nm EEZ, gradually pushing out foreign fleets. New England cod + haddock + flounder remained heavily harvested + began showing signs of stress.' },
    { era: '1990-1995 — Grand Banks Cod Collapse',
      content: 'Canada\'s 1992 moratorium on northern cod (after decades of warning signs ignored). Hundreds of millions of pounds removed from the fishery overnight. Maine + Massachusetts cod also depleted but with delayed management response. NEFMC tightened regulations.' },
    { era: '1990s-2000s — Initial Climate Signals',
      content: 'Gulf of Maine warming detectable but not yet dramatic. Some species ranges (lobster northward, etc.) shifting. Acidification science emerging. Striped bass moratorium recovery period — successful management proved possible.' },
    { era: '2010s — Climate Warming Accelerates',
      content: 'Pershing et al. 2015 publishes "Slow adaptation in the face of rapid warming" in Science. Documents Gulf of Maine warming at ~4× global ocean rate during 2004-2013. Links to failed cod recovery. Wake-up call for fisheries management + industry.' },
    { era: '2015-2020 — Species Range Shifts Become Reality',
      content: 'Black sea bass + summer flounder + butterfish establish reliably in Maine waters. Lobster landings reach historic highs (climate winner). Right whale population continues decline; entanglement crisis emerges. NOAA implements 10-knot vessel speed zones.' },
    { era: '2020-2025 — Climate-Aware Management',
      content: 'Fisheries management increasingly climate-informed. New stock assessments incorporate climate models. Aquaculture industry expands into climate-resilient species (kelp, oyster). Right whale rules force lobster industry adaptation. Bigelow + GMRI lead research. UMaine + community college aquaculture programs expand.' },
    { era: '2025-2030 — Looking Forward',
      content: 'Climate-adaptive industry emerging. Multiple-species portfolios + diversification. Selective breeding for resilient strains. Working waterfront preservation programs. Climate-positive food branding for bivalves + kelp. Land-based RAS facilities (Whole Oceans) opening. Tribal-led aquaculture initiatives growing.' },
    { era: '2030-2050 — Long-Term Outlook',
      content: 'Maine fisheries continue transition. Some traditional fisheries may further decline (cod, soft-shell clam without management); others will adapt or thrive (lobster shift, oyster industry growth, kelp expansion). Climate adaptation is permanent feature of industry. Maine\'s research + working waterfront + tradition advantages position it well — but require continued investment + adaptation.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX C — GLOSSARY OF NAUTICAL TERMS BY LETTER
  // ───────────────────────────────────────────────────────────
  // A reference glossary organized by letter for easy navigation
  var GLOSSARY_A_TO_Z = {
    A: [
      'ABEAM — At right angle to vessel\'s centerline (perpendicular to fore-aft direction)',
      'ABAFT — Toward the stern',
      'ABOARD — On the boat',
      'ABOVE — Above the deck or higher level',
      'AFT — Toward the stern, at or near the back',
      'AGROUND — When the boat\'s hull is touching bottom (often stuck)',
      'AHEAD — Forward of the boat',
      'ALEE — On the leeward (downwind) side',
      'ALONGSIDE — Next to (e.g., docked alongside a wharf)',
      'AMIDSHIPS — In the middle of the boat fore-aft',
      'ANCHOR — Device for holding boat in position via the bottom',
      'ANCHOR RODE — The line + chain connecting anchor to boat',
      'ANCHORAGE — A designated area for anchoring',
      'ASTERN — Behind the boat',
      'ATHWART — Across the boat (perpendicular to centerline)',
      'AWASH — When water is just at deck level'
    ],
    B: [
      'BACK A SAIL — Sail set so wind hits the wrong side',
      'BACKING (WIND) — Wind shifting counter-clockwise (typically indicating approaching warm front)',
      'BAIT — Live or cut fish/squid used to attract sport fish',
      'BANDED — Lobster with bands on claws (required for shipping)',
      'BARNACLE — Crustacean that attaches to hard surfaces; biofouling',
      'BAROMETER — Measures atmospheric pressure (key weather indicator)',
      'BARREL — Trap component or barrel-shaped object',
      'BAY — Body of water bordering coast',
      'BEACH — Coastal sandy/rocky shore',
      'BEAM — Width of boat at widest point',
      'BEAM REACH — Sailing with wind perpendicular to boat direction',
      'BEARING — Direction from one point to another in degrees',
      'BEAUFORT SCALE — Wind speed estimation by observable effects',
      'BERTH — A boat\'s designated parking spot (slip) or sleeping area onboard',
      'BIGHT — Coastal embayment',
      'BILGE — Lowest interior part of hull (where water accumulates)',
      'BIODEGRADABLE — Material that breaks down naturally',
      'BLOCK — A pulley',
      'BOAT — Generic for small to medium vessel',
      'BOATHOOK — Pole with hook for retrieving items + grabbing dock lines',
      'BOATSWAIN — Senior deck crew member (pronounced "bosun")',
      'BOLLARD — Vertical post on dock for tying up larger vessels',
      'BOOM — Horizontal spar attached to foot of sail',
      'BOW — Front of the boat',
      'BOWLINE — Knot forming non-slipping loop',
      'BOWSPRIT — Spar projecting forward from bow',
      'BREAK BULK — Cargo handled piece by piece (vs containerized)',
      'BREAKERS — Waves breaking on shore or shoal',
      'BREAKWATER — Offshore wall absorbing wave energy',
      'BRIDGE — Operational area of large ship (also: structure crossing water)',
      'BROADSIDE — Side of the boat exposed to wind/sea',
      'BRINY — Salty (used for ocean or fresh shellfish)',
      'BULKHEAD — Vertical interior wall in boat',
      'BUOY — Floating navigation aid',
      'BUOYAGE — System of buoys defining navigable waters',
      'BUOYANCY — Tendency to float (Archimedes principle)',
      'BYCATCH — Non-target species caught incidentally',
      'BYSSAL THREADS — Mussel\'s anchoring proteins'
    ],
    C: [
      'CAN — Cylindrical green buoy (lateral mark)',
      'CAPACITY — Maximum people + load a boat can safely carry',
      'CAPSIZE — Boat tipping over',
      'CARDINAL MARK — Buoy indicating safe quadrant (N, E, S, W)',
      'CARRYING CAPACITY — Maximum sustainable load for vessel or ecosystem',
      'CAULK — Sealant for hulls or fittings',
      'CHAFE — Rubbing wear on lines or hulls',
      'CHART — Map of waters with depths + navaids + hazards',
      'CHARTER — Boat hired for trips (e.g., sport-fishing charter)',
      'CHOCK — Hardware fitting for guiding line direction',
      'CLEAT — T-shaped fitting for securing lines',
      'CLEAT HITCH — Standard knot for securing line to cleat',
      'CLINKER-BUILT — Hull with overlapping planks',
      'CLOSE-HAULED — Sailing as close to wind as possible',
      'CLOVE HITCH — Quick attachment knot to a post',
      'COAST — Land near sea',
      'COAST GUARD — USCG, federal authority for maritime safety + enforcement',
      'COLD-WATER SURVIVAL — Knowledge for surviving immersion in cold water',
      'COLREGS — International Collision Regulations',
      'COMPASS — Magnetic-bearing instrument',
      'COMPANIONWAY — Stairway from deck to below',
      'COMMERCIAL — Profit-motivated activity (vs recreational)',
      'CONDUIT — Channel; also enclosed conduit for wiring',
      'CONTROL — Steering or directing boat',
      'COOK — Person who prepares food onboard (or process of cooking)',
      'COOLER — Insulated container for keeping items cold',
      'COURSE — Direction boat is steered',
      'COVE — Small protected coastal embayment',
      'CRADLE — Frame supporting boat ashore',
      'CRAFT — Boat or vessel',
      'CREW — Person or persons operating boat',
      'CROSSING — Two vessels approaching at angle',
      'CRUISER — Boat for extended trips',
      'CRUISING SPEED — Economical speed for distance travel',
      'CUDDY — Small enclosed area in boat',
      'CULL — Lobster with one claw missing',
      'CURRENT — Water motion (e.g., tidal, river, oceanographic)',
      'CUTTER — Small Coast Guard vessel; also a sailing rig type'
    ],
    D: [
      'DAVIT — Small crane for hoisting',
      'DEAD AHEAD — Directly forward',
      'DEAD ASTERN — Directly behind',
      'DEAD RECKONING — Estimating position from course + speed + time',
      'DECK — Floor of a boat',
      'DEPTH — Water depth, vertical measurement',
      'DEVIATION — Compass error due to boat\'s metal/electronics',
      'DIESEL — Compression-ignition engine + fuel',
      'DINGHY — Small auxiliary boat',
      'DISPLACEMENT — Weight of water displaced by floating boat',
      'DISTRESS — Emergency situation requiring help',
      'DMR — Maine Department of Marine Resources',
      'DOCK — Platform where boats tie up',
      'DOCKING — Process of tying up at a dock',
      'DOG — Latch securing a hatch',
      'DORY — Flat-bottomed wooden small boat',
      'DOWN — Toward the lower side or end',
      'DOWNDRAFT — Wind blowing downward',
      'DOWNWIND — In direction wind is blowing',
      'DRAFT — Vertical distance from waterline to hull bottom',
      'DRAGGER — Trawler boat using bottom drag nets',
      'DREDGE — Bottom-dragged scoop for harvesting (also: to dig channel)',
      'DRIFT — Speed or distance of water current',
      'DROGUE — Drag device for stabilizing boat',
      'DRY ROT — Wood deterioration from fungal damage',
      'DSC — Digital Selective Calling (VHF feature)'
    ]
    // Continue for E-Z when content adds value
  };

  // ───────────────────────────────────────────────────────────
  // DATA: COMPLETE FISHERIES TEXTBOOK CHAPTERS
  // ───────────────────────────────────────────────────────────
  var TEXTBOOK_CHAPTERS = [
    { chapter: 'Chapter 1: The Gulf of Maine Ecosystem',
      sections: [
        'The Gulf of Maine is a semi-enclosed sea bordered by Cape Cod (south), Nova Scotia (east), + Maine coast (west). Roughly 93,000 sq mi. Depths from a few feet to 1200+ ft in basins.',
        'Geography drives biology: cold Labrador Current meets warmer Gulf Stream at the southern boundary. Tidal mixing keeps waters productive. Underwater ledges + basins create habitat diversity.',
        'Historic productivity: cod + lobster + herring + mackerel + scallop fisheries thrived. Native Wabanaki peoples managed sea-run fish + shellfish for 12,000+ years.',
        'Current climate state: Gulf has warmed at ~4× global ocean rate (Pershing 2015). Species ranges shifting; cold-water cod failing to recover; warm-water sea bass + summer flounder reliably present.',
        'Stakeholders: Maine + Massachusetts + New Hampshire commercial + recreational fisheries, Wabanaki nations, NOAA + DMR + ASMFC managers, coastal communities, recreational boaters, research institutions (GMRI, Bigelow, UMaine).',
        'Major fisheries: lobster (~$500M annual at peak), groundfish (cod + haddock + pollock combined), striper sport, tuna, scallop, alewife, smelt, sardine (historic), shrimp (closed since 2014).',
        'Climate adaptation is the defining challenge today. Industry, science, + policy are coordinated on response. Maine has institutional advantages — strong research base, working waterfront infrastructure, multi-generation industry expertise.'
      ] },
    { chapter: 'Chapter 2: Wabanaki Heritage + Fishing Cultural History',
      sections: [
        'The Wabanaki Confederacy — Penobscot, Passamaquoddy, Maliseet, Mi\'kmaq — has managed Maine\'s coastal + estuarine waters for ~12,000+ years.',
        'Damariscotta + Whaleback oyster middens (6,000+ years old) are among the largest archaeological shellfish-shell mounds on the Atlantic coast. They document sustained sustainable harvest.',
        'Sea-run fish (alewife, shad, salmon, sturgeon, smelt) brought ocean nutrients inland via spawning runs. Wabanaki peoples organized seasonal migrations around these runs.',
        'European contact + colonial era brought disease, land theft, + industrial-scale resource extraction. Maine\'s wild oyster reefs collapsed by 1800; cod stocks declined 19th-20th c; salmon populations devastated by dams.',
        'Modern tribal sovereignty: 1980 Maine Indian Claims Settlement Act + Maine Implementing Act define ongoing tribal rights. Continuing legal + cultural conversations.',
        'Penobscot River Restoration Project (2004-2016): multi-tribal-led river restoration. Two dams removed, one bypassed. 1000+ river miles opened for sea-run fish. One of the largest US river restorations.',
        'Damariscotta Mills alewife fishway: community-led restoration of historic Wabanaki + colonial-era alewife run. Annual May celebrations.',
        'Tribal-led aquaculture: Penobscot + Passamaquoddy + Maliseet exploring tribally-owned aquaculture operations. Future of Maine fisheries is more tribally-led than current.',
        'Educational implication (Maine LD 291 Indian Education): tribal nations are LIVING COMMUNITIES, not historical artifacts. Centering tribal voices in curriculum is essential.'
      ] },
    { chapter: 'Chapter 3: Species + Habitats',
      sections: [
        'Maine waters host hundreds of marine + estuarine species. Commercial + recreational fisheries target a dozen key species.',
        'Pelagic (open-water schooling) species: Atlantic mackerel, Atlantic herring (forage), bluefin tuna (top predator).',
        'Migratory inshore: striped bass, bluefish, alewife (anadromous), shad (declining), American eel (catadromous).',
        'Groundfish (bottom-dwelling): cod (depleted), haddock (recovered), pollock, hake (multiple species), monkfish (recovered).',
        'Flatfish: winter flounder, yellowtail flounder, fluke (summer flounder; range-shifting north).',
        'Inshore: striped bass, tautog, sea bass (climate-shift indicator), cunner, sculpin.',
        'Cold-deep specialists: cusk, redfish (long-lived), wolffish (endangered), Atlantic salmon (endangered).',
        'Shellfish: American lobster (foundational), blue mussel, eastern oyster, sea scallop, soft-shell clam, hard-shell clam.',
        'Habitats: salt marsh + estuary (nursery), sandy beach (surf), eelgrass meadow (nursery), rocky inshore (lobster + cunner), sandy/muddy flats (flounder + clams), kelp forest (cold-water), mid-water pelagic, bottom ledge, soft-bottom basin, deep cold water, continental slope.',
        'Each habitat hosts specific community. Climate-shifting habitats = community changes. Eelgrass decline + kelp forest decline = ecosystem signals.'
      ] },
    { chapter: 'Chapter 4: Fisheries Management',
      sections: [
        'Modern US fisheries management built on Magnuson-Stevens Act (1976, amended 2006). Created 200-nm Exclusive Economic Zone (EEZ) + 8 Regional Fishery Management Councils (NEFMC for our region).',
        'Maine + New England fisheries managed at multiple levels: federal (NEFMC + NOAA) for offshore + multi-state stocks; state (Maine DMR) for state waters; ASMFC for migratory Atlantic-coast species; tribal authorities for tribal-rights waters.',
        'Management tools: minimum size limits, slot limits, daily bag limits, closed seasons, closed areas, gear restrictions, total allowable catch (TAC), individual fishing quotas (IFQ), v-notch protection, escape vents.',
        'Stock assessments: NEFSC conducts surveys, modeling. Quotas set based on biological reference points (e.g., MSY = maximum sustainable yield).',
        'Enforcement: USCG offshore, NOAA OLE, Marine Patrol (Maine state), local + tribal enforcement.',
        'COLREGS + safety regulations: parallel framework for boating safety. USCG primary federal authority.',
        'Tribal sovereignty considerations: traditional + treaty-based rights interact with state + federal management. Ongoing legal evolution.',
        'Climate-driven challenges: stocks shifting, management lagging biology. New approaches needed.',
        'Public participation: comment periods, advisory committees, fishermen + scientist + community input. Voice matters.',
        'Conservation success stories: striper rebuild (1985-1995), haddock recovery, lobster v-notch program, redfish recovery. Coordinated multi-stakeholder action works.'
      ] },
    { chapter: 'Chapter 5: Boating Skills + Seamanship',
      sections: [
        'Safe + effective boating combines knowledge, skills, + judgement. Maine waters are unforgiving of carelessness — cold water + storms + rocky coast.',
        'Foundational rules: COLREGS (international rules of the road), state + federal regs (registration, safety equipment, BUI), local rules (no-wake zones, harbor-specific).',
        'PFD ON BEFORE you fall in. Cold-water survival 1-10-1 rule: 1 minute cold-shock; 10 minutes useful muscle; 1 hour to hypothermia.',
        'Navigation: chart + compass + GPS + plotting. Fix using two bearings. Dead reckoning when GPS fails. Magnetic vs true bearings.',
        'Buoyage: IALA Region B (red right returning). Lateral marks + cardinal marks + special marks. Shape + color redundancy.',
        'COLREGS Rules 13-18 = daily-use core. Overtaking, head-on, crossing, give-way vs stand-on, hierarchy of vessels.',
        'Anchoring + docking + departing: planning + slow speeds + watching wind/current/traffic.',
        'Weather + tides: NOAA Marine Forecast, NERACOOS buoys, local observation. Plan + adjust.',
        'Heavy weather tactics: reduce speed, head into seas, deploy drogue/sea anchor if needed. Don\'t panic.',
        'Communication: VHF Ch 16 monitoring, MAYDAY + PAN-PAN format, hailing protocol. Practice radio checks.',
        'Maintenance: pre-trip checks, weekly + monthly + annual schedule. Carry tools + spares.',
        'Take a USCG-approved boater education course (NASBLA-certified). Practice with experienced operator. Earn certifications.'
      ] },
    { chapter: 'Chapter 6: Sustainable Fishing Practices',
      sections: [
        'Sustainable fishing is fishing that doesn\'t deplete the resource — supports continued productivity for future generations.',
        'Catch-and-release: use circle hooks, minimize handling, photo + release big breeders. Mortality rates vary by species + gear; gentle release works.',
        'Slot limits: protect both juveniles (below slot) + large breeders (above slot). Striper slot 28-31".',
        'Size limits: based on size at maturity + reproductive output. Cod min 22", haddock 18", striper 28".',
        'V-notch: lifetime protection for any female caught carrying eggs. Maine\'s distinctive lobster conservation tool.',
        'Escape vents: required in lobster traps to release sub-legal individuals.',
        'Closed seasons + areas: protect spawning + nursery habitats.',
        'Gear selectivity: hook + line + circle hook = most selective; commercial gear (trawl, gillnet, longline) has higher bycatch.',
        'Right whale + endangered species considerations: NOAA closures, ropeless gear requirements.',
        'Forage fish: don\'t over-target menhaden, alewife, herring, mackerel — they feed the rest of the ecosystem.',
        'Stewardship ethic: leave the resource better than you found it. Pass the tradition.'
      ] },
    { chapter: 'Chapter 7: Lobster Industry — A Maine Institution',
      sections: [
        'Maine lobster is a multi-billion-dollar industry + cultural institution. ~6,500 active licenses + 800+ traps per Class I-III license.',
        'License tier ladder: Student (under 18, 10 traps), Apprentice (≥1000 hours over 2 years), Class I (commercial 800 traps), Class II (800 traps + sternman), Class III (800 traps + 2 sternmen).',
        'Lobster zones (7 zones A-G): each governed by zone council that sets local rules. Limited-entry; many zones have multi-year waitlists. 5:1 retirement:new license ratio common.',
        'Gear: traps with kitchen (entry) + parlor (holding), escape vents, identifying tags, color codes. Buoys mark surface position.',
        'Conservation pillars: minimum size 3.25" / max 5" carapace; v-notch lifetime protection; escape vents; gear marking.',
        'Boats: from open skiffs (recreational) to 32-42 ft semi-displacement lobsterboats (commercial). Diesel inboard 250-650 hp typical. Custom-built Jonesport-Beals style.',
        'Crew: solo + sternman + occasionally double-sternman. Sternmen on % of catch (lay).',
        'Markets: live to wholesale, restaurant, direct-to-consumer. Maine + Boston wholesale most. Wholesale prices ~$4-$10/lb whole lobster live.',
        'Climate impacts: warming Gulf shifting populations; right whale entanglement; gear changes; long-term range shift potentially north.',
        'Future: Maine industry is at peak harvest. Climate adaptation, gear innovation, market diversification all underway. Continued multi-generation tradition possible if adaptive.'
      ] },
    { chapter: 'Chapter 8: Charter + Recreational Fishing',
      sections: [
        'Maine\'s charter + recreational fishing supports thousands of small businesses + millions of recreational hours.',
        'Charter operators: USCG OUPV ("six-pack" 6-passenger license) or Master license. Required medical + drug testing. Operations Boothbay, Camden, Bar Harbor, Portland, others.',
        'Target species: striper, bluefish, mackerel, cod (limited), tuna (offshore), shark (offshore).',
        'Seasons: typical May-October main season; some offshore species year-round (with weather).',
        'Gear: rod-and-reel light to heavy. Outfit varies by target.',
        'Regulations: same DMR + ASMFC + NOAA rules as commercial; charter clients\' bag limits.',
        'Insurance + liability: substantial. License + bond + commercial insurance required.',
        'Marketing: word-of-mouth, online booking, return customers. Develop relationships across summers + years.',
        'Maine recreational license: required for residents + non-residents. Inland + saltwater different.',
        'Volunteer activity: many tournament + Maine Sportsman cooperative + creel surveys provide data for management.',
        'Stewardship ethics: charter captains often advocate for slot limits + circle hooks + catch-and-release. Build clientele.'
      ] },
    { chapter: 'Chapter 9: Marine Safety + Emergency Procedures',
      sections: [
        'Safety equipment: PFDs (one per person, USCG-approved, wear them!), VHF marine radio (Ch 16 monitoring), fire extinguisher, visual distress signals, sound signal, navigation lights, anchor, first-aid kit, EPIRB or PLB.',
        'Cold-water survival 1-10-1: 1 minute to control breathing, 10 minutes useful muscle function, 1 hour to hypothermia. Heat Escape Lessening Posture (HELP) for solo; huddle for multiple.',
        'MAYDAY procedure: triple MAYDAY (×3) + triple identify your vessel (×3) + position (lat/lon or bearing) + nature + people aboard + vessel description. Standing by Ch 16.',
        'Man Overboard: shout + throw flotation + maintain visual + circle back from downwind + recover.',
        'Fog operations: COLREGS Rule 6 safe speed + sound signal every 2 min + monitor radar + maintain heightened lookout.',
        'Storm response: monitor forecast + return early if forecast deteriorates. Reduce speed; head into seas at moderate angle.',
        'Right-whale + marine mammal compliance: 100+ yd minimum distance, slow approach, monitor NOAA alerts.',
        'Cold-water survival training: highly recommended. Maine Maritime Academy + USCG Auxiliary offer.',
        'Float plan filing: tell someone ashore where you\'re going + expected return. Critical for search-and-rescue.',
        'Familiarize crew with safety procedures before each trip. Don\'t assume they know.',
        'Emergency response is rehearsed + automatic. Don\'t make it up on the day.'
      ] },
    { chapter: 'Chapter 10: Career Pathways',
      sections: [
        'Maine\'s marine industries offer diverse career pathways at all education + experience levels.',
        'No degree required: sternman, deckhand, hand-harvester, processor employee. On-the-job training. Pay scales with experience + responsibility.',
        'License-based: charter captain (USCG OUPV/Master), lobsterman (DMR Class I-III via apprenticeship). Significant investment in training + equipment.',
        'College + certificate paths: aquaculture technician (UMaine + community college), boatyard skilled trades, fisheries science, marine engineering.',
        'Graduate + professional paths: marine biologist, fisheries scientist, climate scientist, NOAA + DMR official, fisheries lawyer, policy specialist, marine ecologist.',
        'Aquaculture careers (cross-reference AquacultureLab): farmer-operator, hatchery technician, marine extension agent, DMR aquaculture coordinator, processor.',
        'Adjacent careers: marine science researcher (Bigelow, GMRI, UMaine), naval architecture (Bath Iron Works), Coast Guard career, marine tourism (whale watching, charter), boatyard skilled trades.',
        'Salaries: highly variable. Sternman $200-$500/day (lay-based, seasonal). Lobsterman $50K-$300K+ gross (variable, capital-intensive). Charter captain $400-$1500/trip + winter off. Marine biologist $45K-$110K+ depending on degree + agency.',
        'Maine has institutional support: Maine Sea Grant, UMaine extension, Maine Aquaculture Association, Maine Lobstermen\'s Association, Maine Charterboat Association. All have training + networking.',
        'Climate adaptation creates new careers: aquaculture in emerging species, RAS technician, climate-vulnerability assessment, ecosystem restoration.',
        'Educational pipeline: include marine + fisheries content in K-12. Field experiences. Apprenticeship + mentorship. Maine\'s working waterfront depends on next generation.'
      ] }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COMPREHENSIVE FISHERIES ESSAYS
  // ───────────────────────────────────────────────────────────
  var FISHERIES_ESSAYS = [
    { title: 'The Gulf of Maine — A Special Place',
      content: 'The Gulf of Maine is one of the most distinctive marine ecosystems on Earth. Bordered by Cape Cod (south), Nova Scotia (east), and Maine coast (west), it covers ~93,000 sq mi. Its semi-enclosed geography + intersection of the Labrador Current + Gulf Stream creates unusual oceanography. Historically cold + productive — supporting cod, lobster, herring, mackerel, scallop fisheries — the Gulf has now warmed at ~4× global rate over recent decades. Climate adaptation is the defining challenge of Maine fisheries today. Gulf of Maine Research Institute (GMRI), Bigelow Lab, UMaine + multiple federal agencies are coordinated on understanding + responding to change.',
      practical: 'Educators: emphasize specificity + complexity. Gulf of Maine is not generic ocean — its dynamics shape every fishery.' },
    { title: 'Fishing as Cultural Practice',
      content: 'Maine fishing is more than economy. It\'s a multi-generational identity, a community structure, a relationship with place. Lobstering communities like Stonington + Vinalhaven have multi-generation harbor gangs that decide who can fish where, who can apprentice, what the local rules are. The Maine lobsterman\'s license is not just a permit — it\'s membership in a community + tradition. Wabanaki nations have ongoing relationships with sea-run fish like alewife + salmon that go back 12,000+ years. Even charter captains + sport fishermen build relationships across summers + decades. Understanding Maine fishing requires understanding this cultural dimension. Books like "The Lobster Gangs of Maine" (Acheson) + "The Secret Life of Lobsters" (Corson) explore this.',
      practical: 'For teachers: include cultural + community + tribal dimensions when teaching Maine fisheries.' },
    { title: 'The Cod Question — A Climate Cautionary Tale',
      content: 'Atlantic cod once supported the largest fishery in human history. The Grand Banks were essentially "paved with cod" — early colonists wrote of dropping a basket into the water + pulling it up full. Industrial-scale fishing collapsed the Grand Banks in 1992. Gulf of Maine cod also depleted. Despite drastically reduced fishing pressure, Gulf of Maine cod have not recovered. Why? Climate warming. Pershing et al. 2015 in Science showed that cod larvae fail to develop above ~12°C — which the warming Gulf now regularly exceeds inshore. The cod question is now a climate cautionary tale: even strict management can\'t recover a population whose conditions no longer support it. Maine cod may shift north into Canadian waters or fade entirely. Adaptation might mean shifting to species that can thrive in warmer Maine — black sea bass, summer flounder, scup — which we\'re already seeing.',
      practical: 'Pedagogical opportunity: cod is both a fisheries-management lesson + a climate-science lesson. Use it as case study.' },
    { title: 'V-Notch as Self-Governance',
      content: 'Maine\'s v-notch lobster rule is unique in commercial fisheries: lobstermen self-enforce a conservation tool that costs each individual but benefits the resource long-term. When a lobsterman pulls a female with eggs, he cuts a v-shape into her tail flipper + releases her — knowing she\'ll be permanently protected from harvest. The notch persists through molts; v-notched females are visible to all lobstermen who might encounter them later. The rule started informally among lobstermen + became federal law in 1985. It\'s a remarkable example of "tragedy of the commons" reversed — community-based conservation where everyone benefits from individual restraint. Lobster zone councils have similar self-governance structures. This is what Nobel laureate Elinor Ostrom called "common-pool resource management" — humans CAN sustainably manage shared resources when conditions are right.',
      practical: 'Teach this as civics + economics + biology. It\'s a positive case study of community self-governance.' },
    { title: 'COLREGS — The Oldest Code',
      content: 'COLREGS (the international rules of the road for vessels) is one of the oldest still-applicable international codes. Versions date to 1840s + earlier in British admiralty. Modern COLREGS (1972 convention) governs vessels worldwide. The rules are remarkably elegant — covering visibility, lights, sounds, day-shapes, hierarchy of vessels, give-way + stand-on relationships. Rules 13-18 (overtaking, head-on, crossing, give-way, stand-on, hierarchy) are the daily-use core. The genius of COLREGS is that it works for two strangers approaching each other — both can determine the correct action from the rules without communication. Every USCG-licensed operator + every commercial captain studies these rules. They prevent collisions. Knowing them is mariner literacy.',
      practical: 'Memorize the core rules. Practice through scenarios. Take USCG OUPV training if you want to operate commercially.' },
    { title: 'Lighthouses — Form + Function',
      content: 'Maine lighthouses are not just picturesque. They\'re working navigation aids that have saved countless lives. Each has distinctive design features: color (sometimes red + white stripes; sometimes white only); light characteristics (flash pattern, range, color); fog signal (foghorn or bell). The light identifier on charts ("Fl R 4s 18ft 6M") encodes everything: red flash every 4 seconds, 18 ft above water, visible from 6 nm. Lighthouse-keepers historically lived on remote rocks tending lights manually. Today most are automated. Many are now museums or vacation rentals. But they remain working aids — when you see a light at night, you can identify it via its flash pattern + cross-reference your chart for position.',
      practical: 'Learn 5-10 Maine lighthouses by their identifiers + locations. Useful navigation knowledge + cultural literacy.' },
    { title: 'Knots Through History',
      content: 'Mariners have been tying knots for as long as boats have existed. Modern marine knots draw on centuries of practical evolution. The bowline ("king of knots") was used by Phoenician sailors. The clove hitch + cleat hitch are documented from Roman maritime trade. The fisherman\'s bend specifically evolved for securing anchors that experience cyclic motion. Every modern marine knot has a specific purpose; tying the wrong knot can be life-threatening. The Ashley Book of Knots (1944) is the standard reference with ~3854 knots described. Mariners typically know 6-12 essential knots; commercial captains know 20+. Teaching knots is teaching practical engineering + reliability.',
      practical: 'Practice 6 essential knots until muscle memory. Bowline, clove hitch, cleat hitch, figure-eight, sheet bend, fisherman\'s bend.' },
    { title: 'Weather Forecasting — Then + Now',
      content: 'Weather forecasting transformed marine safety. Before NOAA Marine Forecasts + buoy networks + satellite data, mariners used barometers, observation, + local knowledge. A falling barometer + thickening clouds were storm warnings; a fast wind shift meant approaching front. Today, mariners have apps with NOAA forecasts, satellite imagery, radar, NERACOOS buoy data, multi-day prediction models. But local knowledge + observation still matter — forecast resolution is coarser than individual harbor microclimates. A good mariner combines technology + observation. Mainers like to say "Just because the forecast says no, doesn\'t mean no. Just because it says yes, doesn\'t mean yes." Read the forecast; look out the window; observe; decide. NOAA Marine Forecasts: weather.gov/marine. Phone apps: Windy, Sailflow, Buoyweather.',
      practical: 'Build daily weather observation habit. Compare forecast to actual outcome. Develop intuition over seasons.' },
    { title: 'Tides + Currents — Daily Rhythm',
      content: 'Maine tides drive everything from fishing windows to shellfish access to boating safety. Semidiurnal tides mean 2 highs + 2 lows per day. Mean range: ~9 ft in Casco Bay; up to 25 ft in Eastport / Bay of Fundy. Current speeds: typically 0.5-1.5 kt in main harbors; up to 8+ kt at Reversing Falls. The "rule of twelfths" estimates water level between high + low. Slack tide (~30 min around peak + trough) is the brief window when current stops + reverses — often the best fishing window because predators move into shallow water + bait holds. Tide tables (NOAA tidesandcurrents.noaa.gov) are essential planning tools. Phone apps (DeepZoom, Tide Charts Free) cache for offline. Tidal currents lag the heights by ~3 hours. Plan trips around tide.',
      practical: 'Print weekly tide table. Plan harbor entrances + shallow channel passages around stages. Learn rule of twelfths.' },
    { title: 'Buoyage Systems — Why They Work',
      content: 'The IALA buoyage system is a triumph of international standardization. North + South America, Japan, Korea, Philippines use IALA Region B (red right returning). Europe + the rest of Asia + Africa use IALA Region A (red left returning). Within each region, the system is universal. Red conical "nuns" with even numbers on one side; green cylindrical "cans" with odd numbers on the other. Cardinal marks (black + yellow with topmark indicators) tell you which side has safe water. Special marks (safe water, isolated danger, etc.) round out the vocabulary. The genius: shape + color redundancy means colorblind mariners can navigate by shape alone. The buoyage system enables a stranger to a port to navigate safely with chart in hand. It\'s teamwork between local maintainers + international standards.',
      practical: 'Master Region B conventions. Pass red right when returning (entering harbor). Reverse when leaving. Shape backs up color.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: EXTENDED SPECIES PROFILES (more depth)
  // ───────────────────────────────────────────────────────────
  var EXTENDED_SPECIES = [
    { name: 'Striped Bass — Migration + Life History',
      content: 'Striped bass are the iconic anadromous sport fish of the Atlantic coast. Adults migrate annually: Chesapeake Bay winter; Maine + Massachusetts summer. Most striped bass in Maine waters are migrants from Chesapeake + Hudson + Delaware spawning grounds. A small population spawns in Maine\'s major rivers (Penobscot, Kennebec). Striper return to natal rivers to spawn — homing behavior similar to salmon. Females can produce millions of eggs per spawn. Multi-year stripers (10+ year-olds) produce most of the population\'s eggs — protecting these "cows" is essential. Slot limits + circle hook requirements + reduced bag limits all serve this goal. The 1985 multi-state striper moratorium remains a watershed example of successful coordinated fisheries recovery.',
      practical: 'Time Maine fishing to peak runs (May-November). Use circle hooks. Respect slot limits. Photograph + release big breeders.' },
    { name: 'Lobster — Molting + Reproduction',
      content: 'American lobsters grow only by molting. They shed the entire shell + then form a larger one underneath. Just-molted ("shedder") lobsters are vulnerable for days. Hard-shell lobsters survive transport better + command higher market prices. Females typically molt + then mate immediately, with sperm stored for later fertilization. After fertilization, eggs are carried externally on swimmerets for 9-12 months ("berried"). When ready to hatch, lobster larvae are released as planktonic forms. Larvae drift 3-5 weeks before settling to bottom + becoming benthic juveniles. Multi-year growth: legal size (3.25" carapace) takes 6-8 years. Maximum size (5") protects older females + larger reproductive output. V-notching = lifetime protection for any female caught carrying eggs.',
      practical: 'Hard-shell lobsters at fresh-fish markets are typical. Shedder season (mid-summer) yields lower-priced lobster sold locally. V-notched females must be released for life.' },
    { name: 'Cod — Why Has Recovery Failed?',
      content: 'Atlantic cod in the Gulf of Maine collapsed in the 1990s + has not recovered despite reduced fishing pressure. Multiple factors compound: (1) Initial overfishing past biological recovery rates. (2) Warming Gulf of Maine waters — cod larvae survive poorly above ~12°C. (3) Changed predator + prey dynamics — fewer cod allow forage species + competitors to thrive. (4) Selection for earlier maturation under fishing pressure means smaller fish + fewer eggs per spawn. The Pershing et al. 2015 paper documents the warming-recovery linkage. Cod will likely not recover to historical biomass in current climate; range shift to colder northern waters is one scenario.',
      practical: 'Buy haddock or pollock as cod substitutes. Catch-and-release cod responsibly. Support climate mitigation as foundation of fisheries recovery.' },
    { name: 'Atlantic Salmon — Endangered Status',
      content: 'Wild Atlantic salmon in the Gulf of Maine are critically endangered (federal ESA listing 2009). Maine\'s remaining populations are restricted to the Penobscot, Sheepscot, Narraguagus, Pleasant + a few other rivers. Causes of decline: industrial fishing in the 19th-early 20th centuries; dams blocking access to spawning habitat; pollution; competition with hatchery + farmed-escape salmon; warming ocean conditions. Conservation hatchery programs (e.g., Penobscot Indian Nation hatchery) release juveniles. Penobscot Project (2004-2016) removed two dams + bypassed a third, opening 1000+ river miles. Recovery is multi-decade if achievable at all.',
      practical: 'NEVER target Atlantic salmon. Always release if caught. Support ongoing restoration efforts.' },
    { name: 'Bluefin Tuna — Charter + Subsistence',
      content: 'Atlantic bluefin tuna are massive (up to 1500+ lb) predators of the open ocean. Maine + Massachusetts waters are summer feeding grounds for adults. The fishery is highly regulated: HMS (Highly Migratory Species) federal permits required; size + bag limits strict; harpoon + rod-and-reel only (no purse seine). A single school-size bluefin can fetch $500-$2000; trophy-size (>700 lb) regularly $10K+; record sales exceed $100K. Stock has been rebuilding since 2000s but remains below historical levels. ICCAT (International Commission for the Conservation of Atlantic Tunas) coordinates quotas across North Atlantic.',
      practical: 'Charter trips out of Maine summer offshore for bluefin are increasingly popular. Federal permits required. Tag-and-release for some sizes; harvest within slot.' },
    { name: 'American Eel — Sargasso Sea Spawning',
      content: 'American eel is one of the most mysterious marine creatures. Adults migrate hundreds + thousands of miles to the Sargasso Sea (off Bermuda) to spawn — a single spawning ground for the entire Atlantic population. Larvae drift back on currents over months-years; transform into translucent "glass eels" (elvers) as they enter freshwater; develop into yellow + then silver eels as they mature in rivers + estuaries for 8-20 years; then make the return journey to spawn + die. Maine\'s elver fishery (~425 license-holders) is among the most valuable per-pound in the world ($2,000-$3,000/lb in good years). Strict quotas + enforcement. Wild eel populations are declining globally — many factors including dams, habitat loss, climate, parasitic infections.',
      practical: 'Maine elver fishery is restricted-entry. Watch out for poaching (federal felony). Eels are a delicacy in Asian cuisine; eat sparingly.' },
    { name: 'Striped Bass vs Sea Bass — Don\'t Confuse',
      content: 'Maine waters now host both species reliably. Striped bass = anadromous, large (>30"+), classic East Coast sport fish, slot 28-31". Black sea bass = bottom-dwelling structure-loving species, smaller (8-15" typical), climate-range-shifted northward, minimum 15". Easy to tell apart visually: striped bass has horizontal stripes + large mouth; black sea bass has steely color + distinctive forked tail with extension. Different regulations apply. Climate change is making both species more reliable in Maine waters.',
      practical: 'Know which you have before keeping. Different regulations apply.' },
    { name: 'Atlantic Mackerel — Pelagic Schooler',
      content: 'Mackerel are highly schooling pelagic fish. Massive shoals can stretch miles. In Maine waters June-September. Distinct iridescent blue-green back with dark wavy "bars" — easily identifiable. Voracious feeders on small fish + plankton. Important forage for striper, tuna, bluefish, seabirds, whales. Best baits = small-fish imitations (sand-eel patterns, small spoons). Mackerel make excellent bait for larger species too. Stock has been depleted in recent decades; quotas tightened.',
      practical: 'Catch mackerel for striper bait or smoked-fish preparations. Sustainable when caught + used sensibly.' },
    { name: 'Atlantic Herring — Foundation Forage Species',
      content: 'Atlantic herring (the official + premier "forage fish" of the North Atlantic) support an enormous ecosystem of predators: striper, cod, tuna, seabirds, whales. Industrial-scale herring fishery harvests for human consumption (sardines historically) + reduction (fishmeal + oil). Maine\'s historic sardine industry was based on herring. Stock has been under management pressure due to ecological role. Ecosystem-aware management increasingly prioritizes forage-fish stability over reduction-harvest revenue.',
      practical: 'Consumer choice: buy herring caught with low-impact gear. Recognize ecosystem role.' },
    { name: 'Sea Run Brook Trout — Conservation Concern',
      content: 'Brook trout in Maine occur in two forms: resident freshwater stream populations + "sea-run" or "salters" that migrate to estuarine + nearshore saltwater for part of life cycle. Sea-run brook trout are increasingly rare due to habitat fragmentation, warming, + introduction of non-native species. Maine still has a few sea-run brook trout populations on the southern + midcoast streams. Highly prized + protected.',
      practical: 'Catch-and-release recommended. Protect spawning streams. Support stream restoration.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: BOATING SKILLS DEEP DIVE
  // ───────────────────────────────────────────────────────────
  var BOATING_SKILLS = [
    { skill: 'Pre-Voyage Planning',
      content: 'Every safe trip starts with planning. Steps: (1) Check NOAA marine forecast + tide tables. (2) File a float plan with a person ashore (where you\'re going, expected return, vessel description, people aboard, emergency contacts). (3) Check vessel + safety equipment per pre-trip checklist. (4) Identify alternate harbors if weather changes. (5) Verify VHF + GPS working. (6) Brief crew on safety procedures + roles.',
      mistake: 'Skipping any of these steps. "We\'ll be fine" is the most expensive 4 words in boating.' },
    { skill: 'Departing from the Dock',
      content: 'Untying + leaving the dock requires planning. Steps: (1) Check wind + current direction. (2) Plan exit path. (3) Untie spring lines first (controls fore-aft motion). (4) Untie stern line. (5) Untie bow line. (6) Use power gently to back away or pivot. (7) Once free + pointed in safe direction, throttle up to leave area.',
      mistake: 'Untying all lines at once; trying to muscle against wind/current; departing into traffic without watching for others.' },
    { skill: 'Operating in Crowded Harbor',
      content: 'Harbors are 3D traffic environments. Rules: (1) Idle speed only — no wake. (2) Watch for other vessels + tenders + swimmers. (3) Use sound signals when overtaking or passing. (4) Yield to commercial traffic when feasible. (5) Maintain proper VHF monitoring on Ch 16 + harbor channel. (6) Anticipate others\' movements; act early to prevent collision.',
      mistake: 'Speeding through harbor; not monitoring VHF; not communicating with commercial vessels.' },
    { skill: 'Operating in Open Water',
      content: 'Open water requires different awareness. Rules: (1) Monitor weather + sea state constantly. (2) Maintain situational awareness using radar + GPS + visual lookout. (3) File float plan + check in periodically. (4) Plan return route + alternate harbors. (5) Carry adequate fuel + safety gear. (6) Adjust speed for sea conditions + visibility.',
      mistake: 'Pushing through deteriorating conditions; insufficient fuel reserves; not monitoring weather.' },
    { skill: 'Docking Approach',
      content: 'Approach the dock slowly + at an angle. Steps: (1) Determine wind + current direction. (2) Plan approach into wind/current if possible (provides natural braking). (3) Approach at idle speed. (4) Pivot to align with dock at last moment. (5) Use spring lines to control final position. (6) Bow + stern lines secure.',
      mistake: 'Approaching too fast; not planning for wind; ramming the dock; uncontrolled fender placement.' },
    { skill: 'Anchoring',
      content: 'Anchoring is more art than science. Steps: (1) Survey bottom + chart for suitable holding ground (sand/mud > rock/grass). (2) Lower anchor (NEVER throw — tangles + loses anchor). (3) Pay out 5:1 to 7:1 scope of rode. (4) Let wind/current pull boat back to dig anchor in. (5) Check hold against shore landmarks for 5-10 minutes. (6) Set anchor light at night.',
      mistake: 'Throwing anchor; insufficient scope; trying to anchor in wrong bottom.' },
    { skill: 'Heavy-Weather Tactics',
      content: 'When weather deteriorates: (1) Reduce speed to safe value for conditions. (2) Crew below if waves are breaking on deck. (3) Wear PFDs + harnesses. (4) Head into seas at moderate angle (avoid pounding + broaching). (5) Deploy drogue or sea anchor if needed. (6) Maintain radio contact with shore. (7) Don\'t panic — slow movements + clear decisions.',
      mistake: 'Trying to maintain cruise speed; running broadside to seas; not communicating.' },
    { skill: 'Returning + Approaching Harbor',
      content: 'Return navigation: (1) Plan route well before approaching harbor mouth. (2) Watch for shoreline landmarks + buoys for accurate position. (3) Reduce speed approaching harbor mouth. (4) Watch for outbound traffic. (5) Plan docking approach.',
      mistake: 'Last-minute decisions; speeding into harbor; not watching for traffic.' },
    { skill: 'Securing for Storm',
      content: 'When storm forecast: (1) Add anchor scope (10:1 for storms). (2) Use storm anchors instead of regular. (3) Strip canvas + lines that could be damaged. (4) Empty bilge. (5) Check VHF + EPIRB. (6) Brief crew. (7) If possible, move to protected harbor.',
      mistake: 'Underestimating storm; leaving prep too late.' },
    { skill: 'End-of-Day Routines',
      content: 'After mooring: (1) Secure all lines. (2) Cover + clean as needed. (3) Drain bilge. (4) Flush outboard with fresh water. (5) Lock cabin. (6) Log voyage + observations.',
      mistake: 'Skipping the routine. Cumulative damage from skipped tasks.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MAINE BOATING REGULATIONS
  // ───────────────────────────────────────────────────────────
  var BOATING_REGS = [
    { topic: 'Boater Education',
      summary: 'Maine requires boater-education certification for anyone born after Jan 1, 1989 operating a motorized vessel.',
      details: 'NASBLA-approved courses available online + in-person.' },
    { topic: 'Vessel Registration',
      summary: 'Powered vessels must be registered with Maine. Annual fees scaled to vessel length.',
      details: 'Application + fee online or at town offices.' },
    { topic: 'Documentation',
      summary: 'Larger vessels (>5 net tons) may be USCG-documented in addition to state registration.',
      details: 'Federal documentation is alternative or supplement to state registration.' },
    { topic: 'Required Safety Equipment',
      summary: 'PFDs (one per person), fire extinguisher, sound device, visual distress signals (>16 ft on coastal water), navigation lights.',
      details: 'Specific requirements depend on vessel type + length. USCG provides checklist.' },
    { topic: 'Operating Under Influence',
      summary: 'BAC limit + DUI/BUI penalties apply on water as on land.',
      details: 'Boating Under Influence = serious crime + license consequences.' },
    { topic: 'Operating Speed',
      summary: 'Many Maine harbors are no-wake or 5-mph zones.',
      details: 'Local + state rules. Monitor signage + chart notes.' },
    { topic: 'Right of Way',
      summary: 'COLREGS apply. Sail > power. Both give way to fishing + commercial.',
      details: 'See COLREGS tab.' },
    { topic: 'Pumpout + Discharge',
      summary: 'Many Maine waters are No-Discharge Zones for marine sanitation.',
      details: 'Pump out at certified facilities only.' },
    { topic: 'Reporting Accidents',
      summary: 'Accidents involving injury or property damage must be reported to USCG + Maine state authorities.',
      details: 'Failure to report can be criminal.' },
    { topic: 'Whale Watching Speed Rules',
      summary: 'NOAA Right Whale 10-knot speed restriction zones apply seasonally in Maine waters.',
      details: 'Real-time monitoring; comply or face citations.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: HISTORICAL VESSELS + MAINE BOATBUILDING HERITAGE
  // ───────────────────────────────────────────────────────────
  var HISTORICAL_VESSELS = [
    { name: 'Friendship Sloop',
      origin: 'Friendship, Maine (1880s-1910s)',
      role: 'Versatile lobsterman + day-sailer; ancestor of modern lobster boat',
      design: 'Single-masted gaff-rigged sailboat with deep keel. Designed by Wilbur Morse + others.',
      historical: 'Defined Maine lobstering before motorization. Still built today as classic yacht.',
      lessons: 'Maine boatbuilding tradition has always been local + adaptive.' },
    { name: 'Maine Schooner',
      origin: 'Maine coast (1850s-1920s)',
      role: 'Coasting trade — granite, lime, fish to NYC + Boston',
      design: 'Two-, three-, or four-masted gaff-rigged sailing cargo vessel',
      historical: 'Once thousands plied Maine coast. Most replaced by steam/diesel cargo.',
      lessons: 'Surviving schooners now operate as windjammer cruise fleet (Camden + Rockland).' },
    { name: 'Lobster Smack',
      origin: 'Maine coast (1860s-1920s)',
      role: 'Live-lobster transport to NYC + Boston markets',
      design: 'Sailing/early-motor vessel with wet well (live tank) to keep lobsters alive in transit',
      historical: 'Enabled Maine lobster industry to reach urban markets fresh.',
      lessons: 'Cold chain solved by wet well + ice; modern equivalent is refrigerated truck.' },
    { name: 'Jonesport-Beals Style Lobster Boat',
      origin: 'Jonesport-Beals Island (1950s-present)',
      role: 'Modern lobster boat',
      design: 'Semi-displacement hull with high stern, wide beam, diesel inboard. "Holland 32" + variants are iconic.',
      historical: 'Birthed the famous lobster-boat racing tradition.',
      lessons: 'Hull design continuously refined. Maine\'s wooden boatbuilders are world-class.' },
    { name: 'Maine Pinky',
      origin: 'Maine coast (1800s)',
      role: 'Mackerel + cod fishing',
      design: 'Two-masted square-sterned sailboat. Smaller than schooner.',
      historical: 'Common before motorized boats. Mostly extinct now; replicas exist.',
      lessons: 'Specialization matched the fishery + region.' },
    { name: 'Hampton Boat',
      origin: 'Hampton, NH / Maine border',
      role: 'Lobster + dragger; small commercial work',
      design: 'Specific traditional design; small wooden craft.',
      historical: 'Local design that influenced larger boats.',
      lessons: 'Local naval architecture has been a Maine tradition.' },
    { name: 'Bath Iron Works Tradition',
      origin: 'Bath, Maine (1884-present)',
      role: 'Navy destroyer + warship construction',
      design: 'Modern steel hull construction.',
      historical: 'Continuing tradition; major Maine employer.',
      lessons: 'Maine\'s shipbuilding goes beyond commercial fishing.' },
    { name: 'Penobscot River Steamboat Era',
      origin: 'Penobscot River, late 1800s',
      role: 'Passenger + cargo transport upriver',
      design: 'Paddlewheel + screw steamboats.',
      historical: 'Long since replaced by road + truck.',
      lessons: 'Maine\'s rivers were highways long before roads were paved.' },
    { name: 'Coast Guard Cutters',
      origin: 'US Coast Guard',
      role: 'Search-and-rescue + law enforcement + ice breaking',
      design: 'Specialized federal vessels.',
      historical: 'Maine has multiple USCG stations (Boothbay, Rockland, Southwest Harbor, Eastport).',
      lessons: 'Federal presence on Maine coast — both regulator + rescuer.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: SPECIES BY HABITAT (depth + bottom type)
  // ───────────────────────────────────────────────────────────
  var SPECIES_BY_HABITAT = [
    { habitat: 'Salt Marsh + Estuary (0-5 ft, intertidal)',
      species: ['Killifish (mummichog)', 'Silverside', 'Stickleback', 'Eel (juvenile)', 'Striped bass (juvenile)', 'Alewife (passing through)'],
      ecology: 'Nursery habitat for many species. Critical for sea-run fish life cycles.' },
    { habitat: 'Sandy Beach + Surf Zone (0-30 ft)',
      species: ['Striped bass', 'Bluefish', 'Sand lance (forage)', 'Skate', 'Sand crab'],
      ecology: 'Mobile predators chase forage fish. Surf casting + wading territory.' },
    { habitat: 'Eelgrass Meadow (5-15 ft)',
      species: ['Bay scallop (juvenile)', 'Pipefish', 'Sea horse', 'Tomcod', 'Stickleback', 'Bay anchovy'],
      ecology: 'Productive nursery for many species. Eelgrass decline = ecosystem loss.' },
    { habitat: 'Rocky Inshore (5-30 ft)',
      species: ['Cunner', 'Pollock (juvenile)', 'Tautog', 'Sculpin', 'Lobster', 'Sea urchin', 'Tide pool species'],
      ecology: 'Structure-rich habitat. High species diversity.' },
    { habitat: 'Sandy/Muddy Flats (5-30 ft)',
      species: ['Winter flounder', 'Skate', 'Whelk', 'Soft-shell clam', 'Sand worm'],
      ecology: 'Bottom-oriented species; soft-bottom invertebrates.' },
    { habitat: 'Kelp Forest (5-50 ft cold)',
      species: ['Pollock (juvenile)', 'Cunner', 'Sea urchin', 'Sea star', 'Crab'],
      ecology: 'Cold-water ecosystem. Maine\'s kelp forests have declined.' },
    { habitat: 'Mid-Water Open Bay (15-100 ft)',
      species: ['Mackerel', 'Pollock (adult)', 'Striped bass (adult)', 'Bluefish', 'Atlantic herring'],
      ecology: 'Schooling pelagics. Migratory.' },
    { habitat: 'Bottom Ledge (30-150 ft)',
      species: ['Cod', 'Haddock', 'Pollock', 'Cusk', 'Hake (white + red)', 'Lobster'],
      ecology: 'Maine\'s historic groundfish habitat. Stocks variously stressed.' },
    { habitat: 'Soft Bottom Basin (50-300 ft)',
      species: ['Monkfish', 'Hake', 'Redfish', 'Skate', 'Crab'],
      ecology: 'Soft-bottom predators + scavengers.' },
    { habitat: 'Deep Cold Water (200-600 ft)',
      species: ['Cusk', 'Atlantic wolffish (protected)', 'Redfish', 'Deep-water sharks', 'Tilefish'],
      ecology: 'Cold-water specialists. Slow growth + late maturity = vulnerable.' },
    { habitat: 'Open Ocean Pelagic (0-1000 ft)',
      species: ['Bluefin tuna', 'Mahi-mahi (warm-water)', 'Blue marlin (rare)', 'Pelagic sharks', 'Sea turtles'],
      ecology: 'Highly migratory species. Federal HMS jurisdiction.' },
    { habitat: 'Continental Slope (300-3000 ft)',
      species: ['Tilefish', 'Halibut', 'Deep-water sharks', 'Cold-water corals'],
      ecology: 'Specialized deep-water community. Long-line + commercial dragger.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: FISHING REGULATIONS DEEP-DIVE
  // ───────────────────────────────────────────────────────────
  var REGS_DEEP = [
    { rule: 'Minimum Size Limits',
      purpose: 'Allow fish to mature + spawn before harvest.',
      example: 'Cod minimum 22"; Striped bass slot 28-31"; Lobster min 3.25" / max 5" carapace.',
      science: 'Based on size at sexual maturity + reproductive output. Big fish + small fish both critical to population.',
      enforcement: 'Marine Patrol roadside + dockside inspections.' },
    { rule: 'Slot Limits',
      purpose: 'Protect both juveniles (below slot) + mature breeders (above slot).',
      example: 'Maine striped bass: 28-31" slot. Keep 1 per day within slot; release everything else.',
      science: 'Slot limits leave a "harvest window" while protecting recruitment + spawning potential.',
      enforcement: 'Marine Patrol + voluntary compliance.' },
    { rule: 'Bag Limits',
      purpose: 'Total daily harvest cap.',
      example: 'Cod recreational 1/day; striped bass 1/day; lobster non-commercial 5 traps + harvest from those.',
      science: 'Spread harvest pressure; prevent depletion.',
      enforcement: 'Marine Patrol + creel surveys.' },
    { rule: 'Closed Seasons',
      purpose: 'Protect spawning + vulnerable stages.',
      example: 'Cod spawning closures; striper short closures around spawning.',
      science: 'Match closures to species\' biological needs.',
      enforcement: 'Marine Patrol; federal closures NOAA.' },
    { rule: 'Closed Areas',
      purpose: 'Protect specific habitats or stocks.',
      example: 'Cashes Ledge restrictions; right-whale closures; eelgrass protection zones.',
      science: 'Spatial protection of critical habitats + species.',
      enforcement: 'NOAA + USCG + DMR.' },
    { rule: 'Gear Restrictions',
      purpose: 'Reduce bycatch + protect non-target species + habitat.',
      example: 'Escape vent in lobster traps; ropeless gear in right-whale zones; mesh size in gillnets.',
      science: 'Reduces ecological damage of fishing.',
      enforcement: 'Marine Patrol + federal observers.' },
    { rule: 'V-notch Lobsters',
      purpose: 'Lifetime protection for egg-bearing females.',
      example: 'V-notched females may not be kept; release immediately.',
      science: 'Conserves spawning biomass across multi-year cycles.',
      enforcement: 'Marine Patrol; self-enforced by industry.' },
    { rule: 'Annual Catch Limits',
      purpose: 'Total population-level harvest cap.',
      example: 'Cod quotas; striper Atlantic-coast quotas; lobster zones.',
      science: 'Fisheries-management Standard Operating Procedure.',
      enforcement: 'NOAA + ASMFC.' },
    { rule: 'Tribal Subsistence + Cultural Rights',
      purpose: 'Honor treaty obligations + sovereignty.',
      example: 'Wabanaki nations have ongoing subsistence + ceremonial harvest rights.',
      science: 'Legal + ethical principle.',
      enforcement: 'Tribal + state + federal coordination.' },
    { rule: 'Reporting Requirements',
      purpose: 'Data for stock assessment + management.',
      example: 'Commercial logbooks; recreational creel surveys; volunteer angler reporting.',
      science: 'Better data = better management.',
      enforcement: 'Self-reporting + observer programs.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: SPECIES IDENTIFICATION KEY (dichotomous)
  // ───────────────────────────────────────────────────────────
  var ID_KEY = [
    { step: 1,
      question: 'Does the fish have two unequal claws (crusher + ripper)?',
      yes: 'AMERICAN LOBSTER (Homarus americanus). Continue to step 1a for stage details.',
      no: 'Continue to step 2.' },
    { step: 2,
      question: 'Is the fish flat (both eyes on one side of body)?',
      yes: 'FLATFISH. Continue to step 2a for species ID (winter vs yellowtail flounder vs other).',
      no: 'Continue to step 3.' },
    { step: 3,
      question: 'Does the fish have a single chin barbel + three dorsal fins?',
      yes: 'COD or HADDOCK. Continue to step 3a for cod vs haddock distinction.',
      no: 'Continue to step 4.' },
    { step: 4,
      question: 'Does the fish have dark horizontal stripes on silver sides?',
      yes: 'STRIPED BASS (Morone saxatilis).',
      no: 'Continue to step 5.' },
    { step: 5,
      question: 'Does the fish have iridescent blue-green back with dark wavy bars + sleek torpedo body?',
      yes: 'ATLANTIC MACKEREL (Scomber scombrus).',
      no: 'Continue to step 6.' },
    { step: 6,
      question: 'Is the fish snake-like with no scales or single dorsal?',
      yes: 'AMERICAN EEL (Anguilla rostrata) OR ATLANTIC WOLFFISH. Examine head + jaw for distinction.',
      no: 'Continue to step 7.' },
    { step: 7,
      question: 'Does the fish have prominent dorsal + cheek spines + huge head?',
      yes: 'LONGHORN SCULPIN or related sculpin.',
      no: 'Continue to step 8.' },
    { step: 8,
      question: 'Is the fish small (5-10") + silver with violet sheen + visible teeth?',
      yes: 'RAINBOW SMELT (Osmerus mordax). Distinguish from herring by mouth teeth.',
      no: 'Continue to step 9.' },
    { step: 9,
      question: 'Is the fish silver with single black spot behind gill + forked tail?',
      yes: 'ALEWIFE or BLUEBACK HERRING (Alosa pseudoharengus + A. aestivalis).',
      no: 'Continue to step 10.' },
    { step: 10,
      question: 'Does the fish have green/brown mottled body + thick lips + strong teeth?',
      yes: 'TAUTOG (Tautoga onitis).',
      no: 'Continue to step 11.' },
    { step: 11,
      question: 'Is the fish massive (>50 lb) with torpedo body + dark blue back?',
      yes: 'BLUEFIN TUNA (Thunnus thynnus).',
      no: 'Continue to step 12.' },
    { step: 12,
      question: 'Does the fish have bright orange-red body + bulging eyes + spiny dorsal?',
      yes: 'ACADIAN REDFISH (Sebastes fasciatus). Slow-growing; handle with care.',
      no: 'Consult species guide for further identification.' },
    { step: '1a',
      question: 'Lobster stage check:',
      yes: 'Female with eggs visible on swimmerets? → V-notch + release. V-notched female? → Always release. Carapace 3.25" or larger? → keeper if under 5" max. Sub-legal (<3.25")? → Release.' },
    { step: '2a',
      question: 'Flatfish species check:',
      yes: 'Right-eyed (eyes on right side when lying flat) with mottled brown? → WINTER FLOUNDER. Right-eyed with bright yellow tail? → YELLOWTAIL FLOUNDER. Left-eyed? → Different species (uncommon in Maine).' },
    { step: '3a',
      question: 'Cod vs Haddock:',
      yes: 'Pale lateral line curving up over pectoral, no shoulder spot? → COD. Dark lateral line + "thumbprint" black spot above pectoral? → HADDOCK.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: FISHING TECHNIQUE GUIDES (deep dive per method)
  // ───────────────────────────────────────────────────────────
  var TECHNIQUE_GUIDES = [
    { method: 'Jigging for Cod + Pollock',
      gear: '6-20 oz diamond or Norwegian jig; 50-80 lb braid; 30-40 lb mono leader; medium-heavy rod 6\'-7\' with strong backbone.',
      technique: 'Drop to bottom; reel up 2-3 cranks (off-bottom). Pump rod sharply with 1-2 second pause. Pause is when fish strikes — keep tension. Maintain 90° rod angle when hooked up.',
      best_conditions: 'Slack tide; cod in 80-200 ft; pollock at any depth where bait holds.',
      tips: 'Use teaser flies above the jig for double hookups. Vary jigging cadence if not getting bites — sometimes slow, sometimes fast.',
      common_mistakes: 'Letting line go slack (lose bites + tangles); over-stiff rod (no feel); jigging too fast (anti-feeding).',
      cite: 'Standard Maine technique; Maine Sportsman magazine archive' },
    { method: 'Trolling for Striped Bass',
      gear: 'Conventional reels with 30-50 lb braid; tube + worm rig (rubber tube + sea worm); umbrella rigs with multiple soft-plastic baits; 3-7 knot trolling speed.',
      technique: 'Run lures 50-100 ft behind boat. Multiple lines spread by outriggers + planer boards. Pause + check baits hourly. Plot productive depths + areas.',
      best_conditions: 'Tide change; bait visible; striper in pursuit mode (water 60-72°F).',
      tips: 'Speed up if no bites — sometimes triggers reaction strikes. Slow down for finicky fish.',
      common_mistakes: 'Tangle from improper line spread; running over fish; too-fast trolling speed.',
      cite: 'On The Water magazine archive; striper fishing tradition' },
    { method: 'Drifting + Live-Lining',
      gear: 'Light-medium rods; live menhaden or eels on a 5-10 oz weight; circle hook 7/0-9/0; 30-50 lb leader.',
      technique: 'Hook bait through nose or lips. Drop to mid-water. Let boat drift through productive area. Strike when line goes slack or bait gets nervous.',
      best_conditions: 'Slack tide; cooperative bait; structure-related fish.',
      tips: 'Circle hooks set themselves; do NOT yank. Let fish run with bait before reeling.',
      common_mistakes: 'Setting circle hook like a J hook (often pulls hook); too-heavy weight crushes bait.',
      cite: 'Modern striper technique' },
    { method: 'Fly Fishing for Striped Bass',
      gear: '9-10 weight saltwater fly rod; saltwater reel with 200-300 yd backing; intermediate or sinking line; Clouser Minnow or Lefty\'s Deceiver flies in olive/white or chartreuse.',
      technique: 'Cast 60-80 ft; let fly sink to depth; retrieve with short strips. Vary strip cadence to match bait. Strike with strip-set (not rod-set).',
      best_conditions: 'Bait at surface; calm water; tide-driven feeding.',
      tips: 'Match the size + color of present bait. Sand-eel imitation (skinny + silver) for spring.',
      common_mistakes: 'Trout-style rod-set (tears mouth on fish); too-stiff rod (no presentation); wrong fly size.',
      cite: 'Lefty Kreh + Bob Clouser tradition' },
    { method: 'Bottom Fishing for Flounder',
      gear: 'Medium rod 5-7\'; 20-30 lb mono; high-low rig with 2 hooks; 4-6 oz sinker; sea worm or cut bait.',
      technique: 'Anchor over sandy/muddy flats. Drop to bottom. Slight twitch every 30 sec. Feel for nibble + set hook firmly.',
      best_conditions: 'Spring (Apr-Jun) inshore; falling tide; sandy bottoms 5-30 ft.',
      tips: 'Use small hooks (1/0-2/0) for flounder — small mouths. Multiple lines fan out from boat.',
      common_mistakes: 'Hooks too big; setting too hard (rip out of soft mouth).',
      cite: 'Maine inshore tradition' },
    { method: 'Surf Casting',
      gear: '10-12\' surf rod; conventional or spinning reel; 30-50 lb braid; pencil popper or deep diver plug; sea worm rig as backup.',
      technique: 'Cast straight out beyond surf line. Vary retrieve speed + depth. Cover water; move down beach.',
      best_conditions: 'Incoming or top of tide; dawn or dusk; bait visible.',
      tips: 'Long cast covers more water. Walk-stride pattern: cast, retrieve, take 5 steps, repeat.',
      common_mistakes: 'Wading too deep (riptide risk); too-short cast (fish are beyond surf line).',
      cite: 'Maine + New England surf tradition' },
    { method: 'Sabiki Rig for Mackerel + Smelt + Herring',
      gear: '6-8 hook sabiki rig; medium rod; 20 lb braid; 1-2 oz pyramid sinker (depends on depth).',
      technique: 'Drop to depth; raise/lower with slow jigging motion. Fish strike on drop. Multiple fish per drop possible.',
      best_conditions: 'School marked on sonar; mid-summer; deeper water for mackerel.',
      tips: 'Use as bait — these are forage fish. Don\'t over-handle small fish (release damages them).',
      common_mistakes: 'Tangles from jerking rod; kids handling (multi-hook is tangle nightmare).',
      cite: 'Standard inshore technique' },
    { method: 'Trap Fishing — Lobster (Commercial Only at Scale)',
      gear: 'Wire-mesh wood-frame lobster trap; ~$30-$60 each; bait bag with herring or pogies; line + buoy at surface.',
      technique: 'Set traps at 30-200 ft on rocky bottom. Haul every 1-3 days. Pull, sort + measure each lobster, re-bait, re-deploy.',
      best_conditions: 'Spring-fall lobster activity peak; rocky bottom with structure.',
      tips: 'Distribute traps in lines or "strings" of 5-15. Vary depth + position.',
      common_mistakes: 'Wrong bait (use what works locally); setting on muddy bottom; not re-baiting frequently enough.',
      cite: 'Maine lobstering tradition' },
    { method: 'Tuna Trolling (Offshore)',
      gear: '50-80 lb stand-up rod; conventional reel with 50-80 lb mono; daisy-chain teasers + cedar plug or chunky baits; 5-7 knot trolling speed.',
      technique: 'Run lures 50-150 ft behind boat. Spread on outriggers. Vary speed + depth. Strike-and-set on big tuna.',
      best_conditions: 'Spring through fall; offshore around Cashes Ledge or Stellwagen.',
      tips: 'Match bait to local forage. Daisy chains add visual attraction. Don\'t fight a hooked tuna too long — fish welfare.',
      common_mistakes: 'Trolling too fast (lures spinning out); not enough lines spread; wrong gear class.',
      cite: 'Maine + New England offshore tradition' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: ENGINE + BOAT MAINTENANCE
  // ───────────────────────────────────────────────────────────
  var MAINTENANCE = [
    { interval: 'Daily (before each trip)',
      tasks: ['Visual inspection of hull + waterline', 'Check bilge for water + odors', 'Test bilge pump', 'Check fuel level + filters for water', 'Test engine start + idle smoothness', 'Verify navigation lights work', 'Check VHF + GPS power-on', 'Inspect PFDs are accessible'] },
    { interval: 'Weekly',
      tasks: ['Check engine oil level + condition', 'Inspect propeller for damage', 'Clean salt deposits from electronics + cables', 'Check battery voltage + connections', 'Flush outboard with fresh water after each saltwater trip'] },
    { interval: 'Monthly',
      tasks: ['Engine oil change (depending on hours; 50-100 hr typical)', 'Inspect spark plugs (if applicable)', 'Check fuel filter + replace if dirty', 'Inspect anodes (zinc/aluminum sacrificial pieces)', 'Replace lower-unit gear oil (outboard)', 'Charge + test extra batteries'] },
    { interval: 'Annually',
      tasks: ['Full engine service (oil + filters + spark plugs + cooling)', 'Replace impeller (raw-water pump)', 'Inspect rubber components (belts, hoses)', 'Bottom paint application (haul out)', 'Inspect through-hull fittings + seacocks', 'Test fire extinguishers (recharge if needed)', 'Service liferaft (if equipped)', 'Calibrate compass (deviation)', 'Update charts + cruising guides'] },
    { interval: '3-5 years',
      tasks: ['Major engine inspection or rebuild', 'Replace running rigging (lines + lifelines)', 'Service or replace marine batteries (3-5 yr lifespan)', 'Replace nav-light bulbs + fixtures', 'EPIRB battery service (5-7 yr)', 'Major paint + repair work'] }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: FAMOUS MAINE FISHING BOOKS + WRITERS
  // ───────────────────────────────────────────────────────────
  var BOOKS_WRITERS = [
    { title: 'The Hungry Ocean', author: 'Linda Greenlaw', year: 1999,
      summary: 'Maine swordfish captain\'s memoir. Inside view of long-line + offshore commercial fishing.',
      notes: 'Greenlaw is from Isle au Haut; one of few female captains in offshore fleet.' },
    { title: 'The Lobster Chronicles', author: 'Linda Greenlaw', year: 2002,
      summary: 'Greenlaw\'s memoir of returning home to lobster on Isle au Haut.',
      notes: 'Companion to "The Hungry Ocean."' },
    { title: 'Cod: A Biography of the Fish That Changed the World', author: 'Mark Kurlansky', year: 1997,
      summary: 'Definitive popular history of cod + how cod-fishing shaped Western civilization.',
      notes: 'Required reading for any fisheries manager or working fisherman.' },
    { title: 'The Secret Life of Lobsters', author: 'Trevor Corson', year: 2004,
      summary: 'Maine lobstermen + biologists interweave. Accessible introduction to lobster biology + Maine industry.',
      notes: 'Great teacher resource.' },
    { title: 'The Lobster Gangs of Maine', author: 'James M. Acheson', year: 1988,
      summary: 'Anthropology of Maine lobstering communities. Why zone councils + harbor gangs work.',
      notes: 'Foundational academic work; readable.' },
    { title: 'Cape Cod', author: 'Henry David Thoreau', year: 1865,
      summary: 'Thoreau\'s account of walking the Cape Cod coast. Includes commentary on the fishing industry of the time.',
      notes: 'Historical primary source.' },
    { title: 'Mr. Bunker\'s Boatyard', author: 'Stephen W. Foster', year: 1985,
      summary: 'Personal essays about Maine boatyards + working waterfront communities.',
      notes: 'Captures the texture of Maine coastal work.' },
    { title: 'The Outermost House', author: 'Henry Beston', year: 1928,
      summary: 'A year on the Outer Cape (Massachusetts, similar Atlantic coast). Beautiful nature writing.',
      notes: 'Set on Cape Cod but relevant to Maine\'s outer coast.' },
    { title: 'Practical Navigator (Bowditch)', author: 'Nathaniel Bowditch + many editions', year: 1802,
      summary: 'The standard nautical reference. NOAA publishes current editions free online.',
      notes: 'Required for any USCG-licensed officer.' },
    { title: 'Roosevelt + the Atlantic Cod', author: 'Brian Fagan', year: 2008,
      summary: 'How the colonial cod fishery + Atlantic cod trade shaped American history.',
      notes: 'Useful for placing Maine in broader context.' },
    { title: 'Maine and the Sea (Penobscot Marine Museum)', author: 'Various', year: 'multiple',
      summary: 'Museum publications on Maine maritime history.',
      notes: 'Penobscot Marine Museum (Searsport) is excellent resource.' },
    { title: 'On The Water magazine', author: 'editorial team', year: 'monthly',
      summary: 'Regional fishing magazine covering New England + mid-Atlantic.',
      notes: 'Practical + species-specific articles.' },
    { title: 'Maine Sportsman magazine', author: 'editorial team', year: 'monthly',
      summary: 'Maine-specific sportsfishing + hunting.',
      notes: 'In-depth coverage of Maine waters + seasons.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: WOMEN IN MAINE MARITIME HISTORY
  // ───────────────────────────────────────────────────────────
  var WOMEN_MARITIME = [
    { name: 'Susan Bartlett',
      role: 'First female Maine lobsterman',
      dates: '1973 license',
      contribution: 'Broke gender barrier in lobstering. Stonington-area operator.',
      legacy: 'Opened path for subsequent female captains.' },
    { name: 'Linda Greenlaw',
      role: 'Maine swordfish boat captain + author',
      dates: 'Active 1980s-2000s',
      contribution: 'Long-line swordfish captain (rare for women in offshore fleet). Documented "Perfect Storm" era.',
      legacy: 'Author of 4+ books; lecturer; advocate for fishing communities.' },
    { name: 'Hattie Cooper',
      role: 'Penobscot Bay sailing captain',
      dates: 'Early 1900s',
      contribution: 'Maine coastal trader during sail era. Documented in maritime archives.',
      legacy: 'Family-based maritime trade.' },
    { name: 'Audrey Holmes',
      role: 'Late-1900s lobsterman + advocate',
      dates: 'Active 1970s-2000s',
      contribution: 'Long-time lobsterman + community advocate.',
      legacy: 'Mentored multiple female apprentices.' },
    { name: 'Captain Tory Kearns',
      role: 'Charter captain + advocate',
      dates: 'Current',
      contribution: 'Charter operation + advocate for working waterfront preservation.',
      legacy: 'Active in industry today.' },
    { name: 'Aquaculture: Aimee Murphy (Mook Sea Farms)',
      role: 'Oyster farmer + spokesperson',
      dates: 'Current',
      contribution: 'Public face of Maine oyster industry.',
      legacy: 'Building next-generation industry awareness.' },
    { name: 'Wabanaki Women in Fisheries',
      role: 'Multiple roles across nations',
      dates: 'Continuous',
      contribution: 'Wabanaki women have always been part of fishing + processing economies. Traditional + contemporary roles.',
      legacy: 'Ongoing cultural + economic sovereignty.' },
    { name: 'Captain Hannah Greenlaw-Sutter',
      role: 'Next-generation Maine captain',
      dates: 'Current',
      contribution: 'Daughter of Linda Greenlaw; continuing maritime tradition.',
      legacy: 'Demonstrates generational continuity.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: GAME PLAN — A YEAR IN MAINE FISHING
  // ───────────────────────────────────────────────────────────
  var YEAR_GAME_PLAN = [
    { month: 'January',
      saltwater: 'Limited offshore. Cod commercial activity restricted. Smelt ice fishing on coastal estuaries.',
      freshwater: 'Ice fishing for landlocked salmon, lake trout, perch.',
      lobster: 'Limited; some commercial activity in deeper water.',
      gear: 'Cold-weather gear essential. Boat in storage for many.',
      culinary: 'Cod chowder + smelt fry season.' },
    { month: 'February',
      saltwater: 'Smelt + flounder commercial in some areas.',
      freshwater: 'Ice fishing continues.',
      lobster: 'Limited; some commercial activity.',
      gear: 'Maintenance shop time. Plan summer gear.',
      culinary: 'Steamer chowder season.' },
    { month: 'March',
      saltwater: 'Striper anticipation; ice clearing. Smelt run beginning some rivers.',
      freshwater: 'Late-ice fishing; brook trout opener.',
      lobster: 'Increasing as water warms.',
      gear: 'Pre-season tune-up. Trap repairs.',
      culinary: 'Alewife pickling tradition begins.' },
    { month: 'April',
      saltwater: 'Striper arrives southern Maine. Mackerel + smelt + alewife runs.',
      freshwater: 'Open season for many species.',
      lobster: 'Spring fishing increasing.',
      gear: 'Boats off blocks; in-water.',
      culinary: 'First mackerel of season.' },
    { month: 'May',
      saltwater: 'PRIME striper season. Mackerel + bluefish arriving. Alewife peak.',
      freshwater: 'Brook trout + striper in rivers + estuaries.',
      lobster: 'Inshore lobstering main season.',
      gear: 'Full deployment. Charters operating.',
      culinary: 'Alewife festivals (Damariscotta Mills, etc.).' },
    { month: 'June',
      saltwater: 'Striper school + cow runs. Bluefish + mackerel + striper inshore. Lobster prime.',
      freshwater: 'Striper in major rivers (Penobscot, Saco). Brook trout in highlands.',
      lobster: 'Peak summer activity.',
      gear: 'Multi-species rig setups.',
      culinary: 'First lobster bake season.' },
    { month: 'July',
      saltwater: 'Tuna offshore arriving. Striper + bluefish inshore. Lobster.',
      freshwater: 'Brook trout high country. Striped bass in rivers.',
      lobster: 'Peak.',
      gear: 'Tuna gear if going offshore.',
      culinary: 'Lobster roll season at peak.' },
    { month: 'August',
      saltwater: 'Tuna prime. Striper + bluefish. Lobster.',
      freshwater: 'Brook trout high country.',
      lobster: 'Peak.',
      gear: 'Tuna heavy tackle.',
      culinary: 'Tuna sashimi (premium catches).' },
    { month: 'September',
      saltwater: 'Striper migrating south. Bluefin tuna peak. Cod fishing inshore.',
      freshwater: 'Trout in cooler streams. Salmon (where open).',
      lobster: 'Strong harvest.',
      gear: 'Striper fall migration setup.',
      culinary: 'Striped bass at peak quality.' },
    { month: 'October',
      saltwater: 'Striper migration prime. Tuna closing. Cod + haddock inshore.',
      freshwater: 'Brook trout spawning closures.',
      lobster: 'Continuing.',
      gear: 'Fall striper gear.',
      culinary: 'Striper + lobster + cod chowder season.' },
    { month: 'November',
      saltwater: 'Striper migration tail end. Cod + haddock inshore. Smelt + flounder.',
      freshwater: 'Late stripers in some rivers.',
      lobster: 'Slowing.',
      gear: 'Winter prep.',
      culinary: 'Smelt fry + cod stew.' },
    { month: 'December',
      saltwater: 'Limited; offshore only.',
      freshwater: 'Ice forming inland.',
      lobster: 'Limited; offshore commercial.',
      gear: 'Winter storage + repair.',
      culinary: 'Smoked fish + frozen-stock cookery.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: NOAA CHART SYMBOLOGY REFERENCE
  // ───────────────────────────────────────────────────────────
  // Cheat sheet for reading NOAA nautical charts. Charts contain
  // ~1,000 distinct symbols + abbreviations defined in Chart 1.
  var CHART_SYMBOLS = [
    { category: 'Aids to Navigation', items: [
      'Lighthouse: solid star with rays, name + light characteristics labeled',
      'Beacon: solid triangle on land structure',
      'Buoy (lateral): nun (red triangle) or can (green square)',
      'Cardinal buoy: black diamond with topmark indicators',
      'Light: magenta or red exclamation mark with characteristics (e.g., "Fl R 4s 18ft 6M" = red flash every 4 sec, 18 ft above water, visible 6 nm)',
      'Day beacon: triangle (red, even-numbered) or square (green, odd-numbered)'
    ]},
    { category: 'Depths + Bottom', items: [
      'Soundings: numbers in feet (older charts) or meters (modern)',
      'Contour lines: depth curves at standard intervals',
      'Datum: "Mean Lower Low Water" (MLLW) is most common US chart datum',
      'Bottom type: Sd = sand, M = mud, Rk = rock, Sh = shells, Wd = weeds',
      'Wrecks: outlined hull symbol with depth notation',
      'Foul areas: outlined zone with dashes'
    ]},
    { category: 'Hazards', items: [
      'Rock (above water): asterisk or cross',
      'Rock (below water): plus sign (+) with depth',
      'Reef: hatched zone',
      'Submerged danger: cross within circle',
      'Submarine cable: dashed line with cable symbol',
      'Pipeline: dashed line with pipe symbol'
    ]},
    { category: 'Coastline + Land', items: [
      'High water mark: dark solid line',
      'Low water mark: dotted line + intertidal pattern',
      'Marsh: standardized vertical line pattern',
      'Sand: stippled pattern',
      'Rocky shore: cross-hatched',
      'Lighthouse + tower: side profile drawings'
    ]},
    { category: 'Regulated Areas', items: [
      'Restricted areas: outlined zones with regulations noted',
      'Anchorage: anchor symbol + name',
      'Mooring area: ball + chain symbol',
      'Cable area: dashed pattern',
      'Submarine exercise zone: outlined zone',
      'No-discharge zone: NDZ notation'
    ]},
    { category: 'Currents + Tides', items: [
      'Tide station: small square + station name',
      'Current diamond: rotated diamond with current direction + speed arrows',
      'Tidal stream: long arrow with speed annotation',
      'Reference for tide tables: NOAA tidesandcurrents.noaa.gov'
    ]}
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MAINE LIGHTHOUSE INVENTORY (selected)
  // ───────────────────────────────────────────────────────────
  var LIGHTHOUSES = [
    { name: 'Portland Head Light',
      location: 'Cape Elizabeth (Portland Harbor approach)',
      year: 1791,
      height: '80 ft',
      range: '24 nm white, 18 nm red',
      character: 'White flash every 4 seconds',
      historical: 'First US-built lighthouse (commissioned by George Washington). Most-photographed lighthouse in North America.',
      access: 'Visitable; museum on-site; public park.' },
    { name: 'Bug Light (Lower Lighthouse)',
      location: 'South Portland (Portland Harbor)',
      year: 1875,
      height: '26 ft',
      range: '6 nm',
      character: 'Continuous green',
      historical: 'Cast-iron lighthouse marking inner channel of Portland Harbor. Small + iconic.',
      access: 'Visitable; in Bug Light Park.' },
    { name: 'Pemaquid Point Light',
      location: 'Pemaquid Point (Pemaquid Peninsula)',
      year: 1827,
      height: '38 ft',
      range: '14 nm',
      character: 'White flash every 6 seconds',
      historical: 'Featured on Maine quarter (1999-2008). One of Maine\'s most photographed.',
      access: 'Visitable; museum.' },
    { name: 'Owls Head Light',
      location: 'Owls Head (Penobscot Bay)',
      year: 1825,
      height: '30 ft',
      range: '16 nm',
      character: 'Fixed white',
      historical: 'Active aid to navigation. Famous lighthouse-keeper dog "Spot" in 1930s.',
      access: 'Visitable; partial public access.' },
    { name: 'Marshall Point Light',
      location: 'Port Clyde',
      year: 1832,
      height: '31 ft',
      range: '16 nm',
      character: 'White flash every 4 seconds',
      historical: 'Featured in "Forrest Gump" film.',
      access: 'Visitable; museum.' },
    { name: 'Two Lights State Park',
      location: 'Cape Elizabeth (eastern), two lights once active',
      year: 1828 + 1874,
      height: 'Eastern still active 65 ft; Western now a museum',
      range: '17 nm',
      character: 'Two Lights — historic twin tower system',
      historical: 'Originally two lights to distinguish from nearby Portland Head. Eastern still active.',
      access: 'State park; eastern light not climbable but visible.' },
    { name: 'West Quoddy Head Light',
      location: 'Lubec (easternmost US point)',
      year: 1858,
      height: '49 ft',
      range: '18 nm',
      character: 'Red + white candy-stripe; flashing red every 15s',
      historical: 'Marks the easternmost point of the contiguous US. Distinctive red + white stripes.',
      access: 'Visitable; museum + state park.' },
    { name: 'Mount Desert Rock Light',
      location: 'Offshore island, 25 nm SW of Mount Desert',
      year: 1830,
      height: '58 ft',
      range: '20 nm',
      character: 'White flash every 15 seconds',
      historical: 'Most-isolated Maine lighthouse — small bare rock 25 nm offshore. Currently a research station (College of the Atlantic).',
      access: 'Boats only; research-station coordination needed.' },
    { name: 'Saddleback Ledge Light',
      location: 'East Penobscot Bay',
      year: 1839,
      height: '47 ft',
      range: '8 nm',
      character: 'White flash every 6 seconds',
      historical: 'Granite tower on a small ledge. Famous lighthouse-keepers stationed here for decades.',
      access: 'Boats only.' },
    { name: 'Boon Island Light',
      location: 'Offshore island, 6 nm off York',
      year: 1855,
      height: '137 ft (tallest Maine lighthouse)',
      range: '19 nm',
      character: 'White flash every 5 seconds',
      historical: 'Site of famous 1710 shipwreck where survivors resorted to cannibalism.',
      access: 'Boats only.' },
    { name: 'Matinicus Rock Light',
      location: 'Offshore SW Matinicus Island',
      year: 1827,
      height: '48 ft',
      range: '20 nm',
      character: 'White flash every 10 seconds',
      historical: 'Famous Atlantic Puffin restoration site (Project Puffin, Audubon 1973-).',
      access: 'Boats only; Audubon research visits.' },
    { name: 'Petit Manan Light',
      location: 'Petit Manan Point',
      year: 1817,
      height: '119 ft (2nd-tallest Maine lighthouse)',
      range: '20 nm',
      character: 'White flash every 5 seconds',
      historical: 'Important offshore nav aid + tern + puffin sanctuary.',
      access: 'Boats only.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MAINE INVERTEBRATES (beyond lobster + shellfish)
  // ───────────────────────────────────────────────────────────
  var INVERTEBRATES = [
    { name: 'Rock Crab', sci: 'Cancer irroratus', habitat: 'Rocky inshore + tide pools',
      role: 'Prey for cod, striper, lobster. Bait species. Occasional human-targeted by hand-picking.',
      market: 'Limited commercial value; sold by some Maine markets.',
      climate: 'Stable; warmer water may favor.' },
    { name: 'Jonah Crab', sci: 'Cancer borealis', habitat: 'Subtidal rocky bottom',
      role: 'Sometimes targeted commercially; growing fishery in Maine + Northeast.',
      market: '~$1-$3/lb wholesale; meat used in crab cakes.',
      climate: 'Range may shift north + abundance increase.' },
    { name: 'Green Crab', sci: 'Carcinus maenas', habitat: 'Intertidal + estuarine',
      role: 'INVASIVE. Devastates clam flats + eelgrass. Some recreational + commercial harvest.',
      market: 'Experimental products (bisque, fertilizer, soft-shell sales).',
      climate: 'Warming aids invasion. Major Maine ecological issue.' },
    { name: 'European Green Lobster', sci: 'Homarus gammarus', habitat: 'Not in Maine',
      role: 'European cousin to American lobster. Not in Maine waters.',
      market: 'European fishery.',
      climate: 'N/A in Maine.' },
    { name: 'Sea Urchin (Green)', sci: 'Strongylocentrotus droebachiensis', habitat: 'Cold rocky subtidal',
      role: 'Wild-caught fishery boomed 1990s, collapsed by 2000. Roe ("uni") is premium product.',
      market: 'Live $10-$25/lb; uni $80-$200/lb.',
      climate: 'Cold-water sensitive; range contracting north.' },
    { name: 'Whelk (Channeled + Knobbed)', sci: 'Busycotypus canaliculatus + Busycon carica', habitat: 'Sandy + muddy bottom',
      role: 'Scavenger + predator on shellfish. Sometimes targeted commercially.',
      market: 'Wholesale; not common in Maine restaurants.',
      climate: 'Range may shift north.' },
    { name: 'Periwinkle', sci: 'Littorina littorea', habitat: 'Intertidal rocks',
      role: 'Introduced from Europe. Common + harvested by hand for Asian food markets.',
      market: 'Hand-picked; wholesale to specialty markets.',
      climate: 'Hardy; established invasive.' },
    { name: 'Northern Shrimp', sci: 'Pandalus borealis', habitat: 'Cold-deep Gulf of Maine',
      role: 'Important historical commercial fishery (cold-water shrimp). Fishery closed since 2014 due to recruitment collapse.',
      market: 'Closed.',
      climate: 'Recruitment failure linked to warming. Very vulnerable.' },
    { name: 'Sea Cucumber', sci: 'Cucumaria frondosa', habitat: 'Cold subtidal',
      role: 'Small commercial fishery (premium Asian market). Sustainably managed by quota.',
      market: 'Live $5-$15/lb; dried product higher.',
      climate: 'Cold-water species; may decline.' },
    { name: 'Sea Star (Starfish)', sci: 'Asterias spp.', habitat: 'Intertidal + subtidal everywhere',
      role: 'Major shellfish predator. Aquaculture pest.',
      market: 'Not harvested commercially.',
      climate: 'Sea star wasting disease 2013+ devastated populations on West Coast; less impact in Maine but watched.' },
    { name: 'Krill (euphausiids)', sci: 'Meganyctiphanes norvegica', habitat: 'Pelagic',
      role: 'Foundation forage species — feeds whales + seabirds + fish.',
      market: 'Not commercially harvested in Maine.',
      climate: 'Cold-water dependent; range shifts likely.' },
    { name: 'Atlantic Jackknife Clam', sci: 'Ensis directus', habitat: 'Intertidal sand',
      role: 'Native to Maine; emerging aquaculture interest.',
      market: 'Premium Asian markets.',
      climate: 'Climate-resilient.' },
    { name: 'Mantis Shrimp', sci: 'Squilla empusa', habitat: 'Rare in cold Maine; warmer-water species',
      role: 'Iconic ambush predator with hammer-like claws. Rare here.',
      market: 'Not commercial in Maine.',
      climate: 'May range-shift into Maine with warming.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MAINE TIDAL HARBORS DETAIL
  // ───────────────────────────────────────────────────────────
  var HARBOR_DETAILS = [
    { name: 'Portland Harbor', chart: 'NOAA 13290',
      tidal_range: '~9 ft mean',
      depths: '20-40 ft main channel',
      hazards: 'Heavy ferry traffic; cruise ships in season; submerged ledges south.',
      buoyage: 'Multiple lateral channels well-marked.',
      facilities: 'Custom House Wharf; Portland Fish Pier; multiple marinas.',
      best_for: 'Most water-access activities; commercial + recreational fleet base.' },
    { name: 'Boothbay Harbor', chart: 'NOAA 13293',
      tidal_range: '~9 ft',
      depths: '15-30 ft channel',
      hazards: 'Tide rip at southern entrance; rocky outer islands.',
      buoyage: 'Well-marked.',
      facilities: 'Multiple marinas + commercial wharves.',
      best_for: 'Tourism + recreation + boatyard work.' },
    { name: 'Stonington Harbor', chart: 'NOAA 13305',
      tidal_range: '~9 ft',
      depths: '15-25 ft',
      hazards: 'Ledges everywhere; narrow channels.',
      buoyage: 'Channel marked but ledge-strewn approaches.',
      facilities: 'Stonington Lobster Co-op + multiple working piers.',
      best_for: 'Commercial lobstering; experienced boaters only for outer waters.' },
    { name: 'Camden Harbor', chart: 'NOAA 13302',
      tidal_range: '~10 ft',
      depths: '15-30 ft',
      hazards: 'Crowded summer season; some shoals near entrance.',
      buoyage: 'Standard lateral.',
      facilities: 'Multiple marinas; Camden Yacht Club; windjammer dock.',
      best_for: 'Tourism + sailing + heritage schooner trips.' },
    { name: 'Rockland Harbor', chart: 'NOAA 13302',
      tidal_range: '~10 ft',
      depths: '25-45 ft',
      hazards: 'Heavy commercial + ferry traffic to Vinalhaven + North Haven.',
      buoyage: 'Well-marked.',
      facilities: 'Rockland Public Landing; Maine State Ferry Service; multiple commercial fish piers.',
      best_for: 'Commercial fishing + cruise + island access.' },
    { name: 'Bar Harbor + Frenchman Bay', chart: 'NOAA 13318',
      tidal_range: '~10 ft',
      depths: '30-100 ft (Frenchman Bay is deep)',
      hazards: 'Cruise ship traffic; outer rocks + ledges.',
      buoyage: 'Well-marked.',
      facilities: 'Bar Harbor town pier + multiple marinas.',
      best_for: 'Tourism + sport fishing + whale watching.' },
    { name: 'Cobscook Bay (Lubec/Eastport)', chart: 'NOAA 13325',
      tidal_range: '18-25 ft (extreme!)',
      depths: 'Varies dramatically with tide',
      hazards: 'Reversing Falls; strong currents up to 8 kt; Old Sow whirlpool; fog.',
      buoyage: 'Limited; local knowledge essential.',
      facilities: 'Eastport Breakwater; Lubec town piers; salmon aquaculture industry.',
      best_for: 'Experienced boaters only; salmon aquaculture; deep-water cargo (Mack Point cargo terminal).' },
    { name: 'Damariscotta River', chart: 'NOAA 13293',
      tidal_range: '~8 ft',
      depths: '20-60 ft in lower reaches',
      hazards: 'Narrow channel; aquaculture leases throughout.',
      buoyage: 'Marked for working traffic.',
      facilities: 'Bristol, Round Pond, South Bristol harbors; Mook Sea Farms.',
      best_for: 'Aquaculture + light recreational boating.' },
    { name: 'Penobscot Bay (multiple harbors)', chart: 'NOAA 13302 + 13303',
      tidal_range: '~10 ft',
      depths: '50-300 ft (deep bay)',
      hazards: 'Big open water; major weather exposure; outer islands require offshore-capable boats.',
      buoyage: 'Well-marked main channels.',
      facilities: 'Vinalhaven + North Haven + Matinicus + Camden + Rockland + Stonington.',
      best_for: 'Multi-day cruising + island access; experienced offshore.' },
    { name: 'Casco Bay (Portland to Brunswick)', chart: 'NOAA 13290',
      tidal_range: '~9 ft',
      depths: 'Variable; many shallow areas + ledges',
      hazards: 'Heavy summer traffic; numerous islands + ledges.',
      buoyage: 'Major channels marked.',
      facilities: 'Multiple marinas + commercial wharves; Casco Bay Lines ferries to islands.',
      best_for: 'Mixed recreational + commercial + tourism.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: WEATHER FORECASTING TIPS
  // ───────────────────────────────────────────────────────────
  var WEATHER_TIPS = [
    { sign: 'Falling Barometer',
      means: 'Low pressure system approaching. Weather will deteriorate.',
      action: 'Watch for shifting wind; consider return to port.',
      timing: '24-48 hr lead time for major changes.' },
    { sign: 'Rising Barometer',
      means: 'High pressure building. Clearing + improving.',
      action: 'Favorable conditions developing.',
      timing: 'Hours to a day.' },
    { sign: 'Cirrus Clouds (high, wispy)',
      means: 'Often precursor to warm front (rain in 24-48 hr).',
      action: 'Plan for possible weather coming.',
      timing: '1-2 days.' },
    { sign: 'Cumulus Clouds (puffy, fair-weather)',
      means: 'Normally fair; if building into towers, thunderstorm risk.',
      action: 'Watch for vertical growth in afternoon.',
      timing: 'Hours.' },
    { sign: 'Cumulonimbus (anvil-shaped tops)',
      means: 'Thunderstorms imminent or in progress.',
      action: 'GET ASHORE. Lightning + downbursts + sudden wind shifts.',
      timing: '30 min to immediate.' },
    { sign: 'Stratus (low, gray, uniform)',
      means: 'Often rain or drizzle; reduced visibility.',
      action: 'Plan for slow-going conditions.',
      timing: 'Hours.' },
    { sign: 'Halo around Sun or Moon',
      means: 'Cirrus + cirrostratus = warm front approaching.',
      action: 'Weather may deteriorate within 24 hr.',
      timing: '24 hr.' },
    { sign: 'Mares\' Tails + Mackerel Skies',
      means: 'Cirrus + altocumulus = warm front. "Mares\' tails + mackerel skies — tall ships carry low sails."',
      action: 'Storm watch.',
      timing: '24-36 hr.' },
    { sign: 'Wind Shift (Veering)',
      means: 'Wind direction shifting clockwise — passing of warm front.',
      action: 'Conditions changing; watch new direction.',
      timing: 'Immediate.' },
    { sign: 'Wind Shift (Backing)',
      means: 'Wind direction shifting counter-clockwise — approaching warm front.',
      action: 'Weather deteriorating soon.',
      timing: 'Hours.' },
    { sign: 'Increasing Sea State',
      means: 'Wind strengthening — combined with falling barometer, classic storm signs.',
      action: 'Consider early return.',
      timing: '6-12 hr.' },
    { sign: 'Calm Before Storm',
      means: 'Wind dies; pressure dropping fast = storm imminent.',
      action: 'IMMEDIATELY prep for storm + run for harbor.',
      timing: 'Minutes to hours.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: SPECIES DEEP DIVES (multi-paragraph essays)
  // ───────────────────────────────────────────────────────────
  // For top-tier Maine species, multi-paragraph essays covering
  // taxonomy, life history, ecology, fishery history, current
  // status, climate vulnerability, and stewardship implications.
  // These provide the depth that bullet-point summaries can't.
  var SPECIES_DEEP_DIVES = [
    { id: 'cod-deep', name: 'Atlantic Cod (Gadus morhua) — Deep Dive',
      taxonomy: 'Order: Gadiformes. Family: Gadidae (codfishes). Atlantic cod is the most economically important + iconic groundfish of the North Atlantic.',
      lifeHistory: 'Cod spawn in winter + early spring. A single female can produce 3-9 million eggs per spawn. Eggs + larvae are pelagic for several weeks before juveniles settle to bottom at ~6 months. Maturity at 2-5 years (smaller now than historically — fishing has selected for earlier maturation). Lifespan historically to 25 years; now typically <10 years due to fishing pressure.',
      ecology: 'Cod are top-tier piscivores feeding on herring, capelin, sand lance, squid, crab, small flatfish. Inhabit cold rocky reefs + ledges. Form spawning aggregations during reproductive season — historically targeted by fishermen who could fill a hold in days at such aggregations.',
      fisheryHistory: 'Cod has been the foundation of New England fishing since pre-colonial times. The 19th + early 20th centuries saw industrial-scale cod harvest in Gulf of Maine + Georges Bank + Grand Banks. Annual landings exceeded 100,000+ tons. The Grand Banks fishery collapsed in 1992 (Canada). Gulf of Maine + Georges Bank stocks remained stressed throughout 2000s + 2010s.',
      currentStatus: 'Severely depleted in Gulf of Maine. Spawning stock biomass is below 10% of historical. Strict quotas in effect. Federal stock rebuilding plan governs harvest. Recreational + commercial catches limited.',
      climateVulnerability: 'HIGH. Cod larvae develop poorly above ~12°C. Gulf of Maine summer SSTs now regularly exceed this threshold. Pershing et al. 2015 documented climate as primary obstacle to recovery — even with reduced fishing, warming prevents rebound.',
      stewardship: 'Buy + eat haddock or pollock instead. Catch-and-release if you accidentally catch cod. Support climate mitigation that addresses the underlying problem.',
      cite: 'Pershing 2015 Science; NEFSC stock assessments; NOAA Fisheries Northeast' },
    { id: 'lobster-deep', name: 'American Lobster (Homarus americanus) — Deep Dive',
      taxonomy: 'Order: Decapoda. Family: Nephropidae. Closely related to crayfish + spiny lobsters.',
      lifeHistory: 'Females spawn after molting; carry eggs externally on swimmerets for 9-12 months. A single female can carry 5,000-100,000 eggs. Eggs hatch as planktonic larvae that drift for several weeks. Juveniles settle to bottom + grow through many molts. Reaches legal size (3.25" carapace) at ~6-8 years; lifespan to 100+ years documented. Continued molting throughout life — energy goes increasingly to reproduction at older ages.',
      ecology: 'Lobster are omnivores, eating crabs, mussels, fish, urchins, kelp. Live in rocky shelters + crevices. Move seasonally — inshore in summer, deeper in winter. Territorial + somewhat social. Pheromone-mediated reproductive + recognition behaviors. Important predator + prey in Gulf of Maine ecosystem.',
      fisheryHistory: 'Originally considered "poor people\'s food" — fed to prisoners + indentured servants. Lobster canning industry 1800s — major Maine industry. Modern lobster industry built on conservation pillars established 1900-1933 (size limits, license tiers). Maine landings climbed from low millions of pounds early 1900s to 100M+ lbs annually by 2010s — partly a climate winner.',
      currentStatus: 'Maine landings near historic highs. Industry employs thousands. License + zone council system limits entry. V-notch + size limits + escape vents protect breeding biomass. Southern New England + Long Island Sound populations have collapsed — Maine\'s turn could come.',
      climateVulnerability: 'CURRENTLY POSITIVE (range expanding north as Gulf warms) but VULNERABLE LONG-TERM. Shell-disease + abnormal molting rising. Predicted to shift north further; Maine may eventually be at southern edge of range.',
      stewardship: 'V-notch + escape vent + size limit framework + zone councils are working. Climate adaptation needed. Right-whale entanglement requires new gear technology.',
      cite: 'Maine DMR + Maine Lobstermen\'s Association + Le Bris et al. 2018' },
    { id: 'striper-deep', name: 'Striped Bass (Morone saxatilis) — Deep Dive',
      taxonomy: 'Order: Perciformes. Family: Moronidae (temperate basses).',
      lifeHistory: 'Anadromous — adults live in saltwater, spawn in freshwater. Migratory: Maine summer feeding grounds, mid-Atlantic + Chesapeake winter spawning. Females reach maturity at 4-8 years (~24-28" length). Spawn in spring (April-June) in rivers. A single large female can produce millions of eggs. Lifespan 30+ years. Slow growth + late maturity = vulnerable to overfishing.',
      ecology: 'Voracious predators on baitfish (menhaden, alewives, herring). Move with bait + tide. Feed in surf zones + estuaries inshore. Larger fish more independent of bait schools; smaller "schoolie" fish move in pods.',
      fisheryHistory: 'Major recreational + commercial fishery. Collapsed in early 1980s from overfishing. Multi-state moratorium 1985-1990 (Maryland Striped Bass Moratorium) allowed recovery. By mid-1990s, populations rebuilt. Current concerns about stock declines in mid-2010s-2020s.',
      currentStatus: 'Stock rebuilding plan in effect. Slot limits (Maine: 28-31") protect both juveniles + large breeders. Recreational + commercial managed by ASMFC.',
      climateVulnerability: 'MODERATE. Range may shift with warming; spawning rivers vulnerable to drought + flow alterations.',
      stewardship: 'Slot limits + circle hook requirements + careful release reduce mortality. Catch-and-release ethic strong in sport-fishing community.',
      cite: 'ASMFC striped bass 2024 + multiple academic studies' },
    { id: 'alewife-deep', name: 'Alewife (Alosa pseudoharengus) — Deep Dive',
      taxonomy: 'Order: Clupeiformes. Family: Clupeidae (herrings + relatives). Anadromous river herring.',
      lifeHistory: 'Adults live in marine + estuarine waters. Spawn in fresh water (lakes + slow river reaches) in spring. Sex-distinct spawning timing; males arrive first. Eggs adhesive, attached to vegetation + bottom. Juveniles spend ~3-6 months in fresh water before migrating downstream to sea. Maturity at 4-5 years; lifespan to 10+ years.',
      ecology: 'Foundation forage species — feeds striper, bluefish, osprey, eagles, seals, whales. Massive spring + early summer runs are major ecological event.',
      fisheryHistory: 'Wabanaki + early colonial fisheries used alewife extensively. Maine alewife traditional + commercial fisheries declined dramatically through 1800s-1900s due to dams + pollution. Damariscotta Mills + a few other rivers maintained working runs.',
      currentStatus: 'Restored populations in many Maine rivers thanks to dam removal + fishway construction. Penobscot Project (2004-2016) opened 1,000+ miles. Damariscotta Mills annual run is community event.',
      climateVulnerability: 'MODERATE. Stream temperature + flow alterations affect spawning.',
      stewardship: 'Town-managed + state-regulated fishery. Alewives sustain regional ecology. Continue dam-removal + restoration work.',
      cite: 'Maine DMR sea-run program + ASMFC' },
    { id: 'mackerel-deep', name: 'Atlantic Mackerel (Scomber scombrus) — Deep Dive',
      taxonomy: 'Order: Perciformes. Family: Scombridae (mackerels + tunas).',
      lifeHistory: 'Spawn in spring + early summer in mid-Atlantic + southern New England. Eggs + larvae pelagic. Juveniles + adults form vast schools that migrate seasonally — south in winter, north + inshore in summer. Lifespan ~10-15 years.',
      ecology: 'Plankton + small-fish predator. Vital forage species for stripers, bluefish, tuna, seabirds, whales.',
      fisheryHistory: 'Industrial-scale mackerel fishery in 19th + 20th centuries. Maine sardine canneries processed mackerel-relative species. Recreational: prime June-July light-tackle target.',
      currentStatus: 'Stock under rebuilding plan after recent decline. Quotas tightened. Recreational still active.',
      climateVulnerability: 'MODERATE. Range shifting + spawning timing shifting.',
      stewardship: 'Use as bait + food but don\'t over-target. Ecosystem-aware management mandated by federal council.',
      cite: 'NEFSC mackerel assessment 2024' },
    { id: 'pollock-deep', name: 'Pollock (Pollachius virens) — Deep Dive',
      taxonomy: 'Order: Gadiformes. Family: Gadidae (codfishes). Cousin to cod + haddock.',
      lifeHistory: 'Spawn winter-spring. Schooling pelagic to semi-pelagic. Maturity at 3-5 years. Lifespan 25+ years.',
      ecology: 'Mid-water schooling predator. Feed on herring, mackerel, squid, sand lance. Less reef-bound than cod.',
      fisheryHistory: 'Historically a "second-tier" fish to cod. Today, pollock is replacing cod in many fisheries + on menus.',
      currentStatus: 'Healthy stock in Gulf of Maine. Sustainable harvest.',
      climateVulnerability: 'MODERATE. More resilient than cod to warming.',
      stewardship: 'A good replacement for cod in recipes + on menus. Support sustainability.',
      cite: 'NEFSC' },
    { id: 'haddock-deep', name: 'Haddock (Melanogrammus aeglefinus) — Deep Dive',
      taxonomy: 'Order: Gadiformes. Family: Gadidae.',
      lifeHistory: 'Spawn winter-spring on Georges Bank + Gulf of Maine. Maturity at 2-4 years.',
      ecology: 'Bottom-feeding on invertebrates. Often near smooth bottom adjacent to ledges.',
      fisheryHistory: 'Historically one of the most-harvested groundfish in New England. Stock collapsed in 1990s-2000s, but rebuilt remarkably.',
      currentStatus: 'Stock RECOVERED in Gulf of Maine — a fisheries success story. Sustainable harvest.',
      climateVulnerability: 'MODERATE.',
      stewardship: 'Buy haddock as a sustainable replacement for cod. Industry recovery shows management can work.',
      cite: 'NEFSC haddock assessment 2024' },
    { id: 'wolffish-deep', name: 'Atlantic Wolffish (Anarhichas lupus) — Deep Dive',
      taxonomy: 'Order: Perciformes. Family: Anarhichadidae. Highly unusual + ecologically unique.',
      lifeHistory: 'Slow growth + late maturity (6-10 years). Long-lived. Strong fidelity to specific caves + crevices — individuals stay in one shelter for years.',
      ecology: 'Crushes shellfish + crustaceans with massive canine teeth. Solitary. Important seafloor predator.',
      fisheryHistory: 'Bycatch in groundfish trawls historically. Slow life history + cave fidelity = highly vulnerable to fishing pressure.',
      currentStatus: 'NOAA Species of Concern. Federal "take prohibition" in US Atlantic — release immediately. Endangered Species Act petitioning ongoing.',
      climateVulnerability: 'HIGH. Cold-water specialist.',
      stewardship: 'NEVER target. NEVER keep if caught. Release with minimal handling. Report sightings to NOAA.',
      cite: 'NOAA Office of Protected Resources' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: SEAMANSHIP SKILLS (anchoring, docking, etc.)
  // ───────────────────────────────────────────────────────────
  var SEAMANSHIP = [
    { skill: 'Anchoring Properly',
      details: 'Pick a spot with appropriate bottom (sand or mud preferred over rock or grass). Reduce speed approaching. Lower anchor (NEVER throw) once boat is over chosen spot. Pay out 5:1 to 7:1 scope of rode (anchor line ÷ water depth). Let wind/current pull boat back to dig anchor in. Check hold by sighting against shore landmarks. Add chain near anchor for better hold + reduce wear.',
      mistake: 'Throwing anchor (tangles), insufficient scope (drags), pulling boat back too fast (anchor doesn\'t set).',
      practice: 'Practice in fair conditions first. Try multiple anchor types.' },
    { skill: 'Docking Single-Handed',
      details: 'Approach slowly. Identify dock side + wind direction. Plan exit before you commit. Use spring lines first to control fore-aft motion. Bow line + stern line secure the boat. Adjust as boat settles + wind changes.',
      mistake: 'Approaching too fast; trying to "muscle" against wind/current with engine; not using spring lines.',
      practice: 'Practice in low-traffic areas + windless days first.' },
    { skill: 'Man Overboard (MOB) Response',
      details: 'IMMEDIATE: 1. Shout "MAN OVERBOARD" + identify side. 2. Throw flotation (PFD, ring, etc.) toward victim. 3. Keep visual contact. 4. Reduce speed + circle back, approaching from downwind. 5. Get victim aboard or attached to throw bag.',
      mistake: 'Losing visual contact; turning too fast (which propels victim away); not throwing flotation first.',
      practice: 'Practice with a buoy. Time yourself.' },
    { skill: 'Fog Operations',
      details: 'COLREGS Rule 6 — safe speed (speed at which you can stop in distance of visibility). Sound 1 prolonged blast every 2 min (power-driven underway). Use radar + GPS chart. Listen for other vessels\' signals. Avoid main shipping lanes if possible. Heightened lookout.',
      mistake: 'Maintaining cruise speed; not sounding signals; not monitoring VHF Ch 16.',
      practice: 'Time how long it takes to stop from cruise speed. Practice fog signals.' },
    { skill: 'Heavy-Weather Tactics',
      details: 'Reduce sail (if sailing). Slow down. Crew below if possible. Wear PFDs + harnesses if waves are breaking. Head into seas at moderate angle (not perpendicular = pounding; not parallel = broaching). Deploy drogue or sea anchor if necessary.',
      mistake: 'Running before large following seas at high speed (broaching risk); pounding bow into seas at planing speed (boat damage).',
      practice: 'Don\'t deliberately go out in heavy weather. But know the procedure for unexpected onset.' },
    { skill: 'VHF Radio Discipline',
      details: 'Monitor Ch 16 underway. Don\'t chatter on 16. Use 9 for hailing + then switch to working channel. Don\'t test on 16. Listen before transmitting. Keep transmissions brief.',
      mistake: 'Chatter on Ch 16; testing on 16; long transmissions; talking over distress traffic.',
      practice: 'Memorize VHF protocol. Practice radio checks on Ch 9.' },
    { skill: 'Engine Maintenance Basics',
      details: 'Outboard: change lower-unit gear oil annually; replace fuel filter; check propeller for damage; flush with fresh water after each saltwater trip. Inboard: check raw-water impeller annually; oil + fuel filters; coolant condition; belts.',
      mistake: 'Skipping maintenance; running aground saltwater intake; ignoring odd sounds.',
      practice: 'Take a small-engine course. Learn to identify normal vs abnormal sounds.' },
    { skill: 'Reading Weather Signs',
      details: 'Watch for falling barometer, thickening cirrus + cumulus, shifting wind, swell direction change. NOAA Weather Radio + marine forecast. Phone apps (Windy, Buoyweather). Local knowledge of harbor + bay patterns.',
      mistake: 'Ignoring early warning signs; assuming "it\'ll pass."',
      practice: 'Daily weather observation + comparison to forecast.' },
    { skill: 'Tide Window Planning',
      details: 'Check tide table for your harbor. Plan departure + return to match tide stages. Consider shallow areas + channel depths. Note current strength (esp. Reversing Falls!).',
      mistake: 'Assuming "the tide will turn when I get there"; running aground at low tide; getting stuck on outgoing tide.',
      practice: 'Make a tide log for a season. Notice patterns.' },
    { skill: 'Pre-Trip Safety Brief',
      details: 'Before casting off: brief crew on PFD location + use, VHF Ch 16 + MAYDAY procedure, MOB response, fire extinguisher location, where to find safety equipment, emergency contacts ashore.',
      mistake: 'Assuming everyone knows. Skipping the brief.',
      practice: 'Develop a checklist. Use it every trip until automatic.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: NIGHT NAVIGATION + LIGHTS
  // ───────────────────────────────────────────────────────────
  var NIGHT_NAV = [
    { id: 'nav-lights', title: 'Vessel Navigation Lights',
      body: 'COLREGS Rule 23+: Power-driven vessels show red (port), green (starboard), white stern, and (if >12 m) white masthead light visible from forward.',
      practical: 'Approaching head-on: see green + red simultaneously = head-on. See only red = approaching from port side (give-way). See only green = approaching from starboard (stand-on but stay alert).' },
    { id: 'fishing-lights', title: 'Fishing Vessel Lights',
      body: 'Vessels actively engaged in fishing show distinctive light patterns: typically green over white for trawling; red over white for fishing other than trawling.',
      practical: 'You don\'t need to memorize all — but if you see ANY unusual light pattern at night, treat as restricted maneuverability + give wide berth.' },
    { id: 'sail-lights', title: 'Sailing Vessel Lights',
      body: 'Sailing vessels under sail only show red + green sidelights + white stern light. NO masthead light when under sail alone.',
      practical: 'Sail under power + sail = same as motor vessel. Pure sail = no masthead light. Helps you distinguish.' },
    { id: 'aton-lights', title: 'Navigation Aid Lights (Buoys + Lighthouses)',
      body: 'Lighthouses + buoys have specific flash patterns described on charts: "Fl 4s" = single flash every 4 seconds; "Iso" = isochronous (equal light + dark); "Mo(A)" = Morse "A" (.-) used on safe-water marks.',
      practical: 'At night, watch flash patterns to identify which buoy you\'re seeing. Cross-reference chart.' },
    { id: 'fog-lights', title: 'Day-Shapes vs Night-Lights',
      body: 'Day-shapes (black balls, cones, diamonds) convey same info as night-lights. E.g., 2 black balls = "not under command"; 1 ball = "anchored."',
      practical: 'Some boaters memorize day-shapes from licensing exam + forget. Know them — they save lives.' },
    { id: 'fog-sounds', title: 'Fog Signal Patterns',
      body: 'COLREGS Rule 35: Power underway = 1 prolonged blast every 2 min. Sail or fishing = 1 prolonged + 2 short. Anchored = bell rapidly 5 sec each minute. Aground = bell + gong.',
      practical: 'In fog, you may hear signals before you see vessels. Learn the patterns. Maritime traffic + recreational boaters both make these.' },
    { id: 'maritime-history-light', title: 'Maine Lighthouse Heritage',
      body: 'Maine has more lighthouses (~60+) than most coastal states. Portland Head Light (1791) was the first US-built. Many still active aids to navigation, others museum + tour sites.',
      practical: 'Lighthouse Foundation of Maine runs many. Worth visiting for nav + heritage education.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: BUOYAGE (IALA-B — North America)
  // ───────────────────────────────────────────────────────────
  var BUOYAGE = {
    lateral: [
      { type: 'nun', color: 'red', shape: 'conical', side: 'right when entering harbor',
        meaning: 'Red-right-returning. Pass on your starboard (right) side when heading toward port from sea. Reverse when leaving.',
        numbering: 'Even numbers, increasing toward port.',
        light: 'Red flashing or quick' },
      { type: 'can', color: 'green', shape: 'cylindrical', side: 'left when entering harbor',
        meaning: 'Green-left-returning. Pass on your port (left) side when heading toward port from sea.',
        numbering: 'Odd numbers, increasing toward port.',
        light: 'Green flashing or quick' },
      { type: 'junction-red-top', color: 'red over green', shape: 'nun',
        meaning: 'Preferred channel to port (left). Treat as a red nun for the preferred route.',
        numbering: 'Letter (e.g., "A")', light: 'Composite group flashing' },
      { type: 'junction-green-top', color: 'green over red', shape: 'can',
        meaning: 'Preferred channel to starboard (right). Treat as a green can for the preferred route.',
        numbering: 'Letter (e.g., "B")', light: 'Composite group flashing' }
    ],
    cardinal: [
      { type: 'north', color: 'black-over-yellow', topmark: '▲▲',
        meaning: 'Safe water is to the north of this mark. Pass north of it.', light: 'White, continuous quick or very quick' },
      { type: 'east', color: 'black-yellow-black', topmark: '▲▼',
        meaning: 'Safe water is to the east. Pass east of it.', light: 'White, group flash (3)' },
      { type: 'south', color: 'yellow-over-black', topmark: '▼▼',
        meaning: 'Safe water is to the south. Pass south of it.', light: 'White, group flash (6) + long flash' },
      { type: 'west', color: 'yellow-black-yellow', topmark: '▼▲',
        meaning: 'Safe water is to the west. Pass west of it.', light: 'White, group flash (9)' }
    ],
    special: [
      { type: 'safe-water', color: 'red and white vertical stripes', shape: 'spherical or pillar',
        meaning: 'Open water all around — typically marks a fairway midchannel or harbor approach.',
        light: 'Morse "A" (.-) white' },
      { type: 'isolated-danger', color: 'black with red horizontal band', topmark: '●●',
        meaning: 'Isolated danger directly beneath/around the mark. Give it wide berth.',
        light: 'White, group flash (2)' }
    ]
  };

  // ───────────────────────────────────────────────────────────
  // DATA: COLREGS (rules of the road)
  // Plain-language summaries — for legal use, consult full text.
  // ───────────────────────────────────────────────────────────
  var COLREGS = [
    { rule: 'Rule 5', title: 'Look-out',
      plain: 'Every vessel must maintain a proper look-out by sight and hearing AND every other means appropriate. No phones, no autopilot without watch.' },
    { rule: 'Rule 6', title: 'Safe Speed',
      plain: 'Speed must allow you to take effective avoiding action and stop in a distance appropriate to conditions. In fog, slow down.' },
    { rule: 'Rule 12', title: 'Sailing Vessels — Encounter',
      plain: 'When two sailing vessels meet, the one with wind on the port side gives way. Most boaters won\'t need this.' },
    { rule: 'Rule 13', title: 'Overtaking',
      plain: 'Any vessel overtaking another must keep out of the way of the overtaken vessel. Period. Doesn\'t matter who has right of way otherwise.' },
    { rule: 'Rule 14', title: 'Head-on',
      plain: 'Two power vessels meeting head-on: both alter course to starboard (right) and pass port-to-port (left to left).' },
    { rule: 'Rule 15', title: 'Crossing',
      plain: 'Two power vessels crossing: the one with the OTHER vessel on her starboard (right) side is the "give-way" vessel and must alter course or speed.' },
    { rule: 'Rule 16', title: 'Give-way vessel',
      plain: 'If you\'re the give-way vessel, take EARLY and SUBSTANTIAL action to keep clear. Don\'t play chicken.' },
    { rule: 'Rule 17', title: 'Stand-on vessel',
      plain: 'If you\'re the stand-on vessel, hold course and speed. But if the give-way vessel doesn\'t act, you must take action to avoid collision.' },
    { rule: 'Rule 18', title: 'Hierarchy of responsibilities',
      plain: 'Power gives way to sail. Both give way to fishing vessels (actively fishing, gear out). All give way to vessels not under command or restricted in maneuverability.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: LOBSTER LICENSE LADDER (Maine DMR)
  // ───────────────────────────────────────────────────────────
  var LOBSTER_LICENSE = [
    { tier: 'Student', age: 'Under 18 (typically 8-17)', traps: 10,
      requires: 'No formal apprenticeship; must be Maine resident; held only while under 18.',
      role: 'Entry path for kids growing up around lobstering.' },
    { tier: 'Apprentice', age: '~16+ (varies)', traps: 0,
      requires: '2-year apprenticeship under a licensed lobsterman, ≥1000 hours documented on water + 200+ days fishing.',
      role: 'Mandatory step toward commercial license. Zone-dependent.' },
    { tier: 'Class I', age: '18+', traps: 800,
      requires: 'Commercial license after apprenticeship. Allows commercial sales.',
      role: 'Most common commercial tier. Limited entry per zone — waiting lists.' },
    { tier: 'Class II', age: '18+', traps: 800,
      requires: 'Allows you to bring a sternman (helper) on board.',
      role: 'Same trap limit as Class I but allows crew.' },
    { tier: 'Class III', age: '18+', traps: 800,
      requires: 'Allows two sternmen.', role: 'Largest crew tier.' },
    { tier: 'Non-commercial', age: 'Any (Maine resident)', traps: 5,
      requires: 'Recreational permit. NO sales allowed; for personal consumption only.',
      role: 'How most Mainers get their family lobster dinner.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: CAREER PATHWAYS
  // ───────────────────────────────────────────────────────────
  var CAREERS = [
    { id: 'sternman', title: 'Sternman / Stern-Person',
      desc: 'Crew member on a lobster boat. Bait bags, band claws, sort catch.',
      training: 'On-the-job; no formal credential. Stamina + balance matter.',
      pay: '$200-$500/day plus share of catch (varies by zone + season).',
      future: 'Often a path to apprenticeship + own license.' },
    { id: 'lobsterman', title: 'Lobsterman / Lobster Captain',
      desc: 'Owns a license + boat; manages 200-800 traps.',
      training: '2-year apprenticeship + DMR Class I-III license.',
      pay: 'Gross varies $50K–$300K+/yr depending on price, traps, weather, fuel.',
      future: 'Owner-operator small business. Climate change is reshuffling species ranges.' },
    { id: 'captain', title: 'Charter Captain',
      desc: 'Runs sport-fishing trips for paying clients.',
      training: 'USCG OUPV ("six-pack") or Master license + Coast Guard medical.',
      pay: '$400-$1500/trip; seasonal.', future: 'Tourism-tied; growing market.' },
    { id: 'observer', title: 'Fisheries Observer',
      desc: 'Rides commercial boats to record catch + bycatch data for NOAA.',
      training: 'BS in biology/fisheries + NOAA training program.',
      pay: '$35K-$55K/yr, often seasonal contract.',
      future: 'Pipeline to NOAA Fisheries career; tough conditions.' },
    { id: 'marineBiologist', title: 'Marine Biologist',
      desc: 'Research, stock assessment, habitat protection.',
      training: 'BS minimum; MS/PhD for research roles.',
      pay: '$45K-$110K+ depending on agency + degree.',
      future: 'Gulf of Maine Research Institute, NOAA NEFSC, UMaine, Bigelow Lab — Maine has strong cluster.' },
    { id: 'dmrOfficer', title: 'Marine Patrol Officer (DMR)',
      desc: 'Law enforcement on the water — license checks, gear measurements, slot enforcement.',
      training: 'Maine Criminal Justice Academy + DMR training; firearms qualified.',
      pay: '$55K-$85K + state benefits.', future: 'State law-enforcement career path.' },
    { id: 'processor', title: 'Fish / Lobster Processor',
      desc: 'Shoreside grading, packing, shipping to market.',
      training: 'On-the-job. Some certifications (HACCP food safety) help.',
      pay: '$16-$25/hr; seasonal peaks pay overtime.',
      future: 'Stepping-stone or full career. Plant management = higher ceiling.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: GLOSSARY
  // ───────────────────────────────────────────────────────────
  var GLOSSARY = [
    { term: 'gunwale (gun-ul)', def: 'The upper edge of a boat\'s side. Where you stand or grab when boarding.' },
    { term: 'gangion', def: 'The short branch line connecting a hook to a longline — also called a "snood" or "leader."' },
    { term: 'banding', def: 'Slipping rubber bands onto a lobster\'s claws to prevent it from injuring sorters + tank-mates.' },
    { term: 'v-notch', def: 'A v-shaped notch cut into the tail flipper of a female egg-bearing lobster. Marks her as a protected breeder for life. Maine\'s most important conservation tool.' },
    { term: 'slack tide', def: 'The brief period (~30 min) when tidal current changes direction — water is calm. Often the best fishing window.' },
    { term: 'lazaretto', def: 'A small below-decks storage compartment, usually in the stern. From "lazaret," Italian for storage.' },
    { term: 'parlor (lobster trap)', def: 'The second chamber of a lobster trap, where the lobster ends up after entering through the kitchen. Designed to make exit difficult.' },
    { term: 'kitchen (lobster trap)', def: 'The first chamber of a lobster trap, where the bait is. Lobster enters here.' },
    { term: 'COLREGS', def: 'COLlision REGulations — the international rules for preventing collisions at sea. Required knowledge for any boat operator.' },
    { term: 'fix (navigational)', def: 'A position determined by two or more bearings or other navigation data. "I got a fix off Portland Head Light and Ram Island."' },
    { term: 'bearing', def: 'The direction from your position to another object, measured in degrees from north. Used to plot fixes.' },
    { term: 'dead reckoning (DR)', def: 'Estimating position by adding course + speed + time to last known fix. Pre-GPS navigation. distance = speed × time.' },
    { term: 'PFD', def: 'Personal Flotation Device. Required on every boat for every person. Wear it.' },
    { term: 'EPIRB', def: 'Emergency Position-Indicating Radio Beacon. Activates in water + transmits location to satellites. Big-boat distress kit.' },
    { term: 'MAYDAY', def: 'International distress call meaning life-threatening emergency. From French "m\'aider" (help me). VHF Ch 16.' },
    { term: 'PAN-PAN', def: 'Urgent message — situation requires assistance but not immediately life-threatening. Lower than MAYDAY.' },
    { term: 'CH 16', def: 'VHF marine radio Channel 16 — the international distress + hailing channel. Always monitored when underway.' },
    { term: 'flood tide', def: 'Tide rising. Current flows INTO bays/estuaries.' },
    { term: 'ebb tide', def: 'Tide falling. Current flows OUT to sea.' },
    { term: 'set + drift', def: 'Set = direction current is flowing TO. Drift = speed of the current. Used to correct your course.' },
    { term: 'aft / forward / port / starboard', def: 'Aft = rear. Forward = front. Port = left when facing forward. Starboard = right when facing forward. Port + left both 4 letters — easy mnemonic.' },
    { term: 'bow', def: 'The front of the boat. Pronounced like "bow" (down) not "bow" (arrow).' },
    { term: 'stern', def: 'The back of the boat.' },
    { term: 'keel', def: 'The center spine of the hull running fore-to-aft. Provides directional stability.' },
    { term: 'IALA Region B', def: 'The buoyage system used in the Americas, Japan, Korea, and Philippines. Red-right-returning. Region A (Europe etc.) is reversed.' },
    { term: 'aposematic', def: 'Warning coloration in an animal — bright colors signaling toxicity or unpalatability. (e.g., lionfish striping.)' },
    { term: 'bycatch', def: 'Non-target species caught incidentally. Major sustainability concern in commercial fisheries.' },
    { term: 'MSY (Maximum Sustainable Yield)', def: 'The largest annual catch that can be removed from a stock without driving it to long-term decline. Foundation of fisheries management math.' },
    { term: 'TAC (Total Allowable Catch)', def: 'The quota set by managers for a stock + year. Divided into individual fishing quotas (IFQs) in some fisheries.' },
    { term: 'gangway', def: 'A ramp or walkway used for boarding. Loosely: any narrow passage on/around a vessel.' },
    { term: 'snood', def: 'The short branch line connecting a hook to a longline; same as gangion.' },
    { term: 'spawning aggregation', def: 'Where adult fish concentrate to reproduce. Often closed to fishing during peak window because catch efficiency + reproductive damage are both extreme.' },
    { term: 'recruitment', def: 'Process by which young fish survive + join the fishable population. "Strong recruitment year" = lots of survivors. Major control on stock recovery.' },
    { term: 'biomass', def: 'Total weight of a fish stock. Stock assessments report this in metric tons. "Spawning stock biomass" (SSB) is the biomass of mature breeders.' },
    { term: 'YPR', def: 'Yield Per Recruit — fisheries management metric calculating how much harvest you get per young fish entering the fishery. Optimized to balance harvest vs leaving enough for spawning.' },
    { term: 'ASMFC', def: 'Atlantic States Marine Fisheries Commission — coordinates fisheries management across the 15 Atlantic-coast states. Sets multi-state quotas + rules for migratory species like striped bass + sturgeon.' },
    { term: 'NEFMC', def: 'New England Fishery Management Council — federal body managing fisheries in N. Atlantic federal waters (3-200 nm offshore). One of 8 regional councils under MSA.' },
    { term: 'MSA', def: 'Magnuson-Stevens Act — the foundational US federal fisheries law. Created 200-nm EEZ + Regional Councils + science-based management.' },
    { term: 'EEZ', def: 'Exclusive Economic Zone — 3-200 nautical miles from baseline. Federal jurisdiction for fisheries.' },
    { term: 'state waters', def: '0-3 nautical miles from baseline (Maine, like most Atlantic states). State DMR manages fisheries here.' },
    { term: 'NOAA', def: 'National Oceanic + Atmospheric Administration — federal agency housing the National Marine Fisheries Service (NMFS), National Weather Service, etc.' },
    { term: 'WHO', def: 'World Health Organization. Not directly relevant but you\'ll see WHO-style closures referenced in some shellfish + ciguatera health alerts.' },
    { term: 'rocker', def: 'The fore-and-aft curvature of a boat\'s hull bottom. More rocker = better maneuverability; less rocker = better tracking.' },
    { term: 'displacement vs planing hull', def: 'Displacement hull pushes water aside + has speed cap by sqrt(length). Planing hull rides up on top of water at speed. Most Maine lobsterboats are semi-displacement (a hybrid).' },
    { term: 'fish finder / sonar', def: 'Echo-sounder that displays water depth + bottom + suspended objects (fish marks). Essential modern gear.' },
    { term: 'plotter', def: 'GPS chart display. Shows your position on electronic chart + lets you mark waypoints + tracks.' },
    { term: 'AIS', def: 'Automatic Identification System — VHF-based transmitter required on commercial vessels >65 ft. Broadcasts vessel ID + position. Receivers cheap; transmitters $500-$2000.' },
    { term: 'EPIRB', def: 'Emergency Position-Indicating Radio Beacon. Already in main glossary but worth knowing the full acronym.' },
    { term: 'PLB', def: 'Personal Locator Beacon — smaller version of EPIRB, registered to a person not a vessel. Worn on PFD.' },
    { term: 'roughage', def: 'Slang for inferior bait or chum (e.g., racks + carcasses) used to draw fish.' },
    { term: 'whaler', def: '(1) A small boat (Boston Whaler brand became generic). (2) Historic: a sailing vessel hunting whales (no longer in legal use).' },
    { term: 'wheelhouse', def: 'The enclosed cabin where the captain steers. Same as "pilothouse."' },
    { term: 'tiller', def: 'A wooden or metal handle attached to the rudder for steering small boats by hand.' },
    { term: 'davit', def: 'A small crane on deck for hoisting traps, anchors, or cargo.' },
    { term: 'pot-hauler', def: 'A hydraulic winch dedicated to pulling lobster traps. Speeds up the haul + reduces back injury.' },
    { term: 'high-stern', def: 'A lobster boat with a high transom (back end) that prevents waves from coming over the stern when running before a sea.' },
    { term: 'beam', def: 'Boat width at widest point. "Beamy" = wide; "narrow-beamed" = slim.' },
    { term: 'draft', def: 'How deep the boat sits in water. Critical for navigating shallows + Maine working harbors.' },
    { term: 'freeboard', def: 'Vertical distance from waterline to the lowest point on the deck. Higher freeboard = drier ride.' },
    { term: 'planing speed', def: 'Speed at which a planing hull lifts onto plane. Below it = displacement-mode; above it = much more efficient.' },
    { term: 'mooring', def: 'A permanent anchor + chain + buoy system for tying up a boat without anchoring. Most Maine harbors are mooring-based, not slip-based.' },
    { term: 'pennant', def: 'The short line from the mooring buoy that the boat ties to.' },
    { term: 'leeward / windward', def: 'Leeward = downwind. Windward = upwind. "On the lee shore" = dangerous: wind pushing you onto land.' },
    { term: 'rode', def: 'The anchor + chain + line system. "Rode out 5:1" means rode length 5× the water depth.' },
    { term: 'flukes', def: 'The angled grabbing parts of an anchor.' },
    { term: 'set the anchor', def: 'Process of letting the anchor dig in: lower it gently, pay out scope, let the wind/current pull boat back, then check for hold.' },
    { term: 'wind chill', def: 'How cold air feels at a given wind speed. Marine version critical at speed on cold days.' },
    { term: 'gunkholing', def: 'Cruising leisurely from harbor to harbor, exploring small coves. Maine\'s coast is a gunkholer\'s paradise.' },
    { term: 'roving', def: 'Slang for working multiple grounds in one trip — fishing here, then there, then there.' },
    { term: 'bycatch ratio', def: 'Bycatch weight ÷ target catch weight. Lower = more selective gear.' },
    { term: 'NSSP', def: 'National Shellfish Sanitation Program — federal program managing safety of harvested shellfish.' },
    { term: 'PSP', def: 'Paralytic Shellfish Poisoning — toxin from Alexandrium dinoflagellates accumulated in shellfish. Triggers closures.' },
    { term: 'DSP', def: 'Diarrhetic Shellfish Poisoning — okadaic acid; less common in Maine than PSP.' },
    { term: 'ASP', def: 'Amnesic Shellfish Poisoning — domoic acid; rare in Maine but monitored.' },
    { term: 'HAB', def: 'Harmful Algal Bloom — phytoplankton bloom producing toxins or causing oxygen depletion.' },
    { term: 'red tide', def: 'Common name for a HAB caused by red-pigmented dinoflagellates. Misleading — most HABs aren\'t red.' },
    { term: 'COLREGS Rule 13', def: 'Overtaking vessel must keep clear of overtaken vessel. ALWAYS. Doesn\'t matter who has right-of-way otherwise.' },
    { term: 'COLREGS Rule 14', def: 'Head-on rule: both alter to starboard, pass port-to-port.' },
    { term: 'COLREGS Rule 15', def: 'Crossing rule: the vessel with the OTHER on her starboard side gives way.' },
    { term: 'lat/lon', def: 'Latitude (N/S of equator, 0-90°) + Longitude (E/W of prime meridian, 0-180°). The "address" of any point on Earth.' },
    { term: 'GPS', def: 'Global Positioning System. Satellite-based positioning. Accurate to ~3 m. Backbone of modern marine nav.' },
    { term: 'magnetic vs true bearing', def: 'Magnetic = what your compass reads. True = relative to actual geographic North. Difference is "magnetic variation"; Maine is ~16°W variation. Charts mark both compass roses.' },
    { term: 'GMRI', def: 'Gulf of Maine Research Institute. Major Maine marine science org. Stock assessments + climate research.' },
    { term: 'NEFSC', def: 'NOAA Northeast Fisheries Science Center. Conducts stock assessments + ecosystem research for N Atlantic federal fisheries.' },
    { term: 'DMR', def: 'Maine Department of Marine Resources. State agency managing Maine state-waters fisheries + aquaculture + ports.' },
    { term: 'longshore current', def: 'Current parallel to the shore. Carries swimmers + debris along the beach. Critical safety knowledge for surf launches.' },
    { term: 'rip current', def: 'Narrow strong current flowing seaward through the surf zone. Common at beach openings + jetty edges. Swim parallel to shore to escape.' },
    { term: 'breakers', def: 'Waves breaking on shore or shoals. Type indicates bottom: spilling = sandy; plunging = rapid depth change; surging = steep slope.' },
    { term: 'fetch', def: 'The distance wind travels over open water before reaching you. Longer fetch = bigger waves.' },
    { term: 'sea state', def: 'Beaufort-scale assessment of wave conditions. 0 = calm; 4 = moderate; 8+ = gale.' },
    { term: 'transverse stability', def: 'Boat\'s resistance to rolling. Affected by hull shape + center of gravity + ballast.' },
    { term: 'longitudinal stability', def: 'Boat\'s resistance to pitching (fore-aft tipping). Less critical than transverse for most boats.' },
    { term: 'metacentric height', def: 'Naval architecture measure of stability. Higher = more stable but stiffer ride.' },
    { term: 'free surface effect', def: 'Liquid in a partly-full tank shifts with boat motion, destabilizing it. Mitigation: baffles in tanks.' },
    { term: 'transom', def: 'The flat back of the boat. Where the outboard motor mounts.' },
    { term: 'thwart', def: 'A crosswise seat in a small boat.' },
    { term: 'oarlock', def: 'A U-shaped fitting on a row boat\'s gunwale that holds the oar in place. Also called a "rowlock."' },
    { term: 'pintle + gudgeon', def: 'Hinge-pin (pintle) + receiver (gudgeon) system attaching rudder to transom on dinghies + sailboats.' },
    { term: 'shoal', def: 'A shallow underwater area. Common navigational hazard.' },
    { term: 'mud bottom', def: 'Soft sediment, typically in protected coves + estuaries.' },
    { term: 'rocky bottom', def: 'Hard rock-strewn bottom common on Maine ledges. Habitat for lobster, cod, kelp.' },
    { term: 'sandy bottom', def: 'Loose sediment in exposed flats. Habitat for flatfish + clams.' },
    { term: 'kelp forest', def: 'Underwater habitat dominated by kelp. Cold-water marine ecosystem.' },
    { term: 'urchin barren', def: 'Underwater area where sea urchins have grazed away kelp. Maine had widespread urchin barrens by 1990s after urchin boom + collapse.' },
    { term: 'lobster molt', def: 'Process of shedding old shell to grow. Lobster vulnerable for 2-7 days. "Soft-shell" lobsters cannot be commercially shipped.' },
    { term: 'shedder', def: 'A lobster in the soft-shell post-molt phase. Lower-priced + locally consumed in Maine.' },
    { term: 'hard-shell', def: 'Mature shell stage; commercially-shippable; commands higher prices.' },
    { term: 'cull', def: 'A lobster with one claw missing (often regrown smaller). Discounted at market.' },
    { term: 'pistol', def: 'A lobster with NO claws. Severely discounted; sometimes sold as "lobster meat."' },
    { term: 'banded', def: 'Lobster with bands on its claws. Required for shipping.' },
    { term: 'in the bait', def: 'Lobsterman slang for a productive trap (full of bait + lobster).' },
    { term: 'stripping', def: 'Removing lobsters from a trap.' },
    { term: 'sternman', def: 'Crew member on a lobster boat — bait bags, band claws, sort catch.' },
    { term: 'highliner', def: 'A lobsterman with consistently top-tier catches. Industry honor title.' },
    { term: 'limbecker', def: 'Maine slang for a fishing boat (origin uncertain).' },
    { term: 'longliner', def: 'A boat that uses longline gear (long horizontal line with many baited hooks).' },
    { term: 'tender', def: 'A small boat used as a "tender" for a larger vessel or fleet.' },
    { term: 'punt', def: 'A small flat-bottomed shore boat used as a tender.' },
    { term: 'lighter', def: 'A barge used to transfer cargo from larger ship to shore. Now usually mechanized.' },
    { term: 'reefer', def: 'Refrigerated transport (boat or truck). Critical cold-chain link.' },
    { term: 'haul', def: 'A single round of trap pulling + re-baiting + re-setting (lobstering).' },
    { term: 'lay', def: 'How a fisherman is compensated — percentage of catch value. "On a 30% lay" = 30% of catch revenue to a crew member.' },
    { term: 'boom', def: 'A horizontal spar from a mast, attached to the foot of a sail.' },
    { term: 'gaff', def: 'A spar holding the head of a four-sided sail. Also: a hook on a pole used to land big fish onboard.' },
    { term: 'mainsail', def: 'The largest sail on a sailboat, set behind the mast.' },
    { term: 'jib', def: 'A triangular sail set forward of the mast.' },
    { term: 'spinnaker', def: 'A large balloon-shaped downwind sail.' },
    { term: 'reef', def: '(1) To reduce sail area. "Single-reefed" = first reef set. (2) Underwater rocky ridge.' },
    { term: 'tack', def: 'A change in direction by turning the bow through the wind. Also: the lower forward corner of a sail.' },
    { term: 'jibe (gybe)', def: 'A change in direction by turning the stern through the wind. Faster but riskier than a tack.' },
    { term: 'close-hauled', def: 'Sailing as close to the wind as possible. Slowest point of sail; most demanding.' },
    { term: 'beam reach', def: 'Sailing with wind perpendicular to boat\'s direction. Often fastest + most comfortable.' },
    { term: 'broad reach', def: 'Sailing with wind aft of the beam. Fast + relaxing.' },
    { term: 'running', def: 'Sailing directly downwind. Risk of accidental jibe.' },
    { term: 'displacement', def: 'Weight of water a boat displaces = weight of the boat. Archimedes\' principle.' },
    { term: 'planing', def: 'When a boat rises onto its bow wave + skims rather than pushing water. Requires speed.' },
    { term: 'cruising speed', def: 'Most-economical-fuel speed below planing. Long-range speed.' },
    { term: 'WOT (wide-open throttle)', def: 'Maximum engine output. Used briefly for emergencies. Long-term WOT damages engines.' },
    { term: 'trim tab', def: 'Adjustable surface on stern to fine-tune boat\'s ride. Modern outboards have integrated trim.' },
    { term: 'pulpit', def: 'A raised railed platform at the bow or stern. Used for handling lines + sighting fish.' },
    { term: 'flying bridge', def: 'An elevated steering station above the cabin, for visibility while spotting fish or navigating shallow.' },
    { term: 'tower (tuna tower)', def: 'An even-higher steering + sighting platform for spotting offshore game fish.' },
    { term: 'outrigger', def: 'A pole that holds a fishing line out from the boat\'s beam, spreading multiple lines without tangle.' },
    { term: 'downrigger', def: 'A heavy lead weight + cable system that runs a fishing lure at a precise depth.' },
    { term: 'gaff hook', def: 'A pole with a sharp hook for landing large fish onboard.' },
    { term: 'priest', def: 'A short heavy club for humanely dispatching landed fish.' },
    { term: 'fillet knife', def: 'A flexible thin-bladed knife for filleting fish. Most prized: sharp, with a curved tip.' },
    { term: 'scaler', def: 'A tool for removing fish scales. Hand-held + mechanical versions.' },
    { term: 'whetstone', def: 'A sharpening stone for knives.' },
    { term: 'cleat (deck cleat)', def: 'A T-shaped metal fitting for securing lines.' },
    { term: 'bollard', def: 'A vertical post on a dock for tying up larger vessels.' },
    { term: 'pile (piling)', def: 'A vertical timber driven into the bottom; supports docks + serves as a tie-up.' },
    { term: 'wharf', def: 'A landing structure parallel to the shore.' },
    { term: 'pier', def: 'A landing structure projecting out into the water.' },
    { term: 'jetty', def: 'A protective wall extending into the water, often at a harbor entrance.' },
    { term: 'breakwater', def: 'An offshore structure designed to absorb wave energy + protect harbor.' },
    { term: 'fairlead', def: 'A hardware fitting that guides a line in the correct direction.' },
    { term: 'cleat hitch', def: 'The standard knot for securing a line to a horn cleat.' },
    { term: 'spring line', def: 'A diagonal dock line that prevents fore-and-aft motion of a moored boat.' },
    { term: 'bow line / stern line', def: 'Dock lines from bow + stern, respectively. Combined with spring lines for full security.' },
    { term: 'fender', def: 'A cushion (often inflatable) between boat + dock or another boat.' },
    { term: 'bumper', def: 'Old word for fender.' },
    { term: 'rub rail', def: 'Protective strip running along the gunwale where the boat meets dock or other boats.' },
    { term: 'scupper', def: 'A drain in the deck that lets water back out to the sea.' },
    { term: 'bilge', def: 'The lowest part of the boat\'s interior. Where water accumulates.' },
    { term: 'sole', def: 'The floor inside the boat (not the seafloor).' },
    { term: 'overhead', def: 'The ceiling inside the boat.' },
    { term: 'galley', def: 'The kitchen onboard.' },
    { term: 'head', def: 'The bathroom / toilet onboard.' },
    { term: 'cabin', def: 'Enclosed living area onboard.' },
    { term: 'V-berth', def: 'A triangular sleeping berth at the bow.' },
    { term: 'salon', def: 'The main living area onboard. Pronounced "saloon."' },
    { term: 'porthole', def: 'A small round window in the hull.' },
    { term: 'hatch', def: 'A door in the deck, leading below.' },
    { term: 'companionway', def: 'The main stairway/ladder from the deck to the cabin.' },
    { term: 'lazaret', def: 'A stowage compartment in the stern, below deck.' },
    { term: 'forepeak', def: 'Stowage compartment at the very bow.' },
    { term: 'snubber', def: 'A short line attached to an anchor rode to absorb shock + reduce wear.' },
    { term: 'kellet', def: 'A weight set partway down an anchor rode to improve hold + reduce horizontal pull.' },
    { term: 'sea anchor', def: 'A floating "parachute" deployed from the bow to slow a boat + hold it bow-into-wind. Storm tactic.' },
    { term: 'drogue', def: 'A drag device used to slow downwind motion or stabilize a boat in following seas.' },
    { term: 'jacklines', def: 'Strong lines run fore-and-aft on deck that crew clip into with harness tethers for safety.' },
    { term: 'tether', def: 'A short line connecting a sailor\'s harness to a jackline or fixed point.' },
    { term: 'harness', def: 'A wearable safety system clip-able to tethers + jacklines. Lifeline on big seas or at night.' },
    { term: 'man overboard (MOB)', def: 'A crew member fallen in the water. Immediate emergency response required. "Quick stop" maneuver is the modern standard.' },
    { term: 'Williamson turn', def: 'A specific search-and-rescue maneuver returning to the position of a MOB.' },
    { term: 'Lifesling', def: 'A floating sling on a line, deployed for a MOB to grab onto. Brand name + standard equipment.' },
    { term: 'thumper / horn', def: 'A loud audible signaling device for safety + fog.' },
    { term: 'whistle (athletic)', def: 'A backup signaling device for crew on PFDs.' },
    { term: 'strobe', def: 'A flashing white light used for night MOB or distress signaling.' },
    { term: 'reflective tape', def: 'Marine SOLAS tape on PFD + lifejacket. Lights up under searchlight.' },
    { term: 'hypothermia stages', def: '(1) Mild shivering, (2) Moderate confusion, (3) Severe inability to function, (4) Cardiac risk.' },
    { term: 'rewarming', def: 'Process of returning a hypothermic person to normal body temp. Slow + careful.' },
    { term: 'drowning vs near-drowning', def: 'Modern medical practice: "drowning" = fatal; "near-drowning" deprecated; better terms = drowning with various outcomes.' },
    { term: 'seasickness (motion sickness)', def: 'Vestibular response to ship motion. Affects ~30% of new boaters. Remedies: meclizine (Bonine), ginger, watch horizon, fresh air.' },
    { term: 'mal de mer', def: 'French for seasickness. Used in some sailing literature.' },
    { term: 'lee shore', def: 'A coastline downwind of you. Dangerous: a disabled boat will be blown ashore.' },
    { term: 'weather shore', def: 'A coastline upwind of you. Safer: provides wind protection.' },
    { term: 'gale', def: 'Wind 34-47 kt (Beaufort 8-9). Gale warning is a major event.' },
    { term: 'storm', def: 'Wind 48-63 kt (Beaufort 10-11). Storm warning is more severe than gale.' },
    { term: 'Beaufort scale', def: 'Wind speed estimation by observable effects. 0 = calm, 12 = hurricane.' },
    { term: 'NOAA Weather Radio', def: 'Public-service marine + land weather broadcast. Receivable on dedicated marine radio band.' },
    { term: 'GMDSS', def: 'Global Maritime Distress + Safety System. International distress communication framework.' },
    { term: 'DSC', def: 'Digital Selective Calling — modern VHF feature that can send automated distress with position via radio.' },
    { term: 'AIS class A vs B', def: 'AIS Class A = commercial, mandatory, 12.5W. AIS Class B = recreational, 2W, optional. Both broadcast position + identity.' },
    { term: 'ECDIS', def: 'Electronic Chart Display + Information System. Mandatory for many commercial vessels.' },
    { term: 'paper chart', def: 'Traditional printed nautical chart. Still required backup. NOAA produces.' },
    { term: 'plotter', def: 'A device or person that plots position on a chart.' },
    { term: 'log (book)', def: 'A record of voyage events: position, course, weather, observations. Required on commercial vessels.' },
    { term: 'fathom', def: 'A traditional unit of depth = 6 feet. Charts may show depths in fathoms or feet.' },
    { term: 'meter (depth)', def: 'SI unit. Modern charts often use meters.' },
    { term: 'sounding', def: 'A measurement of water depth.' },
    { term: 'shoal vs reef', def: 'Shoal = generic shallow area; reef = specifically a rocky underwater ridge.' },
    { term: 'tide pool', def: 'A pool of water left in intertidal rocks after low tide. Mini-ecosystem.' },
    { term: 'high water mark', def: 'The highest point reached by tide. Important property + access boundary in Maine colonial ordinance.' },
    { term: 'low water mark', def: 'The lowest point reached by tide.' },
    { term: 'spring tide', def: 'Tide with maximum range, occurring at full + new moons (sun + moon aligned).' },
    { term: 'neap tide', def: 'Tide with minimum range, occurring at quarter moons (sun + moon at 90°).' },
    { term: 'mean high water', def: 'The average of all high tides over a tidal cycle. NOAA datum.' },
    { term: 'mean low water', def: 'The average of all low tides. Common datum for chart depths.' },
    { term: 'datum', def: 'A reference level for measurements. Chart depths typically referenced to "mean lower low water" (MLLW).' },
    { term: 'tidal benchmark', def: 'A physical reference point near a tide station for surveys.' },
    { term: 'wake', def: 'The disturbed water trail left by a passing boat.' },
    { term: 'no-wake zone', def: 'An area where speed is limited to prevent wake damage. Common in harbors.' },
    { term: 'wash', def: 'Water disturbed by a propeller or hull motion.' },
    { term: 'idle speed', def: 'Lowest speed at which a boat maintains steerage. Required in many harbors.' },
    { term: 'header', def: 'A wind shift toward the bow on a sailing tack. Bad — points you off course.' },
    { term: 'lifter', def: 'A wind shift away from the bow. Good — points you on course.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: QUIZ
  // ───────────────────────────────────────────────────────────
  var QUIZ_QUESTIONS = [
    { q: 'You\'re entering Portland Harbor from sea. You see a red conical buoy ahead. Which side should you pass it on?',
      a: ['Port (left)', 'Starboard (right)', 'Either side', 'Stop and wait'], correct: 1,
      explain: '"Red Right Returning" — when returning to harbor in IALA Region B (North America), keep red marks on your starboard (right) side.' },
    { q: 'Two power vessels are meeting head-on. What should both do?',
      a: ['Both alter course to port', 'Both alter course to starboard', 'Smaller vessel gives way', 'Vessel on starboard tack stands on'], correct: 1,
      explain: 'COLREGS Rule 14: head-on meetings, both vessels alter course to starboard and pass port-to-port.' },
    { q: 'What does a v-notch on a female lobster\'s tail flipper signify?',
      a: ['She\'s undersized and must be released', 'She\'s a marked egg-bearer, protected for life', 'She belongs to a specific fisherman', 'She\'s diseased'], correct: 1,
      explain: 'The v-notch is Maine\'s key conservation tool — once a lobsterman finds an egg-bearing female, he notches her tail before releasing her. The notch protects her for life from being harvested, even when she\'s not visibly carrying eggs.' },
    { q: 'You\'re about to fish for striped bass in Maine. The fish you caught measures 33 inches. Can you keep it?',
      a: ['Yes, it\'s above the minimum size', 'No, it\'s above the slot upper limit', 'Yes, but only if it\'s a male', 'Only if you have a commercial license'], correct: 1,
      explain: 'Maine\'s striper slot is typically 28–31 inches. A 33-inch fish is above the slot upper limit and must be released. Slot limits protect the largest breeders.' },
    { q: 'In what tidal stage is fishing often best?',
      a: ['Peak high tide', 'Slack tide (change-over)', 'Lowest low tide', 'It doesn\'t matter'], correct: 1,
      explain: 'Slack tide (the ~30 min when current changes direction) is often the best fishing window — current calms, bait can hold position, predator fish move into shallower water to feed.' },
    { q: 'What is dead reckoning?',
      a: ['Predicting weather without instruments', 'Using GPS only at night', 'Estimating position from course + speed + time from last fix', 'Calling for help on VHF 16'], correct: 2,
      explain: 'Dead reckoning is the foundation of pre-GPS navigation: distance = speed × time. Crew tracks course steered + speed since the last known fix to estimate current position. Still taught and used as backup when electronics fail.' },
    { q: 'You hear another vessel call "MAYDAY MAYDAY MAYDAY" on Channel 16. What does this mean?',
      a: ['They are testing their radio', 'They want to chat', 'They have a life-threatening emergency', 'They are an unauthorized vessel'], correct: 2,
      explain: 'MAYDAY is the international distress signal indicating a grave + imminent threat to life. Channel 16 is the mandatory monitoring + distress channel for marine VHF.' },
    { q: 'What is "bycatch"?',
      a: ['Fish caught with bait', 'Non-target species caught incidentally', 'Catch from the side of the boat', 'Fish bought from the dock'], correct: 1,
      explain: 'Bycatch is one of the biggest sustainability concerns in commercial fishing. Different gear types have very different bycatch profiles — gillnets and longlines historically had high bycatch; rod-and-reel + trap gear are highly selective.' },
    { q: 'A green cylindrical buoy is called a:',
      a: ['Nun', 'Can', 'Sphere', 'Pillar'], correct: 1,
      explain: 'Cans are green + cylindrical; nuns are red + conical. The shape pairing with color is intentional — colorblind boaters can still navigate by shape alone.' },
    { q: 'You\'re overtaking a sailboat from behind in a power boat. Who has right of way?',
      a: ['You — power boats have priority', 'The sailboat — it\'s under sail', 'The overtaken vessel always has right of way', 'Whoever is faster'], correct: 2,
      explain: 'COLREGS Rule 13: ANY vessel overtaking another must keep out of the way of the overtaken vessel — regardless of vessel types. Overtaking is special.' },
    { q: 'In Maine, how is the lobster license tier system structured for newcomers?',
      a: ['Pay a fee and start fishing', 'Pass a written test only', '2-year apprenticeship under a licensed lobsterman + zone waitlist + Class I-III license', 'Inherit from a family member'], correct: 2,
      explain: 'Maine\'s entry pathway requires apprenticeship (≥1000 hours over 2 years), documentation, then a Class I-III license — and many zones have waiting lists with limited-entry permits.' },
    { q: 'You\'re anchored fishing. A power vessel under way is crossing your bow. Who has right of way?',
      a: ['You do — anchored vessels always do', 'The crossing vessel does', 'Whoever sees the other first', 'Neither — both must give way'], correct: 0,
      explain: 'An anchored vessel is not "under way" — the moving vessel must keep clear. (Strict COLREGS terminology: "under way" = not anchored, made fast, or aground.)' },
    { q: 'Why did Atlantic cod in the Gulf of Maine collapse?',
      a: ['Climate change only', 'Predation by seals', 'Decades of overfishing + slow recruitment + warming water', 'Disease outbreak'], correct: 2,
      explain: 'The cod collapse (especially documented on Grand Banks 1992) was driven primarily by sustained overfishing past biological limits. Slow recruitment + warming Gulf of Maine waters have hindered recovery. Stock is still under strict rebuilding plans.' },
    { q: 'What does a yellow-over-black cardinal mark indicate?',
      a: ['Safe water is north of the mark', 'Safe water is east of the mark', 'Safe water is south of the mark', 'Safe water is west of the mark'], correct: 2,
      explain: 'Yellow-over-black is a SOUTH cardinal mark — pass to the south. Memory aid: the points of the topmark triangles point in the safe direction.' },
    { q: 'Why are escape vents required in Maine lobster traps?',
      a: ['So lobsters can breathe', 'To let sub-legal lobsters escape', 'To keep crabs out', 'To equalize pressure at depth'], correct: 1,
      explain: 'Escape vents are sized so undersized lobsters can crawl out, reducing handling stress and post-release mortality. A trap that loses its catch on hauling has failed; a trap that pre-selects keeper size is good gear.' },
    { q: 'You\'re fishing in fog. What is the proper fog sound signal for a power-driven vessel underway?',
      a: ['Three short blasts every 60 seconds', 'One long blast every 2 minutes', 'A bell rung continuously', 'Five short blasts'], correct: 1,
      explain: 'COLREGS Rule 35: power-driven vessel underway sounds one prolonged blast (4-6 seconds) at intervals of no more than 2 minutes. Sail/towing/fishing/restricted = different patterns.' },
    { q: 'What is the difference between a "PAN-PAN" and a "MAYDAY" call?',
      a: ['No difference — both are distress', 'PAN-PAN is urgent but not life-threatening; MAYDAY is grave + imminent', 'PAN-PAN is for fishing vessels only', 'MAYDAY is for the Coast Guard only'], correct: 1,
      explain: 'PAN-PAN means urgency — situation requires assistance but not immediately life-threatening (e.g., disabled but stable). MAYDAY means grave + imminent threat to life. Both broadcast on Channel 16.' },
    { q: 'The Gulf of Maine has warmed at what rate compared to the global ocean?',
      a: ['About the same', '~2× faster', '~4× faster', '~10× faster'], correct: 2,
      explain: 'Pershing et al. 2015 documented warming at ~4× the global ocean rate during 2004-2013. This warming shapes everything from cod recruitment to lobster range shifts to black sea bass expansion north.' },
    { q: 'You\'re an apprentice lobsterman. How many hours of documented sea time are required before you can apply for your Class I license?',
      a: '500 hours over 2 years|1000 hours over 2 years|2000 hours over 5 years|No minimum'.split('|'),
      correct: 1,
      explain: 'Maine DMR apprentice program requires ≥1000 hours over 2 years documented on water under a licensed lobsterman. After that you join a zone waitlist — some zones (Stonington/Zone B) have multi-year waits.' },
    { q: 'Atlantic Sturgeon is federally:',
      a: ['Threatened', 'Endangered (Gulf of Maine DPS)', 'Recovered + huntable', 'Not assessed'], correct: 1,
      explain: 'Federally ENDANGERED under the ESA (2012 listing for the Gulf of Maine Distinct Population Segment). If caught: release immediately, minimal handling. Never target.' },
    { q: 'Green crabs are:',
      a: ['Native to Maine + abundant', 'A protected species', 'An invasive species devastating clam flats', 'A favorite food fish'], correct: 2,
      explain: 'Carcinus maenas is invasive in Maine. They eat juvenile clams + destroy eelgrass. They\'re also the BEST bait for tautog — fishermen + clammers both benefit from removing them.' },
    { q: 'What is the standard Maine lobster minimum size (carapace measure)?',
      a: ['3" carapace', '3-1/4" carapace', '4" carapace', '5" carapace'], correct: 1,
      explain: 'Maine minimum is 3-1/4" carapace (front of eye socket to back of body shell). MAXIMUM is 5" — fish larger than that must also be released (protects breeders). Gauged with brass measure on every haul.' },
    { q: 'Which Maine port is the #1 lobster port by landings?',
      a: ['Portland', 'Boothbay Harbor', 'Stonington', 'Eastport'], correct: 2,
      explain: 'Stonington (on Deer Isle) has been Maine\'s #1 lobster port by landings for years. Maine\'s largest working waterfront overall is Portland; Stonington is more focused.' },
    { q: 'What direction does the tide flow during a flood tide?',
      a: ['Out of bays toward sea', 'Into bays from sea', 'Parallel to shore', 'It depends on the moon phase'], correct: 1,
      explain: 'Flood = tide rising. Current flows INTO bays/estuaries from open sea. Ebb is the opposite (flowing out). "Slack" = brief change-over period.' },
    { q: 'A circle hook is preferred over a J-hook for catch-and-release because:',
      a: ['Easier to remove from hands', 'Hooks fish in the corner of the mouth rather than gut-hooking', 'Doesn\'t rust', 'Catches more fish'], correct: 1,
      explain: 'Circle hook geometry forces the hook to set in the corner of the mouth (jaw hinge) rather than deep in the throat or gut. Drastically reduces release mortality. Striped bass regulations now mandate circle hooks for bait fishing.' },
    { q: 'You see a buoy with a black-over-yellow color scheme + two upward-pointing cone topmarks. What does this signify?',
      a: ['Safe water all around', 'Isolated danger', 'North cardinal — pass to the north', 'South cardinal — pass to the south'], correct: 2,
      explain: 'Cardinal marks indicate the safe quadrant. Black-over-yellow with two upward-pointing cones (▲▲) = NORTH cardinal — pass to the north of the mark. Memory aid: cone points point in the safe direction.' },
    { q: 'You\'re sailing under wind power. A power boat is crossing your bow. Per COLREGS, who is the give-way vessel?',
      a: ['You — sailing vessels always give way', 'The power boat — sail has right-of-way over power', 'Depends on size', 'Both vessels share responsibility equally'], correct: 1,
      explain: 'COLREGS Rule 18: power gives way to sail (unless the sailboat is overtaking, fishing, or restricted maneuverability). The power vessel must take action to avoid the sailboat.' },
    { q: 'What protein gland do mussels use to attach to rope?',
      a: ['Pedal gland', 'Salivary gland', 'Byssal gland (producing byssal threads)', 'Adhesive cement gland'], correct: 2,
      explain: 'Mussels secrete byssal threads from a gland in their muscular foot. These thread bundles cement them to substrate. (Note: cross-reference with AquacultureLab.)' },
    { q: 'What is "dead reckoning" navigation?',
      a: ['Calculating tides using the moon', 'Using GPS only', 'Estimating position from course + speed + time since last fix', 'Steering by stars at night'], correct: 2,
      explain: 'DR = distance + direction since last fix. Distance = speed × time. Direction = compass course (with magnetic-vs-true correction). When GPS fails or in fog, DR is your backup. Required Coast Guard licensing material.' },
    { q: 'Maine\'s elver (baby eel) fishery is most distinctive because:',
      a: ['Catches are huge by weight', 'License-holders are limited to ~425 + the per-pound price is among the highest in any US fishery', 'No license is required', 'Catches go to Maine restaurants'], correct: 1,
      explain: 'Maine\'s elver fishery is tiny by volume but commands $2,000-$3,000+ per pound in good years (premium goes to Asian eel-farming markets). Limited to ~425 licenses + strict quotas + heavy enforcement against poaching.' },
    { q: 'The North Atlantic Right Whale is currently:',
      a: ['Recovering rapidly', 'Stable', 'Critically endangered (~340 individuals)', 'Extinct'], correct: 2,
      explain: 'Population is ~340 individuals (decreasing). Maine lobster gear entanglement is a major mortality cause. New "ropeless gear" rules + seasonal closures are reshaping the Maine fleet.' },
    { q: 'Which Wabanaki nation has traditional territory along the Penobscot River watershed?',
      a: ['Passamaquoddy', 'Penobscot', 'Maliseet', 'Mi\'kmaq'], correct: 1,
      explain: 'Penobscot Nation\'s traditional territory is the Penobscot River watershed. The other three nations of the Wabanaki Confederacy have neighboring territories: Passamaquoddy (eastern Maine), Maliseet (St. John River), Mi\'kmaq (eastern Maine + Maritimes).' },
    { q: 'You\'re anchored in shallow water + a storm is rolling in. Your anchor rode should be set to about what scope?',
      a: ['1:1 (same length as depth)', '3:1', '7:1 to 10:1', '15:1 to 20:1'], correct: 2,
      explain: '7:1 to 10:1 ratio (rode length to water depth + freeboard) for storm conditions. Routine fair-weather anchoring is more like 5:1.' },
    { q: 'The "kitchen" and "parlor" in a lobster trap refer to:',
      a: ['Two boat areas', 'Two chambers of the trap (entry + holding)', 'Bait storage', 'Cooking space onboard'], correct: 1,
      explain: 'Kitchen = first chamber with bait. Parlor = second chamber where lobster ends up (and where exit is difficult). Both have escape vents for sub-legal lobsters.' },
    { q: 'When sounded together, three short blasts on a vessel\'s whistle means:',
      a: ['Coming about to starboard', 'Coming about to port', 'I am operating astern propulsion', 'In distress'], correct: 2,
      explain: 'Per Inland Navigation Rules: three short blasts (~1 sec each) = "I am operating astern propulsion" (i.e., backing down). One short = altering course to starboard; two short = altering course to port.' },
    { q: 'Why was Atlantic cod collapse on the Grand Banks in 1992 catastrophic + lasting?',
      a: ['Climate change alone', 'Decades of overfishing past biological recovery rates + slow growth = stocks can\'t bounce back quickly', 'Disease', 'Predation by seals'], correct: 1,
      explain: 'Even after the 1992 moratorium, cod populations have not fully recovered 30+ years later. Long-lived + late-maturing + cold-water = recovery measured in human generations, not seasons.' },
    { q: 'What is "v-notching" + why is it Maine\'s most distinctive lobster conservation tool?',
      a: ['A trap measurement; standardizes gear', 'A V-shaped cut on egg-bearing female tail flippers; protects her from harvest for LIFE', 'A scoring system for catch quality', 'A boat measurement'], correct: 1,
      explain: 'V-notch: lobstermen cut a V into the tail flipper of any egg-bearing female, then release her. Once notched, she\'s permanently protected from harvest, even years later when she\'s no longer carrying. Maine\'s self-enforced conservation tool — adopted as federal rule in 1985.' },
    { q: 'A "safe water" mark (red + white vertical stripes, spherical) indicates:',
      a: ['Danger zone — avoid', 'Restricted military area', 'Open water all around — typically marks a fairway or midchannel approach', 'Cable or pipeline below'], correct: 2,
      explain: 'Safe water marks (red + white vertical stripes) mean open water all around. Often mark fairway approaches or midchannel. Pass on either side.' },
    { q: 'In Maine, when does the alewife river run typically peak?',
      a: ['January', 'Early-mid May', 'July', 'November'], correct: 1,
      explain: 'Alewife runs peak mid-April through early-June in Maine, with most rivers cresting in early-mid May. Massive ecological + cultural events — the runs feed everything from osprey to striper.' },
    { q: 'You\'re fishing inshore + see a vessel displaying two black "balls" hanging vertically. What does this mean?',
      a: ['Vessel at anchor', 'Vessel not under command (cannot maneuver — give way)', 'Fishing vessel', 'Pilot vessel'], correct: 1,
      explain: 'Two black ball day shapes = "not under command" — vessel can\'t maneuver. All other traffic must give way. (Single ball = anchored.) Day shapes are visual COLREGS — same info as night lights.' },
    { q: 'Knot tying: which knot is BEST for joining a fishing line to a hook eye while retaining max line strength?',
      a: ['Bowline', 'Sheet bend', 'Palomar knot', 'Square knot'], correct: 2,
      explain: 'Palomar retains ~95% of line strength. Industry-standard terminal knot for braid + mono. Bowline + sheet bend are line-to-loop / line-to-line knots. Square knot is for equal-diameter rope, not fishing line.' },
    { q: 'Black sea bass appearing reliably in Maine waters is an indicator of:',
      a: ['Improved water quality', 'Pollution', 'Climate-driven range shift north', 'Overstocking by hatcheries'], correct: 2,
      explain: 'Black sea bass historically range Chesapeake to NJ. Maine landings have grown 10×+ in past decade as warming Gulf of Maine pushes them north. They\'re now a regular catch in southern Maine.' },
    { q: 'In an emergency, which VHF channel should you ALWAYS use for distress?',
      a: ['Channel 9', 'Channel 16', 'Channel 22A', 'Any clear channel'], correct: 1,
      explain: 'Channel 16 (156.8 MHz) is the international maritime distress + hailing channel. Required monitoring when underway. Coast Guard answers. Channel 9 is alternate hailing; 22A is the USCG working channel after initial hail on 16.' },
    { q: 'You\'re overtaking a sailboat in your power boat. Which COLREGS rule governs?',
      a: ['Rule 14 (head-on)', 'Rule 13 (overtaking) — you must keep clear regardless', 'Rule 15 (crossing)', 'Rule 18 (hierarchy)'], correct: 1,
      explain: 'COLREGS Rule 13: overtaking vessel must keep clear of overtaken vessel — ALWAYS, regardless of vessel type. Overtaking is a special case overriding the hierarchy.' },
    { q: 'What is "MLLW" + why does it matter on a chart?',
      a: ['Maximum low-water level — high tide', 'Mean Lower Low Water — datum for chart depths', 'Maine Lobster Logbook Worksheet', 'A type of buoy'], correct: 1,
      explain: 'MLLW = Mean Lower Low Water. The reference datum for chart depths. When a chart shows "10 m," it\'s 10 m at MLLW; at high tide, water is deeper.' },
    { q: 'You\'re anchoring. The water is 20 ft deep. What\'s a safe scope for a normal-weather day?',
      a: ['1:1 (20 ft of line)', '3:1 (60 ft)', '5:1 (100 ft)', '10:1 (200 ft)'], correct: 2,
      explain: '5:1 is the fair-weather standard. 7:1+ for storms. 10:1 for hurricanes.' },
    { q: 'Why is the Gulf of Maine warming faster than the global ocean?',
      a: ['Pollution', 'Multiple climate factors: shifting currents (Gulf Stream + Labrador Current), shallow geography, low water exchange', 'Solar radiation', 'No one knows'], correct: 1,
      explain: 'The Gulf of Maine is semi-enclosed, shallow, and at the intersection of warm Gulf Stream + cold Labrador Current. Climate shifts these currents + reduces cold-water input. The result: ~4× global warming rate.' },
    { q: 'What is the difference between a "fix" + a "DR position"?',
      a: ['No difference', 'Fix = position from observations (GPS, bearings); DR = estimated from course + speed + time', 'Fix is at sea; DR on land', 'Fix uses paper; DR uses electronics'], correct: 1,
      explain: 'A "fix" is a precisely-known position (from GPS, celestial sights, or bearings to known landmarks). A "DR position" (dead reckoning) is estimated by adding course + speed + time to the last fix. Fix is more accurate; DR is your continuous estimate between fixes.' },
    { q: 'You\'re fishing inshore + see a vessel showing only a green sidelight + a white masthead light. The vessel is approaching from your starboard. Per COLREGS, what is your role?',
      a: ['Give-way (you must alter course)', 'Stand-on (maintain course + speed)', 'Both equal — both must alter', 'Doesn\'t apply at night'], correct: 1,
      explain: 'You see the OTHER vessel\'s green sidelight = they\'re on YOUR starboard. Per Rule 15 (crossing), the vessel that has the OTHER on her starboard is the give-way vessel. So THEY give way; YOU stand on (maintain course + speed). But under Rule 17, you must still take action if collision becomes imminent.' },
    { q: 'What is a "lee shore" + why is it dangerous?',
      a: ['Sheltered coastline — not dangerous', 'A coastline downwind of you — disabled boats are blown onto it', 'Tax-exempt coastline', 'Federally-protected coastline'], correct: 1,
      explain: 'Lee shore = downwind coastline. If your engine fails or sail dismasts, wind pushes you toward shore. Major historical danger. "Hard a-port off a lee shore" was a classic command.' },
    { q: 'A sea-run alewife migrates between:',
      a: ['Cold + warm waters seasonally', 'Surface + bottom', 'Saltwater (adult) + freshwater (spawning)', 'Maine + Florida'], correct: 2,
      explain: 'Alewives are anadromous: adults live in saltwater, spawn in freshwater. They run up Maine rivers each spring in massive numbers, feeding seabirds + carrying nutrients inland.' },
    { q: 'You\'re cleaning a fish. The fish has a smooth body with no scales, dark blue back fading to white belly, and an extending jaw. What is it most likely?',
      a: ['Cod', 'Mackerel', 'Bluefish', 'Striped bass'], correct: 2,
      explain: 'Bluefish: sleek + scaly body, dark blue-green back, silvery flanks, and DEEP teeth. Wire leader required because they bite through monofilament.' },
    { q: 'What does "displacement" mean for a boat?',
      a: ['Speed', 'Weight of water the boat displaces (equal to boat\'s weight)', 'Distance traveled', 'Engine size'], correct: 1,
      explain: 'Archimedes\' principle: a floating boat displaces water equal to its weight. Displacement hulls plow through water; planing hulls rise above. Maine lobsterboats are usually semi-displacement.' },
    { q: 'You\'re a Maine lobsterman. You haul a trap with a female lobster carrying eggs ("berried"). What MUST you do?',
      a: ['Sell it as premium quality', 'Cut a v-notch on the tail flipper + release', 'Keep it for breeding', 'Discard the eggs + keep the lobster'], correct: 1,
      explain: 'Maine law: any female lobster carrying eggs must be v-notched + released. The v-notch protects her for life from being harvested, even years later when not visibly carrying. Self-enforced conservation that has worked for decades.' },
    { q: 'Which species is currently MOST climate-vulnerable in the Gulf of Maine according to NEFSC?',
      a: ['Lobster', 'Cod', 'Striped Bass', 'Pollock'], correct: 1,
      explain: 'Cod is highly vulnerable. Already collapsed; cannot recover under current warming because larvae develop poorly in warmer water. Lobster is currently climate-positive (range shifted north + thriving) but eventually will face the same northward shift.' },
    { q: 'A vessel displaying ONE black ball (day-shape) is:',
      a: ['Fishing', 'At anchor', 'Not under command', 'Restricted in ability to maneuver'], correct: 1,
      explain: 'Single black ball = at anchor. Two balls = not under command. Day-shapes convey the same info as nighttime lights — same rules apply to your response.' },
    { q: 'What is the proper sequence to call MAYDAY on VHF?',
      a: ['Switch to Ch 22A first, then call', 'MAYDAY × 3, then "This is [vessel name] × 3" then position + nature of emergency + people aboard + vessel description', 'Just shout "HELP"', 'Use cell phone first'], correct: 1,
      explain: 'Standard MAYDAY sequence: triple-call MAYDAY (×3), then triple identify your vessel (×3), then position (lat/lon or bearing-distance from landmark), then nature of emergency, then number of persons aboard, then vessel description. Then "Standing by Channel 16." Wait for Coast Guard.' },
    { q: 'Why are forage fish like menhaden + alewife important?',
      a: ['They make good bait only', 'They are foundational prey for predatory fish + seabirds + whales', 'They are sport fish', 'They are aquaculture species'], correct: 1,
      explain: 'Forage fish are ecosystem foundation. Stripers, bluefish, cod, tuna, seabirds, whales — all depend on healthy menhaden + alewife populations. Industrial-scale menhaden harvest threatens this base.' },
    { q: 'A "v-notched" lobster:',
      a: ['Is undersized', 'Is permanently protected from harvest', 'Has a disease', 'Is a male'], correct: 1,
      explain: 'A v-notched lobster (always female, originally egg-bearing) cannot be harvested even when not currently carrying eggs. The notch persists through several molts. Maine\'s distinctive conservation tool.' },
    { q: 'What does "set + drift" mean to a mariner?',
      a: ['Boat\'s speed + heading', 'Direction the current is flowing TO (set) + the current\'s speed (drift)', 'Tide stage', 'Anchor specifications'], correct: 1,
      explain: 'Set + drift are the current vector. Set = direction. Drift = speed. Must correct your boat\'s heading to account for current, especially when navigating in tidal flow.' },
    { q: 'Maine\'s commercial lobster fishery is:',
      a: ['Open-entry', 'Limited-entry (license + 5:1 retire:new ratio in some zones)', 'Federally managed', 'Quota-based with no licenses'], correct: 1,
      explain: 'Maine lobster is LIMITED-ENTRY. New licenses issued at a slow rate (often 5 retirements : 1 new license). Multi-year waitlists in popular zones. The barrier to entry is a feature, not a bug — it preserves the resource.' },
    { q: 'A vessel restricted in ability to maneuver (e.g., laying cable) shows what day-shapes?',
      a: ['One black ball', 'Two black balls', 'Ball-diamond-ball (BD-B vertical)', 'Cone-up'], correct: 2,
      explain: 'Ball-Diamond-Ball (three shapes hung vertically) = restricted in ability to maneuver. Other traffic gives way + keeps clear.' },
    { q: 'You\'re fishing for striper from a beach. Tide is starting to flood. What does this mean for fishing?',
      a: ['Stop — fish gone', 'Often better fishing as fish move shoreward chasing bait', 'No effect', 'Only fish at high tide'], correct: 1,
      explain: 'Stripers often follow forage onto flats as flood tide brings food + cover. "First hour of flood" is a classic productive window.' },
    { q: 'A circle hook is preferred over a J-hook because it:',
      a: ['Catches more fish', 'Reduces gut-hooking + release mortality by setting in the jaw hinge', 'Doesn\'t rust', 'Is easier to tie'], correct: 1,
      explain: 'Circle hook geometry rotates to hook in the corner of the mouth, NOT the throat or stomach. Drastically reduces post-release mortality on catch-and-release species like striped bass.' },
    { q: 'Maine\'s Title 12 governs:',
      a: ['Highway transportation', 'State-level conservation laws (fisheries + marine resources)', 'Federal taxes', 'Educational standards'], correct: 1,
      explain: 'Maine Title 12 is the state\'s primary conservation law statute. DMR enforces. Topics: licensing, gear regs, seasons, marine patrol.' },
    { q: 'The Magnuson-Stevens Act (MSA) created what regulatory structure?',
      a: ['State waters only', '200-nm EEZ + 8 Regional Fishery Management Councils', 'International waters', 'Fishing tax'], correct: 1,
      explain: 'MSA (1976, amended 2006) created the US 200-nm Exclusive Economic Zone + 8 Regional Councils (NEFMC is ours). Foundation of US federal fisheries management.' },
    { q: 'A "give-way" vessel in COLREGS Rule 15 (crossing):',
      a: ['Maintains course + speed', 'Takes early + substantial action to keep clear', 'Stops + lets the other pass', 'Sounds horn + continues'], correct: 1,
      explain: 'Rule 15: when two power vessels cross, the one with the OTHER on its starboard side is give-way. Rule 16: give-way must take EARLY + SUBSTANTIAL action to keep clear.' },
    { q: 'What is "barotrauma" in fish?',
      a: ['Pressure injury when fish brought up from depth', 'Temperature shock', 'Hook injury', 'Net injury'], correct: 0,
      explain: 'Barotrauma is injury from rapid pressure change. Fish caught at depth + brought up quickly suffer swim-bladder rupture + organ damage. Especially affects cod, rockfish, deep-water species. Release devices help reduce mortality.' },
    { q: 'You\'re fishing offshore. A whale surfaces 100 m from your boat. Per MMPA, what should you do?',
      a: ['Approach to take photos', 'Maintain distance per NOAA guidelines (usually 100 m+) + don\'t pursue', 'Drive away rapidly', 'Throw food to attract closer'], correct: 1,
      explain: 'Marine Mammal Protection Act prohibits harassment of whales. NOAA whale-watching guidelines: maintain safe distance, don\'t pursue, slow speed, don\'t cross their path. For right whales (endangered): 500 yards minimum.' },
    { q: 'Maine\'s sardine fishery:',
      a: ['Currently booming', 'Major historical industry that collapsed; last cannery closed 2010', 'Federal-only', 'Aquaculture-based'], correct: 1,
      explain: 'Maine had 75+ sardine canneries at peak (early 1900s). The industry collapsed mid-20th century from cannery automation + supply decline. Stinson Cannery in Prospect Harbor was the last, closing 2010.' },
    { q: 'Why is the Maine Implementing Act of 1980 important?',
      a: ['Created Maine DMR', 'Defines ongoing tribal sovereignty + fishing rights in Maine waters', 'Established lobster zones', 'Created the state of Maine'], correct: 1,
      explain: 'The Maine Indian Claims Settlement Act + Maine Implementing Act of 1980 settled major land claims + defined ongoing tribal sovereignty + fishing rights. Subject of continuing legal + cultural conversations.' },
    { q: 'A "tide rip" forms where:',
      a: ['Waves break on beach', 'Strong current meets opposing wind or bottom topography, creating turbulent water', 'High tide changes to low', 'Two boats meet'], correct: 1,
      explain: 'Tide rips form at strong-current locations meeting opposing wind or bottom features. Rough water + good fishing simultaneously (predators feed on disoriented prey). Examples: Reversing Falls + Pemaquid Point.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MISSIONS
  // ───────────────────────────────────────────────────────────
  var MISSIONS = [
    { id: 'mission-1', title: 'First Cast: Cod off Halfway Rock',
      brief: 'Cast off from Custom House Wharf. Navigate the harbor channel correctly (red-right-returning). Reach Halfway Rock and land one keeper cod (≥22"). Return before sundown.',
      objectives: [
        'Cast off (untie + check fuel/forecast/tide)',
        'Pass at least one red nun on your starboard side outbound',
        'Reach Halfway Rock waypoint (visible marker in scene)',
        'Land at least one cod ≥22"',
        'Return to wharf'
      ],
      scoring: { time: 'minutes elapsed (less = better)', regsViolations: 'cumulative — affects final score', fishCorrectness: 'right size to keep?' },
      reward: 'Unlocks Mission 2 + adds first species to your Life Log.' },
    { id: 'mission-2', title: 'Lobster Trap Haul: Apprentice Day',
      brief: 'You\'re crewing for a licensed lobsterman. Haul 5 traps along the Cape Elizabeth ledge. Measure every lobster, v-notch egg-bearers, band keepers, return shorts + over-sized + v-notched females.',
      objectives: [
        'Reach the trap line (follow the green floating buoys with your license tag color)',
        'Haul + measure each lobster (carapace gauge)',
        'V-notch any egg-bearing female before release',
        'Return all sub-legal + oversized + v-notched lobsters',
        'Band claws of keepers',
        'Score 90%+ on conservation compliance'
      ],
      scoring: { conservationCorrect: 'pct of lobsters correctly handled' },
      reward: 'Unlocks Mission 3 + access to lobsterman career detail.' },
    { id: 'mission-3', title: 'Striper Slot Decision',
      brief: 'May 15 — striper run is on. Cast off in your skiff, work the Casco Bay flats. Land 1 keeper striper, releasing every fish outside the 28–31" slot.',
      objectives: [
        'Cast off + navigate to a flat',
        'Land at least 3 stripers',
        'Correctly release any fish outside the 28–31" slot',
        'Keep exactly 1 keeper if slot fish is landed'
      ],
      scoring: { slotCompliance: 'every fish correctly handled' },
      reward: 'Unlocks Free Sim Mode.' },
    { id: 'mission-4', title: 'Fog Run from Halfway',
      brief: 'June. You\'re at the fishing grounds when fog rolls in fast. Visibility drops to under 200 m. Navigate home safely using compass, GPS chart, sound signals, and reduced speed.',
      objectives: [
        'Reduce speed to safe per COLREGS Rule 6',
        'Sound proper fog signal (long blast every 2 min)',
        'Maintain VHF Ch 16 monitoring',
        'Use compass bearing + dead reckoning to return',
        'Dock without collision'
      ],
      reward: 'Unlocks Fog Operations card + Storm Run mission.' },
    { id: 'mission-5', title: 'Storm Run',
      brief: 'Forecast: small craft advisory by 2pm. You\'ve been out since dawn. Storm clouds visible to the SW. Decision tree: run for port or anchor in lee?',
      objectives: [
        'Read the forecast correctly',
        'Make the call BEFORE wind reaches 20 kt sustained',
        'Run to safe harbor (Cape Elizabeth) OR anchor in protected cove',
        'Maintain steerage + crew safety'
      ],
      reward: 'Unlocks Weather card + Captain\'s Decision rating.' },
    { id: 'mission-6', title: 'Dragger Crossing — COLREGS Test',
      brief: 'You\'re heading out of harbor. A large commercial dragger is overtaking on your starboard quarter, drifting toward your course line. Apply COLREGS correctly.',
      objectives: [
        'Identify which Rule applies (overtaking vs crossing)',
        'Identify give-way vs stand-on vessel',
        'Take EARLY + SUBSTANTIAL action (Rule 16) if you\'re give-way',
        'Avoid the close-quarters encounter'
      ],
      reward: 'COLREGS Bronze card.' },
    { id: 'mission-7', title: 'Bluefin Tuna Charter',
      brief: 'You\'re first mate on a charter targeting bluefin tuna off Cashes Ledge. Steam out 60 nm, fish chunk + live-bait, fight + land safely. Multi-hour mission.',
      objectives: [
        'Cast off + clear inshore traffic',
        'Reach Cashes Ledge (NW heading)',
        'Set chunk slick + bait rigs',
        'Hook + land at least 1 tuna in slot',
        'Tag + record per HMS rules',
        'Return safely'
      ],
      reward: 'Tuna Charter Bronze.' },
    { id: 'mission-8', title: 'Apprentice Day II — Trap Maintenance',
      brief: 'You\'ve served 6 months as an apprentice. Today: pull, clean, re-bait + re-set 30 traps. Replace broken laths, check escape vents, log catch.',
      objectives: [
        'Pull all 30 traps',
        'Inspect for damaged components',
        'Replace bait bags',
        'Re-deploy in correct depth + bottom type',
        'Maintain accurate catch log'
      ],
      reward: 'Lobster Apprenticeship progress + Trap Maintenance card.' },
    { id: 'mission-9', title: 'Mayday Response',
      brief: 'You hear a MAYDAY on Channel 16. Vessel taking on water in Eastern Way. You\'re the closest boat. Coordinate response with Coast Guard.',
      objectives: [
        'Acknowledge MAYDAY relay (only if Coast Guard can\'t hear them)',
        'Plot fastest course to distressed vessel',
        'Maintain communication with USCG Group Boston',
        'Render assistance per their direction',
        'Document everything'
      ],
      reward: 'Mayday Responder card.' },
    { id: 'mission-10', title: 'Right Whale Avoidance',
      brief: 'You\'re lobstering off Cape Cod Bay. NOAA reports right whale sightings in your area. Coordinate gear retrieval + avoid the closed-zone area.',
      objectives: [
        'Check current NOAA right whale closure bulletin',
        'Plot a course that avoids the closure',
        'Retrieve any gear inside the closure',
        'Use ropeless or break-link compliant gear'
      ],
      reward: 'Climate-conscious card.' },
    { id: 'mission-11', title: 'Smelt Run on the Sheepscot',
      brief: 'April. Smelt are running up the Sheepscot. You have a dip-net permit. Wade carefully + harvest sustainably + tag.',
      objectives: [
        'Reach allowed dipping area (regulations posted)',
        'Use dip net correctly',
        'Stay within bag limit',
        'Practice catch-and-release of any non-target species'
      ],
      reward: 'Sea-run Steward card.' },
    { id: 'mission-12', title: 'Cashes Ledge Cod Closure',
      brief: 'You\'re cod fishing in late spring. Cashes Ledge has a closure to protect spawning aggregations. Plan a legal alternative.',
      objectives: [
        'Identify the closed area on chart',
        'Plot alternative legal fishing waypoints',
        'Reach + fish a legal area',
        'Land + correctly process at least 1 cod'
      ],
      reward: 'Closure-aware card.' },
    { id: 'mission-13', title: 'Free Sim — Casco Bay Day',
      brief: 'Open mode. No mission cards. Cast off, fish where you want, log what you catch. The simulator will track + score voluntary stewardship behavior.',
      objectives: [
        'Cast off',
        'Fish at least one location',
        'Return + log'
      ],
      reward: 'Personal life-log entries.' }
  ];

  // ───────────────────────────────────────────────────────────
  // STATE
  // ───────────────────────────────────────────────────────────
  var FL_KEY = 'fisherLab.state.v1';
  function loadState() {
    try {
      var raw = window.localStorage.getItem(FL_KEY);
      var s = raw ? JSON.parse(raw) : {};
      return Object.assign({
        region: DEFAULT_REGION,
        currentMission: null, // mission id or null
        completedMissions: {},
        speciesCaught: {}, // {speciesId: count}
        lifeLog: [], // [{speciesId, length, date, mission}]
        regsViolations: 0,
        a11y: { staticCamera: false, captionMode: false, largeText: false }
      }, s);
    } catch (_) {
      return { region: DEFAULT_REGION, completedMissions: {}, speciesCaught: {}, lifeLog: [], regsViolations: 0, a11y: {} };
    }
  }
  function saveState(s) {
    try { window.localStorage.setItem(FL_KEY, JSON.stringify(s)); } catch (_) {}
  }

  // ───────────────────────────────────────────────────────────
  // THREE.JS LOADER
  // ───────────────────────────────────────────────────────────
  function ensureThreeJS(onReady, onError) {
    if (window.THREE) { onReady(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = function() { console.log('[FisherLab] three.js loaded'); onReady(); };
    s.onerror = function() {
      console.error('[FisherLab] three.js failed to load');
      if (onError) onError();
    };
    document.head.appendChild(s);
  }

  // ───────────────────────────────────────────────────────────
  // 3D SCENE — Casco Bay / Portland Harbor
  // Procedural geometry only (per plan — respects 25 MiB CDN cap).
  // ───────────────────────────────────────────────────────────
  function initHarborSim(canvas, opts) {
    var THREE = window.THREE;
    if (!THREE || !canvas) return null;

    var reducedMotion = false;
    try { reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}
    if (opts && opts.staticCamera) reducedMotion = true;

    var W = canvas.clientWidth || 720;
    var H = canvas.clientHeight || 420;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9bc4d8); // hazy sky
    scene.fog = new THREE.Fog(0xa8c8d8, 80, 480);

    var camera = new THREE.PerspectiveCamera(65, W / H, 0.5, 1200);
    camera.position.set(0, 4, 12);
    camera.lookAt(0, 1.5, 0);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    renderer.shadowMap.enabled = false; // perf

    // Lights
    var ambient = new THREE.AmbientLight(0xeaf2f8, 0.65);
    scene.add(ambient);
    var sun = new THREE.DirectionalLight(0xfff2c8, 0.9);
    sun.position.set(60, 80, 40);
    scene.add(sun);
    var fill = new THREE.HemisphereLight(0xb0d6ee, 0x4a6878, 0.5);
    scene.add(fill);

    // Water plane
    var waterGeo = new THREE.PlaneGeometry(1400, 1400, 80, 80);
    var waterMat = new THREE.MeshLambertMaterial({ color: 0x2f6a8c, transparent: true, opacity: 0.95 });
    var water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0;
    scene.add(water);

    // Wave displacement (vertex animation in update; skip if reduced motion)
    var waterPositions = waterGeo.attributes.position;
    var waterPosArr = waterPositions.array;
    var initialZ = new Float32Array(waterPosArr.length / 3);
    for (var iw = 0; iw < waterPosArr.length / 3; iw++) {
      initialZ[iw] = waterPosArr[iw * 3 + 2];
    }

    // ─── Boat (procedural skiff: rectangular hull + cabin + console)
    var boat = new THREE.Group();
    var hullGeo = new THREE.BoxGeometry(2.0, 0.6, 4.8);
    var hullMat = new THREE.MeshLambertMaterial({ color: 0xf4eedb });
    var hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.y = 0.3;
    boat.add(hull);
    var deck = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 4.4), new THREE.MeshLambertMaterial({ color: 0xc8b890 }));
    deck.position.y = 0.62;
    boat.add(deck);
    var console_ = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.5), new THREE.MeshLambertMaterial({ color: 0x335066 }));
    console_.position.set(0, 1.0, 0.3);
    boat.add(console_);
    var motor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.5), new THREE.MeshLambertMaterial({ color: 0x222831 }));
    motor.position.set(0, 0.6, -2.3);
    boat.add(motor);
    // Bow point — narrow front
    var bow = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 1.2, 4),
      new THREE.MeshLambertMaterial({ color: 0xf4eedb })
    );
    bow.rotation.x = -Math.PI / 2;
    bow.rotation.z = Math.PI / 4;
    bow.position.set(0, 0.35, 2.4);
    boat.add(bow);
    boat.position.set(0, 0, 0);
    scene.add(boat);

    // ─── Buoyage — populated based on region. Maine: a small harbor approach + open-water exit.
    var buoys = [];
    function addBuoy(x, z, type) {
      var g = new THREE.Group();
      var bodyColor, light, label;
      if (type === 'red-nun') {
        var coneGeo = new THREE.ConeGeometry(0.5, 1.4, 16);
        var coneMat = new THREE.MeshLambertMaterial({ color: 0xc8302a });
        var cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.y = 0.7;
        g.add(cone);
        label = 'red nun';
      } else if (type === 'green-can') {
        var cylGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.4, 16);
        var cylMat = new THREE.MeshLambertMaterial({ color: 0x2a7c44 });
        var cyl = new THREE.Mesh(cylGeo, cylMat);
        cyl.position.y = 0.7;
        g.add(cyl);
        label = 'green can';
      } else if (type === 'cardinal-N') {
        var topPart = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.8, 16), new THREE.MeshLambertMaterial({ color: 0x111111 }));
        var btm = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.8, 16), new THREE.MeshLambertMaterial({ color: 0xe8d048 }));
        topPart.position.y = 1.0; btm.position.y = 0.4;
        g.add(topPart); g.add(btm);
        // 2 up-cones topmark
        var t1 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 8), new THREE.MeshLambertMaterial({ color: 0x111111 }));
        t1.position.set(-0.14, 1.6, 0); g.add(t1);
        var t2 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 8), new THREE.MeshLambertMaterial({ color: 0x111111 }));
        t2.position.set(0.14, 1.6, 0); g.add(t2);
        label = 'north cardinal';
      } else if (type === 'safe-water') {
        // red+white sphere
        var sph = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), new THREE.MeshLambertMaterial({ color: 0xd03830 }));
        sph.position.y = 0.6;
        g.add(sph);
        // white horizontal band
        var band = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.18, 16), new THREE.MeshLambertMaterial({ color: 0xf6f6f6 }));
        band.position.y = 0.6;
        g.add(band);
        label = 'safe water';
      }
      g.position.set(x, 0, z);
      g.userData = { type: type, label: label };
      scene.add(g);
      buoys.push(g);
      return g;
    }

    // Channel out of harbor: red nuns on east (boat's right when outbound is south)
    // Player heads south (negative z) when leaving harbor.
    // Outbound (returning is reversed): keep red on starboard means red on west when leaving, east when returning.
    // We'll place red on west (negative x), green on east (positive x) — so when player heads south (outbound), red on starboard (W). Good for "leaving harbor" view.
    // Actually IALA-B: red right RETURNING. Returning = heading INTO harbor (north). So red on east when returning north => red on west when leaving south. Confirm: when leaving harbor heading south, red is on your starboard (west when heading south). ✓
    addBuoy(-6, -10, 'red-nun');
    addBuoy(6, -10, 'green-can');
    addBuoy(-7, -30, 'red-nun');
    addBuoy(7, -30, 'green-can');
    addBuoy(-9, -55, 'red-nun');
    addBuoy(9, -55, 'green-can');
    addBuoy(0, -85, 'safe-water');
    addBuoy(-15, -120, 'cardinal-N'); // marker for the ledge area

    // ─── Halfway Rock waypoint marker (mission destination)
    var rock = new THREE.Group();
    var rockMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 0), new THREE.MeshLambertMaterial({ color: 0x6b6358 }));
    rockMesh.position.y = 0.5;
    rock.add(rockMesh);
    var marker = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.2, 8), new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0x553300, emissiveIntensity: 0.4 }));
    marker.position.y = 2.2;
    rock.add(marker);
    rock.position.set(2, 0, -150);
    rock.userData = { type: 'halfwayRock', label: 'Halfway Rock' };
    scene.add(rock);

    // ─── Dock (origin marker)
    var dock = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.4, 2),
      new THREE.MeshLambertMaterial({ color: 0x8a6c47 })
    );
    dock.position.set(0, 0.1, 8);
    scene.add(dock);
    var dockPost = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.2, 8), new THREE.MeshLambertMaterial({ color: 0x4a3a25 }));
    dockPost.position.set(-2.6, 0.7, 8);
    scene.add(dockPost);
    var dockPost2 = dockPost.clone();
    dockPost2.position.set(2.6, 0.7, 8);
    scene.add(dockPost2);

    // ─── Land mass behind dock (Portland-ish silhouette)
    var land = new THREE.Mesh(
      new THREE.BoxGeometry(40, 4, 8),
      new THREE.MeshLambertMaterial({ color: 0x5e7a4e })
    );
    land.position.set(0, 2, 15);
    scene.add(land);
    // simple "lighthouse" landmark for bearings
    var lighthouse = new THREE.Group();
    var lhBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 3, 16), new THREE.MeshLambertMaterial({ color: 0xf5f5f5 }));
    lhBase.position.y = 1.5;
    lighthouse.add(lhBase);
    var lhTop = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.0, 16), new THREE.MeshLambertMaterial({ color: 0x991b1b }));
    lhTop.position.y = 3.5;
    lighthouse.add(lhTop);
    lighthouse.position.set(15, 4, 14);
    lighthouse.userData = { label: 'Portland Head Light (proxy)' };
    scene.add(lighthouse);

    // ─── Boat state
    var boatState = {
      pos: new THREE.Vector3(0, 0, 5.5),
      heading: Math.PI, // facing south (out of harbor)
      speed: 0,
      throttle: 0,
      passedRedNun: false,
      reachedHalfwayRock: false,
      returnedHome: false,
      fuel: 100,
      fishLanded: 0,
      keptKeeperCod: false
    };
    boat.position.copy(boatState.pos);

    // ─── Keyboard state
    var keys = {};
    function onKeyDown(e) {
      keys[e.key.toLowerCase()] = true;
      if (e.key === ' ') e.preventDefault();
    }
    function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // ─── Camera follow params
    var camOffset = new THREE.Vector3(0, 3.5, 9);
    var cameraTarget = new THREE.Vector3();

    // ─── HUD callback (set by caller; receives status snapshots)
    var hudCb = (opts && opts.onHudUpdate) || function() {};
    var statusCb = (opts && opts.onStatus) || function() {};

    // ─── Game tick
    var t0 = performance.now();
    var raf = null;
    var alive = true;
    var lastT = t0;
    var elapsed = 0;

    function tick() {
      if (!alive) return;
      var now = performance.now();
      var dt = Math.min(0.08, (now - lastT) / 1000);
      lastT = now;
      elapsed += dt;

      // Input
      var accel = 0, steer = 0;
      if (keys['w'] || keys['arrowup']) accel = 1;
      if (keys['s'] || keys['arrowdown']) accel = -0.6;
      if (keys['a'] || keys['arrowleft']) steer = 1;
      if (keys['d'] || keys['arrowright']) steer = -1;
      if (keys[' ']) accel = 1.5; // throttle boost

      // Boat physics (simplified)
      boatState.throttle += (accel - boatState.throttle) * 0.04;
      boatState.speed += boatState.throttle * 6 * dt;
      boatState.speed *= 0.985; // drag
      if (boatState.speed > 8) boatState.speed = 8;
      if (boatState.speed < -3) boatState.speed = -3;
      boatState.heading += steer * dt * 0.9 * Math.min(1, Math.abs(boatState.speed) / 2 + 0.2);
      var dx = Math.sin(boatState.heading) * boatState.speed * dt;
      var dz = Math.cos(boatState.heading) * boatState.speed * dt;
      boatState.pos.x += dx;
      boatState.pos.z -= dz; // -z is forward in our convention (south)
      // Fuel burn
      boatState.fuel -= Math.abs(boatState.throttle) * dt * 0.5;

      // Update boat mesh
      boat.position.x = boatState.pos.x;
      boat.position.z = boatState.pos.z;
      boat.rotation.y = boatState.heading;
      // Subtle bob
      if (!reducedMotion) {
        boat.position.y = Math.sin(elapsed * 1.6) * 0.06;
        boat.rotation.z = Math.sin(elapsed * 1.2) * 0.04;
      } else {
        boat.position.y = 0;
        boat.rotation.z = 0;
      }

      // Mission events: detect first red-nun pass on starboard
      if (!boatState.passedRedNun) {
        for (var ib = 0; ib < buoys.length; ib++) {
          var bb = buoys[ib];
          if (bb.userData.type !== 'red-nun') continue;
          var d = boat.position.distanceTo(bb.position);
          if (d < 4) {
            // relative position: is buoy to player's starboard (right)?
            var toBuoy = new THREE.Vector3().subVectors(bb.position, boat.position);
            // rotate by -heading; in our convention starboard is local +x
            var localX = Math.cos(boatState.heading) * toBuoy.x + Math.sin(boatState.heading) * toBuoy.z;
            if (localX > 0.5) {
              boatState.passedRedNun = true;
              flAnnounce('Correctly passed red nun on starboard. Red right returning — wait, outbound. Either way, you kept the channel.');
              statusCb({ type: 'milestone', text: 'Passed first red nun on starboard ✓' });
            } else if (localX < -0.5) {
              // Player passed on wrong side
              flAnnounce('You passed the red nun on the wrong side. In IALA-B, keep red on your starboard when returning.');
              statusCb({ type: 'violation', text: 'Buoyage violation: passed red nun on port side' });
            }
          }
        }
      }

      // Reached Halfway Rock
      if (!boatState.reachedHalfwayRock) {
        var dRock = boat.position.distanceTo(rock.position);
        if (dRock < 6) {
          boatState.reachedHalfwayRock = true;
          flAnnounce('Reached Halfway Rock. Drop a jig — let\'s see if there\'s a keeper cod down there.');
          statusCb({ type: 'milestone', text: 'Reached Halfway Rock — press F to fish' });
        }
      }

      // Returned home
      if (boatState.reachedHalfwayRock && !boatState.returnedHome) {
        var dDock = boat.position.distanceTo(dock.position);
        if (dDock < 4 && Math.abs(boatState.speed) < 1) {
          boatState.returnedHome = true;
          flAnnounce('Docked safely. Mission summary available.');
          statusCb({ type: 'complete', text: 'Mission complete — review summary' });
        }
      }

      // Fishing — at Halfway Rock, F key triggers a fish
      if (boatState.reachedHalfwayRock && keys['f']) {
        keys['f'] = false; // single-fire
        // Simulate a fish: random species, random length
        var roll = Math.random();
        var sp, len;
        if (roll < 0.35) {
          sp = MAINE_SPECIES[0]; // cod
          len = 16 + Math.floor(Math.random() * 18); // 16-33
        } else if (roll < 0.65) {
          sp = MAINE_SPECIES[1]; // haddock
          len = 14 + Math.floor(Math.random() * 14);
        } else {
          sp = MAINE_SPECIES[2]; // pollock
          len = 16 + Math.floor(Math.random() * 16);
        }
        boatState.fishLanded += 1;
        var isKeeper = (typeof sp.minSize === 'number') ? (len >= sp.minSize) : true;
        statusCb({
          type: 'fish',
          species: sp,
          length: len,
          isKeeper: isKeeper,
          text: 'Landed a ' + len + '" ' + sp.name + (isKeeper ? ' — KEEPER' : ' — must release (under min size ' + sp.minSize + '")')
        });
        if (sp.id === 'cod' && isKeeper) boatState.keptKeeperCod = true;
      }

      // Wave displacement
      if (!reducedMotion) {
        for (var iv = 0; iv < waterPosArr.length / 3; iv++) {
          var px = waterPosArr[iv * 3];
          var pz = waterPosArr[iv * 3 + 1]; // plane lies in xy before rotation
          waterPosArr[iv * 3 + 2] = initialZ[iv] + Math.sin(px * 0.08 + elapsed * 1.1) * 0.15 + Math.cos(pz * 0.12 + elapsed * 0.9) * 0.12;
        }
        waterPositions.needsUpdate = true;
      }

      // Camera follow
      var desiredCam = new THREE.Vector3(
        boat.position.x - Math.sin(boatState.heading) * 9,
        4,
        boat.position.z + Math.cos(boatState.heading) * 9
      );
      camera.position.lerp(desiredCam, reducedMotion ? 0.25 : 0.08);
      cameraTarget.set(boat.position.x, 1.5, boat.position.z);
      camera.lookAt(cameraTarget);

      // HUD
      hudCb({
        speed: boatState.speed,
        heading: boatState.heading,
        fuel: boatState.fuel,
        fishLanded: boatState.fishLanded,
        passedRedNun: boatState.passedRedNun,
        reachedHalfwayRock: boatState.reachedHalfwayRock,
        returnedHome: boatState.returnedHome,
        keptKeeperCod: boatState.keptKeeperCod,
        elapsed: elapsed,
        distToRock: boat.position.distanceTo(rock.position),
        distToDock: boat.position.distanceTo(dock.position)
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    // Resize handler
    function onResize() {
      var nw = canvas.clientWidth || 720;
      var nh = canvas.clientHeight || 420;
      renderer.setSize(nw, nh, false);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', onResize);

    return {
      dispose: function() {
        alive = false;
        if (raf) cancelAnimationFrame(raf);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('resize', onResize);
        try { renderer.dispose(); } catch (_) {}
      },
      getBoatState: function() { return boatState; }
    };
  }

  // ───────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────
  window.StemLab.registerTool('fisherLab', {
    label: 'FisherLab: Boating & Fishing Sim',
    title: 'FisherLab: Boating & Fishing Sim',
    icon: '🎣',
    color: 'cyan',
    category: 'science',
    description: 'Pilot a Maine skiff from Portland Harbor out to the fishing grounds. Learn buoyage, charts, COLREGS, tides, and weather while fishing for cod, striper, mackerel, and pulling lobster traps. Full 3D simulator with Maine-default DMR regs and a region toggle.',
    desc: 'Pilot a Maine skiff. Learn IALA-B buoyage, COLREGS, charts, tides, and Gulf of Maine fish ID + DMR regs in an immersive 3D sim.',
    tags: ['fishing', 'boating', 'navigation', 'maine', '3d', 'sim'],
    ready: true,
    render: function(ctx) { return _renderFisherLab(ctx); }
  });

  function _renderFisherLab(ctx) {
    var React = window.React || (ctx && ctx.React);
    var h = React ? React.createElement : (window.AlloModules && window.AlloModules._h);
    if (!h && React) h = React.createElement;
    var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;

    var stateInit = loadState();
    var tabHook = useState('home');
    var tab = tabHook[0], setTab = tabHook[1];
    var regionHook = useState(stateInit.region);
    var region = regionHook[0], setRegion = regionHook[1];
    var simHook = useState({ active: false, threeLoaded: !!window.THREE, threeError: false, loading: false });
    var sim = simHook[0], setSim = simHook[1];
    var hudHook = useState({});
    var hud = hudHook[0], setHud = hudHook[1];
    var statusHook = useState([]);
    var status = statusHook[0], setStatus = statusHook[1];
    var lifeLogHook = useState(stateInit.lifeLog || []);
    var lifeLog = lifeLogHook[0], setLifeLog = lifeLogHook[1];
    var canvasRef = useRef(null);
    var harborRef = useRef(null);

    // persist region changes
    useEffect(function() {
      var s = loadState();
      s.region = region;
      saveState(s);
    }, [region]);

    function pushStatus(ev) {
      setStatus(function(prev) {
        var next = (prev || []).concat([ev]).slice(-8);
        return next;
      });
      if (ev.type === 'fish' && ev.isKeeper) {
        var newLog = lifeLog.concat([{ species: ev.species.id, length: ev.length, ts: Date.now() }]);
        setLifeLog(newLog);
        var ss = loadState();
        ss.lifeLog = newLog;
        ss.speciesCaught = ss.speciesCaught || {};
        ss.speciesCaught[ev.species.id] = (ss.speciesCaught[ev.species.id] || 0) + 1;
        saveState(ss);
      }
    }

    function startSim() {
      function actuallyStart() {
        var c = canvasRef.current;
        if (!c) return;
        if (harborRef.current && harborRef.current.dispose) harborRef.current.dispose();
        harborRef.current = initHarborSim(c, {
          onHudUpdate: setHud,
          onStatus: pushStatus
        });
        setSim({ active: true, threeLoaded: true, threeError: false, loading: false });
        flAnnounce('FisherLab 3D sim launched. Use WASD or arrow keys to steer, Space for throttle boost, F to fish at Halfway Rock.');
      }
      if (window.THREE) {
        actuallyStart();
      } else {
        setSim(function(s) { return Object.assign({}, s, { loading: true }); });
        ensureThreeJS(actuallyStart, function() {
          setSim({ active: false, threeLoaded: false, threeError: true, loading: false });
          flAnnounce('3D engine could not load. Use Chart Mode (2D fallback) instead.');
        });
      }
    }

    function stopSim() {
      if (harborRef.current && harborRef.current.dispose) harborRef.current.dispose();
      harborRef.current = null;
      setSim({ active: false, threeLoaded: !!window.THREE, threeError: false, loading: false });
    }

    useEffect(function() {
      return function() { if (harborRef.current && harborRef.current.dispose) harborRef.current.dispose(); };
    }, []);

    // ─── Shared style helpers
    var cardStyle = { background: 'linear-gradient(135deg, rgba(14,30,48,0.92), rgba(8,18,32,0.92))', border: '1px solid rgba(56,189,248,0.22)', borderRadius: 12, padding: 14, color: '#e2e8f0', marginBottom: 12 };
    var headerStyle = { fontSize: 13, fontWeight: 900, color: '#bae6fd', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 };

    // ─── Tab bar
    var TABS = [
      { id: 'home', label: '🏠 Home' },
      { id: 'sim', label: '🎮 3D Sim' },
      { id: 'chart', label: '🗺 Chart Room' },
      { id: 'buoyage', label: '🟢 Buoyage' },
      { id: 'colregs', label: '⚓ COLREGS' },
      { id: 'weather', label: '🌦 Weather' },
      { id: 'vhf', label: '📻 VHF Radio' },
      { id: 'knots', label: '🪢 Knots' },
      { id: 'species', label: '🐟 Species ID' },
      { id: 'gear', label: '🪝 Gear' },
      { id: 'bait', label: '🪱 Bait' },
      { id: 'boats', label: '🚤 Boat Types' },
      { id: 'ports', label: '⚓ Maine Ports' },
      { id: 'zones', label: '🗺 Lobster Zones' },
      { id: 'regs', label: '📜 DMR Regs' },
      { id: 'license', label: '🦞 Lobster License' },
      { id: 'wabanaki', label: '🪶 Wabanaki Heritage' },
      { id: 'climate', label: '🌡 Climate Impacts' },
      { id: 'conservation', label: '🌱 Conservation' },
      { id: 'survival', label: '🆘 Cold-Water Survival' },
      { id: 'safety', label: '🦺 Safety Equipment' },
      { id: 'law', label: '⚖️ Maritime Law' },
      { id: 'seabirds', label: '🐦 Seabirds' },
      { id: 'mammals', label: '🦭 Marine Mammals' },
      { id: 'tides', label: '🌊 Tide Primer' },
      { id: 'watercolumn', label: '🏛 Water Column' },
      { id: 'careers', label: '🧰 Careers' },
      { id: 'history', label: '📜 Maritime History' },
      { id: 'ecosystem', label: '🌐 Ecosystem Cases' },
      { id: 'navmath', label: '📐 Nav Math' },
      { id: 'families', label: '👨‍👩‍👧 Family Profiles' },
      { id: 'ethics', label: '⚖️ Sportfishing Ethics' },
      { id: 'spots', label: '📌 Famous Spots' },
      { id: 'knotsteps', label: '🎬 Knot Steps' },
      { id: 'nightnav', label: '🌙 Night Nav' },
      { id: 'deepdives', label: '🔬 Species Deep Dives' },
      { id: 'seamanship', label: '🧭 Seamanship Skills' },
      { id: 'chartsymbols', label: '🗺 Chart Symbols' },
      { id: 'lighthouses', label: '💡 Lighthouses' },
      { id: 'inverts', label: '🦀 Invertebrates' },
      { id: 'harbors', label: '⚓ Harbor Details' },
      { id: 'weathertips', label: '🌥 Weather Tips' },
      { id: 'techguides', label: '🎯 Technique Guides' },
      { id: 'maintenance', label: '🔧 Maintenance' },
      { id: 'books', label: '📚 Books + Writers' },
      { id: 'women', label: '👩 Women in Maritime' },
      { id: 'yearplan', label: '🗓 Year Game Plan' },
      { id: 'vessels', label: '⛴️ Historical Vessels' },
      { id: 'habitats', label: '🌊 Species by Habitat' },
      { id: 'regsdeep', label: '📑 Regs Deep Dive' },
      { id: 'idkey', label: '🔍 ID Key' },
      { id: 'extspecies', label: '📚 Extended Species' },
      { id: 'boatskills', label: '🚤 Boating Skills' },
      { id: 'boatregs', label: '📋 Boating Regs' },
      { id: 'fishessays', label: '📰 Fisheries Essays' },
      { id: 'textbook', label: '📘 Textbook Chapters' },
      { id: 'studyguide', label: '🎓 Study Guide' },
      { id: 'fishfacts', label: '💡 Fisheries Facts' },
      { id: 'regional', label: '🗺 Regional Traditions' },
      { id: 'extglossary', label: '📒 Extended Glossary' },
      { id: 'activities', label: '🎯 Student Activities' },
      { id: 'community', label: '🤝 Community Models' },
      { id: 'success', label: '🏆 Success Stories' },
      { id: 'faqpub', label: '❓ Public FAQ' },
      { id: 'training', label: '📚 Training Checklist' },
      { id: 'regframework', label: '⚖️ Regulatory Framework' },
      { id: 'workforce', label: '🎓 Workforce Pipeline' },
      { id: 'emergency', label: '🚨 Emergency Procedures' },
      { id: 'culinary', label: '🍽 Maine Culinary' },
      { id: 'refnumbers', label: '🔢 Key Numbers' },
      { id: 'events', label: '📅 Notable Events' },
      { id: 'bibext', label: '📚 Extended Bibliography' },
      { id: 'playbooks', label: '📕 Operational Playbooks' },
      { id: 'safetyman', label: '🛟 Safety Manual' },
      { id: 'chartguide', label: '🗺 Chart Reading Guide' },
      { id: 'future', label: '🔮 Future Outlook' },
      { id: 'mentorship', label: '🎓 Mentorship Guide' },
      { id: 'voices', label: '🗣️ Voices' },
      { id: 'gearmaster', label: '🧰 Gear Master List' },
      { id: 'termessays', label: '📖 Term Essays' },
      { id: 'wabfigures', label: '🪶 Wabanaki Figures' },
      { id: 'mgmtmile', label: '🏛 Mgmt Milestones' },
      { id: 'indgroups', label: '🤝 Industry Groups' },
      { id: 'notablepeople', label: '👤 Notable People' },
      { id: 'globalcontext', label: '🌍 Global Context' },
      { id: 'rightwhale', label: '🐋 Right Whale Deep' },
      { id: 'lobsterconserve', label: '🦞 Lobster Conservation' },
      { id: 'coddeep', label: '🐟 Cod Industry Deep' },
      { id: 'striperdeep', label: '🐟 Striper Industry Deep' },
      { id: 'alewifedeep', label: '🐟 Alewife Deep' },
      { id: 'tunadeep', label: '🐟 Tuna + Offshore Deep' },
      { id: 'mpas', label: '🌐 MPAs + Conservation' },
      { id: 'waterfrontdeep', label: '⚓ Working Waterfront Deep' },
      { id: 'climatedeep', label: '🌡 Climate Deep Dive' },
      { id: 'voyages', label: '🛥 Composite Voyages' },
      { id: 'engmaint', label: '⚙️ Engine Maintenance' },
      { id: 'navprob', label: '📐 Navigation Problems' },
      { id: 'invasives', label: '🦀 Invasive Species' },
      { id: 'safetychk', label: '📋 Safety Checklists' },
      { id: 'studentfaq', label: '❓ Student FAQ' },
      { id: 'studcareer', label: '🎓 Student Career Guide' },
      { id: 'lessonplans', label: '📓 Lesson Plans' },
      { id: 'bibliography', label: '📚 Bibliography' },
      { id: 'achievements', label: '🏆 Achievements' },
      { id: 'glossary', label: '📖 Glossary' },
      { id: 'quiz', label: '✅ Quiz' }
    ];

    function tabBar() {
      return h('div', { role: 'tablist', 'aria-label': 'FisherLab sections',
        style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 } },
        TABS.map(function(t) {
          var selected = tab === t.id;
          return h('button', { key: t.id, role: 'tab', 'aria-selected': selected,
            className: 'fl-btn',
            onClick: function() { setTab(t.id); flAnnounce(t.label + ' tab open'); },
            style: { padding: '8px 12px', background: selected ? '#0ea5e9' : 'rgba(15,23,42,0.7)',
              color: selected ? '#04141f' : '#cbd5e1', border: '1px solid ' + (selected ? '#38bdf8' : 'rgba(100,116,139,0.4)'),
              borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' } }, t.label);
        }));
    }

    // ─── Region toggle
    function regionBar() {
      return h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(15,23,42,0.55)', borderRadius: 10, marginBottom: 12, flexWrap: 'wrap' } },
        h('label', { htmlFor: 'fl-region-select', style: { fontSize: 11, fontWeight: 700, color: '#94a3b8' } }, 'Region:'),
        h('select', { id: 'fl-region-select', value: region,
          onChange: function(e) { setRegion(e.target.value); flAnnounce('Region set to ' + REGIONS[e.target.value].label); },
          style: { background: '#0f1c2f', color: '#e2e8f0', border: '1px solid rgba(56,189,248,0.4)', borderRadius: 6, padding: '4px 8px', fontSize: 12 } },
          Object.keys(REGIONS).map(function(rk) {
            return h('option', { key: rk, value: rk }, REGIONS[rk].label + (REGIONS[rk].complete ? '' : ' (preview)'));
          })),
        !REGIONS[region].complete ? h('span', { style: { fontSize: 11, color: '#fbbf24', fontStyle: 'italic' } }, 'Preview region — full data coming in v1.1. Maine data still shown.') : null,
        h('span', { style: { marginLeft: 'auto', fontSize: 11, color: '#94a3b8' } },
          'Port: ', h('b', { style: { color: '#bae6fd' } }, REGIONS[region].portName || REGIONS.maine.portName),
          ' · Buoyage: ', h('b', { style: { color: '#bae6fd' } }, REGIONS[region].buoyage)));
    }

    // ─── HOME tab
    function homeTab() {
      var completedCount = Object.keys(loadState().completedMissions || {}).length;
      var caughtCount = Object.keys(loadState().speciesCaught || {}).length;
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🎣 FisherLab — Boating & Fishing Sim'),
          h('p', { style: { fontSize: 13, lineHeight: 1.6, margin: '0 0 10px' } },
            'Pilot a Maine skiff from Custom House Wharf out to the fishing grounds. Learn buoyage (red-right-returning), COLREGS rules of the road, chart reading, tides, and weather while fishing for cod, haddock, pollock, striper, and mackerel — and pulling lobster traps once you\'ve earned your apprenticeship.'),
          h('p', { style: { fontSize: 12, color: '#94a3b8', margin: '0 0 10px', fontStyle: 'italic' } },
            'Built for King Middle School EL Education place-based learning expeditions. Maine DMR rules are the default; a region toggle lets you preview other waters. Click any tab above to explore the curriculum modules, or jump straight into the 3D Sim.'),
          h('div', { style: { display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(56,189,248,0.18)' } },
            h('div', null,
              h('div', { style: { fontSize: 22, fontWeight: 900, color: '#86efac' } }, completedCount),
              h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 } }, 'Missions complete')),
            h('div', null,
              h('div', { style: { fontSize: 22, fontWeight: 900, color: '#fbbf24' } }, caughtCount + '/' + MAINE_SPECIES.length),
              h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 } }, 'Species in life log')),
            h('div', null,
              h('div', { style: { fontSize: 22, fontWeight: 900, color: '#a78bfa' } }, (lifeLog || []).length),
              h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 } }, 'Total keepers'))
          )),
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, 'Missions (v1)'),
          MISSIONS.map(function(m, i) {
            var done = !!(loadState().completedMissions || {})[m.id];
            return h('div', { key: m.id, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '3px solid ' + (done ? '#86efac' : '#38bdf8') } },
              h('div', { style: { fontSize: 13, fontWeight: 900, color: done ? '#86efac' : '#bae6fd', marginBottom: 4 } },
                (done ? '✓ ' : (i + 1) + '. ') + m.title),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 6 } }, m.brief),
              h('ul', { style: { margin: '4px 0 0 18px', padding: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 } },
                m.objectives.map(function(o, oi) { return h('li', { key: oi }, o); })));
          })),
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, 'How to play'),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 } },
            h('p', null, h('b', null, 'Steering: '), 'WASD or arrow keys. W/Up = throttle forward. S/Down = reverse. A/Left + D/Right = turn. Space = throttle boost.'),
            h('p', null, h('b', null, 'Fishing: '), 'When you reach Halfway Rock (marked with a yellow cone), press F to drop a jig. Random fish — check the species, length, and slot rules in the Regs Lookup tab.'),
            h('p', null, h('b', null, 'Buoyage: '), 'Red right returning — when heading INTO harbor, keep red nuns on your starboard (right). The sim checks whether you pass the first nun correctly.'),
            h('p', null, h('b', null, 'Accessibility: '), 'If you have reduced motion enabled in your OS, waves freeze and the camera locks. The 3D scene also has a 2D Chart fallback if WebGL is unavailable.'),
            h('p', { style: { color: '#fbbf24' } }, h('b', null, 'No mouse needed. '), 'Everything works from keyboard. Buoy shape (nun = cone, can = cylinder) doubles for color when colorblind.'))));
    }

    // ─── SIM tab
    function simTab() {
      return h('div', null,
        regionBar(),
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '3D Simulator'),
          !sim.threeLoaded && !sim.threeError && !sim.loading ? h('div', { style: { textAlign: 'center', padding: 20 } },
            h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 14 } }, 'The 3D engine (three.js r128, ~600 KB) loads on demand from cdnjs.'),
            h('button', { className: 'fl-btn',
              onClick: startSim,
              style: { padding: '12px 24px', background: '#0ea5e9', color: '#04141f', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' } },
              '▶ Load 3D engine + launch sim')) : null,
          sim.loading ? h('div', { style: { textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 12 } }, '⏳ Loading three.js…') : null,
          sim.threeError ? h('div', { style: { padding: 14, background: 'rgba(220,38,38,0.15)', borderRadius: 8, border: '1px solid rgba(220,38,38,0.4)' } },
            h('div', { style: { color: '#fca5a5', fontWeight: 800, marginBottom: 6 } }, '⚠ 3D engine failed to load'),
            h('div', { style: { fontSize: 11, color: '#cbd5e1' } }, 'You can still use Chart Mode (2D fallback) — switch to the "Chart Room" tab. The full curriculum (Buoyage, COLREGS, Species ID, Regs, Glossary, Quiz) is unaffected.')) : null,
          sim.threeLoaded && !sim.active ? h('div', { style: { textAlign: 'center', padding: 14 } },
            h('button', { className: 'fl-btn', onClick: startSim,
              style: { padding: '12px 24px', background: '#0ea5e9', color: '#04141f', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' } },
              '▶ Cast off — start Mission 1')) : null,
          sim.active ? h('div', { style: { position: 'relative' } },
            h('canvas', { ref: canvasRef, style: { width: '100%', height: 460, display: 'block', borderRadius: 8, background: '#9bc4d8' },
              'aria-label': '3D harbor scene. Use WASD or arrow keys to steer the boat. Press F at Halfway Rock to fish.' }),
            // HUD overlay
            h('div', { style: { position: 'absolute', top: 10, left: 10, background: 'rgba(8,18,32,0.75)', padding: '8px 12px', borderRadius: 8, fontSize: 11, color: '#e2e8f0', fontFamily: 'ui-monospace, Menlo, monospace' } },
              h('div', null, 'Speed: ', h('b', { style: { color: '#86efac' } }, (hud.speed || 0).toFixed(1) + ' kt')),
              h('div', null, 'Heading: ', h('b', { style: { color: '#bae6fd' } }, headingToCompass(hud.heading))),
              h('div', null, 'Fuel: ', h('b', { style: { color: (hud.fuel || 100) < 30 ? '#fb923c' : '#86efac' } }, Math.max(0, hud.fuel || 0).toFixed(0) + '%')),
              h('div', null, 'Fish: ', h('b', { style: { color: '#fbbf24' } }, hud.fishLanded || 0))),
            // Mission progress
            h('div', { style: { position: 'absolute', top: 10, right: 10, background: 'rgba(8,18,32,0.75)', padding: '8px 12px', borderRadius: 8, fontSize: 11, color: '#e2e8f0', maxWidth: 220 } },
              h('div', { style: { fontWeight: 800, color: '#bae6fd', marginBottom: 4 } }, 'Mission 1'),
              h('div', { style: { fontSize: 10 } }, hud.passedRedNun ? '✓ Passed red nun' : '• Pass red nun on starboard'),
              h('div', { style: { fontSize: 10 } }, hud.reachedHalfwayRock ? '✓ Reached Halfway Rock' : '• Reach Halfway Rock'),
              h('div', { style: { fontSize: 10 } }, hud.keptKeeperCod ? '✓ Landed keeper cod' : '• Land a cod ≥22"'),
              h('div', { style: { fontSize: 10 } }, hud.returnedHome ? '✓ Returned home' : '• Return to dock')),
            // Status log
            h('div', { style: { position: 'absolute', bottom: 10, left: 10, right: 10, maxHeight: 100, overflowY: 'auto', background: 'rgba(8,18,32,0.85)', padding: 8, borderRadius: 8 } },
              (status || []).slice(-4).map(function(ev, ei) {
                var color = ev.type === 'fish' ? '#fbbf24' : (ev.type === 'violation' ? '#fb923c' : (ev.type === 'complete' ? '#86efac' : '#bae6fd'));
                return h('div', { key: ei, style: { fontSize: 11, color: color, marginBottom: 2 } }, '• ' + ev.text);
              })),
            // Stop button
            h('button', { onClick: stopSim, className: 'fl-btn',
              style: { position: 'absolute', bottom: 10, right: 10, padding: '6px 12px', background: 'rgba(220,38,38,0.85)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' } },
              '✕ Exit sim')) : null
        ),
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, 'Controls (keyboard parity required for WCAG)'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, fontSize: 11 } },
            [
              { k: 'W / ↑', d: 'Throttle forward', c: '#86efac' },
              { k: 'S / ↓', d: 'Reverse / slow', c: '#fb923c' },
              { k: 'A / ←', d: 'Turn left (port)', c: '#bae6fd' },
              { k: 'D / →', d: 'Turn right (starboard)', c: '#bae6fd' },
              { k: 'Space', d: 'Throttle boost', c: '#fbbf24' },
              { k: 'F', d: 'Fish (at fishing waypoint)', c: '#a78bfa' }
            ].map(function(c, i) {
              return h('div', { key: i, style: { padding: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 6, borderLeft: '3px solid ' + c.c } },
                h('div', { style: { fontWeight: 800, color: c.c, fontFamily: 'ui-monospace, Menlo, monospace', marginBottom: 2 } }, c.k),
                h('div', { style: { color: '#cbd5e1' } }, c.d));
            }))));
    }

    function headingToCompass(rad) {
      if (typeof rad !== 'number') return '—';
      var deg = ((rad * 180 / Math.PI) % 360 + 360) % 360;
      // Our heading=0 means north (+z), heading=PI means south (-z)
      // Convert to compass: 0°=N, 90°=E, 180°=S, 270°=W
      var compassDeg = (180 - deg + 360) % 360;
      var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      var idx = Math.round(compassDeg / 45) % 8;
      return compassDeg.toFixed(0) + '° ' + dirs[idx];
    }

    // ─── CHART tab (2D fallback chart)
    function chartTab() {
      return h('div', null,
        regionBar(),
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🗺 Chart Room (' + (REGIONS[region].portName || 'Portland Harbor') + ')'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
            'Stylized chart approximating Casco Bay. In a real sim you\'d use NOAA Chart 13290 (Casco Bay). Buoy symbols mirror IALA-B convention. Useful as a 2D fallback if WebGL is unavailable, or as a study aid while playing.'),
          h('svg', { viewBox: '0 0 600 400', style: { width: '100%', maxWidth: 720, background: '#dbe7ef', borderRadius: 8, border: '1px solid rgba(56,189,248,0.3)' },
            'aria-label': 'Stylized nautical chart of Portland Harbor approach showing buoys, Halfway Rock, and Portland Head Light.' },
            // land
            h('rect', { x: 0, y: 0, width: 600, height: 80, fill: '#a8c595' }),
            h('text', { x: 18, y: 30, fill: '#3b4d2b', fontSize: 13, fontWeight: 700 }, 'Portland (mainland)'),
            // dock
            h('rect', { x: 270, y: 80, width: 60, height: 12, fill: '#8a6c47' }),
            h('text', { x: 280, y: 76, fill: '#3b4d2b', fontSize: 10 }, 'Custom House Wharf'),
            // lighthouse
            h('circle', { cx: 510, cy: 88, r: 4, fill: '#991b1b' }),
            h('text', { x: 460, y: 78, fill: '#3b4d2b', fontSize: 10 }, 'Portland Head Light'),
            // channel buoys
            // red nuns (left side as drawn, since chart is "looking south" out of harbor)
            [120, 180, 240].forEach,
            h('g', null,
              [{ x: 240, y: 130, t: 'R' }, { x: 230, y: 200, t: 'R' }, { x: 215, y: 280, t: 'R' }].map(function(b, i) {
                return h('g', { key: 'r' + i },
                  h('polygon', { points: (b.x - 7) + ',' + (b.y + 10) + ' ' + (b.x + 7) + ',' + (b.y + 10) + ' ' + b.x + ',' + (b.y - 4), fill: '#c8302a' }),
                  h('text', { x: b.x + 12, y: b.y + 5, fill: '#9b1c17', fontSize: 9, fontWeight: 700 }, b.t + (i * 2 + 2)));
              })),
            h('g', null,
              [{ x: 360, y: 130, t: 'G' }, { x: 370, y: 200, t: 'G' }, { x: 385, y: 280, t: 'G' }].map(function(b, i) {
                return h('g', { key: 'g' + i },
                  h('rect', { x: b.x - 6, y: b.y - 4, width: 12, height: 14, fill: '#2a7c44' }),
                  h('text', { x: b.x + 12, y: b.y + 5, fill: '#155b2f', fontSize: 9, fontWeight: 700 }, b.t + (i * 2 + 1)));
              })),
            // safe water (midchannel)
            h('circle', { cx: 300, cy: 330, r: 8, fill: '#d03830', stroke: '#fff', strokeWidth: 3 }),
            h('text', { x: 312, y: 335, fill: '#9b1c17', fontSize: 9, fontWeight: 700 }, 'Mid-channel'),
            // Halfway Rock
            h('polygon', { points: '210,365 230,360 225,378 215,378', fill: '#6b6358' }),
            h('text', { x: 240, y: 375, fill: '#3b4d2b', fontSize: 10, fontWeight: 700 }, 'Halfway Rock'),
            // depth contours
            h('path', { d: 'M 50 140 Q 300 110 550 145', stroke: '#7aa9c4', strokeWidth: 1, fill: 'none', strokeDasharray: '4,3' }),
            h('text', { x: 540, y: 138, fill: '#5a8ba5', fontSize: 9 }, '10 m'),
            h('path', { d: 'M 50 230 Q 300 200 550 235', stroke: '#7aa9c4', strokeWidth: 1, fill: 'none', strokeDasharray: '4,3' }),
            h('text', { x: 540, y: 228, fill: '#5a8ba5', fontSize: 9 }, '30 m'),
            // compass rose
            h('g', { transform: 'translate(70, 360)' },
              h('circle', { cx: 0, cy: 0, r: 22, fill: 'rgba(255,255,255,0.5)', stroke: '#5a8ba5', strokeWidth: 1 }),
              h('text', { x: 0, y: -10, fill: '#3b4d2b', fontSize: 11, fontWeight: 700, textAnchor: 'middle' }, 'N'),
              h('text', { x: 0, y: 18, fill: '#3b4d2b', fontSize: 9, textAnchor: 'middle' }, 'S'),
              h('text', { x: -15, y: 5, fill: '#3b4d2b', fontSize: 9, textAnchor: 'middle' }, 'W'),
              h('text', { x: 15, y: 5, fill: '#3b4d2b', fontSize: 9, textAnchor: 'middle' }, 'E'),
              h('line', { x1: 0, y1: 14, x2: 0, y2: -14, stroke: '#3b4d2b', strokeWidth: 1 }))
          ),
          h('div', { style: { marginTop: 10, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 } },
            h('p', null, h('b', null, 'Plot a fix: '), 'Take bearings off two known landmarks (Portland Head Light + Custom House Wharf). Where the bearing lines cross is your fix.'),
            h('p', null, h('b', null, 'Buoyage check: '), 'Red marks (nuns, even-numbered) line the east side of the channel as drawn — keep them on your starboard when heading INTO the harbor (red right returning). Green cans (odd-numbered) on your port.'))));
    }

    // ─── BUOYAGE tab
    function buoyageTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🟢 IALA Region B Buoyage'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 10 } },
            'North America uses IALA Region B. The mnemonic everyone learns: ', h('b', { style: { color: '#fbbf24' } }, '"Red Right Returning"'), ' — when heading INTO harbor from the sea, keep red marks on your starboard (right) side. Reverse when leaving.'),
          h('h4', { style: { fontSize: 12, color: '#bae6fd', marginTop: 12, marginBottom: 6 } }, 'Lateral marks (channel)'),
          BUOYAGE.lateral.map(function(b, i) {
            return h('div', { key: i, style: { padding: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 6, marginBottom: 6, borderLeft: '3px solid ' + (b.color.indexOf('red') === 0 ? '#c8302a' : (b.color.indexOf('green') === 0 ? '#2a7c44' : '#94a3b8')) } },
              h('div', { style: { fontSize: 12, fontWeight: 800, color: '#e2e8f0' } }, b.type + ' (' + b.shape + ', ' + b.color + ')'),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginTop: 2 } }, b.meaning),
              h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, 'Numbering: ' + b.numbering + ' · Light: ' + b.light));
          }),
          h('h4', { style: { fontSize: 12, color: '#bae6fd', marginTop: 12, marginBottom: 6 } }, 'Cardinal marks (passable side)'),
          BUOYAGE.cardinal.map(function(b, i) {
            return h('div', { key: i, style: { padding: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 6, marginBottom: 6 } },
              h('div', { style: { fontSize: 12, fontWeight: 800, color: '#e2e8f0' } }, b.type.toUpperCase() + ' cardinal — ' + b.color),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginTop: 2 } }, b.meaning),
              h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, 'Topmark: ' + b.topmark + ' · Light: ' + b.light));
          }),
          h('h4', { style: { fontSize: 12, color: '#bae6fd', marginTop: 12, marginBottom: 6 } }, 'Special marks'),
          BUOYAGE.special.map(function(b, i) {
            return h('div', { key: i, style: { padding: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 6, marginBottom: 6 } },
              h('div', { style: { fontSize: 12, fontWeight: 800, color: '#e2e8f0' } }, b.type + ' (' + b.shape + ', ' + b.color + ')'),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginTop: 2 } }, b.meaning));
          }),
          h('p', { style: { marginTop: 12, fontSize: 11, color: '#fbbf24', fontStyle: 'italic' } },
            'Accessibility note: shape + color always pair. Red is always conical (nun). Green is always cylindrical (can). A colorblind boater can still navigate by shape alone — that\'s why the convention exists.')));
    }

    // ─── COLREGS tab
    function colregsTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '⚓ COLREGS — Rules of the Road (plain-language)'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 10 } },
            'Full text: ', h('span', { style: { color: '#bae6fd' } }, 'USCG COLREGS (33 CFR 83)'), '. The rules below are plain-language summaries for instruction only. For licensing exams, study the actual rules.'),
          COLREGS.map(function(r, i) {
            return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '3px solid #38bdf8' } },
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#bae6fd', marginBottom: 4 } }, r.rule + ' · ' + r.title),
              h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.5 } }, r.plain));
          })));
    }

    // ─── SPECIES tab
    function speciesTab() {
      return h('div', null,
        regionBar(),
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🐟 Maine Species ID'),
          h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 12, fontStyle: 'italic' } },
            'Gulf of Maine fishes + American lobster. Size limits + slots in this guide reflect typical DMR rules — verify current limits at maine.gov/dmr before fishing.'),
          MAINE_SPECIES.map(function(s, i) {
            return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
              h('div', { style: { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 6 } },
                h('div', { style: { fontSize: 28 }, 'aria-hidden': 'true' }, s.emoji),
                h('div', null,
                  h('div', { style: { fontSize: 14, fontWeight: 900, color: '#bae6fd' } }, s.name),
                  h('div', { style: { fontSize: 11, fontStyle: 'italic', color: '#94a3b8' } }, s.sci),
                  h('span', { className: 'fl-pill' }, s.group))),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, h('b', null, 'ID: '), s.idMarks),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, h('b', null, 'Habitat: '), s.habitat),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, h('b', null, 'Gear: '), (s.gear || []).join(', ')),
              h('div', { style: { fontSize: 11, color: '#fbbf24', lineHeight: 1.5, marginBottom: 4 } },
                h('b', null, 'Min size: '), String(s.minSize) + (typeof s.minSize === 'number' ? '"' : ''),
                s.slot ? ' · Slot: ' + s.slot : '',
                s.dailyBag != null ? ' · Daily bag: ' + s.dailyBag : '',
                s.season ? ' · Season: ' + s.season : ''),
              h('div', { style: { fontSize: 11, color: '#86efac', lineHeight: 1.5, marginTop: 4, paddingTop: 6, borderTop: '1px solid rgba(100,116,139,0.25)' } },
                h('b', null, 'Stewardship: '), s.stewardship,
                h('span', { style: { fontSize: 10, color: '#94a3b8', marginLeft: 6, fontStyle: 'italic' } }, '(' + s.cite + ')')));
          })));
    }

    // ─── GEAR tab
    function gearTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🪝 Gear & Methods'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } }, 'Every gear has tradeoffs in selectivity, efficiency, and bycatch. The most "efficient" gear is often the most damaging — sustainability requires gear choices that match the target while protecting non-targets.'),
          GEAR.map(function(g, i) {
            return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8 } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#bae6fd', marginBottom: 4 } }, g.emoji + ' ' + g.name),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Use: '), g.use),
              h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Tradeoff: '), g.tradeoff),
              h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Tip: '), g.tips));
          })));
    }

    // ─── DMR REGS tab
    function regsTab() {
      return h('div', null,
        regionBar(),
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '📜 DMR Regulations Lookup (Maine)'),
          h('p', { style: { fontSize: 11, color: '#fb923c', marginBottom: 12, fontStyle: 'italic' } },
            '⚠ Live DMR rules change. Treat in-tool numbers as instructional. Always confirm at maine.gov/dmr or current state\'s authority before fishing.'),
          h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11, color: '#cbd5e1' } },
            h('thead', null,
              h('tr', { style: { background: 'rgba(56,189,248,0.15)' } },
                ['Species', 'Min size', 'Slot', 'Daily bag', 'Season'].map(function(c, ci) {
                  return h('th', { key: ci, style: { padding: '6px 8px', textAlign: 'left', color: '#bae6fd', fontWeight: 700 } }, c);
                }))),
            h('tbody', null,
              MAINE_SPECIES.map(function(s, i) {
                return h('tr', { key: i, style: { borderBottom: '1px solid rgba(100,116,139,0.18)' } },
                  h('td', { style: { padding: '6px 8px', fontWeight: 700 } }, s.name),
                  h('td', { style: { padding: '6px 8px' } }, (typeof s.minSize === 'number' ? s.minSize + '"' : (s.minSize || '—'))),
                  h('td', { style: { padding: '6px 8px' } }, s.slot || '—'),
                  h('td', { style: { padding: '6px 8px' } }, s.dailyBag != null ? String(s.dailyBag) : '—'),
                  h('td', { style: { padding: '6px 8px' } }, s.season || 'Open'));
              })))),
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, 'Conservation tools you\'ll see in the sim'),
          h('ul', { style: { margin: '0 0 0 20px', padding: 0, fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 } },
            h('li', null, h('b', { style: { color: '#fbbf24' } }, 'Slot limits — '), 'Striper 28-31". Protects both juveniles AND big breeders. Smaller fish = future biomass; bigger fish = disproportionate reproductive output.'),
            h('li', null, h('b', { style: { color: '#fbbf24' } }, 'V-notch (lobster) — '), 'Any female caught with eggs gets a v-notch on her tail flipper. She\'s protected for life from harvest, even years later when no longer carrying. Maine\'s most distinctive sustainability lever.'),
            h('li', null, h('b', { style: { color: '#fbbf24' } }, 'Maximum size (lobster) — '), 'Lobsters >5" carapace must also be released. The largest breeders produce vastly more eggs per spawn than smaller ones.'),
            h('li', null, h('b', { style: { color: '#fbbf24' } }, 'Escape vents (traps) — '), 'Required size openings in lobster traps that let sub-legal lobsters walk out before haul. Reduces handling stress + mortality.'),
            h('li', null, h('b', { style: { color: '#fbbf24' } }, 'Closed seasons + areas — '), 'NOAA and DMR close zones during spawning. Required learning if you fish here.'))));
    }

    // ─── LICENSE LADDER tab
    function licenseTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🦞 Maine Lobster License Ladder'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12, lineHeight: 1.5 } },
            'Maine\'s commercial lobster fishery is limited-entry. You can\'t walk in off the street + buy a license. Even kids growing up around the industry follow a structured tier system. Below is the ladder:'),
          LOBSTER_LICENSE.map(function(l, i) {
            return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid ' + (l.tier === 'Apprentice' ? '#fbbf24' : (l.tier === 'Non-commercial' ? '#86efac' : '#38bdf8')) } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 4 } },
                h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd' } }, l.tier),
                h('div', { style: { fontSize: 10, color: '#fbbf24', fontWeight: 700 } }, 'Trap limit: ' + l.traps)),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 4 } }, h('b', null, 'Age: '), l.age),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 4 } }, h('b', null, 'Requires: '), l.requires),
              h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Role: '), l.role));
          }),
          h('p', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 12 } },
            'Sources: Maine DMR commercial fishing licenses + Maine Lobstermen\'s Association apprentice program. Confirm at maine.gov/dmr.')));
    }

    // ─── CAREERS tab
    function careersTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🧰 Career Pathways'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12, lineHeight: 1.5 } },
            'Marine trades are not one job — they\'re a whole ecosystem of roles from stern-person to research scientist. Many of these are accessible without a 4-year degree.'),
          CAREERS.map(function(c, i) {
            return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
              h('div', { style: { fontSize: 14, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, c.title),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, c.desc),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', { style: { color: '#fbbf24' } }, 'Training: '), c.training),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', { style: { color: '#86efac' } }, 'Pay: '), c.pay),
              h('div', { style: { fontSize: 11, color: '#94a3b8' } }, h('b', { style: { color: '#a78bfa' } }, 'Future: '), c.future));
          })));
    }

    // ─── GLOSSARY tab
    function glossaryTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '📖 Glossary'),
          GLOSSARY.map(function(g, i) {
            return h('div', { key: i, style: { padding: 8, marginBottom: 6, background: 'rgba(15,23,42,0.55)', borderRadius: 6 } },
              h('div', { style: { fontSize: 12, fontWeight: 800, color: '#bae6fd', marginBottom: 2 } }, g.term),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.4 } }, g.def));
          })));
    }

    // ─── QUIZ tab
    var quizStateHook = useState({ idx: 0, answers: {}, finished: false, score: 0 });
    var quizState = quizStateHook[0], setQuizState = quizStateHook[1];

    function quizTab() {
      if (quizState.finished) {
        return h('div', null, h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '✅ Quiz Results'),
          h('div', { style: { fontSize: 28, fontWeight: 900, color: '#bae6fd', marginBottom: 8 } },
            quizState.score + ' / ' + QUIZ_QUESTIONS.length),
          h('p', { style: { fontSize: 12, color: '#cbd5e1' } },
            quizState.score >= QUIZ_QUESTIONS.length * 0.85 ? '🏆 Mastery — you\'re ready for open water.' :
            quizState.score >= QUIZ_QUESTIONS.length * 0.7 ? '✓ Solid — review missed items + retry.' :
            '⚠ Keep studying — review Buoyage, COLREGS, Regs tabs.'),
          h('div', { style: { marginTop: 10 } },
            QUIZ_QUESTIONS.map(function(q, qi) {
              var picked = quizState.answers[qi];
              var correct = picked === q.correct;
              return h('div', { key: qi, style: { padding: 8, marginBottom: 6, background: 'rgba(15,23,42,0.55)', borderRadius: 6, borderLeft: '3px solid ' + (correct ? '#86efac' : '#fb923c') } },
                h('div', { style: { fontSize: 11, fontWeight: 700, color: correct ? '#86efac' : '#fb923c', marginBottom: 4 } },
                  (correct ? '✓ ' : '✕ ') + 'Q' + (qi + 1) + ': ' + q.q),
                h('div', { style: { fontSize: 11, color: '#cbd5e1' } }, 'Your answer: ' + (typeof picked === 'number' ? q.a[picked] : 'skipped')),
                !correct ? h('div', { style: { fontSize: 11, color: '#86efac', marginTop: 2 } }, 'Correct: ' + q.a[q.correct]) : null,
                h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' } }, q.explain));
            })),
          h('button', { className: 'fl-btn',
            onClick: function() { setQuizState({ idx: 0, answers: {}, finished: false, score: 0 }); },
            style: { marginTop: 14, padding: '10px 20px', background: '#0ea5e9', color: '#04141f', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' } }, 'Retake quiz')));
      }
      var q = QUIZ_QUESTIONS[quizState.idx];
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '✅ FisherLab Quiz — Q' + (quizState.idx + 1) + ' of ' + QUIZ_QUESTIONS.length),
          h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.5, marginBottom: 12 } }, q.q),
          q.a.map(function(opt, oi) {
            return h('button', { key: oi, className: 'fl-btn',
              onClick: function() {
                var newAnswers = Object.assign({}, quizState.answers);
                newAnswers[quizState.idx] = oi;
                var nextIdx = quizState.idx + 1;
                if (nextIdx >= QUIZ_QUESTIONS.length) {
                  var sc = 0;
                  for (var qq = 0; qq < QUIZ_QUESTIONS.length; qq++) {
                    if (newAnswers[qq] === QUIZ_QUESTIONS[qq].correct) sc++;
                  }
                  setQuizState({ idx: nextIdx, answers: newAnswers, finished: true, score: sc });
                  flAnnounce('Quiz complete. Score ' + sc + ' of ' + QUIZ_QUESTIONS.length);
                } else {
                  setQuizState({ idx: nextIdx, answers: newAnswers, finished: false, score: 0 });
                }
              },
              style: { display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 6,
                background: 'rgba(15,23,42,0.7)', color: '#e2e8f0', border: '1px solid rgba(56,189,248,0.3)',
                borderRadius: 8, fontSize: 12, cursor: 'pointer' } },
              String.fromCharCode(65 + oi) + '. ' + opt);
          })));
    }

    // ─── WEATHER tab
    function weatherTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🌦 Marine Weather Scenarios'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
            'Maine weather changes fast. NOAA marine forecasts use Beaufort wind scale + sea state + visibility. The most-used categories below:'),
          WEATHER_SCENARIOS.map(function(w, i) {
            return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid ' + (w.risk === 'Extreme' ? '#dc2626' : (w.risk === 'Very High' ? '#fb923c' : (w.risk === 'High' ? '#fbbf24' : '#86efac'))) } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 4 } },
                h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd' } }, w.name),
                h('div', { style: { fontSize: 10, color: w.risk === 'Extreme' ? '#fca5a5' : (w.risk === 'Very High' ? '#fdba74' : (w.risk === 'High' ? '#fde047' : '#86efac')), fontWeight: 700 } }, 'Risk: ' + w.risk)),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Trigger: '), w.trigger),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Visibility: '), w.visibility),
              h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Action: '), w.action),
              h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Duration: '), w.duration));
          })),
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, 'Decision Framework'),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 } },
            h('p', null, h('b', { style: { color: '#fbbf24' } }, '1. Get the forecast BEFORE casting off. '), 'NOAA Marine Forecast (weather.gov/marine) or NOAA Weather Radio.'),
            h('p', null, h('b', { style: { color: '#fbbf24' } }, '2. Check the wind direction. '), 'Most Maine harbors are protected from one direction. If wind builds and that\'s your weather side, head for a different harbor.'),
            h('p', null, h('b', { style: { color: '#fbbf24' } }, '3. Watch the sky + barometer. '), 'Falling barometer + thickening clouds = system arriving. Calm before storm.'),
            h('p', null, h('b', { style: { color: '#fbbf24' } }, '4. Make the call EARLY. '), 'You\'ll never regret turning back. You may regret pushing through.'),
            h('p', null, h('b', { style: { color: '#fbbf24' } }, '5. File a float plan. '), 'Tell someone ashore where you\'re going + when you\'ll be back. If you don\'t return, they call the Coast Guard.'))));
    }

    // ─── VHF tab
    function vhfTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '📻 VHF Radio — The Mariner\'s Phone'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
            'Marine VHF Channel 16 is the international distress + hailing channel. ALWAYS monitored when underway. Below are the standard call types every boater must know.'),
          VHF_SCRIPTS.map(function(v, i) {
            return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid ' + (v.id === 'mayday' ? '#dc2626' : (v.id === 'panpan' ? '#fbbf24' : '#38bdf8')) } },
              h('div', { style: { fontSize: 13, fontWeight: 900, color: v.id === 'mayday' ? '#fca5a5' : (v.id === 'panpan' ? '#fde047' : '#bae6fd'), marginBottom: 4 } }, v.type),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6 } }, h('b', null, 'Channel: '), v.channel, ' · ', h('b', null, 'When: '), v.when),
              h('div', { style: { padding: 8, background: 'rgba(0,0,0,0.4)', borderRadius: 6, fontSize: 11, color: '#86efac', fontFamily: 'ui-monospace, Menlo, monospace', lineHeight: 1.7, marginBottom: 6 } },
                v.script.map(function(line, li) { return h('div', { key: li }, line); })),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 4 } }, h('b', null, 'Follow-up: '), v.followUp),
              v.legal ? h('div', { style: { fontSize: 11, color: '#fb923c', fontStyle: 'italic' } }, h('b', null, '⚠ Legal: '), v.legal) : null);
          })),
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, 'Memorize: the four "P"s'),
          h('ul', { style: { margin: '0 0 0 20px', padding: 0, fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 } },
            h('li', null, h('b', null, 'Position '), '(lat/lon OR bearing-and-distance from known landmark)'),
            h('li', null, h('b', null, 'Problem '), '(nature of emergency)'),
            h('li', null, h('b', null, 'People '), '(number aboard)'),
            h('li', null, h('b', null, 'Particulars '), '(vessel description — length, color, type)'))));
    }

    // ─── KNOTS tab
    function knotsTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🪢 Mariner Knots — The 12 You Must Know'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
            'Every knot reduces line strength (most by 30-40%). Knowing which knot for which job is part of seamanship literacy.'),
          KNOTS.map(function(k, i) {
            return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
              h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, k.emoji + ' ' + k.name),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Use: '), k.use),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Where: '), k.where),
              h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3, fontStyle: 'italic' } }, h('b', null, 'Mnemonic: '), k.mnemonic),
              h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Strength: '), k.strength));
          })));
    }

    // ─── BAIT tab
    function baitTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🪱 Bait Guide'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } }, 'The right bait matches the species + the season + the technique. Maine bait shops sell most of these; many you can collect yourself.'),
          BAIT.map(function(b, i) {
            return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8 } },
              h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, b.name),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'For: '), b.use),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'How to get: '), b.acquisition),
              h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, 'Effective: '), b.effective),
              h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Cost: '), b.cost));
          })));
    }

    // ─── BOATS tab
    function boatsTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🚤 Maine Boat Types'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } }, 'Maine\'s working fleet is unusually diverse — from open skiffs to 90-ft draggers. Each has different physics, capabilities, and economics.'),
          BOAT_TYPES.map(function(bt, i) {
            return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
              h('div', { style: { fontSize: 14, fontWeight: 900, color: '#bae6fd', marginBottom: 6 } }, bt.emoji + ' ' + bt.name),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Use: '), bt.use),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Power: '), bt.power, ' · ', h('b', null, 'Crew: '), bt.crew),
              h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, '✓ Pros: '), bt.pros),
              h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 3 } }, h('b', null, '✗ Cons: '), bt.cons),
              h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Cost: '), bt.typical));
          })));
    }

    // ─── PORTS tab
    function portsTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '⚓ Maine Working Ports'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } }, 'Eight major Maine ports — each with its own character, primary fishery, and navigation challenges.'),
          MAINE_PORTS.map(function(p, i) {
            return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 6 } },
                h('div', { style: { fontSize: 14, fontWeight: 900, color: '#bae6fd' } }, p.emoji + ' ' + p.name),
                h('div', { style: { fontSize: 10, color: '#94a3b8', fontFamily: 'ui-monospace, Menlo, monospace' } }, p.coords + ' · pop ' + p.population)),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 4 } }, h('b', null, 'Primary: '), p.primary),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 4, fontStyle: 'italic' } }, p.character),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 4 } }, h('b', null, 'Notable: '), (p.notable || []).join(' · ')),
              h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 4 } }, h('b', null, 'Navigation: '), p.navigation),
              h('div', { style: { fontSize: 11, color: '#86efac', marginTop: 4, paddingTop: 6, borderTop: '1px solid rgba(100,116,139,0.25)' } }, h('b', null, 'Culture: '), p.culture,
                h('span', { style: { fontSize: 10, color: '#94a3b8', marginLeft: 6, fontStyle: 'italic' } }, '(' + p.cite + ')')));
          })));
    }

    // ─── LOBSTER ZONES tab
    function zonesTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🗺 Maine Lobster Zones (DMR-managed)'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } }, 'Maine\'s commercial lobster fishery is divided into 7 zones, each governed by a Zone Council that sets entry/exit rules + local rules.'),
          LOBSTER_ZONES.map(function(z, i) {
            return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fbbf24' } },
              h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fde047', marginBottom: 4 } }, z.name),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Area: '), z.area),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Trap limit: '), z.traps),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3, fontStyle: 'italic' } }, z.character),
              h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Entry: '), z.entry),
              h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Towns: '), (z.towns || []).join(' · ')));
          })));
    }

    // ─── WABANAKI tab
    function wabanakiTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🪶 Wabanaki Fishing Heritage'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12, lineHeight: 1.6 } },
            'Maine\'s coast has been managed by Wabanaki peoples for 12,000+ years. Their relationship with these waters is ongoing, not historical — the four nations of the Wabanaki Confederacy (Penobscot, Passamaquoddy, Maliseet, Mi\'kmaq) continue to assert sovereignty + treaty rights.'),
          WABANAKI.map(function(w, i) {
            return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
              h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 6 } }, w.title),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 } }, w.body),
              w.cite ? h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' } }, '(' + w.cite + ')') : null);
          }),
          h('div', { style: { padding: 10, background: 'rgba(167,139,250,0.1)', borderRadius: 6, marginTop: 12, fontSize: 11, color: '#c4b5fd', fontStyle: 'italic' } },
            'For curriculum partnerships: Wabanaki REACH (wabanakireach.org), Maine Indian Education, Maine-Wabanaki Truth & Reconciliation Commission report.')));
    }

    // ─── CLIMATE tab
    function climateTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🌡 Climate Impacts on Gulf of Maine Fisheries'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12, lineHeight: 1.6 } },
            'The Gulf of Maine warmed ~4× faster than the global ocean during 2004-2013. Climate change is the dominant force reshaping fisheries today. Every Maine fisherman is now a climate observer.'),
          CLIMATE_IMPACTS.map(function(c, i) {
            return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fb923c' } },
              h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fdba74', marginBottom: 6 } }, c.title),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 } }, c.body),
              c.cite ? h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' } }, '(' + c.cite + ')') : null);
          })));
    }

    // ─── CONSERVATION tab
    function conservationTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🌱 Conservation Case Studies'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } }, 'Real stories from Maine + the Atlantic fisheries world. Some are collapse stories. Some are recovery stories. All have lessons.'),
          CONSERVATION_CASES.map(function(cc, i) {
            return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #86efac' } },
              h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac', marginBottom: 6 } }, cc.title),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, cc.summary),
              h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Lessons: '), cc.lessons),
              h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Action: '), cc.action));
          })));
    }

    // ─── COLD-WATER SURVIVAL tab
    function survivalTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🆘 Cold-Water Survival — The 1-10-1 Rule'),
          h('p', { style: { fontSize: 12, color: '#fb923c', marginBottom: 12, fontWeight: 700 } },
            'Maine waters can kill in minutes. PFD ON THE BODY before you fall in. After that, time is the enemy.'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
            'Memorize ', h('b', { style: { color: '#fbbf24' } }, '1 minute / 10 minutes / 1 hour: '),
            ' 1 minute to control your breathing after the cold-shock gasp; 10 minutes of meaningful muscle function; 1 hour before hypothermia takes you. Below: the 4 phases in detail.'),
          COLD_WATER.map(function(p, i) {
            return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fb923c' } },
              h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fdba74', marginBottom: 6 } }, p.phase),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'What: '), p.what),
              h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Survival: '), p.survival),
              h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, h('b', null, 'Timing: '), p.time));
          }),
          h('div', { style: { padding: 12, background: 'rgba(251,146,60,0.1)', borderRadius: 8, marginTop: 8 } },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: '#fdba74', marginBottom: 6 } }, 'HELP / HUDDLE positions'),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } },
              h('p', null, h('b', null, 'HELP (Heat Escape Lessening Posture): '), 'Alone in water? Knees to chest, arms across chest, PFD on. Reduces heat loss ~50%.'),
              h('p', null, h('b', null, 'HUDDLE: '), 'Multiple people in water? Form a tight chest-to-chest cluster. Conserves heat. Place children + injured at center.')))));
    }

    // ─── ACHIEVEMENTS tab
    function achievementsTab() {
      var st = loadState();
      var unlocked = st.achievements || {};
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🏆 Achievements (' + Object.keys(unlocked).length + ' / ' + ACHIEVEMENTS.length + ')'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
            'Unlock by playing missions, completing the quiz, reading curriculum modules, and demonstrating stewardship.'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 } },
            ACHIEVEMENTS.map(function(a, i) {
              var done = !!unlocked[a.id];
              return h('div', { key: a.id, style: { padding: 10, background: done ? 'rgba(134,239,172,0.12)' : 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid ' + (done ? '#86efac' : '#475569'), opacity: done ? 1 : 0.65 } },
                h('div', { style: { fontSize: 22, marginBottom: 4 } }, a.icon),
                h('div', { style: { fontSize: 12, fontWeight: 800, color: done ? '#86efac' : '#cbd5e1', marginBottom: 2 } }, (done ? '✓ ' : '') + a.name),
                h('div', { style: { fontSize: 10, color: '#94a3b8', lineHeight: 1.4 } }, a.desc));
            }))));
    }

    // ─── SAFETY tab
    function safetyTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🦺 Safety Equipment — Federal + Best Practice'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'USCG-required minimums + best-practice additions. The legal minimum is not the safe minimum — Maine waters punish unprepared boaters.'),
        SAFETY_EQUIPMENT.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fb923c' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fdba74', marginBottom: 6 } }, s.emoji + ' ' + s.name),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Required: '), s.required),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Types: '), s.types),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Maintenance: '), s.maintenance),
            h('div', { style: { fontSize: 11, color: '#fbbf24', fontStyle: 'italic' } }, h('b', null, 'Reality: '), s.reality));
        })));
    }

    // ─── MARITIME LAW tab
    function lawTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '⚖️ Maritime Law Primer'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'A working mariner doesn\'t need to be a lawyer, but should know the key federal + state frameworks that shape Maine fisheries.'),
        MARITIME_LAW.map(function(l, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 6 } }, l.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, l.body),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Why it matters: '), l.relevance));
        })));
    }

    // ─── SEABIRDS tab
    function seabirdsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🐦 Maine Seabirds — Working with Avian Indicators'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Seabirds are working partners on the water — they signal where baitfish are, where storms are coming, and what shape the ecosystem is in. Cross-reference with BirdLab for full Maine bird coverage.'),
        SEABIRDS.map(function(b, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 4 } }, b.emoji + ' ' + b.name),
            h('div', { style: { fontSize: 11, fontStyle: 'italic', color: '#94a3b8', marginBottom: 6 } }, b.sci),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'ID: '), b.idMarks),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Behavior: '), b.behavior),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Indicator: '), b.indicator),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Season: '), b.season));
        })));
    }

    // ─── MARINE MAMMALS tab
    function mammalsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🦭 Maine Marine Mammals'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Federally protected under MMPA. Minimum approach distances apply. Below are the species you\'ll encounter from Maine boats.'),
        MARINE_MAMMALS.map(function(m, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, m.emoji + ' ' + m.name),
            h('div', { style: { fontSize: 11, fontStyle: 'italic', color: '#94a3b8', marginBottom: 6 } }, m.sci),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'ID: '), m.idMarks),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Behavior: '), m.behavior),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Population: '), m.population),
            h('div', { style: { fontSize: 11, color: '#fb923c' } }, h('b', null, 'Regulation: '), m.regulation));
        })));
    }

    // ─── TIDES tab
    function tidesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🌊 Tide Primer — Maine\'s Daily Rhythm'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine tides drive everything: fishing windows, channel passage, shellfish access, weather + sea state. Mastering the tide is mastering the coast.'),
        TIDE_PRIMER.map(function(t, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 6 } }, t.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, t.body),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Practical: '), t.practical));
        })));
    }

    // ─── WATER COLUMN tab
    function waterColumnTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🏛 Water Column Biology'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine waters are stratified vertically — light, temp, oxygen, prey distribution all change with depth. Fish position themselves along this gradient.'),
        WATER_COLUMN.map(function(z, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, z.zone),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Light: '), z.light),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Species: '), z.species),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Indicators: '), z.indicators));
        })));
    }

    // ─── LESSON PLANS tab
    function lessonPlansTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📓 Lesson Plans (for teachers)'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Ready-to-use templates aligned to Maine + EL Education + NGSS / Maine Indian Education (LD 291) standards. Build on these for your context.'),
        LESSON_PLANS.map(function(lp, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #86efac' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 6 } },
              h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac' } }, lp.title),
              h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Grade ' + lp.grade + ' · ' + lp.subject)),
            h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Objectives:')),
            h('ul', { style: { margin: '0 0 8px 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
              lp.objectives.map(function(o, oi) { return h('li', { key: oi }, o); })),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6 } }, h('b', null, 'Materials: '), lp.materials.join(' · ')),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Flow: '), lp.flow),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'Assessment: '), lp.assessment),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Cross-cuts: '), lp.crosscuts.join(' · ')));
        })));
    }

    // ─── BIBLIOGRAPHY tab
    function bibliographyTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📚 Bibliography + Further Reading'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Curated reading list — books, papers, websites, and organizations. All claims in FisherLab trace to one of these sources.'),
        BIBLIOGRAPHY.map(function(b, i) {
          return h('div', { key: i, style: { padding: 8, marginBottom: 6, background: 'rgba(15,23,42,0.55)', borderRadius: 6, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
            h('div', null,
              h('b', { style: { color: '#bae6fd' } }, b.authors + ' (' + b.year + '). '),
              h('span', { style: { fontStyle: 'italic' } }, b.title),
              b.journal ? h('span', null, '. ' + b.journal) : null,
              h('span', { style: { color: '#94a3b8' } }, ' [' + b.type + ']')),
            b.notes ? h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' } }, b.notes) : null,
            b.url ? h('div', { style: { fontSize: 10, color: '#86efac', marginTop: 2 } }, b.url) : null);
        })));
    }

    // ─── MARITIME HISTORY tab
    function historyTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📜 Maine Maritime History (deep timeline)'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          '12,000 years of Maine\'s relationship with the sea. From Wabanaki shell middens to modern climate-shifted fisheries.'),
        MARITIME_HISTORY.map(function(e, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 6 } }, e.era),
            h('ul', { style: { margin: '0 0 0 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } },
              e.events.map(function(ev, ei) { return h('li', { key: ei, style: { marginBottom: 3 } }, ev); })),
            e.cite ? h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' } }, '(' + e.cite + ')') : null);
        })));
    }

    // ─── ECOSYSTEM CASES tab
    function ecosystemTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🌐 Ecosystem Case Studies'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Case studies illustrating how Maine\'s marine ecosystem responds to fishing + climate + management.'),
        ECOSYSTEM_CASES.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 6 } }, c.name),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, c.summary),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Lessons: '), c.lessons),
            h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, 'Implications: '), c.implications),
            c.cite ? h('div', { style: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic' } }, '(' + c.cite + ')') : null);
        })));
    }

    // ─── NAV MATH tab
    function navMathTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📐 Navigation Math'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Compass, bearings, dead reckoning, current correction. The math behind safe + accurate navigation.'),
        NAV_MATH.map(function(n, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 6 } }, n.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, n.body),
            h('div', { style: { fontSize: 11, color: '#fbbf24', fontFamily: 'ui-monospace, Menlo, monospace' } }, h('b', null, 'Formula: '), n.formula));
        })));
    }

    // ─── FAMILY PROFILES tab
    function familiesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '👨‍👩‍👧 Maine Fishing + Aquaculture Family Stories'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Multi-generational patterns across Maine\'s working waterfront. Composite profiles representing common arcs.'),
        FAMILY_PROFILES.map(function(f, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 6 } }, f.generation || f.type),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, f.story),
            f.tools ? h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Tools: '), f.tools) : null,
            f.catch ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, 'Catch: '), f.catch) : null,
            f.product ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, 'Product: '), f.product) : null,
            h('div', { style: { fontSize: 11, color: '#fbbf24', fontStyle: 'italic' } }, h('b', null, 'Lessons: '), f.lessons));
        })));
    }

    // ─── ETHICS tab
    function ethicsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '⚖️ Sportfishing + Stewardship Ethics'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Beyond the legal rules: how do we fish in ways that leave the resource better than we found it?'),
        ETHICS.map(function(e, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #86efac' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac', marginBottom: 6 } }, e.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, e.body),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Practical: '), e.practical));
        })));
    }

    // ─── FAMOUS SPOTS tab
    function spotsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📌 Famous Maine Fishing Spots'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Iconic Maine fishing waters — some inshore, some offshore. All with stories.'),
        FISHING_SPOTS.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 4 } },
              h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd' } }, s.name),
              s.coords ? h('div', { style: { fontSize: 10, color: '#94a3b8', fontFamily: 'ui-monospace, Menlo, monospace' } }, s.coords) : null),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Region: '), s.region),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Species: '), s.species),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3, fontStyle: 'italic' } }, s.character),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Practical: '), s.practical));
        })));
    }

    // ─── KNOT STEPS tab
    function knotStepsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🎬 Knot Tying — Step by Step'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Detailed step-by-step for the 5 essential knots. Practice with a 6-ft cord.'),
        KNOT_STEPS.map(function(k, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 6 } }, k.name),
            h('ol', { style: { margin: '0 0 8px 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } },
              k.steps.map(function(s, si) { return h('li', { key: si, style: { marginBottom: 3 } }, s.substring(s.indexOf('.') + 2)); })),
            h('div', { style: { fontSize: 11, color: '#86efac', fontStyle: 'italic' } }, h('b', null, '✓ Check: '), k.check));
        })));
    }

    // ─── SPECIES DEEP DIVES tab
    function deepDivesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🔬 Species Deep Dives'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Multi-paragraph essays on Maine\'s top-tier species. Covers taxonomy, life history, ecology, fisheries history, climate vulnerability, and stewardship.'),
        SPECIES_DEEP_DIVES.map(function(s, i) {
          return h('div', { key: i, style: { padding: 14, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#bae6fd', marginBottom: 8 } }, s.name),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6 } }, h('b', null, 'Taxonomy: '), s.taxonomy),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6, lineHeight: 1.6 } }, h('b', null, 'Life History: '), s.lifeHistory),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6, lineHeight: 1.6 } }, h('b', null, 'Ecology: '), s.ecology),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6, lineHeight: 1.6 } }, h('b', null, 'Fishery History: '), s.fisheryHistory),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'Current Status: '), s.currentStatus),
            h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 6 } }, h('b', null, 'Climate Vulnerability: '), s.climateVulnerability),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Stewardship: '), s.stewardship),
            s.cite ? h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' } }, '(' + s.cite + ')') : null);
        })));
    }

    // ─── SAFETY CHECKLISTS tab
    function safetyChkTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📋 Comprehensive Safety Checklists — Print + Laminate'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Ten checklists covering every phase of a boating day + every major emergency. Print, laminate, store in boat. The minutes you save building habit save lives in seconds when emergencies start.'),
        SAFETY_CHECKLISTS.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 10, borderLeft: '5px solid #fbbf24' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#fcd34d', marginBottom: 8 } }, '📋 ' + c.title),
            h('ul', { style: { margin: '0 0 0 20px', padding: 0, fontSize: 11, color: '#e2e8f0', lineHeight: 1.7 } },
              c.items.map(function(it, j) { return h('li', { key: j, style: { marginBottom: 3 } }, '☐ ' + it); })));
        })));
    }

    // ─── INVASIVES tab
    function invasivesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🦀 Invasive + Range-Shifting Species — Gulf of Maine'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Non-native species that have arrived in Gulf of Maine waters + are reshaping ecosystems. Green crabs alone have devastated soft-shell clam fisheries. Climate warming + global shipping continue to introduce new species. Identification + management info for each.'),
        INVASIVES.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 10, borderLeft: '5px solid #f43f5e' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#fda4af', marginBottom: 6 } }, '🦀 ' + s.name),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Arrival: '), s.arrival),
            h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 6 } }, h('b', null, 'Impact: '), s.impact),
            s.identification ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Identification: '), s.identification) : null,
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Management: '), s.management));
        })));
    }

    // ─── STUDENT FAQ tab
    function studentFaqTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '❓ Student FAQ — Common Questions Answered'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Real questions middle-schoolers ask about fishing + boating + the ocean economy. Plain-language answers that connect to the rest of the tool.'),
        STUDENT_FAQ.map(function(f, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 10, borderLeft: '5px solid #f97316' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fdba74', marginBottom: 6 } }, '❓ ' + f.q),
            h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, f.a));
        })));
    }

    // ─── NAVIGATION PROBLEMS tab
    function navProbTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📐 Navigation Problems — 15 Worked Examples'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Practical navigation problems with full solutions. Covers dead reckoning, bearings + fixes, currents, fuel, tides, COLREGS, fog protocols, anchor scope, AIS. Read problem → try to solve → check solution.'),
        NAV_PROBLEMS.map(function(p, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 10, borderLeft: '5px solid #8b5cf6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 6 } }, '#' + p.id + ': ' + p.title),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6, lineHeight: 1.5 } }, h('b', null, 'Problem: '), p.problem),
            h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Knowns: '), p.knowns),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6, lineHeight: 1.5 } }, h('b', null, 'Solve: '), p.solve),
            h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 6 } }, h('b', null, 'Answer: '), p.answer),
            h('div', { style: { fontSize: 11, color: '#fb923c', fontStyle: 'italic' } }, h('b', { style: { fontStyle: 'normal' } }, 'Learning: '), p.learning));
        })));
    }

    // ─── COMPOSITE VOYAGES tab
    function voyagesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🛥 Composite Voyages — Full-Day Narrated Fishing Trips'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Ten composite voyages walking through a full Maine fishing day — preparation, decisions, fishing, return, log. Each voyage demonstrates regulations + safety + craft in action. Composite means assembled from realistic decisions, not a single trip.'),
        COMPOSITE_VOYAGES.map(function(v, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 14, background: 'rgba(15,23,42,0.6)', borderRadius: 10, borderLeft: '5px solid #38bdf8' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#7dd3fc', marginBottom: 6 } }, '🛥 ' + v.title),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Crew + boat: '), v.crew),
            h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 3 } }, h('b', null, 'Goal: '), v.goal),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 8, fontStyle: 'italic' } }, h('b', { style: { fontStyle: 'normal' } }, 'Conditions: '), v.conditions),
            h('div', { style: { padding: 10, background: 'rgba(0,0,0,0.25)', borderRadius: 6, marginBottom: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#fbbf24', marginBottom: 6 } }, 'Narrative timeline:'),
              v.narrative.map(function(line, j) {
                return h('div', { key: j, style: { fontSize: 11, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 4, paddingLeft: 6, borderLeft: '2px solid rgba(56,189,248,0.3)' } }, line);
              })),
            h('div', { style: { fontSize: 11, color: '#86efac', padding: 8, background: 'rgba(134,239,172,0.08)', borderRadius: 6 } }, h('b', null, 'Lessons: '), v.lessons));
        })));
    }

    // ─── ENGINE MAINTENANCE tab
    function engMaintTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '⚙️ Engine + Boat Maintenance Reference'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maintenance schedules, daily checks, common failures, DIY vs shop, tools, and most-common mistakes for the major boat-engine systems Maine boaters encounter. The boat is only as reliable as the maintenance behind it.'),
        ENGINE_MAINT.map(function(e, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 10, borderLeft: '5px solid #fb923c' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#fb923c', marginBottom: 6 } }, '⚙️ ' + e.system),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'Schedule: '), e.schedule),
            e.daily ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Daily check: '), e.daily) : null,
            h('div', { style: { fontSize: 11, color: '#fca5a5', marginBottom: 6 } }, h('b', null, 'Common failures: '), e.common_failures),
            e.diy_or_shop ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 6 } }, h('b', null, 'DIY vs shop: '), e.diy_or_shop) : null,
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Tools needed: '), e.tools_needed),
            h('div', { style: { fontSize: 11, color: '#fdba74' } }, h('b', null, 'Common mistakes: '), e.common_mistakes));
        })));
    }

    // ─── STUDENT CAREER tab
    function studCareerTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🎓 Maine Fisheries Student Career Decision Guide'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Questions to help students decide if commercial fishing or marine sciences is their path.'),
        STUDENT_CAREER.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 6 } }, '❓ ' + s.question),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 4 } }, h('b', null, 'Consider: '), s.consider),
            h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 4 } }, h('b', null, 'Pathways: '), s.pathways),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 4 } }, h('b', null, 'Key steps: '), s.key_steps),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Timeline: '), s.timeline));
        })));
    }

    // ─── CLIMATE DEEP tab
    function climateDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🌡 Climate Change Deep Dive — Maine Fisheries'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Climate impacts on Maine fisheries; industry adaptation strategy.'),
        CLIMATE_DEEP.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fb923c' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fdba74', marginBottom: 4 } }, c.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, c.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Relevance: '), c.relevance));
        })));
    }

    // ─── WATERFRONT DEEP tab
    function waterfrontDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '⚓ Maine Working Waterfront — Deep Case Study'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Industry-essential infrastructure + preservation effort.'),
        WATERFRONT_DEEP.map(function(w, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, w.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, w.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Relevance: '), w.relevance));
        })));
    }

    // ─── MPAS tab
    function mpasTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🌐 Marine Protected Areas + Conservation in Maine'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Federal + state + tribal marine conservation in Maine waters.'),
        MPAS_CONSERVATION.map(function(m, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #86efac' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac', marginBottom: 4 } }, m.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, m.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Relevance: '), m.relevance));
        })));
    }

    // ─── TUNA DEEP tab
    function tunaDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🐟 Atlantic Bluefin Tuna + Offshore Species — Deep Case Study'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine offshore commercial + charter industry. International species; high-value fishery.'),
        TUNA_INDUSTRY.map(function(t, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, t.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, t.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Relevance: '), t.relevance));
        })));
    }

    // ─── ALEWIFE DEEP tab
    function alewifeDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🐟 Atlantic Alewife + Sea-Run Fish — Deep Case Study'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Sea-run fish restoration; Wabanaki + community + agency partnership.'),
        ALEWIFE_INDUSTRY.map(function(a, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, a.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, a.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Relevance: '), a.relevance));
        })));
    }

    // ─── STRIPER DEEP tab
    function striperDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🐟 Atlantic Striped Bass — Deep Case Study'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Multi-state migratory recovery + management challenges.'),
        STRIPER_INDUSTRY.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, s.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, s.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Relevance: '), s.relevance));
        })));
    }

    // ─── COD DEEP tab
    function codDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🐟 Maine + Gulf of Maine Cod Industry — Deep Case Study'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Cod\'s rise + collapse + climate-driven challenges. Industry-defining case study.'),
        COD_INDUSTRY.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fb923c' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fdba74', marginBottom: 4 } }, c.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, c.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Relevance: '), c.relevance));
        })));
    }

    // ─── RIGHT WHALE DEEP tab
    function rightWhaleTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🐋 North Atlantic Right Whale — Deep Case Study'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Critical endangered species; industry transition; conservation case study.'),
        RIGHT_WHALE_DEEP.map(function(r, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, r.aspect),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, r.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Maine implications: '), r.maine_implications));
        })));
    }

    // ─── LOBSTER CONSERVATION tab
    function lobsterConserveTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🦞 Maine Lobster Conservation — Deep Case Study'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine lobster conservation tools + their effectiveness. Case study in successful management.'),
        LOBSTER_CONSERVATION.map(function(l, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fbbf24' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fde047', marginBottom: 4 } }, '🦞 ' + l.tool),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, l.content),
            h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, 'Science: '), l.science),
            h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 3 } }, h('b', null, 'Result: '), l.result),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Lesson: '), l.lesson));
        })));
    }

    // ─── NOTABLE PEOPLE tab
    function notablePeopleTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '👤 Notable People in Maine Fisheries'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'People shaping Maine fisheries — captains, scientists, authors, advocates, tribal leaders.'),
        NOTABLE_PEOPLE.map(function(p, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 4 } }, p.name),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Era: '), p.era, ' · ', h('b', null, 'Role: '), p.role),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Contribution: '), p.contribution),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Legacy: '), p.legacy));
        })));
    }

    // ─── GLOBAL CONTEXT tab
    function globalContextTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🌍 Maine Fisheries in Global Context'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'How Maine fisheries fit into broader regional + national + international context.'),
        GLOBAL_CONTEXT.map(function(g, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 6 } }, g.region),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, g.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Maine relevance: '), g.maine_relevance));
        })));
    }

    // ─── INDUSTRY GROUPS tab
    function indGroupsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🤝 Maine Fisheries Industry Groups + Associations'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Trade groups, associations, agencies, NGOs supporting Maine fisheries.'),
        INDUSTRY_GROUPS.map(function(g, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, g.group),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Role: '), g.role),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Function: '), g.function),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Contact: '), g.contact),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Relevance: '), g.relevance));
        })));
    }

    // ─── WABANAKI FIGURES tab
    function wabFiguresTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🪶 Notable Wabanaki Figures'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Wabanaki nation leaders, scholars, advocates — past + present. For Maine Indian Education LD 291 + cultural literacy.'),
        WABANAKI_FIGURES.map(function(w, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 4 } }, w.name),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Era: '), w.era),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Role: '), w.role),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Contribution: '), w.contribution),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Legacy: '), w.legacy));
        })));
    }

    // ─── MGMT MILESTONES tab
    function mgmtMileTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🏛 Maine Fisheries Management Milestones'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Key legal + policy milestones shaping Maine fisheries.'),
        MGMT_MILESTONES.map(function(m, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, m.milestone),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Year: '), m.year),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Summary: '), m.summary),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Impact: '), m.impact),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Current relevance: '), m.current_relevance));
        })));
    }

    // ─── TERMINOLOGY ESSAYS tab
    function termEssaysTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📖 Common Boating + Fishing Terms — Essay-Style Explanations'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Expanded explanations + context for common terminology. Reference for deeper understanding.'),
        TERMINOLOGY_ESSAYS.map(function(t, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#bae6fd', marginBottom: 4 } }, t.term),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } }, t.essay));
        })));
    }

    // ─── GEAR MASTER LIST tab
    function gearMasterTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🧰 Comprehensive Gear + Equipment Master List'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Every piece of gear you need for Maine commercial + recreational fishing operations.'),
        GEAR_MASTER.map(function(g, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 6 } }, g.category),
            h('ul', { style: { margin: '0 0 0 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } },
              g.items.map(function(it, ii) { return h('li', { key: ii, style: { marginBottom: 2 } }, it); })));
        })));
    }

    // ─── MENTORSHIP GUIDE tab
    function mentorshipTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🎓 Mentorship + Apprenticeship Guide'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'How apprenticeship + mentorship works in Maine fisheries. For both apprentices + mentors.'),
        MENTORSHIP_GUIDE.map(function(m, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 6 } }, m.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, m.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Practical: '), m.practical));
        })));
    }

    // ─── VOICES tab
    function voicesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🗣️ Voices from Maine\'s Working Waterfront'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Composite quotes representing Maine fishermen, scientists, advocates, + Indigenous voices.'),
        VOICES.map(function(v, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 12, color: '#bae6fd', marginBottom: 4 } }, h('b', null, v.speaker)),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 4 } }, '"' + v.quote + '"'),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Context: '), v.context));
        })));
    }

    // ─── FUTURE OUTLOOK tab
    function futureTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🔮 Maine Fisheries Future Outlook'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Where Maine fisheries are heading. Climate + management + sovereignty + technology.'),
        FUTURE_OUTLOOK.map(function(f, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 6 } }, f.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, f.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Maine implications: '), f.maine_implications));
        })));
    }

    // ─── CHART GUIDE tab
    function chartGuideTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🗺 Comprehensive Nautical Chart Reading Guide'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Master chart reading. Foundation of safe navigation.'),
        CHART_GUIDE.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, c.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, c.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Practical: '), c.practical));
        })));
    }

    // ─── SAFETY MANUAL tab
    function safetyManTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🛟 Comprehensive Safety Manual'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Detailed safety topics for Maine boaters. Master these before going out.'),
        SAFETY_MANUAL.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fb923c' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fdba74', marginBottom: 4 } }, '🛟 ' + s.topic),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3, lineHeight: 1.5 } }, h('b', null, 'Detail: '), s.detail),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Training: '), s.training),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Best practice: '), s.best_practice));
        })));
    }

    // ─── PLAYBOOKS tab
    function playbooksTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📕 Operational Playbooks'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Detailed step-by-step walkthroughs of common Maine fisheries operations.'),
        PLAYBOOKS.map(function(p, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fbbf24' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fde047', marginBottom: 6 } }, '📕 ' + p.situation),
            h('ol', { style: { margin: '0 0 8px 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
              p.walkthrough.map(function(s, si) { return h('li', { key: si, style: { marginBottom: 2 } }, s); })),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Learning: '), p.learning));
        })));
    }

    // ─── BIBLIOGRAPHY EXT tab
    function bibExtTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📚 Extended Bibliography + References'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Comprehensive reading list — books, papers, websites, organizations. All claims trace to one of these.'),
        BIBLIOGRAPHY_EXT.map(function(b, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 6, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
            h('div', null,
              h('b', { style: { color: '#bae6fd' } }, b.author + ' (' + b.year + '). '),
              h('span', { style: { fontStyle: 'italic' } }, b.title),
              h('span', null, ' '), h('span', null, b.publisher),
              h('span', { style: { color: '#94a3b8' } }, ' [' + b.type + ']')),
            h('div', { style: { fontSize: 10, color: '#86efac', marginTop: 2 } }, h('b', null, 'Relevance: '), b.relevance),
            h('div', { style: { fontSize: 10, color: '#fbbf24', marginTop: 2 } }, h('b', null, 'Use: '), b.use));
        })));
    }

    // ─── REFERENCE NUMBERS tab
    function refNumbersTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🔢 Key Maine Fisheries Reference Numbers'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Important quantitative facts. Memorize these for industry literacy.'),
        REFERENCE_NUMBERS.map(function(r, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fbbf24' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fde047', marginBottom: 4 } }, r.metric),
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#86efac', marginBottom: 3 } }, r.value),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Context: '), r.context),
            h('div', { style: { fontSize: 11, color: '#bae6fd' } }, h('b', null, 'Practical: '), r.practical));
        })));
    }

    // ─── NOTABLE EVENTS tab
    function eventsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📅 Notable Events in Maine Fisheries History'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Major events that shaped + reshaped Maine fisheries. Case studies for management + history.'),
        NOTABLE_EVENTS.map(function(e, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 4 } }, '📅 ' + e.event),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Year: '), e.year),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Cause: '), e.cause),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Response: '), e.response),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Lessons: '), e.lessons),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Maine: '), e.maine_implications));
        })));
    }

    // ─── CULINARY tab
    function culinaryTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🍽 Maine Culinary Traditions'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine\'s seafood dishes — recipes, history, cultural significance. Where the fishery meets the kitchen.'),
        CULINARY.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fb923c' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fdba74', marginBottom: 4 } }, '🍽 ' + c.dish),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Species: '), c.species),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Ingredients: '), c.ingredients),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Preparation: '), c.preparation),
            h('div', { style: { fontSize: 11, color: '#a78bfa', marginBottom: 3 } }, h('b', null, 'History: '), c.history),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Significance: '), c.cultural_significance));
        })));
    }

    // ─── WORKFORCE PIPELINE tab
    function workforceTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🎓 Maine Fisheries Workforce Pipeline'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'The educational + career pipeline supporting Maine fisheries + aquaculture industries.'),
        WORKFORCE_PIPELINE.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 4 } }, s.stage),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Activities: '), s.activities),
            h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 3 } }, h('b', null, 'Partnerships: '), s.partnerships),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Outcomes: '), s.outcomes));
        })));
    }

    // ─── EMERGENCY tab
    function emergencyTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🚨 Emergency Response Procedures'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Practiced emergency procedures save lives. Memorize + drill regularly.'),
        EMERGENCY_PROCEDURES.map(function(e, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #dc2626' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fca5a5', marginBottom: 6 } }, '🚨 ' + e.emergency),
            h('ol', { style: { margin: '0 0 8px 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
              e.response.map(function(s, si) { return h('li', { key: si, style: { marginBottom: 2 } }, s.replace(/^\d+\.\s*/, '')); })),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Training: '), e.training));
        })));
    }

    // ─── TRAINING CHECKLIST tab
    function trainingTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📚 Training Checklist + Apprentice Pathway'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          '10-module training program covering Maine boating + fishing competencies.'),
        TRAINING_CHECKLIST.map(function(m, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 6 } }, m.module),
            h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 4 } }, h('b', null, 'Skills:')),
            h('ul', { style: { margin: '0 0 8px 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
              m.skills.map(function(s, si) { return h('li', { key: si, style: { marginBottom: 2 } }, s); })),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Duration: '), m.duration),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Certification: '), m.certification));
        })));
    }

    // ─── REG FRAMEWORK tab
    function regFrameworkTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '⚖️ Regulatory Framework — Detail'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'The federal + state + tribal laws shaping Maine fisheries. Every working mariner should understand at least at high level.'),
        REG_FRAMEWORK.map(function(r, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, r.law),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Year: '), r.year),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Scope: '), r.scope),
            h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 3 } }, h('b', null, 'Maine relevance: '), r.maine_relevance),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Keys: '), r.keys));
        })));
    }

    // ─── PUBLIC FAQ tab
    function faqPubTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '❓ Public Frequently Asked Questions'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Common questions asked by visitors, students, + public about Maine fisheries. Memorize answers if you\'re a guide.'),
        FAQ_PUBLIC.map(function(f, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8 } },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: '#bae6fd', marginBottom: 4 } }, 'Q: ' + f.q),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, h('b', null, 'A: '), f.a));
        })));
    }

    // ─── STUDENT ACTIVITIES tab
    function activitiesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🎯 Student Hands-On Activities'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Practical hands-on activities for grades 6-12 + community education.'),
        STUDENT_ACTIVITIES.map(function(a, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #86efac' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac', marginBottom: 6 } }, a.activity),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 6 } }, a.content),
            h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 4 } }, h('b', null, 'Learning Objectives:')),
            h('ul', { style: { margin: '0 0 8px 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
              a.learning_objectives.map(function(o, oi) { return h('li', { key: oi }, o); })),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Materials: '), a.materials.join(' · ')),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Time: '), a.time));
        })));
    }

    // ─── COMMUNITY MODELS tab
    function communityTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🤝 Maine Community Governance Models'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'How Maine communities govern fisheries + working waterfront. Models of self-governance, cooperation, and partnership.'),
        COMMUNITY_MODELS.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 6 } }, c.model),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, c.description),
            h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 3 } }, h('b', null, 'Example: '), c.example),
            h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, 'Strengths: '), c.strengths),
            h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 3 } }, h('b', null, 'Limitations: '), c.limitations),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Lesson: '), c.lesson));
        })));
    }

    // ─── SUCCESS STORIES tab
    function successTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🏆 Conservation Success Stories'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine + Atlantic fisheries restoration stories — proof that conservation can succeed.'),
        SUCCESS_STORIES.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #86efac' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac', marginBottom: 6 } }, '🏆 ' + s.name),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, s.story),
            h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 3 } }, h('b', null, 'Keys: '), s.keys),
            h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, 'Result: '), s.result),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Lessons: '), s.lessons));
        })));
    }

    // ─── REGIONAL TRADITIONS tab
    function regionalTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🗺 Maine Regional Fishing Traditions'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Each Maine region has distinct fishing traditions + working waterfront character.'),
        REGIONAL_TRADITIONS.map(function(r, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 6 } }, r.region),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Tradition: '), r.tradition),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, r.tradition_continued),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Changes: '), r.changes));
        })));
    }

    // ─── EXTENDED GLOSSARY tab
    function extGlossaryTab() {
      // Combine all extended glossary entries + sort alphabetically (with multi-letter groups at end)
      var allEntries = EXTENDED_GLOSSARY.concat(EXTENDED_GLOSSARY_LT).concat(EXTENDED_GLOSSARY_QZ);
      // Stable sort by first letter
      allEntries.sort(function(a, b) {
        return a.letter.charCodeAt(0) - b.letter.charCodeAt(0);
      });
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📒 Extended Glossary (E-Z)'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Extended alphabetical glossary continuing main Glossary tab. See Glossary tab for A-D.'),
        allEntries.map(function(g, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#bae6fd', marginBottom: 6 } }, g.letter),
            h('ul', { style: { margin: '0 0 0 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } },
              g.entries.map(function(e, ei) { return h('li', { key: ei, style: { marginBottom: 2 } }, e); })));
        })));
    }

    // ─── STUDY GUIDE tab
    function studyGuideTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🎓 Comprehensive Study Guide'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Unit-by-unit study guide with essential questions + key concepts + suggested assessments.'),
        STUDY_GUIDE.map(function(u, i) {
          return h('div', { key: i, style: { padding: 14, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#c4b5fd', marginBottom: 8 } }, u.unit),
            h('div', { style: { fontSize: 12, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Essential Questions:')),
            h('ul', { style: { margin: '0 0 10px 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } },
              u.essential_questions.map(function(q, qi) { return h('li', { key: qi, style: { marginBottom: 3 } }, q); })),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 4 } }, h('b', null, 'Key Concepts: '), u.key_concepts),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Assessments: '), u.assessments));
        })));
    }

    // ─── FISHERIES FACTS tab
    function fishFactsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '💡 Key Maine Fisheries Facts'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Surprising + important facts about Maine fisheries — for quick reference + classroom discussion.'),
        FISHERIES_FACTS.map(function(f, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fbbf24' } },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: '#fde047', marginBottom: 4 } }, '🔑 ' + f.fact),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Context: '), f.context),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Implication: '), f.implication));
        })));
    }

    // ─── TEXTBOOK CHAPTERS tab
    function textbookTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📘 Fisheries Textbook Chapters'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Comprehensive multi-section chapters covering the full Maine fisheries curriculum. Suitable for high school + community college courses.'),
        TEXTBOOK_CHAPTERS.map(function(c, i) {
          return h('div', { key: i, style: { padding: 14, marginBottom: 14, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 15, fontWeight: 900, color: '#bae6fd', marginBottom: 10 } }, c.chapter),
            c.sections.map(function(s, si) {
              return h('div', { key: si, style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 8, paddingLeft: 8, borderLeft: '2px solid rgba(56,189,248,0.3)' } },
                h('p', { style: { margin: 0 } }, s));
            }));
        })));
    }

    // ─── FISHERIES ESSAYS tab
    function fishEssaysTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📰 Comprehensive Fisheries Essays'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Long-form essays on the science, culture, and management of Maine fisheries.'),
        FISHERIES_ESSAYS.map(function(e, i) {
          return h('div', { key: i, style: { padding: 14, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#c4b5fd', marginBottom: 8 } }, e.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 6 } }, e.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Practical: '), e.practical));
        })));
    }

    // ─── EXTENDED SPECIES tab
    function extSpeciesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📚 Extended Species Profiles'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Multi-paragraph essays on Maine species. Covering life history, ecology, fishery management, climate considerations.'),
        EXTENDED_SPECIES.map(function(s, i) {
          return h('div', { key: i, style: { padding: 14, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#bae6fd', marginBottom: 8 } }, s.name),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 6 } }, s.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Practical: '), s.practical));
        })));
    }

    // ─── BOATING SKILLS tab
    function boatSkillsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🚤 Boating Skills — Detailed'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Practical boating skills broken down step-by-step. Master these for safe + competent operation.'),
        BOATING_SKILLS.map(function(b, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 6 } }, b.skill),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, b.content),
            h('div', { style: { fontSize: 11, color: '#fb923c' } }, h('b', null, 'Common Mistake: '), b.mistake));
        })));
    }

    // ─── BOATING REGS tab
    function boatRegsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📋 Maine Boating Regulations'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'State + federal regulations every Maine boater must know.'),
        BOATING_REGS.map(function(b, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fbbf24' } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde047', marginBottom: 4 } }, b.topic),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Summary: '), b.summary),
            h('div', { style: { fontSize: 11, color: '#94a3b8' } }, h('b', null, 'Details: '), b.details));
        })));
    }

    // ─── HISTORICAL VESSELS tab
    function vesselsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '⛴️ Maine Historical + Working Vessels'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Vessels that shaped Maine\'s maritime heritage + working fleet today.'),
        HISTORICAL_VESSELS.map(function(v, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 4 } }, v.name),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Origin: '), v.origin),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Role: '), v.role),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Design: '), v.design),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Historical: '), v.historical),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Lessons: '), v.lessons));
        })));
    }

    // ─── SPECIES BY HABITAT tab
    function habitatsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🌊 Species by Habitat'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine waters stratify by depth + bottom type. Different species occupy different habitat types.'),
        SPECIES_BY_HABITAT.map(function(h_, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, h_.habitat),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Species: '), (h_.species || []).join(', ')),
            h('div', { style: { fontSize: 11, color: '#86efac', fontStyle: 'italic' } }, h('b', null, 'Ecology: '), h_.ecology));
        })));
    }

    // ─── REGS DEEP DIVE tab
    function regsDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📑 Fishing Regulations — Deep Dive'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'How fisheries regulations work + why. Understanding the framework lets you advocate intelligently.'),
        REGS_DEEP.map(function(r, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 6 } }, r.rule),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Purpose: '), r.purpose),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Example: '), r.example),
            h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, 'Science: '), r.science),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Enforcement: '), r.enforcement));
        })));
    }

    // ─── ID KEY tab
    function idKeyTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🔍 Maine Fish + Lobster ID Key (Dichotomous)'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Step-by-step decision tree for identifying Maine\'s common species.'),
        ID_KEY.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, 'Step ' + s.step),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 4 } }, h('b', null, 'Q: '), s.question),
            s.yes ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, 'YES → '), s.yes) : null,
            s.no ? h('div', { style: { fontSize: 11, color: '#fb923c' } }, h('b', null, 'NO → '), s.no) : null);
        })));
    }

    // ─── TECHNIQUE GUIDES tab
    function techGuidesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🎯 Fishing Technique Guides'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Method-by-method guides covering gear, technique, conditions, tips, and common mistakes.'),
        TECHNIQUE_GUIDES.map(function(t, i) {
          return h('div', { key: i, style: { padding: 14, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#bae6fd', marginBottom: 6 } }, t.method),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 4 } }, h('b', null, 'Gear: '), t.gear),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 4, lineHeight: 1.5 } }, h('b', null, 'Technique: '), t.technique),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 4 } }, h('b', null, 'Best Conditions: '), t.best_conditions),
            h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 4 } }, h('b', null, 'Tips: '), t.tips),
            h('div', { style: { fontSize: 11, color: '#fb923c' } }, h('b', null, 'Common Mistakes: '), t.common_mistakes));
        })));
    }

    // ─── MAINTENANCE tab
    function maintenanceTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🔧 Boat + Engine Maintenance Schedule'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'A working boat is a maintenance-intensive vehicle. Below is the standard schedule that keeps you on the water safely.'),
        MAINTENANCE.map(function(m, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 6 } }, m.interval),
            h('ul', { style: { margin: '0 0 0 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
              m.tasks.map(function(t, ti) { return h('li', { key: ti }, t); })));
        })));
    }

    // ─── BOOKS tab
    function booksTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📚 Books, Magazines, + Maritime Writers'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Books + periodicals worth your shelf or your boat.'),
        BOOKS_WRITERS.map(function(b, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8 } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 3 } }, '"' + b.title + '"'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Author: '), b.author, ' · ', h('b', null, 'Year: '), b.year),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'About: '), b.summary),
            h('div', { style: { fontSize: 11, color: '#86efac', fontStyle: 'italic' } }, h('b', null, 'Notes: '), b.notes));
        })));
    }

    // ─── WOMEN IN MARITIME tab
    function womenTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '👩 Women in Maine Maritime History'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine\'s commercial fisheries + aquaculture have always included women — sometimes in leadership, often without recognition. This sample documents key figures + roles.'),
        WOMEN_MARITIME.map(function(w, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 4 } }, w.name),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Role: '), w.role, ' · ', h('b', null, 'Dates: '), w.dates),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Contribution: '), w.contribution),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Legacy: '), w.legacy));
        })));
    }

    // ─── YEAR PLAN tab
    function yearPlanTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🗓 A Year in Maine Fishing'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Monthly game plan across saltwater + freshwater + lobster. What\'s in season + what to chase.'),
        YEAR_GAME_PLAN.map(function(m, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fbbf24' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fde047', marginBottom: 6 } }, m.month),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Saltwater: '), m.saltwater),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Freshwater: '), m.freshwater),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Lobster: '), m.lobster),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Gear: '), m.gear),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Culinary: '), m.culinary));
        })));
    }

    // ─── CHART SYMBOLS tab
    function chartSymbolsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🗺 NOAA Chart Symbology Reference'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'NOAA charts contain ~1000 distinct symbols + abbreviations defined in "Chart 1." Below are the most-important categories.'),
        CHART_SYMBOLS.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 6 } }, c.category),
            h('ul', { style: { margin: '0 0 0 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
              c.items.map(function(it, ii) { return h('li', { key: ii }, it); })));
        })));
    }

    // ─── LIGHTHOUSES tab
    function lighthousesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '💡 Maine Lighthouse Inventory'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine has 60+ lighthouses. Featured here are the most navigationally + historically significant. All active aids unless noted.'),
        LIGHTHOUSES.map(function(l, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fbbf24' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fde047', marginBottom: 4 } }, '💡 ' + l.name),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Location: '), l.location, ' · ', h('b', null, 'Built: '), l.year),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Height: '), l.height, ' · ', h('b', null, 'Range: '), l.range, ' · ', h('b', null, 'Character: '), l.character),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Historical: '), l.historical),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Access: '), l.access));
        })));
    }

    // ─── INVERTEBRATES tab
    function invertsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🦀 Maine Marine Invertebrates'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Beyond lobster + bivalves: Maine\'s diverse marine invertebrate community. Some commercial; some ecologically critical.'),
        INVERTEBRATES.map(function(iv, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8 } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, iv.name),
            h('div', { style: { fontSize: 10, fontStyle: 'italic', color: '#94a3b8', marginBottom: 4 } }, iv.sci),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Habitat: '), iv.habitat),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Role: '), iv.role),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Market: '), iv.market),
            h('div', { style: { fontSize: 11, color: '#fb923c' } }, h('b', null, 'Climate: '), iv.climate));
        })));
    }

    // ─── HARBOR DETAILS tab
    function harborsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '⚓ Maine Harbor Details'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Practical chart + facility info for Maine\'s major working harbors.'),
        HARBOR_DETAILS.map(function(hh, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 4 } },
              h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd' } }, hh.name),
              h('div', { style: { fontSize: 10, color: '#94a3b8', fontFamily: 'ui-monospace, Menlo, monospace' } }, hh.chart)),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Tidal range: '), hh.tidal_range, ' · ', h('b', null, 'Depths: '), hh.depths),
            h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 3 } }, h('b', null, '⚠ Hazards: '), hh.hazards),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Buoyage: '), hh.buoyage),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Facilities: '), hh.facilities),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Best for: '), hh.best_for));
        })));
    }

    // ─── WEATHER TIPS tab
    function weatherTipsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🌥 Reading Weather Signs'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Traditional + modern weather-prediction signs every mariner should recognize.'),
        WEATHER_TIPS.map(function(w, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fbbf24' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fde047', marginBottom: 4 } }, '🌥 ' + w.sign),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Means: '), w.means),
            h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, 'Action: '), w.action),
            h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, h('b', null, 'Timing: '), w.timing));
        })));
    }

    // ─── SEAMANSHIP tab
    function seamanshipTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🧭 Seamanship Skills'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Practical skills every mariner should master. Practice in fair conditions before you need them in foul.'),
        SEAMANSHIP.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 6 } }, s.skill),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 4, lineHeight: 1.5 } }, h('b', null, 'How: '), s.details),
            h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 4 } }, h('b', null, 'Common Mistake: '), s.mistake),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Practice: '), s.practice));
        })));
    }

    // ─── NIGHT NAV tab
    function nightNavTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🌙 Night + Restricted-Visibility Navigation'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Vessels have a whole vocabulary of lights + sounds for night + fog. Reading them is core seamanship.'),
        NIGHT_NAV.map(function(n, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 6 } }, n.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, n.body),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Practical: '), n.practical));
        })));
    }

    // ─── Main render
    return h('div', { style: { padding: 16, background: '#031523', minHeight: 400 } },
      tabBar(),
      tab === 'home' ? homeTab() :
      tab === 'sim' ? simTab() :
      tab === 'chart' ? chartTab() :
      tab === 'buoyage' ? buoyageTab() :
      tab === 'colregs' ? colregsTab() :
      tab === 'weather' ? weatherTab() :
      tab === 'vhf' ? vhfTab() :
      tab === 'knots' ? knotsTab() :
      tab === 'species' ? speciesTab() :
      tab === 'gear' ? gearTab() :
      tab === 'bait' ? baitTab() :
      tab === 'boats' ? boatsTab() :
      tab === 'ports' ? portsTab() :
      tab === 'zones' ? zonesTab() :
      tab === 'regs' ? regsTab() :
      tab === 'license' ? licenseTab() :
      tab === 'wabanaki' ? wabanakiTab() :
      tab === 'climate' ? climateTab() :
      tab === 'conservation' ? conservationTab() :
      tab === 'survival' ? survivalTab() :
      tab === 'safety' ? safetyTab() :
      tab === 'law' ? lawTab() :
      tab === 'seabirds' ? seabirdsTab() :
      tab === 'mammals' ? mammalsTab() :
      tab === 'tides' ? tidesTab() :
      tab === 'watercolumn' ? waterColumnTab() :
      tab === 'careers' ? careersTab() :
      tab === 'history' ? historyTab() :
      tab === 'ecosystem' ? ecosystemTab() :
      tab === 'navmath' ? navMathTab() :
      tab === 'families' ? familiesTab() :
      tab === 'ethics' ? ethicsTab() :
      tab === 'spots' ? spotsTab() :
      tab === 'knotsteps' ? knotStepsTab() :
      tab === 'nightnav' ? nightNavTab() :
      tab === 'deepdives' ? deepDivesTab() :
      tab === 'seamanship' ? seamanshipTab() :
      tab === 'chartsymbols' ? chartSymbolsTab() :
      tab === 'lighthouses' ? lighthousesTab() :
      tab === 'inverts' ? invertsTab() :
      tab === 'harbors' ? harborsTab() :
      tab === 'weathertips' ? weatherTipsTab() :
      tab === 'techguides' ? techGuidesTab() :
      tab === 'maintenance' ? maintenanceTab() :
      tab === 'books' ? booksTab() :
      tab === 'women' ? womenTab() :
      tab === 'yearplan' ? yearPlanTab() :
      tab === 'vessels' ? vesselsTab() :
      tab === 'habitats' ? habitatsTab() :
      tab === 'regsdeep' ? regsDeepTab() :
      tab === 'idkey' ? idKeyTab() :
      tab === 'extspecies' ? extSpeciesTab() :
      tab === 'boatskills' ? boatSkillsTab() :
      tab === 'boatregs' ? boatRegsTab() :
      tab === 'fishessays' ? fishEssaysTab() :
      tab === 'textbook' ? textbookTab() :
      tab === 'studyguide' ? studyGuideTab() :
      tab === 'fishfacts' ? fishFactsTab() :
      tab === 'regional' ? regionalTab() :
      tab === 'extglossary' ? extGlossaryTab() :
      tab === 'activities' ? activitiesTab() :
      tab === 'community' ? communityTab() :
      tab === 'success' ? successTab() :
      tab === 'faqpub' ? faqPubTab() :
      tab === 'training' ? trainingTab() :
      tab === 'regframework' ? regFrameworkTab() :
      tab === 'workforce' ? workforceTab() :
      tab === 'emergency' ? emergencyTab() :
      tab === 'culinary' ? culinaryTab() :
      tab === 'refnumbers' ? refNumbersTab() :
      tab === 'events' ? eventsTab() :
      tab === 'bibext' ? bibExtTab() :
      tab === 'playbooks' ? playbooksTab() :
      tab === 'safetyman' ? safetyManTab() :
      tab === 'chartguide' ? chartGuideTab() :
      tab === 'future' ? futureTab() :
      tab === 'mentorship' ? mentorshipTab() :
      tab === 'voices' ? voicesTab() :
      tab === 'gearmaster' ? gearMasterTab() :
      tab === 'termessays' ? termEssaysTab() :
      tab === 'wabfigures' ? wabFiguresTab() :
      tab === 'mgmtmile' ? mgmtMileTab() :
      tab === 'indgroups' ? indGroupsTab() :
      tab === 'notablepeople' ? notablePeopleTab() :
      tab === 'globalcontext' ? globalContextTab() :
      tab === 'rightwhale' ? rightWhaleTab() :
      tab === 'lobsterconserve' ? lobsterConserveTab() :
      tab === 'coddeep' ? codDeepTab() :
      tab === 'striperdeep' ? striperDeepTab() :
      tab === 'alewifedeep' ? alewifeDeepTab() :
      tab === 'tunadeep' ? tunaDeepTab() :
      tab === 'mpas' ? mpasTab() :
      tab === 'waterfrontdeep' ? waterfrontDeepTab() :
      tab === 'climatedeep' ? climateDeepTab() :
      tab === 'voyages' ? voyagesTab() :
      tab === 'engmaint' ? engMaintTab() :
      tab === 'navprob' ? navProbTab() :
      tab === 'invasives' ? invasivesTab() :
      tab === 'safetychk' ? safetyChkTab() :
      tab === 'studentfaq' ? studentFaqTab() :
      tab === 'studcareer' ? studCareerTab() :
      tab === 'lessonplans' ? lessonPlansTab() :
      tab === 'bibliography' ? bibliographyTab() :
      tab === 'achievements' ? achievementsTab() :
      tab === 'glossary' ? glossaryTab() :
      tab === 'quiz' ? quizTab() :
      h('div', null, 'Unknown tab'));
  }

})();

} // end isRegistered guard
