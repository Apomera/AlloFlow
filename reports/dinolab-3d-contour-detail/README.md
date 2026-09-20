# Dino Lab body-feather detail

Body plumage now uses narrower, curved feather vanes with a gentle central ridge and smoothly varying lighting normals. The result reduces the flat, overlapping-scale appearance of the previous coat. Subtle shaft and barb shading follows each feather; screen-space filtering suppresses the fine pattern as it becomes too small to resolve.

The eight existing surface-attached coat meshes are retained. Feather density, reconstruction choices, wing anatomy, fossil data and species palettes are unchanged. Feather-local detail uses a separate coordinate attribute, preserving the skin-root samples that carry regional pigment patterns and tail bands. Filament coats retain their existing geometry and color treatment.

These remain schematic educational reconstructions. The refinement improves their visual surface, without claiming measured feather density, exact preserved three-dimensional shape, or newly discovered coloration.

## Visual review

The first reviewed render, Anchiornis, shows softer, narrower body plumage under the existing studio lighting. [Previous life view](../dinolab-3d-forewings/anchiornis-life.png) · [Refined life view](anchiornis-life.png) · [Body detail](anchiornis-body-detail.png)

## Validation

**53 focused unit checks across five suites passed.** They cover feather slenderness and curvature, finite normals and face winding, deterministic surface roots, pigment coordinate preservation, shader composition, existing wing geometry and reconstruction boundaries. [Unit results](unit-results.txt)

The first Anchiornis browser scenario passed, including the new shader and close-up view. [Preview results](preview-browser-results.txt)

**Eight distinct Chromium scenarios passed.** The seven remaining scenarios cover Microraptor, Yutyrannus, Sinosauropteryx, Tyrannosaurus's restricted alternative, Psittacosaurus bristle limits, motion/opacity/accessibility, and Velociraptor's minimum covering. [Browser results](browser-results.txt)

The sampled coat stayed rooted during breathing (maximum root displacement 0) and followed opacity changes. Resource counts remained 419 geometries / 8 textures before and after those interactions. The evidence panel had 0 axe violations. [Motion, opacity and accessibility record](motion-opacity-accessibility.json)

Six screenshots were visually reviewed, including light and dark pennaceous coats, two filament-covered species and the compact phone view. [Microraptor body detail](microraptor-body-detail.png) · [Phone](microraptor-phone.png) · [Sinosauropteryx](sinosauropteryx-life.png) · [Yutyrannus](yutyrannus-life.png)

Canonical, public and both existing desktop build copies are byte-identical. Renderer SHA256: 29cd4bf2da47c57de096945b0abbe33af5e186cd7c22b32f387b1d2eb93550c8. [Validation record](validation.json)

The additional geometry stays within the existing batched coat meshes: a pennaceous vane uses 27 vertices rather than 12. The detail shader adds no texture assets. Browser checks use software WebGL and do not establish physical-device frame rates.

No push, deployment or packaged installer.
