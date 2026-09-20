"""Add researched access/review language and authentic building screenshots."""
from pathlib import Path
import json
import re
import shutil

ROOT = Path(r'C:\Users\cabba\Documents\Codex\2026-09-08\new-realtime-voice-chat\king-bucks-digital-pilot-2026-09-19')
REPO = Path(r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated')
BACKUP = ROOT / '_qa' / 'before-access-review-building'
BACKUP.mkdir(parents=True, exist_ok=True)
for name in ['packet-content.json', 'king-bucks-digital-pilot-application.md', 'king-bucks-digital-pilot-grant-packet.pdf']:
    if not (BACKUP / name).exists():
        shutil.copy2(ROOT / name, BACKUP / name)
content = json.loads((BACKUP / 'packet-content.json').read_text(encoding='utf-8-sig'))
md = (BACKUP / 'king-bucks-digital-pilot-application.md').read_text(encoding='utf-8-sig')

old_main = content['pages'][0]['paragraphs'][-1]
new_main = ('The grant would fund student materials and approved catalog choices; no software license fees or applicant compensation are requested. AlloFlow is an independent, open-source project developed by the applicant, a PPS school psychologist, with assistance from AI coding agents. District technology and student-privacy review remain pending. Student use in the proposed pilot would follow required approvals, with approved paper or existing digital procedures available as a fallback. Expansion would depend on equitable access, student feedback, reliable operation, and manageable educator workload.')
content['pages'][0]['paragraphs'][-1] = new_main
md = md.replace(old_main, new_main)

world_page = content['pages'][3]
world_page['footerNote'] = ('Current local lesson tools include matching printable worksheets for premade and generated lessons, teacher keys, and saved concept snapshots with captions and reasoning. Worksheets provide space for sketches, calculations, explanations, and revision. Local checks covered all 12 built-in lessons and a generated example; these checks do not establish district approval or production deployment. The next page shows a simple building progression.')
old_learning = re.search(r'\*\*Planned instruction and learning evidence\.\*\*.*?(?=\n\n)', md).group(0)
new_learning = ('**Current lesson tools and learning evidence.** Premade and generated lessons use a shared lesson structure for on-screen activities and printable worksheets, with space for handwritten calculations, sketches, mathematical reasoning, and revision. Teacher keys and a learning record are available. Students can save concept snapshots with captions and reasoning to document a layer, decomposition, or revision. Local checks covered all 12 built-in lessons and a generated example; these checks do not establish district approval or production deployment. Teachers should review the selected lesson and worksheet before classroom use.')
md = md.replace(old_learning, new_learning)

building_captions = [
    'Figure 3a. Build one layer: 4 cubes along one dimension and 3 along the other make 12 unit cubes. Counting rows connects 4 x 3 to the model.',
    'Figure 3b. Add an equal layer: a filled 4 x 3 x 2 rectangular prism contains 12 + 12 = 24 cubic units. Each factor has a visible meaning.',
    'Figure 3c. Preserve the reasoning: a concept snapshot records the model with a caption and explanation. The matching worksheet provides space to calculate and explain by hand.'
]
building_page = {
    'heading': 'Geometry World: build, calculate, explain',
    'blocks': [
        {'type':'p', 'text':'A short example connects construction to volume reasoning. Students predict the cube count, build equal layers, then explain how repeated addition and multiplication describe the same filled prism.'},
        {'type':'columns', 'gap':12, 'columns':[
            {'heading':'1. Make a base layer', 'file':'screenshots/13-geometry-one-layer.png', 'maxHeight':190, 'caption':building_captions[0]},
            {'heading':'2. Add the second layer', 'file':'screenshots/14-geometry-two-layers.png', 'maxHeight':190, 'caption':building_captions[1]}
        ]},
        {'type':'heading', 'text':'3. Capture and explain the relationship'},
        {'type':'columns', 'gap':16, 'widths':[204,296], 'columns':[
            {'file':'screenshots/15-geometry-concept-reasoning.png', 'maxHeight':265},
            {'heading':'Example explanation', 'paragraphs':[
                'One layer contains 4 x 3 = 12 unit cubes. Two equal layers contain 12 x 2 = 24 cubic units. I can check with 12 + 12 = 24.',
                '<b>Follow-up prompt:</b> What changes if you add a third layer? Explain your prediction before building.',
                '<b>Worksheet connection:</b> Sketch and label the layers, show both calculations, and explain why volume is measured in cubic units.'
            ]}
        ]},
        {'type':'p', 'style':'PacketCaption', 'text':building_captions[2]}
    ],
    'footerNote':'Actual Geometry World controls in a local demonstration captured September 19, 2026. The example and reasoning are authored demonstration material, not student work or evidence of learning gains. The same model progresses through the stages; no Gemini account or AI generation is needed for this core building activity.'
}
content['pages'].insert(4, building_page)

source_urls = {
    '10': 'https://www.portlandschools.org/department/technology/google-workspace-for-education',
    '11': 'https://edu.google.com/our-values/privacy-security/frequently-asked-questions/',
    '12': 'https://workspace.google.com/terms/education_terms/',
    '13': 'https://www.portlandschools.org/academic-programs/tech-int',
    '14': 'https://studentprivacy.ed.gov/faq/i-want-use-online-tool-or-application-part-my-course-however-i-am-worried-it-violation-ferpa'
}
def ref(n):
    return f"<link href='{source_urls[str(n)]}'>[{n}]</link>"

provenance = ('AlloFlow is a personal educational project created by Aaron Pomeranz, a Portland Public Schools school psychologist, with substantial assistance from AI coding agents. It is free, open-source software under AGPL-3.0-or-later, intended to support students and educators using existing school infrastructure. The public source is on <link href="https://github.com/Apomera/AlloFlow">GitHub</link>; the <link href="https://alloflow-cdn.pages.dev/app/">browser app</link> is hosted on Cloudflare. No AlloFlow subscription or applicant compensation is requested.')
access = ('Educator preparation and student participation use different routes. PPS documents Google Workspace for Education access, and the applicant reports educator access to Gemini through PPS accounts. Google identifies Gemini for Education as a Core Service; its Education terms incorporate the Cloud Data Processing Addendum. District settings and applicable agreements still govern use. These protections do not themselves approve the separate AlloFlow app. ' + ref(10) + ' ' + ref(11) + ' ' + ref(12))
local = ('Core building and teacher-prepared activities do not require student Gemini access or an AlloFlow subscription. Work and concept snapshots can be saved locally or exported. Optional AI and live teacher views use separate services. The proposed school store uses a separately configured, school-managed Google deployment for shared balances, approved models, and checkout records. Its identity, Sheets, Drive, and receipt-mail data flows require review; the store is not device-only.')
review = ('Student privacy and FERPA considerations are design priorities. Formal district review of the intended configuration, data flows, security, and instructional use remains pending. Collaborator Tyler Despain, a cybersecurity expert, is also reviewing the project; this ongoing work is not a completed audit or district approval. The applicant welcomes demonstrations and review by FPPS and district staff. ' + ref(13) + ' ' + ref(14))
background = ('The applicant\'s work researching Minecraft Education and game-based learning informs Geometry World\'s emphasis on volume concepts, calculation fluency, and mathematical explanation. Collaboration with educators, administrators, and AI, cybersecurity, and STEM specialists is welcome. Any advisory or shared governance arrangement would be discussed separately with interested parties; no outside expert or institutional partnership is committed by this proposal.')
review_page = {'heading':'AlloFlow: access, privacy and collaboration', 'sections':[
    {'heading':'Educator-developed, openly available', 'paragraphs':[provenance]},
    {'heading':'School accounts and the student browser route', 'paragraphs':[access, local]},
    {'heading':'Review status and collaboration', 'paragraphs':[review, background]}
], 'footerNote': 'Sources checked September 19, 2026: [10] PPS Google Workspace page; [11] Google Education privacy FAQ; [12] Education terms, sections 3.5 and 5.2; [13] PPS Tech Integration; [14] U.S. Department of Education guidance on classroom apps. Links appear beside the relevant claims. Applicant-reported access and ongoing reviews are not independent certifications.'}
content['pages'].insert(-1, review_page)

# Renumber existing figures after the new building-process figure.
def renumber(value):
    if isinstance(value, str):
        return re.sub(r'Figure ([345])\.', lambda m: 'Figure ' + str(int(m.group(1))+1) + '.', value)
    if isinstance(value, list):
        return [renumber(x) for x in value]
    if isinstance(value, dict):
        return {k:renumber(v) for k,v in value.items()}
    return value
for idx in [5,6]:
    content['pages'][idx] = renumber(content['pages'][idx])
md = re.sub(r'Figure 3\.', 'Figure 4.', md)

building_md = '\n### Geometry World building process\n\nA short example connects a 4 x 3 base layer to a filled 4 x 3 x 2 prism. Students predict, build, calculate, and explain.\n\n'
for file, caption in zip(['13-geometry-one-layer.png','14-geometry-two-layers.png','15-geometry-concept-reasoning.png'],building_captions):
    building_md += f'![Geometry World building progression](screenshots/{file})\n\n{caption}\n\n'
building_md += '**Example explanation.** One layer contains 4 x 3 = 12 unit cubes. Two equal layers contain 12 x 2 = 24 cubic units. I can check with 12 + 12 = 24.\n\n**Follow-up prompt.** What changes if you add a third layer? Explain your prediction before building.\n\n**Worksheet connection.** Sketch and label the layers, show both calculations, and explain why volume is measured in cubic units.\n\n'
building_md += building_page['footerNote'] + '\n\n'
md = md.replace('### Geometry Sandbox\n', building_md + '### Geometry Sandbox\n')

def xml_to_md(value):
    value = re.sub(r'<link href=[\'\"]([^\'\"]+)[\'\"]>(.*?)</link>', lambda m:f'[{m.group(2)}]({m.group(1)})', value)
    return value.replace('<b>', '**').replace('</b>', '**')
review_md = '## AlloFlow: access, privacy and collaboration\n\n'
for section in review_page['sections']:
    review_md += '### ' + section['heading'] + '\n\n'
    review_md += '\n\n'.join(xml_to_md(p) for p in section['paragraphs']) + '\n\n'
review_md += review_page['footerNote'] + '\n\n'
md = md.replace('## Research rationale\n', review_md + '## Research rationale\n')
sources = [
    ('10','Portland Public Schools. Google Workspace for Education.'),
    ('11','Google for Education. Privacy and Security FAQ.'),
    ('12','Google Workspace for Education Terms of Service, sections 3.5 and 5.2.'),
    ('13','Portland Public Schools. Tech Integration and application review.'),
    ('14','U.S. Department of Education. Guidance on using online tools in classrooms.')
]
md += '\n' + '\n\n'.join(f'[[{n}] {title}]({source_urls[n]})' for n,title in sources) + '\n'

for src, dest in [('01-one-layer.png','13-geometry-one-layer.png'),('02-two-layers.png','14-geometry-two-layers.png'),('03-concept-reasoning.png','15-geometry-concept-reasoning.png')]:
    source = REPO / 'reports/geometry-world-grant-building-2026-09-19' / src
    if not source.exists():
        raise FileNotFoundError(f'Awaiting verified screenshot: {source}')
    shutil.copy2(source, ROOT / 'screenshots' / dest)
(ROOT / 'packet-content.json').write_text(json.dumps(content, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
(ROOT / 'king-bucks-digital-pilot-application.md').write_text(md, encoding='utf-8')
print(json.dumps({'updated':str(ROOT),'planned_pages':len(content['pages'])}))
