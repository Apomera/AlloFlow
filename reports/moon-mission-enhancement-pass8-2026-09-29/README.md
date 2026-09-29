# Moon Mission enhancement, pass 8

Earth return now follows a single curved orbital trajectory. Position, speed components, the velocity arrow, elapsed time, Earth angular size and the entry handoff agree with the same physical state.

- Replaced radial return motion with a planar Kepler ellipse that conserves energy and angular momentum. The boundary state shares the entry model's spherical Earth, 122 km interface and 11.03 km/s speed.
- The selected entry angle constructs the corresponding educational return preset. The nominal coast takes 62.859 model hours. At −6.5° interface, radial closing speed is 1.249 km/s and tangential speed is 10.959 km/s; total speed remains 11.030 km/s.
- Added whole-return and approach views with equal axes, a measured trail and velocity arrow, Earth at physical scale, a detailed CSM/CM glyph and a distance-derived angular crew window. Coasting has no engine plume.
- Added saved pause/play, physical time seeking, four playback rates, keyboard End, final-approach and SM-separation milestones. Playback automatically changes to the approach view at 60× for the final 15 model minutes; separation occurs 833 model seconds before interface.
- Recorded arrival survives earlier review and reload. Changing the angle clears it. Malformed and stale saved claims are recomputed and rejected. Entry can begin after the chosen interface has been reviewed, and review awards no points.
- Archived flight summaries and downloaded reports include measured return evidence. Replay clears the return run and settings; older entry and flight records remain reviewable.

The departure is an Earth-only boundary-value preset, separate from TEI and lunar navigation. Changing the angle does not fire a correction burn. The fixed Sun direction is an illumination preset. Lunar and solar gravity, inclination, navigation error and attitude maneuvers are omitted. See [physics and primary sources](PHYSICS.md).

All **434 distinct unit checks across 46 files** and **14 distinct Chromium workflows** pass. The exact review candidate passes **34 focused checks**. Physics checks include conservation, an independent forward RK4 comparison, derivatives, all selectable angles, speed components, separation timing and angular Earth geometry. Playback checks cover hidden-page clocks, resizing, reload, keyboard End, plan invalidation, malformed saves, progression, reports and replay.

The 320 px workflow has **zero scoped WCAG axe violations** and no horizontal overflow. All six final return captures were reviewed, including whole-orbit, final-approach, SM separation, nominal and shallow interfaces, and the phone layout. Canonical/public parity, syntax and scoped whitespace checks pass. See [verification](verification.json), [full unit results](unit-verified.json), [browser results](browser-verified.json) and [source verification](source-verification.json).

The initial regression runs exposed legacy expectations for the radial speed and former illustrated lighting; those checks now use the measured orbit. The browser run also caught a corrupt completed save at the terminal time immediately recreating its arrival flag. Such claims now restart unverified at departure, with both unit and browser coverage. Original failed results remain alongside the successful final runs.

Review captures: [whole return](return/return-whole-orbit-chromium.png), [final approach](return/return-final-approach-chromium.png), [SM separation](return/return-sm-separation-chromium.png), [entry interface](return/return-entry-interface-chromium.png), [shallow interface](return/return-shallow-interface-chromium.png), [320 px phone](return/return-phone-320-chromium.png).

The working source retains all 34 recorded pre-existing Moonwalk hunks. The review candidate excludes those hunks while retaining this return enhancement. Baseline copies and temporary review sources stay outside the scoped commit.
