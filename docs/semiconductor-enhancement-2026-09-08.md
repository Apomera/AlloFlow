# Semiconductor Lab enhancement — 2026-09-08

Implemented in the source plugin and its identical desktop/public mirror.

## Learning and interaction
- Added a rotatable 3D silicon diamond-cubic unit-cell inspector in **Doping → 3D crystal**. Drag or use keyboard/button controls to rotate, tilt, zoom, reset, hide bonds, and isolate four tetrahedral neighbors.
- The 3D view shows one representative dopant substitution, with donor/acceptor ionization explained in text. Geometry is projected from 3D coordinates into SVG; no WebGL or network dependency is required.
- Added optional predictions and baseline/current evidence comparisons across all 15 guided workspaces. Foundation workspaces include calculated outputs; other workspaces compare input settings.
- Saved observations include the prediction and the evidence table. Three foundational concept checks provide explanatory feedback without awarding completion for a guessed answer.
- Added a shared particle-motion pause control. Reduced-motion handling remains available.
- Moved controls next to diagrams, reduced oversized desktop canvases, removed decorative pulsing, separated overlapping energy annotations, and improved band-label contrast.

## Scientific corrections
- Band gaps for Si, Ge, and GaAs use Varshni temperature curves anchored to the lab's rounded 300 K references. Intrinsic carrier density now changes with temperature using nondegenerate equilibrium statistics and T^(3/2) effective density-of-states scaling.
- Photon wavelength determines photon energy. Below-gap photons no longer produce band-to-band excitation in the diagram.
- Diamond is identified as a wide-gap semiconductor rather than classified solely by an arbitrary gap cutoff.
- Junction bias is classified by sign: +0.1 V is forward bias, not equilibrium. Depletion charge is drawn within the depletion region. Reverse-biased neutral regions retain mobile carriers.
- The junction readout and miniature I–V graph share one illustrative ideal-diode model. Unsupported breakdown claims and arbitrary current percentages were removed. The guided forward-bias preset is +0.5 V, inside the depletion model's displayed range.
- Doping Discovery now solves n − p = ND and np = ni² with material- and temperature-dependent ni. It supports an intrinsic sample, meaningful donor densities, and visible comparison logs. It withholds numerical carrier estimates when degeneracy makes the approximation unsuitable.
- Doping-grid counts are bounded to the grid and placement collisions are resolved.

## Model scope
These are teaching models. The 3D crystal is a geometric inspector, not a quantum transport simulation. Atom sizes and dopant abundance are exaggerated. Carrier trajectories are schematic.

The junction assumes an abrupt symmetric silicon junction at 300 K, ND = NA = 10^16 cm^-3 and an approximate built-in voltage of 0.7 V. Its illustrative current uses Is = 1 pA and ideality 1.5. Strong forward bias, breakdown, resistance, and heating are outside this model. LED glow is explicitly an analogy for a different material.

Doping Discovery assumes fully ionized donors, no compensation, and thermal equilibrium at 250–500 K. Numerical estimates are withheld above n/Nc = 0.1. Other band-gap materials retain local linear temperature estimates, whose limitations are stated in the UI. Room-temperature concentration references are retained for consistency with the existing lessons; they are rounded teaching values, not precision material characterization.

New English fallbacks are recorded in the semiconductor authoring catalog. This change does not provide new human translations for every locale.

## References
- [Ioffe Institute — silicon band structure](https://www.ioffe.ru/SVA/NSM/Semicond/Si/bandstr.html): temperature-dependent gap and intrinsic statistics.
- [Ioffe Institute — germanium](https://www.ioffe.ru/SVA/NSM/Semicond/Ge/bandstr.html) and [GaAs](https://www.ioffe.ru/SVA/NSM/Semicond/GaAs/bandstr.html): material parameters.
- [Ioffe Institute — silicon basic properties](https://www.ioffe.ru/SVA/NSM/Semicond/Si/basic.html): diamond crystal structure.
- [TU Graz — doped semiconductors](https://lampz.tugraz.at/~hadley/ss1/book/bands/semiconductors/extrinsic.php): charge neutrality and mass action.
- [OpenStax — semiconductor devices](https://openstax.org/books/university-physics-volume-3/pages/9-7-semiconductor-devices): junction formation and bias behavior.

## Validation
- Semiconductor Vitest suite: 119 tests across 8 files.
- Browser runner: dev-tools/semiconductor_visual_qa.cjs.
- Desktop 1280 px and mobile 390 px: interaction, overflow, 3D geometry bounds, keyboard rotation, bond isolation, 2D restoration, photon threshold, prediction/evidence persistence, junction presets, concept feedback, discovery logging, all 15 workspaces/four modes, and pause behavior.
- Axe WCAG A/AA scan: zero violations in Band Gap, Doping, P-N Junction, and Doping Discovery. Automated results do not replace assistive-technology testing.
- Visual captures and machine-readable browser/accessibility reports are in reports/semiconductor-enhancement/.

## Device experiments — second pass

- **Transistor:** NMOS and PMOS share a long-channel square-law model across diagrams, numerical readouts and notebook evidence. Drain bias affects current in the linear region; current remains continuous at saturation. PMOS voltages and drain current use signed conventions. A zero-drain-bias preset makes the distinction between forming a channel and driving current observable. BJT controls now use base-emitter voltage and identify the drive animation as qualitative. CMOS identifies its both-on transition instead of presenting every input as a valid logic level.
- **3D device cutaway:** Transistor → 3D device cutaway opens a rotatable layer view with separated gate and oxide, selectable layer explanations, keyboard camera controls, and a gate-dependent channel. This is a schematic planar device inspector linked to the electrical model, not a field or quantum transport solver.
- **Solar Cell:** An empirical generating-quadrant curve, I = Isc[1 − (V/Voc)^10], supplies the plotted current, analytic maximum-power point and resistive load intersection. Irradiance scales photocurrent linearly. Area, temperature and irradiance update the same model. Open circuit, short circuit, darkness and matched-load presets reveal why maximum available power differs from delivered power. Chart normalization and operating-point symbols are explained.
- **Amplifier:** Waveform and Bode views share a two-pole teaching response, including phase, load-dependent midband gain, input amplitude, supply voltage and output bias. Rail clipping produces flat peaks without shrinking the signal first. Zero input gives a flat output at the bias voltage. Frequency changes the response and time-window labels.
- **I–V Curves:** Diode and LED currents solve the exponential junction relation together with series resistance (10 Ω and 20 Ω). The LED curve is continuous. A 1 kΩ reference uses the same axis units. Off-scale markers indicate values outside the plot without drawing a false current plateau. The simplified 5.1 V Zener knee remains explicit.
- All four device workspaces now offer a misconception check and save calculated outputs alongside baseline/current inputs in guided notebook entries.

These parameter choices are illustrative. MOSFET subthreshold current, channel-length modulation and body effect are omitted. Solar presets are not efficiency records; their common temperature coefficients are not material-specific characterization. The amplifier is a behavioral response with ideal supply clamps, not a solved transistor bias circuit. Diode reverse breakdown is omitted except for the fixed Zener knee.

References used for the device revisions:
- [MIT — MOSFET operation](https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c3/c3s1/): gate control and operating regions.
- [PVEducation — I–V curve](https://www.pveducation.org/pvcdrom/solar-cell-operation/iv-curve) and [light intensity](https://www.pveducation.org/pvcdrom/solar-cell-operation/effect-of-light-intensity): load endpoints, maximum power, linear photocurrent and logarithmic open-circuit voltage. The empirical exponent-10 curve is the lab's approximation.
- [Analog Devices — AN-581](https://www.analog.com/en/resources/app-notes/an-581.html): supply headroom and bias placement.

Second-pass validation:
- 139 Vitest tests across 9 semiconductor files, including 20 added device checks.
- Both browser runners: `dev-tools/semiconductor_visual_qa.cjs` and `dev-tools/semiconductor_devices_qa.cjs`.
- Device checks cover NMOS/PMOS regions, channel with zero current, 3D keyboard/layer controls, BJT voltage range, CMOS transition, solar endpoint/load experiments, amplifier clipping/zero input/Bode views, diode off-scale rendering, concept feedback and saved numerical evidence.
- Desktop 1280 px and mobile 390 px screenshots; no horizontal overflow in the four device workspaces.
- Zero automated WCAG A/AA violations in the four device workspaces, in addition to the four foundational workspaces. Manual assistive-technology testing is still separate.
- Source and desktop public copy are identical. New explanatory UI is English; additional locale translations remain future work.

## Quantum Wells and Circuit Lab — third pass

Quantum Wells now solves a symmetric finite square well, instead of using infinite-well energies beneath a finite barrier drawing. It also offers the infinite-barrier limit as an explicit comparison. The solver uses an equal effective mass throughout, matches the wavefunction and derivative at both boundaries, and includes exponential tails in normalization. Bound-state count, selectable states, energies and integrated outside probability all come from this model.

The energy diagram and selected wavefunction/probability profile have separate vertical axes. A 5 nm well with 0.3 eV barriers and mass 0.067 mₑ now has E1 ≈ 0.0896 eV, versus ≈ 0.2245 eV for infinite barriers. The shallow-well preset illustrates that an attractive 1D finite well still supports a ground state. Adjacent subband spacings are distinguished from interband LED emission. The earlier cosmetic electric-field control is removed; this solver assumes zero field and identifies older saved field settings as unapplied.

The former InP/InGaAsP preset is omitted from the new selector; unrecognized saved presets fall back to GaAs/AlGaAs. The remaining presets choose representative electron effective masses, while the user supplies the barrier height. The tool does not calculate heterostructure band offsets, mass mismatch, nonparabolicity, electron interactions or field-induced shifts. The plot can truncate very long tails; reported probabilities integrate all space.

Circuit Lab now computes a single series path live. Each resistor has an editable value. Incomplete or out-of-range entries withhold results while the learner types. Silicon diodes and red LEDs share the I–V workspace's nonlinear equation and illustrative internal resistance. No external resistor is invented. The display shows component voltage drops, power, and a voltage-balance bar. Zero supply gives zero current. Ideal capacitors block steady DC after charging; their transient behavior and individual final voltages are not inferred. Unsupported saved transistors receive an explicit explanation instead of silently disappearing from the calculation.

Starter experiments include a resistor baseline, LED circuit, voltage sharing and a capacitor at steady DC. Component removal is visible and touch sized. Both workspaces add concept feedback and calculated notebook evidence.

References:
- [MIT Quantum Physics I, Lecture 11](https://ocw.mit.edu/courses/8-04-quantum-physics-i-spring-2016/a565b327f85c7721b18f1074dbd69ede_MIT8_04S16_LecNotes11.pdf): finite/infinite wells and matching boundary conditions. This lab references energies to the well bottom.
- [OpenStax, RC circuits](https://openstax.org/books/university-physics-volume-2/pages/10-5-rc-circuits): capacitor charging and final steady current.

Validation:
- 160 semiconductor tests across 10 files, including 21 added confinement/circuit tests. Numerical checks cover finite-well root conditions, normalization, continuity, parity, exponential decay, the infinite limit, voltage balance, power conservation, nonlinear load lines and unsupported components.
- Browser runner: `dev-tools/semiconductor_confinement_circuits_qa.cjs`. Desktop 1280 px and mobile 390 px interaction/overflow checks, saved evidence, touch removal and misconception feedback pass.
- Automated WCAG A/AA scans: zero violations in Quantum Wells and Circuit Lab. Captures and machine-readable reports live alongside the earlier reports in `reports/semiconductor-enhancement/`.
- Source and desktop public copy remain identical. New interface prose is English; this pass does not add full locale translations.

## Memory Cells and Wafer Fab — fourth pass

Memory Cells now runs five independent 16-cell experiments for SRAM, DRAM, NOR flash, NAND flash and FeRAM. Learners select an address, enable writes, store and read values, advance lesson time, and remove or restore power. The displayed model state is distinct from the last recorded read. Operation history makes cause and effect reviewable.

Volatile power loss makes stored bits unknown rather than inventing zeros. DRAM refresh preserves still-valid information but cannot reconstruct bits already lost; a valid read restores the selected cell. Automatic refresh is available for comparison. Flash illustrates the common single-level convention of programming 1 to 0 and erasing the teaching block to 1. FeRAM illustrates remanent polarization, with both states writable without flash erase. Each technology retains its own bank when switching views. Resetting the guided SRAM experiment preserves the other banks.

Memory time is measured in manual lesson steps, with an illustrative six-step DRAM retention limit. It is not hardware timing or a calibrated leakage simulation. Initial known RAM/FeRAM zeros are prepared teaching states, not a guarantee about power-up contents. Flash geometry, erase-block size and physical storage mechanisms are schematic; device-specific behavior is outside this model.

Wafer Fab now connects eight representative stages through process, resulting structure and purpose. Mask openings carry through lithography, oxide etching and implantation. Implant dose changes the schematic ion population, energy changes its depth, and an activation-anneal option distinguishes implanted ions from electrically active dopants. Learners can compare phosphorus donors and boron acceptors. Ion counts are compressed for readability and depth is not a measured range prediction.

Oxidation uses a normalized linear-parabolic relation with illustrative Arrhenius coefficients. The dimensionless growth index is 1 at 1000 °C for 30 minutes and zero at zero duration. It is not oxide thickness in nm or a calibrated furnace recipe. The drawing caps layer height for readability. The fabrication walkthrough is representative, not a complete CMOS manufacturing sequence.

Completion requires visiting all eight stages; jumping to the last stage cannot finish the walkthrough. Both workspaces include misconception feedback and calculated notebook evidence. Reading a written memory cell preserves guided progress and the observation entry step.

References:
- [Texas Instruments — FRAM technology](https://www.ti.com/lit/pdf/slaa502): ferroelectric polarization, retention and sense restoration.
- [Micron — technical FAQs](https://www.micron.com/sales-support/sales/faqs): DRAM refresh and retention depend on device operating requirements.
- [Infineon — NOR flash erase operation](https://community.infineon.com/t5/Knowledge-Base-Articles/How-Erase-Operation-Works-in-NOR-Flash/ta-p/251756): the erased-one/programmed-zero convention used here.
- [TU Wien — silicon oxidation](https://www.iue.tuwien.ac.at/phd/filipovic/node31.html): linear-parabolic growth and temperature-dependent rate constants. The normalized coefficients used in the lab are illustrative choices.

New explanatory interface text is English; this pass does not supply full locale translations.

Fourth-pass validation:
- 187 passing semiconductor tests across 11 files, including 27 memory/fabrication checks and the regression for reading without losing guided progress.
- New browser runner: `dev-tools/semiconductor_memory_fabrication_qa.cjs`. Checks cover write protection, address isolation, volatile power loss, DRAM refresh and lost information, nonvolatile retention, flash block erase, independent banks, meaningful fabrication controls, stage completion, saved evidence and concept feedback.
- Desktop 1280 px and mobile 390 px interaction/overflow checks pass. Desktop and mobile captures were visually inspected.
- Nine automated WCAG A/AA variants (all five memory types and four fabrication stages): zero violations. Manual assistive-technology testing remains separate.
- JavaScript syntax checks, source/desktop byte parity and whitespace checks pass. Reports and captures are in `reports/semiconductor-enhancement/`.

## LED Spectrum — fifth pass

The LED lesson now separates drive, emitted spectrum and perceived color. Zero current is a real off state instead of falling back to 20 mA. Current scales the illustrative spectral output on a fixed vertical axis, while peak center and width remain constant. Reference, double-drive and off presets support a direct comparison.

The chart spans 350–1000 nm, keeping both the UV and infrared examples in bounds. The approximate visible interval is shaded; invisible emission has a dark preview and explicit text, while its spectrum remains present. Static, resize-aware drawing replaces the continuously animated particle sketch.

Single emitters report photon energy from E = hc/λ, rather than presenting the same number as an independently measured band gap. Representative material families and emission centers remain examples, not device specifications. White light is a blue pump plus a broad phosphor band and has no single photon energy. RGB mixing adds separate channel spectra; yellow-looking red/green light retains its original emission bands. Presets compare RGB and phosphor white, as well as cyan, magenta, yellow and darkness.

All numerical outputs are available in a component table and accessible chart description. Guided evidence records source, drive, emission state, spectral form, component centers, relative peaks and photon-energy scope. Setting current to zero advances guided work correctly. A misconception check addresses the difference between perceived color and spectral composition.

Model scope: Gaussian widths, phosphor weights and linear current scaling are illustrative. The tool does not predict lumens, measured optical power, chromaticity, color rendering, efficiency, forward voltage, self-heating or wavelength shifts. RGB sliders use screen codes as normalized teaching weights; they do not specify equal physical optical powers. Screen colors are approximate, and the visible-range boundaries are a guide rather than sharp physiological cutoffs.

References:
- [US Department of Energy — LED basics](https://www.energy.gov/cmei/ssl/led-basics): phosphor conversion and mixing separate LED colors.
- [Nobel Prize scientific background — blue LEDs](https://www.nobelprize.org/uploads/2018/06/advanced-physicsprize2014.pdf): semiconductor emission and blue-pumped phosphor white light.

New explanatory prose is English; full locale translations remain separate work.

Fifth-pass validation:
- 207 tests pass across 12 semiconductor files, including 20 new LED checks. An older regression that equated every LED color with one band gap now checks photon energy and white-light components.
- Both `dev-tools/semiconductor_led_qa.cjs` and the foundational `dev-tools/semiconductor_visual_qa.cjs` pass. The latter exercises all 15 workspaces and all four modes.
- New browser checks cover fixed-scale current response, zero emission, infrared, RGB/phosphor comparison, channel presets and persistence, saved zero-current/mixed evidence, concept feedback, and the connection to Band Gap.
- All nine emitter choices plus the RGB mixer have zero automated WCAG A/AA violations. Desktop 1280 px and mobile 390 px checks pass, with no horizontal overflow; representative layouts were visually inspected.
- JavaScript syntax, source/desktop byte parity and patch formatting checks pass. Captures and machine-readable results are in `reports/semiconductor-enhancement/`.

## Logic Gates — sixth pass

Logic Gates now connects complete truth tables to two concrete implementations: Boolean networks made only from NAND gates and ideal CMOS switch paths. Every truth-table row can apply its inputs directly. Input buttons expose their state to assistive technology. An explicit observation checklist tracks inspected rows separately for each of the seven gates and the half adder; inspecting all rows is not presented as proof of mastery.

A half-adder experiment combines XOR for the sum and AND for the carry. Both outputs, the two-bit binary result and its decimal value update together. The diagram distinguishes wire junctions from crossings. It explicitly excludes a carry-in input, explaining why a full adder is a separate circuit.

Each gate has a live NAND construction with named intermediate values. Every construction is checked against the corresponding truth table. These are examples of functional equivalence, not claims of minimum gate count, area or delay.

NOT, NAND and NOR have inspectable CMOS connectivity diagrams. PMOS switches close for logic 0 and NMOS switches close for logic 1. Series and parallel paths determine whether the output connects to VDD or ground. AND and OR explain their conventional inverting gate plus output inverter. XOR/XNOR transistor counts are left implementation-dependent. The previous arbitrary propagation-delay estimate from transistor count is removed.

The model is ideal combinational logic with settled inputs. A conducting path to a supply rail does not imply continuous current through an ideal unloaded gate. Analog voltage thresholds, propagation delay, glitches, leakage, switching energy and physical device geometry are outside this model.

Guided notebook evidence now records outputs, binary addition, CMOS path states and inspected rows. Changing the selected gate counts as an experiment even with zero-valued inputs; recording the changed NOT row preserves progress when returning to input 0. Reloading the guided setup clears the NOT checklist while retaining other experiment checklists. A concept check addresses 1 + 1 = 10₂, and a connection opens the transistor lesson's CMOS inverter.

References:
- [MIT — CMOS gates and complementary paths](https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c3/c3s1/).
- [Nand to Tetris — Boolean arithmetic](https://www.nand2tetris.org/project02).

New explanatory prose is English; full locale translations remain separate work.

Sixth-pass validation:
- 237 tests pass across 13 semiconductor files, including 30 new logic tests. Coverage includes every truth-table row, independently evaluated NAND networks, complementary CMOS paths, binary value conservation, invalid saved states, separate checklists and guided evidence.
- `dev-tools/semiconductor_logic_qa.cjs` passes across all seven gates and the half adder, including baseline reload, notebook evidence and the transistor connection.
- Eight automated WCAG A/AA variants have zero violations. Desktop 1280 px and mobile 390 px checks pass with no horizontal overflow; representative CMOS and half-adder diagrams were visually inspected.
- The foundational all-workspace browser runner passes. JavaScript syntax, source/desktop byte parity and patch formatting checks pass.
- Reports and screenshots are in `reports/semiconductor-enhancement/`.
