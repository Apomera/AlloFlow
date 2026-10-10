          function renderWcLiveHeatPath() {
            var ltEnergy = currentMatterEnergy.energyTransfer;
            var ltAbsorbed = ltEnergy === 'absorbed';
            var ltReleased = ltEnergy === 'released';
            function heatActor(label, water, gives) {
              return React.createElement('span', { className: 'wc-lt-heat-actor', 'data-lt-heat-actor': water ? 'water' : 'surroundings', 'data-lt-heat-role': gives ? 'gives' : 'receives' },
                React.createElement('i', { className: water ? 'wc-lt-water-mark' : 'wc-lt-surroundings-mark', 'aria-hidden': true }),
                React.createElement('span', { className: 'wc-lt-heat-actor-copy' },
                  React.createElement('strong', null, label),
                  React.createElement('small', null, gives ? 'Gives heat' : 'Receives heat')));
            }
            return React.createElement('div', { className: 'wc-live-heat-path', 'data-lt-energy': ltEnergy, 'data-lt-heat-direction': ltAbsorbed ? 'into-water' : ltReleased ? 'out-of-water' : 'not-required' },
              (ltAbsorbed || ltReleased) && React.createElement('p', { className: 'wc-lt-heat-direction' }, React.createElement('strong', null, ltAbsorbed ? 'Heat enters water' : 'Heat leaves water')),
              ltAbsorbed || ltReleased ? React.createElement('div', { className: 'wc-lt-heat-flow', role: 'group', 'aria-label': ltAbsorbed ? 'Latent heat flows from surroundings into water' : 'Latent heat flows from water to surrounding air' },
                heatActor(ltReleased ? 'Surrounding air' : 'Surroundings', false, ltAbsorbed),
                React.createElement('div', { className: 'wc-lt-heat-arrow' },
                  React.createElement('span', null, 'Latent heat'),
                  React.createElement('svg', { viewBox: '0 0 84 28', 'aria-hidden': true, focusable: 'false', 'data-lt-heat-arrow': ltAbsorbed ? 'right' : 'left' },
                    React.createElement('path', { d: ltAbsorbed ? 'M8 14h68M65 4l11 10-11 10' : 'M76 14H8M19 4L8 14l11 10' }))),
                heatActor('Water', true, ltReleased))
                : React.createElement('p', { className: 'wc-lt-no-latent' }, 'No latent heat transfer is required by this process. Water can still move, warm or cool.'),
              React.createElement('p', { className: 'wc-lt-heat-reading' }, currentMatterEnergy.energyLabel));
          }
