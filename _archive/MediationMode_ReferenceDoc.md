# Mediation Lab — Implementation Reference Document

> **Status**: Deferred — reference doc for future implementation  
> **Priority**: After universal screener + expanded probe banks  
> **Est. effort**: ~1000 lines of code  
> **Reference app**: `ConflictResolutionapp.txt` (2449 lines, 150KB, same workspace)

---

## 1. Strategic Rationale

### Why Build This
- Fills a specific SEL gap: **neutral third-party facilitation** (de-escalation, reframing, consensus-building)
- Existing modes cover ~60-70% of SEL skills; mediation adds the remaining 30-40%
- Evidence-based: peer mediation programs have strong research backing
- Can connect to curriculum content (mediate historical conflicts from source material)
- Strengthens AlloFlow's RTI story for Tier 2 SEL interventions

### What Existing Modes Already Cover
| SEL Skill | Mode | Coverage |
|-----------|------|----------|
| Active listening | Persona Interview | ✅ Full |
| Perspective-taking | Adventure Social Stories | ✅ Full |
| Argumentation | Adventure Debate | ✅ Full |
| Empathy/consequences | Adventure Social Stories | ✅ Full |
| **Neutral facilitation** | None | ❌ Gap |
| **De-escalation** | None | ❌ Gap |
| **Agreement-building** | None | ❌ Gap |

---

## 2. Architecture Decision: Standalone Mode

### Why Standalone (Not Sub-Mode)
- **Persona panel's `harmonyScore`** conflicts with mediation's tension meter (harmony = higher is better; tension = lower is better — opposite semantics)
- **Adventure debate's `debateMomentum`** tracks persuasion balance, not emotional tension — different concept
- A dedicated `mediationState` avoids collision with existing state machines
- The flow is distinct: 5-phase structured mediation ≠ open-ended persona interview
- Deserves its own toolbar button for discoverability
- Can work **with or without** source material

### What Gets Borrowed (Not Copied)
| Component | Borrow From | How |
|-----------|-------------|-----|
| AI chat loop + response handling | Persona Interview | Same Gemini API call pattern |
| Character generation prompts | Persona Interview | Same `generateContent` with different system prompt |
| Avatar generation | Persona Interview | Same `avatarUrl` pattern |
| XP + badges + scoring | Persona Interview | Same `earnedBadges` / XP award logic |
| Reflection flow | Persona Interview | Same `showReflection` / `reflectionText` pattern |
| TTS for character voices | Shared `handleAudio` | Already centralized |
| Phase progression concept | Adventure Debate | Adapt `debatePhase` pattern to 5 mediation phases |

### What's Genuinely New (~1000 lines)
| Component | Est. Lines | Description |
|-----------|:-:|-----------|
| `mediationState` | ~50 | State object: phases, tension, parties, chatLog, caucusMode, coachFeedback |
| AI prompts | ~120 | Scenario gen, dual-party response, coach eval, per-phase instructions |
| Phase stepper UI | ~60 | Visual 5-step progress bar with phase labels |
| Tension meter | ~40 | Animated bar (green → amber → red) with numeric display |
| Mediator toolbox | ~60 | Validate / Clarify / Reframe quick-action phrase bank |
| Chat rendering | ~120 | Two-party message bubbles (Party A = rose, Party B = cyan) + coach feedback |
| Agreement modal | ~80 | Resolution phase: student drafts agreement points |
| Report card | ~80 | Resolution %, strengths, weaknesses, badges summary |
| Entry point + toolbar | ~60 | Toolbar button, mode switching, source material detection |
| Localization keys | ~80 | UI strings for all mediation-specific labels |
| Help tips | ~30 | Allobot context for mediation features |
| IEP/XP integration | ~60 | Hook into existing XP system + IEP report |
| **Total** | **~840-1000** | |

---

## 3. UX Flow

### Entry Point A: Standalone (No Source Material)
```
Toolbar → "🤝 Mediation Lab" button
  → Text input: "Describe a conflict scenario" (or pick from library)
  → AI generates two characters with opposing positions + hidden agendas
  → 5-phase mediation begins
```

### Entry Point B: Content-Connected (With Source Material)
```
Teacher has generated content about a topic (e.g., Civil Rights Movement)
  → Click "🤝 Mediation Lab"
  → AI auto-generates a historically-grounded conflict from source text
  → Student mediates between era-appropriate characters
```

### Mediation Flow (Both Entry Points)
```
Phase 1: Introduction → Establish ground rules, characters introduce themselves
Phase 2: Storytelling → Each party shares their perspective (high emotion)
Phase 3: Agenda Setting → Identify shared issues to resolve (calming)
Phase 4: Negotiation → Brainstorm options, student facilitates compromise
Phase 5: Resolution → Draft agreement, both parties react
→ Report Card: resolution score, strengths, badges, XP awarded
→ Optional: reflection prompt
```

### Input Modes
- **Free-text**: Student types their own mediation interventions (default)
- **Scaffolded choices**: AI-generated response options for younger students
- **Toolbox phrases**: Quick-action buttons (Validate / Clarify / Reframe) + free text

---

## 4. Key Design Details

### Tension System
- Scale: 0 (fully resolved) → 100 (breakdown/walkout)
- Starts at 60-70 depending on difficulty
- Each student intervention adjusts tension based on AI evaluation
- Visual: animated bar with color gradient (green < 30, amber 30-70, red > 70)
- Alert thresholds: 85+ = "Party threatens to leave" complication
- **NOT the same as `harmonyScore`** (opposite semantics)

### AI Evaluation Per Turn
For each student message, AI returns:
```json
{
  "partyAResponse": "string",
  "partyANewState": "string (emotional state)",
  "partyBResponse": "string", 
  "partyBNewState": "string",
  "tensionChange": -5 to +15,
  "coachFeedback": "string (formative tip)",
  "pointsAwarded": 0-10,
  "techniqueUsed": "validation|reframing|clarification|escalation|other"
}
```

### Difficulty Levels (From Reference App)
- **Easy**: Cooperative parties, willing to resolve, low initial tension (50)
- **Medium**: Realistic conflict, hidden interests, moderate tension (65)
- **Hard**: Hostile, stubborn, easily offended, high tension (80)

### Complications (From Reference App — Lines 99-106)
At random intervals, AI injects complications:
- Party checks phone dismissively
- Party threatens to leave
- Party interrupts and accuses the other of lying
- Party becomes visibly emotional and stops speaking

### Mediator Toolbox Phrases (From Reference App — Lines 108-121)
- **Validate**: "I hear that this is very important to you." / "It sounds like you are feeling frustrated."
- **Clarify**: "Could you say more about that?" / "Help me understand what you mean by..."
- **Reframe**: "So, for you, the core issue is..." / "It sounds like you value..."

---

## 5. Reference App Mapping

### What to Adapt From `ConflictResolutionapp.txt`
| App Section | Lines | Use For |
|-------------|:-----:|---------|
| `MEDIATION_PHASES` | 83-89 | Phase definitions |
| `PHASE_INSTRUCTIONS` | 91-97 | AI system prompts per phase |
| `COMPLICATIONS` | 99-106 | Random curveball events |
| `QUICK_ACTIONS` | 108-121 | Mediator toolbox phrases |
| `SAFETY_PATTERNS` | 76-81 | PII/profanity filters (AlloFlow may already have these) |
| `Services.Utils.calculateTension` | 553-558 | Tension scoring algorithm |
| `Services.Utils.analyzeTone` | 599-606 | Input tone detection |
| `TensionMeter` component | 838-846 | UI reference for tension bar |
| `PhaseStepper` component | 811-836 | UI reference for phase progress |
| `MessageBubble` component | 848-936 | Two-party chat rendering |
| `AssessmentCard` component | 730-774 | Report card UI |
| Coach/evaluation display | 911-916 | Per-turn feedback rendering |

### What NOT to Adapt
- Firebase multiplayer (AlloFlow handles this differently)
- Classroom management (already in AlloFlow's teacher dashboard)
- Theme system (AlloFlow has its own)
- Username/codename generation (AlloFlow has its own)

---

## 6. Integration Points

### IEP Report (Already Built)
Add mediation data to `handleExportIEPReport`:
```
SEL — Mediation: 3 sessions completed
  Avg Resolution Score: 78%
  Strengths: Active listening, reframing
  Areas for Growth: Managing escalation, reading hidden agendas
```

### RTI Dashboard
- Mediation sessions count toward `totalActivities`
- Resolution scores visible in student detail panel
- Can set RTI goals for SEL based on mediation performance

### Class Roster JSON
- Mediation session history stored in student data
- Exportable/importable with class roster

---

## 7. Open Questions for Implementation

1. **Grade-level adaptation**: Should the AI adjust language complexity based on the student's profile? (The reference app has elementary → professional, which aligns with AlloFlow's age-based settings)
2. **Multiplayer potential**: The reference app supports real-time multiplayer mediation. Is this desired for AlloFlow? (Probably not — adds significant complexity for marginal benefit)
3. **Scenario library**: Should there be pre-built scenarios teachers can select from, or always AI-generated? (Recommend both — library for consistency, AI-gen for flexibility)
4. **Image generation**: The reference app generates character portraits via Imagen. AlloFlow already generates images — should mediation characters get portraits? (Yes, reuse existing Imagen pipeline)
