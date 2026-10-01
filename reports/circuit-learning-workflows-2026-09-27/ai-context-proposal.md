# Approved circuit context for the AI tutor

**Status: implemented under explicit user authorization. Validation used mock providers only; no real AI requests were made.**

The user approved the question “May I add component settings and calculated voltage/current/power readings to the existing Gemini request when a student clicks Ask? Notebook notes would stay excluded...” with **“Include circuit settings and readings.”**

## Purpose and destination

When the student presses Ask, the tutor receives the electrical circuit being discussed so it can explain the actual readings. The destination is the existing `ctx.callGemini` integration, described by automatic approval review as the external Gemini destination. The provider integration is unchanged.

The prompt includes the question, grade band, and the following calculated or configured fields from the Simple workbench. It excludes notebook predictions, explanations, saved observations, history, prior AI responses, and personal account information.

## Implemented structured snapshot

```text
connection: "series" or "parallel"
supplyVoltageV: number
sourceCurrentA: number or null
sourcePowerW: number or null
equivalentResistanceOhm: number or null
openCircuit: boolean
shortCircuit: boolean
ambiguousVoltages: boolean
ledOvercurrent: boolean
parts: [
  {
    position: one-based integer,
    type: component type,
    settings: {
      resistanceOhm: resistor/bulb setting, when applicable,
      capacitanceMicrofarad: capacitor setting, when applicable,
      position: "open" or "closed", for a switch,
      polarity: "forward" or "reversed", for an LED,
      color: LED color hex code, when applicable,
      forwardVoltageV: modeled LED forward drop, when applicable
    },
    voltageV: number or null,
    currentA: number or null,
    powerW: number or null
  }
]
```

Component IDs are excluded. Each part uses its displayed position. Nonfinite or undetermined values are represented by `null`, accompanied by the explanation that `null` means undetermined rather than zero.

## Exact model-limit text

> Model limits: This is ideal steady DC, not a transient simulation. Bulbs have fixed resistance. Closed switches and ammeters use 0.001 ohm; voltmeters use 1 billion ohms; capacitors are open at DC equilibrium. LEDs use a color-dependent forward drop plus a 10 ohm slope resistance. The ideal source has no current limit. Heating, device failure, source limits, leakage, and startup transients are not modeled. The illustrative signal sketch is not calculated time data. Mixed and Connected circuits provide calculated time responses. Explain any open path, short path, or ambiguous reading relevant to the question without inventing measurements.

The prompt also explains that series parts share one path and parallel parts each form a separate branch across the supply, and requests an explanation under 150 words using the supplied readings.

## Approval record

Automatic approval review initially rejected the expansion because the earlier general improvement request did not authorize the detailed external payload. The user then explicitly approved the fields described above. The implementation was accepted after that authorization. No extra fields outside this description were added.
