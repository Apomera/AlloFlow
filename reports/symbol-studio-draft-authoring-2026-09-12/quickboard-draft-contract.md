# Quick Board draft capture and restore contract

Persist each learner's authoring choices and assets in a versioned IndexedDB envelope keyed by profile ID.

| Group | Persist | Fresh defaults |
| --- | --- | --- |
| Mode and Communication Builder | qbMode, cbPath, cbFunction, cbPhase, cbGoalText | firstthen, fct, Escape, 2, empty goal |
| First-Then | ftFirstLabel/image, ftThenLabel/image | Empty labels, null images |
| Choice Board | cbCount, all four cbItems including hidden choices | Two visible choices, c1-c4 empty/null |
| Token Economy | tokenTotal, tokenLabel, tokenRewardLabel/image | Five tokens, empty labels, null image |
| Calming, Sensory, Ask Me, Body Check, Transition | cmItems, snItems, amItems, bcItems, twItems with stable IDs, labels and images | Built-in labelled arrays of 8, 10, 10, 8 and 8 items; null images |

Reset learner response/session values cbSelected, tokenEarned, bcPainLevel and twStep. Do not persist request/loading maps, upload targets, speech playback, job tokens, or generation flags.

The existing quickBoardPreviousLabelsRef intentionally removes stale pictures when a label changes. Restore must seed that tracker from the restored snapshot or bypass tracking during the application render, so valid restored pictures are retained. Clear quickBoardImageJobsRef and all loading indicators when the learner changes or a stored snapshot is applied.

During initial recovery, the editor is inert and aria-busy; learner settings remain usable. A bounded failure exposes editable session work and recovery controls. Do not overwrite an unread saved draft automatically. Saved status follows transaction completion, with explicit retry after failure. Fresh learners receive defaults and never another learner's working draft.
