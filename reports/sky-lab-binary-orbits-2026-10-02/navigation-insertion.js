          h('a', { href: '#astronomy-binary-orbit-lab', className: 'astr-focus',
            onClick: function(e) { e.preventDefault(); var target = document.getElementById('astronomy-binary-orbit-lab'), control = document.getElementById('astronomy-binary-time'); if (target) target.scrollIntoView({ block: 'start' }); if (control) control.focus({ preventScroll: true }); },
            style: { display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '8px 12px', margin: '0 8px 12px 0', borderRadius: 8, border: '1px solid #475569', background: '#091323', color: '#67e8f9', fontSize: 14, fontWeight: 700, textDecoration: 'underline' }
          }, __alloT('stem.astronomy.binary_jump', 'Explore binary orbits and stellar masses')),

