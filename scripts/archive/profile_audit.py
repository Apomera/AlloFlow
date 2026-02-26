"""Deep dive: Student Learning Profile infrastructure in AlloFlow"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')
lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').readlines()

# Comprehensive search for student profile related code
keywords = [
    ('studentProfile', 'Student Profile refs'),
    ('learningProfile', 'Learning Profile refs'),
    ('studentGroup', 'Student Group refs'),
    ('groupProfile', 'Group Profile refs'),
    ('needsGroup', 'Needs Group refs'),
    ('studentNeeds', 'Student Needs refs'),
    ('accommodat', 'Accommodation refs'),
    ('iep', 'IEP refs'),
    ('ell', 'ELL refs'),
    ('readingLevel', 'Reading Level refs'),
    ('gradeLevel', 'Grade Level refs'),
    ('proficiency', 'Proficiency refs'),
    ('homeLanguage', 'Home Language refs'),
    ('nativeLanguage', 'Native Language refs'),
    ('learnerType', 'Learner Type refs'),
    ('difficultyLevel', 'Difficulty Level refs'),
    ('studentData', 'Student Data refs'),
    ('studentInfo', 'Student Info refs'),
    ('studentWelcome', 'Student Welcome refs'),
    ('welcomeWizard', 'Welcome Wizard refs'),
    ('showStudentWelcome', 'Show Student Welcome refs'),
    ('studentInterest', 'Student Interest refs'),
    ('persona', 'Persona refs'),
    ('studentSettings', 'Student Settings refs'),
    ('learnerProfile', 'Learner Profile refs'),
    ('classRoster', 'Class Roster refs'),
    ('roster', 'Roster refs'),
    ('targetGrade', 'Target Grade refs'),
    ('selectedGrade', 'Selected Grade refs'),
    ('selectedRole', 'Selected Role refs'),
    ('hasSelectedRole', 'Has Selected Role refs'),
]

print("=" * 70)
print("  STUDENT PROFILE INFRASTRUCTURE AUDIT")
print("=" * 70)

results = {}
for keyword, label in keywords:
    matches = []
    for i, line in enumerate(lines):
        if re.search(keyword, line, re.IGNORECASE):
            matches.append((i+1, line.strip()[:120]))
    if matches:
        results[label] = matches
        print(f"\n{label}: {len(matches)} matches")
        for ln, text in matches[:5]:
            print(f"  L{ln}: {text}")
        if len(matches) > 5:
            print(f"  ... and {len(matches)-5} more")

print("\n" + "=" * 70)
print("  STATE VARIABLES (useState/useRef with student/profile/group)")
print("=" * 70)

for i, line in enumerate(lines):
    if re.search(r'useState|useRef', line):
        if re.search(r'student|profile|group|grade|level|language|interest|persona|roster|accommodation|role|welcome', line, re.IGNORECASE):
            print(f"  L{i+1}: {line.strip()[:130]}")

print("\n" + "=" * 70)
print("  FIRESTORE COLLECTIONS (student/profile related)")
print("=" * 70)

for i, line in enumerate(lines):
    if re.search(r'collection|doc\(|setDoc|getDoc|updateDoc', line, re.IGNORECASE):
        if re.search(r'student|profile|user|session|roster|group', line, re.IGNORECASE):
            print(f"  L{i+1}: {line.strip()[:130]}")
