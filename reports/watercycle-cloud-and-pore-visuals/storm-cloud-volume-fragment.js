              function drawCloudPuff(ctx2, x, y, radius, depth, moistureValue) {
                y = Math.max(radius * 0.9 + 10, y); // Keep the illuminated crown inside the chamber.
                // Light fields share the cloud's outer clip. They have no private rim.
                ctx2.save();
                var crownLight = ctx2.createRadialGradient(
                  x - radius * 0.32, y - radius * 0.42, radius * 0.06,
                  x - radius * 0.12, y - radius * 0.16, radius * 1.12
                );
                crownLight.addColorStop(0, 'rgba(255,255,255,' + (0.2 + moistureValue * 0.1) + ')');
                crownLight.addColorStop(0.52, 'rgba(240,248,251,0.09)');
                crownLight.addColorStop(1, 'rgba(240,248,251,0)');
                ctx2.fillStyle = crownLight;
                ctx2.fillRect(x - radius * 1.3, y - radius * 1.3, radius * 2.6, radius * 2.6);
                var depthShade = ctx2.createRadialGradient(
                  x + radius * 0.16, y + radius * 0.62, radius * 0.12,
                  x + radius * 0.1, y + radius * 0.46, radius * 1.2
                );
                depthShade.addColorStop(0, 'rgba(43,68,88,' + (0.07 + depth * 0.08 + moistureValue * 0.04) + ')');
                depthShade.addColorStop(0.58, 'rgba(60,88,107,0.04)');
                depthShade.addColorStop(1, 'rgba(60,88,107,0)');
                ctx2.fillStyle = depthShade;
                ctx2.fillRect(x - radius * 1.3, y - radius * 1.3, radius * 2.6, radius * 2.6);
                // Quiet, stable crown texture; the surface does not flicker between frames.
                for (var detail = 0; detail < 5; detail++) {
                  var angle = 3.35 + detail * 0.55;
                  var detailR = radius * (0.24 + (detail % 2) * 0.06);
                  var detailX = x + Math.cos(angle) * radius * 0.48;
                  var detailY = y + Math.sin(angle) * radius * 0.5;
                  var detailLight = ctx2.createRadialGradient(detailX, detailY, 0, detailX, detailY, detailR);
                  detailLight.addColorStop(0, 'rgba(255,255,255,0.07)');
                  detailLight.addColorStop(1, 'rgba(255,255,255,0)');
                  ctx2.fillStyle = detailLight;
                  ctx2.fillRect(detailX - detailR, detailY - detailR, detailR * 2, detailR * 2);
                }
                ctx2.restore();
              }

              function wcStormCloudSilhouette2d(ctx2, lobes, body) {
                ctx2.beginPath();
                lobes.forEach(function(lobe) {
                  var y = Math.max(lobe.radius * 0.9 + 10, lobe.y);
                  ctx2.moveTo(lobe.x + lobe.radius, y);
                  ctx2.arc(lobe.x, y, lobe.radius, 0, Math.PI * 2);
                  ctx2.closePath();
                });
                // The original cloud-base envelope joins the crowns into one volume.
                var w = body.width, cloudCenter = body.center, cloudY = body.y, cloudBase = body.base;
                ctx2.moveTo(cloudCenter - w * 0.21, cloudY + 25);
                ctx2.bezierCurveTo(cloudCenter - w * 0.12, cloudY + 13,
                  cloudCenter + w * 0.12, cloudY + 17, cloudCenter + w * 0.21, cloudY + 28);
                ctx2.bezierCurveTo(cloudCenter + w * 0.23, cloudBase - 14,
                  cloudCenter + w * 0.14, cloudBase + 5, cloudCenter + w * 0.07, cloudBase + 1);
                ctx2.bezierCurveTo(cloudCenter - w * 0.015, cloudBase + 10,
                  cloudCenter - w * 0.12, cloudBase + 4, cloudCenter - w * 0.19, cloudBase - 2);
                ctx2.quadraticCurveTo(cloudCenter - w * 0.23, cloudBase - 16, cloudCenter - w * 0.21, cloudY + 25);
                ctx2.closePath();
              }

              function wcDrawStormCloudVolume2d(ctx2, lobes, body) {
                if (!lobes.length) return;
                var top = Math.min.apply(null, lobes.map(function(lobe) {
                  return Math.max(lobe.radius * 0.9 + 10, lobe.y) - lobe.radius;
                }));
                var bottom = Math.max(body.base + 10, Math.max.apply(null, lobes.map(function(lobe) {
                  return Math.max(lobe.radius * 0.9 + 10, lobe.y) + lobe.radius;
                })));
                var light = ctx2.createLinearGradient(0, top, 0, bottom);
                light.addColorStop(0, model.isDark ? 'rgba(231,239,247,0.94)' : 'rgba(240,248,251,0.94)');
                light.addColorStop(0.28, model.isDark ? 'rgba(197,213,228,0.94)' : 'rgba(218,233,239,0.94)');
                light.addColorStop(0.64, model.isDark ? 'rgba(125,151,177,0.91)' : 'rgba(147,174,190,0.91)');
                light.addColorStop(1, model.isDark ? 'rgba(73,105,133,0.86)' : 'rgba(96,133,152,0.86)');
                ctx2.save();
                wcStormCloudSilhouette2d(ctx2, lobes, body);
                ctx2.fillStyle = light;
                ctx2.shadowColor = model.isDark ? 'rgba(220,236,248,0.12)' : 'rgba(236,246,250,0.2)';
                ctx2.shadowBlur = 3;
                ctx2.fill();
                ctx2.shadowBlur = 0;
                ctx2.clip();
                lobes.forEach(function(lobe) {
                  drawCloudPuff(ctx2, lobe.x, lobe.y, lobe.radius, lobe.depth, lobe.moisture);
                });
                var underside = ctx2.createLinearGradient(0, body.y + 10, 0, body.base + 10);
                underside.addColorStop(0, 'rgba(38,64,86,0)');
                underside.addColorStop(0.6, 'rgba(38,64,86,0.05)');
                underside.addColorStop(1, 'rgba(38,64,86,0.18)');
                ctx2.fillStyle = underside;
                ctx2.fillRect(0, top, body.width, bottom - top);
                ctx2.restore();
              }

              function wcStormScientificInk2d(ctx2, text, x, y) {
                ctx2.save();
                ctx2.strokeStyle = '#16364b';
                ctx2.lineWidth = 2.5;
                ctx2.lineJoin = 'round';
                ctx2.strokeText(text, x, y);
                ctx2.fillText(text, x, y);
                ctx2.restore();
              }
