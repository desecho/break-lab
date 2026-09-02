# Deferred polish

- The authored vase sections use a readable low-poly approximation rather than watertight curved fracture meshes.
- Impact marks are camera-facing surface discs rather than projected mesh decals.
- Detached-body collision audio is represented by rate-limited synthesized break sounds; Rapier contact-force event mixing is deferred.
- The chair demonstrates support failure through individually detachable legs. A fully dynamic seat-and-column collapse rig is deferred to avoid unstable compound joints in the MVP.
- Live-rendered menu thumbnails and optional bloom are omitted in favor of performance and a readable text terminal.
