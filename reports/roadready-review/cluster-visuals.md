# Road Ready: focused cockpit instruments

Driver and Calm modes now use a simpler digital instrument cluster. The speed readout, posted-limit sign, gear, fuel/battery level, and safety score occupy separate columns with consistent spacing. The cluster retains the previous 96-pixel footprint so it does not cover more roadway.

The digital speed reads the current measured speed. Gear states include readable Park, Drive, or Reverse labels. Ride-Along shows that transmission control is managed. Fuel and battery levels use a percentage and horizontal segmented gauge. Economy remains visible on wider screens and in the detailed HUD; compact mode gives priority to driving information.

Turn arrows remain inside the viewport and share the signal timer. The default cluster removes duplicate indicators, decorative gauge glow, and overlapping shortcut text. Critical traction, hydroplaning, and ABS indicators take priority over routine or fuel warnings. The existing low-fuel alert and chime remain outside the drawing-mode branches.

Science and Instructor modes retain their extra instruments. Driving physics, control bindings, fuel accounting, and scoring are unchanged.

## Verification

- Responsive geometry checks cover widths from 320 to 1920 pixels, including separation between columns and visible turn arrows.
- Canvas checks cover readable labels, zero fuel, and critical-warning priority.
- The browser regression covers the full desktop cockpit, 390- and 320-pixel phones, the low-fuel alert, and switching back to detailed instruments. It uses the actual tool and a reduced device pixel ratio for this host's software renderer.

[Instrument detail preview](cluster-detail.png) · [Desktop cockpit](cluster-desktop.png) · [390 px phone](cluster-mobile-390.png) · [320 px phone](cluster-mobile-320.png) · [Low fuel](cluster-low-fuel.png)

Changes are local; no commit or deployment was performed.
