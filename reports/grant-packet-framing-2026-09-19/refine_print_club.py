from pathlib import Path
import json,re
R=Path(r'C:\Users\cabba\Documents\Codex\2026-09-08\new-realtime-voice-chat\king-bucks-digital-pilot-2026-09-19')
j=json.loads((R/'packet-content.json').read_text(encoding='utf-8-sig'))
md=(R/'king-bucks-digital-pilot-application.md').read_text(encoding='utf-8-sig')
context="The applicant identifies King's 3D print club, using Bambu printers, as the intended printing setting; equipment models, access, supervision, and capacity need confirmation."
team=j['pages'][0]['sections'][0]['paragraphs'][0]
if context not in team: j['pages'][0]['sections'][0]['paragraphs'][0]=team+' '+context
if context not in md: md=md.replace('## Gradual pilot plan','## Gradual pilot plan\n\n'+context,1)
old="Confirm pilot reach, staff roles, and a backup. Review a sliced sample for material use and print time; confirm compatible equipment, supervision, and available weekly capacity."
new="Confirm pilot reach, staff roles, and a backup. Check the club's Bambu models and compatible materials. Review a sliced sample for material use and print time; confirm supervision and available weekly capacity."
j['pages'][1]['sections'][0]['paragraphs'][0]=j['pages'][1]['sections'][0]['paragraphs'][0].replace(old,new)
md=md.replace(old,new,1)
prep=(R/'grant-preparation-sheet.md').read_text(encoding='utf-8')
prep=re.sub(r'A possible research lead for Josh is Joshua Geary.*?\n\n',"The applicant identifies King's 3D print club and Bambu printers as the intended setting. This is the current basis for asking Josh about equipment and capacity; an earlier external business lead is not being used to identify him.\n\n",prep,flags=re.S)
prep=prep.replace('| School/lab equipment | Unconfirmed. | Printer model, material and diameter, lab location, supervising operator, and available time. |',"| School/lab equipment | Applicant reports Bambu printers in King's 3D print club. | Exact models, compatible material and diameter, available access, supervising operator, and time. |")
prep=prep.replace('| Josh, printing collaborator | Applicant reports his interest in participating. Full identity and affiliation are unconfirmed. |','| Josh, printing collaborator | Applicant reports his interest and identifies the intended printing setting as King\'s 3D print club. Full name and official role are unconfirmed. |')
prep=prep.replace('## Form completion','## Ask Josh to complete the printing details\n\nAn unsent [message draft](draft-message-to-josh.md) requests the equipment, suitable materials, capacity, and collaboration details. Attach the current PDF as a working draft; leave the unknown fields open for his input. The request seeks review and practical input, not a signature on unfinished technical details.\n\n## Form completion',1)
(R/'packet-content.json').write_text(json.dumps(j,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
(R/'king-bucks-digital-pilot-application.md').write_text(md,encoding='utf-8')
(R/'grant-preparation-sheet.md').write_text(prep,encoding='utf-8')
note='\n\n### Applicant clarification: King 3D print club\n\nThe applicant reports that King Middle School has Bambu printers and identifies the school 3D print club as the intended printing setting. Exact models, access, staffing, capacity, and Josh\'s full identity remain unconfirmed. The earlier Joshua Geary / 3DSpaceGarden lead is not used in the active preparation sheet or grant. An unsent message draft asks Josh to supply practical details; no external message was sent.\n'
notes_path=R/'grant-framing-research-notes.md'
notes=notes_path.read_text(encoding='utf-8')
if note not in notes: notes_path.write_text(notes+note,encoding='utf-8')
draft="""# Draft message to Josh

Unsent draft | Attach: king-bucks-digital-pilot-grant-packet.pdf

**Subject:** King Bucks grant - input from the 3D print club

Hi Josh,

Thanks for your interest in helping with the King Bucks redesign. I'm preparing a $1,500 FPPS grant for student-informed recognition choices and making materials, including items students could design for a staff-reviewed catalog. Students would also be able to suggest other options.

I've attached the working draft. Could you help fill in a few details so the printing plan and budget are realistic?

- **Equipment and materials:** Which Bambu models would be available, what filament/materials and diameter work well with them, and what supplies does the club already have? Recommended supplier links and rough quantities or prices would help.
- **Capacity and supervision:** What would be a manageable first group of students, number of small items, or weekly print time? Who could supervise and review files, and would this fit the club's existing schedule?
- **Starting designs:** Are there one or two small, practical items we could use to estimate material use and print time? We want room for student ideas while keeping fulfillment manageable.
- **Your involvement:** What name and title or affiliation should I use, and would you be comfortable being listed as a collaborator? What role would you like to take, and would any support or services need to be included in the budget?

The AlloFlow digital component is still awaiting district review; the materials and initial catalog could use approved school procedures while that review proceeds. Your input would help shape the plan before school leadership reviews the final application.

The application deadline is September 30. Even rough estimates, clearly labeled, would help me finish the draft.

Thanks,
Aaron
"""
(R/'draft-message-to-josh.md').write_text(draft,encoding='utf-8')
print(json.dumps({'updated_for':'King 3D print club / Bambu printers, applicant-reported','message':'draft-message-to-josh.md','sent':False}))
