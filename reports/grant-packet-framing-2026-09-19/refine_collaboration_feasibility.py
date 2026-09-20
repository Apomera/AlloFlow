from pathlib import Path
import json, re, shutil
R=Path(r'C:\Users\cabba\Documents\Codex\2026-09-08\new-realtime-voice-chat\king-bucks-digital-pilot-2026-09-19')
B=R/'_qa/before-collaboration-feasibility'
B.mkdir(parents=True,exist_ok=True)
for name in ['packet-content.json','king-bucks-digital-pilot-application.md','king-bucks-digital-pilot-grant-packet.pdf','grant-framing-research-notes.md']:
    if (R/name).exists() and not (B/name).exists(): shutil.copy2(R/name,B/name)
j=json.loads((B/'packet-content.json').read_text(encoding='utf-8-sig'))
md=(B/'king-bucks-digital-pilot-application.md').read_text(encoding='utf-8-sig')
directory='https://docs.google.com/document/d/1zFiCpmnyqdnWk5i68dE0t1KcQwXVzD_mX7AaetUDSW4/edit?usp=sharing'
form='https://www.foundationforpps.org/2026-equity-and-innovation-grant-application-form/'
new_main=[
"King Middle School is redesigning King Bucks through a gradual pilot of digital Positive Behavioral Interventions and Supports (PBIS) integrated into AlloFlow. The $1,500 request would fund making materials and initial student-informed recognition choices. Students would help shape a catalog of their designs and other school-appropriate options. Small purchasing rounds would help staff learn which choices students value and what is practical to fulfill and replenish.",
"Students could suggest items through surveys, conversations, and an ongoing request process, using paper, digital, or adult-supported options. A staff-facilitated group would compare ideas, costs, and practical constraints. Monthly feedback would explain which suggestions were accepted, adapted, deferred, or outside scope. Students could contribute without buying materials or publishing their work.",
"AlloFlow's Art and Design Studio, Geometry World, and Geometry Sandbox provide design pathways connecting dimensions, material use, and revision to tangible objects. With student consent and staff approval, designs could enter the moderated school catalog. Staff would inspect sliced models, approve entries and prices, and manage inventory and checkout. Peer selections would initially be staff-assisted; capacity and availability would be checked before points are spent.",
"King Bucks would accompany explicitly taught expectations, positive relationships, and specific feedback. Choices at attainable point levels and input from students who seldom participate would guide the pilot. Students could contribute drawings, descriptions, budgeting ideas, or supported designs. Surveys, scheduled instruction, required learning materials, and essential supports would remain available regardless of King Bucks balances.",
"No software license fees or applicant compensation are requested. AlloFlow is an independent, open-source project developed by the applicant with AI coding assistance; district review remains pending. If review is delayed, student input, approved purchases, and the initial catalog could proceed through school-approved paper or existing digital procedures. AlloFlow student use would follow required approvals. Expansion would depend on access, feedback, reliable fulfillment, and manageable workload."
]
old_main='\n\n'.join(j['pages'][0]['paragraphs'])
assert old_main in md
md=md.replace(old_main,'\n\n'.join(new_main),1)
j['pages'][0]['paragraphs']=new_main
team_text="Aaron Pomeranz would coordinate the pilot and evaluation. Court Caywood, listed as King's librarian, has expressed interest in supporting and signing the proposal, according to the applicant. Proposed library support includes student suggestions and catalog curation; responsibilities and co-applicant status need confirmation. A 3D-printing collaborator has also expressed interest; identity, availability, and role remain unconfirmed."
j['pages'][0]['sections'].insert(0,{'heading':'Collaborating team','paragraphs':[team_text+f" <link href='{directory}'>King staff directory</link>."]})
team_md=team_text+f" [King staff directory]({directory}).\n\nCollaborator support does not replace principal or district approval. Print support could include design review, materials advice, and capacity planning; no time commitment or paid arrangement is assumed.\n\n"
md=md.replace('## Goal and evaluation','## Collaborating team\n\n'+team_md+'## Goal and evaluation',1)
md=md.replace('- **Co-applicants:** [Confirm PBIS and library/makerspace collaborators]','- **Co-applicants:** Court Caywood has expressed support; confirm his willingness to be named as a co-applicant and his agreed role. Confirm other collaborators before listing them.',1)
plan=j['pages'][1]['sections'][0]['paragraphs']
new_plan=[
"<b>Prepare:</b> Confirm pilot reach, staff roles, and a backup. Review a sliced sample for material use and print time; confirm compatible equipment, supervision, and available weekly capacity. Include prototypes and unsuccessful prints in estimates. Test approved digital configurations with fictional records and document procedures.",
"<b>Pilot:</b> Start with a small catalog and supported design activity, with paper or staff-assisted participation. Purchase after funds arrive. Limit print offerings to confirmed capacity and check availability before point redemption.",
"<b>Review:</b> Review requests monthly and explain decisions to students. Check delays, costs, and staff workload before expanding. Identify an approved replenishment source before promising continued stock."
]
for old,new in zip(plan,new_plan):
    old_md=re.sub(r'<b>(.*?)</b>',r'**\1**',old)
    new_md=re.sub(r'<b>(.*?)</b>',r'**\1**',new)
    assert old_md in md
    md=md.replace(old_md,new_md,1)
j['pages'][1]['sections'][0]['paragraphs']=new_plan
capacity="**Print feasibility:** Before listing an item, record its sliced material estimate, print duration, intended physical dimensions, compatible material, and supervising staff member. Reserve time and material for setup, prototypes, and unsuccessful prints. Set the first catalog's quantities and fulfillment window from confirmed capacity, then review actual performance. A student design proposal does not guarantee that every object can be printed. Students can revise a design or select another approved option.\n\n"
md=md.replace('## Proposed budget',capacity+'## Proposed budget',1)
old_services='**Outside experts or contracted services:** Proposed answer: No.'
new_services='**Outside experts or contracted services:** No paid outside services are currently included. Confirm whether any technical assistance would be volunteered. If paid services are proposed, identify the provider, scope, location, and payment amount and revise the budget before submission. The final form response must match the agreed arrangement.'
assert old_services in md
md=md.replace(old_services,new_services,1)
# Keep the current nine-page structure and put actionable confirmation details on its final page.
confirm=j['pages'][8]['sections'][1]['paragraphs']
confirm[0]="Confirm applicant details, pilot grades and direct student count, prior-grant responses, Court's agreed role, and the printing collaborator's identity and availability. Confirm equipment, weekly print capacity, supervision, and a backup staff member. No paid outside services are budgeted; any paid assistance needs a named provider, scope, location, and amount."
confirm[1]="Add representative products, quantities, and delivered prices; clarify eligibility of general reward stock and permitted substitutions. Collaborator support does not replace principal or district approval. Review any technology purchase and the intended AlloFlow configuration as applicable. Food/parties, applicant pay, and professional development are excluded. <link href='https://www.foundationforpps.org/wp-content/uploads/2026/07/Fall-2026-Equity-and-Innovation-Grants-Guidelines-and-Requirements.pdf'>[5]</link> <link href='"+form+"'>[6]</link>"
# Submission notes retain the existing dates and public-source links.
start=md.index('## Finish before submission')
end=md.index('## Sources',start)
md=md[:start]+"""## Finish before submission

Use the companion [grant preparation sheet](grant-preparation-sheet.md) to close the remaining factual gaps: pilot grades and direct student count, collaborator responsibilities, equipment and capacity, supplier prices, and named approvals. Court's interest in supporting the application is applicant-reported; co-applicant status and duties remain to be confirmed. The printing collaborator's identity and any paid or voluntary arrangement must also be confirmed.

Add representative items, quantities, and delivered prices. FPPS does not explicitly address general PBIS reward inventory in its published rules, so clarify uncertain item eligibility and the requested purchasing flexibility. Food/parties, applicant pay, and professional development are excluded. [[5]](https://www.foundationforpps.org/wp-content/uploads/2026/07/Fall-2026-Equity-and-Innovation-Grants-Guidelines-and-Requirements.pdf)

Collaborator support or a supporting signature does not replace principal or relevant district approval. Obtain the required grant review and incorporate feedback; confirm any technology-purchase review and the intended AlloFlow configuration separately. Enter an administrator's name only after that person has reviewed and supports the request. No signatures have been added by this packet. [[6]](https://www.foundationforpps.org/2026-equity-and-innovation-grant-application-form/)

The application deadline is September 30, 2026; the final report is due June 18, 2027. This packet supports review; the online form has no visible attachment field. Use the narrative and finalized budget in the application. [[7]](https://www.foundationforpps.org/what-we-do/teacher-grants/) [[6]](https://www.foundationforpps.org/2026-equity-and-innovation-grant-application-form/)

Complete applicant signatures only after the corresponding reviews. Confirm prior-grant reporting requirements. The final report should summarize participation, design learning, student feedback, feasibility, and spending.

"""+md[end:]
md+='\n[[16] King Middle School. Published staff directory; Court Caywood, Librarian. Checked September 19, 2026.]('+directory+')\n'
(R/'packet-content.json').write_text(json.dumps(j,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
(R/'king-bucks-digital-pilot-application.md').write_text(md,encoding='utf-8')
prep="""# King Bucks grant preparation sheet

September 19, 2026 | Internal planning companion | No application submitted

This sheet holds unconfirmed details and practical decisions so the illustrated proposal can stay concise. Blank items are unknown, not commitments. The current request remains $1,500; supplier quotes and staffing arrangements are not yet finalized.

## Collaborator contacts and status

| Person | Established information | Confirm before submission |
| --- | --- | --- |
| Aaron Pomeranz | Lead applicant; PPS school psychologist and AlloFlow developer. | Professional name, preferred PPS contact details, coordinating role, and designated backup. |
| Court Caywood | King's published staff directory lists Court as Librarian and gives caywow@portlandschools.org. Applicant reports his interest in supporting/signing the grant. | Permission to list him as co-applicant or supporting collaborator; actual role and availability. Suggested topics: student requests, accessible catalog choices, and library participation. |
| Josh, printing collaborator | Applicant reports his interest in participating. Full identity and affiliation are unconfirmed. | Full name, organization, work contact, equipment/lab relationship, support scope, availability, and whether any service would be paid. |

Court source: [King staff directory](COURT_URL). Supporting the application does not automatically make someone the approving administrator.

A possible research lead for Josh is Joshua Geary, owner of [3DSpaceGarden in Westbrook](https://www.3dspacegarden.com/home), named in the [Westbrook business-network directory](https://www.tbdconnections.net/westbrook). The studio publishes 3DSpaceGarden@gmail.com and 207-370-0062. This lead has not been matched to the applicant's collaborator and is excluded from the grant's named team.

## Decisions to close

| Decision | Current status | Record when confirmed |
| --- | --- | --- |
| Pilot reach | Unconfirmed. | Grades, direct participating students, and basis for estimate; distinguish wider possible access. |
| Staff responsibilities | Proposed. | Student feedback, purchasing, catalog approval, checkout, print review, evaluation, and backup. One person can cover more than one role. |
| School/lab equipment | Unconfirmed. | Printer model, material and diameter, lab location, supervising operator, and available time. |
| Printing capacity | Unmeasured. | Slice one representative model; record grams, print hours, physical size, and expected turnaround. |
| Initial student input | Planned. | Collect preferences through accessible routes, including students who seldom redeem rewards. |
| Purchases and substitutions | Planning allocations only. | Representative products, quotes, delivered cost, eligibility, and FPPS terms for changes. |
| Grant approval | Pending. | Principal or relevant district leader who has reviewed the actual proposal and supports it. |
| Digital pilot review | Pending. | Approved AlloFlow configuration and access/data procedures; any required technology-purchase approval. |
| Replenishment | No future funds committed. | Actual replacement costs and approved source before promising ongoing stock. |

## First purchasing round

Check school stock first. Gather student suggestions, choose a small starting selection, and retain funds within approved categories for later requests. Record accepted, adapted, deferred, and out-of-scope requests and communicate reasons monthly. Ask FPPS about unclear reward-stock eligibility and permitted substitutions; flexibility is requested, not assumed.

| Category | Current allocation | Evidence to collect |
| --- | ---: | --- |
| Student-informed recognition choices | $650 | A few representative books, sketchbooks/art supplies, puzzles, or games, with product links and delivered prices. Final selections follow student input and eligibility confirmation. |
| Materials for student-created choices | $650 | Compatible filament and nonprinting making materials; quantities informed by planned models and existing stock. Allow for trial prints and failed attempts. A small PHA trial remains optional. |
| Reusable organization | $100 | Existing storage check, then necessary bins, labels, or display materials. |
| Delivery and applicable charges | $100 | Actual shipping and applicable charges; avoid counting charges already included in delivered unit prices. |
| Total request and expenses | $1,500 | Replace allocations with a supported budget before submitting. No other cash revenue is assumed. |

For each representative item, record: category; product and supplier URL; quantity; unit price; line total; shipping/applicable charges; delivered total; date checked; and acceptable equivalent. Sum each category and ensure the full budget equals the requested award. Confirm district purchasing arrangements before assuming any tax exemption or shipping discount.

No paid outside services are currently included. If Josh or another collaborator proposes a fee, document the named provider, scope, service location, and payment amount, then reallocate within the $1,500 request before submission. Do not describe interested technical support as donated until confirmed.

## Print feasibility record

| Planning input | Value to establish |
| --- | --- |
| Representative model and intended dimensions | [Confirm] |
| Compatible printer/material/diameter | [Confirm] |
| Slicer estimate: material grams and print hours | [Measure] |
| Material cost per gram | Delivered spool cost divided by usable grams, using the actual quote. |
| Estimated model material cost | Slicer grams multiplied by cost per gram; show prototype/support/waste allowances separately. |
| Available supervised print hours | [Confirm with the operator; exclude unavailable time.] |
| Reserved time and material | [Set for setup, prototypes, unsuccessful prints, and other lab users.] |
| Initial quantity and fulfillment window | [Set from the confirmed model mix and remaining capacity.] |
| Staff review and backup | [Confirm] |

Print time varies by model and settings. Use actual slicer estimates and operator judgment rather than a fixed number of prints per week. Material cost is not the full cost of operating a printer. Record actual duration and material use during the pilot and adjust the offering. Confirm availability before students spend points; staff can help students revise a design or choose another approved item.

## Launch and review

Before launch, finalize the named responsibilities, direct pilot group, budget, equipment access, and required approvals. If AlloFlow review is delayed, student input, approved purchasing, and an initial catalog can use school-approved paper or existing digital procedures. AlloFlow student use waits for the required review.

Begin with one manageable catalog and a supported design activity. Offer paper or adult-supported participation, private balances, and access to instruction regardless of points. Expand only when the team can maintain access and reliably fulfill selections within available resources.

At launch and 8-10 weeks later, ask the same brief questions about understanding King Bucks, appealing choices, and how to suggest an idea. Include nonredeemers and report response counts. Review an aggregate request/participation log, spending, delays, and staff effort monthly. For volume activities, compare comparable work samples for cubes/layers, calculations, cubic units, and explanation; note support provided. This is descriptive pilot evidence, not a causal evaluation.

## Form completion

Confirm prior-grant reporting responses and complete contact fields. The FPPS form permits co-applicants, requires principal or relevant district leadership support, and asks for details of paid outside services. An application proposing a technology purchase also requires PPS IT review. [Current application](FORM_URL).

The deadline is September 30, 2026 and the final report is due June 18, 2027, as listed on the [FPPS grant page](https://www.foundationforpps.org/what-we-do/teacher-grants/). The online form has no visible packet attachment field; use the final narrative and budget in its fields and use the PDF for review discussions. No outreach, signatures, submission, or commitments have been made through this preparation sheet.
""".replace('COURT_URL',directory).replace('FORM_URL',form)
(R/'grant-preparation-sheet.md').write_text(prep,encoding='utf-8')
notes=(B/'grant-framing-research-notes.md').read_text(encoding='utf-8-sig')
notes+='\n\n## Collaboration and feasibility refinement - September 19, 2026\n\n'+f"Court Caywood is listed as Librarian with caywow@portlandschools.org in King's published staff directory: {directory}. Public text export was checked during collaborator research. The applicant reports interest in supporting/signing; agreed duties and co-applicant status remain unconfirmed. This does not constitute principal or district approval.\n\n"+'Josh remains unidentified. Joshua Geary of 3DSpaceGarden is a possible public-source lead only; see the internal preparation sheet. No surname or organization was added to the grant team.\n\nThe revision adds measured print-capacity planning, prototype allowances, named-role confirmation, and an explicit approved paper/existing-system route while AlloFlow review is pending. It corrects the outside-services draft response to reflect that no paid services are currently budgeted, without asserting technical support is volunteered. Budget allocations and research/worksheet claims are unchanged.\n'
(R/'grant-framing-research-notes.md').write_text(notes,encoding='utf-8')
assert len(j['pages'])==9
assert 'Geary' not in md and 'Geary' not in json.dumps(j)
assert j['pages'][1]['table']['rows'][-1][-1]=='$1,500'
print(json.dumps({'updated':['packet-content.json','king-bucks-digital-pilot-application.md','grant-framing-research-notes.md'],'created':'grant-preparation-sheet.md','planned_pages':9,'first_page_words':len(re.sub('<[^>]+>','',json.dumps(j['pages'][0])).split())}))
