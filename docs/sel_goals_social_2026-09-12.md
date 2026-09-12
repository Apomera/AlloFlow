# Goal Setter: social goals with choice, consent and support

Date: 2026-09-12. Twentieth SEL enhancement pass.

## What changed

The Social & Friendship SMART library now offers nine age-banded worked plans, organized under three purposes: connection with choice, support that respects preferences, and communicating a need or boundary. Each includes a fictional situation, learner choices, available support, conditions for revising the plan and five editable SMART fields. The nine social starter prompts were updated to match these principles.

The example library now shows one worked plan at a time, with larger labeled controls and readable disclosures. All six categories and their existing examples remain available. Category and example choices are remembered; reading a plan does not create a goal. Use as Template explicitly creates a new editable goal, preserves existing goals and notes, and moves keyboard focus to the Specific field.

## Pedagogical rationale

[CAST's guidance on choice and autonomy](https://udlguidelines.cast.org/engagement/interests-identities/choice-autonomy/) supports meaningful choices about tools, timing and participation. Its [goal-setting guidance](https://udlguidelines.cast.org/action-expression/strategy-development/goals/) recommends models, resource planning and recognizing when a strategy should change. Those principles inform the new examples; they do not establish the efficacy of this digital activity.

For a social goal, evidence should distinguish an action the learner can choose from another person's response. A greeting can be declined, a friend may prefer space, and a boundary may disappoint someone. None of those responses alone demonstrate that a learner failed. Supports, pauses and revisions can be part of a plan. Other people's private information does not need to become a progress record.

The boundary examples distinguish an ordinary disagreement from threats, repeated targeting or unsafe pressure. [StopBullying.gov's support guidance](https://www.stopbullying.gov/prevention/support-the-children-involved) emphasizes adult responsibility and cautions against forced peer mediation where power is unequal. The activity does not set a deadline for learners to resolve bullying or make another person agree.

## Worked situations

| Purpose | Elementary | Middle | High |
| --- | --- | --- | --- |
| Connection with choice | Asking to join a playground game, with adult support if needed | Finding a quieter connection opportunity when the cafeteria is too noisy | Exploring an interest-based opportunity without unwanted contact disclosure or unrealistic time demands |
| Support that respects preferences | Asking before helping a classmate who is working alone | Offering listening, company or space without taking responsibility for a friend's feelings | Using pauses, written notes or clarification for accessible group listening |
| Communicate a need or boundary | Asking for a turn or adult help using words, pictures or gestures | Preparing a request about fair project roles without promising agreement | Declining extra club duties and seeking support if pressure or retaliation continues |

The examples use review points rather than deadlines for friendship, calmness, trust or resolution. Measures emphasize communication, access and informed choices, not eye contact, stillness, popularity, compliments collected or another person's emotional response.

## Using a worked plan

Choose a category and example. Discuss the situation and its limits, then read the SMART plan. Thinking, drawing or discussing are alternatives to keeping a personal record. Creating a template copy is optional.

Before using a copied plan, check whether the purpose is meaningful to the learner, the communication method is accessible, support is actually available, and the review time fits. Change any field. The examples model possible plans; they are not required social behaviors or assessments of a learner's character.

## State and compatibility

`smartExampleCat` keeps the category. `smartExampleSelections` uses `band:category` keys and stable social IDs (`invitation`, `support`, `boundary`); unchanged categories use their existing ordered index as `example-N`. Invalid categories and malformed saved selections fall back safely. Each band and category keeps its own selection, including across library closure and serialized project restoration.

The existing `goals_tool` data shape and SMART field keys remain unchanged. A template copy receives a new goal with five copied strings and no completed steps. Editing it does not edit the library or another goal. Existing goal notes and historical badges remain intact. Context explanations stay in the library; the copied five fields include the action, evidence, support, purpose and review point. Use the hub save controls for durable project storage and review personal details before sharing.

## Scope and validation limits

This pass revises social example content and the shared library UI. Content in the other five example categories, other goal starter categories, SMART completion language, existing achievement/reward logic, habit streaks, weekly review and AI coaching are outside this pass. Creating a goal retains existing Goal Setter reward behavior; browsing examples does not create goals or award XP.

Focused browser checks cover all nine social template copies, every library example in every band, editable copied fields, existing goal preservation, selection restoration, malformed saved data, keyboard focus and phone accessibility. The real-hub workflow covers creating a social goal, adapting it, returning to activities and reopening it. The accessibility evidence covers the revised library region, not a whole-tool certification. Exact results and screenshots are in `reports/sel-goals-social/validation.json`. No push or deployment is included.
