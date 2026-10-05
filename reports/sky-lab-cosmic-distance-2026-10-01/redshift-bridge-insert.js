
            a11yButton({ type:'button', onClick:function() {
              upd({ cosmoZ:model.z, cosmoRedshiftReference:model.reference ? model.reference.id : '' });
              setTimeout(function() { var target = document.getElementById('astronomy-cosmo-lab'); if (target) { target.scrollIntoView({ block:'start', behavior:'auto' }); target.focus({ preventScroll:true }); } }, 0);
            }, style:buttonStyle }, __alloT('stem.astronomy.cosmo_spectrum_link', 'Explore distance and time')),
