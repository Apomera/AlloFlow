// ═══════════════════════════════════════════
// stem_tool_molecule.js - Molecule Lab (Enhanced Standalone)
// Full 118-element periodic table, compound creator (32 recipes),
// molecule builder, Bohr model, reaction simulator, challenges & RP
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
    console.log('[StemLab] Registered tool: ' + id);
  },
  getRegisteredTools: function() {
    var self = this;
    return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
  }
};
// ═══ End Guard ═══

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) - shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-molecule')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-molecule';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();


  // ── Audio (auto-injected) ──
  var _molAC = null;
  function getMolAC() { if (!_molAC) { try { _molAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_molAC && _molAC.state === "suspended") { try { _molAC.resume(); } catch(e) {} } return _molAC; }
  function molTone(f,d,tp,v) { var ac = getMolAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxMolClick() { molTone(600, 0.03, "sine", 0.04); }
  function sfxMolSuccess() { molTone(523, 0.08, "sine", 0.07); setTimeout(function() { molTone(659, 0.08, "sine", 0.07); }, 70); setTimeout(function() { molTone(784, 0.1, "sine", 0.08); }, 140); }

  if (window.StemLab && window.StemLab.isRegistered && window.StemLab.isRegistered('molecule')) return;

  window.StemLab.registerTool('molecule', {
    icon: '\uD83E\uDDEA',
    label: 'molecule',
    desc: '',
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'discover_compound', label: 'Discover a chemical compound', icon: '\uD83E\uDDEA', check: function(d) { return (d.discoveredCompounds || []).length >= 1; }, progress: function(d) { return (d.discoveredCompounds || []).length >= 1 ? 'Done!' : 'Not yet'; } },
      { id: 'discover_5_compounds', label: 'Discover 5 different compounds', icon: '\uD83D\uDD2C', check: function(d) { return (d.discoveredCompounds || []).length >= 5; }, progress: function(d) { return (d.discoveredCompounds || []).length + '/5'; } },
      { id: 'balance_3_reactions', label: 'Balance 3 chemical reactions', icon: '\u2696\uFE0F', check: function(d) { return (d.reactionsBalanced || 0) >= 3; }, progress: function(d) { return (d.reactionsBalanced || 0) + '/3'; } },
      { id: 'earn_50_rp', label: 'Earn 50 research points', icon: '\u2B50', check: function(d) { return (d.totalRP || 0) >= 50; }, progress: function(d) { return (d.totalRP || 0) + '/50 RP'; } },
      { id: 'complete_3_challenges', label: 'Complete 3 chemistry challenges', icon: '\uD83C\uDFC6', check: function(d) { return (d.completedChallenges || []).length >= 3; }, progress: function(d) { return (d.completedChallenges || []).length + '/3'; } }
    ],
    render: function(ctx) {
      // Aliases â€” maps ctx properties to original variable names
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Calculator = ctx.icons.Calculator;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var GripVertical = ctx.icons.GripVertical;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var props = ctx.props;
      var canvasNarrate = ctx.canvasNarrate;

      var useRef = React.useRef;
      var useState = React.useState;
      var useEffect = React.useEffect;

      // ── Tool body (molecule) ──
      var __moleculeMainView = (function() {

          // ── State + three.js refs ──
          // Restored: these were referenced throughout the tool body but their
          // declarations were lost to a bulk edit (commit 49aa0e5f dropped
          // `const d`/`upd`; the 3D feature referenced threeLoaded + *Ref without
          // ever declaring them) — molecule crashed on render with everything
          // undefined. d/upd match the last-good version (7b02d155).
          const d = labToolData.molecule || {};
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, molecule: { ...prev.molecule, [key]: val } }));
          const [threeLoaded, setThreeLoaded] = useState(false);
          const webglCanvasRef = useRef(null);
          const threeSceneRef = useRef(null);
          const threeCameraRef = useRef(null);
          const threeRendererRef = useRef(null);
          const threeControlsRef = useRef(null);
          const threeResourcesRef = useRef(null);
          const animationFrameIdRef = useRef(null);
          // INCOMPLETE FEATURE (stubbed to prevent a render crash): commit 49aa0e5f
          // added drawVisualShelf(...) calls for the reactions-mode "Visual Molecule
          // Shelf" but never a definition. Stubbed to null so the tool renders; the
          // per-reaction-side molecule visual still needs to be implemented.
          const drawVisualShelf = (terms, isLeft) => {
            // Render each reactant/product as a small colored atom cluster.
            // Honest representation: atoms shown as element-colored circles sized
            // by count, with the formula label as the source of truth. We do NOT
            // invent bond geometry we don't have for arbitrary compounds.
            if (!Array.isArray(terms)) return null;
            const elColor = (sym) => {
              const e = ELEMENTS.find(x => x.s === sym);
              return (e && e.c) || (isDark ? '#94a3b8' : '#64748b');
            };
            return React.createElement("div", { className: "flex gap-2 items-end flex-wrap justify-center" },
              terms.map((term, ti) => React.createElement("div", {
                key: 'shelf-' + (isLeft ? 'L' : 'R') + '-' + ti + '-' + (term.formula || ti),
                className: "flex flex-col items-center gap-1"
              },
                React.createElement("div", { className: "flex items-center justify-center gap-0.5 flex-wrap", style: { maxWidth: '88px' } },
                  Object.keys(term.atoms || {}).map((sym) => {
                    const count = term.atoms[sym];
                    return Array.apply(null, Array(Math.min(count, 6))).map((_, ai) =>
                      React.createElement("span", {
                        key: 'atom-' + sym + '-' + ai,
                        title: sym,
                        style: {
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: elColor(sym), color: '#fff',
                          fontSize: '9px', fontWeight: 'bold',
                          border: '1.5px solid ' + (isDark ? '#0f172a' : '#fff'),
                          boxShadow: '0 1px 2px rgba(0,0,0,0.25)'
                        }
                      }, sym)
                    );
                  })
                ),
                React.createElement("span", {
                  className: "text-[11px] font-bold " + (isDark ? "text-slate-200" : "text-slate-700")
                }, term.formula || '')
              ))
            );
          };


          const W = 400, H = 300;

          const mode = d.moleculeMode || 'viewer';

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('molecule', 'init', {
              first: 'Molecule Lab loaded. ' + (mode === 'viewer' ? 'Viewer mode active. Choose a molecule preset to view its 3D model.' : 'Current mode: ' + mode + '.'),
              repeat: 'Molecule Lab, mode: ' + mode + '.',
              terse: 'Molecule Lab.'
            }, { debounce: 800 });
          }

          // ═══ Enhanced state ═══
          const researchPoints = d.researchPoints || 0;
          const totalRP = d.totalRP || 0;
          const completedChallenges = d.completedChallenges || [];
          const tutorialStep = d.tutorialStep || 0;
          const tutorialDismissed = d.tutorialDismissed || false;
          const reactionsBalanced = d.reactionsBalanced || 0;
          const currentReactionIdx = d.currentReactionIdx || 0;
          const reactionCoeffs = d.reactionCoeffs || null;
          const reactionResult = d.reactionResult || null;
          const updMulti = (obj) => setLabToolData(prev => ({ ...prev, molecule: { ...prev.molecule, ...obj } }));
          const isDark = !!(props && props.darkMode);

          // ═══ Keyboard Shortcuts ═══
          // Note: these execute on every render but are lightweight
          const SHORTCUTS = { '1': 'viewer', '2': 'creator', '3': 'build', '4': 'table', '5': 'reactions' };
          if (typeof window !== 'undefined' && !window._molKbBound) {
            window._molKbBound = true;
            document.addEventListener('keydown', function(e) {
              if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
              if (e.altKey && SHORTCUTS[e.key]) {
                e.preventDefault();
                upd('moleculeMode', SHORTCUTS[e.key]);
              }
            });
          }
          const aiQuestion = d.aiQuestion || '';
          const aiAnswer = d.aiAnswer || '';
          const aiLoading = d.aiLoading || false;

          // ── Three.js Sequenced Loader ──
          useEffect(function() {
            if (window.THREE && window.THREE.OrbitControls) {
              setThreeLoaded(true);
              return;
            }
            
            function loadOrbitControls() {
              if (window.THREE && window.THREE.OrbitControls) {
                setThreeLoaded(true);
                return;
              }
              var script = document.createElement('script');
              script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
              script.async = true;
              script.onload = function() {
                setThreeLoaded(true);
              };
              script.onerror = function(err) {
                console.error("Failed to load OrbitControls", err);
              };
              document.head.appendChild(script);
            }

            if (window.THREE) {
              loadOrbitControls();
              return;
            }

            var script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
            script.async = true;
            script.onload = function() {
              loadOrbitControls();
            };
            script.onerror = function(err) {
              console.error("Failed to load Three.js", err);
            };
            document.head.appendChild(script);
          }, []);

          // ── Three.js Lifecycle Hooks ──
          useEffect(function() {
            if (mode === 'viewer') {
              if (threeLoaded && webglCanvasRef.current) {
                if (!threeSceneRef.current) {
                  initThree(webglCanvasRef.current);
                }
                update3DModel();
              }
            } else {
              disposeThree();
            }
          }, [mode, threeLoaded, d.atoms, d.bonds]);

          useEffect(function() {
            return function() {
              disposeThree();
            };
          }, []);

          const initThree = function(canvas) {
            if (!window.THREE || !window.THREE.OrbitControls) return;
            try {
              var THREE = window.THREE;
              var W = canvas.clientWidth || 400;
              var H = canvas.clientHeight || 300;

              var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
              renderer.setSize(W, H, false);
              renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
              threeRendererRef.current = renderer;

              var scene = new THREE.Scene();
              threeSceneRef.current = scene;

              var camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
              camera.position.set(0, 0, 15);
              threeCameraRef.current = camera;

              var ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
              scene.add(ambientLight);

              var dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
              dirLight.position.set(5, 10, 7);
              scene.add(dirLight);
              
              var fillLight = new THREE.DirectionalLight(0x90b0ff, 0.45);
              fillLight.position.set(-5, -5, -2);
              scene.add(fillLight);

              var controls = new THREE.OrbitControls(camera, renderer.domElement);
              controls.enableDamping = true;
              controls.dampingFactor = 0.05;
              controls.maxDistance = 50;
              controls.minDistance = 2;
              threeControlsRef.current = controls;

              threeResourcesRef.current = {
                ambientLight: ambientLight,
                dirLight: dirLight,
                fillLight: fillLight,
                atomGroup: new THREE.Group()
              };
              scene.add(threeResourcesRef.current.atomGroup);

              startLoop();
            } catch(e) {
              console.error("Error in initThree", e);
            }
          };

          const startLoop = function() {
            var THREE = window.THREE;
            var animate = function() {
              animationFrameIdRef.current = requestAnimationFrame(animate);
              
              var controls = threeControlsRef.current;
              var resources = threeResourcesRef.current;
              if (resources && resources.atomGroup) {
                if (controls && controls.state === -1) {
                  resources.atomGroup.rotation.y += 0.005;
                }
              }
              
              if (controls) {
                controls.update();
              }
              
              if (threeRendererRef.current && threeSceneRef.current && threeCameraRef.current) {
                var canvas = webglCanvasRef.current;
                if (canvas) {
                  var W = canvas.clientWidth || 400;
                  var H = canvas.clientHeight || 300;
                  if (canvas.width !== W || canvas.height !== H) {
                    threeRendererRef.current.setSize(W, H, false);
                    threeCameraRef.current.aspect = W / H;
                    threeCameraRef.current.updateProjectionMatrix();
                  }
                }
                threeRendererRef.current.render(threeSceneRef.current, threeCameraRef.current);
              }
            };
            
            if (animationFrameIdRef.current) {
              cancelAnimationFrame(animationFrameIdRef.current);
            }
            animate();
          };

          const update3DModel = function() {
            var THREE = window.THREE;
            var scene = threeSceneRef.current;
            var resources = threeResourcesRef.current;
            if (!THREE || !scene || !resources || !resources.atomGroup) return;

            var atomGroup = resources.atomGroup;
            while(atomGroup.children.length > 0) {
              var child = atomGroup.children[0];
              atomGroup.remove(child);
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(function(m) { m.dispose(); });
                } else {
                  child.material.dispose();
                }
              }
            }
            
            atomGroup.rotation.set(0, 0, 0);

            var atoms = d.atoms || [];
            var bonds = d.bonds || [];
            if (atoms.length === 0) return;

            var sumX = 0, sumY = 0;
            atoms.forEach(function(a) {
              sumX += a.x;
              sumY += a.y;
            });
            var avgX = sumX / atoms.length;
            var avgY = sumY / atoms.length;
            var scale = 0.045;

            var getRadius = function(el) {
              switch(el) {
                case 'H': return 0.55;
                case 'C': return 0.95;
                case 'N': return 0.9;
                case 'O': return 0.85;
                case 'F': return 0.8;
                case 'Cl': return 1.0;
                case 'Br': return 1.15;
                case 'I': return 1.3;
                case 'S': return 1.0;
                case 'P': return 1.05;
                case 'Na': return 1.1;
                case 'K': return 1.35;
                case 'Ca': return 1.25;
                case 'Fe': return 1.2;
                case 'Cu': return 1.15;
                case 'Zn': return 1.15;
                case 'Ag': return 1.25;
                case 'Au': return 1.3;
                default: return 0.9;
              }
            };

            var getColor = function(a) {
              if (a.color) {
                if (a.color.indexOf('var(') === 0) {
                  return 0x94a3b8;
                }
                return new THREE.Color(a.color);
              }
              return 0x94a3b8;
            };

            var positions = atoms.map(function(a, idx) {
              var pz = 0;
              if (a.el === 'H') {
                pz = Math.sin(idx * 2.0) * 1.2;
              } else if (a.el === 'O' && atoms.length > 3) {
                pz = Math.cos(idx * 2.0) * 0.6;
              }
              return new THREE.Vector3((a.x - avgX) * scale, -(a.y - avgY) * scale, pz);
            });

            var createTextSprite = function(text) {
              var canvas = document.createElement('canvas');
              canvas.width = 64;
              canvas.height = 64;
              var ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, 64, 64);
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 36px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.shadowColor = 'rgba(0,0,0,0.8)';
              ctx.shadowBlur = 4;
              ctx.fillText(text, 32, 32);
              
              var texture = new THREE.CanvasTexture(canvas);
              var spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
              var sprite = new THREE.Sprite(spriteMat);
              sprite.scale.set(0.9, 0.9, 1);
              return sprite;
            };

            // Render Atom Spheres and Labels
            atoms.forEach(function(a, i) {
              var pos = positions[i];
              var r = getRadius(a.el);
              var color = getColor(a);

              var sphereGeo = new THREE.SphereGeometry(r, 32, 32);
              var atomMat = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.15,
                metalness: 0.1
              });
              var sphereMesh = new THREE.Mesh(sphereGeo, atomMat);
              sphereMesh.position.copy(pos);
              atomGroup.add(sphereMesh);

              var sprite = createTextSprite(a.el);
              sprite.position.copy(pos);
              atomGroup.add(sprite);
            });

            // Render Covalent Bonds (Supports single, double, and triple parallel rods)
            var renderBond = function(mid, len, quat, radius) {
              var cylinderGeo = new THREE.CylinderGeometry(radius, radius, len, 12);
              var bondMat = new THREE.MeshStandardMaterial({
                color: 0x94a3b8,
                roughness: 0.35,
                metalness: 0.2
              });
              var cylinderMesh = new THREE.Mesh(cylinderGeo, bondMat);
              cylinderMesh.position.copy(mid);
              cylinderMesh.quaternion.copy(quat);
              atomGroup.add(cylinderMesh);
            };

            bonds.forEach(function(b) {
              var posA = positions[b[0]];
              var posB = positions[b[1]];
              if (!posA || !posB) return;
              var dist = posA.distanceTo(posB);
              if (dist < 0.01) return;

              var midpoint = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
              var direction = new THREE.Vector3().subVectors(posB, posA).normalize();
              var alignAxis = new THREE.Vector3(0, 1, 0);
              var quaternion = new THREE.Quaternion().setFromUnitVectors(alignAxis, direction);

              var bondType = b[2] || 1;
              if (bondType === 1) {
                renderBond(midpoint, dist, quaternion, 0.12);
              } else {
                // Find a perpendicular direction for parallel offset cylinders
                var offsetDir = new THREE.Vector3(0, 0, 1);
                if (Math.abs(direction.dot(offsetDir)) > 0.95) {
                  offsetDir.set(1, 0, 0);
                }
                var perp1 = new THREE.Vector3().crossVectors(direction, offsetDir).normalize();
                
                if (bondType === 2) {
                  var off = 0.18;
                  var mid1 = new THREE.Vector3().copy(midpoint).addScaledVector(perp1, off);
                  var mid2 = new THREE.Vector3().copy(midpoint).addScaledVector(perp1, -off);
                  renderBond(mid1, dist, quaternion, 0.08);
                  renderBond(mid2, dist, quaternion, 0.08);
                } else if (bondType === 3) {
                  var perp2 = new THREE.Vector3().crossVectors(direction, perp1).normalize();
                  var off = 0.22;
                  var mid1 = new THREE.Vector3().copy(midpoint);
                  var mid2 = new THREE.Vector3().copy(midpoint).addScaledVector(perp2, off);
                  var mid3 = new THREE.Vector3().copy(midpoint).addScaledVector(perp2, -off);
                  renderBond(mid1, dist, quaternion, 0.07);
                  renderBond(mid2, dist, quaternion, 0.07);
                  renderBond(mid3, dist, quaternion, 0.07);
                }
              }
            });
          };

          const disposeThree = function() {
            try {
              if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
              }
              if (threeControlsRef.current) {
                threeControlsRef.current.dispose();
                threeControlsRef.current = null;
              }
              if (threeRendererRef.current) {
                var renderer = threeRendererRef.current;
                renderer.dispose();
                threeRendererRef.current = null;
              }
              if (threeSceneRef.current) {
                var scene = threeSceneRef.current;
                scene.traverse(function(obj) {
                  if (obj.geometry) obj.geometry.dispose();
                  if (obj.material) {
                    if (Array.isArray(obj.material)) {
                      obj.material.forEach(function(m) { m.dispose(); });
                    } else {
                      obj.material.dispose();
                    }
                  }
                });
                threeSceneRef.current = null;
              }
              threeCameraRef.current = null;
              threeResourcesRef.current = null;
            } catch(e) {
              console.error("Error in disposeThree", e);
            }
          };

          // â”€â”€ Periodic Table Data (118 elements) â”€â”€

          const ELEMENTS = [

            { n: 1, s: 'H', name: t('stem.periodic.hydrogen'), cat: 'nonmetal', c: '#60a5fa' }, { n: 2, s: 'He', name: t('stem.periodic.helium'), cat: 'noble', c: '#c084fc' },

            { n: 3, s: 'Li', name: t('stem.periodic.lithium'), cat: 'alkali', c: '#f87171' }, { n: 4, s: 'Be', name: t('stem.periodic.beryllium'), cat: 'alkaline', c: '#fbbf24' },

            { n: 5, s: 'B', name: t('stem.periodic.boron'), cat: 'metalloid', c: '#34d399' }, { n: 6, s: 'C', name: t('stem.periodic.carbon'), cat: 'nonmetal', c: '#60a5fa' },

            { n: 7, s: 'N', name: t('stem.periodic.nitrogen'), cat: 'nonmetal', c: '#60a5fa' }, { n: 8, s: 'O', name: t('stem.periodic.oxygen'), cat: 'nonmetal', c: '#60a5fa' },

            { n: 9, s: 'F', name: t('stem.periodic.fluorine'), cat: 'halogen', c: '#2dd4bf' }, { n: 10, s: 'Ne', name: t('stem.periodic.neon'), cat: 'noble', c: '#c084fc' },

            { n: 11, s: 'Na', name: t('stem.periodic.sodium'), cat: 'alkali', c: '#f87171' }, { n: 12, s: 'Mg', name: t('stem.periodic.magnesium'), cat: 'alkaline', c: '#fbbf24' },

            { n: 13, s: 'Al', name: t('stem.periodic.aluminum'), cat: 'metal', c: '#94a3b8' }, { n: 14, s: 'Si', name: t('stem.periodic.silicon'), cat: 'metalloid', c: '#34d399' },

            { n: 15, s: 'P', name: t('stem.periodic.phosphorus'), cat: 'nonmetal', c: '#60a5fa' }, { n: 16, s: 'S', name: t('stem.periodic.sulfur'), cat: 'nonmetal', c: '#60a5fa' },

            { n: 17, s: 'Cl', name: t('stem.periodic.chlorine'), cat: 'halogen', c: '#2dd4bf' }, { n: 18, s: 'Ar', name: t('stem.periodic.argon'), cat: 'noble', c: '#c084fc' },

            { n: 19, s: 'K', name: t('stem.periodic.potassium'), cat: 'alkali', c: '#f87171' }, { n: 20, s: 'Ca', name: t('stem.periodic.calcium'), cat: 'alkaline', c: '#fbbf24' },

            { n: 21, s: 'Sc', name: t('stem.periodic.scandium'), cat: 'transition', c: '#fb923c' }, { n: 22, s: 'Ti', name: t('stem.periodic.titanium'), cat: 'transition', c: '#fb923c' },

            { n: 23, s: 'V', name: t('stem.periodic.vanadium'), cat: 'transition', c: '#fb923c' }, { n: 24, s: 'Cr', name: t('stem.periodic.chromium'), cat: 'transition', c: '#fb923c' },

            { n: 25, s: 'Mn', name: t('stem.periodic.manganese'), cat: 'transition', c: '#fb923c' }, { n: 26, s: 'Fe', name: t('stem.periodic.iron'), cat: 'transition', c: '#fb923c' },

            { n: 27, s: 'Co', name: t('stem.periodic.cobalt'), cat: 'transition', c: '#fb923c' }, { n: 28, s: 'Ni', name: t('stem.periodic.nickel'), cat: 'transition', c: '#fb923c' },

            { n: 29, s: 'Cu', name: t('stem.periodic.copper'), cat: 'transition', c: '#fb923c' }, { n: 30, s: 'Zn', name: t('stem.periodic.zinc'), cat: 'transition', c: '#fb923c' },

            { n: 31, s: 'Ga', name: t('stem.periodic.gallium'), cat: 'metal', c: '#94a3b8' }, { n: 32, s: 'Ge', name: t('stem.periodic.germanium'), cat: 'metalloid', c: '#34d399' },

            { n: 33, s: 'As', name: t('stem.periodic.arsenic'), cat: 'metalloid', c: '#34d399' }, { n: 34, s: 'Se', name: t('stem.periodic.selenium'), cat: 'nonmetal', c: '#60a5fa' },

            { n: 35, s: 'Br', name: t('stem.periodic.bromine'), cat: 'halogen', c: '#2dd4bf' }, { n: 36, s: 'Kr', name: t('stem.periodic.krypton'), cat: 'noble', c: '#c084fc' },

            { n: 37, s: 'Rb', name: t('stem.periodic.rubidium'), cat: 'alkali', c: '#f87171' }, { n: 38, s: 'Sr', name: t('stem.periodic.strontium'), cat: 'alkaline', c: '#fbbf24' },

            { n: 39, s: 'Y', name: t('stem.periodic.yttrium'), cat: 'transition', c: '#fb923c' }, { n: 40, s: 'Zr', name: t('stem.periodic.zirconium'), cat: 'transition', c: '#fb923c' },

            { n: 41, s: 'Nb', name: t('stem.periodic.niobium'), cat: 'transition', c: '#fb923c' }, { n: 42, s: 'Mo', name: t('stem.periodic.molybdenum'), cat: 'transition', c: '#fb923c' },

            { n: 43, s: 'Tc', name: t('stem.periodic.technetium'), cat: 'transition', c: '#fb923c' }, { n: 44, s: 'Ru', name: t('stem.periodic.ruthenium'), cat: 'transition', c: '#fb923c' },

            { n: 45, s: 'Rh', name: t('stem.periodic.rhodium'), cat: 'transition', c: '#fb923c' }, { n: 46, s: 'Pd', name: t('stem.periodic.palladium'), cat: 'transition', c: '#fb923c' },

            { n: 47, s: 'Ag', name: t('stem.periodic.silver'), cat: 'transition', c: '#fb923c' }, { n: 48, s: 'Cd', name: t('stem.periodic.cadmium'), cat: 'transition', c: '#fb923c' },

            { n: 49, s: 'In', name: t('stem.periodic.indium'), cat: 'metal', c: '#94a3b8' }, { n: 50, s: 'Sn', name: 'Tin', cat: 'metal', c: '#94a3b8' },

            { n: 51, s: 'Sb', name: t('stem.periodic.antimony'), cat: 'metalloid', c: '#34d399' }, { n: 52, s: 'Te', name: t('stem.periodic.tellurium'), cat: 'metalloid', c: '#34d399' },

            { n: 53, s: 'I', name: t('stem.periodic.iodine'), cat: 'halogen', c: '#2dd4bf' }, { n: 54, s: 'Xe', name: t('stem.periodic.xenon'), cat: 'noble', c: '#c084fc' },

            { n: 55, s: 'Cs', name: t('stem.periodic.cesium'), cat: 'alkali', c: '#f87171' }, { n: 56, s: 'Ba', name: t('stem.periodic.barium'), cat: 'alkaline', c: '#fbbf24' },

            { n: 57, s: 'La', name: t('stem.periodic.lanthanide'), cat: 'lanthanide', c: '#a78bfa' }, { n: 58, s: 'Ce', name: t('stem.periodic.cerium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 59, s: 'Pr', name: t('stem.periodic.praseodymium'), cat: 'lanthanide', c: '#a78bfa' }, { n: 60, s: 'Nd', name: t('stem.periodic.neodymium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 61, s: 'Pm', name: t('stem.periodic.promethium'), cat: 'lanthanide', c: '#a78bfa' }, { n: 62, s: 'Sm', name: t('stem.periodic.samarium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 63, s: 'Eu', name: t('stem.periodic.europium'), cat: 'lanthanide', c: '#a78bfa' }, { n: 64, s: 'Gd', name: t('stem.periodic.gadolinium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 65, s: 'Tb', name: t('stem.periodic.terbium'), cat: 'lanthanide', c: '#a78bfa' }, { n: 66, s: 'Dy', name: t('stem.periodic.dysprosium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 67, s: 'Ho', name: t('stem.periodic.holmium'), cat: 'lanthanide', c: '#a78bfa' }, { n: 68, s: 'Er', name: t('stem.periodic.erbium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 69, s: 'Tm', name: t('stem.periodic.thulium'), cat: 'lanthanide', c: '#a78bfa' }, { n: 70, s: 'Yb', name: t('stem.periodic.ytterbium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 71, s: 'Lu', name: t('stem.periodic.lutetium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 72, s: 'Hf', name: t('stem.periodic.hafnium'), cat: 'transition', c: '#fb923c' }, { n: 73, s: 'Ta', name: t('stem.periodic.tantalum'), cat: 'transition', c: '#fb923c' },

            { n: 74, s: 'W', name: t('stem.periodic.tungsten'), cat: 'transition', c: '#fb923c' }, { n: 75, s: 'Re', name: t('stem.periodic.rhenium'), cat: 'transition', c: '#fb923c' },

            { n: 76, s: 'Os', name: t('stem.periodic.osmium'), cat: 'transition', c: '#fb923c' }, { n: 77, s: 'Ir', name: t('stem.periodic.iridium'), cat: 'transition', c: '#fb923c' },

            { n: 78, s: 'Pt', name: t('stem.periodic.platinum'), cat: 'transition', c: '#fb923c' }, { n: 79, s: 'Au', name: t('stem.periodic.gold'), cat: 'transition', c: '#fb923c' },

            { n: 80, s: 'Hg', name: t('stem.periodic.mercury'), cat: 'transition', c: '#fb923c' }, { n: 81, s: 'Tl', name: t('stem.periodic.thallium'), cat: 'metal', c: '#94a3b8', gravity: '0.38g', atmosphere: 'None - no significant atmosphere', surface: 'Heavily cratered, resembling the Moon', notableFeatures: ['Caloris Basin (1,550 km crater)', 'Ice in permanently shadowed craters', 'Fastest orbital speed: 47 km/s'], skyColor: '#000000', terrainColor: '#7a7a7a', terrainType: 'cratered', surfaceDesc: 'Grey cratered wasteland under a black sky. The Sun appears 3x larger than on Earth.' },

            { n: 82, s: 'Pb', name: t('stem.periodic.lead'), cat: 'metal', c: '#94a3b8' }, { n: 83, s: 'Bi', name: t('stem.periodic.bismuth'), cat: 'metal', c: '#94a3b8' },

            { n: 84, s: 'Po', name: t('stem.periodic.polonium'), cat: 'metalloid', c: '#34d399' }, { n: 85, s: 'At', name: t('stem.periodic.astatine'), cat: 'halogen', c: '#2dd4bf' },

            { n: 86, s: 'Rn', name: t('stem.periodic.radon'), cat: 'noble', c: '#c084fc' },

            { n: 87, s: 'Fr', name: t('stem.periodic.francium'), cat: 'alkali', c: '#f87171' }, { n: 88, s: 'Ra', name: t('stem.periodic.radium'), cat: 'alkaline', c: '#fbbf24' },

            { n: 89, s: 'Ac', name: t('stem.periodic.actinide'), cat: 'actinide', c: '#f472b6' }, { n: 90, s: 'Th', name: t('stem.periodic.thorium'), cat: 'actinide', c: '#f472b6' },

            { n: 91, s: 'Pa', name: t('stem.periodic.protactinium'), cat: 'actinide', c: '#f472b6' }, { n: 92, s: 'U', name: t('stem.periodic.uranium'), cat: 'actinide', c: '#f472b6' },

            { n: 93, s: 'Np', name: t('stem.periodic.neptunium'), cat: 'actinide', c: '#f472b6' }, { n: 94, s: 'Pu', name: t('stem.periodic.plutonium'), cat: 'actinide', c: '#f472b6' },

            { n: 95, s: 'Am', name: t('stem.periodic.americium'), cat: 'actinide', c: '#f472b6' }, { n: 96, s: 'Cm', name: t('stem.periodic.curium'), cat: 'actinide', c: '#f472b6' },

            { n: 97, s: 'Bk', name: t('stem.periodic.berkelium'), cat: 'actinide', c: '#f472b6' }, { n: 98, s: 'Cf', name: t('stem.periodic.californium'), cat: 'actinide', c: '#f472b6' },

            { n: 99, s: 'Es', name: t('stem.periodic.einsteinium'), cat: 'actinide', c: '#f472b6' }, { n: 100, s: 'Fm', name: t('stem.periodic.fermium'), cat: 'actinide', c: '#f472b6' },

            { n: 101, s: 'Md', name: t('stem.periodic.mendelevium'), cat: 'actinide', c: '#f472b6' }, { n: 102, s: 'No', name: t('stem.periodic.nobelium'), cat: 'actinide', c: '#f472b6' },

            { n: 103, s: 'Lr', name: t('stem.periodic.lawrencium'), cat: 'actinide', c: '#f472b6' },

            { n: 104, s: 'Rf', name: t('stem.periodic.rutherfordium'), cat: 'transition', c: '#fb923c' }, { n: 105, s: 'Db', name: t('stem.periodic.dubnium'), cat: 'transition', c: '#fb923c' },

            { n: 106, s: 'Sg', name: t('stem.periodic.seaborgium'), cat: 'transition', c: '#fb923c' }, { n: 107, s: 'Bh', name: t('stem.periodic.bohrium'), cat: 'transition', c: '#fb923c' },

            { n: 108, s: 'Hs', name: t('stem.periodic.hassium'), cat: 'transition', c: '#fb923c' }, { n: 109, s: 'Mt', name: t('stem.periodic.meitnerium'), cat: 'transition', c: '#fb923c' },

            { n: 110, s: 'Ds', name: t('stem.periodic.darmstadtium'), cat: 'transition', c: '#fb923c' }, { n: 111, s: 'Rg', name: t('stem.periodic.roentgenium'), cat: 'transition', c: '#fb923c' },

            { n: 112, s: 'Cn', name: t('stem.periodic.copernicium'), cat: 'transition', c: '#fb923c' }, { n: 113, s: 'Nh', name: t('stem.periodic.nihonium'), cat: 'metal', c: '#94a3b8' },

            { n: 114, s: 'Fl', name: t('stem.periodic.flerovium'), cat: 'metal', c: '#94a3b8' }, { n: 115, s: 'Mc', name: t('stem.periodic.moscovium'), cat: 'metal', c: '#94a3b8' },

            { n: 116, s: 'Lv', name: t('stem.periodic.livermorium'), cat: 'metal', c: '#94a3b8' }, { n: 117, s: 'Ts', name: t('stem.periodic.tennessine'), cat: 'halogen', c: '#2dd4bf' },

            { n: 118, s: 'Og', name: t('stem.periodic.oganesson'), cat: 'noble', c: '#c084fc' }

          ];



          // â”€â”€ Element Details (descriptions, uses, compounds) â”€â”€

          const ELEMENT_DETAILS = {

            H: { desc: t('stem.periodic.lightest_element_fuels_stars_via'), uses: ['Fuel cells', 'Rocket propellant', 'Ammonia production'], compounds: ['H₂O (Water)', 'HCl (Hydrochloric Acid)', 'NH₃ (Ammonia)', 'CH₄ (Methane)'] },

            He: { desc: t('stem.periodic.inert_noble_gas_2nd_most'), uses: ['Balloons & blimps', 'MRI coolant', 'Deep-sea diving gas'], compounds: ['None (noble gas â€” does not form compounds)'] },

            Li: { desc: t('stem.periodic.lightest_metal_soft_enough_to'), uses: ['Rechargeable batteries', 'Mood-stabilizing medication', 'Ceramics & glass'], compounds: ['LiOH (Lithium Hydroxide)', 'Li₂CO₃ (Lithium Carbonate)'] },

            Be: { desc: t('stem.periodic.rare_toxic_metal_that_is'), uses: ['Aerospace alloys', 'X-ray windows', 'Satellite components'], compounds: ['BeO (Beryllium Oxide)'] },

            B: { desc: t('stem.periodic.metalloid_essential_for_plant_growth'), uses: ['Borosilicate glass (Pyrex)', 'Cleaning products (borax)', 'Semiconductors'], compounds: ['B₂O₃ (Boron Trioxide)', 'H₃BO₃ (Boric Acid)'] },

            C: { desc: t('stem.periodic.basis_of_all_known_life'), uses: ['Steel production', 'Graphite pencils', 'Carbon fiber composites'], compounds: ['CO₂ (Carbon Dioxide)', 'CH₄ (Methane)', 'C₆H₁₂O₆ (Glucose)', 'CaCO₃ (Limestone)'] },

            N: { desc: t('stem.periodic.makes_up_78_of_earth') + "'s atmosphere", uses: ['Fertilizers', 'Explosives(TNT)', 'Food preservation'], compounds: ['NH₃ (Ammonia)', 'NO₂ (Nitrogen Dioxide)', 'N₂O(Laughing Gas)', 'HNO₃ (Nitric Acid)'] },

            O: { desc: t('stem.periodic.essential_for_respiration_most_abundant') + "'s crust", uses: ['Medical oxygen', 'Welding & cutting', 'Water purification'], compounds: ['H₂O(Water)', 'CO₂ (Carbon Dioxide)', 'Fe₂O₃(Rust)', 'O₃(Ozone)'] },

            F: { desc: t('stem.periodic.most_reactive_and_electronegative_element'), uses: ['Toothpaste (fluoride)', 'Teflon coatings', 'Refrigerants'], compounds: ['HF (Hydrofluoric Acid)', 'NaF (Sodium Fluoride)', 'CF₄ (Carbon Tetrafluoride)'] },

            Ne: { desc: t('stem.periodic.produces_iconic_reddishorange_glow_in'), uses: ['Neon signs', 'High-voltage indicators', 'Laser technology'], compounds: ['None (noble gas)'] },

            Na: { desc: t('stem.periodic.soft_silvery_metal_that_reacts'), uses: ['Table salt (NaCl)', 'Street lighting', 'Baking soda'], compounds: ['NaCl (Table Salt)', 'NaOH (Lye)', 'NaHCO₃ (Baking Soda)', 'Na₂CO₃ (Washing Soda)'] },

            Mg: { desc: t('stem.periodic.lightweight_metal_that_burns_with'), uses: ['Alloy wheels', 'Fireworks & flares', 'Antacid tablets'], compounds: ['MgO (Magnesium Oxide)', 'MgSO₄ (Epsom Salt)', 'Mg(OH)₂ (Milk of Magnesia)'] },

            Al: { desc: t('stem.periodic.most_abundant_metal_in_earth') + "'s crust", uses: ['Cans & foil', 'Aircraft frames', 'Window frames'], compounds: ['Al₂O₃ (Alumina)', 'AlCl₃(Aluminum Chloride)'] },

            Si: { desc: t('stem.periodic.semiconductor_that_powers_the_digital'), uses: ['Computer chips', 'Solar panels', 'Glass & concrete'], compounds: ['SiO₂ (Sand/Quartz)', 'SiC (Silicon Carbide)'] },

            P: { desc: t('stem.periodic.essential_for_dna_and_bones'), uses: ['Fertilizers', 'Matches', 'Detergents'], compounds: ['H₃PO₄ (Phosphoric Acid)', 'Ca₃(PO₄)₂ (Bone mineral)'] },

            S: { desc: t('stem.periodic.yellow_element_with_distinctive_rottenegg'), uses: ['Vulcanizing rubber', 'Sulfuric acid production', 'Gunpowder'], compounds: ['H₂SO₄ (Sulfuric Acid)', 'SO₂ (Sulfur Dioxide)', 'H₂S (Hydrogen Sulfide)'] },

            Cl: { desc: t('stem.periodic.greenishyellow_gas_used_to_purify'), uses: ['Water treatment', 'PVC plastic', 'Bleach & disinfectants'], compounds: ['NaCl (Table Salt)', 'HCl (Hydrochloric Acid)', 'NaOCl (Bleach)'] },

            Ar: { desc: t('stem.periodic.third_most_abundant_gas_in'), uses: ['Welding shield gas', 'Light bulb filling', 'Window insulation'], compounds: ['None (noble gas)'] },

            K: { desc: t('stem.periodic.essential_nutrient_found_in_bananas'), uses: ['Fertilizers (potash)', 'Soap making', 'Food preservation'], compounds: ['KCl (Potassium Chloride)', 'KOH (Potassium Hydroxide)', 'KNO₃ (Saltpeter)'] },

            Ca: { desc: t('stem.periodic.builds_bones_and_teeth_5th'), uses: ['Cement & concrete', 'Chalk & plaster', 'Dietary supplement'], compounds: ['CaCO₃ (Limestone/Chalk)', 'CaO (Quicklime)', 'Ca(OH)₂ (Slaked Lime)', 'CaSO₄ (Gypsum)'] },

            Fe: { desc: t('stem.periodic.most_used_metal_core_of'), uses: ['Steel construction', 'Cast iron cookware', 'Magnetic devices'], compounds: ['Fe₂O₃ (Rust)', 'FeSO₄ (Iron Supplement)', 'Fe₃O₄ (Magnetite)'] },

            Cu: { desc: t('stem.periodic.reddish_metal_used_since_the'), uses: ['Electrical wiring', 'Plumbing pipes', 'Coins'], compounds: ['CuSO₄ (Blue Vitriol)', 'CuO (Copper Oxide)', 'Cu₂O (Cuprous Oxide)'] },

            Zn: { desc: t('stem.periodic.bluishwhite_metal_that_prevents_rust'), uses: ['Galvanizing steel', 'Batteries', 'Sunscreen (zinc oxide)'], compounds: ['ZnO (Zinc Oxide)', 'ZnS (Zinc Sulfide)', 'ZnCl₂ (Zinc Chloride)'] },

            Ag: { desc: t('stem.periodic.best_conductor_of_electricity_among'), uses: ['Jewelry & silverware', 'Photography', 'Electronics'], compounds: ['AgNO₃ (Silver Nitrate)', 'AgCl (Silver Chloride)', 'Ag₂O (Silver Oxide)'] },

            Au: { desc: t('stem.periodic.dense_soft_shiny_precious_metal'), uses: ['Jewelry', 'Electronics (connectors)', 'Currency reserves'], compounds: ['AuCl₃ (Gold Chloride) â€” gold rarely forms compounds'] },

            Ti: { desc: t('stem.periodic.strong_as_steel_but_45'), uses: ['Aircraft & spacecraft', 'Joint replacements', 'Titanium white paint'], compounds: ['TiO₂ (Titanium Dioxide)', 'TiCl₄ (Titanium Tetrachloride)'] },

            Cr: { desc: t('stem.periodic.shiny_metal_that_gives_rubies'), uses: ['Chrome plating', 'Stainless steel', 'Leather tanning'], compounds: ['Cr₂O₃ (Chromium Oxide)', 'K₂Cr₂O₇ (Potassium Dichromate)'] },

            Mn: { desc: t('stem.periodic.essential_for_steel_production_and'), uses: ['Steel alloys', 'Alkaline batteries', 'Glass decolorizer'], compounds: ['MnO₂ (Manganese Dioxide)', 'KMnO₄ (Potassium Permanganate)'] },

            Ni: { desc: t('stem.periodic.corrosionresistant_metal_used_in_coins'), uses: ['Stainless steel', 'Rechargeable batteries', 'Coins'], compounds: ['NiO (Nickel Oxide)', 'NiSO₄ (Nickel Sulfate)'] },

            Br: { desc: t('stem.periodic.only_nonmetal_liquid_at_room'), uses: ['Flame retardants', 'Photography', 'Water purification'], compounds: ['NaBr (Sodium Bromide)', 'HBr (Hydrobromic Acid)'] },

            I: { desc: t('stem.periodic.essential_trace_element_for_thyroid'), uses: ['Antiseptic (tincture)', 'Iodized salt', 'Medical imaging'], compounds: ['KI (Potassium Iodide)', 'HI (Hydroiodic Acid)'] },

            Pt: { desc: t('stem.periodic.precious_metal_rarer_than_gold'), uses: ['Catalytic converters', 'Jewelry', 'Anti-cancer drugs'], compounds: ['PtCl₂ (Platinum Chloride)', 'H₂PtCl₆ (Chloroplatinic Acid)'] },

            U: { desc: t('stem.periodic.dense_radioactive_metal_that_powers'), uses: ['Nuclear power', 'Nuclear weapons', 'Radiation shielding'], compounds: ['UO₂ (Uranium Dioxide)', 'UF₆ (Uranium Hexafluoride)'] },

            Hg: { desc: t('stem.periodic.only_metal_liquid_at_room'), uses: ['Thermometers (historic)', 'Fluorescent lights', 'Dental amalgams'], compounds: ['HgCl₂ (Mercury Chloride)', 'HgO (Mercury Oxide)'] },

            Pb: { desc: t('stem.periodic.dense_soft_metal_once_used'), uses: ['Car batteries', 'Radiation shielding', 'Solder (lead-free now)'], compounds: ['PbO (Lead Oxide)', 'PbSO₄ (Lead Sulfate)'] },

            Sn: { desc: t('stem.periodic.soft_silvery_metal_used_since'), uses: ['Tin cans (coating)', 'Solder', 'Bronze alloy'], compounds: ['SnO₂ (Tin Oxide)', 'SnCl₂ (Tin Chloride)'] },

            W: { desc: t('stem.periodic.has_the_highest_melting_point'), uses: ['Light bulb filaments', 'Drill bits & cutting tools', 'Military armor'], compounds: ['WO₃ (Tungsten Trioxide)', 'WC (Tungsten Carbide)'] },

          };

          const getElementDetail = (sym) => ELEMENT_DETAILS[sym] || null;

          const getElementCompounds = (sym) => COMPOUNDS.filter(c => Object.keys(c.recipe).includes(sym));



          const getEl = (sym) => ELEMENTS.find(e => e.s === sym);

          // â”€â”€ Periodic Table layout (row, col) â”€â”€

          const PT_LAYOUT = [

            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],

            [3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 6, 7, 8, 9, 10],

            [11, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 14, 15, 16, 17, 18],

            [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],

            [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54],

            [55, 56, 0, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86],

            [87, 88, 0, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118],

            [],

            [0, 0, 0, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71],

            [0, 0, 0, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103]

          ,

            { name: 'Aspirin', formula: 'C₉H₈O₄', recipe: { C: 9, H: 8, O: 4 }, desc: 'Pain reliever & anti-inflammatory', emoji: '💊' },
            { name: 'Caffeine', formula: 'C₈H₁₀N₄O₂', recipe: { C: 8, H: 10, N: 4, O: 2 }, desc: 'The world\'s most popular stimulant', emoji: '☕' },
            { name: 'Citric Acid', formula: 'C₆H₈O₇', recipe: { C: 6, H: 8, O: 7 }, desc: 'Found in citrus fruits', emoji: '🍋' },
            { name: 'Urea', formula: 'CH₄N₂O', recipe: { C: 1, H: 4, N: 2, O: 1 }, desc: 'First organic compound synthesized', emoji: '🧪' },
            { name: 'Calcium Chloride', formula: 'CaCl₂', recipe: { Ca: 1, Cl: 2 }, desc: 'Road de-icer & cheese making', emoji: '❄️' },
            { name: 'Sodium Sulfate', formula: 'Na₂SO₄', recipe: { Na: 2, S: 1, O: 4 }, desc: 'Detergent additive', emoji: '🧴' },
            { name: 'Magnesium Hydroxide', formula: 'Mg(OH)₂', recipe: { Mg: 1, O: 2, H: 2 }, desc: 'Milk of magnesia (antacid)', emoji: '🥛' },
            { name: 'Aluminum Oxide', formula: 'Al₂O₃', recipe: { Al: 2, O: 3 }, desc: 'Corundum - ruby & sapphire', emoji: '💎' },
            { name: 'Silver Nitrate', formula: 'AgNO₃', recipe: { Ag: 1, N: 1, O: 3 }, desc: 'Photography & wound treatment', emoji: '📷' },
            { name: 'Potassium Permanganate', formula: 'KMnO₄', recipe: { K: 1, Mn: 1, O: 4 }, desc: 'Purple water purifier', emoji: '🟣' },
            { name: 'Zinc Oxide', formula: 'ZnO', recipe: { Zn: 1, O: 1 }, desc: 'Sunscreen & diaper cream', emoji: '☀️' },
            { name: 'Copper Oxide', formula: 'CuO', recipe: { Cu: 1, O: 1 }, desc: 'Black pigment in ceramics', emoji: '🎨' },
            { name: 'Iron Sulfate', formula: 'FeSO₄', recipe: { Fe: 1, S: 1, O: 4 }, desc: 'Iron supplement for anemia', emoji: '💊' },
            { name: 'Ammonium Chloride', formula: 'NH₄Cl', recipe: { N: 1, H: 4, Cl: 1 }, desc: 'Solder flux & cough drops', emoji: '🧪' },
            { name: 'Calcium Hydroxide', formula: 'Ca(OH)₂', recipe: { Ca: 1, O: 2, H: 2 }, desc: 'Slaked lime for mortar', emoji: '🪨' }];

          // â”€â”€ Compound Recipes â”€â”€

          const COMPOUNDS = [

            { name: t('stem.chem_balance.water'), formula: t('stem.periodic.hu2082o'), recipe: { H: 2, O: 1 }, desc: t('stem.periodic.essential_for_life'), emoji: '\uD83D\uDCA7' },

            { name: t('stem.periodic.carbon_dioxide'), formula: t('stem.periodic.cou2082'), recipe: { C: 1, O: 2 }, desc: t('stem.periodic.greenhouse_gas'), emoji: '\uD83C\uDF2B\uFE0F' },

            { name: t('stem.chem_balance.table_salt'), formula: t('stem.periodic.nacl'), recipe: { Na: 1, Cl: 1 }, desc: t('stem.periodic.sodium_chloride'), emoji: '\uD83E\uDDC2' },

            { name: t('stem.chem_balance.ammonia'), formula: t('stem.periodic.nhu2083'), recipe: { N: 1, H: 3 }, desc: t('stem.periodic.cleaning_agent'), emoji: '\uD83E\uDDEA' },

            { name: t('stem.periodic.methane'), formula: t('stem.periodic.chu2084'), recipe: { C: 1, H: 4 }, desc: t('stem.periodic.natural_gas'), emoji: '\uD83D\uDD25' },

            { name: t('stem.periodic.hydrogen_peroxide'), formula: 'H\u2082O\u2082', recipe: { H: 2, O: 2 }, desc: t('stem.periodic.disinfectant'), emoji: '\uD83E\uDE79' },

            { name: t('stem.periodic.ethanol'), formula: 'C\u2082H\u2085OH', recipe: { C: 2, H: 6, O: 1 }, desc: t('stem.periodic.alcohol'), emoji: '\uD83C\uDF7A' },

            { name: t('stem.periodic.sulfuric_acid'), formula: 'H\u2082SO\u2084', recipe: { H: 2, S: 1, O: 4 }, desc: t('stem.periodic.battery_acid'), emoji: '\u26A0\uFE0F' },

            { name: t('stem.periodic.glucose'), formula: 'C\u2086H\u2081\u2082O\u2086', recipe: { C: 6, H: 12, O: 6 }, desc: t('stem.periodic.blood_sugar'), emoji: '\uD83C\uDF6C' },

            { name: t('stem.periodic.baking_soda'), formula: 'NaHCO\u2083', recipe: { Na: 1, H: 1, C: 1, O: 3 }, desc: t('stem.periodic.sodium_bicarbonate'), emoji: '\uD83E\uDDC1' },

            { name: t('stem.chem_balance.calcium_carbonate'), formula: 'CaCO\u2083', recipe: { Ca: 1, C: 1, O: 3 }, desc: t('stem.periodic.chalk_marble'), emoji: '\uD83E\uDEA8' },

            { name: t('stem.chem_balance.iron_oxide'), formula: 'Fe\u2082O\u2083', recipe: { Fe: 2, O: 3 }, desc: t('stem.periodic.rust'), emoji: '\uD83D\uDFE5' },

            { name: t('stem.periodic.sodium_hydroxide'), formula: 'NaOH', recipe: { Na: 1, O: 1, H: 1 }, desc: t('stem.periodic.lye_caustic_soda'), emoji: '\uD83E\uDDEA' },

            { name: t('stem.periodic.hydrochloric_acid'), formula: 'HCl', recipe: { H: 1, Cl: 1 }, desc: t('stem.periodic.stomach_acid'), emoji: '\uD83E\uDE79' },

            { name: t('stem.periodic.acetic_acid'), formula: 'CH\u2083COOH', recipe: { C: 2, H: 4, O: 2 }, desc: t('stem.periodic.vinegar'), emoji: '\uD83E\uDD4B' },

            { name: t('stem.periodic.nitrogen_dioxide'), formula: 'NO\u2082', recipe: { N: 1, O: 2 }, desc: t('stem.periodic.brown_smog_gas'), emoji: '\uD83C\uDF2B\uFE0F' },

            { name: t('stem.periodic.sulfur_dioxide'), formula: 'SO\u2082', recipe: { S: 1, O: 2 }, desc: t('stem.periodic.acid_rain_precursor'), emoji: '\uD83C\uDF27\uFE0F' },

            { name: t('stem.periodic.ozone'), formula: 'O\u2083', recipe: { O: 3 }, desc: t('stem.periodic.uv_shield'), emoji: '\uD83D\uDEE1\uFE0F' },

            { name: t('stem.periodic.laughing_gas'), formula: 'N\u2082O', recipe: { N: 2, O: 1 }, desc: t('stem.periodic.nitrous_oxide'), emoji: '\uD83D\uDE02' },

            { name: t('stem.periodic.silicon_dioxide'), formula: 'SiO\u2082', recipe: { Si: 1, O: 2 }, desc: t('stem.periodic.sand_glass'), emoji: '\uD83C\uDFD6\uFE0F' },

          ];

          const selectedEls = d.selectedElements || {};

          // ═══ Chemical Reactions Database (10 reactions) ═══
          const REACTIONS = [
            { id: 'water_synth', name: 'Water Synthesis', emoji: '💧', type: 'Synthesis', difficulty: 1,
              desc: 'Hydrogen combines with oxygen to form water.',
              left: [{ formula: 'H₂', atoms: { H: 2 } }, { formula: 'O₂', atoms: { O: 2 } }],
              right: [{ formula: 'H₂O', atoms: { H: 2, O: 1 } }],
              answer: [2, 1, 2] },
            { id: 'haber', name: 'Haber Process', emoji: '🌾', type: 'Synthesis', difficulty: 2,
              desc: 'Nitrogen and hydrogen form ammonia - feeds half the world!',
              left: [{ formula: 'N₂', atoms: { N: 2 } }, { formula: 'H₂', atoms: { H: 2 } }],
              right: [{ formula: 'NH₃', atoms: { N: 1, H: 3 } }],
              answer: [1, 3, 2] },
            { id: 'methane_combust', name: 'Methane Combustion', emoji: '🔥', type: 'Combustion', difficulty: 1,
              desc: 'Natural gas burns to produce CO₂ and water.',
              left: [{ formula: 'CH₄', atoms: { C: 1, H: 4 } }, { formula: 'O₂', atoms: { O: 2 } }],
              right: [{ formula: 'CO₂', atoms: { C: 1, O: 2 } }, { formula: 'H₂O', atoms: { H: 2, O: 1 } }],
              answer: [1, 2, 1, 2] },
            { id: 'iron_rust', name: 'Rusting of Iron', emoji: '🟥', type: 'Synthesis', difficulty: 3,
              desc: 'Iron reacts with oxygen to form iron oxide (rust).',
              left: [{ formula: 'Fe', atoms: { Fe: 1 } }, { formula: 'O₂', atoms: { O: 2 } }],
              right: [{ formula: 'Fe₂O₃', atoms: { Fe: 2, O: 3 } }],
              answer: [4, 3, 2] },
            { id: 'salt_formation', name: 'Salt Formation', emoji: '🧂', type: 'Synthesis', difficulty: 1,
              desc: 'Sodium metal reacts with chlorine gas to make table salt.',
              left: [{ formula: 'Na', atoms: { Na: 1 } }, { formula: 'Cl₂', atoms: { Cl: 2 } }],
              right: [{ formula: 'NaCl', atoms: { Na: 1, Cl: 1 } }],
              answer: [2, 1, 2] },
            { id: 'propane_combust', name: 'Propane Combustion', emoji: '🔥', type: 'Combustion', difficulty: 3,
              desc: 'Propane burns - the BBQ grill reaction!',
              left: [{ formula: 'C₃H₈', atoms: { C: 3, H: 8 } }, { formula: 'O₂', atoms: { O: 2 } }],
              right: [{ formula: 'CO₂', atoms: { C: 1, O: 2 } }, { formula: 'H₂O', atoms: { H: 2, O: 1 } }],
              answer: [1, 5, 3, 4] },
            { id: 'zinc_acid', name: 'Zinc in Acid', emoji: '⚗️', type: 'Single Replacement', difficulty: 2,
              desc: 'Zinc dissolves in hydrochloric acid, releasing hydrogen gas.',
              left: [{ formula: 'Zn', atoms: { Zn: 1 } }, { formula: 'HCl', atoms: { H: 1, Cl: 1 } }],
              right: [{ formula: 'ZnCl₂', atoms: { Zn: 1, Cl: 2 } }, { formula: 'H₂', atoms: { H: 2 } }],
              answer: [1, 2, 1, 1] },
            { id: 'neutralization', name: 'Neutralization', emoji: '⚖️', type: 'Double Replacement', difficulty: 1,
              desc: 'NaOH neutralizes HCl to form salt and water.',
              left: [{ formula: 'NaOH', atoms: { Na: 1, O: 1, H: 1 } }, { formula: 'HCl', atoms: { H: 1, Cl: 1 } }],
              right: [{ formula: 'NaCl', atoms: { Na: 1, Cl: 1 } }, { formula: 'H₂O', atoms: { H: 2, O: 1 } }],
              answer: [1, 1, 1, 1] },
            { id: 'aluminum_oxide', name: 'Aluminum Oxidation', emoji: '✨', type: 'Synthesis', difficulty: 3,
              desc: 'Aluminum reacts with oxygen to form aluminum oxide.',
              left: [{ formula: 'Al', atoms: { Al: 1 } }, { formula: 'O₂', atoms: { O: 2 } }],
              right: [{ formula: 'Al₂O₃', atoms: { Al: 2, O: 3 } }],
              answer: [4, 3, 2] },
            { id: 'photosynthesis', name: 'Photosynthesis', emoji: '🌿', type: 'Synthesis', difficulty: 3,
              desc: 'Plants convert CO₂ and water into glucose and oxygen.',
              left: [{ formula: 'CO₂', atoms: { C: 1, O: 2 } }, { formula: 'H₂O', atoms: { H: 2, O: 1 } }],
              right: [{ formula: 'C₆H₁₂O₆', atoms: { C: 6, H: 12, O: 6 } }, { formula: 'O₂', atoms: { O: 2 } }],
              answer: [6, 6, 1, 6] }
          ];

          // ═══ Lab Challenges ═══
          const MOLECULE_CHALLENGES = [
            { id: 'first_discovery', emoji: '🧪', name: 'First Discovery', desc: 'Discover any compound', reward: 10,
              check: function() { return (d.discoveredCompounds || []).length >= 1; } },
            { id: 'chemist_10', emoji: '🧑‍🔬', name: 'Lab Chemist', desc: 'Discover 10 compounds', reward: 25,
              check: function() { return (d.discoveredCompounds || []).length >= 10; } },
            { id: 'master_chemist', emoji: '🏆', name: 'Master Chemist', desc: 'Discover all compounds', reward: 50,
              check: function() { return (d.discoveredCompounds || []).length >= COMPOUNDS.length; } },
            { id: 'quiz_streak', emoji: '🔥', name: 'Quiz Streak', desc: '5 correct in a row', reward: 20,
              check: function() { return (d.elStreak || 0) >= 5; } },
            { id: 'balance_3', emoji: '⚖️', name: 'Equation Balancer', desc: 'Balance 3 reactions', reward: 30,
              check: function() { return reactionsBalanced >= 3; } }
          ];

          // ═══ Reaction helpers ═══
          const checkBalance = (reaction, coeffs) => {
            const leftAtoms = {};
            const rightAtoms = {};
            reaction.left.forEach((term, i) => {
              const c = coeffs[i] || 1;
              Object.entries(term.atoms).forEach(([el, n]) => { leftAtoms[el] = (leftAtoms[el] || 0) + c * n; });
            });
            reaction.right.forEach((term, i) => {
              const c = coeffs[reaction.left.length + i] || 1;
              Object.entries(term.atoms).forEach(([el, n]) => { rightAtoms[el] = (rightAtoms[el] || 0) + c * n; });
            });
            const allEls = [...new Set([...Object.keys(leftAtoms), ...Object.keys(rightAtoms)])];
            return { balanced: allEls.every(el => (leftAtoms[el] || 0) === (rightAtoms[el] || 0)), leftAtoms, rightAtoms };
          };

          const getAtomBalance = (reaction, coeffs) => {
            const result = checkBalance(reaction, coeffs);
            const allEls = [...new Set([...Object.keys(result.leftAtoms), ...Object.keys(result.rightAtoms)])];
            return allEls.map(el => ({
              element: el, left: result.leftAtoms[el] || 0, right: result.rightAtoms[el] || 0,
              balanced: (result.leftAtoms[el] || 0) === (result.rightAtoms[el] || 0)
            }));
          };

          const initReaction = (idx) => {
            const r = REACTIONS[idx];
            const total = r.left.length + r.right.length;
            updMulti({ currentReactionIdx: idx, reactionCoeffs: Array(total).fill(1), reactionResult: null });
          };

          const setCoeff = (termIdx, delta) => {
            const coeffs = [...(reactionCoeffs || [])];
            coeffs[termIdx] = Math.max(1, Math.min(9, (coeffs[termIdx] || 1) + delta));
            updMulti({ reactionCoeffs: coeffs, reactionResult: null });
          };

          const submitReaction = () => {
            const r = REACTIONS[currentReactionIdx];
            const result = checkBalance(r, reactionCoeffs || []);
            if (result.balanced) {
              const newBal = reactionsBalanced + 1;
              const rpGain = r.difficulty * 10;
              updMulti({ reactionResult: 'correct', reactionsBalanced: newBal, researchPoints: researchPoints + rpGain, totalRP: totalRP + rpGain });
              addToast('✅ Balanced! +' + rpGain + ' RP', 'success');
              if (typeof awardStemXP === 'function') awardStemXP('molecule', 20, 'Balanced: ' + r.name);
              if (typeof stemCelebrate === 'function') stemCelebrate();
              checkMoleculeChallenges();
            } else {
              updMulti({ reactionResult: 'incorrect' });
              addToast('❌ Not balanced yet - check the atom counts!', 'warning');
            }
          };

          // ═══ Challenge checker ═══
          const checkMoleculeChallenges = () => {
            let newCompleted = [...completedChallenges];
            let rpGained = 0;
            MOLECULE_CHALLENGES.forEach(ch => {
              if (!newCompleted.includes(ch.id) && ch.check()) {
                newCompleted.push(ch.id);
                rpGained += ch.reward;
                addToast('🏆 ' + ch.name + '! +' + ch.reward + ' RP', 'success');
                if (typeof stemCelebrate === 'function') stemCelebrate();
              }
            });
            if (rpGained > 0) updMulti({ completedChallenges: newCompleted, researchPoints: researchPoints + rpGained, totalRP: totalRP + rpGained });
          };

          const advanceTutorial = () => upd('tutorialStep', Math.min(tutorialStep + 1, 4));
          const dismissTutorial = () => updMulti({ tutorialDismissed: true, tutorialStep: 0 });

          // ═══ Electron Configuration ═══
          const getElectronConfig = (atomicNum) => {
            const orbitals = ['1s','2s','2p','3s','3p','4s','3d','4p','5s','4d','5p','6s','4f','5d','6p','7s','5f','6d','7p'];
            const maxE = [2,2,6,2,6,2,10,6,2,10,6,2,14,10,6,2,14,10,6];
            let rem = atomicNum;
            const parts = [];
            for (let i = 0; i < orbitals.length && rem > 0; i++) {
              const e = Math.min(rem, maxE[i]);
              parts.push(orbitals[i] + e);
              rem -= e;
            }
            return parts.join(' ');
          };

          const getValenceElectrons = (atomicNum) => {
            const sc = [2, 8, 8, 18, 18, 32, 32];
            let rem = atomicNum;
            for (let i = 0; i < sc.length && rem > 0; i++) {
              if (rem <= sc[i]) return rem;
              rem -= sc[i];
            }
            return rem;
          };

          const ELECTRONEGATIVITY = { H:2.20,Li:0.98,Be:1.57,B:2.04,C:2.55,N:3.04,O:3.44,F:3.98,Na:0.93,Mg:1.31,Al:1.61,Si:1.90,P:2.19,S:2.58,Cl:3.16,K:0.82,Ca:1.00,Fe:1.83,Cu:1.90,Zn:1.65,Br:2.96,Ag:1.93,I:2.66,Au:2.54,Pt:2.28,Ti:1.54,Cr:1.66,Mn:1.55,Ni:1.91,Co:1.88 };

          // ═══ Atomic Masses (g/mol) ═══
          const ATOMIC_MASS = {
            H:1.008,He:4.003,Li:6.941,Be:9.012,B:10.81,C:12.011,N:14.007,O:15.999,F:18.998,Ne:20.180,
            Na:22.990,Mg:24.305,Al:26.982,Si:28.086,P:30.974,S:32.065,Cl:35.453,Ar:39.948,
            K:39.098,Ca:40.078,Sc:44.956,Ti:47.867,V:50.942,Cr:51.996,Mn:54.938,Fe:55.845,
            Co:58.933,Ni:58.693,Cu:63.546,Zn:65.38,Ga:69.723,Ge:72.630,As:74.922,Se:78.971,
            Br:79.904,Kr:83.798,Rb:85.468,Sr:87.62,Y:88.906,Zr:91.224,Nb:92.906,Mo:95.95,
            Tc:98,Ru:101.07,Rh:102.91,Pd:106.42,Ag:107.87,Cd:112.41,In:114.82,Sn:118.71,
            Sb:121.76,Te:127.60,I:126.90,Xe:131.29,Cs:132.91,Ba:137.33,La:138.91,Ce:140.12,
            Pr:140.91,Nd:144.24,Pm:145,Sm:150.36,Eu:151.96,Gd:157.25,Tb:158.93,Dy:162.50,
            Ho:164.93,Er:167.26,Tm:168.93,Yb:173.05,Lu:174.97,Hf:178.49,Ta:180.95,W:183.84,
            Re:186.21,Os:190.23,Ir:192.22,Pt:195.08,Au:196.97,Hg:200.59,Tl:204.38,Pb:207.2,
            Bi:208.98,Po:209,At:210,Rn:222,Fr:223,Ra:226,Ac:227,Th:232.04,Pa:231.04,U:238.03,
            Np:237,Pu:244,Am:243,Cm:247,Bk:247,Cf:251,Es:252,Fm:257,Md:258,No:259,Lr:266,
            Rf:267,Db:268,Sg:269,Bh:270,Hs:277,Mt:278,Ds:281,Rg:282,Cn:285,Nh:286,Fl:289,
            Mc:290,Lv:293,Ts:294,Og:294
          };

          // ═══ Molar Mass Calculator ═══
          const calcMolarMass = (atomCounts) => {
            let total = 0;
            Object.entries(atomCounts).forEach(([el, count]) => {
              total += (ATOMIC_MASS[el] || 0) * count;
            });
            return Math.round(total * 100) / 100;
          };

          // ═══ AI Chemistry Tutor ═══
          const askChemTutor = (question) => {
            if (!question || aiLoading) return;
            updMulti({ aiLoading: true, aiAnswer: '' });
            const gradeDesc = gradeLevel === 'K-2' ? 'a kindergarten to 2nd grade student' :
              gradeLevel === '3-5' ? 'a 3rd to 5th grade student' :
              gradeLevel === '6-8' ? 'a middle school student' : 'a high school student';
            const prompt = 'You are a friendly chemistry tutor for ' + gradeDesc + '. ' +
              'Answer this chemistry question concisely (2-3 sentences max): ' + question;
            if (typeof callGemini === 'function') {
              callGemini(prompt).then(function(answer) {
                updMulti({ aiAnswer: answer || 'I couldn\'t answer that. Try a different question!', aiLoading: false });
              }).catch(function() {
                updMulti({ aiAnswer: 'Oops! Something went wrong. Try again.', aiLoading: false });
              });
            } else {
              updMulti({ aiAnswer: 'AI tutor is not available right now.', aiLoading: false });
            }
          };

          // ═══ TTS Helper ═══
          const speakText = (text) => {
            if (typeof callTTS === 'function' && text) callTTS(text);
          };

          // ═══ Sound Helpers ═══
          const playBeep = () => { if (typeof stemBeep === 'function') stemBeep(); };
          const playCelebrate = () => { if (typeof stemCelebrate === 'function') stemCelebrate(); };

          const discovered = d.discoveredCompounds || [];

          const addElement = (sym) => { const cur = { ...selectedEls }; cur[sym] = (cur[sym] || 0) + 1; upd('selectedElements', cur); };

          const removeElement = (sym) => { const cur = { ...selectedEls }; if (cur[sym] > 1) cur[sym]--; else delete cur[sym]; upd('selectedElements', cur); };

          const clearElements = () => upd('selectedElements', {});

          const tryCraft = () => {

            const match = COMPOUNDS.find(c => {

              const rKeys = Object.keys(c.recipe); const sKeys = Object.keys(selectedEls);

              if (rKeys.length !== sKeys.length) return false;

              return rKeys.every(k => selectedEls[k] === c.recipe[k]);

            });

            if (match) {

              const isNew = !discovered.includes(match.formula);

              upd('craftResult', { success: true, compound: match, isNew });

              if (isNew) upd('discoveredCompounds', [...discovered, match.formula]);
              playBeep();
              checkMoleculeChallenges();

            } else {

              upd('craftResult', { success: false });

            }

          };

          const catColors = { nonmetal: 'bg-blue-100 text-blue-700 border-blue-200', noble: 'bg-purple-100 text-purple-700 border-purple-200', alkali: 'bg-red-100 text-red-700 border-red-200', alkaline: 'bg-yellow-100 text-yellow-700 border-yellow-200', transition: 'bg-orange-100 text-orange-700 border-orange-200', metal: 'bg-slate-200 text-slate-700 border-slate-300', metalloid: 'bg-emerald-100 text-emerald-700 border-emerald-200', halogen: 'bg-teal-100 text-teal-700 border-teal-200', lanthanide: 'bg-violet-100 text-violet-700 border-violet-200', actinide: 'bg-pink-100 text-pink-700 border-pink-200' };

          // â”€â”€ Molecule Viewer presets â”€â”€

          const viewerPresets = [

            { name: 'H₂O (Water)', atoms: [{ el: 'O', x: 200, y: 120, color: '#ef4444' }, { el: 'H', x: 140, y: 190, color: '#60a5fa' }, { el: 'H', x: 260, y: 190, color: '#60a5fa' }], bonds: [[0, 1], [0, 2]], formula: 'H₂O' },

            { name: 'CO₂ (Carbon Dioxide)', atoms: [{ el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'O', x: 120, y: 150, color: '#ef4444' }, { el: 'O', x: 280, y: 150, color: '#ef4444' }], bonds: [[0, 1], [0, 2]], formula: 'CO₂' },

            { name: 'CH₄ (Methane)', atoms: [{ el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'H', x: 200, y: 80, color: '#60a5fa' }, { el: 'H', x: 270, y: 180, color: '#60a5fa' }, { el: 'H', x: 130, y: 180, color: '#60a5fa' }, { el: 'H', x: 200, y: 220, color: '#60a5fa' }], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]], formula: 'CH₄' },

            { name: 'NaCl (Table Salt)', atoms: [{ el: 'Na', x: 160, y: 150, color: '#a855f7' }, { el: 'Cl', x: 240, y: 150, color: '#22c55e' }], bonds: [[0, 1]], formula: 'NaCl' },

            { name: 'NH₃ (Ammonia)', atoms: [{ el: 'N', x: 200, y: 110, color: '#3b82f6' }, { el: 'H', x: 140, y: 185, color: 'var(--allo-stem-text-soft, #94a3b8)' }, { el: 'H', x: 200, y: 210, color: 'var(--allo-stem-text-soft, #94a3b8)' }, { el: 'H', x: 260, y: 185, color: 'var(--allo-stem-text-soft, #94a3b8)' }], bonds: [[0, 1], [0, 2], [0, 3]], formula: 'NH₃' },

            { name: 'O₂ (Oxygen Gas)', atoms: [{ el: 'O', x: 160, y: 150, color: '#ef4444' }, { el: 'O', x: 240, y: 150, color: '#ef4444' }], bonds: [[0, 1]], formula: 'O₂' },

            { name: 'N₂ (Nitrogen Gas)', atoms: [{ el: 'N', x: 155, y: 150, color: '#3b82f6' }, { el: 'N', x: 245, y: 150, color: '#3b82f6' }], bonds: [[0, 1]], formula: 'N₂' },

            { name: 'H₂O₂ (Hydrogen Peroxide)', atoms: [{ el: 'O', x: 160, y: 130, color: '#ef4444' }, { el: 'O', x: 240, y: 130, color: '#ef4444' }, { el: 'H', x: 110, y: 190, color: '#60a5fa' }, { el: 'H', x: 290, y: 190, color: '#60a5fa' }], bonds: [[0, 1], [0, 2], [1, 3]], formula: 'H₂O₂' },

            { name: 'HCl (Hydrochloric Acid)', atoms: [{ el: 'H', x: 160, y: 150, color: '#60a5fa' }, { el: 'Cl', x: 240, y: 150, color: '#22c55e' }], bonds: [[0, 1]], formula: 'HCl' },

            { name: 'H₂SO₄ (Sulfuric Acid)', atoms: [{ el: 'S', x: 200, y: 140, color: '#facc15' }, { el: 'O', x: 130, y: 100, color: '#ef4444' }, { el: 'O', x: 270, y: 100, color: '#ef4444' }, { el: 'O', x: 130, y: 190, color: '#ef4444' }, { el: 'O', x: 270, y: 190, color: '#ef4444' }, { el: 'H', x: 80, y: 210, color: '#60a5fa' }, { el: 'H', x: 320, y: 210, color: '#60a5fa' }], bonds: [[0,1],[0,2],[0,3],[0,4],[3,5],[4,6]], formula: 'H₂SO₄' },

            { name: 'C₂H₅OH (Ethanol)', atoms: [{ el: 'C', x: 150, y: 140, color: '#1e293b' }, { el: 'C', x: 230, y: 140, color: '#1e293b' }, { el: 'O', x: 300, y: 140, color: '#ef4444' }, { el: 'H', x: 320, y: 200, color: '#60a5fa' }, { el: 'H', x: 110, y: 90, color: '#60a5fa' }, { el: 'H', x: 110, y: 190, color: '#60a5fa' }, { el: 'H', x: 190, y: 90, color: '#60a5fa' }], bonds: [[0,1],[1,2],[2,3],[0,4],[0,5],[0,6]], formula: 'C₂H₅OH' },

            { name: 'CaCO₃ (Calcium Carbonate)', atoms: [{ el: 'Ca', x: 100, y: 150, color: '#fbbf24' }, { el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'O', x: 200, y: 80, color: '#ef4444' }, { el: 'O', x: 270, y: 190, color: '#ef4444' }, { el: 'O', x: 130, y: 190, color: '#ef4444' }], bonds: [[0,4],[1,2],[1,3],[1,4]], formula: 'CaCO₃' },

            { name: 'C₆H₁₂O₆ (Glucose)', atoms: [{ el: 'C', x: 120, y: 110, color: '#1e293b' }, { el: 'C', x: 180, y: 110, color: '#1e293b' }, { el: 'C', x: 240, y: 110, color: '#1e293b' }, { el: 'O', x: 120, y: 180, color: '#ef4444' }, { el: 'O', x: 180, y: 180, color: '#ef4444' }, { el: 'O', x: 240, y: 180, color: '#ef4444' }, { el: 'H', x: 300, y: 110, color: '#60a5fa' }], bonds: [[0,1],[1,2],[0,3],[1,4],[2,5],[2,6]], formula: 'C₆H₁₂O₆' },

            { name: 'NaOH (Sodium Hydroxide)', atoms: [{ el: 'Na', x: 130, y: 150, color: '#a855f7' }, { el: 'O', x: 210, y: 150, color: '#ef4444' }, { el: 'H', x: 280, y: 150, color: '#60a5fa' }], bonds: [[0,1],[1,2]], formula: 'NaOH' },

            { name: 'Fe₂O₃ (Iron Oxide)', atoms: [{ el: 'Fe', x: 140, y: 120, color: '#fb923c' }, { el: 'Fe', x: 260, y: 120, color: '#fb923c' }, { el: 'O', x: 120, y: 200, color: '#ef4444' }, { el: 'O', x: 200, y: 200, color: '#ef4444' }, { el: 'O', x: 280, y: 200, color: '#ef4444' }], bonds: [[0,2],[0,3],[1,3],[1,4]], formula: 'Fe₂O₃' },

            { name: 'O₃ (Ozone)', atoms: [{ el: 'O', x: 130, y: 150, color: '#ef4444' }, { el: 'O', x: 200, y: 110, color: '#ef4444' }, { el: 'O', x: 270, y: 150, color: '#ef4444' }], bonds: [[0,1],[1,2]], formula: 'O₃' },

            { name: 'CO (Carbon Monoxide)', atoms: [{ el: 'C', x: 160, y: 150, color: '#1e293b' }, { el: 'O', x: 240, y: 150, color: '#ef4444' }], bonds: [[0,1]], formula: 'CO' },

            { name: 'NO₂ (Nitrogen Dioxide)', atoms: [{ el: 'N', x: 200, y: 110, color: '#3b82f6' }, { el: 'O', x: 140, y: 180, color: '#ef4444' }, { el: 'O', x: 260, y: 180, color: '#ef4444' }], bonds: [[0,1],[0,2]], formula: 'NO₂' },

            { name: 'SO₂ (Sulfur Dioxide)', atoms: [{ el: 'S', x: 200, y: 120, color: '#facc15' }, { el: 'O', x: 130, y: 180, color: '#ef4444' }, { el: 'O', x: 270, y: 180, color: '#ef4444' }], bonds: [[0,1],[0,2]], formula: 'SO₂' },

            { name: 'N₂O (Nitrous Oxide)', atoms: [{ el: 'N', x: 140, y: 150, color: '#3b82f6' }, { el: 'N', x: 200, y: 150, color: '#3b82f6' }, { el: 'O', x: 260, y: 150, color: '#ef4444' }], bonds: [[0,1],[1,2]], formula: 'N₂O' },

            { name: 'CH₃OH (Methanol)', atoms: [{ el: 'C', x: 160, y: 140, color: '#1e293b' }, { el: 'O', x: 240, y: 140, color: '#ef4444' }, { el: 'H', x: 300, y: 140, color: '#60a5fa' }, { el: 'H', x: 120, y: 90, color: '#60a5fa' }, { el: 'H', x: 120, y: 190, color: '#60a5fa' }, { el: 'H', x: 190, y: 80, color: '#60a5fa' }], bonds: [[0,1],[1,2],[0,3],[0,4],[0,5]], formula: 'CH₃OH' },

            { name: 'HNO₃ (Nitric Acid)', atoms: [{ el: 'N', x: 200, y: 130, color: '#3b82f6' }, { el: 'O', x: 140, y: 80, color: '#ef4444' }, { el: 'O', x: 270, y: 100, color: '#ef4444' }, { el: 'O', x: 200, y: 200, color: '#ef4444' }, { el: 'H', x: 260, y: 200, color: '#60a5fa' }], bonds: [[0,1],[0,2],[0,3],[3,4]], formula: 'HNO₃' },

            { name: 'H₃PO₄ (Phosphoric Acid)', atoms: [{ el: 'P', x: 200, y: 140, color: '#f97316' }, { el: 'O', x: 140, y: 80, color: '#ef4444' }, { el: 'O', x: 270, y: 90, color: '#ef4444' }, { el: 'O', x: 270, y: 195, color: '#ef4444' }, { el: 'O', x: 130, y: 195, color: '#ef4444' }, { el: 'H', x: 310, y: 60, color: '#60a5fa' }, { el: 'H', x: 320, y: 210, color: '#60a5fa' }, { el: 'H', x: 80, y: 210, color: '#60a5fa' }], bonds: [[0,1],[0,2],[0,3],[0,4],[2,5],[3,6],[4,7]], formula: 'H₃PO₄' },

            { name: 'C₃H₈ (Propane)', atoms: [{ el: 'C', x: 130, y: 140, color: '#1e293b' }, { el: 'C', x: 200, y: 140, color: '#1e293b' }, { el: 'C', x: 270, y: 140, color: '#1e293b' }, { el: 'H', x: 100, y: 90, color: '#60a5fa' }, { el: 'H', x: 100, y: 190, color: '#60a5fa' }, { el: 'H', x: 130, y: 210, color: '#60a5fa' }, { el: 'H', x: 200, y: 90, color: '#60a5fa' }, { el: 'H', x: 200, y: 190, color: '#60a5fa' }, { el: 'H', x: 300, y: 90, color: '#60a5fa' }, { el: 'H', x: 300, y: 190, color: '#60a5fa' }, { el: 'H', x: 270, y: 210, color: '#60a5fa' }], bonds: [[0,1],[1,2],[0,3],[0,4],[0,5],[1,6],[1,7],[2,8],[2,9],[2,10]], formula: 'C₃H₈' },

            { name: 'C₄H₁₀ (Butane)', atoms: [{ el: 'C', x: 100, y: 140, color: '#1e293b' }, { el: 'C', x: 170, y: 140, color: '#1e293b' }, { el: 'C', x: 240, y: 140, color: '#1e293b' }, { el: 'C', x: 310, y: 140, color: '#1e293b' }, { el: 'H', x: 70, y: 100, color: '#60a5fa' }, { el: 'H', x: 70, y: 180, color: '#60a5fa' }, { el: 'H', x: 100, y: 210, color: '#60a5fa' }, { el: 'H', x: 170, y: 100, color: '#60a5fa' }, { el: 'H', x: 170, y: 195, color: '#60a5fa' }, { el: 'H', x: 240, y: 100, color: '#60a5fa' }, { el: 'H', x: 240, y: 195, color: '#60a5fa' }, { el: 'H', x: 340, y: 100, color: '#60a5fa' }, { el: 'H', x: 340, y: 180, color: '#60a5fa' }, { el: 'H', x: 310, y: 210, color: '#60a5fa' }], bonds: [[0,1],[1,2],[2,3],[0,4],[0,5],[0,6],[1,7],[1,8],[2,9],[2,10],[3,11],[3,12],[3,13]], formula: 'C₄H₁₀' },

            { name: 'SiO₂ (Silicon Dioxide)', atoms: [{ el: 'Si', x: 200, y: 150, color: '#34d399' }, { el: 'O', x: 130, y: 150, color: '#ef4444' }, { el: 'O', x: 270, y: 150, color: '#ef4444' }], bonds: [[0,1],[0,2]], formula: 'SiO₂' },

            { name: 'KCl (Potassium Chloride)', atoms: [{ el: 'K', x: 160, y: 150, color: '#f87171' }, { el: 'Cl', x: 240, y: 150, color: '#22c55e' }], bonds: [[0,1]], formula: 'KCl' },

            { name: 'MgO (Magnesium Oxide)', atoms: [{ el: 'Mg', x: 160, y: 150, color: '#fbbf24' }, { el: 'O', x: 240, y: 150, color: '#ef4444' }], bonds: [[0,1]], formula: 'MgO' },

            { name: 'NaHCO₃ (Baking Soda)', atoms: [{ el: 'Na', x: 80, y: 150, color: '#a855f7' }, { el: 'O', x: 150, y: 150, color: '#ef4444' }, { el: 'C', x: 220, y: 150, color: '#1e293b' }, { el: 'O', x: 220, y: 80, color: '#ef4444' }, { el: 'O', x: 290, y: 150, color: '#ef4444' }, { el: 'H', x: 340, y: 150, color: '#60a5fa' }], bonds: [[0,1],[1,2],[2,3],[2,4],[4,5]], formula: 'NaHCO₃' },

            { name: 'CH₃COOH (Acetic Acid)', atoms: [{ el: 'C', x: 140, y: 140, color: '#1e293b' }, { el: 'C', x: 220, y: 140, color: '#1e293b' }, { el: 'O', x: 220, y: 70, color: '#ef4444' }, { el: 'O', x: 290, y: 160, color: '#ef4444' }, { el: 'H', x: 340, y: 160, color: '#60a5fa' }, { el: 'H', x: 100, y: 95, color: '#60a5fa' }, { el: 'H', x: 100, y: 185, color: '#60a5fa' }, { el: 'H', x: 140, y: 210, color: '#60a5fa' }], bonds: [[0,1],[1,2],[1,3],[3,4],[0,5],[0,6],[0,7]], formula: 'CH₃COOH' },

            { name: 'KNO₃ (Potassium Nitrate)', atoms: [{ el: 'K', x: 100, y: 150, color: '#f87171' }, { el: 'N', x: 200, y: 130, color: '#3b82f6' }, { el: 'O', x: 160, y: 190, color: '#ef4444' }, { el: 'O', x: 240, y: 190, color: '#ef4444' }, { el: 'O', x: 200, y: 70, color: '#ef4444' }], bonds: [[0,2],[1,2],[1,3],[1,4]], formula: 'KNO₃' },

            { name: 'CuSO₄ (Copper Sulfate)', atoms: [{ el: 'Cu', x: 100, y: 150, color: '#fb923c' }, { el: 'S', x: 200, y: 140, color: '#facc15' }, { el: 'O', x: 160, y: 80, color: '#ef4444' }, { el: 'O', x: 260, y: 90, color: '#ef4444' }, { el: 'O', x: 260, y: 200, color: '#ef4444' }, { el: 'O', x: 140, y: 200, color: '#ef4444' }], bonds: [[0,5],[1,2],[1,3],[1,4],[1,5]], formula: 'CuSO₄' },

          ];



            

return React.createElement("div", { className: "max-w-4xl mx-auto animate-in fade-in duration-200" + (isDark ? " dark-mode" : "") },
            React.createElement("div", { "aria-live": "polite", "aria-atomic": "true", style: { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" } }, d._srMsg || ""),

            // Header

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-200" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83D\uDD2C Molecule Lab"),

              discovered.length > 0 && React.createElement("span", { className: "ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full" }, "\uD83E\uDDEA " + discovered.length + "/" + COMPOUNDS.length + " discovered"),

              totalRP > 0 && React.createElement("span", { className: "ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full" }, "⭐ " + totalRP + " RP")

            ),

            // Mode tabs

            React.createElement("div", { className: "flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl" },

              [['viewer', '\uD83D\uDD2C Viewer'], ['creator', '\u2697\uFE0F Compound Creator'], ['build', '\uD83E\uDDF1 Build'], ['table', '\uD83D\uDDC2\uFE0F Periodic Table'], ['reactions', '⚗️ Reactions']].map(([m, label]) =>

                React.createElement("button", { "aria-label": "Switch to " + label + " mode", key: m, onClick: () => { upd('moleculeMode', m); if (typeof canvasNarrate === 'function') { canvasNarrate('molecule', 'mode_switch', { first: 'Switched to ' + label + ' mode.', repeat: label + ' mode.', terse: label + '.' }, { debounce: 500 }); } }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (mode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-700') }, label)

              )

            ),

            // ── Topic-accent hero band per mode ──
            (function() {
              var MODE_META = {
                viewer:    { accent: '#0f766e', soft: 'rgba(15,118,110,0.10)', icon: '\uD83D\uDD2C', title: 'Viewer - ball-and-stick + space-filling',         hint: 'Each atom\u2019s color follows CPK (carbon black, oxygen red, nitrogen blue, hydrogen white). Bond lengths are not arbitrary - covalent radii from quantum chemistry tables, ~70-150 picometers.' },
                creator:   { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '\u2697',         title: 'Compound Creator - valence + bonding rules',     hint: 'Octet rule: most atoms want 8 valence electrons. C bonds 4 ways, N 3, O 2, H 1. Lewis dot structures (1916) still drive 90% of intro chemistry intuition.' },
                build:     { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\uD83E\uDDF1', title: 'Build - drag atoms, draw bonds',                  hint: 'Single, double, triple bonds = 1, 2, 3 shared electron pairs. Triple bonds are shorter and stronger (N\u2261N at 110pm vs N-N at 145pm). Geometry follows VSEPR: pairs repel.' },
                table:     { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: '\uD83D\uDDC2', title: 'Periodic Table - Mendeleev\u2019s 1869 grid',     hint: 'Periods (rows) = electron shells; groups (columns) = valence electrons. Mendeleev predicted gallium and germanium\u2019s properties before discovery - the table predicted reality.' },
                reactions: { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\u2697',         title: 'Reactions - reactants \u2192 products + ΔH',      hint: 'Conservation of mass (Lavoisier 1789): atoms in = atoms out. Balance the equation, predict the product, classify (synthesis / decomposition / single-replace / double-replace / combustion).' }
              };
              var meta = MODE_META[mode] || MODE_META.viewer;
              return React.createElement('div', {
                style: {
                  margin: '0 0 12px',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
                  border: '1px solid ' + meta.accent + '55',
                  borderLeft: '4px solid ' + meta.accent,
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
                }
              },
                React.createElement('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
                React.createElement('div', { style: { flex: 1, minWidth: 220 } },
                  React.createElement('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                  React.createElement('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
                )
              );
            })(),

            // â”€â”€ Viewer Mode â”€â”€

            mode === 'viewer' && React.createElement("div", null,

              React.createElement("div", { className: "flex gap-1 mb-3 flex-wrap" }, viewerPresets.map(p => React.createElement("button", { "aria-label": "View molecule: " + p.name, key: p.name, onClick: () => { upd('atoms', p.atoms.map(a => ({ ...a }))); upd('bonds', [...p.bonds]); upd('formula', p.formula); }, className: "px-2 py-1 rounded-lg text-xs font-bold " + (d.formula === p.formula ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200') }, p.name))),

              threeLoaded
                ? React.createElement("div", { className: "relative w-full rounded-xl overflow-hidden border border-stone-200", style: { height: "300px" } },
                    React.createElement("canvas", {
                      ref: webglCanvasRef,
                      className: "w-full h-full bg-gradient-to-b from-slate-900 to-slate-950",
                      style: { display: 'block', outline: 'none' }
                    }),
                    React.createElement("button", {
                      onClick: function() {
                        if (threeControlsRef.current) {
                          threeControlsRef.current.reset();
                        }
                      },
                      className: "absolute bottom-3 right-3 px-2 py-1 bg-white/80 hover:bg-white text-stone-700 rounded-md text-[10px] font-bold shadow border backdrop-blur-sm transition-colors",
                      'aria-label': 'Reset View'
                    }, '🔄 Reset Camera')
                  )
                : React.createElement("svg", { viewBox: "0 0 " + W + " " + H, className: "w-full bg-gradient-to-b from-slate-50 to-white rounded-xl border border-stone-200", style: { maxHeight: "300px" }, onMouseMove: e => { if (d.dragging !== null && d.dragging !== undefined) { const svg = e.currentTarget; const rect = svg.getBoundingClientRect(); const nx = (e.clientX - rect.left) / rect.width * W; const ny = (e.clientY - rect.top) / rect.height * H; const na = d.atoms.map((a, i) => i === d.dragging ? { ...a, x: Math.round(nx), y: Math.round(ny) } : a); upd("atoms", na); } }, onMouseUp: () => upd("dragging", null), onMouseLeave: () => upd("dragging", null) },
                    (d.bonds || []).map((b, i) => d.atoms[b[0]] && d.atoms[b[1]] ? React.createElement("line", { key: 'b' + i, x1: d.atoms[b[0]].x, y1: d.atoms[b[0]].y, x2: d.atoms[b[1]].x, y2: d.atoms[b[1]].y, stroke: "#94a3b8", strokeWidth: 4, strokeLinecap: "round" }) : null),
                    (d.atoms || []).map((a, i) => React.createElement("g", { key: i },
                      React.createElement("circle", { cx: a.x, cy: a.y, r: 24, fill: a.color || '#94a3b8', stroke: '#fff', strokeWidth: 3, style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))', cursor: 'grab' }, onMouseDown: e => { e.preventDefault(); upd('dragging', i); } }),
                      React.createElement("text", { x: a.x, y: a.y + 5, textAnchor: "middle", fill: "white", style: { fontSize: '14px', fontWeight: 'bold' } }, a.el)
                    ))
                  ),

              React.createElement("div", { className: "mt-2 text-center" },

                React.createElement("span", { className: "text-sm font-bold text-slate-600" }, "Formula: "),

                React.createElement("span", { className: "text-lg font-bold text-slate-800" }, d.formula || '-'),

              d.formula && d.atoms && React.createElement("span", { className: "ml-2 text-xs text-slate-600" },
                calcMolarMass((() => { const c = {}; (d.atoms || []).forEach(a => { c[a.el] = (c[a.el] || 0) + 1; }); return c; })()) + " g/mol"
              )
              )

            ),

            // â”€â”€ Compound Creator Mode â”€â”€

            mode === 'creator' && React.createElement("div", null,

              React.createElement("p", { className: "text-xs text-slate-600 mb-3" }, "Select elements to craft compounds - discover real-world chemistry by combining atoms!"),

              // Element selector grid (common elements)

              React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-4" },

                ['H', 'C', 'N', 'O', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'K', 'Ca', 'Fe', 'Cu', 'Zn', 'Br', 'Ag', 'I', 'Au'].map(sym => {

                  const el = getEl(sym);

                  return React.createElement("button", { "aria-label": "Add Element", key: sym, onClick: () => addElement(sym), className: "w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold text-xs border-2 transition-all hover:scale-110 hover:shadow-md active:scale-95 " + (catColors[el?.cat] || 'bg-slate-100 text-slate-600 border-slate-200'), title: el?.name || sym },

                    React.createElement("span", { className: "text-sm font-black" }, sym),

                    React.createElement("span", { className: "text-[11px] opacity-70" }, el?.n || '')

                  );

                })

              ),

              // Selected elements display

              React.createElement("div", { className: "bg-white rounded-xl border-2 border-dashed border-slate-300 p-4 mb-4 min-h-[80px] flex items-center justify-center gap-2 flex-wrap" },

                Object.keys(selectedEls).length === 0

                  ? React.createElement("p", { className: "text-slate-600 text-sm italic" }, "Tap elements above to add them...")

                  : Object.entries(selectedEls).map(([sym, count]) => {

                    const el = getEl(sym);

                    return React.createElement("div", { key: sym, className: "flex items-center gap-1 bg-slate-50 rounded-lg px-2 py-1 border" },

                      React.createElement("span", { className: "w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-sm", style: { backgroundColor: el?.c || '#94a3b8' } }, sym),

                      React.createElement("span", { className: "text-lg font-black text-slate-700" }, "\u00D7" + count),

                      React.createElement("button", { "aria-label": "Remove Element", onClick: () => removeElement(sym), className: "ml-1 w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs font-bold hover:bg-red-200 flex items-center justify-center" }, "\u2212")

                    );

                  })

              ),

              // Action buttons

              React.createElement("div", { className: "flex gap-2 mb-4" },

                React.createElement("button", { onClick: tryCraft, disabled: Object.keys(selectedEls).length === 0, className: "flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed" }, "\u2697\uFE0F Combine!"),

                React.createElement("button", { "aria-label": "Clear", onClick: clearElements, className: "px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors" }, "\uD83D\uDD04 Clear")

              ),

              // Craft result

              d.craftResult && (d.craftResult.success

                ? React.createElement("div", { className: "bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 text-center animate-in zoom-in" },

                  React.createElement("p", { className: "text-3xl mb-1" }, d.craftResult.compound.emoji),

                  React.createElement("p", { className: "text-lg font-black text-emerald-700" }, (d.craftResult.isNew ? '\uD83C\uDF89 NEW! ' : '\u2705 ') + d.craftResult.compound.name),

                  React.createElement("p", { className: "text-sm font-bold text-emerald-600" }, d.craftResult.compound.formula),

                  React.createElement("p", { className: "text-xs text-emerald-500 mt-1" }, d.craftResult.compound.desc),

                )

                : React.createElement("div", { className: "bg-amber-50 border-2 border-amber-200 rounded-xl p-3 text-center" },

                  React.createElement("p", { className: "text-sm font-bold text-amber-700" }, "\uD83E\uDD14 No known compound matches this combination. Try different elements!"))

              ),

              // Discovery log

              discovered.length > 0 && React.createElement("div", { className: "mt-4 bg-slate-50 rounded-xl p-3 border" },

                React.createElement("p", { className: "text-xs font-bold text-slate-600 mb-2" }, "\uD83D\uDCDA Discovery Log (" + discovered.length + "/" + COMPOUNDS.length + ")"),

                React.createElement("div", { className: "flex flex-wrap gap-1" },

                  COMPOUNDS.map(c => React.createElement("span", { key: c.formula, className: "px-2 py-0.5 rounded text-xs font-bold " + (discovered.includes(c.formula) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-200') }, discovered.includes(c.formula) ? c.emoji + ' ' + c.name : '\uD83D\uDD12 ???'))

                )

              )

            ),

            // â”€â”€ Build Mode â”€â”€

            mode === 'build' && React.createElement("div", null,

              React.createElement("p", { className: "text-xs text-slate-600 mb-2" }, "Drag atoms onto the canvas and draw bonds to build molecules! Click two atoms to connect them."),

              // Atom palette

              React.createElement("div", { className: "flex gap-1 mb-3 flex-wrap" },

                [

                  { sym: 'H', color: '#60a5fa', label: 'Hydrogen' },

                  { sym: 'C', color: '#1e293b', label: 'Carbon' },

                  { sym: 'N', color: '#3b82f6', label: 'Nitrogen' },

                  { sym: 'O', color: '#ef4444', label: 'Oxygen' },

                  { sym: 'S', color: '#facc15', label: 'Sulfur' },

                  { sym: 'P', color: '#f97316', label: 'Phosphorus' },

                  { sym: 'Cl', color: '#22c55e', label: 'Chlorine' },

                  { sym: 'Na', color: '#a855f7', label: 'Sodium' },

                  { sym: 'Ca', color: '#fbbf24', label: 'Calcium' },

                  { sym: 'Fe', color: '#fb923c', label: 'Iron' },

                  { sym: 'K', color: '#f87171', label: 'Potassium' },

                  { sym: 'Si', color: '#34d399', label: 'Silicon' },

                ].map(a => React.createElement("button", { "aria-label": "Add " + a.label + " atom to canvas",

                  key: a.sym,

                  onClick: () => {

                    const ba = d.buildAtoms || [];

                    // Place new atom at a random position in the canvas

                    const nx = 80 + Math.random() * (W - 160);

                    const ny = 60 + Math.random() * (H - 120);

                    upd('buildAtoms', [...ba, { el: a.sym, x: Math.round(nx), y: Math.round(ny), color: a.color }]);

                    upd('buildCheckResult', null);

                  },

                  className: "px-2 py-1.5 rounded-lg text-xs font-bold border-2 transition-all hover:scale-105 hover:shadow-md active:scale-95",

                  style: { borderColor: a.color, color: a.color, backgroundColor: a.color + '18' },

                  title: 'Add ' + a.label

                }, a.sym))

              ),

              // Canvas workspace

              React.createElement("svg", {

                viewBox: "0 0 " + W + " " + H,

                className: "w-full bg-gradient-to-b from-slate-50 to-white rounded-xl border-2 border-dashed border-slate-300 cursor-crosshair",

                style: { maxHeight: "320px", touchAction: 'none' },

                onMouseMove: e => {

                  if (d.buildDragging !== null && d.buildDragging !== undefined) {

                    const svg = e.currentTarget;

                    const rect = svg.getBoundingClientRect();

                    const nx = (e.clientX - rect.left) / rect.width * W;

                    const ny = (e.clientY - rect.top) / rect.height * H;

                    const na = (d.buildAtoms || []).map((a, i) => i === d.buildDragging ? { ...a, x: Math.max(20, Math.min(W - 20, Math.round(nx))), y: Math.max(20, Math.min(H - 20, Math.round(ny))) } : a);

                    upd('buildAtoms', na);

                  }

                },

                onMouseUp: () => upd('buildDragging', null),

                onMouseLeave: () => upd('buildDragging', null)

              },

                // Grid dots for visual guide

                Array.from({ length: 10 }, (_, r) => Array.from({ length: 13 }, (_, c) => React.createElement("circle", { key: 'g' + r + '-' + c, cx: 30 + c * 28, cy: 25 + r * 28, r: 1, fill: '#e2e8f0' }))).flat(),

                // Draw bonds

                (d.buildBonds || []).map((b, i) => {

                  const atoms = d.buildAtoms || [];

                  const a1 = atoms[b[0]], a2 = atoms[b[1]];

                  if (!a1 || !a2) return null;

                  const bondType = b[2] || 1; // 1=single, 2=double, 3=triple

                  const dx = a2.x - a1.x, dy = a2.y - a1.y;

                  const len = Math.sqrt(dx * dx + dy * dy) || 1;

                  const px = -dy / len, py = dx / len; // perpendicular

                  const bondLines = [];

                  if (bondType === 1) {

                    bondLines.push(React.createElement("line", { key: 'bl' + i, x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y, stroke: "#64748b", strokeWidth: 3.5, strokeLinecap: "round" }));

                  } else if (bondType === 2) {

                    const off = 3;

                    bondLines.push(React.createElement("line", { key: 'bl' + i + 'a', x1: a1.x + px * off, y1: a1.y + py * off, x2: a2.x + px * off, y2: a2.y + py * off, stroke: "#64748b", strokeWidth: 2.5, strokeLinecap: "round" }));

                    bondLines.push(React.createElement("line", { key: 'bl' + i + 'b', x1: a1.x - px * off, y1: a1.y - py * off, x2: a2.x - px * off, y2: a2.y - py * off, stroke: "#64748b", strokeWidth: 2.5, strokeLinecap: "round" }));

                  } else {

                    bondLines.push(React.createElement("line", { key: 'bl' + i + 'a', x1: a1.x + px * 5, y1: a1.y + py * 5, x2: a2.x + px * 5, y2: a2.y + py * 5, stroke: "#64748b", strokeWidth: 2, strokeLinecap: "round" }));

                    bondLines.push(React.createElement("line", { key: 'bl' + i + 'b', x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y, stroke: "#64748b", strokeWidth: 2, strokeLinecap: "round" }));

                    bondLines.push(React.createElement("line", { key: 'bl' + i + 'c', x1: a1.x - px * 5, y1: a1.y - py * 5, x2: a2.x - px * 5, y2: a2.y - py * 5, stroke: "#64748b", strokeWidth: 2, strokeLinecap: "round" }));

                  }

                  // Clickable hit area to cycle bond type

                  bondLines.push(React.createElement("line", {

                    key: 'bh' + i, x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y,

                    stroke: "transparent", strokeWidth: 12, style: { cursor: 'pointer' },

                    onClick: (e) => {

                      e.stopPropagation();

                      const nb = (d.buildBonds || []).map((bb, bi) => bi === i ? [bb[0], bb[1], ((bb[2] || 1) % 3) + 1] : bb);

                      upd('buildBonds', nb);

                      upd('buildCheckResult', null);

                    }

                  }));

                  return React.createElement("g", { key: 'bg' + i }, ...bondLines);

                }),

                // Draw atoms

                (d.buildAtoms || []).map((a, i) => {

                  const isSelected = d.buildBondFrom === i;

                  return React.createElement("g", { key: 'ba' + i },

                    // Selection ring

                    isSelected && React.createElement("circle", { cx: a.x, cy: a.y, r: 28, fill: "none", stroke: "#3b82f6", strokeWidth: 2, strokeDasharray: "4 2", className: "animate-spin" }),

                    // Atom circle

                    React.createElement("circle", {

                      cx: a.x, cy: a.y, r: 22, fill: a.color || '#94a3b8', stroke: isSelected ? '#3b82f6' : '#fff', strokeWidth: isSelected ? 3 : 2.5,

                      style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))', cursor: 'grab' },

                      onMouseDown: e => {

                        e.preventDefault();

                        e.stopPropagation();

                        // If in bond-drawing mode (either buildBondMode or selected from bottom)

                        if (d.buildBondMode || (d.buildBondFrom !== null && d.buildBondFrom !== undefined)) {
                          if (d.buildBondFrom === null || d.buildBondFrom === undefined) {
                            upd('buildBondFrom', i);
                          } else if (d.buildBondFrom === i) {
                            upd('buildBondFrom', null);
                          } else {
                            // Create bond
                            const existingBonds = d.buildBonds || [];
                            const already = existingBonds.find(b => (b[0] === d.buildBondFrom && b[1] === i) || (b[0] === i && b[1] === d.buildBondFrom));
                            if (!already) {
                              upd('buildBonds', [...existingBonds, [d.buildBondFrom, i, 1]]);
                              if (typeof announceToSR === 'function') announceToSR("Connected atom " + d.buildAtoms[d.buildBondFrom].el + " to " + a.el);
                            }
                            upd('buildBondFrom', null);
                            upd('buildCheckResult', null);
                          }
                        } else {
                          upd('buildDragging', i);
                        }

                      }

                    }),

                    // Atom label

                    React.createElement("text", { x: a.x, y: a.y + 5, textAnchor: "middle", fill: "white", style: { fontSize: '13px', fontWeight: 'bold', pointerEvents: 'none' } }, a.el),

                    // Delete button (small x in corner)

                    React.createElement("g", {

                      onClick: e => {

                        e.stopPropagation();

                        const newAtoms = (d.buildAtoms || []).filter((_, ai) => ai !== i);

                        const newBonds = (d.buildBonds || []).filter(b => b[0] !== i && b[1] !== i).map(b => [b[0] > i ? b[0] - 1 : b[0], b[1] > i ? b[1] - 1 : b[1], b[2] || 1]);

                        upd('buildAtoms', newAtoms);

                        upd('buildBonds', newBonds);

                        if (d.buildBondFrom === i) upd('buildBondFrom', null);

                        upd('buildCheckResult', null);

                      },

                      style: { cursor: 'pointer' }

                    },

                      React.createElement("circle", { cx: a.x + 16, cy: a.y - 16, r: 7, fill: '#ef4444', stroke: '#fff', strokeWidth: 1.5 }),

                      React.createElement("text", { x: a.x + 16, y: a.y - 12.5, textAnchor: "middle", fill: "white", style: { fontSize: '11px', fontWeight: 'bold', pointerEvents: 'none' } }, "\u2715")

                    )

                  );

                }),

                // "Drawing bond from..." indicator line

                d.buildBondFrom !== null && d.buildBondFrom !== undefined && (d.buildAtoms || [])[d.buildBondFrom] && React.createElement("text", { x: W / 2, y: H - 10, textAnchor: "middle", fill: "#3b82f6", style: { fontSize: '10px', fontWeight: 'bold' } }, "\u{1F517} Click another atom to connect...")

              ),

              // Controls bar

              React.createElement("div", { className: "flex items-center gap-2 mt-3 flex-wrap" },

                // Bond draw button

                React.createElement("button", { "aria-label": (d.buildBondFrom !== null && d.buildBondFrom !== undefined ? "Cancel bond drawing" : "Enter bond drawing mode"),

                  onClick: () => {

                    if (d.buildBondFrom !== null && d.buildBondFrom !== undefined) {

                      upd('buildBondFrom', null);

                    } else {

                      // Enter bond mode â€” user must click first atom

                      upd('buildBondFrom', null);

                      addToast('\u{1F517} Click an atom to start a bond, then click another to connect.', 'info');

                    }

                  },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all " + (d.buildBondFrom !== null && d.buildBondFrom !== undefined ? 'bg-blue-100 text-blue-700 border-blue-600' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200')

                }, "\u{1F517} " + (d.buildBondFrom !== null && d.buildBondFrom !== undefined ? 'Cancel Bond' : 'Draw Bond')),

                // Bond-from selector â€” click an atom first

                (d.buildAtoms || []).length >= 2 && d.buildBondFrom === null && React.createElement("div", { className: "flex gap-1" },

                  (d.buildAtoms || []).map((a, i) => React.createElement("button", { "aria-label": "Start bond from atom " + a.el,

                    key: 'bf' + i,

                    onClick: () => { upd('buildBondFrom', i); },

                    className: "w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold border-2 border-white hover:scale-110 transition-transform shadow-sm",

                    style: { backgroundColor: a.color },

                    title: 'Start bond from ' + a.el

                  }, a.el))

                ),

                // Clear all

                React.createElement("button", { "aria-label": "Clear All",

                  onClick: () => { upd('buildAtoms', []); upd('buildBonds', []); upd('buildBondFrom', null); upd('buildCheckResult', null); },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-600 hover:bg-red-100 transition-all ml-auto"

                }, "\uD83D\uDDD1\uFE0F Clear All")

              ),

              // Running formula display

              (d.buildAtoms || []).length > 0 && (() => {

                const counts = {};

                (d.buildAtoms || []).forEach(a => { counts[a.el] = (counts[a.el] || 0) + 1; });

                // Standard chemistry ordering: C, H, then alphabetical

                const order = ['C', 'H'];

                const remaining = Object.keys(counts).filter(k => !order.includes(k)).sort();

                const sorted = [...order.filter(k => counts[k]), ...remaining];

                const formulaStr = sorted.map(k => k + (counts[k] > 1 ? counts[k] : '')).join('');

                return React.createElement("div", { className: "mt-3 bg-slate-50 rounded-xl p-3 border border-slate-400 flex items-center justify-between" },

                  React.createElement("div", null,

                    React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider" }, "Formula: "),

                    React.createElement("span", { className: "text-lg font-black text-slate-800 font-mono" }, formulaStr)

                  ),

                  React.createElement("div", { className: "flex items-center gap-1 text-[11px] text-slate-600" },

                    React.createElement("span", null, (d.buildAtoms || []).length + " atoms"),

                    React.createElement("span", null, "•"),
                    React.createElement("span", null, calcMolarMass((() => { const c = {}; (d.buildAtoms || []).forEach(a => { c[a.el] = (c[a.el] || 0) + 1; }); return c; })()) + " g/mol"),

                    React.createElement("span", null, "\u2022"),

                    React.createElement("span", null, (d.buildBonds || []).length + " bonds")

                  )

                );

              })(),

              // Check molecule button + result

              (d.buildAtoms || []).length > 0 && React.createElement("div", { className: "mt-3 flex gap-2" },

                React.createElement("button", { "aria-label": "Check built molecule",

                  onClick: () => {

                    const counts = {};

                    (d.buildAtoms || []).forEach(a => { counts[a.el] = (counts[a.el] || 0) + 1; });

                    const match = COMPOUNDS.find(c => {

                      const rKeys = Object.keys(c.recipe); const bKeys = Object.keys(counts);

                      if (rKeys.length !== bKeys.length) return false;

                      return rKeys.every(k => counts[k] === c.recipe[k]);

                    });

                    if (match) {

                      upd('buildCheckResult', { success: true, compound: match });

                      addToast('\u2705 You built ' + match.name + '!', 'success');

                      if (typeof awardStemXP === 'function') awardStemXP('molecule', 15, 'Built ' + match.name);

                      // Add to discovered

                      const disc = d.discoveredCompounds || [];

                      if (!disc.includes(match.formula)) upd('discoveredCompounds', [...disc, match.formula]);
                      checkMoleculeChallenges();

                    } else {

                      upd('buildCheckResult', { success: false });

                      addToast('\u{1F914} No known compound matches this structure.', 'warning');

                    }

                  },

                  className: "flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-600 shadow-md transition-all"

                }, "\u{1F50D} Check Molecule"),

                React.createElement("button", { "aria-label": "Random Challenge",

                  onClick: () => {

                    // Random challenge: pick a compound and show target

                    const target = COMPOUNDS[Math.floor(Math.random() * COMPOUNDS.length)];

                    upd('buildTarget', target);

                    upd('buildAtoms', []); upd('buildBonds', []); upd('buildBondFrom', null); upd('buildCheckResult', null);

                    addToast('\u{1F3AF} Build: ' + target.name + ' (' + target.formula + ')', 'info');

                  },

                  className: "px-4 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-xl hover:from-amber-500 hover:to-orange-600 shadow-md transition-all"

                }, "\u{1F3AF} Random Challenge")

              ),

              // Target compound display

              d.buildTarget && React.createElement("div", { className: "mt-2 bg-amber-50 rounded-xl p-3 border border-amber-200 flex items-center gap-3" },

                React.createElement("span", { className: "text-2xl" }, d.buildTarget.emoji),

                React.createElement("div", null,

                  React.createElement("p", { className: "text-sm font-bold text-amber-800" }, "\u{1F3AF} Target: " + d.buildTarget.name),

                  React.createElement("p", { className: "text-xs text-amber-600" }, d.buildTarget.formula + " - " + d.buildTarget.desc),

                  React.createElement("p", { className: "text-[11px] text-amber-500 mt-0.5" }, "Recipe: " + Object.entries(d.buildTarget.recipe).map(([el, n]) => el + (n > 1 ? '\u00D7' + n : '')).join(' + '))

                )

              ),

              // Check result

              d.buildCheckResult && (d.buildCheckResult.success

                ? React.createElement("div", { className: "mt-2 bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 text-center animate-in zoom-in" },

                    React.createElement("p", { className: "text-3xl mb-1" }, d.buildCheckResult.compound.emoji),

                    React.createElement("p", { className: "text-lg font-black text-emerald-700" }, "\u{1F389} " + d.buildCheckResult.compound.name),

                    React.createElement("p", { className: "text-sm font-bold text-emerald-600" }, d.buildCheckResult.compound.formula + " - " + d.buildCheckResult.compound.desc),

                    React.createElement("p", { className: "text-xs text-emerald-500 mt-1" }, "+15 XP \u{1F31F}")

                  )

                : React.createElement("div", { className: "mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center" },

                    React.createElement("p", { className: "text-sm font-bold text-amber-700" }, "\u{1F914} No known compound matches. Keep experimenting!"),

                    React.createElement("p", { className: "text-[11px] text-amber-500 mt-1" }, "Tip: Click bonds to cycle between single, double, and triple bonds")

                  )

              ),

              // Build tips

              (d.buildAtoms || []).length === 0 && React.createElement("div", { className: "mt-4 bg-indigo-50 rounded-xl p-4 border border-indigo-200" },

                React.createElement("p", { className: "text-sm font-bold text-indigo-700 mb-2" }, "\u{1F4A1} How to Build"),

                React.createElement("div", { className: "grid grid-cols-1 gap-1.5 text-xs text-indigo-600" },

                  React.createElement("p", null, "\u2460 Click element buttons above to add atoms to the canvas"),

                  React.createElement("p", null, "\u2461 Drag atoms to arrange them"),

                  React.createElement("p", null, "\u2462 Click an atom in the bond selector, then click another atom to draw a bond"),

                  React.createElement("p", null, "\u2463 Click a bond to cycle: single \u2192 double \u2192 triple"),

                  React.createElement("p", null, "\u2464 Click \u{1F50D} Check to identify your molecule!"),

                  React.createElement("p", null, "\u{1F3AF} Try 'Random Challenge' for a guided build quest")

                )

              )

            ),

            // â”€â”€ Periodic Table Mode â”€â”€

            mode === 'table' && React.createElement("div", null,

              React.createElement("p", { className: "text-xs text-slate-600 mb-2" }, "Tap any element to learn about it. The full 118-element periodic table."),

              d.selectedElement && (() => {

                const detail = getElementDetail(d.selectedElement.s);

                const relatedCompounds = getElementCompounds(d.selectedElement.s);

                return React.createElement("div", { className: "mb-3 rounded-xl border-2 overflow-hidden " + (catColors[d.selectedElement.cat] || 'bg-slate-50 border-slate-200') },

                  React.createElement("div", { className: "p-3 flex items-center gap-3" },

                    React.createElement("div", { className: "w-14 h-14 rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-md flex-shrink-0", style: { backgroundColor: d.selectedElement.c } },

                      React.createElement("span", { className: "text-[11px] opacity-80" }, d.selectedElement.n),

                      React.createElement("span", { className: "text-xl font-black" }, d.selectedElement.s)

                    ),

                    React.createElement("div", { className: "flex-1 min-w-0" },

                      React.createElement("p", { className: "text-lg font-bold text-slate-800" }, d.selectedElement.name),

                      React.createElement("p", { className: "text-xs text-slate-600" }, "Atomic #" + d.selectedElement.n + " \u2022 " + (d.selectedElement.cat || 'element').replace(/^\w/, c => c.toUpperCase())),

                      detail && React.createElement("p", { className: "text-xs text-slate-600 mt-1 italic" }, detail.desc),

                      detail && React.createElement("button", { "aria-label": "Speak Text",
                        onClick: () => speakText(d.selectedElement.name + '. ' + detail.desc),
                        className: "ml-1 px-1.5 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600 hover:bg-slate-200 inline-flex items-center"
                      }, "🔊"),

                    ),

                    React.createElement("button", { onClick: () => upd('selectedElement', null), className: "p-1 text-slate-600 hover:text-slate-600 flex-shrink-0", "aria-label": "Close" }, "\u2715")

                  ),

                  detail && React.createElement("div", { className: "border-t border-slate-200/50 px-3 pb-3" },

                    React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2 mt-2" },

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1" }, "\uD83D\uDD27 Common Uses"),

                        React.createElement("div", { className: "flex flex-wrap gap-1" },

                          (detail.uses || []).map((use, i) => React.createElement("span", { key: i, className: "px-2 py-0.5 bg-white/60 rounded-full text-[11px] font-medium text-slate-700 border border-slate-400/80" }, use))

                        )

                      ),

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1" }, "\uD83E\uDDEA Key Compounds"),

                        React.createElement("div", { className: "flex flex-wrap gap-1" },

                          (detail.compounds || []).map((comp, i) => React.createElement("span", { key: i, className: "px-2 py-0.5 bg-white/60 rounded-full text-[11px] font-medium text-slate-700 border border-slate-400/80" }, comp))

                        )

                      )

                    ),

                    relatedCompounds.length > 0 && React.createElement("div", { className: "mt-2" },

                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1" }, "\u2697\uFE0F Craftable in Compound Creator (" + relatedCompounds.length + ")"),

                      React.createElement("div", { className: "flex flex-wrap gap-1" },

                        relatedCompounds.map((comp, i) => React.createElement("button", { "aria-label": "Open " + comp.name + " in Compound Creator", key: i, onClick: () => { upd('moleculeMode', 'creator'); upd('selectedElements', { ...comp.recipe }); }, className: "px-2 py-0.5 bg-emerald-50 rounded-full text-[11px] font-bold text-emerald-700 border border-emerald-600 hover:bg-emerald-100 cursor-pointer transition-colors" }, comp.emoji + " " + comp.name + " (" + comp.formula + ")"))

                      )

                    ),

                    // â”€â”€â”€ BOHR MODEL ATOM VISUALIZATION â”€â”€â”€

                    React.createElement("div", { className: "mt-3 pt-3 border-t border-slate-200/50" },

                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2" }, "\u269B\uFE0F Bohr Model"),

                      React.createElement("span", { className: "ml-2 text-[11px] text-slate-600 font-normal" },
                        "Config: " + getElectronConfig(d.selectedElement.n) +
                        " | Valence: " + getValenceElectrons(d.selectedElement.n) + "e⁻" +
                        (ELECTRONEGATIVITY[d.selectedElement.s] ? " | EN: " + ELECTRONEGATIVITY[d.selectedElement.s] : "")
                      ),

                      React.createElement("div", { className: "flex items-start gap-3" },

                        React.createElement("canvas", { width: 220, height: 220,

                          className: "rounded-xl border border-slate-400 bg-slate-900 flex-shrink-0",

                          key: 'bohr-' + d.selectedElement.n,

                          ref: function(canvas) {

                            if (!canvas) return;

                            var el = d.selectedElement;

                            var atomicNum = el.n;

                            var massNum = Math.round(el.mass || (atomicNum * 2.15));

                            var protons = atomicNum;

                            var neutrons = massNum - protons;

                            if (neutrons < 0) neutrons = 0;

                            var electrons = atomicNum;

                            // Shell configuration: 2, 8, 18, 32, 32, 18, 8

                            var shellCapacity = [2, 8, 18, 32, 32, 18, 8];

                            var shells = [];

                            var remaining = electrons;

                            for (var si = 0; si < shellCapacity.length && remaining > 0; si++) {

                              var count = Math.min(remaining, shellCapacity[si]);

                              shells.push(count);

                              remaining -= count;

                            }

                            // PL7 HiDPI: crisp rendering on retina displays.
                            if (window.StemLab && window.StemLab.setupHiDPI) {
                              window.StemLab.setupHiDPI(canvas, canvas._logicalW || canvas.width, canvas._logicalH || canvas.height);
                            }
                            var ctx = canvas.getContext('2d');
                            if (canvas._dpr) ctx.setTransform(canvas._dpr, 0, 0, canvas._dpr, 0, 0);

                            var W = canvas._logicalW || canvas.width, H = canvas._logicalH || canvas.height;

                            var cx = W / 2, cy = H / 2;

                            var maxR = Math.min(W, H) / 2 - 8;

                            var nShells = shells.length;

                            var nucleusR = Math.max(8, Math.min(22, 6 + protons * 0.15));

                            var shellColors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#fb923c', '#38bdf8'];
                            var shellLabels = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];

                            var angle = 0;

                            var animId = null;

                            // State interpolation for expanding/contracting shells smoothly
                            var targetRadii = [];
                            for (var s = 0; s < nShells; s++) {
                              var r = nucleusR + 12 + (maxR - nucleusR - 12) * ((s + 1) / (nShells + 0.5));
                              targetRadii.push(r);
                            }

                            canvas._activeRadii = canvas._activeRadii || [];
                            if (canvas._activeRadii.length !== nShells) {
                              canvas._activeRadii = [];
                              for (var s = 0; s < nShells; s++) {
                                canvas._activeRadii.push(targetRadii[s]);
                              }
                            }

                            // Photon wave packet transitions
                            canvas._photons = canvas._photons || [];
                            if (canvas._prevN && canvas._prevN !== atomicNum) {
                              var isRelaxation = atomicNum < canvas._prevN;
                              for (var p = 0; p < 3; p++) {
                                var pAngle = Math.random() * Math.PI * 2;
                                canvas._photons.push({
                                  angle: pAngle,
                                  dist: isRelaxation ? nucleusR : maxR,
                                  speed: isRelaxation ? 4 : -4,
                                  color: isRelaxation ? '#a78bfa' : '#34d399', // relaxation (purple), excitation (green)
                                  life: 0,
                                  maxLife: 35
                                });
                              }
                            }
                            canvas._prevN = atomicNum;

                            function draw() {

                              ctx.clearRect(0, 0, W, H);

                              // Smoothly ease active radii towards target
                              for (var s = 0; s < nShells; s++) {
                                if (canvas._activeRadii[s] !== undefined) {
                                  canvas._activeRadii[s] += (targetRadii[s] - canvas._activeRadii[s]) * 0.08;
                                } else {
                                  canvas._activeRadii[s] = targetRadii[s];
                                }
                              }

                              // Draw concentric shells
                              for (var s = 0; s < nShells; s++) {

                                var r = canvas._activeRadii[s];

                                ctx.beginPath();

                                ctx.arc(cx, cy, r, 0, Math.PI * 2);

                                ctx.strokeStyle = 'rgba(148,163,184,0.18)';

                                ctx.lineWidth = 1;

                                ctx.stroke();

                                // Shell boundary energy labels
                                ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
                                ctx.font = '7px monospace';
                                ctx.textAlign = 'right';
                                ctx.fillText(shellLabels[s] + '(n=' + (s + 1) + ')', cx + r - 4, cy - 3);

                              }

                              // Draw nucleus

                              var nucGrad = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, nucleusR);

                              nucGrad.addColorStop(0, '#ff6b6b');

                              nucGrad.addColorStop(0.6, '#e74c3c');

                              nucGrad.addColorStop(1, '#c0392b');

                              ctx.beginPath();

                              ctx.arc(cx, cy, nucleusR, 0, Math.PI * 2);

                              ctx.fillStyle = nucGrad;

                              ctx.fill();

                              // Nucleus spots (protons red, neutrons blue)

                              if (protons <= 20) {

                                var nucItems = [];

                                for (var pi = 0; pi < Math.min(protons, 10); pi++) nucItems.push('p');

                                for (var ni = 0; ni < Math.min(neutrons, 10); ni++) nucItems.push('n');

                                var golden = 2.399963;

                                for (var qi = 0; qi < nucItems.length; qi++) {

                                  var fr = Math.sqrt(qi / nucItems.length) * (nucleusR * 0.7);

                                  var fa = qi * golden;

                                  var fx = cx + Math.cos(fa) * fr;

                                  var fy = cy + Math.sin(fa) * fr;

                                  ctx.beginPath();

                                  ctx.arc(fx, fy, Math.max(1.5, nucleusR * 0.15), 0, Math.PI * 2);

                                  ctx.fillStyle = nucItems[qi] === 'p' ? '#ffaaaa' : '#aaaaff';

                                  ctx.fill();

                                }

                              }

                              // Nucleus label

                              ctx.fillStyle = '#ffffff';

                              ctx.font = 'bold ' + Math.max(7, Math.min(11, nucleusR * 0.7)) + 'px sans-serif';

                              ctx.textAlign = 'center';

                              ctx.textBaseline = 'middle';

                              if (protons <= 4) {

                                ctx.fillText(protons + 'p', cx, cy - 2);

                                ctx.fillText(neutrons + 'n', cx, cy + 7);

                              }

                              // Draw electrons orbiting (with trails)

                              for (var s2 = 0; s2 < nShells; s2++) {

                                var r2 = canvas._activeRadii[s2] || targetRadii[s2];

                                var eCount = shells[s2];

                                var speed = (0.22 + s2 * 0.08) * (s2 % 2 === 0 ? 1 : -1);

                                var eColor = shellColors[s2 % shellColors.length];

                                for (var ei = 0; ei < eCount; ei++) {

                                  var eAngle = angle * speed + (ei / eCount) * Math.PI * 2;

                                  var ex = cx + Math.cos(eAngle) * r2;

                                  var ey = cy + Math.sin(eAngle) * r2;

                                  // Glow ring
                                  ctx.beginPath();

                                  ctx.arc(ex, ey, 5.5, 0, Math.PI * 2);

                                  ctx.fillStyle = eColor + '22';

                                  ctx.fill();

                                  // Orbit electron trails
                                  for (var tIdx = 1; tIdx <= 3; tIdx++) {
                                    var trailAngle = eAngle - tIdx * 0.045 * speed;
                                    var tx = cx + Math.cos(trailAngle) * r2;
                                    var ty = cy + Math.sin(trailAngle) * r2;
                                    ctx.beginPath();
                                    ctx.arc(tx, ty, 3.2 - tIdx * 0.6, 0, Math.PI * 2);
                                    ctx.fillStyle = eColor;
                                    ctx.globalAlpha = 0.5 - tIdx * 0.15;
                                    ctx.fill();
                                    ctx.globalAlpha = 1.0;
                                  }

                                  // Electron core dot
                                  ctx.beginPath();

                                  ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);

                                  ctx.fillStyle = eColor;

                                  ctx.fill();

                                }

                              }

                              // Render transition photons
                              canvas._photons.forEach(function(ph) {
                                ph.dist += ph.speed;
                                ph.life++;
                                
                                var pX = cx + Math.cos(ph.angle) * ph.dist;
                                var pY = cy + Math.sin(ph.angle) * ph.dist;
                                
                                // Wave oscillation offset
                                var perpAngle = ph.angle + Math.PI / 2;
                                var waveOffset = Math.sin(ph.life * 0.85) * 4.5;
                                pX += Math.cos(perpAngle) * waveOffset;
                                pY += Math.sin(perpAngle) * waveOffset;
                                
                                ctx.beginPath();
                                ctx.arc(pX, pY, 3, 0, Math.PI * 2);
                                ctx.fillStyle = ph.color;
                                ctx.shadowColor = ph.color;
                                ctx.shadowBlur = 6;
                                ctx.fill();
                                ctx.shadowBlur = 0;
                              });
                              canvas._photons = canvas._photons.filter(function(ph) { return ph.life < ph.maxLife; });

                              // Symbol label at top

                              ctx.fillStyle = 'rgba(255,255,255,0.75)';

                              ctx.font = 'bold 9px monospace';

                              ctx.textAlign = 'center';

                              ctx.fillText(el.s + ' (' + atomicNum + ')', cx, 14);

                              angle += 0.015;

                              animId = requestAnimationFrame(draw);

                            }

                            draw();

                            // Cleanup on unmount

                            canvas._bohrCleanup = function() { if (animId) cancelAnimationFrame(animId); };

                            var observer = new MutationObserver(function(mutations) {

                              mutations.forEach(function(m) {

                                m.removedNodes.forEach(function(node) {

                                  if (node === canvas || (node.contains && node.contains(canvas))) {

                                    if (canvas._bohrCleanup) canvas._bohrCleanup();

                                    observer.disconnect();

                                  }

                                });

                              });

                            });

                            if (canvas.parentNode && canvas.parentNode.parentNode) {

                              observer.observe(canvas.parentNode.parentNode, { childList: true, subtree: true });

                            }

                          }

                        }),

                        React.createElement("div", { className: "text-[11px] text-slate-600 space-y-1 leading-relaxed" },

                          React.createElement("p", null, React.createElement("strong", { className: "text-slate-700" }, "Protons: "), "" + d.selectedElement.n),

                          React.createElement("p", null, React.createElement("strong", { className: "text-slate-700" }, "Electrons: "), "" + d.selectedElement.n),

                          React.createElement("p", null, React.createElement("strong", { className: "text-slate-700" }, "Shells: "), (function() {

                            var e = d.selectedElement.n;

                            var sc = [2, 8, 18, 32, 32, 18, 8];

                            var sh = [];

                            var rem = e;

                            for (var i = 0; i < sc.length && rem > 0; i++) {

                              var c = Math.min(rem, sc[i]);

                              sh.push(c);

                              rem -= c;

                            }

                            return sh.join('-');

                          })()),

                          React.createElement("p", { className: "text-[11px] text-slate-600 italic mt-1" }, "\u26A1 Electrons orbit the nucleus in energy levels called \"shells.\" Inner shells fill first before outer ones begin.")

                        )

                      )

                    )

                  )

                );

              })(),

              // Table grid

              React.createElement("div", { className: "overflow-x-auto" },

                React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(18, minmax(0, 1fr))', gap: '1px', minWidth: '600px' } },

                  PT_LAYOUT.flatMap((row, ri) => {

                    if (row.length === 0) return [React.createElement("div", { key: 'gap-' + ri, style: { gridColumn: 'span 18', height: '4px' } })];

                    return row.map((num, ci) => {

                      if (num === 0) return React.createElement("div", { key: ri + '-' + ci });

                      const el = ELEMENTS[num - 1];

                      if (!el) return React.createElement("div", { key: ri + '-' + ci });

                      return React.createElement("button", { "aria-label": "Select element: " + el.name + " (" + el.s + ")", key: el.s, onClick: () => upd('selectedElement', el), className: "w-full aspect-square rounded flex flex-col items-center justify-center text-[11px] font-bold border transition-all hover:scale-125 hover:z-10 hover:shadow-lg " + (catColors[el.cat] || 'bg-slate-50 border-slate-200'), title: el.name, style: { minWidth: '28px' } },

                        React.createElement("span", { className: "font-black text-[11px] leading-none" }, el.s),

                        React.createElement("span", { className: "opacity-60 leading-none" }, el.n)

                      );

                    });

                  })

                )

              ),

              // Legend

              React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-3 justify-center" },

                [['alkali', 'Alkali'], ['alkaline', 'Alkaline'], ['transition', 'Transition'], ['metal', 'Post-trans.'], ['metalloid', 'Metalloid'], ['nonmetal', 'Nonmetal'], ['halogen', 'Halogen'], ['noble', 'Noble Gas'], ['lanthanide', t('stem.periodic.lanthanide')], ['actinide', t('stem.periodic.actinide')]].map(([cat, label]) =>

                  React.createElement("span", { key: cat, className: "px-1.5 py-0.5 rounded text-[11px] font-bold border " + (catColors[cat] || '') }, label)

                )

              ),

              // â”€â”€ Quiz: Element Hunt â”€â”€

              (() => {

                var elQuiz = d.elQuiz || null;

                var elScore = d.elScore || 0;

                var elStreak = d.elStreak || 0;

                function makeElQuiz() {

                  var quizTypes = [

                    function () { var el = ELEMENTS[Math.floor(Math.random() * 36)]; return { text: 'Which element has the symbol "' + el.s + '"?', answer: el.name, opts: [el.name].concat(ELEMENTS.filter(function (e) { return e.name !== el.name; }).sort(function () { return Math.random() - 0.5; }).slice(0, 3).map(function (e) { return e.name; })).sort(function () { return Math.random() - 0.5; }) }; },

                    function () { var el = ELEMENTS[Math.floor(Math.random() * 36)]; return { text: 'What is the atomic number of ' + el.name + '?', answer: String(el.n), opts: [String(el.n), String(el.n + 2), String(el.n > 3 ? el.n - 2 : el.n + 4), String(el.n + 7)].sort(function () { return Math.random() - 0.5; }) }; },

                    function () { var cats = ['alkali', 'noble', 'halogen', 'transition', 'nonmetal']; var catLabels = { alkali: 'Alkali Metal', noble: 'Noble Gas', halogen: 'Halogen', transition: 'Transition Metal', nonmetal: 'Nonmetal' }; var cat = cats[Math.floor(Math.random() * cats.length)]; var ex = ELEMENTS.filter(function (e) { return e.cat === cat; }); var el = ex[Math.floor(Math.random() * ex.length)]; return { text: 'What category does ' + el.name + ' (' + el.s + ') belong to?', answer: catLabels[cat], opts: Object.values(catLabels).sort(function () { return Math.random() - 0.5; }).slice(0, 4) }; },

                  ];

                  var gen = quizTypes[Math.floor(Math.random() * quizTypes.length)];

                  var q = gen(); q.answered = false;

                  if (q.opts.indexOf(q.answer) < 0) q.opts[0] = q.answer;

                  return q;

                }

                return React.createElement("div", { className: "border-t border-slate-200 pt-3 mt-3" },

                  React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                    React.createElement("button", { "aria-label": "Start element quiz or get next question", onClick: function () { upd('elQuiz', makeElQuiz()); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (elQuiz ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-700 text-white') + " hover:opacity-90 transition-all" }, elQuiz ? 'ðŸ”„ Next Question' : 'ðŸ”¬ Element Quiz'),

                    elScore > 0 && React.createElement("span", { className: "text-xs font-bold text-emerald-600" }, 'â­ ' + elScore + ' | ðŸ”¥ ' + elStreak)

                  ),

                  elQuiz && !elQuiz.answered && React.createElement("div", { className: "bg-cyan-50 rounded-xl p-3 border border-cyan-200" },

                    React.createElement("p", { className: "text-sm font-bold text-cyan-800 mb-2" }, elQuiz.text),

                    React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                      elQuiz.opts.map(function (opt) {

                        return React.createElement("button", { "aria-label": "Select answer: " + opt,

                          key: opt, onClick: function () {

                            var correct = opt === elQuiz.answer;

                            upd('elQuiz', Object.assign({}, elQuiz, { answered: true, chosen: opt }));

                            upd('elScore', elScore + (correct ? 1 : 0)); upd('elStreak', correct ? elStreak + 1 : 0);
                            if (correct) checkMoleculeChallenges();

                            if (correct) addToast(t('stem.periodic.correct'), 'success'); else addToast(t('stem.periodic.answer') + elQuiz.answer, 'error');

                          }, className: "px-2 py-1.5 rounded-lg text-xs font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 transition-all"

                        }, opt);

                      })

                    )

                  ),

                  elQuiz && elQuiz.answered && React.createElement("div", { className: "p-3 rounded-xl text-sm font-bold " + (elQuiz.chosen === elQuiz.answer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200') }, elQuiz.chosen === elQuiz.answer ? 'âœ… Correct!' : 'âŒ Answer: ' + elQuiz.answer)

                );

              })()

            )

,

            // ═══ Reactions Mode ═══
            mode === 'reactions' && React.createElement("div", null,

              React.createElement("p", { className: "text-xs text-slate-600 mb-3" }, "Balance chemical equations by adjusting coefficients. Make atoms equal on both sides!"),

              // Reaction selector
              React.createElement("div", { className: "flex gap-1 mb-4 flex-wrap" },
                REACTIONS.map((r, idx) => React.createElement("button", { "aria-label": "Select reaction: " + r.name,
                  key: r.id,
                  onClick: () => initReaction(idx),
                  className: "px-2 py-1 rounded-lg text-xs font-bold transition-all " +
                    (currentReactionIdx === idx && reactionCoeffs ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                }, r.emoji + " " + (idx + 1)))
              ),

              // Active reaction
              (() => {
                const r = REACTIONS[currentReactionIdx];
                const coeffs = reactionCoeffs || r.left.concat(r.right).map(() => 1);
                const balance = getAtomBalance(r, coeffs);

                return React.createElement("div", null,
                  // Reaction info
                  React.createElement("div", { className: "bg-indigo-50 rounded-xl p-3 border border-indigo-200 mb-3" },
                    React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                      React.createElement("span", { className: "text-xl" }, r.emoji),
                      React.createElement("span", { className: "text-sm font-bold text-indigo-800" }, r.name),
                      React.createElement("span", { className: "px-1.5 py-0.5 rounded text-[11px] font-bold " +
                        (r.difficulty === 1 ? 'bg-green-100 text-green-700' : r.difficulty === 2 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700') },
                        r.difficulty === 1 ? 'Easy' : r.difficulty === 2 ? 'Medium' : 'Hard'),
                      React.createElement("span", { className: "px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600" }, r.type)
                    ),
                    React.createElement("p", { className: "text-xs text-indigo-600" }, r.desc)
                  ),

                  // Equation balancer
                  React.createElement("div", { className: "bg-slate-900/60 rounded-xl border border-slate-800 p-4 mb-3" },
                    React.createElement("div", { className: "flex items-center justify-center gap-2 flex-wrap" },
                      // Left side (reactants)
                      r.left.map((term, i) => React.createElement("div", { key: 'l' + i, className: "flex items-center gap-1" },
                        i > 0 && React.createElement("span", { className: "text-lg font-bold text-slate-600 mx-1" }, "+"),
                        React.createElement("div", { className: "flex flex-col items-center" },
                          React.createElement("div", {
                            "aria-label": "Coefficient for " + term.formula + ". Current value is " + coeffs[i] + ". Use Arrow Keys to adjust.",
                            tabIndex: 0,
                            onKeyDown: (e) => {
                              if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                                e.preventDefault(); setCoeff(i, 1);
                                if (typeof announceToSR === 'function') announceToSR(term.formula + " coefficient increased to " + Math.min(9, coeffs[i] + 1));
                              } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                                e.preventDefault(); setCoeff(i, -1);
                                if (typeof announceToSR === 'function') announceToSR(term.formula + " coefficient decreased to " + Math.max(1, coeffs[i] - 1));
                              }
                            },
                            className: "flex items-center gap-0.5 focus:ring-2 focus:ring-yellow-500 focus:outline-none rounded-lg p-0.5"
                          },
                            React.createElement("button", { "aria-label": "Decrease coefficient for " + term.formula,
                              onClick: () => setCoeff(i, -1),
                              tabIndex: -1,
                              className: "w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 flex items-center justify-center"
                            }, "−"),
                            React.createElement("span", { className: "w-8 text-center text-lg font-black text-indigo-700 font-mono" }, coeffs[i]),
                            React.createElement("button", { "aria-label": "Increase coefficient for " + term.formula,
                              onClick: () => setCoeff(i, 1),
                              tabIndex: -1,
                              className: "w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 flex items-center justify-center"
                            }, "+")
                          ),
                          React.createElement("span", { className: "text-sm font-bold text-slate-700 mt-0.5 bg-slate-50 px-2 py-0.5 rounded border" }, term.formula)
                        )
                      )),

                      // Arrow
                      React.createElement("span", { className: "text-2xl font-bold text-slate-600 mx-2" }, "→"),

                      // Right side (products)
                      r.right.map((term, i) => React.createElement("div", { key: 'r' + i, className: "flex items-center gap-1" },
                        i > 0 && React.createElement("span", { className: "text-lg font-bold text-slate-600 mx-1" }, "+"),
                        React.createElement("div", { className: "flex flex-col items-center" },
                          React.createElement("div", {
                            "aria-label": "Coefficient for " + term.formula + ". Current value is " + coeffs[r.left.length + i] + ". Use Arrow Keys to adjust.",
                            tabIndex: 0,
                            onKeyDown: (e) => {
                              if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                                e.preventDefault(); setCoeff(r.left.length + i, 1);
                                if (typeof announceToSR === 'function') announceToSR(term.formula + " coefficient increased to " + Math.min(9, coeffs[r.left.length + i] + 1));
                              } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                                e.preventDefault(); setCoeff(r.left.length + i, -1);
                                if (typeof announceToSR === 'function') announceToSR(term.formula + " coefficient decreased to " + Math.max(1, coeffs[r.left.length + i] - 1));
                              }
                            },
                            className: "flex items-center gap-0.5 focus:ring-2 focus:ring-yellow-500 focus:outline-none rounded-lg p-0.5"
                          },
                            React.createElement("button", { "aria-label": "Decrease coefficient for " + term.formula,
                              onClick: () => setCoeff(r.left.length + i, -1),
                              tabIndex: -1,
                              className: "w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 flex items-center justify-center"
                            }, "−"),
                            React.createElement("span", { className: "w-8 text-center text-lg font-black text-indigo-700 font-mono" }, coeffs[r.left.length + i]),
                            React.createElement("button", { "aria-label": "Increase coefficient for " + term.formula,
                              onClick: () => setCoeff(r.left.length + i, 1),
                              tabIndex: -1,
                              className: "w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 flex items-center justify-center"
                            }, "+")
                          ),
                          React.createElement("span", { className: "text-sm font-bold text-slate-700 mt-0.5 bg-slate-50 px-2 py-0.5 rounded border" }, term.formula)
                        )
                      ))
                    ),

                    // Visual Molecule Shelf
                    React.createElement("div", { className: "flex gap-3 justify-center items-center mt-4 border-t border-slate-800 pt-3 flex-wrap" },
                      drawVisualShelf(r.left, true),
                      React.createElement("span", { className: "text-lg font-bold text-slate-600 mt-4" }, "→"),
                      drawVisualShelf(r.right, false)
                    )
                  ),

                  // Atom count table
                  React.createElement("div", { className: "bg-slate-50 rounded-xl p-3 border mb-3" },
                    React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2" }, "Atom Count"),
                    React.createElement("div", { className: "grid grid-cols-3 gap-1 text-xs" },
                      React.createElement("span", { className: "font-bold text-slate-600 text-center" }, "Element"),
                      React.createElement("span", { className: "font-bold text-slate-600 text-center" }, "Left"),
                      React.createElement("span", { className: "font-bold text-slate-600 text-center" }, "Right"),
                      balance.map(b => [
                        React.createElement("span", { key: b.element + 'n', className: "text-center font-bold text-slate-700" }, b.element),
                        React.createElement("span", { key: b.element + 'l', className: "text-center font-bold " + (b.balanced ? 'text-emerald-600' : 'text-red-500') }, b.left),
                        React.createElement("span", { key: b.element + 'r', className: "text-center font-bold " + (b.balanced ? 'text-emerald-600' : 'text-red-500') }, b.right)
                      ]).flat()
                    )
                  ),

                  // Submit button
                  React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { "aria-label": "Check Balance",
                      onClick: submitReaction,
                      disabled: reactionResult === 'correct',
                      className: "flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-600 shadow-md transition-all disabled:opacity-40"
                    }, "⚖️ Check Balance"),
                    React.createElement("button", { "aria-label": "Next",
                      onClick: () => { const next = (currentReactionIdx + 1) % REACTIONS.length; initReaction(next); },
                      className: "px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                    }, "➡️ Next")
                  ),

                  // Result feedback
                  reactionResult === 'correct' && React.createElement("div", { className: "mt-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 text-center" },
                    React.createElement("p", { className: "text-lg font-black text-emerald-700" }, "🎉 Balanced!"),
                    React.createElement("p", { className: "text-xs text-emerald-600 mt-1" }, "+" + (r.difficulty * 10) + " RP earned")
                  ),
                  reactionResult === 'incorrect' && React.createElement("div", { className: "mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center" },
                    React.createElement("p", { className: "text-sm font-bold text-amber-700" }, "💡 Hint: check which atoms have different counts on each side.")
                  ),

                  // Progress
                  React.createElement("div", { className: "mt-3 flex items-center justify-between text-[11px] text-slate-600" },
                    React.createElement("span", null, "⚖️ " + reactionsBalanced + " balanced"),
                    React.createElement("span", null, "Reaction " + (currentReactionIdx + 1) + "/" + REACTIONS.length)
                  )
                );
              })()
            ),

            // ═══ Challenges Panel ═══
            React.createElement("div", { className: "mt-4 border-t border-slate-200 pt-3" },
              React.createElement("details", { open: completedChallenges.length > 0 && completedChallenges.length < MOLECULE_CHALLENGES.length },
                React.createElement("summary", { className: "text-xs font-bold text-slate-600 cursor-pointer hover:text-slate-800 select-none" },
                  "🏆 Challenges (" + completedChallenges.length + "/" + MOLECULE_CHALLENGES.length + ")"
                ),
                React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2" },
                  MOLECULE_CHALLENGES.map(ch => {
                    const done = completedChallenges.includes(ch.id);
                    return React.createElement("div", {
                      key: ch.id,
                      className: "flex items-center gap-2 p-2 rounded-lg border " + (done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200')
                    },
                      React.createElement("span", { className: "text-lg" }, done ? '✅' : ch.emoji),
                      React.createElement("div", { className: "flex-1 min-w-0" },
                        React.createElement("p", { className: "text-xs font-bold " + (done ? 'text-emerald-700 line-through' : 'text-slate-700') }, ch.name),
                        React.createElement("p", { className: "text-[11px] " + (done ? 'text-emerald-500' : 'text-slate-200') }, ch.desc)
                      ),
                      React.createElement("span", { className: "text-[11px] font-bold " + (done ? 'text-emerald-600' : 'text-slate-200') }, "+" + ch.reward + " RP")
                    );
                  })
                )
              )
            ),

            
            // ═══ AI Chemistry Tutor ═══
            React.createElement("div", { className: "mt-3 border-t border-slate-200 pt-3" },
              React.createElement("details", null,
                React.createElement("summary", { className: "text-xs font-bold text-slate-600 cursor-pointer hover:text-slate-800 select-none" },
                  "🧑‍🔬 Ask the Chemistry Tutor"
                ),
                React.createElement("div", { className: "mt-2" },
                  React.createElement("div", { className: "flex gap-2 mb-2" },
                    React.createElement("input", {
                      type: "text",
                      value: aiQuestion,
                      "aria-label": "Ask the chemistry tutor about elements, compounds, or reactions",
                      onChange: (e) => upd('aiQuestion', e.target.value),
                      onKeyDown: (e) => { if (e.key === 'Enter') askChemTutor(aiQuestion); },
                      placeholder: "Ask about any element, compound, or reaction...",
                      className: "flex-1 px-3 py-2 rounded-lg border border-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    }),
                    React.createElement("button", { "aria-label": "Ask Chem Tutor",
                      onClick: () => askChemTutor(aiQuestion),
                      disabled: aiLoading || !aiQuestion,
                      className: "px-3 py-2 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 disabled:opacity-40 transition-all"
                    }, aiLoading ? "⏳" : "🔬 Ask")
                  ),
                  React.createElement("div", { className: "flex gap-1 mb-2 flex-wrap" },
                    ["What is an ionic bond?", "Why is water a polar molecule?", "How does rust form?", "What is pH?"].map(q =>
                      React.createElement("button", { "aria-label": "Ask: " + q,
                        key: q,
                        onClick: () => { upd('aiQuestion', q); askChemTutor(q); },
                        className: "px-2 py-1 rounded text-[11px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      }, q)
                    )
                  ),
                  aiAnswer && React.createElement("div", { className: "bg-indigo-50 rounded-xl p-3 border border-indigo-200" },
                    React.createElement("div", { className: "flex items-start gap-2" },
                      React.createElement("span", { className: "text-lg flex-shrink-0" }, "🧑‍🔬"),
                      React.createElement("div", { className: "flex-1" },
                        React.createElement("p", { className: "text-xs text-indigo-700 leading-relaxed" }, aiAnswer),
                        React.createElement("button", { "aria-label": "Read Aloud",
                          onClick: () => speakText(aiAnswer),
                          className: "mt-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                        }, "🔊 Read Aloud")
                      )
                    )
                  )
                )
              )
            ),
// ═══ Tutorial Overlay ═══
            !tutorialDismissed && React.createElement("div", { 
              className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40",
              onClick: (e) => { if (e.target === e.currentTarget) dismissTutorial(); }
            },
              React.createElement("div", { className: "bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-4 relative" },
                React.createElement("button", { "aria-label": "Dismiss Tutorial",
                  onClick: dismissTutorial,
                  className: "absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 text-sm font-bold"
                }, "✕"),

                React.createElement("p", { className: "text-2xl mb-1" }, ["🔬", "⚗️", "🧱", "🗂️", "🔥"][tutorialStep]),
                React.createElement("p", { className: "text-lg font-bold text-slate-800 mb-2" },
                  ['Welcome to Molecule Lab!', 'Compound Creator', 'Build Mode', 'Periodic Table', 'Reaction Simulator'][tutorialStep]
                ),
                React.createElement("p", { className: "text-sm text-slate-600 mb-4 leading-relaxed" },
                  [
                    'Explore chemistry through 5 interactive modes. View molecules, create compounds, build structures, study elements, and balance reactions!',
                    'Select elements from the grid to craft real compounds. Discover all 32 recipes to earn the Master Chemist challenge!',
                    'Place atoms on the canvas and draw bonds between them. Click bonds to cycle single → double → triple. Try the Random Challenge!',
                    'Browse all 118 elements with animated Bohr models, electron configurations, and electronegativity values. Test yourself with the Element Quiz!',
                    'Adjust coefficients to balance chemical equations. Match atom counts on both sides. 10 reactions from easy to hard - earn RP for each!'
                  ][tutorialStep]
                ),
                React.createElement("div", { className: "flex items-center justify-between" },
                  React.createElement("div", { className: "flex gap-1" },
                    [0,1,2,3,4].map(i => React.createElement("div", {
                      key: i,
                      className: "w-2 h-2 rounded-full " + (i === tutorialStep ? 'bg-indigo-500' : 'bg-slate-200')
                    }))
                  ),
                  React.createElement("div", { className: "flex gap-2" },
                    tutorialStep > 0 && React.createElement("button", { "aria-label": "Back",
                      onClick: () => upd('tutorialStep', tutorialStep - 1),
                      className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }, "← Back"),
                    tutorialStep < 4
                      ? React.createElement("button", { "aria-label": "Next",
                          onClick: advanceTutorial,
                          className: "px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-600"
                        }, "Next →")
                      : React.createElement("button", { "aria-label": "Start Exploring!",
                          onClick: dismissTutorial,
                          className: "px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-600"
                        }, "✅ Start Exploring!")
                  )
                )
              )
            )
          )
      })();

      // ═══════════════════════════════════════════════════════════════════
      // EXPANSION SECTIONS — interactive reference library (2026-05-31)
      // ═══════════════════════════════════════════════════════════════════
      // Appended below the main molecule view. Adds: VSEPR geometry gallery,
      // bond types reference, intermolecular forces, common reactions catalog,
      // molecule library, periodic table reference, acid-base reference,
      // polymers, lab safety, glossary, quick reference, practice problems,
      // stoichiometry/molarity calculators, phase diagrams, equilibrium,
      // kinetics, thermodynamics basics, quantum numbers reference.
      var d2 = (labToolData && labToolData.molecule) || {};
      var expSection = d2.expSection || null;  // null = collapsed, else section id
      function setExp(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.molecule) || {};
          return Object.assign({}, prev, { molecule: Object.assign({}, prior, patch) });
        });
      }

      // ── Reference data (large constants drive the views) ──
      var VSEPR_GEOMETRIES = [
        { id: 'linear', name: 'Linear', steric: 2, lone: 0, angle: '180°', examples: ['CO₂', 'BeCl₂', 'HCN'], color: '#0ea5e9', desc: 'Two bonded pairs, no lone pairs on central atom.' },
        { id: 'bent2', name: 'Bent (2 lone pairs)', steric: 4, lone: 2, angle: '~104.5°', examples: ['H₂O', 'OF₂', 'OCl₂'], color: '#06b6d4', desc: 'Tetrahedral electron geometry but two lone pairs push bonds closer.' },
        { id: 'trigonal', name: 'Trigonal planar', steric: 3, lone: 0, angle: '120°', examples: ['BF₃', 'SO₃', 'NO₃⁻'], color: '#22c55e', desc: 'Three bonded pairs in a plane.' },
        { id: 'bent3', name: 'Bent (1 lone pair)', steric: 3, lone: 1, angle: '~117°', examples: ['SO₂', 'O₃', 'NO₂⁻'], color: '#84cc16', desc: 'Trigonal planar electron geometry with one lone pair.' },
        { id: 'tetrahedral', name: 'Tetrahedral', steric: 4, lone: 0, angle: '109.5°', examples: ['CH₄', 'CCl₄', 'NH₄⁺'], color: '#eab308', desc: 'Four bonded pairs in tetrahedral arrangement.' },
        { id: 'pyramidal', name: 'Trigonal pyramidal', steric: 4, lone: 1, angle: '~107°', examples: ['NH₃', 'PH₃', 'PCl₃'], color: '#f97316', desc: 'Tetrahedral electron geometry, one lone pair pushes shape pyramidal.' },
        { id: 'tbp', name: 'Trigonal bipyramidal', steric: 5, lone: 0, angle: '90° + 120°', examples: ['PCl₅', 'PF₅', 'AsF₅'], color: '#ef4444', desc: 'Five bonded pairs; three equatorial at 120°, two axial at 90°.' },
        { id: 'seesaw', name: 'Seesaw', steric: 5, lone: 1, angle: 'distorted', examples: ['SF₄', 'XeO₂F₂'], color: '#dc2626', desc: 'Trigonal bipyramidal with one equatorial lone pair.' },
        { id: 'tshape', name: 'T-shaped', steric: 5, lone: 2, angle: '~87.5°', examples: ['ClF₃', 'BrF₃'], color: '#a855f7', desc: 'Two equatorial lone pairs leave a T-shape.' },
        { id: 'linear5', name: 'Linear (3 lone)', steric: 5, lone: 3, angle: '180°', examples: ['XeF₂', 'I₃⁻'], color: '#7e22ce', desc: 'Three equatorial lone pairs leave linear axial bonds.' },
        { id: 'octahedral', name: 'Octahedral', steric: 6, lone: 0, angle: '90°', examples: ['SF₆', 'PF₆⁻'], color: '#0f172a', desc: 'Six bonded pairs in octahedral arrangement.' },
        { id: 'sqpyramid', name: 'Square pyramidal', steric: 6, lone: 1, angle: '~90°', examples: ['BrF₅', 'IF₅'], color: '#475569', desc: 'Octahedral with one axial lone pair.' },
        { id: 'sqplane', name: 'Square planar', steric: 6, lone: 2, angle: '90°', examples: ['XeF₄', 'PtCl₄²⁻'], color: '#64748b', desc: 'Two opposite lone pairs leave a square plane.' }
      ];

      var BOND_TYPES = [
        { name: 'Covalent (nonpolar)', diff: '0 – 0.4', icon: '⚛︎', examples: ['H₂', 'O₂', 'CH₄'], desc: 'Electrons shared roughly equally between atoms with similar electronegativity.' },
        { name: 'Covalent (polar)', diff: '0.4 – 1.7', icon: '⇌', examples: ['H₂O', 'HCl', 'NH₃'], desc: 'Electrons shared unevenly — one atom pulls more strongly; creates partial charges (δ+ / δ−).' },
        { name: 'Ionic', diff: '> 1.7', icon: '⊕⊖', examples: ['NaCl', 'KBr', 'MgO'], desc: 'Electron transferred from metal (low EN) to nonmetal (high EN); lattice held by electrostatic attraction.' },
        { name: 'Metallic', diff: 'N/A', icon: '⚜︎', examples: ['Cu', 'Fe', 'Au'], desc: 'Delocalized "sea of electrons" shared across cations; conducts heat/electricity, malleable.' },
        { name: 'Hydrogen bond', diff: 'intermolecular', icon: '⤬', examples: ['H₂O···H₂O', 'DNA base pairs'], desc: 'Strong dipole-dipole between H bonded to N/O/F and another lone pair. Not a true bond — but ~5-30 kJ/mol.' },
        { name: 'Coordinate covalent', diff: 'special', icon: '➡︎', examples: ['NH₄⁺', '[Cu(H₂O)₆]²⁺'], desc: 'Both shared electrons come from one atom. Common in transition-metal complexes.' },
        { name: 'Triple bond', diff: '3 pairs', icon: '☰', examples: ['N₂', 'C₂H₂', 'CO'], desc: 'Three shared electron pairs (1 σ + 2 π). Very strong (~945 kJ/mol for N≡N).' },
        { name: 'Double bond', diff: '2 pairs', icon: '═', examples: ['O₂', 'C=O', 'C=C'], desc: 'Two shared electron pairs (1 σ + 1 π). Restricts rotation around the bond axis.' }
      ];

      var IMF_TYPES = [
        { name: 'London dispersion', strength: '0.05 – 40 kJ/mol', symbol: '∼', present: 'All molecules', desc: 'Temporary dipoles from electron motion. Stronger for larger molecules / more polarizable atoms.', examples: ['Noble gases', 'Alkanes', 'I₂ vs F₂'] },
        { name: 'Dipole-dipole', strength: '5 – 25 kJ/mol', symbol: '↔', present: 'Polar molecules', desc: 'Permanent dipoles align δ+ to δ−. Stronger than dispersion at comparable size.', examples: ['HCl', 'CH₂Cl₂', 'acetone'] },
        { name: 'Hydrogen bond', strength: '5 – 50 kJ/mol', symbol: '⤬', present: 'H bonded to N/O/F + nearby lone pair', desc: 'Strongest dipole-dipole. Explains anomalous boiling points (H₂O vs H₂S).', examples: ['H₂O', 'NH₃', 'HF', 'DNA, proteins'] },
        { name: 'Ion-dipole', strength: '40 – 600 kJ/mol', symbol: '⊕↔', present: 'Ions dissolved in polar solvent', desc: 'Charge-dipole attraction. Drives ionic dissolution.', examples: ['Na⁺ in water', 'K⁺ in DMSO'] },
        { name: 'Ion-induced dipole', strength: '3 – 15 kJ/mol', symbol: '⊕→', present: 'Ion + nonpolar molecule', desc: 'Ion polarizes nearby nonpolar molecule.', examples: ['I⁻ + I₂ → I₃⁻'] },
        { name: 'π-π stacking', strength: '0 – 50 kJ/mol', symbol: '⇄', present: 'Aromatic rings', desc: 'Stacking attraction between aromatic π-clouds.', examples: ['benzene dimer', 'DNA base stacking'] }
      ];

      var COMMON_REACTIONS = [
        { type: 'Combustion', icon: '🔥', general: 'CₓHᵧ + O₂ → CO₂ + H₂O', example: 'CH₄ + 2 O₂ → CO₂ + 2 H₂O', enthalpy: '−890 kJ/mol (methane)', desc: 'Hydrocarbon burns in oxygen producing CO₂ + water. Exothermic.' },
        { type: 'Synthesis (combination)', icon: '➕', general: 'A + B → AB', example: '2 H₂ + O₂ → 2 H₂O', enthalpy: 'Usually exothermic', desc: 'Two or more reactants combine into one product.' },
        { type: 'Decomposition', icon: '➗', general: 'AB → A + B', example: '2 H₂O₂ → 2 H₂O + O₂', enthalpy: 'Often endothermic', desc: 'One reactant splits into multiple products.' },
        { type: 'Single replacement', icon: '⇄', general: 'A + BC → AC + B', example: 'Zn + CuSO₄ → ZnSO₄ + Cu', enthalpy: 'Varies', desc: 'More reactive element displaces a less reactive one from a compound.' },
        { type: 'Double replacement', icon: '↔', general: 'AB + CD → AD + CB', example: 'AgNO₃ + NaCl → AgCl + NaNO₃', enthalpy: 'Varies', desc: 'Cations and anions swap partners. Often produces precipitate, gas, or water.' },
        { type: 'Acid-base (neutralization)', icon: '⚖', general: 'HA + BOH → BA + H₂O', example: 'HCl + NaOH → NaCl + H₂O', enthalpy: '~ −56 kJ/mol', desc: 'Acid + base produces salt + water. Heat of neutralization is nearly constant for strong A+B.' },
        { type: 'Precipitation', icon: '💎', general: 'soluble + soluble → insoluble + soluble', example: 'AgNO₃(aq) + KCl(aq) → AgCl(s) + KNO₃(aq)', enthalpy: 'Driven by ΔS', desc: 'Two soluble ionic compounds form one insoluble product.' },
        { type: 'Redox (oxidation-reduction)', icon: '🔄', general: 'electrons transferred', example: 'Cu + 2 AgNO₃ → Cu(NO₃)₂ + 2 Ag', enthalpy: 'Varies', desc: 'One species loses electrons (oxidized), another gains (reduced). Many "everyday" reactions are redox.' },
        { type: 'Esterification', icon: '🌸', general: 'R-COOH + R\'-OH → R-COO-R\' + H₂O', example: 'CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O', enthalpy: '~ −20 kJ/mol', desc: 'Carboxylic acid + alcohol → ester + water. Reversible; H₂SO₄ catalyst commonly used.' },
        { type: 'Saponification', icon: '🧼', general: 'fat + base → soap + glycerol', example: '(C₁₇H₃₅COO)₃C₃H₅ + 3 NaOH → 3 C₁₇H₃₅COONa + C₃H₅(OH)₃', enthalpy: 'Exothermic', desc: 'Triglyceride hydrolyzed by strong base to make soap.' },
        { type: 'Polymerization', icon: '🧬', general: 'n monomer → polymer', example: 'n CH₂=CH₂ → (-CH₂-CH₂-)ₙ', enthalpy: 'Exothermic', desc: 'Many small monomers join into long polymer chains. Addition or condensation type.' },
        { type: 'Hydrolysis', icon: '💧', general: 'AB + H₂O → AH + BOH', example: 'sucrose + H₂O → glucose + fructose (catalyzed)', enthalpy: 'Varies', desc: 'Water splits a bond. Common for esters, polymers, ATP.' }
      ];

      var MOLECULE_LIBRARY = [
        { f: 'H₂O', name: 'Water', uses: 'Universal solvent. ~70% of body mass. Hydrogen bonding gives unique properties.', shape: 'bent', m: 18.02 },
        { f: 'CO₂', name: 'Carbon dioxide', uses: 'Photosynthesis input. Greenhouse gas. Carbonates dissolved in oceans.', shape: 'linear', m: 44.01 },
        { f: 'O₂', name: 'Oxygen', uses: '21% of atmosphere. Essential for aerobic respiration. Strong oxidizer.', shape: 'linear', m: 32.00 },
        { f: 'N₂', name: 'Nitrogen', uses: '78% of atmosphere. Triple bond makes it very stable. Fixed by bacteria + Haber process.', shape: 'linear', m: 28.02 },
        { f: 'CH₄', name: 'Methane', uses: 'Natural gas. Major greenhouse gas (25× CO₂ over 100 yr). Microbial methanogenesis.', shape: 'tetrahedral', m: 16.04 },
        { f: 'NH₃', name: 'Ammonia', uses: 'Fertilizer feedstock (Haber process). Cleaning agent. Refrigerant.', shape: 'pyramidal', m: 17.03 },
        { f: 'HCl', name: 'Hydrochloric acid', uses: 'Stomach acid (pH ~1.5). Industrial pickling. Strong monoprotic acid.', shape: 'linear', m: 36.46 },
        { f: 'NaCl', name: 'Sodium chloride', uses: 'Table salt. Essential electrolyte. Ionic lattice.', shape: 'ionic', m: 58.44 },
        { f: 'CaCO₃', name: 'Calcium carbonate', uses: 'Limestone, chalk, eggshells. Antacid. Building material.', shape: 'ionic', m: 100.09 },
        { f: 'H₂SO₄', name: 'Sulfuric acid', uses: '#1 industrial chemical by mass. Fertilizers, batteries, refining.', shape: 'tetrahedral', m: 98.08 },
        { f: 'HNO₃', name: 'Nitric acid', uses: 'Fertilizers, explosives, oxidation. Strong monoprotic acid.', shape: 'trigonal', m: 63.01 },
        { f: 'CH₃OH', name: 'Methanol', uses: 'Solvent. Fuel. Toxic to humans (causes blindness).', shape: 'tetrahedral', m: 32.04 },
        { f: 'C₂H₅OH', name: 'Ethanol', uses: 'Beverages, fuel additive, antiseptic. Hydrogen bonding raises BP.', shape: 'tetrahedral', m: 46.07 },
        { f: 'C₆H₁₂O₆', name: 'Glucose', uses: 'Primary energy source for cells. Photosynthesis product.', shape: 'cyclic', m: 180.16 },
        { f: 'C₁₂H₂₂O₁₁', name: 'Sucrose', uses: 'Table sugar. Disaccharide (glucose + fructose).', shape: 'disaccharide', m: 342.30 },
        { f: 'C₈H₁₀N₄O₂', name: 'Caffeine', uses: 'Adenosine receptor antagonist. Most-used psychoactive drug. Plant defense.', shape: 'planar', m: 194.19 },
        { f: 'C₉H₈O₄', name: 'Aspirin', uses: 'NSAID. Inhibits COX enzymes. Daily cardioprotection in low doses.', shape: 'planar', m: 180.16 },
        { f: 'C₇H₆O₃', name: 'Salicylic acid', uses: 'Topical acne treatment. Precursor to aspirin. Plant signaling.', shape: 'planar', m: 138.12 },
        { f: 'CHCl₃', name: 'Chloroform', uses: 'Solvent. Former anesthetic (now obsolete; toxic).', shape: 'tetrahedral', m: 119.38 },
        { f: 'CCl₄', name: 'Carbon tetrachloride', uses: 'Former cleaning solvent. Ozone-depleter; phased out.', shape: 'tetrahedral', m: 153.82 }
      ];

      var ACID_BASE_REF = [
        { name: 'Hydrochloric acid', formula: 'HCl', ka: '~10⁷', strength: 'Very strong', notes: 'Stomach acid; pH ~1' },
        { name: 'Sulfuric acid', formula: 'H₂SO₄', ka: '~10³ (first H)', strength: 'Very strong', notes: 'Diprotic; battery acid' },
        { name: 'Nitric acid', formula: 'HNO₃', ka: '~20', strength: 'Strong', notes: 'Oxidizing acid' },
        { name: 'Hydrofluoric acid', formula: 'HF', ka: '6.6 × 10⁻⁴', strength: 'Weak (but dangerous)', notes: 'Etches glass; causes deep tissue burns' },
        { name: 'Acetic acid', formula: 'CH₃COOH', ka: '1.8 × 10⁻⁵', strength: 'Weak', notes: 'Vinegar; pKa 4.76' },
        { name: 'Carbonic acid', formula: 'H₂CO₃', ka: '4.3 × 10⁻⁷', strength: 'Weak', notes: 'Soda water; CO₂ + H₂O' },
        { name: 'Ammonia', formula: 'NH₃', kb: '1.8 × 10⁻⁵', strength: 'Weak base', notes: 'Cleaning; conjugate of NH₄⁺' },
        { name: 'Sodium hydroxide', formula: 'NaOH', kb: '~10²⁰', strength: 'Very strong base', notes: 'Lye; pH ~14 at 1M' },
        { name: 'Potassium hydroxide', formula: 'KOH', kb: '~10²⁰', strength: 'Very strong base', notes: 'Caustic potash' },
        { name: 'Calcium hydroxide', formula: 'Ca(OH)₂', kb: 'limited solubility', strength: 'Strong base', notes: 'Slaked lime' },
        { name: 'Water (self)', formula: 'H₂O', kw: '1.0 × 10⁻¹⁴', strength: 'Amphoteric', notes: 'Kw at 25°C; both donates + accepts H⁺' },
        { name: 'Citric acid', formula: 'H₃C₆H₅O₇', ka1: '7.4 × 10⁻⁴', strength: 'Weak (triprotic)', notes: 'Citrus fruits; cleaning' }
      ];

      var QUANTUM_REF = [
        { n: 'Principal (n)', range: '1, 2, 3, ...', means: 'Shell / energy level. Larger n = farther from nucleus + higher energy.' },
        { n: 'Azimuthal (ℓ)', range: '0 to n−1', means: 'Subshell shape. ℓ=0→s (sphere), 1→p (dumbbell), 2→d (cloverleaf), 3→f (complex).' },
        { n: 'Magnetic (mₗ)', range: '−ℓ to +ℓ', means: 'Orbital orientation in space. 2ℓ+1 orbitals per subshell.' },
        { n: 'Spin (mₛ)', range: '+½ or −½', means: 'Intrinsic angular momentum. Pauli: no two electrons in same atom can have identical 4 quantum numbers.' }
      ];

      // ── Section render helpers ──
      function expHeader() {
        return React.createElement('div', { className: 'mt-6 mb-2 flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200' },
          React.createElement('div', null,
            React.createElement('h3', { className: 'text-base font-black text-indigo-900' }, '🧪 Chemistry Reference Library'),
            React.createElement('div', { className: 'text-[11px] text-indigo-700 mt-0.5' }, 'Interactive references — pick a topic below to explore.')
          ),
          expSection && React.createElement('button', {
            onClick: function() { setExp({ expSection: null }); },
            className: 'px-3 py-1 rounded-md text-xs font-bold bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-100'
          }, '✕ Close section')
        );
      }

      function expTabBar() {
        var sections = [
          { id: 'vsepr', label: 'VSEPR shapes', icon: '🔺' },
          { id: 'bonds', label: 'Bond types', icon: '⚛︎' },
          { id: 'imf', label: 'Intermolecular forces', icon: '↔' },
          { id: 'reactions', label: 'Reaction types', icon: '🔄' },
          { id: 'library', label: 'Molecule library', icon: '📚' },
          { id: 'acidbase', label: 'Acid/base', icon: '⚖' },
          { id: 'quantum', label: 'Quantum numbers', icon: '⚛︎' },
          { id: 'periodic', label: 'Periodic trends', icon: '📊' },
          { id: 'molarity', label: 'Molarity calc', icon: '🧮' },
          { id: 'stoich', label: 'Stoichiometry', icon: '⚖' },
          { id: 'phase', label: 'Phase diagram', icon: '🧊' },
          { id: 'equilibrium', label: 'Equilibrium', icon: '⇌' },
          { id: 'kinetics', label: 'Kinetics', icon: '⏱' },
          { id: 'thermo', label: 'Thermodynamics', icon: '🔥' },
          { id: 'polymers', label: 'Polymers', icon: '🧬' },
          { id: 'safety', label: 'Lab safety', icon: '🦺' },
          { id: 'gaslaws', label: 'Gas laws', icon: '💨' },
          { id: 'colligative', label: 'Colligative', icon: '🧂' },
          { id: 'redox', label: 'Redox', icon: '🔋' },
          { id: 'organic', label: 'Organic groups', icon: '🧪' },
          { id: 'spectro', label: 'Spectroscopy', icon: '📡' },
          { id: 'crystal', label: 'Crystal structures', icon: '💎' },
          { id: 'biochem', label: 'Biochemistry', icon: '🧬' },
          { id: 'environment', label: 'Atmospheric', icon: '🌫' },
          { id: 'nuclear', label: 'Nuclear chem', icon: '☢' },
          { id: 'electrochem', label: 'Electrochemistry', icon: '⚡' },
          { id: 'famous', label: 'History', icon: '🕰' },
          { id: 'lab', label: 'Lab techniques', icon: '🔬' },
          { id: 'medchem', label: 'Drug discovery', icon: '💊' },
          { id: 'food', label: 'Food chemistry', icon: '🍳' },
          { id: 'materials', label: 'Materials', icon: '🪨' },
          { id: 'inorganic', label: 'Inorganic chem', icon: '⚛' },
          { id: 'enviro2', label: 'Pollution', icon: '🏭' },
          { id: 'green', label: 'Green chemistry', icon: '🌱' },
          { id: 'mol_geo', label: 'Bond geometry', icon: '∡' },
          { id: 'isomers', label: 'Isomers', icon: '⇄' },
          { id: 'noble', label: 'Noble gases', icon: 'He' },
          { id: 'glossary', label: 'Glossary', icon: '📖' }
        ];
        return React.createElement('div', { className: 'flex flex-wrap gap-1.5 mb-3 p-2 rounded-lg bg-slate-50 border border-slate-200' },
          sections.map(function(s) {
            var active = expSection === s.id;
            return React.createElement('button', {
              key: s.id,
              onClick: function() { setExp({ expSection: active ? null : s.id }); },
              className: 'px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ' + (active ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-indigo-50 hover:border-indigo-300')
            }, s.icon + ' ' + s.label);
          })
        );
      }

      // ── Individual section renders ──
      function renderVseprSection() {
        var pickedId = d2.vseprPicked || VSEPR_GEOMETRIES[0].id;
        var picked = VSEPR_GEOMETRIES.filter(function(g) { return g.id === pickedId; })[0] || VSEPR_GEOMETRIES[0];

        // SVG diagram showing the central atom + bonds
        function svgGeometry(geo) {
          var size = 200;
          var cx = size/2, cy = size/2;
          var bondCount = geo.steric - geo.lone;
          var angles = [];
          if (geo.id === 'linear' || geo.id === 'linear5') angles = [0, 180];
          else if (geo.id === 'trigonal' || geo.id === 'bent3') angles = (geo.id === 'bent3' ? [90, 210, 330] : [90, 210, 330]);
          else if (geo.id === 'bent2') angles = [120, 60];
          else if (geo.id === 'tetrahedral' || geo.id === 'pyramidal') angles = [90, 210, 330, 30];
          else if (geo.id === 'tbp' || geo.id === 'seesaw' || geo.id === 'tshape') angles = [90, 30, 150, 180, 0];
          else if (geo.id === 'octahedral' || geo.id === 'sqpyramid' || geo.id === 'sqplane') angles = [0, 60, 120, 180, 240, 300];
          var bondsToShow = bondCount;
          return React.createElement('svg', { width: size, height: size, viewBox: '0 0 ' + size + ' ' + size, role: 'img', 'aria-label': geo.name + ' geometry' },
            React.createElement('circle', { cx: cx, cy: cy, r: 80, fill: 'none', stroke: '#e2e8f0', strokeDasharray: '2,3' }),
            angles.slice(0, bondsToShow).map(function(a, i) {
              var rad = (a - 90) * Math.PI / 180;
              var bx = cx + 70 * Math.cos(rad);
              var by = cy + 70 * Math.sin(rad);
              return React.createElement('g', { key: 'b'+i },
                React.createElement('line', { x1: cx, y1: cy, x2: bx, y2: by, stroke: geo.color, strokeWidth: 2.5 }),
                React.createElement('circle', { cx: bx, cy: by, r: 14, fill: '#fff', stroke: geo.color, strokeWidth: 2 }),
                React.createElement('text', { x: bx, y: by + 4, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: '#1e293b' }, 'X')
              );
            }),
            angles.slice(bondsToShow).map(function(a, i) {
              var rad = (a - 90) * Math.PI / 180;
              var bx = cx + 50 * Math.cos(rad);
              var by = cy + 50 * Math.sin(rad);
              return React.createElement('g', { key: 'l'+i, opacity: 0.6 },
                React.createElement('ellipse', { cx: bx, cy: by, rx: 16, ry: 8, fill: 'none', stroke: '#94a3b8', strokeDasharray: '3,2', transform: 'rotate(' + a + ' ' + bx + ' ' + by + ')' })
              );
            }),
            React.createElement('circle', { cx: cx, cy: cy, r: 18, fill: geo.color }),
            React.createElement('text', { x: cx, y: cy + 4, textAnchor: 'middle', fontSize: 13, fontWeight: 800, fill: '#fff' }, 'A')
          );
        }

        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔺 VSEPR — molecular geometry'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Valence Shell Electron Pair Repulsion theory predicts molecular shape from steric number (bonded + lone pairs around central atom). Lone pairs repel more strongly than bonded pairs, so they push bonds closer.'),
          React.createElement('div', { className: 'grid gap-3 grid-cols-1 md:grid-cols-3 mb-3' },
            React.createElement('div', { className: 'flex flex-col gap-1 md:col-span-1' },
              VSEPR_GEOMETRIES.map(function(g) {
                var sel = g.id === pickedId;
                return React.createElement('button', {
                  key: g.id,
                  onClick: function() { setExp({ vseprPicked: g.id }); },
                  className: 'text-left px-2.5 py-1.5 rounded-md text-[11px] font-bold border ' + (sel ? 'bg-indigo-100 border-indigo-400 text-indigo-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'),
                  style: { borderLeftWidth: 4, borderLeftColor: g.color }
                }, g.name);
              })
            ),
            React.createElement('div', { className: 'md:col-span-2 flex flex-col items-center' },
              svgGeometry(picked),
              React.createElement('div', { className: 'mt-2 text-center' },
                React.createElement('div', { className: 'text-sm font-black text-slate-800' }, picked.name),
                React.createElement('div', { className: 'text-[11px] text-slate-600' }, 'Steric ' + picked.steric + ' · ' + picked.lone + ' lone pair' + (picked.lone === 1 ? '' : 's') + ' · ' + picked.angle),
                React.createElement('div', { className: 'text-[12px] mt-2 text-slate-700' }, picked.desc),
                React.createElement('div', { className: 'text-[11px] text-slate-600 mt-1.5' }, 'Examples: ', picked.examples.join(', '))
              )
            )
          )
        );
      }

      function renderBondsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚛︎ Bond types — electronegativity difference'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Bond character ranges from purely covalent (equal sharing) to ionic (full electron transfer). The boundary is fuzzy — most real bonds have partial ionic character.'),
          React.createElement('div', { className: 'grid gap-2 grid-cols-1 md:grid-cols-2' },
            BOND_TYPES.map(function(b, i) {
              return React.createElement('div', { key: 'b'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-lg' }, b.icon),
                  React.createElement('span', { className: 'text-sm font-black text-slate-800' }, b.name),
                  React.createElement('span', { className: 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-700 ml-auto' }, 'ΔEN ' + b.diff)
                ),
                React.createElement('div', { className: 'text-[12px] text-slate-700 leading-relaxed mb-1' }, b.desc),
                React.createElement('div', { className: 'text-[11px] text-slate-600' }, 'Examples: ', b.examples.join(', '))
              );
            })
          )
        );
      }

      function renderImfSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '↔ Intermolecular forces (IMF)'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Forces BETWEEN molecules determine melting/boiling points, viscosity, solubility, and surface tension. Stronger IMF = higher BP.'),
          React.createElement('div', { className: 'space-y-2' },
            IMF_TYPES.map(function(f, i) {
              return React.createElement('div', { key: 'i'+i, className: 'p-3 rounded-lg bg-gradient-to-r from-slate-50 to-white border border-slate-200' },
                React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                  React.createElement('span', { className: 'text-xl text-indigo-600' }, f.symbol),
                  React.createElement('span', { className: 'text-sm font-black text-slate-800' }, f.name),
                  React.createElement('span', { className: 'text-[10px] font-bold ml-auto px-2 py-0.5 rounded bg-indigo-100 text-indigo-800' }, f.strength)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-600 mb-1' }, 'Present in: ', f.present),
                React.createElement('div', { className: 'text-[12px] text-slate-700 leading-relaxed mb-1' }, f.desc),
                React.createElement('div', { className: 'text-[11px] text-slate-600' }, 'Examples: ', f.examples.join(', '))
              );
            })
          ),
          React.createElement('div', { className: 'mt-3 p-2 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-900' },
            React.createElement('strong', null, '💡 Tip: '), 'For polar molecules, ALL applicable IMFs add up. Water has dispersion + dipole + H-bonding — that\'s why its BP is so high (100°C) compared to similar-mass H₂S (−60°C).'
          )
        );
      }

      function renderReactionsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔄 Reaction types'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Reactions fall into recognizable patterns. Knowing the type helps predict products + balance equations.'),
          React.createElement('div', { className: 'grid gap-2 grid-cols-1 md:grid-cols-2' },
            COMMON_REACTIONS.map(function(r, i) {
              return React.createElement('div', { key: 'r'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                  React.createElement('span', { className: 'text-xl' }, r.icon),
                  React.createElement('span', { className: 'text-sm font-black text-slate-800' }, r.type)
                ),
                React.createElement('div', { className: 'text-[11px] font-mono text-indigo-800 bg-indigo-50 px-2 py-1 rounded mb-1' }, r.general),
                React.createElement('div', { className: 'text-[11px] font-mono text-slate-700 bg-white px-2 py-1 rounded mb-1 border border-slate-200' }, r.example),
                React.createElement('div', { className: 'text-[11px] text-slate-600 mb-1' }, 'ΔH: ', r.enthalpy),
                React.createElement('div', { className: 'text-[12px] text-slate-700' }, r.desc)
              );
            })
          )
        );
      }

      function renderLibrarySection() {
        var search = (d2.libSearch || '').toLowerCase();
        var filtered = MOLECULE_LIBRARY.filter(function(m) {
          if (!search) return true;
          return m.f.toLowerCase().indexOf(search) >= 0 ||
                 m.name.toLowerCase().indexOf(search) >= 0 ||
                 m.uses.toLowerCase().indexOf(search) >= 0;
        });
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📚 Common molecule library'),
          React.createElement('input', {
            type: 'text',
            value: d2.libSearch || '',
            onChange: function(e) { setExp({ libSearch: e.target.value }); },
            placeholder: 'Search formula / name / use...',
            className: 'w-full px-3 py-1.5 rounded-md border border-slate-300 text-[12px] mb-3'
          }),
          React.createElement('div', { className: 'grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3' },
            filtered.map(function(m, i) {
              return React.createElement('div', { key: 'm'+i, className: 'p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline justify-between mb-1' },
                  React.createElement('span', { className: 'text-base font-black text-indigo-800 font-mono' }, m.f),
                  React.createElement('span', { className: 'text-[10px] text-slate-500' }, m.m + ' g/mol')
                ),
                React.createElement('div', { className: 'text-[12px] font-bold text-slate-800 mb-1' }, m.name),
                React.createElement('div', { className: 'text-[11px] text-slate-600 mb-1' }, 'Shape: ', m.shape),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-snug' }, m.uses)
              );
            })
          ),
          filtered.length === 0 && React.createElement('div', { className: 'text-center text-[11px] text-slate-500 py-4' }, 'No molecules match "', search, '"')
        );
      }

      function renderAcidBaseSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚖ Acid / base reference'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Strength = how completely an acid/base dissociates in water. Strong = ~100% (Ka >> 1). Weak = partial (Ka < 1). pH = −log[H⁺].'),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  React.createElement('th', { className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, 'Name'),
                  React.createElement('th', { className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, 'Formula'),
                  React.createElement('th', { className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, 'Ka/Kb'),
                  React.createElement('th', { className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, 'Strength'),
                  React.createElement('th', { className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, 'Notes')
                )
              ),
              React.createElement('tbody', null,
                ACID_BASE_REF.map(function(a, i) {
                  return React.createElement('tr', { key: 'a'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 text-slate-800 font-bold' }, a.name),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700 font-mono' }, a.formula),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700 font-mono' }, a.ka || a.kb || a.kw || a.ka1 || '—'),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700' }, a.strength),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600' }, a.notes)
                  );
                })
              )
            )
          ),
          React.createElement('div', { className: 'mt-3 p-2 rounded-md bg-blue-50 border border-blue-200 text-[11px] text-blue-900' },
            React.createElement('strong', null, '💡 pH scale: '), 'pH 0-6 acidic · pH 7 neutral · pH 8-14 basic. Each unit = 10× change in [H⁺]. Stomach acid pH 1.5, blood pH 7.4, bleach pH 12.'
          )
        );
      }

      function renderQuantumSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚛︎ Quantum numbers — orbital identity'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Each electron in an atom is described by 4 quantum numbers (n, ℓ, mₗ, mₛ). The Pauli exclusion principle: no two electrons in an atom share all 4.'),
          React.createElement('div', { className: 'grid gap-2' },
            QUANTUM_REF.map(function(q, i) {
              return React.createElement('div', { key: 'q'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                  React.createElement('span', { className: 'text-sm font-black text-slate-800' }, q.n),
                  React.createElement('span', { className: 'text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 ml-auto font-mono' }, q.range)
                ),
                React.createElement('div', { className: 'text-[12px] text-slate-700 leading-relaxed' }, q.means)
              );
            })
          ),
          React.createElement('div', { className: 'mt-3 grid grid-cols-4 gap-2 text-center' },
            ['s (ℓ=0)', 'p (ℓ=1)', 'd (ℓ=2)', 'f (ℓ=3)'].map(function(sub, i) {
              var orbitals = [1, 3, 5, 7][i];
              var electrons = orbitals * 2;
              return React.createElement('div', { key: 'o'+i, className: 'p-2 rounded-md bg-indigo-50 border border-indigo-200' },
                React.createElement('div', { className: 'text-xs font-black text-indigo-900' }, sub),
                React.createElement('div', { className: 'text-[10px] text-indigo-700 mt-0.5' }, orbitals + ' orbital' + (orbitals > 1 ? 's' : '')),
                React.createElement('div', { className: 'text-[10px] text-indigo-700' }, 'up to ' + electrons + ' e⁻')
              );
            })
          )
        );
      }

      // ── Full content for the remaining sections ──
      var PERIODIC_TRENDS = [
        { trend: 'Atomic radius', across: 'Decreases →', down: 'Increases ↓', why: 'Across: more protons, same shell, stronger pull → atoms shrink. Down: new shells, larger.', example: 'Li > Be > B > C > N > O > F (left to right shrink)' },
        { trend: 'Ionization energy (IE₁)', across: 'Increases →', down: 'Decreases ↓', why: 'Smaller atoms hold electrons tighter (closer to nucleus). Down: outer electrons farther + shielded.', example: 'He highest (2372 kJ/mol); Cs near lowest of stable atoms (376 kJ/mol)' },
        { trend: 'Electronegativity', across: 'Increases →', down: 'Decreases ↓', why: 'Pull on shared electrons. F most electronegative (3.98 Pauling).', example: 'F > O > N ≈ Cl > Br > I (pattern across periods 2-3)' },
        { trend: 'Electron affinity', across: 'Generally increases →', down: 'Generally decreases ↓', why: 'Energy released when atom gains an e⁻. Halogens very negative (eager to gain).', example: 'Cl most exothermic e⁻ gain (~ −349 kJ/mol)' },
        { trend: 'Metallic character', across: 'Decreases →', down: 'Increases ↓', why: 'Easy to lose electrons = metallic. Down a group, IE drops.', example: 'Group 1 all metals; Group 17 all nonmetals; metalloids on diagonal' },
        { trend: 'Atomic mass', across: 'Generally increases →', down: 'Increases ↓', why: 'Adding protons + neutrons. Exceptions where isotope ratios reverse (Te > I, Ar > K).', example: 'H (1.008) < He (4.003) < Li (6.94)... < U (238)' }
      ];

      var PHASE_POINTS = [
        { phase: 'Solid', shape: 'Fixed', volume: 'Fixed', density: 'High', particles: 'Vibrate in place; ordered (crystalline) or amorphous', examples: 'Ice, salt, diamond' },
        { phase: 'Liquid', shape: 'Container', volume: 'Fixed', density: 'High (~ solid)', particles: 'Move freely but stay close; short-range order', examples: 'Water, mercury, alcohol' },
        { phase: 'Gas', shape: 'Container', volume: 'Container', density: 'Very low', particles: 'Move freely + independently; mostly empty space', examples: 'O₂, CO₂, water vapor' },
        { phase: 'Plasma', shape: 'Container', volume: 'Container', density: 'Varies', particles: 'Ionized — electrons separated from nuclei', examples: 'Lightning, stars, fluorescent tubes' },
        { phase: 'BEC (Bose-Einstein)', shape: '—', volume: '—', density: 'Very low', particles: 'Atoms collapse into single quantum state near 0 K', examples: 'Cold atom physics labs (Rb, Na at nK)' }
      ];

      var EQUILIBRIUM_FACTORS = [
        { factor: 'Add reactant', shift: 'Forward (→)', why: 'Q < Keq; system uses extra reactant to make more product.' },
        { factor: 'Add product', shift: 'Reverse (←)', why: 'Q > Keq; system consumes extra product.' },
        { factor: 'Remove product', shift: 'Forward (→)', why: 'Q < Keq; system regenerates product.' },
        { factor: 'Increase T (exothermic rxn)', shift: 'Reverse (←)', why: 'Heat is a "product" of exothermic rxn; adding it shifts away.' },
        { factor: 'Increase T (endothermic rxn)', shift: 'Forward (→)', why: 'Heat is a "reactant" of endothermic rxn; adding it shifts forward.' },
        { factor: 'Decrease volume / ↑P (more gas mol on R)', shift: 'Reverse (←)', why: 'System shifts toward fewer gas moles to reduce pressure.' },
        { factor: 'Decrease volume / ↑P (more gas mol on L)', shift: 'Forward (→)', why: 'System shifts toward fewer gas moles to reduce pressure.' },
        { factor: 'Add catalyst', shift: 'No shift', why: 'Speeds both directions equally; reaches eq faster but doesn\'t change Keq.' },
        { factor: 'Add inert gas at constant V', shift: 'No shift', why: 'Partial pressures of reactants/products unchanged.' }
      ];

      var KINETICS_FACTORS = [
        { factor: 'Concentration', effect: 'Rate ∝ [reactants]^orders', detail: 'More molecules = more collisions / time. Determined experimentally, not from coefficients.' },
        { factor: 'Temperature', effect: 'Rate roughly doubles per 10°C', detail: 'Higher T → more molecules with energy ≥ Ea (Maxwell-Boltzmann tail).' },
        { factor: 'Surface area', effect: 'More SA = faster', detail: 'Grinding solid reactant exposes more atoms to collision. Powder vs chunk.' },
        { factor: 'Catalyst', effect: 'Lowers Ea, faster', detail: 'Provides alternate pathway. Not consumed. Enzymes are catalysts (often >10⁶× faster).' },
        { factor: 'Pressure (gas)', effect: 'Higher P = faster (gas)', detail: 'Same as concentration: more molecules per unit volume.' },
        { factor: 'Solvent / medium', effect: 'Polarity matches → faster', detail: '"Like dissolves like." Solvent can stabilize transition state.' },
        { factor: 'Light (photochemistry)', effect: 'Adds energy', detail: 'Some rxns need photons (photosynthesis, photographic film, UV-driven).' }
      ];

      var THERMO_KEY = [
        { sym: 'ΔH', name: 'Enthalpy change', sign: 'Negative = exothermic (heat released to surroundings); positive = endothermic (heat absorbed)', units: 'kJ/mol' },
        { sym: 'ΔS', name: 'Entropy change', sign: 'Positive = more disorder; negative = more order. Gas > liquid > solid.', units: 'J/(mol·K)' },
        { sym: 'ΔG', name: 'Gibbs free energy', sign: 'Negative = spontaneous; positive = non-spontaneous; zero = at equilibrium.', units: 'kJ/mol' },
        { sym: 'T', name: 'Temperature', sign: 'Absolute (Kelvin). Multiplies entropy term — high T amplifies ΔS importance.', units: 'K' },
        { sym: 'Ea', name: 'Activation energy', sign: 'Always positive. Barrier between reactants and products. Lower = faster.', units: 'kJ/mol' },
        { sym: 'K', name: 'Equilibrium constant', sign: 'K >> 1: products favored. K << 1: reactants favored. K = exp(−ΔG°/RT).', units: 'unitless' }
      ];

      var POLYMER_TYPES = [
        { name: 'Polyethylene (PE)', monomer: 'CH₂=CH₂', type: 'Addition', uses: 'Plastic bags, bottles, packaging. ~150M tons/year.', notes: 'LDPE (low density, branched) vs HDPE (high density, linear).' },
        { name: 'Polypropylene (PP)', monomer: 'CH₂=CHCH₃', type: 'Addition', uses: 'Yogurt cups, carpet fibers, car parts. Higher melting (160°C) than PE.', notes: 'Isotactic / atactic / syndiotactic configurations.' },
        { name: 'PVC', monomer: 'CH₂=CHCl', type: 'Addition', uses: 'Pipes, vinyl flooring, insulation. Often plasticized.', notes: 'Burning releases HCl + dioxins — recycling concern.' },
        { name: 'Polystyrene (PS)', monomer: 'CH₂=CHC₆H₅', type: 'Addition', uses: 'Disposable cups, packaging foam (Styrofoam).', notes: 'Hard + brittle. Slow biodegradation.' },
        { name: 'PET', monomer: 'terephthalic acid + ethylene glycol', type: 'Condensation', uses: 'Beverage bottles, polyester fiber, food packaging.', notes: 'Recyclable (#1); most widely recycled plastic.' },
        { name: 'Nylon-6,6', monomer: 'adipic acid + hexamethylenediamine', type: 'Condensation', uses: 'Stockings, ropes, fishing line, parachutes.', notes: 'Wallace Carothers, DuPont, 1935.' },
        { name: 'Kevlar', monomer: 'p-phenylenediamine + terephthaloyl chloride', type: 'Condensation', uses: 'Body armor, bicycle tires, aerospace.', notes: 'Aromatic polyamide; ring stacking gives extreme strength.' },
        { name: 'Polylactic acid (PLA)', monomer: 'lactic acid', type: 'Condensation', uses: '3D printing filament, biodegradable packaging.', notes: 'Made from corn starch / sugarcane. Compostable in industrial facilities.' },
        { name: 'Silicone', monomer: 'siloxane (Si-O backbone)', type: 'Condensation', uses: 'Medical implants, cookware, sealants, lubricants.', notes: 'Inorganic backbone — heat + UV resistant.' },
        { name: 'Rubber (natural)', monomer: 'isoprene', type: 'Addition', uses: 'Tires, gloves, elastic bands.', notes: 'Vulcanization with sulfur cross-links chains → harder, more elastic.' }
      ];

      var BIOPOLYMER_TYPES = [
        { name: 'Proteins', monomer: '20 amino acids', bond: 'Peptide bond (CO-NH)', role: 'Structure (collagen), catalysis (enzymes), transport (hemoglobin), signaling (hormones), immunity (antibodies).' },
        { name: 'DNA / RNA', monomer: 'nucleotides (base + sugar + phosphate)', bond: 'Phosphodiester', role: 'Genetic information storage + transfer. Double helix (DNA) / single strand (RNA).' },
        { name: 'Polysaccharides', monomer: 'monosaccharides (glucose, fructose)', bond: 'Glycosidic', role: 'Energy storage (starch, glycogen), structure (cellulose, chitin).' },
        { name: 'Lipids (fats)', monomer: 'glycerol + fatty acids (not strictly polymer)', bond: 'Ester', role: 'Energy storage, membranes (phospholipid bilayer), signaling, insulation.' }
      ];

      var LAB_SAFETY = [
        { cat: 'PPE (always)', items: ['Splash goggles (full coverage, not just safety glasses)', 'Lab coat or apron (closed front)', 'Closed-toe shoes (no sandals)', 'Long pants', 'Long hair tied back', 'Nitrile gloves for chemicals (latex for water-only work OK)'] },
        { cat: 'Acid + base handling', items: ['ALWAYS add acid TO water (never water TO acid)', 'Wash any spill immediately with copious water', 'Strong base spills feel slippery — that\'s saponification of your skin oils', 'Concentrated HF: special protocol — calcium gluconate gel nearby'] },
        { cat: 'Heat + flame', items: ['Bunsen burner: blue cone is hottest (~1500°C)', 'Never heat sealed container — explosion risk', 'Tongs / mitts for hot glassware', 'Allow glassware to cool before handling', 'Hot glass looks identical to cold glass'] },
        { cat: 'Glassware', items: ['Inspect for chips before use (broken edge = hand cut)', 'Don\'t force a stopper — use glycerin or twist gently', 'Pyrex / borosilicate handles thermal shock; common glass cracks', 'Broken glass goes in dedicated bin, not regular trash'] },
        { cat: 'Pipettes + volumetric', items: ['NEVER mouth-pipette (use bulb or pipette aid)', 'Read meniscus at eye level — bottom of curve for liquids that wet glass (water); top of curve for mercury', 'Volumetric flask: precise to "to contain" or "to deliver" marking'] },
        { cat: 'Fume hood', items: ['Use for: volatile organics, halogenated solvents, anything noxious', 'Sash low for protection', 'Don\'t store stuff inside — disrupts airflow', 'Check airflow indicator before starting'] },
        { cat: 'Reactive combinations', items: ['Strong oxidizer + organic = fire (chlorate + sugar, peroxide + alcohol)', 'Acid + bleach = chlorine gas (toxic)', 'Ammonia + bleach = chloramine gas (toxic)', 'Alkali metals (Na, K) + water = hydrogen gas + heat (can ignite)', 'Mercury + aluminum = aluminum amalgam (extreme corrosion of Al)'] },
        { cat: 'Emergency response', items: ['Eyewash within 10 seconds of any chemical station — 15 minutes of flushing for eye exposure', 'Safety shower nearby for chemical body spills', 'Fire blanket for clothing fires (drop + roll if no blanket)', 'Know location of nearest fire extinguisher + first-aid kit', 'Spill kits for acids / bases / organics — different absorbents'] },
        { cat: 'Documentation', items: ['Lab notebook in pen (no pencil)', 'Date every entry', 'Hazard codes on bottles (NFPA diamond)', 'MSDS / SDS for every chemical you use — read BEFORE using', 'Inventory current chemicals; segregate by hazard class'] }
      ];

      var GLOSSARY = [
        { term: 'Mole', def: 'Amount of substance containing 6.022 × 10²³ particles (Avogadro\'s number). Bridges atomic-scale to lab-scale.' },
        { term: 'Molar mass', def: 'Mass of one mole of a substance, in g/mol. Numerically equal to atomic/molecular mass in amu.' },
        { term: 'Avogadro\'s number', def: '6.022 × 10²³ — particles per mole. SI redefinition (2019) made it exact.' },
        { term: 'Atomic mass unit (amu / u)', def: 'Defined as 1/12 the mass of a ¹²C atom. ≈ 1.661 × 10⁻²⁴ g.' },
        { term: 'STP', def: 'Standard Temperature + Pressure. IUPAC: 0°C (273.15 K) + 100 kPa. Older: 0°C + 1 atm.' },
        { term: 'NTP', def: 'Normal Temperature + Pressure. 20°C + 1 atm. Used for room-temp gas calculations.' },
        { term: 'Ideal gas', def: 'PV = nRT. Approximation: no intermolecular forces, point particles. Good for low P, high T, non-polar molecules.' },
        { term: 'Real gas', def: 'Van der Waals: (P + a(n/V)²)(V − nb) = nRT. Accounts for IMF (a) and molecular volume (b).' },
        { term: 'Activation energy (Ea)', def: 'Minimum collision energy required for a reaction to proceed. Lower Ea = faster reaction.' },
        { term: 'Catalyst', def: 'Substance that speeds reaction without being consumed. Provides alternate lower-Ea pathway.' },
        { term: 'Allotrope', def: 'Different structural form of an element. O₂ vs O₃ vs O₄. Diamond vs graphite vs graphene vs C₆₀.' },
        { term: 'Isotope', def: 'Atoms of same element with different number of neutrons. Same chemistry, different mass + nuclear properties.' },
        { term: 'Ion', def: 'Atom or molecule with net charge from electron gain/loss. Cation (+), anion (−).' },
        { term: 'Electronegativity', def: 'Atom\'s ability to attract shared electrons in a bond. Pauling scale 0.7 (Cs) to 3.98 (F).' },
        { term: 'Hybrid orbital', def: 'Mixed atomic orbitals (sp, sp², sp³, sp³d, sp³d²) that explain observed bond angles.' },
        { term: 'Resonance structure', def: 'Two or more Lewis structures with same atom positions but different electron distributions. Actual structure is the average.' },
        { term: 'Functional group', def: 'Group of atoms responsible for characteristic reactivity (e.g., -OH alcohol, -COOH carboxylic acid, -NH₂ amine).' },
        { term: 'Chiral center', def: 'Atom (usually C) bonded to four different groups. Gives rise to optical isomers (enantiomers).' },
        { term: 'Stoichiometry', def: 'Quantitative relationships in chemical reactions, derived from balanced equation coefficients.' },
        { term: 'Limiting reactant', def: 'Reactant consumed first; determines maximum product. Calculate by dividing moles of each reactant by its coefficient — smallest wins.' },
        { term: 'Yield', def: 'Actual / theoretical × 100%. Real reactions never reach 100% due to side reactions, incomplete reactions, losses.' },
        { term: 'Buffer', def: 'Weak acid + conjugate base (or vice versa) that resists pH change when small amounts of acid/base added. Henderson-Hasselbalch: pH = pKa + log([A⁻]/[HA]).' }
      ];

      function renderPeriodicSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📊 Periodic trends'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Patterns in element properties that follow position on the periodic table. Driven by effective nuclear charge (Zeff) — the net pull on outermost electrons after inner electrons shield them.'),
          React.createElement('div', { className: 'space-y-2 mb-3' },
            PERIODIC_TRENDS.map(function(t, i) {
              return React.createElement('div', { key: 't'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-sm font-black text-slate-800 mb-1' }, t.trend),
                React.createElement('div', { className: 'grid grid-cols-2 gap-2 mb-1' },
                  React.createElement('div', { className: 'text-[11px] px-2 py-1 rounded bg-blue-50 border border-blue-200 text-blue-900' },
                    React.createElement('strong', null, 'Across period: '), t.across),
                  React.createElement('div', { className: 'text-[11px] px-2 py-1 rounded bg-purple-50 border border-purple-200 text-purple-900' },
                    React.createElement('strong', null, 'Down group: '), t.down)
                ),
                React.createElement('div', { className: 'text-[12px] text-slate-700 mb-1' }, React.createElement('strong', null, 'Why: '), t.why),
                React.createElement('div', { className: 'text-[11px] text-slate-600 italic' }, 'Example: ', t.example)
              );
            })
          ),
          React.createElement('div', { className: 'p-2 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-900' },
            React.createElement('strong', null, '💡 Diagonal relationship: '), 'Li-Mg, Be-Al, B-Si — pairs across a diagonal share similar properties because the increases in size + charge offset.'
          )
        );
      }

      function renderMolaritySection() {
        var c = d2.molM || '';
        var v = d2.molV || '';
        var mw = d2.molMW || '';
        var grams = (parseFloat(c) || 0) * (parseFloat(v) || 0) * (parseFloat(mw) || 0);
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🧮 Molarity + dilution calculator'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Molarity (M) = moles of solute per liter of solution. To prepare a target molarity: weigh out (M × V × MW) grams of solute, dissolve in less than the final volume, then dilute to the mark.'),
          React.createElement('div', { className: 'grid grid-cols-3 gap-3 mb-3' },
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-[11px] font-bold text-slate-700 mb-1' }, 'Molarity (M, mol/L)'),
              React.createElement('input', { type: 'number', step: 0.01, value: c, onChange: function(e) { setExp({ molM: e.target.value }); }, className: 'w-full px-2 py-1 border border-slate-300 rounded text-[12px]', placeholder: '0.1' })
            ),
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-[11px] font-bold text-slate-700 mb-1' }, 'Volume (L)'),
              React.createElement('input', { type: 'number', step: 0.01, value: v, onChange: function(e) { setExp({ molV: e.target.value }); }, className: 'w-full px-2 py-1 border border-slate-300 rounded text-[12px]', placeholder: '1.0' })
            ),
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-[11px] font-bold text-slate-700 mb-1' }, 'Molecular weight (g/mol)'),
              React.createElement('input', { type: 'number', step: 0.01, value: mw, onChange: function(e) { setExp({ molMW: e.target.value }); }, className: 'w-full px-2 py-1 border border-slate-300 rounded text-[12px]', placeholder: '58.44 (NaCl)' })
            )
          ),
          React.createElement('div', { className: 'p-3 rounded-lg bg-indigo-50 border-2 border-indigo-300 text-center mb-3' },
            React.createElement('div', { className: 'text-[10px] font-bold text-indigo-700 uppercase tracking-wide' }, 'Grams of solute needed'),
            React.createElement('div', { className: 'text-2xl font-black text-indigo-900 mt-1 font-mono' }, grams.toFixed(4) + ' g')
          ),
          React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed space-y-1' },
            React.createElement('div', null, React.createElement('strong', null, 'Dilution: '), 'M₁V₁ = M₂V₂. Solve for whichever is unknown.'),
            React.createElement('div', null, React.createElement('strong', null, 'Serial dilution: '), 'For very low concentrations, dilute 1:10 (or 1:100) repeatedly. Each step is precise; cumulative error stays small.'),
            React.createElement('div', null, React.createElement('strong', null, 'Watch out: '), 'Add ~half the water FIRST, then add solute + stir until dissolved, THEN top up to the mark. Adding solute to full-volume water often gives wrong final volume due to volume changes during dissolution.')
          )
        );
      }

      function renderStoichSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚖ Stoichiometry — recipe math'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Balanced equation → mole ratio. Like a cooking recipe, but for atoms. Coefficients tell you the ratio of reactant moles to product moles.'),
          React.createElement('div', { className: 'space-y-2' },
            [
              { step: '1. Balance the equation', detail: 'Atoms in = atoms out, on each side. Balance metals first, then non-O/H atoms, then O and H last. Charge balanced for ionic equations.' },
              { step: '2. Identify mole ratios', detail: 'From coefficients: 2 H₂ + 1 O₂ → 2 H₂O means 2 mol H₂ : 1 mol O₂ : 2 mol H₂O.' },
              { step: '3. Convert grams ↔ moles', detail: 'mol = g / molar mass. Always work in moles when comparing across the equation.' },
              { step: '4. Find limiting reactant', detail: 'For each reactant: (moles available) / (coefficient). Smallest result = limiting reactant.' },
              { step: '5. Calculate theoretical yield', detail: 'Use limiting reactant\'s moles × (product coefficient / limiting coefficient) × product MW.' },
              { step: '6. Calculate % yield', detail: 'Actual / Theoretical × 100. Real reactions rarely hit 100% — losses to side reactions, incomplete rxn, transfer losses.' }
            ].map(function(s, i) {
              return React.createElement('div', { key: 's'+i, className: 'flex gap-3 p-2 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-sm font-black text-indigo-700 min-w-[18px]' }, (i + 1)),
                React.createElement('div', null,
                  React.createElement('div', { className: 'text-[12px] font-bold text-slate-800' }, s.step),
                  React.createElement('div', { className: 'text-[11px] text-slate-700 mt-0.5' }, s.detail)
                )
              );
            })
          ),
          React.createElement('div', { className: 'mt-3 p-3 rounded-md bg-emerald-50 border border-emerald-200' },
            React.createElement('div', { className: 'text-[11px] font-bold text-emerald-800 mb-1' }, '🔢 Worked example'),
            React.createElement('div', { className: 'text-[12px] text-emerald-900 font-mono leading-relaxed' },
              'N₂ + 3 H₂ → 2 NH₃', React.createElement('br'),
              '28 g N₂ + 6 g H₂ → ? g NH₃', React.createElement('br'),
              '1.00 mol N₂ + 3.00 mol H₂', React.createElement('br'),
              'Ratio: N₂/1 = 1.00; H₂/3 = 1.00 → tie, neither limits', React.createElement('br'),
              '→ 2.00 mol NH₃ × 17.03 g/mol = 34.06 g (theoretical)'
            )
          )
        );
      }

      function renderPhaseSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🧊 Phases of matter + phase diagrams'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'A phase diagram plots phase boundaries on a P (pressure) vs T (temperature) graph. Lines = phase transitions. Triple point: all three phases coexist. Critical point: liquid + gas become indistinguishable (supercritical fluid).'),
          React.createElement('div', { className: 'overflow-x-auto mb-3' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Phase', 'Shape', 'Volume', 'Density', 'Particles', 'Examples'].map(function(h, i) {
                    return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, h);
                  })
                )
              ),
              React.createElement('tbody', null,
                PHASE_POINTS.map(function(p, i) {
                  return React.createElement('tr', { key: 'p'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 text-slate-800 font-bold' }, p.phase),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700' }, p.shape),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700' }, p.volume),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700' }, p.density),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700' }, p.particles),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 italic' }, p.examples)
                  );
                })
              )
            )
          ),
          React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
            React.createElement('div', { className: 'p-2.5 rounded-md bg-blue-50 border border-blue-200 text-[11px] text-blue-900' },
              React.createElement('strong', null, '💧 Water is unusual: '), 'Ice is LESS dense than liquid water (ice floats). Most substances: solid denser than liquid. Hydrogen bonding gives ice its open crystal structure.'
            ),
            React.createElement('div', { className: 'p-2.5 rounded-md bg-purple-50 border border-purple-200 text-[11px] text-purple-900' },
              React.createElement('strong', null, '🌬 Sublimation: '), 'Solid → gas without going through liquid (CO₂ dry ice; iodine at room temp). Reverse: deposition.'
            )
          )
        );
      }

      function renderEquilibriumSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⇌ Chemical equilibrium + Le Chatelier'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Reversible reactions reach dynamic equilibrium when forward rate = reverse rate. Concentrations stop changing (but reactions keep going both ways). Keq = product of [products]^coefficients / product of [reactants]^coefficients.'),
          React.createElement('div', { className: 'p-3 rounded-lg bg-indigo-50 border border-indigo-300 mb-3' },
            React.createElement('div', { className: 'text-[11px] font-bold text-indigo-800 mb-1' }, 'Le Chatelier\'s principle'),
            React.createElement('div', { className: 'text-[12px] text-indigo-900 leading-relaxed' }, 'If a stress is applied to a system at equilibrium, the system shifts to relieve that stress. Predict the direction of shift to make sense of how rxns respond to changes.')
          ),
          React.createElement('div', { className: 'space-y-1.5' },
            EQUILIBRIUM_FACTORS.map(function(f, i) {
              return React.createElement('div', { key: 'eq'+i, className: 'flex items-center gap-2 p-2 rounded-md bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[11px] font-bold text-slate-700 min-w-[200px]' }, f.factor),
                React.createElement('div', { className: 'text-[11px] font-black text-indigo-700 min-w-[110px] font-mono' }, f.shift),
                React.createElement('div', { className: 'text-[11px] text-slate-600 flex-1' }, f.why)
              );
            })
          )
        );
      }

      function renderKineticsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⏱ Reaction kinetics — what controls speed'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Kinetics = how fast. Thermodynamics = whether possible. A reaction can be very favorable (large negative ΔG) but slow (high Ea). Catalysts and conditions tune kinetics.'),
          React.createElement('div', { className: 'space-y-2 mb-3' },
            KINETICS_FACTORS.map(function(k, i) {
              return React.createElement('div', { key: 'k'+i, className: 'p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline justify-between mb-1' },
                  React.createElement('span', { className: 'text-sm font-black text-slate-800' }, k.factor),
                  React.createElement('span', { className: 'text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800' }, k.effect)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, k.detail)
              );
            })
          ),
          React.createElement('div', { className: 'p-3 rounded-md bg-emerald-50 border border-emerald-200' },
            React.createElement('div', { className: 'text-[11px] font-bold text-emerald-800 mb-1' }, '📐 Arrhenius equation'),
            React.createElement('div', { className: 'text-[12px] text-emerald-900 font-mono leading-relaxed mb-1' }, 'k = A · exp(−Ea / RT)'),
            React.createElement('div', { className: 'text-[11px] text-emerald-800 leading-relaxed' },
              'k = rate constant · A = collision frequency factor · Ea = activation energy · R = 8.314 J/(mol·K) · T = absolute temperature (K). Plot ln(k) vs 1/T; slope = −Ea/R.'
            )
          )
        );
      }

      function renderThermoSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔥 Thermodynamics — what\'s spontaneous'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Spontaneity = whether a reaction proceeds on its own (regardless of speed). Gibbs free energy ΔG tells us: negative = spontaneous; positive = not; zero = at equilibrium.'),
          React.createElement('div', { className: 'p-3 rounded-lg bg-orange-50 border-2 border-orange-300 mb-3 text-center' },
            React.createElement('div', { className: 'text-[10px] font-bold text-orange-700 uppercase tracking-wide mb-1' }, 'Master equation'),
            React.createElement('div', { className: 'text-2xl font-black text-orange-900 font-mono' }, 'ΔG = ΔH − TΔS')
          ),
          React.createElement('div', { className: 'space-y-2 mb-3' },
            THERMO_KEY.map(function(t, i) {
              return React.createElement('div', { key: 'th'+i, className: 'p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-sm font-black text-slate-800 font-mono' }, t.sym),
                  React.createElement('span', { className: 'text-[12px] font-bold text-slate-700' }, t.name),
                  React.createElement('span', { className: 'text-[10px] text-slate-500 ml-auto' }, t.units)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, t.sign)
              );
            })
          ),
          React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
            React.createElement('div', { className: 'p-2.5 rounded-md bg-red-50 border border-red-200 text-[11px] text-red-900' },
              React.createElement('strong', null, '🔥 Exothermic (ΔH < 0): '), 'Combustion, neutralization, condensation. Heat released to surroundings.'
            ),
            React.createElement('div', { className: 'p-2.5 rounded-md bg-blue-50 border border-blue-200 text-[11px] text-blue-900' },
              React.createElement('strong', null, '🧊 Endothermic (ΔH > 0): '), 'Photosynthesis, melting, evaporation, cold packs. Heat absorbed from surroundings.'
            )
          )
        );
      }

      function renderPolymersSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🧬 Polymers + biopolymers'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Long chains of repeating units (monomers). Addition polymers form by C=C double bonds opening up. Condensation polymers form by losing water (or other small molecule) at each link.'),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-800 mt-2 mb-1' }, 'Synthetic polymers'),
          React.createElement('div', { className: 'space-y-1.5 mb-3' },
            POLYMER_TYPES.map(function(p, i) {
              return React.createElement('div', { key: 'p'+i, className: 'p-2 rounded-md bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, p.name),
                  React.createElement('span', { className: 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800' }, p.type),
                  React.createElement('span', { className: 'text-[10px] font-mono text-slate-600 ml-auto' }, p.monomer)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 mb-0.5' }, p.uses),
                React.createElement('div', { className: 'text-[10px] text-slate-500 italic' }, p.notes)
              );
            })
          ),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-800 mt-3 mb-1' }, 'Biopolymers (biological macromolecules)'),
          React.createElement('div', { className: 'space-y-1.5' },
            BIOPOLYMER_TYPES.map(function(p, i) {
              return React.createElement('div', { key: 'b'+i, className: 'p-2 rounded-md bg-emerald-50 border border-emerald-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-[12px] font-black text-emerald-900' }, p.name),
                  React.createElement('span', { className: 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-emerald-300 text-emerald-800 ml-auto' }, p.bond)
                ),
                React.createElement('div', { className: 'text-[11px] text-emerald-800 mb-0.5' }, React.createElement('strong', null, 'Monomer: '), p.monomer),
                React.createElement('div', { className: 'text-[11px] text-emerald-900' }, p.role)
              );
            })
          )
        );
      }

      function renderSafetySection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🦺 Lab safety basics'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Most lab accidents are preventable. The biggest factors: PPE, attention, and not mixing things that shouldn\'t mix. Always read the SDS (Safety Data Sheet) for each chemical before using it.'),
          React.createElement('div', { className: 'space-y-2' },
            LAB_SAFETY.map(function(s, i) {
              return React.createElement('div', { key: 's'+i, className: 'p-3 rounded-lg bg-amber-50 border border-amber-300' },
                React.createElement('div', { className: 'text-[12px] font-black text-amber-900 mb-1.5' }, s.cat),
                React.createElement('ul', { className: 'text-[11px] text-amber-900 leading-relaxed space-y-0.5 list-disc pl-4' },
                  s.items.map(function(item, j) {
                    return React.createElement('li', { key: 'i'+j }, item);
                  })
                )
              );
            })
          )
        );
      }

      function renderGlossarySection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📖 Chemistry glossary'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Common chemistry terms students mix up. Bookmarkable reference for vocabulary.'),
          React.createElement('div', { className: 'space-y-1' },
            GLOSSARY.map(function(g, i) {
              return React.createElement('div', { key: 'g'+i, className: 'p-2 rounded-md bg-slate-50 border-l-4 border-l-indigo-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-indigo-900' }, g.term),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, g.def)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 2 EXPANSION — Additional reference sections (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var GAS_LAWS = [
        { name: 'Boyle\'s Law', formula: 'P₁V₁ = P₂V₂', plain: 'Pressure and volume are inversely related at constant temperature.', example: 'Compress a syringe → pressure rises. Push 50 mL down to 25 mL at constant T → pressure doubles.', year: 1662 },
        { name: 'Charles\'s Law', formula: 'V₁/T₁ = V₂/T₂', plain: 'Volume and absolute temperature are directly proportional at constant pressure.', example: 'Heat a balloon → it expands. Heating from 273 K to 546 K doubles volume.', year: 1787 },
        { name: 'Gay-Lussac\'s Law', formula: 'P₁/T₁ = P₂/T₂', plain: 'Pressure and absolute temperature are directly proportional at constant volume.', example: 'Heat a sealed gas can → pressure rises (and may explode!).', year: 1802 },
        { name: 'Avogadro\'s Law', formula: 'V₁/n₁ = V₂/n₂', plain: 'Equal volumes of gas at same T and P contain equal numbers of molecules.', example: '22.4 L of any ideal gas at STP contains 1 mole (6.022×10²³ molecules).', year: 1811 },
        { name: 'Combined Gas Law', formula: 'P₁V₁/T₁ = P₂V₂/T₂', plain: 'Combines Boyle\'s, Charles\'s, and Gay-Lussac\'s laws.', example: 'Tracking a weather balloon as it rises (T drops, P drops, V grows).', year: 1834 },
        { name: 'Ideal Gas Law', formula: 'PV = nRT', plain: 'Relates pressure, volume, moles, and temperature using the gas constant R.', example: 'R = 0.0821 L·atm/(mol·K). 1 mol gas at 1 atm, 273 K occupies 22.4 L.', year: 1834 },
        { name: 'Dalton\'s Law of Partial Pressures', formula: 'P_total = P₁ + P₂ + P₃ + ...', plain: 'Total pressure of a gas mixture = sum of partial pressures.', example: 'Atmosphere: ~78% N₂ (0.78 atm) + ~21% O₂ (0.21 atm) + trace gases = 1 atm.', year: 1801 },
        { name: 'Graham\'s Law of Effusion', formula: 'rate₁/rate₂ = √(M₂/M₁)', plain: 'Lighter gases effuse faster than heavier gases.', example: 'H₂ (M=2) effuses 4× faster than O₂ (M=32). √(32/2) = 4.', year: 1848 },
        { name: 'Henry\'s Law', formula: 'C = k·P', plain: 'Solubility of a gas in liquid is proportional to its partial pressure above the liquid.', example: 'Open a soda bottle → CO₂ partial pressure drops → CO₂ comes out of solution → fizz.', year: 1803 },
        { name: 'Van der Waals equation', formula: '(P + a/V²)(V − b) = nRT', plain: 'Modifies ideal gas law to account for real gas behavior (intermolecular attractions + molecular volume).', example: 'Real gases deviate at high P and low T. CO₂ has a=3.6, b=0.043.', year: 1873 }
      ];

      var COLLIGATIVE_PROPS = [
        { prop: 'Vapor pressure lowering', formula: 'ΔP = X_solute · P°_solvent', plain: 'Adding a nonvolatile solute lowers vapor pressure of the solvent.', example: 'Salt water has lower vapor pressure than pure water.' },
        { prop: 'Boiling point elevation', formula: 'ΔTb = i·Kb·m', plain: 'Solute raises boiling point. Kb depends on solvent; m is molality; i is van\'t Hoff factor.', example: 'Salt in pasta water → slightly higher boiling point (~0.5°C for 1% NaCl).' },
        { prop: 'Freezing point depression', formula: 'ΔTf = i·Kf·m', plain: 'Solute lowers freezing point. Why we salt icy roads.', example: 'NaCl + water → freezing point drops to as low as −21°C (eutectic at 23% NaCl).' },
        { prop: 'Osmotic pressure', formula: 'π = iMRT', plain: 'Pressure needed to stop osmotic flow across semipermeable membrane. M = molarity.', example: 'Blood ≈ 7.7 atm osmotic pressure. IV fluids must be isotonic (~0.9% saline).' }
      ];

      var REDOX_PAIRS = [
        { half: 'F₂ + 2e⁻ → 2F⁻', e0: '+2.87 V', notes: 'Strongest oxidizer in this list. F₂ is extremely reactive.' },
        { half: 'O₃ + 2H⁺ + 2e⁻ → O₂ + H₂O', e0: '+2.07 V', notes: 'Ozone — strong oxidizer used in water treatment.' },
        { half: 'H₂O₂ + 2H⁺ + 2e⁻ → 2H₂O', e0: '+1.78 V', notes: 'Hydrogen peroxide as oxidizer.' },
        { half: 'MnO₄⁻ + 8H⁺ + 5e⁻ → Mn²⁺ + 4H₂O', e0: '+1.51 V', notes: 'Permanganate in acid — vivid purple to nearly colorless.' },
        { half: 'Cl₂ + 2e⁻ → 2Cl⁻', e0: '+1.36 V', notes: 'Chlorine as oxidizer — water treatment, bleaching.' },
        { half: 'O₂ + 4H⁺ + 4e⁻ → 2H₂O', e0: '+1.23 V', notes: 'Why oxygen is corrosive to metals over time.' },
        { half: 'Ag⁺ + e⁻ → Ag', e0: '+0.80 V', notes: 'Silver ion easily reduced. Silver mirror test.' },
        { half: 'Cu²⁺ + 2e⁻ → Cu', e0: '+0.34 V', notes: 'Reference for "noble" metals.' },
        { half: '2H⁺ + 2e⁻ → H₂', e0: '0.00 V', notes: 'Defined as zero — Standard Hydrogen Electrode (SHE).' },
        { half: 'Fe²⁺ + 2e⁻ → Fe', e0: '−0.44 V', notes: 'Iron is more easily oxidized than copper → rust.' },
        { half: 'Zn²⁺ + 2e⁻ → Zn', e0: '−0.76 V', notes: 'Zinc anode in batteries. Sacrificial anode for ships.' },
        { half: 'Al³⁺ + 3e⁻ → Al', e0: '−1.66 V', notes: 'Aluminum is very reactive; protected by Al₂O₃ surface layer.' },
        { half: 'Mg²⁺ + 2e⁻ → Mg', e0: '−2.37 V', notes: 'Used as sacrificial anode for buried steel pipes.' },
        { half: 'Na⁺ + e⁻ → Na', e0: '−2.71 V', notes: 'Sodium very easily oxidized → must store under oil.' },
        { half: 'Li⁺ + e⁻ → Li', e0: '−3.04 V', notes: 'Strongest reducer of metals shown. Li-ion batteries use this potential.' }
      ];

      var ORGANIC_GROUPS = [
        { name: 'Alkane', formula: 'R–H (single bonds only)', example: 'Methane CH₄, Ethane C₂H₆', notes: 'Saturated. Unreactive baseline. Combust to CO₂ + H₂O.' },
        { name: 'Alkene', formula: 'R–CH=CH–R', example: 'Ethene C₂H₄ (ethylene)', notes: 'C=C double bond. Reactive at the double bond. Plant ripening hormone.' },
        { name: 'Alkyne', formula: 'R–C≡C–R', example: 'Ethyne C₂H₂ (acetylene)', notes: 'Triple bond. Welding torches burn acetylene + O₂ → ~3,500°C.' },
        { name: 'Alcohol', formula: 'R–OH', example: 'Methanol CH₃OH, Ethanol C₂H₅OH', notes: 'Hydroxyl group. Polar, can H-bond. Beverages, fuels, antiseptics.' },
        { name: 'Ether', formula: 'R–O–R', example: 'Diethyl ether (C₂H₅)₂O', notes: 'Oxygen bridge. Historically used as anesthetic.' },
        { name: 'Aldehyde', formula: 'R–CHO', example: 'Formaldehyde HCHO', notes: 'C=O at end of chain. Preservatives. Vanilla flavor (vanillin).' },
        { name: 'Ketone', formula: 'R–CO–R', example: 'Acetone (CH₃)₂CO', notes: 'C=O in middle of chain. Nail polish remover.' },
        { name: 'Carboxylic acid', formula: 'R–COOH', example: 'Acetic acid CH₃COOH', notes: '–COOH. Acidic. Vinegar (acetic), citrus (citric), aspirin (salicylic).' },
        { name: 'Ester', formula: 'R–COO–R', example: 'Ethyl acetate CH₃COOC₂H₅', notes: 'Carboxylic acid + alcohol. Fruity smells (banana ester, pineapple ester).' },
        { name: 'Amine', formula: 'R–NH₂', example: 'Methylamine CH₃NH₂', notes: 'Nitrogen with lone pair. Basic. Fishy smells, neurotransmitters.' },
        { name: 'Amide', formula: 'R–CONH₂', example: 'Acetamide CH₃CONH₂', notes: 'C=O attached to N. Peptide bonds in proteins.' },
        { name: 'Nitrile', formula: 'R–C≡N', example: 'Acetonitrile CH₃CN', notes: 'Cyanide group. Some plant defenses (amygdalin in almonds).' },
        { name: 'Thiol (mercaptan)', formula: 'R–SH', example: 'Methanethiol CH₃SH', notes: 'Sulfur analog of alcohol. STRONG smell — added to natural gas as warning.' },
        { name: 'Aromatic (arene)', formula: 'Benzene ring C₆H₆', example: 'Benzene, toluene, naphthalene', notes: 'Delocalized π electrons. Stable. Coal tar, mothballs.' }
      ];

      var SPECTRO_METHODS = [
        { name: 'UV-Vis spectroscopy', range: '200–800 nm', detects: 'Electronic transitions; conjugated π systems, transition metal complexes', use: 'Concentration via Beer\'s law (A = εbc); color of compounds.' },
        { name: 'IR (infrared) spectroscopy', range: '2.5–25 μm (4000–400 cm⁻¹)', detects: 'Molecular vibrations; functional groups', use: '–OH (~3300, broad), C=O (~1700), C≡N (~2250). Identifies functional groups.' },
        { name: '¹H NMR (proton NMR)', range: 'Radio (MHz)', detects: 'Hydrogen environments', use: 'Counts H atoms in different environments. Chemical shift + splitting → structure.' },
        { name: '¹³C NMR', range: 'Radio (MHz)', detects: 'Carbon framework', use: 'Counts unique C environments. ¹³C is only 1.1% natural abundance.' },
        { name: 'Mass spectrometry (MS)', range: 'm/z', detects: 'Mass-to-charge ratio of ions', use: 'Molecular weight + fragmentation pattern → structure. Drug testing, forensics.' },
        { name: 'X-ray crystallography', range: 'X-ray (~1 Å)', detects: '3D atomic positions in crystal', use: 'Determines exact molecular geometry. Used to solve DNA structure (1953).' },
        { name: 'Raman spectroscopy', range: 'Vis to NIR laser', detects: 'Vibrational modes (complementary to IR)', use: 'Detects symmetric vibrations that IR misses. Useful for inorganic compounds, water-containing samples.' },
        { name: 'Atomic absorption (AAS)', range: 'UV-Vis', detects: 'Specific metal elements', use: 'Each element absorbs at characteristic wavelength. Water quality, blood lead testing.' },
        { name: 'Fluorescence spectroscopy', range: 'UV → Vis', detects: 'Excited state emission', use: 'GFP (green fluorescent protein) tracking in biology. Forensics (luminol).' },
        { name: 'EPR (electron paramagnetic resonance)', range: 'Microwave', detects: 'Unpaired electrons (radicals)', use: 'Free radical research, transition metal complexes.' }
      ];

      var CRYSTAL_STRUCTURES = [
        { name: 'Simple cubic', coord: 6, packing: '52.4%', example: 'Polonium (rare)', notes: 'Atoms only at corners of cube. Inefficient packing.' },
        { name: 'Body-centered cubic (BCC)', coord: 8, packing: '68.0%', example: 'Iron (α), W, Mo, Cr', notes: 'Atom at corners + one in center.' },
        { name: 'Face-centered cubic (FCC) / Cubic close-packed', coord: 12, packing: '74.0%', example: 'Cu, Ag, Au, Al, Pb, Ni', notes: 'Most efficient cubic packing. ABCABC layer sequence.' },
        { name: 'Hexagonal close-packed (HCP)', coord: 12, packing: '74.0%', example: 'Mg, Zn, Ti, Co', notes: 'Same efficiency as FCC but ABAB sequence. Different mechanical properties.' },
        { name: 'Diamond cubic', coord: 4, packing: '34.0%', example: 'C (diamond), Si, Ge', notes: 'Each atom bonded to 4 neighbors tetrahedrally.' },
        { name: 'Sodium chloride (rock salt)', coord: '6 (each ion)', packing: '~67% (ionic)', example: 'NaCl, KCl, MgO', notes: 'FCC of Cl⁻ with Na⁺ in octahedral holes.' },
        { name: 'Cesium chloride', coord: '8 (each ion)', packing: '~73% (ionic)', example: 'CsCl, CsBr, CsI', notes: 'Simple cubic of Cl⁻ with Cs⁺ at body center.' },
        { name: 'Zinc blende (sphalerite)', coord: '4 (each ion)', packing: '~50% (ionic)', example: 'ZnS, GaAs, CdTe', notes: 'FCC of S²⁻ with Zn²⁺ in half the tetrahedral holes.' },
        { name: 'Wurtzite', coord: '4 (each ion)', packing: '~50% (ionic)', example: 'ZnS (high-T form), ZnO, AlN', notes: 'HCP analog of zinc blende.' },
        { name: 'Fluorite', coord: 'Ca: 8, F: 4', packing: '~75%', example: 'CaF₂, UO₂, ZrO₂', notes: 'FCC of cations with anions in all tetrahedral holes.' },
        { name: 'Perovskite', coord: 'varies', packing: 'varies', example: 'CaTiO₃, BaTiO₃, organic-inorganic hybrids', notes: 'ABX₃ structure. Hot in solar cell research (perovskite solar cells).' },
        { name: 'Graphite', coord: 3, packing: 'layered (sparse)', example: 'C (graphite)', notes: 'Hexagonal layers held by weak van der Waals → slippery, soft.' }
      ];

      var BIOCHEM_MOLECULES = [
        { class: 'Amino acid', example: 'Glycine, Alanine, Lysine', formula: 'H₂N–CHR–COOH', notes: '20 standard amino acids. Side chain (R) determines polarity, charge, special features.' },
        { class: 'Protein', example: 'Hemoglobin, insulin, collagen', formula: 'Polymer of amino acids via peptide bonds (–CONH–)', notes: 'Primary→secondary (α-helix, β-sheet)→tertiary→quaternary structure.' },
        { class: 'Carbohydrate (monosaccharide)', example: 'Glucose, fructose, ribose', formula: '(CH₂O)n typically', notes: 'Simple sugars. Glucose = main fuel; ribose = RNA backbone; deoxyribose = DNA.' },
        { class: 'Disaccharide', example: 'Sucrose, lactose, maltose', formula: 'Two monosaccharides linked', notes: 'Sucrose = glucose + fructose. Lactose = glucose + galactose.' },
        { class: 'Polysaccharide', example: 'Starch, glycogen, cellulose', formula: 'Many glucose units linked', notes: 'Starch (plant storage), glycogen (animal storage), cellulose (plant structure — α vs β linkage).' },
        { class: 'Lipid (fatty acid)', example: 'Palmitic, oleic, omega-3', formula: 'R–COOH (long chain)', notes: 'Saturated (no double bonds) or unsaturated. Cis double bonds = healthy; trans = harmful.' },
        { class: 'Triglyceride', example: 'Body fat, vegetable oil', formula: 'Glycerol + 3 fatty acids (ester bonds)', notes: 'Main energy storage. Solid (fat) vs liquid (oil) depends on saturation.' },
        { class: 'Phospholipid', example: 'Phosphatidylcholine (lecithin)', formula: 'Glycerol + 2 fatty acids + phosphate-head', notes: 'Bilayer forms cell membranes. Hydrophobic tails, hydrophilic heads.' },
        { class: 'Steroid', example: 'Cholesterol, testosterone, cortisol', formula: '4 fused rings (3 hexagonal, 1 pentagonal)', notes: 'Lipid class with rigid ring structure. Hormones, vitamin D, bile.' },
        { class: 'Nucleotide', example: 'ATP, GTP, cAMP', formula: 'Sugar + phosphate + nitrogenous base', notes: 'Building blocks of DNA/RNA. ATP = main cellular energy currency.' },
        { class: 'DNA', example: 'Human genome (~3 billion bp)', formula: 'Polymer of deoxyribonucleotides (A,T,G,C)', notes: 'Double helix. Stores genetic info. Replication is semi-conservative.' },
        { class: 'RNA', example: 'mRNA, tRNA, rRNA, miRNA', formula: 'Polymer of ribonucleotides (A,U,G,C)', notes: 'Usually single-stranded. mRNA carries gene info; tRNA delivers amino acids.' },
        { class: 'Enzyme', example: 'Amylase, lipase, ATP synthase', formula: 'Catalytic protein (usually)', notes: 'Lowers activation energy. Specific to substrate via active site. End in "-ase".' },
        { class: 'Vitamin', example: 'B12 (cobalamin), C (ascorbic), D₃ (cholecalciferol)', formula: 'Varies', notes: 'Organic micronutrients. Water-soluble (B, C) vs fat-soluble (A, D, E, K).' }
      ];

      var ATMOSPHERE_LAYERS = [
        { name: 'Troposphere', altitude: '0–12 km', temp: '15°C → −56°C', notes: 'Weather happens here. ~80% of atmospheric mass.' },
        { name: 'Stratosphere', altitude: '12–50 km', temp: '−56°C → −2°C', notes: 'Ozone layer absorbs UV → temperature rises with altitude.' },
        { name: 'Mesosphere', altitude: '50–85 km', temp: '−2°C → −90°C', notes: 'Coldest layer. Meteors burn up here.' },
        { name: 'Thermosphere', altitude: '85–600 km', temp: '−90°C → 2000°C+', notes: 'ISS orbits here (~400 km). Auroras form here.' },
        { name: 'Exosphere', altitude: '600–10,000 km', temp: 'varies', notes: 'Outermost layer. Gradually fades into space.' }
      ];

      var ATMOSPHERIC_GASES = [
        { gas: 'N₂', pct: '78.084%', notes: 'Inert filler. Cycled by N-fixing bacteria + lightning.' },
        { gas: 'O₂', pct: '20.946%', notes: 'Reactive. Produced by photosynthesis; consumed by respiration + combustion.' },
        { gas: 'Ar', pct: '0.934%', notes: 'Noble gas. Inert. Produced by ⁴⁰K decay.' },
        { gas: 'CO₂', pct: '~0.042% (420+ ppm)', notes: 'Greenhouse gas. Was ~280 ppm pre-industrial; rising ~2 ppm/year.' },
        { gas: 'Ne', pct: '0.0018%', notes: 'Noble gas. Sign lighting.' },
        { gas: 'He', pct: '0.0005%', notes: 'Noble gas. Escapes Earth\'s gravity over time.' },
        { gas: 'CH₄', pct: '~0.00019% (~1.9 ppm)', notes: 'Methane — potent greenhouse gas (~28× CO₂ over 100 yr). Rising.' },
        { gas: 'Kr', pct: '0.0001%', notes: 'Noble gas. Specialty lighting.' },
        { gas: 'H₂', pct: '0.00005%', notes: 'Small molecules escape gravity over geological time.' },
        { gas: 'N₂O', pct: '~0.000033%', notes: 'Nitrous oxide. Greenhouse gas. Anesthetic, also from fertilizer.' },
        { gas: 'O₃', pct: '~0.000007% (varies)', notes: 'Ozone. Concentrated in stratosphere. Absorbs UV-B/C.' },
        { gas: 'H₂O', pct: '0–4% (variable)', notes: 'Water vapor. The biggest natural greenhouse gas; feedback amplifier.' }
      ];

      var NUCLEAR_PROCESSES = [
        { name: 'Alpha decay (α)', particle: 'He nucleus (⁴He)', notes: 'Heavy nuclei eject ⁴He. Atomic number drops 2, mass drops 4. Stopped by paper.' },
        { name: 'Beta-minus decay (β⁻)', particle: 'electron + antineutrino', notes: 'Neutron → proton + e⁻ + ν̄. Atomic number rises 1. Stopped by aluminum.' },
        { name: 'Beta-plus decay (β⁺)', particle: 'positron + neutrino', notes: 'Proton → neutron + e⁺ + ν. Atomic number drops 1. Used in PET scans.' },
        { name: 'Electron capture', particle: 'absorbs inner electron', notes: 'Proton + e⁻ → neutron + ν. Mimics β⁺ effect on Z but no positron emitted.' },
        { name: 'Gamma decay (γ)', particle: 'high-energy photon', notes: 'Nucleus releases excess energy. No change in Z or A. Needs lead/concrete shielding.' },
        { name: 'Neutron emission', particle: 'free neutron', notes: 'Rare. Some fission products emit delayed neutrons (critical for reactor control).' },
        { name: 'Fission', particle: 'splits into 2+ nuclei', notes: 'Heavy nuclei (U-235, Pu-239) split when struck by neutron. Releases 2-3 more neutrons + energy.' },
        { name: 'Fusion', particle: 'two light nuclei combine', notes: 'Powers stars. D + T → He + n + energy. Requires extreme T and P.' },
        { name: 'Spontaneous fission', particle: 'self-splitting', notes: 'Some heavy isotopes (Cf-252) split without provocation.' }
      ];

      var COMMON_ISOTOPES = [
        { iso: '¹H (protium)', halfLife: 'stable', use: '99.98% of all hydrogen.' },
        { iso: '²H (deuterium)', halfLife: 'stable', use: '0.015%. Used in heavy water, NMR solvents.' },
        { iso: '³H (tritium)', halfLife: '12.3 yr (β⁻)', use: 'Glow-in-the-dark watches, fusion fuel.' },
        { iso: '¹²C', halfLife: 'stable', use: '98.9%. Defines atomic mass unit (¹²C = exactly 12 amu).' },
        { iso: '¹⁴C', halfLife: '5,730 yr (β⁻)', use: 'Radiocarbon dating up to ~50,000 years.' },
        { iso: '¹⁵N', halfLife: 'stable', use: 'NMR tracking, isotope labeling experiments.' },
        { iso: '¹⁸O', halfLife: 'stable', use: 'Ice core climate reconstruction (paleoclimate).' },
        { iso: '³²P', halfLife: '14.3 days (β⁻)', use: 'Radiolabeling DNA/RNA for sequencing.' },
        { iso: '⁹⁹ᵐTc', halfLife: '6 hr (γ)', use: 'Most widely used medical imaging isotope.' },
        { iso: '¹³¹I', halfLife: '8 days (β⁻, γ)', use: 'Treats thyroid cancer; thyroid concentrates iodine.' },
        { iso: '²³⁵U', halfLife: '7.0×10⁸ yr (α)', use: '0.72% of natural U. Fissile — used in reactors and weapons.' },
        { iso: '²³⁸U', halfLife: '4.5×10⁹ yr (α)', use: '99.27% of natural U. Used in armor + ammunition.' },
        { iso: '²³⁹Pu', halfLife: '24,100 yr (α)', use: 'Fissile. Used in nuclear weapons + some reactors.' },
        { iso: '²⁴¹Am', halfLife: '432 yr (α)', use: 'Smoke detectors.' }
      ];

      var ELECTROCHEM_CELLS = [
        { type: 'Galvanic / Voltaic cell', operation: 'Spontaneous redox → electricity', example: 'Zn/Cu Daniell cell (1836)', notes: 'Anode = oxidation (−), cathode = reduction (+).' },
        { type: 'Electrolytic cell', operation: 'External electricity → drives non-spontaneous redox', example: 'Electroplating, aluminum refining (Hall-Héroult)', notes: 'Anode = oxidation (+), cathode = reduction (−). Sign convention flipped.' },
        { type: 'Concentration cell', operation: 'Same electrodes, different ion concentrations', example: 'Two Cu electrodes in CuSO₄ at different concentrations', notes: 'Drives ions to equalize concentration. Small voltage.' },
        { type: 'Fuel cell', operation: 'Continuous flow of fuel + oxidizer', example: 'Hydrogen fuel cell: 2H₂ + O₂ → 2H₂O + electricity', notes: 'No combustion. Higher efficiency than heat engines. Apollo missions.' },
        { type: 'Primary battery (non-rechargeable)', operation: 'One-time use', example: 'Alkaline AA (Zn + MnO₂), Li-thionyl chloride', notes: 'Discarded when discharged.' },
        { type: 'Secondary battery (rechargeable)', operation: 'Reversible', example: 'Lead-acid (cars), NiMH, Li-ion', notes: 'Recharging reverses the redox.' },
        { type: 'Li-ion battery', operation: 'Li⁺ shuttles between anode and cathode', example: 'Phones, EVs, laptops', notes: 'Anode = graphite (Li intercalation). Cathode = LiCoO₂ / LiFePO₄ / NMC.' },
        { type: 'Flow battery', operation: 'Liquid electrolyte pumped through cell', example: 'Vanadium redox flow battery (grid storage)', notes: 'Capacity scales with tank size. Long cycle life.' }
      ];

      var FAMOUS_CHEMISTS = [
        { name: 'Antoine Lavoisier', year: '1780s', contrib: 'Law of conservation of mass; oxygen theory of combustion (overturned phlogiston).', notes: 'Executed in French Revolution (1794). "It took only an instant to cut off that head, and 100 years may not produce another like it."' },
        { name: 'John Dalton', year: '1803', contrib: 'Atomic theory: matter is made of indivisible atoms; elements have unique atom types.', notes: 'Also studied color blindness (which he had).' },
        { name: 'Amedeo Avogadro', year: '1811', contrib: 'Equal volumes of gas at same T,P contain equal numbers of molecules.', notes: 'Number named for him: 6.022×10²³ (number of particles in a mole).' },
        { name: 'Dmitri Mendeleev', year: '1869', contrib: 'Periodic table arranged by atomic mass; left gaps for undiscovered elements + predicted their properties.', notes: 'Predicted gallium, scandium, germanium — all later confirmed.' },
        { name: 'Marie Curie', year: '1898–1911', contrib: 'Discovered polonium + radium; coined "radioactivity".', notes: 'Two Nobels (Physics 1903, Chemistry 1911). Only person to win Nobel in two distinct sciences.' },
        { name: 'Fritz Haber', year: '1909', contrib: 'Haber-Bosch process: N₂ + 3H₂ → 2NH₃. Made synthetic fertilizer possible.', notes: 'Nobel 1918. Also developed chemical weapons in WWI. Complex legacy.' },
        { name: 'Linus Pauling', year: '1930s–60s', contrib: 'Nature of the chemical bond; protein α-helix; electronegativity scale.', notes: 'Two Nobels (Chemistry 1954, Peace 1962). Promoted vitamin C megadosing — that part was wrong.' },
        { name: 'Rosalind Franklin', year: '1952', contrib: 'X-ray diffraction "Photo 51" — essential to determining DNA double helix.', notes: 'Died 1958 (ovarian cancer); Nobel awarded 1962 (posthumous Nobels not allowed). Watson & Crick + Wilkins shared it.' },
        { name: 'Dorothy Hodgkin', year: '1950s–60s', contrib: 'X-ray crystallography of penicillin, B12, insulin.', notes: 'Nobel 1964. Only British woman to win a science Nobel.' },
        { name: 'Stephanie Kwolek', year: '1965', contrib: 'Invented Kevlar (poly-paraphenylene terephthalamide).', notes: 'Body armor, ballistic vests. Stiffer than steel by weight.' },
        { name: 'Frances Arnold', year: '1990s–2018', contrib: 'Directed evolution of enzymes.', notes: 'Nobel 2018. Engineered enzymes for sustainable manufacturing.' },
        { name: 'Jennifer Doudna & Emmanuelle Charpentier', year: '2012', contrib: 'CRISPR-Cas9 gene editing.', notes: 'Nobel 2020. Revolutionized genetic engineering.' }
      ];

      function renderGasLawsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '💨 Gas laws'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Quantitative relationships between P, V, T, and n (moles) for gases. Use Kelvin for temperature.'),
          React.createElement('div', { className: 'space-y-2' },
            GAS_LAWS.map(function(g, i) {
              return React.createElement('div', { key: 'g'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, g.name),
                  React.createElement('span', { className: 'text-[10px] text-slate-500 ml-auto' }, g.year)
                ),
                React.createElement('div', { className: 'text-[11px] font-mono text-indigo-700 font-bold mb-1' }, g.formula),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed mb-1' }, g.plain),
                React.createElement('div', { className: 'text-[10px] text-slate-600 italic bg-white p-1.5 rounded border border-slate-100' }, '🧪 ' + g.example)
              );
            })
          )
        );
      }

      function renderColligativeSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🧂 Colligative properties'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Properties that depend on the NUMBER of solute particles, not their identity. i = van\'t Hoff factor (1 for non-electrolyte, ~2 for NaCl, ~3 for CaCl₂).'),
          React.createElement('div', { className: 'space-y-2' },
            COLLIGATIVE_PROPS.map(function(p, i) {
              return React.createElement('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, p.prop),
                React.createElement('div', { className: 'text-[11px] font-mono text-indigo-700 font-bold mb-1' }, p.formula),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed mb-1' }, p.plain),
                React.createElement('div', { className: 'text-[10px] text-slate-600 italic' }, '🌡 ' + p.example)
              );
            })
          )
        );
      }

      function renderRedoxSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔋 Standard reduction potentials (E°)'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Higher E° = stronger oxidizer (more eager to GAIN electrons). To predict a redox reaction: cell potential = E°(cathode) − E°(anode). Positive → spontaneous.'),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Half-reaction', 'E° (V)', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                REDOX_PAIRS.map(function(r, i) {
                  return React.createElement('tr', { key: 'r'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700' }, r.half),
                    React.createElement('td', { className: 'px-2 py-1 font-mono font-bold text-indigo-700' }, r.e0),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, r.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderOrganicSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🧪 Organic functional groups'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Recognize functional groups to predict chemical behavior. R = "rest of molecule" (any carbon chain).'),
          React.createElement('div', { className: 'space-y-2' },
            ORGANIC_GROUPS.map(function(o, i) {
              return React.createElement('div', { key: 'o'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, o.name),
                  React.createElement('span', { className: 'text-[11px] font-mono ml-auto px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold' }, o.formula)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 mb-1' }, React.createElement('strong', null, 'Example: '), o.example),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, o.notes)
              );
            })
          )
        );
      }

      function renderSpectroSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📡 Spectroscopy methods'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Different wavelengths probe different molecular properties. Chemists combine multiple methods to determine structure of unknown compounds.'),
          React.createElement('div', { className: 'space-y-2' },
            SPECTRO_METHODS.map(function(s, i) {
              return React.createElement('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, s.name),
                  React.createElement('span', { className: 'text-[10px] text-slate-600 font-mono ml-auto px-2 py-0.5 rounded bg-indigo-100 text-indigo-800' }, s.range)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 mb-1' }, React.createElement('strong', null, 'Detects: '), s.detects),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, React.createElement('strong', null, 'Use: '), s.use)
              );
            })
          )
        );
      }

      function renderCrystalSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '💎 Crystal structures'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'How atoms/ions pack in solids determines material properties (hardness, conductivity, melting point, optical behavior).'),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Structure', 'Coord #', 'Packing %', 'Example', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                CRYSTAL_STRUCTURES.map(function(c, i) {
                  return React.createElement('tr', { key: 'c'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, c.name),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700' }, c.coord),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700' }, c.packing),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, c.example),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, c.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderBiochemSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🧬 Biochemistry — classes of biomolecules'),
          React.createElement('div', { className: 'space-y-2' },
            BIOCHEM_MOLECULES.map(function(b, i) {
              return React.createElement('div', { key: 'b'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, b.class),
                  React.createElement('span', { className: 'text-[10px] text-slate-600 ml-auto italic' }, b.example)
                ),
                React.createElement('div', { className: 'text-[11px] font-mono text-indigo-700 font-bold mb-1' }, b.formula),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, b.notes)
              );
            })
          )
        );
      }

      function renderEnvironmentSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🌫 Atmospheric chemistry'),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Atmospheric layers (bottom to top)'),
            React.createElement('div', { className: 'space-y-1' },
              ATMOSPHERE_LAYERS.map(function(L, i) {
                return React.createElement('div', { key: 'L'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  React.createElement('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    React.createElement('span', { className: 'text-[11px] font-black text-slate-800' }, L.name),
                    React.createElement('span', { className: 'text-[10px] font-mono text-indigo-700' }, L.altitude),
                    React.createElement('span', { className: 'text-[10px] font-mono text-slate-600' }, L.temp)
                  ),
                  React.createElement('div', { className: 'text-[10px] text-slate-600 italic' }, L.notes)
                );
              })
            )
          ),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Atmospheric composition (dry air, by volume)'),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Gas', '%', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                ATMOSPHERIC_GASES.map(function(a, i) {
                  return React.createElement('tr', { key: 'a'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-mono font-bold text-indigo-700' }, a.gas),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700' }, a.pct),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, a.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderNuclearSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '☢ Nuclear chemistry'),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Decay and nuclear processes'),
            React.createElement('div', { className: 'space-y-1' },
              NUCLEAR_PROCESSES.map(function(n, i) {
                return React.createElement('div', { key: 'n'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  React.createElement('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    React.createElement('span', { className: 'text-[11px] font-black text-slate-800' }, n.name),
                    React.createElement('span', { className: 'text-[10px] font-mono text-indigo-700 ml-auto' }, n.particle)
                  ),
                  React.createElement('div', { className: 'text-[10px] text-slate-700' }, n.notes)
                );
              })
            )
          ),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Notable isotopes'),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Isotope', 'Half-life (decay)', 'Use'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                COMMON_ISOTOPES.map(function(c, i) {
                  return React.createElement('tr', { key: 'c'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-mono font-bold text-indigo-700' }, c.iso),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700' }, c.halfLife),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px]' }, c.use)
                  );
                })
              )
            )
          )
        );
      }

      function renderElectrochemSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚡ Electrochemistry — cell types'),
          React.createElement('div', { className: 'space-y-2' },
            ELECTROCHEM_CELLS.map(function(c, i) {
              return React.createElement('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, c.type),
                React.createElement('div', { className: 'text-[11px] text-slate-700 mb-1' }, React.createElement('strong', null, 'Operation: '), c.operation),
                React.createElement('div', { className: 'text-[11px] text-slate-700 mb-1' }, React.createElement('strong', null, 'Example: '), c.example),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, c.notes)
              );
            })
          )
        );
      }

      function renderFamousSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🕰 Chemistry history — selected figures'),
          React.createElement('div', { className: 'space-y-2' },
            FAMOUS_CHEMISTS.map(function(c, i) {
              return React.createElement('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-indigo-400 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-[12px] font-black text-indigo-900' }, c.name),
                  React.createElement('span', { className: 'text-[10px] text-slate-500 ml-auto font-mono' }, c.year)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-800 mb-1' }, c.contrib),
                React.createElement('div', { className: 'text-[10px] text-slate-600 italic' }, c.notes)
              );
            })
          )
        );
      }

      function renderActiveSection() {
        if (expSection === 'vsepr') return renderVseprSection();
        if (expSection === 'bonds') return renderBondsSection();
        if (expSection === 'imf') return renderImfSection();
        if (expSection === 'reactions') return renderReactionsSection();
        if (expSection === 'library') return renderLibrarySection();
        if (expSection === 'acidbase') return renderAcidBaseSection();
        if (expSection === 'quantum') return renderQuantumSection();
        if (expSection === 'periodic') return renderPeriodicSection();
        if (expSection === 'molarity') return renderMolaritySection();
        if (expSection === 'stoich') return renderStoichSection();
        if (expSection === 'phase') return renderPhaseSection();
        if (expSection === 'equilibrium') return renderEquilibriumSection();
        if (expSection === 'kinetics') return renderKineticsSection();
        if (expSection === 'thermo') return renderThermoSection();
        if (expSection === 'polymers') return renderPolymersSection();
        if (expSection === 'safety') return renderSafetySection();
        if (expSection === 'gaslaws') return renderGasLawsSection();
        if (expSection === 'colligative') return renderColligativeSection();
        if (expSection === 'redox') return renderRedoxSection();
        if (expSection === 'organic') return renderOrganicSection();
        if (expSection === 'spectro') return renderSpectroSection();
        if (expSection === 'crystal') return renderCrystalSection();
        if (expSection === 'biochem') return renderBiochemSection();
        if (expSection === 'environment') return renderEnvironmentSection();
        if (expSection === 'nuclear') return renderNuclearSection();
        if (expSection === 'electrochem') return renderElectrochemSection();
        if (expSection === 'famous') return renderFamousSection();
        if (expSection === 'lab') return renderLabSection();
        if (expSection === 'medchem') return renderMedchemSection();
        if (expSection === 'food') return renderFoodSection();
        if (expSection === 'materials') return renderMaterialsSection();
        if (expSection === 'inorganic') return renderInorganicSection();
        if (expSection === 'enviro2') return renderEnviro2Section();
        if (expSection === 'green') return renderGreenSection();
        if (expSection === 'mol_geo') return renderMolGeoSection();
        if (expSection === 'isomers') return renderIsomersSection();
        if (expSection === 'noble') return renderNobleSection();
        if (expSection === 'glossary') return renderGlossarySection();
        return null;
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 3 EXPANSION (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var LAB_TECHNIQUES = [
        { name: 'Recrystallization', use: 'Purify a solid by dissolving + slowly recrystallizing.', notes: 'Impurities stay in solution; pure crystals grow.' },
        { name: 'Distillation (simple)', use: 'Separate liquids with different boiling points.', notes: 'Works when boiling points differ by >25°C.' },
        { name: 'Distillation (fractional)', use: 'Separate liquids with close boiling points.', notes: 'Uses a fractionating column. Refines petroleum, vodka.' },
        { name: 'Filtration (gravity)', use: 'Separate solid from liquid through filter paper.', notes: 'Slow but recovers liquid filtrate cleanly.' },
        { name: 'Vacuum filtration (Büchner)', use: 'Faster filtration with suction.', notes: 'Used to collect crystallized product.' },
        { name: 'Liquid-liquid extraction', use: 'Pull a compound from one solvent into another (immiscible) solvent.', notes: 'Separatory funnel. Caffeine extraction from tea.' },
        { name: 'Chromatography (TLC)', use: 'Identify compounds by separation on a thin plate.', notes: 'Quick. Visualize with UV or stain. Rf values identify compounds.' },
        { name: 'Chromatography (column)', use: 'Separate larger amounts.', notes: 'Silica gel column. Eluent washes compounds through at different speeds.' },
        { name: 'Chromatography (HPLC)', use: 'High-resolution separation under pressure.', notes: 'Quantitative analysis of mixtures (e.g., drug purity).' },
        { name: 'Chromatography (GC)', use: 'Separate volatile compounds in gas phase.', notes: 'Coupled to MS for forensics, environmental analysis.' },
        { name: 'Reflux', use: 'Heat a reaction without losing solvent.', notes: 'Condenser returns vapor to flask. Drives reaction to completion.' },
        { name: 'Titration', use: 'Determine concentration via reaction with known standard.', notes: 'Acid-base, redox, complexometric. Endpoint via indicator or pH meter.' },
        { name: 'Gel electrophoresis', use: 'Separate molecules by size + charge in electric field.', notes: 'Common for DNA, proteins (SDS-PAGE).' },
        { name: 'Rotary evaporator (rotovap)', use: 'Remove solvent quickly at reduced pressure.', notes: 'Standard in synthesis labs.' },
        { name: 'Schlenk line', use: 'Air- + moisture-free synthesis.', notes: 'Vacuum/inert gas manifold. Essential for air-sensitive chemistry.' },
        { name: 'Soxhlet extraction', use: 'Continuously extract a compound from solid with solvent.', notes: 'Used in food chem (fat content), natural product isolation.' }
      ];

      var DRUG_DISCOVERY = [
        { stage: 'Target identification', duration: '~1-2 yr', notes: 'Identify protein/pathway that, if modulated, would treat disease. Often via genomics.' },
        { stage: 'Hit discovery', duration: '~1-2 yr', notes: 'Screen libraries of compounds (often millions) against target. Find a few "hits".' },
        { stage: 'Lead optimization', duration: '~2-3 yr', notes: 'Modify hits to improve potency, selectivity, drug-like properties. Test in cells then animals.' },
        { stage: 'Preclinical', duration: '~1-2 yr', notes: 'Safety + efficacy in 2+ animal species. Pharmacokinetics. IND filing to regulator.' },
        { stage: 'Phase I trial', duration: '~1-2 yr', notes: '~20-100 healthy volunteers. Safety + dosing.' },
        { stage: 'Phase II trial', duration: '~2-3 yr', notes: '~100-300 patients. Does it work? At what dose? Side effects.' },
        { stage: 'Phase III trial', duration: '~3-4 yr', notes: '~1,000-5,000 patients. Confirm efficacy + safety vs standard of care.' },
        { stage: 'Regulatory review', duration: '~1 yr', notes: 'FDA/EMA/etc. review NDA. Decide approval.' },
        { stage: 'Phase IV (post-market)', duration: 'ongoing', notes: 'Real-world surveillance. Rare side effects appear only at scale.' }
      ];

      var DRUG_FACTS = [
        { fact: 'Average time to market', detail: '10-15 years from initial discovery to approval.' },
        { fact: 'Average cost', detail: 'Estimated $1-2.5 billion per approved drug (includes failures).' },
        { fact: 'Attrition rate', detail: '~10% of candidates entering Phase I make it to market. Most fail at Phase II for efficacy or Phase III for safety.' },
        { fact: 'Lipinski\'s Rule of 5', detail: 'Drug-likeness: MW < 500, logP < 5, ≤ 5 H-bond donors, ≤ 10 H-bond acceptors. Predicts oral bioavailability.' },
        { fact: 'Generic drugs', detail: 'Available after patent expires (typically 20 years from filing). Much cheaper but bioequivalent.' },
        { fact: 'Biologics', detail: 'Made by living cells (antibodies, vaccines). More complex, more expensive, "biosimilars" instead of generics.' }
      ];

      var FOOD_CHEMISTRY = [
        { topic: 'Maillard reaction', detail: 'Reducing sugar + amino acid → brown flavor compounds. Happens above ~140°C. Why bread crusts, seared steak, coffee are flavorful.' },
        { topic: 'Caramelization', detail: 'Sugar molecules break + recombine at high heat (>160°C). Creates hundreds of flavor compounds. Different from Maillard (no amino acids needed).' },
        { topic: 'Gelatinization (starch)', detail: 'Starch granules absorb water + swell when heated >60°C. Thickens sauces, cooks pasta.' },
        { topic: 'Gluten', detail: 'Wheat proteins (glutenin + gliadin) form elastic network when hydrated. Develops with kneading. Captures CO₂ in bread.' },
        { topic: 'Emulsion', detail: 'Stable mixture of oil + water with emulsifier (lecithin in egg yolk → mayonnaise; mustard or honey help too).' },
        { topic: 'Denaturation', detail: 'Heat unfolds proteins → texture changes. Eggs cook (clear → white), meat firms.' },
        { topic: 'Fermentation', detail: 'Microbes convert sugars to acids, alcohols, gases. Sauerkraut (lactic), beer (alcohol + CO₂), yogurt (lactic from lactose).' },
        { topic: 'Capsaicin', detail: 'Spicy compound in chili peppers. Activates TRPV1 heat receptors. Soluble in fat + alcohol, not water — why milk soothes spicy mouth.' },
        { topic: 'MSG (monosodium glutamate)', detail: 'Sodium salt of glutamate. Triggers umami taste receptor. Naturally abundant in tomatoes, parmesan, fish sauce, mushrooms.' },
        { topic: 'Browning enzymes', detail: 'Polyphenol oxidase browns cut apples + bananas. Lemon juice (acid) or refrigeration slows it.' },
        { topic: 'Carbonation', detail: 'CO₂ dissolves in cold water under pressure. Open bottle → pressure drops → CO₂ escapes as bubbles + H₂CO₃ tang.' },
        { topic: 'Pectin', detail: 'Plant cell wall polysaccharide. Forms gel with sugar + acid → jams.' },
        { topic: 'Saponification', detail: 'Fat + base → soap + glycerol. Soap molecules are amphipathic (one end loves water, one loves oil).' },
        { topic: 'Spherification (molecular gastronomy)', detail: 'Sodium alginate + calcium → liquid gel "caviar" or "ravioli". Modernist cooking.' },
        { topic: 'Sourdough leavening', detail: 'Wild yeast + lactic bacteria. Slower, more sour than commercial yeast.' }
      ];

      var MATERIALS_CLASSES = [
        { name: 'Metals', properties: 'Ductile, conductive, lustrous, malleable, dense', examples: 'Steel, aluminum, copper, titanium, gold' },
        { name: 'Ceramics', properties: 'Hard, brittle, high melting point, chemically stable, insulating (usually)', examples: 'Porcelain, alumina, silicon carbide, zirconia, glass' },
        { name: 'Polymers (plastics)', properties: 'Light, formable, low melting, insulating', examples: 'Polyethylene, PVC, polystyrene, nylon, Kevlar, epoxy' },
        { name: 'Composites', properties: 'Combine properties of constituents', examples: 'Carbon fiber, fiberglass, reinforced concrete, plywood' },
        { name: 'Semiconductors', properties: 'Conductivity between metal + insulator; controllable via doping', examples: 'Si, GaAs, GaN, SiC, perovskites' },
        { name: 'Biomaterials', properties: 'Compatible with living tissue', examples: 'Titanium implants, hydroxyapatite (bone-mimic), PLA sutures, hydrogels' },
        { name: 'Nanomaterials', properties: 'Size 1-100 nm; properties different from bulk', examples: 'Carbon nanotubes, graphene, quantum dots, nanoparticles' },
        { name: 'Smart materials', properties: 'Respond to stimuli (heat, light, voltage)', examples: 'Shape-memory alloys, piezoelectrics, electroactive polymers, thermochromics' },
        { name: 'Superconductors', properties: 'Zero electrical resistance below critical temperature', examples: 'YBCO (Tc 93 K), Nb-Ti (used in MRI), MgB₂' },
        { name: 'Metamaterials', properties: 'Engineered structure gives properties not found in nature', examples: 'Negative-index (cloaking research), perfect absorbers, acoustic cloaks' }
      ];

      var MATERIAL_FACTS = [
        { material: 'Diamond', property: 'Hardest natural material (Mohs 10)', notes: 'Carbon in tetrahedral lattice. Synthetic diamonds now widely available.' },
        { material: 'Graphene', property: '~200× stronger than steel by weight', notes: 'Single sheet of graphite. Electrically + thermally conductive. Discovered 2004 (Nobel 2010).' },
        { material: 'Carbon nanotubes', property: 'Tensile strength ~63 GPa', notes: 'Rolled-up graphene. Many uses being explored.' },
        { material: 'Kevlar', property: 'Tensile strength ~3.6 GPa, very high modulus', notes: 'Bulletproof vests, ropes. Aligned aromatic polyamide chains.' },
        { material: 'Spider silk', property: '~1-2 GPa tensile, very elastic', notes: 'Tougher than steel by weight (combines high strength + high stretch).' },
        { material: 'Aerogel', property: 'Density as low as 1.6 kg/m³ (~3× air)', notes: '99%+ air. Best thermal insulator. NASA uses on Mars rovers.' },
        { material: 'NEG (Non-Evaporable Getter)', property: 'Absorbs gases at low T', notes: 'Used in vacuum systems, particle accelerators.' },
        { material: 'GFRP (fiberglass)', property: 'Lighter than steel, doesn\'t rust', notes: 'Boats, car bodies, wind turbine blades.' }
      ];

      var INORGANIC_TOPICS = [
        { topic: 'Coordination compounds', detail: 'Central metal atom bonded to "ligands" (neutral or anionic). Geometry (octahedral, tetrahedral, square planar) determined by metal + ligands.' },
        { topic: 'Crystal field theory', detail: 'Ligands split metal d-orbital energies. Determines color, magnetic properties. High-spin vs low-spin complexes.' },
        { topic: 'Chelation', detail: 'A single ligand binds metal through multiple atoms (EDTA is hexadentate). Very stable complexes.' },
        { topic: 'Lewis acid/base', detail: 'Lewis acid = electron-pair acceptor (e.g., BF₃, Cu²⁺); Lewis base = electron-pair donor (e.g., NH₃, OH⁻).' },
        { topic: 'Hard-soft acid-base (HSAB) theory', detail: 'Hard acids prefer hard bases (small, non-polarizable). Soft prefer soft (large, polarizable). Predicts reactivity.' },
        { topic: 'Lanthanides + actinides', detail: 'f-block. Similar chemistry within each series (lanthanide contraction). Many radioactive (all actinides).' },
        { topic: 'Transition metals', detail: 'd-block. Multiple oxidation states (Fe²⁺/Fe³⁺), often colored complexes, catalytic activity.' },
        { topic: 'Organometallic chemistry', detail: 'Metal-carbon bonds. Grignard reagents (RMgX), ferrocene (Fe(C₅H₅)₂), catalysts (Wilkinson, Grubbs).' },
        { topic: 'Oxoacids', detail: 'Acids with O–H bonds. H₂SO₄, H₃PO₄, HNO₃, HClO₄. More O atoms → stronger acid (typically).' },
        { topic: 'Hydrides', detail: 'Binary compounds with H. Ionic (NaH), covalent (CH₄), metallic (PdH, used in H₂ storage).' }
      ];

      var POLLUTANTS = [
        { pollutant: 'Carbon dioxide (CO₂)', source: 'Fossil fuel burning, deforestation, cement', impact: 'Greenhouse gas. ~420 ppm + rising. Drives climate change.' },
        { pollutant: 'Methane (CH₄)', source: 'Livestock, landfills, gas leaks, wetlands', impact: 'Greenhouse gas (~28× CO₂ over 100 yr). ~1.9 ppm + rising.' },
        { pollutant: 'Nitrous oxide (N₂O)', source: 'Fertilizer, livestock, industry', impact: 'Greenhouse gas. Also depletes ozone.' },
        { pollutant: 'Sulfur dioxide (SO₂)', source: 'Coal burning, smelting', impact: 'Acid rain (forms H₂SO₄). Lung irritant. Largely reduced by scrubbers in many countries.' },
        { pollutant: 'Nitrogen oxides (NOₓ)', source: 'Combustion (cars, power plants)', impact: 'Smog precursor, acid rain. Lung damage.' },
        { pollutant: 'Particulate matter (PM₂.₅)', source: 'Combustion, brake/tire wear, dust', impact: 'Lung + cardiovascular disease. Major mortality cause globally.' },
        { pollutant: 'Ground-level ozone (O₃)', source: 'NOₓ + VOCs + sunlight', impact: 'Smog. Lung damage. Crop yield reduction. (Stratospheric O₃ is protective.)' },
        { pollutant: 'CFCs (chlorofluorocarbons)', source: 'Old refrigerants, aerosols', impact: 'Depleted ozone layer. Banned (Montreal Protocol 1987). Hole now slowly recovering.' },
        { pollutant: 'PFAS ("forever chemicals")', source: 'Nonstick coatings, firefighting foam, water-resistant fabric', impact: 'Bioaccumulate. Linked to cancer, immune effects. Being phased out.' },
        { pollutant: 'Microplastics', source: 'Plastic breakdown, synthetic fabrics', impact: 'Found in oceans, drinking water, human blood. Long-term effects under study.' },
        { pollutant: 'Heavy metals (Pb, Hg, Cd, As)', source: 'Industry, mining, old paint, gasoline (Pb phased out)', impact: 'Bioaccumulative. Neurological + kidney damage.' },
        { pollutant: 'Nitrates + phosphates', source: 'Fertilizer runoff, sewage', impact: 'Eutrophication of waterways → algal blooms → dead zones (e.g., Gulf of Mexico).' }
      ];

      var GREEN_CHEMISTRY = [
        { principle: 'Prevention', detail: 'Better to prevent waste than treat or clean it up.' },
        { principle: 'Atom economy', detail: 'Maximize fraction of reactant atoms ending up in product.' },
        { principle: 'Less hazardous synthesis', detail: 'Use + generate substances with little/no toxicity.' },
        { principle: 'Safer products', detail: 'Design products with minimal toxicity while preserving function.' },
        { principle: 'Safer solvents', detail: 'Avoid solvents when possible; use safer ones when not (water, supercritical CO₂).' },
        { principle: 'Energy efficiency', detail: 'Run reactions at ambient T + P when possible.' },
        { principle: 'Renewable feedstocks', detail: 'Use biomass/agricultural by-products instead of petroleum.' },
        { principle: 'Reduce derivatives', detail: 'Avoid protecting groups and unnecessary modifications.' },
        { principle: 'Catalysis', detail: 'Catalytic > stoichiometric. Reusable; less waste.' },
        { principle: 'Design for degradation', detail: 'Products should break down to innocuous substances at end of life.' },
        { principle: 'Real-time analysis', detail: 'Inline monitoring to prevent pollution.' },
        { principle: 'Inherently safer chemistry', detail: 'Design for accident prevention — minimize releases, explosions, fires.' }
      ];

      var BOND_GEOMETRIES = [
        { electronPairs: 2, bondingPairs: 2, geometry: 'Linear', angle: '180°', example: 'BeCl₂, CO₂' },
        { electronPairs: 3, bondingPairs: 3, geometry: 'Trigonal planar', angle: '120°', example: 'BF₃' },
        { electronPairs: 3, bondingPairs: 2, geometry: 'Bent (1 lone pair)', angle: '~117°', example: 'O₃, SO₂' },
        { electronPairs: 4, bondingPairs: 4, geometry: 'Tetrahedral', angle: '109.5°', example: 'CH₄, NH₄⁺' },
        { electronPairs: 4, bondingPairs: 3, geometry: 'Trigonal pyramidal (1 LP)', angle: '~107°', example: 'NH₃' },
        { electronPairs: 4, bondingPairs: 2, geometry: 'Bent (2 LP)', angle: '~104.5°', example: 'H₂O' },
        { electronPairs: 5, bondingPairs: 5, geometry: 'Trigonal bipyramidal', angle: '120° + 90°', example: 'PCl₅' },
        { electronPairs: 5, bondingPairs: 4, geometry: 'Seesaw (1 LP equatorial)', angle: 'distorted', example: 'SF₄' },
        { electronPairs: 5, bondingPairs: 3, geometry: 'T-shaped (2 LP equatorial)', angle: '~90°', example: 'ClF₃' },
        { electronPairs: 5, bondingPairs: 2, geometry: 'Linear (3 LP equatorial)', angle: '180°', example: 'XeF₂' },
        { electronPairs: 6, bondingPairs: 6, geometry: 'Octahedral', angle: '90°', example: 'SF₆' },
        { electronPairs: 6, bondingPairs: 5, geometry: 'Square pyramidal (1 LP)', angle: '~90°', example: 'BrF₅' },
        { electronPairs: 6, bondingPairs: 4, geometry: 'Square planar (2 LP trans)', angle: '90°', example: 'XeF₄' }
      ];

      var ISOMER_TYPES = [
        { name: 'Structural (constitutional) isomers', description: 'Different connectivity of atoms. Same molecular formula.', example: 'C₄H₁₀: n-butane vs isobutane.' },
        { name: 'Chain isomers', description: 'Different carbon chain arrangements.', example: 'Pentane vs 2-methylbutane vs 2,2-dimethylpropane.' },
        { name: 'Positional isomers', description: 'Same functional group, different position.', example: '1-propanol vs 2-propanol.' },
        { name: 'Functional group isomers', description: 'Same molecular formula, different functional group.', example: 'C₂H₆O: ethanol (alcohol) vs dimethyl ether.' },
        { name: 'Geometric (cis-trans) isomers', description: 'Different arrangement around a rigid bond (e.g., double bond or ring).', example: 'Cis-2-butene vs trans-2-butene; oleic vs elaidic acid (cis vs trans fat).' },
        { name: 'Enantiomers (mirror-image stereoisomers)', description: 'Non-superimposable mirror images. "Chirality".', example: 'L- vs D-amino acids; (R)- vs (S)-thalidomide (one safe, one teratogenic).' },
        { name: 'Diastereomers', description: 'Stereoisomers that are NOT mirror images.', example: 'D-glucose vs D-galactose (both right-handed sugars but differ at C4).' },
        { name: 'Conformational isomers', description: 'Differ by rotation about single bonds — interconvert rapidly.', example: 'Ethane staggered vs eclipsed; chair vs boat cyclohexane.' },
        { name: 'Tautomers', description: 'Constitutional isomers that interconvert by H-atom migration.', example: 'Keto-enol tautomerism. Crucial in DNA base pairing.' },
        { name: 'Optical rotation', description: 'Chiral molecules rotate polarized light. (+) or (−) prefix.', example: '(+)-Glucose rotates light clockwise.' }
      ];

      var NOBLE_GASES = [
        { gas: 'Helium (He)', uses: 'Cryogenics (liquid He, 4 K), MRI cooling, balloons, deep diving gas mix', notes: 'Second lightest. Escapes Earth\'s gravity → must be extracted from natural gas wells.' },
        { gas: 'Neon (Ne)', uses: 'Signs (red-orange glow), high-voltage indicators', notes: '"Neon signs" with other colors use other gases or fluorescent coatings.' },
        { gas: 'Argon (Ar)', uses: 'Inert gas in welding, light bulbs, glass insulation', notes: '0.93% of atmosphere. Cheapest noble gas.' },
        { gas: 'Krypton (Kr)', uses: 'Specialty lighting, lasers, energy-efficient windows', notes: 'Used in old high-end fluorescent + photography flash bulbs.' },
        { gas: 'Xenon (Xe)', uses: 'High-intensity arc lamps (movie projectors, headlights), ion thrusters, anesthesia', notes: 'Forms some compounds (XeF₂, XeO₃) despite being "noble".' },
        { gas: 'Radon (Rn)', uses: '(Historically) radiation therapy', notes: 'Radioactive. From U/Th decay. Health hazard in basements (lung cancer risk).' },
        { gas: 'Oganesson (Og)', uses: 'None (synthetic, vanishingly small samples)', notes: 'Element 118. First atom made 2002. Decays in milliseconds.' }
      ];

      function renderLabSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔬 Lab techniques'),
          React.createElement('div', { className: 'space-y-2' },
            LAB_TECHNIQUES.map(function(t, i) {
              return React.createElement('div', { key: 't'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, t.name),
                React.createElement('div', { className: 'text-[11px] text-indigo-700 font-bold mb-1' }, t.use),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, t.notes)
              );
            })
          )
        );
      }

      function renderMedchemSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '💊 Drug discovery pipeline'),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Stages'),
            React.createElement('div', { className: 'space-y-1' },
              DRUG_DISCOVERY.map(function(d, i) {
                return React.createElement('div', { key: 'd'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  React.createElement('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    React.createElement('span', { className: 'text-[11px] font-black text-slate-800' }, d.stage),
                    React.createElement('span', { className: 'text-[10px] font-mono text-indigo-700 ml-auto' }, d.duration)
                  ),
                  React.createElement('div', { className: 'text-[10px] text-slate-700' }, d.notes)
                );
              })
            )
          ),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Industry essentials'),
          React.createElement('div', { className: 'space-y-1' },
            DRUG_FACTS.map(function(f, i) {
              return React.createElement('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-indigo-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[11px] font-black text-indigo-900 mb-0.5' }, f.fact),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          )
        );
      }

      function renderFoodSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🍳 Food chemistry'),
          React.createElement('div', { className: 'space-y-2' },
            FOOD_CHEMISTRY.map(function(f, i) {
              return React.createElement('div', { key: 'f'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-indigo-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-indigo-900 mb-0.5' }, f.topic),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          )
        );
      }

      function renderMaterialsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🪨 Materials classes'),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('div', { className: 'space-y-2' },
              MATERIALS_CLASSES.map(function(m, i) {
                return React.createElement('div', { key: 'm'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                  React.createElement('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, m.name),
                  React.createElement('div', { className: 'text-[11px] text-indigo-700 font-bold mb-1' }, m.properties),
                  React.createElement('div', { className: 'text-[10px] text-slate-700 italic' }, 'Examples: ' + m.examples)
                );
              })
            )
          ),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Notable materials'),
          React.createElement('div', { className: 'space-y-1' },
            MATERIAL_FACTS.map(function(f, i) {
              return React.createElement('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-indigo-400 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                  React.createElement('span', { className: 'text-[11px] font-black text-indigo-900' }, f.material),
                  React.createElement('span', { className: 'text-[10px] text-indigo-700 font-mono ml-auto' }, f.property)
                ),
                React.createElement('div', { className: 'text-[10px] text-slate-700' }, f.notes)
              );
            })
          )
        );
      }

      function renderInorganicSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚛ Inorganic chemistry topics'),
          React.createElement('div', { className: 'space-y-2' },
            INORGANIC_TOPICS.map(function(t, i) {
              return React.createElement('div', { key: 't'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-indigo-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-indigo-900 mb-0.5' }, t.topic),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, t.detail)
              );
            })
          )
        );
      }

      function renderEnviro2Section() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🏭 Environmental pollutants'),
          React.createElement('div', { className: 'space-y-2' },
            POLLUTANTS.map(function(p, i) {
              return React.createElement('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, p.pollutant),
                React.createElement('div', { className: 'text-[11px] text-slate-700 mb-1' }, React.createElement('strong', null, 'Source: '), p.source),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, React.createElement('strong', null, 'Impact: '), p.impact)
              );
            })
          )
        );
      }

      function renderGreenSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🌱 12 Principles of Green Chemistry'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Articulated by Anastas + Warner (1998). Guides chemists toward more sustainable methods.'),
          React.createElement('div', { className: 'space-y-1' },
            GREEN_CHEMISTRY.map(function(g, i) {
              return React.createElement('div', { key: 'g'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-emerald-400 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2' },
                  React.createElement('span', { className: 'text-[10px] font-mono text-emerald-700 font-bold' }, (i + 1) + '.'),
                  React.createElement('span', { className: 'text-[12px] font-black text-emerald-900' }, g.principle)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed ml-5' }, g.detail)
              );
            })
          )
        );
      }

      function renderMolGeoSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '∡ VSEPR — electron pair geometries'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Lone pairs (LP) take more space than bonding pairs → compress bond angles. VSEPR predicts molecular shape from total electron pairs.'),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Total e- pairs', 'Bonding', 'Geometry', 'Angle', 'Example'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                BOND_GEOMETRIES.map(function(b, i) {
                  return React.createElement('tr', { key: 'b'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700 text-center' }, b.electronPairs),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700 text-center' }, b.bondingPairs),
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, b.geometry),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-indigo-700 font-bold' }, b.angle),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, b.example)
                  );
                })
              )
            )
          )
        );
      }

      function renderIsomersSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⇄ Isomers'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Molecules with the same molecular formula but different arrangement. Isomers can have very different properties.'),
          React.createElement('div', { className: 'space-y-2' },
            ISOMER_TYPES.map(function(I, i) {
              return React.createElement('div', { key: 'I'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, I.name),
                React.createElement('div', { className: 'text-[11px] text-slate-700 mb-1' }, I.description),
                React.createElement('div', { className: 'text-[10px] text-indigo-700 italic' }, '→ ' + I.example)
              );
            })
          )
        );
      }

      function renderNobleSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, 'He Noble gases (Group 18)'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Full outer electron shell → very unreactive. Discovered late (Ramsay et al., 1894-1898) because they don\'t form compounds easily.'),
          React.createElement('div', { className: 'space-y-2' },
            NOBLE_GASES.map(function(n, i) {
              return React.createElement('div', { key: 'n'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, n.gas),
                React.createElement('div', { className: 'text-[11px] text-indigo-700 font-bold mb-1' }, 'Uses: ' + n.uses),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, n.notes)
              );
            })
          )
        );
      }

      var __moleculeExpansions = React.createElement('div', { className: 'mt-4 max-w-4xl mx-auto' },
        expHeader(),
        expTabBar(),
        expSection && React.createElement('div', { className: 'mt-2' }, renderActiveSection())
      );

      return React.createElement(React.Fragment, null, __moleculeMainView, __moleculeExpansions);
    }
  });

})();
