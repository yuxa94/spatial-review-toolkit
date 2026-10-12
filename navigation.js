import * as THREE from 'three';
import {footprint,voids,zones,world,regions,META} from './plan-data.js';
export function inside([x,y],poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
export function createNavigation(model,{step=.45,clearance=.24}={}){
 model.root.updateMatrixWorld(true);
 const floor=footprint.map(world),holes=voids.map(v=>v.polygon.map(world));
 const unknown=zones.filter(z=>['existing','service'].includes(z.category)).map(z=>z.polygon.map(world));
 const grouped=new Map();
 for(const m of model.pickables){if(!['wall','glass','column','furniture'].includes(m.userData.objectType))continue;
 const b=new THREE.Box3().setFromObject(m);if(b.max.y<.18||b.min.y>2.1)continue;
 const k=m.userData.furnitureId||m.userData.objectId;if(grouped.has(k))grouped.get(k).union(b);else grouped.set(k,b);}
 const boxes=[...grouped.values()].map(b=>[b.min.x-clearance,b.min.z-clearance,b.max.x+clearance,b.max.z+clearance]);
 const minX=Math.min(...floor.map(p=>p[0])),minZ=Math.min(...floor.map(p=>p[1])),maxX=Math.max(...floor.map(p=>p[0])),maxZ=Math.max(...floor.map(p=>p[1]));
 const nx=Math.ceil((maxX-minX)/step)+1,nz=Math.ceil((maxZ-minZ)/step)+1;
 function free(p){if(!inside(p,floor)||holes.some(poly=>inside(p,poly))||unknown.some(poly=>inside(p,poly)))return false;
 for(const [a,b,c,d] of boxes)if(p[0]>=a&&p[0]<=c&&p[1]>=b&&p[1]<=d)return false;
 for(const [dx,dz] of [[clearance,0],[-clearance,0],[0,clearance],[0,-clearance]]){const q=[p[0]+dx,p[1]+dz];if(!inside(q,floor)||holes.some(poly=>inside(q,poly)))return false;}return true;}
 const cells=new Uint8Array(nx*nz),point=i=>[minX+(i%nx)*step,minZ+Math.floor(i/nx)*step];
 for(let i=0;i<cells.length;i++)cells[i]=free(point(i))?1:0;
 function nearest(p,poly=null){let best=-1,dist=Infinity;for(let i=0;i<cells.length;i++)if(cells[i]){const q=point(i),d=(q[0]-p[0])**2+(q[1]-p[1])**2;if(d<dist&&(!poly||inside(q,poly))){dist=d;best=i;}}if(best<0)throw Error('이 공간에서 통행 가능한 위치를 찾지 못했습니다.');return {index:best,point:point(best),distance:Math.sqrt(dist)};}
 function segment(a,b){
 // Exact segment/AABB overlap prevents a sampled path from clipping a thin corner.
 for(const box of boxes){let lo=0,hi=1;for(let axis=0;axis<2;axis++){const d=b[axis]-a[axis];if(Math.abs(d)<1e-12){if(a[axis]<box[axis]||a[axis]>box[axis+2]){hi=-1;break;}}else{const t0=(box[axis]-a[axis])/d,t1=(box[axis+2]-a[axis])/d;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));}}if(lo<=hi)return false;}
 const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/(step/4));for(let i=0;i<=n;i++){const t=n?i/n:0;if(!free([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]))return false;}return true;}
 function route(a,b){const start=nearest(a),end=nearest(b);if(start.distance>1.5||end.distance>1.5)throw Error('시작/도착 위치가 통행 영역에서 벗어났습니다.');
 const g=new Float64Array(cells.length).fill(Infinity),prev=new Int32Array(cells.length).fill(-1),done=new Uint8Array(cells.length),heap=[];
 const heuristic=i=>Math.hypot((i%nx)-(end.index%nx),Math.floor(i/nx)-Math.floor(end.index/nx));
 function push(i,cost){const v={i,cost};heap.push(v);let n=heap.length-1;while(n){const p=(n-1)>>1;if(heap[p].cost<=cost)break;heap[n]=heap[p];n=p;}heap[n]=v;}
 function pop(){const first=heap[0],last=heap.pop();if(heap.length){let n=0;while(true){let k=n*2+1;if(k>=heap.length)break;if(k+1<heap.length&&heap[k+1].cost<heap[k].cost)k++;if(heap[k].cost>=last.cost)break;heap[n]=heap[k];n=k;}heap[n]=last;}return first.i;}
 g[start.index]=0;push(start.index,heuristic(start.index));
 while(heap.length){const u=pop();if(done[u])continue;done[u]=1;if(u===end.index)break;const ux=u%nx,uz=Math.floor(u/nx);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=ux+dx,z=uz+dz;if(x<0||x>=nx||z<0||z>=nz)continue;const v=z*nx+x;if(!cells[v]||done[v]||(dx&&dz&&(!cells[uz*nx+x]||!cells[z*nx+ux])))continue;if(!segment(point(u),point(v)))continue;const cost=g[u]+Math.hypot(dx,dz);if(cost<g[v]){g[v]=cost;prev[v]=u;push(v,cost+heuristic(v));}}}
 if(!done[end.index])throw Error('벽·가구·보이드를 피하는 연결 경로가 없습니다. 출입구와 정지점을 확인하세요.');
 const raw=[];for(let i=end.index;i!==-1;i=prev[i])raw.push(point(i));raw.reverse();const out=[raw[0]];let i=0;while(i<raw.length-1){let j=raw.length-1;while(j>i+1&&!segment(raw[i],raw[j]))j--;out.push(raw[j]);i=j;}return out;}
 function move(start,delta){
 // Keep route validation strict; manual walking may slide along a blocked axis.
 // Small swept steps prevent sliding around or through a corner in one frame.
 let p=[...start];if(!free(p))return p;
 const count=Math.max(1,Math.ceil(Math.hypot(...delta)/.05)),d=delta.map(v=>v/count);
 const axes=Math.abs(d[0])>=Math.abs(d[1])?[0,1]:[1,0];
 for(let i=0;i<count;i++){
  const next=p.map((v,k)=>v+d[k]);if(segment(p,next)){p=next;continue;}
  for(const axis of axes){if(!d[axis])continue;const slide=[...p];slide[axis]+=d[axis];if(segment(p,slide))p=slide;}
 }
 return p;
 }
 return {free,nearest,route,segment,move,step,clearance};
}
export function roomCamera(region,nav,preset='south',eye=1.6){
 if(!region.polygon)throw Error('실 경계가 없는 영역입니다.');const poly=region.polygon.map(world),xs=poly.map(p=>p[0]),zs=poly.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
 const proposals={south:[minX+(maxX-minX)*.22,minZ+(maxZ-minZ)*.82],north:[maxX-(maxX-minX)*.22,minZ+(maxZ-minZ)*.18],east:[maxX-(maxX-minX)*.18,cz],west:[minX+(maxX-minX)*.18,cz]};
 const p=nav.nearest(proposals[preset]||proposals.south,poly).point;return {position:[p[0],eye,p[1]],target:[cx,eye*.82,cz],fov:65};
}
export function planJourney(stops,nav,{eye=1.6,speed=1.2,name='공간 보행 동선'}={}){
 if(!Number.isFinite(speed)||speed<.2||speed>3||!Number.isFinite(eye)||eye<1||eye>2.1)throw Error('눈높이와 속도 범위를 확인하세요.');
 if(stops.length<2)throw Error('정지점을 두 개 이상 추가하세요.');let points=[];
 for(let i=1;i<stops.length;i++){const a=stops[i-1].position,b=stops[i].position,part=nav.route([a[0],a[2]],[b[0],b[2]]);points.push(...part.slice(i===1?0:1).map(([x,z])=>[x,eye,z]));}
 if(points.length<2)throw Error('서로 다른 위치를 지정하세요.');const length=points.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]-points[i][0],p[2]-points[i][2]),0);
 if(length<.01)throw Error('서로 다른 위치를 지정하세요.');
 return {name,points,stops,speed,eye,heightAssumed:true,length,duration:length/speed,clearance:nav.clearance,validatedAgainst:META.title+'; walls/furniture/voids; not real-world accessibility certification'};
}
export function sampleJourney(j,time){const distance=Math.min(Math.max(time*j.speed,0),j.length);let traversed=0;for(let i=1;i<j.points.length;i++){const a=j.points[i-1],b=j.points[i],d=Math.hypot(b[0]-a[0],b[2]-a[2]);if(distance<=traversed+d||i===j.points.length-1){const t=d?Math.min(1,(distance-traversed)/d):0;return {position:a.map((v,k)=>v+(b[k]-v)*t),direction:[b[0]-a[0],0,b[2]-a[2]]};}traversed+=d;}return {position:j.points[0],direction:[0,0,-1]};}
