import {cp,mkdir,readFile,writeFile,stat,rename,rm,readdir,chmod} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {validateModel} from '../model-schema.js';
import {emptyProject} from '../project-store.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function createProject({destination,modelFile,sourceFile,previewFile,templateRoot=root}){
 const target=path.resolve(destination),template=path.resolve(templateRoot);
 if(target===template||template.startsWith(target+path.sep)||target.startsWith(template+path.sep))throw Error('새 프로젝트는 패키지 밖의 별도 폴더에 만드세요.');
 try{await stat(target);throw Error('대상 폴더가 이미 있습니다. 덮어쓰지 않습니다.');}catch(e){if(e.code!=='ENOENT')throw e;}
 const model=validateModel(JSON.parse(await readFile(modelFile,'utf8')));
 const input=sourceFile?path.resolve(sourceFile):null,preview=previewFile?path.resolve(previewFile):input&&/\.(png|jpe?g|webp)$/i.test(input)?input:null;
 for(const f of [input,preview].filter(Boolean))if(!(await stat(f)).isFile())throw Error('원본 파일을 확인하세요.');
 if(preview&&!/\.(png|jpe?g|webp)$/i.test(preview))throw Error('미리보기는 PNG/JPEG/WebP여야 합니다.');
 model.source={...model.source,original:input?'sources/input'+path.extname(input).toLowerCase():null,preview:preview?'sources/preview'+path.extname(preview).toLowerCase():null};validateModel(model);
 const stage=target+'.creating-'+randomUUID();
 await mkdir(path.dirname(target),{recursive:true});await mkdir(stage);
 try{
  const excluded=new Set(['node_modules','release','artifacts','output','project','captures','sources','assets','tests','model.json','model-definition.js']);
  for(const e of await readdir(template,{withFileTypes:true})){if(e.name.startsWith('.')||excluded.has(e.name))continue;await cp(path.join(template,e.name),path.join(stage,e.name),{recursive:true});}
  const pkg=JSON.parse(await readFile(path.join(stage,'package.json'),'utf8'));pkg.scripts.test='node scripts/check-model.mjs';await writeFile(path.join(stage,'package.json'),JSON.stringify(pkg,null,2));
  await mkdir(path.join(stage,'sources'));await mkdir(path.join(stage,'project'));
  if(input)await cp(input,path.join(stage,model.source.original));if(preview)await cp(preview,path.join(stage,model.source.preview));
  await writeFile(path.join(stage,'model.json'),JSON.stringify(model,null,2));
  await writeFile(path.join(stage,'model-definition.js'),'export default '+JSON.stringify(model,null,2)+';\n');
  await writeFile(path.join(stage,'plan-data.js'),`import model from './model-definition.js';\nimport {normalizeModel} from './model-schema.js';\nexport const {MODEL,SCALE,world,source,zones,regions,structuralRegions,categoryLabels,footprint,voids,columns,partialBoundaries,SOURCE,META}=normalizeModel(model);\nexport const polygonArea=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2);\n`);
  await writeFile(path.join(stage,'project/review.json'),JSON.stringify(emptyProject(),null,2));
  await writeFile(path.join(stage,'PROJECT.md'),`# ${model.name}\n\n원본: ${model.source.original||'미첨부'}\n모델: model.json (spatial-model/1)\n\nStart.command / Start.bat로 실행합니다. model.json 수정 후 node scripts/sync-model.mjs를 실행하고 브라우저를 새로고침하세요. ID와 좌표계를 유지해야 기존 코멘트·시점이 유지됩니다. 변경된 모델에서는 저장 동선을 다시 검증하세요.\n\n${model.assumptions.map(a=>'- '+a).join('\n')}\n`);
  await chmod(path.join(stage,'Start.command'),0o755);await rename(stage,target);
 }catch(e){await rm(stage,{recursive:true,force:true});throw e;}
 return target;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [destination,modelFile,sourceFile,previewFile]=process.argv.slice(2);
 if(!destination||!modelFile){console.error('사용법: node scripts/new-project.mjs <새 폴더> <model.json> [원본 도면] [미리보기 PNG]');process.exitCode=1;}
 else try{console.log(await createProject({destination,modelFile,sourceFile,previewFile}));}catch(e){console.error(e.message);process.exitCode=1;}
}
