"""Add roster: namespace to UI_STRINGS."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').readlines()

ROSTER_STRINGS = """  roster: {
      title: 'Class Roster Key',
      subtitle: 'FERPA-safe \\u00b7 Stored locally only \\u00b7 Never uploaded',
      import: 'Import JSON',
      export: 'Export JSON',
      sync_session: 'Sync to Live Session',
      class_name: 'Class Name',
      new_group_placeholder: 'New group name...',
      add_group: 'Add',
      delete_group: 'Delete Group',
      manage_students: 'Manage Students',
      student_codename: 'Student codename...',
      add_student: 'Add',
      unassigned: 'Unassigned',
      unassigned_students: 'Unassigned Students',
      no_students: 'No students assigned',
      students_in_group: 'Students',
      apply_to_generator: 'Apply to Generator',
      applied: 'Applied settings to generator',
      synced: 'Groups synced to live session',
      sync_error: 'Could not sync roster to session',
      auto_assigned: 'Auto-assigned student(s) to groups',
      grade: 'Grade',
      language: 'Language',
      reading: 'Reading Lvl',
      interests: 'Interests',
      dok: 'DOK Level',
      tts_speed: 'TTS Speed',
      karaoke: 'Karaoke',
      simplify: 'Simplify',
      custom: 'Custom Instr.',
  },
"""

# Insert after groups: closing }, before adventure:
for i, l in enumerate(lines):
    if l.strip().startswith('adventure:') and '{' in l and i > 14960 and i < 14980:
        lines.insert(i, ROSTER_STRINGS)
        print(f'[OK] Inserted roster: namespace at L{i+1} (before adventure:)')
        break

open('AlloFlowANTI.txt', 'w', encoding='utf-8').write(''.join(lines))
print('Done.')
