# Moon Mission: physical entry and flight replay

Completed locally on 2026-09-27. This continues the descent, rover and flight-review work in `cbdace49b`.

## What changed

- Atmospheric entry now integrates altitude, speed, flight-path angle, downrange, heating and aerodynamic energy loss together. It uses spherical gravity, a layered atmosphere, capsule drag and modest guided lift, with fourth-order Runge–Kutta integration.
- Drogue and main parachutes require appropriate altitude, speed and dynamic pressure. Their gradual inflation controls both the drag force and the drawn canopy size.
- Shallow entries can cross back above 122 km and terminate as skip-outs. They never acquire parachutes, a recovery scene or splashdown credit.
- The return coast reaches the entry model's 122 km / 11.03 km/s starting conditions. Service Module separation occurs 833 model seconds before entry. The final 15 model minutes play more slowly so the separation is visible.
- The entry planner offers shallow, reference and steep presets with predictions from the same profiles used during playback.
- A flight recorder adds eight live instruments, load and heat-flux plots, a time slider, pause, 1×/10×/30×/60× playback, and an immediate result view for paused or reduced-motion use.
- Capsule detail, atmospheric limb, plasma, parachute gores/risers, apex-cover release, drogue release and recovery visuals are improved. Blackout is a contained caption, and phone captions wrap.
- Paused and completed scenes repaint after resize. Hidden tabs reset the playback clock. Saved runs retain their playhead and recorded result, including backward review after completion.
- Entry attempts are bounded to five compact records. Retries pay only an improvement toward the 25 XP entry maximum; completion pays 50 XP once. Legacy summaries and rewards survive migration. Debriefs and exported flight reports include modern physical measurements.

## Numerical examples

| Entry angle | Computed result | Peak load | Peak convective heat flux |
|---|---|---:|---:|
| −5.0° | Skip-out at about 236 s | 0.93 g | 0.74 MW/m² |
| −6.5° | Splashdown at about 811 s | 6.91 g | 1.70 MW/m² |
| −9.0° | Splashdown with a high-load caution | 21.45 g | 2.56 MW/m² |

The reference run deploys drogues at about 450 s and mains at about 517 s. It reaches the water at about 9.3 m/s, with an integrated convective heat load of about 158 MJ/m².

## Model scope

This is an educational point-mass model. It assumes constant capsule mass/aerodynamic properties, a spherical non-rotating Earth, an approximate standard atmosphere and simplified lift guidance. The coast remains a separate radial Earth-gravity model; its curved path and lighting are illustrations.

Heating is a Sutton–Graves convective heat-flux estimate and its time integral. There is no material-temperature, ablation, radiation or crew-survival model. The 10 g caution is an authored teaching threshold. Radio blackout, scene scale and the compressed recovery sequence are illustrative. A skipped capsule's later orbit or return is not integrated.

References used for constants, context and sequences:

- [NASA Apollo entry measurements](https://ntrs.nasa.gov/citations/19710015566)
- [U.S. Standard Atmosphere, 1976](https://ntrs.nasa.gov/citations/19770009539)
- [NASA heating-relation reference](https://ntrs.nasa.gov/api/citations/20220018610/downloads/AIAA_Aviation_2022_Paper-6.pdf)
- [Apollo 11 Mission Report, table 3-I](https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf)
- [Apollo parachute testing](https://www.nasa.gov/history/throwback-to-apollo-parachute-testing/)

## Validation

**280 unique Moon Mission unit checks pass** across the full run and subsequent affected-suite runs. The initial full run passed 277/280; two older tests assumed immediate splashdown or the previous canvas description, and one newly authored completion test was read before its correction finished. The affected integration run passed 77/77, and the final review run passed 88/88. No unresolved cases remain.

Numerical tests cover all 51 slider angles, trajectory derivatives, energy dissipation, integrated heating, parachute constraints/inflation, step-size convergence, terminal-event handling and bounded immutable caching. Other checks cover coast continuity, frame-rate independence, actual canvas telemetry, focus, labels, saved records, reward gates and source parity.

**Eight Chromium scenarios pass** on the final source with one worker and no retries: planner predictions; nominal heating/chutes/replay/reload; steep entry; skip/retry rewards; paused resize and restore; phone controls and completed resize; legacy migration; hidden-tab clock behavior. Ten desktop/phone captures were visually reviewed, with misleading readiness text corrected before the final run. Browser coverage uses the real module in the local STEM harness.

The test environment emits its existing jsdom canvas warnings for unrelated preview paths. Real canvas behavior is covered by Chromium. No full application build, production deployment or live account workflow was performed.

Canonical and desktop modules match SHA256:

`8f25c4917f36f7f6c18c6a7a5f74cdecad41fec23c9376d299912031cbee8155`

## Visual evidence

Selected captures are saved in this report's `entry` folder: `entry-nominal-heating-chromium.png`, `entry-main-inflating-chromium.png`, `entry-paused-phone-chromium.png` and `entry-shallow-skip-chromium.png`.

The complete local run outputs are `full-unit-tests.json`, `final-integration-tests.json`, `final-review-tests.json` and `final-browser-results/`. `verification.json` records the compact result and source hash. Only Moon Mission files and this report are included in the scoped commit; other chats' work is preserved.
