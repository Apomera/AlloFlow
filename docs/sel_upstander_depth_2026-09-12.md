# Upstander: contextual support practice and strategies

Date: 2026-09-12. Seventeenth SEL enhancement pass.

## Purpose and boundaries

This pass revises the eight built-in Practice cases and the 18 core Upstander Moves cards. The practice compares conditional support routes without grading the learner's courage. The strategy guide replaces fixed risk tiers and its visual courage hierarchy with context, consent and available adult support. Higher visibility or greater risk is not presented as a higher level of achievement.

The revised activity distinguishes urgent help during active danger from support after an incident. Learners should not physically intervene, move a potentially injured person, delay help to finish an activity, or collect proof at personal risk. Company, eye contact, disclosure, forgiveness and public solidarity are not requirements placed on someone experiencing harm. Adults remain responsible for responding to bullying; a learner need not resolve it or arrange mediation.

The authored design draws on [StopBullying.gov's guidance for supporting the children involved](https://www.stopbullying.gov/prevention/support-the-children-involved), including its warning against forced peer mediation and its recognition that witnesses may not feel safe intervening. Its [bystander guidance](https://www.stopbullying.gov/resources/research-resources/bystanders-are-essential) describes multiple routes, including trusted adult help and private support. Its [immediate-response guidance](https://www.stopbullying.gov/prevention/on-the-spot) concerns adult responsibility for safety. These sources inform the general principles; they do not validate this digital activity or guarantee that any particular route is safe. Educators should identify appropriate local support and emergency procedures.

## Optional learning sequence

1. **Notice the situation and support needed.** A fictional case distinguishes observations from uncertainty and names a safety or support priority. Learners may note consent and safety considerations and draft a first plan.
2. **Compare approaches and limits.** Each of two routes gives a possible action, when it may fit, and a limitation. Learners can compare without choosing, select and deselect a route, combine ideas in their notes, or use a different plan. A support prompt asks who should help and what information they need.
3. **Reconsider after new information.** A new development may reveal an injury, missing adult, request for space, retaliation or disclosure concern. A separate route selection and written reflection retain the first reasoning. The follow-through disclosure asks whether help arrived, harm continues, or more support is needed.

All writing and selections are optional. Use fictional discussion, drawing or thinking instead of disclosure or acting out harmful situations. A learner can explain why a plan still fits; changing the answer is not itself the learning goal. The tool sends no report or message and does not contact anyone.

## Built-in cases

### Elementary

- **Mocking at lunch:** The classmate says they want to sit alone, but asks you to tell an adult about the mocking.
- **A chase that needs help:** You cannot see the usual recess monitor from where you are.

### Middle

- **A shove between classes:** The student says they are hurt and do not want to walk to class.
- **Organized exclusion:** The classmate says a public invitation would draw more attention and asks for quiet support.
- **Mocking during a drill:** The classmate declines a partner and says they want the teacher's help to take a break.

### High

- **A degrading rumor:** Someone suggests posting the rumor publicly so everyone can judge whether it is true.
- **When a familiar group causes harm:** When you quietly refuse to join in, the group begins threatening to target you too.
- **Identity-based harassment continues:** The peer fears being outed to family and says the first adult dismissed the report.

## Strategy guide

Each grade band has six cards. Each explains an approach, when it may fit and what to check, using native disclosures. The first card starts open; other cards can be compared in any order.

- **Elementary:** Offer company with permission, Offer a simple redirect, Offer an exit, not a demand, Use a brief limit if safe, Get an adult's help, Check in later.
- **Middle:** Company with consent, Redirect without a spectacle, Name the behavior briefly, Private or delayed support, Stop participating and seek help, Report observations, not theories.
- **High:** Consent before visible solidarity, A direct limit is optional, Plan support with others carefully, Respect dignity without a defense speech, Request changes in the setting, Offer support after the moment.

## State and compatibility

`practiceSelections` stores a case ID per grade band. `practiceCases` uses `band:caseID` keys with optional `notice`, `first`, `privacy`, `choice`, `revisedChoice`, `revised`, `followup` and `changeSeen` values. First and revised choices are separate and editable; this is not an immutable version history. Existing tool/project callbacks handle updates without new storage services or transmission.

The previous `pracIdx` provides a bounded initial case fallback. Earlier `pracChoice`, `pracDone` and earned badges remain saved; they are not mapped to the revised routes because the meanings differ. A disclosure explains that history is retained. This built-in workflow no longer writes ratings, completion totals, XP or a courage badge. Existing tab navigation remains respected. Invalid case IDs fall back to a safe index, and malformed notes display empty.

## Validation and limits

Validation passed **527 existing regression checks and 19 browser workflows** (17 focused workflows and two actual-hub checks), with two existing regression skips. All 72 tools passed initial-render smoke checks. Six full-rule axe scans across the two revised regions and three themes returned zero violations. Dark comparison, high-contrast revision and light strategy phone captures were visually reviewed. Syntax, source/public byte parity and scoped whitespace passed. The first focused run passed 14 workflows; three phone workflows failed because a live indexed test locator changed as disclosures opened. Stable summary labels corrected the test, and all three affected workflows passed on rerun. Final evidence is archived in `reports/sel-upstander-depth/validation.json`. Focused browser tests use the actual renderer with simulated callbacks, covering all eight cases and 16 routes, all 18 strategy cards, separate first/revised state, case/band persistence, serialized restoration, historical records, keyboard use and 320 px layouts in three themes. Real hub return/reopen is checked separately. Accessibility audits cover the two revised regions rather than the whole tool.

This is a bounded revision, not a full validation of Upstander Workshop. The Three Roles/self-check, Break the Cycle, pledge, reference material, generated scenarios, AI rehearsal, role-play and other guidance remain outside this pass and may need further review. In particular, generated scenarios retain their separate pre-existing rating format. Real project-file round trips, packaged Desktop, live assistive-technology usability and classroom outcomes were not validated. Nothing was pushed or deployed.
