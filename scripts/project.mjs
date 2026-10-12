import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ProjectStore} from '../project-store.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const store=new ProjectStore(process.env.SPATIAL_PROJECT_DIR||path.join(root,'project'));
const [command,...args]=process.argv.slice(2);
try{
 if(command==='brief'){
  const state=await store.read(),brief=state.briefs.find(b=>b.id===args[0]);if(!brief)throw Error('지시서를 찾지 못했습니다.');
  const view=state.views.find(v=>v.id===brief.viewId),ids=[view.assetId,brief.baseAssetId,brief.annotatedAssetId,...brief.referenceIds].filter(Boolean);
  console.log(JSON.stringify({brief,view,images:[...new Set(ids)].map(id=>{const a=state.assets.find(a=>a.id===id);return {...a,absolutePath:path.join(root,a.path)};}),comments:state.comments.filter(c=>c.regionId===view.regionId&&!c.resolved)},null,2));
 }else if(command==='version'){
  const [viewId,file,parentAssetId,note='Astra 시각화',modelUsed='미확인']=args;
  const bytes=await readFile(file),ext=path.extname(file).toLowerCase(),mime={'.png':'png','.jpg':'jpeg','.jpeg':'jpeg','.webp':'webp'}[ext];if(!mime)throw Error('PNG/JPEG/WebP 파일을 사용하세요.');
  const state=await store.read();if(!state.views.some(v=>v.id===viewId))throw Error('뷰를 찾지 못했습니다.');
  const a=await store.asset({name:path.basename(file),dataURL:'data:image/'+mime+';base64,'+bytes.toString('base64')});
  const result=await store.action({type:'version.add',viewId,assetId:a.id,parentAssetId,comment:note,modelUsed});console.log(JSON.stringify({id:result.id,asset:a},null,2));
 }else if(command==='journey'){
  const {generateJourney}=await import('./journey-engine.mjs');
  const request=JSON.parse(await readFile(args[0],'utf8')),journey=generateJourney(request),result=await store.action({type:'journey.add',journey});console.log(JSON.stringify({id:result.id,name:journey.name,length:journey.length,duration:journey.duration},null,2));
 }else throw Error('사용법: node scripts/project.mjs brief <id> | version <viewId> <imagePath> <parentAssetId> [note] [modelUsed] | journey <request.json>');
}catch(e){console.error(e.message);process.exitCode=1;}
