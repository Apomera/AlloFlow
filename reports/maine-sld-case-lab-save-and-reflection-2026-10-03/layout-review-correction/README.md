# Late save-failure visibility correction

The 338944e4 candidate passed all four targeted module scenarios. A separate capture-only late-quota check then showed 9.969 pixels clipped from the focused 95-pixel textarea in the 844×390 landscape viewport after the recovery footer appeared. The narrow 320×844 field stayed fully visible. Raw probe geometry and images are preserved in browser-validation.

The correction adjusts only content scroll, and only when failed saving changes the layout with an active writing control inside the content area. It keeps a seven-pixel focus allowance, does not call focus(), does not alter selection, and does not scroll on recovery. An oversized control uses nearest scrolling. The previous passed source, module, freeze and edit record remain here, with the corresponding served preview preserved under integration/reviewed-final. Final browser and geometry checks use the rebuilt candidate.
