          h('a', { href: '#astronomy-tidal-forcing-lab', className: 'astr-focus', onClick: function(e) {
            e.preventDefault(); var lab = document.getElementById('astronomy-tidal-forcing-lab'), control = document.getElementById('astronomy-tf-time');
            if (lab) lab.scrollIntoView({ behavior: 'auto', block: 'start' }); if (control) control.focus({ preventScroll: true });
          }, style: { display: 'inline-flex', alignItems: 'center', minHeight: 44, marginBottom: 12, fontSize: 14, color: '#86efac' } }, __alloT('stem.astronomy.tf_jump', 'Explore tides and lunar alignment')),
