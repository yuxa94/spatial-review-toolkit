import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('vendor', { recursive: true });
for (const [from, to] of [
  ['build/three.module.js','three.module.js'],
  ['build/three.core.js','three.core.js'],
  ['examples/jsm/controls/OrbitControls.js','OrbitControls.js'],
  ['LICENSE','THREE-LICENSE.txt'],
]) await copyFile(`node_modules/three/${from}`, `vendor/${to}`);
console.log('Three.js and OrbitControls bundled locally. No CDN required.');
const { build } = await import('esbuild');
await build({entryPoints:['node_modules/dxf-parser/dist/index.js'],bundle:true,format:'esm',outfile:'vendor/dxf-parser.js',platform:'browser'});
for(const file of ['web-ifc-api.js','web-ifc.wasm'])await copyFile(`node_modules/web-ifc/${file}`,`vendor/${file}`);
await copyFile('node_modules/web-ifc/LICENSE.md','vendor/WEB-IFC-LICENSE.md');
console.log('DXF parser and web-ifc/WASM bundled locally.');
await copyFile('node_modules/dxf-parser/LICENSE','vendor/DXF-PARSER-LICENSE.txt');
await copyFile('node_modules/loglevel/LICENSE-MIT','vendor/LOGLEVEL-LICENSE.txt');
const { cp } = await import('node:fs/promises');
await mkdir('vendor/pdfjs',{recursive:true});
for(const file of ['pdf.mjs','pdf.worker.mjs'])await copyFile(`node_modules/pdfjs-dist/build/${file}`,`vendor/pdfjs/${file}`);
for(const folder of ['cmaps','standard_fonts','wasm','iccs'])await cp(`node_modules/pdfjs-dist/${folder}`,`vendor/pdfjs/${folder}`,{recursive:true});
await copyFile('node_modules/pdfjs-dist/LICENSE','vendor/PDFJS-LICENSE.txt');
console.log('PDF.js and local worker/font/CMap/WASM assets bundled.');
await build({entryPoints:['scripts/journey-source.mjs'],bundle:true,format:'esm',outfile:'scripts/journey-engine.mjs',platform:'node',minify:true,plugins:[{name:'current-project-data',setup(b){b.onResolve({filter:/plan-data\.js$/},()=>({path:'../plan-data.js',external:true}));}}]});
console.log('Portable journey engine bundled.');
