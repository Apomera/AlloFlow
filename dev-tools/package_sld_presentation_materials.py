"""Bundle current workshop PDFs and guides, with no slide-deck changes."""
from hashlib import sha256
from html.parser import HTMLParser
from io import BytesIO
import json
from pathlib import Path, PurePosixPath
from urllib.parse import urlsplit, unquote
import zipfile

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
MATERIALS = ROOT / 'output/sld-pdf-materials'
KEYS = ROOT / 'output/sld-facilitator-keys'
OUT = ROOT / 'output/sld-presentation-materials'
NAME = 'SLD-Presentation-Materials-2026-10-13'
QA = ROOT / 'reports/sld-presentation-materials-2026-10-13'

GUIDE = """MAINE SLD WORKSHOP: WORKSHEETS AND FACILITATOR GUIDES
October 13, 2026

FOR ORGANIZERS AND FACILITATORS
This complete package contains answer keys. Do not send this entire ZIP to
participants before the activity. Extract the ZIP before opening its files.

WHAT TO SHARE WITH PARTICIPANTS
Send Share-With-Participants/SLD-Participant-Materials.zip.
It includes the same participant files found in this package's Participants
folder, with no facilitator answers.

Participants can choose either:
- One individual fillable case PDF ending in -participant.pdf, or
- SLD-Participant-Fillable-Case-Pack.pdf: all seven cases in one fillable file.

The complete fillable packet is 81 pages with 182 separate response fields.
Select a case name on its first page to jump to that case. Use Back to case
list at the bottom of any case page to return. PDF bookmarks are also included.
SLD-Participant-Case-Pack.pdf is the nonfillable printing version.
Choose-a-Case.html compares the cases; keep it beside the participant PDFs.
START_HERE-Participants.pdf explains the activity and saving responses.
The official Maine SLD form/checklist is included for reference.

WHAT FACILITATORS SHOULD USE
1. Open Facilitators/START_HERE-Presenters.pdf for setup, timing, the key page
   map and form-routing safeguards.
2. Use SLD-Facilitator-Quick-Reference.pdf while circulating or debriefing.
   It has one page for each case.
3. Use SLD-Facilitator-Worked-Answer-Keys.pdf for all seven detailed model
   responses and rationales. Individual matching keys are also included.
4. Use Facilitator-Keys.html to open a particular key quickly. Keep the keys
   private until participants have explained their reasoning.

CASE PAIRINGS
Participant worksheet                   Matching facilitator key
alex-participant.pdf                    alex-facilitator-key.pdf
alex-general-ed-adequate-participant.pdf alex-general-ed-adequate-facilitator-key.pdf
jordan-participant.pdf                  jordan-facilitator-key.pdf
marisol-participant.pdf                  marisol-facilitator-key.pdf
taylor-participant.pdf                  taylor-facilitator-key.pdf
samira-participant.pdf                  samira-facilitator-key.pdf
avery-participant.pdf                   avery-facilitator-key.pdf

FOR A 45-60 MINUTE PRESENTATION
Have participants select and read one case in advance when possible. Use the
short activity to identify relevant evidence, a limitation, the applicable
form route and a next step. Completing every response box is extended practice,
not a requirement for a 12-minute discussion. Samira supports full Q1-Q9
practice with a complete fictional source record; advance reading is helpful.

BEFORE THE SESSION
Test typing a response, saving, closing and reopening in the PDF reader that
participants will use. Check print preview for long responses. Offer printed
materials or another accessible response format when needed.

All cases are fictional practice materials. The worksheets are not signed
eligibility forms. Use each case's evidence and stated assumptions; do not
invent missing findings or apply one case's conclusion to another case.

This package contains the current worksheet and guide set. It does not include
or change the PowerPoint slide deck. The activity does not require AlloFlow.
"""


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hrefs = []

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            self.hrefs += [value for name, value in attrs if name == 'href']


def verify_html_links(contents):
    for name, payload in contents.items():
        if not name.endswith('.html'):
            continue
        parser = Links()
        parser.feed(payload.decode('utf-8'))
        for href in parser.hrefs:
            url = urlsplit(href)
            if url.scheme or not url.path:
                continue
            target = (PurePosixPath(name).parent / unquote(url.path)).as_posix()
            assert target in contents, (name, href, 'Missing local link target')


def build():
    manifest = json.loads((MATERIALS / 'manifest.json').read_text(encoding='utf-8'))
    key_manifest = json.loads((KEYS / 'manifest.json').read_text(encoding='utf-8'))
    for key in ('samiraRecordSha256', 'samiraKeySha256'):
        assert manifest[key] == key_manifest[key], ('Mismatched source editions', key)
    participant_names = manifest['participantFiles']
    assert len(participant_names) == len(set(participant_names)) == 12
    files = {'Participants/' + name: MATERIALS / 'Participants' / name for name in participant_names}
    files.update({'Facilitators/' + name: MATERIALS / 'Presenters' / name for name in manifest['presenterFiles']})
    for case in manifest['cases']:
        name = case['case'] + '-facilitator-key.pdf'
        files['Facilitators/' + name] = KEYS / name
    files['Facilitators/Facilitator-Keys.html'] = KEYS / 'Facilitator-Keys.html'
    share_name = 'Share-With-Participants/SLD-Participant-Materials.zip'
    files[share_name] = MATERIALS / 'SLD-Participant-Materials.zip'
    contents = {name: path.read_bytes() for name, path in files.items()}
    contents['START_HERE.txt'] = GUIDE.encode('utf-8')

    # Match the shareable ZIP byte-for-byte to the visible participant folder.
    with zipfile.ZipFile(BytesIO(contents[share_name])) as participant_zip:
        assert participant_zip.testzip() is None
        assert len(participant_zip.namelist()) == len(participant_names)
        assert set(participant_zip.namelist()) == set(participant_names)
        for name in participant_names:
            assert participant_zip.read(name) == contents['Participants/' + name]
        assert not any('facilitator' in name.lower() or 'presenter' in name.lower()
                       for name in participant_zip.namelist())
    verify_html_links(contents)
    form = 'Maine_DOE_SLD_Form_and_Checklist.pdf'
    for audience in ('Participants', 'Facilitators'):
        assert sha256(contents[audience + '/' + form]).hexdigest() == manifest['officialFormSha256']
    packet = PdfReader(BytesIO(contents['Participants/SLD-Participant-Fillable-Case-Pack.pdf']))
    assert len(packet.pages) == 81 and len(packet.get_fields()) == 182
    assert all(field.get('/V', '') == '' for field in packet.get_fields().values())
    assert len(packet.outline) == 8
    assert len([ref for ref in packet.pages[0]['/Annots']
                if ref.get_object().get('/Subtype') == '/Link' and '/Dest' in ref.get_object()]) == 7
    assert not any(name.endswith('.pptx') for name in contents)
    assert not any('Participant_Fillable.pdf' in name or 'Facilitator_Guide.pdf' in name for name in contents)

    OUT.mkdir(parents=True, exist_ok=True)
    archive_path = OUT / (NAME + '.zip')
    with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, payload in contents.items():
            archive.writestr(NAME + '/' + name, payload)
    with zipfile.ZipFile(archive_path) as archive:
        assert archive.testzip() is None
        assert set(archive.namelist()) == {NAME + '/' + name for name in contents}
        for name, payload in contents.items():
            assert archive.read(NAME + '/' + name) == payload
    QA.mkdir(parents=True, exist_ok=True)
    verification = {
        'archive': str(archive_path), 'bytes': archive_path.stat().st_size,
        'sha256': sha256(archive_path.read_bytes()).hexdigest(),
        'participantFiles': len(participant_names),
        'facilitatorFiles': sum(name.startswith('Facilitators/') for name in contents),
        'totalEntries': len(contents), 'crcAndExactContents': 'pass',
        'participantOnlyZipMatches': 'pass', 'localHtmlLinks': 'pass',
        'slideDeckIncluded': False,
        'files': {name: {'bytes': len(payload), 'sha256': sha256(payload).hexdigest()}
                  for name, payload in contents.items()},
    }
    (QA / 'verification.json').write_text(json.dumps(verification, indent=2), encoding='utf-8')
    print(json.dumps({key: value for key, value in verification.items() if key != 'files'}, indent=2))


if __name__ == '__main__':
    build()
