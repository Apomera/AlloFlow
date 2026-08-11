# Expert review checklist — `hazard-rules.json`

**Who this is for:** a qualified mycologist / naturalist / herpetologist reviewing the
life-safety content before this tool is used by students. This is the **#1 blocker to
shipping.** Nothing with a DEADLY or CONTACT tier should reach a classroom until a named
expert has signed off on it here.

**The one rule that overrides everything:** the tool must never clear an organism as safe
to eat, touch, or handle — at any confidence, for any organism. Your job is to make the
*cautions* accurate, not to approve any all-clear. If an entry reads even slightly like a
green light, it fails review.

---

## How sign-off works (and how the tests enforce it)

Each hazard entry carries `"needsExpertReview": true` until you clear it. To sign one off:

1. Verify it against the checklist below.
2. In `hazard-rules.json`, on that entry:
   - set `"needsExpertReview": false`, **and**
   - add `"reviewedBy": "Jane Doe, PhD (mycology)"` and `"reviewedDate": "2026-07-DD"`.
3. Run `node --test`. The **data gate** fails if any DEADLY/CONTACT entry has
   `needsExpertReview:false` *without* both `reviewedBy` and `reviewedDate` — so you can
   never silently clear one. It also fails if any trigger uses a rank GBIF can't see.
4. Run `node audit-taxa.mjs` after any change to trigger taxa — it confirms every trigger
   still resolves to a real GBIF backbone taxon (a misspelled trigger silently never fires).

Do the reverse if an entry is wrong: correct it and leave `needsExpertReview: true`, or
delete it. A wrong deadly entry is worse than a missing one.

---

## Per-entry checklist

For every **confusion** entry (edible/benign ↔ dangerous lookalike):

- [ ] **Benign** and **danger** identities are both correct, and they are genuinely
      confusable in the field (not just superficially).
- [ ] **`tell`** — the distinguishing feature is accurate *and* honest about its limits.
      It is a teaching aid, never a foraging test. Flag any tell a student could over-trust.
- [ ] **`consequence`** — the medical description (toxin, onset, severity) is accurate and
      not exaggerated or understated.
- [ ] **`message`** — says "look only," implies no edibility, names the real risk.
- [ ] **Region** — if the cue is region-specific (e.g. the coral-snake color rhyme works
      only in the US), that limit is stated.
- [ ] **`tier`** — DEADLY only for genuinely lethal; CONTACT for injure-on-contact; don't
      inflate (alarm fatigue) or deflate.
- [ ] **`group`** — if this shares a danger with others (e.g. the Amanita edges), the group
      key is right so they collapse into one banner.

For every **directHazards** entry (the organism *is* dangerous):

- [ ] Taxon is correct and genuinely dangerous; **`domain`** (touch / handle / forage) fits.
- [ ] **`message`** and **`tell`** are accurate and contain no reassurance.

For every **categoryRule** (broad fail-safe):

- [ ] The blanket caution is appropriate for the whole group and can't read as a clearance.

---

## Sourcing

Prefer authoritative, ideally citable sources: regional poison-control centers, national
mycological/herpetological societies, government agencies (forest service, extension,
public-health), and peer-reviewed references. Record them in the entry's `sources`. Avoid
foraging blogs and hobbyist forums for anything in the DEADLY tier.

Where a student might be in real danger, the copy should point to a human: "contact Poison
Control (US: 1-800-222-1222)" is better than any field description.

---

## Coverage — what to add or check

Current data: 6 category fail-safes, 19 confusion edges, 11 direct hazards (all trigger
taxa verified against GBIF). Known gaps worth an expert's input, roughly by real-world risk:

- **Fungi:** regional deadly *Lepiota* / *Galerina* / *Cortinarius* species; *Paxillus*;
  destroying-angel species specific to the pilot region.
- **Plants (foraging):** regional deadly *Apiaceae*; pokeweed; false hellebore; local toxic
  berries children encounter.
- **Contact:** Gympie stinging tree (AU), regional nettles, poodle-dog bush.
- **Animals:** stonefish, regional venomous snakes/spiders, poison-dart frogs, toxic birds
  (e.g. hooded pitohui), regional caterpillars.

Prioritize by *what a student in the pilot region could actually encounter and misjudge*,
not by exotic completeness.

---

## Standing safety invariants (do not weaken)

- No edibility/toxicity/handling **clearance**, ever. `blockEdibilityClaims` is hard-wired.
- Warnings fire on the **stakes** of what an organism could be, never suppressed by the
  model's confidence. (Locked by tests.)
- Web/enrichment context can only add cautions, never clear one. (Locked by the firewall.)
- Deadly-tier copy is **your** call, not the model's and not the tool author's.
