# Portable Connected circuit designs

## User workflow

Open **Save or open a connected design** beside the network examples. **Save connected design** downloads `connected-circuit-design.json`. **Open connected design file** validates a selected file and displays a labeled preview with component connections, analysis mode, time window, integration method, and probes. The circuit changes only after **Load design**.

Loading creates one undo entry containing the previous netlist, analysis, duration, integration, selected component, probes, example label, and comparison source. Undo and redo restore those settings. Loading resets the time cursor, held sample, and comparison source. Reflections, other studies, and unrelated view preferences remain intact. Load and Cancel return keyboard focus to the file input.

## Format and scope

The JSON envelope is:

```json
{
  "format": "alloflow-connected-circuit",
  "version": 1,
  "design": {
    "components": [],
    "analysis": "dc",
    "duration": 0.5,
    "integration": "backward-euler"
  },
  "view": {"probeRed": "B", "probeBlack": "C"}
}
```

Component IDs and connections are preserved. Components store editable parameters for all fourteen supported families: independent and controlled sources, resistors, capacitors, inductors, wires, switches, diodes, bipolar transistors, and op-amps. This includes complete source waveforms, switch schedules, diode resistance and Zener settings, transistor parameters, op-amp timing settings, and reactive starting states. Derived model constants are reconstructed from the selected model. An optional validated `selected` component ID can appear in `view`.

Files exclude reflection text, notebook data, undo/redo stacks, arbitrary tool state, and calculated samples. The serializer is `window.StemLab.circuitNetworkDesignDocument(state)`; the parser is `window.StemLab.parseCircuitNetworkDesign(text)`.

## Validation

The parser enforces the version, allowlisted fields, numeric types and bounds, named nodes, unique component/event IDs, sixteen-component/four-op-amp/eight-event limits, and existing voltage-output sources for current sensing. Files larger than 64 KiB are rejected. Validation runs before normalizers, so imported settings cannot be silently clamped or discarded.

Structurally valid incomplete or unsolved circuits may be saved: examples include floating nodes, unknown amplifier inputs, and conflicting ideal constraints that the workbench diagnoses after loading. A dangling CCCS/CCVS current-sense reference is rejected as required by the file contract; its source must be selected before saving.

File reads use request generations. A stale read cannot replace a newer preview; cancellation, a new selection, and unmount invalidate pending completions. Reading errors and invalid files leave the bench unchanged.

## Validation performed

- Four targeted test files passed: **88 tests**, using the threads pool. These covered the new file contract, existing simple-file behavior, connected DC models, and localization.
- New tests round-trip a sixteen-part design covering every supported family and compare RC trajectories before and after serialization.
- Mounted tests exercise real asynchronous file callbacks, preview without mutation, complete Load/Undo/Redo, identical-netlist analysis imports, races, cancellation, oversize rejection, read failures, and unmount cleanup.
- The final file-specific rerun passed **37 tests**, including focus restoration and live pulse-width editing from 50% to 1%, followed by a successful export with a 0.5% edge. The parent task records final suite and browser results.
- An independent reviewer checked parser bounds against normalizers and found no accepted-input clamping holes.

## Partial waveform state limitation

The existing waveform normalizer can give an out-of-range default edge when manually seeded with a narrow duty value and no edge, for example `{shape: "pulse", duty: 1}`. The strict exporter refuses that unsupported partial configuration. The live editor retains an explicit edge during duty changes and clamps it to the permitted maximum. New sources and both shipped pulse examples also provide valid edge settings. Solver normalization was left unchanged in this workflow update.
