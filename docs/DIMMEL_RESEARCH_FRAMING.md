# Immersive mathematics without hands

A research-practice framing (draft for Aaron to adapt; not for direct sending)

**Note for Aaron.** This is raw material, not a finished email. It is written in a plain, claim-careful voice so you can lift from it into whatever fits your relationship with Justin. Every factual claim that touches the pilot or partnerships is marked so you can confirm it is current before it goes anywhere. The research claims are framed as open questions on purpose, because the honest posture (we are asking, not asserting) is also the more compelling one to a researcher.

---

## The one-line

If embodied-cognition theory holds that the motor act of building a mathematical object is part of what produces the understanding, what happens for a learner who cannot perform that act, and can directing an AI agent to enact it by voice recover any of the benefit?

## The gap

Two literatures are strong on their own and mostly silent where they meet.

1. Embodied design for mathematics treats gesture and hands-on construction as central to how learners build understanding. There is evidence that gesturing while reasoning leaves a motor trace that continues to help afterward, and building a form with your hands (the HandWaver lineage of point to line to plane to solid) is a designed instance of that idea.

2. VR and embodied learning tools inherit an assumption that the learner has an able body: two hand controllers, precise pointing and grabbing, room-scale movement. Accessibility work in the SIGACCESS community documents that these are real barriers for people with motor disabilities, and that voice as an input has been tried, with tradeoffs.

What appears underexplored is the cell where they intersect: an accessible, alternative modality for the embodied "making" that the math-education literature says matters, for learners who cannot do the gesture. A scoping review across the math-education embodiment venues, ASSETS and CHI, and the XR accessibility community would be needed to confirm the exact boundary, but the initial read is that this specific question is open.

## What exists to point at (a working prototype, not a product claim)

AlloFlow already runs immersive, embodied making in a browser:

- **AI-assisted 3D making.** A learner describes an object or a mathematical form and an agent composes it from primitive shapes, which the learner can then refine and manipulate. The geometry tool includes a stretch-to-build mode in the point to line to plane to solid tradition.
- **Voice as the making modality (proof-of-concept, built).** The learner speaks, an agent routes the natural-language intent to an action (create, refine, resize, rotate, and so on), and the form is created and shaped with no hands and no controllers. This is early and needs validation, but it is real and demonstrable.
- **Feature-detected, in-browser WebXR.** It runs on a standard headset browser with no install, and it degrades gracefully to a 2D screen when there is no headset. That deployment posture is the accessibility and equity angle: the same lesson reaches a student on a Chromebook and a student in a headset, and the immersive path does not require dedicated hardware or software.

## The research questions worth asking together

- Does voice-directed, agent-enacted making recover the learning benefits that embodiment theory attributes to first-person gesture, and if so, which ones and to what degree?
- Is it a lesser substitute, a genuinely different route to the same understanding, or in some respects its own thing? "Distributed" or "vicarious" embodiment is the working label, not a settled construct.
- What does good design of this modality look like when the co-designers are the disabled learners it is meant to serve?

## Why this is a research-practice fit

- The question probes the theoretical core of embodied design rather than sitting beside it, so it is intellectually load-bearing, not a feature demo.
- It is an equity question. If the theory locates a core mechanism in an act some learners cannot perform, the field owes those learners an answer.
- There is a practice side ready to host it: [CONFIRM: the planned King Middle pilot for 2026 to 2027, with Aaron and Lisa Hatch] gives an authentic classroom setting and real users, which is the scarce ingredient in this kind of study.
- The prototype lowers the cost of trying, because the making, the voice routing, and the browser XR already exist.

## Possible shapes, smallest first

- A short reactions conversation or a look at the prototype, with no commitment.
- Co-design of the interaction and of a small study, ideally with disabled learners involved from the start.
- The classroom pilot as a research site, if and when it makes sense.

The honest first ask is small: a look and a reaction, framed as a value exchange rather than a request for endorsement.

## Caveats to keep visible

- The novelty is the accessibility and embodiment-theory intersection, not voice input or AI-in-XR, both of which exist. Framing it otherwise would not survive review.
- The value is ultimately empirical. Nothing here should be read as a claim that agent-mediated embodiment equals first-person embodiment. That equivalence is exactly what is unknown.
- Nothing about disabled learners without disabled learners. The design and the study should include the intended users as partners, not subjects.
- Reliability first. A demo opens a door; sustained collaboration rests on the tool being trustworthy in a real classroom.

---

*Prototype references (internal): voice-directed sculpting POC and the reusable WebXR layer are committed in the AlloFlow tree; see the Memory Palace / STEM Lab project notes for commit-level detail.*
