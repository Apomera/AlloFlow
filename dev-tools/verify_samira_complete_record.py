"""Check the complete Samira training record and its model-key contract."""

from datetime import date, datetime
import hashlib
import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
RECORD_PATH = ROOT / "dev-tools/samira_complete_record.json"
KEY_PATH = ROOT / "dev-tools/samira_complete_key.json"


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)


def full_text(value):
    return "\n".join(strings(value))


def require(condition, explanation):
    if not condition:
        raise AssertionError(explanation)


def verify():
    record = json.loads(RECORD_PATH.read_text(encoding="utf-8"))
    key = json.loads(KEY_PATH.read_text(encoding="utf-8"))
    require(record["caseId"] == key["caseId"] == "samira", "Wrong case ID")
    sections = {s["id"]: s for s in record["sections"]}
    require(list(sections) == [f"S{i}" for i in range(1, 10)], "S1-S9 source order or uniqueness")
    for source_id, source in sections.items():
        require(source.get("title") and source.get("paragraphs"), f"Empty source {source_id}")

    questions = {q["id"]: q for q in key["sections"]}
    require(list(questions) == [f"Q{i}" for i in range(1, 10)], "Q1-Q9 key order or uniqueness")
    for question_id, question in questions.items():
        for field in ("selection", "entry", "rationale", "evidence"):
            require(question.get(field), f"Missing {question_id} {field}")
        refs = set(re.findall(r"\bS\d+\b", full_text(question)))
        require(refs, f"No source reference for {question_id}")
        require(refs <= set(sections), f"Unknown source reference in {question_id}: {refs}")

    require(len(questions["Q1"].get("parts", [])) == 8, "Q1 must address all eight academic areas")
    require(len(questions["Q3"].get("parts", [])) == 4, "Q3 needs four primary-cause determinations")
    q4_parts = questions["Q4"].get("parts", [])
    require(len(q4_parts) == 4, "Q4 needs four evidence streams")
    for part in q4_parts:
        require(part.get("strengths") and part.get("weaknesses"), "Empty Q4 evidence cell")
    require(len(sections["S4"]["table"]["rows"]) == 8, "Source achievement review omits an area")

    key_text = full_text(key)
    record_text = full_text(record)
    for phrase in (
        "STAGE 2 ONLY", "under the stipulated", "full-record assumptions",
        "actual processing reports are absent", "complete evaluation is stipulated",
        "full-record pattern stipulated", "assume the complete review",
    ):
        require(phrase.lower() not in key_text.lower(), f"Stale missing-record premise: {phrase}")
    require(re.search(r"not a controlled(?: causal)? experiment", record_text), "Keep instructional-comparison limitation")
    require("not asserted to represent" in record_text, "Keep linguistic norm-representativeness limitation")
    require("no adult reading" in full_text(sections["S4"]), "Distinguish reading comprehension from listening")
    require("regular Grade 4 classroom" in full_text(sections["S7"]), "Q5 needs regular-classroom evidence")
    require("signature" in record["completionNote"].lower(), "Include certification practice limits")

    # These dates and totals are explicit case fixtures, not eligibility deadlines or dosage rules.
    header = full_text(record["headerRows"])
    birth_match = re.search(r"January \d{1,2}, 2017", header)
    meeting_match = re.search(r"October \d{1,2}, 2026", header)
    require(birth_match and meeting_match, "Missing fictional birth or meeting date")
    birth = datetime.strptime(birth_match.group(), "%B %d, %Y").date()
    meeting = datetime.strptime(meeting_match.group(), "%B %d, %Y").date()
    evaluation = date(2026, 9, 16)
    age_months = (evaluation.year - birth.year) * 12 + evaluation.month - birth.month
    age_months -= evaluation.day < birth.day
    require(divmod(age_months, 12) == (9, 8), "Age must be 9 years 8 months at September 16 testing")
    require(date(2026, 8, 24) < date(2026, 9, 4) <= evaluation < meeting, "Consent/evaluation/meeting chronology")

    progress_dates = [datetime.strptime(r[0], "%B %d, %Y").date() for r in sections["S3"]["table"]["rows"]]
    require(progress_dates == sorted(set(progress_dates)), "Progress dates must increase without duplication")
    require(progress_dates[-1] < meeting, "Progress records must precede the meeting")
    s3 = full_text(sections["S3"])
    session_match = re.search(r"Of (\d+) planned sessions, (\d+) occurred: (\d+)/(\d+) in spring and (\d+)/(\d+) in fall", s3)
    require(session_match, "Intervention delivery totals need parsable spring/fall detail")
    planned, delivered, spring_done, spring_plan, fall_done, fall_plan = map(int, session_match.groups())
    require(spring_plan + fall_plan == planned == (9 + 5) * 4, "Planned sessions disagree")
    require(spring_done + fall_done == delivered, "Delivered sessions disagree")
    require(planned - delivered == 2 + 3, "Missed-session explanation disagrees")
    require("Rania received the results" in s3, "Document parent receipt of repeated progress data")
    require(date(2026, 9, 18).weekday() == 4 and date(2026, 9, 21).weekday() == 0, "Observation/next-school-day chronology")
    s7 = full_text(sections["S7"])
    require("September 21" in s7 and re.search(r"next[- ]school[- ]day", s7.lower()), "Friday follow-up must identify the next school day")
    require((date(2026, 9, 28) - date(2026, 9, 21)).days == 7, "Delayed retention probe interval")

    expected_composites = {
        "WISC-V Nonverbal Index (NVI)": "102",
        "WISC-V Visual Spatial Index": "105",
        "WISC-V Fluid Reasoning Index": "103",
        "WISC-V Processing Speed Index": "98",
        "CTOPP-2 Phonological Awareness": "79",
        "CTOPP-2 Phonological Memory": "94",
        "CTOPP-2 Rapid Symbolic Naming": "82",
    }
    actual_composites = {row[0]: row[1] for row in sections["S5"]["table"]["rows"]}
    require(actual_composites == expected_composites, "Processing composite fixtures changed; review the key and assessment rationale")
    q4d = full_text(q4_parts[3])
    for score in ("79", "82"):
        require(re.search(rf"\b{score}\b", q4d), f"Q4d must verify documented processing weakness {score}")
    require("CTOPP-2" in q4d and "WISC-V" in q4d, "Q4d must name its processing measures")

    return {
        "caseId": "samira",
        "status": "passed",
        "sourceCount": len(sections),
        "questionCount": len(questions),
        "academicAreas": 8,
        "separatePrimaryCauseDeterminations": 4,
        "strengthWeaknessCells": 8,
        "evaluationAge": "9 years 8 months at September 16, 2026",
        "sessions": {"planned": planned, "delivered": delivered},
        "recordSha256": hashlib.sha256(RECORD_PATH.read_bytes()).hexdigest(),
        "keySha256": hashlib.sha256(KEY_PATH.read_bytes()).hexdigest(),
        "scope": "Internal source/key structure and fictional chronology regression check; not independent clinical, psychometric, legal or PDF-layout certification.",
    }


if __name__ == "__main__":
    print(json.dumps(verify(), indent=2))
