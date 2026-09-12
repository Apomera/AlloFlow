# Goal Setter: personal-growth plans and flexible routines

Date: 2026-09-12. Twenty-first SEL enhancement pass.

## Purpose

This pass deepens nine personal-growth SMART examples and 11 personal starter prompts. The three worked purposes are reflection in a form that fits, a pause with options, and changing the strategy rather than only the words. Each has elementary, middle and high-school contexts with learner choice, supports, adaptation checks and five editable SMART fields.

The earlier examples prescribed daily journal output, fixed breathing or meditation routines, and positive reframing. The revised plans allow different forms of reflection, comfortable breaks, honest uncertainty and practical support. They do not require personal disclosure, a particular feeling or a fixed number of consecutive days. Other SMART categories retain their content, including the preceding social-plan improvements.

## Pedagogical basis

[CAST's goal-setting guidance](https://udlguidelines.cast.org/action-expression/strategy-development/goals/) recommends models, prompts for resources and effort, and recognizing when to change strategies. Its [guidance on anticipating challenges](https://udlguidelines.cast.org/action-expression/strategy-development/challenges/) supports planning for barriers and available resources. These principles inform the authored examples and routine prompts; they do not establish clinical benefit or validate this digital activity.

A routine is a means to a learner-chosen purpose. Its usefulness depends on the setting, available support and competing needs. A missing record does not identify a barrier or show a lack of effort. Planning can include a smaller action, another method, support, a pause or stopping a routine that does not fit. The new daily prompts and restart messages invite those choices rather than urging immediate action.

## Worked situations

| Purpose | Elementary | Middle | High |
| --- | --- | --- | --- |
| Reflection in a form that fits | Remembering a day through drawing, a few words or thought | Reflecting without a reliably quiet evening or private journal space | Reviewing a demanding week without a burdensome daily writing template |
| A pause with options | Choosing an alternative to closed eyes or deep breaths | Adapting a crowded transition and an uncomfortable breathing exercise | Trying a practical break or attention shift when silent meditation does not fit |
| Change the strategy, not just the words | Getting a useful clue when saying yet does not help with a puzzle | Requesting clearer directions or accessible materials rather than blaming ability | Reviewing workload and resources when positive reframing does not address constraints |

Use the examples for discussion, drawing or thinking as well as optional template creation. Check available support before adopting a copied plan. Questions about comfort, access and usefulness can guide review without requiring a calmness score, cheerful statement or full page of writing.

## Optional plan for each routine

Every tracked routine now has a separate Plan and review disclosure. It includes an optional status (Trying it, Paused, Reviewing the fit, or Not chosen) and five optional notes:

- Why this routine matters.
- When it might fit.
- Supports or changes needed.
- A smaller or different option.
- What to check next, and when.

Status is a planning note, not a scheduling service or a claim about whether the routine happened. Pausing preserves the plan and all dated records. Users may still correct a dated record while paused; recording a day does not silently resume the plan. No missed-day entries, catch-up tasks or target quotas are generated.

The tracker no longer creates new seven-day, all-week or three-day-all-routines reward flags from recorded checks. Historical badges and saved flags remain intact. Other Goal Setter rewards, check-in streaks and accountability features remain outside this change. Record counts continue to describe checked dates, not effort, wellbeing or learning.

## Project state and compatibility

A routine object's optional `plan` holds `status`, `purpose`, `opportunity`, `support`, `alternative` and `review`. Plans belong to the routine across grade-band and category-filter changes. Legacy string routines are converted to the supported object form only when a plan field is edited, preserving the name and default category. Existing object properties and unknown plan fields are retained. Malformed fields display empty controls without deleting unrelated data.

Dated `habitLog` keys retain their existing index/date format and local-calendar behavior. Removing a routine also removes its plan; plans on other routine objects remain attached while the existing date-key reindexing preserves their records. The existing removal confirmation checks that the routine list is unchanged before acting. Edited plans remain in current project state; use the hub save/export controls for durable storage and review private details before sharing.

Personal example IDs remain `example-0`, `example-1` and `example-2`, preserving earlier library selections. Existing copied goals are not rewritten when the examples change. New copies retain the standard five SMART keys and stay editable.

## Scope and validation

Focused browser coverage exercises all nine personal template copies, separate routine plans, legacy conversion, pause/resume behavior, keyboard focus, removal/reindexing, malformed fields and seven-day recording without new streak awards. Phone scans cover the revised personal library content, routine-planning region and full habit tracker in three themes. Visual review also identified and fixed an existing light-theme contrast problem in shared routine/note controls. The real-hub check combines an adapted personal goal with a paused routine plan across return and reopen.

The unchanged health examples and starter prompts, general SMART completion wording, check-in/accountability streaks and AI coaching are outside this pass. Accessibility results are scoped to the revised regions, not a whole-tool certification. Exact results, screenshots and any test retries are recorded in `reports/sel-goals-routines/validation.json`. No push or deployment is included.
