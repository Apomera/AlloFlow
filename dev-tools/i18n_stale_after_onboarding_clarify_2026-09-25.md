# Stale translations after the 2026-09-25 onboarding copy pass

The Learning Tools hub descriptions and the Launch Pad footer were rewritten in plain, verb-first English for students (critique and clarify pass, 2026-09-25). Brand names were not changed.

Packs that still held the old English as an untranslated placeholder were refreshed to the new English automatically, the same rule as the 2026-09-03 review: same language, strictly an improvement. The keys below are different. Each has a real translation that now conveys the OLD English meaning. **These need a human translator.** Nothing here was machine-rewritten.

| key | packs | retired English | current English |
| --- | ---: | --- | --- |
| `learning_hub.reading_library_desc` | 63 | Browse picture books, longer reads, textbooks, and primary sources | Find something to read: picture books, longer books, textbooks, and more. |
| `learning_hub.storyforge_desc` | 61 | Create illustrated stories with AI writing tools | Write and illustrate your own stories, with AI help. |
| `learning_hub.sel_desc` | 61 | Social-emotional learning for self-awareness & growth | Learn about feelings, friendships, and making choices. |
| `learning_hub.litlab_desc` | 61 | Bring stories to life with character voices & literary analysis | Hear stories in character voices and talk about what happens. |
| `learning_hub.poettree_desc` | 61 | Write poems with form scaffolds, rhyme & meter analysis, AI feedback | Write poems with help on rhyme, rhythm, and form. |
| `launch_pad.switch_hint` | 61 | You can switch modes anytime from the menu | You can switch anytime from Start & setup. |
| `learning_hub.stem_desc` | 60 | 100+ interactive math & science explorations | Play with 100+ math and science simulations. |
| `learning_hub.lumen_desc` | 2 | Ask questions, inspect exact supporting passages, and save source-grounded notes. | Ask questions about a reading and save notes that point back to the text. |
| `session.error_invalid_code` | 61 | Please enter a valid 4-character code. | Please enter the 5-character class code. |
| `launch_pad.subtitle` | 61 | Choose your learning pathway | Adaptive Levels, Layers, & Outputs |
| `modals.student_entry_sub` | 61 | Enter your Class Codename or Nickname to begin. | Pick a secret codename from the two lists. |
| `sidebar.resource_pack_history` | 59 | Resource Pack History | Your materials |
| `tour.history_title` | 57 | Session History | Class & Materials |
| `tour.history_text` | 59 | History holds the resources in your current workspace. (first sentence) | Class & Materials holds two things. Class groups … (first sentence rewritten; the rest unchanged) |

The footer change matters most: the old line told users to switch modes "from the menu", and the Launch Pad has no menu. The control is **Start & setup** in the header.

The class-code message was factually wrong: class codes are 5 characters (`_alloCleanLiveSessionCode`). The new Student door on the Launch Pad surfaces this message, so translators should fix the number first.

`launch_pad.subtitle` returns to the brand line the source always carried (the expansion of ALLO). The override "Choose your learning pathway" now repeated the Launch Pad's new question, "How will you be using the app today?", directly beneath it.

`modals.student_entry_sub`: the codename step is two pick-lists, so "Enter your ... Codename" told children to type where there is nothing to type.

The History tab was renamed Class & Materials (teachers) or Materials (parents, independent learners); it always held class groups as well as made materials. The new tab labels use new keys, so no existing translation is wrong; only the three rows above changed meaning.
