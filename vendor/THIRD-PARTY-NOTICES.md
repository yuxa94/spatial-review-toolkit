# Included runtime libraries

- Three.js 0.186.1 — MIT — THREE-LICENSE.txt — https://github.com/mrdoob/three.js
- dxf-parser 1.1.2 — MIT — DXF-PARSER-LICENSE.txt — https://github.com/gdsestimating/dxf-parser
- loglevel (bundled into dxf-parser) — MIT — LOGLEVEL-LICENSE.txt — https://github.com/pimterry/loglevel
- web-ifc 0.0.78 — MPL-2.0 — WEB-IFC-LICENSE.md — https://github.com/ThatOpen/engine_web-ifc

web-ifc-api.js and web-ifc.wasm are unmodified files from the published web-ifc 0.0.78 package. Corresponding source is available from the upstream web-ifc repository and release history: https://github.com/ThatOpen/engine_web-ifc/releases . Package provenance: https://www.npmjs.com/package/web-ifc/v/0.0.78 . The MPL license applies to those covered files; the project-specific adapters are separate files. The DXF bundle is produced using scripts/vendor.mjs; dependency versions and integrity are pinned in package-lock.json.

- PDF.js (pdfjs-dist) 6.4.299 — Apache-2.0 — PDFJS-LICENSE.txt — https://github.com/mozilla/pdf.js . Local unmodified distribution assets are included under pdfjs/.

The portable `scripts/journey-engine.mjs` bundle also contains Three.js (MIT), together with this project's model/navigation code. Rebuild it with `npm run vendor`; the Three.js license above applies to the bundled library.
