# What the 2026-09-13 SEL dead-content removal took out, and whether any of it is worth wiring

Method: the pre-removal file is read from git (`HEAD`), the dead set is recomputed with the gate's rules, and every removed declaration is scored. **Fragment %** is the share of prose strings that look like the telegraphic generated lines the August review quoted ("I tell water-anxious: adult lessons."). **Live overlap** is how many of the declaration's 40 longest strings still exist verbatim in the tool after removal (a high number means the content survives elsewhere in the file). **Verdict**: `duplicate` = most of its text is still live; `generated filler` = a narrative, scenario, principle or affirmation library in one of the four tools whose libraries the August 25 human read found 85 to 97 percent telegraphic ("I tell water-anxious: adult lessons."), not fit to render; `authored, unwired` = readable prose that no view ever read, archived under `docs/sel_hub_unwired_content/` for a future feature.

## Summary

| tool | removed | KB | duplicate | generated filler | authored, unwired |
|---|---|---|---|---|---|
| zones | 6 | 532 | 0 | 0 | 6 |
| howl | 13 | 625 | 0 | 0 | 13 |
| mindfulness | 6 | 298 | 0 | 0 | 6 |
| advocacy | 67 | 597 | 0 | 0 | 67 |
| upstander | 137 | 607 | 0 | 0 | 137 |
| digitalwellbeing | 81 | 498 | 0 | 0 | 81 |
| anxietytoolkit | 77 | 520 | 0 | 77 | 0 |
| griefloss | 84 | 515 | 0 | 84 | 0 |
| stressbucket | 89 | 491 | 0 | 89 | 0 |
| bigfeelings | 90 | 458 | 0 | 90 | 0 |
| emotions | 1 | 27 | 0 | 0 | 1 |
| teamwork | 1 | 2 | 0 | 0 | 1 |
| **total** | 652 | 5169 | 0 | 340 | 312 |

Static safety check, repeated here: every removed name appears exactly zero times in the live tool and zero times in any other source file, including inside string literals (the reference scan is a word-boundary text match, so `window["NAME"]`-style lookups would have counted).

## zones (6 declarations, 532 KB removed)

Verdicts: 6 authored, unwired. Still referenced anywhere live: none.

| declaration | line | KB | items | prose strings | median words | fragment % | live overlap | verdict | sample |
|---|---|---|---|---|---|---|---|---|---|
| `ZONE_BODY_SENSATIONS` | 14012 | 159.3 | 196 | 1753 | 7 | 6 | 0/40 | authored, unwired | foggy head, hard to think clearly / Your head feels like it is full of clouds. It is hard to remember what you were just doing. |
| `INTEROCEPTION_EXERCISES` | 17574 | 40.3 | 61 | 615 | 5 | 7 | 0/40 | authored, unwired | Build basic awareness of heartbeat without measuring it. / Sit in a comfortable chair with feet flat. |
| `ZONE_COREGULATION` | 18831 | 130.3 | 60 | 1942 | 6 | 0 | 0/40 | authored, unwired | Stopped texting back at usual pace / Pulls hood up, looks down at phone |
| `ZONE_VALIDATION_PHRASES` | 21774 | 53.1 | 82 | 492 | 12 | 0 | 0/40 | authored, unwired | That makes complete sense. Anyone would feel sad about this. / Normalizes the feeling without dismissing it. Tells them they are not broken for hurting. |
| `CULTURAL_ZONE_ADAPTATIONS` | 26822 | 97.1 | 32 | 716 | 13 | 2 | 0/40 | authored, unwired | Black children in U.S. K-12 settings who carry the weight of historical trauma, persistent racial stereotyping / Sadness and exhaustion are often hidden because vulnerability has historically been unsafe in mixed-race space |
| `ZONE_SCHEDULES` | 30488 | 51.4 | 30 | 882 | 3 | 7 | 0/40 | authored, unwired | Gentle wake, dressed, breakfast / Calm start prevents Yellow before school |

## howl (13 declarations, 625 KB removed)

Verdicts: 13 authored, unwired. Still referenced anywhere live: YES (investigate).

| declaration | line | KB | items | prose strings | median words | fragment % | live overlap | verdict | sample |
|---|---|---|---|---|---|---|---|---|---|
| `EL_CORE_PRACTICES` | 792 | 37.5 | 32 | 287 | 9 | 0 | 0/40 | authored, unwired | Crew is a small, multi-year advisory group of 10-15 students that meets daily or several times per week. The c / Belonging is the precondition for learning. When every student is known well by at least one adult, attendance |
| `CHARACTER_HABITS` | 1666 | 36.3 | 34 | 428 | 7 | 0 | 0/40 | authored, unwired | Recognizing suffering and acting to relieve it. / Compassion is the practical face of our shared humanity. Schools that cultivate compassion become safer, more  |
| `EXPEDITION_CONNECTIONS` | 2385 | 41.2 | 39 | 439 | 7 | 7 | 0/40 | authored, unwired | Watershed Health: How healthy is our local river? / Weekly water quality testing at 3 sites along the river |
| `EL_RESEARCH` | 3144 | 31.3 | 33 | 231 | 14 | 0 | 0/40 | authored, unwired | EL Education impact on achievement: Mathematica study / A three-year quasi-experimental study by Mathematica Policy Research examined EL Education schools in five dis |
| `MICRO_ACTIONS` | 5166 | 79.2 | 200 | 1000 | 6 | 0 | 0/15 | authored, unwired | Raise your hand at least once per class. / Consistent small action builds the habit. |
| `CLASSROOM_TOOLKIT` | 5760 | 64.1 | 61 | 913 | 5 | 0 | 0/27 | authored, unwired | Brief teacher prep. Realistic for any classroom. / Introduce the activity briefly. |
| `EL_CORE_PRACTICES` | 7411 | 20.4 | 30 | 237 | 6 | 0 | 0/23 | authored, unwired | Daily small-group advisory time builds belonging and character. / Deepens learning beyond surface compliance. Builds character through doing. |
| `CHARACTER_HABITS` | 8169 | 26.0 | 31 | 380 | 6 | 0 | 0/34 | authored, unwired | Compassion is a way of being that shows up in specific moments and over time. / Character habits compound. Small choices become who you are. |
| `CONFERENCE_SCRIPTS` | 8824 | 67.4 | 30 | 929 | 7 | 0 | 0/16 | authored, unwired | Beginning-of-year HOWL goal setting / Quiet space. 15 minutes uninterrupted. Both seated. |
| `REPAIR_SCRIPTS` | 9938 | 59.7 | 30 | 900 | 5 | 0 | 0/11 | authored, unwired | Quiet private space. 30+ minutes uninterrupted. Both parties agree to participate. / We are here to talk about what happened. Both of you will have a chance to speak. Listen without interrupting. |
| `EXPEDITION_CONNECTIONS` | 10842 | 56.7 | 40 | 520 | 7 | 8 | 0/9 | authored, unwired | Visit local site relevant to topic. / Collect data or observations on site. |
| `EL_RESEARCH` | 11846 | 15.5 | 30 | 199 | 6 | 15 | 0/35 | authored, unwired | Student-led conferences increase student ownership and family engagement. / Specific measurable effect of the practice. |
| `COACHING_MOVES` | 12178 | 89.5 | 150 | 876 | 10 | 0 | 0/40 | authored, unwired | I noticed you tried two approaches before asking. Tell me about that. / Builds metacognitive capacity. Invites student into the conversation as a partner. |

## mindfulness (6 declarations, 298 KB removed)

Verdicts: 6 authored, unwired. Still referenced anywhere live: none.

| declaration | line | KB | items | prose strings | median words | fragment % | live overlap | verdict | sample |
|---|---|---|---|---|---|---|---|---|---|
| `GRATITUDE_PROMPT_BANK` | 14485 | 42.3 | 390 | 390 | 8 | 0 | 0/40 | authored, unwired | Someone who made you laugh today / A small comfort you used today |
| `AWE_PRACTICES` | 14881 | 33.6 | 24 | 358 | 9 | 1 | 0/40 | authored, unwired | Any outdoor walking route, 15 minutes, ideally a route with at least one tree, sky view, or piece of beauty. / Walk at a slower-than-usual pace. |
| `SENSORY_ANCHORS` | 15511 | 127.4 | 85 | 1679 | 7 | 1 | 0/40 | authored, unwired | Listen for the little air sounds when you breathe in and out. It is one of the quietest sounds you can hear. / Notice the soft hush of air moving past your nose, lips, or throat. Your breath has a sound even when no one e |
| `SOUNDSCAPE_RECIPES` | 18367 | 11.9 | 12 | 77 | 7 | 0 | 0/40 | authored, unwired | Steady rain at medium intensity, full-spectrum pink-noise wash / Occasional bird call, panned slightly right |
| `VISUAL_ANCHORS` | 18535 | 12.0 | 15 | 74 | 20 | 0 | 0/40 | authored, unwired | One stable, neutral object placed at arm's length on a desk or table. A book, a mug, a small plant, a wooden b / Eyes-open practice keeps the survivor in the present room rather than dropping into closed-eye internal experi |
| `TRAUMA_ADAPTATIONS` | 20893 | 70.1 | 25 | 690 | 8 | 3 | 0/40 | authored, unwired | Closing the eyes removes visual safety cues. For trauma survivors, eyes closed plus inward attention to the bo / Keep eyes open with a soft, unfocused gaze on the floor about 3 to 6 feet ahead. You can blink and shift your  |

## advocacy (67 declarations, 597 KB removed)

Verdicts: 67 authored, unwired. Still referenced anywhere live: none.

| declaration | line | KB | items | prose strings | median words | fragment % | live overlap | verdict | sample |
|---|---|---|---|---|---|---|---|---|---|
| `MENTOR_QUOTES` | 2058 | 38.1 | 131 | 587 | 9 | 0 | 0/40 | authored, unwired | Disability only becomes a tragedy when society fails to provide the things we need to lead our lives. / When you feel like the problem is YOU instead of the system. |
| `POWER_UP_CARDS` | 2192 | 18.8 | 50 | 244 | 8 | 0 | 0/40 | authored, unwired | Before responding to a hard question or accusation. / Count to 3. Then say: "I want to think about that for a moment." Then 3 more seconds. THEN respond. |
| `DAILY_PRACTICE_PROMPTS` | 2245 | 23.3 | 200 | 200 | 12 | 1 | 0/40 | authored, unwired | Today, finish this sentence out loud: "What I need more of is ____." Say it three times. / Practice the phrase "I disagree" in a mirror. Say it 5 different ways: gentle, firm, curious, playful, neutral |
| `TRIGGERS_AND_RESPONSES` | 2448 | 23.0 | 60 | 359 | 6 | 1 | 0/40 | authored, unwired | Eyes start watering. Squinting. Slight headache behind eyes. / Hands over eyes. Hood up. Cannot read board. |
| `WORDS_THAT_HURT` | 2511 | 19.8 | 55 | 236 | 6 | 1 | 0/40 | authored, unwired | A word that has been used to dehumanize people with intellectual disabilities for over a century. When used ca / Use the specific word for what you mean: "That is unfair." "That is annoying." "That is silly." Be specific. |
| `ANNUAL_GOAL_TEMPLATES` | 2569 | 15.4 | 40 | 236 | 5 | 0 | 0/40 | authored, unwired | I will be able to identify and name 3 of my personal strengths and 3 areas where I want support, with at least / Self-knowledge is the foundation of every other self-advocacy skill. |
| `FAMILY_CONVERSATION_PREP` | 2612 | 13.9 | 20 | 147 | 14 | 1 | 0/40 | authored, unwired | I want to lead my next IEP meeting / Mom/Dad, I want to talk about something important to me. Is now an okay time? |
| `FRIENDSHIP_AUDIT_QUESTIONS` | 2635 | 4.8 | 50 | 50 | 9 | 0 | 0/39 | authored, unwired | Does this person make me feel physically safe? / Does this person respect my no? |
| `ADVOCACY_BOOK_RECS` | 2688 | 8.4 | 12 | 100 | 6 | 8 | 1/40 | authored, unwired | Being Heumann: An Unrepentant Memoir of a Disability Rights Activist / Judy Heumann with Kristen Joiner |
| `IEP_GLOSSARY_DEEP` | 2882 | 9.5 | 12 | 113 | 6 | 1 | 0/40 | authored, unwired | Present Levels of Performance (PLP / PLAAFP) / The section of an IEP that describes what the student can currently do and what they need. |
| `MEETING_AGENDA_TEMPLATES` | 3063 | 6.8 | 5 | 115 | 4 | 2 | 0/24 | authored, unwired | Special education teacher / case manager / School psychologist or counselor |
| `ADVOCACY_CLOSING_THOUGHTS` | 3629 | 2.6 | 5 | 49 | 5 | 0 | 0/9 | authored, unwired | Advocacy is not always confrontational. / Advocacy is not always public. |
| `TRANSITION_TIMELINE_DETAILED` | 3710 | 4.4 | 10 | 87 | 4 | 0 | 0/5 | authored, unwired | Attend IEP meeting and introduce yourself / Begin transition planning under IDEA |
| `ADVOCACY_FINAL_LIBRARY` | 3863 | 3.8 | 10 | 65 | 4 | 0 | 0/14 | authored, unwired | Weekly emotion inventory (15 min) / Monthly strengths and needs review (30 min) |
| `ADVOCACY_FINAL_RESOURCES` | 3986 | 3.4 | 30 | 51 | 3 | 0 | 1/8 | authored, unwired | disabilityvisibilityproject.com / Disability-led media for stories and current organizing |
| `EXPANDED_MENTOR_VOICES` | 4019 | 3.2 | 10 | 30 | 7 | 0 | 0/16 | authored, unwired | Composite of late-diagnosed autistic women / You are not too late. The years you spent thinking you were broken were also years you were learning. The mask |
| `ADVOCACY_DAILY_PRACTICE_DEEP` | 4082 | 5.1 | 20 | 57 | 4 | 0 | 0/29 | authored, unwired | Lie or sit. Scan from feet to head. Note sensations without judging. Name what your body needs today. / Builds awareness. Catches early warning signs. Establishes self-care as priority. |
| `ADVOCACY_AFFIRMATION_LIBRARY` | 4245 | 8.3 | 100 | 96 | 5 | 0 | 0/6 | authored, unwired | My accommodations are tools, not weaknesses. / My disability is part of who I am, not all of who I am. |
| `ADVOCACY_DAILY_ROUTINES` | 4348 | 2.2 | 20 | 22 | 6 | 18 | 0/12 | authored, unwired | Body check: how am I feeling? Eat. Hydrate. Set intention for the day. / Mental check: any meetings or hard conversations today? What do I need to prepare? |
| `COMPREHENSIVE_RESOURCE_GUIDES` | 4371 | 6.0 | 3 | 160 | 3 | 0 | 0/7 | authored, unwired | Read one identity-affirming piece / Avoid alarming Google searches |
| `ADVOCACY_GLOSSARY_FINAL` | 4428 | 7.4 | 50 | 125 | 5 | 0 | 0/40 | authored, unwired | Modified to fit a specific person or need. / A person who supports or argues for a cause. |
| `TRAUMA_INFORMED_ADVOCACY` | 4481 | 2.6 | 6 | 48 | 4 | 0 | 0/8 | authored, unwired | Physical and emotional safety must be established before deeper advocacy work. / Identify safe people and spaces |
| `ADVOCACY_TOOL_BUILDER` | 4574 | 2.8 | 10 | 53 | 3 | 0 | 0/3 | authored, unwired | Walk into every IEP meeting prepared / Track all advocacy-related communications |
| `ADVOCACY_FAQ_LIBRARY` | 4657 | 6.1 | 15 | 45 | 11 | 0 | 0/40 | authored, unwired | What if I do not know what my diagnosis is? / Many students do not know their full diagnosis until they actively ask. Start by asking your case manager or p |
| `FINAL_NARRATIVE_LIBRARY` | 4785 | 9.6 | 10 | 152 | 6 | 16 | 0/40 | authored, unwired | Senior year transition stalled / You are senior year. Transition planning has not been happening despite federal requirement. |
| `FINAL_NARRATIVE_LIBRARY` | 4994 | 10.4 | 10 | 108 | 12 | 0 | 0/40 | authored, unwired | The Day I Learned My Voice Mattered / I was 13. My English teacher Mr. Hassan called on me to read aloud. I had been masking for years that I could  |
| `ADVOCACY_CLOSING_RESOURCES` | 5268 | 2.4 | 20 | 35 | 3 | 0 | 1/5 | authored, unwired | disabilityvisibilityproject.com / Disability Rights Education and Defense Fund |
| `ADVOCACY_TIPS_LIBRARY` | 5291 | 7.0 | 50 | 100 | 6 | 0 | 1/40 | authored, unwired | Always use specific language. "Extended time on tests" beats "more time". / Specific language is harder to dismiss. |
| `ADVANCED_ADVOCACY_TOPICS` | 5344 | 4.8 | 8 | 69 | 5 | 1 | 0/34 | authored, unwired | Intersectionality in disability advocacy / Recognizing that disabled people often hold multiple identities (race, gender, sexuality, class) that compound |
| `EXPANDED_PROCEDURAL_GUIDE` | 5457 | 5.6 | 8 | 90 | 6 | 2 | 0/40 | authored, unwired | Requesting an initial evaluation / You suspect your child has a disability and needs special education |
| `MENTAL_HEALTH_TOOLKIT` | 5574 | 6.6 | 16 | 122 | 5 | 1 | 0/25 | authored, unwired | Pulls awareness from internal panic to external present. / Anxiety, sleep struggles, before hard conversation |
| `REAL_WORLD_PROCEDURES` | 5788 | 5.4 | 8 | 98 | 5 | 0 | 0/34 | authored, unwired | Filing for SSI as a young adult with disability / After 18 if disability prevents work |
| `ANNUAL_PLANNING_TEMPLATES` | 5947 | 7.6 | 12 | 159 | 4 | 0 | 0/23 | authored, unwired | Review last year's IEP / 504 plan / Note what worked and what did not |
| `DETAILED_DISABILITY_GUIDE` | 6194 | 9.4 | 10 | 166 | 3 | 0 | 0/40 | authored, unwired | A neurodevelopmental difference affecting specific learning processes (reading, writing, math, processing). / Myth: People with LD are not intelligent. Reality: Many have above-average IQ. |
| `ADVOCACY_RESOURCE_DIRECTORY` | 6414 | 5.3 | 20 | 60 | 5 | 0 | 0/24 | authored, unwired | 400 Maryland Avenue SW, Washington, DC 20202 / Federal oversight of special education, civil rights, and education policy. |
| `SELF_ADVOCACY_LESSON_PLANS` | 6583 | 8.8 | 8 | 105 | 6 | 8 | 0/40 | authored, unwired | Lesson 1: What is Self-Advocacy? / Define self-advocacy in their own words |
| `ADVOCACY_DIALOGUE_LIBRARY` | 6748 | 6.3 | 10 | 92 | 5 | 18 | 0/30 | authored, unwired | You want to take a hard class your counselor advised against / Counselor: I do not recommend honors English. Your reading has been below grade level. |
| `WORKPLACE_DEEP_SCENARIOS` | 6924 | 7.6 | 5 | 81 | 6 | 5 | 0/40 | authored, unwired | Disclosing ADHD to your first manager / You just got hired at your first office job. You have ADHD. You want to disclose to set up accommodations but  |
| `COMMUNITY_BUILDING_GUIDES` | 7108 | 4.3 | 6 | 81 | 4 | 0 | 0/15 | authored, unwired | Find one online disability community / Identify your primary identity (autistic, ADHD, deaf, etc.) |
| `LEGISLATIVE_AND_POLICY_PRIMER` | 7251 | 5.1 | 10 | 61 | 5 | 8 | 0/31 | authored, unwired | Individuals with Disabilities Education Act (IDEA) / Requires free appropriate public education for students with disabilities. Funds special education services. S |
| `FAMILY_AND_PARENT_EDUCATION` | 7763 | 5.8 | 8 | 78 | 7 | 1 | 0/40 | authored, unwired | How to talk to your child about their diagnosis / Be honest. Hiding the diagnosis is harder than naming it. |
| `EXTENDED_CASE_STUDIES` | 7896 | 17.3 | 15 | 223 | 7 | 0 | 0/40 | authored, unwired | Dario's parents are immigrants from Colombia. His mom does not feel comfortable in IEP meetings because of the / Dario has been the family translator since middle school. He is exhausted. He wants his mom to fully participa |
| `FINAL_REFLECTION_PROMPTS` | 8229 | 3.1 | 30 | 32 | 10 | 0 | 0/22 | authored, unwired | Looking back on a year of advocacy, what is one thing I am proud of? / What is one thing that grew this year that no one else might notice? |
| `ADVOCACY_JOURNAL_PROMPTS` | 8262 | 7.3 | 20 | 40 | 22 | 0 | 0/39 | authored, unwired | Write about a time someone asked you what you needed and you actually told them. How did it feel? What did the / In 7th grade my new English teacher asked what would help me with writing. I said I needed extra time and a qu |
| `ADVOCACY_GROUP_DISCUSSION_GUIDES` | 8405 | 6.8 | 8 | 91 | 6 | 3 | 0/33 | authored, unwired | What does self-advocacy mean to me? / Name + one thing you advocated for this week (small counts) |
| `EXTENDED_TRIGGERS_AND_RESPONSES` | 8524 | 13.5 | 15 | 175 | 7 | 2 | 0/40 | authored, unwired | You are asked to read aloud unexpectedly / Heart rate spikes. Mouth goes dry. Eyes blur on the page. Words you knew become alien. |
| `SELF_ASSESSMENT_RUBRICS` | 8823 | 5.7 | 5 | 108 | 6 | 0 | 0/23 | authored, unwired | I can name 3 of my strengths in specific terms. / I can name 5+ with examples and contexts. |
| `ADVOCACY_MILESTONES` | 8879 | 3.7 | 20 | 57 | 6 | 0 | 0/21 | authored, unwired | Can name 1-2 things they like to do for fun / Foundation of preference and choice. |
| `DETAILED_ROLEPLAY_LIBRARY` | 8902 | 15.7 | 5 | 183 | 5 | 0 | 0/40 | authored, unwired | You are 14. You are entering your first IEP meeting as a participant, not just attendee. Your case manager has / General education teacher (Mr. Bell) |
| `WEEKLY_CURRICULUM_LIBRARY` | 9246 | 18.3 | 8 | 247 | 5 | 3 | 0/40 | authored, unwired | Identify 5 strengths and 5 needs in your own words. / Read through list of 30 strengths |
| `CASE_LAW_DEEP_DIVE` | 9817 | 8.7 | 12 | 111 | 6 | 0 | 0/40 | authored, unwired | Racial segregation in public schools is unconstitutional. / Not a disability case directly. But Brown established the principle that "separate but equal" is inherently un |
| `DISABILITY_HISTORY_DEEP` | 10008 | 6.7 | 10 | 85 | 6 | 0 | 0/40 | authored, unwired | Disabled people, particularly those with intellectual or psychiatric disabilities, were widely placed in large / 1817: American School for the Deaf opens |
| `FULL_ADVOCACY_SCENARIO_LIBRARY` | 10149 | 15.6 | 12 | 202 | 8 | 0 | 0/40 | authored, unwired | You arrive at an exam and discover the proctor does not have your accommodation paperwork. / Your accommodations are listed in your IEP/504 |
| `ADVOCACY_FOR_FAMILIES` | 10486 | 4.7 | 5 | 73 | 7 | 1 | 0/40 | authored, unwired | You are not alone. The IEP process is overwhelming for everyone at first. / You have rights and so does your child |
| `ADVOCACY_FOR_EDUCATORS` | 10607 | 3.4 | 4 | 56 | 5 | 0 | 0/28 | authored, unwired | New special education teachers / You are part of the team. Your job is to support, not to fix. |
| `ADVOCACY_SCRIPT_LIBRARY_EXTENDED` | 11030 | 6.6 | 30 | 60 | 10 | 0 | 0/40 | authored, unwired | Calling a doctor's office for the first time / Hi. My name is ___. I am calling because I would like to schedule an appointment. I have insurance through ___ |
| `ADVOCACY_QUOTES_LIBRARY` | 11183 | 5.1 | 50 | 50 | 10 | 0 | 0/39 | authored, unwired | Disability is a part of the human condition. Not the worst part. Not the best part. Part. / You are not too sensitive. You are exactly sensitive enough for the life you are living. |
| `WORKPLACE_ADVOCACY_SCENARIOS` | 11236 | 5.3 | 8 | 70 | 6 | 0 | 0/40 | authored, unwired | Should I disclose my disability on a job application? / You are not required to disclose at the application stage. The only exception is if the job has specific physi |
| `COLLEGE_PREP_CHECKLIST` | 11363 | 4.8 | 8 | 65 | 7 | 3 | 0/40 | authored, unwired | Start exploring colleges that have strong disability services / Visit at least 2 colleges during a campus tour day |
| `ALLY_SCRIPTS` | 11471 | 3.9 | 10 | 32 | 12 | 0 | 0/29 | authored, unwired | Your disabled friend is being teased / Walk over and stand next to your friend. Say to the teaser: "That is not okay. Knock it off." Look at your fri |
| `SCAFFOLDED_PRACTICE_LIBRARY` | 11544 | 16.4 | 10 | 217 | 8 | 0 | 0/40 | authored, unwired | Help-seeking is the foundational self-advocacy skill. Most students never learn it explicitly. / Say the words "Could you help me?" out loud to yourself, 3 times. |
| `REFLECTION_PROMPTS_EXTENDED` | 11825 | 5.3 | 20 | 80 | 7 | 0 | 0/33 | authored, unwired | What was one moment today when you advocated for yourself? / What is one thing you wish you had said today? |
| `INDEPENDENT_LIVING_SKILLS` | 11948 | 13.6 | 20 | 212 | 6 | 7 | 0/40 | authored, unwired | Scheduling your own doctor appointments / Adult healthcare requires self-scheduling. Practice early. |
| `MAINE_SPECIFIC_RIGHTS` | 12845 | 8.0 | 12 | 109 | 5 | 1 | 0/40 | authored, unwired | Maine Unified Special Education Regulations (MUSER) / Maine's implementation of federal IDEA. Sets state-specific procedures, timelines, and rights for special educ |
| `ADVOCACY_HISTORY_TIMELINE` | 14087 | 15.7 | 28 | 157 | 9 | 0 | 0/40 | authored, unwired | American School for the Deaf founded / Thomas Hopkins Gallaudet, Laurent Clerc, Mason Cogswell |
| `SCENARIO_BANK` | 14370 | 17.7 | 12 | 178 | 10 | 1 | 0/40 | authored, unwired | Maya, autistic 7th grader with sensory accommodations / Maya has an IEP accommodation to wear noise-canceling headphones in study hall. A new aide tells her she canno |
| `CRISIS_FIRST_AID` | 15333 | 12.0 | 30 | 210 | 7 | 7 | 0/40 | authored, unwired | I just got bad news and I am about to lose it in public / Step outside. Bathroom, hallway, car. |

## upstander (137 declarations, 607 KB removed)

Verdicts: 137 authored, unwired. Still referenced anywhere live: none.

| declaration | line | KB | items | prose strings | median words | fragment % | live overlap | verdict | sample |
|---|---|---|---|---|---|---|---|---|---|
| `FINAL_PRACTICAL_TIPS` | 1520 | 2.2 | 40 | 38 | 4 | 0 | 0/7 | authored, unwired | Carry the resource numbers in your phone / Save evidence screenshots before deletion |
| `COMPREHENSIVE_NARRATIVE_PART9` | 1563 | 2.5 | 5 | 35 | 8 | 3 | 0/18 | authored, unwired | I had been working without rest for 15 years. / I took a sabbatical. Three months. |
| `EXTENDED_GLOSSARY_2` | 1655 | 2.9 | 30 | 34 | 5 | 3 | 0/13 | authored, unwired | Standing with marginalized groups one is not part of / More than ally; active participant in resistance |
| `WAVE_OF_AFFIRMATIONS` | 1844 | 2.3 | 50 | 26 | 4 | 0 | 0/0 | authored, unwired | I see harm and I choose to act. / I am the kind of person who shows up. |
| `QUOTES_FROM_THE_MOVEMENT` | 1897 | 4.3 | 30 | 64 | 4 | 0 | 0/22 | authored, unwired | Be the change you wish to see in the world. / Injustice anywhere is a threat to justice everywhere. |
| `EXTENDED_BOOK_RECOMMENDATIONS_2` | 1930 | 2.4 | 20 | 47 | 3 | 2 | 0/1 | authored, unwired | Disability Visibility: First-Person Stories / When They Call You a Terrorist |
| `COMPREHENSIVE_BYSTANDER_NARRATIVES_FINAL` | 1986 | 3.0 | 5 | 34 | 11 | 3 | 0/23 | authored, unwired | When my middle school self met my future / I was 13 and bullied. I wrote in my diary: "I want to be the kind of adult who would have helped me." |
| `ULTIMATE_SCENARIO_BANK` | 2074 | 3.2 | 12 | 69 | 4 | 0 | 0/9 | authored, unwired | You have joined a new friend group. They tease one peer who is not present. / Privately ask if pattern continues |
| `SUSTAINABLE_PRACTICE_FINAL` | 2213 | 2.4 | 8 | 43 | 3 | 0 | 0/5 | authored, unwired | Body keeps the score. Care for body sustains the work. / Mental health affects everything. Care for mind sustains the work. |
| `INTERSECTIONAL_ANALYSIS_GUIDE` | 2312 | 2.1 | 5 | 40 | 4 | 0 | 0/8 | authored, unwired | Intersectional analysis basics / Multiple identities compound experiences |
| `ULTIMATE_AFFIRMATIONS_LIBRARY` | 2385 | 2.3 | 40 | 40 | 5 | 0 | 0/0 | authored, unwired | I am the kind of person who notices. / I am building a different world. |
| `COMPREHENSIVE_FAQ_FINAL` | 2428 | 2.4 | 12 | 24 | 9 | 0 | 0/13 | authored, unwired | Yes. Bullied students have higher rates of anxiety, depression, suicide. Bullying is real harm. It is not "kid / But cannot kids just toughen up? |
| `FINAL_BYSTANDER_NARRATIVES` | 2491 | 2.7 | 5 | 30 | 12 | 3 | 0/22 | authored, unwired | I was 25. I had been doing upstander work for 12 years. / One day I wrote a thank-you note to my high school counselor Ms. Hassan. She had been my first ally. |
| `EXTENDED_REFLECTION_PROMPTS` | 2571 | 3.6 | 40 | 40 | 8 | 0 | 0/17 | authored, unwired | What is one moment of upstander work you have witnessed that inspires you? / Who in your life was an upstander for you? |
| `DEEPER_CONVERSATION_GUIDES` | 2614 | 5.5 | 8 | 103 | 5 | 0 | 0/32 | authored, unwired | With friend who has been excluding someone / Hey, I want to talk to you about something. Can we? |
| `BYSTANDER_MOMENT_RECOGNITION` | 2828 | 2.1 | 8 | 43 | 3 | 0 | 0/0 | authored, unwired | One sentence: "Not okay around me" |
| `COMPREHENSIVE_NARRATIVE_PART8` | 2920 | 3.1 | 5 | 36 | 12 | 6 | 0/28 | authored, unwired | When I built the youth coalition / I was 16. I had been doing upstander work alone for two years. |
| `DEEPER_BYSTANDER_SCENARIOS_PART3` | 3010 | 3.1 | 5 | 66 | 3 | 0 | 0/5 | authored, unwired | A family pattern of harm has been going for generations. / Find external support (therapist, community) |
| `EXTENDED_DAILY_PROMPTS_PART6` | 3147 | 3.9 | 50 | 50 | 5 | 0 | 0/8 | authored, unwired | Honor setback. Note resilience. / Help peer practically. Note specifically. |
| `EXTENDED_DAILY_PROMPTS_PART5` | 3200 | 4.1 | 50 | 50 | 5 | 0 | 0/19 | authored, unwired | Notice one moment of joy. Note what created it. / Refuse one negativity spiral. Note redirect. |
| `EXTENDED_DAILY_PROMPTS_PART4` | 3253 | 4.1 | 50 | 50 | 6 | 0 | 0/19 | authored, unwired | Notice growth. Three concrete examples. / Honor a setback. Note resilience. |
| `EXTENDED_DAILY_PROMPTS_PART3` | 3306 | 4.6 | 50 | 50 | 7 | 0 | 0/40 | authored, unwired | Acknowledge growth specifically. Three concrete examples. / Honor a setback. Note learning. |
| `EXTENDED_DAILY_PROMPTS_PART2` | 3359 | 5.4 | 60 | 60 | 8 | 0 | 0/40 | authored, unwired | Reflect on quarter ahead. What is your focus? / Notice one privilege you have used today. Note specifically. |
| `COMPREHENSIVE_NARRATIVE_PART7` | 3422 | 2.9 | 5 | 34 | 11 | 0 | 0/25 | authored, unwired | I was 20. I was at a community meeting about racial justice. / A speaker named the harm white people had caused. Specifically. Not gently. |
| `ANSWER_BANK` | 3581 | 3.0 | 15 | 30 | 9 | 0 | 0/18 | authored, unwired | What if my intervention does not work? / You did your part. Outcomes are not always within your control. Reflect on what worked, what did not. Try diff |
| `COMMUNITY_RESOURCE_DIRECTORY` | 3659 | 3.1 | 30 | 40 | 3 | 0 | 0/0 | authored, unwired | Substance use and mental health / Anti-Semitism, anti-defamation |
| `INTEGRATING_INTO_DAILY_LIFE` | 3692 | 2.2 | 10 | 35 | 3 | 0 | 0/0 | authored, unwired | Listen to identity-affirming podcast |
| `SUSTAINED_CONNECTIONS` | 3805 | 2.1 | 8 | 48 | 2 | 0 | 0/0 | authored, unwired |  |
| `EMOTIONAL_REGULATION_LIBRARY` | 3864 | 2.3 | 10 | 42 | 3 | 0 | 0/0 | authored, unwired | Do not let anger drive escalation / Guilt about action, shame about self |
| `COMPREHENSIVE_NARRATIVE_PART6` | 3969 | 3.0 | 4 | 35 | 11 | 0 | 0/25 | authored, unwired | I was in 9th grade. I saw a kid bullying my younger brother. / I was scared. The bully was bigger than me. |
| `FURTHER_SCENARIOS_DEEP` | 4054 | 3.2 | 8 | 59 | 4 | 0 | 0/8 | authored, unwired | Friend group has been targeting one peer for weeks / Have been complicit by silence |
| `ADDITIONAL_LESSON_PLANS_DETAILED` | 4161 | 5.7 | 8 | 78 | 4 | 12 | 0/5 | authored, unwired | Show video of bystander effect experiment / What did you notice? What surprised you? |
| `TIPS_FOR_DIFFERENT_CONTEXTS` | 4279 | 2.2 | 8 | 43 | 4 | 0 | 0/4 | authored, unwired | Address language patterns directly / Hold a friend accountable privately first |
| `GROUP_FACILITATION_TOOLBOX` | 4369 | 2.3 | 10 | 57 | 3 | 0 | 0/0 | authored, unwired | Each person shares one feeling word / Build connection between members |
| `REFLECTION_PROMPTS_DEEP` | 4442 | 3.0 | 30 | 30 | 8 | 0 | 0/15 | authored, unwired | What kind of upstander do you want to become in the next year? / What barriers keep you from acting? Be specific. |
| `COMPREHENSIVE_NARRATIVES_PART5` | 4475 | 3.0 | 4 | 34 | 11 | 0 | 0/24 | authored, unwired | I was 13. I had been seeing my friend Lana bullying our classmate Nora. / For two months I watched. I told myself I would say something when it got worse. |
| `ADDITIONAL_BYSTANDER_SCENARIOS_FINAL` | 4560 | 3.2 | 8 | 53 | 5 | 0 | 0/15 | authored, unwired | Witnessing harassment of a service worker / You see a customer berating a service worker. |
| `PRACTICAL_TIPS_LIBRARY` | 4672 | 2.5 | 40 | 40 | 5 | 3 | 0/7 | authored, unwired | Document with specific facts: date, time, location, who saw / Email same-day after verbal interactions |
| `GLOBAL_UPSTANDER_HISTORY` | 4715 | 2.9 | 10 | 40 | 5 | 0 | 0/18 | authored, unwired | Decades of resistance to apartheid produced one of largest peaceful transitions in history. / Sustained organization across generations produces change. |
| `COMPREHENSIVE_NARRATIVE_PART4` | 4798 | 4.2 | 5 | 44 | 13 | 0 | 0/39 | authored, unwired | When the school changed and I had not noticed / I had been a sophomore the year a Black principal was hired at our majority-white school. |
| `MENTAL_HEALTH_INTERSECTION` | 4904 | 3.5 | 8 | 89 | 3 | 1 | 0/6 | authored, unwired | Strong correlation between bullying and depression / Anxiety significantly increased in bullied youth |
| `EXTENDED_BYSTANDER_NARRATIVES_PART5` | 4971 | 4.4 | 6 | 46 | 12 | 2 | 0/36 | authored, unwired | I was 12 when I realized that the kid who got bullied on the bus needed someone to sit with him. / I had been watching for weeks. Nobody sat with him. Nobody. |
| `LONG_TERM_PRACTICE_LIBRARY` | 5088 | 4.2 | 12 | 89 | 2 | 0 | 0/0 | authored, unwired | Listen to identity-affirming media / Choose marginalized podcast or media |
| `COMPLEX_SCENARIOS` | 5248 | 5.0 | 8 | 110 | 3 | 0 | 0/11 | authored, unwired | Someone who has been bullying others is now in mental health crisis themselves. / Continue accountability for harm |
| `COMMON_QUESTIONS_DEEP` | 5435 | 5.7 | 10 | 103 | 4 | 0 | 0/23 | authored, unwired | Why do bystanders stay silent? / Bystander effect (others will help) |
| `WORKSHOP_FACILITATION_GUIDES` | 5620 | 4.3 | 8 | 66 | 3 | 0 | 0/0 | authored, unwired | Introduction to Upstander Work / Self-assess location on spectrum |
| `BYSTANDER_NARRATIVES_ENRICHED` | 5728 | 4.4 | 5 | 46 | 13 | 0 | 0/34 | authored, unwired | When my courage came from another / I was 13. I had been bullied for months. Daily mocking. I had stopped speaking in class. |
| `DEEP_RESEARCH_CITATIONS` | 5838 | 3.4 | 10 | 50 | 5 | 0 | 0/22 | authored, unwired | Olweus Bullying Prevention Program research (1990s-2000s) / Comprehensive school-wide program reduces bullying 20-70% |
| `FACILITATOR_GUIDES` | 5921 | 2.2 | 5 | 71 | 2 | 0 | 0/0 | authored, unwired | Training in restorative practices |
| `CRITICAL_RESPONSE_PROTOCOLS` | 6027 | 2.8 | 6 | 64 | 3 | 0 | 0/1 | authored, unwired | Get to safety together if possible / Help them get medical care if needed |
| `COMPREHENSIVE_AGE_GUIDES` | 6151 | 4.0 | 7 | 86 | 2 | 0 | 0/8 | authored, unwired | Sharing, taking turns, recognizing feelings / Heavy. Adults must intervene and teach. |
| `EXTENDED_NARRATIVES_PART4` | 6258 | 4.2 | 5 | 41 | 12 | 0 | 0/31 | authored, unwired | I was 14. I had never thought about my whiteness. / My Black friend Devin told me: "You move through the world differently than I do. I get followed in stores. I  |
| `ADULT_LEARNING_GUIDES` | 6360 | 2.4 | 5 | 48 | 3 | 0 | 0/0 | authored, unwired | Adults beginning upstander work / White adults doing antiracism work |
| `MORE_AFFIRMATIONS` | 6409 | 2.6 | 40 | 40 | 8 | 0 | 1/15 | authored, unwired | I am a witness who chooses to act. / I am building a different world with every small action. |
| `UPSTANDER_LANGUAGE_DEEP` | 6452 | 2.6 | 10 | 58 | 4 | 0 | 0/0 | authored, unwired | I understand the impact was... / I cannot promise but I will work on... |
| `BUILDING_MOVEMENT_DEEP` | 6569 | 2.0 | 5 | 45 | 3 | 0 | 0/0 | authored, unwired | Awkward. Tentative. Brave-feeling. / More confident. Real wins. Real losses. |
| `SCENARIO_DECISION_BANK` | 6711 | 3.9 | 8 | 63 | 3 | 0 | 0/0 | authored, unwired | Friendship preservation possible |
| `REGULATIONS_GUIDE` | 6793 | 2.6 | 10 | 31 | 7 | 0 | 0/19 | authored, unwired | OCR Dear Colleague Letter 2010 - bullying based on race / Schools have obligation to respond to race-based harassment under Title VI. |
| `COMPREHENSIVE_NARRATIVE_PART3` | 6866 | 4.7 | 6 | 55 | 10 | 0 | 0/40 | authored, unwired | I was 16 when the racial justice movement intensified at my school. / I had been a bystander. White. Liberal in name. Quiet in practice. |
| `ALL_BYSTANDER_TYPES` | 7075 | 2.7 | 10 | 56 | 3 | 0 | 0/8 | authored, unwired | Notices what is happening but does not act. / Most people. Often paralyzed by fear, uncertainty, or social pressure. |
| `COMMUNITY_BUILDING_DEEPER` | 7148 | 2.9 | 8 | 62 | 2 | 0 | 0/2 | authored, unwired | People with shared identity come together for support / Multiple identities working together |
| `CONTEXTUAL_SCRIPT_LIBRARY` | 7215 | 4.1 | 15 | 73 | 6 | 0 | 0/15 | authored, unwired | In hallway when you hear a slur / "I do not want to hear that word." |
| `DEEP_PRACTICE_PROMPTS` | 7368 | 4.6 | 50 | 50 | 8 | 0 | 0/25 | authored, unwired | Describe a moment when you were a bystander. What did you observe and what did you do? / Describe a moment when you were an upstander. What did you do and what did you feel? |
| `YEAR_LONG_CURRICULUM` | 7421 | 5.3 | 10 | 105 | 2 | 0 | 0/0 | authored, unwired |  |
| `FILM_RECOMMENDATIONS` | 7534 | 2.8 | 20 | 46 | 4 | 0 | 0/11 | authored, unwired | Disability rights movement origins / Documentary about Camp Jened. Foundation of disability rights. |
| `BOOK_RECOMMENDATIONS` | 7570 | 5.3 | 20 | 90 | 3 | 0 | 0/14 | authored, unwired | Intersection of race, gender, class, bullying, justice / True story of teen who set fire to nonbinary teen on bus. Complex analysis. |
| `DETAILED_PSYCH_RESEARCH` | 7753 | 4.7 | 15 | 59 | 5 | 0 | 0/35 | authored, unwired | Defined modern understanding of bullying as repeated aggressive behavior with power imbalance. / Foundation of bullying research. Olweus Bullying Prevention Program adopted globally. |
| `ANTI_BULLYING_LAWS_BY_STATE` | 7876 | 3.7 | 25 | 69 | 2 | 0 | 0/0 | authored, unwired | Schools must have anti-bullying policy / Investigation procedures required |
| `FEDERAL_PROTECTIONS_DEEP` | 7904 | 4.1 | 8 | 59 | 4 | 0 | 1/22 | authored, unwired | Prohibits discrimination based on race, color, or national origin in federally funded programs. / U.S. Department of Education Office for Civil Rights |
| `INSPIRATION_LIBRARY` | 8001 | 4.9 | 20 | 55 | 7 | 0 | 0/37 | authored, unwired | Architect of the 1963 March on Washington. Openly gay Black man whose contributions were minimized for decades / Sustained advocacy across decades. Multiple identities. Refused to be sidelined. |
| `COMPREHENSIVE_FACT_SHEET` | 8124 | 3.0 | 8 | 48 | 5 | 0 | 0/27 | authored, unwired | 1 in 5 students reports being bullied at school / Most bullying happens in elementary and middle school |
| `WORKSHEETS_AND_TOOLS` | 8215 | 2.6 | 10 | 65 | 3 | 0 | 0/0 | authored, unwired | What happened from each perspective / What did I notice about myself |
| `DETAILED_ROLE_PLAY_BANK` | 8288 | 7.6 | 8 | 113 | 4 | 0 | 0/27 | authored, unwired | Friend admits they have been targeting someone / I think I have been mean to ___. |
| `ROLE_BASED_GUIDES` | 8434 | 4.3 | 10 | 84 | 4 | 0 | 0/8 | authored, unwired | You have social power. Use it. / Often jokes at others' expense. |
| `ADDITIONAL_BYSTANDER_NARRATIVES` | 8567 | 6.5 | 8 | 72 | 11 | 0 | 0/40 | authored, unwired | The student who became principal / I was bullied in 7th grade. The principal at the time told me to "toughen up." |
| `COMPREHENSIVE_INTERVENTION_GUIDES` | 8738 | 3.7 | 6 | 72 | 4 | 0 | 0/9 | authored, unwired | When you see physical violence / Call for help (adult, security, 911) |
| `EXTENDED_RESEARCH_REVIEW` | 8870 | 5.4 | 20 | 78 | 5 | 0 | 0/40 | authored, unwired | Bystander intervention reduces bullying duration by 70% within 10 seconds / Quick intervention is essential. Training students for fast response works. |
| `BULLYING_BY_AGE_LIBRARY` | 9013 | 2.3 | 5 | 56 | 2 | 0 | 0/5 | authored, unwired | Tattling vs. reporting confusion / Often impulsive. Quickly resolved or quickly escalated. Adults play major role. |
| `GIRL_BULLYING_DEEP` | 9056 | 2.1 | 5 | 45 | 3 | 0 | 0/5 | authored, unwired | Long-lasting psychological impact. Often invisible to adults. / Build wider friendship circles |
| `BOY_BULLYING_DEEP` | 9119 | 2.1 | 5 | 46 | 3 | 0 | 0/5 | authored, unwired | Physical harm. Normalizes violence. / Limits emotional development. Harms boys and girls. |
| `TRAUMA_INFORMED_BULLYING_RESPONSE` | 9182 | 3.9 | 6 | 88 | 3 | 0 | 0/0 | authored, unwired | Address underlying safety needs / What needs to be true for safety? |
| `EXTENDED_DAILY_PROMPTS` | 9347 | 8.5 | 90 | 90 | 9 | 0 | 0/40 | authored, unwired | Notice one moment of inclusion today. Write 2 sentences. / Notice one moment of exclusion today. Write 2 sentences. |
| `MICRO_PRACTICE_LIBRARY` | 9440 | 5.0 | 15 | 91 | 4 | 0 | 0/15 | authored, unwired | Acknowledgment of presence. No words required. / After 1 week, add a brief "hi". After 2 weeks, add a question. |
| `EVERYDAY_UPSTANDER_MOMENTS` | 9578 | 4.8 | 20 | 61 | 5 | 0 | 0/17 | authored, unwired | Make eye contact and say hi to one person who looks alone today. / Acknowledgment combats invisibility. |
| `IDENTITY_HARM_DEEPER` | 9741 | 7.2 | 10 | 148 | 3 | 1 | 0/6 | authored, unwired | Disproportionate discipline (suspensions, referrals) / Adultification (treated as older) |
| `FAMILY_GUIDES_DEEP` | 9994 | 5.0 | 8 | 103 | 4 | 0 | 0/14 | authored, unwired | Engage with school proactively / Confront other family directly |
| `BYSTANDER_INTERVENTION_FRAMEWORKS_DEEP` | 10169 | 4.1 | 3 | 70 | 3 | 0 | 0/5 | authored, unwired | 5 Ds of Bystander Intervention / Green Dot, Bringing in the Bystander |
| `REPAIR_PROCESS_DEEP` | 10283 | 2.5 | 10 | 41 | 4 | 0 | 0/9 | authored, unwired | Name what happened. Specifically. Without minimization. / I acknowledge that I [specific action]. I see the impact was [impact]. |
| `INTERVENTION_SCRIPT_LIBRARY` | 10356 | 5.6 | 50 | 100 | 5 | 0 | 0/29 | authored, unwired | Witnessing a slur in a hallway / Hey. That word is not okay. Please stop. |
| `BULLY_PROFILE_DEEP` | 10444 | 3.9 | 10 | 76 | 3 | 0 | 0/18 | authored, unwired | Often experiencing harm at home. May not show vulnerability. / Hurt people hurt people. Acting out unresolved trauma. |
| `SUPPORT_RESOURCES_DEEP` | 10527 | 4.1 | 6 | 59 | 3 | 0 | 0/3 | authored, unwired | Trans crisis support, by trans people / Mental health support and education |
| `EXTENDED_LESSON_MATERIALS` | 10602 | 6.5 | 10 | 100 | 3 | 4 | 0/5 | authored, unwired | Understanding the bullying-bystander spectrum / Define: bully, target, bystander, upstander |
| `COMPREHENSIVE_NARRATIVES_PART2` | 10779 | 10.0 | 8 | 97 | 15 | 0 | 0/40 | authored, unwired | The time I broke the silence in a friend group / I was 15. My friend group had been mocking one of our other classmates, Sara, for weeks. She had been seen at  |
| `MORE_BYSTANDER_SCENARIOS` | 11002 | 8.9 | 20 | 177 | 3 | 0 | 0/20 | authored, unwired | Anonymous harassment of teacher by students / A teacher is being mocked on a fake social media account by anonymous students. |
| `WEEKLY_CURRICULUM_DEEP` | 11326 | 4.6 | 8 | 56 | 5 | 0 | 0/12 | authored, unwired | Notice 5 social interactions in school / Notice one moment of exclusion |
| `DEEP_DIVE_SCENARIOS_SET2` | 11441 | 6.1 | 8 | 111 | 5 | 0 | 0/28 | authored, unwired | When the bully is your sibling / Your younger sibling has been bullying another child in their grade. You hear about it from their friend. |
| `REPAIR_STORIES_COLLECTION` | 11623 | 5.6 | 5 | 56 | 13 | 2 | 0/40 | authored, unwired | When apology was just the beginning / I was 14. I spread a rumor about a classmate that turned out to be false. |
| `TEACHING_GUIDES_FOR_EDUCATORS` | 11753 | 2.2 | 4 | 49 | 2 | 0 | 0/0 | authored, unwired | Books featuring diverse characters / Building bystander intervention skills |
| `ROLE_PLAY_DIALOGUES_DEEP` | 11844 | 12.0 | 8 | 130 | 5 | 0 | 0/40 | authored, unwired | A bystander becomes an upstander - first time / In hallway. Friend is mocking target. Target is silent. |
| `TRAINING_MODULES` | 12101 | 10.0 | 10 | 97 | 5 | 10 | 0/40 | authored, unwired | Module 1: The Spectrum of Bystander to Upstander / Welcome. Today we explore where each of us sits on the bystander-upstander spectrum. |
| `UPSTANDER_GLOSSARY` | 12429 | 5.2 | 50 | 59 | 6 | 0 | 0/34 | authored, unwired | Someone who witnesses harm and chooses to intervene in some way. / Someone who witnesses harm and does not intervene. |
| `BYSTANDER_FAQ` | 12482 | 2.2 | 10 | 20 | 11 | 0 | 0/15 | authored, unwired | What if intervening makes me a target? / This is a real concern. Strategies: 1) Choose lower-risk interventions when needed. 2) Build coalition before  |
| `UPSTANDER_HISTORY_EXTENDED` | 12535 | 9.6 | 20 | 139 | 4 | 0 | 0/40 | authored, unwired | Greensboro lunch counter sit-ins / Joseph McNeil, Franklin McCain, Ezell Blair Jr., David Richmond - four NC A&T freshmen |
| `UPSTANDER_DAILY_PRACTICES_DEEP` | 12718 | 5.2 | 15 | 79 | 4 | 1 | 0/14 | authored, unwired | Identify one moment where you might need to be an upstander / Set intention: "Today I will ___ if ___" |
| `BYSTANDER_PSYCHOLOGY_DEEP` | 12911 | 5.1 | 10 | 75 | 3 | 0 | 0/32 | authored, unwired | Latane and Darley (1968) - after Kitty Genovese case / When witnesses are present, individuals are less likely to intervene. The more witnesses, the less likely any  |
| `TRAUMA_INFORMED_UPSTANDER` | 13004 | 3.3 | 6 | 74 | 3 | 0 | 0/2 | authored, unwired | Establish physical safety before intervention / Build emotional safety for self |
| `SCAFFOLDED_UPSTANDER_PRACTICE` | 13139 | 6.6 | 7 | 109 | 3 | 1 | 0/20 | authored, unwired | Watch a video clip of bullying. Identify 3 things happening. / Replay a moment from your own week. What did you see? |
| `GROUP_DISCUSSION_GUIDES` | 13289 | 5.1 | 8 | 71 | 4 | 0 | 0/9 | authored, unwired | When have you been a bystander? / Share a time you were a bystander |
| `DETAILED_SCENARIO_LIBRARY` | 13396 | 9.3 | 10 | 92 | 14 | 0 | 0/40 | authored, unwired | The substitute teacher who used a slur / Substitute teacher walked into 5th period English. Within 10 minutes, she said something racist to a Black stu |
| `UPSTANDER_CULTURE_INDICATORS` | 13613 | 4.8 | 8 | 103 | 3 | 0 | 0/0 | authored, unwired | Identity-first / person-first respected / Diverse names pronounced correctly |
| `COMMON_BARRIERS_TO_INTERVENTION` | 13791 | 3.2 | 8 | 54 | 4 | 0 | 0/13 | authored, unwired | Realistic risk. Bullies often target those who challenge them. / Build coalition before intervening |
| `EXTENDED_BYSTANDER_SCENARIOS_PART2` | 13890 | 10.4 | 10 | 168 | 5 | 0 | 0/40 | authored, unwired | Older players on your sports team are doing humiliating things to new freshmen as "initiation." You are a juni / Conflicted. You went through it. Want to belong with older players. |
| `BULLYING_LAW_PRIMER` | 14245 | 4.3 | 10 | 53 | 6 | 6 | 1/25 | authored, unwired | Title VI of the Civil Rights Act / Discrimination based on race, color, or national origin. |
| `INTERVENTION_LETTER_TEMPLATES` | 14348 | 5.4 | 7 | 75 | 5 | 0 | 0/27 | authored, unwired | Letter to principal reporting bullying / I am writing to formally report bullying of my child, [Student Name], grade [grade], at [school name]. |
| `REAL_WORLD_DIALOGUE_LIBRARY` | 14519 | 8.4 | 8 | 104 | 4 | 0 | 0/33 | authored, unwired | Calling a teacher about your child being bullied / Hi Mr. Martinez. Do you have 10 minutes? I want to talk about something that has been happening with my son. |
| `DEEP_DIVE_TOPICS` | 14655 | 2.9 | 5 | 49 | 4 | 0 | 0/11 | authored, unwired | The bystander effect (Latane and Darley, 1968) showed that the presence of other witnesses reduces individual  / Personal accountability training |
| `FAMILY_INVOLVEMENT_GUIDES` | 14743 | 3.1 | 4 | 61 | 5 | 2 | 0/12 | authored, unwired | Work with school but escalate as needed. / Get mental health support if needed. |
| `EDUCATOR_TOOLKIT` | 14844 | 2.9 | 5 | 60 | 3 | 0 | 0/1 | authored, unwired | Respond in the moment when possible / Refer for further intervention |
| `BULLYING_TYPES_DETAILED` | 14963 | 7.0 | 10 | 179 | 3 | 0 | 0/18 | authored, unwired | Use of physical actions to cause harm or intimidation. / Students perceived as different |
| `INTERVENTION_DECISION_TREES` | 15066 | 3.0 | 5 | 67 | 4 | 0 | 0/4 | authored, unwired | Is the target physically safe? / Are you physically safe to intervene? |
| `BULLYING_PREVENTION_FRAMEWORKS` | 15119 | 4.6 | 8 | 76 | 4 | 0 | 0/25 | authored, unwired | Olweus Bullying Prevention Program / Classroom rules against bullying |
| `UPSTANDER_HISTORY_TIMELINE` | 15249 | 4.6 | 10 | 49 | 9 | 0 | 0/37 | authored, unwired | Daisy Bates and the Little Rock Nine / Daisy Bates, Elizabeth Eckford, 8 other Black students integrating Little Rock Central High |
| `UPSTANDER_LESSON_PLANS` | 15342 | 8.6 | 10 | 109 | 5 | 9 | 0/40 | authored, unwired | Lesson 1: What does it mean to be an upstander? / Distinguish between bystander and upstander |
| `UPSTANDER_JOURNAL_PROMPTS` | 15496 | 2.2 | 20 | 20 | 11 | 0 | 0/20 | authored, unwired | Describe the last time you witnessed harm. What did you do? What do you wish you had done? / What stops you from speaking up? Be specific. |
| `EXTENDED_CASE_STUDIES` | 15519 | 6.1 | 5 | 105 | 5 | 6 | 0/40 | authored, unwired | The High School That Transformed Its Culture / A suburban high school with persistent bullying problems implemented a multi-year restorative practices progra |
| `BULLYING_RESEARCH_OVERVIEW` | 15682 | 4.8 | 10 | 60 | 5 | 0 | 0/31 | authored, unwired | Bystander intervention reduces bullying / Multiple studies show that when bystanders intervene, bullying duration decreases by 70% within 10 seconds. |
| `DAILY_UPSTANDER_PRACTICES` | 15795 | 2.1 | 20 | 20 | 7 | 0 | 0/9 | authored, unwired | Notice one moment of exclusion today and address it / Smile at one person who seems alone |
| `UPSTANDER_AFFIRMATIONS` | 15818 | 2.2 | 30 | 30 | 9 | 0 | 0/16 | authored, unwired | My silence is not safety. My voice is. / Small acts of kindness build big movements. |
| `DETAILED_ROLE_PLAY_LIBRARY` | 15851 | 9.9 | 5 | 127 | 5 | 0 | 0/40 | authored, unwired | Confronting a friend in private / Your friend made fun of a classmate at lunch today. You want to address it privately. |
| `REPORTING_PROCEDURES_DETAILED` | 16062 | 2.3 | 6 | 38 | 5 | 0 | 1/11 | authored, unwired | Single incident with low-level harm / Even informal reports create record. |
| `UPSTANDER_NARRATIVES` | 16125 | 10.7 | 10 | 102 | 15 | 0 | 0/40 | authored, unwired | The day I lost a friend by speaking up / I was 15. My best friend Jess was mocking a girl named Maria in our class. Mocking her clothes. Her accent. He |
| `UPSTANDER_MENTOR_QUOTES` | 16362 | 8.2 | 40 | 139 | 6 | 0 | 0/40 | authored, unwired | We need in every community a group of angelic troublemakers. / When you wonder if making good trouble is worth it. |
| `IDENTITY_HARASSMENT_DEEP` | 16405 | 7.7 | 8 | 144 | 4 | 0 | 0/27 | authored, unwired | Mocking cultural foods, clothing, hair / Microaggressions ("where are you really from") |
| `COALITION_BUILDING_DEEP` | 16635 | 2.9 | 7 | 72 | 3 | 0 | 0/5 | authored, unwired | Identify the issue you want to address / Approach 1-2 people who share your concern |
| `BYSTANDER_SCENARIOS_EXTENDED` | 16735 | 12.6 | 10 | 172 | 7 | 1 | 0/40 | authored, unwired | You are walking to class. You hear a peer say a racist slur to another student. The target keeps walking. The  / Stomach drops. Heart races. Want to disappear. |
| `COURAGE_DEEP_DIVE` | 17020 | 7.6 | 15 | 132 | 5 | 1 | 0/40 | authored, unwired | Acknowledgment is the foundation of belonging. A smile says: I see you. / Notice when you pass someone alone |
| `REPAIR_PROTOCOL_LIBRARY` | 17236 | 3.5 | 5 | 65 | 6 | 0 | 0/29 | authored, unwired | You hurt a friend's feelings with a thoughtless joke / 1. Acknowledge the harm internally. Do not minimize. |

## digitalwellbeing (81 declarations, 498 KB removed)

Verdicts: 81 authored, unwired. Still referenced anywhere live: none.

| declaration | line | KB | items | prose strings | median words | fragment % | live overlap | verdict | sample |
|---|---|---|---|---|---|---|---|---|---|
| `DEEP_NARRATIVES_VOLUME_49` | 760 | 10.8 | 15 | 174 | 5 | 6 | 0/40 | authored, unwired | My online accountability buddy for daily writing / Found accountability buddy in writing forum. |
| `DEEP_NARRATIVES_VOLUME_45` | 1141 | 12.4 | 15 | 193 | 5 | 4 | 0/40 | authored, unwired | My fathers Alzheimers and FaceTime as memory anchor / Dad started losing names at 72. |
| `DEEP_NARRATIVES_VOLUME_46` | 1560 | 11.6 | 15 | 191 | 5 | 6 | 0/40 | authored, unwired | My professor flagged AI-written essay correctly / Conference about academic integrity. |
| `DEEP_NARRATIVES_VOLUME_47` | 1977 | 11.3 | 15 | 183 | 5 | 8 | 0/40 | authored, unwired | My online hiking community saved retirement / Joined online hiking community. |
| `DEEP_NARRATIVES_VOLUME_48` | 2380 | 11.2 | 15 | 175 | 5 | 7 | 0/40 | authored, unwired | My online introvert support group / Always thought my introversion was problem. |
| `DEEP_NARRATIVES_VOLUME_43` | 2763 | 12.6 | 15 | 194 | 6 | 5 | 0/40 | authored, unwired | My first smartphone at 35, switching from flip / Got my first smartphone at 35. |
| `DEEP_NARRATIVES_VOLUME_44` | 3186 | 12.3 | 15 | 194 | 5 | 8 | 0/40 | authored, unwired | My partners AI girlfriend chatbot revelation / Found chat history on my partners phone. |
| `DEEP_NARRATIVES_VOLUME_42` | 3611 | 5.7 | 15 | 98 | 4 | 14 | 0/22 | authored, unwired | My online community of fellow widows in middle age / Online community of widows my age. |
| `DEEP_NARRATIVES_VOLUME_41` | 3840 | 5.6 | 15 | 93 | 4 | 15 | 0/17 | authored, unwired | When AI helped me write to my therapist / I had been blocked on hard topic. |
| `DEEP_NARRATIVES_VOLUME_40` | 4073 | 5.8 | 15 | 96 | 5 | 15 | 0/27 | authored, unwired | I used to keep phone in hand all day. / I pick up less. Notice it less. |
| `DEEP_NARRATIVES_VOLUME_39` | 4302 | 5.7 | 15 | 90 | 5 | 17 | 0/27 | authored, unwired | When my online friend visited me / Online friend visited from across world. |
| `DEEP_NARRATIVES_VOLUME_38` | 4521 | 5.2 | 15 | 88 | 4 | 17 | 0/9 | authored, unwired | When AI helped me with anniversary / I tell people: AI for brainstorming. |
| `DEEP_NARRATIVES_VOLUME_37` | 4742 | 5.6 | 15 | 89 | 5 | 17 | 0/25 | authored, unwired | When phone caught my niece's first words / Phone was there for first words. |
| `DEEP_NARRATIVES_VOLUME_36` | 4963 | 5.4 | 15 | 88 | 4 | 17 | 0/20 | authored, unwired | When my child asked why I checked phone so much / Child asked: "Mommy why you always look phone?" |
| `DEEP_NARRATIVES_VOLUME_35` | 5180 | 5.9 | 15 | 99 | 5 | 14 | 0/25 | authored, unwired | When I first realized my phone was problem / I had been on phone all day every day. |
| `DEEP_NARRATIVES_VOLUME_34` | 5415 | 3.9 | 15 | 89 | 5 | 17 | 0/14 | authored, unwired | Studied without phone for week. / I tell students: phone-free study works. |
| `DEEP_NARRATIVES_VOLUME_33` | 5433 | 6.0 | 15 | 102 | 5 | 15 | 0/22 | authored, unwired | When AI helped me write to my dying friend / I had been frozen on what to write. |
| `DEEP_NARRATIVES_VOLUME_32` | 5676 | 5.8 | 15 | 98 | 5 | 16 | 0/20 | authored, unwired | When I helped my friend break phone addiction / Friend admitted phone addiction. |
| `DEEP_NARRATIVES_VOLUME_31` | 5911 | 6.3 | 15 | 111 | 5 | 13 | 0/14 | authored, unwired | No phones first hour after waking. / No phones last hour before sleep. |
| `DEEP_NARRATIVES_VOLUME_30` | 6168 | 6.2 | 15 | 105 | 4 | 13 | 0/22 | authored, unwired | When my child went phone-free for summer / Kid 14. We took phone for summer. |
| `DEEP_NARRATIVES_VOLUME_29` | 6411 | 6.1 | 15 | 102 | 5 | 13 | 0/21 | authored, unwired | When AI helped me with my marriage / I had been struggling in marriage. |
| `DEEP_NARRATIVES_VOLUME_28` | 6656 | 6.2 | 15 | 103 | 5 | 16 | 0/19 | authored, unwired | When my partner gave me a deadline / Partner: "Phone away by 9 pm or I am sleeping in spare room." |
| `DEEP_NARRATIVES_VOLUME_27` | 6899 | 6.1 | 15 | 103 | 5 | 13 | 0/24 | authored, unwired | When my old phone broke and I got new / New phone. Could have installed everything. |
| `DEEP_NARRATIVES_VOLUME_26` | 7140 | 6.0 | 15 | 100 | 5 | 15 | 0/27 | authored, unwired | Long flight. Airplane mode all flight. / I tell people: airplane mode on plane is restorative. |
| `DEEP_NARRATIVES_VOLUME_25` | 7377 | 6.3 | 15 | 102 | 5 | 16 | 0/24 | authored, unwired | Built habit: one hour daily writing. Phone in drawer. / I have written first book in this hour over a year. |
| `DEEP_NARRATIVES_VOLUME_24` | 7624 | 6.5 | 15 | 107 | 5 | 14 | 0/28 | authored, unwired | When I deleted my dating app for the third time / I had deleted and reinstalled dating app multiple times. |
| `DEEP_NARRATIVES_VOLUME_23` | 7875 | 6.7 | 15 | 115 | 5 | 10 | 0/21 | authored, unwired | One year ago I committed to digital wellbeing practice. / I started small. Phone away at meals. |
| `DEEP_NARRATIVES_VOLUME_22` | 8142 | 6.5 | 15 | 106 | 5 | 16 | 0/26 | authored, unwired | My online support for fertility loss / No one in my offline life had been through. |
| `DEEP_NARRATIVES_VOLUME_21` | 8393 | 6.2 | 15 | 101 | 5 | 17 | 0/15 | authored, unwired | Built habit: no phone Sunday morning until noon. / Slept in. Cooked breakfast. Read. |
| `DEEP_NARRATIVES_VOLUME_20` | 8636 | 6.6 | 15 | 112 | 5 | 13 | 0/25 | authored, unwired | My phone-free wedding anniversary / Wife and I took phones away for anniversary dinner. |
| `DEEP_NARRATIVES_VOLUME_19` | 8897 | 6.8 | 15 | 114 | 5 | 14 | 0/21 | authored, unwired | My online community of teachers / I am still teaching because of them. |
| `DEEP_NARRATIVES_VOLUME_18` | 9162 | 7.1 | 15 | 115 | 5 | 10 | 0/32 | authored, unwired | Friend told me: "I am doing phone fast. 24 hours." / I was skeptical. 24 hours? Why? |
| `DEEP_NARRATIVES_VOLUME_17` | 9437 | 8.7 | 15 | 133 | 7 | 8 | 0/40 | authored, unwired | Story of building a different relationship with my phone / I had been a phone person for a decade. Constantly checking. |
| `DEEP_NARRATIVES_VOLUME_16` | 9738 | 6.6 | 15 | 108 | 6 | 12 | 0/29 | authored, unwired | Every night at 9 pm, all screens off. / I read. I journal. I prepare for sleep. |
| `DEEP_NARRATIVES_VOLUME_15` | 9997 | 6.6 | 15 | 111 | 5 | 13 | 0/21 | authored, unwired | I built habit: no phone for first hour after waking. / I plan my day. Drink coffee. Stretch. |
| `DEEP_NARRATIVES_VOLUME_14` | 10260 | 4.6 | 15 | 102 | 5 | 14 | 0/14 | authored, unwired | I had been silent online for years. / Then I started writing essays. |
| `DEEP_NARRATIVES_VOLUME_13` | 10278 | 6.8 | 15 | 108 | 6 | 10 | 0/28 | authored, unwired | When AI couldnt understand context / I asked AI complex question about my situation. |
| `DEEP_NARRATIVES_VOLUME_12` | 10531 | 6.8 | 15 | 109 | 6 | 10 | 0/30 | authored, unwired | The notification I muted that helped / I muted work Slack notifications evenings. |
| `DEEP_NARRATIVES_VOLUME_11` | 10786 | 6.3 | 15 | 109 | 5 | 15 | 0/21 | authored, unwired | I have been doing this practice for years. / I tell people: practice is not perfection. |
| `DEEP_NARRATIVES_VOLUME_10` | 11037 | 6.5 | 15 | 105 | 6 | 12 | 0/33 | authored, unwired | The text I waited a week to respond to / Someone texted me with conflict. |
| `DEEP_NARRATIVES_VOLUME_9` | 11284 | 6.7 | 15 | 106 | 6 | 13 | 0/28 | authored, unwired | When I built my own digital home / I have a personal website. My own domain. |
| `DEEP_NARRATIVES_VOLUME_8` | 11533 | 7.1 | 15 | 111 | 6 | 14 | 0/34 | authored, unwired | I had been dating online for years. / We have been together 6 years. Married. |
| `DEEP_NARRATIVES_VOLUME_7` | 11792 | 6.9 | 15 | 116 | 5 | 13 | 0/26 | authored, unwired | I was suicidal at 16. I called 988. / I survived. I went to therapy. |
| `DEEP_NARRATIVES_VOLUME_6` | 12057 | 7.0 | 15 | 114 | 6 | 11 | 0/35 | authored, unwired | I had been using phone to numb. / Anxiety: scroll. Sadness: scroll. Boredom: scroll. Anger: scroll. |
| `DEEP_NARRATIVES_VOLUME_5` | 12318 | 7.0 | 15 | 112 | 6 | 8 | 0/36 | authored, unwired | I had been on phone 8 hours daily. / I tried a diet: 2 hour limit per day. Track honestly. |
| `DEEP_NARRATIVES_VOLUME_4` | 12575 | 6.5 | 15 | 107 | 5 | 12 | 0/26 | authored, unwired | The hour I left my phone in the car / I went hiking. Forgot to bring phone. |
| `DEEP_NARRATIVES_VOLUME_3` | 12822 | 7.9 | 15 | 115 | 7 | 9 | 0/40 | authored, unwired | I gave up my smartphone for a year. Kept a flip phone. / I could call. Text. Nothing else. |
| `DEEP_NARRATIVES_VOLUME_2` | 13085 | 8.7 | 15 | 128 | 7 | 3 | 0/40 | authored, unwired | The friend group that fell apart over a text / My friend group of 5 had been close for years. |
| `DEEP_NARRATIVES_VOLUME_1` | 13376 | 9.9 | 15 | 145 | 8 | 6 | 0/40 | authored, unwired | How I quit Instagram after 8 years / I had been on Instagram since I was 12. |
| `ADDITIONAL_NARRATIVES_5` | 13701 | 4.7 | 15 | 84 | 8 | 29 | 0/40 | authored, unwired | Story 1: The morning routine that changed everything / I was 17. My morning had been: alarm, phone, scroll for an hour, finally get up. |
| `CYBERBULLYING_DEEP_SCENARIOS` | 13719 | 3.3 | 8 | 72 | 3 | 3 | 0/8 | authored, unwired | Someone created a fake account about me / Screenshot everything as evidence |
| `SOCIAL_MEDIA_RESEARCH` | 13845 | 3.9 | 15 | 60 | 4 | 0 | 0/16 | authored, unwired | Heavy use linked to depression / Multiple longitudinal studies show 3+ hours daily increases depression risk, especially in teen girls |
| `EXTENDED_NARRATIVES_PART4` | 13953 | 5.4 | 10 | 72 | 9 | 3 | 0/40 | authored, unwired | I was 15. I had been being cyberbullied for 6 months. / I had not told anyone. I was ashamed. |
| `EDUCATOR_GUIDES_DIGITAL` | 14130 | 3.6 | 8 | 73 | 4 | 0 | 0/4 | authored, unwired | Build digital literacy into curriculum. / Digital literacy across subjects |
| `PARENT_GUIDES_DIGITAL` | 14260 | 4.9 | 8 | 102 | 4 | 0 | 0/5 | authored, unwired | Parents of pre-teens (ages 9-12) / Delay smartphone as long as possible |
| `ALGORITHM_DECONSTRUCTION` | 14435 | 5.0 | 8 | 92 | 3 | 7 | 0/9 | authored, unwired | Tracks: watch time, replays, shares, comments, likes / Builds your profile in seconds |
| `EXTENDED_NARRATIVES_PART3` | 14622 | 5.3 | 10 | 69 | 8 | 3 | 0/40 | authored, unwired | I was 14. My streaks numbered in the hundreds. / Every morning my first thought was Snapchat. Maintain streaks. |
| `COMPREHENSIVE_LESSON_BANK` | 14793 | 8.1 | 10 | 122 | 4 | 1 | 0/18 | authored, unwired | Understanding your relationship with phone / How do you feel right now thinking about your phone? |
| `DAILY_DIGITAL_PROMPTS_EXTENDED_2` | 14998 | 5.9 | 90 | 79 | 4 | 0 | 0/2 | authored, unwired | Notice your phone use pattern this week. / Identify one small adjustment. |
| `DAILY_DIGITAL_PROMPTS_EXTENDED` | 15091 | 6.2 | 90 | 88 | 4 | 0 | 0/6 | authored, unwired | Compare your phone use this month to last. / Identify your top 3 healthy practices. |
| `DIGITAL_GLOSSARY_DEEP` | 15184 | 4.7 | 50 | 66 | 5 | 0 | 0/24 | authored, unwired | Set of rules that determines what content you see / Computer systems that mimic human thinking |
| `WEEKLY_CURRICULUM_DIGITAL` | 15237 | 5.8 | 8 | 72 | 5 | 0 | 0/12 | authored, unwired | Check screen time. Note total. / Identify your biggest time sink app. |
| `COMPREHENSIVE_AI_SCENARIOS` | 15411 | 3.5 | 8 | 83 | 3 | 0 | 0/0 | authored, unwired | Using AI for emotional support / Practice difficult conversations |
| `TECH_MANIPULATION_LITERACY` | 15480 | 3.1 | 10 | 60 | 3 | 0 | 0/5 | authored, unwired | Variable reward (slot machine) / Apps deliver rewards unpredictably to keep you scrolling |
| `DIGITAL_NARRATIVES_PART2` | 15563 | 5.1 | 10 | 64 | 9 | 3 | 0/40 | authored, unwired | I was 15. My screen time was 9 hours a day. / I told myself it was research, learning, fun. |
| `DIGITAL_MENTOR_QUOTES` | 15726 | 5.2 | 30 | 109 | 4 | 0 | 0/12 | authored, unwired | Your time is precious. Tech is designed to capture it. Take it back. / Notice when tech is taking, not giving. |
| `COMPREHENSIVE_SCENARIOS_DIGITAL` | 15759 | 5.2 | 10 | 96 | 5 | 3 | 0/28 | authored, unwired | You sent an angry text and immediately regretted it / Apologize specifically: "I am sorry I sent that. I was activated. Here is what I meant." |
| `EXTENDED_DAILY_PROMPTS_DIGITAL` | 15923 | 4.9 | 60 | 60 | 6 | 0 | 0/30 | authored, unwired | Track screen time today (no judgment). Note total. / Notice when you reach for phone reflexively. Note 5 moments. |
| `DIGITAL_LESSON_PLANS_DEEP` | 15986 | 5.7 | 10 | 80 | 4 | 13 | 0/8 | authored, unwired | Lesson 1: How algorithms shape what you see / Show 5 students same word search across apps - different results |
| `EXTENDED_NARRATIVES_DIGITAL` | 16119 | 3.1 | 5 | 34 | 12 | 0 | 0/29 | authored, unwired | When my best friend group moved online and I lost it / I was 14. My best friend group was 5 people. We had been close since elementary. |
| `DIGITAL_HEALTHY_HABITS_LIBRARY` | 16207 | 2.1 | 20 | 44 | 3 | 0 | 0/0 | authored, unwired | Phone in another room while sleeping / Sleep quality, less compulsive checking |
| `DIGITAL_MENTAL_HEALTH_TIES` | 16253 | 3.2 | 8 | 62 | 3 | 0 | 0/13 | authored, unwired | Multiple studies link heavy social media use with increased depression rates, especially in teen girls. / Anxiety rates higher with heavy use, especially among heavy users of image-based platforms. |
| `DEEPFAKE_AND_AI_HARMS` | 16317 | 2.8 | 5 | 58 | 3 | 0 | 0/8 | authored, unwired | AI-generated nude or sexual images using your face/body / Criminal in some states. Federal laws expanding. Often civil violation. |
| `PARENT_CONVERSATION_GUIDES` | 16410 | 3.7 | 8 | 63 | 5 | 0 | 0/12 | authored, unwired | Asking for more phone privileges / Mom/Dad, can we talk about my phone use? |
| `DIGITAL_DAILY_PRACTICES` | 16541 | 2.3 | 20 | 37 | 4 | 49 | 0/8 | authored, unwired | Morning: phone-free first 30 minutes / Starts day on your terms, not algorithms |
| `ONLINE_RELATIONSHIPS_GUIDE` | 16627 | 2.7 | 5 | 61 | 3 | 0 | 0/1 | authored, unwired | Someone you have only met online / Geographic distance no obstacle |
| `DIGITAL_NARRATIVE_LIBRARY` | 16726 | 7.1 | 10 | 81 | 12 | 0 | 0/40 | authored, unwired | I was 16. I had been on Instagram daily for years. Hours per day. / I noticed I felt worse every time I closed the app. I compared myself constantly. I posted to fish for validat |
| `CYBERBULLYING_RECOVERY_DEEP` | 16921 | 2.1 | 4 | 47 | 3 | 4 | 0/3 | authored, unwired | Stop the harm: block, mute, deactivate if needed / Save evidence: screenshots before deletion |
| `SOCIAL_MEDIA_SCENARIOS_DEEP` | 17074 | 7.0 | 10 | 113 | 4 | 3 | 0/34 | authored, unwired | It is 1 AM. You meant to check your phone for 5 minutes before bed. You have been on it for 90 minutes. / Infinite scroll is designed to be hard to stop. Each swipe is variable reward. Your brain releases dopamine. Y |
| `ALGORITHM_LITERACY_DEEP` | 17233 | 4.8 | 8 | 96 | 3 | 0 | 0/11 | authored, unwired | Algorithms decide what you see based on your behavior. They are designed to maximize engagement, which often m / You are seeing what the algorithm thinks will keep you scrolling |
| `AI_CHATBOT_AWARENESS` | 17377 | 4.4 | 8 | 87 | 4 | 0 | 0/13 | authored, unwired | Why AI chatbots feel comforting / They are designed to be agreeable, validating, always available. No friction. |

## anxietytoolkit (77 declarations, 520 KB removed)

Verdicts: 77 generated filler. Still referenced anywhere live: none.

| declaration | line | KB | items | prose strings | median words | fragment % | live overlap | verdict | sample |
|---|---|---|---|---|---|---|---|---|---|
| `ANXIETY_DEEP_NARRATIVES_76` | 95 | 8.2 | 15 | 129 | 5 | 9 | 0/33 | generated filler | My final anxiety lesson: recovery is real / I lived with anxiety from age 7. |
| `ANXIETY_FINAL_PRINCIPLES` | 400 | 3.8 | 20 | 40 | 9 | 23 | 0/40 | generated filler | Anxiety is a body and brain pattern, not a character flaw. / Treat it as condition to manage, not personal failing. |
| `ANXIETY_DEEP_NARRATIVES_71` | 503 | 6.2 | 15 | 102 | 4 | 15 | 0/21 | generated filler | My anxiety yielded to morning meditation / I tell consistency-curious: years transform. |
| `ANXIETY_DEEP_NARRATIVES_72` | 740 | 6.2 | 15 | 99 | 4 | 15 | 0/22 | generated filler | My anxiety yielded to gardening journal / I tell gardeners: journal practice. |
| `ANXIETY_DEEP_NARRATIVES_73` | 977 | 6.2 | 15 | 97 | 4 | 15 | 0/26 | generated filler | My anxiety yielded to morning sun / I tell sleep-anxious: morning sun. |
| `ANXIETY_DEEP_NARRATIVES_74` | 1212 | 6.2 | 15 | 101 | 4 | 15 | 0/30 | generated filler | My anxiety yielded to running club / Anxiety dropped substantially. |
| `ANXIETY_DEEP_NARRATIVES_75` | 1447 | 7.9 | 15 | 128 | 4 | 12 | 0/31 | generated filler | My anxiety yielded final lesson / Spent decades fighting anxiety. |
| `ANXIETY_DEEP_NARRATIVES_68` | 1740 | 6.4 | 15 | 100 | 4 | 15 | 0/29 | generated filler | My anxiety yielded to morning meditation cushion / Morning meditation cushion daily. |
| `ANXIETY_DEEP_NARRATIVES_69` | 1981 | 5.8 | 15 | 91 | 4 | 16 | 0/21 | generated filler | My anxiety yielded to child friend conversation / I tell parent-friend-anxious: communication. |
| `ANXIETY_DEEP_NARRATIVES_70` | 2202 | 5.9 | 15 | 94 | 4 | 16 | 0/25 | generated filler | My anxiety yielded to weekend reading / Saturday morning reading hour. |
| `ANXIETY_DEEP_NARRATIVES_61` | 2425 | 6.1 | 15 | 98 | 4 | 15 | 0/19 | generated filler | My anxiety yielded to monthly book club / I tell readers: monthly book club. |
| `ANXIETY_DEEP_NARRATIVES_62` | 2656 | 5.9 | 15 | 97 | 4 | 15 | 0/21 | generated filler | My anxiety yielded to morning meditation / Morning meditation 20 min daily. |
| `ANXIETY_DEEP_NARRATIVES_63` | 2885 | 5.7 | 15 | 93 | 4 | 16 | 0/19 | generated filler | My anxiety yielded to weekly running / Anxiety dropped substantially. |
| `ANXIETY_DEEP_NARRATIVES_64` | 3106 | 5.9 | 15 | 97 | 4 | 15 | 0/18 | generated filler | My anxiety yielded to morning swim / I tell movement-curious: pre-work swim. |
| `ANXIETY_DEEP_NARRATIVES_65` | 3335 | 6.0 | 15 | 99 | 4 | 15 | 0/21 | generated filler | My anxiety yielded to monthly retreat / I tell stressed: monthly retreat. |
| `ANXIETY_DEEP_NARRATIVES_66` | 3570 | 6.1 | 15 | 101 | 4 | 15 | 0/22 | generated filler | My anxiety yielded to morning prayer / I tell faithful: morning prayer. |
| `ANXIETY_DEEP_NARRATIVES_67` | 3807 | 6.2 | 15 | 102 | 4 | 15 | 0/20 | generated filler | My anxiety yielded to morning silence / I tell talky-mornings: silent first hour. |
| `ANXIETY_DEEP_NARRATIVES_57` | 4044 | 5.8 | 15 | 93 | 4 | 16 | 0/24 | generated filler | My anxiety yielded to walking partner / I tell isolated: walking partner. |
| `ANXIETY_DEEP_NARRATIVES_58` | 4267 | 5.8 | 15 | 93 | 4 | 16 | 0/21 | generated filler | My anxiety yielded to evening yoga / I tell sleep-anxious: evening yoga. |
| `ANXIETY_DEEP_NARRATIVES_59` | 4496 | 5.9 | 15 | 95 | 4 | 16 | 0/21 | generated filler | My anxiety yielded to weekly volunteering / I tell purpose-seeking: weekly service. |
| `ANXIETY_DEEP_NARRATIVES_60` | 4725 | 6.0 | 15 | 98 | 4 | 16 | 0/21 | generated filler | My anxiety yielded to early bedtime / Anxiety dropped substantially. |
| `ANXIETY_DEEP_NARRATIVES_51` | 4958 | 6.5 | 15 | 104 | 4 | 14 | 0/33 | generated filler | My anxiety yielded to morning silence / I tell talky-mornings: silent first hour treatment. |
| `ANXIETY_DEEP_NARRATIVES_52` | 5199 | 6.1 | 15 | 96 | 4 | 16 | 0/25 | generated filler | My anxiety yielded to crochet daily / I tell hands-busy: crochet treatment. |
| `ANXIETY_DEEP_NARRATIVES_53` | 5430 | 6.1 | 15 | 97 | 4 | 15 | 0/26 | generated filler | My anxiety yielded to morning meditation / Daily 20 min morning meditation. |
| `ANXIETY_DEEP_NARRATIVES_54` | 5661 | 5.9 | 15 | 94 | 4 | 17 | 0/21 | generated filler | My anxiety yielded to monthly retreat / I tell stressed: monthly retreat. |
| `ANXIETY_DEEP_NARRATIVES_55` | 5888 | 6.1 | 15 | 98 | 4 | 15 | 0/22 | generated filler | My anxiety yielded to weekly chess / I tell strategy-curious: chess clubs. |
| `ANXIETY_DEEP_NARRATIVES_56` | 6119 | 6.3 | 15 | 101 | 4 | 15 | 0/24 | generated filler | My anxiety yielded to weekly therapy / I tell on-fence: years of therapy. |
| `ANXIETY_DEEP_NARRATIVES_43_HIST` | 6356 | 6.2 | 15 | 94 | 4 | 16 | 0/33 | generated filler | My anxiety yielded to candle making / I tell craft-curious: candle making accessible. |
| `ANXIETY_DEEP_NARRATIVES_44` | 6585 | 6.2 | 15 | 100 | 4 | 15 | 0/31 | generated filler | My anxiety yielded to wood stove fires / Wood stove fires daily winter. |
| `ANXIETY_DEEP_NARRATIVES_45` | 6818 | 6.4 | 15 | 102 | 4 | 15 | 0/29 | generated filler | My anxiety yielded to morning yoga / I tell movement-curious: morning yoga treatment. |
| `ANXIETY_DEEP_NARRATIVES_46` | 7057 | 6.1 | 15 | 97 | 4 | 15 | 0/24 | generated filler | My anxiety yielded to oil pastels / I tell visual-curious: oil pastels accessible. |
| `ANXIETY_DEEP_NARRATIVES_47` | 7288 | 6.1 | 15 | 97 | 4 | 15 | 0/30 | generated filler | My anxiety yielded to weekly chess / I tell strategy-curious: chess clubs welcome. |
| `ANXIETY_DEEP_NARRATIVES_48` | 7517 | 6.1 | 15 | 97 | 4 | 15 | 0/29 | generated filler | My anxiety yielded to monthly retreat / I tell stressed: monthly retreat treatment. |
| `ANXIETY_DEEP_NARRATIVES_49` | 7746 | 6.0 | 15 | 97 | 4 | 15 | 0/22 | generated filler | My anxiety yielded to morning meditation / Morning meditation 20 min daily. |
| `ANXIETY_DEEP_NARRATIVES_50` | 7973 | 6.2 | 15 | 100 | 4 | 16 | 0/24 | generated filler | My anxiety yielded to library volunteering / I tell quiet-volunteer: library treatment. |
| `ANXIETY_DEEP_NARRATIVES_43` | 8212 | 6.4 | 15 | 101 | 4 | 15 | 0/31 | generated filler | My anxiety yielded to crow watching / I tell yard-having: crow watching is treatment. |
| `ANXIETY_DEEP_NARRATIVES_36` | 8451 | 6.4 | 15 | 97 | 4 | 16 | 0/30 | generated filler | My anxiety yielded to lego building / I tell adults: Lego is therapy. |
| `ANXIETY_DEEP_NARRATIVES_37` | 8684 | 6.2 | 15 | 96 | 4 | 16 | 0/33 | generated filler | My anxiety yielded to acoustic guitar / I tell musical-curious: daily guitar treatment. |
| `ANXIETY_DEEP_NARRATIVES_38` | 8911 | 6.5 | 15 | 104 | 4 | 14 | 0/28 | generated filler | My anxiety yielded to morning meditation / Anxiety baseline dropped substantially. |
| `ANXIETY_DEEP_NARRATIVES_39` | 9152 | 6.4 | 15 | 101 | 4 | 15 | 0/31 | generated filler | My anxiety yielded to gardening journal / I tell gardeners: journal practice transforms. |
| `ANXIETY_DEEP_NARRATIVES_40` | 9393 | 6.3 | 15 | 98 | 4 | 15 | 0/32 | generated filler | My anxiety yielded to morning sun / I tell sleep-anxious: morning sun treatment. |
| `ANXIETY_DEEP_NARRATIVES_41` | 9630 | 6.2 | 15 | 101 | 4 | 15 | 0/31 | generated filler | My anxiety yielded to running club / Anxiety dropped substantially. |
| `ANXIETY_DEEP_NARRATIVES_42` | 9865 | 6.3 | 15 | 100 | 4 | 15 | 0/30 | generated filler | My anxiety yielded to garden weekly / I tell gardeners: weekly time treatment. |
| `ANXIETY_DEEP_NARRATIVES_29` | 10100 | 6.5 | 15 | 101 | 4 | 15 | 0/34 | generated filler | My anxiety yielded to camping trips / I tell tech-tethered: solo camping monthly resets. |
| `ANXIETY_DEEP_NARRATIVES_30` | 10339 | 6.4 | 15 | 98 | 4 | 15 | 0/32 | generated filler | My anxiety yielded to dawn yoga / I tell movement-curious: dawn yoga timing specific. |
| `ANXIETY_DEEP_NARRATIVES_31` | 10570 | 6.5 | 15 | 101 | 4 | 15 | 0/33 | generated filler | My anxiety yielded to oil painting / I tell visual-curious: oil painting deep absorption. |
| `ANXIETY_DEEP_NARRATIVES_32` | 10807 | 6.3 | 15 | 101 | 4 | 15 | 0/31 | generated filler | My anxiety yielded to printmaking / I tell craft-curious: printmaking is treatment. |
| `ANXIETY_DEEP_NARRATIVES_33` | 11042 | 6.5 | 15 | 104 | 4 | 14 | 0/31 | generated filler | My anxiety yielded to weekend cooking project / I tell weekend-anxious: cooking project treatment. |
| `ANXIETY_DEEP_NARRATIVES_34` | 11285 | 6.5 | 15 | 102 | 4 | 15 | 0/30 | generated filler | My anxiety yielded to public library / I tell isolated readers: public library is third place. |
| `ANXIETY_DEEP_NARRATIVES_23` | 11526 | 6.9 | 15 | 108 | 4 | 14 | 0/32 | generated filler | My anxiety yielded to weight lifting / Anxiety dropped substantially. |
| `ANXIETY_DEEP_NARRATIVES_24` | 11775 | 6.5 | 15 | 101 | 5 | 16 | 0/33 | generated filler | My anxiety yielded to letter writing / I tell connection-craving: hand letters revive. |
| `ANXIETY_DEEP_NARRATIVES_25` | 12016 | 6.6 | 15 | 104 | 4 | 14 | 0/33 | generated filler | My anxiety yielded to neighborhood council / Anxiety dropped substantially. |
| `ANXIETY_DEEP_NARRATIVES_26` | 12257 | 6.6 | 15 | 106 | 4 | 15 | 0/34 | generated filler | My anxiety yielded to body scan practice / I tell body-disconnected: body scan reconnects. |
| `ANXIETY_DEEP_NARRATIVES_27` | 12504 | 6.4 | 15 | 103 | 4 | 16 | 0/30 | generated filler | My anxiety yielded to crocheting socks / I tell craft-curious: useful crochet treatment. |
| `ANXIETY_DEEP_NARRATIVES_28` | 12743 | 6.8 | 15 | 106 | 4 | 14 | 0/32 | generated filler | My anxiety yielded to mountain biking / Anxiety dropped substantially. |
| `ANXIETY_DEEP_NARRATIVES_17` | 12994 | 7.2 | 15 | 113 | 4 | 11 | 0/33 | generated filler | My anxiety yielded to homemade bread / I tell home-bound anxious: bread baking is somatic plus aromatic therapy. |
| `ANXIETY_DEEP_NARRATIVES_18` | 13257 | 6.8 | 15 | 110 | 4 | 15 | 0/31 | generated filler | My anxiety yielded to live music / Anxiety dropped substantially. |
| `ANXIETY_DEEP_NARRATIVES_19` | 13510 | 6.9 | 15 | 109 | 4 | 17 | 0/31 | generated filler | My anxiety yielded to ice fishing / I tell winter-stuck: ice fishing is solitary meditation. |
| `ANXIETY_DEEP_NARRATIVES_20` | 13765 | 7.0 | 15 | 113 | 4 | 13 | 0/34 | generated filler | My anxiety yielded to model airplane building / Hours building model airplanes. |
| `ANXIETY_DEEP_NARRATIVES_21` | 14024 | 7.0 | 15 | 111 | 4 | 14 | 0/34 | generated filler | My anxiety yielded to phone-free Sundays / I tell tech-tethered: weekly phone fast is treatment. |
| `ANXIETY_DEEP_NARRATIVES_22` | 14281 | 6.7 | 15 | 108 | 4 | 14 | 0/33 | generated filler | My anxiety yielded to dance practice / I tell movement-private: solo dance accessible. |
| `ANXIETY_DEEP_NARRATIVES_11` | 14532 | 7.5 | 15 | 117 | 4 | 11 | 0/34 | generated filler | My anxiety yielded to morning sunlight / Read about morning sunlight and circadian rhythm. |
| `ANXIETY_DEEP_NARRATIVES_12` | 14801 | 7.5 | 15 | 118 | 5 | 13 | 0/35 | generated filler | My anxiety yielded to pottery class / I tell anxiety sufferers: pottery is somatic and meaningful. |
| `ANXIETY_DEEP_NARRATIVES_13` | 15072 | 7.3 | 15 | 115 | 4 | 11 | 0/32 | generated filler | My anxiety yielded to fish tank / I tell anxiety sufferers: aquarium has research base. |
| `ANXIETY_DEEP_NARRATIVES_14` | 15337 | 7.3 | 15 | 114 | 4 | 12 | 0/32 | generated filler | My anxiety yielded to bookstore visits / Weekly indie bookstore visits. |
| `ANXIETY_DEEP_NARRATIVES_15` | 15598 | 7.2 | 15 | 110 | 4 | 14 | 0/32 | generated filler | My anxiety yielded to monastery retreat / Walking, sitting, eating in silence. |
| `ANXIETY_DEEP_NARRATIVES_16` | 15857 | 7.2 | 15 | 114 | 4 | 14 | 0/33 | generated filler | My anxiety yielded to ham radio operator / Connect with strangers globally. |
| `ANXIETY_DEEP_NARRATIVES_5` | 16120 | 8.7 | 15 | 140 | 4 | 10 | 0/36 | generated filler | My anxiety with food I overcame / ARFID style anxiety around new foods. |
| `ANXIETY_DEEP_NARRATIVES_6` | 16435 | 8.6 | 15 | 142 | 4 | 10 | 0/34 | generated filler | Therapy plus divorce support group. / I tell divorcees: combined therapy plus group works. |
| `ANXIETY_DEEP_NARRATIVES_7` | 16752 | 8.2 | 15 | 130 | 4 | 13 | 0/34 | generated filler | My anxiety lessened with martial arts / Started Brazilian jiu jitsu at 40. |
| `ANXIETY_DEEP_NARRATIVES_8` | 17051 | 8.0 | 15 | 128 | 4 | 11 | 0/36 | generated filler | My anxiety yielded to morning routine / Chaotic mornings worsened anxiety. |
| `ANXIETY_DEEP_NARRATIVES_9` | 17344 | 7.8 | 15 | 126 | 4 | 12 | 0/34 | generated filler | My anxiety yielded to community / I tell isolated anxious: multiple weekly communities essential. |
| `ANXIETY_DEEP_NARRATIVES_10` | 17629 | 8.0 | 15 | 125 | 4 | 13 | 0/36 | generated filler | My anxiety with crowds I addressed / Concerts, sports, festivals all off limits. |
| `ANXIETY_DEEP_NARRATIVES_3` | 17916 | 10.1 | 15 | 159 | 4 | 11 | 0/40 | generated filler | My GAD diagnosis at 28 named the lifetime pattern / Therapist said: generalized anxiety disorder. |
| `ANXIETY_DEEP_NARRATIVES_4` | 18275 | 9.4 | 15 | 152 | 5 | 9 | 0/37 | generated filler | My PTSD masquerading as anxiety / Diagnosed with anxiety for years. |
| `ANXIETY_DEEP_NARRATIVES_1` | 18614 | 11.4 | 15 | 184 | 5 | 8 | 0/40 | generated filler | My first panic attack at Walmart at 35 / Learned my body was overreacting to nothing. |
| `ANXIETY_DEEP_NARRATIVES_2` | 19019 | 10.6 | 15 | 174 | 4 | 9 | 0/40 | generated filler | My agoraphobia recovery journey / Therapist did home visits first. |

## griefloss (84 declarations, 515 KB removed)

Verdicts: 84 generated filler. Still referenced anywhere live: none.

| declaration | line | KB | items | prose strings | median words | fragment % | live overlap | verdict | sample |
|---|---|---|---|---|---|---|---|---|---|
| `GRIEF_NARRATIVES_83` | 150 | 3.8 | 11 | 64 | 4 | 22 | 0/12 | generated filler | I tell long-grievers: sustained. / Long-term grief sustains the bond with deceased through ongoing practice. |
| `GRIEF_NARRATIVES_82` | 307 | 3.5 | 10 | 56 | 4 | 20 | 0/11 | generated filler | Long-term grief measures deepest love through suffering depth. / My grief is my continuing relationship |
| `GRIEF_NARRATIVES_81` | 450 | 5.3 | 15 | 85 | 4 | 25 | 0/15 | generated filler | My grief is a daily practice now / Long-term grief becomes daily practice; morning, day, evening tools. |
| `GRIEF_NARRATIVES_77` | 665 | 6.0 | 15 | 91 | 4 | 18 | 0/21 | generated filler | My grief led me to write a book / I tell long-grievers: writing helps. |
| `GRIEF_NARRATIVES_78` | 886 | 5.6 | 15 | 88 | 4 | 20 | 0/19 | generated filler | My grief practice continues forever / I tell long-grievers: practice continues. |
| `GRIEF_NARRATIVES_79` | 1101 | 5.3 | 15 | 89 | 4 | 17 | 0/15 | generated filler | My grief was the doorway to becoming / I tell long-grievers: doorway. |
| `GRIEF_NARRATIVES_80` | 1314 | 5.4 | 15 | 87 | 4 | 18 | 0/16 | generated filler | My grief practice integrated my whole life / I tell long-grievers: whole life. |
| `GRIEF_NARRATIVES_76` | 1527 | 5.6 | 15 | 77 | 4 | 19 | 0/24 | generated filler | My grandfather died and his birthday family fishing / I tell fishing-mourners: annual. |
| `GRIEF_FINAL_PRINCIPLES` | 1738 | 3.8 | 20 | 40 | 9 | 20 | 0/37 | generated filler | Grief is not a problem to solve; it is love with nowhere to go. / Do not rush yourself or others through grief; honor its time. |
| `GRIEF_NARRATIVES_71` | 1841 | 5.5 | 15 | 68 | 4 | 22 | 0/23 | generated filler | My grandfather died and his birthday family workshop / I tell workshop-mourners: annual. |
| `GRIEF_NARRATIVES_72` | 2054 | 5.5 | 15 | 70 | 4 | 21 | 0/22 | generated filler | My friend died and her birthday is poetry / I tell poetry-mourners: annual. |
| `GRIEF_NARRATIVES_73` | 2267 | 5.5 | 15 | 75 | 4 | 20 | 0/25 | generated filler | My grandmother died and her birthday is bake / Annual family baking from deceased grandmothers recipes continue family kitchen tradition. |
| `GRIEF_NARRATIVES_74` | 2478 | 5.6 | 15 | 77 | 4 | 19 | 0/23 | generated filler | My grandfather died and his birthday family hardware tour / I tell hardware-mourners: annual. |
| `GRIEF_NARRATIVES_75` | 2691 | 5.2 | 15 | 77 | 4 | 27 | 0/16 | generated filler | My final grief lesson: love continues / I tell all grievers: love continues. |
| `GRIEF_NARRATIVES_66` | 2896 | 5.7 | 15 | 82 | 4 | 20 | 0/27 | generated filler | My grandmother died and her birthday is recipe day / I tell recipe-mourners: annual. |
| `GRIEF_NARRATIVES_67` | 3109 | 5.5 | 15 | 75 | 4 | 20 | 0/22 | generated filler | My partner died and his birthday is photo print / I tell photo-mourners: annual. |
| `GRIEF_NARRATIVES_68` | 3318 | 5.6 | 15 | 76 | 4 | 20 | 0/27 | generated filler | My grandfather died and his birthday is family work day / I tell repair-mourners: annual. |
| `GRIEF_NARRATIVES_69` | 3531 | 5.5 | 15 | 73 | 4 | 21 | 0/22 | generated filler | My grandfather died and his birthday workshop class / I tell teaching-mourners: annual. |
| `GRIEF_NARRATIVES_70` | 3744 | 5.6 | 15 | 76 | 4 | 20 | 0/26 | generated filler | My mother died and her birthday recipe sharing online / I tell online-mourners: annual. |
| `GRIEF_NARRATIVES_61` | 3957 | 5.8 | 15 | 84 | 4 | 19 | 0/27 | generated filler | My grandfather died and his birthday family hardware tour / Three hardware stores he loved. |
| `GRIEF_NARRATIVES_62` | 4172 | 5.8 | 15 | 83 | 4 | 18 | 0/24 | generated filler | My friend died and her birthday is poetry reading / I tell poetry-mourners: annual. |
| `GRIEF_NARRATIVES_63` | 4389 | 5.7 | 15 | 78 | 4 | 19 | 0/24 | generated filler | My mother died and her birthday is recipe sharing / I tell recipe-sharers: annual. |
| `GRIEF_NARRATIVES_64` | 4602 | 5.6 | 15 | 78 | 4 | 19 | 0/24 | generated filler | My friend died and her birthday is letter writing / I tell letter-mourners: annual. |
| `GRIEF_NARRATIVES_65` | 4817 | 5.7 | 15 | 80 | 4 | 19 | 0/26 | generated filler | My grandmother died and her birthday tea / Annual tea parties on deceased grandmothers birthdays with her teacups continue hospitality. |
| `GRIEF_NARRATIVES_56` | 5032 | 5.6 | 15 | 83 | 4 | 18 | 0/22 | generated filler | My partner died and his birthday meal cooked / Annual cooking of deceased partners favorite meals continues food tradition. |
| `GRIEF_NARRATIVES_57` | 5245 | 5.6 | 15 | 81 | 4 | 19 | 0/24 | generated filler | My grandfather died and his birthday workshop class / Annual class teaching grandkids. |
| `GRIEF_NARRATIVES_58` | 5456 | 5.7 | 15 | 83 | 4 | 18 | 0/30 | generated filler | My grandmother died and her birthday is bake-off / Annual family bake-offs using deceased grandmothers recipes continue family kitchen. |
| `GRIEF_NARRATIVES_59` | 5671 | 5.7 | 15 | 83 | 4 | 18 | 0/24 | generated filler | My partner died and his birthday is travel / I tell travel-mourners: annual. |
| `GRIEF_NARRATIVES_60` | 5884 | 5.7 | 15 | 83 | 4 | 18 | 0/26 | generated filler | My grandfather died and his birthday is family workshop / I tell workshop-mourners: annual. |
| `GRIEF_NARRATIVES_51` | 6095 | 6.3 | 15 | 94 | 4 | 16 | 0/30 | generated filler | My grandmother died and her annual visit ritual / I tell grave-keepers: annual cycle. |
| `GRIEF_NARRATIVES_52` | 6322 | 5.7 | 15 | 84 | 4 | 18 | 0/26 | generated filler | My partner died and his birthday is meal cook / Annual full meals on deceased partners birthdays from his favorite menus continue family table. |
| `GRIEF_NARRATIVES_53` | 6535 | 5.8 | 15 | 85 | 4 | 18 | 0/25 | generated filler | My grandfather died and his birthday is fishing tournament / I tell tournament-mourners: annual. |
| `GRIEF_NARRATIVES_54` | 6754 | 5.8 | 15 | 86 | 4 | 17 | 0/27 | generated filler | My grandfather died and his birthday is family work day / I tell repair-families: annual. |
| `GRIEF_NARRATIVES_55` | 6971 | 5.8 | 15 | 83 | 4 | 18 | 0/25 | generated filler | My grandmother died and her birthday is recipe day / I tell recipe-mourners: annual. |
| `GRIEF_NARRATIVES_46` | 7188 | 5.8 | 15 | 84 | 4 | 19 | 0/25 | generated filler | My family pet died and we made memorial garden / I tell pet-mourners: garden honors. |
| `GRIEF_NARRATIVES_47` | 7407 | 5.6 | 15 | 83 | 4 | 18 | 0/29 | generated filler | My grandmother died and her embroidery hoops / I tell embroidery-inheritors: continue. |
| `GRIEF_NARRATIVES_48` | 7618 | 5.7 | 15 | 85 | 4 | 18 | 0/25 | generated filler | My mother died and her birthday volunteer / I tell volunteer-mourners: annual. |
| `GRIEF_NARRATIVES_49` | 7835 | 5.6 | 15 | 82 | 4 | 18 | 0/24 | generated filler | My friend died and her birthday is gallery / I tell gallery-mourners: annual. |
| `GRIEF_NARRATIVES_50` | 8048 | 5.8 | 15 | 87 | 4 | 23 | 0/17 | generated filler | My final grief lesson: I survived / I tell new grievers: you will survive. |
| `GRIEF_NARRATIVES_41` | 8277 | 5.9 | 15 | 87 | 4 | 17 | 0/28 | generated filler | My mother died and her hand cream is on my nightstand / I tell scent-mourners: bottle holds. |
| `GRIEF_NARRATIVES_42` | 8500 | 5.9 | 15 | 84 | 4 | 19 | 0/26 | generated filler | My grandmother died and her birthday is baking / Annual family bake days from deceased grandmothers recipes fill house with scent. |
| `GRIEF_NARRATIVES_43` | 8729 | 5.7 | 15 | 83 | 4 | 18 | 0/25 | generated filler | My grandmother died and her birthday cake / Annual birthday cake from deceased grandmothers recipes continues family ritual. |
| `GRIEF_NARRATIVES_44` | 8946 | 5.7 | 15 | 83 | 4 | 18 | 0/25 | generated filler | My partner died and his birthday is restaurant / Annual solo dinners at deceased partners favorite restaurants ordering usual continue place ritual. |
| `GRIEF_NARRATIVES_45` | 9163 | 5.8 | 15 | 84 | 4 | 18 | 0/25 | generated filler | My mother died and her birthday family meal / Annual family meals on deceased mothers birthdays cooking holiday menus continue table. |
| `GRIEF_NARRATIVES_36` | 9382 | 6.0 | 15 | 85 | 4 | 18 | 0/29 | generated filler | My partner died and his birthday is gym day / Annual workouts at deceased partners favorite gyms continue exercise tradition. |
| `GRIEF_NARRATIVES_37` | 9609 | 6.0 | 15 | 93 | 4 | 16 | 0/26 | generated filler | My mother died and her birthday is library day / I tell library-mourners: annual. |
| `GRIEF_NARRATIVES_38` | 9836 | 6.1 | 15 | 96 | 4 | 16 | 0/29 | generated filler | My uncle died and his fishing pole stays in my truck / I tell truck-mourners: tools ready. |
| `GRIEF_NARRATIVES_39` | 10065 | 5.8 | 15 | 84 | 4 | 18 | 0/28 | generated filler | My mother died and her birthday is sewing project / Annual project on her machine. |
| `GRIEF_NARRATIVES_40` | 10282 | 5.9 | 15 | 87 | 4 | 17 | 0/29 | generated filler | My friend died and her birthday is pilgrimage / I tell grave-mourners: annual. |
| `GRIEF_NARRATIVES_31` | 10499 | 6.2 | 15 | 94 | 5 | 16 | 0/31 | generated filler | My family pet died after long life / I tell long-life pets: grief is real. |
| `GRIEF_NARRATIVES_32` | 10734 | 6.5 | 15 | 98 | 5 | 15 | 0/37 | generated filler | My partner died and his birthday celebrate his life / Annual gathering of friends and family. |
| `GRIEF_NARRATIVES_33` | 10969 | 6.3 | 15 | 94 | 4 | 16 | 0/31 | generated filler | My friend died and her favorite blanket is mine / Inherited her favorite blanket. |
| `GRIEF_NARRATIVES_34` | 11202 | 6.3 | 15 | 92 | 4 | 16 | 0/28 | generated filler | My partner died and his backyard tools / I tell tool-inheritors: continue. |
| `GRIEF_NARRATIVES_35` | 11437 | 6.5 | 15 | 99 | 4 | 15 | 0/30 | generated filler | My mother died and her birthday photo book / I tell photo-book mourners: annual. |
| `GRIEF_NARRATIVES_26` | 11676 | 6.2 | 15 | 94 | 4 | 16 | 0/33 | generated filler | My mother died and her birthday is hike day / Annual hikes on deceased mothers birthdays at favorite mountains continue family memorial. |
| `GRIEF_NARRATIVES_27` | 11903 | 6.4 | 15 | 94 | 5 | 16 | 0/33 | generated filler | My partner died and his coffee shop visit annual / I tell coffee-mourners: order his. |
| `GRIEF_NARRATIVES_28` | 12140 | 6.3 | 15 | 94 | 4 | 16 | 0/29 | generated filler | My uncle died and his bowling shoes are mine / I tell shoe-inheritors: annual. |
| `GRIEF_NARRATIVES_29` | 12377 | 6.4 | 15 | 97 | 4 | 15 | 0/30 | generated filler | My friend died and her favorite store still has presence / Touch fabrics she would have liked. |
| `GRIEF_NARRATIVES_30` | 12608 | 6.4 | 15 | 89 | 4 | 17 | 0/30 | generated filler | My mother died and her birthday is community service / I tell community-mourners: service. |
| `GRIEF_NARRATIVES_21` | 12849 | 6.5 | 15 | 101 | 4 | 15 | 0/38 | generated filler | My loss came at the same time as a graduation / Grandfather died week of graduation. |
| `GRIEF_NARRATIVES_22` | 13092 | 6.3 | 15 | 96 | 4 | 16 | 0/31 | generated filler | My grandmother died and her sewing room is preserved / Preserved sewing rooms of deceased grandmothers hold sacred space of unfinished work. |
| `GRIEF_NARRATIVES_23` | 13327 | 6.1 | 15 | 88 | 4 | 17 | 0/29 | generated filler | My friend died and her email signature lives / I tell signature-mourners: adopt. |
| `GRIEF_NARRATIVES_24` | 13560 | 6.6 | 15 | 100 | 4 | 15 | 0/33 | generated filler | My friend died and we made book club in her honor / I tell book-mourners: club honor. |
| `GRIEF_NARRATIVES_25` | 13805 | 6.4 | 15 | 99 | 4 | 15 | 0/31 | generated filler | My partner died and his contact still in my phone / I tell phone-keepers: keep it. |
| `GRIEF_NARRATIVES_16` | 14046 | 6.4 | 15 | 98 | 5 | 15 | 0/40 | generated filler | My father died and his old jokes still make me laugh / I tell humor-inheritors: tell their jokes. |
| `GRIEF_NARRATIVES_17` | 14285 | 6.5 | 15 | 98 | 4 | 16 | 0/39 | generated filler | My father died and his ties hang in my closet / I tell tie-inheritors: wear them. |
| `GRIEF_NARRATIVES_18` | 14522 | 6.5 | 15 | 100 | 4 | 15 | 0/32 | generated filler | My grief shaped how I love my children / I tell grieving parents: love stronger. |
| `GRIEF_NARRATIVES_19` | 14763 | 6.6 | 15 | 97 | 5 | 16 | 0/36 | generated filler | My grandmother died and her teacups are precious / I tell teacup-keepers: use daily. |
| `GRIEF_NARRATIVES_20` | 15012 | 6.6 | 15 | 101 | 4 | 15 | 0/35 | generated filler | My father died and I tell my kids about him / Continuing through grandchildren. |
| `GRIEF_NARRATIVES_11` | 15255 | 7.1 | 15 | 112 | 5 | 15 | 0/39 | generated filler | My loss came with relief I could not name / Caregiver to my mother 8 years. |
| `GRIEF_NARRATIVES_12` | 15520 | 6.9 | 15 | 107 | 5 | 14 | 0/39 | generated filler | My grandfather died and I have his beard / I tell beard-growers: body remembers. |
| `GRIEF_NARRATIVES_13` | 15777 | 6.6 | 15 | 103 | 5 | 14 | 0/40 | generated filler | My friend died and I keep his Spotify playlists / I tell digital grievers: playlists continue. |
| `GRIEF_NARRATIVES_14` | 16022 | 6.5 | 15 | 103 | 5 | 15 | 0/37 | generated filler | My family pet died and my kid did her first funeral / I tell parents: small funerals teach. |
| `GRIEF_NARRATIVES_15` | 16267 | 6.4 | 15 | 98 | 5 | 16 | 0/35 | generated filler | My friend died and we have memorial 10K race / I tell memorial-runners: races continue. |
| `GRIEF_NARRATIVES_4` | 16508 | 8.0 | 15 | 127 | 5 | 10 | 0/40 | generated filler | My friend died and I dream of him / Therapist said: the brain processes through sleep. |
| `GRIEF_NARRATIVES_5` | 16803 | 7.7 | 15 | 128 | 5 | 12 | 0/36 | generated filler | Homicide loss specialist therapy. / Different from natural-causes grief. |
| `GRIEF_NARRATIVES_6` | 17096 | 7.3 | 15 | 117 | 5 | 15 | 0/40 | generated filler | My loss came early and shaped my whole life / I tell early-loss adults: foundational grief shapes adult life. |
| `GRIEF_NARRATIVES_7` | 17371 | 7.8 | 15 | 122 | 5 | 14 | 0/37 | generated filler | My family pet was lost not dead / I tell missing-pet families: ambiguous loss is real. |
| `GRIEF_NARRATIVES_8` | 17666 | 7.0 | 15 | 112 | 5 | 14 | 0/37 | generated filler | My grandmother died and her birthday cake recipe lives / Recipe rituals continue presence. |
| `GRIEF_NARRATIVES_9` | 17931 | 6.8 | 15 | 106 | 5 | 14 | 0/37 | generated filler | My grandmother died and I planted her favorite flowers / Annual bloom is her annual visit. |
| `GRIEF_NARRATIVES_10` | 18188 | 6.9 | 15 | 107 | 5 | 15 | 0/37 | generated filler | I tell new grievers: it integrates. / Grief eventually integrates rather than disappears; softer and present. |
| `GRIEF_NARRATIVES_1` | 18451 | 11.0 | 15 | 181 | 6 | 4 | 0/40 | generated filler | School called me out of math class. / Cancer had been waiting six months. |
| `GRIEF_NARRATIVES_2` | 18846 | 9.3 | 15 | 151 | 5 | 5 | 0/40 | generated filler | My mother died of cancer and I was 8 / Kept waiting for her to come home. |
| `GRIEF_NARRATIVES_3` | 19189 | 9.0 | 15 | 141 | 5 | 13 | 0/40 | generated filler | My grief came in waves not stages / Expected to move through them. |

## stressbucket (89 declarations, 491 KB removed)

Verdicts: 89 generated filler. Still referenced anywhere live: none.

| declaration | line | KB | items | prose strings | median words | fragment % | live overlap | verdict | sample |
|---|---|---|---|---|---|---|---|---|---|
| `STRESS_NARRATIVES_89` | 118 | 3.7 | 10 | 57 | 4 | 23 | 0/17 | generated filler | My bucket and final farewell wisdom / I tell future readers: practice possible. |
| `STRESS_NARRATIVES_87` | 338 | 5.3 | 15 | 87 | 4 | 18 | 0/16 | generated filler | My bucket and final daily practice / I tell beginners: daily complete. |
| `STRESS_NARRATIVES_86` | 555 | 5.2 | 15 | 88 | 4 | 17 | 0/15 | generated filler | My bucket and morning intention final / Morning intention practice sets day theme aligning bucket. |
| `STRESS_NARRATIVES_85` | 768 | 5.4 | 15 | 88 | 4 | 19 | 0/22 | generated filler | My bucket and complete daily practice / I tell beginners: daily complete practice possible. |
| `STRESS_NARRATIVES_83` | 985 | 5.2 | 15 | 88 | 4 | 17 | 0/15 | generated filler | I tell beginners: lifelong learning. / Lifelong bucket learning deepens practice and refines tools. |
| `STRESS_NARRATIVES_84` | 1198 | 5.2 | 15 | 88 | 4 | 19 | 0/16 | generated filler | I tell experienced: final wisdom. / Final wisdom emerges from years of practice integrating suffering. |
| `STRESS_NARRATIVES_80` | 1411 | 5.2 | 15 | 89 | 4 | 17 | 0/15 | generated filler | My bucket and morning gratitude list / I tell mood-stuck: morning three. |
| `STRESS_NARRATIVES_81` | 1624 | 5.2 | 15 | 84 | 4 | 18 | 0/16 | generated filler | My bucket and morning sun outside / I tell sleep-stressed: morning sun. |
| `STRESS_NARRATIVES_82` | 1837 | 5.3 | 15 | 88 | 4 | 17 | 0/18 | generated filler | My bucket and complete principle integration / I tell beginners: integration achievable. |
| `STRESS_NARRATIVES_76` | 2050 | 5.4 | 15 | 90 | 4 | 17 | 0/17 | generated filler | My bucket and morning routine evolved / Morning routine evolved years. |
| `STRESS_NARRATIVES_77` | 2269 | 5.2 | 15 | 89 | 4 | 17 | 0/17 | generated filler | My bucket and pet daily presence / Daily pet presence with unconditional love grounds body. |
| `STRESS_NARRATIVES_78` | 2482 | 5.5 | 15 | 89 | 4 | 17 | 0/19 | generated filler | My bucket and aging body acceptance / Aging body accepted with smaller capacity adjusts practices. |
| `STRESS_NARRATIVES_79` | 2695 | 5.4 | 15 | 89 | 4 | 17 | 0/15 | generated filler | My bucket and community garden weekly / I tell urban: community garden. |
| `STRESS_NARRATIVES_71` | 2908 | 5.2 | 15 | 86 | 4 | 17 | 0/14 | generated filler | Daily music matches or shifts mood with body response. / I tell shy-voice: singing alone. |
| `STRESS_NARRATIVES_72` | 3121 | 5.2 | 15 | 87 | 4 | 17 | 0/15 | generated filler | My bucket and art practice daily / I tell visual-curious: daily art. |
| `STRESS_NARRATIVES_73` | 3334 | 5.2 | 15 | 89 | 4 | 17 | 0/16 | generated filler | My bucket and writing practice daily / I tell writing-curious: daily. |
| `STRESS_NARRATIVES_74` | 3547 | 5.3 | 15 | 89 | 4 | 17 | 0/19 | generated filler | My bucket and meditation cushion daily / I tell consistent-curious: daily cushion. |
| `STRESS_NARRATIVES_75` | 3762 | 5.2 | 15 | 88 | 4 | 22 | 0/16 | generated filler | I tell beginners: integration achievable. / Bucket model lifelong with awareness integrated as daily second nature. |
| `STRESS_FINAL_PRINCIPLES` | 3975 | 3.9 | 20 | 40 | 8 | 33 | 1/40 | generated filler | Bucket has capacity; you cannot exceed it without consequences. / Honor capacity through inflow management and tap usage; respect overflow signs. |
| `STRESS_NARRATIVES_66` | 4078 | 5.5 | 15 | 90 | 4 | 17 | 0/21 | generated filler | My bucket and partner communication / Partner bucket vocabulary shared as common language enables mutual understanding. |
| `STRESS_NARRATIVES_67` | 4291 | 5.4 | 15 | 88 | 5 | 17 | 0/15 | generated filler | My bucket and child bucket teaching / I tell parents: teach children. |
| `STRESS_NARRATIVES_68` | 4504 | 5.3 | 15 | 87 | 4 | 17 | 0/18 | generated filler | My bucket and workplace bucket awareness / Team bucket awareness with manager check-ins adjusts workload. |
| `STRESS_NARRATIVES_69` | 4717 | 5.3 | 15 | 89 | 4 | 17 | 0/18 | generated filler | My bucket and life-long practice integration / I tell beginners: integration possible. |
| `STRESS_NARRATIVES_70` | 4930 | 5.2 | 15 | 89 | 4 | 19 | 0/16 | generated filler | My bucket final principles integrated / I tell beginners: integration possible. |
| `STRESS_NARRATIVES_61` | 5143 | 5.2 | 15 | 88 | 4 | 17 | 0/15 | generated filler | My bucket and morning intention / Single word morning intention sets day theme aligning bucket. |
| `STRESS_NARRATIVES_62` | 5356 | 5.4 | 15 | 90 | 4 | 17 | 0/16 | generated filler | My bucket and morning meditation gift / I tell consistent-curious: gift. |
| `STRESS_NARRATIVES_63` | 5569 | 5.4 | 15 | 86 | 4 | 17 | 0/15 | generated filler | My bucket and morning practice anchored / I tell scattered-mornings: anchor. |
| `STRESS_NARRATIVES_64` | 5782 | 5.3 | 15 | 90 | 4 | 17 | 0/17 | generated filler | My bucket and morning prayer practice / I tell faithful: morning prayer. |
| `STRESS_NARRATIVES_65` | 5995 | 5.5 | 15 | 90 | 4 | 18 | 0/21 | generated filler | My bucket and final integration practice / I tell beginners: integration possible. |
| `STRESS_NARRATIVES_56` | 6208 | 5.4 | 15 | 89 | 4 | 18 | 0/17 | generated filler | My bucket and weekly meal prep / Sunday meal prep reduces daily food decisions; weekly inflow reduced. |
| `STRESS_NARRATIVES_57` | 6423 | 5.3 | 15 | 90 | 4 | 17 | 0/15 | generated filler | My bucket and morning sunshine / I tell sleep-stressed: morning sun. |
| `STRESS_NARRATIVES_58` | 6636 | 5.1 | 15 | 88 | 4 | 17 | 0/15 | generated filler | Monthly ocean visits provide wave sounds and vast perspective. / Weekly lake visits with still water provide reflective surface. |
| `STRESS_NARRATIVES_59` | 6849 | 5.2 | 15 | 87 | 4 | 17 | 0/16 | generated filler | Weekly mountain hiking provides elevation challenge and vista reward. / I tell trail-near: weekly walk. |
| `STRESS_NARRATIVES_60` | 7062 | 5.3 | 15 | 90 | 4 | 17 | 0/17 | generated filler | My bucket and pet companionship / I tell pet-curious: companionship. |
| `STRESS_NARRATIVES_51` | 7275 | 5.5 | 15 | 89 | 4 | 17 | 0/20 | generated filler | My bucket and morning gratitude / Morning three gratitudes shift brain for positive day beginning. |
| `STRESS_NARRATIVES_52` | 7490 | 5.2 | 15 | 88 | 4 | 19 | 0/16 | generated filler | My bucket and self-compassion practice / I tell self-critical: compassion daily. |
| `STRESS_NARRATIVES_53` | 7699 | 5.2 | 15 | 85 | 4 | 18 | 0/18 | generated filler | Daily laugh source through funny videos shifts brain chemistry. / I tell walking-bored: comedy podcasts. |
| `STRESS_NARRATIVES_54` | 7912 | 5.1 | 15 | 87 | 4 | 17 | 0/16 | generated filler | My bucket and creative practice daily / I tell creative-blocked: 20 min daily. |
| `STRESS_NARRATIVES_55` | 8125 | 5.4 | 15 | 89 | 4 | 17 | 0/18 | generated filler | My bucket and gardening practice / I tell soil-curious: gardening. |
| `STRESS_NARRATIVES_46` | 8338 | 5.4 | 15 | 89 | 4 | 17 | 0/16 | generated filler | My bucket and partner support practice / I tell partnered: weekly mutual. |
| `STRESS_NARRATIVES_47` | 8551 | 5.4 | 15 | 89 | 4 | 17 | 0/15 | generated filler | My bucket and digital boundary 9pm / I tell device-tethered: 9pm off. |
| `STRESS_NARRATIVES_48` | 8764 | 5.5 | 15 | 88 | 4 | 17 | 0/17 | generated filler | I tell clutter-stressed: monthly. / Monthly declutter sessions one area at a time reduce maintenance inflow. |
| `STRESS_NARRATIVES_49` | 8977 | 5.4 | 15 | 88 | 4 | 16 | 0/16 | generated filler | I tell scattered-weeks: Sunday plan. / Sunday weekly planning maps week for focused start. |
| `STRESS_NARRATIVES_50` | 9192 | 5.5 | 15 | 87 | 4 | 17 | 0/17 | generated filler | My bucket integrated over years / I tell beginners: integration possible. |
| `STRESS_NARRATIVES_41` | 9403 | 5.3 | 15 | 88 | 4 | 17 | 0/17 | generated filler | I tell stiff-stressed: morning stretch. / Daily 10 min morning stretches open body and begin day gently for bucket capacity. |
| `STRESS_NARRATIVES_42` | 9616 | 5.5 | 15 | 90 | 4 | 17 | 0/19 | generated filler | My bucket and meditation practice years / I tell consistent-curious: years. |
| `STRESS_NARRATIVES_43` | 9831 | 5.3 | 15 | 88 | 4 | 18 | 0/18 | generated filler | My bucket and morning hydration / I tell dehydrated: morning water. |
| `STRESS_NARRATIVES_44` | 10042 | 5.1 | 15 | 86 | 5 | 17 | 0/16 | generated filler | I tell morning-curious: first walk. / First thing morning walks combine sunlight and movement; circadian aligned. |
| `STRESS_NARRATIVES_45` | 10249 | 5.4 | 15 | 90 | 4 | 17 | 0/19 | generated filler | My bucket and morning meditation cushion / I tell consistent: cushion daily. |
| `STRESS_NARRATIVES_36` | 10462 | 5.3 | 15 | 89 | 5 | 17 | 0/15 | generated filler | My bucket and breath as anchor / I tell anchor-seeking: breath. |
| `STRESS_NARRATIVES_37` | 10675 | 6.0 | 15 | 94 | 4 | 16 | 0/18 | generated filler | My bucket and trauma-informed bucket model / I tell trauma-survivors: specialty therapy. |
| `STRESS_NARRATIVES_38` | 10896 | 5.5 | 15 | 87 | 4 | 18 | 0/15 | generated filler | My bucket and ACT therapy approach / Acceptance Commitment Therapy. |
| `STRESS_NARRATIVES_39` | 11109 | 5.2 | 15 | 88 | 4 | 17 | 0/15 | generated filler | My bucket and 30-day challenge / 30-day habit challenges test new practices to decide whether to keep. |
| `STRESS_NARRATIVES_40` | 11320 | 5.6 | 15 | 88 | 4 | 17 | 0/16 | generated filler | My bucket and emergency contacts list / I tell at-risk: emergency list. |
| `STRESS_NARRATIVES_31` | 11541 | 5.4 | 15 | 88 | 4 | 17 | 0/17 | generated filler | I tell over-scheduled: quiet hour. / Daily protected quiet hour without interruptions provides sacred bucket maintenance time. |
| `STRESS_NARRATIVES_32` | 11754 | 5.3 | 15 | 83 | 4 | 22 | 0/15 | generated filler | I tell serious: creative play. / No-purpose creative play activates inner child; bucket drains through play. |
| `STRESS_NARRATIVES_33` | 11967 | 5.6 | 15 | 89 | 4 | 17 | 0/21 | generated filler | My bucket and volunteer service / Weekly volunteer service shifts self-focus through serving others; bucket lighter. |
| `STRESS_NARRATIVES_34` | 12178 | 5.5 | 15 | 89 | 4 | 18 | 0/18 | generated filler | I tell stagnant-stressed: learning. / Weekly new skill learning engages brain through growth tap. |
| `STRESS_NARRATIVES_35` | 12391 | 5.4 | 15 | 85 | 4 | 19 | 0/16 | generated filler | My bucket and weekly date with self / I tell over-giving: self-date. |
| `STRESS_NARRATIVES_26` | 12606 | 5.5 | 15 | 89 | 4 | 18 | 0/17 | generated filler | My bucket and morning sun on porch / I tell circadian-disrupted: morning sun. |
| `STRESS_NARRATIVES_27` | 12821 | 5.5 | 15 | 88 | 4 | 18 | 0/16 | generated filler | I tell sleep-anxious: routine. / Consistent bedtime routine of bath, book, bed enables body prediction of sleep. |
| `STRESS_NARRATIVES_28` | 13034 | 5.9 | 15 | 92 | 4 | 16 | 0/19 | generated filler | My bucket and emotional regulation skills / I tell emotion-stuck: name locate breathe. |
| `STRESS_NARRATIVES_29` | 13259 | 5.5 | 15 | 90 | 4 | 17 | 0/16 | generated filler | My bucket and body scan practice / I tell body-disconnected: scan. |
| `STRESS_NARRATIVES_30` | 13472 | 5.5 | 15 | 89 | 4 | 17 | 0/19 | generated filler | My bucket and morning journaling / I tell journaling-curious: morning pages. |
| `STRESS_NARRATIVES_21` | 13687 | 5.6 | 15 | 89 | 4 | 17 | 0/17 | generated filler | I tell anxious: box breathing. / Box breathing with four-count cycle provides quick bucket drain through respiratory rhythm. |
| `STRESS_NARRATIVES_22` | 13902 | 5.5 | 15 | 87 | 5 | 17 | 0/15 | generated filler | I tell isolated: walking partner. / Daily walking partner combines connection and movement taps for isolation stress relief. |
| `STRESS_NARRATIVES_23` | 14111 | 5.9 | 15 | 90 | 5 | 17 | 0/18 | generated filler | My bucket model for adolescents / I tell parents: teach bucket model. |
| `STRESS_NARRATIVES_24` | 14326 | 5.6 | 15 | 86 | 5 | 17 | 0/19 | generated filler | My bucket and workplace boundaries / I tell overworked: strict hours. |
| `STRESS_NARRATIVES_25` | 14543 | 5.7 | 15 | 92 | 4 | 16 | 0/18 | generated filler | I tell scattered-stressed: time blocking. / Time blocking dedicates calendar to single tasks; no multitasking focuses bucket usage. |
| `STRESS_NARRATIVES_16` | 14764 | 5.9 | 15 | 92 | 5 | 16 | 0/20 | generated filler | My morning bucket check practice / I tell new bucket users: morning check. |
| `STRESS_NARRATIVES_17` | 14981 | 5.7 | 15 | 90 | 5 | 17 | 0/17 | generated filler | My bucket and weighted blanket / I tell sleep-anxious: weighted blanket. |
| `STRESS_NARRATIVES_18` | 15196 | 5.7 | 15 | 90 | 4 | 18 | 0/17 | generated filler | I tell weekly-curious: weekly therapy. / Weekly 50-minute therapy provides major reliable bucket drain practice. |
| `STRESS_NARRATIVES_19` | 15409 | 5.7 | 15 | 86 | 5 | 17 | 0/17 | generated filler | My bucket and outdoor exercise / I tell tap-stacking: outdoor exercise. |
| `STRESS_NARRATIVES_20` | 15622 | 5.5 | 15 | 87 | 4 | 17 | 0/18 | generated filler | My bucket and walking meditation / I tell sitting-stuck: walking meditation. |
| `STRESS_NARRATIVES_11` | 15835 | 6.3 | 15 | 99 | 4 | 15 | 0/22 | generated filler | My bucket weekly check-in practice / I tell systematic-stressed: weekly check-in. |
| `STRESS_NARRATIVES_12` | 16066 | 6.2 | 15 | 99 | 4 | 15 | 0/21 | generated filler | I tell morning-rushers: routine helps. / Consistent morning routine primes bucket for day; coffee outside plus movement provide foundation. |
| `STRESS_NARRATIVES_13` | 16297 | 5.8 | 15 | 92 | 4 | 18 | 0/22 | generated filler | I tell ADHD: medication helps capacity. / ADHD medication expands bucket capacity; treatment plus structure manage smaller default bucket. |
| `STRESS_NARRATIVES_14` | 16514 | 6.2 | 15 | 96 | 4 | 16 | 0/22 | generated filler | My bucket and grief integration / I tell long-grieving: integration possible. |
| `STRESS_NARRATIVES_15` | 16743 | 5.8 | 15 | 92 | 4 | 20 | 0/23 | generated filler | I tell long-stressed: recovery possible. / Long-term bucket recovery is possible; crisis ten years prior integrates into rich life. |
| `STRESS_NARRATIVES_4` | 16962 | 6.6 | 15 | 106 | 4 | 14 | 0/28 | generated filler | Chronic illness adds permanent inflow. / Must increase draining capacity. |
| `STRESS_NARRATIVES_5` | 17207 | 5.8 | 15 | 92 | 4 | 18 | 0/22 | generated filler | I tell sleep-stressed: morning sun. / Morning sunlight regulates cortisol; body clock tap drains stress hormone naturally. |
| `STRESS_NARRATIVES_6` | 17426 | 6.3 | 15 | 103 | 4 | 16 | 0/19 | generated filler | My bucket too small for the stressors / Therapist: capacity is what it is. |
| `STRESS_NARRATIVES_7` | 17665 | 6.2 | 15 | 95 | 4 | 16 | 0/23 | generated filler | My bucket and chronic illness diagnosis / I tell newly-diagnosed: team approach. |
| `STRESS_NARRATIVES_8` | 17888 | 5.7 | 15 | 90 | 4 | 18 | 0/21 | generated filler | My breath tap is always available / I tell beginners: breath is foundational tap. |
| `STRESS_NARRATIVES_9` | 18109 | 6.1 | 15 | 92 | 4 | 16 | 0/24 | generated filler | Chronic overflow became burnout. / I tell burnt out: leave is treatment. |
| `STRESS_NARRATIVES_10` | 18328 | 5.7 | 15 | 90 | 4 | 17 | 0/19 | generated filler | My bucket recovered after time off / I tell never-vacationing: time off restores. |
| `STRESS_NARRATIVES_1` | 18547 | 8.0 | 15 | 125 | 5 | 16 | 0/37 | generated filler | Realized I had not opened any taps. / I tell new bucket users: track inflow AND outflow. |
| `STRESS_NARRATIVES_2` | 18842 | 7.4 | 15 | 121 | 4 | 12 | 0/28 | generated filler | I tell bucket-curious: daily inventory. / Daily morning bucket inventory builds awareness habit through 5-minute review. |
| `STRESS_NARRATIVES_3` | 19123 | 6.2 | 15 | 95 | 5 | 16 | 0/21 | generated filler | My morning meditation drains my bucket / I tell meditation-curious: morning drain. |

## bigfeelings (90 declarations, 458 KB removed)

Verdicts: 90 generated filler. Still referenced anywhere live: none.

| declaration | line | KB | items | prose strings | median words | fragment % | live overlap | verdict | sample |
|---|---|---|---|---|---|---|---|---|---|
| `FEELING_NARRATIVES_90` | 114 | 7.3 | 14 | 98 | 8 | 0 | 0/40 | generated filler | My feelings closing benediction one / May your feelings be heard and honored always. |
| `FEELING_NARRATIVES_87` | 416 | 4.9 | 15 | 88 | 4 | 17 | 0/16 | generated filler | Literature feelings other lives lived empathy expanded. / Poetry feelings compressed beauty soul fed. |
| `FEELING_NARRATIVES_88` | 629 | 5.1 | 15 | 89 | 4 | 17 | 0/15 | generated filler | My final feelings practice integrated / Body, mind, spirit, community. |
| `FEELING_NARRATIVES_84` | 844 | 4.6 | 15 | 85 | 4 | 18 | 0/14 | generated filler | My feelings about weather changes / Weather feelings body responds mood shifts. |
| `FEELING_NARRATIVES_85` | 1057 | 4.7 | 15 | 83 | 4 | 18 | 0/13 | generated filler | My feelings about music genres / Music genres each evokes feelings curate playlists. |
| `FEELING_NARRATIVES_86` | 1270 | 4.9 | 15 | 85 | 4 | 18 | 0/16 | generated filler | My feelings about food memories / Food memories childhood evoked comfort felt. |
| `FEELING_NARRATIVES_81` | 1483 | 5.0 | 15 | 85 | 4 | 18 | 0/17 | generated filler | My feelings about everyday small things / Small things noticed coffee, sunlight, bird joy in daily. |
| `FEELING_NARRATIVES_82` | 1698 | 5.0 | 15 | 88 | 4 | 17 | 0/16 | generated filler | My feelings about animal companionship / Animal companionship unconditional love daily presence. |
| `FEELING_NARRATIVES_83` | 1915 | 4.7 | 15 | 87 | 4 | 17 | 0/13 | generated filler | My feelings about nature in cities / Urban nature trees in parks wildlife adapted. |
| `FEELING_NARRATIVES_76` | 2128 | 4.9 | 15 | 86 | 4 | 17 | 0/16 | generated filler | My feelings about choice freedom / Choice freedom power claimed direction chosen. |
| `FEELING_NARRATIVES_77` | 2341 | 4.7 | 15 | 83 | 4 | 18 | 0/14 | generated filler | My feelings of friendship love / Friendship love philia type chosen family. |
| `FEELING_NARRATIVES_78` | 2554 | 4.9 | 15 | 85 | 4 | 18 | 0/14 | generated filler | My feelings during depression episode / Depression episode treatment essential wave passes. |
| `FEELING_NARRATIVES_79` | 2767 | 4.8 | 15 | 86 | 4 | 17 | 0/13 | generated filler | Hope reborn after dark light returns. / New chapter past honored future open. |
| `FEELING_NARRATIVES_80` | 2980 | 4.9 | 15 | 86 | 4 | 17 | 0/13 | generated filler | I tell beginners: daily renewal. / Lifelong practice daily renewal never complete. |
| `FEELING_NARRATIVES_71` | 3195 | 5.1 | 15 | 85 | 4 | 18 | 0/15 | generated filler | My feelings about anger triggers / Anger triggers specific people, situations inventory built. |
| `FEELING_NARRATIVES_72` | 3412 | 5.0 | 15 | 89 | 4 | 17 | 0/14 | generated filler | I tell happiness-chasing: contentment. / Happiness fleeting joy specific moments contentment foundation. |
| `FEELING_NARRATIVES_73` | 3627 | 5.1 | 15 | 88 | 4 | 17 | 0/18 | generated filler | My feelings about success defined / Success defined personally not others measure own metrics. |
| `FEELING_NARRATIVES_74` | 3840 | 4.9 | 15 | 89 | 4 | 17 | 0/17 | generated filler | End of life feelings mortality close meaning made. / My feelings about saying goodbye |
| `FEELING_NARRATIVES_75` | 4053 | 4.9 | 15 | 87 | 4 | 20 | 0/14 | generated filler | My feelings of all human integrated / I tell suppressing: honor all. |
| `FEELING_FINAL_PRINCIPLES` | 4266 | 3.8 | 20 | 40 | 8 | 35 | 0/39 | generated filler | All feelings are valid information. / Feelings inform about needs, boundaries, values; do not suppress. |
| `FEELING_NARRATIVES_66` | 4369 | 4.8 | 15 | 87 | 4 | 17 | 0/14 | generated filler | Future feelings hope and uncertainty both held. / Past feelings memory shifts integration ongoing. |
| `FEELING_NARRATIVES_67` | 4582 | 4.8 | 15 | 85 | 4 | 18 | 0/14 | generated filler | I tell nostalgic: bittersweet. / Nostalgia feelings sweet and bittersweet time travels. |
| `FEELING_NARRATIVES_68` | 4795 | 4.9 | 15 | 87 | 4 | 17 | 0/14 | generated filler | My feelings of compassion fatigue / Compassion fatigue real condition self-care critical. |
| `FEELING_NARRATIVES_69` | 5008 | 4.8 | 15 | 89 | 4 | 17 | 0/15 | generated filler | Relief feelings burden lifted body exhales. / Release feelings holding loosens energy returns. |
| `FEELING_NARRATIVES_70` | 5221 | 4.9 | 15 | 89 | 4 | 19 | 0/15 | generated filler | Wisdom emerges all feelings teachers all valid. / Practice continues daily renewal lifelong commitment. |
| `FEELING_NARRATIVES_61` | 5434 | 4.8 | 15 | 83 | 4 | 18 | 0/13 | generated filler | Sleep feelings restoration sought body grateful. / Insomnia feelings frustration plus fear tools available. |
| `FEELING_NARRATIVES_62` | 5647 | 5.1 | 15 | 89 | 4 | 17 | 0/17 | generated filler | My feelings about emotions teaching kids / Emotion education kids learn early lifelong skill. |
| `FEELING_NARRATIVES_63` | 5860 | 4.9 | 15 | 86 | 4 | 17 | 0/14 | generated filler | My feelings about my body image / I tell image-stuck: neutrality. |
| `FEELING_NARRATIVES_64` | 6073 | 5.2 | 15 | 88 | 4 | 17 | 0/17 | generated filler | My feelings about identity formation / Identity formation feelings question and answer lifelong process. |
| `FEELING_NARRATIVES_65` | 6286 | 5.1 | 15 | 89 | 4 | 17 | 0/15 | generated filler | My feelings about authenticity / Authenticity practice true self expressed daily commitment. |
| `FEELING_NARRATIVES_56` | 6499 | 5.0 | 15 | 85 | 4 | 18 | 0/16 | generated filler | My feelings about safety physical / Physical safety feelings body knows threat signals. |
| `FEELING_NARRATIVES_57` | 6712 | 4.9 | 15 | 83 | 4 | 18 | 0/17 | generated filler | My feelings during conflict resolution / Conflict resolution both heard solution sought. |
| `FEELING_NARRATIVES_58` | 6925 | 5.0 | 15 | 87 | 4 | 17 | 0/15 | generated filler | I tell platform-stressed: curate. / Social media feelings mixed always curate carefully. |
| `FEELING_NARRATIVES_59` | 7138 | 5.0 | 15 | 83 | 4 | 18 | 0/16 | generated filler | My feelings about creativity blocked / Creative block frustration common patience needed. |
| `FEELING_NARRATIVES_60` | 7351 | 4.7 | 15 | 85 | 4 | 18 | 0/12 | generated filler | Hobby feelings play in adults joy permitted. / I tell garden-curious: patience. |
| `FEELING_NARRATIVES_51` | 7564 | 5.0 | 15 | 84 | 4 | 23 | 0/14 | generated filler | Student feelings pressure and curiosity need balance. / Test anxiety real body amped tools available. |
| `FEELING_NARRATIVES_52` | 7777 | 5.1 | 15 | 88 | 4 | 17 | 0/18 | generated filler | Partnership feelings daily commitment practice continues. / My feelings about communication |
| `FEELING_NARRATIVES_53` | 7990 | 5.1 | 15 | 86 | 4 | 17 | 0/15 | generated filler | Parenting feelings profound love and stress both real. / New parent feelings overwhelmed in love support needed. |
| `FEELING_NARRATIVES_54` | 8207 | 5.0 | 15 | 87 | 4 | 18 | 0/14 | generated filler | My feelings of inherited grief / Inherited grief family patterns cycle awareness. |
| `FEELING_NARRATIVES_55` | 8420 | 5.0 | 15 | 83 | 4 | 19 | 0/17 | generated filler | My feelings of forgiveness given / I tell grudge-stuck: forgiveness frees self. |
| `FEELING_NARRATIVES_46` | 8633 | 5.1 | 15 | 88 | 4 | 17 | 0/15 | generated filler | I tell money-stressed: therapy. / Money feelings of anxiety, shame, freedom benefit from financial therapy. |
| `FEELING_NARRATIVES_47` | 8846 | 5.1 | 15 | 87 | 4 | 17 | 0/16 | generated filler | My feelings during health crisis / Health crisis feelings fear plus determination both real. |
| `FEELING_NARRATIVES_48` | 9059 | 4.7 | 15 | 84 | 4 | 18 | 0/15 | generated filler | I tell body-disconnected: feel. / Body feelings physical sensations information rich. |
| `FEELING_NARRATIVES_49` | 9272 | 4.9 | 15 | 84 | 4 | 18 | 0/14 | generated filler | Safety felt nervous system relaxes authentic emerges. / I tell unheard: heard practice. |
| `FEELING_NARRATIVES_50` | 9485 | 5.0 | 15 | 89 | 4 | 19 | 0/15 | generated filler | I tell beginners: integration. / Years of practice all feelings integrated daily second nature. |
| `FEELING_NARRATIVES_41` | 9698 | 4.8 | 15 | 77 | 4 | 19 | 0/12 | generated filler | Nature awe in mountains and oceans shifts perspective through scale. / Art awe beauty captured through human creation. |
| `FEELING_NARRATIVES_42` | 9913 | 5.2 | 15 | 88 | 4 | 18 | 0/15 | generated filler | Meditation surfaces feelings; welcome them and let pass through. / I tell yoga-emotional: normal. |
| `FEELING_NARRATIVES_43` | 10126 | 5.1 | 15 | 83 | 4 | 19 | 0/15 | generated filler | My feelings of self-compassion / I tell self-critical: compassion. |
| `FEELING_NARRATIVES_44` | 10339 | 5.0 | 15 | 84 | 4 | 18 | 0/15 | generated filler | My feelings of empathy practice / I tell distance-stuck: empathy. |
| `FEELING_NARRATIVES_45` | 10552 | 5.0 | 15 | 88 | 4 | 18 | 0/15 | generated filler | Meaning made through service to others ensures life mattered. / I tell purpose-seeking: years. |
| `FEELING_NARRATIVES_36` | 10765 | 5.2 | 15 | 88 | 4 | 17 | 0/16 | generated filler | Adoption feelings primal wound need adoption-aware specialty therapy. / Foster youth feelings of multiple losses need specialty support. |
| `FEELING_NARRATIVES_37` | 10978 | 5.0 | 15 | 83 | 4 | 19 | 0/15 | generated filler | Grief feelings come in wave patterns through years of work. / Loss feelings of sadness, anger, relief all valid. |
| `FEELING_NARRATIVES_38` | 11191 | 5.0 | 15 | 84 | 4 | 18 | 0/15 | generated filler | Trauma feelings body holds need specialty therapy. / PTSD feelings hypervigilance and flashbacks need specialty support. |
| `FEELING_NARRATIVES_39` | 11406 | 4.9 | 15 | 88 | 4 | 17 | 0/15 | generated filler | My feelings during life transitions / Transition feelings loss plus possibility both honored. |
| `FEELING_NARRATIVES_40` | 11619 | 5.0 | 15 | 88 | 4 | 18 | 0/16 | generated filler | Daily awe cultivated through sunsets, stars, kindness maintains wonder. / Wonder feelings childlike curiosity open mind. |
| `FEELING_NARRATIVES_31` | 11832 | 5.0 | 15 | 86 | 4 | 20 | 0/15 | generated filler | Parent feelings of love and frustration both valid. / New parent feelings overwhelming love plus exhaustion. |
| `FEELING_NARRATIVES_32` | 12045 | 4.9 | 15 | 88 | 3 | 17 | 0/15 | generated filler | Pre-sleep ruminative feelings managed by worry park practice. / I tell dream-curious: processing. |
| `FEELING_NARRATIVES_33` | 12258 | 5.1 | 15 | 85 | 4 | 19 | 0/15 | generated filler | Belonging deep need; community essential for identity affirmation. / I tell rejection-stuck: both directions. |
| `FEELING_NARRATIVES_34` | 12471 | 5.1 | 15 | 90 | 4 | 17 | 0/16 | generated filler | I tell experienced: deepening. / Years of feelings practice deepen vocabulary and keen body awareness. |
| `FEELING_NARRATIVES_35` | 12684 | 5.1 | 15 | 87 | 4 | 17 | 0/19 | generated filler | My feelings I teach my children / Feelings education with vocabulary shared teaches children. |
| `FEELING_NARRATIVES_26` | 12897 | 5.2 | 15 | 90 | 3 | 18 | 0/15 | generated filler | My feelings in childhood remembered / Childhood feelings remembered. |
| `FEELING_NARRATIVES_27` | 13110 | 5.0 | 15 | 85 | 4 | 19 | 0/15 | generated filler | Therapy room safe container for emerging feelings. / I tell group-curious: witnesses. |
| `FEELING_NARRATIVES_28` | 13323 | 4.9 | 15 | 86 | 4 | 17 | 0/15 | generated filler | Daily exercise releases anger through body processing. / Running anger lets body release draining bucket. |
| `FEELING_NARRATIVES_29` | 13536 | 5.3 | 15 | 87 | 4 | 20 | 0/18 | generated filler | I tell workplace: appropriate expression. / Workplace feelings expressed professionally with boundaries respected. |
| `FEELING_NARRATIVES_30` | 13749 | 5.0 | 15 | 87 | 4 | 18 | 0/16 | generated filler | I tell married: feelings shift. / Marriage feelings shift daily, yearly, decades; all valid. |
| `FEELING_NARRATIVES_21` | 13964 | 5.0 | 15 | 87 | 3 | 20 | 0/15 | generated filler | I tell guilt-shamed: corrective. / Guilt as corrective signal indicates action wrong not me; repair attempted. |
| `FEELING_NARRATIVES_22` | 14177 | 5.2 | 15 | 87 | 4 | 22 | 0/19 | generated filler | I tell disgust-shamed: boundary. / Disgust signals boundary about what I will not honor as signal. |
| `FEELING_NARRATIVES_23` | 14390 | 5.0 | 15 | 85 | 3 | 20 | 0/16 | generated filler | Contempt examined often reveals mirror reflection of self. / I tell contemptuous-marriage: urgent therapy. |
| `FEELING_NARRATIVES_24` | 14603 | 5.3 | 15 | 88 | 4 | 23 | 0/15 | generated filler | My emotions complete daily map / I tell tracking-curious: daily map. |
| `FEELING_NARRATIVES_25` | 14816 | 5.3 | 15 | 87 | 4 | 18 | 0/15 | generated filler | My emotional vocabulary expanded / I tell vocabulary-limited: expand. |
| `FEELING_NARRATIVES_16` | 15029 | 5.0 | 15 | 86 | 4 | 19 | 0/15 | generated filler | Daily joy claim with specific moment named aloud builds positive awareness. / Joy savored with held attention amplifies positive experience. |
| `FEELING_NARRATIVES_17` | 15242 | 5.1 | 15 | 88 | 3 | 17 | 0/15 | generated filler | I tell anxiety-fighting: acknowledge. / Anxiety acknowledged not pushed down recognizes body signal. |
| `FEELING_NARRATIVES_18` | 15455 | 5.3 | 15 | 90 | 3 | 20 | 0/16 | generated filler | I tell ashamed-lonely: signal. / Loneliness named is signal of need not weakness. |
| `FEELING_NARRATIVES_19` | 15668 | 5.5 | 15 | 88 | 3 | 17 | 0/18 | generated filler | Disappointment honored as reality vs expectation gap requiring adjustment. / My disappointment after failed plan |
| `FEELING_NARRATIVES_20` | 15881 | 5.1 | 15 | 88 | 4 | 17 | 0/15 | generated filler | I tell jealous-stuck: name need. / Jealousy named reveals unmet need underneath that should be addressed. |
| `FEELING_NARRATIVES_11` | 16094 | 5.6 | 15 | 92 | 4 | 20 | 0/19 | generated filler | I tell yelling-parents: therapy. / Parent anger therapy identifies triggers and develops tools; calmer parenting possible. |
| `FEELING_NARRATIVES_12` | 16318 | 5.4 | 15 | 89 | 4 | 19 | 0/16 | generated filler | Divorce anger lingers years; forgiveness work slow but possible. / I tell betrayed: trauma therapy. |
| `FEELING_NARRATIVES_13` | 16531 | 5.1 | 15 | 86 | 4 | 17 | 0/15 | generated filler | Daily sadness journaling processes feelings and recognizes patterns. / Trusted friend witnesses shared sadness providing presence. |
| `FEELING_NARRATIVES_14` | 16744 | 5.5 | 15 | 90 | 4 | 17 | 0/16 | generated filler | Fear named specifically about what exactly is feared informs body knowing. / I tell phobic: gradual exposure. |
| `FEELING_NARRATIVES_15` | 16967 | 5.2 | 15 | 84 | 4 | 18 | 0/15 | generated filler | Shame addressed slowly spoken to trusted person loses power. / I tell body-shamed: neutrality. |
| `FEELING_NARRATIVES_4` | 17180 | 5.7 | 15 | 93 | 4 | 17 | 0/15 | generated filler | My feelings vocabulary expanded / Frustrated, melancholy, irritated. |
| `FEELING_NARRATIVES_5` | 17405 | 5.7 | 15 | 96 | 4 | 17 | 0/15 | generated filler | I tell adult-angry: group exists. / Anger management group adapted from Coping Power teaches skills making anger workable. |
| `FEELING_NARRATIVES_6` | 17632 | 5.1 | 15 | 87 | 3 | 17 | 0/16 | generated filler | I tell tears-avoidant: welcome. / Sadness honored not avoided with tears welcomed processes body emotion. |
| `FEELING_NARRATIVES_7` | 17845 | 5.3 | 15 | 87 | 4 | 18 | 0/17 | generated filler | Mixed parent feelings of love plus frustration both real and valid. / I tell partnered: feelings shift. |
| `FEELING_NARRATIVES_8` | 18058 | 5.2 | 15 | 87 | 4 | 17 | 0/15 | generated filler | I tell pregnant: feelings intense. / Pregnancy feelings intense with joy plus fear and hormonal amplification. |
| `FEELING_NARRATIVES_9` | 18271 | 5.4 | 15 | 90 | 4 | 18 | 0/17 | generated filler | I tell tracking-curious: thrice daily. / Daily thrice-daily feelings check-in tracked over time builds awareness. |
| `FEELING_NARRATIVES_10` | 18486 | 5.1 | 15 | 89 | 4 | 19 | 0/15 | generated filler | All feelings valid as information and all passing. / My feelings practice continues |
| `FEELING_NARRATIVES_1` | 18699 | 6.3 | 15 | 106 | 4 | 17 | 0/18 | generated filler | My anger was a signal not enemy / Therapist taught: anger is signal. |
| `FEELING_NARRATIVES_2` | 18948 | 5.9 | 15 | 101 | 4 | 18 | 0/16 | generated filler | Therapist: sadness is information. / I tell sadness-avoidant: information. |
| `FEELING_NARRATIVES_3` | 19189 | 6.4 | 15 | 109 | 3 | 15 | 0/17 | generated filler | I tell explosive: group plus practice. / Anger management at any age requires group plus years of practice; explosive anger can be tamed. |

## emotions (1 declarations, 27 KB removed)

Verdicts: 1 authored, unwired. Still referenced anywhere live: none.

| declaration | line | KB | items | prose strings | median words | fragment % | live overlap | verdict | sample |
|---|---|---|---|---|---|---|---|---|---|
| `EMOTION_JOURNAL_TEMPLATES` | 14441 | 27.5 | 20 | 385 | 6 | 1 | 0/40 | authored, unwired | A 2-3 minute daily entry to build emotional awareness without overhead / Body weather (one word or image) |

## teamwork (1 declarations, 2 KB removed)

Verdicts: 1 authored, unwired. Still referenced anywhere live: none.

| declaration | line | KB | items | prose strings | median words | fragment % | live overlap | verdict | sample |
|---|---|---|---|---|---|---|---|---|---|
| `COMM_STYLES` | 710 | 2.4 | 4 | 35 | 4 | 0 | 0/11 | authored, unwired | Task-focused and decisive. You like to get things done efficiently and lead by example. / Can seem impatient or controlling |

