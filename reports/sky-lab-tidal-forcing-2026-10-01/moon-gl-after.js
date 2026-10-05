  var AstroMoonGL = (function () {
    var S = null, status = 'idle', pending = null, node = null, sig = '';
    var notify = null, restoreAttempts = 0;

    function setStatus(next) {
      if (status === next) return;
      status = next;
      if (notify) { try { notify(next); } catch (e) {} }
    }

    function debug() {
      var memory = S && S.renderer && S.renderer.info ? S.renderer.info.memory : null;
      return {
        state: status,
        contextLost: !!(S && S.contextLost),
        renderCount: S ? (S.renderCount || 0) : 0,
        mode: S ? S.mode : null,
        scaleMode: S ? S.scaleMode : null,
        ageDays: S ? S.ageDays : null,
        overlays: S ? Object.assign({}, S.overlays) : null,
        moonY: S ? S.moonY : null,
        moonPos: S ? S.moonPos : null,
        inShadow: S ? S.inShadow : null,
        shadowMissRadii: S ? S.shadowMissRadii : null,
        umbraRadiusAtMoon: S ? S.umbraRadiusAtMoon : null,
        litFractionSeen: S ? S.litFractionSeen : null,
        nearFaceLocked: S ? S.nearFaceLocked : null,
        earthVisible: !!(S && S.refs && S.refs.earth && S.refs.earth.visible),
        starsVisible: !!(S && S.stars && S.stars.visible),
        ambientIntensity: S && S.ambient ? S.ambient.intensity : null,
        earthshineIntensity: S && S.earthshine ? S.earthshine.intensity : null,
        umbraBaseX: S ? 0 : null,
        umbraTipX: S ? -S.umbraLen : null,
        umbraBaseRadius: S ? 1 : null,
        umbraTipRadius: S ? 0 : null,
        umbraAxisDirection: S ? -1 : null,
        umbraTapersAwayFromEarth: !!(S && S.umbraLen > 0),
        penumbraBaseRadius: S ? 1 : null,
        penumbraTipRadius: S ? 2 : null,
        penumbraWidensAwayFromEarth: !!(S && S.umbraLen > 0),
        tidalGuideVisible: !!(S && S.refs && S.refs.lockArrow && S.refs.lockArrow.visible),
        surfaceTextureReady: !!(S && S.textureReady && S.textureReady.color),
        reliefTextureReady: !!(S && S.textureReady && S.textureReady.height),
        viewZoom: S ? S.zoom : null,
        cameraDistance: S && S.camera && S.target ? S.camera.position.distanceTo(S.target) : null,
        moonRadius: S ? S.moonRadius : null,
        viewAspect: S && S.camera ? S.camera.aspect : null,
        modelChildren: S && S.model ? S.model.children.length : 0,
        rendererMemory: memory ? { geometries: memory.geometries, textures: memory.textures } : null,
        canvas: S && S.renderer ? { w: S.renderer.domElement.width, h: S.renderer.domElement.height } : null
      };
    }

    function disposeMaterial(material) {
      if (!material) return;
      if (Array.isArray(material)) {
        for (var i = 0; i < material.length; i++) disposeMaterial(material[i]);
        return;
      }
      if (material.dispose) material.dispose();
    }

    function disposeGroup(group) {
      if (!group) return;
      var geometries = [], materials = [];
      group.traverse(function (child) {
        if (child.geometry && geometries.indexOf(child.geometry) < 0) geometries.push(child.geometry);
        if (child.material) {
          var list = Array.isArray(child.material) ? child.material : [child.material];
          for (var j = 0; j < list.length; j++) {
            if (materials.indexOf(list[j]) < 0) materials.push(list[j]);
          }
        }
      });
      for (var g = 0; g < geometries.length; g++) geometries[g].dispose();
      for (var m = 0; m < materials.length; m++) disposeMaterial(materials[m]);
      while (group.children.length) group.remove(group.children[group.children.length - 1]);
    }

    function makeStarField(THREE) {
      var count = 720;
      var positions = new Float32Array(count * 3);
      var radius = 800;
      for (var i = 0; i < count; i++) {
        var y = 1 - (i / Math.max(1, count - 1)) * 2;
        var radial = Math.sqrt(Math.max(0, 1 - y * y));
        var theta = i * 2.399963229728653;
        positions[i * 3] = Math.cos(theta) * radial * radius;
        positions[i * 3 + 1] = y * radius;
        positions[i * 3 + 2] = Math.sin(theta) * radial * radius;
      }
      var geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      return new THREE.Points(geometry, new THREE.PointsMaterial({
        color: 0xdbeafe, size: 1.15, sizeAttenuation: false,
        transparent: true, opacity: 0.78, depthWrite: false
      }));
    }

    function installMoonTextures() {
      if (!S || !S.THREE) return;
      var THREE = S.THREE;
      var loader = new THREE.TextureLoader();
      var owner = S;

      function loadOne(url, key, isColor) {
        if (!url) return;
        var texture;
        texture = loader.load(url, function (loaded) {
          if (S !== owner) { loaded.dispose(); return; }
          if (isColor && THREE.sRGBEncoding !== undefined) loaded.encoding = THREE.sRGBEncoding;
          loaded.anisotropy = Math.min(8, owner.renderer.capabilities.getMaxAnisotropy());
          loaded.needsUpdate = true;
          owner.textureReady[key] = true;
          owner.moonTextures[key] = loaded;
          if (owner.refs && owner.refs.moon && owner.refs.moon.material) {
            if (key === 'color') owner.refs.moon.material.map = loaded;
            else owner.refs.moon.material.bumpMap = loaded;
            owner.refs.moon.material.needsUpdate = true;
          }
          if (notify) { try { notify('texture'); } catch (e) {} }
        }, undefined, function () {
          if (S !== owner) return;
          owner.textureReady[key] = false;
          if (owner.refs && owner.refs.moon && owner.refs.moon.material) {
            if (key === 'color') owner.refs.moon.material.map = null;
            else owner.refs.moon.material.bumpMap = null;
            owner.refs.moon.material.needsUpdate = true;
          }
          if (texture) texture.dispose();
          owner.moonTextures[key] = null;
        });
        if (isColor && THREE.sRGBEncoding !== undefined) texture.encoding = THREE.sRGBEncoding;
        texture.anisotropy = Math.min(8, owner.renderer.capabilities.getMaxAnisotropy());
        owner.moonTextures[key] = texture;
      }

      loadOne(AM_MOON_COLOR_ASSET, 'color', true);
      loadOne(AM_MOON_HEIGHT_ASSET, 'height', false);
    }

    function moonMaterial(THREE) {
      return new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: S.moonTextures.color || null,
        bumpMap: S.moonTextures.height || null,
        bumpScale: 0.022,
        roughness: 0.96,
        metalness: 0
      });
    }

    function rebuildStructure(m) {
      var THREE = S.THREE;
      disposeGroup(S.model);
      S.refs = {};

      var trueScale = m.scaleMode === 'true';
      var orbitR = trueScale ? AM_TRUE_ORBIT_R : AM_ORBIT_R;
      var moonR = trueScale ? 0.273 : 0.42;
      var umbraLen = trueScale ? AM_TRUE_UMBRA_LEN : AM_UMBRA_LEN;
      S.orbitR = orbitR;
      S.moonRadius = moonR;
      S.umbraLen = umbraLen;

      var earth = new THREE.Mesh(
        new THREE.SphereGeometry(1, 64, 40),
        new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.82, metalness: 0 })
      );
      earth.castShadow = true;
      earth.receiveShadow = true;
      S.model.add(earth);
      S.refs.earth = earth;

      var atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.035, 48, 32),
        new THREE.MeshBasicMaterial({
          color: 0x60a5fa, transparent: true, opacity: 0.13,
          blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false
        })
      );
      S.model.add(atmosphere);
      S.refs.atmosphere = atmosphere;

      var moon = new THREE.Mesh(
        new THREE.SphereGeometry(moonR, 96, 64),
        moonMaterial(THREE)
      );
      moon.castShadow = true;
      moon.receiveShadow = true;
      S.model.add(moon);
      S.refs.moon = moon;

      var marker = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(0.045, moonR * 0.19), 18, 12),
        new THREE.MeshBasicMaterial({ color: 0xf472b6 })
      );
      S.model.add(marker);
      S.refs.marker = marker;

      var lockArrow = new THREE.ArrowHelper(
        new THREE.Vector3(-1, 0, 0), new THREE.Vector3(),
        Math.max(moonR * 2.1, orbitR * 0.025), 0xf472b6,
        Math.max(moonR * 0.35, orbitR * 0.008), Math.max(moonR * 0.2, orbitR * 0.004)
      );
      S.model.add(lockArrow);
      S.refs.lockArrow = lockArrow;

      var pts = [];
      for (var a = 0; a <= 128; a++) {
        pts.push(amMoonPos(THREE, (a / 128) * AM_SYNODIC, m.nodeDeg, orbitR));
      }
      var orbit = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.82 })
      );
      S.model.add(orbit);
      S.refs.orbit = orbit;

      var ring = [];
      for (var b = 0; b <= 128; b++) {
        var t = (b / 128) * Math.PI * 2;
        ring.push(new THREE.Vector3(orbitR * Math.cos(t), 0, orbitR * Math.sin(t)));
      }
      var ecliptic = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(ring),
        new THREE.LineDashedMaterial({ color: 0x64748b, dashSize: orbitR / 20, gapSize: orbitR / 28 })
      );
      ecliptic.computeLineDistances();
      S.model.add(ecliptic);
      S.refs.ecliptic = ecliptic;

      var penumbra = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 1.02, umbraLen, 40, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0x64748b, transparent: true, opacity: 0.11,
          side: THREE.DoubleSide, depthWrite: false
        })
      );
      // The faint penumbra begins at Earth and widens anti-sunward.
      penumbra.rotation.z = -Math.PI / 2;
      penumbra.position.set(-umbraLen / 2, 0, 0);
      S.model.add(penumbra);
      S.refs.penumbra = penumbra;

      var umbra = new THREE.Mesh(        new THREE.ConeGeometry(1, umbraLen, 40, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0x334155, transparent: true, opacity: 0.42,
          side: THREE.DoubleSide, depthWrite: false
        })
      );
      // ConeGeometry points its apex along +Y. Rotate -90° so the wide base
      // sits at Earth (x=0) and the umbra tapers anti-sunward toward -x.
      umbra.rotation.z = -Math.PI / 2;
      umbra.position.set(-umbraLen / 2, 0, 0);
      S.model.add(umbra);
      S.refs.umbra = umbra;

      var rays = new THREE.Group();
      for (var r = -1; r <= 1; r++) {
        var origin = new THREE.Vector3(orbitR * 1.55, 0, r * orbitR * 0.23);
        rays.add(new THREE.ArrowHelper(
          new THREE.Vector3(-1, 0, 0), origin, orbitR * 0.5,
          0xfbbf24, orbitR * 0.08, orbitR * 0.035
        ));
      }
      S.model.add(rays);
      S.refs.rays = rays;

      var sightGeometry = new THREE.BufferGeometry();
      sightGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
      var sight = new THREE.Line(
        sightGeometry,
        new THREE.LineBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.72 })
      );
      S.model.add(sight);
      S.refs.sight = sight;

      var shadowExtent = orbitR + 2;
      S.sunLight.position.set(Math.max(60, orbitR * 1.8), 0, 0);
      S.sunLight.shadow.camera.left = -shadowExtent;
      S.sunLight.shadow.camera.right = shadowExtent;
      S.sunLight.shadow.camera.top = shadowExtent;
      S.sunLight.shadow.camera.bottom = -shadowExtent;
      S.sunLight.shadow.camera.updateProjectionMatrix();

      S.structureSig = [m.nodeDeg, m.scaleMode].join('|');
    }

    function updateModel(m) {
      if (!S || !S.THREE) return;
      var THREE = S.THREE;
      var age = Number.isFinite(Number(m.ageDays))
        ? Math.max(0, Math.min(AM_SYNODIC, Number(m.ageDays))) : 0;
      var nodeDeg = Number.isFinite(Number(m.nodeDeg))
        ? Math.max(0, Math.min(90, Number(m.nodeDeg))) : 72;
      var mode = m.mode === 'telescope' ? 'telescope' : 'orbit';
      var scaleMode = m.scaleMode === 'true' ? 'true' : 'teaching';
      var overlays = {
        orbit: !!(m.overlays && m.overlays.orbit),
        sunlight: !!(m.overlays && m.overlays.sunlight),
        shadow: !!(m.overlays && m.overlays.shadow),
        labels: !!(m.overlays && m.overlays.labels),
        tidalLock: !!(m.overlays && m.overlays.tidalLock)
      };
      var structure = [nodeDeg, scaleMode].join('|');
      if (!S.refs || structure !== S.structureSig) {
        rebuildStructure({ nodeDeg: nodeDeg, scaleMode: scaleMode });
      }

      var moonPos = amMoonPos(THREE, age, nodeDeg, S.orbitR);
      var toEarth = moonPos.clone().negate().normalize();
      var phase = moonPhaseFromAge(age);

      S.refs.moon.position.copy(moonPos);
      S.refs.moon.quaternion.copy(amMoonOrientation(THREE, toEarth));
      S.refs.marker.position.copy(moonPos).addScaledVector(toEarth, S.moonRadius * 1.015);
      S.refs.lockArrow.position.copy(moonPos);
      S.refs.lockArrow.setDirection(toEarth);

      var sightPosition = S.refs.sight.geometry.attributes.position;
      sightPosition.setXYZ(0, 0, 0, 0);
      sightPosition.setXYZ(1, moonPos.x, moonPos.y, moonPos.z);
      sightPosition.needsUpdate = true;
      S.refs.sight.geometry.computeBoundingSphere();

      var orbitMode = mode === 'orbit';
      S.refs.earth.visible = orbitMode;
      S.refs.atmosphere.visible = orbitMode;
      S.refs.orbit.visible = orbitMode && overlays.orbit;
      S.refs.ecliptic.visible = orbitMode && overlays.orbit;
      S.refs.umbra.visible = orbitMode && overlays.shadow;
      S.refs.penumbra.visible = orbitMode && overlays.shadow;
      S.refs.rays.visible = orbitMode && overlays.sunlight;
      S.refs.sight.visible = orbitMode && overlays.labels;
      S.refs.marker.visible = orbitMode && overlays.tidalLock;
      S.refs.lockArrow.visible = orbitMode && overlays.tidalLock;
      S.stars.visible = orbitMode;

      S.earthshine.position.set(0, 0, 0);
      S.earthshine.target.position.copy(moonPos);
      S.earthshine.intensity = mode === 'telescope'
        ? 0.025 * Math.pow(Math.max(0, 1 - phase.illumination), 1.4) : 0;
      S.ambient.intensity = mode === 'telescope' ? 0.0025 : 0.075;

      var sunAt = new THREE.Vector3(Math.max(400, S.orbitR * 6), 0, 0);
      var toSunFromMoon = sunAt.clone().sub(moonPos).normalize();
      var cosPhaseAngle = toSunFromMoon.dot(toEarth);
      var behind = moonPos.x < 0;
      var missDist = Math.sqrt(moonPos.y * moonPos.y + moonPos.z * moonPos.z);

      S.mode = mode;
      S.scaleMode = scaleMode;
      S.ageDays = age;
      S.overlays = overlays;
      S.moonPosVector = moonPos.clone();
      S.moonPos = { x: +moonPos.x.toFixed(3), y: +moonPos.y.toFixed(3), z: +moonPos.z.toFixed(3) };
      S.moonY = +moonPos.y.toFixed(4);
      S.shadowMissRadii = +missDist.toFixed(3);
      S.umbraRadiusAtMoon = +amUmbraRadiusAt(moonPos.x, S.umbraLen).toFixed(3);
      S.inShadow = !!(behind && missDist < S.umbraRadiusAtMoon);
      S.litFractionSeen = +(((1 + cosPhaseAngle) / 2)).toFixed(4);
      var lockedDirection = new THREE.Vector3(1, 0, 0).applyQuaternion(S.refs.moon.quaternion);
      S.nearFaceLocked = lockedDirection.dot(toEarth) > 0.999;

      S.fitPts = [];
      for (var f = 0; f < 64; f++) {
        S.fitPts.push(amMoonPos(THREE, (f / 64) * AM_SYNODIC, nodeDeg, S.orbitR));
      }
      if (overlays.shadow) S.fitPts.push(new THREE.Vector3(-S.umbraLen, 0, 0));
      if (overlays.sunlight) S.fitPts.push(new THREE.Vector3(S.orbitR * 1.58, 0, 0));
    }

    function frame() {
      if (!S) return;
      S.raf = requestAnimationFrame(frame);
      if (S.contextLost || !S.renderer) return;

      if (pending) {
        var next = pending;
        pending = null;
        if (next.sig !== sig) {
          sig = next.sig;
          updateModel(next);
        }
        S.rotY = next.rotY;
        S.rotX = next.rotX;
        S.zoom = next.zoom;
        S.northUp = next.northUp !== false;
        if (next.objectLabels && S.objectLabels) {
          S.objectLabels.forEach(function (label) {
            var text = next.objectLabels[label.key];
            if (typeof text === 'string' && label.el.textContent !== text) label.el.textContent = text;
          });
        }
      }

      var el = S.renderer.domElement;
      // Keep model updates current, but avoid GPU work for a hidden or offscreen Moon.
      if (document.hidden || !el.isConnected) return;
      var bounds = el.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0 || bounds.bottom <= 0 || bounds.top >= window.innerHeight
        || bounds.right <= 0 || bounds.left >= window.innerWidth) return;
      var w = el.clientWidth || 1, hgt = el.clientHeight || 1;
      if (w !== S.lastW || hgt !== S.lastH) {
        S.lastW = w;
        S.lastH = hgt;
        S.renderer.setSize(w, hgt, false);
        S.camera.aspect = w / Math.max(1, hgt);
      }

      if (S.mode === 'telescope' && S.moonPosVector) {
        var telescopeToEarth = S.moonPosVector.clone().negate().normalize();
        // Fit the whole disc to the shorter screen dimension before magnifying.
        // A fixed vertical fit clips the Moon on portrait screens.
        var fitHalfAngle = Math.atan(Math.tan(14 * Math.PI / 180) * Math.min(1, w / Math.max(1, hgt)));
        var telescopeDistance = S.moonRadius * 1.12 / Math.sin(fitHalfAngle) / Math.sqrt(S.zoom || 1);
        S.camera.fov = 28;
        S.camera.up.set(0, S.northUp ? 1 : -1, 0);
        S.target.copy(S.moonPosVector);
        S.camera.position.copy(S.moonPosVector).addScaledVector(telescopeToEarth, telescopeDistance);
        S.camera.near = Math.max(0.002, telescopeDistance - S.moonRadius * 1.2);
        S.camera.far = 1800;
      } else {
        var ry = (S.rotY || 0) * Math.PI / 180;
        var rx = (S.rotX || 0) * Math.PI / 180;
        var dir = new S.THREE.Vector3(
          Math.cos(rx) * Math.sin(ry), Math.sin(rx), Math.cos(rx) * Math.cos(ry)
        ).normalize();
        var fit = 1;
        if (S.fitPts && S.fitPts.length) {
          var up0 = new S.THREE.Vector3(0, 1, 0);
          var right = new S.THREE.Vector3().crossVectors(up0, dir);
          if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
          right.normalize();
          var upv = new S.THREE.Vector3().crossVectors(dir, right).normalize();
          var tanV = Math.tan(38 * Math.PI / 360);
          var tanH = tanV * Math.max(0.2, S.camera.aspect);
          var pad = 1.15;
          for (var fi = 0; fi < S.fitPts.length; fi++) {
            var v = S.fitPts[fi];
            var along = v.dot(dir);
            var nh = (Math.abs(v.dot(right)) + pad) / tanH + along;
            var nv = (Math.abs(v.dot(upv)) + pad) / tanV + along;
            if (nh > fit) fit = nh;
            if (nv > fit) fit = nv;
          }
          fit *= 1.03;
        }
        var dist = fit / Math.max(0.3, S.zoom || 1);
        S.camera.fov = 38;
        S.camera.up.set(0, 1, 0);
        S.target.set(0, 0, 0);
        S.camera.position.copy(S.target).addScaledVector(dir, dist);
        S.camera.near = Math.max(0.05, dist * 0.01);
        S.camera.far = Math.max(1800, dist * 8 + 400);
      }

      S.camera.aspect = w / Math.max(1, hgt);
      S.camera.updateProjectionMatrix();
      S.camera.lookAt(S.target);
      try { S.renderer.render(S.scene, S.camera); S.renderCount = (S.renderCount || 0) + 1; } catch (e) {}
      if (S.labelLayer) {
        var showLabels = S.mode === 'orbit' && S.overlays.labels && S.moonPosVector;
        S.labelLayer.style.display = showLabels ? 'block' : 'none';
        if (showLabels) {
          var occupied = [];
          S.objectLabels.forEach(function (label) {
            var point = label.key === 'earth' ? new S.THREE.Vector3() : S.moonPosVector.clone();
            point.project(S.camera);
            var visible = point.z >= -1 && point.z <= 1 && Math.abs(point.x) < 1 && Math.abs(point.y) < 1;
            label.el.style.display = visible ? 'block' : 'none';
            if (!visible) return;
            var x = Math.max(36, Math.min(w - 36, (point.x + 1) * w / 2));
            var y = Math.max(102, Math.min(hgt - 56, (1 - point.y) * hgt / 2 + 20));
            if (occupied.some(function (p) { return Math.abs(x - p.x) < 72 && Math.abs(y - p.y) < 28; })) y += 30;
            var left = x.toFixed(1) + 'px', top = y.toFixed(1) + 'px';
            if (label.left !== left) { label.el.style.left = left; label.left = left; }
            if (label.top !== top) { label.el.style.top = top; label.top = top; }
            occupied.push({ x: x, y: y });
          });
        }
      }
    }

    function build(THREE, host) {
      var renderer;
      try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
      catch (e) { return false; }

      var w = host.clientWidth || 460, hgt = host.clientHeight || 300;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, hgt);
      renderer.setClearColor(0x030712, 1);
      if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
      if (THREE.ACESFilmicToneMapping !== undefined) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
      }

      var el = renderer.domElement;
      el.style.display = 'block';
      el.style.width = '100%';
      el.style.height = '100%';
      el.style.borderRadius = '12px';
      el.style.touchAction = 'pan-y';
      el.setAttribute('data-astro-moon-gl', 'true');
      el.setAttribute('aria-hidden', 'true');
      host.appendChild(el);

      var labelLayer = document.createElement('div');
      labelLayer.setAttribute('data-moon-object-labels', 'true');
      labelLayer.setAttribute('aria-hidden', 'true');
      labelLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;display:none';
      var objectLabels = ['earth', 'moon'].map(function (key) {
        var label = document.createElement('span');
        label.textContent = key === 'earth' ? 'Earth' : 'Moon';
        label.setAttribute('data-moon-object', key);
        label.style.cssText = 'position:absolute;transform:translateX(-50%);padding:4px 8px;border-radius:6px;background:rgba(3,7,18,.88);border:1px solid ' + (key === 'earth' ? '#60a5fa' : '#cbd5e1') + ';color:#f8fafc;font:700 12px system-ui;white-space:nowrap;box-shadow:0 2px 8px #030712';
        labelLayer.appendChild(label);
        return { key: key, el: label };
      });
      host.appendChild(labelLayer);

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(38, w / Math.max(1, hgt), 0.1, 4000);
      var ambient = new THREE.AmbientLight(0xffffff, 0.075);
      scene.add(ambient);

      var sunLight = new THREE.DirectionalLight(0xfff6df, 1.35);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 1;
      sunLight.shadow.camera.far = 400;
      sunLight.shadow.bias = -0.0012;
      scene.add(sunLight);
      scene.add(sunLight.target);

      var earthshine = new THREE.DirectionalLight(0x93c5fd, 0);
      scene.add(earthshine);
      scene.add(earthshine.target);

      var stars = makeStarField(THREE);
      scene.add(stars);
      var model = new THREE.Group();
      scene.add(model);

      S = {
        THREE: THREE, renderer: renderer, scene: scene, camera: camera, model: model,
        labelLayer: labelLayer, objectLabels: objectLabels,
        ambient: ambient, sunLight: sunLight, earthshine: earthshine, stars: stars,
        refs: {}, moonTextures: { color: null, height: null },
        textureReady: { color: false, height: false },
        mode: 'orbit', scaleMode: 'teaching', ageDays: 0,
        overlays: { orbit: true, sunlight: true, shadow: true, labels: true, tidalLock: true },
        moonY: null, moonPos: null, moonPosVector: null, inShadow: null,
        shadowMissRadii: null, umbraRadiusAtMoon: null, litFractionSeen: null,
        nearFaceLocked: null, rotY: 18, rotX: 34, zoom: 1, northUp: true,
        target: new THREE.Vector3(), fitPts: [], structureSig: '',
        contextLost: false, lastW: w, lastH: hgt, raf: 0
      };

      installMoonTextures();

      el.addEventListener('webglcontextlost', function (ev) {
        ev.preventDefault();
        if (!S) return;
        S.contextLost = true;
        setStatus('failed');
      });
      el.addEventListener('webglcontextrestored', function () {
        if (!S || restoreAttempts >= 1) return;
        restoreAttempts++;
        S.contextLost = false;
        sig = '';
        setStatus('ready');
      });

      sig = '';
      S.raf = requestAnimationFrame(frame);
      return true;
    }

    return {
      attach: function (host) {
        if (!host) { this.dispose(); return; }
        if (node === host && S) return;
        if (S) this.dispose();
        node = host;
        setStatus('loading');
        var ensure = window.StemLab && window.StemLab.ensureThree
          ? window.StemLab.ensureThree({ orbit: false, failMessage: '3D view unavailable' })
          : Promise.reject(new Error('no host loader'));
        ensure.then(function (THREE) {
          if (node !== host) return;
          if (!THREE) { setStatus('failed'); return; }
          setStatus(build(THREE, host) ? 'ready' : 'failed');
        }).catch(function () { setStatus('failed'); });
      },
      push: function (data) { pending = data; },
      onStatusChange: function (fn) { notify = fn; },
      status: function () { return status; },
      debug: debug,
      dispose: function () {
        if (S) {
          if (S.raf) cancelAnimationFrame(S.raf);
          if (S.labelLayer && S.labelLayer.parentNode) S.labelLayer.parentNode.removeChild(S.labelLayer);
          disposeGroup(S.model);
          if (S.stars) {
            if (S.stars.geometry) S.stars.geometry.dispose();
            disposeMaterial(S.stars.material);
            if (S.stars.parent) S.stars.parent.remove(S.stars);
          }
          if (S.moonTextures) {
            if (S.moonTextures.color) S.moonTextures.color.dispose();
            if (S.moonTextures.height) S.moonTextures.height.dispose();
          }
          if (S.renderer) {
            try { S.renderer.forceContextLoss(); } catch (e) {}
            try { S.renderer.dispose(); } catch (e) {}
            if (S.renderer.domElement && S.renderer.domElement.parentNode) {
              S.renderer.domElement.parentNode.removeChild(S.renderer.domElement);
            }
          }
        }
        S = null;
        node = null;
        pending = null;
        sig = '';
        restoreAttempts = 0;
        notify = null;
        setStatus('idle');
      }
    };
  })();
