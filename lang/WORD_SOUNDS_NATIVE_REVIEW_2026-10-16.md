# Word Sounds: native review of the 2026-10-16 additions

On 2026-10-16, 74 new `word_sounds.*` keys were added to all 63 packs, in `lang/` and its three mirrors. They cover the microphone answer panel, the Sound Sort, Sound Mapping and Isolation screen-reader names, the teacher syllable-count review, the readiness warning about generated words, and the header and tooltips.

The translations were written by Claude, working from each pack's existing Word Sounds vocabulary. Every value was machine-checked for:

- placeholders identical to the English;
- `/{sound}/` and `/…/` kept as written;
- the pack's own AAC abbreviation;
- the header title equal to the pack's `sidebar.tool_wordsounds`.

No value was left in English except `modal_title` where the pack's tool name is still English. None of this was reviewed by a native speaker. This file lists where a native speaker should look first.

## Review first

1. **The two spoken prompts in every pack:** `syllable_blending_prompt` and `syllable_counting_prompt`. Text-to-speech reads them aloud to 5–8 year olds, so listen to them, don't just read them.
2. **Low-confidence packs** (whole pack needs review): `chin_falam` (low), `karen` and `marshallese` (low–medium), `chin_hakha` (medium–low), `acholi` (medium; teacher `count_*` strings lowest), `kirundi`, `lingala`, `igbo`, `hausa`.
3. **`maay_maay` is provisional.** The pack is written in Standard Somali, not Af-Maay, and that is still a pending decision.

## Pack-wide problems found while translating (not caused by this change)

These need one decision per pack, not a per-key fix.

**The word for "syllable" also means something else in several packs:**
- `somali` and `maay_maay`: xarfaha = letters.
- `urdu`: حرف = letter.
- `telugu`: అక్షరం = letter.
- `karen`: ကလုၢ် = voice.
- `burmese`: three competing terms.
- `gujarati`: સિલેબલ vs શબ્દાંશ.
- `kannada` / `malayalam`: the activity names use the letter word.

The new strings mostly reuse each pack's existing term so they stay consistent. Some teacher strings use the precise term instead. The notes below say which.

**The tool name (`sidebar.tool_wordsounds`, which `modal_title` copies) is broken or untranslated:**
- `chinese_traditional` mixes in Simplified characters (單词发音; correct form 單詞發音).
- `tagalog` reads "mga salita Word Sounds" (suggested: "Mga Tunog ng Salita").
- `hmong` reads "lo lus Word Sounds".
- English in `karen`, `chin_hakha`, `chin_falam`, `marshallese`, `acholi`, `hausa`, `maay_maay`.

Fix the sidebar value and `word_sounds.modal_title` together.

**Older Word Sounds strings that are garbled or half-English:**
- `urdu`: e.g. `mode_sound`, `mic_switch_mic`.
- `farsi`, `dari`, `pashto`: Arabic/Urdu machine artifacts.
- `italian`, `greek`, `tagalog`, `indonesian`, `latin`, `igbo`, `acholi`: half-English.
- `kirundi`: Kinyarwanda spellings.

**Locale drift:**
- `portuguese_portugal` is largely Brazilian Portuguese; the new strings are European Portuguese.
- `lingala` uses "Bomba" for both hide and save.
- `japanese` child strings elsewhere use casual 〜てね; the new ones use です・ます per the pack guide.
- `vietnamese` and `thai`: the pronoun for the child varies within the pack.

## Per-language notes from the translators


### Acholi: notes on the 74 Word Sounds keys

Overall confidence: medium for the child-facing strings, medium-low for the teacher syllable-count review strings (count_*). A native Acholi reviewer should check this pack before it is relied on. No English fragments were copied in. The only English left is the loanword "microphone" and modal_title (explained below).

## Low-confidence keys

- **modal_title** = "Word Sounds" (English). The validator requires it to match the pack's `sidebar.tool_wordsounds`, and that value is English, so the tool name has never been translated in this pack. That needs a pack-level decision. A possible name is "Dwan pa Nyig Lok".
- **syllable_counting_prompt** uses "Goy cing" (clap hands, from *goyo* = to strike). The existing activity label `activity_syllable_counting` says "Payo Cing i Bute Acel Acel", and I could not confirm "payo". A reviewer should pick one verb and use it in both strings.
- **mic_help_aria, mic_no_answer_heard, mic_capture_failed**: "microphone" stays as a loanword. The pack writes "Microphone" everywhere and there is no common Acholi word for it.
- **mic_use_buttons** is "Dii me yero lagam" ("press to choose the answer"). I paraphrased to avoid the English word "button".
- **mic_capture_failed**: "ocung ma pe kigeno" ("stopped unexpectedly"). The phrasing is unverified.
- **chip_drag_or_listen**: "bok" (box) is a loan. The pack already uses it for comic panels.
- **phoneme_chip_aria** is "Dwan {sound}" (sound). I did not use the pack's `sr_phoneme` wording "Dwan pa coc", which reads as "sound of writing".
- **instructions_on_title / instructions_off_title**: "Cik tye ka tic" / "Cik pe tye ka tic". These follow the pack's `common.on` / `common.off` ("TYE KA TIC" / "PE TIC").
- **count_listened, count_changed_audio, count_needs_review, count_save_next** use "imoki" / "Moki", the imperative of *moko* (to confirm), which the pack uses as "confirm/verify". The verb morphology is not verified.
- **count_dictionary_retry**: "buk me waco lok" ("book of saying words") describes a pronunciation dictionary rather than naming it.
- **count_remember**: "jami man" ("this thing/equipment") is a generic word for "this device". "kabedo me gwoko wel" stands for "count library".
- **count_without_recording_help**: "iromo dwoko alokaloka man" ("you can reverse this change") stands for "undo".
- **manip_type_deletion / manip_type_substitution**: "Kwanyo Dwan Woko" / "Loko Dwan". The second matches the pack's Sound Swap label "Loko Dwon".
- **Orthography**: I used "dwan" throughout. The pack mixes "dwan" and "dwon".

### amharic — notes (Word Sounds, 74 keys)

- Count = "ብዛት" (number of syllables) in the count_* keys. "ቁጥር" would also work.
- Masculine singular informal "you" (ተጠቀም, ሰማኸው) follows the existing pack.
- Sound is spelled "ድምፅ" throughout. The pack mixes ድምፅ and ድምጽ, and the tool name uses ድምፆች.
- count_remember "የብዛት ቤተ መጻሕፍት" (count library) is a literal rendering of a technical idea. Low confidence.
- aac_overlay_*: "overlay" is left out ("የAAC ምልክቶች", AAC symbols), because "ተደራቢ" is unfamiliar to most families.

### Burmese (burmese): reviewer notes

Overall confidence: medium-high. Child-facing strings use a warm colloquial register (တယ်, ဖို့, ဒီ). Teacher strings use a formal written register (သည်, ရန်, ဤ). The mix is intentional.

Keys to check first:

- **Syllable term (all syllable keys).** Child strings (`syllable_needs_review`, `syllable_blending_prompt`, `syllable_counting_prompt`) use အသံပိုင်း ("sound part") so a 5-year-old can follow. Teacher strings (`count_*`) use ဝဏ္ဏ, the standard grammar term. The existing pack's activity names use a third term, သီးခြားအသံ (for example "Syllable Claps" = သီးခြားအသံအလိုက် လက်ခုပ်တီးခြင်း), which literally means "separate sound" and can be confused with a phoneme. A reviewer should pick one term for the whole pack.
- `manip_type_deletion`, `manip_type_substitution`: "phoneme" is the transliteration ဖိုနိမ်း, matching the pack's loading_phonemes. `phoneme_chip_aria` uses plain အသံ because children hear it.
- `count_changed_audio`, `count_variants`: the TTS "voice" is written အသံအမျိုးအစား ("type of voice") to keep it apart from အသံ (audio).
- `count_source_curated`: "word bank" is written စကားလုံးစုစာရင်း.
- `count_remember`: "count library" is written အရေအတွက် မှတ်တမ်း ("count record"), not "library".
- `count_recording_exclusion_undo`: written as "put the recording back into use".
- `sort_starts_with_hidden`, `sort_ends_with_hidden`: colloquial headings (/…/ နဲ့ စတယ် / ဆုံးတယ်). Use the formal ဖြင့် if headings should be written style.
- `aac_overlay_*`: "overlay" is written ပြသမှု ("display").

### Chin Falam (chin_falam): reviewer notes

Overall confidence: **low.** Falam (Laizo) is a distinct language from Hakha. However, this pack's existing Word Sounds entries are near-copies of the Hakha ones: the same biafang, lehnak, zirhtu, hlathlai, Ṭhan in Ngaih, and so on. To stay consistent with the pack, these strings closely follow the Hakha translation. Where the Falam pack has its own attested forms, I used them:

- thuh (hide), from common.hide
- dingh (stop), from common.stop
- kut tin (clap), from activity_syllable_counting "Ṭhen Kuttin"
- siam (make/generate), from behavior_lens "Siam a si"
- hmanrua (device/tool)
- "zeizat na theih" without Hakha's question particle "dah"

**A Falam speaker should review every key**, especially for:

- Whether Hakha forms (biafang, lehnak, ngai, theih, a si maw, awkah, ahcun, hlan ah, cawnnak, fehter, zohkhenh) should be replaced by Falam forms. Examples: "thu" for word, "letnak" for answer, and Falam imperative endings such as "rawh", which appear elsewhere in the pack.
- `syllable_counting_prompt` and `syllable_blending_prompt` are spoken by TTS: check that they sound natural in Falam.
- `modal_title` = "Word Sounds" in English, because it must equal the untranslated sidebar.tool_wordsounds.
- Every lexical choice listed in chin_hakha.notes.md (button = hnenhnak, box = kuang, on/off = a ṭuan, AAC limceu langhternak, chimning, cazin, chimtu aw) applies here too.
- `generating_sounds`: "Aw siam lio..." differs from the pack's "Siasat lengah…" (generating). Check which is natural.

### Chin Hakha (chin_hakha): reviewer notes

Overall confidence: **medium-low.** This is Latin-script Hakha (Laiholh) using the pack's Word Sounds vocabulary: biafang (word), aw (sound), biafang ṭhen (syllable, from the pack's "Biafang Ṭhen Pehtonhnak"), zirhtu (teacher, as in the Word Sounds glossary), lehnak (answer) and cawnnak (lesson).

Pack-level issue: `modal_title` = "Word Sounds" in English, because it must equal the sidebar.tool_wordsounds value, which is untranslated.

Keys to check first:

- `syllable_counting_prompt` (spoken by TTS): uses "kut beh" for "clap", taken from the pack's "Ṭhen Pakhat cio ah Kut Beh". Check that it is the natural verb.
- `syllable_blending_prompt` (spoken): "pakhat ah pehtonh hna" ("join them into one").
- `mic_use_buttons`: "button" is the coined hnenhnak ("thing to press"). The pack uses the English "button".
- `mic_help_aria`, `mic_*`: "microphone" is "maikrofon", the pack's a11y spelling.
- `chip_drag_or_listen`: "box" is kuang, "drag" is kai (from the pack's "a kai khawhmi thil"), and "click" is hnen.
- `instructions_on_title`, `instructions_off_title`, `aac_overlay_*`: on/off are rendered "a ṭuan / a ṭuan lo" ("working / not working"). "AAC Symbol Overlay" is rendered "AAC limceu langhternak" ("AAC picture display"), because I found no settled Hakha word for "symbol".
- `count_dictionary_retry`, `count_*`: "pronunciation" is chimning; "dictionary" is "chimning biafang cauk" (a descriptive phrase).
- `count_listened`, `count_*`: "confirm" is fehter.
- `count_source_curated`, `review_gap_unverified_words`: "word bank" and "word list" are both rendered "biafang cazin". Check that cazin is understood as "list".
- `count_changed_audio`, `count_variants`: the TTS "voice" is rendered "chimtu aw" ("speaker's voice").
- `count_audio_retry`, `count_stop_preview`: "play audio" is "aw chuahter", from the pack's play_syllables. The pack's play_word uses "Lentecel", which means playing a game.
- `mic_capture_failed`: "unexpectedly" is "ruahlo in".
- `sort_ends_with_hidden`: "a dongmi" for "ends with".
- `mapping_slot_empty`: "a lawng" for "empty". The pack uses "a hoihmi" elsewhere, which looks wrong.
- `garden_vocab_words`: "student" is siangngakchia. The Word Sounds glossary uses "zirlai" in voice-pack labels.

### chinese_traditional notes

- modal_title: copied exactly as required from sidebar.tool_wordsounds = "單词发音". That existing value mixes Simplified characters (词, 发) into a Traditional pack. Correct Traditional would be "單詞發音" (or Taiwan-style "單字發音"). Fix sidebar.tool_wordsounds and modal_title together if the pack owner agrees.
- Word choice: used Taiwan-standard 單字 (word), 音訊 (audio), 裝置 (device), 復原 (undo), 載入 (load) per the guide's Taiwan preference. The existing pack mixes these with mainland forms (單詞, 音頻, 設備, 撤銷).

### Gujarati notes

- The teacher count_* strings use «શબ્દાંશ» for "syllable", taken from the pack's sr_tap_count_syllables. The pack's syllable_range uses the transliteration «સિલેબલ» instead. Children's strings keep «અક્ષર», like the existing activity names. If the pack standardises on «સિલેબલ», swap the term in the count_* keys.

### hausa — notes (Word Sounds, 74 keys)

- modal_title = "Word Sounds": the pack's sidebar.tool_wordsounds is in English, and the validator requires an exact match. A Hausa tool name (for example "Sautukan Kalmomi") would need sidebar.tool_wordsounds changed first.
- Syllable = "ɓangare / ɓangarorin kalma" (part of a word), which follows most of the pack's Word Sounds keys. The linguistic term "gaɓa / gaɓoɓi" also appears once in the pack. A Hausa educator may prefer it.
- phoneme_chip_aria "Sauti {sound}" and manip_type_* "Cire Sauti" / "Musanya Sauti": Hausa has no common word for phoneme, so "sauti" (sound) is used. The pack's sr_phoneme "Furuci" means pronunciation, so I did not reuse it.
- mapping_slot_*: "Gurbi" is used for slot. This is low confidence for UI use.
- count_dictionary_retry: "ƙamus na furuci" (pronunciation dictionary). The pack also uses "ƙamus" for vocabulary, so I wrote garden_vocab_words as "kalmomin ɗalibi" to avoid confusing the two.
- Masculine singular "ka" is used for "you", following the pack.

### Hmong (hmong): reviewer notes

Overall confidence: medium-high. This is White Hmong (Hmoob Dawb) in RPA, matching the pack: lo lus, suab, xib fwb, tub ntxhais kawm, mloog, npuaj teg, and koj for the child.

Pack-level issue: `modal_title` = "lo lus Word Sounds" because it must equal the pack's sidebar.tool_wordsounds. That value is a machine artifact, half Hmong and half English. Recommend fixing the sidebar label and this key together, for example to "Suab Lo Lus".

Keys to check first:

- **Syllable vs sound.** Syllables are counted with the classifier "lub suab" (as in the pack's "Npuaj Teg Rau Txhua Lub Suab"), and a phoneme is plain "suab". Because "suab" also covers audio, voice and recording, the teacher strings (`count_*`) depend on context. "Syllable count" is "tus lej suab". Check that teachers read it as a syllable count.
- `mic_*`: "microphone" is "lub mic", the pack's loanword.
- `mic_use_buttons`: "button" is "khawm".
- `manip_type_substitution`: "Pauv Suab" ("exchange sound"). I avoided "Hloov Suab" because the pack already uses it for the Sound Swap activity name.
- `instructions_off_title`, `aac_overlay_on_title`: "kaw" means both "turn off/close" and "record". Context should make it clear.
- `count_dictionary_retry`: "pronunciation dictionary" is rendered "phau ntawv txhais kev hais lus".
- `count_source_curated`: simplified to "Cov lo lus uas tshuaj xyuas lawm" ("reviewed words"); "word bank" has no common term.
- `count_remember`: "count library" is rendered "cov lej suab no".
- `syllable_needs_review`: ends with the softener "nawb". Drop it if it feels too casual.

### Igbo: notes on the 74 Word Sounds keys

Overall confidence: medium-high for the child-facing strings, medium for the teacher syllable-count review strings. I kept the pack's vocabulary: ụda (sound), okwu (word), nkejiokwu (syllable; the pack also has "nkebiokwu" once), azịza (answer), onye nkuzi (teacher), nwa akwụkwọ (student), ndekọ / dekọọ (recording / record), maịkrọfọn, Gee ntị, Họrọ, Pịa, Dọkpụrụ, Lelee, Chekwaa, Zoo, Gosi, Foním, Okwu Nzuzo, nkuzi (lesson). Like the pack, I used dotted vowels and no tone marks. The existing Igbo word_sounds strings include many half-English values; the new strings are fully Igbo.

## Low-confidence keys

- **instructions_on_title / instructions_off_title**: "Ntuziaka AGBANYE" / "Ntuziaka GBANYỤRỤ", mirroring the pack's `common.on` / `common.off`.
- **aac_overlay_on_title / aac_overlay_off_title**: "mkpuchi akara AAC" ("cover/overlay of AAC symbols") is a coined term.
- **count_dictionary_retry**: "akwụkwọ ọkọwa mkpọpụta okwu" ("pronunciation dictionary") describes rather than names it.
- **mapping_slot_filled / mapping_slot_empty**: "Oghere" (gap/space) for "slot".
- **count_remember**: "ọbá ọnụọgụ" ("count library") is a coined term.
- **count_spoken_saved / count_audio_retry**: the "teacher-spoken" option is rendered as "onye nkuzi na-ekwu (okwu ahụ) n'ọnụ" ("the teacher says it aloud").

### S'gaw Karen (karen): reviewer notes

Overall confidence: **low to medium.** This is written in S'gaw Karen script, following the pack's own Word Sounds vocabulary where it exists. A native S'gaw reviewer should read **every** teacher string (`count_*`). The child strings are short, but they are the most important to get right.

Pack-level issues (not changed):

- `modal_title` = "Word Sounds" in English, because it must equal the pack's sidebar.tool_wordsounds, which is itself untranslated. Recommend translating the sidebar label and this key together.
- The pack mixes ၥ် and ာ် spellings (for example ကွံာ် 191 times and ကွံၥ် 136 times). Words borrowed from the pack keep the pack's spelling (ဘံၣ်တံၥ်, ဆဲးကၠုၥ်, ကျိၥ်); new words use ာ်.

Priority checks:

- `syllable_counting_prompt` (spoken by TTS): uses အါမနုၤ for "how many" and ဒိစုပၢ် for "clap". I am unsure of both.
- **Syllable term.** This follows the pack's Word Sounds names: တၢ်ကတိၤအကလုၢ် (as in Syllable Blending/Claps). But ကလုၢ် also means "voice". That collides in `count_changed_audio`, `count_variants`, `count_audio_retry`, `count_spoken_saved` and `count_spoken_option`, where "voice" also appears. The Reading Library uses တၢ်ကတိၤအကူာ် instead. Decide on one term.
- **Save.** I used the pack convention ပာ်ဖျါ (common.save, used about 390 times in the pack) for "save", and ပာ်ကီၤ for "kept/remember". Please confirm that ပာ်ဖျါ really means "save" and not "display".
- `mic_help_aria`, `mic_no_answer_heard`, `mic_capture_failed`: "microphone" is the Burmese-script loan မိုက်ခရိုဖုန်း, copied from the pack (voice_pack_msg_mic_blocked). A Karen spelling may be preferred.
- `mic_use_buttons`: "button" is တၢ်ဆဲးနီၣ် (from the pack's behavior_lens).
- `chip_drag_or_listen`: "box" is ဒၢ.
- `count_dictionary_retry`, `count_review_saved`, `count_variants`, `count_confirmation`, `count_without_recording_help`: "pronunciation" is a descriptive phrase I built, တၢ်စံးထီၣ်အသီၣ် ("saying out the sound"). "Dictionary" is လံာ်ခီပညီ.
- `say_word`: "un-scrambled" is rendered as "the word you arranged correctly" (ရဲၣ်လီၤ).
- `spelling_bee_typing_note`: uses ဒိကနၣ်ဆိ ("listen first"), and "scored" is rendered as "counted" (ဂံၢ်).
- `aac_overlay_*`: "symbol" is တၢ်ပနီၣ်, and on/off follow the pack's common.on/off (အိး / ကး).
- `manip_type_deletion`, `manip_type_substitution`: descriptive ("removing a sound" / "putting another sound in its place"). The second avoids repeating the existing Sound Swap label ဆီတလဲအသီၣ်.
- `count_recording_exclusion_undo`: written as "use the recording again".
- `all_done_today`: uses တနံၤအံၤ for "today". The pack's STEM tools use မုၢ်မဆါတနံၤ, which looks wrong.
- `review_gap_unverified_words`: "worth a look" is written ကြၢးကွၢ် ("should look"). "Teaching" is သိၣ်လိ.

### Kinyarwanda: notes on the 74 Word Sounds keys

Overall confidence: medium-high for the child-facing strings, medium for the teacher syllable-count review strings. I kept the pack's vocabulary: amajwi/ijwi (sound), ijambo/amagambo (word), uduce tw'ijambo / agace (syllable), igisubizo (answer), umwarimu (teacher), umunyeshuri (student), mikoro, cyangwa, Hitamo, Kanda, Kurura, Ongera ugerageze, Genzura, Bika, Hisha, Erekana, Fonema, Ijambo Ry'ibanga.

## Low-confidence keys

- **instructions_on_title / instructions_off_title**: "Amabwiriza ARAKORA" / "Amabwiriza NTAKORA". These are modelled on the pack's `common.on` / `common.off` ("BIKORA" / "BIDAKORA"), with the verb agreeing with *amabwiriza*.
- **Recording terms (count_*)**: "amajwi yafashwe" (recorded audio) and "gufata amajwi". The pack's voice-pack strings use "Andika/kwandika", which also means "write/type", so I avoided it here to keep recording and typing apart.
- **Syllable term**: "uduce tw'ijambo" is the pack's dominant term. The pack also contains "silabe" and "imisaze", which I did not use.
- **count_dictionary_retry**: "inkoranyamagambo y'imivugire". *Imivugire* (manner of pronouncing) also stands for "pronunciation" elsewhere (count_variants, count_review_saved and others). It is understandable but slightly coined.
- **count_remember**: "ubu bubiko bw'imibare" for "this count library" is descriptive.
- **aac_overlay_on_title / aac_overlay_off_title**: "Ibimenyetso bya AAC biri ku bisubizo" ("AAC symbols on the answers") describes the overlay rather than translating "overlay" literally.
- **mic_use_buttons**: "buto" is a loan, as the pack already uses.
- **all_done_today** is "Twarangije Uyu Munsi" ("we have finished today").

### Kirundi: notes on the 74 Word Sounds keys

Overall confidence: medium-high for the child-facing strings, medium for the teacher syllable-count review strings. I deliberately used Kirundi forms, not Kinyarwanda ones. Each form below is already used elsewhere in this kirundi pack (SEL hub, stem, common):

- inyishu (answer), not igisubizo
- canke (or), not cyangwa
- umwigisha / umunyeshure (teacher / student)
- amajambo (words), not amagambo
- igitigiri (number), guharura (to count)
- the -zo- future
- vy- / c- concords: vyose, vyompi, c'uduce
- ng'aha (here), nimba (if), umusi (day), kubandanya (to continue), giturumbuka (suddenly)
- agasandugu (box), ikibanza (place/slot), imfashanyo (help), Hitamwo (choose), kwugurura (to open/load)

## Low-confidence keys and pack issues

- **syllable_counting_prompt**: "Koma amashi" (clap). This matches the pack's `stem.music.clap` "Gukoma amashi". The existing word_sounds label `activity_syllable_counting` "Gukoma Amashyi ku Buri Kace" uses the Kinyarwanda spelling *amashyi*; that existing label should be fixed.
- **spelling_bee_typing_note**: "indome" (letters), the Kirundi word used elsewhere in this pack. The existing word_sounds strings use "inyuguti", the Kinyarwanda word (Inyuguti Ibuze, Gukurikira Inyuguti). The pack needs one consistent choice.
- **Existing pack problems (not changed, outside this task)**: several existing Kirundi word_sounds values are Kinyarwanda copies, such as decoding_drag_prompt ("...uyishyire ... cyangwa ..."), speak_or_tap_mic ("igisubizo cyawe") and counting_drop ("Shyira igisubizo cyawe hano"). Many others are half-English, such as "How many amajwi?" and "Put amajwi together".
- **instructions_on_title / instructions_off_title**: "Amabwirizwa ARAKORA" / "Amabwirizwa NTAKORA", modelled on `common.on` / `common.off` ("BIRAKORA" / "NTIBIKORA").
- **sort_ends_with_hidden**: "Arangira na /…/". *Kurangira* is used in Kirundi ("vyarangiye"). The alternative is "Aheza na /…/".
- **count_dictionary_retry**: "inkoranyamajambo y'uko amajambo avugwa" ("dictionary of how words are said") is descriptive.
- **count_save_conflict**: "Igitigiri ntikirahuza" ("does not yet match") stands for "still conflicts".
- **count_recording_exclusion_undo / count_recording_excluded**: "Garukana" / "kuyagarukana" (bring back). Moderately confident.
- **set_as_correct_aria / set_as_correct_hint**: "inyishu nziza" (the right answer). The pack's `correct` is "Vyiza".
- **mic_use_buttons**: "buto" is a loan.

### Lao (lao): reviewer notes

Overall confidence: medium-high. Vocabulary follows the pack: ຄຳ, ສຽງ, ພະຍາງ (syllable), ໜ່ວຍສຽງ (phoneme), ຄູ, ນັກຮຽນ, ເຈົ້າ for the child, ທ່ານ for the teacher.

Keys to check first:

- `aac_overlay_on_title`, `aac_overlay_off_title`: "Symbol Overlay" is shortened to ສັນຍາລັກ AAC ("AAC symbols"), so the idea of an *overlay* is dropped. Check it is still clear.
- `count_changed_audio`, `count_variants`: the TTS "voice" is written ສຽງຜູ້ອ່ານ ("reader's voice") so it is not confused with ສຽງ (audio). Check that it reads naturally.
- `count_source_curated`: "word bank" is written ຄັງຄຳສັບ. Confirm this is the term teachers use.
- `count_remember`: "count library" is written ຄັງຈຳນວນພະຍາງ. This is a descriptive rendering.
- `count_recording_exclusion_undo`: written as "bring the recording back into use" (ນຳສຽງບັນທຶກກັບມາໃຊ້ຄືນ) rather than a literal "undo exclusion".
- `manip_type_deletion`, `manip_type_substitution`: phonemic-awareness terms built on ໜ່ວຍສຽງ. Check them against local ESL/bilingual teacher usage.
- `spelling_bee_typing_note`: "not scored as spelling" is written ບໍ່ນັບເປັນການສະກົດ ("not counted as spelling").
- ບັນທຶກ means both "save" and "record" in Lao. The teacher strings depend on context to tell them apart (`count_save`, `count_review_saved` and the recording strings).

The existing pack still has English Word Sounds entries (Sound Sort, Spelling Bee, Blend Sounds, and others). They were not touched; they are out of scope.

- New Latin words with no fixed standard: aac_overlay_* "stratum symbolorum" (overlay), mic_use_buttons "pulsantia" (buttons, as in toasts.tagged_pdf_saved_see_report), count_stop_preview "praeauditio" (audio preview), count_source_curated "thesaurus verborum" (word bank). Written without macrons, as in the pack's cleaner word_sounds strings.

### Lingala: notes on the 74 Word Sounds keys

Overall confidence: medium-high for the child-facing strings, medium for the teacher syllable-count review strings (count_*). I kept the pack's vocabulary: mongongo/mingongo (sound), liloba/maloba (word), biteni ya liloba (syllables), eyano (answer), molakisi (teacher), moyekoli (student), makomi (recording), liteya (lesson). Tone marks follow the pack's partial habit (acute accent on imperatives such as Yoká, Poná, Finá). I used ɛ/ɔ where the pack does.

## Low-confidence keys

- **mic_heard_answer, count_review_title**: French-style « » quotation marks, as is usual in Congolese print.
- **mic_use_buttons**: "ba butɔ" (buttons) is a loan, matching the pack's existing "ba butɔ".
- **instructions_on_title / instructions_off_title**: "Malako ezali kosala" / "ezali kosala te" ("instructions are working / not working"). The pack's `common.on` / `common.off` use "EZALI" / "ESIKI", which seemed too terse here.
- **hide_word** is "Kobomba liloba". In this pack *bomba* means both "hide" and "Save" (`common.save` = "Bombá"). I used the infinitive, as the existing `anchor_hide` does, to reduce the ambiguity, but a reviewer may prefer a different verb for "hide".
- **practice_again** = "Meka Lisusu", which is the same wording as `mic_try_again`. The pack uses *komeka* for practice ("Komeka na Ndako"). The alternative is "Yekolá lisusu".
- **count_dictionary_retry**: "buku ya ndenge ya kolobela maloba" describes a pronunciation dictionary rather than naming it.
- **count_remember**: "esaleli" (tool) for "device" and "ebombelo ya mitango" for "count library" are descriptive.
- **count_changed_audio**: "audio or voice" became "makomi oyo ya mongongo to mongongo oyo ya molobi" ("this recording or this speaker's voice").
- **count_without_recording_help**: "okoki kozongisa yango ndenge ezalaki" ("you can put it back as it was") stands for "undo".

### maay_maay — notes (Word Sounds, 74 keys)

**All values are PROVISIONAL.** The existing maay_maay pack is written in Standard (Northern) Somali, not Maay Maay, pending a human decision. These 74 values follow the pack and are written in Standard Somali. They are almost identical to out/somali.json. If the pack is later rewritten in real Maay (Af-Maay), all 74 keys need a Maay speaker.

Where this file differs from somali.json, it follows the existing maay_maay pack:
- modal_title = "Word Sounds" (the pack's sidebar.tool_wordsounds is English). Kept as the validator requires.
- mystery_sound "Dhawaaq Qarsoon" matches the pack's "Eray Qarsoon" (Somali pack: "Ereyga Qarsoon").
- practice_again "Mar kale tababar" matches the pack's "Tababar Guriga" for home practice.
- "Dhagayso" (listen) spelling, "Mar kale isku day" word order and "Fooniim" (phoneme) match the pack's sr_phoneme, retry and listen_again.

Low-confidence or open points:
- Syllable is written as "qaybaha erayga" (parts of the word) in every syllable key. The pack's Word Sounds section mostly says "xarfaha" (letters), which is wrong for syllables. A phonics tool should not call syllables letters, so I did not copy it. A Somali or Maay educator should confirm the term.
- Undo is written "Dib u celi" (Somali standard). The pack's common.undo is "Beddel dib", which looks like a machine translation.
- instructions_on_title / instructions_off_title / aac_overlay_*: "daaran" / "damsan" are used for on and off, like a light or a device. Please confirm this reads naturally.

### Marshallese (marshallese): reviewer notes

Overall confidence: **low to medium.** The orthography follows the pack's dot-below convention: ḷ ṃ ṇ ọ, plus ñ ā ō ū. The official MOD orthography uses ļ m̧ ņ o̧ n̄; convert if the pack ever standardises. Vocabulary follows the pack: naan (word), ainikien (sound), ṃōttan naan (syllable, as in "Kobaik Ṃōttan Naan"), rūkaki (teacher), rūkkatak (student), uwaak (answer), kōjparok (save), etale (review/check) and rekoot (recording).

Pack-level issue: `modal_title` = "Word Sounds" in English, because it must equal the untranslated sidebar.tool_wordsounds.

Keys to check first:

- `mic_confirm_question`: "Ke men in eo kwaar ba?" I am unsure of the yes/no question structure.
- `syllable_counting_prompt` (spoken by TTS): "Jete ṃōttan naan kwōj roñ? Kabbokbok juon alen ñan kajjojo". The clap verb "kabbokbok" comes from the pack.
- `mic_use_buttons`: "button" is the loanword "batin". I am not sure it is the common form.
- `chip_drag_or_listen`: "box" is the loanword "bōkōj" (uncertain), "drag" is "kanōke" (from the pack), and "click/tap" is "jibwe" instead of the pack's English "klik".
- `hide_word`: "Ṇọṇak" is copied from the pack's common.hide. I could not verify it.
- `mic_*`: "microphone" is "maikorōbōn", the pack's spelling.
- `instructions_on_title`, `instructions_off_title`, `aac_overlay_on_title`: on/off are rendered "rej jerbal / rejjab jerbal" ("working / not working", as in the pack's physics on/off). "Turn off" is "kune".
- `aac_overlay_*`: "symbol" is "kakōḷḷe".
- `count_source_curated`, `review_gap_unverified_words`: "word bank" and "word list" are "laajrak in naan". Check this word for "list/collection".
- `count_remember`: "approval" is "mālim" (permission), "copied" is "kopiik", and "count library" is "bok in oran".
- `count_save_conflict`, `count_recording_conflict`, `count_variants`: "conflicts / matches" is rendered with "jekdọọn".
- `count_changed_audio`, `count_variants`: the TTS "voice" is "ri-kōnono" ("speaker"), to keep it apart from ainikien (sound).
- `count_recording_excluded`, `count_recording_exclusion_undo`: "undo" is rendered "kōjepḷaaktok" ("bring back"). The pack's own undo label is "Jolok" (discard).
- `spelling_bee_typing_note`: "scored" is "bwini" (points).
- `mic_capture_failed`: "stopped unexpectedly" is rendered "ear bōjrak make" ("stopped by itself").

### pashto notes

- syllable_counting_prompt: "clap once" is rendered "یو ځل چکچکه ووهه" (the pack's syllable_counting activity uses "چکچکی"). A native check of the spoken form for a 5-year-old is worth it; "لاسونه سره وټکوه" is the alternative.
- Many existing pashto word_sounds strings in the glossary are machine-garbled Arabic/Urdu (e.g. "ترتیب آاوازیں", "در حال إنشاء"); the new strings use standard Afghan Pashto (څپه = syllable, فونیم, مایکروفون, ثبت) and do not copy those forms.

### somali — notes (Word Sounds, 74 keys)

Low-confidence keys and why:
- **All syllable keys** (syllable_*, count_*, the spoken prompts): syllable = "qaybaha erayga" (parts of the word), a plain description that families understand. The pack is inconsistent. Its Word Sounds section mostly says "xarfaha" (letters), which is wrong in a phonics tool. Settings and immersive say "maqdar", a poetry/grammar term few parents know. sr_tap_count_syllables already uses "qaybaha erayga". A Somali educator should pick one term for the whole pack.
- instructions_on_title / instructions_off_title / aac_overlay_*: "daaran" / "damsan" mean on / off, as for a light or a device.
- mapping_slot_filled / mapping_slot_empty: "Meesha" (place) is used for slot. There is no established Somali UI term.
- count_remember: "maktabaddan tirooyinka" (this count library) is a literal rendering of a technical idea.
- Spelling follows the pack's most common forms: "Dhageyso", "Imisa", "eray/erayga".

- modal_title: set to "mga salita Word Sounds" because it must equal the pack's sidebar.tool_wordsounds exactly. That existing value is a broken machine translation (half Tagalog, half English). A clean name would be "Mga Tunog ng Salita" (matching studio_title "Studio ng Tunog ng Salita"). If you fix it, change sidebar.tool_wordsounds and modal_title together.
- count_source_curated: "Nasuring word bank". "word bank" is left as the English teaching term Filipino teachers use; "bangko ng salita" sounds unnatural.

### telugu notes

- count_* keys (teacher), count_answer, count_variants: "syllable" is అక్షరం, as the pack already uses for syllable_range and the syllable activities. In Telugu అక్షరం also means "letter", so "అక్షరాల సంఖ్య" could be read as a letter count. If teachers find it ambiguous, a pack-wide switch to a distinct term (e.g. "అక్షరాంశం") would be needed, not just in these keys.

### tigrinya — notes (Word Sounds, 74 keys)

- mic_try_again and every "retry": I used "ደጊምካ ፈትን" (native Tigrinya, from ui_common.try_again). The pack's Word Sounds section often uses "እንደገና ፈትን", which is Amharic-influenced.
- Student = "ተማሃራይ", which follows the Word Sounds section (the pack also has "ተምሃራይ").
- mic_use_buttons "መጠወቒታት" (buttons): this is the common Eritrean UI term. Low confidence for Ethiopian Tigrinya readers.
- count_recording_exclusion_undo "ነቲ ቅዳሕ መልሶ" (bring back the recording) gives the meaning of "undo exclusion" rather than a word-for-word translation.
- count_remember: "ቤተ-መጻሕፍቲ ቁጽርታት" (count library) is a literal rendering of a technical idea.
- syllable_counting_prompt "ኣጣቕዕ" (clap). Please check that it sounds natural when read aloud by TTS.

### Urdu notes

- syllable_needs_review, syllable_blending_prompt, syllable_counting_prompt: the children's strings use «حرف» for "syllable" to match the pack's existing child-facing names (activity_syllable_counting «حرفوں پر تالی», listen_to_syllables «حرفوں کو سنو»). «حرف» really means "letter", so a reviewer may want to change the whole pack to something else.
- Teacher count_* strings use the linguistic term «ہجا» (oblique plural «ہجوں») for "syllable". Its plural «ہجے» is the same word as "spelling", so I avoided that form, and spelling_bee_typing_note uses «املا» for "spelling". The pack's syllable_range «نطاق مقاطع» is Arabic and was not reused.
- Quotation marks: I used « » to match the pack's existing pattern (لفظ «{word}» کے لیے مدد).
- Not my keys, but seen while reading: several existing Urdu word_sounds values are garbled (for example mode_sound «آاوراز», mic_switch_mic «میکراورفاورن», listening «در حال انہیںسہاور گیااع...»). They need a separate repair pass.

### yoruba — notes (Word Sounds, 74 keys)

Full tone marks are used throughout, matching the pack's well-formed entries (Ìró Ọ̀rọ̀, Sílébù, Fóníìmù).

- Sound = "ìró", following the tool name and activity names. The pack also uses "ohùn" for some sounds and for voice. Here "ohùn" means audio or voice (count_* keys).
- Microphone = "gbohùngbohùn" (common.microphone, the standard term). The Word Sounds section's mic_switch_mic uses the short form "Gbohùn".
- mic_use_buttons "bọ́tìnì" is a loanword. The spelling varies (bọ́tìnnì).
- count_dictionary_retry "ìwé atúmọ̀ pípè ọ̀rọ̀" (pronunciation dictionary) is descriptive. There is no fixed term.
- count_recording_exclusion_undo "Dá ìgbàsílẹ̀ náà padà" (restore the recording) gives the meaning of "undo exclusion".
- sort_starts_with_hidden / sort_ends_with_hidden: "Ó bẹ̀rẹ̀ pẹ̀lú /…/" (it starts with) is used as a heading.

---

# Rounds 2 and 3 (2026-10-17): every remaining Word Sounds key

On 2026-10-17 every pack received the 124 older `word_sounds.*` keys it had never had, covering:

- the readiness and pre-flight warnings;
- the review-panel gap and fix messages;
- the syllable-count results and taps;
- the lesson preview;
- the unsaved-syllable dialogs.

Every pack also received 17 keys from the "Prepared lesson audio and repair" panel, which had been hardcoded English until then. All 63 packs now hold all 768 `word_sounds` keys. The method and the machine checks are the same as round 1. Every new value also passed the coverage audit (0 invalid, 0 placeholder mismatches), and none was reviewed by a native speaker.

Two English strings were corrected before translation, so the source tables match what the lesson preview actually shows:

- `readiness_limits` now says the check covers "prepared audio and syllable counts".
- `readiness_recovery` now says to choose "Repair prepared lesson".

In every pack, `readiness_recovery` names its two buttons exactly as that pack's `preview_teacher_review` and `pack_repair_button` values.

## Review first (rounds 2–3)

1. **Activity names that are still English or half-English in the packs.** The new strings use proper translations, so they now differ from the on-screen activity buttons until these labels are fixed:
   - `activity_sentence_match` ("Picture the Sentence"): English in every pack.
   - `activity_word_families`: half-English in many packs (e.g. "शब्द Families", "maneno Families", "λέξη Families", "단어 Families").
   - `back_to_setup`: half-English in most African and several other packs.
   - `prepared_audio_repair_label` (the panel title): English in most packs.
   - Italian activity labels: machine-mixed ("parole Families", "Sound Ordina").
   - Esperanto: Sound Sort is "Sonorigado", which means "ringing".
2. **The same low-confidence packs as round 1:** chin_falam, karen, marshallese, chin_hakha, acholi, kirundi, lingala, igbo, hausa; and maay_maay is provisional.
3. **Words that mean two things in a pack:**
   - lingala and acholi: "repair" and "prepare" (bongisa / yubo).
   - lingala: "Bomba" (hide/save).
   - karen: ကလုၢ် (syllable/voice).
   - hmong: "suab" (sound/syllable/voice).
   - polish: „nagranie” (clip/recording).
   - telugu: అక్షరం (syllable/letter).
4. **Terms to settle across a pack:**
   - russian: «упражнение» vs «задание» for activity.
   - lingala: "device" (aparɛyi vs esaleli).
   - dutch: teacher register (u vs je).
   - amharic: polite vs informal "you" for teachers.

## Per-language notes from the round 2 and 3 translators


### acholi

**Round 2:**


Confidence: medium for the children's strings, medium-low for the teacher readiness and review strings. A native Acholi reviewer should check this pack before it is relied on. No English fragments were copied in. Loanwords: intanet, sekond (seconds), koma (comma), alama (score/mark), kad (card), bao (board), and "Kokoro" and "K-2", which must stay.

Vocabulary follows yesterday's notes: dwan, nyig lok, bute (syllables), lagam, lapwony, latin kwan / lutino kwan, coyo dwan (recording), pwony (lesson), tic (activity), Rot, Moki, Yer, Winy, Tem doki, wel (count), jami (device), cal (picture), alokaloka (changes).

New terms:
- pack = "pwony ma kiyubo" (the prepared lesson); setup = "kabedo me yubo pwony"; clip = "coyo dwan".
- "App audio banks / device cache" are described as "dwan ma kigwoko i intanet / i jami".
- Activity labels: "Loko Dwon" (spelled as on the pack's Sound Swap button) and "Kwan ci Ryek" (Read & Match). Word Families became "Doggola pa Nyig Lok" (the pack label is half-English). Picture the Sentence became "Lok i Cal" (coined).

- **readiness_* / preview_ready**: "tye atera" for "ready".
- **count_taps_one / _other**: "Idiyo tyen {count}." (from *dii*, to press). It is the same in both forms. **count_result_attempt_one / _attempts**: "temo tyen {number}", also the same in both forms.
- **sentence_review_required / review_gap_sentence_audio**: "sentence" is described as "lok ma tiyo ki nyig lok man" or "lok".
- **review_fix_stalled / review_fix_retry**: "kekeni" for "by hand". **skip_unscored_continue**: "Kal" (pass over) for "skip".
- **manipulation_unscored_review, reading_unscored_review**: "pe kibimiyo alama" for "will not be scored".
- **adaptive_evidence**: "Tek pa tic" for difficulty. **count_result_counts**: "ma myero bed" for "expected".
- **review_gap_rhyme / review_gap_edited**: "bao" for board. **review_gap_tiles**: "kabedo me kad" for "tray".
- **count_wait_teacher, count_review_required, count_teacher_instruction**: "lapwonyi" (your teacher).

**Round 3:**


Confidence: medium-low (teacher panel strings). A native Acholi reviewer should check them. Vocabulary follows rounds 1-2: dwan, coyo dwan (clip/recording), bute, pwony ma kiyubo, Rot, Yer, Winy, Nyut, leb, jami, intanet, bao (board), "ma peya ipoko" (before sharing).

- **pack_repair_button** "Yub pwony ma kiyubo": *yubo* means both "repair" and "prepare", and earlier rounds use "kiyubo" for "prepared". So the button reads "fix the prepared lesson". A reviewer may prefer a separate verb for "prepare" (for example *yiko*). readiness_recovery repeats the button name exactly.
- **voice**: "dwan pa lawac" (the speaker's voice), because *dwan* alone also means sound or audio.
- **pack_maint_intro**: "This list" became "Gin ma tye kany" (what is here). "Separate app recordings" became "coyo dwan mapat ma pe tye kany" (separate recordings that are not here). "App" is not translated.
- **pack_cancel_update** "Juk loko dwan" ("stop changing the audio") stands for "audio update". **readiness_recovery / repair_summary**: "updated lesson" is "pwony ma kiloko" (changed lesson). "Flagged items" is "gin ma kiketo lanyut iye" (marked items).
- **pack_maint_repair_summary** uses the present tense ("Yubo loko…") for "Repair will update…".
- **pack_maint_language_unspecified** "Pe kiwaco" (not stated). **pack_maint_voice_auto** "Pire kene" comes from universal.translations_auto_plain.
- **pack_review_clips**: "sources" is "kama coyo dwan oa iye" (where the clip came from).

### amharic

**Round 2:**


- Teacher strings use the informal masculine "you" (ገምግም, ከማጋራትህ), as in round 1 and the rest of the Word Sounds section. The polite form (-ዎ / ይ-…-ሉ) appears elsewhere in the pack. Decide this once for the whole pack.
- Word Families and Picture the Sentence have half-English pack labels, so the new strings say «የቃላት ቤተሰቦች» and «ዓረፍተ ነገሩን በሥዕል».
- Pack = "ጥቅል", device cache = "ጊዜያዊ ማከማቻ", rhyme = "ቤት የሚመታ": descriptive, low confidence.
- preview_start "እንቅስቃሴ ጀምር": the pack's start/start_activity "ጀምር ተግባር" has the verb first, which is machine word order.

### bengali

**Round 2:**


- review_gap_tiles: "Picture the Sentence" is kept in English, quoted, because the pack's activity_sentence_match label (and every sentence_match_* string) is still English, so it matches what the teacher sees. If the pack later translates that label, update this key to match.
- word_families_skipped_for_students: the pack label is half-English ("শব্দ Families"); I used "শব্দ-পরিবার" (as in editing_word_family). The label itself needs fixing.
- readiness_category_feedback / _phoneme / _isolation / _speech: short category labels for audio-clip groups. Their meaning comes only from the key names (feedback clips, phoneme clips, sound-position prompts, word/text speech). Medium confidence.
- শব্দাংশ is used for "syllable" in both teacher and children's strings, as yesterday's Bengali round did.

**Round 3:**


- "Speech clips" (pack_maint_intro, pack_maint_repair_summary, readiness_recovery) is rendered as "pronunciation clips" (উচ্চারণ ক্লিপ), a new term: the pack has no word for it, and it keeps these word/sentence clips apart from the syllable recordings and from "Speech sounds" (কথ্য ধ্বনি). Medium confidence.
- "Shared speech sounds" in pack_maint_intro is rendered as "common/general" (সাধারণ), because the pack's word for "share" means sending the lesson to students.
- Placeholders in pack_maint_voice_summary and pack_maint_repair_summary follow a label or sit in parentheses, so numbers need no plural agreement.

### burmese

**Round 2:**


Overall confidence: medium-high. Same split as round 1: teacher strings use the formal written register (သည်, ပါသည်); activity-screen strings that children may see (`manipulation_*`, `*_review_required`, `count_wait_*`, `count_taps_*`) use the colloquial register (တယ်, ပါ). Syllable is ဝဏ္ဏ for teachers and အသံပိုင်း for children, as in round 1. "Pack" = အထုပ် (from voice_pack), "setup" = သင်ခန်းစာ ပြင်ဆင်မှု.

Low-confidence keys:

- `review_gap_tiles`: the pack's "Picture the Sentence" label is still English, so I named it “ဝါကျအတိုင်း ပုံစီပါ”. Word Families is “စကားလုံးမိသားစု”; the pack label is half English ("စကားလုံး Families").
- `readiness_limits`, `readiness_preflight_*`: "cache" is written ယာယီမှတ်ဉာဏ် (cache).
- `review_pack_stopped`, `review_pack_recovered`: "rate limit" is အသုံးပြုမှု ကန့်သတ်ချက်.
- `readiness_category_phoneme`: "Speech sounds" is စကားသံများ. Round 1 used the transliteration ဖိုနိမ်း for "phoneme"; check which one teachers expect.
- `count_result_delivery_unknown`: written as "no record of how the word was said".

### chin_falam

**Round 2:**


Overall confidence: low. As in round 1, this follows the Hakha translation (out2/chin_hakha.json), because the pack's Word Sounds section is largely Hakha. I swapped in the Falam forms the pack attests:

- bansiar (cancel)
- hlonh (discard)
- kirter (undo)
- dingh (stop)
- siam (make/generate)
- hmanrua (device)
- "Rel law Pehtlaih" (Read & Match)

A Falam speaker should review every key. Everything listed in chin_hakha.notes.md applies here too: ṭialning, remhnak, Lehrulhnak, tlakchamnak, Second 30, the coined “Biafang Bu Limceu”, and limceu where the Falam pack's common.image uses "Lim". I also kept the Hakha forms fehter and khawl, which round 1 used, even though the Falam pack's common section has Cohlang (confirm) and Khong (save).

**Round 3:**


Overall confidence: low. As in rounds 1-2, this follows the Hakha translation (out3/chin_hakha.json), because the pack's Word Sounds section is largely Hakha. The pack's preview_teacher_review is the Hakha string "Zirhtu: Biafang le Aw Zohkhenh", so readiness_recovery quotes it exactly. I swapped in these Falam forms that the pack attests:

- bansiar (cancel)
- siam / siamnak (generate)
- hmanrua (device)
- "Aw vialte" (all clips), from the pack's glossary.filter_all "Vialte"

A Falam speaker should review every key. Everything in out3/chin_hakha.notes.md applies here too: chimmi aw, biafang ṭhen hawng hlun, "hmelchunh a ngeimi thil", "thlen cangmi cawnnak", "Thim a si lo" and "Amah te in". I kept fehter and khawl from the earlier rounds, even though the Falam pack's common section has Cohlang (confirm) and Khong (save).

### chin_hakha

**Round 2:**


Overall confidence: medium-low. Round 1 vocabulary is kept: biafang, aw, biafang ṭhen, zirhtu, zirlai, cawnnak, rian, zoh/zohkhenh, fehter, khawl, hnen. New terms come from the pack where it has them: pak (pack), biafang bu (sentence), tuanbia (story), limceu (picture), cafang (letter), cawl/hloh/hlavh (cancel/undo/discard), and timh (prepare).

Low-confidence keys:

- `preparation_options`, `taught_spellings_help`, `coverage_review` and others: "spelling" is the coined ṭialning ("way of writing"), built like the pack's chimning ("pronunciation"). The pack itself only has ṭialnak ("writing").
- Setup is "cawnnak remhnak" ("lesson setup"), from the pack's "AI remhnak".
- `readiness_category_feedback`: Lehrulhnak is a guess.
- `readiness_preflight_send`, `readiness_preflight_start`: "limitations" is tlakchamnak. `review_pack_*`: "rate limit" is "hmanning tlakchamnak (rate limit)".
- `readiness_checking`: "Second 30" follows the pack's loanword.
- `review_gap_tiles`: the pack's "Picture the Sentence" label is still English, so I named it “Biafang Bu Limceu”. Word Families is “Biafang Chungkhar”.
- `adaptive_evidence`: "moves one step" is "ke pakhat in a thlen". Check that it reads naturally.

**Round 3:**


Overall confidence: medium-low. The vocabulary follows rounds 1-2: aw (audio/clip), cawhmi aw (recording), chimtu aw (TTS voice), holh (language), biafang ṭhen (syllable), remh (repair, from count_repair_recording), zohkhenh (review), khawl (save), thlah (share), ṭhan in ser (regenerate) and cawl (cancel).

Low-confidence keys:

- `readiness_recovery`, `pack_maint_intro`, `pack_maint_repair_summary`: "speech clips" is chimmi aw ("spoken audio"). This keeps it apart from holh aw ("Speech sounds", readiness_category_phoneme).
- `readiness_recovery`, `pack_maint_repair_summary`: "syllable boards" is "biafang ṭhen hawng" (hawng = the pack's word for "board"), and "older" is hlun. "Updated lesson" is "thlen cangmi cawnnak" ("changed lesson"). "Fill" is chap ("add").
- `readiness_recovery`: "flagged items" is "hmelchunh a ngeimi thil" ("items that have a mark"). "Open" is hong (from the pack's guided.resource_shelf_open).
- `pack_maint_voice_summary`: "have no saved voice/language information" is rephrased as "the voice/language was not saved" (khawl a si lo).
- `pack_maint_language_unspecified`: "Thim a si lo" ("not chosen"). `pack_maint_voice_auto`: "Amah te in" (from the pack's universal.translations_auto_plain).
- `pack_review_clips`: "sources" is hrampi (from a11y.storyforge_ui_source).
- `pack_maint_intro`: "list" is cazin, as in rounds 1-2.

### chinese_simplified

**Round 2:**

- review_gap_tiles: the pack's activity label activity_sentence_match ("Picture the Sentence") is still English, so I translated the name myself (“句子配图”). It will not match the activity picker until that label is translated too (or swap in the English name).
- readiness_category_*: these name kinds of audio clips (feedback, instructions, sound-position prompts). I worked out the meaning from code context, so the wording is a best guess.

### chinese_traditional

**Round 2:**

- review_gap_tiles: the pack's activity label activity_sentence_match ("Picture the Sentence") is still English, so I translated the name myself (「句子配圖」). It will not match the activity picker until that label is translated too (or swap in the English name).
- word_families_*: I reused the pack's activity label 「單詞家族」 so it matches the UI. Everything else uses Taiwan-style 單字. If the label is ever changed to 單字家族, update these two keys to match.

### dari

**Round 2:**


- review_gap_tiles, word_families_skipped_for_students: the pack's own labels for Picture the Sentence (English) and Word Families (English or garbled) are not usable, so these strings name the activity in a new translation. Until activity_sentence_match / activity_word_families are fixed, the teacher sees a different name on the activity button.
- readiness_category_isolation (Sound position prompts) is a label for a group of audio clips (first/middle/last sound prompts); rendered as 'questions about the sound's position'.
- Dari vocabulary kept distinct: شاگرد, آواز, قاموس, کوشش, قصه, کامه, انترنت, امریکایی, کنترول, polite forms in نمایید.
- Sound Swap keeps the pack's existing label «جابه‌جایی صداها» (uses صدا, while the rest of Dari uses آواز).
- count_taps_*, undo_tap: 'tap' rendered as ضربه زدن.

### dutch

**Round 2:**


- Register: teacher strings use "u", to match yesterday's count_* strings on the same screens. The pack overall mostly uses "je" (about 4,000 vs 400), so this is a pack-wide decision.
- Child strings use "je juf of meester" for "your teacher"; teacher-facing labels use "leerkracht".
- review_gap_tiles: `activity_sentence_match` is still English in the pack; translated as ‘Plaatjes bij de zin’. Align the label with it.
- readiness_category_feedback kept as "Feedback" (the normal Dutch word).

### esperanto

**Round 2:**

- petolimo (rate limit) and kaŝmemoro (cache) are reasonable coinages but not fixed terms. "Picture the Sentence" (untranslated in the pack) is rendered „Bildigu la Frazon“.
- Several count strings use "Label: {count}" or a verb ("{count} ripariĝis") so the -j plural agreement never breaks when count is 1.
- The pack's activity_sound_sort "Sonorigado" means "ringing". It is not used here, but it should become e.g. "Ordigo laŭ Sono".

### farsi

**Round 2:**


- review_gap_tiles, word_families_skipped_for_students: the pack's own labels for Picture the Sentence (English) and Word Families (English or garbled) are not usable, so these strings name the activity in a new translation. Until activity_sentence_match / activity_word_families are fixed, the teacher sees a different name on the activity button.
- readiness_category_isolation (Sound position prompts) is a label for a group of audio clips (first/middle/last sound prompts); rendered as 'questions about the sound's position'.
- count_taps_*, undo_tap, count_teacher_instruction: 'tap' rendered as ضربه زدن (standard touchscreen term); a native check for 5-year-olds is worth it.

### french

**Round 2:**


- review_gap_tiles: the pack still has "Picture the Sentence" (activity_sentence_match) in English; I coined "La phrase en images". Align when that label is translated.
- readiness_limits, readiness_recovery: translated the source2 English; the code fallback is newer (mentions syllable counts and "Repair prepared lesson"), so these may need a refresh.

### french_canadian

**Round 2:**


- review_gap_tiles: the pack still has "Picture the Sentence" (activity_sentence_match) in English; I coined "La phrase en images". Align when that label is translated.
- readiness_limits, readiness_recovery: translated the source2 English; the code fallback is newer (mentions syllable counts and "Repair prepared lesson"), so these may need a refresh.
- Used "paquet" for the student pack and "mémoire cache" (Québec usage); the existing voice-pack strings say "pack".

### german

**Round 2:**


- review_gap_tiles: the pack's activity label `activity_sentence_match` is still English ("Picture the Sentence"); translated here as „Bild zum Satz“. Align the label with it.
- word_families_skipped_for_students: the pack label `activity_word_families` is garbled ("Wort Families"); I used „Wortfamilien“. The label needs fixing too.
- "board" (review_gap_rhyme, review_gap_edited) is rendered as „Aufgabe“ (task), not as a literal game board.
- Plural students = „Lernende“; the pack elsewhere uses „Schüler“ / „Schülerin/des Schülers“. Child strings say „deine Lehrerin oder dein Lehrer“, teacher strings say „Lehrkraft“.
- none: „Keine“. There is no usage context, so the gender is a guess.

### greek

**Round 2:**

- review_gap_tiles: the pack has no Greek name for "Picture the Sentence" (activity_sentence_match is still English). I used «Η Πρόταση σε Εικόνες»; align with activity_sentence_match if that key is translated later.
- word_families_skipped_for_students: the pack's activity_word_families is half-English ("λέξη Families"). I wrote «Οικογένειες Λέξεων»; that label should be fixed to match.
- "setup" is rendered "ρύθμιση" (review_pack_*, review_gap_*, *_review_needed). The pack's back_to_setup is still "Πίσω σε Setup".
- readiness_limits / readiness_recovery: translated from source2 `en`; the code's inline fallback is newer, longer wording (syllable counts, "Repair prepared lesson").

### gujarati

**Round 2:**


- review_gap_tiles: "Picture the Sentence" is kept in English, quoted, because the pack's activity_sentence_match label (and every sentence_match_* string) is still English, so it matches what the teacher sees. If the pack later translates that label, update this key to match.
- readiness_category_feedback / _phoneme / _isolation / _speech: short category labels for audio-clip groups. Their meaning comes only from the key names (feedback clips, phoneme clips, sound-position prompts, word/text speech). Medium confidence.
- Syllable terms follow yesterday: શબ્દાંશ for teachers, અક્ષર for children. Activity names use the pack's labels (અવાજ બદલો, વાંચો અને જોડો, શબ્દ પરિવારો).

**Round 3:**


- "Speech clips" (pack_maint_intro, pack_maint_repair_summary, readiness_recovery) is rendered as "pronunciation clips" (ઉચ્ચાર ક્લિપ), a new term: the pack has no word for it, and it keeps these word/sentence clips apart from the syllable recordings and from "Speech sounds" (બોલાતા ધ્વનિઓ). Medium confidence.
- "Shared speech sounds" in pack_maint_intro is rendered as "common/general" (સામાન્ય), because the pack's word for "share" means sending the lesson to students.
- Placeholders in pack_maint_voice_summary and pack_maint_repair_summary follow a label or sit in parentheses, so numbers need no plural agreement.

### haitian_creole

**Round 2:**

- "anrejistre" means both save and record in IPN Kreyòl. In syllable strings that also mention recordings I used "sove" for "saved" (as in the pack's voice_pack_save "Sove e itilize") to avoid ambiguity.
- readiness_category_feedback "Kòmantè sou repons yo" and "Picture the Sentence" «Fraz an Imaj» are my renderings (no existing pack term).

### hausa

**Round 2:**


- readiness_preflight_unknown: preview = "samfoti" (a loanword used in software). The pack's own preview strings are garbled ("Pbita"). Low confidence.
- Pack = "fakiti", clips = "guntayen sauti", device cache = "ma'ajiyar wucin-gadi", app = "manhaja". These are descriptive.
- Rhyme = "kari", from the pack's Rhyme Time "Lokacin Karin".
- review_fix_fixed / _unchanged / _requested are lower-case pieces that the app joins with commas, so "ba a canza {count} ba" wraps the number.
- Word Families and Picture the Sentence have half-English pack labels, so the new strings say "Iyalan Kalmomi" and "Jimla a Hoto".
- The masculine "ka" is used, as in round 1.

### hindi

**Round 2:**


- review_gap_tiles: "Picture the Sentence" is kept in English, quoted, because the pack's activity_sentence_match label (and every sentence_match_* string) is still English, so it matches what the teacher sees. If the pack later translates that label, update this key to match.
- word_families_skipped_for_students: the pack label activity_word_families is half-English ("शब्द Families"), so I wrote "शब्द परिवार" (the same word the pack uses in editing_word_family). The label itself needs fixing.
- readiness_category_feedback / _phoneme / _isolation / _speech: short category labels for audio-clip groups. Their meaning comes only from the key names (feedback clips, phoneme clips, sound-position prompts, word/text speech). Medium confidence.
- Syllable terms follow yesterday: शब्दांश in teacher/result strings, अक्षर in children's strings (count_review_required, count_teacher_instruction).

**Round 3:**


- "Speech clips" (pack_maint_intro, pack_maint_repair_summary, readiness_recovery) is rendered as "pronunciation clips" (उच्चारण क्लिप), a new term: the pack has no word for it, and it keeps these word/sentence clips apart from the syllable recordings and from "Speech sounds" (बोली की ध्वनियाँ). Medium confidence.
- "Shared speech sounds" in pack_maint_intro is rendered as "common/general" (सामान्य), because the pack's word for "share" means sending the lesson to students.
- Placeholders in pack_maint_voice_summary and pack_maint_repair_summary follow a label or sit in parentheses, so numbers need no plural agreement.

### hmong

**Round 2:**


Overall confidence: medium-high. This is White Hmong RPA with the round 1 vocabulary: lo lus, suab, lub suab (syllable), xib fwb, tub ntxhais kawm, zaj lus qhia, haujlwm, tshuaj xyuas, lees paub, khaws, suab kaw, cuab yeej. From the pack I added: pob (pack), kev teeb tsa (setup), vib nas (seconds), kab lus (sentence), dab neeg (story), hla (skip) and thim (undo).

Low-confidence keys:

- `count_taps_*`, `count_teacher_instruction`, `undo_tap`: "tap" is kov, from the pack's voice_pack strings. Round 1 used nyem for "click".
- **Syllable vs sound vs clip.** As in round 1, "suab" carries all three meanings (`readiness_counts`, `preview_audio_ready`, `syllable_*`). The syllable edit keys say "kev kho suab".
- `review_gap_tiles`: the pack's "Picture the Sentence" label is still English, so I named it “Duab Raws Kab Lus”. Word Families is “Tsev Neeg Lo Lus”; the pack label is half English ("lo lus Families").
- `review_pack_*`: "rate limit" is "kev txwv pes tsawg zaug siv (rate limit)".
- `manipulation_unscored_review`, `reading_unscored_review`, `skip_unscored_continue`: "scored" is "muab qhab nia".

### igbo

**Round 2:**


Confidence: medium-high for the children's strings, medium for the teacher readiness strings. Vocabulary follows yesterday's notes: ụda, olu, okwu, nkejiokwu, azịza, onye nkuzi / nwa akwụkwọ (plural ụmụ akwụkwọ), ndekọ, nkuzi, ọrụ, ajụjụ (item), ọnụọgụ, ngwaọrụ (device), nnọkọ (session), Lelee/Nyochaa, Họrọ, Pịa. I used dotted vowels and no tone marks, as the pack does.

New terms: pack = **ngwugwu**; audio clip = **faịlụ ụda** (not a word built on nkejiokwu); setup = **nhazi**; app = ngwa; online = ịntanetị; cache = "nchekwa nwa oge"; score = akara.

- **Activity names**: Word Families became "Ezinụlọ Okwu" (the pack label is half-English, "okwu Families"). Picture the Sentence became "Ahịrịokwu na Foto" (coined).
- **readiness_category_phoneme**: "Ụda mkpụrụ", following the pack's phonemes label "Ụda Mkpụrụ".
- **count_result_attempt_one / _attempts** ("mgbalị {number}") and **count_taps_one / _other** ("Ị pịrị ugboro {count}.") are the same in both forms, because the noun does not change with the number.
- **review_gap_phonemes**: "e chepụtara" for "estimated". **review_gap_tiles**: "efere" for "tray". **review_gap_rhyme / _edited**: "bọọdụ" for "board".
- **taught_spellings_help**: "kọma" for commas.

### indonesian

**Round 2:**

- "setup" is rendered "penyiapan"; the pack's back_to_setup is still "Kembali ke Setup".
- The pack's activity_word_families is half-English ("kata Families"). I wrote "Keluarga Kata", and "Gambarkan Kalimat" for Picture the Sentence (untranslated in the pack).

### italian

**Round 2:**


- review_gap_tiles: the pack still has "Picture the Sentence" (activity_sentence_match) in English; I coined "La frase in immagini". Align when that label is translated.
- readiness_limits, readiness_recovery: translated the source2 English; the code fallback is newer (mentions syllable counts and "Repair prepared lesson"), so these may need a refresh.
- word_families_skipped_for_students: the pack label activity_word_families is machine-mixed ("parole Families"); I wrote the correct "Famiglie di parole". activity_sound_sort ("Sound Ordina"), choose_activity, back_to_setup and source_family are also broken in the pack and need fixing.

### japanese

**Round 2:**

- review_gap_tiles: the pack's activity label activity_sentence_match ("Picture the Sentence") is still English, so I translated the name myself (「文に合う絵」). It will not match the activity picker until that label is translated too (or swap in the English name).
- readiness_category_isolation (音の位置の問いかけ): best guess at "sound position prompts" (the audio for questions like "what is the first sound?").

### kannada

**Round 2:**


- review_gap_tiles, word_families_skipped_for_students: the pack's own labels for Picture the Sentence (English) and Word Families (English or garbled) are not usable, so these strings name the activity in a new translation. Until activity_sentence_match / activity_word_families are fixed, the teacher sees a different name on the activity button.
- readiness_category_isolation (Sound position prompts) is a label for a group of audio clips (first/middle/last sound prompts); rendered as 'questions about the sound's position'.
- Syllable: child strings (count_review_required, count_teacher_instruction) use the pack's ಅಕ್ಷರ; teacher strings (syllable_*, count_recording_review_required, count_results_heading) use ಉಚ್ಚಾರಾಂಶ, as yesterday.
- Tapping uses ಟ್ಯಾಪ್ ಮಾಡು to match the pack's ಟ್ಯಾಪಿಂಗ್ mode.

### karen

**Round 2:**


Overall confidence: low to medium. A native S'gaw reviewer should read every key. All spellings were checked syllable by syllable against the pack; only the word for America (အမဲရကၤ) is not attested.

Choices to check first:

- **"Pack" / "student pack".** The pack only has "pack" as an English loan, so the student pack is written ကၠိဖိအတၢ်မၤလိ ("the students' lesson"). This affects `readiness_counts`, `readiness_limits`, `readiness_ready` and `review_pack_*`.
- **Setup / prepare.** I used တၢ်ရဲၣ်ကျဲၤ for "setup" (from sidebar.needs_ai_setup) and ရဲၣ်ကျဲၤ for "prepare".
- **"May / might".** Karen has no simple "may" in the pack. `readiness_preflight_start` says "may or may not be on another device"; `review_pack_silent` says "some student devices do not have"; `review_pack_recovered` ends with ...သ့.
- `review_pack_stopped`, `review_pack_recovered`: "rate limit" is "too many requests", followed by "(rate limit)".
- `review_gap_tiles`: "Picture the Sentence" (still English in the pack) is named “ရဲၣ်တၢ်ဂီၤဒ်တၢ်ကတိၤကျိၤ”. "Tiles" is ခး and "tray" is ဒၢ (box).
- Words borrowed from the pack: tap = ဒိး, skip = ပာ်ကွံာ် (from skip_lowercase), discard = ပျၢ်တၤ (common.discard), seconds = စးကီး, sentence = တၢ်ကတိၤကျိၤ, story = တၢ်ဂ့ၢ်, feedback = တၢ်ဟ့ၣ်ကူၣ်, request = ဃ့.
- `review_gap_phonemes`: "estimated" is written တယာ် ("guess").
- `taught_spellings_help`: this is long and descriptive, and "optional" is "can do or not".
- The syllable/voice collision from round 1 (ကလုၢ်) still applies: `count_teacher_instruction` says "tap once for each ကလုၢ်".

**Round 3:**


Overall confidence: low to medium. A native S'gaw reviewer should read all 19 keys. The vocabulary follows rounds 1-2: clip = အသီၣ်, voice = ကလုၢ်, language = ကျိၥ်, syllable = တၢ်ကတိၤအကလုၢ်, repair = ဘှီဂ့ၤထီၣ် (from count_repair_recording), save = ပာ်ဖျါ, sharing = ဆှၢ. Every Myanmar-script syllable is attested in the pack (checked with sylcheck).

Low-confidence keys:

- `readiness_recovery`, `pack_maint_repair_summary`: "syllable boards" is တၢ်ကတိၤအကလုၢ်အဘ့ၣ် ("syllable sheet"). ဘ့ၣ် is the pack's word in "Storyboard" (တၢ်ဂ့ၢ်အဘ့ၣ်). "Older" is အလိၢ်လံၤ, "update" is မၤသီထီၣ် (from toasts.settings_updated), and "fill" is ထၢနုာ် ("put in").
- `readiness_recovery`, `pack_maint_intro`, `pack_maint_repair_summary`: "speech clips" is described as အသီၣ်လၢအစံးတၢ်ကတိၤ ("audio that says the words"). This keeps it apart from "speech sounds" (တၢ်ကတိၤအသီၣ်), the pack's term for phonemes.
- **Voice/syllable collision.** ကလုၢ် (voice) is inside the syllable term. `pack_maint_voice_summary`, `pack_select_mismatched`, `pack_review_clips` and `pack_filter_attention` use ကလုၢ် alone for "voice".
- `pack_maint_voice_auto`: uses the pack's universal.translations_auto_plain အသးအိၣ်ဝဲဒၣ်. The pack also uses အသဲစး for "Auto".
- `pack_maint_language_unspecified`: written as "not chosen yet".
- `pack_maint_intro`: "covers" is ပဉ်ဃုာ် ("includes"), and "shared" is "that all lessons use".
- `readiness_recovery`: "flagged" is ပာ်ပနီၣ် (from pdf_audit "AI-flagged").

### khmer

**Round 2:**

- review_gap_tiles: the pack's activity label activity_sentence_match ("Picture the Sentence") is still English, so I translated the name myself (“ផ្គូផ្គងរូបភាពនឹងប្រយោគ”). It will not match the activity picker until that label is translated too (or swap in the English name).
- word_families_*: the pack's Word Families label is half-translated ("ពាក្យ Families"), so I used ក្រុមពាក្យ (it matches family_members សមាជិកក្រុមពាក្យ). activity_word_families should be fixed to match.
- "Clip" is spelled ឃ្លីប, as in yesterday's round. The older voice_pack strings use ក្លីប.

### kinyarwanda

**Round 2:**


Confidence: medium-high. Vocabulary follows yesterday's notes and the pack: amajwi/ijwi, ijambo/amagambo, uduce (syllables), igisubizo, umwarimu, umunyeshuri, isomo (lesson, and session as the pack does), igikorwa, Genzura/Suzuma, Hitamo, Kanda, Bika.

New terms, taken from the pack where possible:
- pack = **pake** (voice_pack strings); setup = **Itegurwa** (back_to_setup "Subira ku Itegurwa"); app = porogaramu; device = igikoresho; online = interineti.
- audio clip = **amadosiye y'amajwi** (audio files). I avoided "agace", which means syllable in this pack.

- **readiness_category_feedback** "Ubutumwa nyuma y'igisubizo" ("messages after the answer") and **readiness_category_phoneme** "Utujwi tw'imvugo" are descriptive.
- **review_pack_stopped / review_pack_recovered**: "rate limit" is described ("hasabwe ibintu byinshi mu gihe gito", "imbibi z'ibisabwa").
- **readiness_limits / readiness_preflight_***: device cache = "ububiko bw'agateganyo bw'igikoresho"; "limitations" = "imbogamizi".
- **taught_spellings_help**: "utwitso" for commas.
- **count_taps_one / count_taps_other** are identical ("Wakanze inshuro {count}."), because *inshuro* does not change with the number. **count_result_attempt_one / _attempts**: "igerageza / amagerageza {number}".
- **review_gap_tiles**: the pack's activity_sentence_match label is still English ("Picture the Sentence"), so I coined "Interuro mu Ishusho".
- **choose_another_activity**: "Hitamo ikindi gikorwa". The pack's choose_activity "Hitamo Igikorwa Cyindi" has the wrong concord and should be fixed.

### kirundi

**Round 2:**


Confidence: medium-high for the children's strings, medium for the teacher readiness strings. I used Kirundi forms throughout, not Kinyarwanda ones: inyishu, canke, amajambo, igitigiri (c- concord), umwigisha / umunyeshure, imbere yo, gutangura, kubandanya, Hitamwo, Umviriza, Rindira (wait), incuro (times), vy- concords (vyose, vyiteguye), the -zo- future (ntikizoharurirwa, azohera) and n'imiburiburi (at least).

New terms:
- pack = **umugwi** (voice_pack_active_pack "Umugwi ukora"); audio clip = **amadosiye y'amajwi**; app = porogaramu; device = igikoresho; online = internet (as in the pack's consent text).
- setup = **igice c'itegurwa**. The pack's back_to_setup is half-English ("Gusubira inyuma ku Setup").

- **Activity names**: the pack's Word Families label is half-English ("ijambo Families"), so I used "Imiryango y'Amajambo". Picture the Sentence (still English in the pack) became "Interuro mu Ishusho". The lesson-preview label is broken ("isomo Pgusubiramwo"), so readiness_preflight_unknown says "mu kuraba isomo imbere".
- **review_gap_rhyme / review_gap_unverified**: "amajwi asa / amajambo asa" for rhyme, following the pack's Rhyme Time label "Amajwi asa".
- **count_result_attempt_one / _attempts**: "ikigeragezo / ibigeragezo {number}".
- **count_taps_one / _other** are identical ("Wakanze incuro {count}.") because *incuro* does not change with the number.
- **review_pack_silent**: "irindi jwi risubirira" for "fallback voice". **review_pack_stopped / _recovered**: "rate limit" is described.
- **taught_spellings_help**: "utwitso" for commas.
- **readiness_preflight_send / _start**: "uzi izo ngorane" ("knowing these difficulties") for "with these limitations".

### korean

**Round 2:**

- review_gap_tiles: the pack's activity label activity_sentence_match ("Picture the Sentence") is still English, so I translated the name myself (그림으로 문장 맞추기). It will not match the activity picker until that label is translated too (or swap in the English name).
- word_families_skipped_for_students / word_families_review_needed: the pack's Word Families label is half-translated ("단어 Families"), so I used '단어 가족' instead (it matches family_members 가족 구성원). activity_word_families and source_family should be fixed to match.

### lao

**Round 2:**


Overall confidence: medium-high. Same vocabulary as round 1: ຄຳ, ສຽງ, ພະຍາງ, ຄູ, ນັກຮຽນ, ບົດຮຽນ, ກິດຈະກຳ; ເຈົ້າ for the child, ທ່ານ for the teacher. "Pack" = ຊຸດ (pack's voice_pack term), "setup" = ໜ້າຕັ້ງຄ່າ.

Low-confidence keys:

- `review_gap_tiles`: the pack's "Picture the Sentence" label is still English, so I named it “ຈັດຮູບຕາມປະໂຫຍກ” ("arrange the pictures by the sentence"). `word_families_skipped_for_students` uses “ຄອບຄົວຄຳ” for Word Families, which is also still English in the pack. Rename these if the activity labels get translated.
- `readiness_limits`, `readiness_preflight_send`, `readiness_preflight_start`: "cache" is the loanword ແຄຊ, and "app audio banks" is ຄັງສຽງຂອງແອັບ.
- `review_pack_stopped`, `review_pack_recovered`: "rate limit" is ຂີດຈຳກັດການໃຊ້ງານ ("usage limit").
- `review_gap_audio`: "portable audio" is rendered as "audio that goes with the pack".
- `readiness_recovery`: "follows the existing session controls" is simplified to "uses the controls that are already there".
- `count_result_delivery_unknown`: "delivery" is rendered as "how the word was voiced".

### latin

**Round 2:**

- New Latin terms with no fixed standard: configuratio (setup; the pack's back_to_setup is still "Retrō ad Setup"), limes petitionum (rate limit), memoria temporaria (cache), Iudicia de responsis (readiness_category_feedback), Sententia Picta (Picture the Sentence, untranslated in the pack).
- word_families_skipped_for_students: the pack's activity_word_families is half-English ("verbum Families"). I wrote «Familiae Verborum».
- count_result_attempt_one/attempts are both "conatus" (4th-declension nom. sg = pl), which is correct.

**Round 3:**

- pack_maint_voice_auto "Automatica" (agrees with vox) is a Neo-Latin word; there is no classical term for an automatic choice.
- "speech clips" is rendered "fragmenta loquelae". This combines the pack's "fragmentum" (clip) with "soni loquelae" (Speech sounds).
- Count strings use "Label: {n}" so no number needs singular/plural agreement.

### lingala

**Round 2:**


Confidence: medium-high for the children's strings, medium for the teacher readiness and review strings. Vocabulary follows yesterday's notes: mongongo/mingongo, liloba/maloba, biteni, eyano/biyano, molakisi, moyekoli/bayekoli, makomi (recording), liteya, mosala, motango, Talá/Talelá, Ndimá, Poná, Yoká. Quotation marks are « ».

New terms:
- pack = **pakɛ**; file = **fisyé** (both from the voice_pack strings); audio clip = "fisyé ya mongongo" (not "eteni", which means syllable here).
- device = **aparɛyi**, as in the pack's consent text. Yesterday's count_remember used "esaleli"; one of the two should be chosen pack-wide.
- setup = "esika ya bobongisi" (the pack's back_to_setup is half-English); app = aplikasyo; online = internet.
- **Bomba**: used only to mean *save* (ebombami = saved; "bomba yango" in syllable_unsaved_start, matching common.save "Bombá"). It is never used for *hide*.
- matching_practice uses "Sangisá" (join), not the imperative "Kanisá", which also means "think".

- **Activity names**: Word Families became "Mabota ya Maloba" (the pack label is half-English). Picture the Sentence became "Fraze na Elilingi", and "sentence" is "fraze" (loanword) in sentence_review_required and review_gap_sentence_audio.
- **readiness_category_speech**: "Maloba mpe tɛkstɛ" (loanword). I avoided "makomi", which means recording in this pack.
- **review_gap_rhyme / review_gap_edited**: "mesa ya mosala" for the activity "board".
- **readiness_preflight_send / _start**: "ata na ndelo oyo" for "with these limitations". **review_pack_***: "rate limit" is described as "too many requests in a short time".
- **count_taps_one / _other** are identical ("Obɛti mbala {count}."). **count_result_attempt_one / _attempts**: "momeko / mimeko {number}".
- **count_results_heading**: "Makambo ya kotánga biteni".

**Round 3:**


Confidence: medium-high. Vocabulary follows rounds 1-2: fisyé ya mongongo (clip), makomi (recording), biteni, liteya, pakɛ, aparɛyi, aplikasyo, mesa (board), Talelá, Poná, Yoká, Lakisá, Boyá. "Language" is *monoko*, the pack's dominant spelling (about 223 uses, against 48 for *monɔkɔ*).

- **Bomba** appears only for "save" ("bombá liteya"). *Ebombami* (saved) and *ebombelo* (storage) are round-2 words built on the same verb, and none of them means "hide".
- **pack_repair_button** "Bongisá liteya oyo ebongisami": *bongisa* means both "repair" and "prepare" (round 2 uses *ebongisami* for "prepared"). The button reads "fix the prepared lesson". A clearer alternative is "Bongisá mabunga ya liteya" ("fix the lesson's problems"), but it would also change readiness_recovery.
- **"Updated lesson"** is "liteya oyo ezwi mbongwana" (the lesson that received changes), so that it does not repeat *bongisa*.
- **pack_maint_intro**: "list" is the loanword "Liste".

### maay_maay

**Round 2:**


**All 124 values are PROVISIONAL.** The maay_maay pack is written in Standard (Northern) Somali, not Af-Maay. The human decision on that is still pending. These values follow the pack and are Standard Somali: out2/somali.json with this pack's own spellings. If the pack is rewritten in real Af-Maay, every key needs a Maay speaker.

Differences from somali.json:
- "Dhagayso" (listen), the spelling the pack uses.
- Setup = "Dejinta" (the pack's guided section). word_sounds.back_to_setup here is half-English ("Back ku Setup").
- lesson_practice_complete: "ku tababaratay", matching the pack's "Mar kale tababar".

The same open points as somali apply: the syllable term, the Read & Match label, and "Sawir Jumladda".

**Round 3:**


**PROVISIONAL**, as in rounds 1-2: Standard Somali matching the pack, identical to out3/somali.json except the pack's spelling "Dhagayso" (pack_hear). If the pack is rewritten in Af-Maay, these need a Maay speaker.

### malayalam

**Round 2:**


- review_gap_tiles, word_families_skipped_for_students: the pack's own labels for Picture the Sentence (English) and Word Families (English or garbled) are not usable, so these strings name the activity in a new translation. Until activity_sentence_match / activity_word_families are fixed, the teacher sees a different name on the activity button.
- readiness_category_isolation (Sound position prompts) is a label for a group of audio clips (first/middle/last sound prompts); rendered as 'questions about the sound's position'.
- Syllable: child strings use അക്ഷരം; teacher strings use സിലബിൾ, as yesterday.
- Child strings that mention the teacher (count_wait_teacher, count_review_required, count_teacher_instruction) use ടീച്ചർ (ungendered, natural for children); teacher-facing strings keep the pack's അധ്യാപകർ.

### marathi

**Round 2:**


- review_gap_tiles: "Picture the Sentence" is kept in English, quoted, because the pack's activity_sentence_match label (and every sentence_match_* string) is still English, so it matches what the teacher sees. If the pack later translates that label, update this key to match.
- readiness_category_feedback / _phoneme / _isolation / _speech: short category labels for audio-clip groups. Their meaning comes only from the key names (feedback clips, phoneme clips, sound-position prompts, word/text speech). Medium confidence.
- "Spelling" is स्पेलिंग, the pack's most frequent choice (it also uses शब्दलेखन and शुद्धलेखन in places).
- The pack uses अक्षर for both "letter" and "syllable". The teacher strings about taught letters (taught_patterns, taught_spellings_help) and letter names therefore share that word with the syllable strings. Context makes the meaning clear, but a reviewer may prefer वर्ण for letters.

**Round 3:**


- "Speech clips" (pack_maint_intro, pack_maint_repair_summary, readiness_recovery) is rendered as "pronunciation clips" (उच्चार क्लिप), a new term: the pack has no word for it, and it keeps these word/sentence clips apart from the syllable recordings and from "Speech sounds" (उच्चारातील ध्वनी). Medium confidence.
- "Shared speech sounds" in pack_maint_intro is rendered as "common/general" (सर्वसाधारण), because the pack's word for "share" means sending the lesson to students.
- Placeholders in pack_maint_voice_summary and pack_maint_repair_summary follow a label or sit in parentheses, so numbers need no plural agreement.
- Syllable stays अक्षर (अक्षर-बोर्ड, अक्षर-रेकॉर्डिंग, अक्षरसंख्या) as in earlier rounds.

### marshallese

**Round 2:**


Overall confidence: low to medium. This follows the pack's dot-below orthography and round 1 vocabulary: naan, ainikien, ṃōttan naan, rūkaki, rūkkatak, katak, jerbal, etale, kamool, kōjparok, rekoot, kein jerbal. From the pack I added: pak (pack), setup (loanword, as in the pack), kōpooj (prepare), jāntōj (sentence), bwebwenato (story), pija (picture), Kajeor (cancel), Jolok (undo/discard) and Pekake (skip).

Low-confidence keys:

- `count_taps_*`, `count_teacher_instruction`, `undo_tap`, `readiness_preflight_unknown`: "tap" is dṛuji, from the pack's Word Sounds tap_to_hear. Round 1 used jibwe for "click".
- `readiness_checking`: "seconds" is the loanword "jekon". This is a guess.
- `readiness_preflight_send`, `readiness_preflight_start`: "with these limitations" is rephrased as "even though these things are not complete" (meñe ewōr men kein rej jab weppān).
- `review_pack_*`: "rate limit" is "elōñḷọk kajjitōk (rate limit)" ("too many requests").
- `adaptive_evidence`: "Joñan an eppen" ("level of difficulty") and "katak ekkā" ("practising often").
- `review_gap_phonemes`: "estimated" is "ḷōmṇak kaki" ("guessed").
- `review_gap_rhyme`, `review_gap_unverified`: "rhyme" is described as "words whose sound matches" (jekdọọn ainikien).
- `review_gap_tiles`: the pack's "Picture the Sentence" label is still English, so I named it “Pija in Jāntōj”. "Tiles" is the loanword kaat, and "tray" is jikin. Word Families is “Baaṃle in Naan”.
- `readiness_category_feedback`: "Naan in uwaak" ("response words").

**Round 3:**


Overall confidence: low to medium. This uses the pack's dot-below orthography and the vocabulary from rounds 1-2: ainikien (audio/clip), rekoot (recording), ri-kōnono (TTS voice), kajin (language), ṃōttan naan (syllable), kōṃṃan jiṃwe (repair, from count_repair_recording), etale (review), kōjparok (save) and jilkinḷọk (share/send). New words come from the pack: kapeḷḷọk (open), kakōḷḷe (flag/mark), kōkāāl (update), meḷeḷe (information), unin (source), Make iaan (automatic), jaje (unknown) and rejenolọk (different/separate).

Low-confidence keys:

- `readiness_recovery`, `pack_maint_intro`, `pack_maint_repair_summary`: "speech clips" is "ainikien in naan" ("word audio"). This keeps it apart from "Ainikien in kōnono" (Speech sounds, readiness_category_phoneme).
- `readiness_recovery`, `pack_maint_repair_summary`: "syllable boards" is "boọd in ṃōttan naan" with the loan boọd (from quiz.reset_board; the pack also has "Būrōd"), and "older" is etto. "Fill missing clips" is rendered "make the missing clips" (kōṃṃan).
- `pack_maint_intro`: "list" is laajrak, as in earlier rounds. "Teacher syllable recordings stay as recorded" is "renaaj pād wōt āinwōt kar rekoot er". Check that this reads naturally.
- `pack_maint_language_unspecified`: "Ejjañin kāālōt" ("not chosen yet").
- `pack_regenerate_selected`: "Bar kōṃṃan ko kwaar kāālōt" ("remake the ones you chose").
- `pack_filter_attention`: "jaje" ("unknown") comes from the pack's alignment_graph.source_unknown.

### nepali

**Round 2:**


- review_gap_tiles: "Picture the Sentence" is kept in English, quoted, because the pack's activity_sentence_match label (and every sentence_match_* string) is still English, so it matches what the teacher sees. If the pack later translates that label, update this key to match.
- word_families_skipped_for_students: the pack label is half-English ("शब्दहरू Families"); I used "शब्द परिवार". The label itself needs fixing.
- readiness_category_feedback / _phoneme / _isolation / _speech: short category labels for audio-clip groups. Their meaning comes only from the key names (feedback clips, phoneme clips, sound-position prompts, word/text speech). Medium confidence.
- The pack uses अक्षर for both "letter" and "syllable" (as in Marathi), and these strings keep that. A reviewer may prefer वर्ण for letters in the teacher spelling strings.

**Round 3:**


- "Speech clips" (pack_maint_intro, pack_maint_repair_summary, readiness_recovery) is rendered as "pronunciation clips" (उच्चारण क्लिप), a new term: the pack has no word for it, and it keeps these word/sentence clips apart from the syllable recordings and from "Speech sounds" (बोलीका ध्वनि). Medium confidence.
- "Shared speech sounds" in pack_maint_intro is rendered as "common/general" (सामान्य), because the pack's word for "share" means sending the lesson to students.
- Placeholders in pack_maint_voice_summary and pack_maint_repair_summary follow a label or sit in parentheses, so numbers need no plural agreement.
- Syllable stays अक्षर (अक्षर बोर्ड, अक्षर रेकर्डिङ) as in earlier rounds. Regenerate follows the pack's पुन: उत्पन्न गर्नुहोस्.

### pashto

**Round 2:**


- review_gap_tiles, word_families_skipped_for_students: the pack's own labels for Picture the Sentence (English) and Word Families (English or garbled) are not usable, so these strings name the activity in a new translation. Until activity_sentence_match / activity_word_families are fixed, the teacher sees a different name on the activity button.
- readiness_category_isolation (Sound position prompts) is a label for a group of audio clips (first/middle/last sound prompts); rendered as 'questions about the sound's position'.
- Whole set medium confidence (no native check). Syllable stays څپه, as yesterday.
- count_taps_*, undo_tap, count_teacher_instruction: 'tap' rendered as ټک وهل; a native check of the child-facing wording is worth it.
- readiness_category_feedback: غبرګون; review_gap_tiles 'tray' rendered as د انځورونو تخته.
- Many existing Pashto activity labels are garbled Arabic/Urdu; only د غږ بدلول (Sound Swap) and ولوله او سره جوړ کړه (Read & Match) were reused.

### polish

**Round 2:**


- The pack label `activity_word_families` is garbled ("Słówesne rodziny"); I used „Rodziny wyrazów”. `activity_sentence_match` is still English; translated as „Obrazki do zdania”. Align both labels.
- review_fix_fixed / _unchanged use the label form ("naprawione: 3, bez zmian: 1."), so the list can start in lowercase, as the English does.
- Teacher strings use the 2nd-person imperative, matching yesterday's round. "Clip" is rendered as „nagranie”.

### portuguese_angola

**Round 2:**


- Spelling follows the pack and yesterday's round (AO1990: atividade, correto). Angola has not ratified AO1990, so a native reviewer may prefer actividade/correcto. This is a pack-wide decision.
- `activity_sentence_match` is still English in the pack; translated as "Imagens da Frase" (review_gap_tiles). Align the label.
- count_result_item: "Item n.º {number}" (to read naturally in PT, not just to avoid the English).

### portuguese_brazil

**Round 2:**


- review_gap_tiles: the pack still has "Picture the Sentence" (activity_sentence_match) in English; I coined "Frase em Imagens". Align when that label is translated.
- readiness_limits, readiness_recovery: translated the source2 English; the code fallback is newer (mentions syllable counts and "Repair prepared lesson"), so these may need a refresh.
- count_result_item kept as "Item {number}: {word}" (identical to English, but "item" is standard Portuguese and the pack uses "Itens").

### portuguese_portugal

**Round 2:**


- review_gap_tiles: the pack still has "Picture the Sentence" (activity_sentence_match) in English; I coined "A Frase em Imagens". Align when that label is translated.
- readiness_limits, readiness_recovery: translated the source2 English; the code fallback is newer (mentions syllable counts and "Repair prepared lesson"), so these may need a refresh.
- Clip = "excerto" (as yesterday). The pack's preview_title "Prévia da Aula" and parent_summary are Brazilian; I used "pré-visualização" and European forms.

### punjabi

**Round 2:**


- review_gap_tiles: "Picture the Sentence" is kept in English, quoted, because the pack's activity_sentence_match label (and every sentence_match_* string) is still English, so it matches what the teacher sees. If the pack later translates that label, update this key to match.
- word_families_skipped_for_students: the pack label is half-English ("ਸ਼ਬਦ Families"); I used "ਸ਼ਬਦ ਪਰਿਵਾਰ". The label itself needs fixing.
- readiness_category_feedback / _phoneme / _isolation / _speech: short category labels for audio-clip groups. Their meaning comes only from the key names (feedback clips, phoneme clips, sound-position prompts, word/text speech). Medium confidence.
- Syllable terms follow yesterday: ਉਚਾਰਖੰਡ for teachers, ਅੱਖਰ for children. Children are addressed with ਤੁਸੀਂ forms, as the pack already does.

**Round 3:**


- "Speech clips" (pack_maint_intro, pack_maint_repair_summary, readiness_recovery) is rendered as "pronunciation clips" (ਉਚਾਰਨ ਕਲਿੱਪਾਂ), a new term: the pack has no word for it, and it keeps these word/sentence clips apart from the syllable recordings and from "Speech sounds" (ਬੋਲ-ਧੁਨੀਆਂ). Medium confidence.
- "Shared speech sounds" in pack_maint_intro is rendered as "common/general" (ਆਮ), because the pack's word for "share" means sending the lesson to students.
- Placeholders in pack_maint_voice_summary and pack_maint_repair_summary follow a label or sit in parentheses, so numbers need no plural agreement.

### romanian

**Round 2:**


- "audio" as a bare noun is avoided: I used „fișiere audio” / „partea audio”. That makes readiness_check read „Verifică fișierele audio pregătite”.
- count_taps_one/_other both read „Atingeri: {count}.”. A form like „Ai atins de {count} ori” breaks at 1 and at 20 or more.
- The pack label `activity_word_families` is garbled ("cuvânt Families"); I used „Familii de cuvinte”. `activity_sentence_match` is English; I used „Imagini pentru propoziție”. Align both.
- Child strings use the generic „profesorul”, which is masculine.

### russian

**Round 2:**


- Activity = «упражнение», item = «задание». Yesterday's `activity_fallback` uses «Задание» for activity, and pack `start_activity` uses «активность». Please pick one term pack-wide.
- Word Families appears as «Семьи слов»; the pack label is «Словесные семьи». `activity_sentence_match` is English; translated as «Картинки к предложению».
- Counts use "Label: N" forms to avoid number agreement. count_taps_one = «{count} нажатие.»

### somali

**Round 2:**


- Syllable stays "qaybaha erayga" (parts of the word) as in round 1, never "xarfaha" (letters).
- review_gap_images reuses the pack's Read & Match label "Akhri oo Isku Beddel", but "Isku Beddel" means "exchange", not "match" ("Isku Aadi" would be correct). Fix the activity label and this string together.
- review_gap_tiles: the pack has no Somali label for Picture the Sentence; I wrote "Sawir Jumladda".
- Setup = "Habaynta" (word_sounds.back_to_setup). The guided section uses "Dejinta" for the same idea.
- count_result_attempt_one / _attempts and count_taps_one / _other are identical, because Somali uses the singular noun after numbers.
- review_fix_requested: "(wuxuu iman doonaa wax yar kadib)" (arrives shortly) gives the meaning of "arrives in the background".

### spanish_castilian

**Round 2:**


- review_gap_tiles: the pack still has "Picture the Sentence" (activity_sentence_match) in English; I coined "Oración en imágenes". Align when that label is translated.
- readiness_limits, readiness_recovery: translated the source2 English; the code fallback is newer (mentions syllable counts and "Repair prepared lesson"), so these may need a refresh.
- Student = "alumno(s)" (matches yesterday's garden_vocab_words); the older pack mostly says "estudiante".

### spanish_latin_america

**Round 2:**


- review_gap_tiles: the pack still has "Picture the Sentence" (activity_sentence_match) in English; I coined "Oración en imágenes". Align when that label is translated.
- readiness_limits, readiness_recovery: translated the source2 English; the code fallback is newer (mentions syllable counts and "Repair prepared lesson"), so these may need a refresh.

### swahili

**Round 2:**


- Activity names: the pack's own labels for Word Families ("maneno Families") and Picture the Sentence (English) are broken, so the new strings say "Familia za Maneno" (word_families_skipped_for_students) and "Sentensi kwa Picha" (review_gap_tiles). Fix activity_word_families / activity_sentence_match to match.
- Setup = "Usanidi" (the pack's guided strings); word_sounds.back_to_setup is still "Rudi kwa Setup".
- Clips = "vipande vya sauti" and student pack = "kifurushi cha mwanafunzi": descriptive, no fixed UI term.
- review_gap_rhyme / review_gap_unverified: rhyme = "kina / vina" (poetic term). Check that teachers know it.

**Round 3:**


- Voice (text-to-speech voice) = "sauti ya msomaji" (reader's voice), as in round 1's count_changed_audio. Plain "sauti" also means audio and sound, so the voice/language strings need the longer form.

### tagalog

**Round 2:**

- The pack's activity_word_families ("mga salita Families") and modal_title are broken half-English. I wrote "Mga Pamilya ng Salita" and "Isalarawan ang Pangungusap" (Picture the Sentence, untranslated in the pack).
- Kept standard tech borrowings: audio, clip, pack, setup, cache, device, rate limit, preview, i-verify, i-edit, i-tap.

### tamil

**Round 2:**


- review_gap_tiles, word_families_skipped_for_students: the pack's own labels for Picture the Sentence (English) and Word Families (English or garbled) are not usable, so these strings name the activity in a new translation. Until activity_sentence_match / activity_word_families are fixed, the teacher sees a different name on the activity button.
- readiness_category_isolation (Sound position prompts) is a label for a group of audio clips (first/middle/last sound prompts); rendered as 'questions about the sound's position'.
- review_gap_rhyme, review_gap_unverified: 'rhyme' rendered as ஓசை ஒத்த சொல் (sound-alike word); the pack's Rhyme Time label (ஒலி நேரம்) has no rhyme word to reuse.

### telugu

**Round 2:**


- review_gap_tiles, word_families_skipped_for_students: the pack's own labels for Picture the Sentence (English) and Word Families (English or garbled) are not usable, so these strings name the activity in a new translation. Until activity_sentence_match / activity_word_families are fixed, the teacher sees a different name on the activity button.
- readiness_category_isolation (Sound position prompts) is a label for a group of audio clips (first/middle/last sound prompts); rendered as 'questions about the sound's position'.
- Syllable stays అక్షరం (as yesterday), which also means 'letter'; see yesterday's note.
- Child strings that mention the teacher (count_wait_teacher, count_review_required, count_teacher_instruction) use టీచర్, which is more natural for 5-8 year olds; teacher-facing strings keep the pack's ఉపాధ్యాయులు.

### thai

**Round 2:**

- review_gap_tiles: the pack's activity label activity_sentence_match ("Picture the Sentence") is still English, so I translated the name myself (“จับคู่ภาพกับประโยค”). It will not match the activity picker until that label is translated too (or swap in the English name).
- review_pack_*: I wrote "rate limit" as ขีดจำกัดอัตราการใช้งาน. It is accurate, but teachers may find it technical.

### tigrinya

**Round 2:**


- Session = "ክፍለ-ግዜ". The pack's activity_length uses "ኣኼባ" (a meeting), which is wrong.
- Preview = "ቅድመ-ምርኣይ", pack = "ጥቕሊ", device cache = "ግዝያዊ ዕቑር", version = "ስሪት". There is no settled UI term for any of these; low confidence.
- Rhyme = "ዝቃነ", from the pack's rhymes_with "ምስዚ ይቃነ".
- Word Families and Picture the Sentence have half-English pack labels, so the new strings say «ስድራታት ቃላት» and «ሓረግ ብስእሊ».
- "ደጊምካ ፈትን" for try again, as in round 1.

### turkish

**Round 2:**

- review_gap_tiles: "Picture the Sentence" has no Turkish label in the pack (activity_sentence_match is English). I used "Resimli Cümle"; align if that key is translated later.
- readiness_limits / readiness_recovery: translated from source2 `en`; the code's inline fallback is newer, longer wording.

### ukrainian

**Round 2:**


- Activity = «вправа», item = «завдання».
- The pack label `activity_word_families` is garbled ("слова Families"); I used «Родини слів». `activity_sentence_match` is English; I used «Малюнки до речення». Align both.
- Counts use "Label: N" forms to avoid number agreement. count_taps_one = «{count} натискання.»

### urdu

**Round 2:**


- review_gap_tiles: "Picture the Sentence" is kept in English, quoted, because the pack's activity_sentence_match label (and every sentence_match_* string) is still English, so it matches what the teacher sees. If the pack later translates that label, update this key to match.
- word_families_skipped_for_students: the pack label activity_word_families is garbled («عائنہیںت فاظ»), so I wrote «الفاظ کے خاندان». activity_sound_sort and several other existing Word Sounds values are garbled too and were not reused.
- readiness_category_feedback / _phoneme / _isolation / _speech: short category labels for audio-clip groups. Their meaning comes only from the key names (feedback clips, phoneme clips, sound-position prompts, word/text speech). Medium confidence. readiness_category_feedback is «جوابی پیغامات» (feedback messages).
- Syllable terms follow yesterday: ہجا / ہجوں in teacher and result strings (never the plural ہجے), حرف in children's strings. Quotation marks are « ».

**Round 3:**


- "Speech clips" (pack_maint_intro, pack_maint_repair_summary, readiness_recovery) is rendered as "pronunciation clips" (تلفظ کی کلپس), a new term: the pack has no word for it, and it keeps these word/sentence clips apart from the syllable recordings and from "Speech sounds" (گفتاری آوازیں). Medium confidence.
- "Shared speech sounds" in pack_maint_intro is rendered as "common/general" (عام), because the pack's word for "share" means sending the lesson to students.
- Placeholders in pack_maint_voice_summary and pack_maint_repair_summary follow a label or sit in parentheses, so numbers need no plural agreement.

### vietnamese

**Round 2:**

- review_gap_tiles: the pack's activity label activity_sentence_match ("Picture the Sentence") is still English, so I translated the name myself (“Ghép tranh với câu”). It will not match the activity picker until that label is translated too (or swap in the English name).
- Child-facing strings say "thầy cô" for "your teacher", which is more natural for K-2 than "giáo viên". Teacher-facing strings still use "giáo viên". Switch to "giáo viên" everywhere if the pack should use one word.

### yoruba

**Round 2:**


Full tone marks are used throughout. "Ohùn" means audio or voice and "ìró" means a speech sound, as in round 1.

- Pack = "àpò", app = "áàpù", preview = "ìwòṣáájú", device cache = "ibi ìpamọ́ ìgbà díẹ̀". There are no settled UI terms for these; low confidence.
- Setup = "Ètò" (the pack's guided strings). word_sounds.back_to_setup is still "Back si Setup".
- Word Families and Picture the Sentence have half-English pack labels, so the new strings say "Ìdílé Ọ̀rọ̀" and "Gbólóhùn ní Àwòrán".
- count_result_attempt_one / _attempts and count_taps_one / _other are identical, because Yoruba nouns do not change after numbers.
- Cancel is written "Fagilé" with tone marks. The pack's common.cancel is "Fagilee", without them.

**Round 3:**


- Clip = "ègé ohùn" (audio clip, like "ègé fídíò"). Rounds 1-2 wrote clips as plain "ohùn", but this panel puts clips and voices in the same sentence ("clips that use another voice"), and "ohùn" also means voice. Low risk, but it is a new term.
- Automatic = "Aládàáṣe" (the pack's "Auto"). The pack's other "Automatic" is "Fúnra rẹ̀".

---

# Round 4 (2026-10-17): leftover English and machine garble replaced

Every pack had every Word Sounds key after round 3, but many values were not really translated:

- **English copies.** 7,529 values were identical to the English, usually 104 to 311 per pack. They included the whole student audio-recovery flow ("Your browser stopped the sound from playing…").
- **Word-by-word machine output.** About 1,730 values in non-Latin-script packs mixed English and the target language, for example Hindi "नहीं Sound Swap task उत्पन्न के लिए यह शब्द yet." Many more such values sat in Latin-script packs, such as German "Reversuchen Audio" and Italian "parole Families".

Round 4 replaced **14,118 values across all 63 packs**. Each value changed only if the file still held exactly the snapshotted text, in all four copies.

**After round 4:**

- 133 values remain identical to English, across 17 distinct keys. These are mostly brand names ("Word Sounds Studio") and words that really are the same ("Bonus", Dutch "tip").
- 246 values still contain an English word. These are mostly "Canvas", "Nano", "Class Mailbox" or the English example word "star".
- Karen is the exception: a few strings are still half-English, listed in its notes.

Each pack now uses one name per activity, and every string that mentions an activity uses that name.

## Review first (round 4)

1. **Activity names.** Every pack now has a translated name for each activity, and the per-language notes list them. Read them as a teacher would see them on the activity buttons.
2. **The tool name is still broken in some packs.** These need a one-line fix in the `sidebar` section, followed by a find-and-replace across `word_sounds`:
   - Tagalog "mga salita Word Sounds" (suggested: "Mga Tunog ng Salita");
   - Hmong "lo lus Word Sounds";
   - Traditional Chinese "單词发音" (should be 單字發音 / 單詞發音);
   - English "Word Sounds" in Karen, Chin Hakha, Chin Falam, Marshallese, Acholi, Hausa and Maay Maay.
3. **`of_total` is now "/".** This applies in Hindi, Bengali, Punjabi, Gujarati, Marathi, Nepali, Tamil, Telugu, Pashto and Urdu. The surrounding layout reversed the numbers ("out of 5, 20 words") in those languages, and "/" reads correctly everywhere.
4. **Low-confidence packs still need a native speaker:** chin_falam, chin_hakha, marshallese, karen, acholi, kirundi, lingala, igbo, hausa. maay_maay is still provisional (it is Standard Somali).
5. **"Class Mailbox"** is translated descriptively in most packs and kept in English in some. Pick one approach.

## Per-language notes from the round 4 translators


### acholi


Confidence: medium-low overall. A native Acholi reviewer should check this pack before it is relied on.

The pack was full of English fragments, and all of them are replaced: "Tuko Again" became "Tuk Doki", and "Correct doko" became "Lagam ma atir". *doko* means "become", so "answer" is now **lagam** everywhere, including answer_placeholder and preview_answer_*.

Vocabulary follows rounds 1-3:
- dwan (sound/audio), nyig lok (word), lok (sentence), bute (syllable), nukuta (letter, the pack's word)
- lapwony / lapwonyi (your teacher), latin kwan / lutino kwan (student/students)
- coyo dwan (clip/recording), pwony (lesson, also session), tic (activity), lapeny (task/item)
- Rot (check/review), Yer, Winy, Dii, Ywai (drag), Cwe (generate), Kan (hide), Nyut (show)
- Loanwords: intanet, sekond, dakika, koma, fail, pak, kad, bok, mikrofon (replacing the English "microphone" in all mic strings).
- "browser" is described as "jami me yabo intanet" ("the thing that opens the internet").

- **Settled:**
  - Blend Sounds = Ribo Dwan
  - Sound Counting = Kwano Dwan
  - Find Sounds = Yeny Dwan
  - Letter Trace = Lub Nukuta
  - Sound Mapping = Keto Dwan i Nukuta
  - Missing Letter = Nukuta ma Orwenyo
  - Sight & Spell = Nen ci Coo
  - Read the Story = Kwan Ododo
  - Finish the Sentence = Tyek Lok
  - Picture the Sentence = Lok i Cal (round 2)
  - Rhyme Time = Dwan ma Rwatte
  - Break it Down = Pok Nyig Lok
  - Sound Sort = Dul pa Dwan
  - Spelling Bee = Pyem me Coc
  - Word Families = Doggola pa Nyig Lok
  - Word Scramble = Nyig Lok ma Kirubo
- **Read & Match:** changed from "Kwan ci Ryek" (*ryek* = clever) to "Kwan ci Rwat" (*rwatto* = match). review_gap_images and decoding_needs_image were updated to match.
- **Syllable Claps:** now "Goyo Cing pi Bute Acel Acel", which uses the same verb as round 1's "Goy cing".
- **Sound Swap:** keeps "Loko Dwon", as the pack spells it.

- **Anchor card** = "Kad me poyo wic" ("reminder card"), used in anchor_*, anchor_badge and voice_pack_intro. This is coined.
- **Uncertain word choices:**
  - Hint = "Tam" (as in ml_hint_position); Tip = "Kony"
  - Settings = "Kit me yubo" (common.settings "Pang" is unclear)
  - Example = "lapor"
  - "pro" = "Iryek twatwal"
- **r_controlled_* / spelling_bee_hint_vowels**: "vowels" is written as "nukuta a, e, i, o, u" because I could not confirm an Acholi term.
- **Spelled out instead of translated:** voice_pack_progress_legend colours are "lagwar ngic" (green), "lacwak" (amber) and "buru" (grey). In nano_mode_hint, "hat" is described as "gin me umo wic" ("something to cover the head").
- **Class Mailbox** = "Bok me Kwena pa Kilas", translated descriptively. **probe_interrupted**: "tab" = "pot karatac".
- **Left as is:** sr_welcome and voice_pack_msg_saved (already Acholi; "Word Sounds" is this pack's tool name), and modal_title (must not change).

### amharic


- I rewrote all 127 half-English strings, plus about 35 Ge'ez word-by-word strings outside the list ("ጀምር ተግባር", "አይ ቃላት ይገኛል", "ተጫወት ቃላት", "ክፍለ ጊዜ አጠናቅቅ!").
- The generic word for activity is now "እንቅስቃሴ" (the pack's activity_fallback). "ተግባር" remains only where it means task.
- Activity names: ድምፆችን ማጣመር, ድምፅ ፍለጋ, ቤት የሚመቱ ቃላት (Rhyme Time), በድምፅ መደርደር, የቃላት ቤተሰቦች, የተዘበራረቀ ቃል, ታሪኩን አንብብ, ዓረፍተ ነገሩን አሟላ, ዓረፍተ ነገሩን በሥዕል, ተመልከትና ጻፍ (Sight & Spell), የአጻጻፍ ውድድር (Spelling Bee; it was "የፊደል ውድድር", a letter contest), ከፋፍለው (Break it Down; it was the polite plural "ይከፋፍሉት").
- Rhyme is the poetic "ቤት መምታት", as in round 2. Low confidence for K-2 children.
- audio_try_again is "ድምፁን እንደገና አጫውት" (play the sound again), so it is not confused with retry_audio "ድምፁን እንደገና ሞክር".
- rhymes_with is followed by the quoted word in the UI, so it reads "ከሚከተለው ቃል ጋር ቤት የሚመታ፦ "cat"".
- Informal masculine "you" is used throughout, as in rounds 1-2.
- "Class Mailbox" became "የክፍል የመልእክት ሳጥን" (descriptive).

### arabic


MSA. An audio clip is "ملف صوتي" (plural "ملفات صوتية"). The tool name is "أصوات الكلمات".

- New activity names: Read the Story = "اقرأ القصة", Finish the Sentence = "أكمل الجملة", Picture the Sentence = "الجملة المصوَّرة" (from round 2).
- Word Scramble was "تشويش الكلمات" (word jamming). It is now "الكلمة المبعثرة".
- sound_positions_label and sound_swap_label now quote the activity names.
- These were left as is, because the only Latin text in them is a product name or an English example: nano_mode_hint (Nano), r_controlled_example ("star"), voice_pack_aicheck_needs_canvas and voice_pack_msg_need_mic (Canvas).
- Number agreement is avoided by restructuring:
  - probe_interrupted: "(المدة التقريبية بالثواني: {s})".
  - di_timing: "المدة التقريبية بالدقائق: {minutes}".
  - voice_pack_msg_saved: "عدد الأصوات: {count}".

### bengali


- Activity names: child-facing imperatives use তুমি forms (ধ্বনি জোড়ো, ধ্বনি খোঁজো, শব্দ ভাঙো, দেখো আর বানান করো, গল্পটি পড়ো, বাক্যটি শেষ করো). The old আপনি-form names (খুঁজুন ধ্বনি, দেখুন ও বানান, ভাগ করুন) were changed to match. Noun names were kept (ধ্বনি গণনা, অক্ষর অঙ্কন, অনুপস্থিত অক্ষর, শব্দাংশ জোড়া, শব্দাংশে তালি, পড়ো আর মেলাও, ধ্বনি বদলাও).
- Quoted activity names now use “…” everywhere (building_swap_task used «…»).
- "Activity" = কার্যকলাপ everywhere; "task" = কাজ. Fixed the outliers কাজ / কার্যক্রম (choose_activity_prompt, resume_activity, parent_summary_activity, lang_hidden_activities*, no_words_preloaded, phono_activity_length_hint, building_syllable_activity).
- "Class Mailbox" (audio_retry_mailbox_update) is translated descriptively as ক্লাসের ডাকবাক্স ("the class mailbox").
- of_total is only used in "{n} of_total {m} words_selected" (Lesson Preview). Bengali word order cannot follow "n of m", so of_total = "/" and words_selected = "শব্দ নির্বাচিত" ("5 / 10 শব্দ নির্বাচিত").
- single_sounds is bolded in the middle of the r-controlled sentence; it now carries "হিসেবে" so the sentence reads naturally.
- "Retry audio" (retry_audio, retry_audio_button, fix_audio) = "অডিওর জন্য আবার চেষ্টা করুন", quoted the same way in audio_failed_retry_hint. "Try sound again" = "আবার শোনার চেষ্টা করো" in all three places.
- Voice-pack strings used শব্দ ("word") for phoneme "sounds"; changed to ধ্বনি where a speech sound is meant.
- The activity-header toggles (switch_letter_mode/switch_sound_only/switch_click_mode/switch_mic_mode) now use তুমি forms, since they sit in the child's activity screen. Medium confidence.
- Left as is (already correct Bengali; only product/key names in Latin letters): decoding_needs_image, voice_pack_aicheck_needs_canvas, voice_pack_msg_need_mic (Canvas), sr_phoneme_keys (Space/Enter keys), r_controlled_example (English phonics example + method names).
- Uncertain: "Spelling Bee" = বানান প্রতিযোগিতা (the usual Bengali term, though the child plays alone); "Sound Mapping" = ধ্বনি থেকে অক্ষর; "Picture the Sentence" = ছবিতে বাক্য.

### burmese


Overall confidence: medium-high. The register split is the same as rounds 1-3: strings children see use the colloquial register (တယ်, ပါ, ဒီ), and teacher strings use the formal written register (သည်, ပါသည်, ဤ). Terms: clip = အသံဖိုင်, browser = ဘရောက်ဇာ, pack = အထုပ်, setup = သင်ခန်းစာ ပြင်ဆင်မှု, preview = နမူနာကြည့်ရှုမှု, phoneme (teacher) = ဖိုနိမ်း, story = ပုံပြင်, sentence = ဝါကျ, rhyme = ကာရန်. The tool name is “စကားလုံး အသံများ”, in quotes.

Activity names: Blend Sounds = အသံပေါင်းခြင်း, Find Sounds = အသံရှာခြင်း, Rhyme Time = ကာရန်တူ စကားလုံးများ, Sound Sort = အသံအလိုက် ခွဲခြားခြင်း, Word Families = စကားလုံးမိသားစု, Word Scramble = စကားလုံး ပြန်စီခြင်း, Read the Story = ပုံပြင် ဖတ်ပါ, Finish the Sentence = ဝါကျကို ဖြည့်ပါ, Picture the Sentence = ဝါကျအတိုင်း ပုံစီပါ (kept from round 2). The existing names were kept for Sound Counting, Letter Trace, Sound Mapping, Missing Letter, Sight & Spell, Break it Down, Spelling Bee, Sound Swap and Read & Match.

Changes beyond the listed items (46), for reviewers to note:

- **Syllable term unified for children.** `activity_syllable_blending`, `activity_syllable_counting`, `building_syllable_activity`, `listen_to_syllables`, `play_syllables`, `syllable_blending_desc`, `syllable_counting_desc` and `tap_each_syllable` used သီးခြားအသံ ("separate sound"), which round 1 flagged as easy to confuse with a phoneme. They now use အသံပိုင်း, like the round 1-3 child strings. Teacher strings keep ဝဏ္ဏ. Revert these if reviewers prefer one term everywhere.
- Word-by-word machine output was rewritten in `add_word`, `back_to_class`, `count`, `enable_lesson_plan`, `gen_image`, `listen_word`, `no_words`, `play_all_options`, `play_word`, `review_words`, `select_*`, `session_*`, `start`, `start_activity`, `spotlight_message`, `switch_click_mode`, `syllable_range` (previously သင်္ဂဏန်း, "numeral"), `theme_hint`, `word_families_desc` and others.
- `of_total` is now "/" so that "{n} / {total} စကားလုံး ရွေးထားသည်" reads naturally. The old "၏" ("of", possessive) produced broken word order.
- Distractor is now အထင်မှားစေသော ရွေးချယ်စရာ everywhere, matching `distractors`. The old အနှောက်အယှက် means "disturbance".

Low-confidence keys:

- `readiness_limits`, `readiness_preflight_send`, `readiness_preflight_start`: the "(cache)" gloss was dropped, leaving ယာယီမှတ်ဉာဏ်.
- `di_script_*`: "Lesson script" is သင်ခန်းစာ ဇာတ်ညွှန်း (ဇာတ်ညွှန်း = script, the term the pack uses for podcast/dialogue scripts).
- `subtitle`: "Phonemic Awareness" is အသံ ခွဲခြားသိမြင်မှု.
- `source_sight_words`, `sight_word_list_placeholder`: မြင်သိ စကားလုံး is a coined term.
- Left unchanged (only "Canvas" is English): `decoding_needs_image`, `voice_pack_aicheck_needs_canvas`, `voice_pack_msg_need_mic`.

### chin_falam


Overall confidence: low. As in rounds 1-3, this follows the Hakha translation (out4/chin_hakha.json), because the pack's Word Sounds section is largely Hakha. These Falam forms the pack attests replace the Hakha ones throughout:

- thuh (hide)
- dingh (stop)
- kut tin (clap)
- siam / siammi / siamnak (generate)
- hmanrua (device)
- bansiar (cancel)
- hlonh (discard)
- "Rel law Pehtlaih" (Read & Match)

Hakha's question particle "dah" is dropped. A Falam speaker should review every key.

Activity names are the same as in chin_hakha.notes.md: Aw Pehtonhnak, Aw Relnak, Aw Kawl, Cafang Zulh Ṭial, Aw le Cafang Pehtlaihnak, Cafang A Um Lomi, Zoh law Ṭial, Tuanbia Rel, Biafang Bu Kimter, Aw Aa Tlukmi Biafang, Aw Pakhat Cio, Aw Ningin Ṭhen, Ṭialning Zuamnak and Biafang Cafang Rem. Several names were kept from earlier rounds: Aw Thlenhnak, Rel law Pehtlaih, Biafang Bu Limceu, Biafang Chungkhar and the pack's Ṭhen Kuttin.

Low-confidence keys:

- The `voice_pack_*` keys that were flagged SUSPECT, plus `sr_tracing_canvas`, `speak_or_tap_mic`, `parent_summary_copy_failed` and `voice_pack_student_name`. The pack already had Falam-looking text here: hmet (tap), ngaw (hear), thei (can), ding (future), cui hnuah (then) and min (name). I kept that text and replaced only the English words (record, device, tool, biometric, Save & Use, Teacher/Student, mic, optional).
- tap/listen: the new strings use the earlier rounds' hnen and ngai. The pack also attests hmet and ngaw, so a Falam speaker should choose one form for the whole pack.
- Left as is: `sr_welcome` ("Word Sounds ah lo kalnak tha!") and `voice_pack_msg_saved`, because they are not English. Their wording should still be checked.
- Every item listed in chin_hakha.notes.md applies here too (Tahchunhnak for "anchor", Rang lo in, orhlei, Kilas Cakuat Kuang, the loanwords).

### chin_hakha


Overall confidence: medium-low. The vocabulary follows rounds 1-3: biafang, aw, biafang ṭhen, cafang, biafang bu, tuanbia, limceu, zirhtu, zirlai, cawnnak, rian, lehnak, zohkhenh, fehter, khawl, timh, ser / ṭhan in ser, remh, thlah, thilri, hnen (tap/click) and ngai (listen).

Activity names, now used the same way in every string that names them:

| English | Hakha |
|---|---|
| Blend Sounds | Aw Pehtonhnak |
| Sound Counting | Aw Relnak |
| Find Sounds | Aw Kawl |
| Letter Trace | Cafang Zulh Ṭial |
| Sound Mapping | Aw le Cafang Pehtlaihnak |
| Missing Letter | Cafang A Um Lomi |
| Sight & Spell | Zoh law Ṭial |
| Read the Story | Tuanbia Rel |
| Finish the Sentence | Biafang Bu Kimter |
| Rhyme Time | Aw Aa Tlukmi Biafang |
| Break it Down | Aw Pakhat Cio |
| Sound Sort | Aw Ningin Ṭhen |
| Spelling Bee | Ṭialning Zuamnak |
| Word Scramble | Biafang Cafang Rem |

These names were kept from earlier rounds: Sound Swap (Aw Thlenhnak), Read & Match (Rel law I Pehtlaih), Picture the Sentence (Biafang Bu Limceu), Word Families (Biafang Chungkhar), Syllable Claps and Syllable Blending.

Low-confidence keys:

- `anchor_badge` and the other `anchor_*` keys: "Anchor" is now "(Aw) Tahchunhnak" ("sound example"). The pack had left the English word "Anchor" in all of them.
- `spelling_bee_slow`: "Rang lo in" ("not fast"). I did not find a settled Hakha word for "slow".
- `ortho_activity_hint_off`: "orhlei ah thawn" ("push to the right"). Check the word for "right".
- `fb_no_text_mode`, `fb_text_scaffold`: "i ... hna u" for "let's".
- `audio_retry_mailbox_update`: "Kilas Cakuat Kuang (Class Mailbox)". The English feature name is kept in parentheses.
- `streak` ("Aa peh in a dik"), `di_timing` ("voi {mastery} peh lengmang in a dik") and `di_col_shape` ("Pianzia"), all on teacher screens.
- `r_controlled_explanation_*`, `single_sounds`, `spelling_bee_hint_vowels`: "vowel" is written as "a, e, i, o, u". I found no settled Hakha term.
- `image_refine_placeholder`, `nano_mode_hint`: the example edits were changed to "add a hat" (lukhom) and "make it red" (a sen) so the Hakha words are certain.
- `voice_pack_consent_body`, `voice_pack_intro_student`: "confidential" is "thup ding a simi" and "biometric-adjacent" is "pum hmelchunh he aa naimi".
- These loanwords are kept as the pack uses them elsewhere: browser, print, PDF, internet, mouse, file, pixel, Nano Mode, XP and TTS.
- Left as is: most other `voice_pack_*` strings. They were written in a Falam/Mizo-like register (hmet, ngak, pawl, ding, "lo" for "or") and still contain model, default and app. They need a Hakha reviewer.

### chinese_simplified


- "Class Mailbox" translated descriptively as 班级信箱.
- "Session" is still 会话 in untouched keys (session_complete, activity_length…); 本轮/练习 would read better for children if the owner wants a further pass. I only rewrote activity_length_hint and phono_activity_length_hint.
- Kept existing activity names that read acceptably (混合音, 拼写蜂, 声音分类); only the three English names were translated (读故事, 补全句子, 句子配图).

### chinese_traditional


- Tool name: work4 gives tool_name "單词发音", which mixes Simplified 词/发 into the Traditional pack. The validator requires that exact string, so the new strings quote it as 「單词发音」. Recommended follow-up: replace "單词发音" with "單字發音" in sidebar.tool_wordsounds, modal_title and every word_sounds value at once.
- Taiwan usage sweep: 單詞 -> 單字 (incl. Word Families -> 單字家族, Word Scramble -> 單字重組), 音頻 -> 音訊, 押韵 -> 押韻, 通過 -> 透過, 編辑/一顶 -> 編輯/一頂. "Session" is still 會話 in several untouched keys (session_complete, session_progress); 本輪/練習 would read better if the owner wants a further pass.
- "Class Mailbox" translated descriptively as 班級信箱.

### dari


- Same garbled Arabic/machine values as the Farsi pack were rewritten, in Dari vocabulary (شاگرد، قصه، کوشش، انترنت، رهنما/رهنمود، فارمت، کش کن، گپ زدن، ضرورت، یکجا کردن، polite نمایید). Values that were already sound but identical to Farsi were not touched; there was no general Dari-ization pass.
- Sound Swap renamed «جابه‌جایی آوازها» (was «جابه‌جایی صداها», the only activity name not using the pack's آواز); all mentions updated (manipulation_*, review_gap_task, building_swap_task, no_sound_swap_yet, regenerate_sound_swap_tooltip, sound_swap_*).
- Activity names that differ from Farsi: Letter Trace «تمرین نوشتن حروف», Break it Down «توته‌توته‌اش کن», Word Scramble «کلمهٔ درهم‌وبرهم», Read the Story «قصه را بخوان», Finish the Sentence «جمله را تکمیل کن»; the rest use آواز where Farsi uses صدا.
- Lesson script «متن تدریس»; Class Mailbox «صندوق پستی صنف» (descriptive; no pack precedent). Medium confidence on both.

### dutch


- Activity names use Dutch sentence case. Every mention is quoted as ‘…’, matching the round 2/3 strings: Lezen en koppelen, Klanken wisselen (replaces "Klankwissel" and "Klanken Wisselen"), Kijk en spel, Lettergrepen samenvoegen, Lettergrepen klappen, Lees het verhaal, Maak de zin af, Plaatjes bij de zin (kept from review_gap_tiles), Woordpuzzel (word_scramble_title was "Letterpuzzel" and now matches).
- Kept as is: Klanken in kaart brengen (Sound Mapping) and Splits het op (Break it Down). Both are understandable, although "Klanken in kaart brengen" is a calque. A native reviewer could consider "Hakken" for segmentation, the usual Dutch classroom term.
- The generic word for "activity" is "activiteit", which the pack uses most. I fixed the outliers that said "oefening": choose_activity_prompt, lang_hidden_activities(+_hint), parent_summary_activity, resume_activity and building_syllable_activity.
- "Class Mailbox" became "klasmailbox", the term personal_storage_notice already uses in the Dutch pack.
- Child audio messages say "geluid" and "geluidsfragmenten"; the teacher dock and setup say "audio" and "audiofragmenten". Counts use the form "X: {missing} van {total}" so no verb has to agree with a number.
- The value `audio_try_again` "Geluid opnieuw proberen" is quoted identically in audio_blocked_message and audio_teacher_blocked_title.
- Left out because the Dutch equals the English: bonus, help, tip, word_scramble_hint (Hint), readiness_category_feedback, anchor_compact_btn (Compact), parent_summary_score (Score), di_minutes ({n} min).
- I also changed several Title Case labels to sentence case: edit_sounds, listen_again, mystery_word/sound, items_*, home_practice*, parent_copy_button and others.

### farsi


- Beyond the listed items, ~110 older values were Arabic or broken machine output (e.g. «ادمج صداها», «بصر والإمخیرء», «کم صداًا؟», «عمل رائع!», «تسلسل اخیرختبار») and were rewritten.
- Activity names settled: Blend Sounds «ترکیب صداها», Sound Counting «شمردن صداها», Find Sounds «پیدا کردن صداها», Letter Trace «رد گرفتن حروف» (medium confidence), Sound Mapping «نقشهٔ صداها», Missing Letter «حرف گم‌شده», Sight & Spell «ببین و بنویس», Break it Down «تکه‌تکه‌اش کن», Sound Sort «دسته‌بندی صداها» (was «ترتیب صداها», which means "order of sounds"), Word Families «خانواده‌های کلمات», Word Scramble «کلمهٔ درهم‌ریخته», Read the Story «داستان را بخوان», Finish the Sentence «جمله را کامل کن», Picture the Sentence «تصویر جمله» (kept from round 2). Unchanged: Sound Swap, Read & Match, Rhyme Time, Spelling Bee, both syllable activities.
- New terms without a pack precedent: sight words «کلمات دیداری»; lesson script «سناریوی تدریس»; Class Mailbox «صندوق پستی کلاس»; mode_phonics (label while letter hints are shown) «صدا و حرف».
- "Try sound again" = «دوباره صدا را پخش کن»; the child and teacher messages quote that exact label.

### french


- Activity names: "Lire l'histoire", "Compléter la phrase", "La phrase en images" (infinitive, sentence case like most labels).
- Normalised labels to sentence case and unified mentions: "Lire et associer", "Échange de sons" (the pack had both "Échange de Sons" and "Échange de son"), "Fusion de syllabes", "Frappes de syllabes"; rhyme_options no longer says "Rhyme Time".
- Word Scramble "Mots mêlés" means a word-search grid in French; renamed "Lettres mélangées".
- Lesson script = "Déroulé de la leçon". correct (score tile) = "Bonnes réponses"; option labels = "Choix".
- Left as is (already correct French): add_image_button "+ Image", bonus, click_check_hint, feedback_correct, reading_unscored_review, di_minutes.

### french_canadian


- Same names and fixes as french ("Lire l'histoire", "Compléter la phrase", "La phrase en images", "Lettres mélangées", sentence-case labels).
- Lesson/student pack = "paquet" (as in this pack's round-2 strings); voice-pack label = "Pack vocal" because the existing voice-pack strings say "pack".
- probe_interrupted follows this pack's probe badge ("MODE DÉPISTAGE"): "Ce dépistage…".
- Left as is: add_image_button, bonus, click_check_hint, feedback_correct, reading_unscored_review, di_minutes (correct French).

### german


- Activity = „Übung“ throughout (start, start_activity, session_next_activity, select_activity, ortho_/phono_activity_* were still „Aktivität“ or garbled). Task/item = „Aufgabe“.
- Activity labels now use German sentence case (verbs lower case): „Laute tauschen“, „Lesen und zuordnen“, „Silben verbinden“, „Silben klatschen“. The mention strings were updated to match. „Bild zum Satz“ (round 2) became „Bilder zum Satz“, because the activity has several pictures.
- Word Scramble = „Buchstabensalat“. Spelling Bee keeps the pack's „Buchstabierwettbewerb“. Sight words = „Merkwörter“.
- "Class Mailbox" is translated as „Klassenpostfach“. Other namespaces of the pack still show "Class Mailbox" in English.
- About 150 extra keys outside the work4 list were garbled word-by-word output („Reversuchen Audio“, „Hear die Wort“, „Worts leseny“, „Tarerhalten Wort“…). The scan missed them, and they are rewritten here.
- r_controlled_explanation_prefix/suffix wrap the bold `single_sounds`. The German verb moved to the suffix („… werden als **einzelne Laute** gezählt, weil …“).
- parent_summary uses „du“, matching the pack's parent_summary_copied/_copy_failed.
- "Bonus!" is left as is (correct German).

### greek


- Activity names now use Greek sentence case (only the first word is capitalised): «Αλλαγή Φθόγγων» became «Αλλαγή φθόγγων», «Η Πρόταση σε Εικόνες» became «Η πρόταση σε εικόνες», and so on. Every place that mentions an activity was updated to match: review_gap_*, manipulation_*, building_swap_task, no_sound_swap_yet, regenerate_sound_swap_tooltip, word_families_skipped_for_students, count_without_recording_help, sound_positions_label, *_options and *_title.
- "Class Mailbox" (audio_retry_mailbox_update) is translated descriptively as «το ταχυδρομείο της τάξης».
- "Word Sounds" is written as the tool name «Ήχοι Λέξεων» in guillemets after a noun. Teacher strings use «το εργαλείο/υλικό «Ήχοι Λέξεων»». The child-facing sr_welcome says «στο «Ήχοι Λέξεων»». An inflected form would be more natural («στους Ήχους Λέξεων») but the validator requires the exact nominative.
- Child-facing strings refer to the teacher as «τον δάσκαλο ή τη δασκάλα σου», following the pack's existing count_* strings. The audio_ask_teacher_resend button is shortened to «Ζήτα να σου το ξαναστείλουν».
- In child-facing audio_* messages, a label-plus-count form («Χαλασμένα ηχητικά αποσπάσματα: {failed} από {total}.») avoids number agreement. di_timing uses labels for the same reason, and probe_interrupted uses «δευτ.».
- These items are left as is: decoding_needs_image, nano_mode_hint, sr_phoneme_keys, theme_placeholder, voice_pack_aicheck_needs_canvas and voice_pack_msg_need_mic. They are already correct Greek; the Latin words in them are product or key names (Canvas, Nano, Enter) or the usual loan "pixel art".
- Some other strings were improved too. They were word-by-word Greek machine output, which the English scan misses: count, review_words, session_*, gen_image, listen_word, no_words, preview_*, theme_hint, target_word and others. A few title-case labels were changed to sentence case.
- Uncertain: «Ώρα για ρίμες» (Rhyme Time) is a playful choice; the teacher strings keep the formal «ομοιοκαταληξία». «Χαρτογράφηση ήχων» (Sound Mapping) is kept, but «Αντιστοίχιση ήχων και γραμμάτων» would be plainer.

### gujarati


- New activity names: Read the Story = વાર્તા વાંચો, Finish the Sentence = વાક્ય પૂરું કરો, Picture the Sentence = ચિત્રોમાં વાક્ય ("the sentence in pictures"). Break it Down was a bare "તોડો" and is now શબ્દ તોડો; Sight & Spell is now જુઓ અને જોડણી કરો (the old label mixed a verb with a noun). Sound Swap mentions that said ધ્વનિ અદલાબદલી now use the label અવાજ બદલો.
- "Class Mailbox" (audio_retry_mailbox_update) is translated descriptively as વર્ગની ટપાલપેટી ("the class letterbox").
- "Try sound again" = અવાજ ફરી વગાડો ("play the sound again"), used the same way in all three strings.
- Left as is: decoding_needs_image, voice_pack_aicheck_needs_canvas, voice_pack_msg_need_mic (Canvas is a product name), sr_phoneme_keys (Space/Enter are key names), r_controlled_example and sound_swap_instruction_placeholder (English example words). These are already correct.
- "Nano Mode" is transliterated as નૅનો મોડ.
- of_total is set to "/". The only use is "{selected} {of_total} {total} {words_selected}", and the old postposition put the numbers in the wrong order ("out of 5, 20 words").

### haitian_creole

- "Lesson script" = "Senaryo leson". Voice-pack strings still use the loanword "default" as elsewhere in the pack; "pa defo" would be the purer form if a pack-wide pass wants it.
- Also fixed: Echanj Son -> Chanje Son (4 keys), "Mo Sight", "Kouri nan Background", "Pre-Aktivite", "Prevyou", "Ou se yon pro!".

### hausa


- The tool name stays "Word Sounds", because sidebar.tool_wordsounds is English. sr_welcome and voice_pack_msg_saved were already correct, so they are left out.
- New activity names: Read the Story = "Karanta Labarin", Finish the Sentence = "Kammala Jimlar", Picture the Sentence = "Jimla a Hoto" (from round 2).
- Renamed half-English names: Sound Sort = "Rarraba Sautuna" ("Tsara Sautuna" is already Sound Mapping), Word Families = "Iyalan Kalmomi", Word Scramble = "Jera Haruffa".
- Syllable Blending was "Haɗa Baƙaƙe" (join letters). It is now "Haɗa Ɓangarorin Kalma", matching the pack's syllable term.
- Fixed name mentions: sound_positions_label now says "Nemo Sauti", and sound_swap_label now says "Canza Sauti" (it said "Musayar Sauti").
- 80 values outside the work list were also rewritten. They were half-English or used a different activity name. Examples: spelling_bee_desc, parent_summary, the preview_* buttons (they play audio, so "Saurari …"), and r_controlled_explanation_*.
- Low confidence:
  - rhyme = "kari": rhyming_q and rhymes_with follow the pack's "Lokacin Karin". A Hausa educator may prefer "ƙafiya".
  - resource = "kayan koyarwa".
  - Class Mailbox = "Akwatin Saƙon Aji". Elsewhere the pack leaves the name in English.
  - connected text = "Rubutu a Jere".

### hebrew


- Children's strings use the plural (inclusive) imperative. Teacher strings keep the pack's masculine singular ("בדוק", "פתח").
- "Your teacher has been asked" is written as "ביקשנו מהמורה", which avoids gender.
- Activity names are nouns throughout. The three imperative names became nouns: Blend Sounds = "הרכבת צלילים", Find Sounds = "חיפוש צלילים", Break it Down = "פירוק לחלקים".
- New names: Read the Story = "קריאת סיפור", Finish the Sentence = "השלמת משפט", Picture the Sentence = "המשפט בתמונה" (from round 2).
- Sound Swap is "החלפת צלילים" everywhere. Four strings said "החלפת צליל".
- 44 values outside the work list were changed. About 40 of them are child-facing activity descriptions and prompts, changed from masculine singular to plural. Examples: the *_desc strings, select_activity, start_activity, check_spelling, sr_hear.
- These were left as is (Nano or Canvas only): nano_mode_hint, voice_pack_aicheck_needs_canvas, voice_pack_msg_need_mic.
- Many other child-facing pack strings still use the masculine singular, for example the voice_pack_* strings and switch_*_mode. They are not changed in this round.

### hindi


- Activity names now follow the pack's child-imperative pattern (ध्वनि बदलो, पढ़ो और मिलाओ): ध्वनियाँ जोड़ो, ध्वनि खोजो, कहानी पढ़ो, वाक्य पूरा करो, तुक मिलाओ, वाक्य के चित्र लगाओ, ध्वनि से छाँटो, शब्द सुलझाओ. "Word Families" = शब्द परिवार (already used in word_families_skipped_for_students and editing_word_family). Every mention (review_gap_tiles, sentence_match_needs_words, blend_options, rhyme_options, sound_positions_label, sound_swap_*, *_title, sound_sort_label) now uses these names.
- "Letter Trace" changed from अक्षर ट्रेस to अक्षर बनाओ, which matches sr_tracing_canvas ("अक्षर बनाने का कैनवास"). Kept as they were: ध्वनि गिनती, ध्वनि मानचित्रण, लुप्त अक्षर, देखें और लिखें, विभाजन करें, स्पेलिंग बी, अक्षर जोड़ो, अक्षरों पर ताली. Two of these, देखें और लिखें and विभाजन करें, use the आप form, unlike the others. I left them because the brief says to keep names that are already good.
- "Picture the Sentence" = वाक्य के चित्र लगाओ ("place the sentence's pictures"). This names what the child does rather than translating literally. Medium confidence.
- "Class Mailbox" (audio_retry_mailbox_update) is rendered descriptively as कक्षा मेलबॉक्स.
- "Try sound again" = आवाज़ फिर चलाओ, quoted identically in audio_blocked_message and audio_teacher_blocked_title. "Retry audio" = ऑडियो फिर से आज़माएँ, quoted in audio_failed_retry_hint. "Add Sound" = ध्वनि जोड़ें, quoted in no_phonemes_hint and no_phonemes_add_hint.
- Count placeholders in the audio messages sit in "(x / y)" after "कुछ ... हैं", so there is no number agreement.
- "Sight words" = दृष्टि शब्द. Medium confidence; the pack had no earlier term.
- I left decoding_needs_image, voice_pack_aicheck_needs_canvas and voice_pack_msg_need_mic as they were. They are already Hindi, and "Canvas" is a product name.
- I also fixed about 25 word-by-word keys that were not on the work list, such as start/start_activity, session_next_activity (अगला -> अगली गतिविधि), sound_sort_instruction, listen_word and gen_image.
- of_total = "/" (added by the coordinator). It is used only in "{selected} {of_total} {total} {words_selected}", where "का" read as "5 का 20".
- Coordinator: activity_segmentation विभाजन करें -> शब्द तोड़ो and activity_orthography देखें और लिखें -> देखो और लिखो, to match the तुम-form names. No other key mentions them.

### hmong


Overall confidence: medium-high. This is White Hmong RPA with the vocabulary from rounds 1-3: lo lus, suab, lub suab (syllable), xib fwb, tub ntxhais kawm / tus kawm, zaj lus qhia, haujlwm, tshuaj xyuas, daim clip, cuab yeej, pob, kev teeb tsa, npaj, kho, xa / xa dua, thov, kab lus, dab neeg, tsiaj ntawv, kov, nyem. Distractor = lus teb dag ntxias, matching the pack's `distractors`. Internet = is taws nem.

**Tool name.** The validator requires the pack's tool_name, "lo lus Word Sounds", wherever the English says Word Sounds (`audio_manage_for_student`, `audio_open_resource_*`, `audio_retry_teacher_needed`, `audio_review_repair_title`, `kokoro_recommended`). This tool_name is a round-1 machine artifact that literally means "the word 'Word Sounds'". The fix is still to rename sidebar.tool_wordsounds and modal_title (for example to "Suab Lo Lus"), then update these keys. `sr_welcome` and `voice_pack_msg_saved` were left as they are.

Activity names: Blend Sounds = Txuas Suab Ua Lo Lus, Find Sounds = Nrhiav Suab, Sound Sort = Cais Raws Suab, Word Families = Tsev Neeg Lo Lus (kept), Word Scramble = Teeb Lo Lus Kom Raug, Sound Mapping = Phim Suab Rau Tus Ntawv (replaces "Qhia Cov Suab Rau Daim Ntawv", which means "show the sounds to the paper"), Read the Story = Nyeem Dab Neeg, Finish the Sentence = Ua Kom Kab Lus Tiav, Picture the Sentence = Duab Raws Kab Lus (kept). The existing names were kept for Sound Counting, Letter Trace, Missing Letter, Sight & Spell, Break it Down, Spelling Bee, Rhyme Time (Lus Sib Lo), Sound Swap and Read & Match.

Low-confidence keys:

- **Browser is written as "device"** (lub cuab yeej) in `audio_blocked_message`, `audio_unsupported_*` and `audio_teacher_unsupported_title`.
- `mode_phonics` was "Suab Tsiaj" ("animal sound"). It is now "Suab thiab Tsiaj Ntawv". `mode_sound` is "Tsuas yog suab" ("sound only").
- `rhymes_with`, `rhyming_q`: "sib lo" follows the pack's Rhyme Time name "Lus Sib Lo". Confirm that this is the term teachers use for rhyme.
- `spelling_bee_hint_vowels`: "cov ntawv suab" for vowels.
- `segmentation_desc`: "dots" is "cov teev me me". `theme_placeholder`: cartoon is "duab kos" and pixel art is "duab plaub fab me me".
- `di_script_*`: "Lesson script" is "Daim ntawv qhia xib fwb" ("teacher guide sheet"). `di_col_syllable_type` is "Hom lub suab".
- `session` / "per session" is "ib zaug xyaum" ("one practice round"). The old "kev sib ntsib" means "a meeting".
- `tip` was "cov lus qhia" (instructions) and is now "Tswv yim". `word_scramble_hint` and other hints use "Lus pab".
- `r_controlled_*`: "R-controlled vowels" is simplified to "sounds with R".
- 77 non-listed broken values were also fixed, for example `preview_*` (which contained the garbage "Pkev"), `session_words_practiced` ("kev xyaumd"), `parent_summary`, `fb_*`, `retry_audio*`, `regen_image*`, `sources`, `source_*`, `count`, `listen_word` and `tracing_path_note`.

### igbo


Dotted vowels and no tone marks, as the pack does. Earlier rounds' terms are used: ngwugwu (pack), faịlụ ụda (audio clip), nhazi (setup), nnọkọ (session), ihe nchọgharị (browser), ngwaọrụ (device). The tool name is "Ụda Okwu".

- New activity names: Read the Story = "Gụọ Akụkọ Ahụ", Finish the Sentence = "Mezue Ahịrịokwu Ahụ", Picture the Sentence = "Ahịrịokwu na Foto" (from round 2).
- Renamed names: Sound Sort = "Hazie Ụda", Word Families = "Ezinụlọ Okwu", Word Scramble = "Okwu Agwakọtara".
- Fixed name mentions: sound_swap_label said "Mgbanwe Ụda" and is now "Ịgbanwe Ụda". sound_positions_label said "Ịchọta Ụda" and is now "Chọta Ụda".
- 85 values outside the work list were also rewritten. They were half-English, garbled or used a different activity name. Examples: "nke otu" ("one") had been used for "this", the preview_* buttons said "Pnyocha", and "okwu omumed".
- Retry audio = "Nwaa Ụda Ọzọ". audio_failed_retry_hint now names that button.
- Low confidence:
  - Rhyme Time keeps the pack's "Oge Ụda" (literally "sound time"). A better name for rhyme would need an Igbo teacher.
  - sight words = "Okwu A Na-amata Ozugbo" (a coined term).
  - Class Mailbox = "Igbe Ozi Klaasị".
  - mastery = "Nkà zuru oke".

### indonesian

- Beyond the listed items, ~120 other broken machine strings were rewritten (e.g. "Nice coba!", "Anda're sebuah pro!", "Rhyme Waktu", "kata Scramble").
- Level: level_n and level_up_* now use "Tingkat" (the pack mixed "LEVEL" and English). bonus "Bonus!" left (KBBI loanword).
- "default" in voice-pack strings became "bawaan". Sight words = "kata hafalan" (no settled term).
- Activity names: Gabung Bunyi, Cari Bunyi, Baca Cerita, Lengkapi Kalimat, Gambarkan Kalimat, Waktunya Berima, Pisahkan Bunyi, Kelompokkan Bunyi, Keluarga Kata, Kata Acak.

### italian


- Besides the 156 listed items, the pack had 126 more machine-mixed word_sounds values ("parole Families", "Scegli Another Attività", "Hear il parole", "Recensione parole", "Previsualizza risposte"…). I rewrote all I found by scanning the whole section; 282 values in total.
- Activity labels now sentence case and one name each: Unisci i suoni, Conteggio dei suoni, Leggi e abbina, Trova i suoni, Traccia la lettera, Scambio di suoni, Mappatura dei suoni, Lettera mancante, Leggi la storia, Completa la frase, Tempo di rime, La frase in immagini, Scomponiamo, Ordina i suoni, Gara di ortografia, Fusione di sillabe, Battiti sulle sillabe, Famiglie di parole, Parole in disordine. All mentions updated.
- Uncertain: "Copione della lezione" for the DI lesson script; "Vista e ortografia" (Sight & Spell) left unchanged but sounds stiff; sight words = "parole ad alta frequenza".
- Left as is: bonus ("Bonus!" is Italian), di_minutes ("min").

### japanese


- Activity name changes: 音を混ぜる -> 音をつなげる (blending; "mix" read oddly, and the desc already says 音をつなげる), ライム時間 -> ライムタイム (matches rhyme_options). Sound Swap mentions now all use 「音の 入れかえ」.
- Generic "activity" aligned to アクティビティ (resume_activity, parent_summary_activity, choose_activity_prompt, lang_hidden_activities(_hint), building_syllable_activity used 練習).
- "Class Mailbox" translated descriptively as クラスのメールボックス.

### kannada


- Activity names kept where the pack's label was sound. New or changed: Read the Story = ಕಥೆ ಓದು, Finish the Sentence = ವಾಕ್ಯ ಪೂರ್ಣಗೊಳಿಸು, Picture the Sentence = ವಾಕ್ಯಕ್ಕೆ ಚಿತ್ರ (the round-2 name), Letter Trace = ಅಕ್ಷರ ತಿದ್ದು (was ಅಕ್ಷರ ಗುರುತು, which reads as "letter mark/recognition"), Spelling Bee = ಕಾಗುಣಿತ ಸ್ಪರ್ಧೆ (label and title disagreed: ಅಕ್ಷರ ಸ್ಪರ್ಧೆ / ಸ್ಪೆಲ್ಲಿಂಗ್ ಬೀ). The word_scramble_title now matches the label ಪದ ಮಿಶ್ರಣ.
- Uncertain: ತಿದ್ದು is the school word for tracing letters (ತಿದ್ದುವ ಪುಸ್ತಕ), but it also means "correct". A native reviewer may prefer something else.
- Spelling: the buttons and prompts inside the spelling activities now use ಕಾಗುಣಿತ instead of ಅಕ್ಷರ ವಿನ್ಯಾಸ ("letter design"). These keys are check_spelling, spelling_bee_check, orthography_q, include_spelling_activities and fb_spelling_transition. The teacher strings ortho_* still use the loanword ಸ್ಪೆಲ್ಲಿಂಗ್. I left them as they are.
- "Try sound again" (audio_try_again) = ಮತ್ತೆ ಧ್ವನಿ ಕೇಳು. audio_blocked_message and audio_teacher_blocked_title quote that same label.
- In the child message, "Class Mailbox" is transliterated as ಕ್ಲಾಸ್ ಮೇಲ್‌ಬಾಕ್ಸ್. Elsewhere the pack keeps the English name.
- These items were left unchanged because they were already correct: decoding_needs_image and the voice_pack_*canvas/need_mic strings (Canvas is kept), sr_phoneme_keys (the Space and Enter key names), r_controlled_example and sound_swap_instruction_placeholder (English examples).

### karen


Overall confidence: low to medium. A native S'gaw reviewer should read every key, starting with the child strings. The vocabulary comes from the pack and rounds 1-3: clip/audio = အသီၣ်, voice = ကလုၢ်, syllable = တၢ်ကတိၤအကလုၢ်, device = စဲး, prepare = ရဲၣ်ကျဲၤ, setup = တၢ်ရဲၣ်ကျဲၤအလီၢ်, review = ကွၢ်သမံသမိး, repair = ဘှီဂ့ၤထီၣ်, send = ဆှၢ, request = ဃ့, confirm = အုၣ်ကီၤ, play (audio) = ဒုးသီၣ်, load = ဂုာ်ထီၣ်, tap = ဒိး, click = ဆဲးကၠုၥ်, letter = လံာ်မဲာ်ဖျၢၣ်, spelling = တၢ်ကွဲးလံာ်, sentence = တၢ်ကတိၤကျိၤ, story = တၢ်ဂ့ၢ်, type/kind = ကလုာ်. "Word Sounds" stays in English because the pack's tool_name is English.

Activity names: Blend Sounds = ဘျးစဲအသီၣ်, Sound Counting = နီၣ်ဂံၢ်အသီၣ်, Find Sounds = ဃုထံၣ်အသီၣ်, Letter Trace = ကွဲးပိာ်ထွဲလံာ်မဲာ်ဖျၢၣ်, Sound Mapping = ဘၣ်လိာ်အသီၣ်ဒီးလံာ်မဲာ်ဖျၢၣ်, Missing Letter = လံာ်မဲာ်ဖျၢၣ်လၢအလီၤမၢ်, Sight & Spell = ကွၢ်ဒီးကွဲး, Read the Story = ဖးတၢ်ဂ့ၢ်, Finish the Sentence = မၤလၢပှဲၤတၢ်ကတိၤကျိၤ, Rhyme Time = တၢ်ကတိၤအကတၢၢ်ဒ်သိး, Picture the Sentence = ရဲၣ်တၢ်ဂီၤဒ်တၢ်ကတိၤကျိၤ (kept from round 2), Break it Down = နီၤဖးတၢ်ကတိၤ, Sound Sort = ရဲၣ်လီၤဒ်အသီၣ်အသိး, Spelling Bee = တၢ်ပြၢကွဲးလံာ်, Word Families = တၢ်ကတိၤအဟံၣ်ဖိ (kept), Word Scramble = ရဲၣ်လီၤတၢ်ကတိၤကဒီး.

Priority checks:

- **Browser is written as "device" (စဲး)** in `audio_blocked_message`, `audio_unsupported_*` and `audio_teacher_unsupported_title`. The pack has no Karen word for browser.
- **Praise and effort words** (`fb_*`, `session_msg_*`, `great_job`, `parent_*`): ဂ့ၤဒိၣ်မး ("very good"), မၤကွၢ်ဂ့ၤ ("tried well"), ဂ့ၤကတၢၢ် ("best"). The pack has no attested word for "try/effort". `fb_spelling_transition` uses နသ့မး ("you are very able").
- "How many" is အါမနုၤ, carried over from round 1, and "which" is မနုၤ. Please confirm both.
- `anchor_badge`: "Anchor" is written ခးတၢ်နဲၣ် ("guide card"). The pack has no word for "anchor", and the other anchor keys are still English.
- `segmentation_desc`: "dots" is အဖျၢၣ်. `theme_placeholder`: ကၢ်တူၣ် (cartoon) is a transliteration that is not attested in the pack. "Pixel art" is described as "picture of small dots".
- `voice_pack_pack_label`, `close_bank` and the voice-pack messages: "pack/bank" is အသီၣ်အဖု ("sound set"). `voice_pack_msg_*` refers to the Save & Use button by its pack label “ပာ်ဖှိၣ် & သူ”.
- `di_script_*`: "Lesson script" is တၢ်သိၣ်လိအတၢ်ကွဲး ("teaching text"). `di_timing`: "consecutive" is ပိာ်ထွဲလိာ်အသး.
- `r_controlled_explanation_*`: rewritten without a word for "vowel", which is not attested: "sounds followed by R are counted as one sound because the sound before it and R join".
- `garden_lesson_ready`, `use_garden_words`: "Word Garden" is kept as a feature name, as the pack does elsewhere.
- `spelling_bee_hint_vowels`, `image_refine_placeholder`, `nano_mode_hint`, `level_up_star` and the long voice-pack intros are still half English. They were not fixed because the vowel, banana, blue and star terms could not be confirmed.
- Left unchanged (correct, the only English is the tool name): `sr_welcome`, `voice_pack_msg_saved`.
- 61 non-listed half-English keys were also fixed (`activity_blending`, `activity_rhyming`, `activity_word_scramble`, `word_scramble_title`, `blend_options`, `rhyme_options`, `count`, `session_*`, `switch_*`, `preview_*`, `r_controlled_*`, `sr_phoneme_keys` "press" = ဆီၣ်, and others). Every Myanmar-script syllable is attested in the pack except the joins with ဒ် and ကၢ်တူၣ်.

### khmer


- Activity names: Blend Sounds ផ្សំសំឡេង, Find Sounds រកសំឡេង, Rhyme Time ពាក្យចួន (matches review_gap_rhyme), Sound Sort ចាត់ក្រុមសំឡេង, Word Families ក្រុមពាក្យ, Word Scramble រៀបអក្សរជាពាក្យ, Read the Story អានរឿង, Finish the Sentence បំពេញប្រយោគ, Picture the Sentence ផ្គូផ្គងរូបភាពនឹងប្រយោគ, Read & Match spacing fixed to អាន និងផ្គូផ្គង.
- Beyond work4, changed 42 more keys, mostly word-by-word values (spaced word salad such as ចាប់ផ្តើម សកម្មភាព, ប្តូរ ទៅ ចុច របៀប, ល្អ ការងារ!).
- Kept the existing spelling ប្តូរសំឡេង in the Sound Swap name because every mention uses it; new free text uses ម្ដង / ប្ដូរ.
- Sight words rendered as ពាក្យស្គាល់ភ្លាមៗ; "Class Mailbox" as ប្រអប់សំបុត្រថ្នាក់. voice_pack_intro now keeps the English example "puh" (was transliterated ផឺ).

### kinyarwanda


Confidence: medium-high. The vocabulary follows rounds 1-3: amajwi/ijwi, ijambo/amagambo, uduce, igisubizo, umwarimu, umunyeshuri, isomo (lesson and session), igikorwa (activity), umwitozo (task), pake, igikoresho, interineti, amadosiye y'amajwi (clips), Itegurwa (setup), Tunganya (generate).

- **Settled:** Blend Sounds = Guhuza Amajwi, Sound Sort = Gutondeka Amajwi, Read the Story = Soma Inkuru, Finish the Sentence = Uzuza Interuro, Picture the Sentence = Interuro mu Mashusho.
- **Changes from round 2:** Picture the Sentence was "Interuro mu Ishusho" and is now plural, because the activity has several pictures. review_gap_tiles was updated to match.
- **Why Blend Sounds changed:** "Vanga Amajwi" means "mix sounds" and clashed with Word Scramble "Vanga Ijambo". The new name matches Syllable Blending "Guhuza Uduce tw'Ijambo", and blend_options, blending_instruction and voice_pack_msg_blending now use the same verb.
- **Wrong words fixed:** "Igutondeka" and "Igusimbuza" are not real words. They are fixed in sound_sort_label and sound_swap_label.
- **Generic "activity":** the outliers that said umukino (game) now say igikorwa: resume_activity, choose_activity_prompt, parent_summary_activity and building_syllable_activity. choose_activity's concord is fixed to "Ikindi Gikorwa". activity_length ("Items per Session") is now "Ibibazo ku Isomo"; it used to say "activities".

- **browser** = "mushakisha". **Class Mailbox** = "Agasanduku k'Ubutumwa k'Ishuri", translated descriptively.
- **audio_try_again** = "Ongera wumve ijwi" ("hear the sound again"). The same label is quoted in audio_blocked_message and audio_teacher_blocked_title.
- **Retry audio** = "Subira ugerageze ijwi", the pack's existing retry_audio value. fix_audio and audio_failed_retry_hint now use it too.
- **probe_interrupted**: "tab" = "paji". The last clause says the rate shown is lower than the child's real rate.
- **di_timing**: "Mastery" = "Kumenya neza". **di_col_shape** = "Imiterere". **bank_show_letters**: graphemes = "grafema", coined by analogy with the pack's "Fonema".
- **no_words_preloaded / no_sound_swap_yet**: the old text used "nta gihe" for "yet", which is wrong. The new text uses the -ra- "not yet" form.
- **voice_pack_intro**: "puh" is restored as an English example; the pack had changed it to "pe".
- **Left as is:** sound_swap_instruction_placeholder (already correct; 'word' is the English example). nano_mode_hint keeps "Nano" as a feature name.

### kirundi


Confidence: medium. The pack's word_sounds section was heavily broken: half-English machine output plus Kinyarwanda copies. Beyond the work4 items, I rewrote about 145 other keys that were clearly broken. All values use Kirundi forms:
- inyishu, canke, amajambo, umwigisha / umunyeshure
- Hitamwo, Tangura, Ugurura, Bandanya, ng'aha, nimba, hasi
- the progressive "Turiko tura-" (the pack had Kinyarwanda "Turimo")
- c-/vy- concords: igikorwa ca, ibikorwa vyo
- Icongereza, mpuzamakungu, vyoroshe
- indome for "letter", replacing Kinyarwanda "inyuguti" everywhere in word_sounds
- Nyegeza for "hide" (common.hide), Kwega for "drag" (common)

- **Fixed:** Syllable Claps "Gukoma Amashyi..." became "Gukoma Amashi ku Buri Kace" (Kirundi *amashi*, as in stem.music.clap). Missing Letter is "Indome Ibuze" and Letter Trace is "Gukurikira Indome".
- **Settled:**
  - Blend Sounds = Guhuza Amajwi
  - Find Sounds = Rondera Amajwi
  - Sound Sort = Gutondeka Amajwi
  - Word Families = Imiryango y'Amajambo
  - Word Scramble = Ijambo Ryavanzwe
  - Sight & Spell = Raba & Andika
  - Read the Story = Soma Inkuru
  - Finish the Sentence = Uzuza Interuro
  - Picture the Sentence = Interuro mu Mashusho (plural; review_gap_tiles updated)
- **Break it Down:** "Bimanure" means "bring them down", so it became "Sambura Ijambo" ("take the word apart").
- **Task:** "umukoro", following round 2's review_gap_task. building_swap_task, no_sound_swap_yet and regenerate_* use it too. **Session:** "isomo".

- **Gutondeka** (sort) and **Sambura** (take apart): I believe both are Kirundi. A native check is welcome.
- **audio_*:** "damaged" = "yononekaye", "browser" = "mushakisha", "live AI" = "AI ikora aho nyene". **Class Mailbox** = "Agasandugu k'Ubutumwa k'Ishure", translated descriptively. **audio_try_again** = "Subira wumve ijwi", quoted identically in the two messages.
- **di_timing**: "Mastery" = "Igipimo co kumenya". **di_heading_objective** = "Intumbero", as used elsewhere in the pack.
- **r_controlled_explanation_prefix / _suffix**: vowels = "inyajwi". **source_ai** = "Ikiyago (AI)". **settings** and **sr_dismiss** were not touched.
- **anchor_key_word**: "nyamukuru" replaces Kinyarwanda "ingenzi".
- **Left as is:** studio_title (must not change), sr_welcome rendered "Kaze muri ...", and voice-pack strings that were already Kirundi.

### korean


- Activity names: Blend Sounds 소리 합치기, Find Sounds 소리 찾기, Rhyme Time 라임 타임, Sound Sort 소리 분류하기, Word Families 단어 가족, Word Scramble 뒤죽박죽 단어, Read the Story 이야기 읽기, Finish the Sentence 문장 완성하기, Picture the Sentence 그림으로 문장 맞추기.
- Beyond work4, changed 51 more keys: word-by-word garbage found by scanning (e.g. 시작 활동, 선택 모든, 뒤로 에 학급, 표시 더 많이, 올바른!), plus 당신 -> 내 in child-facing voice-pack strings and a 반말 line in level_up_star.
- of_total is a fragment between two numbers ("{n} of {m} words selected"); Korean word order cannot follow it, so it is now "/".
- Child prompts about rhyme use 끝소리가 같은 (rhyming_q, rhymes_with, rhyming_desc); the activity keeps the name 라임 타임.
- "Class Mailbox" translated descriptively as 학급 우편함.

### lao


Overall confidence: medium-high. Vocabulary follows rounds 1-3: ຄຳ, ສຽງ, ພະຍາງ, ໜ່ວຍສຽງ, ຄູ, ນັກຮຽນ/ຜູ້ຮຽນ, ກິດຈະກຳ, ຊຸດ (pack), ໜ້າຕັ້ງຄ່າ (setup), ຄລິບ (clip), ກຽມ (prepare), ແຕະ (tap), ກົດ (click). The child is ເຈົ້າ and the teacher is ທ່ານ. The tool name is written ສຽງຄຳ and put in quotes (“ສຽງຄຳ”) where it would otherwise read as the plain phrase "word sound".

Activity names: Blend Sounds = ປະສົມສຽງ, Sound Counting = ນັບສຽງ, Find Sounds = ຊອກຫາສຽງ, Letter Trace = ຂຽນຕາມຮອຍໂຕອັກສອນ, Sound Mapping = ໂຍງສຽງກັບໂຕອັກສອນ, Missing Letter = ໂຕອັກສອນທີ່ຫາຍໄປ, Sight & Spell = ເບິ່ງແລ້ວສະກົດ, Read the Story = ອ່ານເລື່ອງ, Finish the Sentence = ເຕີມປະໂຫຍກໃຫ້ຄົບ, Rhyme Time = ຄຳສຳຜັດ, Picture the Sentence = ຈັດຮູບຕາມປະໂຫຍກ (kept from round 2), Break it Down = ແຍກສຽງ, Sound Sort = ຈັດກຸ່ມຕາມສຽງ, Spelling Bee = ແຂ່ງສະກົດຄຳ, Word Families = ຄອບຄົວຄຳ (kept).

Low-confidence keys:

- `activity_rhyming`, `rhyme_options`: the pack uses ສຳຜັດ for "rhyme" (rhymes_with, review_gap_rhyme). The old `rhyme_options` had ສຳພັດ, which means "relative" or "contact", so it was corrected. Some Lao teachers may prefer ຄຳຄ້ອງຈອງ.
- `session_*`, `activity_length*`: "session" is ຮອບ ("round"), not the loanword ເຊດຊັນ, so children can follow it.
- `mode_sound`: the English value is "Sound", but the code fallback is "Sound Only" and it toggles against Phonics, so it is ສຽງເທົ່ານັ້ນ.
- `di_script_*`: "Lesson script" is ບົດສອນ. `di_col_shape` (CVC pattern) is ຮູບແບບ.
- `sight_word_list_placeholder`, `source_sight_words`: ຄຳຮູ້ຈັກທັນທີ, taken from the pack's typing-practice string.
- `probe_interrupted`: "understates how fast" is rephrased as "shows the child as slower than they really were".
- `sound_swap_instruction_placeholder`: the placeholder 'word' is written 'ຄຳ'.
- Left unchanged (already correct, only "Canvas" is English): `decoding_needs_image`, `voice_pack_aicheck_needs_canvas`, `voice_pack_msg_need_mic`.

### latin

- Left unchanged because they are already correct Latin: band_medium / difficulty_medium_emoji "Medium", di_minutes "{n} min".
- Tool name "Soni Verborum" is kept indeclinable inside «» where the sentence needs another case (e.g. "pro «Soni Verborum»"), so the exact pack name stays visible.
- Replaced ~75 old macron-style machine strings (e.g. "Blend Sonī", "verbum Families", "Magnus work!") with the cleaner unmarked style of earlier rounds.
- Neo-Latin coinages: Verbum Permixtum (Word Scramble), Digestio Sonorum (Sound Sort), Inventio Sonorum (Find Sounds), Verba Visu Nota (sight words), Capsa Epistularum Classis (Class Mailbox), navigatrum (browser, as already in the pack).

### lingala


Confidence: medium-high for the child strings, medium for the teacher strings. The vocabulary follows rounds 1-3:
- mongongo/mingongo, liloba/maloba, biteni, eyano/biyano, molakisi, moyekoli/bayekoli
- liteya (lesson, also used for "session"), mosala (activity and task), pakɛ
- fisyé ya mongongo (clip), aparɛyi, aplikasyo, fraze, tɛkstɛ (text, because makomi means recording)
- « » quotation marks
- "browser" = "navigateur", as the pack already uses.

- The pack used *bomba* for "hide" in anchor_hide, anchor_hide_btn, hide_word, switch_sound_only and lang_hidden_activities_hint. These now use **kozipa / Zipá** ("cover") or "emonisami te" ("not shown").
- Every remaining *bomba* form means save or store.

- **Settled:**
  - Blend Sounds = Kosangisa Mingongo
  - Find Sounds = Koluka Mingongo
  - Letter Trace = Kolanda Lɛtrɛ
  - Missing Letter = Lɛtrɛ Ezangi
  - Sound Sort = Mabóke ya Mingongo ("sound groups")
  - Word Families = Mabota ya Maloba
  - Word Scramble = Liloba Ebulunganí
  - Read the Story = Tángá Lisolo
  - Finish the Sentence = Silisá Fraze
  - Picture the Sentence = Fraze na Bililingi (plural; review_gap_tiles updated)
- **Letter spelling:** the pack uses "lɛtrɛ" almost everywhere, so I changed "Litɛlɛ" to "Lɛtrɛ" in the two activity labels.

- **Word Scramble** "Liloba Ebulunganí" ("the mixed-up word", from *kobulunganisa*). A reviewer may prefer a plainer name.
- **Retry audio** = "Meká mongongo lisusu". It is quoted in audio_failed_retry_hint, and fix_audio uses the same label. **audio_try_again** = "Yoká mongongo lisusu".
- **Class Mailbox** = "Sanduku ya Nsango ya Kelasi", translated descriptively.
- **di_script_print** = "Bimisá na papie" (print). **di_timing**: "Mastery" = "Koyeba malamu".
- **ortho_activity_hint_off**: "slide right" = "Bendá epai ya loboko ya mobali".
- **r_controlled_***: vowels = "ba-voyɛlɛ" (loanword).
- **Left as is:** Read & Match "Tánga mpé Kokanisa", Sound Mapping "Kolakisa Mingongo", Rhyme Time "Ngonga ya Rime", and Break it Down "Kokabola Yango". They are understandable, so I did not rename them.

### maay_maay


**PROVISIONAL**, as in rounds 1-3. The pack is written in Standard (Northern) Somali, not Af-Maay. These values are this round's somali.json, plus Somali-pack values for the many maay keys that were still English or half-English, adjusted to this pack. If the pack is rewritten in real Af-Maay, every key needs a Maay speaker.

Pack-specific choices:
- The tool name stays "Word Sounds", because the pack's tool_name is English.
- Listen is spelled "Dhagayso", setup is "Dejinta" (as in round 2), and home practice is "Tababar" (the pack's "Tababar Guriga").
- Settings is "Habaynta" (close to the pack's common.settings "Habeenta"). The Somali pack uses the opposite pair: setup "Habaynta", settings "Dejinta".
- Phoneme is "Fooniim / Fooniimyada", following the pack's sr_phoneme. The Somali pack says "Codadka Furaha".
- Anchor is "barroosin", as in the Somali pack. This pack still showed the English word "Anchor".
- I left the voice_pack_* consent and intro texts alone. They are already Somali and only contain loanwords (clip, app, browser).

The same open points as somali apply: the syllable term, rhyme "qaafiyad", and the activity names.

### malayalam


- Activity names kept where the pack's label was sound. New or changed: Read the Story = കഥ വായിക്കൂ, Finish the Sentence = വാക്യം പൂർത്തിയാക്കൂ, Picture the Sentence = വാക്യത്തിന് ചിത്രം (the round-2 name), Letter Trace = അക്ഷരത്തിനു മുകളിലൂടെ എഴുതൂ (was the half-English അക്ഷര ട്രേസ്), Sound Mapping = ശബ്ദത്തിന് അക്ഷരം (was ശബ്ദ മാപ്പിംഗ്), Missing Letter = വിട്ടുപോയ അക്ഷരം (was നഷ്ടപ്പെട്ട "lost"), Spelling Bee = അക്ഷരവിന്യാസ മത്സരം (the pack's spelling term). word_scramble_title now matches the label പദം ക്രമപ്പെടുത്തുക.
- Uncertain: the Letter Trace name is descriptive and long. A native reviewer may prefer something shorter. അക്ഷരവിന്യാസ മത്സരം is also long for K-2.
- "Try sound again" (audio_try_again) = ശബ്ദം വീണ്ടും കേൾക്കൂ. audio_blocked_message and audio_teacher_blocked_title quote that same label.
- Child strings use ടീച്ചർ. Teacher strings use അധ്യാപകർ and പഠിതാവ് (for "learner").
- In the child message, "Class Mailbox" is transliterated as ക്ലാസ് മെയിൽബോക്സ്.
- These items were left unchanged because they were already correct: decoding_needs_image and the voice_pack_*canvas/need_mic strings (Canvas is kept), sr_phoneme_keys (the Space and Enter key names), r_controlled_example and sound_swap_instruction_placeholder (English examples).
- Also fixed: enable_lesson_plan, where പാഠ്യപദ്ധതി ("curriculum") became പാഠ പദ്ധതി ("lesson plan").

### marathi


- New activity names: Read the Story = गोष्ट वाचा, Finish the Sentence = वाक्य पूर्ण करा, Picture the Sentence = चित्रांतून वाक्य.
- Renamed: Break it Down "तोडून टाका" (sounds like "break it off") -> शब्द फोडा. Spelling Bee "स्पेलिंग बी" -> स्पेलिंग स्पर्धा, because बी means "seed" in Marathi. Word Scramble had two names (उलगडा / भेळसळ); the title now matches the label शब्द उलगडा.
- The generic word "activity" is now क्रियाकलाप everywhere. Six outliers used कृती: building_syllable_activity, choose_activity_prompt, lang_hidden_activities(_hint), parent_summary_activity, resume_activity.
- "Class Mailbox" = वर्गाची टपालपेटी (descriptive).
- di_minutes / di_timing use the abbreviation "मि.", so the text does not need to agree with the number.
- Left as is: decoding_needs_image, voice_pack_aicheck_needs_canvas, voice_pack_msg_need_mic (Canvas = product), sr_phoneme_keys (key names), r_controlled_example (already correct).
- of_total is set to "/". The only use is "{selected} {of_total} {total} {words_selected}", and the old postposition put the numbers in the wrong order ("out of 5, 20 words").

### marshallese


Overall confidence: low to medium. This uses the pack's dot-below orthography and the vocabulary from rounds 1-3: naan, ainikien, ṃōttan naan, leta, jāntōj, bwebwenato, pija, rūkaki, rūkkatak, katak, jerbal, uwaak, etale, kamool, kōjparok, kōpooj, (bar) kōṃṃan, kōṃṃan jiṃwe, jilkinḷọk, kein jerbal, rekoot, dṛuji (tap), jibwe (click), roñjake, kāālōt and setup (loanword).

New words from the pack:

- Kōkaḷḷe (hint)
- Kōjjeḷā (tip)
- Joñan Pen (difficulty)
- Karōk (settings)
- minit (minute)
- tōbtōb (dot)
- addi in peiṃ (finger)
- maroro (green)
- "Etal likin" (the pack's Export button)

Activity names:

| English | Marshallese |
|---|---|
| Blend Sounds | Kobaik Ainikien |
| Sound Counting | Bwini Ainikien |
| Find Sounds | Pukot Ainikien |
| Letter Trace | Ḷoor Leta |
| Sound Mapping | Ainikien ñan Leta |
| Missing Letter | Leta eo Ej Jako |
| Sight & Spell | Lale im Je |
| Read the Story | Riit Bwebwenato |
| Finish the Sentence | Kadedeḷọk Jāntōj |
| Rhyme Time | Ainikien ko Rej Jekdọọn |
| Break it Down | Kōjenolọk Ainikien |
| Sound Sort | Kumi kōn Ainikien |
| Spelling Bee | Je Naan |
| Word Scramble | Karōk Naan |

These names were kept from earlier rounds: Ukot Ainikien, Riit im Kobaik, Pija in Jāntōj, Baaṃle in Naan, Kobaik Ṃōttan Naan and Kabbokbok ñan Ṃōttan Kajjojo.

Low-confidence keys:

- `activity_spelling_bee`, `spelling_bee_title`: "Je Naan" ("Spell words"). I avoided an uncertain word for "contest".
- `add_sound` and the `no_phonemes_*` hints that quote it: "+ Bar Juon Ainikien" ("another sound"). I avoided Kobaik because it is the Blend Sounds name.
- `edit_sounds` (not changed): the pack's "Ukot Ainikien Ko" is close to the Sound Swap name "Ukot Ainikien". Check whether this confuses readers.
- `anchor_badge`, `anchor_*`: "anchor" is now "waanjoñak (in ainikien)" ("(sound) example").
- `voice_pack_*`: "Voice Pack" is "Pak in Ainikien", "default" is "eo jinoin" and "model" is "waanjoñak". `voice_pack_progress_legend` keeps the English colour words green, amber and grey next to maroro, because I am unsure of the Marshallese words for amber and grey. "Test" is the loanword "teej".
- `sr_welcome`: "Iọkwe! Kōṃij karuwainene eok ñan Word Sounds!" replaces "Kwojimwe", which I could not verify.
- `probe_interrupted`, `di_timing`, `di_heading_objective` (Mejānkajjik), `streak` (juon ālkin juon) and `source_ai` (Tōpik kōn AI) are teacher strings. Check that they read naturally.
- `ortho_activity_hint_off`: "Slide right" is rendered "Ukot" ("switch"), without a word for "right".
- `image_refine_placeholder`, `nano_mode_hint`: the examples were changed to bao (bird) and būrōrō (red) so the Marshallese words are certain.
- Left as is: six SUSPECT keys whose only English word is "setup" (`review_pack_stopped`, `review_pack_silent`, `review_gap_sentence_audio`, `review_gap_tiles`, `sound_sort_review_needed`, `word_families_review_needed`). Earlier rounds kept "setup" as a loanword, and `back_to_setup` uses it too. If "karōk" is preferred, change all seven together.
- Loanwords kept: browser, print, PDF, internet, mouse, file, pixel, Canvas, Class Mailbox, Nano Mode, XP and TTS.

### nepali


- Activity labels now use the pack's "-ने" noun style (ध्वनि फेर्ने, अक्षर जोड्ने): Blend Sounds = ध्वनि जोड्ने, Find Sounds = ध्वनि खोज्ने, Letter Trace = अक्षर कोर्ने (was the formal "कोर्नुहोस्"), Read the Story = कथा पढ्ने, Finish the Sentence = वाक्य पूरा गर्ने, Rhyme Time = तुक मिलाउने, Break it Down = शब्द टुक्र्याउने, Sound Sort = ध्वनि छुट्याउने. Other names: Picture the Sentence = वाक्यका चित्र, Spelling Bee = हिज्जे प्रतियोगिता, Word Families = शब्द परिवार, Word Scramble = शब्द पजल.
- The generic word "activity" is now क्रियाकलाप everywhere. About 15 strings used गतिविधि, several of them in garbled word order (start, start_activity, select_activity...).
- Besides the work4 list, I fixed about 25 garbled machine strings that the English-word scan cannot see because they are fully in Devanagari but in English word order. Examples: add_word, play_word ("खेल्नुहोस् शब्दहरू" = "play-a-game words"), gen_image, select_all, switch_click_mode, session_complete ("complete the session!"), phonemes ("ध्वनिमा" = "in sound"), no_words (it still contained "No").
- Retry audio = "अडियो पुनः प्रयास गर्नुहोस्" (with visarga) so it matches the quote in audio_failed_retry_hint. Add Sound = "+ ध्वनि थप्नुहोस्" to match no_phonemes_hint.
- "Class Mailbox" = कक्षाको हुलाक बाकस (descriptive).
- survey_body uses तपाईं (it reads as a teacher survey). The source key was not found, so medium confidence.
- Left as is: decoding_needs_image, voice_pack_aicheck_needs_canvas, voice_pack_msg_need_mic (Canvas = product), sr_phoneme_keys (key names).
- of_total is set to "/". The only use is "{selected} {of_total} {total} {words_selected}", and the old postposition put the numbers in the wrong order ("out of 5, 20 words").

### pashto


- Activity names settled (none checked by a native speaker): Blend Sounds د غږونو یوځای کول; Sound Counting د غږونو شمېرل; Read & Match ولوله او سره جوړ کړه (kept); Find Sounds د غږونو موندل; Letter Trace د تورو کښل; Sound Swap د غږ بدلول (kept); Sound Mapping د غږونو او تورو نښلول; Missing Letter ورک توری; Sight & Spell وګوره او ولیکه; Read the Story کیسه ولوله; Finish the Sentence جمله بشپړه کړه; Rhyme Time د قافیې وخت; Picture the Sentence جمله انځور کړه (round 2 term); Break it Down کلمه ټوټه ټوټه کړه; Sound Sort د غږونو ډلبندي; Spelling Bee د املا سیالي (was د لیکلو سیالي, "writing contest"); Syllable Blending د څپو یوځای کول (kept); Syllable Claps د څپو چکچکې (was په هره څپه یو چکچکی); Word Families د کلمو کورنۍ; Word Scramble ګډوډې کلمې.
- audio_retry_mailbox_update keeps "Class Mailbox" in brackets after د ټولګي پوستي صندوق, because the rest of the Pashto pack uses the English product name.
- of_total is "/" ("3 / 10 غوره شوې کلمې"): the string is built as count + of + total + "words selected", so Pashto له ... څخه cannot go around the second number.
- for_word is لکه (letter tracing: "A لکه apple").
- anchor_compact_says is " غږ یې " ("لنګر: توری a غږ یې /æ/، لکه apple"). It reads correctly but is a little terse.
- Distractor was اخته کوونکي ("infected/afflicting"), which is the wrong meaning. It is now غلط انتخاب in the label, placeholder and preview keys. distractors / wf_edit_hint keep د اشتباه اچوونکي انتخابونه.
- Left as is: decoding_needs_image, nano_mode_hint, sr_phoneme_keys, voice_pack_aicheck_needs_canvas, voice_pack_msg_need_mic. They were flagged only for protected tokens (Canvas, Nano, AI, Space/Enter key names) and are already correct Pashto.

### polish


- Activity names: Read the Story = „Przeczytaj historyjkę”, Finish the Sentence = „Dokończ zdanie”, Picture the Sentence = „Obrazki do zdania”, Spelling Bee = „Dyktando”, Word Scramble = „Rozsypanka literowa” (the usual Polish school term), Rhyme Time = „Czas na rymy”, Word Families = „Rodziny wyrazów”. I fixed the capitalisation of „Zamiana głosek”, „Łączenie sylab”, „Klaskanie sylab” and „Czytaj i dopasuj” and every place they are mentioned.
- I kept „Wzrok i pisownia” (Sight & Spell) because it was not garbled. It is still a literal translation, and „Zobacz i wybierz pisownię” would be an option.
- I used „ćwiczenie” everywhere for "activity". The outliers „aktywność” and „zajęcia” are fixed.
- „Ponów audio” now replaces „Powtórz audio” in retry_audio, retry_audio_button and fix_audio, and it is quoted the same way in audio_failed_retry_hint. „Włącz dźwięk ponownie” (audio_try_again) is quoted the same way in both places that mention it.
- "Class Mailbox" is rendered descriptively as „klasowa skrzynka wiadomości”.
- "Sight words" is translated as „słowa do czytania globalnego”.
- I left out bonus („Bonus!”) and di_minutes („{n} min”) because the correct Polish is identical to the English.
- words_ready follows a number that comes from outside the string, so a phrase like „N gotowych słów” cannot avoid number agreement. I used „(liczba gotowych słów)” instead. words_selected only gets the typo fixed („słów wybrano”).

### portuguese_angola


- Built on the European Portuguese round with this pack's own terms: "clipes", probe = "sondagem", "Letra em Falta". Picture the Sentence unified as "Frase em Imagens" (round 2 had coined "Imagens da Frase").
- Also fixed machine-mixed values: count ("palavra Contar"), listen_word, preview_answer_*, preview_instruction_*, preview_title ("lição Previsão"), session_complete, settings, source_glossary, tip, word_scramble_hint, spelling_bee_slow, theme_hint; capitalisation of "Encontrar Sons"/"Hora da Rima".
- Open: AO1990 vs pre-reform spelling (atividade/actividade) is still a pack-wide decision for a native reviewer.
- Left as is: SUSPECT "use" items (Portuguese imperative), di_minutes.

### portuguese_brazil


- Activity names: "Ler a História", "Completar a Frase", "Frase em Imagens".
- Renamed "Misturar Sons" -> "Juntar Sons" (the description already says "Junte os sons"; Syllable Blending is "Junção de Sílabas") and "Quebrar" -> "Separar Sons" (Break it Down). Sound Swap mentions unified as "Troca de Sons".
- Kept "Soletrando" and "Letra Faltando" (natural Brazilian). count_result_item = "Item nº {number}: {word}".
- SUSPECT items sr_tracing_canvas, tracing_path_note, voice_pack_msg_saved_session, count_audio_retry, count_without_recording_help, review_pack_stopped, picture_cloze_practice are correct Portuguese ("use" = imperative); left out. di_minutes left as "{n} min".

### portuguese_portugal


- Same new names as Brazil ("Ler a História", "Completar a Frase", "Frase em Imagens", "Juntar Sons", "Separar Sons"), but European forms: "Letra em Falta", "Concurso de Ortografia" (instead of Brazilian "Soletrando"), "Pré-visualização da Aula".
- Children's descriptions switched from Brazilian "você" imperatives to "tu" (Junta, Toca, Ordena, Completa); sr_tracing_canvas rewritten (rato, ecrã tátil, controlos).
- Clips = "excertos"; probe = "avaliação" (as the pack's probe badge).
- Left as is: voice_pack_msg_saved_session, count_audio_retry, count_without_recording_help, review_pack_stopped ("use" is Portuguese), di_minutes.

### punjabi


- Activity names now used everywhere (labels, *_title, review/setup mentions, in “” quotes): Blend Sounds ਆਵਾਜ਼ਾਂ ਜੋੜੋ, Find Sounds ਆਵਾਜ਼ਾਂ ਲੱਭੋ, Letter Trace ਅੱਖਰ ਉਲੀਕੋ (was the transliteration ਅੱਖਰ ਟਰੇਸ; ਉਲੀਕਣਾ matches sr_tracing_canvas), Sound Mapping ਆਵਾਜ਼-ਅੱਖਰ ਮੇਲ (was ਆਵਾਜ਼ ਮੈਪਿੰਗ), Rhyme Time ਤੁਕਬੰਦੀ ਦਾ ਸਮਾਂ, Picture the Sentence ਵਾਕ ਦੀਆਂ ਤਸਵੀਰਾਂ, Sound Sort ਆਵਾਜ਼ ਅਨੁਸਾਰ ਛਾਂਟੋ (ਕ੍ਰਮਬੱਧ means "put in sequence", and the noun ਛਾਂਟੀ also means layoffs, so I used the verb), Spelling Bee ਸ਼ਬਦ-ਜੋੜ ਮੁਕਾਬਲਾ, Word Families ਸ਼ਬਦ ਪਰਿਵਾਰ, Word Scramble ਸ਼ਬਦ ਸੁਲਝਾਓ, Read the Story ਕਹਾਣੀ ਪੜ੍ਹੋ, Finish the Sentence ਵਾਕ ਪੂਰਾ ਕਰੋ. These were kept: ਆਵਾਜ਼ ਗਿਣਤੀ, ਪੜ੍ਹੋ ਤੇ ਮਿਲਾਓ, ਆਵਾਜ਼ ਬਦਲੋ, ਗੁੰਮ ਅੱਖਰ, ਦੇਖੋ ਤੇ ਲਿਖੋ, ਤੋੜ ਕੇ ਦੇਖੋ, ਅੱਖਰ ਜੋੜੋ, ਅੱਖਰਾਂ 'ਤੇ ਤਾੜੀ.
- "Class Mailbox" (audio_retry_mailbox_update) is rendered descriptively as ਜਮਾਤ ਦੀ ਡਾਕ-ਪੇਟੀ ("the class mail box").
- of_total is now "/" because the setup line is built as "{selected} {of} {total} {words selected}". Punjabi "X ਵਿੱਚੋਂ Y" would need the numbers swapped, so it now reads "5 / 10 ਸ਼ਬਦ ਚੁਣੇ ਗਏ".
- r_controlled_explanation_prefix + single_sounds + suffix are one sentence split into three parts. I re-split it for Punjabi word order: "… ਨੂੰ [ਇੱਕ ਆਵਾਜ਼] ਵਜੋਂ ਗਿਣਿਆ ਜਾਂਦਾ ਹੈ …".
- Sight words = ਝੱਟ-ਪਛਾਣ ਸ਼ਬਦ ("words recognised at a glance"). This is a new coinage with medium confidence.
- I also fixed word-order machine output that was missed because it was already in Gurmukhi script: start/start_activity, select_activity, session_next_activity (gender), session_complete, back_to_class, listen_word, gen_image, play_word, review_*_words, theme_hint, spotlight_message, pre_activity_review (was a transliteration), and level_up_star (ਤੂੰ changed to ਤੁਸੀਂ).
- I left these as they were, because they are already correct and contain only product or key names: decoding_needs_image, voice_pack_aicheck_needs_canvas, voice_pack_msg_need_mic (Canvas), and sr_phoneme_keys (Space/Enter). "Nano" stays Latin as a product name.
- Not changed, but worth a look: the pack translates the anchor card as ਲੰਗਰ (anchor_* keys). Many Punjabi readers will first read that as the gurdwara community kitchen. voice_pack_intro already uses ਐਂਕਰ.

### romanian


- "Class Mailbox" (audio_retry_mailbox_update) is translated descriptively as „cutia poștală a clasei”. AlloFlow shows the feature name in English elsewhere.
- "Try sound again" is „Încearcă din nou sunetul”, word for word the same in audio_try_again, audio_blocked_message and audio_teacher_blocked_title.
- retry_audio, retry_audio_button and fix_audio all read „Reîncearcă generarea audio”, and audio_failed_retry_hint quotes the same label. These buttons regenerate audio in the teacher review panel. If retry_audio_button ever appears on a child's playback error, it needs a separate label.
- "+ Add Sound" is „+ Adaugă sunet”. The no_phonemes hints quote „Adaugă sunet”, without the "+", as the English does.
- I kept the existing names „Rime” (Rhyme Time), „Concurs de ortografie” and „Citește și scrie” (Sight & Spell).
- The rule "write the tool name as Sunetele Cuvintelor" applies to sr_welcome, kokoro_recommended, voice_pack_msg_saved and audio_*. Because the name is a plural noun phrase, I put it in quotes. voice_pack_msg_saved reads „Instrumentul „Sunetele Cuvintelor” va folosi…” to keep the verb agreement.
- Parent strings (parent_copy_button, parent_summary_copied) used „învățător”. I aligned them to the generic „profesor” that the rest of the pack uses.
- I left these out on purpose, because Romanian uses the same text as English: anchor_compact_btn „Compact”, bonus „Bonus!” and di_minutes „{n} min”.
- Placeholder agreement: counts sit after a colon or inside brackets, as in „({ready} din {total})”, „sunete: {count}{extra}” and „(aproximativ {s} s)”.

### russian


- Generic "activity" = «упражнение» everywhere; «задание» only for item/task (items_*, count_result_item, "Sound Swap task", unscored item). «активность» and «задача» removed from word_sounds.
- Activity names settled (sentence case): Read the Story «Прочитай рассказ», Finish the Sentence «Закончи предложение», Picture the Sentence «Картинки к предложению» (kept from earlier rounds), Spelling Bee «Пчёлка-грамотей» (keeps the 🐝 theme), Word Scramble «Собери слово» (matches scramble_correct «Слово собрано!»), Sight & Spell «Зоркий глаз» (was literal «Зрение и правописание»; echoes the school term «орфографическая зоркость»), Break it Down «Разбей на звуки» (was «Разбить»), Word Families «Семьи слов» (replaces «Словесные семьи», matches source_family «Семья слов»), plus case fixes «Замена звуков», «Слияние слогов», «Хлопки по слогам», «Читай и соединяй».
- Tool name «Звуки Слов» is kept exactly (quoted, not inflected); its title case is the pack's sidebar name, so it was not changed.
- "Class Mailbox" rendered descriptively as «почтовый ящик класса».
- Child-facing audio messages say «записи» (recordings); teacher strings keep the pack's «клип/аудиоклип».
- Activity cards (*_desc / *_subtitle) and child feedback moved to «ты»; parent strings (parent_summary_copied/_copy_failed) and teacher hints moved to «Вы».
- Left as is: decoding_needs_image, voice_pack_aicheck_needs_canvas, voice_pack_msg_need_mic (Canvas is a product name), nano_mode_hint (Nano is a feature name), r_controlled_example (English example "star" intentionally kept).
- Uncertain: «Пчёлка-грамотей» and «Зоркий глаз» are creative names; a plainer alternative would be «Диктант» and «Смотри и выбирай». garden_lesson_ready «Сад Слов» belongs to Word Garden and was not touched.

### somali


- Syllable is still "qaybaha erayga". This round also fixed the activity names and descriptions that said "Xarfaha" (letters): Isku-darka / Sacabka Qaybaha Erayga, plus syllable_range (it said "Maqdaro") and play/listen/tap_each_syllable.
- Activity names changed: Akhri oo Isku Aadi (it was "Isku Beddel", exchange), Tartanka Higgaadda (it was "Higgaadinta Shimbiraha", "the birds' spelling"), Waqtiga Qaafiyadda (it was "Tixraac", reference), Kala Sooc Codadka (Sound Sort, which clashed with Sound Mapping "Habayn Codadka"), Khariidadda Codadka (Sound Mapping), Akhri Sheekada, Dhammee Jumladda, Sawir Jumladda. Sound Swap is "Beddelka Dhawaaqa" everywhere; four strings had said "Beddelka Codka".
- Rhyme: "qaafiyad / la qaafiyaa". Round 2 used "qaafiye". Both are understood; a Somali educator should pick one.
- "Cisbi" (play, used in the old play_* strings) is not a word I recognise, so the play buttons now say "Dhageyso" (listen) or "Daar" (turn on).
- "Class Mailbox" became "sanduuqa boostada fasalka" (descriptive).
- Loanwords kept: browser-ka, internet, Canvas.

### spanish_castilian


- Same activity names as spanish_latin_america: "Leer el Cuento", "Completar la Oración", "Oración en Imágenes"; Word Scramble renamed "Letras Revueltas" (clashed with "Mezcla de Sílabas"/"Mezclar Sonidos").
- Peninsular usage: alumnos, comprobar, gestionar, «» quotes, present perfect ("no han llegado", "se ha pedido").
- Left as is: distractor_placeholder (correct Spanish), di_minutes ("min").
- "Class Mailbox" kept in English as the product name, as the rest of the pack does.

### spanish_latin_america


- Activity names: Read the Story = "Leer el Cuento", Finish the Sentence = "Completar la Oración", Picture the Sentence = "Oración en Imágenes" (Title Case like the other labels; review_gap_tiles aligned).
- Word Scramble renamed "Mezcla de Palabras" -> "Letras Revueltas": "Mezcla" was also used for Syllable Blending ("Mezcla de Sílabas") and Blend Sounds ("Mezclar Sonidos").
- "Cambio de Sonido" -> "Cambio de Sonidos" in 4 strings; blend_options now names "Mezclar Sonidos".
- Left as is: distractor_placeholder ("distractor" is correct Spanish and matches preview_distractor_*), di_minutes ("{n} min" is the Spanish abbreviation too).
- "Class Mailbox" kept in English as the product name, as the rest of the pack does.

### swahili


- The pack had many word-by-word strings outside the work list ("Hear maneno", "Kubwa kazi!", "maneno Hesabu", "Karibu!" for "Not quite!"). I rewrote the clearly broken ones. "Karibu!" can read as "Welcome!", so ml_try_again and scramble_try_again now say "Bado kidogo!".
- Activity names: Unganisha Sauti, Panga kwa Sauti, Wakati wa Vina, Familia za Maneno, Neno Lililochanganyika, Sentensi kwa Picha, Soma Hadithi, Kamilisha Sentensi. I kept the existing good names, including "Vunja Vunja" (Break it Down).
- Rhyme uses "kina / vina", as in round 2 (rhymes_with "Lina kina sawa na", rhyming_q). This is a poetry term, so a teacher should check that young children understand it.
- audio_try_again is "Cheza sauti tena" (play the sound again), so it is not confused with retry_audio "Jaribu tena sauti".
- "Class Mailbox" became "sanduku la barua la darasa", a description and not a feature name.
- r_controlled_explanation_prefix: the old value had changed "or" to "au". The vowel list stays English.

### tagalog

- TOOL NAME: the pack's sidebar.tool_wordsounds (and modal_title) is the broken machine output "mga salita Word Sounds" ("words Word Sounds"). validate4 requires it, so the 6 keys whose English says "Word Sounds" use it verbatim (audio_manage_for_student, audio_open_resource_*_toast, audio_retry_teacher_needed, audio_review_repair_title, kokoro_recommended). sr_welcome and voice_pack_msg_saved were left as they are ("Word Sounds"). Recommended fix: set sidebar.tool_wordsounds + modal_title to "Mga Tunog ng Salita" (matches studio_title "Studio ng Tunog ng Salita"), then replace "mga salita Word Sounds" with it across word_sounds.
- Activity names: Pagdugtong ng Tunog, Hanapin ang Tunog, Basahin ang Kuwento, Tapusin ang Pangungusap, Isalarawan ang Pangungusap, Oras ng Tugma, Pag-uuri ng Tunog, Paligsahan sa Pagbaybay, Mga Pamilya ng Salita, Buuin ang Salita (Word Scramble).
- Left as accepted loanwords: audio, clip, device, browser, setup, pack, i-tap/i-click/i-drag/i-record/recording, preview, default, Voice Pack (feature name). voice_pack_pack_label "Pack" and bonus "Bonus!" unchanged for that reason.
- "phonics" rendered with the DepEd term "palabigkasan"; sight words = "mga salitang kilala sa tingin" (no settled Filipino term).

### tamil


- Rhyme: activity_rhyming is now ஓசை ஒத்த சொற்கள் ("rhyming words"), matching the round-2 term ஓசை ஒத்த சொல். rhyme_options, rhyming_q and rhymes_with use it too. The old label ஒலி நேரம் meant "sound time", and rhymes_with used எதுகை, a Tamil prosody term for second-letter rhyme.
- Renamed activities: activity_isolation is ஒலிகளைக் கண்டுபிடி, which matches sound_positions_label. activity_mapping is ஒலிக்கு எழுத்து; the old ஒலி வரைபடம் meant "sound graph/map". activity_segmentation is ஒலிகளாகப் பிரி; the old பிரித்துப் பாருங்கள் was plural/formal and named no sounds.
- Syllable: the leftover எழுத்தசை in syllable_range and sr_tap_count_syllables is now அசை.
- Word-order fragments: each anchor-card aria fragment (anchor_card_*, anchor_compact_like, anchor_like, anchor_hear_sound, anchor_in_the_word) and for_word is a label followed by a colon. The code puts the word after the fragment, so the old postposition forms (போன்ற …, என்ற சொல்லில் …) came out in the wrong order.
- of_total is "/". The code builds "{n} of {m} words selected", and Tamil "இன்" in that slot was ungrammatical.
- r_controlled prefix/suffix: these are rebuilt around single_sounds (ஒற்றை ஒலிகள்) as "… (ar, er, ir, or, ur) ஒற்றை ஒலிகள் என்றே எண்ணப்படுகின்றன."
- voice_pack_intro: the old text had "ப" in place of "puh". It now keeps the English example "puh".
- Uncertain: "Class Mailbox" is rendered வகுப்பு அஞ்சல்பெட்டி; no existing pack term was found. "Lesson script" is கற்பித்தல் உரை.

### telugu


- Activity names settled (child-facing, short informal imperatives or nouns): Blend Sounds ధ్వనులను కలుపు, Find Sounds ధ్వనులను కనుగొను, Letter Trace అక్షరాలు దిద్దు, Sound Mapping ధ్వనులకు అక్షరాలు, Sight & Spell సరైన స్పెల్లింగ్, Read the Story కథ చదువు, Finish the Sentence వాక్యం పూర్తి చేయి, Picture the Sentence వాక్యానికి బొమ్మ (kept from round 2), Break it Down ధ్వనులుగా విడగొట్టు, Sound Sort ధ్వనుల ప్రకారం సర్దు, Spelling Bee స్పెల్లింగ్ బీ, Word Families పద కుటుంబాలు, Word Scramble చెదిరిన పదం. Kept: ధ్వనుల లెక్కింపు, చదివి జతచేయి, ధ్వని మార్పు, తప్పిపోయిన అక్షరం, ప్రాస సమయం, అక్షరాలను కలుపు, అక్షరానికి ఒక చప్పట్టు.
- Syllable stays అక్షరం. Because అక్షరం also means "letter", "అక్షరాలు దిద్దు" (letter tracing) and "అక్షరాలను కలుపు" (syllable blending) use the same noun in different senses; the context (tracing vs. blending heard parts) disambiguates, but a pack-wide syllable term would be cleaner.
- of_total is "/" so the setup line reads "5 / 10 పదాలు ఎంచుకున్నారు" (the fragments are concatenated in English order).
- r_controlled_explanation_prefix + single_sounds + suffix were rewritten together: single_sounds is now "ఒక్క ధ్వని" (one sound); "ఒకే" was ambiguous with "same".
- "Class Mailbox" and "Nano" kept in English as elsewhere in the pack; "star", "puh" kept as English phonics examples.
- Left as is (already correct; flagged only for Canvas / Space / Enter): decoding_needs_image, sr_phoneme_keys, voice_pack_aicheck_needs_canvas, voice_pack_msg_need_mic.

### thai


- Activity name changes: Rhyme Time เวลาสัมผัส -> คำคล้องจอง (สัมผัส alone reads as "touch"; rhymes_with already used คล้องจอง), Sound Sort จัดเรียงเสียง -> จัดกลุ่มเสียง (sorting into groups, not ordering), Word Scramble สลับคำ -> เรียงตัวอักษร (avoids clashing with สลับเสียง), Spelling Bee -> ผึ้งน้อยสะกดคำ. Teacher review strings still say คำสัมผัส, which is also correct.
- «» quotes in building_swap_task and garden_lesson_ready changed to “ ”.
- "Class Mailbox" translated descriptively as กล่องจดหมายของห้องเรียน.

### tigrinya


- Activity names: ድምጽታት ምጽንባር, ድምጺ ምድላይ, ዝቃነዩ ቃላት (Rhyme Time), ብድምጺ ምስራዕ, ስድራታት ቃላት, ዝተሓዋወሰ ቃል, ነቲ ዛንታ ኣንብብ, ነቲ ሓረግ ኣማልእ, ሓረግ ብስእሊ, ውድድር ኣጸሓሕፋ (Spelling Bee; it was "ናይ ፊደል ምትእኽኻብ ውድድር"). Sound Swap is «ድምጺ ምቕያር» everywhere; four strings had said "ምልውዋጥ ድምጺ".
- Session is "ክፍለ ግዜ". The three strings that said "ኣኼባ" (a meeting) are fixed.
- "Try again" is "ደጊምካ ፈትን", as in rounds 1-2. I also replaced the Amharic-style "እንደገና" in the child feedback strings. reset "እንደገና ኣዳሉ" is left as it was.
- audio_try_again is "ድምጺ ደጊምካ ኣስምዕ" (play the sound again), so it is not confused with retry_audio "ድምጺ ደጊምካ ፈትን".
- Browser is "ብራውዘር" (a loan) and settings is "ቅጥዕታት". Both are low confidence.
- "Class Mailbox" became "ሳንዱቕ መልእኽቲ ክፍሊ" (descriptive).

### turkish

- Word Families / Word Scramble now consistently use "Kelime" (Kelime Aileleri, Kelime Karıştırma) to match the tool name Kelime Sesleri; other pack strings still mix "kelime" and "sözcük", which are both correct.
- Spelling Bee unified to "Yazım Yarışması" (activity list said "Yazım Yarışı").
- bonus "Bonus!" left as is (TDK loanword). Placeholders never carry suffixes; counts are written as "({failed}/{total})".

### ukrainian


- Activity = «вправа», item/task = «завдання» throughout (fixed «Діяльність», «активність» and «завдання»-as-activity outliers).
- Activity labels are in sentence case. Every quoted mention uses the same label (Заміна звуків, Читай і добирай, Злиття складів, Знайди звуки, Малюнки до речення, Родини слів).
- "Class Mailbox" (audio_retry_mailbox_update) is translated descriptively as «класна поштова скринька».
- Tool name «Звуки Слів» (pack tool_name, every word capitalised) is kept exactly as written and placed after a noun («інструменту «Звуки Слів»», «ресурс «Звуки Слів»», «вправу «Звуки Слів»») so it does not need to be inflected.
- `words_ready` («слів готово») and `words_selected` («слів вибрано») come after a bare number in the UI. The genitive plural reads correctly for 0, 5+ and 11-14, but is slightly off for 1-4. There is no placeholder that would let the number be moved.
- "Sight words" = «слова для миттєвого читання». There is no settled Ukrainian term for it.
- R-controlled explanation is split as prefix «…вважаються » + bold «одним звуком» + suffix « через злиття голосного з R.». This keeps the leading space without needing a comma.
- Left unchanged (already correct Ukrainian; Canvas, Nano and Enter are product or key names): decoding_needs_image, nano_mode_hint, sr_phoneme_keys, voice_pack_aicheck_needs_canvas, voice_pack_msg_need_mic.

### urdu


Activity names settled (labels + every mention: _title/_subtitle/_options/_label, review_gap_*, sound swap strings, voice_pack_intro):
Blend Sounds آوازیں جوڑو · Sound Counting آوازیں گنو · Read & Match پڑھو اور ملاؤ (kept) · Find Sounds آوازیں ڈھونڈو · Letter Trace حرف کے اوپر لکھو · Sound Swap آوازیں بدلو (kept) · Sound Mapping آوازوں کے خانے ("sound boxes": the activity fills numbered slots) · Missing Letter غائب حرف · Sight & Spell دیکھو اور لکھو · Read the Story کہانی پڑھو · Finish the Sentence جملہ مکمل کرو · Rhyme Time قافیہ ملاؤ · Picture the Sentence جملے کی تصویریں · Break it Down لفظ توڑو · Sound Sort آوازوں کی چھانٹی · Spelling Bee املا مقابلہ (kept) · Syllable Blending حرفوں کو جوڑو (kept) · Syllable Claps حرفوں پر تالی (kept) · Word Families الفاظ کے خاندان · Word Scramble الجھا ہوا لفظ.

- "Word Sounds" in sentences is the tool name «الفاظ کی آوازیں», always in « » because it is an ordinary phrase.
- Garble sweep: replaced every glued «اور»/«نہیں» value, Arabic/Persian value (در حال، إنشاء، تحقق، مسح، نقر، بطیء، توصیه، عمل رائع…) and wrong-word-order value. Remaining garble4 flags are false positives (نہیں۔ / انہیں / پُر).
- for_word is «سے» (the letter box + «سے apple» reads like «الف سے انار»). of_total is «/» because the setup line is "{n} {of} {m} words selected" and «سے» read as "from…to".
- anchor_card_spelled «، املا: » and anchor_other_spellings «لکھنے کے دوسرے طریقے:» drop the old «ہجے», which clashes with the syllable term.
- r_controlled prefix/single_sounds/suffix were rebuilt as one Urdu sentence: «… کو» + «ایک آواز» + «شمار کیا جاتا ہے، کیونکہ …».
- Sight words = «فوری پہچان کے الفاظ» (new term; medium confidence). Phoneme = «صوتیہ/صوتیے» as in sr_phoneme; the pack still also has «فونیم/فونیمز» in voice-pack and recheck strings (left as is).
- "Class Mailbox" written as «کلاس میل باکس» in the child string; other packs' mailbox.* keys keep it in Latin.
- Left as is: decoding_needs_image, nano_mode_hint, r_controlled_example, voice_pack_aicheck_needs_canvas, voice_pack_msg_need_mic (correct Urdu; Latin is only Canvas/Nano/Orton-Gillingham/Wilson Reading/"star").

### vietnamese

- The pack's tool name is "Word Sounds" (sidebar), so it stays in English inside sentences; sr_welcome / voice_pack_msg_saved were left unchanged.
- Child-facing "em" changed to "bạn" in 5 strings. Hoán đổi Âm -> Đổi Âm (4 keys); Nhóm Từ -> Họ từ.

### yoruba


Full tone marks throughout. As in earlier rounds, "ìró" is a speech sound, "ohùn" is audio or voice, and a clip is "ègé ohùn".

- New activity names: Read the Story = "Kà Ìtàn Náà", Finish the Sentence = "Parí Gbólóhùn Náà", Picture the Sentence = "Gbólóhùn ní Àwòrán" (from round 2).
- Renamed names:
  - Sound Swap was "Ìyípadà Ohùn" (voice change) in some strings and "Pàṣípààrọ̀ Ìró" in others. It is now "Ìyípadà Ìró" in all 9 strings that name it.
  - Sound Sort = "Ìṣàtò Ìró".
  - Word Families = "Ìdílé Ọ̀rọ̀".
  - Word Scramble = "Ọ̀rọ̀ Dàrúdàpọ̀".
  - sound_positions_label now says "Wá Ìró".
- 118 values outside the work list were also rewritten, all with tone marks. They were untoned, half-English or used a different activity name. Examples: preview_*, session_*, retry_audio, level_up_*, and "Sound" labels that said "ohùn" where they meant "ìró".
- Session = "ìgbà ẹ̀kọ́" (round 2), replacing the machine word "apejọ".
- Low confidence:
  - mastery = "Ìkápá" (di_timing).
  - sight words = "ọ̀rọ̀ àfojúmọ̀" (a coined term).
  - Class Mailbox = "Àpótí Lẹ́tà Kíláàsì".
  - graphemes = "gírááfíìmù".
  - rhyming_q says "has the same ending as", because the pack's "ìfohùn" for rhyme is unclear to children. "Àkókò Ìfohùn" (Rhyme Time) was kept.

---

# Round 5 (2026-10-18): print, copy and export fixes, and the tool name

## Fourteen new strings

These keys came with fixes to printing, copying and exporting in Word Sounds. They are translated into all 63 packs, and validation found no errors.

- **Lesson script messages:** `di_script_load_failed`, `di_script_english_only`, `di_script_no_words`, `di_script_build_failed`, `di_script_copied`, `di_script_copy_failed`.
- **Print window:** `di_script_print_button`, `di_script_print_hint`, `di_script_print_blocked`.
- **Parent copy fallback:** `parent_summary_copy_failed_select`, `parent_summary_text_label`.
- **Probe download:** `probe_csv_downloaded`.
- **Student voice-pack export warning:** `voice_pack_student_export_warning`, `voice_pack_student_export_confirm`.

The translators reused each pack's own wording:
- `di_script_copy_failed` quotes the pack's own label for the "Print or save as PDF" button;
- `voice_pack_student_export_confirm` uses the pack's Export verb.

Teacher and parent strings use the polite register. Where a pack had addressed parents informally, these new strings may not match its older ones; Romanian, Portuguese, Turkish, Tamil, Tigrinya and Hausa note this.

The only value kept in English is `di_script_print_button` in Marshallese ("Print"), because the pack's own print button already says that.

## Tool name corrected in three packs (all sections)

Each pack's broken name for Word Sounds was replaced with the name the pack already uses in its own studio title. The change covers every section that mentions it: sidebar, tour, help, toasts, glossary, learner, adventure and output.

| Pack | Was | Now | Values changed |
|---|---|---|---|
| Tagalog | mga salita Word Sounds | Mga Tunog ng Salita | 23 |
| Hmong | lo lus Word Sounds | Suab Lus | 33 |
| Traditional Chinese | 單词发音 (simplified characters mixed in) | 單字語音 | 15 |

In Tagalog and Hmong, `word_sounds.sr_welcome` and `word_sounds.voice_pack_msg_saved` still said "Word Sounds" in English, so they now use the new name. In both Chinese packs, `word_sounds.title` was "Word Sounds工坊"; it is now the pack's tool name followed by 工坊.

**For the reviewer:** confirm the Hmong name ("Suab Lus") and the Tagalog name ("Mga Tunog ng Salita"). Seven packs still use the English "Word Sounds" as the tool name: Karen, Chin Hakha, Chin Falam, Marshallese, Acholi, Hausa and Maay Maay. They were left alone.

## Pack defects the round 5 translators noticed (not fixed)

- **Romanian:** `common.print` is the nonsense word "sfatărește". The new strings use "Tipărește".
- **Acholi:** `common.print` is "Got", which looks wrong. The new strings use "Goo i karatac" from the pack's own `di_script_print`.
- **Kirundi:** `parent_summary_copied` has "yanduwe"; "yandukuwe" looks correct.
- **Dutch:** the pack writes "pdf" in lower case in `di_script_print`. The new strings follow it.

## Per-language notes from the round 5 translators

### acholi

Overall confidence: medium-low. A native reviewer should check these.

- `di_script_print_button`: "Goo i karatac" (print on paper), matching the pack's di_script_print. The pack's common.print is "Got", which looks wrong, so it was not reused.
- `di_script_print_blocked`: "pop-ups" is "dirica ma nyuto kene", the pack's wording in timeline.popup_blocked. The English "pop-ups" is kept in brackets so teachers recognise the browser setting.
- `di_script_load_failed`: "connection" uses the pack's phrase "nen kit ma iribbe kwede" (audio_unavailable), plus "ki intanet".
- `voice_pack_student_export_warning`: "practice history" = "tekwaro me pwonyene" (tekwaro = common.history). "school-approved location" = "kabedo ma cukul oyee". Both need checking.

### chin_falam

Overall confidence: low. As in rounds 1-4, this follows chin_hakha (the pack's Word Sounds section is mostly Hakha). It uses the Falam forms attested in the pack: "siam" (generate/build) and "thei" (can). Tap/press stays "hnen", as in earlier rounds. A Falam speaker should review it. Every item in chin_hakha.notes.md applies here too.

### chin_hakha

Overall confidence: medium-low, following the round 1-4 vocabulary.

- `di_script_print_button`: "Print tuah", taken from the pack's own di_script_print ("Print tuah asiloah PDF in khawl").
- "blocked" = "khamh a si" (pack: audio_blocked_message, timeline.popup_blocked). "pop-up" stays English, as in the pack.
- `probe_csv_downloaded`: probe = "Hmanthlaknak" (pack's probe_mode_badge); "results" = "a chuahmi hna". Download = "lakhter" (download_csv).
- `voice_pack_student_export_warning`: "practice history" = "hlathlainak cazin" and "school-approved location" = "Sianginn nih a fialmi hmun". Please check both.
- "save" uses "khawl", as the pack's di_script_print does.

### dutch

- `di_script_copy_failed` quotes the button exactly as the pack writes it: ‘Afdrukken of opslaan als pdf’, with a lower-case "pdf" (standard Dutch spelling). The brief's "keep PDF" rule and the "use the pack's button wording" rule conflict here. I chose the button wording. If upper-case "PDF" is wanted, change the pack's di_script_print as well.

### hausa

- Teacher and parent instructions use the plural/polite "ku" ("Ku duba…", "ku danna…"). Some older pack strings use the singular "ka".
- `di_script_print_blocked`: "pop-ups" = "tagogin pop-up". The pack has no settled Hausa term; its toasts leave "pop-up" in English.
- `parent_summary_text_label`: practice = "aiki", matching the pack's parent_summary_title. The voice-pack strings use "atisaye", and the export warning keeps "atisaye" for "practice history".

### igbo

- di_script_load_failed: "could not be loaded" given as "emegheghị" (did not open); the generator is "Ngwa na-emepụta ederede nkuzi" (paraphrase).
- di_script_print_hint / di_script_print_blocked: "windo mbipụta" (print window) and "windo pop-up" are loan coinages; unverified.

### karen

- di_script_load_failed: "load" given as "တဟဲဘၣ်" (did not come), copied from ws.audio_unavailable; "generator" = "တၢ်ပီးတၢ်လီလၢအဒုးအိၣ်ထီၣ်" (paraphrase).
- di_script_print_hint: "print dialog" = "တၢ်ဒိအဝဲၤဒၢ" (print window); unverified term.
- di_script_print_blocked: "page" = "ကဘျံးပၤ"; "allow" = "ပျဲ"; unverified.
- voice_pack_student_export_warning: "school-approved place" = "ကၠိအၢၣ်လီၤအီၤအလီၢ်"; "history" = "တၢ်စံၣ်စိၤ"; needs a native reviewer.
- voice_pack_student_export_confirm: built on the pack's export verb "ပို့လၢတၢ်ချၢ" (which itself looks partly Burmese).

### kinyarwanda

- probe_csv_downloaded: "byakuwemo" (passive of the pack's download verb "Kuramo"); the form is unverified.
- di_script_load_failed: "load" = "nticyinjiye", matching ws.audio_unavailable ("Ijwi ntiryinjiye").

### kirundi

- probe_csv_downloaded: "vyakuwemwo" (passive of the pack's "Kuramo"); unverified.
- di_script_copied: "yandukuwe" (passive of "kwandukura"); the pack's parent_summary_copied has "yanduwe", which looks like a slip.
- di_script_print_hint: "ritugurutse" (does not open); unverified.

### maay_maay

- Whole file follows the pack's existing vocabulary, which is Standard Somali (Maxaa) in form (Daabac, Soo saar, xannibay). It is not Maay-specific; a Maay reviewer may want different forms.
- di_script_load_failed: "load" given as "lama furi karin" (could not be opened).

### marshallese

- di_script_print_button: kept "Print" because the pack's own button (di_script_print) uses "Print".
- di_script_copy_failed: "instead" dropped (no reliable pack word); reads "please use ...".
- di_script_print_blocked: "allow pop-ups" paraphrased as "make it possible for pop-ups to appear"; unverified.
- probe_csv_downloaded: "results" = "tōprak ko" (low confidence); probe = "etale" as in ws.probe_interrupted.
- voice_pack_student_export_warning: "school-approved" = "jikuul eo eṃōj an kamool"; needs a native reviewer.

### somali

- di_script_load_failed: "Qalabka diyaariya qoraalka casharka" (the tool that prepares the lesson script) stands in for "generator". "lama soo rari karin" follows the pack's "soo rarayaa" for loading.
- di_script_print_blocked: "daaqadaha soo booda (pop-up)" keeps the English term in brackets, since browsers in Somali have no settled word for it.
- voice_pack_student_export_confirm: "Dhoofi faylka" uses the pack's "Dhoofi" for Export. That word is literally "to export goods", so it may read oddly.

### tigrinya

- Register: the pack talks to teachers and parents in the masculine singular ("ኣረጋግጽ", "ፈትን"). These strings use the polite plural ("ኣረጋግጹ", "ፈትኑ", "ምረጽዎ እሞ ቅድሕዎ"), as the brief asks. A reviewer may prefer the singular to match the pack.
- di_script_load_failed: "መፍጠሪ" (creator) for "generator" is my own choice.
- di_script_print_blocked: "ብቕጽበት ዝኽፈቱ መሳኹቲ (pop-up)" spells out what pop-ups are. Medium confidence.
- voice_pack_student_export_confirm: "ፋይል ላኣኽ" uses the pack's "ላኣኽ" (send) for Export.
