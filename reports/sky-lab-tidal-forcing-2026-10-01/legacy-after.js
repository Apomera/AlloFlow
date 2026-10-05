          sectionCard('🌊 Tides + Earth-Moon dynamics',
            (function() {
              var TOPICS = [
                { id: 'why2', name: __alloT('stem.astronomy.why_two_tides_per_day', 'Why TWO tides per day'), color: '#0ea5e9',
                  content: h('div', null,
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      __alloT('stem.astronomy.tides_aren_t_caused_by_the_moon_pullin', 'Tides aren\'t caused by the Moon "pulling water up." They\'re caused by DIFFERENTIAL gravity — the Moon pulls slightly harder on the near side of Earth than on the center, and slightly harder on the center than on the far side.')
                    ),
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      h('strong', { style: { color: '#7dd3fc' } }, __alloT('stem.astronomy.near_side', 'Near side: ')),
                      __alloT('stem.astronomy.water_pulled_toward_moon_faster_than_t', 'water pulled toward Moon faster than the Earth → bulges out.')
                    ),
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      h('strong', { style: { color: '#7dd3fc' } }, __alloT('stem.astronomy.far_side', 'Far side: ')),
                      __alloT('stem.astronomy.water_left_behind_as_earth_itself_gets', 'water left behind as Earth itself gets pulled toward Moon faster → bulges out the other way.')
                    ),
                    h('p', { style: { margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      __alloT('stem.astronomy.earth_rotates_through_both_bulges_in_2', 'In an idealized ocean, rotation produces two tidal highs and lows per lunar day (about 24 h 50 min). Real coasts can have one, two unequal, or two similar highs; local timing and height depend on the basin and weather.')
                    )
                  )
                },
                { id: 'spring', name: __alloT('stem.astronomy.spring_vs_neap_tides', 'Spring vs neap tides'), color: '#fbbf24',
                  content: h('div', null,
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      __alloT('stem.astronomy.the_sun_also_creates_tides_about_half_', 'The Sun also creates tides, about half as strong as the Moon\'s. When Sun + Moon align (new moon OR full moon), their effects add → '),
                      h('strong', { style: { color: '#fbbf24' } }, __alloT('stem.astronomy.spring_tides', 'SPRING TIDES')),
                      __alloT('stem.astronomy.no_relation_to_the_season_from_to_spri', ' (no relation to the season; from "to spring forth"). The highest highs + lowest lows of the month.')
                    ),
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      __alloT('stem.astronomy.when_sun_moon_are_at_90_first_or_last_', 'When Sun + Moon are at 90° (first or last quarter), their effects partly cancel → '),
                      h('strong', { style: { color: '#fbbf24' } }, __alloT('stem.astronomy.neap_tides', 'NEAP TIDES')),
                      __alloT('stem.astronomy.the_most_muted_tidal_range_of_the_mont', '. The most muted tidal range of the month.')
                    ),
                    h('p', { style: { margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      __alloT('stem.astronomy.combined_with_moon_s_elliptical_orbit_', 'Combined with Moon\'s elliptical orbit (closer = stronger), spring tides at perigee (perigean spring tides, or "king tides") are the largest of all. The Bay of Fundy, at Maine\'s downeast doorstep, has tides over 16 m due to its resonant geometry.')
                    )
                  )
                },
                { id: 'locked', name: __alloT('stem.astronomy.tidal_locking', 'Tidal locking'), color: '#a855f7',
                  content: h('div', null,
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      __alloT('stem.astronomy.earth_s_gravity_creates_tidal_bulges_i', 'Earth\'s gravity creates tidal bulges in the Moon too (mostly rock, not water). Friction inside the Moon during early history dissipated rotational energy until the Moon\'s rotation period matched its orbital period — about 27.3 days. Now the same face always points to us.')
                    ),
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      h('strong', { style: { color: '#d8b4fe' } }, __alloT('stem.astronomy.common_misconception', 'Common misconception: ')),
                      __alloT('stem.astronomy.tidal_locking_does_not_mean_the_moon_d', 'tidal locking does NOT mean the Moon doesn\'t rotate. It rotates exactly once per orbit. We never see the "far side" but the far side gets just as much sunlight as the near side.')
                    ),
                    h('p', { style: { margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      __alloT('stem.astronomy.tidal_locking_is_common_most_large_moo', 'Tidal locking is common — most large moons in the solar system are tidally locked to their planets. Earth-mass planets in red-dwarf habitable zones are likely tidally locked to their stars (one face always lit, one always dark) — creating major climate + biology challenges for habitability.')
                    )
                  )
                },
                { id: 'recede', name: __alloT('stem.astronomy.the_moon_is_leaving', 'The Moon is leaving'), color: '#22c55e',
                  content: h('div', null,
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      __alloT('stem.astronomy.earth_s_tidal_bulges_do_not_perfectly_', 'Earth\'s tidal bulges DO not perfectly align with the Moon — Earth\'s rotation drags them ahead. The bulge\'s gravity pulls slightly forward on the Moon, accelerating it. Faster orbit = larger orbit. The Moon recedes by '),
                      h('strong', { style: { color: '#86efac' } }, __alloT('stem.astronomy.3_8_cm_per_year', '~3.8 cm per year')),
                      __alloT('stem.astronomy.measured_precisely_by_laser_ranging_of', ' — measured precisely by laser ranging off retroreflectors the Apollo astronauts placed on the lunar surface.')
                    ),
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      h('strong', { style: { color: '#86efac' } }, __alloT('stem.astronomy.conservation_of_angular_momentum', 'Conservation of angular momentum: ')),
                      __alloT('stem.astronomy.whatever_earth_moon_lose_to_friction_h', 'whatever Earth + Moon lose to friction has to go somewhere. Earth\'s rotation is slowing — days are ~1.8 milliseconds longer per century. Hundreds of millions of years ago, days were 22 hours; coral fossils with daily growth bands preserve this record.')
                    ),
                    h('p', { style: { margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      h('strong', { style: { color: '#86efac' } }, __alloT('stem.astronomy.future_consequence', 'Future consequence: ')),
                      __alloT('stem.astronomy.the_moon_will_eventually_appear_too_sm', 'the Moon will eventually appear too small in our sky to cover the Sun. Total solar eclipses will end in ~600 million years. The Moon will recede until Earth\'s rotation matches the lunar orbital period (a "double tidal lock"), but that won\'t happen before the Sun becomes a red giant.')
                    )
                  )
                },
                { id: 'roche', name: __alloT('stem.astronomy.tides_on_other_worlds', 'Tides on other worlds'), color: '#ef4444',
                  content: h('div', null,
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      h('strong', { style: { color: '#fca5a5' } }, __alloT('stem.astronomy.jupiter_s_moons', 'Jupiter\'s moons: ')),
                      __alloT('stem.astronomy.io_is_so_tidally_flexed_by_jupiter_tha', 'Io is so tidally flexed by Jupiter that the constant friction makes it the most volcanically active body in the solar system. Hundreds of active volcanoes; surface entirely paved by lava over geological time. Europa\'s subsurface ocean is kept liquid by similar (but smaller) tidal heating.')
                    ),
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      h('strong', { style: { color: '#fca5a5' } }, __alloT('stem.astronomy.roche_limit', 'Roche limit: ')),
                      __alloT('stem.astronomy.a_moon_orbiting_too_close_to_its_plane', 'a moon orbiting too close to its planet gets torn apart by tidal forces — the planet\'s gravity pulls harder on the near side than on the far side faster than the moon\'s own gravity can hold it together. Saturn\'s rings may be the remains of a moon that ventured inside the Roche limit, or a small body that never managed to coalesce.')
                    ),
                    h('p', { style: { margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      h('strong', { style: { color: '#fca5a5' } }, __alloT('stem.astronomy.black_hole_spaghettification', 'Black hole spaghettification: ')),
                      __alloT('stem.astronomy.falling_into_a_small_black_hole_you_wo', 'falling into a small black hole, you would be stretched vertically + compressed horizontally by tidal forces well before reaching the event horizon. For supermassive black holes, the tidal forces at the event horizon are gentle enough that you would cross without immediate notice.')
                    )
                  )
                }
              ];
              var sel = TOPICS.find(function(t) { return t.id === d.selectedTideTopic; }) || TOPICS[0];
              return h('div', null,
                renderTidalForcing(),
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  __alloT('stem.astronomy.the_moon_makes_the_tides_but_the_physi', 'The Moon makes the tides — but the physics is subtler than "Moon pulls water." Tidal forces from the Moon shape Earth\'s rotation, its day length, the Moon\'s own orbit, and on a grander scale they sculpt every binary system in the universe.')
                ),
                h('div', { role: 'group', 'aria-label': __alloT('stem.astronomy.a11y_earth_moon_tide_topics', 'Earth-Moon tide topics'), style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  TOPICS.map(function(t) {
                    var active = sel.id === t.id;
                    return h('button', { key: t.id,
                      'aria-pressed': active,
                      onClick: function() { upd({ selectedTideTopic: t.id }); },
                      style: { minHeight: 44, padding: '8px 14px', borderRadius: 8, background: active ? t.color + '33' : '#1e293b', border: '1px solid ' + (active ? t.color : '#94a3b8'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                    }, t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid ' + sel.color } }, sel.content)
              );
            })(),
            '#0ea5e9'
          ),

