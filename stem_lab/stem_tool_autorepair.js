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
    },
    {
      id: 'battery', name: 'Battery replacement',
      icon: '🔋', difficulty: 1, time: '20–40 min',
      cost: { diy: '$120–250', shop: '$200–350' },
      universal: 'Easy and saves the markup. The battery itself costs the same; the shop labor is ~$30–80 you keep.',
      tools: ['socket-set', 'wrench-set', 'wire-brush', 'multimeter', 'gloves', 'safety-glasses'],
      consumables: 'New battery (correct group size + CCA — see owner\'s manual or pull the old battery and read its label). Optional: anti-corrosion terminal spray ($5).',
      safety: ['battery-disconnect-required', 'eye-protection-required', 'acid-burn-risk', 'spark-near-fuel-risk'],
      steps: [
        { n: 1, do: 'Verify the battery is the problem first. Multimeter on terminals: rested battery should read 12.4–12.8V. Below 12.0V = needs charge or replacement. Most parts stores load-test batteries free.' },
        { n: 2, do: 'Note radio code / saved settings. Some older cars need a radio anti-theft code re-entered after disconnection. Check the owner\'s manual now.' },
        { n: 3, do: 'Optional but smart: plug a 12V memory-saver into the OBD-II port or the cigarette lighter. Keeps the radio code and the ECU short-term memory alive while the battery is out.' },
        { n: 4, do: 'Loosen the negative (-) terminal first with the correct wrench (usually 10mm). Slide the cable off and tuck it AWAY from the battery so it can\'t spring back and touch the post.' },
        { n: 5, do: 'Loosen the positive (+) terminal. Same — tuck cable away.' },
        { n: 6, do: 'Remove the battery hold-down (a clamp at the base or a strap across the top). Note hardware orientation.' },
        { n: 7, do: 'Lift the battery out. They\'re HEAVY (30–50 lb). Use both hands and the molded handle. Keep upright — never tilt sideways (acid spill).' },
        { n: 8, do: 'Wire-brush both cable ends + the battery tray. Salt-Maine corrosion on a tray can be aggressive. Baking-soda water neutralizes acid; rinse + dry.' },
        { n: 9, do: 'Place new battery in the same orientation (positive post on the same side). Reinstall hold-down.' },
        { n: 10, do: 'Connect POSITIVE (+) terminal first. Snug firm but don\'t crank — overtightening cracks the post.' },
        { n: 11, do: 'Connect NEGATIVE (-) terminal last.' },
        { n: 12, do: 'Optional: anti-corrosion spray on terminals.' },
        { n: 13, do: 'Start the engine. Verify charging voltage at battery terminals: 13.8–14.7V running = alternator healthy. Re-enter radio code if needed.' },
        { n: 14, do: 'Bring the OLD battery to a parts store. Most places give you a $10–25 core refund — they recycle the lead.' }
      ],
      gotchas: [
        'Wrong group size won\'t fit the tray or cables won\'t reach the posts. CHECK the owner\'s manual or read the OEM battery label.',
        'CCA (cold cranking amps) matters in Maine. A 500 CCA battery in Maine is borderline; aim for 700+ CCA on anything bigger than a small car.',
        'Top-post vs side-post: Most modern cars are top-post. Some older GMs are side-post. Different cable terminals. Match what came out.',
        'Acid burns: a leaking or cracked battery has acid you don\'t want on skin or clothes. Gloves + glasses non-negotiable.',
        'Order matters: NEGATIVE OFF first, POSITIVE OFF second. POSITIVE ON first, NEGATIVE ON last. Prevents wrench-shorts.'
      ],
      verdict: 'DIY-friendly. The savings beat the time. Maine: in winter check the battery in November, not in February when you\'re stranded.'
    },
    {
      id: 'spark-plugs', name: 'Spark plug replacement',
      icon: '⚡', difficulty: 2, time: '30 min – 2 hours',
      cost: { diy: '$20–80', shop: '$80–250' },
      universal: 'Common interval at ~60K–100K miles for iridium plugs. Engine-layout dependent — inline 4 is easy; transverse V6 with rear-bank plugs under intake is hard.',
      tools: ['socket-set', 'spark-plug-socket', 'torque-wrench', 'gap-gauge', 'gloves'],
      consumables: 'Correct spark plugs (look up the OEM part number — wrong plug = misfires). Anti-seize on threads (sparingly — too much changes torque readings). Dielectric grease on coil boot.',
      safety: ['engine-cool-required', 'plug-thread-fragile', 'no-cross-thread'],
      steps: [
        { n: 1, do: 'Engine MUST be cool. Hot aluminum heads + steel plug threads = stripped threads. Cold or warm only.' },
        { n: 2, do: 'Locate the coil packs / plug wires. Modern cars: one coil per plug, on top of each plug. Older cars: a distributor with wires running to each plug.' },
        { n: 3, do: 'Disconnect ONE coil (squeeze the clip + lift). Photograph wire routing if you have plug wires.' },
        { n: 4, do: 'Compressed air or a shop vac to clean debris OUT of the plug well — anything sitting there falls into the cylinder when you remove the plug.' },
        { n: 5, do: 'Use the spark-plug socket (rubber-lined) on a long extension. Loosen the plug. Lift it out — note the condition (color, gap, electrode wear) for each cylinder. Different colors across cylinders = clue to a weak cylinder.' },
        { n: 6, do: 'Verify gap on the new plug with a gap gauge. Iridium plugs come pre-gapped — DO NOT bend the iridium tip; you\'ll break it. Just verify.' },
        { n: 7, do: 'Light dab of anti-seize on the THREADS only (not the electrode tip). Some plug brands say no anti-seize — read the package.' },
        { n: 8, do: 'Hand-thread the plug into the head FIRST — never cross-thread. If it doesn\'t turn freely with your fingers, back out and try again.' },
        { n: 9, do: 'After hand-tight, switch to torque wrench. Torque to spec (typically 13–25 ft-lb depending on plug type — RTFM).' },
        { n: 10, do: 'Dab dielectric grease inside the coil boot. Reinstall the coil. Click it home. Reconnect electrical clip.' },
        { n: 11, do: 'Repeat for all cylinders (4 / 6 / 8). Do them ONE AT A TIME so wire / coil order can\'t get mixed up.' },
        { n: 12, do: 'Start engine. Idle should be smooth. Listen for misfire. Drive 5 minutes; if any misfire codes, back off torque on the suspect plug or recheck gap.' }
      ],
      gotchas: [
        'Cross-threading aluminum heads = head pulled for thread repair. Hand-thread always.',
        'Wrong plug heat range = pre-ignition or fouling. OEM number matters; "looks the same" isn\'t.',
        'Dropping the plug = chipped electrode = misfire. Drop it, replace it.',
        'On transverse V6s, the back bank plugs may require removing the upper intake. That\'s a 3-hour job, not 30 minutes. Check accessibility before committing.',
        'Don\'t reuse old coil boots if torn — they leak voltage and cause misfires.'
      ],
      verdict: 'DIY on inline-4 / pickup-truck V8s. Shop or experienced-DIY for transverse V6 / anything with intake-removal access.'
    },
    {
      id: 'wipers', name: 'Wiper blade replacement',
      icon: '🌧️', difficulty: 1, time: '5–10 min',
      cost: { diy: '$15–40', shop: '$40–80' },
      universal: '5-minute job. Maine: do this twice a year (spring + fall). Salt-spray winters destroy blades fast.',
      tools: ['none-significant'],
      consumables: 'Pair of wiper blades (correct lengths — driver and passenger may differ). Optional: rear blade.',
      safety: ['windshield-spring-back-risk'],
      steps: [
        { n: 1, do: 'Look up the correct lengths for your vehicle (parts-store kiosks have catalogs by year/make/model).' },
        { n: 2, do: 'Lift the wiper arm AWAY from the windshield. Most cars: arm clicks into a "service" position pointing straight up.' },
        { n: 3, do: 'Find the release on the blade. Most modern: a small tab or button on the underside where blade meets arm. Press tab + slide blade DOWN the arm (or hinge it depending on attachment).' },
        { n: 4, do: 'Remove old blade. Note the attachment style (hook, pinch-tab, side-pin, top-lock).' },
        { n: 5, do: 'Install new blade in same orientation. Listen for the click — that\'s the lock engaging.' },
        { n: 6, do: 'Lower arm gently to windshield. NEVER let it spring back — a wiper arm slamming the windshield can crack the glass.' },
        { n: 7, do: 'Mist windshield + run wipers. Listen for chatter. If new blades chatter, the arm angle may be slightly bent — adjust gently.' }
      ],
      gotchas: [
        'Wrong length: too long = blades hit each other or arm strikes the body. Too short = streaks.',
        'Wrong attachment style: bring the OLD blade with you to the parts store to match.',
        'Arm spring-back: hold the arm with your spare hand whenever the blade is off. A bare arm hits hard enough to crack windshields.',
        'Maine winter: full-frame "winter blades" + a windshield-fluid rated for -30°F is the difference between seeing and not seeing on slush days.'
      ],
      verdict: 'Fully DIY. If anything, do it BEFORE you need to see in a snowstorm.'
    },
    {
      id: 'headlight-bulb', name: 'Headlight bulb replacement',
      icon: '💡', difficulty: 1, time: '10–30 min',
      cost: { diy: '$15–60', shop: '$50–150' },
      universal: 'Easy on most cars; some require bumper-cover removal which pushes it to a shop.',
      tools: ['screwdriver-or-clip-release', 'gloves'],
      consumables: 'Replacement bulb — match the type (H11, 9006, H7, etc.) on the old bulb. Pair-replace: old bulb fading is the partner\'s soon-future.',
      safety: ['bulb-glass-skin-oils-burn-out', 'engine-cool-cooler-better'],
      steps: [
        { n: 1, do: 'Open the hood. Locate the back of the headlight assembly. The bulb is in a connector + rubber boot or twist-lock.' },
        { n: 2, do: 'Disconnect the electrical connector. Either a slide-back tab or a squeeze-and-pull.' },
        { n: 3, do: 'Remove the rubber boot if present. Then twist-lock the bulb 1/4 turn counterclockwise OR release the wire clip holding the bulb in.' },
        { n: 4, do: 'Pull old bulb straight back. Set aside.' },
        { n: 5, do: 'CRITICAL: handle the new bulb by its plastic base, NEVER touch the glass. Skin oils create hot spots that burn out the bulb in days. If you do touch the glass, wipe with rubbing alcohol before installing.' },
        { n: 6, do: 'Insert new bulb. Twist-lock or wire-clip it home in the SAME orientation as the old bulb.' },
        { n: 7, do: 'Replace rubber boot. Reconnect electrical connector — listen for the click.' },
        { n: 8, do: 'Test before closing hood. Turn headlights on / high beam / low beam. If the new bulb doesn\'t light, recheck connector.' }
      ],
      gotchas: [
        'Bumper-cover access: some cars (newer Honda Odyssey, some Audis) require removing the bumper cover to reach the bulb. That pushes labor from 5 minutes to 1 hour. Look up your specific vehicle BEFORE buying the bulb.',
        'Skin oils on halogen glass = early failure. Cotton glove or paper towel between fingers and glass.',
        'Wrong bulb type: H11 ≠ 9005. The connector is keyed but mismatch causes fitment + heat issues.',
        'Pair replace: bulbs from the same lot fail close together. Replace both even if only one is out — saves a second 10-minute job in 2 weeks.',
        'LED conversion bulbs sold for halogen housings often produce glare to oncoming traffic + may not be street-legal. DOT-compliant options exist; Maine inspection station can fail noncompliant LEDs.'
      ],
      verdict: 'Fully DIY when accessible. Shop when bumper-cover removal is required.'
    },
    {
      id: 'coolant-flush', name: 'Coolant flush + refill',
      icon: '💧', difficulty: 2, time: '1–2 hours',
      cost: { diy: '$30–80', shop: '$100–250' },
      universal: 'Manufacturer interval is 30K–100K miles depending on coolant type. Old coolant is acidic; it eats water pumps and heater cores.',
      tools: ['socket-set', 'wrench-set', 'oil-drain-pan', 'jack', 'jack-stands', 'funnel', 'shop-rags', 'gloves', 'safety-glasses'],
      consumables: 'Correct coolant for your vehicle (color is NOT a reliable spec — read the owner\'s manual; HOAT, OAT, IAT are different chemistries). Pre-mixed 50/50 is foolproof.',
      safety: ['engine-cool-required', 'antifreeze-toxic-pets', 'cap-pressure-on-hot', 'jack-stands-required'],
      steps: [
        { n: 1, do: 'Engine MUST be COLD. Coolant under pressure at 200°F+ scalds. If you\'ve driven recently, wait 2 hours.' },
        { n: 2, do: 'Lift the front of the vehicle on jack stands. Set drain pan under the radiator drain ("petcock") — usually a plastic plug at the lower-corner of the radiator.' },
        { n: 3, do: 'Remove the radiator cap on top to break the vacuum. NOW open the petcock SLOWLY. Drain takes 5–15 minutes.' },
        { n: 4, do: 'Check engine block drain plugs (if accessible) — some V6/V8s have block drains for a more complete flush.' },
        { n: 5, do: 'Close petcock. Refill the radiator with distilled water. Open petcock to drain water. This rinses old coolant residue. Repeat until water runs clear.' },
        { n: 6, do: 'Close petcock. Refill with the correct coolant. Many systems specify pre-mixed 50/50; some take concentrate diluted with distilled water.' },
        { n: 7, do: 'Bleed the cooling system. Procedure varies by vehicle: some have a bleeder valve; some require running with the heater on max + topping up as air burps out. RTFM — incorrect bleed = air pocket = overheating.' },
        { n: 8, do: 'Run engine to operating temp with the heater on. Watch the temp gauge. After cool-down, top up the reservoir.' },
        { n: 9, do: 'Recycle old coolant at a hazardous-waste day or auto shop with a coolant-recycling tank. NEVER pour it on the ground — ethylene glycol is toxic and sweet (kills pets).' }
      ],
      gotchas: [
        'Wrong coolant chemistry: HOAT mixed with IAT gels into a sludge that blocks the radiator. Match the OEM spec.',
        'Air pocket from incomplete bleed = the heater blows cold + the engine overheats but the temp gauge reads normal (sensor is exposed to the air pocket, not coolant). Verify heat at vents AND that you can fully top up after cool.',
        'Maine: salt-rusted bolts on a steel petcock can break off in the radiator. Soak with PB Blaster the night before.',
        'Pet warning: if you spill, clean up THOROUGHLY. Animals will lick antifreeze and die. A sweet-smelling puddle on a Maine driveway is lethal.',
        'A "small flush" with just the radiator only changes about 1/3 of system coolant; the rest stays in the engine block. Manufacturer intervals assume a full flush procedure.'
      ],
      verdict: 'DIY for a basic radiator-only flush. Shop for a full machine-flush ($100–200) if you want every drop replaced.'
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
      buy: 'Many Maine public libraries offer free patron access to AllData. Used Haynes/Chilton ~$25.', cost: 'often free via library' },
    { id: 'spark-plug-socket', name: 'Spark-plug socket', icon: '🔌',
      what: 'Deep socket with a rubber liner that grips the porcelain insulator without cracking it.',
      when: 'Spark-plug replacement.',
      buy: '$8–15 for the common 5/8" or 13/16" sizes.', cost: '$8–15' },
    { id: 'gap-gauge', name: 'Spark-plug gap gauge', icon: '📏',
      what: 'A small disc / wire tool that measures the gap between plug electrode and ground strap.',
      when: 'Verifying gap on new spark plugs before installation.',
      buy: '$3–10. Coin-style works; wire-style is more accurate.', cost: '$3–10' }
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
    },
    {
      id: 'g-battery', label: 'Replacing a dead battery on your 2014 Toyota Camry. Kit?',
      correct: ['socket-set', 'wrench-set', 'wire-brush', 'multimeter', 'gloves', 'safety-glasses'],
      distractors: ['oil-filter-wrench', 'cam-locking-tools', 'crank-pulley-tool'],
      why: 'Battery work is wrenches (10mm terminals usually), wire brush for corroded posts, multimeter to verify voltage + alternator, gloves + glasses for acid risk. NOT brakes/timing-belt gear.'
    },
    {
      id: 'g-spark-plugs', label: 'Spark plug replacement on an inline-4. Kit?',
      correct: ['socket-set', 'spark-plug-socket', 'torque-wrench', 'gap-gauge', 'gloves'],
      distractors: ['c-clamp-or-piston-tool', 'jack', 'oil-drain-pan'],
      why: 'Spark-plug socket (rubber-lined) + torque wrench for clean install. Gap gauge to verify pre-gapped plugs. No need for jack/drain-pan.'
    },
    {
      id: 'g-coolant-flush', label: 'Coolant flush + refill. Kit?',
      correct: ['socket-set', 'wrench-set', 'oil-drain-pan', 'jack', 'jack-stands', 'funnel', 'shop-rags', 'gloves', 'safety-glasses'],
      distractors: ['oil-filter-wrench', 'spark-plug-socket', 'cam-locking-tools'],
      why: 'Drain pan + jack + stands to access petcock; funnel for clean refill; safety glasses for hot-coolant splash risk. Filter / plug / cam tools not used.'
    },
    {
      id: 'g-headlight', label: 'Headlight bulb burned out. Kit?',
      correct: ['screwdriver-or-clip-release', 'gloves'],
      distractors: ['torque-wrench', 'jack', 'oil-filter-wrench'],
      why: 'Headlight bulb on most cars is a 5-minute job. Screwdriver / clip release for the connector cover; gloves so you don\'t touch the new bulb glass.'
    },
    {
      id: 'g-wheel-bearing', label: 'You diagnose a failing wheel bearing (hum that changes pitch in turns). To replace it, kit?',
      correct: ['socket-set', 'jack', 'jack-stands', 'wire-brush', 'torque-wrench', 'gloves'],
      distractors: ['oil-filter-wrench', 'crank-pulley-tool', 'cam-locking-tools'],
      why: 'Hub-style bearings are bolt-in. Sockets + jack + stands + torque wrench. Wire brush for the rusted hub face — Maine reality.'
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
  // SECTION 9.4: DIAGNOSTIC DECISION TREES — symptom → likely cause
  // The "what's wrong with my car?" flow. Six common symptoms; each runs
  // through 1–3 questions to narrow to a likely cause + verify-it step +
  // DIY/shop verdict. Builds active diagnostic reasoning vs card-lookup.
  // ─────────────────────────────────────────────────────────
  var DECISION_TREES = {
    'no-start': {
      id: 'no-start', name: 'Won\'t start', icon: '🔑',
      intro: 'Pick the symptom that matches what your car is doing right now.',
      nodes: {
        'root': { question: 'Turn the key. What happens?',
          choices: [
            { label: '🔇 Nothing — completely dead, no dash lights', next: 'v-dead' },
            { label: '🔔 Rapid clicking, no crank, dash lights stay bright', next: 'v-starter' },
            { label: '💡 Dash lights dim or fade out when key turns', next: 'v-batt-weak' },
            { label: '🔁 It cranks but won\'t fire (catch + die or just spin)', next: 'cranks' }
          ] },
        'cranks': { question: 'When does the no-start happen?',
          choices: [
            { label: '🥶 Hard to start when COLD; fine once warm', next: 'v-cold' },
            { label: '🔥 Hard to start when HOT; fine when cool', next: 'v-hot' },
            { label: '⛽ Always — no temperature pattern', next: 'v-fuel-spark' },
            { label: '💨 Fires briefly then dies', next: 'v-immobilizer' }
          ] },
        'v-dead': { verdict: true,
          likely: 'Battery is fully discharged, OR a main fuse / cable is open.',
          why: 'No dash lights = no 12V to the cabin. Either the battery has zero output or the path to it is broken.',
          verify: 'Multimeter at battery posts. <11V or 0V = dead battery. If battery reads 12+V but the cabin is dead, the negative ground cable or main fusible link is the issue.',
          diy: 'Charge or replace battery. Wire-brush both terminals. Inspect ground cable from negative to engine block + body — corrosion underneath the bolt is the silent killer.',
          shop: 'If battery + cables read healthy but cabin is still dead: shop diagnosis (could be a body-control module, ignition switch, or main fuse).'
        },
        'v-starter': { verdict: true,
          likely: 'Starter solenoid is failing OR battery has insufficient amps for cranking (even though voltage looks OK).',
          why: 'Rapid clicking = solenoid trying to engage repeatedly. If lights stay bright, voltage is there, but amps to the starter are not making the connection.',
          verify: 'Try a jump start. If it fires after a jump, battery was the bottleneck. If it still won\'t crank with a jump, starter is bad.',
          diy: 'Battery test (load test free at parts stores). Clean battery + starter cable terminals. Replace starter if accessible (often a 1–2 hour job).',
          shop: 'Starter access on transverse engines can require subframe / intake removal — that becomes a shop job.'
        },
        'v-batt-weak': { verdict: true,
          likely: 'Battery is weak — voltage sags under cranking load.',
          why: 'Lights dimming = cranking is pulling voltage below the ignition threshold. Common in Maine winter when cold thickens oil and the battery is already weakened.',
          verify: 'Multimeter at rest: should be 12.4–12.8V. Below 12.0V = needs charging or replacement. Load-test free at NAPA / O\'Reilly / AutoZone.',
          diy: 'Replace battery. While you\'re there, check alternator output (13.8–14.7V running) so the new battery isn\'t sabotaged.',
          shop: 'If new battery dies again in <2 weeks: parasitic draw test. Something is pulling battery overnight (stuck relay, phantom load).'
        },
        'v-cold': { verdict: true,
          likely: 'Cold-start enrichment failure — usually fuel-pressure regulator, coolant temp sensor, or aged cold-start injector.',
          why: 'Cold engine needs a richer fuel mixture. If the ECU\'s "I\'m cold" signal is wrong, the mixture stays lean and won\'t fire.',
          verify: 'Scan tool live data: Coolant Temp Sensor reading at first key-on. Should match outside air temp on a fully-cold engine. If CTS reads "warm," that\'s the problem.',
          diy: 'CTS replacement is often $20–40 + 30 min. Fuel-pressure regulator is moderate.',
          shop: 'If injector pulse-width or fuel-pressure tests are needed, take it in.'
        },
        'v-hot': { verdict: true,
          likely: 'Heat-soaked starter, vapor lock, or heat-sensitive crankshaft position sensor.',
          why: 'Hot starter = solenoid contacts expand and lose grip. Vapor lock = fuel boils in the rail and the pump can\'t pressurize. CKP sensor heat failure is common on certain engines.',
          verify: 'Pop the hood when it won\'t hot-start. Listen for fuel pump priming when key goes ON. No prime = pump or relay heat-failed.',
          diy: 'Insulating wrap on the starter. CKP sensor replacement varies by engine.',
          shop: 'Persistent hot-no-start with fuel and spark verified = shop. Often a heat-sensitive electronic module.'
        },
        'v-fuel-spark': { verdict: true,
          likely: 'Either no spark or no fuel. Both possible — need to split the test.',
          why: 'Engine cranking needs three things: fuel, spark, compression. Compression rarely vanishes overnight. So it\'s fuel or spark.',
          verify: 'Key ON (don\'t crank). Listen for fuel pump prime (~2 second whir near the back of car). No prime = pump / relay / fuse. If prime is OK, pull a spark plug and check for spark on cranking (use a spark tester).',
          diy: 'Fuel pump fuse is free to check. Fuel pump relay swap is cheap. Plugs + coils are doable. Crank-position sensor is often the culprit.',
          shop: 'In-tank fuel pump replacement on most cars = $300–800 shop work (or experienced DIY). Crank sensor in some engines requires significant disassembly.'
        },
        'v-immobilizer': { verdict: true,
          likely: 'Anti-theft (immobilizer) is killing fuel or spark immediately after start. Or the security light is flashing on the dash.',
          why: 'Many cars cut fuel injection if the key chip isn\'t recognized. Engine fires for 1–2 seconds then dies.',
          verify: 'Watch the security / key-shape icon on the dash during the start attempt. If it flashes, immobilizer is rejecting the key.',
          diy: 'Try the spare key. If spare works, original key chip is failing. Some manufacturers have a "key relearn" procedure (key on, wait 10 min, off, repeat).',
          shop: 'If neither key works, dealer key reprogramming. Worth looking up your specific year / make first — some are DIY-relearn, some need a scan tool.'
        }
      }
    },
    'misfire': {
      id: 'misfire', name: 'Misfire / rough idle', icon: '〰️',
      intro: 'Engine is running rough, hesitating, or shaking. Walk through what you\'re feeling.',
      nodes: {
        'root': { question: 'When you notice the misfire, the check-engine light is...',
          choices: [
            { label: '⚠️ Flashing (blinking on and off)', next: 'v-flashing-cel' },
            { label: '🟡 Solid amber (steady on)', next: 'cel-solid' },
            { label: '⚫ Off — no CEL', next: 'no-cel' }
          ] },
        'cel-solid': { question: 'Is the misfire on one cylinder or multiple?',
          choices: [
            { label: '🎯 One specific cylinder (P0301–P0312)', next: 'v-one-cyl' },
            { label: '🌪️ Random / multiple (P0300)', next: 'v-multi-cyl' },
            { label: '❓ I haven\'t pulled codes yet', next: 'v-pull-codes' }
          ] },
        'no-cel': { question: 'When does the rough idle happen?',
          choices: [
            { label: '🥶 Cold start only — clears once warm', next: 'v-cold-only' },
            { label: '🛣️ Only under load (uphill, hard accel)', next: 'v-load-only' },
            { label: '🅿️ Always at idle, never on the highway', next: 'v-idle-only' }
          ] },
        'v-flashing-cel': { verdict: true,
          likely: 'SEVERE misfire — fuel is dumping into the exhaust unburnt.',
          why: 'Flashing CEL = misfire bad enough that raw fuel is hitting the catalytic converter. Continued driving destroys the cat ($800–2500 to replace).',
          verify: 'STOP DRIVING. Get it scanned (free at parts stores). Note the codes BEFORE clearing.',
          diy: 'If you\'re close to home, drive gently. Otherwise tow it. Then diagnose plugs + coils + fuel injectors per the codes pulled.',
          shop: 'If the cat is already glowing red or rattling, you\'re looking at cat replacement on top of misfire repair. Don\'t add to the bill.'
        },
        'v-one-cyl': { verdict: true,
          likely: 'That cylinder\'s coil, plug, or injector. The "swap test" is the fastest diagnostic.',
          why: 'Misfire on one cylinder narrows the cause to that cylinder\'s ignition or fuel components.',
          verify: 'Swap the suspect coil with a known-good neighbor cylinder. Clear codes. Drive 5 minutes. If misfire MOVED (now on the swapped-to cylinder), coil is bad. If it stayed on the original cylinder, it\'s a plug, injector, or compression issue.',
          diy: 'Coil $30–80 + 15 min. Plug $5–15 + 30 min. Injector swap test is the next step if both check out.',
          shop: 'Compression test diagnosis = shop ($100–200) or experienced DIY with a compression tester.'
        },
        'v-multi-cyl': { verdict: true,
          likely: 'Something common to multiple cylinders: fuel pressure, vacuum leak, bad gas, ignition system as a whole.',
          why: 'Multi-cylinder misfire rules out a single coil/plug. Something the cylinders share is the issue.',
          verify: 'Try a tank of fresh fuel + a fuel-system cleaner. If unchanged, smoke-test for vacuum leaks. Check fuel pressure with a gauge.',
          diy: 'Fresh fuel is free. Vacuum-leak inspection (visual + brake-cleaner test on hoses) is free.',
          shop: 'Fuel-pressure test, smoke test, MAF cleaning + relearn — usually shop work unless you have the gauges.'
        },
        'v-pull-codes': { verdict: false, terminal: true,
          likely: 'You need codes first. Free at parts stores.',
          why: 'A scan tells you cylinder-specific (P0301-P0312) vs random (P0300). Different repair paths.',
          verify: 'Take it to NAPA / O\'Reilly / AutoZone — they read codes free. Write down ALL codes (often there are 2-3 related codes).',
          diy: 'Free.',
          shop: 'After codes, return to this tree and pick the matching branch.'
        },
        'v-cold-only': { verdict: true,
          likely: 'Cold-start enrichment, coolant temp sensor, or one weak fuel injector showing only when ECU runs the cold-fuel map.',
          why: 'Cold-only misfire happens because the ECU runs richer when cold. A weak injector that masks at warm operating temp will show when overworked at cold.',
          verify: 'Scan tool while cold-cranking. Look for misfire counter on individual cylinders. The cylinder counting up is your suspect.',
          diy: 'Plug swap on suspect cylinder. Injector cleaner in the tank. Both inexpensive.',
          shop: 'Injector flow test ($150–250) if cleaner doesn\'t solve it.'
        },
        'v-load-only': { verdict: true,
          likely: 'Ignition system can\'t maintain spark under high cylinder pressure. Worn plugs / failing coils / bad coil boot.',
          why: 'Cylinder pressure under load is much higher than at idle. A weak spark fires fine at idle but breaks down under compression.',
          verify: 'Pull plugs and inspect — gap, color, electrode wear. Check coil boot for tears or carbon tracks.',
          diy: 'Plug + coil-boot replacement.',
          shop: 'Coil-on-plug systems with multiple weak coils are usually a "while you\'re in there" full-set replacement.'
        },
        'v-idle-only': { verdict: true,
          likely: 'Vacuum leak. Idle is when the engine is most sensitive to extra unmetered air.',
          why: 'At highway speed, throttle is open and a tiny vacuum leak doesn\'t change the fuel ratio. At idle, throttle is nearly closed — a small leak is a big percentage of the air entering.',
          verify: 'Spray brake cleaner (engine warm, idling) at intake hoses, gaskets, vacuum lines. RPM rises briefly when cleaner gets sucked into a leak.',
          diy: 'Cracked intake boot $20–50 + 30 min. Bad PCV valve $10. Loose hose clamp = free fix.',
          shop: 'Intake manifold gasket leaks (V6 / V8) require manifold removal.'
        }
      }
    },
    'brakes': {
      id: 'brakes', name: 'Brake feel or sound', icon: '🛑',
      intro: 'Something off with the brakes. Pick what you\'re feeling or hearing.',
      nodes: {
        'root': { question: 'What\'s the symptom?',
          choices: [
            { label: '🎵 Squeal or chirp at light pressure', next: 'v-squeal' },
            { label: '🦷 Metal grinding at any pressure', next: 'v-grind' },
            { label: '💓 Pedal pulses up and down when braking', next: 'v-pulse' },
            { label: '🦴 Pedal goes soft / sinks toward floor', next: 'v-soft' },
            { label: '↔️ Car pulls hard to one side when braking', next: 'v-pull' },
            { label: '🚨 ABS light on; pedal feels different', next: 'v-abs' }
          ] },
        'v-squeal': { verdict: true,
          likely: 'Wear-indicator tab is touching the rotor — pads have ~10% life left.',
          why: 'Brake pads have a small spring tab designed to scrape the rotor when pads wear thin. The high-pitched squeal is by design — it\'s your warning.',
          verify: 'Pull a wheel. Look at the pad thickness. Below 3/32" (2.4mm) is the replacement threshold.',
          diy: 'Brake pads + rotors = moderate DIY ($80–150 parts per axle). Earlier in the wear cycle = easier job (no rust-locked caliper bolts yet).',
          shop: 'First-time brake jobs benefit from shop or mentor supervision. Maine: rusted bleeders are a real risk.'
        },
        'v-grind': { verdict: true,
          likely: 'Pads worn through; the steel pad backing is grinding the rotor.',
          why: 'Once the friction material is gone, you\'re cutting grooves in the rotor with the steel backing plate.',
          verify: 'Don\'t test-drive it more than necessary. The grinding is destroying rotors fast.',
          diy: 'Replace pads AND rotors (the rotors are now scored). Allow extra time for rusted-on rotor removal.',
          shop: 'If you delayed past this point and have heat-warped rotors or seized calipers, shop work likely needed.'
        },
        'v-pulse': { verdict: true,
          likely: 'Warped rotors (or rust deposits creating uneven thickness). One axle is most common — usually front.',
          why: 'When pad meets rotor at uneven thickness, brake force pulses through pedal. Warp is from heat (long downhills) or rust pitting (Maine after-winter classic).',
          verify: 'Lift a wheel. Spin the rotor. Visual + a dial indicator catches warp. Or measure rotor thickness at multiple points.',
          diy: 'Replace rotors + pads. Resurfacing (machining) is cheap if rotors are above minimum thickness.',
          shop: 'If your rotors are below minimum thickness already, replacement is the only option.'
        },
        'v-soft': { verdict: true,
          likely: 'Air in the brake lines, fluid leak, or master cylinder failing.',
          why: 'Pedal sinking means hydraulic pressure isn\'t holding. Could be air (compressible — pedal is mushy), or fluid leaving (disappearing into a leak).',
          verify: 'Check brake fluid reservoir level. Low + dropping = leak; find it (look at calipers, lines, master cylinder). Full + soft = air in lines (after a recent brake job?) or master cylinder bypass.',
          diy: 'Brake bleed (manual or vacuum) is doable. Master cylinder $80–150 + 1–2 hours.',
          shop: 'STOP DRIVING. A failing brake system is a not-driveable safety issue. Tow if needed.'
        },
        'v-pull': { verdict: true,
          likely: 'Sticky caliper on the OPPOSITE side from the pull.',
          why: 'If left caliper is dragging (always slightly applied), it doesn\'t apply HARDER when you brake — but the right caliper does, so the car pulls right when you brake.',
          verify: 'After driving, carefully feel each wheel hub for heat. The hot one had a dragging caliper.',
          diy: 'Caliper rebuild (new piston + seals + slide pins) ~$30–60 + 2 hours. Caliper replacement $50–150 + 1 hour. Brake fluid flush after.',
          shop: 'If the caliper seized hard enough to overheat the rotor, that rotor needs replacement too.'
        },
        'v-abs': { verdict: true,
          likely: 'ABS wheel-speed sensor (most common). Maine: salt corrosion on sensor or tone ring.',
          why: 'ABS module is constantly checking sensor signal from each wheel. One wheel reading wrong = system disables ABS until fixed.',
          verify: 'Scan tool with ABS support reads the C-codes (C0035, C0040, C0045, C0050) telling you which wheel.',
          diy: 'Sensor replacement $30–80 + 30 min. The bolt is often rusted in Maine — penetrant + heat + patience.',
          shop: 'Tone ring rusted = often a wheel-hub assembly replacement ($200–500).'
        }
      }
    },
    'overheating': {
      id: 'overheating', name: 'Overheating', icon: '🌡️',
      intro: 'Temp gauge is climbing or the engine is steaming. Pick the situation.',
      nodes: {
        'root': { question: 'How is the engine overheating?',
          choices: [
            { label: '📈 Slow creep above normal over 10+ min', next: 'creep' },
            { label: '🚀 Sudden spike to red after a freeway run', next: 'v-fan' },
            { label: '☁️ Steam under hood / out of the radiator', next: 'v-blown' },
            { label: '❄️ Heater blows COLD when engine is hot', next: 'v-airlock' }
          ] },
        'creep': { question: 'When you check the coolant reservoir...',
          choices: [
            { label: '💧 Level is LOW or empty', next: 'v-leak' },
            { label: '🟢 Level is fine; the gauge is what\'s wrong', next: 'v-thermostat' }
          ] },
        'v-leak': { verdict: true,
          likely: 'Coolant leak — visible (radiator, hose, water pump) or invisible (head gasket, heater core inside cabin).',
          why: 'Low coolant = there\'s a leak somewhere, OR the system is consuming coolant internally.',
          verify: 'Walk around with the engine cold. Look for green / orange / pink crusty residue. Inside the cabin: pull carpet under passenger floor — wet + sweet smell = heater core. White exhaust smoke = head gasket.',
          diy: 'Hose replacement $15–40. Radiator cap $10. Heater core: invasive ($300–800 in shop, often $50 part + 6 hours DIY through the dashboard).',
          shop: 'Head gasket = $1500–3500. Water pump access varies; often shop work.'
        },
        'v-thermostat': { verdict: true,
          likely: 'Thermostat stuck closed — coolant isn\'t circulating to the radiator.',
          why: 'A closed thermostat traps coolant in the engine. Heat builds with nowhere to go.',
          verify: 'Engine cold: open hood. Start engine. Watch the upper radiator hose. Within 5 min it should warm up + you should feel coolant flowing. Cold hose at 10+ min = stuck-closed thermostat.',
          diy: 'Thermostat $15–30 + 1–2 hours (coolant work). Bleed system after.',
          shop: 'If access requires intake removal (some V6/V8s), shop is reasonable.'
        },
        'v-fan': { verdict: true,
          likely: 'Cooling fan failure. At highway speeds, ram-air cools the radiator. At low speeds (after exiting freeway, in traffic), the fan must engage — if it doesn\'t, temp spikes.',
          why: 'Engine generates the same heat at idle as at speed; only airflow changes. No fan = no airflow at low speed.',
          verify: 'Engine warm + idling. Watch the fan. Fan should kick on around 200°F (when AC is on, fan should kick on immediately). No fan = relay, fuse, or motor.',
          diy: 'Fan relay swap $20 + 5 min. Fan motor $60–200 + 1–2 hours.',
          shop: 'If the fan controller / module has failed (some modern cars), scan-tool diagnosis required.'
        },
        'v-blown': { verdict: true,
          likely: 'Coolant has overpressurized — radiator cap or hose has burst, OR head gasket has failed and pressurized exhaust into the cooling system.',
          why: 'Steam = coolant boiling. Either pressure dropped (cap / hose) and boiling point dropped, OR something is dumping heat into the cooling system faster than it can shed it.',
          verify: 'STOP. Let it cool 30+ min. NEVER open a hot radiator cap. Cold check: smell coolant for exhaust smell, look for oil floating, white residue on dipstick.',
          diy: 'Cap or hose replacement is straightforward.',
          shop: 'Head gasket / cracked head / cracked block — STOP DRIVING. Tow it.'
        },
        'v-airlock': { verdict: true,
          likely: 'Air pocket in the cooling system (often after a recent coolant change without proper bleed).',
          why: 'Air trapped at the top of the heater core means the coolant can\'t move heat to the heater core. Engine can simultaneously overheat AND blow cold air at vents.',
          verify: 'Engine cold. Open the highest bleed point (varies; some have a bleed screw, some don\'t). Run engine with reservoir cap off until air bubbles stop and steady stream returns.',
          diy: 'Bleed procedure varies — some cars need running with heat on max + repeated top-ups. RTFM.',
          shop: 'Persistent airlock after a proper bleed = head gasket failure pushing combustion gas into coolant.'
        }
      }
    },
    'charging': {
      id: 'charging', name: 'Battery / charging', icon: '🔋',
      intro: 'Dim lights, dashboard battery icon, repeated dead-battery mornings — narrow it down.',
      nodes: {
        'root': { question: 'When does the symptom show?',
          choices: [
            { label: '🌃 Battery dead every morning', next: 'v-parasitic' },
            { label: '💡 Headlights dim at idle, brighter at RPM', next: 'v-low-charge' },
            { label: '💡 Lights dim everywhere, even running', next: 'v-batt-or-ground' },
            { label: '🔋 Dashboard battery icon stays lit', next: 'v-icon' }
          ] },
        'v-parasitic': { verdict: true,
          likely: 'Parasitic draw — something is staying powered overnight.',
          why: 'Even at rest, modern cars draw a tiny "keep-alive" current (~30–50mA). A stuck relay, glove box light, or aftermarket accessory can pull 1–3A and kill a battery overnight.',
          verify: 'Multimeter in series with negative battery cable (set to 10A range). Should read <100mA after 20 min of "the car settling." Pull fuses one at a time; the one that drops the reading is the offender.',
          diy: 'Fuse-pull testing. Aftermarket dashcam / amplifier / interior light. Glove box switch jammed.',
          shop: 'If parasitic draw is on a non-fused circuit (alternator diode, ignition switch), shop work.'
        },
        'v-low-charge': { verdict: true,
          likely: 'Alternator output is low or belt is slipping at idle RPM.',
          why: 'Brighter lights at higher RPM = the alternator is making more voltage at higher RPM. At idle, output isn\'t keeping up with demand, so battery sags.',
          verify: 'Multimeter on battery, engine running. Should be 13.8–14.7V at idle. Below 13.5V = weak alternator. Wiggle the serpentine belt — should be tight + crack-free.',
          diy: 'Belt replacement $20–40. Alternator replacement varies by access.',
          shop: 'Buried alternator (transverse engine, behind components) can become a multi-hour job.'
        },
        'v-batt-or-ground': { verdict: true,
          likely: 'Battery is failing OR a ground cable / strap is corroded.',
          why: 'A bad ground creates voltage drop. Symptoms feel like a weak battery even when battery tests OK.',
          verify: 'Voltage drop test: multimeter from battery NEG to engine block (with engine cranking). Should read <0.5V drop. Higher = corroded ground.',
          diy: 'Wire-brush all ground points. Replace ground strap $10. Battery test free at parts stores.',
          shop: 'If voltage drops are mysterious, shop electrical diagnosis.'
        },
        'v-icon': { verdict: true,
          likely: 'Charging system fault — alternator not output, broken belt, or sensor reporting fault.',
          why: 'The dashboard battery icon means "the alternator is not charging the battery." It\'s a charging-system warning, not a battery warning.',
          verify: 'Pop hood and visually verify the serpentine belt is intact. Multimeter on battery: <12.5V running = alternator definitely not charging. Check warning lamp circuit if alternator is verified working (sometimes the lamp itself is the fault).',
          diy: 'Belt replacement. Alternator replacement.',
          shop: 'Smart-charging systems (newer GM, Ford) need scan-tool diagnosis to verify the regulator is commanding correctly.'
        }
      }
    },
    'steering': {
      id: 'steering', name: 'Steering / handling noise', icon: '🚗',
      intro: 'Something\'s off in how the car steers, tracks, or sounds at the wheels.',
      nodes: {
        'root': { question: 'What\'s the symptom?',
          choices: [
            { label: '🎵 Hum that gets louder on one curve, quieter on the other', next: 'v-bearing' },
            { label: '😱 Whine when turning the steering wheel', next: 'v-ps' },
            { label: '🦴 Click click click in tight slow turns', next: 'v-cv' },
            { label: '↗️ Pulls to one side on a flat road', next: 'pull' },
            { label: '🪨 Clunk over bumps from one corner', next: 'v-suspension' }
          ] },
        'pull': { question: 'After driving 10 minutes, you check tire pressure. Is it equal across all four?',
          choices: [
            { label: '🟢 Yes — all four equal and at spec', next: 'v-alignment' },
            { label: '🔴 One tire is 5+ psi lower', next: 'v-tire' }
          ] },
        'v-bearing': { verdict: true,
          likely: 'Wheel bearing failing on the side that gets QUIETER in a turn.',
          why: 'In a turn, the OUTSIDE wheel takes more load. If the right bearing is bad, going LEFT loads the right wheel and amplifies the hum; going RIGHT unloads it and the hum quiets.',
          verify: 'Lift each wheel. Spin by hand — listen + feel for grinding. Grab top + bottom and rock — any play = bearing.',
          diy: 'Hub-style bearings are bolt-in ($100–200 + 1–2 hours). Pressed-in bearings need a press.',
          shop: 'Pressed-in bearings + rusted-on hubs = shop work in salt-state Maine.'
        },
        'v-ps': { verdict: true,
          likely: 'Power-steering pump or low fluid (hydraulic systems only — electric steering whines differently).',
          why: 'PS pump pressurizes fluid to assist your turning. Low fluid or worn pump = pump cavitates + whines.',
          verify: 'Check PS reservoir level. Top up with the CORRECT spec fluid (not generic ATF — wrong fluid wrecks systems).',
          diy: 'Top-up is free + 5 min. Pump replacement is moderate.',
          shop: 'PS rack leak or pump replacement on tight engine bays = shop.'
        },
        'v-cv': { verdict: true,
          likely: 'CV (constant-velocity) joint failing on a front-wheel-drive car. Outer joint clicks under load in turns.',
          why: 'CV joint balls run in races packed with grease. When the boot tears, grease leaves + dirt enters. Eventually the balls and races wear and click.',
          verify: 'Drive in a tight circle in an empty parking lot — both directions. Click in left turns = right CV; click in right turns = left CV.',
          diy: 'Half-shaft (axle) replacement $80–200 + 2–4 hours. Mostly straightforward but rust-difficulty in Maine.',
          shop: 'Stuck axle nut (often) requires impact and heat — pushes some DIYers to a shop.'
        },
        'v-alignment': { verdict: true,
          likely: 'Alignment is off (toe / camber / caster). Cars that hit potholes or had recent suspension work commonly need alignment.',
          why: 'Misaligned wheels make the car track to one side and wear tires unevenly (inside or outside edge).',
          verify: 'Inspect tire wear pattern. Inside-edge wear = toe out. Outside-edge wear = toe in or worn camber. Feathered = alignment definitely off.',
          diy: 'Not DIY — needs alignment rack and laser measurement.',
          shop: '4-wheel alignment $80–150. Required after any suspension work and recommended once per year.'
        },
        'v-tire': { verdict: true,
          likely: 'Slow leak on the under-pressure tire (pulling toward it).',
          why: 'Lower-pressure tire has more rolling resistance, pulling the car toward that side.',
          verify: 'Inflate to spec. Drive a week. Re-check pressure. Dropping again = leak — patch / plug / replace.',
          diy: 'Tire plug kit $10. Soapy water finds the leak.',
          shop: 'Sidewall punctures or holes in the tread shoulder = replacement.'
        },
        'v-suspension': { verdict: true,
          likely: 'Worn sway-bar link, ball joint, or strut mount — corner-specific clunks usually trace to one of these.',
          why: 'Bumps load suspension joints in compression and rebound. Worn bushings or bearings clunk audibly.',
          verify: 'Lift the corner. Grab the wheel at 9 and 3 — rock for tie-rod play. Grab at 12 and 6 — rock for ball-joint play. Crawl under and pry on each link.',
          diy: 'Sway-bar link $15–40 each + 30 min. Strut mount $40–80 + spring compressor required.',
          shop: 'Ball joint replacement varies — some are bolt-in, some are pressed-in. Pressed = shop.'
        }
      }
    }
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 9.45: ESTIMATE DECODER — read a shop quote, identify upsells
  // Each common line item: what it actually means, fair price band, and
  // whether it\'s legitimate at OEM interval, leverageable as DIY, or a
  // common upsell to push back on. Maine independent shop rates as of 2026.
  // ─────────────────────────────────────────────────────────
  var ESTIMATE_ITEMS = [
    { id: 'shop-rate', icon: '⏱️', name: 'Shop labor rate (per hour)',
      what: 'How much labor costs per hour. Multiplied by the "book time" the shop estimates the job takes.',
      fairPrice: 'Maine 2026: independent $90–150/hr; dealer $130–200/hr; specialty (German, Euro, performance) up to $250/hr.',
      verdict: 'standard',
      flag: 'Compare quotes from 2–3 shops. Same job, same parts — labor differences are real.' },
    { id: 'diag-fee', icon: '🔍', name: 'Diagnostic fee',
      what: 'Hourly charge to figure out what\'s wrong. Often waived if you have the work done at the same shop.',
      fairPrice: '$80–150 typical. Dealer $130–200.',
      verdict: 'standard',
      flag: 'Always ask: "Will the diag fee be waived if I authorize the repair here?" Most shops will.' },
    { id: 'shop-supplies', icon: '🧴', name: 'Shop supplies fee / environmental fee',
      what: 'Catch-all for rags, brake cleaner, fluid disposal. Usually 5–10% of labor.',
      fairPrice: '5–10% of labor is normal. >15% is high.',
      verdict: 'standard',
      flag: 'A separate $25 "environmental fee" added to a $300 job is normal. A $150 fee on a small job is excessive.' },
    { id: 'cabin-filter', icon: '🌬️', name: 'Cabin air filter replacement',
      what: 'Replaces the filter for HVAC airflow into the cabin (usually behind glove box).',
      fairPrice: '$40–80 installed. DIY: $15 part + 5 minutes.',
      verdict: 'diy',
      flag: 'CLASSIC upsell. Filter is $15 at any parts store; installation is opening the glove box. If shop is "recommending" it during an oil change, do it yourself.' },
    { id: 'engine-air-filter', icon: '💨', name: 'Engine air filter replacement',
      what: 'Replaces the filter for engine intake.',
      fairPrice: '$50–80 installed. DIY: $15–25 part + 5 minutes.',
      verdict: 'diy',
      flag: 'Same upsell category as cabin filter. The labor is opening 2–4 clips on the airbox.' },
    { id: 'fuel-injection-flush', icon: '⛽', name: 'Fuel injection cleaning service',
      what: 'Adds cleaner to fuel system OR runs a pressurized solvent through injectors.',
      fairPrice: '$80–200.',
      verdict: 'often-upsell',
      flag: 'Only legitimate if you have measurable performance issues (rough idle, misfire codes). For a routine maintenance push, a $10 bottle of Techron in your gas tank does the same thing for most cars.' },
    { id: 'engine-flush', icon: '🛢️', name: 'Engine oil flush',
      what: 'Adds a strong solvent to the oil for ~10 minutes before draining; supposed to clean sludge.',
      fairPrice: '$40–80.',
      verdict: 'often-upsell',
      flag: 'Aggressive flush on an older engine (>120K miles) can DISLODGE built-up sludge and clog oil passages. Most OEM service manuals do NOT recommend engine flushes. Decline this on older cars.' },
    { id: 'transmission-flush', icon: '🔄', name: 'Transmission fluid flush',
      what: 'Replaces transmission fluid via a machine that cycles fluid in/out.',
      fairPrice: '$150–300.',
      verdict: 'depends',
      flag: 'Legitimate at OEM interval (60–100K miles). BUT: machine flush on an older trans that has never been serviced can dislodge debris and CAUSE transmission failure. If trans is over 100K with no service history, do a DRAIN-and-fill (no machine), not a flush.' },
    { id: 'brake-fluid-flush', icon: '🛑', name: 'Brake fluid flush',
      what: 'Bleeds and replaces hydraulic brake fluid throughout the system.',
      fairPrice: '$80–150.',
      verdict: 'standard',
      flag: 'LEGITIMATE every 2–3 years (Maine humidity especially). Brake fluid absorbs water; old fluid lowers boiling point + corrodes ABS components.' },
    { id: 'coolant-flush', icon: '💧', name: 'Coolant flush',
      what: 'Drains and refills cooling system, often with a machine flush.',
      fairPrice: '$100–200.',
      verdict: 'standard',
      flag: 'Legitimate at OEM interval (varies 30K–100K miles). Old coolant becomes acidic + eats water pumps.' },
    { id: 'tire-rotation', icon: '🛞', name: 'Tire rotation',
      what: 'Move tires front-to-back / cross-pattern to even out wear.',
      fairPrice: '$20–50. Free at most shops where you bought the tires.',
      verdict: 'diy',
      flag: 'DIY-friendly with jack + stands + torque wrench. If you bought tires at a shop, free rotation is part of most warranties — use it.' },
    { id: 'wheel-balance', icon: '⚖️', name: 'Wheel balance (per tire)',
      what: 'Spin balance the wheel + tire on a machine; add weights to correct.',
      fairPrice: '$15–30 per wheel. Free with new tire purchase.',
      verdict: 'standard',
      flag: 'Only needed if you have a shimmy at highway speeds. Skip if you don\'t feel a vibration.' },
    { id: 'alignment', icon: '📐', name: 'Wheel alignment',
      what: 'Adjust front (and rear, on independent-rear-suspension cars) wheel angles to spec.',
      fairPrice: '$80–150 4-wheel; $50–80 front-only.',
      verdict: 'standard',
      flag: 'Required after suspension work, hitting a curb, uneven tire wear. Recommended annually. NOT routinely upsold during oil change unless evidence (tire wear).' },
    { id: 'spark-plugs', icon: '⚡', name: 'Spark plug replacement',
      what: 'Replaces all plugs at OEM interval (60K–100K miles for iridium).',
      fairPrice: '$80–250 4-cylinder. $200–500 V6 with intake removal.',
      verdict: 'depends',
      flag: 'Legitimate at OEM interval. Quote varies enormously by access. Inline-4 cars can be $20 + 30 min DIY; transverse V6 with intake removal is real shop work.' },
    { id: 'evap-smoke-test', icon: '💨', name: 'EVAP smoke test',
      what: 'Pressurize fuel-vapor system with smoke to find leaks (P0455 / P0442 codes).',
      fairPrice: '$80–150.',
      verdict: 'standard',
      flag: 'Legitimate diagnostic for evaporative emissions codes. Tightening a loose gas cap is the free first step before paying for a smoke test.' },
    { id: 'computer-reset', icon: '💻', name: 'Computer reset / "ECU relearn"',
      what: 'Clears the computer\'s adaptive memory after a battery / sensor change.',
      fairPrice: '$50–100.',
      verdict: 'often-upsell',
      flag: 'Most cars relearn automatically after 50–100 miles of driving. Pay for this only on cars that explicitly require a scan-tool relearn (some VW / Audi / BMW).' },
    { id: 'wiper-blades', icon: '🌧️', name: 'Wiper blade replacement (each)',
      what: 'Swap wiper blades.',
      fairPrice: '$25–40 installed. DIY: $15–30 + 5 minutes.',
      verdict: 'diy',
      flag: 'Pure DIY. Parts stores will install them for free if you buy there.' },
    { id: 'serpentine-belt', icon: '🔗', name: 'Serpentine belt replacement',
      what: 'Replace belt that drives accessories (alternator, AC, water pump).',
      fairPrice: '$80–200.',
      verdict: 'standard',
      flag: 'Legitimate at OEM interval (60–100K miles) or if cracked/glazed. Belt + tensioner replacement together is "while you\'re in there" smart.' },
    { id: 'tire-pressure-system', icon: '📡', name: 'TPMS sensor replacement',
      what: 'Replace tire-pressure monitoring sensor in a wheel.',
      fairPrice: '$80–150 per sensor.',
      verdict: 'standard',
      flag: 'Sensors die at ~7–10 years (battery embedded in sensor). Replace as a set when several go at once.' },
    { id: 'headlight-restoration', icon: '✨', name: 'Headlight lens restoration',
      what: 'Sand + polish + UV-clearcoat oxidized headlight lenses.',
      fairPrice: '$80–150 both lenses.',
      verdict: 'diy',
      flag: 'Kits $15–25 from parts stores work as well as shop service. 30 min effort.' },
    { id: 'a-c-recharge', icon: '❄️', name: 'A/C recharge',
      what: 'Add refrigerant to A/C system.',
      fairPrice: '$80–250 (more if leak repair needed).',
      verdict: 'depends',
      flag: 'Topping off slightly low system: DIY-able with a $30–50 can + gauge. Empty system: there\'s a LEAK that needs repair before refilling — refusing to find it is throwing money away.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 9.5: MAINE STATE INSPECTION — annual sticker walkthrough
  // Maine requires annual safety inspection ($12.50 fee). Failed sticker =
  // 60 days to repair + recertify or stop driving. This module is the
  // pre-inspection self-walk: what they look at, what fails, what you can DIY.
  // ─────────────────────────────────────────────────────────
  var INSPECTION_ITEMS = [
    { id: 'brakes', icon: '🛑', area: 'Brakes',
      whatTheyCheck: 'Pad thickness (minimum ~3/32" / 2.4mm), rotor thickness vs minimum spec, brake-line corrosion, parking brake function, hydraulic leaks, ABS warning light.',
      commonFails: 'Pads worn below minimum. Rotor below minimum thickness. Rust-perforated brake line. Parking brake won\'t hold the vehicle on a slope. ABS light on.',
      diy: 'Pads + rotors are doable DIY ($80–150 per axle parts).',
      shop: 'Brake-line replacement ($150–500+). Rusted bleeders snap during a DIY brake job and force shop completion.',
      tip: 'Stick your finger through the wheel onto the rotor. A flat-topped rotor is fine; a deep ridge at the outer edge means rotors are at the wear limit.' },
    { id: 'lights', icon: '💡', area: 'Lights + signals',
      whatTheyCheck: 'Headlights low + high, taillights, brake lights, turn signals (front, rear, side markers if equipped), license plate light, hazard lights, dash warning lights cleared (no stuck CEL or ABS light during inspection).',
      commonFails: 'Burned-out bulb (most common). Lens cloudy enough to fail beam pattern. Aftermarket LED conversion that produces glare. Stuck CEL.',
      diy: 'Bulb replacement is 5–30 minutes. Lens-restoration kits ($15) clear up cloudy headlights.',
      shop: 'Wiring shorts. Multi-bulb failure pointing to a body-control module issue.',
      tip: 'Walk around the car the night before. Have someone press the brake pedal while you check rear lights. Cycle turn signals, hazards, reverse (someone in seat). 5 minutes saves a re-inspection trip.' },
    { id: 'tires', icon: '🛞', area: 'Tires',
      whatTheyCheck: 'Tread depth (minimum 2/32" — penny test, Lincoln\'s head visible = fail). Sidewall cracks. Bulges. Plug count (some stations limit to 1–2 plugs). Mismatched sizes across an axle. Donut spare on a drive axle.',
      commonFails: 'Inside-edge wear (alignment was overdue). Cracked sidewall from age. Bulges from a curb hit.',
      diy: 'Pre-test with a penny: insert head-first. If you see all of Lincoln\'s head, replace.',
      shop: 'New tires must be installed at a shop unless you have your own machine + balancer.',
      tip: 'Rotate every other oil change. Inspect inside edges — they wear first when alignment is off and you can\'t see them without crouching.' },
    { id: 'frame-body', icon: '🏗️', area: 'Frame + structure',
      whatTheyCheck: 'Frame perforation (rust holes you can put a screwdriver through). Cab mount rot. Subframe perforation. Body mounting integrity. Rocker panels structural to inspection in some districts.',
      commonFails: 'PERFORATED FRAME = unsafe-vehicle fail. This is THE Maine fail item. Cabs separating from frames on old trucks.',
      diy: 'Surface rust is fine. Anything you can poke a screwdriver through is structural. NO DIY weld-plate fix is inspection-acceptable.',
      shop: 'Frame welding by a certified shop is required for inspection. Some frame damage is unrepairable — vehicle is totaled.',
      tip: 'Crawl under in spring after salt season. Look for scaling that flakes off in big chunks vs. healthy surface rust. If in doubt, ask the inspection station to look BEFORE you commit (some will pre-check for free).' },
    { id: 'exhaust', icon: '💨', area: 'Exhaust',
      whatTheyCheck: 'Holes anywhere in exhaust upstream of the muffler (a hole upstream of the cat is an emissions fail in a CAA-area too). Loose hangers. Excessively loud. Modifications that delete cat / mufflers.',
      commonFails: 'Rusted-out flex pipe (Maine classic). Rotted muffler. Rusted-off hanger letting the system drag.',
      diy: 'Hanger replacement ($8 + 30 min). Clamp-and-sleeve patch on a small hole ($10) is a temporary fix.',
      shop: 'Welded exhaust repair, full system replacement ($200–800).',
      tip: 'Listen for the unmistakable "louder than it should be" rumble. If neighbors notice your car is suddenly loud, you have a hole.' },
    { id: 'wipers-glass', icon: '🌧️', area: 'Wipers + glass',
      whatTheyCheck: 'Wipers must clear effectively (no chatter / streaks / torn rubber). Washers spray. Windshield: cracks in driver\'s line of sight, star cracks, multiple chips. Other glass: structural integrity.',
      commonFails: 'Worn wipers. Empty washer fluid. Crack across the windshield in driver\'s view.',
      diy: 'Wipers $15–30, 5 min. Washer fluid $4. A windshield chip can be repaired for $50–80 BEFORE it cracks; once cracked, replacement.',
      shop: 'Windshield replacement ($300–800; insurance often covers with $0 deductible).',
      tip: 'Maine: get a -30°F rated washer fluid in November. Standard fluid freezes and shatters the reservoir.' },
    { id: 'horn-mirrors', icon: '📯', area: 'Horn, mirrors, seatbelts',
      whatTheyCheck: 'Horn audible. Both side mirrors plus interior present. All seatbelts function (auto-retract, latch, no fraying). Airbag light off (none deployed undeployed status).',
      commonFails: 'Horn dead (fuse or contact). Seatbelt won\'t retract. Side mirror missing post-collision.',
      diy: 'Fuse replacement is a 5-second job ($1 fuse). Seatbelt cleaning sometimes restores retraction.',
      shop: 'Airbag system fault. Seatbelt buckle replacement.',
      tip: 'Honk the horn before you go. Try every seatbelt — buckle and retract. Surprise fails are expensive.' },
    { id: 'suspension-steering', icon: '🚗', area: 'Suspension + steering',
      whatTheyCheck: 'Loose tie rod ends, ball joints, sway-bar links. Dead struts (bouncy ride). Power-steering fluid leaks. Steering wheel play (excessive freeplay).',
      commonFails: 'Worn ball joints (clunk over bumps). Tie rod end with play. Bent strut.',
      diy: 'Sway-bar links $15–40 + 30 min. Tie rod end $30–80 + 1 hour but requires re-alignment after.',
      shop: 'Ball joints, struts, control arms, steering rack. After ANY suspension work: 4-wheel alignment ($80–150).',
      tip: 'Bounce each corner of the car hard. Should rebound once and stop. Multiple bounces = dead strut on that corner.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 9.6: USED CAR PRE-PURCHASE INSPECTION — Maine salt-state edition
  // The 30-minute walkaround a Maine teen should learn before buying their
  // first car. Salt-state cars hide problems in places New Mexico cars don\'t.
  // ─────────────────────────────────────────────────────────
  var USED_CAR_CHECK = {
    intro: 'In Maine, the cheap-on-paper used car often has $3,000–$8,000 of hidden rust and deferred maintenance. A 30-minute pre-purchase inspection catches 80% of it. Bring this checklist to the seller.',
    redFlags: [
      { id: 'frame-rust', area: 'Underbody', flag: 'Perforated frame rails',
        what: 'Crawl under (or have the seller jack it up). Look for HOLES you can put a screwdriver through, not just surface rust.',
        ifFound: 'WALK AWAY unless seller drops the price by what a frame replacement / total-loss buyout would cost. This is the #1 Maine deal-killer.' },
      { id: 'rocker', area: 'Body', flag: 'Bondo or fiberglass over rocker panels',
        what: 'Magnet test the rockers (lower edge of doors). Magnet should stick to steel. If it slides off or sticks weakly = filler over rust.',
        ifFound: 'Body work is cosmetic, but a rotted rocker can be structural. Get an estimate before buying. If the seller hid it, walk.' },
      { id: 'oil-leaks', area: 'Engine', flag: 'Wet shine on oil pan, valve cover, transmission',
        what: 'Look at the engine and trans from above. Streaks of dark oil = leak. White-coolant residue around hose clamps = small coolant leak.',
        ifFound: 'Small leaks are negotiable. Heavy leaks ($200–800 to fix) should be priced in.' },
      { id: 'milky-oil', area: 'Engine', flag: 'Milky oil on dipstick',
        what: 'Pull the dipstick. Healthy = amber to brown. Milky / chocolate-milk = head gasket failure. Check oil cap underside for the same residue.',
        ifFound: 'WALK AWAY. Head gasket on most cars is $1,500–$3,500. Often turns into a much bigger job.' },
      { id: 'trans-fluid', area: 'Trans', flag: 'Burnt or dark transmission fluid',
        what: 'If the car has a trans dipstick, pull it. Healthy = bright cherry red. Dark + burnt-smell = trans is going.',
        ifFound: 'Trans rebuild = $2,500–5,000. Negotiate steeply or walk.' },
      { id: 'no-cold-start', area: 'Test', flag: 'Seller already has the engine warmed up',
        what: 'A cold-start is a diagnostic moment. Bad starter, dead-cylinder misfire, valve-train tick — all louder cold. A warm engine HIDES problems.',
        ifFound: 'Insist on starting the car COLD. If they refuse, walk.' },
      { id: 'modifications', area: 'Mods', flag: 'Aftermarket exhaust, suspension, ECU tune',
        what: 'Mods can be fun but: they may void warranty, fail Maine inspection (loud exhaust, glare LEDs), and signal hard driving.',
        ifFound: 'Investigate why each mod is there. A "race tune" on a daily driver is a yellow flag for engine wear.' },
      { id: 'no-records', area: 'History', flag: 'No service records + seller "doesn\'t remember"',
        what: 'Owner\'s manual, oil-change stickers in the corner of the windshield, receipts in the glove box. Lots of records = car was cared for.',
        ifFound: 'Run a CarFax + check the title. No-records cars often have something hidden.' },
      { id: 'salvage', area: 'Title', flag: 'Salvage / rebuilt title',
        what: 'CarFax / VIN check shows accident + salvage rebuild.',
        ifFound: 'Salvage cars are worth ~50–60% of clean-title comps. The price should reflect that. Insurance is harder.' },
      { id: 'open-recall', area: 'Safety', flag: 'Open safety recall not addressed',
        what: 'Plug the VIN into nhtsa.gov/recalls. Some recalls are major (Takata airbags).',
        ifFound: 'Recalls are FREE to repair at any dealer. Just factor in the time. Not a deal-killer but a leverage point.' }
    ],
    walkaround: [
      { step: 1, do: 'CarFax / NHTSA recall check via VIN BEFORE you drive to look at it. Free at nhtsa.gov/recalls; CarFax is paid but worth it.' },
      { step: 2, do: 'Cold start: engine NOT warmed up. Listen at startup — knocks, ticks, rough idle, smoke from exhaust on first start.' },
      { step: 3, do: 'Walk around the body. Magnet test rocker panels and lower fenders. Look at panel gaps for prior collision repair.' },
      { step: 4, do: 'Open hood. Look for wet leaks. Pull oil dipstick (color + smell). Check coolant in reservoir (clear color, no oil floating). Pull trans dipstick if present.' },
      { step: 5, do: 'Crawl under (or have it jacked up). Check frame for perforation. Look at brake lines + fuel lines for rust scaling. Check oil pan + trans pan for active drips.' },
      { step: 6, do: 'Inside the car: every electrical accessory — power windows, locks, A/C cold + heat hot, all 4 turn signals from outside, headlights low + high, brake lights (someone presses pedal).' },
      { step: 7, do: 'Test drive: 30 minutes minimum. Hard acceleration to highway speed (listen for misfire). Hard braking (listen + feel for pulsing). Sharp turns each direction (wheel-bearing hum). Bumps (suspension clunks).' },
      { step: 8, do: 'After driving: park, leave running. Go look at exhaust pipe for smoke color. Walk around for new fluid drips.' },
      { step: 9, do: 'Pre-purchase inspection (PPI): for $80–150 at an independent shop, a tech checks the things you can\'t see. ALWAYS DO THIS for any car over $5,000. Sellers who refuse a PPI are hiding something.' }
    ]
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 9.7: EV / HYBRID MODULE — high-voltage safety, regen, cold-weather
  // What a tech transitioning to EVs needs to know. Maine: cold drops range
  // 30%+; charging infrastructure is sparse but growing. ASE L3 covers this.
  // ─────────────────────────────────────────────────────────
  var EV_OVERVIEW = {
    bigPicture: 'EV + hybrid sales were ~10% of Maine new-car sales in 2024 and rising. Maine\'s climate keeps full BEV adoption slower than coastal warm-state markets — but every dealer service department now sees EVs/hybrids weekly. Techs who can work on them are scarce.',
    aseCert: 'ASE Light Duty Hybrid/Electric Vehicle Specialist (L3) is the industry credential. Two years experience + L1 (Advanced Engine Performance) is a prerequisite. Test fee ~$70.',
    tooling: 'EV-specific tools: Class 0 insulated gloves ($60–150, retest every 6 months), high-voltage CAT III/IV multimeter ($150–400), insulated tool set ($300–800), HV personal-protective equipment.',
    salaryDelta: 'EV-trained techs earn $5–15/hr above general-tech rates. Tesla-certified, hybrid-specialist, and EV-fleet shops pay top of market in Maine.',
    where: 'Maine EV training: Cumberland County RSU, NMCC, CMCC have begun adding EV modules. Tesla Service Tech program (in-house). Manufacturer-specific training (Ford Pro, GM Service, Hyundai/Kia EV, Toyota Prius/Camry hybrid).'
  };
  var EV_SAFETY = [
    { id: 'orange-cables', icon: '🟠', name: 'Orange cables = HIGH VOLTAGE',
      rule: 'Any orange-shielded cable under the hood, under the vehicle, or in the trunk = 200–800 volts DC. Touching it is potentially LETHAL.',
      detail: 'Orange is the universal automotive HV color (SAE J1772 standard). Drive battery cables, motor cables, A/C compressor cables, on-board charger cables. ALL are orange.',
      action: 'Don\'t touch. Don\'t cut. Don\'t pierce with a test probe. Don\'t lean a wrench against. Treat as live until you have proven it\'s safe.' },
    { id: 'hv-disable', icon: '🔌', name: 'HV system disable procedure',
      rule: 'Before any work near HV components: vehicle in park, ignition off, 12V negative disconnected, MAINTENANCE PLUG / SERVICE DISCONNECT removed, then 5–10 minute capacitor discharge wait.',
      detail: 'The service disconnect physically opens the HV bus into two halves so even if both ends were touched, current can\'t flow. Procedure varies by manufacturer — every EV has its own.',
      action: 'NEVER skip. Use the manufacturer\'s service procedure. The few minutes saved is not worth electrocution.' },
    { id: 'class-0-gloves', icon: '🧤', name: 'Class 0 insulated gloves',
      rule: 'Worn whenever there is any possibility of HV contact. Rated to 1000V AC, but only when CURRENT and INTACT.',
      detail: 'Class 0 gloves must be air-tested every use (roll the cuff to inflate, listen for leaks). Pressure-tested at a lab every 6 months. Pinholes from a wedding ring or a tool nick fail them silently.',
      action: 'Inspect + air-test before each use. Pair with leather over-gloves to protect the rubber from punctures.' },
    { id: 'do-not-touch-while-charging', icon: '⚡', name: 'DO NOT service while charging',
      rule: 'A vehicle on a charger has live HV at the on-board charger and the battery. Charging port is hot.',
      detail: 'Even a Level 1 (120V) charger feeds power that goes to high voltage internally. Always unplug + lock-out before HV service.',
      action: 'Unplug. Visually verify unplugged. Do not service plugged-in.' },
    { id: 'thermal-runaway', icon: '🔥', name: 'Thermal runaway / battery fire',
      rule: 'A damaged or punctured lithium-ion battery can overheat exponentially and ignite. Once started, it self-sustains for hours and cannot be put out with water.',
      detail: 'Symptoms: bulging battery pack, off-gassing smell, smoke, hissing. NHTSA + Tesla guidance: large volumes of water (continuous flow) + EVACUATE.',
      action: 'If a damaged HV battery shows ANY warning sign: clear the area, call professional fire response, do not attempt to disassemble.' },
    { id: 'lvi-still-matters', icon: '🔋', name: 'The 12V battery still matters',
      rule: 'EVs and hybrids still have a 12V auxiliary battery. It powers the brain that wakes the HV system up. A dead 12V = car won\'t even unlock.',
      detail: 'Hybrid 12V failures are common — many drivers don\'t realize they need to swap them on a normal car-battery interval (~5 years).',
      action: 'Routine 12V testing + replacement is standard tech work — same procedure as a regular car. Don\'t miss this.' }
  ];
  var EV_KEY_DIFFERENCES = [
    { topic: 'No oil change',
      what: 'No engine = no oil. EV maintenance is mostly tire rotation, brake fluid, coolant (battery + motor), reducer-gear oil, A/C filter.',
      maintenanceShift: 'Service intervals lengthen. Annual + 30K-mile checks. Lower revenue per car for shops, BUT: higher labor on the things that DO need work (HV system, sensors, battery diagnostics).' },
    { topic: 'Regenerative braking',
      what: 'Slowing the car charges the battery instead of dissipating heat through the brake pads. Pads last 3–5x longer.',
      maintenanceShift: 'BUT: pads + rotors that don\'t get used can corrode (pad rusting to rotor face). Especially in salt-Maine. Annual brake-system cleaning + occasional aggressive friction-braking is needed to keep brakes healthy.' },
    { topic: 'Cold weather range',
      what: 'A 250-mile EV in Maine February drops to 150–180 miles. Battery chemistry slows below freezing; cabin heat draws from the battery.',
      maintenanceShift: 'Pre-conditioning (heat the battery + cabin while plugged in, BEFORE unplugging) reclaims most of the loss. Heat-pump-equipped EVs lose less. This is a customer-education moment as much as a tech moment.' },
    { topic: 'Charging types',
      what: 'Level 1 (120V household, ~3 mi/hr — emergency only). Level 2 (240V wall, 20–40 mi/hr — daily). Level 3 / DC fast charge (CCS / NACS, 100–250 mi in 20–30 min — road trips).',
      maintenanceShift: 'Charge port faults, J1772 vs CCS vs NACS connector wear, charging cable damage are common failure points. Connector replacement is a real service item.' },
    { topic: 'Diagnostic tools',
      what: 'Generic OBD-II scanners only see a fraction of EV codes. EV-specific scan tools read battery cell voltages, motor inverter state, charging system state.',
      maintenanceShift: 'Tooling cost is real ($1500–5000+ for a capable EV scan tool). Independent shops without this tooling refer EVs out.' },
    { topic: 'Hybrid still has an engine',
      what: 'Hybrid = small ICE engine + electric motor + smaller HV battery. Both systems need service.',
      maintenanceShift: 'Same oil-change intervals on hybrids (longer than ICE because miles vs. engine-running hours diverge). Check engine-oil based on engine-running hours, not just odometer miles.' },
    { topic: 'Tires wear faster',
      what: 'EVs are heavier (battery weight). Instant torque accelerates tire wear. EV-specific tires are designed for the weight + low rolling resistance.',
      maintenanceShift: 'Tire-rotation interval may be 5,000 miles instead of 7,500. Recommend EV-rated tires; cheap tires get destroyed quickly.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 9.8: GLOSSARY — 50+ terms a teen needs to follow a repair article
  // Sorted by tag (engine / electrical / brakes / drivetrain / fluids / body
  // / general). Each term: short def + a clarifying sentence + Maine note
  // when relevant.
  // ─────────────────────────────────────────────────────────
  var GLOSSARY = [
    // Engine
    { term: 'OBD-II', tag: 'electrical', def: 'On-Board Diagnostics version 2. Federally mandated since 1996. The standardized diagnostic port + protocol. Plug a scanner in to read trouble codes.' },
    { term: 'CEL (Check Engine Light)', tag: 'electrical', def: 'The dashboard light that comes on when the engine computer logs a fault. SOLID = drive-careful; FLASHING = stop, severe misfire damaging the cat.' },
    { term: 'ECU / PCM', tag: 'electrical', def: 'Engine Control Unit / Powertrain Control Module. The "brain" — reads sensors, fires injectors and coils, manages emissions. PCM also controls the transmission.' },
    { term: 'MAF', tag: 'engine', def: 'Mass Airflow sensor. Measures air entering the engine. Dirty MAF = wrong fuel mixture. Clean with MAF cleaner spray ($8) — never touch the sensing wire.' },
    { term: 'O2 sensor', tag: 'engine', def: 'Oxygen sensor in the exhaust. Tells the ECU if fuel mixture was rich or lean. Upstream + downstream pairs; downstream is the cat-monitor.' },
    { term: 'CKP / CMP', tag: 'engine', def: 'Crankshaft / Camshaft Position sensors. Tell the ECU where the engine is in its rotation, so injection + ignition can fire at the right moment. CKP failure = no-start.' },
    { term: 'TPS', tag: 'engine', def: 'Throttle Position Sensor. Tells the ECU how far you\'re pressing the gas. Failing TPS = surging idle, sluggish response.' },
    { term: 'IAC', tag: 'engine', def: 'Idle Air Control valve (older cars). Bypasses the throttle plate to control idle RPM when foot is off pedal. Modern electronic-throttle cars don\'t have one.' },
    { term: 'EGR', tag: 'engine', def: 'Exhaust Gas Recirculation. Routes a metered amount of exhaust back into intake to lower combustion temp + reduce NOx emissions. Clogs with carbon over time.' },
    { term: 'PCV', tag: 'engine', def: 'Positive Crankcase Ventilation valve. Routes blow-by gases from the crankcase back into intake to be re-burned. A stuck PCV causes oil leaks + rough idle.' },
    { term: 'Stoichiometric', tag: 'engine', def: '"Just right" air-fuel ratio for gasoline (14.7:1 by mass). Engines target this at cruise. Lean = above; rich = below.' },
    { term: 'Misfire', tag: 'engine', def: 'A cylinder failed to fire on its turn. Codes: P0300 (random), P0301–P0312 (specific cylinder).' },
    { term: 'Compression', tag: 'engine', def: 'How well a cylinder seals its mixture during the power stroke. Tested with a compression gauge. Low compression = bent valve, broken ring, head gasket.' },
    { term: 'Blow-by', tag: 'engine', def: 'Combustion gases that leak past worn piston rings into the crankcase. Some is normal; lots is a sign of engine wear.' },
    { term: 'Knock', tag: 'engine', def: 'Combustion-detonation noise. Pre-ignition. Causes: low octane, hot intake, carbon deposits, advanced timing. Persistent knock = engine damage.' },
    { term: 'Timing belt vs chain', tag: 'engine', def: 'Belt = rubber/aramid, replace every 60–100K miles. Chain = steel, usually lifetime. Check your engine.' },
    { term: 'Interference engine', tag: 'engine', def: 'An engine where pistons + valves can collide if timing slips. A snapped belt = bent valves = $$$. Non-interference engines just stop running.' },
    { term: 'VVT', tag: 'engine', def: 'Variable Valve Timing. Cam phasing changes with RPM for efficiency + power. Oil-controlled — bad oil = VVT codes (P0011, P0014).' },
    // Electrical
    { term: 'Alternator', tag: 'electrical', def: 'Belt-driven generator. Charges battery + powers electronics while engine runs. Healthy: 13.8–14.7V at battery with engine running.' },
    { term: 'Starter', tag: 'electrical', def: 'Electric motor that cranks the engine on key-on. Has a solenoid that engages a small gear into the flywheel.' },
    { term: 'CCA (Cold Cranking Amps)', tag: 'electrical', def: 'How many amps a battery delivers at 0°F for 30 seconds. Maine: aim for 700+ CCA on most cars.' },
    { term: 'Parasitic draw', tag: 'electrical', def: 'Current the car pulls while parked (off). Normal: <50mA. High = stuck relay, glove-box light, aftermarket accessory. Kills batteries overnight.' },
    { term: 'Ground / chassis ground', tag: 'electrical', def: 'The metal of the car body returns current to the battery negative. A corroded ground bolt = mysterious electrical faults.' },
    { term: 'Fuse / fusible link', tag: 'electrical', def: 'A weak link designed to blow before downstream wiring. Fuse box under hood + under dash. Fusible links are inline wires that act as fuses for high-current circuits.' },
    { term: 'Relay', tag: 'electrical', def: 'A small electromagnet switch. Low-current trigger (from a button or computer) closes a high-current contact. Stuck relays cause dead-battery overnight problems.' },
    { term: 'BCM', tag: 'electrical', def: 'Body Control Module. Manages interior electrics — locks, lights, wipers, security. Water in a BCM = mysterious failures.' },
    // Brakes
    { term: 'Pad / rotor', tag: 'brakes', def: 'Pad: the friction material that gets squeezed against the rotor. Rotor (or "disc"): the spinning metal disc the pad clamps onto.' },
    { term: 'Caliper', tag: 'brakes', def: 'The C-shaped bracket that holds the pads + the piston that squeezes them. "Sticky caliper" = piston not retracting after release.' },
    { term: 'Wear-indicator tab', tag: 'brakes', def: 'Small spring on a brake pad designed to scrape the rotor when pad gets thin. The squeal is your warning to replace pads.' },
    { term: 'ABS', tag: 'brakes', def: 'Anti-lock Braking System. Pulses the brakes faster than you can to prevent wheel lockup. Disabled in winter slush only by panic-pumping.' },
    { term: 'Bleeder / bleed screw', tag: 'brakes', def: 'A small screw on each caliper that lets air out of the brake fluid system. Notorious for snapping off in salt-state Maine.' },
    { term: 'Master cylinder', tag: 'brakes', def: 'The hydraulic pump in the brake system. Driver presses pedal → master cylinder pushes fluid → calipers squeeze pads. Failing master = soft pedal.' },
    { term: 'DOT 3 / DOT 4 / DOT 5', tag: 'brakes', def: 'Brake fluid specifications. DOT 3 + 4 are glycol-based + interchangeable in most cars. DOT 5 is silicone, NOT compatible with the others.' },
    // Drivetrain
    { term: 'Transmission', tag: 'drivetrain', def: 'Gearbox between engine + drive wheels. Manual = clutch + stick. Automatic = hydraulic + planetary gears. CVT = continuous belt + pulleys.' },
    { term: 'Differential', tag: 'drivetrain', def: 'Gears that let driven wheels turn at different speeds in turns. Front-drive cars have one in the transaxle; rear-drive have one in the rear axle.' },
    { term: 'CV joint', tag: 'drivetrain', def: 'Constant-velocity joint. Lets a half-shaft (drive axle) flex with suspension while still rotating. Inner + outer per side. Click in turns = bad outer joint.' },
    { term: 'U-joint', tag: 'drivetrain', def: 'Universal joint. Older drive shafts use these. Squeak / clunk on acceleration in a rear-drive truck = worn u-joint.' },
    { term: 'Axle / half-shaft', tag: 'drivetrain', def: 'The shaft from the differential to the wheel hub. Includes CV joints. Comes as a complete assembly for most replacement work.' },
    { term: 'Clutch (manual)', tag: 'drivetrain', def: 'Friction disc between engine + transmission. Driver pushes pedal to disconnect engine from trans for shifting. Replacement is a transmission-out job.' },
    // Fluids
    { term: 'Synthetic vs conventional oil', tag: 'fluids', def: 'Synthetic = chemically engineered; longer drain interval, better cold flow, costs more. Conventional = refined from crude. Most modern cars require synthetic.' },
    { term: 'Viscosity (5W-30)', tag: 'fluids', def: 'How thick oil is. 5W = winter flow rating (lower = thinner cold). 30 = operating-temp viscosity (higher = thicker hot). Use what your owner\'s manual specifies.' },
    { term: 'Coolant / antifreeze', tag: 'fluids', def: 'Mix of ethylene glycol + water + corrosion inhibitors. Lowers freeze point + raises boil point. Different chemistries (HOAT/OAT/IAT) — DON\'T mix.' },
    { term: 'ATF', tag: 'fluids', def: 'Automatic Transmission Fluid. Many specs (Dexron VI, Mercon, ATF+4, etc.). Wrong ATF damages trans. Match the OEM spec.' },
    { term: 'Power steering fluid', tag: 'fluids', def: 'Hydraulic fluid for hydraulic-assist steering. Some cars use ATF; some use dedicated PSF. Wrong fluid wrecks the pump. Electric power steering uses no fluid.' },
    // General / body
    { term: 'VIN', tag: 'general', def: 'Vehicle Identification Number — 17-character unique ID. On dash + door jamb + title + registration. Decode online for engine, country, plant.' },
    { term: 'TSB', tag: 'general', def: 'Technical Service Bulletin. Manufacturer\'s "we know about this issue, here\'s the fix" memo to dealer techs. Free database at nhtsa.gov.' },
    { term: 'Recall', tag: 'general', def: 'Federally mandated free repair for a safety defect. Search by VIN at nhtsa.gov/recalls. Repair is FREE at any dealer regardless of where you bought.' },
    { term: 'Rust scaling vs surface rust', tag: 'general', def: 'Surface rust = brown haze, structurally fine, can be cleaned + sealed. Scaling = thick chunks flaking off, structurally bad. Maine spring inspection focus.' },
    { term: 'Salt / brine', tag: 'general', def: 'Maine de-ices with both. Brine penetrates undercarriage seams and accelerates rust. Spring undercarriage wash extends frame life by years.' },
    { term: 'Inspection sticker', tag: 'general', def: 'Maine annual safety inspection ($12.50). Failed sticker = 60 days to repair OR stop driving. Don\'t go to inspection unprepared.' },
    { term: 'OEM vs aftermarket', tag: 'general', def: 'OEM = Original Equipment Manufacturer (the brand the car came with). Aftermarket = third-party. OEM is more expensive but exact-fit; quality aftermarket is often fine.' },
    { term: 'Reman / remanufactured', tag: 'general', def: 'A used part rebuilt to OEM spec by a remanufacturer. Cheaper than new with similar warranty. Common for alternators, starters, calipers. Brings a "core charge" you get back when you turn in the old one.' },
    { term: 'Core charge', tag: 'general', def: '$10–80 deposit on a reman part to motivate you to return the old one for recycling. You get it back when you bring the old part to the parts store.' },
    { term: 'Torque spec', tag: 'general', def: 'Manufacturer-specified tightness for a fastener (e.g., 80 ft-lb on lug nuts). Use a torque wrench. Over-tight strips threads; under-tight loosens.' },
    { term: 'ASE', tag: 'general', def: 'National Institute for Automotive Service Excellence. Industry-standard tech credential. A1–A8 areas + advanced (L-series). Master Tech = all 8 of A1–A8.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 9.85: COLD-WEATHER PREP — Maine winter checklist
  // What to do in October-November so February doesn't strand you.
  // ─────────────────────────────────────────────────────────
  var COLD_WEATHER_CHECKLIST = [
    { id: 'battery-test', icon: '🔋', urgency: 'Oct–Nov',
      task: 'Load-test the battery',
      detail: 'Cold weather doubles cranking load while cutting battery output. A weak battery in November is a dead battery in February. Free at NAPA / O\'Reilly / AutoZone.',
      action: 'If load test fails or battery is >5 years old: replace before snow flies.' },
    { id: 'tires-check', icon: '🛞', urgency: 'Oct–Nov',
      task: 'Tire tread depth + pressure',
      detail: 'Below 4/32" tread = unsafe in slush. Below 2/32" = illegal. Cold drops tire pressure ~1 psi per 10°F drop — a 70°F to 0°F swing drops pressure 7 psi.',
      action: 'Penny test (Lincoln\'s head visible = replace). Set pressure to door-jamb spec on a cold morning. Consider dedicated winter tires (Maine: a real upgrade for control).' },
    { id: 'antifreeze', icon: '❄️',
      urgency: 'Oct–Nov',
      task: 'Coolant strength test',
      detail: 'A coolant tester (hydrometer or refractometer, $5–15) tells you the freeze point. Should protect to at least -34°F. Old / contaminated coolant freezes higher.',
      action: 'If freeze protection is weak: drain + refill with correct 50/50 pre-mix. Hose-end coolant testers $5 at parts stores.' },
    { id: 'wiper-fluid', icon: '🌧️', urgency: 'Oct–Nov',
      task: 'Switch to -30°F or -40°F washer fluid',
      detail: 'Standard summer washer fluid freezes around 32°F. In Maine, that fluid sits in the reservoir frozen for 4 months — and shatters the reservoir if it expands.',
      action: 'Drain summer fluid by spraying it out. Refill with -30°F (blue gallon at hardware stores) or colder. Top up monthly — slush eats it fast.' },
    { id: 'wipers', icon: '🌨️', urgency: 'Oct–Nov',
      task: 'Wiper blades + winter blade upgrade',
      detail: 'Summer-worn blades chatter on first slush storm. Full-frame "winter blades" handle ice better than sleek beam blades.',
      action: 'Replace if streaking. Maine: winter blades $25–35 each are worth it.' },
    { id: 'block-heater', icon: '🔌', urgency: 'Oct–Nov',
      task: 'Block heater + extension cord',
      detail: 'Block heater = a small heating element in the engine block, plugged in overnight. Warms oil + coolant for easier cold start. Many Maine homes have an outlet near the driveway for exactly this.',
      action: 'If your car has one (look for a plug hanging out the front grille), use it below 0°F. If it doesn\'t and you live in northern Maine, install one ($30–80 part + 1 hour).' },
    { id: 'oil-grade', icon: '🛢️', urgency: 'Oct–Nov',
      task: 'Verify oil grade for cold flow',
      detail: 'Below 0°F, conventional oil thickens and starves the engine on cold start. Most modern cars spec 0W-20 or 5W-30 full-synthetic — verify yours and switch to synthetic if you\'re not already.',
      action: 'Check oil cap or owner\'s manual for the spec. Synthetic 0W-20 is the gold standard for Maine winters.' },
    { id: 'belts-hoses', icon: '🔗', urgency: 'Oct–Nov',
      task: 'Belt + hose inspection',
      detail: 'Cold makes rubber stiffer. A cracked serpentine belt that\'s been "fine" all summer can snap on the first -10°F morning. Hoses can burst.',
      action: 'Visual: belt cracks every inch or more = replace. Squeeze hoses cold — soft / mushy = replace. Cheap insurance.' },
    { id: 'emergency-kit', icon: '🎒', urgency: 'Nov–Dec',
      task: 'Build winter emergency trunk kit',
      detail: 'Maine rural drivers can be stranded in below-zero temps for hours waiting on AAA or a tow. The trunk kit is genuine survival equipment.',
      action: 'See the Roadside Emergency module for the full Maine winter kit list (jumper cables, tow strap, sand/kitty litter, blanket, food, flares, flashlight, hand warmers, phone charger).' },
    { id: 'door-locks', icon: '🚪', urgency: 'Nov–Dec',
      task: 'Lubricate door locks + hinges',
      detail: 'Frozen door locks at 6am on a Tuesday is the most Maine-of-Maine moments. Graphite lock lubricant (NOT oil — oil collects ice).',
      action: 'Spray graphite into each door lock cylinder. Silicone spray on rubber door + trunk seals so they don\'t freeze stuck.' },
    { id: 'windshield-wash', icon: '🧊', urgency: 'Nov–Dec',
      task: 'Inspect windshield for chips',
      detail: 'A small chip in November becomes a coast-to-coast crack on the first -20°F morning when you turn the defroster on. Thermal shock is real.',
      action: 'Repair chips while still chips ($50–80; insurance often $0 deductible). Replacement is $300–800 once cracked.' },
    { id: 'undercarriage-rinse', icon: '🚿', urgency: 'Mar–Apr',
      task: 'Spring undercarriage wash + inspection',
      detail: 'After winter, undercarriage is caked with salt brine. Rinse off ASAP and inspect for new rust scaling on brake/fuel lines, frame, exhaust.',
      action: 'A self-serve car wash with the underbody spray is $5. Some Maine touchless car washes have 360° underspray. Then crawl under and inspect.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 9.86: ROADSIDE EMERGENCY — trunk kit + breakdown response
  // Maine winter rural breakdown can be a survival situation. This is what
  // belongs in your trunk + what to do when it happens.
  // ─────────────────────────────────────────────────────────
  var TRUNK_KIT = [
    { id: 'jumper-cables', icon: '🔌', name: 'Jumper cables (heavy gauge, 16ft+)',
      why: 'Most-needed item. Maine winter dead-battery rate spikes in January. You\'ll be jumping yourself or a stranger several times per winter.',
      cost: '$25–50' },
    { id: 'jump-pack', icon: '🔋', name: 'Lithium jump-starter pack (bonus)',
      why: 'Self-contained — no second car needed. Starts most 4-cylinders. Charges via USB-C. Worth keeping in addition to cables.',
      cost: '$60–120' },
    { id: 'tow-strap', icon: '⛓️', name: 'Tow strap (10K+ lb rating)',
      why: 'Pull a friend out of a snowbank. NEVER use ratchet-strap or rope — they snap and hurt people.',
      cost: '$25–40' },
    { id: 'shovel-folding', icon: '🪣', name: 'Folding shovel',
      why: 'Dig snow out from around tires. Stranded-in-a-drift response.',
      cost: '$20–40' },
    { id: 'sand-kitty-litter', icon: '🐈', name: 'Sand or non-clumping kitty litter (small bag)',
      why: 'Spread under drive wheels for traction on ice. Doubles as weight in the trunk for rear-drive cars.',
      cost: '$5–10' },
    { id: 'blanket', icon: '🛏️', name: 'Wool or mylar emergency blanket',
      why: 'If you\'re stuck waiting for a tow at -10°F, this is survival equipment. Mylar reflects body heat; wool insulates even when wet.',
      cost: '$10–25' },
    { id: 'flashlight', icon: '🔦', name: 'Headlamp + spare batteries',
      why: 'Hands-free light. Changing a tire in the dark with your phone in your mouth is no fun.',
      cost: '$15–40' },
    { id: 'flares-triangles', icon: '🚧', name: 'Reflective triangles (or LED road flares)',
      why: 'Visibility for oncoming traffic when broken down. LEDs are reusable and don\'t burn fingers like chemical flares.',
      cost: '$20–50' },
    { id: 'first-aid', icon: '🩹', name: 'First-aid kit',
      why: 'Cuts during a roadside fix. Pair with the First Response Lab tool.',
      cost: '$15–40' },
    { id: 'tire-gauge', icon: '📏', name: 'Tire-pressure gauge + portable inflator',
      why: 'Fix a slow-leak roadside instead of swapping the spare. 12V plug-in inflators are cheap.',
      cost: '$25–50' },
    { id: 'snacks', icon: '🥜', name: 'Granola bars + water (rotate)',
      why: 'Stranded in rural Maine waiting for the plow. Sugar + calories matter when you\'re cold.',
      cost: '$10–20' },
    { id: 'phone-charger', icon: '🔌', name: 'Phone charger + portable battery bank',
      why: 'Your phone is your lifeline. A dead phone in a stranded car is the worst-case Maine scenario.',
      cost: '$25–50' },
    { id: 'gloves-hat', icon: '🧤', name: 'Spare gloves + winter hat',
      why: 'You may be in dress clothes when you break down. Heavy gloves + a wool hat in the trunk save the day.',
      cost: '$20–40' },
    { id: 'hand-warmers', icon: '🔥', name: 'Chemical hand warmers (4-pack)',
      why: 'Activate + drop in gloves or socks. 8 hours of heat. Critical if you\'re stuck overnight.',
      cost: '$5–10' },
    { id: 'duct-tape', icon: '📎', name: 'Duct tape + zip ties',
      why: 'Temporary fixes for everything: a flapping bumper, a torn radiator hose patch, holding a heat shield up.',
      cost: '$10–15' },
    { id: 'gas-can', icon: '⛽', name: '2-gallon gas can (empty in trunk)',
      why: 'Run out of gas in rural Maine = walk to nearest station. An empty can means you can fill up there + return.',
      cost: '$15–25' }
  ];

  var BREAKDOWN_PROTOCOL = [
    { phase: 'IMMEDIATE', step: 1,
      title: 'Get safely off the road',
      do: 'Hazard lights ON immediately. Coast to the right shoulder if possible. Steeper shoulder = less safe, but better than a lane.',
      avoid: 'Don\'t stop in an active travel lane unless physically impossible to move.' },
    { phase: 'IMMEDIATE', step: 2,
      title: 'Stay in the car if traffic is heavy',
      do: 'Buckle up + stay inside. The car is a steel cage between you and a 60mph distracted driver. In Maine winter cold, the engine still has heat for a while.',
      avoid: 'Don\'t stand outside near traffic. Don\'t walk on the shoulder of an interstate.' },
    { phase: 'IMMEDIATE', step: 3,
      title: 'Set out reflective triangles or flares',
      do: 'If you DO need to be outside (e.g., changing a tire on a residential road), set triangles 50–100 ft behind the car so traffic sees you with time to react.',
      avoid: 'Don\'t place them in a way that lures traffic toward your work zone.' },
    { phase: 'ASSESS', step: 4,
      title: 'What\'s wrong?',
      do: 'Use this tool\'s Decision Tree if needed. Common: dead battery, flat tire, run out of gas, overheating, no-start.',
      avoid: 'Don\'t try to fix something you don\'t understand on the side of an interstate. Tow.' },
    { phase: 'ASSESS', step: 5,
      title: 'Can I drive it (slowly) somewhere safer?',
      do: 'Limp to the nearest exit / gas station / wide-shoulder. Going 30mph with hazards on a slow-traffic shoulder is often safer than waiting on an interstate.',
      avoid: 'Driving on a flat tire ruins the rim ($300+). Driving overheating ruins the engine ($3000+). Know which limp is worth it.' },
    { phase: 'CALL', step: 6,
      title: 'Call for help (in this order)',
      do: '1) AAA if you have it — towing is the cheapest way out. 2) Insurance roadside — many policies include it. 3) Friend with truck + tow strap (small jobs). 4) Local tow company.',
      avoid: 'Don\'t accept "help" from random tow trucks that pull up uninvited. Some are scams that hold the car hostage.' },
    { phase: 'CALL', step: 7,
      title: 'Tell them WHERE',
      do: 'Give location FIRST. Mile marker, exit number, GPS coordinates from your phone, nearest cross street. Help can roll while you explain the rest.',
      avoid: 'Don\'t describe the problem before the location. Lost-call after location-first = help is already coming.' },
    { phase: 'WAIT', step: 8,
      title: 'Stay warm + visible',
      do: 'Maine winter: blanket on, hand warmers if cold, run engine for 10 min/hour for heat (CHECK exhaust isn\'t snow-blocked = CO risk). Phone on charger.',
      avoid: 'Don\'t run engine if exhaust pipe is buried in snow. CO accumulates in cabin.' },
    { phase: 'WAIT', step: 9,
      title: 'Tell someone where you are',
      do: 'Text a family member or friend your location, ETA of help, and a check-in time. Especially important on rural roads.',
      avoid: 'Don\'t go silent. People worry; protocols exist for a reason.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 9.87: SHOP BUSINESS BASICS — for the future shop owner / mobile
  // mechanic. Maine independent shop reality + mobile-mechanic pathway.
  // ─────────────────────────────────────────────────────────
  var SHOP_BUSINESS = {
    overview: 'After a few years as a tech you\'ll think about running your own. Three Maine paths: stay employed (steady paycheck, no risk), buy into an existing shop (often when an owner retires), or start fresh (highest risk, highest ceiling). The mobile-mechanic route lets you start without a shop lease.',
    mobilePath: {
      title: 'The mobile-mechanic startup',
      pros: ['Customer comes to you (or you go to them) — no shop lease', 'Lower overhead — work van + tools', 'Niche underserved in rural Maine — fleet + farm + senior in-driveway service', 'Can scale to a shop later'],
      cons: ['Weather kills outdoor work in Maine winters', 'You\'re your own scheduler / dispatcher / accountant / sales', 'No second-tech backup if a job runs over', 'Marketing is on you — Google, NextDoor, word-of-mouth'],
      startupCost: '$25–60K total: van ($5–25K used), basic tool inventory ($10–20K), insurance ($2–4K/yr), marketing ($1–3K), business setup (LLC, EIN, ~$500).',
      revenue: '$60K–120K/yr is realistic gross in years 1–3. Net after tools, insurance, taxes, fuel: $35–70K. Compare to $50–70K employed without the risk.',
      scaling: 'Many mobile mechanics scale to a brick-and-mortar shop in years 3–5 once they have a customer book + cash flow.'
    },
    insurance: [
      { type: 'Garage Liability', who: 'Required to legally work on customer cars', why: 'Covers damage YOU cause to a customer\'s vehicle while servicing. Without it, one bad transmission install = financial ruin.', cost: '$1500–4000/yr' },
      { type: 'Garage Keepers', who: 'If you keep customer vehicles overnight', why: 'Covers customer cars on your premises (theft, fire, weather damage).', cost: '$500–1500/yr' },
      { type: 'Workers Comp', who: 'Required by Maine law for any employees', why: 'Covers injuries to employees on the job. Single-owner LLC may be exempt; verify with Maine Bureau of Insurance.', cost: '$2000–5000/yr per employee' },
      { type: 'General Liability', who: 'Standard small-business cover', why: 'Customer slips in your shop, claims your work caused damage. Different from garage liability.', cost: '$500–1500/yr' },
      { type: 'Commercial Auto', who: 'Required on a work truck/van', why: 'Personal auto insurance does NOT cover commercial use. Driving customer cars on personal insurance = uncovered.', cost: '$1500–3000/yr' }
    ],
    toolTrucks: [
      { name: 'Snap-on', desc: 'Premium tier. Top quality, top price, lifetime warranty. Most expensive financing terms.', tier: 'premium' },
      { name: 'Mac Tools', desc: 'High-quality, slightly less expensive than Snap-on. Lifetime warranty.', tier: 'premium' },
      { name: 'Matco', desc: 'Mid-premium. Lifetime warranty. Often more flexible financing.', tier: 'premium' },
      { name: 'Cornwell', desc: 'Premium tier with regional strength.', tier: 'premium' },
      { name: 'Harbor Freight (Icon, Pittsburgh Pro)', desc: 'No truck route — store + online. Massive cost savings. Lower-quality on the cheap line; Icon line competes with brand-name tools.', tier: 'budget' }
    ],
    toolFinancingWarning: 'Tool truck financing is the #1 way young techs get into long-term debt. A $4,000 tool box + $200/week payment over 3 years = $30K+ paid for $20K of tools. Buy what you NEED for current work; finance only after you know the cash flow supports it. Many master techs buy mostly Harbor Freight + Snap-on for the few items where quality matters most.',
    pricing: [
      { item: 'Labor rate (independent)', maine: '$90–150/hr', national: '$100–180/hr', note: 'Set based on what your local market bears + your overhead. Don\'t race to the bottom — undercutting kills profit.' },
      { item: 'Labor rate (mobile)', maine: '$80–125/hr', national: '$100–150/hr', note: 'Slightly under shop rate because customer perceives lower overhead. But your travel time is real cost.' },
      { item: 'Parts markup', maine: '20–40%', national: '25–50%', note: 'Standard practice. Buying parts at trade discount + selling at near-retail. Don\'t hide it; itemize on invoices.' },
      { item: 'Diagnostic fee', maine: '$80–150', national: '$100–200', note: 'Often waived if customer authorizes the repair. Captures the cost of figuring out the problem.' },
      { item: 'Trip fee (mobile)', maine: '$40–80', national: '$50–100', note: 'Shows up on the invoice. Customers accept it because they\'re saving the tow.' }
    ],
    customerAcquisition: [
      { channel: 'Word of mouth', cost: '$0', effective: 'highest', detail: 'A satisfied customer tells 3 people. A great one tells 10. Build trust = inbound work.' },
      { channel: 'Google Business Profile', cost: '$0', effective: 'high', detail: 'Free to set up. Reviews drive 70%+ of new customer searches. Ask every happy customer for a Google review.' },
      { channel: 'NextDoor + local Facebook groups', cost: '$0', effective: 'high', detail: 'Maine specific: small towns run on these. Be helpful in posts (not just sales). Become "the mechanic in town."' },
      { channel: 'Fleet + farm contracts', cost: 'time', effective: 'highest-stable', detail: 'A landscape company with 4 trucks = $10–30K/yr in steady work. Contractors talk to other contractors.' },
      { channel: 'Local newspaper ads', cost: '$200–500/mo', effective: 'medium', detail: 'Older demographic still reads. Less effective for younger customers.' },
      { channel: 'Yard signs / vehicle graphics', cost: '$300–1000', effective: 'medium', detail: 'Truck wrap costs more but advertises everywhere you drive. Cheap yard signs at customer sites work in small towns.' }
    ],
    pitfalls: [
      'Working without garage liability — one mistake bankrupts you.',
      'Tool-truck debt growing faster than revenue.',
      'Pricing too low to "build clientele" — you teach them to expect cheap, then can\'t raise prices.',
      'No emergency fund — one slow month is a crisis without a buffer.',
      'Mixing personal + business money — get a separate bank account day one.',
      'Skipping quarterly tax payments — IRS will catch you with a year-end bill + penalties.',
      'Saying yes to every job — the wrong customer is worse than no customer.'
    ]
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 9.88: FIRST-CAR 30-DAY PLAN — week-by-week onboarding
  // Just bought your first car. Here\'s what to do over the next month
  // so you don\'t miss anything important.
  // ─────────────────────────────────────────────────────────
  var FIRST_CAR_PLAN = [
    { week: 1, title: 'Week 1 — Paperwork + safety walk',
      tasks: [
        { do: 'Title transfer at Maine BMV (within 30 days; faster is better). Bring bill of sale, old title, ID. ~$35.',
          why: 'Driving on the seller\'s title is illegal after 30 days. BMV is busy — go early.' },
        { do: 'Insurance: switch coverage to your name, add this car to your policy. Get quotes from 2–3 carriers (Geico, Progressive, AAA, local agent).',
          why: 'You\'re uninsured the moment you drive off the seller\'s lot if you didn\'t arrange this in advance. Maine minimum: 50/100/25 liability + $50/$100K UM.' },
        { do: 'Find the owner\'s manual. Read the maintenance section.',
          why: 'Tells you fluid specs, service intervals, fuse locations, recommended tires. The single most useful 30 minutes you spend.' },
        { do: 'Check all lights externally with a friend pressing the brake.',
          why: 'Burnt bulb is a $5 + 5-min fix you want to discover NOW, not at inspection.' },
        { do: 'NHTSA recall check on VIN: nhtsa.gov/recalls.',
          why: 'Recalls are FREE at any dealer. Schedule them now.' }
      ]
    },
    { week: 2, title: 'Week 2 — Fluids + filters baseline',
      tasks: [
        { do: 'Oil change with the correct grade (per owner\'s manual). Note the mileage on a sticker.',
          why: 'You don\'t know when the previous owner last changed it. Start your own clock.' },
        { do: 'Top off all 5 fluids (or note for service): coolant, brake fluid, power steering (if hydraulic), washer fluid, transmission (if dipstick).',
          why: 'Establishes baseline and catches any seller-hidden low-fluid issues.' },
        { do: 'Replace cabin air filter ($15) and engine air filter ($20) if visibly dirty.',
          why: 'Cheap insurance for your first 6 months of clean baseline. 10 minutes total.' },
        { do: 'Inspect wiper blades. Replace if streaking.',
          why: 'Maine: do this before slush season. New blades cost less than one re-inspection visit.' }
      ]
    },
    { week: 3, title: 'Week 3 — Underbody + tires',
      tasks: [
        { do: 'Crawl under (or jack up safely) and inspect frame, brake lines, fuel lines, exhaust.',
          why: 'Maine salt damage hides until you look. You want to know NOW, not when something fails.' },
        { do: 'Penny test all 4 tires + sidewall inspection.',
          why: 'Old / unsafe tires are negotiating leverage with the seller (small-claims if hidden) and a winter-safety issue.' },
        { do: 'Set tire pressure to door-jamb spec on a cold morning.',
          why: 'Most cars are run under-inflated, which wears tires faster + cuts fuel economy 1–3%.' },
        { do: 'Test the spare. Where is it? Is it inflated? Where\'s the jack + lug wrench?',
          why: 'You don\'t want to be looking for the spare in a snowstorm at 6am.' }
      ]
    },
    { week: 4, title: 'Week 4 — Maine inspection prep + emergency kit',
      tasks: [
        { do: 'Pre-walk Maine inspection (this tool\'s Inspection Prep module).',
          why: 'Schedule the actual inspection with confidence. Catch fails BEFORE the sticker visit.' },
        { do: 'Build winter trunk kit (this tool\'s Roadside Emergency module).',
          why: 'Maine rural drivers should not be without jumper cables, blanket, flashlight, and snacks in the trunk.' },
        { do: 'Set up service-record system. Phone notes app or a small notebook in the glovebox.',
          why: 'Future-you (or the next buyer) needs records. A car with records sells for more.' },
        { do: 'Schedule first oil change reminder for 5,000 miles or 6 months from now.',
          why: 'Your phone calendar is more reliable than memory. The pattern is the win, not any single change.' },
        { do: 'Drive it in different conditions before winter: highway, hard accel, hard brake, sharp turns. Listen for new noises.',
          why: 'You\'re building a baseline of what NORMAL sounds like. Future deviations are easier to notice.' }
      ]
    }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 9.9: HANDS-ON LAB SIMULATOR — graded diagnostic scenarios
  // Customer car presents symptoms; user walks through diagnostic decision
  // points; each choice scored for efficiency (correct + verify-first) vs
  // wasteful (throwing parts at it) vs harmful (continued driving with CEL
  // flashing). Final letter grade + feedback per choice.
  // ─────────────────────────────────────────────────────────
  var LAB_SCENARIOS = [
    {
      id: 'lab-misfire', name: 'Cylinder 3 misfire', icon: '〰️', difficulty: 2,
      intro: 'Customer drives in a 2014 Toyota Camry. "Check-engine light is FLASHING and the car shakes hard at stoplights. Started this morning."',
      car: { year: 2014, make: 'Toyota', model: 'Camry', engine: '2.5L I4', mileage: 95000, history: 'Original-owner, dealer-serviced' },
      symptoms: ['CEL FLASHING (not solid)', 'Rough idle', 'Hesitation at light throttle'],
      steps: [
        { id: 's1', prompt: 'Customer is asking if they should drive home. What do you tell them?',
          choices: [
            { id: 'a', label: 'Drive carefully, fix when convenient', score: -10,
              fb: 'WRONG. Flashing CEL = severe misfire. Unburnt fuel is destroying the catalytic converter ($800-2500 if it goes).' },
            { id: 'b', label: 'Do not drive — flashing CEL means severe misfire damaging the cat. Get a tow if needed.', score: 10,
              fb: 'CORRECT. Flashing CEL is the only "stop driving" CEL. Cat damage is irreversible and expensive.' },
            { id: 'c', label: 'Disconnect the battery to clear the light', score: -10,
              fb: 'WRONG. Clearing the light hides the problem. Codes return; cat damage continues; customer trusts you less.' }
          ] },
        { id: 's2', prompt: 'They agree to leave it. First diagnostic move?',
          choices: [
            { id: 'a', label: 'OBD-II scan — read codes + freeze-frame data', score: 10,
              fb: 'CORRECT. Always start at the OBD port. Codes narrow diagnosis; freeze-frame shows conditions when fault occurred.' },
            { id: 'b', label: 'Pull all 4 spark plugs + inspect', score: 0,
              fb: 'PARTIAL. Eventually useful, but codes first — they tell you which cylinder. Saves time on a 4-cylinder, but on a V6 you\'d be removing the intake for nothing.' },
            { id: 'c', label: 'Replace all plugs + all coils as a set', score: -5,
              fb: 'PARTS-CANNON. Customer pays $400 for guesswork. Diagnose first, repair what\'s broken.' }
          ] },
        { id: 's3', prompt: 'Codes returned: P0303 + P0316. What does P0316 tell you?',
          choices: [
            { id: 'a', label: 'Cylinder 16 misfire — V12 engine confirmed', score: -10,
              fb: 'WRONG. P0316 is "misfire detected during engine startup" — a companion code to P03xx misfires.' },
            { id: 'b', label: 'Misfire detected during engine startup — supports the cylinder 3 (P0303) finding', score: 10,
              fb: 'CORRECT. P0316 is a startup-misfire flag. Confirms misfire happened during cold start (matches customer report).' },
            { id: 'c', label: 'Internal engine damage — needs rebuild', score: -10,
              fb: 'WRONG. P0316 doesn\'t indicate damage — just a startup misfire flag.' }
          ] },
        { id: 's4', prompt: 'Best test for whether it\'s coil vs plug vs injector?',
          choices: [
            { id: 'a', label: 'Swap coil from cyl 3 to cyl 1. Clear codes. Drive 5 min. See if misfire moves.', score: 10,
              fb: 'CORRECT. The "swap test" — if misfire follows the coil, coil is bad. If misfire stays on cyl 3, coil is fine.' },
            { id: 'b', label: 'Replace coil 3 first (most common cause)', score: 5,
              fb: 'OK but not best. You\'ll fix it 70% of the time without testing — but the swap test is free.' },
            { id: 'c', label: 'Pull cyl 3 plug only, inspect, decide', score: 5,
              fb: 'OK. Plug inspection is informative (color, gap, electrode) and quick. But the coil swap test is more diagnostic.' }
          ] },
        { id: 's5', prompt: 'Swap test: misfire moved to cyl 1. Now what?',
          choices: [
            { id: 'a', label: 'Replace the OLD cyl 3 coil with a new one. Move it back to cyl 3. Verify misfire is gone.', score: 10,
              fb: 'CORRECT. Coil is confirmed bad. New coil + return both to original positions. ~$40 part, 15 min.' },
            { id: 'b', label: 'Leave coils swapped — call it good', score: -5,
              fb: 'NO. Cyl 1 is now misfiring (with the bad coil). Customer drives away and returns next week.' },
            { id: 'c', label: 'Replace all 4 coils + plugs as a set', score: -5,
              fb: 'OVERKILL. The other 3 coils are fine. Charging customer for parts they don\'t need erodes trust.' }
          ] }
      ],
      truth: 'Cyl 3 ignition coil failed. Replaced with OEM-spec coil. New plug installed (since you had it out). Verified no misfire codes after 10-min test drive. ~$45 parts + 1 hr labor.'
    },
    {
      id: 'lab-no-start', name: 'No-start, rapid clicking', icon: '🔑', difficulty: 1,
      intro: 'Customer text: "Won\'t start. Just clicks. -5°F here in Caribou."',
      car: { year: 2017, make: 'Ford', model: 'Escape', engine: '1.5L EcoBoost I4', mileage: 78000, history: 'Battery never replaced' },
      symptoms: ['Rapid clicking on key turn', 'Dash lights stay bright when key turns', 'Original 7-year-old battery'],
      steps: [
        { id: 's1', prompt: 'First test?',
          choices: [
            { id: 'a', label: 'Multimeter on battery posts (engine off)', score: 10,
              fb: 'CORRECT. <12.0V resting = weak battery. Free, fast, splits the diagnosis.' },
            { id: 'b', label: 'Replace starter immediately', score: -10,
              fb: 'PARTS-CANNON. Starter is $300+. 80% of "rapid click" no-starts are battery, especially in Maine cold.' },
            { id: 'c', label: 'Tow to dealer', score: -5,
              fb: 'WASTEFUL. This is a 5-minute roadside diagnosis on a customer driveway.' }
          ] },
        { id: 's2', prompt: 'Battery reads 11.6V resting. What now?',
          choices: [
            { id: 'a', label: 'Try a jump start. If it fires, battery confirmed weak.', score: 10,
              fb: 'CORRECT. The jump-start test confirms battery vs starter. Free.' },
            { id: 'b', label: 'Replace battery without jumping', score: 5,
              fb: 'OK. 11.6V is below minimum cranking. New battery is likely the fix. But the jump test verifies + might save customer the cost if alternator killed it.' },
            { id: 'c', label: 'Charge battery overnight', score: 5,
              fb: 'OK if customer can wait. But a 7-year-old battery at 11.6V resting is end-of-life regardless.' }
          ] },
        { id: 's3', prompt: 'Jump fires the engine. What\'s your next test?',
          choices: [
            { id: 'a', label: 'Multimeter on battery, engine running. Should read 13.8-14.7V.', score: 10,
              fb: 'CORRECT. Verifies the alternator. If charging is good, battery alone is the fix. If charging is bad, new battery dies in days.' },
            { id: 'b', label: 'Recommend new battery, send customer on their way', score: 0,
              fb: 'INCOMPLETE. New battery may die again if alternator is the root cause.' },
            { id: 'c', label: 'Call it fixed — engine running', score: -5,
              fb: 'NO. Customer will be back tomorrow. The jump only got it started; the real cause hasn\'t been confirmed.' }
          ] },
        { id: 's4', prompt: 'Charging voltage reads 14.2V running. What\'s the diagnosis?',
          choices: [
            { id: 'a', label: 'Battery end-of-life. Alternator healthy. Replace battery + clean terminals.', score: 10,
              fb: 'CORRECT. Single-component fix: ~$150 battery + 30 min labor. Maine cold + age killed the battery, alternator is fine.' },
            { id: 'b', label: 'Alternator borderline — replace too', score: -5,
              fb: 'OVERKILL. 14.2V is squarely in spec (13.8-14.7V).' },
            { id: 'c', label: 'Recommend full electrical-system overhaul', score: -10,
              fb: 'PARTS-CANNON. Customer leaves shop angry. Diagnose to fix, not to upsell.' }
          ] }
      ],
      truth: 'Original-equipment battery died at year 7. Maine winter cranking load killed it. New AGM battery + cleaned posts; verified 13.8V at idle and 14.4V at 1500 RPM. ~$165 + 30 min.'
    },
    {
      id: 'lab-brakes', name: 'Brake pedal pulses', icon: '🛑', difficulty: 2,
      intro: 'Customer: "Pedal shakes hard when I brake from highway speed. Started after winter — fine in spring."',
      car: { year: 2011, make: 'Subaru', model: 'Forester', engine: '2.5L H4', mileage: 142000, history: 'Sat through winter mostly unused' },
      symptoms: ['Pedal pulses when braking from speed', 'No noise at light braking', 'Steering wheel shimmies during brake'],
      steps: [
        { id: 's1', prompt: 'First diagnostic move?',
          choices: [
            { id: 'a', label: 'Test drive: light + hard braking from 25 + 60 mph. Note when pulse starts.', score: 10,
              fb: 'CORRECT. Confirms symptom + narrows to which axle. Speed-dependent pulse usually = warped front rotors.' },
            { id: 'b', label: 'Replace front pads + rotors immediately', score: 0,
              fb: 'PROBABLY RIGHT but unverified. Pulse = rotor issue 90% of the time, but verify before quoting.' },
            { id: 'c', label: 'Quote a $1500 brake job sight-unseen', score: -10,
              fb: 'NO. Customer has lost trust before you started. Diagnose first.' }
          ] },
        { id: 's2', prompt: 'Test drive confirmed: pulse starts at 50+ mph hard braking, steering shimmies. Lift the car. What now?',
          choices: [
            { id: 'a', label: 'Visual + dial-indicator check on each rotor for runout. Measure rotor thickness.', score: 10,
              fb: 'CORRECT. Confirms warp/runout numerically. Thickness measurement tells you if rotors can be machined or must be replaced.' },
            { id: 'b', label: 'Pull front wheels and call it warped without measuring', score: 5,
              fb: 'OK. Visual confirmation is informative but a dial indicator gives you proof for the customer + decides resurface vs replace.' },
            { id: 'c', label: 'Skip inspection, replace rotors as a precaution', score: -5,
              fb: 'WASTEFUL. Maybe one rotor is fine. Maybe both are below minimum (= replace). Measurement is free.' }
          ] },
        { id: 's3', prompt: 'Front rotors: left has 0.020" runout (out of spec); right has 0.005" (in spec). Maine: car sat outside all winter. What\'s the cause?',
          choices: [
            { id: 'a', label: 'Rust pitting from sitting in salt + moisture. Rotor surface uneven now.', score: 10,
              fb: 'CORRECT. Maine reality: cars that sit out develop rust pits on rotor surfaces. Pitting + uneven brake-pad bed-in = pulse.' },
            { id: 'b', label: 'Rotor warped from heat (long downhills)', score: 5,
              fb: 'POSSIBLE but unlikely on a Subaru that sat all winter. Heat warp shows up after hard use, not after sitting.' },
            { id: 'c', label: 'Manufacturer defect', score: -5,
              fb: 'UNLIKELY at 142K miles. Manufacturing defect would have shown years ago.' }
          ] },
        { id: 's4', prompt: 'What\'s the right repair?',
          choices: [
            { id: 'a', label: 'Replace both front rotors + pads. Old pads ground onto pitted rotor; new pads on resurfaced or new rotors.', score: 10,
              fb: 'CORRECT. Pads + rotors as a pair on the front axle. Maine extra: brake-line check (rust seizing bleeders) before disassembly.' },
            { id: 'b', label: 'Replace warped rotor only', score: -5,
              fb: 'NO. Rotors must be replaced as a pair on each axle so braking is balanced. Pads should also be replaced.' },
            { id: 'c', label: 'Resurface rotors only, keep old pads', score: -5,
              fb: 'NO. The old pads are bedded into the pitted surfaces. New rotor + old pad = squeal + uneven wear.' }
          ] }
      ],
      truth: 'Front rotor pitting from sat-out winter in salt. Replaced both front rotors + pads. Brake-line bleeders held intact (lucky). Test-drive confirmed smooth pedal at all speeds. ~$220 parts + 2 hr labor.'
    },
    {
      id: 'lab-overheat', name: 'Overheating in traffic', icon: '🌡️', difficulty: 3,
      intro: 'Customer: "Temp gauge climbs to red when stopped at lights, drops when I start moving. Highway is fine."',
      car: { year: 2008, make: 'Honda', model: 'Civic', engine: '1.8L I4', mileage: 187000, history: 'Coolant changed once 5 years ago' },
      symptoms: ['Overheats at idle / in traffic', 'Cools down at highway speed', 'Coolant level full', 'No visible leaks'],
      steps: [
        { id: 's1', prompt: 'The "overheats at idle, fine at speed" pattern is classic for what?',
          choices: [
            { id: 'a', label: 'Cooling fan failure — fan replaces airflow when ram-air at speed isn\'t there', score: 10,
              fb: 'CORRECT. Highway = ram-air. Idle/traffic = fan must engage. No fan = overheat at low speed.' },
            { id: 'b', label: 'Head gasket failure', score: -5,
              fb: 'WRONG pattern. Head gasket would overheat under load. This pattern is fan/airflow.' },
            { id: 'c', label: 'Low coolant', score: -5,
              fb: 'WRONG. Customer says coolant level is full. And low coolant overheats anytime, not pattern-specific.' }
          ] },
        { id: 's2', prompt: 'Confirm the diagnosis. What\'s the test?',
          choices: [
            { id: 'a', label: 'Engine warm + idling. Watch fan. Should engage around 200°F. Turn AC on — fan should engage immediately.', score: 10,
              fb: 'CORRECT. The two simple tests: temp threshold + AC threshold. If fan never engages, you\'ve confirmed the fault.' },
            { id: 'b', label: 'Replace fan motor immediately', score: 0,
              fb: 'PARTS-CANNON. Could be fuse, relay, sensor, or motor. Cheap fixes first.' },
            { id: 'c', label: 'Pressure-test the cooling system', score: 0,
              fb: 'NOT WRONG but not the diagnostic for this symptom. Pressure test finds leaks; this isn\'t a leak issue.' }
          ] },
        { id: 's3', prompt: 'Fan never engages — even with AC on. What do you check FIRST?',
          choices: [
            { id: 'a', label: 'Fan-circuit fuse + relay (cheapest, fastest)', score: 10,
              fb: 'CORRECT. Always check fuse before relay before motor before sensor. $1 fuse vs $200 fan motor.' },
            { id: 'b', label: 'Replace the fan motor', score: -5,
              fb: 'PREMATURE. Motor is the most expensive failure point. Test cheaper components first.' },
            { id: 'c', label: 'Replace the engine coolant temp sensor', score: 0,
              fb: 'POSSIBLE but unlikely. Sensor would also throw a P-code. Not first move.' }
          ] },
        { id: 's4', prompt: 'Fuse is fine. Relay tests bad (no click when 12V applied to coil). Solution?',
          choices: [
            { id: 'a', label: 'Replace fan relay ($15 + 5 min). Verify fan now engages at temp + with AC.', score: 10,
              fb: 'CORRECT. Cheapest fix in the repair manual. Always verify after the swap.' },
            { id: 'b', label: 'Recommend new fan motor anyway', score: -5,
              fb: 'PARTS-CANNON. Relay is the proven fault. Adding parts you don\'t need erodes trust.' },
            { id: 'c', label: 'Bypass the relay with a hardwire', score: -10,
              fb: 'NEVER. The relay\'s job is to control fan only when needed. Hardwiring runs fan continuously, drains battery, may damage fan.' }
          ] }
      ],
      truth: 'Cooling fan relay failure. Replaced relay (~$12 + 5 min). Confirmed fan engages at 200°F + immediately when AC is on. Customer waited 30 min, paid $80 (relay + diag).'
    },
    {
      id: 'lab-noise', name: 'Hum at speed', icon: '🎵', difficulty: 2,
      intro: 'Customer: "Humming sound that gets louder above 40 mph. Worse turning right than left."',
      car: { year: 2015, make: 'Chevrolet', model: 'Silverado 1500', engine: '5.3L V8', mileage: 165000, history: 'Tow vehicle, used hard' },
      symptoms: ['Hum starts ~40 mph, louder at higher speed', 'Louder turning RIGHT, quieter turning LEFT', 'Can feel slight vibration through steering'],
      steps: [
        { id: 's1', prompt: 'Right-turn-louder + left-turn-quieter tells you what?',
          choices: [
            { id: 'a', label: 'LEFT bearing failing — load shifts onto it in a right turn (amplifying hum)', score: 10,
              fb: 'CORRECT. In a right turn, weight shifts to the LEFT (outside) wheel. Loaded bad bearing = louder hum.' },
            { id: 'b', label: 'RIGHT bearing failing — symptom side', score: -10,
              fb: 'WRONG (and a common mistake). The QUIETER side has the bad bearing — turning unloads it.' },
            { id: 'c', label: 'Could be either — needs more testing', score: 0,
              fb: 'PARTIAL. The turn-test IS the more-testing. The pattern points to LEFT.' }
          ] },
        { id: 's2', prompt: 'What\'s the verification test before quoting?',
          choices: [
            { id: 'a', label: 'Lift LEFT front wheel. Spin by hand. Listen + feel for grinding. Grab top + bottom and rock for play.', score: 10,
              fb: 'CORRECT. Both checks are diagnostic: rumble = bearing wear; play = bearing failure. Free.' },
            { id: 'b', label: 'Quote a bearing replacement based on the road test alone', score: 5,
              fb: 'PROBABLY RIGHT but unverified. Verification takes 5 minutes; saves an embarrassing wrong-side replacement.' },
            { id: 'c', label: 'Replace BOTH front bearings as a precaution', score: -5,
              fb: 'OVERKILL. The other side is fine. Customer pays double for guesswork.' }
          ] },
        { id: 's3', prompt: 'LEFT front bearing has audible grinding + perceptible play. Right is silent + tight. Repair plan?',
          choices: [
            { id: 'a', label: 'Replace LEFT front hub assembly only. Torque axle nut + lug nuts to spec. Test drive.', score: 10,
              fb: 'CORRECT. On 2014+ Silverado, hub assembly is bolt-in (4 bolts behind the rotor). Bearing alone isn\'t serviceable.' },
            { id: 'b', label: 'Press-in service: replace just the bearing in the existing hub', score: -5,
              fb: 'WRONG MODEL. This Silverado uses a sealed hub assembly, not press-in. Pressing wastes hours.' },
            { id: 'c', label: 'Adjust bearing preload', score: -10,
              fb: 'OBSOLETE. Sealed bearings have no adjustment. Preload-adjustable bearings haven\'t been on common vehicles for 20+ years.' }
          ] }
      ],
      truth: 'Left front wheel bearing failed (truck used hard for towing). Replaced left front hub assembly. Verified hum gone at 60 mph + same volume turning both directions. ~$280 parts + 1.5 hr labor.'
    },
    {
      id: 'lab-leak', name: 'Sweet smell + low coolant', icon: '💧', difficulty: 4,
      intro: 'Customer: "Sweet smell inside the car when the heat is on. Coolant level keeps dropping. No puddle in driveway."',
      car: { year: 2010, make: 'Hyundai', model: 'Sonata', engine: '2.4L I4', mileage: 155000, history: 'Heater core never serviced' },
      symptoms: ['Sweet smell inside cabin (especially heat on)', 'Coolant level drops 1/4 reservoir / week', 'No external coolant puddle', 'Passenger floor mat slightly damp'],
      steps: [
        { id: 's1', prompt: 'Sweet smell inside + dropping coolant + no external leak = WHERE is the leak?',
          choices: [
            { id: 'a', label: 'Heater core — leaks INSIDE the cabin so no driveway puddle', score: 10,
              fb: 'CORRECT. Sweet smell = ethylene glycol vaporizing into cabin. Wet passenger carpet confirms it.' },
            { id: 'b', label: 'Head gasket', score: -5,
              fb: 'WRONG MECHANISM. Head gasket = milky oil, white smoke from exhaust, or coolant in oil. Not sweet smell in cabin.' },
            { id: 'c', label: 'External hose leak', score: -5,
              fb: 'NO. Customer reports no driveway puddle. External leak would leave one.' }
          ] },
        { id: 's2', prompt: 'Heater core access on this Sonata is...?',
          choices: [
            { id: 'a', label: 'Behind the dashboard. Full dash removal required to reach.', score: 10,
              fb: 'CORRECT. Heater core lives in the HVAC box behind the dash on virtually every modern car. Major labor.' },
            { id: 'b', label: 'Under the hood, easy access', score: -5,
              fb: 'WRONG. The lines TO the heater core go through the firewall but the core itself is inside the dash.' },
            { id: 'c', label: 'In the engine bay near the firewall', score: -5,
              fb: 'PARTIAL — the connections are there, but the core is behind the dash.' }
          ] },
        { id: 's3', prompt: 'Quote labor: factory says 6.5 hours. Customer asks "is there a cheap workaround?"',
          choices: [
            { id: 'a', label: 'Bypass the heater core (loop the inlet + outlet hoses under the hood). NO heat in winter, but stops the leak. Temporary measure only — Maine winter without heat is dangerous.', score: 10,
              fb: 'CORRECT. Honest answer. The bypass exists, has real downsides, and the customer needs to know both.' },
            { id: 'b', label: 'No workaround — must do full repair', score: 5,
              fb: 'TRUE-ISH but incomplete. The bypass is real and sometimes the right call (older car, summer, planning to scrap).' },
            { id: 'c', label: 'Use stop-leak chemicals', score: -5,
              fb: 'BAD ADVICE. Stop-leak can clog radiator + heater passages. Common reason a $50 hack turns into a $2000 cooling-system replacement.' }
          ] },
        { id: 's4', prompt: 'Customer chooses full repair. What part do you also replace while in there?',
          choices: [
            { id: 'a', label: 'New heater core, hoses, and the blower motor (it\'s right there + cheap insurance)', score: 10,
              fb: 'CORRECT. While you\'re in the dash, components that share access get serviced. "While you\'re in there" doctrine.' },
            { id: 'b', label: 'Heater core only', score: 5,
              fb: 'OK. But blower motor + cabin air filter housing are typically serviced same labor.' },
            { id: 'c', label: 'Replace the entire HVAC assembly', score: -5,
              fb: 'OVERKILL. The HVAC box itself rarely fails. Replace the components that wear, not the whole assembly.' }
          ] }
      ],
      truth: 'Heater core leak (typical at this mileage on this engine). Full dash-out repair: replaced heater core + hoses + blower motor + cabin filter. 7 hours labor. ~$200 parts + $700 labor. Customer learned: sweet smell + cabin moisture = heater core, not head gasket.'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 9.92: VIN DECODER — parse a 17-char VIN, cross-link recall + history
  // VIN structure (since 1981):
  //   chars 1-3: World Manufacturer Identifier (country + maker)
  //   chars 4-8: Vehicle Descriptor Section (model, body, engine)
  //   char 9:    check digit
  //   char 10:   model year
  //   char 11:   plant code
  //   chars 12-17: serial number
  // ─────────────────────────────────────────────────────────
  var VIN_COUNTRY = {
    '1': 'United States', '4': 'United States', '5': 'United States',
    '2': 'Canada', '3': 'Mexico',
    'J': 'Japan', 'K': 'South Korea',
    'L': 'China', 'V': 'France',
    'W': 'Germany', 'S': 'United Kingdom',
    'Y': 'Sweden / Finland', 'Z': 'Italy'
  };
  var VIN_MAKER = {
    '1G': 'General Motors (US)', '1C': 'Chrysler (US)', '1F': 'Ford (US)',
    '1H': 'Honda (US plant)', '1N': 'Nissan (US plant)',
    '4T': 'Toyota (US plant)', '5N': 'Hyundai (US plant)', '5Y': 'Mazda (US plant)',
    '2G': 'GM (Canada)', '2T': 'Toyota (Canada)', '2H': 'Honda (Canada)',
    'JH': 'Honda (Japan)', 'JT': 'Toyota (Japan)', 'JN': 'Nissan (Japan)',
    'JF': 'Subaru (Japan)', 'JM': 'Mazda (Japan)',
    'KM': 'Hyundai (Korea)', 'KN': 'Kia (Korea)',
    'WB': 'BMW (Germany)', 'WD': 'Mercedes-Benz (Germany)', 'WV': 'Volkswagen (Germany)',
    'WP': 'Porsche (Germany)', 'WA': 'Audi (Germany)',
    'YV': 'Volvo (Sweden)', 'ZF': 'Ferrari (Italy)', 'ZA': 'Alfa Romeo (Italy)'
  };
  var VIN_YEAR = {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016,
    'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023,
    'R': 2024, 'S': 2025, 'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029, 'Y': 2030,
    '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005, '6': 2006, '7': 2007,
    '8': 2008, '9': 2009
  };

  function decodeVin(vin) {
    if (!vin || vin.length !== 17) return { error: 'VIN must be exactly 17 characters.' };
    var v = vin.toUpperCase().replace(/[IOQ]/g, '');
    if (v.length !== 17) return { error: 'VINs cannot contain I, O, or Q (avoids confusion with 1, 0, Q). Re-check your VIN.' };
    var c1 = v[0];
    var c12 = v.substring(0, 2);
    var c10 = v[9];
    var c11 = v[10];
    var country = VIN_COUNTRY[c1] || 'Unknown country';
    var maker = VIN_MAKER[c12] || 'Manufacturer not in this lookup (' + c12 + ')';
    var year = VIN_YEAR[c10] || 'Unknown year (' + c10 + ')';
    var serial = v.substring(11);
    return {
      vin: v, country: country, maker: maker, year: year,
      plant: 'Plant code: ' + c11 + ' (manufacturer-specific)',
      serial: 'Serial #: ' + serial,
      check: 'Check digit: ' + v[8]
    };
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 9.93: MAINTENANCE SCHEDULE BUILDER — input year/mileage → upcoming items
  // Generic OEM-agnostic schedule. Vehicle-specific is in owner\'s manual.
  // ─────────────────────────────────────────────────────────
  var MAINT_INTERVALS = [
    { item: 'Engine oil + filter', miles: 5000, months: 6, severity: 'standard',
      note: 'Synthetic full-flow filter. Maine winter short-trip drivers: closer to 3,000 if you only drive short distances.' },
    { item: 'Tire rotation', miles: 5000, months: 6, severity: 'standard',
      note: 'Free at the shop where you bought tires. DIY in 30 min with jack + stands + torque wrench.' },
    { item: 'Tire pressure check', miles: 0, months: 1, severity: 'standard',
      note: 'Monthly. Cold pressure drops ~1 psi per 10°F drop.' },
    { item: 'Cabin air filter', miles: 15000, months: 12, severity: 'low',
      note: 'DIY $15 + 5 min. Replace more often if you drive dusty roads or have pollen allergies.' },
    { item: 'Engine air filter', miles: 30000, months: 24, severity: 'low',
      note: 'DIY $20 + 5 min.' },
    { item: 'Brake fluid flush', miles: 30000, months: 36, severity: 'standard',
      note: 'Maine humidity: every 2 years not 3. Brake fluid absorbs water + corrodes ABS.' },
    { item: 'Transmission fluid (drain + fill)', miles: 60000, months: 60, severity: 'standard',
      note: 'Drain-and-fill is safer than machine-flush on high-mileage cars (>100K with no service history).' },
    { item: 'Coolant flush', miles: 60000, months: 60, severity: 'standard',
      note: 'Match OEM coolant chemistry (HOAT/OAT/IAT). Pre-mixed 50/50 is foolproof.' },
    { item: 'Spark plugs (iridium)', miles: 100000, months: 0, severity: 'standard',
      note: 'Verify gap on new plugs. Anti-seize on threads. Torque to spec.' },
    { item: 'Spark plugs (copper)', miles: 30000, months: 0, severity: 'standard',
      note: 'Older cars only. Modern vehicles use iridium.' },
    { item: 'Timing belt (if equipped)', miles: 100000, months: 0, severity: 'critical',
      note: 'CHECK if your engine has a belt or chain. Belt: replace per OEM. Chain: usually lifetime.' },
    { item: 'Battery test', miles: 0, months: 12, severity: 'standard',
      note: 'Annually in October — Maine cold doubles the load. Free at parts stores.' },
    { item: 'Wiper blades', miles: 0, months: 6, severity: 'low',
      note: 'Twice a year (spring + fall). Maine: winter blades October to April.' },
    { item: 'Maine state inspection', miles: 0, months: 12, severity: 'critical',
      note: 'Required annually ($12.50). 60 days to repair after a fail.' },
    { item: 'Serpentine belt', miles: 60000, months: 60, severity: 'standard',
      note: 'Inspect for cracks every oil change. Replace at OEM interval or if visibly aged.' },
    { item: 'Fuel filter (in-tank)', miles: 100000, months: 0, severity: 'low',
      note: 'Modern in-tank filters often lifetime. Older external filters every 30K-60K.' },
    { item: 'Wheel alignment', miles: 0, months: 12, severity: 'standard',
      note: 'After hitting a curb, suspension work, or annually as preventive. Check tire wear pattern.' }
  ];

  function buildMaintSchedule(currentMiles, monthsSinceLastService, vehicleYear) {
    var currentYear = new Date().getFullYear();
    var vehicleAge = vehicleYear ? (currentYear - vehicleYear) : 0;
    var upcoming = MAINT_INTERVALS.map(function(m) {
      var milesUntil = null;
      if (m.miles > 0) {
        var nextMileMark = Math.ceil(currentMiles / m.miles) * m.miles;
        if (nextMileMark === currentMiles) nextMileMark += m.miles;
        milesUntil = nextMileMark - currentMiles;
      }
      var monthsUntil = null;
      if (m.months > 0) {
        monthsUntil = Math.max(0, m.months - monthsSinceLastService);
      }
      var status;
      if (m.miles > 0 && currentMiles >= m.miles && currentMiles % m.miles < (m.miles * 0.1)) status = 'overdue-miles';
      else if (m.months > 0 && monthsSinceLastService >= m.months) status = 'overdue-time';
      else if (milesUntil !== null && milesUntil < 1500) status = 'soon-miles';
      else if (monthsUntil !== null && monthsUntil < 2) status = 'soon-time';
      else status = 'ok';
      return Object.assign({}, m, { milesUntil: milesUntil, monthsUntil: monthsUntil, status: status, vehicleAge: vehicleAge });
    });
    return upcoming;
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 9.94: COMMON SCAMS — what unscrupulous shops do + how to push back
  // Maine consumer protection law: written estimate required, old parts on
  // request, itemized invoice, can't exceed estimate by >10% without re-auth.
  // ─────────────────────────────────────────────────────────
  var SCAMS = [
    { id: 'overnight-hostage', icon: '🔒', name: 'Overnight hostage',
      pitch: '"We need to keep it overnight to run more tests" with no specific reason.',
      truth: 'A shop that can\'t finish or articulate next steps in a same-day window is sometimes stalling to inflate the bill — or to discover problems you didn\'t come in for.',
      askFor: 'Ask: "What specific test do you need to run that requires the car to stay?" and "What\'s your written estimate for that test?"',
      doNow: 'You can take possession of your car at any time. If they refuse to release it without payment for unauthorized work, that\'s mechanic\'s lien territory — Maine AG.' },
    { id: 'phantom-cv', icon: '🦴', name: 'Phantom CV joint click',
      pitch: '"Your CV joints are clicking" — usually shown by a tech who tilts a half-shaft on a workbench (not yours).',
      truth: 'CV joints make a distinctive click ONLY in tight low-speed turns. If your car doesn\'t click in turns, your CV joints are fine. Some shops keep a damaged half-shaft as a prop.',
      askFor: 'Ask: "Can you show me the symptom on MY car? I want to drive in a tight circle and listen."',
      doNow: 'Drive in a parking lot, full lock both directions. No click = no CV failure. Get a second opinion if pushed.' },
    { id: 'fake-evap', icon: '💨', name: 'Fake EVAP leak quote',
      pitch: '"You have a P0455 EVAP code — the smoke test is $150 and the repair is $400."',
      truth: 'P0455 (large EVAP leak) is most often a loose gas cap. Tightening to 3 clicks + 2-3 drive cycles often clears the code. The smoke test is real, but it\'s a step 2 — never step 1.',
      askFor: 'Ask: "Did you tighten the gas cap and drive it 50 miles before quoting the smoke test?"',
      doNow: 'Tighten your own gas cap. Drive 50+ miles. Have codes re-read free at a parts store. If still showing, then smoke test is reasonable.' },
    { id: 'lifetime-align', icon: '📐', name: 'Lifetime alignment packages',
      pitch: '"Buy our lifetime alignment for $200 — alignments forever!"',
      truth: 'Most cars need an alignment every 2-3 years OR after suspension work. Math: $200 buys ~2.5 alignments at $80 each. Worth it ONLY if you do a lot of suspension work or tend to hit curbs. Most people don\'t recoup it.',
      askFor: 'Ask: "How many alignments per year does your average customer get?" The honest answer is 0.5 (every 2 years).',
      doNow: 'Skip lifetime packages unless you ALSO bought tires there + plan to keep the car 5+ years.' },
    { id: 'synth-markup', icon: '🛢️', name: 'Synthetic oil at extreme markup',
      pitch: '"Full synthetic oil change — $99" for a 5-quart car.',
      truth: 'Bulk synthetic oil is $4-7/quart. 5 quarts + $10 filter + 30 min labor = $50-70 fair shop price. $99+ is dealer-tier on a non-dealer vehicle.',
      askFor: 'Ask: "What\'s the breakdown — oil, filter, labor?" Itemized invoice is your right in Maine.',
      doNow: 'DIY at $30-50 saves the labor. Or shop around — Walmart auto, Jiffy Lube, indep shops are typically $50-75 for synthetic.' },
    { id: 'brake-flush-upsell', icon: '🛑', name: 'Brake-flush upsell on every visit',
      pitch: '"Your brake fluid is dark — you need a flush, $150."',
      truth: 'Brake fluid darkens slowly. Once every 2-3 years (Maine humidity) is the right interval. If you flushed it last year and the shop is recommending it again, that\'s the upsell.',
      askFor: 'Ask: "When was the last brake-fluid flush done? What\'s the moisture content read on a tester?"',
      doNow: 'Brake-fluid moisture tester strips $5 — DIY check before authorizing. If <2% moisture, fluid is fine.' },
    { id: 'battery-cable', icon: '🔌', name: '"Battery cable cleaning" service',
      pitch: '"Your battery terminals are corroded — we can clean them for $80."',
      truth: '$5 worth of baking soda water + a wire brush + 10 minutes of work. Some shops bill 0.5 hours labor for this.',
      askFor: 'Ask: "Can I buy the parts and have a technician show me how to do it once? I\'ll handle it after that."',
      doNow: 'DIY: disconnect negative first. Mix baking soda + water. Apply to terminals. Wire-brush. Rinse. Re-connect (positive first). $5 + 10 min.' },
    { id: 'engine-flush-old', icon: '🌀', name: 'Engine flush on high-mileage cars',
      pitch: '"Your engine has 130K miles and never had a flush — we recommend it for $80."',
      truth: 'Engine flushes use aggressive solvents. On older engines with built-up sludge, the flush can DISLODGE chunks that clog oil passages — turning a $0 problem into a $3000 engine. Most OEMs do not recommend.',
      askFor: 'Ask: "Where in my owner\'s manual does the manufacturer recommend an engine flush?" Almost no manuals do.',
      doNow: 'Decline. If you want sludge prevention, just stick to OEM oil-change intervals. High-mileage oil formulations have detergents that work over thousands of miles, gently.' },
    { id: 'ac-recharge-no-leak', icon: '❄️', name: 'A/C recharge without leak repair',
      pitch: '"Your A/C is low on refrigerant — recharge for $150."',
      truth: 'A/C is a SEALED system. If it\'s low, there\'s a LEAK. Recharging without finding the leak just sends $150 of refrigerant into the atmosphere over the next 6 months — illegal under EPA Section 608 + a violation if you knew.',
      askFor: 'Ask: "Did you find the leak? What\'s your dye-test or smoke-test result?"',
      doNow: 'Refuse a recharge-only quote. The shop should find + fix the leak first OR be upfront that the recharge is a temporary 6-month patch.' },
    { id: 'computer-reset', icon: '💻', name: '"ECU relearn / computer reset" for $80',
      pitch: '"After your battery replacement, we need to relearn the computer for $80."',
      truth: 'Most cars relearn automatically after 50-100 miles of normal driving. A few specific vehicles (some VW, Audi, BMW) genuinely need a scan-tool relearn. For most cars, the shop is selling air.',
      askFor: 'Ask: "Does my specific vehicle require a scan-tool relearn? Where in the service manual is that procedure?"',
      doNow: 'Drive normally for a week. If the engine doesn\'t learn (rough idle persists), THEN authorize the procedure on confirmed-needed vehicles only.' },
    { id: 'warped-just-dirty', icon: '🛞', name: 'Rotor "warp" that\'s just rust',
      pitch: '"Your rotors are warped — we need to replace both fronts and the pads, $400."',
      truth: 'Many "warped" rotor diagnoses on Maine cars are actually rust-pitting from sitting. After a few aggressive brake applications, surface rust burns off and the pulse goes away.',
      askFor: 'Ask: "Did you measure runout with a dial indicator? What\'s the number?" Real warp is >0.005" runout. Surface rust shows no runout but pulses anyway.',
      doNow: 'Drive your car aggressively-but-safely 5-10 brake-from-50mph stops on an empty road. Often the pulse clears. If not, then rotors need work.' },
    { id: 'tow-hostage', icon: '🚛', name: 'Tow-truck hostage scenario',
      pitch: 'A "helpful" tow truck pulls up to your breakdown without you calling. They\'re willing to tow you to "their preferred shop."',
      truth: 'Some predatory tow operators have arrangements with shops. They tow you, the shop charges 2-3x going rates, and the tow operator gets a kickback. Maine law: you have the right to choose your shop.',
      askFor: 'Ask the tow operator: "Whose customer am I?" and "Can you tow me to [your chosen shop]?" Refuse if they pressure you.',
      doNow: 'Always call YOUR roadside service (AAA, insurance, or known tow company) FIRST. Decline uninvited tows even if they\'re convenient.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 9.95: DAMAGE ID GAME — described visual patterns, scored
  // 12 cases of "what does this look like + what is it + what to do."
  // Each case: visual description + 3 multi-choice questions (part / cause /
  // severity). Builds pattern recognition.
  // ─────────────────────────────────────────────────────────
  var DAMAGE_CASES = [
    { id: 'd1', visual: '🛢️ Black, sticky residue dripping from above the oil filter, running down the side of the engine block. Low oil level on dipstick.',
      part: { q: 'What\'s leaking?', a: ['Coolant', 'Oil', 'Transmission fluid', 'Brake fluid'], correct: 1 },
      cause: { q: 'Most likely cause?', a: ['Gas-cap loose', 'Valve cover gasket failure (oil leaking down from above)', 'Head gasket', 'Worn tires'], correct: 1 },
      sev: { q: 'How urgent?', a: ['Drive normally — small leak', 'Top off oil + plan repair within 30 days; check level weekly', 'Stop driving', 'No action needed'], correct: 1 } },
    { id: 'd2', visual: '🛞 Rotor with a sharp raised ridge around the outer edge (where the pad doesn\'t reach) — about 3/16" tall ridge. Friction surface looks heat-blued.',
      part: { q: 'What part is this?', a: ['Brake rotor', 'Wheel hub', 'Engine flywheel', 'Brake caliper'], correct: 0 },
      cause: { q: 'What does the ridge tell you?', a: ['New rotor', 'Rotor has worn down significantly + heat-cycled — replace, not resurface', 'Manufacturing defect', 'Tire pressure issue'], correct: 1 },
      sev: { q: 'Action?', a: ['Resurface and reuse', 'Replace + new pads (heat-blued surface won\'t bed in pads correctly)', 'Drive 10K more miles', 'Add brake fluid'], correct: 1 } },
    { id: 'd3', visual: '🛞 Tire with the INSIDE edge worn down to the wear bars while the outside still has good tread. Tread looks feathered.',
      part: { q: 'What\'s this called?', a: ['Centerline wear', 'Inside-edge wear with feathering', 'Cupped wear', 'Plug failure'], correct: 1 },
      cause: { q: 'Most likely cause?', a: ['Over-inflation', 'Toe alignment is OUT (pointing too far in or out) — alignment overdue', 'Bad shock', 'Brake fluid leak'], correct: 1 },
      sev: { q: 'Action?', a: ['Wait until outside also wears down', 'Replace tire + 4-wheel alignment within next month', 'Rotate to back', 'Add air'], correct: 1 } },
    { id: 'd4', visual: '🟢 Green crusty deposit forming on the radiator cap, with a slight wet trail down to the upper radiator hose connection.',
      part: { q: 'What system is this?', a: ['Brake', 'Cooling (coolant residue)', 'Fuel', 'Oil'], correct: 1 },
      cause: { q: 'What\'s happening?', a: ['Normal evaporation', 'Coolant slow-leaking + drying — radiator cap or hose-clamp issue', 'Air bubble', 'Brake fluid leak'], correct: 1 },
      sev: { q: 'Action?', a: ['Ignore', 'Pressure-test the cap; tighten or replace cap + clamp; top up coolant; monitor', 'Stop driving', 'Replace engine'], correct: 1 } },
    { id: 'd5', visual: '🔋 Battery terminals with a thick, fluffy white-and-blue powder caked around the post and clamp.',
      part: { q: 'What is this powder?', a: ['Snow', 'Lead-acid battery corrosion (sulfate + air reaction)', 'Anti-freeze', 'Engine oil'], correct: 1 },
      cause: { q: 'What\'s causing it?', a: ['Cold weather only', 'Acid escape from a leaking or aging battery + air exposure', 'Overcharging', 'No specific cause'], correct: 1 },
      sev: { q: 'Action?', a: ['Cosmetic — leave alone', 'Disconnect (negative first), neutralize with baking soda + water, wire-brush, anti-corrosion spray. If recurring, the battery may be leaking — replace.', 'Pour water on it', 'Drive more often'], correct: 1 } },
    { id: 'd6', visual: '🌧️ Wiper blade leaving streaks across the windshield in a 4" gap on the driver-side. Other parts of the sweep are clean.',
      part: { q: 'What\'s wrong with the wiper?', a: ['Motor failure', 'A torn or worn section of the blade rubber', 'Wrong fluid', 'Cracked windshield'], correct: 1 },
      cause: { q: 'Most likely cause?', a: ['Fluid contamination', 'Age + UV + ice cycles tore the rubber', 'Manufacturer defect', 'Cold weather alone'], correct: 1 },
      sev: { q: 'Action?', a: ['Drive carefully', 'Replace blade ($15 + 5 min) — and do the other side too if you haven\'t recently', 'Replace whole arm', 'No action'], correct: 1 } },
    { id: 'd7', visual: '🟤 Engine oil dipstick reading is HIGH (above max) and the oil smells like gasoline.',
      part: { q: 'What\'s the issue?', a: ['Normal — recently changed', 'Fuel diluting the engine oil', 'Coolant in oil', 'Sludge'], correct: 1 },
      cause: { q: 'What causes fuel-diluted oil?', a: ['Cold weather', 'Failed fuel injector dribbling fuel into a cylinder + past the rings into the crankcase. Or excessive cold-start short-trips without full warm-up.', 'Loose oil cap', 'High-mileage'], correct: 1 },
      sev: { q: 'Action?', a: ['Top up to max', 'Diagnose injectors + change oil immediately. Continued operation washes oil from cylinder walls + accelerates engine wear.', 'No action', 'Add detergent'], correct: 1 } },
    { id: 'd8', visual: '🛑 Brake pad worn down to the steel backing plate. Shiny grooves cut into the rotor face.',
      part: { q: 'How worn?', a: ['New', 'Pads have been ground down to STEEL on STEEL — past wear-indicator stage', 'Half-worn', 'No way to tell'], correct: 1 },
      cause: { q: 'How did it get this bad?', a: ['Just one drive', 'Driver ignored squealing wear-indicator for thousands of miles', 'Defective pads', 'Brake fluid issue'], correct: 1 },
      sev: { q: 'Action?', a: ['Resurface + new pads', 'Replace BOTH pads AND rotors (rotor is grooved past wear) + new pads. Maine: brake-line bleeders may be seized at this age.', 'Pads only', 'Drive carefully'], correct: 1 } },
    { id: 'd9', visual: '🔧 Frame rail with thick, flaking, layered rust scaling. Pieces flake off when poked. Visible holes.',
      part: { q: 'What\'s the structural concern?', a: ['Surface rust — paint touch-up will fix', 'Frame perforation — structural integrity compromised', 'Cosmetic only', 'Wax helps'], correct: 1 },
      cause: { q: 'Maine cause?', a: ['Sun', 'Multi-year salt brine + moisture cycling — Maine-classic frame rot', 'Manufacturing', 'Hit a curb'], correct: 1 },
      sev: { q: 'Maine state inspection?', a: ['Pass with notation', 'INSPECTION FAIL — vehicle may be uninspectable; some frame rot is unrepairable + vehicle becomes a total loss', 'Pass', 'Re-inspect'], correct: 1 } },
    { id: 'd10', visual: '⚙️ Serpentine belt with deep cracks across each rib, every 1-2 inches. Rib edges look frayed.',
      part: { q: 'What is this?', a: ['Timing belt', 'Serpentine (accessory) belt', 'V-belt', 'A/C compressor belt'], correct: 1 },
      cause: { q: 'How aged is this belt?', a: ['New', 'End of service life — cracks + frayed edges = imminent failure', 'Mid-life', 'Newly installed wrong'], correct: 1 },
      sev: { q: 'Action?', a: ['Drive 50K more miles', 'Replace belt + tensioner pulley while you\'re in there ($30-60 part + 30-60 min). A snapped serpentine belt strands you (no power steering, no charging, no water pump).', 'Realign it', 'No action'], correct: 1 } },
    { id: 'd11', visual: '💨 Black soot ring around the tip of the exhaust tailpipe — when wiped, leaves a heavy black smudge on the rag.',
      part: { q: 'What is the soot?', a: ['Normal exhaust', 'Excessive carbon = engine running RICH (too much fuel, not enough air)', 'Coolant burning', 'Oil burning (would be blue-tinted, oily)'], correct: 1 },
      cause: { q: 'Likely causes?', a: ['Cold weather only', 'Failing O2 sensor, dirty MAF, leaky fuel injector, or fuel-pressure regulator stuck high', 'New filter', 'No specific cause'], correct: 1 },
      sev: { q: 'Action?', a: ['Drive — it\'ll burn off', 'OBD scan first (often a P0172 rich code). Then clean MAF / replace O2 / fuel-pressure check.', 'Add fuel additive', 'Stop driving'], correct: 1 } },
    { id: 'd12', visual: '🦶 Brake pedal goes nearly to the floor before the car stops. No squealing, no grinding, no pulling.',
      part: { q: 'What system has the issue?', a: ['Brake pads (mechanical)', 'Brake hydraulics (master cylinder, lines, or air)', 'Tires', 'Suspension'], correct: 1 },
      cause: { q: 'Most likely?', a: ['Pads completely worn', 'Air in brake lines (after a recent service?), fluid leak, OR master cylinder bypassing internally', 'Tire pressure', 'Engine issue'], correct: 1 },
      sev: { q: 'Action?', a: ['Drive carefully', 'STOP DRIVING. A failing brake system is a not-driveable safety issue. Check fluid level + look for leaks, then bleed system or replace master cylinder.', 'Add brake fluid + drive', 'No action needed'], correct: 1 } },
    { id: 'd13', visual: '🌀 Front tire with a sidewall bulge the size of a marble, on the inside sidewall.',
      part: { q: 'What does the bulge represent?', a: ['Air pocket from filling', 'Internal cord damage — tire structurally compromised', 'Manufacturer feature', 'Patched plug'], correct: 1 },
      cause: { q: 'Most likely cause?', a: ['Old age', 'Curb hit, pothole hit, or run-flat damage that broke internal cords', 'Over-inflation', 'No specific cause'], correct: 1 },
      sev: { q: 'Action?', a: ['Drive normally', 'REPLACE THE TIRE. A bulged sidewall can blow at any moment — at speed it can cause loss of control.', 'Patch it', 'Lower pressure'], correct: 1 } },
    { id: 'd14', visual: '🛢️ Oil dipstick with a brown FOAM coating. Oil-cap underside has the same foamy residue.',
      part: { q: 'What is this foam?', a: ['Normal', 'Coolant + oil emulsion = "milkshake" oil', 'Old oil', 'Air bubbles'], correct: 1 },
      cause: { q: 'What causes coolant in oil?', a: ['Loose oil cap', 'Failed head gasket OR cracked block OR cracked head', 'Wrong oil type', 'Cold weather only'], correct: 1 },
      sev: { q: 'Action?', a: ['Top up oil + drive carefully', 'STOP DRIVING. Continued operation destroys bearings + crankshaft. Tow to shop. Often $1500-3500 head-gasket job; sometimes total loss.', 'Add stop-leak', 'No action'], correct: 1 } },
    { id: 'd15', visual: '⚡ Spark plug pulled from cyl 3 — electrode is glazed, slightly melted at the tip, with a thin tan deposit.',
      part: { q: 'What\'s the plug telling you?', a: ['Healthy plug', 'Plug ran HOTTER than design — wrong heat range, ignition timing too advanced, or pre-ignition', 'Normal wear', 'Worn from age only'], correct: 1 },
      cause: { q: 'Likely root cause?', a: ['Bad fuel only', 'Lean fuel mixture (not enough fuel) OR knock-controller failure OR vacuum leak on this cylinder', 'Defective plug', 'Cold weather'], correct: 1 },
      sev: { q: 'Action?', a: ['Replace plug, drive on', 'Replace plug AND diagnose root cause — running plugs hot will continue burning new plugs + can damage the piston / valve seats.', 'Adjust gap wider', 'No action'], correct: 1 } }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 9.96: REPAIR ROI CALCULATOR — keep-or-sell decision tool
  // Inputs: vehicle value, repair cost, age (years), mileage, looming issues.
  // Output: rule-based recommendation with reasoning.
  // ─────────────────────────────────────────────────────────
  function repairROI(opts) {
    var vehicleValue = opts.vehicleValue || 0;
    var repairCost = opts.repairCost || 0;
    var age = opts.age || 0;
    var miles = opts.miles || 0;
    var loomingCost = opts.loomingCost || 0;
    var attachment = opts.attachment || 'medium';
    var ratio = vehicleValue > 0 ? (repairCost / vehicleValue) : 999;
    var totalLooming = repairCost + loomingCost;
    var loomingRatio = vehicleValue > 0 ? (totalLooming / vehicleValue) : 999;

    var reasons = [];
    var verdict = 'fix';

    if (ratio > 0.50) {
      verdict = 'consider-selling';
      reasons.push('Repair cost (' + Math.round(ratio * 100) + '% of vehicle value) exceeds the 50% threshold where the math typically favors selling.');
    } else if (ratio > 0.30) {
      verdict = 'fix-cautiously';
      reasons.push('Repair is ' + Math.round(ratio * 100) + '% of vehicle value — high but not yet a deal-breaker. Check if other items are looming.');
    } else {
      reasons.push('Repair is ' + Math.round(ratio * 100) + '% of vehicle value — usually worth fixing.');
    }

    if (loomingRatio > 0.70) {
      verdict = 'consider-selling';
      reasons.push('Total of this repair + looming work (' + Math.round(loomingRatio * 100) + '% of value) tips the math toward selling.');
    } else if (loomingCost > 0) {
      reasons.push('Looming work adds $' + loomingCost + ' on top — total ' + Math.round(loomingRatio * 100) + '% of value.');
    }

    if (age >= 15) {
      reasons.push('Age ' + age + ' years: every repair is closer to "the next thing breaking." Maine salt-state cars at 15+ accelerate downhill.');
      if (verdict === 'fix') verdict = 'fix-cautiously';
    }

    if (miles >= 200000) {
      reasons.push('Mileage ' + miles.toLocaleString() + ': mainstream cars at 200K+ are end-of-design-life. Some makes (Toyota, Honda, certain diesels) go 300K+; many do not.');
      if (verdict === 'fix') verdict = 'fix-cautiously';
    }

    if (attachment === 'high' && verdict === 'consider-selling') {
      reasons.push('You said you\'re emotionally attached. The math says sell, but life isn\'t only math. Just go in eyes-open.');
    }
    if (attachment === 'low' && verdict === 'fix') {
      reasons.push('Low attachment + favorable math = repair is rational. But also a fine moment to upgrade if you wanted to.');
    }

    var summary;
    if (verdict === 'consider-selling') {
      summary = 'Math suggests selling as-is or for parts. Get 2-3 trade-in or junk quotes; compare to (vehicle value − repair cost). If repair cost is more than the difference, sell.';
    } else if (verdict === 'fix-cautiously') {
      summary = 'Repair is borderline. Worth doing IF nothing else is about to break. Get a comprehensive inspection ($80-150) before authorizing.';
    } else {
      summary = 'Math favors repair. Get a written estimate, ask about warranty on parts + labor, and approve.';
    }

    return { verdict: verdict, summary: summary, reasons: reasons, ratio: ratio, loomingRatio: loomingRatio };
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 9.97: SERVICE LOG — let user record their own maintenance history
  // Persists in toolData. Date + odo + service + cost + notes.
  // ─────────────────────────────────────────────────────────
  // Service log entries shape:
  // { id: 'log_<timestamp>', date: 'YYYY-MM-DD', odo: 85432, service: 'Oil + filter', cost: 45, notes: 'Synthetic 0W-20, OEM filter' }

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
      correct: 1, why: 'Frame perforation is an unsafe-vehicle issue. Maine inspection stations have to certify the repair. Some structural rust isn\'t repairable and the car becomes a total loss.' },
    { id: 'q11', icon: '🧤',
      stem: 'You\'re working on a hybrid for the first time. You see ORANGE cables under the hood. What do they tell you?',
      choices: ['Decorative, manufacturer color choice', 'These are 200–800 volt high-voltage lines — DO NOT touch without HV-rated insulated gloves and the proper service-disconnect procedure', 'They\'re for the radio', 'They\'re fuel lines'],
      correct: 1, why: 'Orange = high voltage on every modern hybrid and EV (SAE J1772 standard). Unplanned contact with HV cables can be lethal. Always follow the manufacturer\'s HV-disable procedure first.' },
    { id: 'q12', icon: '🛒',
      stem: 'You\'re looking at a used 2012 Subaru in Maine. The seller has the engine warmed up before you arrive. What should you do?',
      choices: ['Drive it — warm engine drives best', 'Insist on starting it COLD; warm engines hide cold-start knocks, misfires, and smoke', 'Skip the inspection because they prepped the car', 'Trust the seller'],
      correct: 1, why: 'A cold start exposes problems that disappear once warm: bad starter, dead-cylinder misfire, valve-train tick, blue smoke. Sellers who refuse a cold start are hiding something.' },
    { id: 'q13', icon: '🚩',
      stem: 'You magnet-test the rocker panels of a used Maine car. The magnet slides off the lower rocker but sticks to the door above. What does this mean?',
      choices: ['Magnet is broken', 'Lower rocker has filler / fiberglass over rust — body work was done', 'The car was painted recently', 'Normal'],
      correct: 1, why: 'A magnet only sticks to steel. If it slides off the rocker but sticks to the door, the rocker has bondo or fiberglass body filler — usually patching salt-rust. Negotiate or walk.' },
    { id: 'q14', icon: '〰️',
      stem: 'Your check-engine light is FLASHING (blinking on/off, not solid). What\'s the right action?',
      choices: ['Drive normally — flashing is just a warning', 'STOP DRIVING — flashing CEL means severe misfire that can destroy the catalytic converter ($800–2500 to replace)', 'Disconnect the battery to clear it', 'Add fuel additive'],
      correct: 1, why: 'Flashing CEL = severe misfire dumping unburnt fuel into the exhaust. The catalytic converter glows red and can be permanently destroyed in minutes. Stop and tow if necessary.' },
    { id: 'q15', icon: '🌧️',
      stem: 'Your annual Maine inspection is in two days. What\'s a smart pre-walk move?',
      choices: ['Wash the car well', 'Walk around at night, have someone press the brake, cycle every signal/headlight; honk horn; try every seatbelt — bulb / fuse / seatbelt fails are 5-minute fixes', 'Park in a dry garage', 'Add expensive premium fuel'],
      correct: 1, why: 'The most common Maine inspection fails are simple — a burned-out bulb, an empty washer reservoir, a dead horn, a wiper that streaks. 10-minute pre-walk catches most.' },
    { id: 'q16', icon: '💵',
      stem: 'A shop quotes you "engine flush service — $60" during an oil change on a 130,000-mile car. What\'s your move?',
      choices: ['Authorize — preventive maintenance', 'Decline — engine flushes on older engines can DISLODGE built-up sludge and clog oil passages; most OEM service manuals do not recommend it', 'Negotiate to $30', 'Ask for two flushes'],
      correct: 1, why: 'Engine flush is a common upsell. Aggressive solvent on a high-mileage engine with built-up deposits can break loose chunks that clog oil galleries. Most manufacturers do not recommend.' },
    { id: 'q17', icon: '⚡',
      stem: 'EV regenerative braking lets pads last 3–5x longer. What problem does this create in salt-state Maine?',
      choices: ['Pads get too cold', 'Pads + rotors that don\'t get used can corrode (rust onto rotor face); need annual brake-system cleaning + occasional friction-braking', 'Brakes overheat', 'Charging gets slower'],
      correct: 1, why: 'Underused brakes + Maine salt = corrosion between pad and rotor. Periodic aggressive friction braking + annual cleaning keeps EV brakes healthy.' },
    { id: 'q18', icon: '🔍',
      stem: 'Your engine cranks but won\'t fire. You turn the key to ON (not crank) — what do you listen for first?',
      choices: ['Stereo turning on', 'Fuel pump priming whir from the back of the car (~2 seconds)', 'Wipers parking', 'Door chime'],
      correct: 1, why: 'Key-on (not cranking) primes the fuel pump for 2 seconds. No prime = no fuel = no start. This $0 test points to fuel-pump / fuse / relay before you condemn the starter or ignition.' },
    { id: 'q19', icon: '🛑',
      stem: 'You feel pulsing through the brake pedal when stopping. What\'s the most likely cause?',
      choices: ['Worn pads', 'Warped rotors (or rust deposits creating uneven thickness — common in Maine after winter)', 'Soft pedal / air in lines', 'ABS sensor fault'],
      correct: 1, why: 'Pulse in the pedal = uneven rotor thickness. Heat warp from long downhills OR rust pitting from sitting in salt. Resurfacing or replacement is the fix.' },
    { id: 'q20', icon: '🛞',
      stem: 'You hear a hum at speed that gets louder turning LEFT and quieter turning RIGHT. Which side has the bad bearing?',
      choices: ['Left', 'Right (load shifts off it when turning right)', 'Both', 'Front-rear can\'t tell'],
      correct: 1, why: 'In a turn, weight shifts to the OUTSIDE wheel. Turning left loads the right wheel — if right bearing is bad, hum gets louder. Turning right unloads it and quiet.' },
    { id: 'q21', icon: '❄️',
      stem: 'It\'s late October in Maine. Your washer fluid reservoir is full of clear blue summer fluid (freezes at 32°F). What should you do?',
      choices: ['Leave it — it\'ll dilute', 'Spray it out + refill with -30°F (or colder) winter washer fluid; standard fluid freezes and can crack the reservoir', 'Add salt to lower the freeze point', 'Drain it and leave empty for winter'],
      correct: 1, why: 'Frozen washer fluid expands and shatters reservoirs. Maine washer fluid should be rated to at least -30°F. The blue-bottle "winter" fluid is sold at every parts and hardware store starting in October.' },
    { id: 'q22', icon: '🌳',
      stem: 'Your car cranks but won\'t fire. Following the no-start decision tree, what\'s your first FREE diagnostic move?',
      choices: ['Replace the starter', 'Key ON (don\'t crank) and listen for the fuel pump priming whir', 'Replace plugs and coils', 'Tow to dealer'],
      correct: 1, why: 'Fuel-pump prime test costs nothing. No prime = pump or relay or fuse problem. Prime + still no fire = spark issue. Splits the diagnosis in 2 seconds.' },
    { id: 'q23', icon: '💵',
      stem: 'A shop estimate has a separate $150 "shop supplies fee" on a $500 labor job. Is this reasonable?',
      choices: ['Yes — always pay', 'No — shop supplies fees are typically 5–10% of labor; $150 on $500 labor (30%) is excessive', 'Try to negotiate to $200', 'Switch shops immediately'],
      correct: 1, why: 'Shop supplies fee covers rags, brake clean, fluid disposal — typically 5–10% of labor (so ~$25–50 on $500). A 30% fee is a red flag and should be questioned or negotiated.' },
    { id: 'q24', icon: '🚗',
      stem: 'You just bought your first used car in Maine. Within 30 days you must do which of these?',
      choices: ['Repaint it', 'Title transfer at the BMV; switch insurance to your name', 'Replace the engine', 'Buy a tow truck'],
      correct: 1, why: 'Maine law: title transfer within 30 days. Insurance must be active in your name from the moment you drive off the seller\'s lot. Both are legal-not-optional.' },
    { id: 'q25', icon: '🧰',
      stem: 'You\'re a Maine high school junior thinking about an auto-tech career. What\'s the SMARTEST entry?',
      choices: ['Buy a $30K Snap-on tool box on credit before you start', 'Apply to the half-day CTE auto-tech program at Region 9, PATHS, Mid-Coast, or your local school. Earn ASE Student Certifications by graduation.', 'Open your own shop without experience', 'Skip school'],
      correct: 1, why: 'Maine has strong half-day CTE programs that get you to ASE entry-level by graduation. Tool buying comes after you\'re working — start with the basics from a starter-kit allowance, not $30K of debt before earning a paycheck.' },
    { id: 'q26', icon: '🆔',
      stem: 'Which character in a 17-character VIN tells you the model year?',
      choices: ['Character 1', 'Character 10', 'Character 17', 'There\'s no year in the VIN'],
      correct: 1, why: 'VIN char 10 = model year (using a letter+number cycle). Char 1 = country of origin; chars 1-3 = manufacturer; char 9 = checksum; chars 12-17 = serial.' },
    { id: 'q27', icon: '🌳',
      stem: 'In a graded diagnostic scenario, the customer reports a flashing CEL + rough idle. Your highest-scoring first move is...',
      choices: ['Replace all plugs and coils as a precaution', 'Tell them not to drive (cat-damage-in-progress) and pull codes when they leave it', 'Drive the car to "feel" the problem', 'Disconnect the battery to clear the light'],
      correct: 1, why: 'Flashing CEL = severe misfire actively damaging the catalytic converter. Stop driving + diagnose with codes is the highest-scoring path. Throwing parts or driving to "feel it" loses points.' },
    { id: 'q28', icon: '📅',
      stem: 'Your Maine winter brake-fluid flush interval should be...',
      choices: ['Every 10 years', 'Every 2-3 years (Maine humidity accelerates moisture absorption)', 'Never', 'Every oil change'],
      correct: 1, why: 'Brake fluid is hygroscopic — it absorbs atmospheric moisture. Maine humidity shortens the safe interval to 2-3 years (vs 3-5 in dryer climates). Old fluid lowers boiling point + corrodes ABS.' },
    { id: 'q29', icon: '🌐',
      stem: 'You\'re looking up a recall on a friend\'s VIN. Where do you go and what does it cost?',
      choices: ['CarFax — paid', 'NHTSA recalls (nhtsa.gov/recalls) — free; recall repair is also FREE at any dealer', 'Local mechanic — paid', 'Vehicle manual — paid'],
      correct: 1, why: 'NHTSA hosts the official safety-recall database. Free to search by VIN. Recall repair is FREE at any dealer regardless of where you bought the car.' },
    { id: 'q30', icon: '🔧',
      stem: 'You\'re running a diagnostic in the Lab Simulator. A customer\'s no-start has rapid clicking + bright dash lights. What\'s the highest-scoring first test?',
      choices: ['Replace the starter immediately', 'Multimeter on battery posts (engine off) — costs nothing, splits the diagnosis instantly', 'Tow to dealer', 'Jump start it without testing first'],
      correct: 1, why: 'Multimeter test is free + diagnostic. <12.0V = battery is the bottleneck. Throwing parts (starter, alternator) before testing is "parts cannon" thinking — and a low score in any graded scenario.' },
    { id: 'q31', icon: '🚛',
      stem: 'You break down on I-95 in Maine. A tow truck pulls up uninvited and offers to take you to "their preferred shop." What\'s the right move?',
      choices: ['Accept — they\'re here', 'Politely decline; call YOUR roadside service (AAA, insurance, or known tow company); choose your own shop. Maine law gives you the right.', 'Pay them in cash to avoid the bill', 'Get out and run'],
      correct: 1, why: 'Predatory tow operators sometimes work with shops that overcharge. Maine law: you choose your shop. Always call your own roadside provider first.' },
    { id: 'q32', icon: '❄️',
      stem: 'A shop tells you "your A/C is low — recharge for $150." What\'s the right question to ask?',
      choices: ['Can you do it cheaper?', '"Did you find the leak? A/C is a sealed system — if it\'s low, there\'s a leak."', 'Will it last forever?', 'Is the refrigerant green?'],
      correct: 1, why: 'A/C is sealed. Low refrigerant = leak. Recharging without finding the leak just sends $150 of refrigerant into the air over 6 months — illegal under EPA Section 608.' },
    { id: 'q33', icon: '🛞',
      stem: 'You see a tire with the INSIDE edge worn down to the wear bars while the outside still has good tread. What\'s the most likely cause?',
      choices: ['Over-inflation', 'Toe alignment is OUT — wheels pointing too far in or out — overdue for an alignment', 'Bad tire from manufacturer', 'Cold weather'],
      correct: 1, why: 'Inside-edge feathered wear = toe alignment off. After replacing the tire (because it\'s ruined), get a 4-wheel alignment immediately or the new tire wears the same way.' },
    { id: 'q34', icon: '💵',
      stem: 'Your 12-year-old car (worth $4,000) needs a $2,500 transmission rebuild AND has another $1,500 of looming work. ROI math?',
      choices: ['Always repair', 'Repair-cost (62%) + looming (38%) = 100% of car value. Math suggests selling as-is or for parts and replacing the vehicle.', 'Always sell', 'Get the transmission rebuilt then sell'],
      correct: 1, why: '$2500 + $1500 = $4000 on a $4000 car. The 70% threshold rule says consider selling. A pre-purchase inspection on a comparable replacement is a better use of the same money.' },
    { id: 'q35', icon: '🌀',
      stem: 'A shop quotes you "your rotors are warped" but you suspect rust pitting from sitting all winter. What\'s the diagnostic difference?',
      choices: ['Both are the same', 'Real warp shows >0.005" runout on a dial indicator. Rust pitting causes pulse without runout. The fix differs.', 'Warp is more expensive', 'No way to tell'],
      correct: 1, why: 'Real heat-warp = measurable runout. Rust-pitting = no runout but bumpy surface. Rust-pitted rotors sometimes clear up with aggressive bed-in driving; truly warped rotors don\'t.' }
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
          { id: 'firstcar', icon: '🚗', label: 'First car? Start here', desc: 'Just bought your first car. 30-day week-by-week plan: paperwork → fluids → undercarriage → inspection prep.' },
          { id: 'vin', icon: '🆔', label: 'VIN decoder', desc: 'Decode your 17-character VIN — country, manufacturer, year, plant. Free recall + history lookup links.' },
          { id: 'maint', icon: '📅', label: 'Maintenance schedule', desc: 'Personalized schedule from your odometer + last-service date. Shows what\'s overdue, soon, and OK.' },
          { id: 'diagnose', icon: '🔍', label: 'Diagnose', desc: 'OBD-II codes, listening cues, fluid analysis, visual inspection.' },
          { id: 'tree', icon: '🌳', label: 'Decision tree', desc: 'Symptom → likely cause. 6 interactive flowcharts (no-start, misfire, brakes, overheating, charging, steering).' },
          { id: 'lab', icon: '🧪', label: 'Hands-on lab simulator', desc: '6 graded diagnostic scenarios. Customer car presents symptoms; you walk through decision points; get a letter grade + per-choice feedback.' },
          { id: 'repair', icon: '🔧', label: 'Repair scenarios', desc: '12 step-by-step jobs, from oil change + battery to timing belt.' },
          { id: 'tools', icon: '🧰', label: 'Tool selection', desc: 'Pick the right tool for the job. Builds your mental toolkit.' },
          { id: 'safety', icon: '🛡️', label: 'Safety modules', desc: 'Jack stands, electrical, refrigerant, hot exhaust, springs, fluid disposal.' },
          { id: 'inspection', icon: '🌲', label: 'Maine inspection', desc: '8-area pre-walk before your annual sticker. Catch fails BEFORE the station does.' },
          { id: 'cold', icon: '🌨️', label: 'Cold-weather prep', desc: 'October–November Maine winter checklist: battery, tires, coolant, washer fluid, block heater, more.' },
          { id: 'roadside', icon: '🚨', label: 'Roadside emergency', desc: 'Maine winter trunk kit (16 items) + 9-step breakdown response protocol.' },
          { id: 'usedcar', icon: '🛒', label: 'Buying a used car', desc: '10 red flags + 9-step walkaround. Salt-state pre-purchase inspection.' },
          { id: 'estimate', icon: '💵', label: 'Estimate decoder', desc: 'Read a shop quote. Identify standard, DIY-able, and upsell line items.' },
          { id: 'scams', icon: '🚩', label: 'Common scams', desc: '12 known shop scams + how to spot them and what to ask. Maine consumer rights.' },
          { id: 'damage', icon: '🔬', label: 'Damage ID game', desc: '15 visual-pattern cases. Identify part, cause, and severity. Builds tech eye.' },
          { id: 'roi', icon: '💰', label: 'Repair ROI calculator', desc: 'Should I fix it or sell it? Math-based recommendation from value, repair cost, and looming work.' },
          { id: 'log', icon: '📓', label: 'Service log', desc: 'Record your own maintenance history. Date + odometer + service + cost + notes. CSV export.' },
          { id: 'ev', icon: '⚡', label: 'EV / Hybrid', desc: 'High-voltage safety, regen braking, cold-weather range, charging — the future of the trade.' },
          { id: 'glossary', icon: '📖', label: 'Glossary', desc: '50+ essential auto terms. Search and filter by category. So you can read any repair article.' },
          { id: 'career', icon: '🏅', label: 'Career path', desc: 'ASE certification, Maine vocational programs, salary data.' },
          { id: 'shopbiz', icon: '🏪', label: 'Shop business basics', desc: 'Mobile mechanic startup, insurance, tool trucks, pricing, customer acquisition. For future shop owners.' },
          { id: 'quiz', icon: '🧪', label: 'Knowledge quiz', desc: '35 questions covering safety, diagnostics, repair, EV, used-car, inspection, upsells, business, VIN, lab, scams, damage ID, ROI.' },
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
      // DECISION TREE view — interactive symptom → likely cause
      // ─────────────────────────────────────────
      function renderTree() {
        var treeId = d.treeId || null;
        var tree = treeId ? DECISION_TREES[treeId] : null;
        var nodeId = d.treeNode || 'root';
        var path = d.treePath || [];

        function pickTree(id) {
          updMulti({ treeId: id, treeNode: 'root', treePath: [] });
          arAnnounce('Starting decision tree: ' + DECISION_TREES[id].name);
        }
        function selectChoice(choice) {
          var newPath = path.concat([{ from: nodeId, choice: choice.label }]);
          updMulti({ treeNode: choice.next, treePath: newPath });
          arAnnounce('Next question.');
        }
        function reset() {
          updMulti({ treeId: null, treeNode: 'root', treePath: [] });
        }
        function backOneStep() {
          if (path.length === 0) { reset(); return; }
          var newPath = path.slice(0, -1);
          var prev = newPath.length === 0 ? 'root' : path[path.length - 1].from;
          updMulti({ treeNode: prev, treePath: newPath });
        }

        if (!tree) {
          return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
            backBar('🌳 Decision tree'),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🌳 Symptom → likely cause'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                'Active diagnostic reasoning. Pick a symptom; answer 1–3 questions; get a likely cause + verify-it step + DIY/shop verdict. Practice the THINKING, not just the lookup.')
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
              Object.keys(DECISION_TREES).map(function(k) {
                var t = DECISION_TREES[k];
                return h('button', { key: k, 'data-ar-focusable': true,
                  'aria-label': 'Start decision tree: ' + t.name,
                  onClick: function() { pickTree(k); awardBadge('tree-explorer', 'Decision Tree Explorer'); },
                  style: { textAlign: 'left', padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, color: T.text, cursor: 'pointer' } },
                  h('div', { style: { fontSize: 28, marginBottom: 4 } }, t.icon),
                  h('div', { style: { fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 4 } }, t.name),
                  h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.4 } }, t.intro)
                );
              })
            ),
            disclaimerFooter()
          );
        }

        var node = tree.nodes[nodeId];
        if (!node) {
          return h('div', { style: { padding: 20, color: T.bad } }, 'Decision tree node not found: ' + nodeId,
            h('button', { onClick: reset, style: btnPrimary() }, '↺ Restart'));
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid ' + T.border, flexWrap: 'wrap' } },
            h('button', { 'data-ar-focusable': true, 'aria-label': 'Back to tree list',
              onClick: reset, style: btnGhost() }, '← Trees'),
            h('span', { style: { fontSize: 22 } }, tree.icon),
            h('h2', { style: { margin: 0, fontSize: 17, color: T.text } }, tree.name),
            path.length > 0 && h('button', { 'data-ar-focusable': true, 'aria-label': 'Back one step in tree',
              onClick: backOneStep, style: btnGhost({ marginLeft: 'auto' }) }, '↶ Back one step')
          ),
          path.length > 0 && h('div', { role: 'list', style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14, fontSize: 12, color: T.muted } },
            h('strong', { style: { color: T.accentHi } }, '🛤️ Your path: '),
            path.map(function(p, i) {
              return h('span', { key: i, role: 'listitem' },
                (i > 0 ? ' → ' : ''),
                h('span', { style: { color: T.text } }, p.choice)
              );
            })
          ),
          node.verdict ? h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, '🎯 Most likely cause'),
              h('p', { style: { margin: 0, color: T.text, fontSize: 14, fontWeight: 700, lineHeight: 1.5 } }, node.likely)
            ),
            h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 10, fontSize: 13, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, '🧠 Why: '), node.why),
            h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 10, fontSize: 13, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '🔍 Verify: '), node.verify),
            !node.terminal && h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.good, marginBottom: 10, fontSize: 13, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.good } }, '🔧 DIY: '), node.diy),
            !node.terminal && h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.warn, marginBottom: 14, fontSize: 13, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.warn } }, '🏪 Shop: '), node.shop),
            h('div', { style: { display: 'flex', gap: 8 } },
              h('button', { 'data-ar-focusable': true, onClick: backOneStep, style: btnSecondary() }, '↶ Try a different answer'),
              h('button', { 'data-ar-focusable': true, onClick: reset, style: btnPrimary() }, '🌳 New tree')
            )
          ) : h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 12px', fontSize: 15, color: T.text } }, node.question)
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              node.choices.map(function(c, i) {
                return h('button', { key: i, 'data-ar-focusable': true,
                  'aria-label': c.label,
                  onClick: function() { selectChoice(c); },
                  style: { textAlign: 'left', padding: 12, borderRadius: 8, background: T.cardAlt, color: T.text, border: '1px solid ' + T.border, cursor: 'pointer', fontSize: 14, lineHeight: 1.5 } },
                  c.label
                );
              })
            )
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // ESTIMATE DECODER view
      // ─────────────────────────────────────────
      function renderEstimate() {
        var picked = d.estPicked || null;
        var pickedItem = picked ? ESTIMATE_ITEMS.find(function(i) { return i.id === picked; }) : null;
        var verdictColor = function(v) {
          if (v === 'standard') return T.good;
          if (v === 'diy') return T.accentHi;
          if (v === 'depends') return T.warn;
          if (v === 'often-upsell') return T.bad;
          return T.muted;
        };
        var verdictLabel = function(v) {
          if (v === 'standard') return '✅ Standard service';
          if (v === 'diy') return '🔧 DIY-friendly';
          if (v === 'depends') return '⚠️ Depends on context';
          if (v === 'often-upsell') return '🚩 Often an upsell';
          return v;
        };
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('💵 Estimate decoder'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '💵 Read a shop quote like a pro'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'Tap a line item to see what it actually means, what fair pricing looks like, and whether it\'s legitimate, DIY-able, or a common upsell to push back on.'),
            h('div', { style: { display: 'flex', gap: 8, fontSize: 11, flexWrap: 'wrap' } },
              h('span', { style: { padding: '4px 10px', borderRadius: 12, background: T.cardAlt, color: T.good, border: '1px solid ' + T.good, fontWeight: 700 } }, '✅ Standard'),
              h('span', { style: { padding: '4px 10px', borderRadius: 12, background: T.cardAlt, color: T.accentHi, border: '1px solid ' + T.accentHi, fontWeight: 700 } }, '🔧 DIY'),
              h('span', { style: { padding: '4px 10px', borderRadius: 12, background: T.cardAlt, color: T.warn, border: '1px solid ' + T.warn, fontWeight: 700 } }, '⚠️ Depends'),
              h('span', { style: { padding: '4px 10px', borderRadius: 12, background: T.cardAlt, color: T.bad, border: '1px solid ' + T.bad, fontWeight: 700 } }, '🚩 Often upsell')
            )
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 14 } },
            ESTIMATE_ITEMS.map(function(it) {
              var sel = picked === it.id;
              return h('button', { key: it.id, 'data-ar-focusable': true,
                'aria-label': it.name,
                'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('estPicked', sel ? null : it.id); awardBadge('estimate-decoder', 'Estimate Decoder'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#0f172a' : T.text,
                  textAlign: 'left',
                  fontWeight: sel ? 800 : 600,
                  display: 'flex', flexDirection: 'column', gap: 2,
                  borderColor: sel ? T.accent : verdictColor(it.verdict)
                }) },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                  h('span', { style: { fontSize: 16 } }, it.icon),
                  h('span', { style: { fontSize: 12 } }, it.name)
                ),
                h('span', { style: { fontSize: 10, opacity: 0.85, color: sel ? '#0f172a' : verdictColor(it.verdict) } },
                  verdictLabel(it.verdict))
              );
            })
          ),
          pickedItem && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + verdictColor(pickedItem.verdict) } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
              h('span', { style: { fontSize: 24 } }, pickedItem.icon),
              h('h4', { style: { margin: 0, fontSize: 16, color: T.text } }, pickedItem.name),
              h('span', { style: { marginLeft: 'auto', padding: '4px 10px', borderRadius: 12, background: verdictColor(pickedItem.verdict), color: '#0f172a', fontSize: 11, fontWeight: 800 } },
                verdictLabel(pickedItem.verdict))
            ),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '📋 What it is: '), pickedItem.what),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
              h('strong', { style: { color: T.text } }, '💵 Fair price: '), pickedItem.fairPrice),
            h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + verdictColor(pickedItem.verdict), fontSize: 12, color: T.muted, lineHeight: 1.5 } },
              h('strong', { style: { color: verdictColor(pickedItem.verdict) } }, '🎯 What to know: '),
              pickedItem.flag)
          ),
          h('div', { style: { marginTop: 14, padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('strong', { style: { color: T.accentHi } }, '🛡️ Consumer rights in Maine: '),
            'You have the right to a written estimate before any work begins, the old parts back if you ask, and an itemized invoice. The shop cannot exceed the estimate by more than 10% without your re-authorization. Maine Attorney General\'s consumer protection: ',
            h('a', { href: 'https://www.maine.gov/ag/consumer', target: '_blank', rel: 'noopener', style: { color: T.link, textDecoration: 'underline' } }, 'maine.gov/ag/consumer')
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // INSPECTION view — Maine annual sticker prep
      // ─────────────────────────────────────────
      function renderInspection() {
        var picked = d.inspectionPicked || null;
        var pickedItem = picked ? INSPECTION_ITEMS.find(function(i) { return i.id === picked; }) : null;
        var checked = d.inspectionChecked || {};
        var doneCount = Object.keys(checked).filter(function(k) { return checked[k]; }).length;
        var totalCount = INSPECTION_ITEMS.length;
        var pct = Math.round((doneCount / totalCount) * 100);

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🌲 Maine inspection prep'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🌲 Maine annual safety inspection'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'Maine requires annual safety inspection ($12.50 fee at any licensed station). Failed sticker = 60 days to repair + recertify, or you stop driving. ',
              h('strong', { style: { color: T.accentHi } }, 'Pre-walk your car using this 8-area checklist BEFORE you drive in.'),
              ' Many fails are 5-minute DIY fixes — bulb, fuse, washer fluid.'),
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: T.muted, marginTop: 8 } },
              h('span', { style: { color: T.accentHi, fontWeight: 700 } }, 'Self-walk progress:'),
              h('span', { style: { fontFamily: 'monospace' } }, doneCount + ' / ' + totalCount + ' areas checked (' + pct + '%)')
            )
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 14 } },
            INSPECTION_ITEMS.map(function(item) {
              var sel = picked === item.id;
              var isChecked = !!checked[item.id];
              return h('button', { key: item.id, 'data-ar-focusable': true,
                'aria-label': item.area + (isChecked ? ' (checked)' : ''),
                'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('inspectionPicked', sel ? null : item.id); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : (isChecked ? '#064e3b' : T.cardAlt),
                  color: sel ? '#0f172a' : (isChecked ? '#d1fae5' : T.text),
                  textAlign: 'left',
                  fontWeight: sel ? 800 : 600,
                  display: 'flex', alignItems: 'center', gap: 8
                }) },
                h('span', { style: { fontSize: 20 } }, item.icon),
                h('span', null, item.area, isChecked ? ' ✓' : '')
              );
            })
          ),
          pickedItem && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.accent, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 10px', fontSize: 15, color: T.accentHi } }, pickedItem.icon + ' ' + pickedItem.area),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '🔍 What they check: '), pickedItem.whatTheyCheck),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
              h('strong', { style: { color: T.bad } }, '🚩 Common fails: '), pickedItem.commonFails),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
              h('strong', { style: { color: T.good } }, '🔧 DIY: '), pickedItem.diy),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
              h('strong', { style: { color: T.warn } }, '🏪 Shop: '), pickedItem.shop),
            h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.5 } },
              h('strong', { style: { color: T.accentHi } }, '💡 Pre-walk tip: '), pickedItem.tip),
            h('div', { style: { marginTop: 10 } },
              h('button', { 'data-ar-focusable': true,
                'aria-label': 'Mark ' + pickedItem.area + ' as self-checked',
                onClick: function() {
                  var nv = Object.assign({}, checked); nv[pickedItem.id] = !nv[pickedItem.id];
                  upd('inspectionChecked', nv);
                  if (Object.keys(nv).filter(function(k){return nv[k];}).length === totalCount) {
                    awardBadge('inspection-prep', 'Inspection Self-Walk');
                  }
                },
                style: btnPrimary() }, isChecked ? '✓ Checked — uncheck' : '✓ Mark this area self-checked')
            )
          ),
          h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('strong', { style: { color: T.accentHi } }, '🌲 Maine reality: '), MAINE_CONTEXT.inspection, ' ', MAINE_CONTEXT.sticker),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // USED CAR view — pre-purchase inspection
      // ─────────────────────────────────────────
      function renderUsedCar() {
        var ucView = d.ucView || 'overview';
        function tabBtn(id, label) {
          var active = ucView === id;
          return h('button', { 'data-ar-focusable': true, role: 'tab',
            'aria-selected': active ? 'true' : 'false',
            onClick: function() { upd('ucView', id); },
            style: Object.assign({}, btnSecondary(), { background: active ? T.accent : T.cardAlt, color: active ? '#0f172a' : T.text, fontWeight: active ? 800 : 600 }) }, label);
        }

        function ucOverview() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🛒 Buying a used car in Maine'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } }, USED_CAR_CHECK.intro)
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '✅ Best practices'),
              h('ul', { style: { margin: 0, paddingLeft: 20, fontSize: 12, color: T.muted, lineHeight: 1.6 } },
                h('li', null, 'Run a CarFax + NHTSA recall check via VIN BEFORE you go look. ($40 well spent.)'),
                h('li', null, 'Insist on a COLD start. Warm engines hide problems.'),
                h('li', null, 'Pay for a $80–150 pre-purchase inspection (PPI) at an independent shop on anything over $5,000.'),
                h('li', null, 'Get the title and registration in your name within 30 days (Maine requirement).'),
                h('li', null, 'Test drive 30+ minutes including highway, stop-and-go, and bumpy back-roads.'),
                h('li', null, 'Ask for service records. The owner who says "I don\'t have any" is selling a car someone else didn\'t care about.')
              )
            )
          );
        }

        function ucFlags() {
          var picked = d.ucFlagPicked || null;
          var pickedFlag = picked ? USED_CAR_CHECK.redFlags.find(function(f) { return f.id === picked; }) : null;
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🚩 10 red flags'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'If you see any of these, slow down. Each one is negotiable. Each one tells you something the seller may or may not be telling you.')
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 } },
              USED_CAR_CHECK.redFlags.map(function(f) {
                var sel = picked === f.id;
                return h('button', { key: f.id, 'data-ar-focusable': true,
                  'aria-label': f.flag,
                  'aria-pressed': sel ? 'true' : 'false',
                  onClick: function() { upd('ucFlagPicked', sel ? null : f.id); },
                  style: Object.assign({}, btnSecondary(), {
                    background: sel ? T.accent : T.cardAlt,
                    color: sel ? '#0f172a' : T.text,
                    textAlign: 'left',
                    fontWeight: sel ? 800 : 600,
                    display: 'flex', justifyContent: 'space-between', gap: 8
                  }) },
                  h('span', null, '🚩 ', f.flag),
                  h('span', { style: { fontSize: 11, opacity: 0.75 } }, f.area)
                );
              })
            ),
            pickedFlag && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.bad } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.bad } }, '🚩 ' + pickedFlag.flag),
              h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, '🔍 What to look for: '), pickedFlag.what),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                h('strong', { style: { color: T.warn } }, '🎯 If found: '), pickedFlag.ifFound)
            )
          );
        }

        function ucWalk() {
          var checked = d.ucWalkChecked || {};
          var done = Object.keys(checked).filter(function(k) { return checked[k]; }).length;
          var total = USED_CAR_CHECK.walkaround.length;
          if (done === total) awardBadge('used-car-buyer', 'Used Car Buyer');
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🚶 9-step walkaround'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'Tap each step to mark complete. Practice the routine on a friend\'s car BEFORE you go look at one to buy. ',
                h('strong', null, 'Done: '), done + ' / ' + total)
            ),
            h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              USED_CAR_CHECK.walkaround.map(function(s) {
                var isChecked = !!checked[s.step];
                return h('button', { key: s.step, role: 'listitem', 'data-ar-focusable': true,
                  'aria-label': 'Step ' + s.step + (isChecked ? ' (done)' : ''),
                  'aria-pressed': isChecked ? 'true' : 'false',
                  onClick: function() {
                    var nv = Object.assign({}, checked); nv[s.step] = !nv[s.step];
                    upd('ucWalkChecked', nv);
                  },
                  style: { textAlign: 'left', padding: 10, borderRadius: 8, background: isChecked ? T.cardAlt : T.bg, border: '1px solid ' + (isChecked ? T.accent : T.border), color: T.text, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start' } },
                  h('span', { 'aria-hidden': 'true', style: { background: isChecked ? T.accent : T.dim, color: '#0f172a', borderRadius: 999, width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 } }, s.step),
                  h('span', { style: { fontSize: 13, lineHeight: 1.5, color: T.text } }, s.do)
                );
              })
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🛒 Used car buying'),
          h('div', { role: 'tablist', 'aria-label': 'Used-car sub-modes',
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('overview', 'Overview'),
            tabBtn('flags', '🚩 Red flags'),
            tabBtn('walk', '🚶 Walkaround')
          ),
          ucView === 'overview' && ucOverview(),
          ucView === 'flags' && ucFlags(),
          ucView === 'walk' && ucWalk(),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // EV / HYBRID view
      // ─────────────────────────────────────────
      function renderEv() {
        var evView = d.evView || 'overview';
        function tabBtn(id, label) {
          var active = evView === id;
          return h('button', { 'data-ar-focusable': true, role: 'tab',
            'aria-selected': active ? 'true' : 'false',
            onClick: function() { upd('evView', id); },
            style: Object.assign({}, btnSecondary(), { background: active ? T.accent : T.cardAlt, color: active ? '#0f172a' : T.text, fontWeight: active ? 800 : 600 }) }, label);
        }

        function evOverview() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '⚡ EV / hybrid service — the future of the trade'),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.6 } }, EV_OVERVIEW.bigPicture),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 } },
                [
                  { label: '🏅 Industry credential', val: EV_OVERVIEW.aseCert },
                  { label: '🧰 Tool investment', val: EV_OVERVIEW.tooling },
                  { label: '💵 Pay differential', val: EV_OVERVIEW.salaryDelta },
                  { label: '🌲 Where to train (Maine)', val: EV_OVERVIEW.where }
                ].map(function(r) {
                  return h('div', { key: r.label, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                    h('div', { style: { fontSize: 11, color: T.accentHi, fontWeight: 700, marginBottom: 4 } }, r.label),
                    h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5 } }, r.val)
                  );
                })
              )
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.warn } },
              h('strong', { style: { color: T.warn } }, '⚠️ Critical: '),
              h('span', { style: { color: T.text, fontSize: 13, lineHeight: 1.5 } },
                'EV high-voltage work is regulated specialty work. Without proper training, insulated PPE, and the manufacturer\'s service procedure, ',
                h('strong', null, 'do not service HV components. '),
                'A 400V battery system can kill you faster than you can let go. This module is overview-level for awareness, not a substitute for training.')
            )
          );
        }

        function evSafetyTab() {
          var picked = d.evSafetyPicked || null;
          var pickedItem = picked ? EV_SAFETY.find(function(s) { return s.id === picked; }) : null;
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '⚠️ EV-specific safety'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'Six rules that override your general-tech instinct on a hybrid or EV.')
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 14 } },
              EV_SAFETY.map(function(s) {
                var sel = picked === s.id;
                return h('button', { key: s.id, 'data-ar-focusable': true,
                  'aria-label': s.name,
                  'aria-pressed': sel ? 'true' : 'false',
                  onClick: function() { upd('evSafetyPicked', sel ? null : s.id); awardBadge('ev-safety-aware', 'EV Safety Aware'); },
                  style: Object.assign({}, btnSecondary(), {
                    background: sel ? T.accent : T.cardAlt,
                    color: sel ? '#0f172a' : T.text,
                    textAlign: 'left',
                    fontWeight: sel ? 800 : 600,
                    display: 'flex', alignItems: 'flex-start', gap: 8
                  }) },
                  h('span', { style: { fontSize: 22 } }, s.icon),
                  h('span', null, s.name)
                );
              })
            ),
            pickedItem && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.bad } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.bad } }, pickedItem.icon + ' ' + pickedItem.name),
              h('div', { style: { padding: 10, borderRadius: 8, background: '#7c2d12', border: '1px solid #ea580c', marginBottom: 10 } },
                h('strong', { style: { color: '#fed7aa' } }, '⚠️ Rule: '),
                h('span', { style: { color: '#fed7aa', fontSize: 13, lineHeight: 1.5 } }, pickedItem.rule)
              ),
              h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, '🔬 Detail: '), pickedItem.detail),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                h('strong', { style: { color: T.text } }, '🎯 What to do: '), pickedItem.action)
            )
          );
        }

        function evDiffsTab() {
          var picked = d.evDiffPicked || null;
          var pickedItem = picked ? EV_KEY_DIFFERENCES[picked] : null;
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🔄 What changes vs ICE service'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                '7 places where hybrid/EV maintenance diverges from gasoline service. Half are about what NOT to do.')
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 } },
              EV_KEY_DIFFERENCES.map(function(d2, i) {
                var sel = picked === i;
                return h('button', { key: i, 'data-ar-focusable': true,
                  'aria-label': d2.topic,
                  'aria-pressed': sel ? 'true' : 'false',
                  onClick: function() { upd('evDiffPicked', sel ? null : i); },
                  style: Object.assign({}, btnSecondary(), {
                    background: sel ? T.accent : T.cardAlt,
                    color: sel ? '#0f172a' : T.text,
                    textAlign: 'left',
                    fontWeight: sel ? 800 : 600
                  }) }, d2.topic);
              })
            ),
            pickedItem && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.accent } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, pickedItem.topic),
              h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
                h('strong', null, '🔍 What it is: '), pickedItem.what),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, '🔧 Maintenance shift: '), pickedItem.maintenanceShift)
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('⚡ EV / Hybrid'),
          h('div', { role: 'tablist', 'aria-label': 'EV sections',
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('overview', 'Overview'),
            tabBtn('safety', '⚠️ HV safety'),
            tabBtn('diffs', '🔄 vs ICE')
          ),
          evView === 'overview' && evOverview(),
          evView === 'safety' && evSafetyTab(),
          evView === 'diffs' && evDiffsTab(),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // GLOSSARY view — search-filterable term list
      // ─────────────────────────────────────────
      function renderGlossary() {
        var query = (d.glossaryQuery || '').toLowerCase();
        var tagFilter = d.glossaryTag || 'all';
        var tags = ['all', 'engine', 'electrical', 'brakes', 'drivetrain', 'fluids', 'general'];
        var filtered = GLOSSARY.filter(function(g) {
          if (tagFilter !== 'all' && g.tag !== tagFilter) return false;
          if (!query) return true;
          return g.term.toLowerCase().indexOf(query) >= 0 || g.def.toLowerCase().indexOf(query) >= 0;
        });
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📖 Glossary'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '📖 50+ essential auto terms'),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
              'A glossary so you can read a repair article without getting stuck. Filter by category or search any word.'),
            h('input', { type: 'search', 'data-ar-focusable': true,
              'aria-label': 'Search glossary terms',
              placeholder: 'Search terms or definitions...',
              value: query,
              onChange: function(e) { upd('glossaryQuery', e.target.value); },
              style: { width: '100%', padding: 10, borderRadius: 8, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 13, marginBottom: 10, boxSizing: 'border-box' } }),
            h('div', { role: 'tablist', 'aria-label': 'Filter by category', style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              tags.map(function(t) {
                var active = tagFilter === t;
                return h('button', { key: t, 'data-ar-focusable': true, role: 'tab',
                  'aria-selected': active ? 'true' : 'false',
                  onClick: function() { upd('glossaryTag', t); },
                  style: Object.assign({}, btnGhost(), { background: active ? T.accent : 'transparent', color: active ? '#0f172a' : T.muted, fontWeight: active ? 800 : 600 }) },
                  t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)
                );
              })
            )
          ),
          h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 10 } }, filtered.length + ' of ' + GLOSSARY.length + ' terms'),
          h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            filtered.map(function(g) {
              return h('div', { key: g.term, role: 'listitem',
                style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 } },
                  h('strong', { style: { fontSize: 14, color: T.accentHi } }, g.term),
                  h('span', { style: { fontSize: 10, color: T.dim, padding: '2px 6px', borderRadius: 4, background: T.bg, border: '1px solid ' + T.border, textTransform: 'uppercase' } }, g.tag)
                ),
                h('div', { style: { fontSize: 13, color: T.text, lineHeight: 1.5 } }, g.def)
              );
            }),
            filtered.length === 0 && h('div', { style: { padding: 14, textAlign: 'center', color: T.dim, fontSize: 13 } },
              'No terms match. Try clearing the search or picking "All".')
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // COLD-WEATHER PREP view — Maine winter checklist
      // ─────────────────────────────────────────
      function renderColdPrep() {
        var checked = d.coldChecked || {};
        var done = Object.keys(checked).filter(function(k) { return checked[k]; }).length;
        var total = COLD_WEATHER_CHECKLIST.length;
        var pct = Math.round((done / total) * 100);
        if (done === total) awardBadge('winter-prep', 'Maine Winter Prepped');

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🌨️ Cold-weather prep'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🌨️ Maine winter prep — October through April'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'Doing this in October–November means February doesn\'t strand you. Most items are 5–30 minute jobs. ',
              h('strong', { style: { color: T.accentHi } }, 'Progress: '), done + ' / ' + total + ' (' + pct + '%)')
          ),
          h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            COLD_WEATHER_CHECKLIST.map(function(item) {
              var isChecked = !!checked[item.id];
              return h('button', { key: item.id, role: 'listitem', 'data-ar-focusable': true,
                'aria-label': item.task + (isChecked ? ' (done)' : ''),
                'aria-pressed': isChecked ? 'true' : 'false',
                onClick: function() {
                  var nv = Object.assign({}, checked); nv[item.id] = !nv[item.id];
                  upd('coldChecked', nv);
                },
                style: { textAlign: 'left', padding: 12, borderRadius: 8, background: isChecked ? '#064e3b' : T.cardAlt, border: '1px solid ' + (isChecked ? T.good : T.border), color: T.text, cursor: 'pointer' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, item.icon),
                  h('strong', { style: { fontSize: 14, color: isChecked ? '#d1fae5' : T.accentHi, flex: 1 } }, item.task),
                  h('span', { style: { fontSize: 10, color: T.dim, padding: '2px 8px', borderRadius: 12, background: T.bg, border: '1px solid ' + T.border } }, item.urgency),
                  isChecked && h('span', { style: { fontSize: 16, color: T.good } }, '✓')
                ),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 4 } }, item.detail),
                h('div', { style: { fontSize: 12, color: isChecked ? '#a7f3d0' : T.text, lineHeight: 1.5 } },
                  h('strong', { style: { color: T.accentHi } }, '🎯 Action: '), item.action)
              );
            })
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // ROADSIDE EMERGENCY view — trunk kit + breakdown protocol
      // ─────────────────────────────────────────
      function renderRoadside() {
        var rsView = d.rsView || 'overview';
        function tabBtn(id, label) {
          var active = rsView === id;
          return h('button', { 'data-ar-focusable': true, role: 'tab',
            'aria-selected': active ? 'true' : 'false',
            onClick: function() { upd('rsView', id); },
            style: Object.assign({}, btnSecondary(), { background: active ? T.accent : T.cardAlt, color: active ? '#0f172a' : T.text, fontWeight: active ? 800 : 600 }) }, label);
        }

        function rsOverview() {
          return h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🚨 If you break down on a Maine road...'),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              'Maine rural breakdowns can become survival situations in winter. Below-zero temperatures + 30+ minute tow waits + sparse cell coverage = real risk. Two parts: ',
              h('strong', { style: { color: T.accentHi } }, 'what\'s in your trunk'), ' (Kit tab) and ',
              h('strong', { style: { color: T.accentHi } }, 'what you do'), ' (Protocol tab).'),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#7c2d12', border: '1px solid #ea580c', fontSize: 13, color: '#fed7aa', lineHeight: 1.55 } },
              h('strong', null, '⚠️ Critical Maine winter rule: '),
              'If your exhaust pipe is buried in snow, DO NOT idle the engine to stay warm. Carbon monoxide accumulates in the cabin in minutes. Clear the exhaust before idling, OR run engine 10 minutes per hour with a window cracked.')
          );
        }

        function rsKit() {
          var packed = d.kitPacked || {};
          var done = Object.keys(packed).filter(function(k) { return packed[k]; }).length;
          var total = TRUNK_KIT.length;
          if (done === total) awardBadge('kit-packed', 'Trunk Kit Packed');
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🎒 Maine winter trunk kit'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'Tap each item as you pack it. Total kit cost: ~$300–$600. ',
                h('strong', null, 'Done: '), done + ' / ' + total)
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 } },
              TRUNK_KIT.map(function(it) {
                var isPacked = !!packed[it.id];
                return h('button', { key: it.id, 'data-ar-focusable': true,
                  'aria-label': it.name + (isPacked ? ' (packed)' : ''),
                  'aria-pressed': isPacked ? 'true' : 'false',
                  onClick: function() {
                    var nv = Object.assign({}, packed); nv[it.id] = !nv[it.id];
                    upd('kitPacked', nv);
                  },
                  style: { textAlign: 'left', padding: 12, borderRadius: 8, background: isPacked ? '#064e3b' : T.cardAlt, border: '1px solid ' + (isPacked ? T.good : T.border), color: T.text, cursor: 'pointer' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                    h('span', { style: { fontSize: 20 } }, it.icon),
                    h('strong', { style: { fontSize: 13, color: isPacked ? '#d1fae5' : T.text, flex: 1 } }, it.name),
                    isPacked && h('span', { style: { fontSize: 14, color: T.good } }, '✓')
                  ),
                  h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 4 } }, it.why),
                  h('div', { style: { fontSize: 11, color: T.accentHi, fontWeight: 700 } }, it.cost)
                );
              })
            )
          );
        }

        function rsProtocol() {
          var phaseColor = function(p) {
            if (p === 'IMMEDIATE') return T.bad;
            if (p === 'ASSESS') return T.warn;
            if (p === 'CALL') return T.accentHi;
            return T.good;
          };
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🛣️ Breakdown response protocol'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                '9 steps in 4 phases. Order matters — get safe first, then assess.')
            ),
            h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              BREAKDOWN_PROTOCOL.map(function(p) {
                return h('div', { key: p.step, role: 'listitem',
                  style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + phaseColor(p.phase) } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                    h('span', { 'aria-hidden': 'true', style: { background: phaseColor(p.phase), color: '#0f172a', borderRadius: 999, width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 } }, p.step),
                    h('span', { style: { padding: '2px 10px', borderRadius: 12, background: phaseColor(p.phase), color: '#0f172a', fontSize: 10, fontWeight: 800 } }, p.phase),
                    h('strong', { style: { fontSize: 14, color: T.text, flex: 1 } }, p.title)
                  ),
                  h('div', { style: { fontSize: 12, color: T.text, lineHeight: 1.5, marginBottom: 4 } },
                    h('strong', { style: { color: T.good } }, '✅ Do: '), p.do),
                  h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5 } },
                    h('strong', { style: { color: T.bad } }, '❌ Avoid: '), p.avoid)
                );
              })
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🚨 Roadside emergency'),
          h('div', { role: 'tablist', 'aria-label': 'Roadside sub-modes',
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('overview', 'Overview'),
            tabBtn('kit', '🎒 Trunk kit'),
            tabBtn('protocol', '🛣️ Protocol')
          ),
          rsView === 'overview' && rsOverview(),
          rsView === 'kit' && rsKit(),
          rsView === 'protocol' && rsProtocol(),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // SHOP BUSINESS view — running your own / mobile-mechanic
      // ─────────────────────────────────────────
      function renderShopBiz() {
        var sbView = d.sbView || 'overview';
        function tabBtn(id, label) {
          var active = sbView === id;
          return h('button', { 'data-ar-focusable': true, role: 'tab',
            'aria-selected': active ? 'true' : 'false',
            onClick: function() { upd('sbView', id); },
            style: Object.assign({}, btnSecondary(), { background: active ? T.accent : T.cardAlt, color: active ? '#0f172a' : T.text, fontWeight: active ? 800 : 600 }) }, label);
        }

        function sbOverview() {
          var mp = SHOP_BUSINESS.mobilePath;
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🏪 Running your own — three Maine paths'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } }, SHOP_BUSINESS.overview)
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.accent, marginBottom: 14 } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🚐 ' + mp.title),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 } },
                h('div', null,
                  h('strong', { style: { color: T.good, fontSize: 12 } }, '✅ Pros'),
                  h('ul', { style: { margin: '4px 0 0', paddingLeft: 16, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                    mp.pros.map(function(p, i) { return h('li', { key: i }, p); }))
                ),
                h('div', null,
                  h('strong', { style: { color: T.bad, fontSize: 12 } }, '❌ Cons'),
                  h('ul', { style: { margin: '4px 0 0', paddingLeft: 16, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                    mp.cons.map(function(c, i) { return h('li', { key: i }, c); }))
                )
              ),
              h('p', { style: { margin: '0 0 6px', fontSize: 12, color: T.muted } },
                h('strong', { style: { color: T.accentHi } }, '💵 Startup cost: '), mp.startupCost),
              h('p', { style: { margin: '0 0 6px', fontSize: 12, color: T.muted } },
                h('strong', { style: { color: T.accentHi } }, '📈 Revenue: '), mp.revenue),
              h('p', { style: { margin: 0, fontSize: 12, color: T.muted } },
                h('strong', { style: { color: T.accentHi } }, '⏫ Scaling: '), mp.scaling)
            )
          );
        }

        function sbInsurance() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🛡️ Insurance you need'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                'Customer cars + customer property + employees + your work vehicle. One missing policy = bankruptcy on a single claim.')
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              SHOP_BUSINESS.insurance.map(function(ins) {
                return h('div', { key: ins.type, style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                    h('strong', { style: { fontSize: 14, color: T.accentHi, flex: 1 } }, ins.type),
                    h('span', { style: { fontSize: 12, color: T.good, fontWeight: 700 } }, ins.cost)
                  ),
                  h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 4 } },
                    h('strong', { style: { color: T.text } }, 'Who needs: '), ins.who),
                  h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5 } },
                    h('strong', { style: { color: T.text } }, 'Why: '), ins.why)
                );
              })
            )
          );
        }

        function sbTools() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🚚 Tool truck financing reality'),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                SHOP_BUSINESS.toolFinancingWarning),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 } },
                SHOP_BUSINESS.toolTrucks.map(function(t) {
                  return h('div', { key: t.name, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + (t.tier === 'premium' ? T.accent : T.good) } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                      h('strong', { style: { fontSize: 13, color: t.tier === 'premium' ? T.accentHi : T.good } }, t.name),
                      h('span', { style: { fontSize: 9, color: T.dim, padding: '2px 6px', borderRadius: 4, background: T.bg, border: '1px solid ' + T.border, textTransform: 'uppercase' } }, t.tier)
                    ),
                    h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.5 } }, t.desc)
                  );
                })
              )
            )
          );
        }

        function sbPricing() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '💵 Pricing your work'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'Maine 2026 ranges + national comparison. Don\'t race to the bottom — pricing too low signals "low quality" and traps you under your costs.')
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 } },
              SHOP_BUSINESS.pricing.map(function(p, i) {
                return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' } },
                    h('strong', { style: { fontSize: 13, color: T.accentHi, flex: 1 } }, p.item),
                    h('span', { style: { fontSize: 11, color: T.good, fontWeight: 700 } }, '🌲 Maine: ' + p.maine),
                    h('span', { style: { fontSize: 11, color: T.muted, fontWeight: 600 } }, '🇺🇸 US: ' + p.national)
                  ),
                  h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.5 } }, p.note)
                );
              })
            )
          );
        }

        function sbAcquisition() {
          var effColor = function(e) {
            if (e === 'highest' || e === 'highest-stable') return T.good;
            if (e === 'high') return T.accentHi;
            if (e === 'medium') return T.warn;
            return T.muted;
          };
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '📣 Getting customers'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'Customer-acquisition channels ranked. Maine small-town reality: word-of-mouth + Google reviews dominate. Don\'t spend on paid ads until the free channels are saturated.')
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 } },
              SHOP_BUSINESS.customerAcquisition.map(function(c, i) {
                return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + effColor(c.effective) } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' } },
                    h('strong', { style: { fontSize: 13, color: T.accentHi, flex: 1 } }, c.channel),
                    h('span', { style: { fontSize: 11, color: T.muted } }, '💵 ' + c.cost),
                    h('span', { style: { padding: '2px 8px', borderRadius: 12, background: effColor(c.effective), color: '#0f172a', fontSize: 10, fontWeight: 800 } }, c.effective.replace('-', ' '))
                  ),
                  h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.5 } }, c.detail)
                );
              })
            ),
            h('div', { style: { padding: 12, borderRadius: 8, background: '#7c2d12', border: '1px solid #ea580c', fontSize: 12, color: '#fed7aa' } },
              h('strong', null, '⚠️ Common pitfalls: '),
              h('ul', { style: { margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.6 } },
                SHOP_BUSINESS.pitfalls.map(function(p, i) { return h('li', { key: i }, p); })
              )
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🏪 Shop business'),
          h('div', { role: 'tablist', 'aria-label': 'Shop business sections',
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('overview', 'Overview'),
            tabBtn('insurance', '🛡️ Insurance'),
            tabBtn('tools', '🚚 Tool trucks'),
            tabBtn('pricing', '💵 Pricing'),
            tabBtn('acquire', '📣 Customers')
          ),
          sbView === 'overview' && sbOverview(),
          sbView === 'insurance' && sbInsurance(),
          sbView === 'tools' && sbTools(),
          sbView === 'pricing' && sbPricing(),
          sbView === 'acquire' && sbAcquisition(),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // FIRST-CAR view — 30-day onboarding plan
      // ─────────────────────────────────────────
      function renderFirstCar() {
        var done = d.firstCarDone || {};
        var totalTasks = FIRST_CAR_PLAN.reduce(function(acc, w) { return acc + w.tasks.length; }, 0);
        var doneCount = Object.keys(done).filter(function(k) { return done[k]; }).length;
        var pct = Math.round((doneCount / totalTasks) * 100);
        if (doneCount === totalTasks) awardBadge('first-car-30day', '30-Day Plan Complete');

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🚗 First car — 30 day plan'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🚗 Just bought your first car?'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'Week-by-week 30-day plan to set yourself up. Don\'t skip steps — Week 1 paperwork is non-negotiable Maine law. ',
              h('strong', { style: { color: T.accentHi } }, 'Progress: '), doneCount + ' / ' + totalTasks + ' (' + pct + '%)')
          ),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
            FIRST_CAR_PLAN.map(function(w) {
              return h('div', { key: w.week, style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.accent } },
                h('h4', { style: { margin: '0 0 10px', fontSize: 15, color: T.accentHi } }, w.title),
                h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                  w.tasks.map(function(t, i) {
                    var key = 'w' + w.week + '-' + i;
                    var isDone = !!done[key];
                    return h('button', { key: key, role: 'listitem', 'data-ar-focusable': true,
                      'aria-label': t.do + (isDone ? ' (done)' : ''),
                      'aria-pressed': isDone ? 'true' : 'false',
                      onClick: function() {
                        var nv = Object.assign({}, done); nv[key] = !nv[key];
                        upd('firstCarDone', nv);
                      },
                      style: { textAlign: 'left', padding: 10, borderRadius: 8, background: isDone ? '#064e3b' : T.cardAlt, border: '1px solid ' + (isDone ? T.good : T.border), color: T.text, cursor: 'pointer' } },
                      h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 } },
                        h('span', { 'aria-hidden': 'true', style: { fontSize: 14, color: isDone ? T.good : T.dim, marginTop: 2 } }, isDone ? '☑' : '☐'),
                        h('strong', { style: { fontSize: 13, color: isDone ? '#d1fae5' : T.text, flex: 1, lineHeight: 1.5 } }, t.do)
                      ),
                      h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.5, marginLeft: 22 } },
                        h('strong', { style: { color: T.dim } }, 'Why: '), t.why)
                    );
                  })
                )
              );
            })
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // LAB SIMULATOR view — graded diagnostic scenarios
      // ─────────────────────────────────────────
      function renderLab() {
        var labId = d.labId || null;
        var lab = labId ? LAB_SCENARIOS.find(function(s) { return s.id === labId; }) : null;
        var stepIdx = d.labStep || 0;
        var answers = d.labAnswers || {};

        function pickLab(id) {
          updMulti({ labId: id, labStep: 0, labAnswers: {} });
          arAnnounce('Starting scenario: ' + LAB_SCENARIOS.find(function(s) { return s.id === id; }).name);
        }
        function reset() {
          updMulti({ labId: null, labStep: 0, labAnswers: {} });
        }
        function selectChoice(stepId, choice) {
          var nv = Object.assign({}, answers); nv[stepId] = choice.id;
          var newStep = stepIdx + 1;
          updMulti({ labAnswers: nv, labStep: newStep });
          arAnnounce('Choice locked. ' + (choice.score >= 10 ? 'Excellent move.' : choice.score >= 5 ? 'Acceptable move.' : 'Costly move.'));
        }

        var diffStars = function(d2) { return '★'.repeat(d2) + '☆'.repeat(4 - d2); };

        if (!lab) {
          var labsCompleted = (d.labsCompleted || []).length;
          return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
            backBar('🧪 Hands-on lab simulator'),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🧪 Diagnostic decision-making, scored'),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                'A "customer car" arrives with symptoms. You walk through diagnostic decision points. Each choice is scored on diagnostic efficiency: ',
                h('strong', { style: { color: T.good } }, '+10 = best move'), ', ',
                h('strong', { style: { color: T.accentHi } }, '+5 = OK'), ', ',
                h('strong', { style: { color: T.bad } }, '−5 to −10 = parts-cannon or harmful'), '. Final letter grade + per-choice feedback.'),
              h('div', { style: { fontSize: 12, color: T.muted } },
                h('strong', { style: { color: T.accentHi } }, 'Scenarios completed: '), labsCompleted + ' / ' + LAB_SCENARIOS.length)
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 } },
              LAB_SCENARIOS.map(function(s) {
                var done = (d.labsCompleted || []).indexOf(s.id) >= 0;
                return h('button', { key: s.id, 'data-ar-focusable': true,
                  'aria-label': 'Start scenario: ' + s.name + (done ? ' (completed)' : ''),
                  onClick: function() { pickLab(s.id); },
                  style: { textAlign: 'left', padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + (done ? T.good : T.border), color: T.text, cursor: 'pointer' } },
                  h('div', { style: { fontSize: 28, marginBottom: 4 } }, s.icon),
                  h('div', { style: { fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 4 } }, s.name, done && ' ✓'),
                  h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 6, fontFamily: 'monospace' } }, diffStars(s.difficulty), ' · ', s.steps.length, ' decision points'),
                  h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5 } }, s.intro)
                );
              })
            ),
            disclaimerFooter()
          );
        }

        var totalSteps = lab.steps.length;
        // Quiz complete screen
        if (stepIdx >= totalSteps) {
          var totalScore = 0;
          var maxScore = 0;
          lab.steps.forEach(function(step) {
            var picked = answers[step.id];
            var maxStep = Math.max.apply(Math, step.choices.map(function(c) { return c.score; }));
            maxScore += maxStep;
            if (picked) {
              var pickedChoice = step.choices.find(function(c) { return c.id === picked; });
              if (pickedChoice) totalScore += pickedChoice.score;
            }
          });
          var pct = Math.round((totalScore / maxScore) * 100);
          var grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';
          var gradeColor = pct >= 80 ? T.good : pct >= 60 ? T.warn : T.bad;
          var completed = d.labsCompleted || [];
          if (completed.indexOf(lab.id) === -1 && pct >= 70) {
            upd('labsCompleted', completed.concat([lab.id]));
            awardBadge('lab-' + lab.id, 'Solved: ' + lab.name);
            if (completed.length + 1 === LAB_SCENARIOS.length) {
              awardBadge('lab-master', 'Lab Master (all scenarios)');
            }
          }

          return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid ' + T.border } },
              h('button', { 'data-ar-focusable': true, onClick: reset, style: btnGhost() }, '← Lab list'),
              h('span', { style: { fontSize: 24 } }, lab.icon),
              h('h2', { style: { margin: 0, fontSize: 17, color: T.text } }, lab.name + ' — Results')
            ),
            h('div', { style: { padding: 18, borderRadius: 10, background: T.card, border: '2px solid ' + gradeColor, marginBottom: 14, textAlign: 'center' } },
              h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 6 } }, 'Final score'),
              h('div', { style: { fontSize: 56, fontWeight: 900, color: gradeColor, lineHeight: 1, marginBottom: 6 } }, grade),
              h('div', { style: { fontSize: 18, color: T.text, fontWeight: 700 } }, totalScore + ' / ' + maxScore + ' (' + pct + '%)'),
              h('p', { style: { margin: '10px 0 0', fontSize: 13, color: T.muted, lineHeight: 1.55 } },
                pct >= 90 ? '🏆 Master diagnostician. Test-first, verify-first, repair-only-what-broke.' :
                pct >= 80 ? '🎓 Solid technician thinking. Minor optimizations in your decision path.' :
                pct >= 70 ? '🚧 Apprentice level. Re-read the per-choice feedback below.' :
                pct >= 60 ? '🛠️ Hands need work. Practice the Decision Tree module before retrying.' :
                '📚 Back to the books. Cost-cutters and parts-cannons leave customers angry.')
            ),
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.accentHi } }, '🔍 Step-by-step feedback'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 } },
              lab.steps.map(function(step, i) {
                var picked = answers[step.id];
                var pickedChoice = step.choices.find(function(c) { return c.id === picked; });
                var bestChoice = step.choices.reduce(function(best, c) { return c.score > best.score ? c : best; }, step.choices[0]);
                var scoreColor = pickedChoice ? (pickedChoice.score >= 10 ? T.good : pickedChoice.score >= 5 ? T.accentHi : T.bad) : T.muted;
                return h('div', { key: step.id, style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + scoreColor } },
                  h('div', { style: { fontSize: 12, color: T.dim, marginBottom: 4 } }, 'Step ' + (i + 1)),
                  h('div', { style: { fontSize: 13, color: T.text, fontWeight: 700, marginBottom: 8 } }, step.prompt),
                  pickedChoice && h('div', { style: { padding: 8, borderRadius: 6, background: T.bg, marginBottom: 6 } },
                    h('div', { style: { fontSize: 11, color: scoreColor, fontWeight: 700, marginBottom: 4 } },
                      'Your choice (' + (pickedChoice.score >= 0 ? '+' : '') + pickedChoice.score + ' pts): '),
                    h('div', { style: { fontSize: 12, color: T.text, marginBottom: 4 } }, pickedChoice.label),
                    h('div', { style: { fontSize: 11, color: T.muted, fontStyle: 'italic', lineHeight: 1.5 } }, pickedChoice.fb)
                  ),
                  pickedChoice && pickedChoice.id !== bestChoice.id && h('div', { style: { padding: 8, borderRadius: 6, background: T.bg, border: '1px solid ' + T.good } },
                    h('div', { style: { fontSize: 11, color: T.good, fontWeight: 700, marginBottom: 4 } }, 'Best choice (+' + bestChoice.score + ' pts):'),
                    h('div', { style: { fontSize: 12, color: T.text } }, bestChoice.label)
                  )
                );
              })
            ),
            h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
              h('strong', { style: { color: T.accentHi } }, '✅ What was actually wrong: '),
              h('span', { style: { color: T.text, fontSize: 13, lineHeight: 1.55 } }, lab.truth)
            ),
            h('div', { style: { display: 'flex', gap: 8 } },
              h('button', { 'data-ar-focusable': true, onClick: function() { pickLab(lab.id); }, style: btnSecondary() }, '🔁 Retry scenario'),
              h('button', { 'data-ar-focusable': true, onClick: reset, style: btnPrimary() }, '🧪 Pick another')
            ),
            disclaimerFooter()
          );
        }

        var step = lab.steps[stepIdx];
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid ' + T.border, flexWrap: 'wrap' } },
            h('button', { 'data-ar-focusable': true, onClick: reset, style: btnGhost() }, '← Quit scenario'),
            h('span', { style: { fontSize: 24 } }, lab.icon),
            h('h2', { style: { margin: 0, fontSize: 17, color: T.text, flex: 1 } }, lab.name),
            h('span', { style: { fontSize: 11, color: T.muted, fontFamily: 'monospace' } }, 'Step ' + (stepIdx + 1) + ' / ' + totalSteps)
          ),
          stepIdx === 0 && h('div', { style: { padding: 12, borderRadius: 8, background: T.card, border: '1px solid ' + T.accent, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🚗 Customer car'),
            h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.6 } },
              h('div', null, h('strong', { style: { color: T.text } }, 'Vehicle: '), lab.car.year + ' ' + lab.car.make + ' ' + lab.car.model + ' · ' + lab.car.engine),
              h('div', null, h('strong', { style: { color: T.text } }, 'Mileage: '), lab.car.mileage.toLocaleString()),
              h('div', null, h('strong', { style: { color: T.text } }, 'History: '), lab.car.history),
              h('div', { style: { marginTop: 6 } }, h('strong', { style: { color: T.text } }, 'Symptoms: ')),
              h('ul', { style: { margin: 0, paddingLeft: 18 } },
                lab.symptoms.map(function(sy, i) { return h('li', { key: i, style: { color: T.text } }, sy); })
              )
            )
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 12px', fontSize: 15, color: T.text } }, step.prompt)
          ),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            step.choices.map(function(c) {
              return h('button', { key: c.id, 'data-ar-focusable': true,
                'aria-label': c.label,
                onClick: function() { selectChoice(step.id, c); },
                style: { textAlign: 'left', padding: 12, borderRadius: 8, background: T.cardAlt, color: T.text, border: '1px solid ' + T.border, cursor: 'pointer', fontSize: 13, lineHeight: 1.5 } },
                c.label
              );
            })
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // VIN DECODER view
      // ─────────────────────────────────────────
      function renderVin() {
        var input = d.vinInput || '';
        var decoded = input.length === 17 ? decodeVin(input) : null;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🆔 VIN decoder'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🆔 17-character VIN decoder'),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              'Enter your VIN (driver-side dash, door jamb, title, registration, or insurance card) to decode country, manufacturer, model year, and link to free recall + history lookups.'),
            h('input', { type: 'text', 'data-ar-focusable': true,
              'aria-label': 'VIN input (17 characters)',
              maxLength: 17,
              placeholder: 'e.g. 1HGCM82633A123456',
              value: input,
              onChange: function(e) { upd('vinInput', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); },
              style: { width: '100%', padding: 12, borderRadius: 8, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 16, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6, boxSizing: 'border-box' } }),
            h('div', { style: { fontSize: 11, color: T.dim } }, input.length + ' / 17 characters')
          ),
          decoded && decoded.error && h('div', { style: { padding: 12, borderRadius: 8, background: '#7c2d12', border: '1px solid ' + T.bad, color: '#fed7aa', fontSize: 13 } },
            '⚠️ ' + decoded.error),
          decoded && !decoded.error && h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent, marginBottom: 14 } },
              h('h4', { style: { margin: '0 0 10px', fontSize: 14, color: T.accentHi, fontFamily: 'monospace' } }, '🔍 ' + decoded.vin),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 } },
                [
                  { label: '🌍 Country of origin', val: decoded.country },
                  { label: '🏭 Manufacturer', val: decoded.maker },
                  { label: '📅 Model year', val: String(decoded.year) },
                  { label: '🏗️ Plant', val: decoded.plant },
                  { label: '🔢 Serial', val: decoded.serial },
                  { label: '✅ Check', val: decoded.check }
                ].map(function(r) {
                  return h('div', { key: r.label, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                    h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 4 } }, r.label),
                    h('div', { style: { fontSize: 13, color: T.text, fontWeight: 600, lineHeight: 1.4 } }, r.val)
                  );
                })
              )
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h4', { style: { margin: '0 0 10px', fontSize: 14, color: T.accentHi } }, '🔗 Free + paid lookups for this VIN'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                h('a', { href: 'https://www.nhtsa.gov/recalls?vin=' + decoded.vin, target: '_blank', rel: 'noopener',
                  style: { display: 'block', padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.good, color: T.good, textDecoration: 'none', fontSize: 13 } },
                  '🛑 NHTSA Recalls (free) → nhtsa.gov/recalls?vin=' + decoded.vin),
                h('a', { href: 'https://vpic.nhtsa.dot.gov/decoder/Decoder?vin=' + decoded.vin, target: '_blank', rel: 'noopener',
                  style: { display: 'block', padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.good, color: T.good, textDecoration: 'none', fontSize: 13 } },
                  '📋 NHTSA full vPIC decoder (free) → vpic.nhtsa.dot.gov'),
                h('a', { href: 'https://www.carfax.com/vehicle/' + decoded.vin, target: '_blank', rel: 'noopener',
                  style: { display: 'block', padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.warn, color: T.warn, textDecoration: 'none', fontSize: 13 } },
                  '📋 CarFax history report (paid, ~$40) → carfax.com'),
                h('a', { href: 'https://www.iihs.org/ratings/vehicle/' + decoded.maker.split(' ')[0].toLowerCase(), target: '_blank', rel: 'noopener',
                  style: { display: 'block', padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.accentHi, color: T.accentHi, textDecoration: 'none', fontSize: 13 } },
                  '🛡️ IIHS crash-test ratings (free) → iihs.org')
              )
            )
          ),
          h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 11, color: T.muted, lineHeight: 1.55 } },
            h('strong', { style: { color: T.accentHi } }, '🔒 Privacy: '),
            'This decoder runs locally — your VIN is not sent anywhere. The lookup links open in a new tab. NHTSA + CarFax handle their own privacy.'),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MAINTENANCE SCHEDULE view
      // ─────────────────────────────────────────
      function renderMaint() {
        var miles = parseInt(d.maintMiles || 0, 10) || 0;
        var monthsSince = parseInt(d.maintMonths || 6, 10) || 6;
        var year = parseInt(d.maintYear || 0, 10) || 0;
        var schedule = miles > 0 ? buildMaintSchedule(miles, monthsSince, year) : null;
        var statusColor = function(s) {
          if (s === 'overdue-miles' || s === 'overdue-time') return T.bad;
          if (s === 'soon-miles' || s === 'soon-time') return T.warn;
          return T.good;
        };
        var statusLabel = function(s) {
          if (s === 'overdue-miles') return '🔴 OVERDUE (mileage)';
          if (s === 'overdue-time') return '🔴 OVERDUE (time)';
          if (s === 'soon-miles') return '🟡 Soon (mileage)';
          if (s === 'soon-time') return '🟡 Soon (time)';
          return '🟢 OK';
        };

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📅 Maintenance schedule'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '📅 Personalized maintenance schedule'),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              'Generic OEM-agnostic intervals. Always cross-reference your owner\'s manual for vehicle-specific specs. Maine winter: shorten oil + brake-fluid intervals 20%.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 } },
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: T.text } },
                h('span', { style: { fontWeight: 700 } }, '🚗 Current odometer'),
                h('input', { type: 'number', 'data-ar-focusable': true,
                  'aria-label': 'Current odometer mileage',
                  min: 0, max: 500000, step: 1000,
                  placeholder: '85000',
                  value: miles || '',
                  onChange: function(e) { upd('maintMiles', e.target.value); },
                  style: { padding: 8, borderRadius: 6, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 13 } })
              ),
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: T.text } },
                h('span', { style: { fontWeight: 700 } }, '📅 Months since last service'),
                h('input', { type: 'number', 'data-ar-focusable': true,
                  'aria-label': 'Months since last service',
                  min: 0, max: 60, step: 1,
                  placeholder: '6',
                  value: monthsSince,
                  onChange: function(e) { upd('maintMonths', e.target.value); },
                  style: { padding: 8, borderRadius: 6, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 13 } })
              ),
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: T.text } },
                h('span', { style: { fontWeight: 700 } }, '🏷️ Vehicle year (optional)'),
                h('input', { type: 'number', 'data-ar-focusable': true,
                  'aria-label': 'Vehicle model year',
                  min: 1990, max: 2030, step: 1,
                  placeholder: '2015',
                  value: year || '',
                  onChange: function(e) { upd('maintYear', e.target.value); },
                  style: { padding: 8, borderRadius: 6, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 13 } })
              )
            )
          ),
          schedule && h('div', null,
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.accentHi } }, '🔧 Items to plan'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              schedule.sort(function(a, b) {
                var order = { 'overdue-miles': 0, 'overdue-time': 1, 'soon-miles': 2, 'soon-time': 3, 'ok': 4 };
                return order[a.status] - order[b.status];
              }).map(function(m, i) {
                return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + statusColor(m.status) } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' } },
                    h('strong', { style: { fontSize: 13, color: T.text, flex: 1 } }, m.item),
                    h('span', { style: { padding: '2px 8px', borderRadius: 12, background: statusColor(m.status), color: '#0f172a', fontSize: 10, fontWeight: 800 } }, statusLabel(m.status))
                  ),
                  h('div', { style: { fontSize: 11, color: T.muted, marginBottom: 4 } },
                    m.miles > 0 ? ('Every ' + m.miles.toLocaleString() + ' miles') : '',
                    m.miles > 0 && m.months > 0 ? ' or ' : '',
                    m.months > 0 ? ('every ' + m.months + ' months') : '',
                    m.milesUntil !== null && m.milesUntil > 0 ? (' · ' + m.milesUntil.toLocaleString() + ' miles to next') : ''),
                  h('div', { style: { fontSize: 11, color: T.dim, lineHeight: 1.5 } }, m.note)
                );
              })
            )
          ),
          !schedule && h('div', { style: { padding: 16, textAlign: 'center', color: T.dim, fontSize: 13 } },
            'Enter your odometer mileage above to see what\'s due soon.'),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // SCAMS view — common shop scams + how to push back
      // ─────────────────────────────────────────
      function renderScams() {
        var picked = d.scamPicked || null;
        var pickedScam = picked ? SCAMS.find(function(s) { return s.id === picked; }) : null;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🚩 Common scams'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🚩 12 shop scams to recognize'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'Most shops are honest. A few aren\'t. Knowing the most common pitches makes you a savvier customer — and you can push back politely.'),
            h('p', { style: { margin: 0, color: T.dim, fontSize: 11, lineHeight: 1.5 } },
              h('strong', null, '🛡️ Maine consumer rights: '),
              'written estimate before work, old parts on request, itemized invoice, can\'t exceed estimate by 10% without re-authorization. Maine AG: ',
              h('a', { href: 'https://www.maine.gov/ag/consumer', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'maine.gov/ag/consumer'))
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 14 } },
            SCAMS.map(function(s) {
              var sel = picked === s.id;
              return h('button', { key: s.id, 'data-ar-focusable': true,
                'aria-label': s.name,
                'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('scamPicked', sel ? null : s.id); awardBadge('scam-aware', 'Scam Aware'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#0f172a' : T.text,
                  textAlign: 'left',
                  fontWeight: sel ? 800 : 600,
                  display: 'flex', alignItems: 'flex-start', gap: 8
                }) },
                h('span', { style: { fontSize: 22 } }, s.icon),
                h('span', null, s.name)
              );
            })
          ),
          pickedScam && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.bad } },
            h('h4', { style: { margin: '0 0 10px', fontSize: 15, color: T.bad } }, pickedScam.icon + ' ' + pickedScam.name),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#7c2d12', border: '1px solid #ea580c', marginBottom: 10 } },
              h('strong', { style: { color: '#fed7aa' } }, '🎤 The pitch: '),
              h('em', { style: { color: '#fed7aa', fontSize: 13, lineHeight: 1.5 } }, pickedScam.pitch)
            ),
            h('p', { style: { margin: '0 0 10px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '✅ The truth: '), pickedScam.truth),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
              h('strong', { style: { color: T.good } }, '💬 What to ask: '), pickedScam.askFor),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
              h('strong', { style: { color: T.accentHi } }, '🎯 What to do now: '), pickedScam.doNow)
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // DAMAGE ID view — game where user identifies what they\'re seeing
      // ─────────────────────────────────────────
      function renderDamage() {
        var idx = d.damageIdx || 0;
        var answers = d.damageAnswers || {};
        var theCase = DAMAGE_CASES[idx];

        if (!theCase) {
          var score = 0;
          var total = 0;
          DAMAGE_CASES.forEach(function(c) {
            ['part', 'cause', 'sev'].forEach(function(k) {
              total++;
              var key = c.id + '_' + k;
              if (answers[key] === c[k].correct) score++;
            });
          });
          var pct = Math.round((score / total) * 100);
          if (pct >= 80) awardBadge('damage-id-ace', 'Damage ID Ace');
          return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
            backBar('🔬 Damage ID — complete'),
            h('div', { style: { padding: 18, borderRadius: 10, background: T.card, border: '2px solid ' + (pct >= 80 ? T.good : pct >= 60 ? T.warn : T.bad) } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 18, color: T.accentHi } }, '🔬 Damage ID complete'),
              h('div', { style: { fontSize: 36, fontWeight: 800, color: pct >= 80 ? T.good : pct >= 60 ? T.warn : T.bad, marginBottom: 8 } }, score + ' / ' + total + ' (' + pct + '%)'),
              h('p', { style: { margin: '0 0 10px', fontSize: 13, color: T.muted, lineHeight: 1.55 } },
                pct >= 90 ? '🏆 Visual diagnostic ace — you\'re seeing what techs see.' :
                pct >= 80 ? '🎓 Strong pattern recognition. A few details to refine.' :
                pct >= 60 ? '🚧 Good baseline. Re-read the cases to fix the misses.' :
                '📚 Worth another pass with the original cases for context.'),
              h('button', { 'data-ar-focusable': true, onClick: function() { updMulti({ damageIdx: 0, damageAnswers: {} }); }, style: btnPrimary() }, '🔄 Restart')
            ),
            disclaimerFooter()
          );
        }

        var partKey = theCase.id + '_part';
        var causeKey = theCase.id + '_cause';
        var sevKey = theCase.id + '_sev';
        var answeredAll = answers[partKey] != null && answers[causeKey] != null && answers[sevKey] != null;

        function answerFor(key, q, correct) {
          var picked = answers[key];
          var submitted = picked != null;
          return h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 13, color: T.accentHi } }, q.q),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              q.a.map(function(opt, i) {
                var isPicked = picked === i;
                var isCorrect = i === q.correct;
                var bg, border, color;
                if (submitted) {
                  if (isCorrect) { bg = '#064e3b'; border = T.good; color = '#d1fae5'; }
                  else if (isPicked) { bg = '#7f1d1d'; border = T.bad; color = '#fee2e2'; }
                  else { bg = T.bg; border = T.border; color = T.muted; }
                } else if (isPicked) {
                  bg = T.accent; border = T.accent; color = '#0f172a';
                } else { bg = T.bg; border = T.border; color = T.text; }
                return h('button', { key: i, 'data-ar-focusable': true,
                  'aria-label': opt, disabled: submitted,
                  onClick: function() { var nv = Object.assign({}, answers); nv[key] = i; upd('damageAnswers', nv); },
                  style: { padding: 10, borderRadius: 6, background: bg, color: color, border: '1px solid ' + border, cursor: submitted ? 'default' : 'pointer', textAlign: 'left', fontSize: 12, lineHeight: 1.5 } },
                  String.fromCharCode(65 + i) + '. ' + opt
                );
              })
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🔬 Damage ID'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 8 } }, 'Case ' + (idx + 1) + ' of ' + DAMAGE_CASES.length),
            h('h3', { style: { margin: '0 0 12px', fontSize: 14, color: T.text, lineHeight: 1.6 } }, '👁️ What you see: ' + theCase.visual)
          ),
          answerFor(partKey, theCase.part),
          answerFor(causeKey, theCase.cause),
          answerFor(sevKey, theCase.sev),
          answeredAll && h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 10 } },
            h('button', { 'data-ar-focusable': true, onClick: function() { upd('damageIdx', idx + 1); }, style: btnPrimary() },
              idx + 1 < DAMAGE_CASES.length ? '→ Next case' : '🎉 Finish')
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // ROI CALCULATOR view — keep-or-sell decision tool
      // ─────────────────────────────────────────
      function renderROI() {
        var vehVal = parseInt(d.roiVehVal || 0, 10) || 0;
        var repCost = parseInt(d.roiRepCost || 0, 10) || 0;
        var age = parseInt(d.roiAge || 0, 10) || 0;
        var miles = parseInt(d.roiMiles || 0, 10) || 0;
        var loomingCost = parseInt(d.roiLooming || 0, 10) || 0;
        var attachment = d.roiAttach || 'medium';
        var result = (vehVal > 0 && repCost > 0) ? repairROI({ vehicleValue: vehVal, repairCost: repCost, age: age, miles: miles, loomingCost: loomingCost, attachment: attachment }) : null;
        var verdictColor = function(v) {
          if (v === 'fix') return T.good;
          if (v === 'fix-cautiously') return T.warn;
          if (v === 'consider-selling') return T.bad;
          return T.muted;
        };
        var verdictLabel = function(v) {
          if (v === 'fix') return '✅ Math favors REPAIR';
          if (v === 'fix-cautiously') return '⚠️ Repair, but cautiously';
          if (v === 'consider-selling') return '🚩 Consider SELLING';
          return v;
        };

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('💵 Repair ROI calculator'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '💵 Should I fix it or sell it?'),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              'Rule of thumb: when repair cost exceeds 50% of vehicle value (or 70% with looming work added), the math typically favors selling. Inputs below.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 } },
              [
                { id: 'roiVehVal', label: '🚗 Current vehicle value ($)', placeholder: '4000', val: vehVal, type: 'number' },
                { id: 'roiRepCost', label: '🔧 Repair cost quoted ($)', placeholder: '2500', val: repCost, type: 'number' },
                { id: 'roiLooming', label: '⏳ Other looming work ($)', placeholder: '0', val: loomingCost, type: 'number' },
                { id: 'roiAge', label: '📅 Vehicle age (years)', placeholder: '12', val: age, type: 'number' },
                { id: 'roiMiles', label: '🛣️ Mileage', placeholder: '180000', val: miles, type: 'number' }
              ].map(function(f) {
                return h('label', { key: f.id, style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: T.text } },
                  h('span', { style: { fontWeight: 700 } }, f.label),
                  h('input', { type: f.type, 'data-ar-focusable': true,
                    'aria-label': f.label,
                    placeholder: f.placeholder,
                    value: f.val || '',
                    onChange: function(e) { upd(f.id, e.target.value); },
                    style: { padding: 8, borderRadius: 6, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 13 } })
                );
              }),
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: T.text } },
                h('span', { style: { fontWeight: 700 } }, '❤️ Emotional attachment'),
                h('select', { 'data-ar-focusable': true,
                  'aria-label': 'Emotional attachment to vehicle',
                  value: attachment,
                  onChange: function(e) { upd('roiAttach', e.target.value); },
                  style: { padding: 8, borderRadius: 6, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 13 } },
                  h('option', { value: 'low' }, 'Low — would happily upgrade'),
                  h('option', { value: 'medium' }, 'Medium — fine either way'),
                  h('option', { value: 'high' }, 'High — sentimental value')
                )
              )
            )
          ),
          result && h('div', { style: { padding: 16, borderRadius: 10, background: T.card, border: '2px solid ' + verdictColor(result.verdict), marginBottom: 14 } },
            h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 4 } }, 'Recommendation'),
            h('div', { style: { fontSize: 22, fontWeight: 800, color: verdictColor(result.verdict), marginBottom: 8 } },
              verdictLabel(result.verdict)),
            h('p', { style: { margin: '0 0 12px', fontSize: 14, color: T.text, lineHeight: 1.55 } }, result.summary),
            h('h4', { style: { margin: '0 0 6px', fontSize: 13, color: T.accentHi } }, 'Reasoning'),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.7 } },
              result.reasons.map(function(r, i) { return h('li', { key: i }, r); })
            )
          ),
          !result && h('div', { style: { padding: 16, textAlign: 'center', color: T.dim, fontSize: 13 } },
            'Enter vehicle value + repair cost to see the recommendation.'),
          h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 11, color: T.muted, lineHeight: 1.55 } },
            h('strong', { style: { color: T.accentHi } }, '🎯 How to find vehicle value: '),
            h('a', { href: 'https://www.kbb.com/whats-my-car-worth/', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'Kelley Blue Book'),
            ' or ',
            h('a', { href: 'https://www.edmunds.com/appraisal/', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'Edmunds appraisal'),
            '. Use the "Private Party Sale" or "Trade-in" value, NOT the dealer-retail price (which inflates your input).'),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // SERVICE LOG view — user records their own maintenance history
      // ─────────────────────────────────────────
      function renderLog() {
        var entries = d.serviceLog || [];
        var draft = d.logDraft || { date: '', odo: '', service: '', cost: '', notes: '' };

        function updateDraft(key, val) {
          var newDraft = Object.assign({}, draft); newDraft[key] = val;
          upd('logDraft', newDraft);
        }
        function saveEntry() {
          if (!draft.date || !draft.service) {
            arAnnounce('Please enter at least date and service.');
            return;
          }
          var entry = {
            id: 'log_' + Date.now(),
            date: draft.date,
            odo: parseInt(draft.odo, 10) || 0,
            service: draft.service,
            cost: parseFloat(draft.cost) || 0,
            notes: draft.notes || ''
          };
          var newEntries = [entry].concat(entries);
          updMulti({ serviceLog: newEntries, logDraft: { date: '', odo: '', service: '', cost: '', notes: '' } });
          arAnnounce('Service entry saved.');
          if (newEntries.length === 1) awardBadge('first-log', 'First Log Entry');
          if (newEntries.length === 10) awardBadge('log-keeper', 'Log Keeper (10 entries)');
        }
        function deleteEntry(id) {
          var newEntries = entries.filter(function(e) { return e.id !== id; });
          upd('serviceLog', newEntries);
          arAnnounce('Entry removed.');
        }
        function exportCSV() {
          var lines = ['date,odometer,service,cost,notes'];
          entries.forEach(function(e) {
            lines.push([e.date, e.odo, '"' + (e.service || '').replace(/"/g, '""') + '"', e.cost, '"' + (e.notes || '').replace(/"/g, '""') + '"'].join(','));
          });
          var csv = lines.join('\n');
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(csv);
            addToast('CSV copied to clipboard');
          } else {
            console.log(csv);
            addToast('CSV in console (clipboard unavailable)');
          }
        }
        var totalSpent = entries.reduce(function(acc, e) { return acc + (e.cost || 0); }, 0);
        var quickServices = ['Oil + filter change', 'Tire rotation', 'Brake pads (front)', 'Brake fluid flush', 'Coolant flush', 'Air filter', 'Cabin air filter', 'Wiper blades', 'Battery replacement', 'Spark plugs', 'Maine state inspection', 'Tire replacement (set)', 'Alignment'];

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📓 Service log'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '📓 Your maintenance history'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              'Record every service you do (DIY or shop) so future you (or the next buyer) has documentation. Saved automatically. ',
              h('strong', { style: { color: T.accentHi } }, 'Total tracked: '), entries.length + ' entries · $' + totalSpent.toFixed(2))
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.accent, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 10px', fontSize: 14, color: T.accentHi } }, '➕ Add service'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 8 } },
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: T.text } },
                h('span', { style: { fontWeight: 700 } }, '📅 Date'),
                h('input', { type: 'date', 'data-ar-focusable': true, 'aria-label': 'Service date',
                  value: draft.date,
                  onChange: function(e) { updateDraft('date', e.target.value); },
                  style: { padding: 8, borderRadius: 6, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 13 } })
              ),
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: T.text } },
                h('span', { style: { fontWeight: 700 } }, '🛣️ Odometer'),
                h('input', { type: 'number', 'data-ar-focusable': true, 'aria-label': 'Odometer mileage',
                  placeholder: '85432',
                  value: draft.odo,
                  onChange: function(e) { updateDraft('odo', e.target.value); },
                  style: { padding: 8, borderRadius: 6, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 13 } })
              ),
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: T.text } },
                h('span', { style: { fontWeight: 700 } }, '💵 Cost'),
                h('input', { type: 'number', step: '0.01', 'data-ar-focusable': true, 'aria-label': 'Cost in dollars',
                  placeholder: '45.00',
                  value: draft.cost,
                  onChange: function(e) { updateDraft('cost', e.target.value); },
                  style: { padding: 8, borderRadius: 6, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 13 } })
              )
            ),
            h('label', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: T.text, marginBottom: 8 } },
              h('span', { style: { fontWeight: 700 } }, '🔧 Service'),
              h('input', { type: 'text', 'data-ar-focusable': true, 'aria-label': 'Service description', list: 'log-quick-services',
                placeholder: 'Oil + filter change',
                value: draft.service,
                onChange: function(e) { updateDraft('service', e.target.value); },
                style: { padding: 8, borderRadius: 6, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 13 } }),
              h('datalist', { id: 'log-quick-services' },
                quickServices.map(function(s, i) { return h('option', { key: i, value: s }); }))
            ),
            h('label', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: T.text, marginBottom: 8 } },
              h('span', { style: { fontWeight: 700 } }, '📝 Notes (oil grade, parts brand, shop name, etc.)'),
              h('input', { type: 'text', 'data-ar-focusable': true, 'aria-label': 'Service notes',
                placeholder: 'Synthetic 0W-20, OEM filter, Mike\'s Auto on Main St',
                value: draft.notes,
                onChange: function(e) { updateDraft('notes', e.target.value); },
                style: { padding: 8, borderRadius: 6, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 13 } })
            ),
            h('button', { 'data-ar-focusable': true,
              'aria-label': 'Save service log entry',
              onClick: saveEntry,
              style: btnPrimary() }, '💾 Save entry')
          ),
          entries.length > 0 && h('div', null,
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 } },
              h('h4', { style: { margin: 0, fontSize: 14, color: T.accentHi } }, '📋 Entries (newest first)'),
              h('button', { 'data-ar-focusable': true,
                'aria-label': 'Export log as CSV', onClick: exportCSV, style: btnGhost() }, '📤 Export CSV')
            ),
            h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              entries.map(function(e) {
                return h('div', { key: e.id, role: 'listitem',
                  style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' } },
                    h('strong', { style: { fontSize: 13, color: T.accentHi } }, e.service),
                    h('span', { style: { fontSize: 11, color: T.muted } }, '📅 ' + e.date),
                    h('span', { style: { fontSize: 11, color: T.muted } }, '🛣️ ' + (e.odo || '—').toLocaleString()),
                    h('span', { style: { fontSize: 11, color: T.good, fontWeight: 700 } }, '💵 $' + e.cost.toFixed(2)),
                    h('button', { 'data-ar-focusable': true,
                      'aria-label': 'Delete this entry',
                      onClick: function() { deleteEntry(e.id); },
                      style: Object.assign({}, btnGhost(), { marginLeft: 'auto', color: T.bad, fontSize: 10 }) }, '🗑️ Delete')
                  ),
                  e.notes && h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.5, marginTop: 2 } }, e.notes)
                );
              })
            )
          ),
          entries.length === 0 && h('div', { style: { padding: 16, textAlign: 'center', color: T.dim, fontSize: 13, marginTop: 14 } },
            'No entries yet. Add your first one above.'),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // VIEW ROUTER
      // ─────────────────────────────────────────
      switch (view) {
        case 'diagnose':   return renderDiagnose();
        case 'tree':       return renderTree();
        case 'lab':        return renderLab();
        case 'repair':     return renderRepair();
        case 'tools':      return renderTools();
        case 'safety':     return renderSafety();
        case 'inspection': return renderInspection();
        case 'usedcar':    return renderUsedCar();
        case 'estimate':   return renderEstimate();
        case 'scams':      return renderScams();
        case 'damage':     return renderDamage();
        case 'roi':        return renderROI();
        case 'log':        return renderLog();
        case 'ev':         return renderEv();
        case 'glossary':   return renderGlossary();
        case 'cold':       return renderColdPrep();
        case 'roadside':   return renderRoadside();
        case 'shopbiz':    return renderShopBiz();
        case 'firstcar':   return renderFirstCar();
        case 'vin':        return renderVin();
        case 'maint':      return renderMaint();
        case 'career':     return renderCareer();
        case 'quiz':       return renderQuiz();
        case 'resources':  return renderResources();
        case 'menu':
        default:           return renderMenu();
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
