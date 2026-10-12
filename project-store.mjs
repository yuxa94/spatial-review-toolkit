import {readFile,writeFile,mkdir,rename,open,unlink,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export const emptyProject=()=>({schema:'spatial-review/0.4',revision:0,comments:[],assets:[],views:[],briefs:[],versions:[],journeys:[]});
const str=(v,max=20000)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('필수 문자열이 없거나 너무 깁니다.');return v.trim();};
const xyz=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
export function applyAction(state,a){
 const now=new Date().toISOString(),id=randomUUID(),asset=id=>state.assets.some(x=>x.id===id),view=id=>state.views.some(x=>x.id===id);
 const belongs=(viewId,assetId)=>state.views.some(v=>v.id===viewId&&v.assetId===assetId)||state.versions.some(v=>v.viewId===viewId&&v.assetId===assetId);
 if(a.type==='comment.add'){
  if(a.point!=null&&!xyz(a.point))throw Error('코멘트 위치가 올바르지 않습니다.');
  const c=a.camera;if(c!=null&&(!a.point||!['overview','interior'].includes(c.kind)||!xyz(c.position)||!xyz(c.target)||(c.kind==='overview'&&(!xyz(c.up)||!Number.isFinite(c.height)||c.height<=0||!Number.isFinite(c.zoom)||c.zoom<=0))||(c.kind==='interior'&&(!Number.isFinite(c.fov)||c.fov<20||c.fov>110))))throw Error('코멘트 카메라가 올바르지 않습니다.');
  state.comments.push({id,regionId:str(a.regionId,100),objectId:a.objectId||null,objectName:a.objectName||null,point:a.point||null,camera:a.camera||null,text:str(a.text),resolved:false,createdAt:now});}
 else if(a.type==='comment.resolve'){const c=state.comments.find(x=>x.id===a.id);if(!c)throw Error('코멘트를 찾지 못했습니다.');c.resolved=!!a.resolved;}
 else if(a.type==='view.add'){if(!asset(a.assetId)||!xyz(a.camera?.position)||!xyz(a.camera?.target)||!Number.isFinite(a.camera?.fov)||a.camera.fov<20||a.camera.fov>110)throw Error('잘못된 뷰 또는 카메라입니다.');state.views.push({id,regionId:str(a.regionId,100),name:str(a.name,200),assetId:a.assetId,camera:a.camera,createdAt:now});}
 else if(a.type==='brief.add'){if(!view(a.viewId)||!belongs(a.viewId,a.baseAssetId)||!(a.referenceIds||[]).every(asset))throw Error('뷰 또는 이미지 연결을 확인하세요.');if((a.annotations||[]).length>100)throw Error('마감 지시는 100개 이하로 나눠 주세요.');for(const n of a.annotations||[]){str(n.text,2000);if(!['rect','pin'].includes(n.type)||![n.x,n.y,n.w||0,n.h||0].every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw Error('주석 좌표는 이미지 비율 좌표여야 합니다.');}
 state.briefs.push({id,viewId:a.viewId,baseAssetId:a.baseAssetId,annotatedAssetId:asset(a.annotatedAssetId)?a.annotatedAssetId:null,referenceIds:a.referenceIds||[],annotations:a.annotations||[],comment:a.comment||'',modelPreference:'GPT Image 2.5',createdAt:now});}
 else if(a.type==='version.add'){if(!view(a.viewId)||!asset(a.assetId)||(a.parentAssetId&&!belongs(a.viewId,a.parentAssetId)))throw Error('원본 뷰 또는 버전 이미지를 확인하세요.');state.versions.push({id,viewId:a.viewId,assetId:a.assetId,parentAssetId:a.parentAssetId||null,comment:a.comment||'',modelUsed:a.modelUsed||'미확인',createdAt:now});}
 else if(a.type==='journey.add'){const j=a.journey;if(!j||!Array.isArray(j.points)||j.points.length<2||j.points.length>20000||!j.points.every(xyz)||!Number.isFinite(j.speed)||j.speed<.2||j.speed>3||!Number.isFinite(j.length)||j.length<=0||!Number.isFinite(j.duration)||j.duration<=0||!Number.isFinite(j.eye)||j.eye<1||j.eye>2.1)throw Error('동선 좌표와 속도를 확인하세요.');state.journeys.push({...j,id,name:str(j.name,200),createdAt:now});}
 else throw Error('지원하지 않는 저장 동작입니다.');
 state.revision++;return id;
}
export class ProjectStore{
 constructor(directory){this.directory=directory;this.file=path.join(directory,'review.json');}
 async exportCapture(viewId){
  const state=await this.read(),view=state.views.find(v=>v.id===viewId);
  if(!view)throw Error('저장된 뷰를 찾지 못했습니다.');
  const asset=state.assets.find(a=>a.id===view.assetId);
  if(!asset||asset.mime!=='image/png')throw Error('PNG 캡처가 필요합니다.');
  const directory=path.join(path.dirname(this.directory),'captures');await mkdir(directory,{recursive:true});
  const safeName=view.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').replace(/[. ]+$/g,'').slice(0,60)||'view';
  const filename=view.createdAt.replace(/[:.]/g,'-')+'_'+safeName+'_'+view.id+'.png',file=path.join(directory,filename);
  try{await copyFile(path.join(this.directory,'assets',path.basename(asset.path)),file,1);}catch(e){if(e.code!=='EEXIST')throw e;}
  const metadata={viewId:view.id,name:view.name,regionId:view.regionId,camera:view.camera,sourceAssetId:asset.id,createdAt:view.createdAt};
  try{await writeFile(file.replace(/\.png$/,'.json'),JSON.stringify(metadata,null,2),{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
  return {filename,path:file,url:'captures/'+encodeURIComponent(filename)};
 }
 async read(){try{return JSON.parse(await readFile(this.file,'utf8'));}catch(e){if(e.code==='ENOENT')return emptyProject();throw e;}}
 async locked(fn){await mkdir(this.directory,{recursive:true});const lock=path.join(this.directory,'.write.lock');let handle;for(let i=0;i<100;i++){try{handle=await open(lock,'wx');break;}catch(e){if(e.code!=='EEXIST')throw e;await new Promise(r=>setTimeout(r,25));}}if(!handle)throw Error('다른 저장 작업이 진행 중입니다. 잠시 후 다시 시도하세요.');try{return await fn();}finally{await handle.close();await unlink(lock);}}
 async save(state){const temp=this.file+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(state,null,2));await rename(temp,this.file);}
 async action(a){return this.locked(async()=>{const state=await this.read(),id=applyAction(state,a);await this.save(state);return {id,state};});}
 async asset({name,dataURL}){const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(dataURL||'');if(!match)throw Error('PNG/JPEG/WebP 이미지만 저장할 수 있습니다.');const bytes=Buffer.from(match[2],'base64');if(bytes.length>12*1024*1024)throw Error('이미지는 12MB 이하로 준비하세요.');const format=match[1];if((format==='png'&&bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')||(format==='jpeg'&&bytes.subarray(0,2).toString('hex')!=='ffd8')||(format==='webp'&&(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')))throw Error('이미지 파일 형식이 올바르지 않습니다.');return this.locked(async()=>{const state=await this.read(),id=randomUUID(),ext=format==='jpeg'?'jpg':format,relative='project/assets/'+id+'.'+ext;await mkdir(path.join(this.directory,'assets'),{recursive:true});await writeFile(path.join(this.directory,'assets',id+'.'+ext),bytes);const entry={id,name:String(name||'image').slice(0,200),path:relative,mime:'image/'+format,createdAt:new Date().toISOString()};state.assets.push(entry);state.revision++;await this.save(state);return entry;});}
}
