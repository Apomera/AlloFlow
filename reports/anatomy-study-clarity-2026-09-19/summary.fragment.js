          var counts = { practice: 0, learning: 0, mastered: 0, notes: Object.keys(structureNotes).length, viewed: 0 };
          var ratedConcepts = {}, viewedConcepts = {}, dueConcepts = {}, dueRows = [];
          knownStructureIds.forEach(function(id) {
            var concept = anatomyConceptId(id), level = structureConfidence[id];
            if (level && !ratedConcepts[concept]) { counts[level] += 1; ratedConcepts[concept] = true; }
            if (structuresViewed[id] && !viewedConcepts[concept]) { counts.viewed += 1; viewedConcepts[concept] = true; }
          });
          systemsOut.forEach(function(entry) { entry.rows.forEach(function(row) {
            var concept = anatomyConceptId(row.structure.id);
            if (row.stale && !dueConcepts[concept]) { dueRows.push(row); dueConcepts[concept] = true; }
          }); });
          counts.due = dueRows.length;
          return { systems: systemsOut, counts: counts, due: dueRows };
        }
        function studySummaryMetrics(data) {
          return [
            [data.counts.viewed,t('stem.anatomy.study_ref_viewed','Distinct structures viewed'),'viewed'],
            [data.counts.practice,t('stem.anatomy.need_practice','Need practice'),'practice'],
            [data.counts.learning,t('stem.anatomy.learning','Learning'),'learning'],
            [data.counts.mastered,t('stem.anatomy.got_it','Got it'),'mastered'],
            [totalCorrect,t('stem.anatomy.quiz_correct','Quiz correct'),'quiz'],
            [spotterScore,t('stem.anatomy.spotter_ids','Spotter IDs'),'spotter'],
            [data.counts.notes,t('stem.anatomy.study_ref_notes','Entries with notes'),'notes']
          ];
        }
        function studySheetAsText() {
          var data = buildStudySheetData();
          var levelLabel = { practice:t('stem.anatomy.need_practice','Need practice'), learning:t('stem.anatomy.learning','Learning'), mastered:t('stem.anatomy.got_it','Got it') };
          var lines = [t('stem.anatomy.study_ref_export_title','Human Anatomy Explorer — study sheet'), new Date().toLocaleDateString(), ''];
          lines.push(studySummaryMetrics(data).map(function(pair){return pair[1]+': '+pair[0];}).join(' | '));
          lines.push(t('stem.anatomy.study_ref_counts_help','Totals cover all saved work. Each anatomical structure counts once, even when it appears in more than one collection. Notes are counted per catalog entry.'));
          lines.push(t('stem.anatomy.study_ref_evidence_help','Viewed means opened, not learned. Ratings guide practice: you can set them yourself, and scored answers can update Need practice or Learning. Got it is a self-rating, not proof of mastery.'));
          lines.push(t('stem.anatomy.study_ref_schedule_help','This tool suggests review now for Need practice, after 2 days for Learning, and after 7 days for Got it. An undated rating is ready for a re-check. These are practice reminders, not a measurement of forgetting.'));
          lines.push(t('stem.anatomy.study_ref_shared_help','Repeated entries share ratings and scored-answer records for the same structure. Their notes stay separate. A browsing collection is not necessarily a single body system.'));
          lines.push(t('stem.anatomy.study_sheet_next','Next step: ') + recommendedNextStep.title + ' — ' + recommendedNextStep.detail);
          if (data.due.length) lines.push(t('stem.anatomy.study_ref_export_due','Ready for a re-check: ') + data.due.map(function(row) { return row.structure.name; }).join(', '));
          lines.push('');
          data.systems.forEach(function(entry) {
            lines.push('== ' + entry.system.name + ' ==');
            entry.rows.forEach(function(row) {
              var status = row.level ? levelLabel[row.level] : row.viewed ? t('stem.anatomy.viewed','viewed') : t('stem.anatomy.study_ref_saved_work','Saved work · not rated');
              if (row.stale) status += ', ' + (row.days === null ? t('stem.anatomy.study_ref_undated','rating date unavailable; re-check') : formatAnatomyStudyText(t('stem.anatomy.study_ref_rated_days','rated {days} day(s) ago; re-check'),{days:row.days}));
              lines.push('- ' + row.structure.name + ' [' + status + ']');
              if (row.level === 'practice' || row.note) lines.push('    ' + learnerText(row.structure));
              if (row.note) lines.push('    ' + t('stem.anatomy.in_my_words','In my words: ') + row.note);
              if (row.recall.attempts) lines.push('    ' + recallStudyText(row.recall));
            });
            lines.push('');
          });
          if (!data.systems.length) lines.push(t('stem.anatomy.study_sheet_empty','Nothing recorded yet. Open structures, rate them, and write notes to fill this sheet.'));
          studyReflections().forEach(function(row) {
            lines.push('', '== ' + row.title + ' ==', row.context);
            if (row.explanation) lines.push(t('stem.anatomy.study_reflection_explanation','My explanation: ') + row.explanation);
            if (row.transferExplanation) lines.push(row.transferPrompt, t('stem.anatomy.study_reflection_transfer','My comparison: ') + row.transferExplanation);
          });
          return lines.join('\n');
        }

