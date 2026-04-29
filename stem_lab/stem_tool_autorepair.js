// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ═══════════════════════════════════════════
// stem_tool_autorepair.js — Auto Repair Shop
// Educational vehicle-maintenance + diagnostic-thinking tool. Sibling of
// RoadReady (you DRIVE the car) and BikeLab (you maintain a bike). Maine-rural
// DIY emphasis: oldest fleet in the country drives our oldest cars longer,
// salt eats undercarriages, parts stores are 40 minutes off, and the closest
// shop has a 2-week wait. Knowing how to diagnose a noise, change your own
// fluids, and KNOW when to stop and call a pro is a universal life skill.
// Educational only — get certified at ase.com or attend Maine CTE / community
// college automotive programs (linked in resources).
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('autoRepair'))) {

(function() {
  'use strict';

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-live-autorepair')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-autorepair';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  // ── Focus-visible outline (WCAG 2.4.7) ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-ar-focus-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-ar-focus-css';
    st.textContent = '[data-ar-focusable]:focus-visible{outline:3px solid #fbbf24!important;outline-offset:2px!important;border-radius:6px}';
    if (document.head) document.head.appendChild(st);
  })();

  var _arPoliteTimer = null;
  function arAnnounce(text) {
    if (typeof document === 'undefined') return;
    var lr = document.getElementById('allo-live-autorepair');
    if (!lr) return;
    if (_arPoliteTimer) clearTimeout(_arPoliteTimer);
    lr.textContent = '';
    _arPoliteTimer = setTimeout(function() { lr.textContent = String(text || ''); _arPoliteTimer = null; }, 25);
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 1: RESOURCES — every cited org with a working URL
  // ─────────────────────────────────────────────────────────
  var RESOURCES = {
    certification: [
      { name: 'ASE (National Institute for Automotive Service Excellence)', contact: 'ase.com', desc: 'The industry credential. A1–A9 covers cars; T-series for trucks. Most shops require it.', url: 'https://www.ase.com', icon: '🏅' },
      { name: 'EPA Section 609 (refrigerant)', contact: 'epatest.com', desc: 'Required to legally buy or service vehicle A/C refrigerant. ~$20 online test.', url: 'https://www.epatest.com', icon: '🌬️' },
      { name: 'I-CAR (collision repair)', contact: 'i-car.com', desc: 'Body work + structural training, tied to insurance certification.', url: 'https://www.i-car.com', icon: '🔨' }
    ],
    maineEducation: [
      { name: 'Region 9 School of Applied Technology (Mexico, ME)', contact: 'region9.org', desc: 'High-school CTE: Auto Tech program; juniors/seniors from feeder districts. Tied to ASE entry.', url: 'https://www.region9.org', icon: '🌲' },
      { name: 'Portland Arts & Technology HS (PATHS)', contact: 'paths.portlandschools.org', desc: 'Portland-area CTE: Automotive Technology pathway, half-day program.', url: 'https://paths.portlandschools.org', icon: '🌲' },
      { name: 'Mid-Coast School of Technology (Rockland)', contact: 'midcoastschool.com', desc: 'Auto Tech + Diesel & Heavy Equipment; ASE entry-level certifications.', url: 'https://www.midcoastschool.com', icon: '🌲' },
      { name: 'Northern Maine Community College — Auto Tech (Presque Isle)', contact: 'nmcc.edu', desc: 'Two-year AAS in Automotive Technology. NATEF / ASE-aligned.', url: 'https://www.nmcc.edu', icon: '🎓' },
      { name: 'Central Maine Community College — Auto Tech (Auburn)', contact: 'cmcc.edu', desc: 'Two-year AAS; strong job-placement pipeline to dealerships statewide.', url: 'https://www.cmcc.edu', icon: '🎓' },
      { name: 'Washington County Community College — Auto Tech (Calais)', contact: 'wccc.me.edu', desc: 'Down-east access; AAS pathway.', url: 'https://www.wccc.me.edu', icon: '🎓' }
    ],
    safety: [
      { name: 'OSHA — Auto Repair Hazards', contact: 'osha.gov/auto-repair', desc: 'Federal occupational safety standards. The shop you work in must follow these.', url: 'https://www.osha.gov/auto-repair', icon: '⚠️' },
      { name: 'NHTSA Safety Recalls', contact: 'nhtsa.gov/recalls', desc: 'Search by VIN to see if your vehicle has an open safety recall — repair is FREE at any dealer.', url: 'https://www.nhtsa.gov/recalls', icon: '🛑' },
      { name: 'NIOSH Auto-Body Health', contact: 'cdc.gov/niosh', desc: 'Solvent exposure, isocyanates in paint, hearing loss; what PPE actually does.', url: 'https://www.cdc.gov/niosh', icon: '😷' }
    ],
    consumer: [
      { name: 'Better Business Bureau', contact: 'bbb.org', desc: 'Look up a shop before you tow your car there. Maine BBB has Maine-specific complaint history.', url: 'https://www.bbb.org', icon: '🛡️' },
      { name: 'AAA Northern New England', contact: 'northernnewengland.aaa.com', desc: 'Roadside assistance, approved-shop directory, towing in rural Maine.', url: 'https://northernnewengland.aaa.com', icon: '📞' },
      { name: 'RepairPal — Fair Price Estimator', contact: 'repairpal.com', desc: 'Cross-check a quote before you authorize it. Maine pricing is in their dataset.', url: 'https://repairpal.com', icon: '💵' },
      { name: 'CarFax', contact: 'carfax.com', desc: 'Title + accident history before you buy a used vehicle. Salt-state Maine cars need extra scrutiny.', url: 'https://www.carfax.com', icon: '📋' }
    ],
    diy: [
      { name: 'AllData / Mitchell1 (libraries)', contact: 'alldata.com', desc: 'Manufacturer service procedures + torque specs. Many Maine public libraries offer free patron access.', url: 'https://www.alldata.com', icon: '📚' },
      { name: 'Haynes / Chilton manuals', contact: 'haynes.com', desc: 'Vehicle-specific shop manuals. Used copies are cheap; specs are gold.', url: 'https://www.haynes.com', icon: '📖' },
      { name: 'NAPA / O\'Reilly / AutoZone — free OBD-II scan', contact: 'check store', desc: 'Walk in with a check-engine light, they read the codes for free.', url: null, icon: '🔌' },
      { name: 'Earn Your Wrench (Maine forums)', contact: 'maineautoforum.com', desc: 'Local enthusiast network — cold-climate fixes, where to find unrusted donor parts.', url: null, icon: '🔧' }
    ]
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 2: MAINE CONTEXT — why this tool emphasizes the things it does
  // ─────────────────────────────────────────────────────────
  var MAINE_CONTEXT = {
    fleetAge: 'Maine has the oldest average vehicle age in the country (~13.4 years vs ~12.6 national). Older = more maintenance.',
    salt: 'Maine winters mean road salt + brine. Salt eats brake lines, fuel lines, frame rails, and oil-pan bolts. Inspect undercarriage every spring.',
    rust: 'Salt-rust is THE Maine repair problem. A "small" oil leak is often a rusted oil-pan plug. A brake job often turns into a brake-line replacement because the bleeders snap off.',
    distance: 'Rural Maine: closest auto shop can be 30–60 minutes. Closest dealer parts counter can be 2 hours. Knowing what you can DIY and what you cannot saves real time.',
    waitlists: 'Post-COVID, independent shop waits in Maine are routinely 1–4 weeks. Knowing how to limp safely (or not drive at all) until your appointment is real safety knowledge.',
    inspection: 'Maine requires annual safety inspection ($12.50). Brakes, lights, tires, frame, exhaust, wipers, horn, glass. Your shop runs the inspection — DIY readiness saves the failed-and-towed scenario.',
    coldStart: 'Cold-start damage is real. Below 0°F, oil thickens; battery cranks weakly; rubber stiffens. Block heaters, full-synthetic 0W-20, and a healthy battery are not optional.',
    ruralTow: 'AAA Northern New England towing limits in remote Maine vary — Premier covers 200 miles, Plus covers 100, Classic covers 5. Verify before you need it.',
    sticker: 'A failed inspection sticker is the #1 reason Mainers learn auto repair. The shop hands you a list; you have 60 days to fix it. Some items you can DIY (wipers, bulbs); some you cannot (frame rust, brake lines).'
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 3: OBD-II CODES — the codes a teen actually sees
  // OBD-II = federally mandated since 1996. Connector lives under dash near
  // steering column. P0xxx = generic powertrain (most common). All vehicles
  // share the P0xxx codes; P1xxx are manufacturer-specific.
  // ─────────────────────────────────────────────────────────
  var OBD_CODES = [
    { code: 'P0171', name: 'System Too Lean (Bank 1)',
      meaning: 'The engine is getting too much air or not enough fuel.',
      common: 'Vacuum leak (cracked intake hose), dirty mass airflow sensor (MAF), failing fuel pump, clogged fuel filter.',
      diy: 'Yes — clean the MAF sensor with MAF cleaner ($8) first. Replace cracked vacuum hoses ($5–15).',
      shop: 'Fuel pump replacement ($400–800) and most fuel-injection diagnosis goes to a shop.',
      severity: 'medium', illuminates: 'CEL solid' },
    { code: 'P0300', name: 'Random / Multiple Cylinder Misfire',
      meaning: 'The engine is misfiring on more than one cylinder. You can usually feel a rough idle or hesitation.',
      common: 'Worn spark plugs, failing ignition coils, vacuum leak, low fuel pressure, bad fuel.',
      diy: 'Spark plugs are often DIY ($20–60 + 1–2 hours). Ignition-coil swaps are usually doable on accessible engines.',
      shop: 'If misfire moves between cylinders, or compression test is needed, take it in.',
      severity: 'high', illuminates: 'CEL flashing = stop driving' },
    { code: 'P0301', name: 'Cylinder 1 Misfire',
      meaning: 'Cylinder #1 specifically is misfiring. Codes P0302–P0312 work the same way for the other cylinders.',
      common: 'That cylinder\'s spark plug, ignition coil, or fuel injector. Sometimes a compression issue.',
      diy: 'Swap the suspect coil with a known-good neighbor cylinder. If the misfire moves with the coil, you found it.',
      shop: 'If swapping doesn\'t move the misfire, it\'s a fuel injector or compression problem — shop.',
      severity: 'high', illuminates: 'CEL flashing = stop driving' },
    { code: 'P0420', name: 'Catalytic Converter Efficiency Below Threshold (Bank 1)',
      meaning: 'The catalytic converter isn\'t cleaning the exhaust well enough.',
      common: 'Aging cat (after ~150K miles), upstream O2 sensor failure, persistent misfires that ruined the cat.',
      diy: 'Replace the upstream O2 sensor first (~$30–80) — cheaper to rule out before condemning the cat.',
      shop: 'Cat replacement is $800–2500. Often shop work because of welded-in connections + emissions inspections.',
      severity: 'low', illuminates: 'CEL solid (will fail emissions)' },
    { code: 'P0455', name: 'Evaporative Emissions Large Leak',
      meaning: 'The fuel-vapor recapture system has a leak. Often the gas cap.',
      common: 'Loose / cracked gas cap. Cracked EVAP hose. Failed purge valve.',
      diy: 'Tighten the gas cap. Drive 2–3 cycles. If light returns, replace the gas cap ($10–25).',
      shop: 'If gas cap doesn\'t fix it, EVAP smoke-test ($80–150) is a shop diagnosis.',
      severity: 'low', illuminates: 'CEL solid' },
    { code: 'P0442', name: 'Evaporative Emissions Small Leak',
      meaning: 'Same system as P0455 but a smaller leak. Often the same fixes.',
      common: 'Gas cap not turned to 3 clicks. Tiny crack in EVAP hose.',
      diy: 'Cap-tighten + drive cycles, same as above.',
      shop: 'Smoke test if gas cap fix fails.',
      severity: 'low', illuminates: 'CEL solid' },
    { code: 'P0128', name: 'Coolant Temperature Below Thermostat Regulating Temp',
      meaning: 'Engine isn\'t reaching operating temperature. Usually a stuck-open thermostat.',
      common: 'Stuck-open thermostat (especially on older Maine cars after a long cold winter).',
      diy: 'Thermostat replacement is moderate-difficulty DIY ($15 part, 1–2 hours, some coolant work).',
      shop: 'If you don\'t want to bleed the cooling system or work around the serpentine, take it in.',
      severity: 'low', illuminates: 'CEL solid' },
    { code: 'P0500', name: 'Vehicle Speed Sensor Malfunction',
      meaning: 'Speedometer or speed-input signal is failing.',
      common: 'Failed VSS or wheel-speed sensor. Salt corrosion on the connector is common in Maine.',
      diy: 'Clean and de-rust the VSS connector. Replacement varies by vehicle — sometimes simple, sometimes transmission removal.',
      shop: 'Anything requiring transaxle removal goes to a shop.',
      severity: 'medium', illuminates: 'CEL solid + speedo dead' },
    { code: 'P0700', name: 'Transmission Control System Malfunction',
      meaning: 'A general "transmission needs attention" code. Pull a sub-code from the TCM with a better scanner.',
      common: 'Many causes — solenoid, sensor, low fluid, internal mechanical.',
      diy: 'Check fluid level + condition first (if your trans has a dipstick). Many modern transmissions are sealed — no DIY check.',
      shop: 'Almost always shop work. Get a transmission specialist, not a general shop.',
      severity: 'high', illuminates: 'CEL solid + may go limp-mode' },
    { code: 'P0606', name: 'PCM Processor Fault',
      meaning: 'The vehicle\'s computer (Powertrain Control Module) reports an internal fault.',
      common: 'Salt-water intrusion to PCM (kick-panel mounting in many GMs). Very rarely the chip itself.',
      diy: 'Inspect for water under PCM, dry connectors. Otherwise: not DIY.',
      shop: 'Shop. PCM replacement requires reprogramming.',
      severity: 'high', illuminates: 'CEL solid' },
    { code: 'P0011', name: 'Camshaft Position Timing Over-Advanced (Bank 1)',
      meaning: 'Variable valve timing system isn\'t advancing the cam correctly. Often oil-related.',
      common: 'Old or wrong-grade oil clogging the VVT solenoid screen. Failed oil control valve.',
      diy: 'Fresh oil + filter is the FIRST step. A clogged VVT screen is a known fix for many Toyotas.',
      shop: 'If oil change doesn\'t fix it, OCV / solenoid replacement may be shop work depending on access.',
      severity: 'medium', illuminates: 'CEL solid' },
    { code: 'P0340', name: 'Camshaft Position Sensor (Bank 1)',
      meaning: 'The CMP sensor signal is missing or implausible. Engine may stall or no-start.',
      common: 'Failed CMP sensor (heat-related). Connector corrosion.',
      diy: 'Sensor replacement is often $20–40 part, 30 min if accessible.',
      shop: 'If access requires intake removal, shop work.',
      severity: 'high', illuminates: 'CEL solid + possible stall' },
    { code: 'P0507', name: 'Idle Air Control RPM Higher Than Expected',
      meaning: 'Idle is too high. Vacuum leak or sticky throttle body.',
      common: 'Vacuum leak from a cracked intake boot, dirty throttle body, dirty IAC valve (older cars).',
      diy: 'Clean the throttle body with throttle-body cleaner ($8). Inspect intake hoses for cracks.',
      shop: 'Throttle-body relearn after cleaning is usually self-relearning; some VW/Audi need a scan-tool relearn.',
      severity: 'low', illuminates: 'CEL solid' },
    { code: 'C0035', name: 'Left Front Wheel Speed Sensor (ABS)',
      meaning: 'ABS sensor on the left front wheel isn\'t reading. ABS / traction control will be disabled. Brake-pedal feel changes.',
      common: 'Salt corrosion on the sensor or ring. Cut sensor wire from a brush guard or curb hit.',
      diy: 'Sensor swap is straightforward ($30–80, 30 min) — but the bolt is often rusted seized in Maine. Have penetrant ready.',
      shop: 'If the tone ring is rusted, that may need a hub replacement ($200–500).',
      severity: 'medium', illuminates: 'ABS light + traction-control light' },
    { code: 'B1234', name: 'Generic Body-Control Code',
      meaning: 'Body-control modules handle interior lights, power locks, windows. B-codes are vehicle-specific — look yours up.',
      common: 'Door-switch failure, blown fuse, water in a body-control module.',
      diy: 'Fuse check is free. Door switches are usually cheap.',
      shop: 'BCM programming requires shop scan tool.',
      severity: 'low', illuminates: 'varies' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 4: DIAGNOSTIC FLOWS — listening, fluid, visual, OBD
  // The 4-channel diagnosis a tech runs through. Teach the THINKING, not
  // a specific repair: "What does this noise tell you? What does this fluid
  // smell like? Where would you look for that smell?"
  // ─────────────────────────────────────────────────────────

  // LISTENING cues. A "what's that noise?" matrix. Each cue: a short audio
  // description + when it happens + likely cause + DIY-or-shop verdict.
  var LISTEN_CUES = [
    { id: 'squeal-cold', name: 'High-pitch squeal at cold start',
      when: 'First 30–60 seconds when you crank a cold engine.',
      cause: 'Worn or glazed serpentine belt. Pulley bearing starting to fail.',
      diy: 'Replace the serpentine belt ($20–60 part, 30 min). Inspect tensioner pulley for play.',
      shop: 'If a pulley is wobbling, take it in — a thrown belt at speed kills accessories.',
      urgency: 'soon' },
    { id: 'click-no-start', name: 'Rapid clicking, won\'t crank',
      when: 'Turn the key — fast tick-tick-tick instead of cranking.',
      cause: 'Dead battery (most common in Maine winters). Loose / corroded battery cable. Failing starter.',
      diy: 'Voltmeter on battery: <12.0V = needs charge or replace. Clean terminals with baking-soda water + wire brush.',
      shop: 'If battery + cables are good and you still get the click, starter solenoid is bad.',
      urgency: 'now' },
    { id: 'grind-brakes', name: 'Metal-on-metal grinding when braking',
      when: 'Pressing the brake pedal — high-pitched grind that gets worse the harder you press.',
      cause: 'Brake pads are worn through. You\'re grinding the rotor with the steel pad backing.',
      diy: 'Brake pad + rotor replacement is moderate DIY (~$80–150 parts per axle, 2–4 hours). Maine rust often seizes caliper bolts.',
      shop: 'If you\'ve never done brakes, do this one in a shop the first time. Then watch and learn.',
      urgency: 'now' },
    { id: 'chug-accel', name: 'Bucking / hesitation under acceleration',
      when: 'Stepping on the gas — engine bogs, then catches, then bogs again.',
      cause: 'Misfire (P0300 family). Bad gas. Clogged fuel filter. Failing coil pack.',
      diy: 'Try a tank of fresh fuel + Techron / Seafoam first. Pull codes if CEL is on.',
      shop: 'Persistent misfire after fuel-system clean is a coil/plug job — shop or a careful DIY.',
      urgency: 'soon' },
    { id: 'whine-steering', name: 'Whine when turning the wheel',
      when: 'Turning the steering wheel, especially at low speed.',
      cause: 'Low power-steering fluid. Failing power-steering pump. (Electric power steering doesn\'t make this noise — it\'ll click instead.)',
      diy: 'Check power-steering reservoir. Top up with the correct fluid (use what the cap or owner\'s manual says — using the wrong fluid wrecks the system).',
      shop: 'PS pump replacement is moderate-to-hard DIY; usually goes to a shop.',
      urgency: 'soon' },
    { id: 'rattle-undercarriage', name: 'Rattle from underneath at idle',
      when: 'Stopped at a light or in park.',
      cause: 'Loose heat shield (Maine rust classic — rusted-out tabs). Loose exhaust hanger. Failing catalytic-converter internals.',
      diy: 'Heat shield: hose clamp or steel zip-tie ($5). Cheap-and-effective fix. Exhaust hanger: replace the rubber donut ($8).',
      shop: 'Internal cat rattle = cat replacement ($800–2500) — shop.',
      urgency: 'monitor' },
    { id: 'thump-tire', name: 'Rhythmic thump that speeds up with vehicle',
      when: 'Driving — thump-thump-thump that gets faster as you go faster.',
      cause: 'Tire issue: cupped tread, separated belt, flat-spotted from sitting in cold.',
      diy: 'Visual inspection. Look for a bulge or uneven wear. Rotate to confirm it follows the wheel.',
      shop: 'Separated belt = replace the tire NOW. Don\'t drive on it at highway speed.',
      urgency: 'soon' },
    { id: 'hum-bearing', name: 'Hum that changes pitch in a turn',
      when: 'Steady speed, hum gets louder turning one direction, quieter turning the other.',
      cause: 'Failing wheel bearing. Side it gets quieter on = bad bearing (load shifts off it).',
      diy: 'Wheel-bearing replacement varies — pressed-in styles need a press; hub-assembly styles are bolt-in.',
      shop: 'If the bearing is roaring or has play, this is shop or experienced-DIY only. A bearing failure can lock the wheel.',
      urgency: 'soon' },
    { id: 'knock-engine', name: 'Deep knock from the engine, RPM-related',
      when: 'Knock keeps time with engine RPM. Gets louder with load.',
      cause: 'Internal: rod knock, main bearing. Or: low oil + dry start (catastrophic).',
      diy: 'Check oil level + condition immediately. If low + smells burnt: stop driving.',
      shop: 'Rod knock = engine rebuild or replacement. Stop driving until evaluated.',
      urgency: 'now' },
    { id: 'tick-valves', name: 'Light tick at idle, follows engine speed',
      when: 'Tick-tick-tick that synchronizes with RPM.',
      cause: 'Valve lash (older cars need adjustment). Lifter tick (modern hydraulic lifters when oil is dirty).',
      diy: 'Fresh oil + filter first. Many tick complaints disappear after an oil change with the correct grade.',
      shop: 'Persistent tick after oil change = shop. Could be a collapsed lifter.',
      urgency: 'monitor' }
  ];

  // FLUID inspection. Five fluids your car needs you to look at, with what
  // healthy looks and smells like vs warning signs. Maine-rust note: you check
  // these because in winter you may not see a drip on snow until it\'s too late.
  var FLUID_CHECKS = [
    { id: 'engine-oil', name: 'Engine oil',
      where: 'Dipstick, engine bay. Check cold or 5 minutes after shutdown on level ground.',
      healthy: 'Amber to honey-brown. Smells like oil — slight diesel-ish smell normal on used oil.',
      bad: 'BLACK + gritty = overdue change. MILKY / chocolate-milk = coolant is mixing in (head gasket — STOP).',
      smell: 'Burnt smell = engine running too hot or oil overdue.',
      level: 'Between MIN and MAX hashes. Below MIN = top up to within range; never overfill.',
      severity: { milky: 'STOP DRIVING', burnt: 'change immediately', low: 'top up + monitor' } },
    { id: 'coolant', name: 'Coolant (antifreeze)',
      where: 'Reservoir bottle (NEVER open the radiator cap on a hot engine). Check cold.',
      healthy: 'Clear green / orange / pink / blue depending on type. Slightly sweet smell. Match the color you find — never mix types.',
      bad: 'Brown / rusty = the cooling system is corroding. Oil floating on top = head-gasket failure.',
      smell: 'Sweet smell inside the cabin = heater core is leaking.',
      level: 'Between COLD MIN and COLD MAX hashes. Top up with the same color/spec; pre-mixed 50/50 is foolproof.',
      severity: { rusty: 'flush due', oily: 'STOP — head gasket', cabin: 'heater core leak' } },
    { id: 'brake-fluid', name: 'Brake fluid',
      where: 'Master-cylinder reservoir, top of engine bay near firewall.',
      healthy: 'Clear to light amber. Translucent.',
      bad: 'DARK BROWN or black = water-saturated and overdue. Brake fluid absorbs moisture; in Maine humidity it lasts ~2–3 years tops.',
      smell: 'Slightly chemical; if it smells "off" you\'re probably looking at very old fluid.',
      level: 'Between MIN and MAX. If LOW: brake pads are worn (caliper pistons extended) OR you have a leak. Don\'t just top up without finding out which.',
      severity: { dark: 'flush due', low: 'check pads + leaks first' } },
    { id: 'transmission-fluid', name: 'Automatic transmission fluid (ATF)',
      where: 'Trans dipstick (older cars) — usually bright pink/red handle. Many newer cars are SEALED — no DIY check.',
      healthy: 'Bright cherry / strawberry red. Slightly sweet, oily smell.',
      bad: 'BROWN / BURNT smell = trans is overheating internally. Trans damage in progress.',
      smell: 'Burnt = fluid is cooked.',
      level: 'Check per your owner\'s manual — some are checked HOT in PARK on level ground; some HOT in NEUTRAL. Wrong procedure gives wrong reading.',
      severity: { burnt: 'STOP — trans evaluation', low: 'add per spec NOT generic ATF' } },
    { id: 'power-steering', name: 'Power-steering fluid (hydraulic only)',
      where: 'Reservoir near the engine, often labeled with a steering-wheel icon. Some cars: ATF; some: dedicated PSF; check the cap.',
      healthy: 'Clear amber to slightly red.',
      bad: 'Dark / black or smells burnt = pump is wearing the fluid out.',
      smell: 'Burnt = pump is laboring. Whine + burnt = imminent failure.',
      level: 'Cold and hot marks on the dipstick. Match per spec.',
      severity: { burnt: 'pump nearing failure', low: 'top up + look for leaks' } }
  ];

  // VISUAL inspection (5-point under-the-hood + 5-point underneath). Maine
  // emphasis: undercarriage in spring after salt season is the biggest single
  // catch. Brake-line corrosion is the #1 inspection-failure item.
  var VISUAL_CHECKS = [
    // Under-the-hood
    { id: 'belts', area: 'hood', name: 'Belts',
      look: 'Cracks across the ribbed face. Glaze (shiny). Frayed edges.',
      finding: 'Cracks every inch or more, glazed look = replace serpentine belt.',
      severity: 'medium' },
    { id: 'hoses', area: 'hood', name: 'Hoses',
      look: 'Squeeze them when cold. Soft / mushy = aging. Hard / crispy = aging different way. Bulges or sticky weep around clamps.',
      finding: 'A hose that won\'t spring back = replace before it bursts.',
      severity: 'high' },
    { id: 'battery', area: 'hood', name: 'Battery + terminals',
      look: 'White / blue / green crusty buildup on terminals. Cracked case. Bulged side.',
      finding: 'Crust = clean terminals (baking soda + water). Bulge / leak = replace battery NOW.',
      severity: 'medium' },
    { id: 'air-filter', area: 'hood', name: 'Air filter',
      look: 'Pop the airbox. Hold filter to light — you should see light through clean pleats.',
      finding: 'No light through = clogged. Replace ($15–25, 5 minutes).',
      severity: 'low' },
    { id: 'fluid-leaks', area: 'hood', name: 'Fluid spots on engine',
      look: 'Wet shine on the engine top, valve cover, oil pan visible from above.',
      finding: 'Note color: black = oil (valve cover gasket), pink/red = trans (rare from above), green/orange = coolant (water pump area).',
      severity: 'varies' },
    // Underneath
    { id: 'brake-lines', area: 'under', name: 'Brake lines (steel + rubber)',
      look: 'Steel hard-lines along the frame. Rubber flex hoses at each wheel.',
      finding: 'Rust SCALE on steel lines = replace the section before it bursts. Cracks or bulges in rubber = replace.',
      severity: 'high' },
    { id: 'fuel-lines', area: 'under', name: 'Fuel lines',
      look: 'Plastic and steel lines along the frame to the fuel pump / tank.',
      finding: 'Wet shine + gas smell = LEAK = stop driving. Maine salt-rusts the lines themselves on older trucks.',
      severity: 'high' },
    { id: 'frame-rust', area: 'under', name: 'Frame rails',
      look: 'Crawl, look up. Surface rust is fine. Holes or scaling that flakes off in chunks is not.',
      finding: 'Holes / "perforated" frame = inspection failure + structural unsafe.',
      severity: 'high' },
    { id: 'exhaust', area: 'under', name: 'Exhaust system',
      look: 'Rusted holes (especially at flex pipe and resonator). Loose hangers.',
      finding: 'Hole upstream of cat = check-engine light coming. Rusted-off hanger = clamp it back up before it falls off.',
      severity: 'medium' },
    { id: 'tires', area: 'under', name: 'Tires (all four)',
      look: 'Tread depth (penny test), uneven wear, sidewall cracks, plugs.',
      finding: 'Inside-edge wear = alignment overdue. Cracks in the sidewall = age out, replace. Maine penny-test < ~3/32" = unsafe in slush.',
      severity: 'medium' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 5: REPAIR SCENARIOS — 7 step-by-step jobs
  // Each scenario: difficulty (1–4), time, tools needed, safety prerequisites,
  // step list, common gotchas, and a clear "DIY vs shop" verdict for Maine.
  // ─────────────────────────────────────────────────────────
  var REPAIR_SCENARIOS = [
    {
      id: 'oil-change', name: 'Oil + filter change',
      icon: '🛢️', difficulty: 1, time: '45–60 min',
      cost: { diy: '$30–50', shop: '$50–100' },
      universal: 'Most universal DIY. If you only learn one job, learn this.',
      tools: ['oil-drain-pan', 'wrench-set', 'oil-filter-wrench', 'jack', 'jack-stands', 'funnel', 'shop-rags', 'gloves'],
      consumables: '5 quarts of correct oil (check owner\'s manual — usually 0W-20 or 5W-30 in Maine), correct oil filter.',
      safety: ['jack-stands-required', 'hot-oil-burn-risk', 'engine-cool-30min'],
      steps: [
        { n: 1, do: 'Park on flat ground. Run engine 5 minutes to warm oil so it drains cleanly. Then SHUT IT OFF and let it cool 20–30 min so you don\'t burn yourself.' },
        { n: 2, do: 'Loosen the oil-fill cap on top of the engine BEFORE you go under. (Helps the oil drain — and reminds you to put it back.)' },
        { n: 3, do: 'Lift the front of the vehicle with the jack. Set jack stands on the frame at the manufacturer-marked points (NEVER on the oil pan, NEVER on a plastic skid plate). Lower the jack onto the stands.' },
        { n: 4, do: 'Slide the drain pan under the oil-pan plug. Loosen the plug with a wrench (usually 14mm or 17mm hex; some are square-drive). Once it\'s finger-loose, pull it the last turns by hand. Let it drain completely (~5 min).' },
        { n: 5, do: 'While it drains: locate the oil filter. Could be on top (screw-on cartridge) or on the side (spin-on canister). Place the drain pan under it. Remove with the filter wrench. Some old gasket may stick — peel it off cleanly.' },
        { n: 6, do: 'Lubricate the new filter\'s rubber gasket with a film of fresh oil (so it seals without binding). Spin it on hand-tight, then ¾ turn more. Don\'t crank it down — you\'ll never get it off next time.' },
        { n: 7, do: 'Reinstall the drain plug. Use a NEW crush washer if your vehicle uses one. Snug it firm but not gorilla-tight (~25 ft-lb is typical — torque wrench helps).' },
        { n: 8, do: 'Lower the vehicle. Pour the correct quantity of new oil through the funnel into the fill cap. Replace the fill cap. Run the engine 30 seconds, check for leaks, shut off.' },
        { n: 9, do: 'Wait 5 minutes for oil to settle, check the dipstick. Top up if needed to get it between MIN and MAX hashes. Done.' },
        { n: 10, do: 'Take the old oil and filter to a parts store (free oil disposal at NAPA / O\'Reilly / AutoZone) or your town transfer station. NEVER pour oil on the ground or in a drain.' }
      ],
      gotchas: [
        'Maine rust gotcha: drain plug threads are often rust-locked. Soak with PB Blaster the night before. If it strips, you\'ll need an oversize plug or a tap.',
        'Wrong oil grade is bad. Look at the OIL CAP first — many engines have it printed there.',
        'NEVER work under a car held only by a jack. The jack can fail. Always use jack stands rated for the vehicle weight.'
      ],
      verdict: 'DIY-friendly. Save $30–50 each time, plus you check fluids and look at the undercarriage anyway — that\'s the real value.'
    },
    {
      id: 'brake-pads', name: 'Front brake pad replacement',
      icon: '🛑', difficulty: 3, time: '2–4 hours',
      cost: { diy: '$60–120', shop: '$200–400 per axle' },
      universal: 'Worth learning the second job. Brakes are the #1 reason Mainers fail inspection.',
      tools: ['socket-set', 'wrench-set', 'jack', 'jack-stands', 'c-clamp-or-piston-tool', 'torque-wrench', 'wire-brush', 'brake-cleaner', 'gloves'],
      consumables: 'Front brake pad set (correct for your year/make/model). Brake-caliper grease. Optional: new rotors if your old ones are below spec or grooved.',
      safety: ['jack-stands-required', 'wheels-chocked-rear', 'brake-fluid-corrosive-paint', 'asbestos-old-pads-mask'],
      steps: [
        { n: 1, do: 'Loosen the lug nuts of the front wheels HALF a turn while the car is still on the ground. They take less torque to break loose with weight on the wheel.' },
        { n: 2, do: 'Chock the REAR wheels (so the car can\'t roll backward when you lift the front). Set parking brake.' },
        { n: 3, do: 'Jack up one front side. Place jack stand at the frame point. Repeat for the other front. Both wheels off the ground, both on stands.' },
        { n: 4, do: 'Remove lug nuts the rest of the way. Pull the wheel off (Maine: corrosion may stick the wheel to the hub. Tap the back of the tire with a rubber mallet to break it free — never hit the rim).' },
        { n: 5, do: 'Open the brake-fluid reservoir cap on the master cylinder under the hood. (Pushing the caliper piston back will push fluid up — opening the cap lets it overflow into a rag instead of bursting a seal.)' },
        { n: 6, do: 'Locate the two CALIPER BOLTS on the back of the caliper (usually 14–17mm). Remove them. The caliper now slides off the rotor. Hang it from the strut spring with a wire or bungee — DO NOT let it dangle from the brake hose (will rip).' },
        { n: 7, do: 'Pull old pads out of the bracket. Note the spring clip orientation — new pads go in the same way.' },
        { n: 8, do: 'Compress the caliper piston back into its bore. Use a c-clamp or a dedicated brake-piston tool. SLOWLY — the fluid path is the master cylinder. Watch the reservoir for overflow.' },
        { n: 9, do: 'Apply caliper grease to the slide pins and the contact points where the pad backings touch the caliper / bracket. Do NOT get grease on the pad face or rotor.' },
        { n: 10, do: 'Install new pads. Reattach the caliper. Torque the caliper bolts to spec (usually 25–35 ft-lb — look it up).' },
        { n: 11, do: 'Reinstall the wheel. Hand-tight lug nuts in a star pattern.' },
        { n: 12, do: 'Repeat steps 4–11 on the other side.' },
        { n: 13, do: 'Lower vehicle. Torque lug nuts to spec (typically 80–100 ft-lb — check spec). Star pattern, not in a circle.' },
        { n: 14, do: 'Top up the brake-fluid reservoir if needed with the correct DOT spec. Cap it.' },
        { n: 15, do: 'BEFORE DRIVING: with the engine OFF, pump the brake pedal until firm. Then start the engine and pump again. Pads need to seat against the rotor — the first pump may go to the floor. Do this in your driveway, NOT in traffic.' },
        { n: 16, do: 'Drive cautiously the first 100 miles to bed in the new pads. Several gentle stops from 30 mph, no panic stops.' }
      ],
      gotchas: [
        'Maine rust: caliper bolts are often seized. Soak with PB Blaster the night before. A 6-point socket grips better than 12-point.',
        'If a brake-line bleed-screw snaps off (common in salt-rust), the brake line needs replacing — that becomes a shop job mid-stream.',
        'Asbestos: brake dust on older vehicles may contain asbestos. Don\'t blow it off with compressed air. Wipe with brake cleaner + rag, mask up.',
        'New pads on grooved rotors will squeal and wear unevenly. Resurfacing is cheap; new rotors are often only $25–40 each.'
      ],
      verdict: 'Doable DIY but the rust and the bleed-screw risk make this a "learn it from someone the first time." After that — straightforward. Failed bleeders push it to a shop.'
    },
    {
      id: 'alternator', name: 'Alternator replacement',
      icon: '🔋', difficulty: 3, time: '1–3 hours',
      cost: { diy: '$80–250', shop: '$300–600' },
      universal: 'Easier than brakes on some engines, much harder on others. Engine layout decides.',
      tools: ['socket-set', 'wrench-set', 'jack', 'jack-stands', 'serpentine-belt-tool', 'multimeter', 'gloves'],
      consumables: 'New or remanufactured alternator. Sometimes a new serpentine belt while you\'re in there ($20–40).',
      safety: ['battery-disconnect-required', 'jack-stands-if-bottom-mount', 'tensioner-spring-load'],
      steps: [
        { n: 1, do: 'Confirm it\'s the alternator first. Charging-system test: with engine running, voltage at the battery terminals should be 13.8–14.7V. Below 13.5V = alternator likely failing. (Most parts stores test for free.)' },
        { n: 2, do: 'Disconnect the negative battery terminal. Always negative first. Wait 5 minutes (capacitor discharge).' },
        { n: 3, do: 'Locate the alternator (front of the engine, belt-driven). Note the serpentine-belt routing — phone photo is your friend.' },
        { n: 4, do: 'Release belt tension. Use a serpentine-belt tool or a long ratchet on the tensioner pulley. Slip the belt off the alternator pulley.' },
        { n: 5, do: 'Remove the wiring from the alternator: a small clip-on plug + a heavy positive wire bolted to a stud (usually 10mm or 13mm nut).' },
        { n: 6, do: 'Remove the alternator mounting bolts (usually 2–3 bolts). Pull alternator out.' },
        { n: 7, do: 'Install the new alternator in reverse order. Torque mounting bolts to spec.' },
        { n: 8, do: 'Reconnect wiring. The heavy positive wire goes ON FIRST and the small plug clips in.' },
        { n: 9, do: 'Reroute serpentine belt per your photo. Release tensioner, slip belt onto alternator pulley last. Slowly let tensioner take up slack. Verify belt is centered on every pulley.' },
        { n: 10, do: 'Reconnect negative battery terminal.' },
        { n: 11, do: 'Start engine. Verify voltage at battery is 13.8–14.7V. Listen for belt squeal or vibration.' },
        { n: 12, do: 'Drive 5 minutes. Recheck voltage. Done.' }
      ],
      gotchas: [
        'Some engines have the alternator buried under the intake or behind the engine. If you can\'t see it from above + below, this becomes a 6-hour job — consider a shop.',
        'Reman alternators have a $30–80 core charge. Bring the old one back for the refund.',
        'A loose ground (rusted ground strap on the engine block) can mimic an alternator failure. Inspect grounds before condemning the alt.',
        'Battery terminal order matters. Negative OFF first, ON last — prevents arcing on a wrench against grounded metal.'
      ],
      verdict: 'DIY if the alternator is accessible from above. Shop if it\'s buried.'
    },
    {
      id: 'tire-rotation', name: 'Tire rotation',
      icon: '🛞', difficulty: 1, time: '30–45 min',
      cost: { diy: '$0', shop: '$20–50' },
      universal: 'Easiest on this list. Free if you have a jack, stands, and a torque wrench.',
      tools: ['lug-wrench', 'jack', 'jack-stands', 'torque-wrench'],
      consumables: 'None.',
      safety: ['jack-stands-required', 'wheels-chocked'],
      steps: [
        { n: 1, do: 'Know the rotation pattern for your tires. Directional tires (arrow on sidewall) = front-to-back same side only. Non-directional = cross-pattern (front-to-back, left-and-right swapped on the rear).' },
        { n: 2, do: 'Loosen all 4 lug-nut sets a half turn while wheels are on the ground.' },
        { n: 3, do: 'Chock one corner (e.g., rear-passenger) and parking brake on. Jack up the OTHER three corners ONE AT A TIME, putting a jack stand under each. (Or use a vehicle lift if you have one.)' },
        { n: 4, do: 'Remove the wheels. Move them to their new positions per pattern.' },
        { n: 5, do: 'Reinstall hand-tight in a star pattern.' },
        { n: 6, do: 'Lower vehicle one corner at a time (lower by jack, remove stand, lower jack). Torque lug nuts to spec in star pattern.' },
        { n: 7, do: 'Drive 50 miles, then RE-TORQUE the lug nuts. Aluminum wheels especially can settle and loosen.' }
      ],
      gotchas: [
        'Failed-out lug nut torque can lead to a loose wheel coming off at speed — re-torque after 50 miles is non-negotiable.',
        'Maine corrosion: wheels can stick to hubs after sitting all winter. Tap the back of the tire (not the rim) with a rubber mallet to break free.',
        'Don\'t forget the spare in your rotation if it\'s a full-size matching tire. (Mini-spares are not in rotation.)'
      ],
      verdict: 'Fully DIY. Do it every other oil change (~5,000–7,500 miles).'
    },
    {
      id: 'air-filter', name: 'Engine air filter replacement',
      icon: '🌬️', difficulty: 1, time: '5–10 min',
      cost: { diy: '$15–25', shop: '$50–80' },
      universal: '5-minute job. The shop sell-up #1.',
      tools: ['screwdriver-or-clip-release'],
      consumables: 'Correct air filter for your year/make/model.',
      safety: ['none-significant'],
      steps: [
        { n: 1, do: 'Pop the hood. Locate the airbox — usually a black plastic box with a hose going to the engine.' },
        { n: 2, do: 'Open the airbox. Some have spring clips; some have screws (#2 Phillips or 8mm hex).' },
        { n: 3, do: 'Lift the lid. Pull old filter out. Note its orientation.' },
        { n: 4, do: 'Wipe debris out of the airbox with a clean rag. Don\'t blow into intake — debris flies back at you.' },
        { n: 5, do: 'Install new filter same orientation. Close airbox lid. Re-clip / re-screw.' }
      ],
      gotchas: [
        'Cabin air filter is a different filter (usually behind glove box). Check its location in your owner\'s manual.',
        'Don\'t skip the orientation check — installed backward, the filter may not seal and dirty air bypasses it.'
      ],
      verdict: 'Fully DIY. If your shop charges to do this, do it yourself next time.'
    },
    {
      id: 'ac-recharge', name: 'A/C recharge (low refrigerant)',
      icon: '❄️', difficulty: 2, time: '20–40 min',
      cost: { diy: '$30–60', shop: '$80–250 (more if leak repair)' },
      universal: 'Legal-fence territory. Section 609 cert is required to BUY a 30 lb tank. Small "DIY recharge cans" with a built-in gauge are sold without certification.',
      tools: ['ac-recharge-can-with-gauge', 'safety-glasses', 'gloves'],
      consumables: 'R-134a or R-1234yf recharge can. CHECK YOUR VEHICLE — 1234yf went widespread around 2017+ and the two are NOT interchangeable. Wrong refrigerant ruins the system.',
      safety: ['epa-section-609-rules', 'frostbite-skin-contact', 'eye-protection-required', 'engine-running-belts-spinning'],
      steps: [
        { n: 1, do: 'Confirm low refrigerant is the issue. Symptom: A/C blows lukewarm. Check belt + fan running. If compressor isn\'t engaging, recharge won\'t help.' },
        { n: 2, do: 'Verify which refrigerant your vehicle uses. Check the under-hood label (it tells you R-134a or R-1234yf and the system capacity in oz/grams). Buy the matching can.' },
        { n: 3, do: 'Find the LOW-side service port. Owner\'s manual or a quick search shows the location. The port has a blue cap labeled "L" and is the LARGER of the two ports. (NEVER hook a recharge can to the high-side port — risk of explosion.)' },
        { n: 4, do: 'Start engine. Set A/C to MAX, fan high, recirculate, windows open.' },
        { n: 5, do: 'Shake the can. Connect to LOW port. The can\'s gauge will read system pressure with engine running + A/C on.' },
        { n: 6, do: 'Read the gauge against the chart on the can (varies by ambient temperature). If pressure is in the GREEN ZONE, you don\'t need refrigerant. Remove can.' },
        { n: 7, do: 'If pressure is LOW, slowly add refrigerant by holding can upright + briefly pulling the trigger. Pause every 30 seconds, check gauge. Adding too fast slugs liquid into the compressor — damages it.' },
        { n: 8, do: 'Stop adding when pressure reaches green zone for the ambient temperature.' },
        { n: 9, do: 'Disconnect can. Replace cap on LOW port. Verify cold air at vents.' }
      ],
      gotchas: [
        'EPA Section 609: it is illegal to vent refrigerant to atmosphere. If the system is empty, it has a LEAK that needs finding before refilling.',
        'A "recharge" of an empty system without finding the leak just leaks back out — and adds a fine.',
        'WRONG REFRIGERANT (134a in a 1234yf system or vice versa) ruins the compressor. Read the under-hood label TWICE.',
        'Frostbite is real — refrigerant exiting fast is very cold. Eye protection mandatory; gloves recommended.',
        'Electronic A/C gauges read more accurately than the cheap can-mounted gauges.'
      ],
      verdict: 'Topping off with a DIY can when the system is just slightly low: OK with proper precautions. Empty system = leak repair = shop with EPA-licensed tech.'
    },
    {
      id: 'timing-belt', name: 'Timing belt replacement',
      icon: '⏱️', difficulty: 4, time: '4–8 hours',
      cost: { diy: '$150–400', shop: '$700–1500' },
      universal: 'Listed here so you know NOT to DIY this one your first time. Interference engines can self-destruct if it slips a tooth.',
      tools: ['full-socket-set', 'wrench-set', 'jack', 'jack-stands', 'crank-pulley-tool', 'cam-locking-tools', 'torque-wrench', 'service-manual-required'],
      consumables: 'Timing belt kit (belt + tensioner + idler pulleys). Often: water pump (it\'s right there + same labor). Coolant.',
      safety: ['interference-engine-warning', 'crank-pulley-bolt-very-tight', 'service-manual-mandatory', 'long-job-secure-vehicle'],
      steps: [
        { n: 1, do: 'CHECK YOUR ENGINE. Many modern engines use a CHAIN, not a belt — chains rarely need replacement. Belt-driven engines have a maintenance interval (typically 60K–100K miles) listed in the owner\'s manual.' },
        { n: 2, do: 'Determine if your engine is INTERFERENCE or NON-INTERFERENCE. Interference = if belt slips, pistons hit valves and the engine is destroyed. Non-interference = belt slips but engine survives. This matters for risk tolerance and execution care.' },
        { n: 3, do: 'OBTAIN THE FACTORY SERVICE MANUAL OR EQUIVALENT (AllData via library). Generic guides are not enough. Cam-and-crank alignment marks vary by engine.' },
        { n: 4, do: 'Set engine to TDC (top dead center) on cylinder #1. Cam and crank timing marks align with reference marks on the engine.' },
        { n: 5, do: 'Remove accessory belts, crank pulley (this bolt is INSANE tight — 100–200+ ft-lb is common), valve cover or front timing cover.' },
        { n: 6, do: 'Photograph the timing marks BEFORE removing the old belt. Three times.' },
        { n: 7, do: 'Replace the belt + tensioner + idlers + (recommended) water pump as a set. Manually rotate the engine TWO FULL TURNS by hand and verify timing marks STILL align. If they don\'t, you\'re a tooth off — re-do.' },
        { n: 8, do: 'Reassemble in reverse order. Torque the crank pulley bolt to spec (often requires the special holding tool). Reroute accessory belts.' },
        { n: 9, do: 'Refill coolant if the water pump was replaced. Bleed cooling system per vehicle procedure.' },
        { n: 10, do: 'Start engine. Listen for ticking, slapping, or any abnormal sound. Idle 5 minutes. Top up coolant after a heat cycle.' }
      ],
      gotchas: [
        'A timing belt off by ONE tooth on an interference engine = bent valves = $3,000+ repair. Take this seriously.',
        'The crank pulley bolt sometimes requires a heat gun, an impact, or the OEM holding tool to remove. Rounding it off doubles the job.',
        'If the water pump leaks 2 months later because you skipped it, you\'re re-doing the entire job. Replace it now.',
        'Some V6 engines have one belt for the front cam and another for the rear bank — different procedure. RTFM.'
      ],
      verdict: 'Shop work for first-timers. Experienced DIY-ers with the manual + cam locking tools can do it. The price gap is real — $700–1500 at a shop is not an overcharge for what it takes.'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 6: TOOLS LIBRARY — what each tool is, what it does, when you need it
  // Used by the Tool-selection mini-game and shown in the Tools tab.
  // ─────────────────────────────────────────────────────────
  var TOOLS_LIBRARY = [
    { id: 'wrench-set', name: 'Combination wrench set', icon: '🔧',
      what: 'Open-end + box-end wrench in one tool. Sizes 8mm–19mm covers most cars; SAE for older domestic.',
      when: 'Anywhere a socket won\'t fit. Tight clearances around the engine bay.',
      buy: 'A decent metric set is $40–80. Last a lifetime.', cost: '$40–80' },
    { id: 'socket-set', name: 'Ratchet + socket set (3/8" drive)', icon: '🪛',
      what: '3/8" drive ratchet + sockets 8mm–19mm + extension. The everyday driver.',
      when: 'Most fastener removal. Faster than wrenches when you have clearance.',
      buy: 'Mid-tier ($60–120) lasts forever. Avoid bargain-bin: cheap sockets round off bolts.', cost: '$60–120' },
    { id: 'lug-wrench', name: 'Lug wrench (4-way or breaker bar)', icon: '🛠️',
      what: 'Long handle + 19/21/22mm sockets for wheel lug nuts.',
      when: 'Tire rotation, brake pad replacement, any wheel removal.',
      buy: '4-way cross is in your trunk by law. A 24" breaker bar is better.', cost: '$15–40' },
    { id: 'oil-filter-wrench', name: 'Oil-filter wrench', icon: '🌀',
      what: 'A strap, cup, or pliers wrench sized for your filter. Cup-style (vehicle-specific) is most reliable.',
      when: 'Oil changes when the filter is hand-tight (or worse — over-tightened by a previous tech).',
      buy: '$8–15 for a strap. $10 each for cup-style.', cost: '$8–15' },
    { id: 'oil-drain-pan', name: 'Oil drain pan', icon: '🧴',
      what: 'A 6-qt pan with an enclosed lip + sealed lid. Lets you carry old oil to recycling without spills.',
      when: 'Oil changes, transmission service, brake fluid replacement.',
      buy: '$10–20.', cost: '$10–20' },
    { id: 'jack', name: 'Floor jack (2-ton min)', icon: '🆙',
      what: 'A hydraulic jack rated for at least 2 tons (cars) or 3 tons (trucks/SUVs). The little scissor jack in your trunk is a roadside-only tool.',
      when: 'ANY work that requires the wheels off the ground.',
      buy: '$80–200 for a decent floor jack. Don\'t cheap out — a failing jack is a serious injury risk.', cost: '$80–200' },
    { id: 'jack-stands', name: 'Jack stands (pair)', icon: '🛡️',
      what: 'Welded steel stands rated to support the vehicle while you work. Locks at the height you set.',
      when: 'EVERY time you go under a vehicle. NEVER trust the jack alone.',
      buy: '$40–80 for a pair rated for 3 tons.', cost: '$40–80' },
    { id: 'torque-wrench', name: 'Torque wrench (1/2" drive)', icon: '⚙️',
      what: 'A wrench that clicks at a set torque so you don\'t over- or under-tighten critical fasteners.',
      when: 'Lug nuts, head bolts, suspension bolts, any spec-torqued fastener.',
      buy: '$50–120 for a click-style. Calibrate / replace per manual.', cost: '$50–120' },
    { id: 'multimeter', name: 'Digital multimeter', icon: '📟',
      what: 'Reads voltage, resistance, continuity. Diagnoses charging, sensor, and wiring issues.',
      when: 'Battery + alternator testing, sensor checks, finding shorts.',
      buy: '$25–60 gets a reliable one (Klein, Fluke entry-level).', cost: '$25–60' },
    { id: 'obd-scanner', name: 'OBD-II scanner', icon: '🔌',
      what: 'Plugs into the OBD-II port under the dash. Reads + clears check-engine codes.',
      when: 'Check-engine light is on. Diagnostic-flow starts here.',
      buy: '$25 (basic, plug-and-go) to $100 (Bluetooth + live data).', cost: '$25–100' },
    { id: 'serpentine-belt-tool', name: 'Serpentine belt tool', icon: '🔗',
      what: 'A long handle that fits the tensioner pulley. Lets you release belt tension without contortion.',
      when: 'Belt or alternator replacement.',
      buy: '$15–25.', cost: '$15–25' },
    { id: 'c-clamp-or-piston-tool', name: 'Brake-piston tool / large C-clamp', icon: '🗜️',
      what: 'Compresses caliper pistons back into their bores when installing new pads. C-clamp works for most front calipers; rear pistons that screw in need a dedicated kit.',
      when: 'Brake pad replacement.',
      buy: 'Large C-clamp $10. Brake-piston kit $25–50.', cost: '$10–50' },
    { id: 'crank-pulley-tool', name: 'Crank-pulley holding tool', icon: '🔩',
      what: 'Holds the crank pulley while you remove its single very-tight bolt without rotating the engine.',
      when: 'Timing belt jobs, harmonic balancer service.',
      buy: '$30–80 vehicle-specific. Generic strap wrenches sometimes suffice.', cost: '$30–80' },
    { id: 'cam-locking-tools', name: 'Camshaft locking tools', icon: '🔐',
      what: 'Vehicle-specific kit that locks cams in correct timing position during belt replacement.',
      when: 'Timing belt jobs on dual-cam engines.',
      buy: 'Vehicle-specific kit $40–150.', cost: '$40–150' },
    { id: 'ac-recharge-can-with-gauge', name: 'A/C recharge can with built-in gauge', icon: '❄️',
      what: 'Single-use refrigerant can with a pressure gauge for low-side recharge.',
      when: 'A/C blows lukewarm and system is just slightly low. Section 609 cert NOT required for these consumer cans.',
      buy: '$25–50 per can.', cost: '$25–50' },
    { id: 'wire-brush', name: 'Wire brush + brake cleaner', icon: '🧽',
      what: 'Brushes off rust and brake dust. Brake cleaner is a degreaser solvent that flashes off.',
      when: 'Cleaning brake hardware, prepping rusted bolts.',
      buy: '$5 brush, $5 can of brake cleaner.', cost: '$5–10' },
    { id: 'screwdriver-or-clip-release', name: 'Screwdriver / clip release', icon: '🪛',
      what: 'Phillips + flat for screws; a plastic trim tool helps for clips.',
      when: 'Air-filter swap, interior trim, body fasteners.',
      buy: '$10–20 set.', cost: '$10–20' },
    { id: 'gloves', name: 'Mechanic gloves', icon: '🧤',
      what: 'Nitrile-coated work gloves protect from cuts, hot exhaust, brake dust.',
      when: 'Every job. Skin absorbs petroleum products.',
      buy: '$10/box of 100 nitrile, or $15 for a pair of leather/nitrile mechanic gloves.', cost: '$10–15' },
    { id: 'safety-glasses', name: 'Safety glasses', icon: '👓',
      what: 'Impact-rated lenses (ANSI Z87+).',
      when: 'Anything where dust, fluid, or springs could hit your face. ALWAYS for refrigerant work.',
      buy: '$5–15.', cost: '$5–15' },
    { id: 'shop-rags', name: 'Shop rags / paper towels', icon: '🧻',
      what: 'Absorbent rags for spills, fluids, hand-cleanup.',
      when: 'Every job.',
      buy: 'Bulk rag pack $15–25; lasts a year.', cost: '$15–25' },
    { id: 'funnel', name: 'Funnel set', icon: '🌪️',
      what: 'Long-neck funnel for fluid fills.',
      when: 'Oil, coolant, transmission, power-steering fills.',
      buy: '$5–10.', cost: '$5–10' },
    { id: 'service-manual-required', name: 'Factory service manual / AllData access', icon: '📚',
      what: 'Manufacturer service procedures + torque specs + wiring diagrams.',
      when: 'Anything you haven\'t done before. Especially timing belts, electronics, fluid specs.',
      buy: 'Many Maine public libraries offer free patron access to AllData. Used Haynes/Chilton ~$25.', cost: 'often free via library' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 7: TOOL-SELECTION MINI-GAME — pick the right tools for the job
  // ─────────────────────────────────────────────────────────
  // For each scenario, define the EXACT correct toolset (subset of TOOLS_LIBRARY ids)
  // plus a couple of "distractors" — tools that look related but aren't needed.
  var TOOL_GAME = [
    {
      id: 'g-oil-change', label: 'You need to change the oil + filter on a 2010 Honda Civic. What goes in the kit?',
      correct: ['oil-drain-pan', 'wrench-set', 'oil-filter-wrench', 'jack', 'jack-stands', 'funnel', 'shop-rags', 'gloves'],
      distractors: ['c-clamp-or-piston-tool', 'crank-pulley-tool', 'cam-locking-tools'],
      why: 'You don\'t need brake-piston tools, crank-pulley tools, or cam locks for an oil change — that gear is for brakes and timing belts.'
    },
    {
      id: 'g-brake-pads', label: 'Front brake pads on a salt-state Maine pickup. What do you grab?',
      correct: ['socket-set', 'wrench-set', 'jack', 'jack-stands', 'c-clamp-or-piston-tool', 'torque-wrench', 'wire-brush', 'gloves'],
      distractors: ['oil-filter-wrench', 'multimeter', 'serpentine-belt-tool'],
      why: 'Brake jobs need pad-piston compression and a torque wrench for caliper bolts + lug nuts. No filter wrench, no multimeter, no belt tool.'
    },
    {
      id: 'g-alternator', label: 'Charging-system test failed. Replacing the alternator. What do you need?',
      correct: ['socket-set', 'wrench-set', 'serpentine-belt-tool', 'multimeter', 'gloves'],
      distractors: ['oil-filter-wrench', 'c-clamp-or-piston-tool', 'cam-locking-tools'],
      why: 'Alternator work is sockets + belt-tensioner tool + a multimeter to verify the new one\'s charging output. Not brakes, not oil, not timing belt.'
    },
    {
      id: 'g-tire-rotation', label: 'Rotating tires every 5,000 miles. Bare-minimum kit?',
      correct: ['lug-wrench', 'jack', 'jack-stands', 'torque-wrench'],
      distractors: ['oil-drain-pan', 'multimeter', 'cam-locking-tools'],
      why: 'Lug wrench, jack, stands, torque wrench. Nothing else.'
    },
    {
      id: 'g-no-start-click', name: 'No-start, rapid clicking. Diagnose first — what do you reach for?',
      label: 'No-start, rapid clicking from under the hood. What\'s the first tool you grab?',
      correct: ['multimeter', 'wire-brush', 'gloves'],
      distractors: ['oil-filter-wrench', 'cam-locking-tools', 'serpentine-belt-tool'],
      why: 'Click-no-start is almost always battery / cable / starter. Test battery voltage with the multimeter, clean terminals with the wire brush. Don\'t go disassembling things until you\'ve tested.'
    },
    {
      id: 'g-cel-on', label: 'Check-engine light is on but car drives normally. What\'s your first tool?',
      correct: ['obd-scanner'],
      distractors: ['c-clamp-or-piston-tool', 'oil-filter-wrench', 'cam-locking-tools'],
      why: 'Always start at the OBD-II port. Read the codes, write them down, THEN decide what\'s next.'
    },
    {
      id: 'g-ac-low', label: 'A/C blows lukewarm on a hot July day. Quick-fix kit?',
      correct: ['ac-recharge-can-with-gauge', 'safety-glasses', 'gloves'],
      distractors: ['oil-filter-wrench', 'crank-pulley-tool', 'multimeter'],
      why: 'A/C top-off is the can with built-in gauge + eye protection. Refrigerant burns are real.'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 8: SAFETY MODULES — the rules that keep you alive
  // ─────────────────────────────────────────────────────────
  var SAFETY_MODULES = [
    { id: 'jack-stands', icon: '🛡️', name: 'Jack stands — never the jack alone',
      keyRule: 'A floor jack can fail. Always set jack stands rated for the vehicle weight. Lower the jack onto the stands until they take the weight. Jack stands LOCK — verify they engage their pawl.',
      why: 'Hydraulic jacks rely on a single seal. If it fails, the vehicle drops. Every year people die under cars they "just had to grab one thing under." Set stands every time.',
      checklist: [
        'Park on flat, hard surface (concrete or asphalt). NEVER on grass or gravel.',
        'Set parking brake. Chock the wheels staying on the ground.',
        'Identify the manufacturer-marked jack point on the frame (NOT the oil pan, NOT the body floor).',
        'Lift only as high as you need — lower is more stable.',
        'Set the jack stand under a structural frame point. Lower jack until stand bears full weight.',
        'TEST: push the vehicle hard. If it rocks, lower it and re-set. If it doesn\'t move, you\'re ready.',
        'When done: jack the vehicle UP off the stand to remove the stand, lower carefully.'
      ],
      consequenceOfSkipping: 'Crush injury or death. Not exaggeration.'
    },
    { id: 'electrical', icon: '⚡', name: 'Electrical work — disconnect the negative first',
      keyRule: 'Negative battery terminal off FIRST. Wait 5 minutes for capacitors to discharge. Negative back on LAST.',
      why: 'A wrench bridging a positive terminal to a grounded surface (the engine block, the body) is a short circuit through your wrench at battery cranking amps. The wrench glows red, sparks fly, you may lose the wrench (or a hand).',
      checklist: [
        'Negative terminal OFF first. Tuck the cable away so it can\'t spring back.',
        'Wait 5 minutes (most modern cars have capacitors).',
        'When reconnecting: positive ON first, then negative LAST.',
        'Hybrid / EV high-voltage work: STOP. Those orange cables are 300+ volts. Specialist work only.',
        'Airbag work: disable per service manual. Stored charge can deploy a bag while you\'re working on it.'
      ],
      consequenceOfSkipping: 'Burns. Lost tools. Damaged electronics. On hybrids: lethal shock.'
    },
    { id: 'refrigerant', icon: '🌬️', name: 'Refrigerant — frostbite, eye injury, federal law',
      keyRule: 'Wear safety glasses. Wear gloves. Never vent refrigerant. Use the LOW side port only. Match refrigerant type (R-134a vs R-1234yf) exactly.',
      why: 'Refrigerant exits the can at very low temperature. A spray to skin causes instant frostbite. To the eye, possible permanent vision loss. Refrigerant venting is also a federal violation under EPA Section 608/609.',
      checklist: [
        'Safety glasses ON before connecting anything.',
        'Confirm refrigerant type via under-hood label (NOT the year of the car).',
        'Connect to LOW-side service port (blue cap, larger fitting).',
        'Add slowly with the can upright — liquid slugs damage compressors.',
        'If the system is empty, FIND THE LEAK before refilling. Empty system = leak.',
        'Section 609 certification ($20 online) is required to legally buy non-DIY refrigerant containers.'
      ],
      consequenceOfSkipping: 'Frostbite. Eye injury. EPA fines. Compressor damage.'
    },
    { id: 'hot-exhaust', icon: '🔥', name: 'Hot exhaust + hot oil',
      keyRule: 'Catalytic converters reach 1,000°F+. Exhaust stays hot for 30+ minutes after shutdown. Hot oil is 200°F when drained.',
      why: 'Burns from hot exhaust are deep and slow to heal. Oil at drain temperature causes second-degree burns within seconds.',
      checklist: [
        'Wait 30+ minutes after shutdown before working under the vehicle.',
        'Long sleeves over hot work. Bare arms get singed.',
        'Drain pan deep enough that the splash doesn\'t reach your hand.',
        'Cat is the hottest thing on the underside. Avoid leaning on it.',
        'Rags away from cats and exhaust manifolds — fire hazard if engine restarts.'
      ],
      consequenceOfSkipping: 'Burns ranging from minor to skin-grafts.'
    },
    { id: 'spring-tension', icon: '💥', name: 'Spring-loaded components — tensioners, struts',
      keyRule: 'Belt tensioners, valve springs, strut springs hold massive stored energy. They release that energy when you remove the wrong fastener.',
      why: 'A coil-spring compressor failure (or a strut you tried to disassemble without one) can launch a spring through plywood — and through bone.',
      checklist: [
        'Identify spring-loaded components BEFORE removing fasteners.',
        'Tensioners: use the dedicated tool. Don\'t back off unmarked bolts.',
        'Strut springs: rent or buy the spring compressor. Don\'t improvise. Don\'t aim the spring at yourself.',
        'Valve springs: leave them to a shop unless you have the keeper tool + practice.'
      ],
      consequenceOfSkipping: 'Blunt force trauma. Broken bones. Serious eye injury.'
    },
    { id: 'fluid-disposal', icon: '🌊', name: 'Fluid disposal — environment + your wallet',
      keyRule: 'Used oil, antifreeze, brake fluid, refrigerant — all hazardous waste. Never pour into the ground, a drain, or trash.',
      why: 'One quart of used motor oil contaminates a million gallons of groundwater. Maine takes this seriously: heavy fines + soil testing if found.',
      checklist: [
        'Used oil: free disposal at NAPA, AutoZone, O\'Reilly, AAA shops. Bring it in your sealed pan.',
        'Antifreeze (ethylene glycol): toxic + sweet-tasting (kills pets and wildlife). Town transfer station hazardous-waste day.',
        'Brake fluid: hazardous waste day.',
        'Refrigerant: must be reclaimed by certified tech.',
        'Oil filters: drain 12+ hours, then bag and recycle (some places take whole filters).'
      ],
      consequenceOfSkipping: 'Environmental damage. Local fines. Pet poisoning.'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 9: CAREER DATA — ASE pathway, salaries, Maine programs
  // ─────────────────────────────────────────────────────────
  var CAREER_DATA = {
    overview: 'Auto repair is one of the broadest middle-skill jobs in the U.S. labor market. Demand outpaces supply almost everywhere — older fleets, new tech (EVs, ADAS, hybrid systems) keep the field in transition. ASE certification is the industry credential.',
    entrySalary: '$35,000–45,000 entry-level (lube tech, tire tech, oil-change shop). No certification required to start.',
    aseCertSalary: '$45,000–65,000 with ASE A1–A8 certifications.',
    masterTech: '$65,000–95,000+ for ASE Master Tech (all 8 areas) + 5–10 years experience.',
    specialist: '$80,000–120,000+ for hybrid / EV / diesel / heavy-duty specialists.',
    bigPicture: 'Roughly 700,000+ auto-repair jobs in the U.S. (BLS). Job openings outpace new techs entering the field by ~30,000/year — there\'s structural demand.',
    aseAreas: [
      { code: 'A1', name: 'Engine Repair', focus: 'Cylinder heads, blocks, timing, lubrication.' },
      { code: 'A2', name: 'Automatic Transmission', focus: 'Hydraulic + electronic transmission systems.' },
      { code: 'A3', name: 'Manual Drivetrain & Axles', focus: 'Clutches, transmissions, transfer cases, differentials.' },
      { code: 'A4', name: 'Suspension & Steering', focus: 'Alignment, struts, control arms, steering systems.' },
      { code: 'A5', name: 'Brakes', focus: 'Hydraulic + ABS + electric park brake.' },
      { code: 'A6', name: 'Electrical / Electronic Systems', focus: 'Wiring, modules, charging, lighting, body electronics.' },
      { code: 'A7', name: 'Heating & A/C', focus: 'HVAC + refrigerant. Pairs with EPA 609.' },
      { code: 'A8', name: 'Engine Performance', focus: 'OBD-II diagnostics, emissions, fuel injection, ignition.' },
      { code: 'A9', name: 'Light Vehicle Diesel', focus: 'Diesel pickups + light-duty diesel cars.' }
    ],
    pathway: [
      { stage: 1, title: 'High school CTE (junior + senior years)', desc: 'Maine has CTE programs at PATHS (Portland), Region 9 (Mexico), Mid-Coast (Rockland), and others. Half-day program; gets you to ASE entry-level by graduation.' },
      { stage: 2, title: 'Entry-level shop work + ASE Student Certification', desc: 'Work at a tire shop, oil-change shop, or general repair while studying for ASE areas. ASE Student Certifications can be earned in high school.' },
      { stage: 3, title: 'Full ASE certification (A1–A8)', desc: 'Each area requires 2 years\' work experience + passing the test. Test fee ~$60 per area; recerts every 5 years.' },
      { stage: 4, title: 'Two-year AAS — Maine community college (optional but valuable)', desc: 'Northern Maine, Central Maine, or Washington County CCs offer 2-year automotive AAS degrees. NATEF-aligned. Many graduates enter dealerships at higher pay.' },
      { stage: 5, title: 'Specialty: EV / hybrid / diesel / ADAS', desc: 'Hybrid + EV training (often through manufacturer programs) is the highest-growth specialty. Maine has fewer EV-trained techs than demand — opportunity.' },
      { stage: 6, title: 'Master Tech + shop ownership', desc: 'ASE Master + L1 (Advanced Engine Performance) + business skills. Many independent shops are owned by techs who saved up + bought out a retiring owner.' }
    ],
    maineRealities: [
      'Dealership tech pay in Maine: $20–40/hr base + flat-rate bonuses.',
      'Independent shop pay: $18–30/hr; smaller margins but more variety.',
      'Mobile mechanic / on-site service: growing in rural Maine; flexible schedule but you supply your own tools (~$10K starting tool budget).',
      'Heavy-duty diesel (logging trucks, plows, farm equipment): underserved in Maine; specialty pay.',
      'Rust expertise: Maine techs develop salt-state expertise that\'s portable to NH, VT, NY, MA, and the upper Midwest.'
    ],
    toolInvestment: 'Industry expectation: techs supply their own tools. A starting tool box for shop work is $5,000–10,000. A senior tech\'s box may be $30,000+. Many shops offer tool credit programs or starter kits.'
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 10: KNOWLEDGE QUIZ — 10 questions covering safety, diagnostic, repair
  // ─────────────────────────────────────────────────────────
  var QUIZ = [
    { id: 'q1', icon: '🛡️',
      stem: 'You need to get under your car for an oil change. What do you do AFTER lifting it with the floor jack?',
      choices: ['Slide right under', 'Set jack stands at the frame and lower jack onto them', 'Wedge the jack with a 2x4 in case it fails', 'Have a friend hold the jack handle'],
      correct: 1, why: 'Always set jack stands rated for the vehicle weight before going under. The jack alone is not safe — its single hydraulic seal can fail.' },
    { id: 'q2', icon: '🔌',
      stem: 'Your check-engine light is solid. Code reader returns P0420. What is your FIRST move?',
      choices: ['Replace the catalytic converter immediately', 'Drive normally — solid (not flashing) is non-emergency', 'Replace all 8 spark plugs', 'Disconnect the battery to clear it'],
      correct: 1, why: 'P0420 is "cat below efficiency threshold" — solid CEL means non-emergency. You can drive but should diagnose. Never just clear codes; that hides the problem.' },
    { id: 'q3', icon: '⚡',
      stem: 'You\'re replacing an alternator. Which battery terminal do you disconnect FIRST?',
      choices: ['Positive (red)', 'Negative (black)', 'Both at the same time', 'Neither — leave it connected'],
      correct: 1, why: 'Negative first prevents accidental shorts when your wrench bridges a positive post to grounded metal. Reconnect: positive first, negative last.' },
    { id: 'q4', icon: '🛢️',
      stem: 'Your oil is MILKY (chocolate-milk color) on the dipstick. What does this mean?',
      choices: ['Time for an oil change', 'Coolant is mixing with oil — possible head-gasket failure. STOP DRIVING.', 'Wrong oil type was used', 'Air bubbles from a recent change'],
      correct: 1, why: 'Milky oil = coolant in the oil. That points to head gasket, cracked block, or cracked head. Continued driving destroys the engine.' },
    { id: 'q5', icon: '❄️',
      stem: 'Your A/C blows lukewarm. You buy a recharge can. What do you check BEFORE connecting it?',
      choices: ['Engine RPM', 'The under-hood label for refrigerant type (R-134a vs R-1234yf)', 'Tire pressure', 'Tax records'],
      correct: 1, why: 'R-134a and R-1234yf are NOT interchangeable. Putting the wrong one ruins the system. Always check the under-hood label first.' },
    { id: 'q6', icon: '🛞',
      stem: 'You rotated your tires. After 50 miles, what do you do?',
      choices: ['Nothing — you\'re done', 'Re-torque the lug nuts', 'Replace them again', 'Check the air filter'],
      correct: 1, why: 'Lug nuts can settle (especially on aluminum wheels). Re-torque after 50 miles to prevent a wheel coming loose.' },
    { id: 'q7', icon: '🌊',
      stem: 'You finished an oil change. What do you do with the used oil?',
      choices: ['Pour it in the woods behind the house', 'Mix it into kitty litter and throw it out', 'Bring it (sealed) to a parts store for free disposal', 'Burn it in a fire pit'],
      correct: 2, why: 'NAPA, O\'Reilly, AutoZone, and AAA shops accept used oil free. One quart contaminates ~1,000,000 gallons of groundwater. Maine has fines for improper disposal.' },
    { id: 'q8', icon: '🛑',
      stem: 'You\'re changing brake pads. Why do you open the brake-fluid reservoir cap before pushing the caliper piston back?',
      choices: ['Tradition', 'Pushing the piston back forces fluid back to the reservoir; if the cap is sealed, you can blow a seal', 'It looks more professional', 'It\'s a Maine state law'],
      correct: 1, why: 'Compressing the piston pushes fluid up the line. Cap closed = pressure builds in the master cylinder. Open = it overflows into a rag.' },
    { id: 'q9', icon: '🔋',
      stem: 'Your car won\'t start, just clicks rapidly. What\'s the FIRST thing you test?',
      choices: ['Replace the starter', 'Test battery voltage with a multimeter', 'Replace the battery on principle', 'Tow it to the shop'],
      correct: 1, why: 'A multimeter on the battery: <12.0V = needs charge or replacement. Then check the cables for corrosion. Don\'t throw parts at it before testing.' },
    { id: 'q10', icon: '🌲',
      stem: 'You\'re a 16-year-old in rural Maine. Your inspection failed for "perforated frame rust." Can you DIY?',
      choices: ['Yes — weld a patch', 'No — frame work is structural and a Maine inspection station has to certify it. Plan to repair professionally or replace the vehicle.', 'Spray rust converter on it', 'Drive it to NH where the rules are different'],
      correct: 1, why: 'Frame perforation is an unsafe-vehicle issue. Maine inspection stations have to certify the repair. Some structural rust isn\'t repairable and the car becomes a total loss.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 11: TOOL REGISTRATION + RENDER
  // ─────────────────────────────────────────────────────────

  window.StemLab.registerTool('autoRepair', {
    name: 'Auto Repair Shop',
    icon: '🔧',
    category: 'life-skills',
    description: 'Diagnose, repair, and maintain a vehicle. OBD-II code reading, listening / fluid / visual diagnosis, 7 step-by-step repair scenarios (oil change, brakes, alternator, tires, air filter, A/C, timing belt), tool selection mini-game, safety modules (jack stands, electrical, refrigerant). Career data for ASE certification + Maine vocational pathways. Pairs with RoadReady (you DRIVE the car). Educational only — get certified at ase.com.',
    tags: ['auto-repair', 'mechanic', 'diy', 'career', 'safety', 'life-skills', 'maine', 'ase'],

    render: function(ctx) {
      try {
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;

      var d = (ctx.toolData && ctx.toolData['autoRepair']) || {};
      var upd = function(key, val) { ctx.update('autoRepair', key, val); };
      var updMulti = function(obj) {
        if (ctx.updateMulti) ctx.updateMulti('autoRepair', obj);
        else Object.keys(obj).forEach(function(k) { upd(k, obj[k]); });
      };
      var addToast = ctx.addToast || function(msg) { console.log('[AutoRepair]', msg); };

      // ── Theme palette (mirrors firstresponse / roadready garage-aesthetic) ──
      var T = {
        bg: '#0f172a',        // slate-900
        panel: '#1e293b',     // slate-800
        card: '#1e293b',      // slate-800 (subtle alt)
        cardAlt: '#172033',
        text: '#f1f5f9',      // slate-100
        muted: '#cbd5e1',     // slate-300
        dim: '#94a3b8',       // slate-400
        border: '#334155',    // slate-700
        accent: '#f59e0b',    // amber-500 (garage / hazard / wrench color)
        accentHi: '#fbbf24',  // amber-400
        link: '#fbbf24',
        good: '#10b981',
        warn: '#f59e0b',
        bad: '#ef4444'
      };

      var view = d.view || 'menu';
      var setView = function(v) { upd('view', v); arAnnounce('Now showing: ' + v); };

      var badges = d.badges || {};
      var awardBadge = function(id, label) {
        if (badges[id]) return;
        var newBadges = Object.assign({}, badges, { });
        newBadges[id] = { label: label, when: Date.now() };
        upd('badges', newBadges);
        addToast('🏅 ' + label);
        arAnnounce('Badge earned: ' + label);
      };

      // ── Reusable styled buttons (border-amber-600 = WCAG 1.4.11 pass) ──
      function btnPrimary(extra) {
        return Object.assign({
          padding: '10px 16px', borderRadius: 8,
          background: T.accent, color: '#0f172a',
          border: '1px solid ' + T.accent,
          cursor: 'pointer', fontWeight: 700, fontSize: 14
        }, extra || {});
      }
      function btnSecondary(extra) {
        return Object.assign({
          padding: '8px 14px', borderRadius: 8,
          background: T.cardAlt, color: T.text,
          border: '1px solid ' + T.border,
          cursor: 'pointer', fontWeight: 600, fontSize: 13
        }, extra || {});
      }
      function btnGhost(extra) {
        return Object.assign({
          padding: '6px 12px', borderRadius: 8,
          background: 'transparent', color: T.muted,
          border: '1px solid ' + T.border,
          cursor: 'pointer', fontSize: 12
        }, extra || {});
      }

      function backBar(title) {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid ' + T.border } },
          h('button', { 'data-ar-focusable': true, 'aria-label': 'Back to menu',
            onClick: function() { setView('menu'); }, style: btnGhost() }, '← Menu'),
          h('h2', { style: { margin: 0, fontSize: 18, color: T.text } }, title)
        );
      }

      function disclaimerFooter() {
        return h('div', { role: 'note', 'aria-label': 'Educational disclaimer',
          style: { marginTop: 18, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 11, color: T.dim, lineHeight: 1.5 } },
          'Educational only. Always cross-reference your vehicle\'s factory service manual for torque specs and procedures. Get hands-on training through Maine CTE programs, community college, or ASE-certified mentorship before attempting major repairs. Maine inspection stations certify safety-critical repairs.'
        );
      }

      function severityBadge(sev) {
        var color = sev === 'high' || sev === 'now' ? T.bad : (sev === 'medium' || sev === 'soon' ? T.warn : T.good);
        var label = ({ high: '🔴 Stop & fix', now: '🔴 Now', medium: '🟡 Soon', soon: '🟡 Soon', low: '🟢 Monitor', monitor: '🟢 Monitor' })[sev] || sev;
        return h('span', { style: { display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: color, color: '#0f172a', fontWeight: 700, fontSize: 11 } }, label);
      }

      // ─────────────────────────────────────────
      // MENU view
      // ─────────────────────────────────────────
      function renderMenu() {
        var modules = [
          { id: 'diagnose', icon: '🔍', label: 'Diagnose', desc: 'OBD-II codes, listening cues, fluid analysis, visual inspection.' },
          { id: 'repair', icon: '🔧', label: 'Repair scenarios', desc: '7 step-by-step jobs, from oil change to timing belt.' },
          { id: 'tools', icon: '🧰', label: 'Tool selection', desc: 'Pick the right tool for the job. Builds your mental toolkit.' },
          { id: 'safety', icon: '🛡️', label: 'Safety modules', desc: 'Jack stands, electrical, refrigerant, hot exhaust, springs, fluid disposal.' },
          { id: 'career', icon: '🏅', label: 'Career path', desc: 'ASE certification, Maine vocational programs, salary data.' },
          { id: 'quiz', icon: '🧪', label: 'Knowledge quiz', desc: '10 questions covering safety, diagnostics, repair.' },
          { id: 'resources', icon: '📚', label: 'Resources', desc: 'Every cited org with a working URL.' }
        ];
        var badgeCount = Object.keys(badges).length;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          h('div', { style: { marginBottom: 16, padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
            h('h1', { style: { margin: '0 0 6px', fontSize: 24, color: T.text } }, '🔧 Auto Repair Shop'),
            h('p', { style: { margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.5 } },
              'Diagnose like a tech, repair like a pro, know when to stop and call a shop. Maine emphasis: oldest fleet in the country, salt + rust everywhere, rural distances. Pairs with ',
              h('strong', { style: { color: T.accentHi } }, 'RoadReady'), ' — you drive a car AND maintain it.')
          ),
          badgeCount > 0 && h('div', { style: { marginBottom: 14, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted } },
            h('strong', { style: { color: T.accentHi } }, '🏅 Badges earned: '), String(badgeCount), ' — ',
            Object.keys(badges).map(function(k) { return badges[k].label; }).join(', ')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
            modules.map(function(m) {
              return h('button', { 'data-ar-focusable': true, key: m.id,
                'aria-label': 'Open ' + m.label + ' module',
                onClick: function() { setView(m.id); },
                style: { textAlign: 'left', padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, color: T.text, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 } },
                h('div', { style: { fontSize: 28 } }, m.icon),
                h('div', { style: { fontWeight: 700, fontSize: 15, color: T.text } }, m.label),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.4 } }, m.desc)
              );
            })
          ),
          h('div', { style: { marginTop: 16, padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('strong', { style: { color: T.accentHi } }, '🌲 Maine reality: '),
            MAINE_CONTEXT.fleetAge, ' ', MAINE_CONTEXT.salt
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // DIAGNOSE view — 4 sub-modes (obd / listen / fluid / visual)
      // ─────────────────────────────────────────
      function renderDiagnose() {
        var dxView = d.dxView || 'overview';
        function tabBtn(id, label) {
          var active = dxView === id;
          return h('button', { 'data-ar-focusable': true, role: 'tab',
            'aria-selected': active ? 'true' : 'false',
            onClick: function() { upd('dxView', id); },
            style: Object.assign({}, btnSecondary(), { background: active ? T.accent : T.cardAlt, color: active ? '#0f172a' : T.text, fontWeight: active ? 800 : 600 }) }, label);
        }

        function dxOverview() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🔍 Four diagnostic channels'),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.5 } },
                'Real techs use 4 senses + 1 tool. Each finds different problems. Get fluent in all four.'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 } },
                [
                  { icon: '🔌', name: 'OBD-II (computer)', desc: 'Plug in scanner. Read codes. Catches anything the engine computer flagged.' },
                  { icon: '👂', name: 'Listen', desc: 'Squeals, clicks, knocks, rattles. Each has a story. Old-school but unbeatable.' },
                  { icon: '🛢️', name: 'Fluids', desc: 'Color, smell, level. Tells you about cooling, lubrication, transmission, brakes.' },
                  { icon: '👁️', name: 'Visual', desc: 'Belts, hoses, leaks, lines, tires. Maine: undercarriage rust above all.' }
                ].map(function(c) {
                  return h('div', { key: c.name, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                    h('div', { style: { fontSize: 22, marginBottom: 4 } }, c.icon),
                    h('strong', { style: { display: 'block', fontSize: 13, color: T.text, marginBottom: 4 } }, c.name),
                    h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.45 } }, c.desc)
                  );
                })
              )
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🌲 Maine diagnostic reality'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } }, MAINE_CONTEXT.salt, ' ', MAINE_CONTEXT.rust)
            )
          );
        }

        function dxObd() {
          var picked = d.dxObdPicked || null;
          var pickedCode = picked ? OBD_CODES.find(function(c) { return c.code === picked; }) : null;
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🔌 OBD-II code library'),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'Tap a code to see what it means, common causes, and DIY-vs-shop verdict. ',
                h('strong', null, 'Free service: '),
                'NAPA / O\'Reilly / AutoZone will read your codes free.')
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 14 } },
              OBD_CODES.map(function(c) {
                var sel = picked === c.code;
                return h('button', { key: c.code, 'data-ar-focusable': true,
                  'aria-label': c.code + ': ' + c.name,
                  'aria-pressed': sel ? 'true' : 'false',
                  onClick: function() { upd('dxObdPicked', sel ? null : c.code); awardBadge('obd-explorer', 'OBD Explorer'); },
                  style: Object.assign({}, btnSecondary(), {
                    background: sel ? T.accent : T.cardAlt,
                    color: sel ? '#0f172a' : T.text,
                    textAlign: 'left',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    fontWeight: sel ? 800 : 600
                  }) },
                  c.code, h('br'), h('span', { style: { fontSize: 10, fontWeight: 500, opacity: 0.85 } }, c.name)
                );
              })
            ),
            pickedCode && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.accent } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                h('span', { style: { fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: T.accentHi } }, pickedCode.code),
                h('span', { style: { fontSize: 14, color: T.text, fontWeight: 700 } }, pickedCode.name),
                severityBadge(pickedCode.severity)
              ),
              h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, 'What it means: '), pickedCode.meaning),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                h('strong', { style: { color: T.text } }, 'Common causes: '), pickedCode.common),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                h('strong', { style: { color: T.good } }, 'DIY: '), pickedCode.diy),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                h('strong', { style: { color: T.warn } }, 'Take to shop if: '), pickedCode.shop),
              h('p', { style: { margin: 0, color: T.dim, fontSize: 11, fontStyle: 'italic' } },
                h('strong', null, 'Dashboard: '), pickedCode.illuminates)
            )
          );
        }

        function dxListen() {
          var picked = d.dxListenPicked || null;
          var pickedCue = picked ? LISTEN_CUES.find(function(c) { return c.id === picked; }) : null;
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '👂 What\'s that noise?'),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'Pick a noise you might hear. The tool tells you when it usually happens, what it usually is, and DIY-vs-shop verdict.')
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 } },
              LISTEN_CUES.map(function(c) {
                var sel = picked === c.id;
                return h('button', { key: c.id, 'data-ar-focusable': true,
                  'aria-label': c.name,
                  'aria-pressed': sel ? 'true' : 'false',
                  onClick: function() { upd('dxListenPicked', sel ? null : c.id); awardBadge('listener', 'Listener'); },
                  style: Object.assign({}, btnSecondary(), {
                    background: sel ? T.accent : T.cardAlt,
                    color: sel ? '#0f172a' : T.text,
                    textAlign: 'left',
                    fontWeight: sel ? 800 : 600,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8
                  }) },
                  h('span', null, c.name),
                  severityBadge(c.urgency)
                );
              })
            ),
            pickedCue && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.accent } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, pickedCue.name),
              h('p', { style: { margin: '0 0 6px', color: T.text, fontSize: 13, lineHeight: 1.5 } },
                h('strong', null, 'When: '), pickedCue.when),
              h('p', { style: { margin: '0 0 6px', color: T.text, fontSize: 13, lineHeight: 1.5 } },
                h('strong', { style: { color: T.warn } }, 'Likely cause: '), pickedCue.cause),
              h('p', { style: { margin: '0 0 6px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                h('strong', { style: { color: T.good } }, 'DIY: '), pickedCue.diy),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                h('strong', { style: { color: T.warn } }, 'Shop: '), pickedCue.shop)
            )
          );
        }

        function dxFluid() {
          var picked = d.dxFluidPicked || null;
          var pickedFluid = picked ? FLUID_CHECKS.find(function(c) { return c.id === picked; }) : null;
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🛢️ Fluid analysis'),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'Five fluids your car needs you to look at. Color + smell + level tells you almost everything.')
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 } },
              FLUID_CHECKS.map(function(c) {
                var sel = picked === c.id;
                return h('button', { key: c.id, 'data-ar-focusable': true,
                  'aria-label': c.name,
                  'aria-pressed': sel ? 'true' : 'false',
                  onClick: function() { upd('dxFluidPicked', sel ? null : c.id); awardBadge('fluid-reader', 'Fluid Reader'); },
                  style: Object.assign({}, btnSecondary(), {
                    background: sel ? T.accent : T.cardAlt,
                    color: sel ? '#0f172a' : T.text,
                    textAlign: 'left',
                    fontWeight: sel ? 800 : 600
                  }) }, c.name);
              })
            ),
            pickedFluid && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.accent } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, pickedFluid.name),
              h('p', { style: { margin: '0 0 6px', color: T.text, fontSize: 12, lineHeight: 1.5 } },
                h('strong', null, '📍 Where: '), pickedFluid.where),
              h('p', { style: { margin: '0 0 6px', color: T.good, fontSize: 12, lineHeight: 1.5 } },
                h('strong', null, '✅ Healthy: '), pickedFluid.healthy),
              h('p', { style: { margin: '0 0 6px', color: T.bad, fontSize: 12, lineHeight: 1.5 } },
                h('strong', null, '⚠️ Bad: '), pickedFluid.bad),
              h('p', { style: { margin: '0 0 6px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                h('strong', null, '👃 Smell: '), pickedFluid.smell),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                h('strong', null, '📏 Level: '), pickedFluid.level)
            )
          );
        }

        function dxVisual() {
          var picked = d.dxVisualPicked || null;
          var pickedItem = picked ? VISUAL_CHECKS.find(function(c) { return c.id === picked; }) : null;
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '👁️ Visual inspection'),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                '5 things to check under the hood + 5 things to check underneath. Maine: spring undercarriage check is non-negotiable.')
            ),
            h('h4', { style: { margin: '0 0 6px', fontSize: 13, color: T.accentHi } }, 'Under the hood'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 14 } },
              VISUAL_CHECKS.filter(function(c) { return c.area === 'hood'; }).map(function(c) {
                var sel = picked === c.id;
                return h('button', { key: c.id, 'data-ar-focusable': true,
                  'aria-label': c.name,
                  'aria-pressed': sel ? 'true' : 'false',
                  onClick: function() { upd('dxVisualPicked', sel ? null : c.id); awardBadge('visual-inspector', 'Visual Inspector'); },
                  style: Object.assign({}, btnSecondary(), {
                    background: sel ? T.accent : T.cardAlt,
                    color: sel ? '#0f172a' : T.text,
                    textAlign: 'left',
                    fontSize: 12,
                    fontWeight: sel ? 800 : 600
                  }) }, c.name);
              })
            ),
            h('h4', { style: { margin: '0 0 6px', fontSize: 13, color: T.accentHi } }, 'Underneath (Maine: spring inspection)'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 14 } },
              VISUAL_CHECKS.filter(function(c) { return c.area === 'under'; }).map(function(c) {
                var sel = picked === c.id;
                return h('button', { key: c.id, 'data-ar-focusable': true,
                  'aria-label': c.name,
                  'aria-pressed': sel ? 'true' : 'false',
                  onClick: function() { upd('dxVisualPicked', sel ? null : c.id); },
                  style: Object.assign({}, btnSecondary(), {
                    background: sel ? T.accent : T.cardAlt,
                    color: sel ? '#0f172a' : T.text,
                    textAlign: 'left',
                    fontSize: 12,
                    fontWeight: sel ? 800 : 600
                  }) }, c.name);
              })
            ),
            pickedItem && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.accent } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, pickedItem.name),
              h('p', { style: { margin: '0 0 6px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
                h('strong', null, '👁️ Look for: '), pickedItem.look),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                h('strong', null, '🚩 Flag if: '), pickedItem.finding)
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🔍 Diagnose'),
          h('div', { role: 'tablist', 'aria-label': 'Diagnose sub-modes',
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('overview', 'Overview'),
            tabBtn('obd', '🔌 OBD codes'),
            tabBtn('listen', '👂 Listen'),
            tabBtn('fluid', '🛢️ Fluids'),
            tabBtn('visual', '👁️ Visual')
          ),
          dxView === 'overview' && dxOverview(),
          dxView === 'obd' && dxObd(),
          dxView === 'listen' && dxListen(),
          dxView === 'fluid' && dxFluid(),
          dxView === 'visual' && dxVisual(),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // REPAIR view — 7 scenario walkthroughs
      // ─────────────────────────────────────────
      function renderRepair() {
        var picked = d.repairPicked || null;
        var pickedRepair = picked ? REPAIR_SCENARIOS.find(function(s) { return s.id === picked; }) : null;
        var stepsViewed = d.stepsViewed || {};

        function diffStars(diff) {
          return '★'.repeat(diff) + '☆'.repeat(4 - diff);
        }

        if (pickedRepair) {
          var viewedForThis = stepsViewed[pickedRepair.id] || {};
          var totalSteps = pickedRepair.steps.length;
          var doneSteps = Object.keys(viewedForThis).length;
          var pct = Math.round((doneSteps / totalSteps) * 100);
          return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid ' + T.border } },
              h('button', { 'data-ar-focusable': true, 'aria-label': 'Back to repair list',
                onClick: function() { upd('repairPicked', null); }, style: btnGhost() }, '← Repair list'),
              h('span', { style: { fontSize: 24 } }, pickedRepair.icon),
              h('h2', { style: { margin: 0, fontSize: 18, color: T.text } }, pickedRepair.name)
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 14 } },
              h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 2 } }, 'Difficulty'),
                h('div', { style: { fontSize: 14, color: T.accentHi, fontWeight: 800 } }, diffStars(pickedRepair.difficulty))),
              h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 2 } }, 'Time'),
                h('div', { style: { fontSize: 14, color: T.text, fontWeight: 700 } }, pickedRepair.time)),
              h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 2 } }, 'DIY cost'),
                h('div', { style: { fontSize: 14, color: T.good, fontWeight: 700 } }, pickedRepair.cost.diy)),
              h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 2 } }, 'Shop cost'),
                h('div', { style: { fontSize: 14, color: T.warn, fontWeight: 700 } }, pickedRepair.cost.shop))
            ),
            h('div', { style: { padding: 12, borderRadius: 8, background: T.card, border: '1px solid ' + T.border, marginBottom: 14, fontSize: 13, color: T.muted, lineHeight: 1.5 } },
              h('strong', { style: { color: T.accentHi } }, '💡 '), pickedRepair.universal),
            h('div', { style: { padding: 12, borderRadius: 8, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h4', { style: { margin: '0 0 6px', fontSize: 13, color: T.accentHi } }, '🧰 Tools needed'),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.6 } },
                pickedRepair.tools.map(function(tid, i) {
                  var t = TOOLS_LIBRARY.find(function(x) { return x.id === tid; });
                  return h('span', { key: tid }, t ? t.name : tid, i < pickedRepair.tools.length - 1 ? ' • ' : '');
                })
              ),
              pickedRepair.consumables && h('div', { style: { marginTop: 8, fontSize: 12, color: T.muted, lineHeight: 1.5 } },
                h('strong', { style: { color: T.text } }, 'Consumables: '), pickedRepair.consumables)
            ),
            h('div', { style: { padding: 12, borderRadius: 8, background: '#7c2d12', border: '1px solid #ea580c', marginBottom: 14 } },
              h('h4', { style: { margin: '0 0 6px', fontSize: 13, color: '#fed7aa' } }, '🛡️ Safety prerequisites'),
              h('ul', { style: { margin: 0, paddingLeft: 20, fontSize: 12, color: '#fed7aa', lineHeight: 1.6 } },
                pickedRepair.safety.map(function(s, i) { return h('li', { key: i }, s.replace(/-/g, ' ')); })
              )
            ),
            h('div', { style: { padding: 12, borderRadius: 8, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } },
                h('h4', { style: { margin: 0, fontSize: 14, color: T.accentHi } }, '📋 Step-by-step'),
                h('span', { style: { fontSize: 11, color: T.muted, fontFamily: 'monospace' } }, doneSteps + ' / ' + totalSteps + ' viewed (' + pct + '%)')
              ),
              h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                pickedRepair.steps.map(function(s) {
                  var viewed = !!viewedForThis[s.n];
                  return h('button', { key: s.n, role: 'listitem', 'data-ar-focusable': true,
                    'aria-label': 'Step ' + s.n + (viewed ? ' (viewed)' : ''),
                    onClick: function() {
                      var nv = Object.assign({}, viewedForThis); nv[s.n] = true;
                      var all = Object.assign({}, stepsViewed); all[pickedRepair.id] = nv;
                      upd('stepsViewed', all);
                      if (Object.keys(nv).length === totalSteps) {
                        awardBadge('rep-' + pickedRepair.id, 'Walked through: ' + pickedRepair.name);
                      }
                    },
                    style: { textAlign: 'left', padding: 10, borderRadius: 8, background: viewed ? T.cardAlt : T.bg, border: '1px solid ' + (viewed ? T.accent : T.border), color: T.text, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start' } },
                    h('span', { 'aria-hidden': 'true', style: { background: viewed ? T.accent : T.dim, color: '#0f172a', borderRadius: 999, width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 } }, s.n),
                    h('span', { style: { fontSize: 13, lineHeight: 1.5, color: T.text } }, s.do)
                  );
                })
              )
            ),
            pickedRepair.gotchas && h('div', { style: { padding: 12, borderRadius: 8, background: T.card, border: '1px solid ' + T.warn, marginBottom: 14 } },
              h('h4', { style: { margin: '0 0 6px', fontSize: 13, color: T.warn } }, '⚠️ Common gotchas (Maine)'),
              h('ul', { style: { margin: 0, paddingLeft: 20, fontSize: 12, color: T.muted, lineHeight: 1.6 } },
                pickedRepair.gotchas.map(function(g, i) { return h('li', { key: i }, g); })
              )
            ),
            h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.accent } },
              h('strong', { style: { color: T.accentHi, fontSize: 13 } }, '🎓 Verdict: '),
              h('span', { style: { fontSize: 13, color: T.text, lineHeight: 1.5 } }, pickedRepair.verdict)
            ),
            disclaimerFooter()
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🔧 Repair scenarios'),
          h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Pick a job. Each scenario shows tools, safety, step-by-step, gotchas, and a clear DIY-vs-shop verdict.'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
            REPAIR_SCENARIOS.map(function(s) {
              return h('button', { key: s.id, 'data-ar-focusable': true,
                'aria-label': s.name,
                onClick: function() { upd('repairPicked', s.id); },
                style: { textAlign: 'left', padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, color: T.text, cursor: 'pointer' } },
                h('div', { style: { fontSize: 28, marginBottom: 4 } }, s.icon),
                h('div', { style: { fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 4 } }, s.name),
                h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 4, fontFamily: 'monospace' } }, diffStars(s.difficulty), ' · ', s.time),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.4 } }, s.universal)
              );
            })
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // TOOLS view — library + selection mini-game
      // ─────────────────────────────────────────
      function renderTools() {
        var toolsView = d.toolsView || 'library';
        function tabBtn(id, label) {
          var active = toolsView === id;
          return h('button', { 'data-ar-focusable': true, role: 'tab',
            'aria-selected': active ? 'true' : 'false',
            onClick: function() { upd('toolsView', id); },
            style: Object.assign({}, btnSecondary(), { background: active ? T.accent : T.cardAlt, color: active ? '#0f172a' : T.text, fontWeight: active ? 800 : 600 }) }, label);
        }

        function library() {
          var picked = d.toolPicked || null;
          var pickedTool = picked ? TOOLS_LIBRARY.find(function(t) { return t.id === picked; }) : null;
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🧰 Tool library'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'Tap a tool to see what it is, when you need it, and what it costs. Build a starter kit incrementally — you don\'t need everything to start.')
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8, marginBottom: 14 } },
              TOOLS_LIBRARY.map(function(t) {
                var sel = picked === t.id;
                return h('button', { key: t.id, 'data-ar-focusable': true,
                  'aria-label': t.name,
                  'aria-pressed': sel ? 'true' : 'false',
                  onClick: function() { upd('toolPicked', sel ? null : t.id); },
                  style: Object.assign({}, btnSecondary(), {
                    background: sel ? T.accent : T.cardAlt,
                    color: sel ? '#0f172a' : T.text,
                    textAlign: 'left',
                    fontSize: 12,
                    fontWeight: sel ? 800 : 600,
                    display: 'flex', alignItems: 'flex-start', gap: 8
                  }) },
                  h('span', { style: { fontSize: 18 } }, t.icon),
                  h('span', null, t.name, h('br'), h('span', { style: { fontSize: 10, opacity: 0.8 } }, t.cost))
                );
              })
            ),
            pickedTool && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.accent } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                h('span', { style: { fontSize: 28 } }, pickedTool.icon),
                h('h4', { style: { margin: 0, fontSize: 15, color: T.accentHi } }, pickedTool.name)
              ),
              h('p', { style: { margin: '0 0 6px', color: T.text, fontSize: 13, lineHeight: 1.5 } },
                h('strong', null, '🔧 What: '), pickedTool.what),
              h('p', { style: { margin: '0 0 6px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                h('strong', { style: { color: T.text } }, '🕐 When: '), pickedTool.when),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                h('strong', { style: { color: T.good } }, '💵 Buy: '), pickedTool.buy)
            )
          );
        }

        function game() {
          var qIdx = d.toolGameIdx || 0;
          var question = TOOL_GAME[qIdx];
          if (!question) {
            return h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🎉 Tool selection complete'),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.5 } },
                'You\'ve worked through every scenario. Ready to apply this in real life: practice on a non-running car at a junkyard, take a CTE class, or volunteer with someone\'s project.'),
              h('button', { 'data-ar-focusable': true, onClick: function() { upd('toolGameIdx', 0); upd('toolGameAnswers', {}); },
                style: btnPrimary() }, '🔄 Start over')
            );
          }
          var answers = d.toolGameAnswers || {};
          var picked = answers[question.id] || [];
          var allOptions = question.correct.concat(question.distractors);
          // Randomize but stable for question
          var orderKey = 'order_' + question.id;
          var order = answers[orderKey];
          if (!order) {
            order = allOptions.slice().sort(function() { return Math.random() - 0.5; });
            answers[orderKey] = order;
          }
          var submitted = !!answers[question.id + '_submitted'];

          function togglePick(tid) {
            if (submitted) return;
            var newPicked = picked.indexOf(tid) >= 0 ? picked.filter(function(x) { return x !== tid; }) : picked.concat([tid]);
            var newAns = Object.assign({}, answers); newAns[question.id] = newPicked;
            upd('toolGameAnswers', newAns);
          }
          function submit() {
            var newAns = Object.assign({}, answers); newAns[question.id + '_submitted'] = true;
            upd('toolGameAnswers', newAns);
            // grade
            var correctSet = question.correct;
            var allCorrect = correctSet.length === picked.length && correctSet.every(function(c) { return picked.indexOf(c) >= 0; });
            if (allCorrect) {
              awardBadge('tool-picker-' + question.id, 'Picked tools: ' + question.label.slice(0, 30) + '...');
              arAnnounce('Correct toolset.');
            } else {
              arAnnounce('Not quite — review the explanation.');
            }
          }
          function next() {
            upd('toolGameIdx', qIdx + 1);
          }

          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 4 } }, 'Question ' + (qIdx + 1) + ' of ' + TOOL_GAME.length),
              h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, question.label)
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8, marginBottom: 14 } },
              order.map(function(tid) {
                var t = TOOLS_LIBRARY.find(function(x) { return x.id === tid; });
                if (!t) return null;
                var isPicked = picked.indexOf(tid) >= 0;
                var isCorrect = question.correct.indexOf(tid) >= 0;
                var fb = submitted ? (isCorrect ? (isPicked ? 'good' : 'missed') : (isPicked ? 'wrong' : 'ok')) : null;
                var bg, border;
                if (fb === 'good') { bg = '#064e3b'; border = T.good; }
                else if (fb === 'missed') { bg = '#78350f'; border = T.warn; }
                else if (fb === 'wrong') { bg = '#7f1d1d'; border = T.bad; }
                else if (fb === 'ok') { bg = T.cardAlt; border = T.border; }
                else if (isPicked) { bg = T.accent; border = T.accent; }
                else { bg = T.cardAlt; border = T.border; }
                return h('button', { key: tid, 'data-ar-focusable': true,
                  'aria-label': t.name + (isPicked ? ' (picked)' : ''),
                  'aria-pressed': isPicked ? 'true' : 'false',
                  disabled: submitted,
                  onClick: function() { togglePick(tid); },
                  style: {
                    padding: 10, borderRadius: 8, background: bg, color: isPicked && !submitted ? '#0f172a' : T.text,
                    border: '1px solid ' + border, cursor: submitted ? 'default' : 'pointer',
                    textAlign: 'left', fontSize: 12, fontWeight: isPicked ? 700 : 500,
                    display: 'flex', alignItems: 'center', gap: 8
                  } },
                  h('span', { style: { fontSize: 18 } }, t.icon),
                  h('span', null, t.name)
                );
              })
            ),
            !submitted && h('button', { 'data-ar-focusable': true,
              'aria-label': 'Submit toolset selection',
              disabled: picked.length === 0, onClick: submit,
              style: Object.assign({}, btnPrimary(), { opacity: picked.length === 0 ? 0.5 : 1 }) }, '✅ Lock in toolset'),
            submitted && h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.accent, marginTop: 8 } },
              h('strong', { style: { color: T.accentHi } }, '🎓 Why these tools: '),
              h('span', { style: { color: T.text, fontSize: 13, lineHeight: 1.5 } }, question.why),
              h('div', { style: { marginTop: 10 } },
                h('button', { 'data-ar-focusable': true, onClick: next,
                  style: btnPrimary() }, qIdx + 1 < TOOL_GAME.length ? '→ Next question' : '🎉 Finish')
              )
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🧰 Tools'),
          h('div', { role: 'tablist', 'aria-label': 'Tool sub-modes',
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('library', '📖 Library'),
            tabBtn('game', '🎮 Selection mini-game')
          ),
          toolsView === 'library' && library(),
          toolsView === 'game' && game(),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // SAFETY view
      // ─────────────────────────────────────────
      function renderSafety() {
        var picked = d.safetyPicked || null;
        var pickedMod = picked ? SAFETY_MODULES.find(function(m) { return m.id === picked; }) : null;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🛡️ Safety modules'),
          h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Six safety areas. Skipping any of these can cost you a hand, an eye, or your life. Tap each module to see the rule + checklist.'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 14 } },
            SAFETY_MODULES.map(function(m) {
              var sel = picked === m.id;
              return h('button', { key: m.id, 'data-ar-focusable': true,
                'aria-label': m.name,
                'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('safetyPicked', sel ? null : m.id); awardBadge('safety-' + m.id, 'Safety: ' + m.name); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#0f172a' : T.text,
                  textAlign: 'left',
                  fontWeight: sel ? 800 : 600,
                  display: 'flex', alignItems: 'flex-start', gap: 8
                }) },
                h('span', { style: { fontSize: 22 } }, m.icon),
                h('span', null, m.name)
              );
            })
          ),
          pickedMod && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.accent } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 16, color: T.accentHi } }, pickedMod.icon + ' ' + pickedMod.name),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#7c2d12', border: '1px solid #ea580c', marginBottom: 10 } },
              h('strong', { style: { color: '#fed7aa', fontSize: 13 } }, '⚠️ Key rule: '),
              h('span', { style: { color: '#fed7aa', fontSize: 13, lineHeight: 1.5 } }, pickedMod.keyRule)
            ),
            h('p', { style: { margin: '0 0 10px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, 'Why: '), pickedMod.why),
            h('h4', { style: { margin: '0 0 6px', fontSize: 13, color: T.text } }, '✓ Checklist'),
            h('ul', { role: 'list', style: { margin: 0, paddingLeft: 20, fontSize: 12, color: T.muted, lineHeight: 1.6 } },
              pickedMod.checklist.map(function(c, i) { return h('li', { key: i, role: 'listitem' }, c); })
            ),
            h('div', { style: { marginTop: 10, padding: 8, borderRadius: 6, background: T.cardAlt, fontSize: 11, color: T.bad, fontWeight: 700 } },
              '🛑 If you skip this: ', pickedMod.consequenceOfSkipping)
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // CAREER view
      // ─────────────────────────────────────────
      function renderCareer() {
        var carView = d.carView || 'overview';
        function tabBtn(id, label) {
          var active = carView === id;
          return h('button', { 'data-ar-focusable': true, role: 'tab',
            'aria-selected': active ? 'true' : 'false',
            onClick: function() { upd('carView', id); },
            style: Object.assign({}, btnSecondary(), { background: active ? T.accent : T.cardAlt, color: active ? '#0f172a' : T.text, fontWeight: active ? 800 : 600 }) }, label);
        }

        function overview() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🏅 Auto repair as a career'),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.6 } }, CAREER_DATA.overview),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 } },
                [
                  { label: 'Entry-level', val: CAREER_DATA.entrySalary, color: T.muted },
                  { label: 'ASE-certified', val: CAREER_DATA.aseCertSalary, color: T.accentHi },
                  { label: 'Master Tech', val: CAREER_DATA.masterTech, color: T.good },
                  { label: 'Specialist (EV/Diesel)', val: CAREER_DATA.specialist, color: T.good }
                ].map(function(r) {
                  return h('div', { key: r.label, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                    h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 4 } }, r.label),
                    h('div', { style: { fontSize: 13, color: r.color, fontWeight: 700 } }, r.val)
                  );
                })
              ),
              h('p', { style: { margin: '12px 0 0', color: T.muted, fontSize: 12, lineHeight: 1.5, fontStyle: 'italic' } }, CAREER_DATA.bigPicture)
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🌲 Maine realities'),
              h('ul', { style: { margin: 0, paddingLeft: 20, fontSize: 12, color: T.muted, lineHeight: 1.7 } },
                CAREER_DATA.maineRealities.map(function(r, i) { return h('li', { key: i }, r); })
              ),
              h('p', { style: { margin: '10px 0 0', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                h('strong', { style: { color: T.text } }, '🧰 Tool investment: '), CAREER_DATA.toolInvestment)
            )
          );
        }

        function ase() {
          return h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🏅 ASE certification areas'),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
              'Each area: $60 test fee, 2 years\' work experience required to certify. Recerts every 5 years. ',
              h('strong', null, 'Master Tech '), '= all 8 of A1–A8.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 } },
              CAREER_DATA.aseAreas.map(function(a) {
                return h('div', { key: a.code, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                    h('span', { style: { background: T.accent, color: '#0f172a', fontWeight: 800, fontSize: 11, padding: '2px 6px', borderRadius: 4 } }, a.code),
                    h('strong', { style: { fontSize: 12, color: T.text } }, a.name)
                  ),
                  h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.5 } }, a.focus)
                );
              })
            )
          );
        }

        function pathway() {
          return h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🛤️ Career pathway (Maine)'),
            h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              CAREER_DATA.pathway.map(function(p) {
                return h('div', { key: p.stage, role: 'listitem', style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, display: 'flex', gap: 10, alignItems: 'flex-start' } },
                  h('span', { 'aria-hidden': 'true', style: { background: T.accent, color: '#0f172a', borderRadius: 999, width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 } }, p.stage),
                  h('div', null,
                    h('strong', { style: { display: 'block', fontSize: 13, color: T.accentHi, marginBottom: 4 } }, p.title),
                    h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5 } }, p.desc)
                  )
                );
              })
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🏅 Career'),
          h('div', { role: 'tablist', 'aria-label': 'Career sections',
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('overview', 'Overview'),
            tabBtn('ase', 'ASE areas'),
            tabBtn('pathway', 'Pathway')
          ),
          carView === 'overview' && overview(),
          carView === 'ase' && ase(),
          carView === 'pathway' && pathway(),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // QUIZ view — 10 questions
      // ─────────────────────────────────────────
      function renderQuiz() {
        var qIdx = d.quizIdx || 0;
        var question = QUIZ[qIdx];
        var answers = d.quizAnswers || {};
        var picked = answers[question && question.id];
        var submitted = picked != null;
        var score = Object.keys(answers).reduce(function(acc, k) {
          var q = QUIZ.find(function(x) { return x.id === k; });
          if (q && answers[k] === q.correct) acc++;
          return acc;
        }, 0);

        if (!question) {
          var pct = Math.round((score / QUIZ.length) * 100);
          if (pct >= 80) awardBadge('quiz-passed', 'Passed Auto Repair Quiz');
          return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
            backBar('🧪 Quiz complete'),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.accent } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 16, color: T.accentHi } }, '🎉 Quiz complete: ' + score + ' / ' + QUIZ.length + ' (' + pct + '%)'),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.5 } },
                pct >= 80 ? '🏅 Solid foundation. You\'re ready to start hands-on practice with a mentor or CTE class.' :
                pct >= 60 ? '👍 Good start. Review the diagnose + safety modules and re-test.' :
                '📚 Worth another pass through the material — especially safety. No shame; this is hard.'),
              h('button', { 'data-ar-focusable': true, onClick: function() { upd('quizIdx', 0); upd('quizAnswers', {}); },
                style: btnPrimary() }, '🔄 Retake quiz')
            ),
            disclaimerFooter()
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🧪 Quiz'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
              h('span', { style: { fontSize: 24 } }, question.icon),
              h('span', { style: { fontSize: 11, color: T.dim } }, 'Question ' + (qIdx + 1) + ' of ' + QUIZ.length, ' · Score: ', score)
            ),
            h('h3', { style: { margin: '0 0 12px', fontSize: 14, color: T.text, lineHeight: 1.5 } }, question.stem),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              question.choices.map(function(c, i) {
                var isPicked = picked === i;
                var isCorrect = i === question.correct;
                var bg, border, color;
                if (submitted) {
                  if (isCorrect) { bg = '#064e3b'; border = T.good; color = '#d1fae5'; }
                  else if (isPicked) { bg = '#7f1d1d'; border = T.bad; color = '#fee2e2'; }
                  else { bg = T.cardAlt; border = T.border; color = T.muted; }
                } else if (isPicked) {
                  bg = T.accent; border = T.accent; color = '#0f172a';
                } else {
                  bg = T.cardAlt; border = T.border; color = T.text;
                }
                return h('button', { key: i, 'data-ar-focusable': true,
                  'aria-label': c, 'aria-pressed': isPicked ? 'true' : 'false',
                  disabled: submitted,
                  onClick: function() {
                    var nv = Object.assign({}, answers); nv[question.id] = i;
                    upd('quizAnswers', nv);
                  },
                  style: { padding: 10, borderRadius: 8, background: bg, color: color, border: '1px solid ' + border, cursor: submitted ? 'default' : 'pointer', textAlign: 'left', fontSize: 13, lineHeight: 1.5 } },
                  String.fromCharCode(65 + i) + '. ' + c
                );
              })
            ),
            submitted && h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.accent } },
              h('strong', { style: { color: picked === question.correct ? T.good : T.warn } },
                picked === question.correct ? '✅ Correct. ' : '❌ Not quite. '),
              h('span', { style: { color: T.text, fontSize: 12, lineHeight: 1.5 } }, question.why),
              h('div', { style: { marginTop: 10 } },
                h('button', { 'data-ar-focusable': true, onClick: function() { upd('quizIdx', qIdx + 1); }, style: btnPrimary() },
                  qIdx + 1 < QUIZ.length ? '→ Next question' : '🎉 Finish quiz')
              )
            )
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // RESOURCES view
      // ─────────────────────────────────────────
      function renderResources() {
        function section(title, items) {
          return h('div', { style: { marginBottom: 16, padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, title),
            items.map(function(r, i) {
              return h('div', { key: i, style: { padding: '8px 0', borderBottom: i < items.length - 1 ? '1px solid ' + T.border : 'none' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 16 } }, r.icon),
                  h('span', { style: { fontWeight: 700, fontSize: 13, color: T.text } }, r.name)
                ),
                h('div', { style: { fontSize: 13, color: T.accentHi, fontWeight: 600, marginLeft: 24 } },
                  r.url
                    ? h('a', { href: r.url, target: '_blank', rel: 'noopener', style: { color: T.accentHi, textDecoration: 'underline' }, 'aria-label': r.name + ' — ' + r.contact + ' (opens in new tab)' }, r.contact)
                    : r.contact),
                h('div', { style: { fontSize: 11, color: T.dim, marginLeft: 24, lineHeight: 1.5 } }, r.desc)
              );
            })
          );
        }
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📚 Resources'),
          h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Every org cited in this tool. ',
            h('strong', { style: { color: T.accentHi } }, 'Maine note: '),
            MAINE_CONTEXT.distance, ' ', MAINE_CONTEXT.waitlists),
          section('🏅 Certification', RESOURCES.certification),
          section('🌲 Maine education + CTE', RESOURCES.maineEducation),
          section('⚠️ Safety standards', RESOURCES.safety),
          section('🛡️ Consumer protection', RESOURCES.consumer),
          section('🔧 DIY libraries', RESOURCES.diy),
          h('div', { style: { marginTop: 8, padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('div', { style: { fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine reality summary'),
            h('div', { style: { marginBottom: 4 } }, MAINE_CONTEXT.fleetAge),
            h('div', { style: { marginBottom: 4 } }, MAINE_CONTEXT.salt),
            h('div', { style: { marginBottom: 4 } }, MAINE_CONTEXT.coldStart),
            h('div', { style: { marginBottom: 4 } }, MAINE_CONTEXT.inspection),
            h('div', null, MAINE_CONTEXT.sticker)
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // VIEW ROUTER
      // ─────────────────────────────────────────
      switch (view) {
        case 'diagnose':  return renderDiagnose();
        case 'repair':    return renderRepair();
        case 'tools':     return renderTools();
        case 'safety':    return renderSafety();
        case 'career':    return renderCareer();
        case 'quiz':      return renderQuiz();
        case 'resources': return renderResources();
        case 'menu':
        default:          return renderMenu();
      }
      } catch(e) {
        console.error('[AutoRepair] render error', e);
        return ctx.React.createElement('div', { style: { padding: 16, color: '#fde2e2', background: '#7f1d1d', borderRadius: 8 } },
          'Auto Repair Shop failed to render. ' + (e && e.message ? e.message : ''));
      }
    }
  });

})();

}
