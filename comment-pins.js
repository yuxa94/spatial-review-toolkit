import * as THREE from 'three';
export function mountCommentPins({host,camera,model,onSelect,requestRender=()=>{}}){
 const layer=document.createElement('div');layer.className='comment-pins';layer.setAttribute('aria-label','3D 위치 코멘트');host.append(layer);
 let entries=[],active=null,last=0;const ray=new THREE.Raycaster(),point=new THREE.Vector3(),screen=new THREE.Vector3(),origin=new THREE.Vector3(),direction=new THREE.Vector3();
 const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
 function set(comments,selected,draft){active=selected;layer.replaceChildren();entries=[...comments.filter(c=>c.point),...(draft?.point?[{...draft,id:'draft',number:'＋'}]:[])].map(c=>{
  const button=document.createElement('button');button.className='comment-pin'+(c.id===active?' selected':'')+(c.id==='draft'?' draft':'');button.textContent=c.number;button.dataset.commentId=c.id;button.setAttribute('aria-label',c.id==='draft'?'작성 중인 코멘트 위치':`코멘트 ${c.number}: ${c.text}`);button.title=c.text||'작성 중';button.onpointerdown=e=>e.stopPropagation();button.onpointerup=e=>e.stopPropagation();button.onclick=e=>{e.stopPropagation();if(c.id!=='draft')onSelect(c.id);};layer.append(button);return {c,button};});last=0;update(true);requestRender();}
 function update(force=false){if(!document.body.classList.contains('comments-open'))return;const now=performance.now();if(!force&&now-last<100)return;last=now;camera.updateMatrixWorld();const width=host.clientWidth,height=host.clientHeight;
  for(const {c,button} of entries){point.fromArray(c.point);screen.copy(point).project(camera);const group=model.groups.get(c.regionId);const shown=width>0&&height>0&&visible(group)&&screen.z>=-1&&screen.z<=1&&Math.abs(screen.x)<=1&&Math.abs(screen.y)<=1;button.hidden=!shown;if(!shown)continue;
   button.style.left=((screen.x+1)*width/2)+'px';button.style.top=((-screen.y+1)*height/2)+'px';
   if(camera.isOrthographicCamera){camera.getWorldDirection(direction);origin.copy(point).addScaledVector(direction,-camera.far);}else{origin.copy(camera.position);direction.subVectors(point,origin).normalize();}
   ray.set(origin,direction);const distance=origin.distanceTo(point);ray.far=Math.max(0,distance-.08);const blocked=ray.intersectObjects(model.pickables,false).some(h=>visible(h.object));button.classList.toggle('occluded',blocked);button.title=(blocked?'가려진 위치 · ':'')+(c.text||'작성 중');
  }
 }
 return {set,update,layer};
}
