          h('a', { href: '#astronomy-magnitude-lab', className: 'astr-focus',
            onClick: function(e) {
              e.preventDefault();
              var target = document.getElementById('astronomy-magnitude-lab'), control = document.getElementById('astronomy-magnitude-mv');
              if (target) target.scrollIntoView({ block: 'start' });
              if (control) control.focus({ preventScroll: true });
            },
            style: { display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '8px 12px', marginBottom: 12, borderRadius: 8,
              border: '1px solid #475569', background: '#091323', color: '#67e8f9', fontSize: 14, fontWeight: 700, textDecoration: 'underline' }
          }, __alloT('stem.astronomy.mag_jump', 'Explore brightness and distance')),

