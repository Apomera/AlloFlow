          h('a', { href: '#astronomy-habitable-zone-lab', className: 'astr-focus', onClick: function(e) {
            e.preventDefault(); var lab = document.getElementById('astronomy-habitable-zone-lab'), control = document.getElementById('astronomy-hz-distance');
            if (lab) lab.scrollIntoView({ behavior: 'auto', block: 'start' }); if (control) control.focus({ preventScroll: true });
          }, style: { display: 'inline-flex', alignItems: 'center', minHeight: 44, marginBottom: 12, fontSize: 14, color: '#86efac' } }, __alloT('stem.astronomy.hz_jump', 'Explore the habitable zone')),
