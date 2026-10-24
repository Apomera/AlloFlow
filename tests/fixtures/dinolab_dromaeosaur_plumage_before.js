// Frozen native feather construction immediately before the reviewed Velociraptor/Deinonychus plumage change.
// Source SHA256: 7e32942c6bc08b48281e4ebbbd781a5386e9cbca9197b0c45eca9c68b2f6b8d8.
// Only the feather construction is frozen; species data and unrelated anatomy use the live module.
export const baselinePlumageSource = String.raw`
function dinoFoldedWingProfileFor(dn) {
    var profiles = {
      archaeopteryx: { secondaryScale: 0.080, primaryScale: 0.118, covertScale: 0.62, foldScale: 1 },
      microraptor: { secondaryScale: 0.083, primaryScale: 0.126, covertScale: 0.56, foldScale: 1 },
      anchiornis: { secondaryScale: 0.076, primaryScale: 0.108, covertScale: 0.76, foldScale: 0.92 },
      caudipteryx: { secondaryScale: 0.067, primaryScale: 0.090, covertScale: 0.54, foldScale: 0.80 }
    };
    return profiles[String((dn && dn.id) || '')] || null;
  }

function dinoRestingWingRow(THREE, start, end, side, length, profile, manual) {
    var count = manual ? 8 : 7, entries = [], span = end.distanceTo(start);
    var scale = manual ? profile.primaryScale : profile.secondaryScale;
    var spread = end.clone().sub(start);
    for (var index = 0; index < count; index++) {
      var t = index / (count - 1), rootT = 0.07 + t * 0.86;
      var featherLength = length * scale * (0.79 + 0.23 * Math.sin(Math.PI * (0.08 + t * 0.82))) * (1 + Math.sin(index * 2.17) * 0.018);
      var width = Math.max(span / count * 0.42, featherLength * (manual ? 0.078 - t * 0.013 : 0.078));
      var direction = new THREE.Vector3(featherLength, -featherLength * (manual ? 0.055 + t * 0.055 : 0.13 + t * 0.045),
        side * featherLength * (manual ? 0.105 + t * 0.035 : 0.095 + t * 0.025));
      var center = start.clone().lerp(end, rootT);
      // Offset the covert root along the same tract, toward its dorsal face.
      var covertCenter = start.clone().lerp(end, Math.max(0.04, rootT - 0.025)).add(new THREE.Vector3(0, width * 0.18, 0));
      entries.push({ center: center, covertCenter: covertCenter, direction: direction,
        covertDirection: direction.clone().multiplyScalar(manual ? profile.covertScale : 0.53).add(new THREE.Vector3(0, width * 0.08, side * width * 0.12)),
        width: width, covertWidth: width * 0.80, spread: spread, outward: new THREE.Vector3(0.05, 0.20, side),
        tract: manual ? 'manual-wing' : 'forewing', index: index });
    }
    return entries;
  }

function dinoFeatherVaneProfile(dn, tract) {
    var id = String(dn && dn.id || '').toLowerCase();
    var wing = /^(forewing|manual-wing|hind-wing)$/.test(String(tract || ''));
    if (id === 'anchiornis' && wing) {
      return { id: 'anchiornis-symmetric-remiges', leftScale: 0.84, rightScale: 0.84,
        note: 'Anchiornis preserves slender feathers with symmetrical vanes. The model centers these reviewed limb vanes on the shaft; exact breadth, camber, and feather spacing are reconstructed. Symmetry alone does not establish how the animal moved through air.',
        source: { label: 'Hu et al. (2009), Anchiornis feather anatomy', url: 'https://doi.org/10.1038/nature08322' } };
    }
    if (id === 'caudipteryx' && tract === 'tail-fan') {
      return { id: 'caudipteryx-symmetric-vanes', leftScale: 0.84, rightScale: 0.84,
        note: 'Caudipteryx preserves symmetrical terminal tail feather vanes. These display vanes are centered on the shaft; exact proportions and spacing are reconstructed. Arm feathers are excluded: primary vanes retain some asymmetry in later studies (doi:10.1073/pnas.2306639121).',
        source: { label: 'Ji et al. (1998), Caudipteryx feather anatomy', url: 'https://doi.org/10.1038/31635' } };
    }
    return null;
  }

function dinoFeatherGeometry(THREE, length, width) {
    var vaneProfile = arguments[3];
    var leftScale = vaneProfile && Number.isFinite(vaneProfile.leftScale) && vaneProfile.leftScale > 0 ? vaneProfile.leftScale : 0.68;
    var rightScale = vaneProfile && Number.isFinite(vaneProfile.rightScale) && vaneProfile.rightScale > 0 ? vaneProfile.rightScale : 1;
    var positions = [], uvs = [], indices = [], rows = 20, columns = 4;
    for (var i = 0; i <= rows; i++) {
      var t = i / rows;
      var span = width * Math.pow(Math.sin(Math.PI * t), 0.72) * (0.70 + 0.30 * t);
      for (var j = 0; j <= columns; j++) {
        var across = j / columns * 2 - 1;
        positions.push(across * span * (across < 0 ? leftScale : rightScale), length * t,
          length * 0.045 * Math.sin(Math.PI * t) + width * 0.14 * across * across * Math.sin(Math.PI * t));
        uvs.push(j / columns, t);
        if (i < rows && j < columns) {
          var n = i * (columns + 1) + j;
          indices.push(n, n + 1, n + columns + 1, n + 1, n + columns + 2, n + columns + 1);
        }
      }
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox();
    return geometry;
  }

function dinoFeatherShaftGeometry(THREE, length, width) {
    var rings = 20, sides = 8, positions = [], indices = [], uvs = [];
    var radius = width * 0.028;
    for (var ring = 0; ring < rings; ring++) {
      var t = ring / rings, slope = 0.045 * Math.PI * Math.cos(Math.PI * t);
      var frameLength = Math.sqrt(1 + slope * slope);
      var taper = 1 - t * t;
      for (var side = 0; side <= sides; side++) {
        var angle = (side === sides ? 0 : side) / sides * Math.PI * 2;
        var cross = Math.sin(angle) * radius * taper;
        positions.push(Math.cos(angle) * radius * taper,
          length * t - cross * slope / frameLength,
          length * 0.045 * Math.sin(Math.PI * t) + cross / frameLength);
        uvs.push(side / sides, t);
        if (ring < rings - 1 && side < sides) {
          var a = ring * (sides + 1) + side, b = a + 1, c = a + sides + 1;
          indices.push(a, c, b, b, c, c + 1);
        }
      }
    }
    var tip = positions.length / 3;
    positions.push(0, length, 0); uvs.push(0.5, 1);
    var last = (rings - 1) * (sides + 1);
    for (var side = 0; side < sides; side++) indices.push(last + side, tip, last + side + 1);
    // Separate cap vertices keep the seated root flat without a hard side seam.
    var cap = positions.length / 3;
    for (var side = 0; side <= sides; side++) {
      positions.push(positions[side * 3], positions[side * 3 + 1], positions[side * 3 + 2]);
      uvs.push(side / sides, 0);
    }
    var center = positions.length / 3;
    positions.push(0, 0, 0); uvs.push(0.5, 0);
    for (var side = 0; side < sides; side++) indices.push(center, cap + side, cap + side + 1);
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    var normals = geometry.attributes.normal, normal = new THREE.Vector3();
    for (var ring = 0; ring < rings; ring++) {
      var first = ring * (sides + 1), end = first + sides;
      normal.fromBufferAttribute(normals, first).add(new THREE.Vector3().fromBufferAttribute(normals, end)).normalize();
      normals.setXYZ(first, normal.x, normal.y, normal.z);
      normals.setXYZ(end, normal.x, normal.y, normal.z);
    }
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    return geometry;
  }

function dinoFeatherFrame(THREE, direction, spreadAxis) {
    if (direction.lengthSq() < 0.000001) return null;
    var along = direction.clone().normalize();
    var across = (spreadAxis || new THREE.Vector3(0, 0, 1)).clone();
    across.addScaledVector(along, -across.dot(along));
    if (across.lengthSq() < 0.000001) {
      across.set(Math.abs(along.x) < 0.8 ? 1 : 0, Math.abs(along.x) < 0.8 ? 0 : 1, 0);
      across.addScaledVector(along, -across.dot(along));
    }
    across.normalize();
    var normal = new THREE.Vector3().crossVectors(across, along).normalize();
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across, along, normal));
  }

function dinoSurfaceAnchor(THREE, mesh, origin, direction, distance) {
    if (!mesh || direction.lengthSq() < 0.000001 || !(distance > 0)) return null;
    mesh.updateWorldMatrix(true, false);
    var hit = new THREE.Raycaster(origin, direction.clone().normalize(), 0, distance).intersectObject(mesh, false)[0];
    if (!hit || !hit.face) return null;
    var positions = mesh.geometry.attributes.position, normals = mesh.geometry.attributes.normal;
    var localPoint = mesh.worldToLocal(hit.point.clone());
    var barycentric = THREE.Triangle.getBarycoord(localPoint,
      new THREE.Vector3().fromBufferAttribute(positions, hit.face.a),
      new THREE.Vector3().fromBufferAttribute(positions, hit.face.b),
      new THREE.Vector3().fromBufferAttribute(positions, hit.face.c), new THREE.Vector3());
    var normal = new THREE.Vector3().fromBufferAttribute(normals, hit.face.a).multiplyScalar(barycentric.x)
      .addScaledVector(new THREE.Vector3().fromBufferAttribute(normals, hit.face.b), barycentric.y)
      .addScaledVector(new THREE.Vector3().fromBufferAttribute(normals, hit.face.c), barycentric.z)
      .applyMatrix3(new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)).normalize();
    return { point: hit.point, normal: normal };
  }

function dinoSurfacePartIds(mesh, ids) {
    if (!mesh) return mesh;
    var existing = mesh.userData.dinoPartIds || [];
    ids.forEach(function (id) { if (existing.indexOf(id) < 0) existing.push(id); });
    mesh.userData.dinoPartIds = existing;
    return mesh;
  }

function addFeatherVane(base, tip, width, spreadAxis, tract) {
              if (!props.showBody) return null;
              var dir = new THREE.Vector3().subVectors(tip, base), dist = dir.length();
              if (!dist) return null;
              var vaneProfile = dinoFeatherVaneProfile(dn, tract);
              var vane = new THREE.Mesh(dinoFeatherGeometry(THREE, dist, width, vaneProfile), featherVaneMat);
              if (vaneProfile) vane.userData.dinoFeatherVaneProfile = vaneProfile;
              vane.position.copy(base);
              vane.quaternion.copy(dinoFeatherFrame(THREE, dir, spreadAxis));
              vane.castShadow = true; vane.receiveShadow = true; vane.renderOrder = 12;
              vane.userData.dinoFeature = 'feather';
              vane.userData.featherTract = tract || 'tail';
              dinoSurfacePartIds(vane, /hind-wing/.test(tract || '') ? ['hindwings', 'feathers', 'hindlimb'] : (/wing/.test(tract || '') ? ['wing', 'feathers', 'forelimb'] : ['tail', 'feathers']));
              vane.userData.featherLength = dist;
              vane.userData.featherWidth = width;
              var shaft = new THREE.Mesh(dinoFeatherShaftGeometry(THREE, dist, width), filamentMat);
              shaft.renderOrder = 13; vane.add(shaft);
              model.add(vane);
              idleMotion.feathers.push({ mesh: vane, baseRotation: vane.rotation.clone(), phase: idleMotion.phase + idleMotion.feathers.length * 0.19, amount: 0.012 });
              return vane;
            }

function surfaceAnchor(surface, center, outward) {
              var reach = Math.max(surfaceBodyHeight, surfaceBodyDepth, neckBaseRadius, tailBaseRadius) * 4;
              var direction = outward.clone().normalize();
              return dinoSurfaceAnchor(THREE, surface, center.clone().addScaledVector(direction, reach), direction.negate(), reach * 2);
            }

function bindSurfaceDetail(detail, surface, anchor) {
              if (!detail || !surface || !anchor) return detail;
              surface.attach(detail);
              detail.userData.dinoAttachment = {
                surface: surface.userData.dinoRegion,
                point: surface.worldToLocal(anchor.point.clone()).toArray()
              };
              var motion = idleMotion.feathers.find(function (entry) { return entry.mesh === detail; });
              if (motion) motion.baseRotation.copy(detail.rotation);
              return detail;
            }

function addSeatedFeather(surface, center, outward, direction, width, spread, tract) {
              var anchor = surfaceAnchor(surface, center, outward);
              if (!anchor) return null;
              var root = anchor.point.clone().addScaledVector(anchor.normal, -width * 0.03);
              var vane = addFeatherVane(root, root.clone().add(direction), width, spread, tract);
              return bindSurfaceDetail(vane, surface, anchor);
            }

function addRestingWingRows(surface, start, end, side, profile, manual) {
              dinoRestingWingRow(THREE, start, end, side, len, profile, manual).forEach(function (entry) {
                var flightFeather = addSeatedFeather(surface, entry.center, entry.outward, entry.direction,
                  entry.width, entry.spread, entry.tract);
                var covert = addSeatedFeather(surface, entry.covertCenter, entry.outward, entry.covertDirection,
                  entry.covertWidth, entry.spread, entry.tract + '-coverts');
                [flightFeather, covert].forEach(function (vane) {
                  if (!vane) return;
                  vane.userData.dinoWingLayer = manual ? 'primary' : 'secondary';
                  vane.userData.dinoWingSide = side; vane.userData.dinoWingIndex = entry.index;
                  dinoSurfacePartIds(vane, manual ? ['wrist', 'hand'] : ['elbow']);
                  // The existing paused/reduced-motion gate still owns animation.
                  // A shallower independent flutter keeps the resting layers coherent.
                  var motion = idleMotion.feathers.find(function (item) { return item.mesh === vane; });
                  if (motion) motion.amount = 0.005;
                });
              });
            }

function addLimbPlumage(surface, start, end, side, hind) {
              var restProfile = !hind && dinoFoldedWingProfileFor(dn);
              if (restProfile) { addRestingWingRows(surface, start, end, side, restProfile, false); return; }
              var spread = end.clone().sub(start), span = spread.length();
              var count = hind ? 8 : 10, tract = hind ? 'hind-wing' : 'forewing';
              for (var featherIndex = 0; featherIndex < count; featherIndex++) {
                var t = 0.08 + featherIndex / (count - 1) * 0.86;
                var center = start.clone().lerp(end, t);
                var fanLength = len * (hind ? 0.075 : 0.085) * (0.82 + Math.sin(t * Math.PI * 0.72) * 0.48);
                var direction = vec(fanLength, -fanLength * (0.14 + t * 0.10), side * fanLength * (0.25 + t * 0.22));
                var width = Math.max(span / count * 1.08, fanLength * 0.14);
                var outward = vec(1, 0.05, side * 0.4);
                addSeatedFeather(surface, center, outward, direction, width, spread, tract);
                // Short overlapping coverts soften the transition into the long vanes.
                var covertDirection = direction.clone().multiplyScalar(0.46).add(vec(0, width * 0.16, side * width * 0.16));
                addSeatedFeather(surface, center, vec(1, 0.18, side * 0.6),
                  covertDirection, width * 0.88, spread, tract + '-coverts');
              }
            }

              if (dn.id === 'microraptor' && surfaceHypothesis.tailFrond) {
                [-1, 1].forEach(function (tailSide) {
                  addSeatedFeather(tailMeshes[0], tailSurfaceCurve.getPoint(0.88), vec(0, 0.2, tailSide),
                    vec(len * 0.15, ht * 0.010, tailSide * bodyDepth * 0.07), len * 0.012, vec(0, 0, tailSide), 'terminal-tail');
                });
              } else if (surfaceHypothesis.tailFan) {
                var tailFanBase = tailSurfaceCurve.getPoint(0.86);
                for (var tailFanIndex = 0; tailFanIndex < 9; tailFanIndex++) {
                  var fanOffset = tailFanIndex - 4;
                  var fanDirection = vec(Math.max(0.18 * detailScale, len * 0.12) * (1 - Math.abs(fanOffset) * 0.05),
                    ht * 0.01, fanOffset * Math.max(0.030 * detailScale, surfaceBodyDepth * 0.18));
                  addSeatedFeather(tailMeshes[0], tailFanBase, vec(0, 0.6, fanOffset * 0.3),
                    fanDirection, Math.max(0.020 * detailScale, ht * 0.018), vec(0, 0, 1), 'tail-fan');
                }
              } else if (surfaceHypothesis.tailFrond) {
                for (var tailFrondIndex = 0; tailFrondIndex < 8; tailFrondIndex++) {
                  var tailFrondT = 0.26 + tailFrondIndex * 0.085;
                  [-1, 1].forEach(function (frondSide) {
                    var tailFrondBase = tailSurfaceCurve.getPoint(tailFrondT);
                    var frondDirection = vec(Math.max(0.025 * detailScale, len * 0.025), ht * 0.008,
                      frondSide * Math.max(0.10 * detailScale, surfaceBodyDepth * (0.65 - tailFrondT * 0.28)));
                    addSeatedFeather(tailMeshes[0], tailFrondBase, vec(0, 0.1, frondSide),
                      frondDirection, Math.max(0.014 * detailScale, len * 0.018), vec(frondSide, 0, 0), 'tail-frond');
                  });
                }
              }


              var cranialFaceBefore
`;
