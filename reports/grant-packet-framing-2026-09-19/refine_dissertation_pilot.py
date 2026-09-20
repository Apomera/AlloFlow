from pathlib import Path
import json,re,shutil
R=Path(r'C:\Users\cabba\Documents\Codex\2026-09-08\new-realtime-voice-chat\king-bucks-digital-pilot-2026-09-19')
B=R/'_qa/before-dissertation-pilot-refinement'
B.mkdir(parents=True,exist_ok=True)
for name in ['packet-content.json','king-bucks-digital-pilot-application.md','king-bucks-digital-pilot-grant-packet.pdf']:
    if not (B/name).exists():shutil.copy2(R/name,B/name)
j=json.loads((B/'packet-content.json').read_text(encoding='utf-8-sig'))
md=(B/'king-bucks-digital-pilot-application.md').read_text(encoding='utf-8-sig')

def replace_main(i,new):
    global md
    old=j['pages'][0]['paragraphs'][i]
    assert old in md
    md=md.replace(old,new,1)
    j['pages'][0]['paragraphs'][i]=new

replace_main(0,'King Middle School is redesigning King Bucks through a gradual pilot of digital Positive Behavioral Interventions and Supports (PBIS) integrated into AlloFlow. The $1,500 request would supply making materials and initial student-informed recognition choices to test the redesign on a manageable scale. Students would help shape the catalog, including objects they design and other school-appropriate options. Purchasing in small rounds would help staff learn which choices students value and what is practical to fulfill and replenish.')
replace_main(1,'Student voice would be a recurring part of the system. Students could suggest items through surveys, conversations, and an ongoing request process, using paper, digital, or adult-supported options. A staff-facilitated group would help compare ideas, costs, and practical constraints. Monthly feedback would explain which suggestions were accepted, adapted, deferred, or outside the approved scope. Students could suggest and help create items without buying materials or publishing their work.')
replace_main(3,'Staff would approve catalog entries, prices, and print suitability, then manage checkout, inventory, and fulfillment. Peer-design selections would initially use staff assistance. Available supplies and print capacity would be checked before students spend points. Staff would inspect models and sliced results before printing; the software does not operate a printer.')

plan=j['pages'][1]
plan['sections'][0]['paragraphs']=[
 '<b>Prepare:</b> Confirm the pilot group and responsibility for student feedback, purchasing, checkout, print review, and evaluation. Check supplies and print capacity. Test approved digital configurations with fictional records; document procedures another designated staff member can follow.',
 '<b>Pilot:</b> Begin with a small catalog and supported design activity, with paper or staff-assisted participation available. Purchase grant items only after funds arrive. Confirm availability before point redemption.',
 '<b>Review:</b> Review requests monthly and report decisions to students. Adjust choices and workload before expanding. Identify an approved replenishment source before promising continued stock.'
]
eval_paras=[
 'At launch and after 8-10 weeks, ask the same brief questions about understanding King Bucks, appealing choices, and how to suggest an idea. Include students who do not redeem rewards and report response counts.',
 'Review participation and student influence, fulfillment within available time and materials, and changes needed before expansion. Use an aggregate request/participation log and a monthly check of spending, delays, and staff effort.',
 'For volume activities, compare an initial and later work sample for cube/layer representation, a matching calculation, cubic units, and an explanation linking model and answer. Report descriptive progress and limitations; the pilot will not establish that AlloFlow caused learning or behavior gains.'
]
plan['sections'][1]['paragraphs']=eval_paras
plan['footerNote']='Planning allocations, not quotes: add representative products, quantities, and delivered prices. Seek flexibility within approved categories and FPPS terms. With partial funding, retain student input and a supported design activity while reducing stock and deferring optional trials. Check existing supplies first, record replacement costs, and retain reusable materials and staff procedures. Future replenishment funding is not yet committed.'

old_goal=re.search(r'## Goal and evaluation\n.*?(?=\n## Strategic plan alignment)',md,re.S).group(0)
new_goal='## Goal and evaluation\n\nOur goal is to pilot an accessible King Bucks system that gives students a meaningful role in shaping recognition choices and contributing designs, while establishing a manageable process for educators.\n\n'+'\n\n'.join(eval_paras)+'\n\nSuggested survey items: "I understand how to earn and use King Bucks"; "There are choices I would like to work toward"; and "I can suggest an idea and receive a response." Establish the baseline during the pilot. Report counts and observations, including challenges, without inventing baseline data or promising a particular percentage improvement.\n\nFor a volume work sample, review four features using consistent criteria: the represented cubes/layers match the dimensions; the calculation matches the model; the answer uses cubic units; and the explanation connects the representation to the calculation. Offer written, oral, drawn, or adult-supported explanations. Use a comparable task later and note differences in support. This is descriptive classroom evidence, not a validated achievement test or a causal study.\n'
md=md.replace(old_goal,new_goal)
old_plan=re.search(r'## Gradual pilot plan\n.*?(?=\n## Proposed budget)',md,re.S).group(0)
new_plan='## Gradual pilot plan\n\n'+'\n\n'.join(p.replace('<b>','**').replace('</b>','**') for p in plan['sections'][0]['paragraphs'])+'\n\nUse private student balances and aggregate grant reporting. Keep non-digital or adult-supported participation available. Confirm named responsibilities and a backup staff member before launch; these roles are proposed, not staffing commitments. Any public project documentation should follow school permissions.\n'
md=md.replace(old_plan,new_plan)
old_partial=re.search(r'\*\*Partial funding:\*\*.*?(?=\n\n)',md).group(0)
md=md.replace(old_partial,'**Partial funding:** Proposed answer: Yes. A smaller award would support a smaller initial catalog and fewer material types, while preserving student input and a supported design activity. Check existing supplies and storage first. Defer optional trials and additional stock as needed.\n\n**Continuation:** Document material use and replacement costs during the pilot, retain reusable supplies and staff procedures, and identify an approved replenishment source before promising continued stock or expansion. Future replenishment funding is not yet committed.')

j['pages'][3]['paragraphs'][1]=j['pages'][3]['paragraphs'][1].replace('the pilot would evaluate any learning gains','the pilot would review student work using the criteria on page 2')

research='The applicant\'s 2024 Psy.D. dissertation at the University of Southern Maine examined Minecraft Education for teaching fifth-grade geometric volume and assessing students\' understanding. This preparation informs Geometry World\'s connection between building, calculation, explanation, and printable work. Geometry World requires its own evaluation. <link href="https://eric.ed.gov/?id=ED659551">[15]</link>'
collab='Collaboration with educators, administrators, and AI, cybersecurity, and STEM specialists is welcome. Any advisory or shared governance arrangement would be discussed separately with interested parties; no outside expert or institutional partnership is committed by this proposal.'
old_bg=j['pages'][7]['sections'][2]['paragraphs'][1]
j['pages'][7]['sections'][2]['paragraphs'][1:2]=[research,collab]
research_md=research.replace('<link href="https://eric.ed.gov/?id=ED659551">[15]</link>','[[15]](https://eric.ed.gov/?id=ED659551)')
assert old_bg in md
md=md.replace(old_bg,research_md+'\n\n'+collab)

citation='[15] Pomeranz, A. H. (2024). <i>Use of Minecraft Education to Teach 5th Grade Common Core Mathematics Standards Relating to Measurement of Geometric Volume.</i> Psy.D. dissertation, University of Southern Maine. ERIC ED659551.'
j['pages'][7]['footerNote'] += ' Dissertation citation: <link href="https://eric.ed.gov/?id=ED659551">'+citation+'</link>'
md += '\n[[15] Pomeranz, A. H. (2024). *Use of Minecraft Education to Teach 5th Grade Common Core Mathematics Standards Relating to Measurement of Geometric Volume.* Psy.D. dissertation, University of Southern Maine. ERIC ED659551.](https://eric.ed.gov/?id=ED659551)\n'

(R/'packet-content.json').write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(R/'king-bucks-digital-pilot-application.md').write_text(md,encoding='utf-8')
print(json.dumps({'pages':len(j['pages']),'updated':['need','student feedback','responsibilities','evaluation','partial funding','continuation','dissertation background']}))
