          function renderWcJourneyChapters() {
            var landSteps = WCJourneyChapters.landDefinitions();
            function landStepButton(id, overview) {
              var step = landSteps.filter(function(item) { return item.id === id; })[0];
              if (!step) return null;
              return React.createElement('button', { id: 'wcJourneyLandStep-' + step.id, key: step.id, type: 'button',
                className: overview ? 'wc-chapter-land-overview' : undefined,
                'aria-pressed': chapter.state === step.id, 'aria-controls': 'wcJourneyChapterCard',
                onClick: function() { inspectWcJourneyLandStep(step.id); } }, step.label);
            }
            function landPathwayIcon(id) {
              var shape = id === 'surface' ? 'M3 8q3-3 6 0t6 0t6 0M3 14q3-3 6 0t6 0t6 0M3 20q3-3 6 0t6 0t6 0'
                : id === 'soil' ? 'M3 5h18M4 12l4-2 4 3 4-3 4 2M4 19l4-2 4 3 4-3 4 2'
                : 'M12 22V9M12 13C5 13 3 7 4 3c6 0 9 4 8 10M12 18c7 0 9-6 8-10-6 0-9 4-8 10';
              return React.createElement('svg', { viewBox: '0 0 24 24', 'aria-hidden': true, focusable: 'false', 'data-land-pathway-icon': id },
                React.createElement('path', { d: shape, fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }));
            }
            var chapter = wcJourneyChapter;
            var storage = chapter.state === 'ocean' || chapter.state === 'complete';
            var current = WCJourneyChapters.resolve({ journeyActive: d.journeyActive, journeyState: d.journeyState });
            return React.createElement('section', { className: 'wc-journey-chapters', 'data-wc-journey-chapters': 'true',
              'aria-labelledby': 'wcJourneyChaptersHeading', 'aria-describedby': 'wcJourneyChaptersHelp' },
              React.createElement('header', { className: 'wc-chapters-head' },
                React.createElement('div', null,
                  React.createElement('span', { className: 'wc-chapters-kicker' }, 'A closer look'),
                  React.createElement('h4', { id: 'wcJourneyChaptersHeading' }, 'Inspect the journey')
                ),
                React.createElement('button', { id: 'wcJourneyFollowParcel', type: 'button', 'aria-pressed': chapter.following,
                  'aria-controls': 'wcJourneyChapterCard', onClick: followWcJourneyParcel }, 'Follow current parcel')
              ),
              React.createElement('p', { id: 'wcJourneyChaptersHelp', className: 'wc-chapters-help' },
                'Choose a chapter to inspect its water and energy story. Playback and route controls move the live parcel.'),
              React.createElement('p', { className: 'wc-chapters-parcel', 'data-wc-chapter-parcel': 'true' },
                React.createElement('strong', null, d.journeyActive ? (journeyReplayIsScrubbed ? 'Replay parcel: ' : 'Current parcel: ') : 'Journey ready: '),
                d.journeyActive ? journeyStateLabel + ' · ' + journeyStatusLabel : 'Start Journey to follow one droplet.'
              ),
              React.createElement('div', { className: 'wc-journey-timeline', role: 'list',
                'aria-label': __alloT('stem.watercycle.a11y_water_journey_timeline', 'Water journey timeline') },
                WCJourneyChapters.definitions().map(function(step, index) {
                  var isCurrent = !!d.journeyActive && index === current.index;
                  var timelineStepState = isCurrent ? 'is-current' : 'is-other';
                  var timelineStepLabel = isCurrent ? (journeyReplayIsScrubbed ? 'replay parcel' : 'current parcel') : 'other chapter';
                  return React.createElement('div', { key: step.id, role: 'listitem', className: 'wc-timeline-step ' + timelineStepState,
                    'data-replay-focus': journeyReplayIsScrubbed && isCurrent ? 'true' : undefined,
                    'data-current-parcel': String(isCurrent) },
                    React.createElement('button', { id: 'wcJourneyChapter-' + step.id, type: 'button',
                      'aria-pressed': chapter.id === step.id, 'aria-current': isCurrent ? 'step' : undefined, 'aria-controls': 'wcJourneyChapterCard',
                      'aria-label': 'Inspect chapter ' + (index + 1) + ': ' + step.label + '. ' + step.cue + '. ' + timelineStepLabel + '.',
                      onClick: function() { inspectWcJourneyChapter(step.id); } },
                      React.createElement('span', { className: 'wc-chapter-number', 'aria-hidden': 'true' }, index + 1),
                      React.createElement('span', { className: 'wc-chapter-label' },
                        React.createElement('strong', null, step.label), React.createElement('small', null, step.cue),
                        isCurrent && React.createElement('span', { className: 'wc-chapter-current' }, journeyReplayIsScrubbed ? 'Replay parcel' : 'Current parcel')
                      )
                    )
                  );
                })
              ),
              React.createElement('article', { id: 'wcJourneyChapterCard', className: 'wc-chapter-card',
                'data-chapter-id': chapter.id, 'data-chapter-state': chapter.state, 'data-following-parcel': String(chapter.following) },
                React.createElement('p', { className: 'wc-chapters-kicker' }, chapter.following ? (d.journeyActive ? 'Following the parcel' : 'Ready to explore') : 'Selected chapter diagram'),
                React.createElement('h5', { id: 'wcJourneyChapterTitle', tabIndex: -1 }, 'Chapter ' + (chapter.index + 1) + ' · ' + chapter.label),
                chapter.showLandSteps && React.createElement('div', { className: 'wc-chapter-land' },
                  React.createElement('p', { id: 'wcJourneyLandStepLabel' }, 'Inspect a land step'),
                  React.createElement('div', { className: 'wc-chapter-land-options', role: 'group', 'aria-labelledby': 'wcJourneyLandStepLabel' },
                    landStepButton('ground_choice', true),
                    React.createElement('div', { className: 'wc-chapter-land-routes' },
                      [
                        { id: 'surface', title: 'Surface water', cue: 'Water moving across the land surface.', steps: ['river_runoff'] },
                        { id: 'soil', title: 'Soil and groundwater', cue: 'Entering soil does not guarantee groundwater recharge.', steps: ['infiltrating', 'aquifer_flow'] },
                        { id: 'plants', title: 'Plants', cue: 'Compare liquid uptake with vapor leaving leaves.', steps: ['plant_absorb', 'transpiring'] }
                      ].map(function(pathway) {
                        var active = pathway.steps.indexOf(chapter.state) >= 0;
                        var prefix = 'wcJourneyLandPathway-' + pathway.id;
                        return React.createElement('div', { key: pathway.id, className: 'wc-chapter-land-pathway', role: 'group',
                          'data-land-pathway': pathway.id, 'data-active': String(active), 'aria-labelledby': prefix + '-Title', 'aria-describedby': prefix + '-Cue' },
                          React.createElement('header', null, landPathwayIcon(pathway.id), React.createElement('h6', { id: prefix + '-Title' }, pathway.title)),
                          React.createElement('p', { id: prefix + '-Cue', className: 'wc-land-pathway-cue' }, pathway.cue),
                          React.createElement('div', { className: 'wc-land-pathway-choices' }, pathway.steps.map(function(id) { return landStepButton(id, false); })),
                          active && React.createElement('p', { className: 'wc-land-pathway-active' }, 'Inspecting this pathway')
                        );
                      })
                    )
                  )
                ),
                React.createElement('div', { className: 'wc-chapter-flow' },
                  React.createElement('div', { className: 'wc-chapter-water' },
                    React.createElement('small', null, storage ? 'Water store' : 'Starting store'),
                    wcJourneyChapterDiagram(chapter.state, false),
                    React.createElement('strong', { 'data-chapter-source': 'true' }, chapter.source),
                    React.createElement('span', { 'data-chapter-phase-from': 'true' }, chapter.phaseFrom)
                  ),
                  React.createElement('div', { className: 'wc-chapter-direction', 'aria-hidden': 'true' }, storage ? '≈' : '→'),
                  React.createElement('div', { className: 'wc-chapter-water' },
                    React.createElement('small', null, storage ? 'Water remains in storage' : 'Destination'),
                    wcJourneyChapterDiagram(chapter.state, true),
                    React.createElement('strong', { 'data-chapter-destination': 'true' }, chapter.destination),
                    React.createElement('span', { 'data-chapter-phase-to': 'true' }, chapter.phaseTo)
                  )
                ),
                React.createElement('dl', { className: 'wc-chapter-facts' },
                  React.createElement('div', { className: 'wc-chapter-energy', 'data-energy-transfer': chapter.energyTransfer },
                    React.createElement('dt', null, 'Phase and latent heat'), React.createElement('dd', null, chapter.energyLabel)),
                  React.createElement('div', null, React.createElement('dt', null, 'Driver'), React.createElement('dd', null, chapter.driver)),
                  React.createElement('div', null, React.createElement('dt', null, 'Physical time'),
                    React.createElement('dd', null, chapter.timeLabel, React.createElement('small', null, chapter.timeCaveat)))
                ),
                React.createElement('div', { className: 'wc-chapter-question' }, React.createElement('strong', null, 'Trace and explain'),
                  React.createElement('p', null, chapter.question)),
                React.createElement('p', { className: 'wc-chapter-note', 'data-chapter-note': 'true' }, chapter.note + (chapter.state === 'infiltrating' ? ' ' + wcSoilPoreScope() : '')),
                chapter.id === 'land' && renderWcGroundwaterLens('explorer')
              ),
              React.createElement('p', { className: 'wc-chapters-help wc-chapters-scope' }, 'One illustrated route through a branching cycle. Diagrams are not to scale, and animation time is compressed.')
            );
          }