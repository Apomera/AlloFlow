# School Rewards: five-minute administrator demo

For the complete store and Print Lab presentation, use the [local 10–12 minute administrator walkthrough](school_store_admin_walkthrough.md). It exercises the actual backend with fictional records and simulated Google services.

Use `school-rewards-practice.html` from this local package in a browser. It contains the real portal with a fictional ledger saved only in that browser. The toolbar's **Demo guide** repeats this route inside the page, so a presenter can follow it without this document.

## Before presenting

1. Choose **Shopping day** in Scenario. It creates 24 fictional students and an open shopping window. Choosing a scenario discards previous practice awards and orders.
2. Choose **Staff** in Role. Role changes keep the same fictional ledger.
3. Start on **Overview**. Leave **Customize** closed. The tour runs only when you choose **Start the tour**.
   If you run the tour on a projector, each step has **Go to the highlighted control**, which moves keyboard focus to the control the step is about.
4. If your school is bilingual, know where the language menu is. Choosing **Español** switches the portal *and* the practice page's own bar, introduction, and tour.
5. Introduce the purpose: “Staff recognize effort with points and feedback. Students follow their progress and choose prizes. A cashier completes purchases; administrators control access and store settings.”

## Walkthrough

| Time | Role and screen | Show |
| --- | --- | --- |
| 0:00–1:00 | Staff · Overview, then **Help** | Roster size, points in circulation, open store, and prize preview. Press **Help** in the header: it explains the two kinds of points and who does what, for whichever role is signed in. Close it. |
| 1:00–2:00 | Staff · Award points | Search **Avery** and select **Avery R.** Award **20** points in **Helpful**, with “Included a classmate in the group.” Choose **Record award**. In a fresh Shopping day scenario, Avery goes from **9 to 29** points. |
| 2:00–2:50 | Student · Overview, then Progress & activity | The practice student is Avery. Show the 29-point balance and the recognition feedback. Browse Store and discuss an affordable prize. |
| 2:50–3:50 | Cashier · Store | Select Avery in the student dropdown. Add one **Front-of-line pass**, costing **15** points. Choose **Refresh, review, and complete checkout**, review the confirmation, and confirm. Avery now has **14** points; stock falls from **20 to 19**. |
| 3:50–5:00 | Administrator · Admin setup | Show the first-week checklist. Use the section links to open members, store prizes, inventory, and shopping windows. Explain staff access, spending controls, and repeatable setup. |

Incomplete checklist items include buttons that open their relevant setup screen. Administrator access counts as someone able to operate the register. Advanced admin sections start collapsed; the index expands a section before moving keyboard focus there.

## Leave-behinds

The [printable quick cards](../school-rewards-quick-cards.html) are three one-page cards, one each for staff, cashiers, and students and families. Print them for the people in the room. The [user manual](../school-rewards-manual.html) is the long form; the portal's own **Help** button carries the same answers for the signed-in role and works when the school network blocks outside links.

## What this demo establishes

The practice award, role change, student view, checkout, and administrator navigation can be demonstrated without real student data. Practice receipts and email status are simulated. Nothing is mailed or printed. The practice role selector illustrates the different screens; it does not validate real Google sign-in or access restrictions. The Spanish switch is real: every string the portal and the practice wrapper show is translated, but balance emails exist only in English and Spanish and are not sent from practice at all.

Print Lab, moderation, guardian mail, SIS integration, scheduled email, real receipts, and recovery operations need the school's configured deployment and their own acceptance checks. Keep Print Lab hidden in this short demo. Both the practice ledger and a real deployment start with the tab **hidden**; an administrator turns it on under School settings once the school has a reviewed printer workflow. The practice integrity response is simulated and is not a live audit.

Use [the pathway readiness report](school_rewards_readiness.md) for deployment acceptance. This small demonstration is a product walkthrough, not approval to launch with real school records.

## Useful feedback to collect

- Can staff identify the right student and enter meaningful recognition without help?
- Can a student explain their balance, progress, and what they can afford?
- Can the cashier explain the final checkout confirmation?
- Does the administrator understand who owns roster, prizes, shopping windows, and training?

Prioritize any confusing step reported by the administrators before adding more screens.
