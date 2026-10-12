import {getProject,action} from './project-client.js';
/** Shared spatial review panel. Draft anchors are fixed at click time, not selection time. */
export function mountComments(container,getSelection,{onPlace=()=>{},onSelect=()=>{},onChange=()=>{},regionName=id=>id}={}){
 container.classList.add('spatial-comments');container.setAttribute('aria-label','공간 코멘트');
 container.innerHTML=`<div class="review-heading"><div><span class="review-eyebrow">SPATIAL REVIEW</span><h2>코멘트 <span class="review-count">0</span></h2></div><button class="review-refresh" aria-label="코멘트 새로고침">↻</button></div>
 <p class="review-intro">공간의 정확한 위치에 의견을 남기세요.</p>
 <button class="place-comment">＋ 위치에 코멘트 남기기</button><button class="room-comment">선택 공간 전체에 의견 남기기</button>
 <div class="review-filters"><label>공간<select class="review-scope"><option value="all">전체 공간</option><option value="selected">선택 공간</option></select></label><label>상태<select class="review-state"><option value="open">미해결</option><option value="all">전체 상태</option><option value="resolved">해결됨</option></select></label></div>
 <p class="review-status" role="status"></p><form class="review-compose" hidden><strong class="review-target"></strong><p class="review-coordinate"></p><label>의견<textarea rows="4" maxlength="20000" placeholder="예: 이 벽면은 밝은 오크 마감으로 검토해 주세요." required></textarea></label><div><button type="submit" class="review-save">코멘트 저장</button><button type="button" class="review-cancel">취소</button></div></form>
 <div class="review-list"></div><p class="review-footer">핀 클릭 ↔ 코멘트 선택 · 작성 시점으로 이동</p>`;
 const q=s=>container.querySelector(s);let all=[],active=null,draft=null,placing=false,sequence=0;
 const toggle=document.getElementById('toggle-comments');
 function setVisible(enabled){document.body.classList.toggle('comments-open',enabled);toggle?.setAttribute('aria-pressed',String(enabled));if(!enabled)mode(false);}
 if(toggle)toggle.onclick=()=>{const enabled=!document.body.classList.contains('comments-open');setVisible(enabled);if(enabled)refresh();};
 const visible=()=>all.filter(c=>(q('.review-scope').value==='all'||c.regionId===getSelection()?.regionId)&&(q('.review-state').value==='all'||c.resolved===(q('.review-state').value==='resolved')));
 const numbered=()=>visible().map(c=>({...c,number:all.findIndex(x=>x.id===c.id)+1}));
 function notify(){onChange(numbered(),active,draft);}
 function mode(value){placing=value;q('.place-comment').classList.toggle('active',value);q('.place-comment').textContent=value?'위치를 클릭하세요 · 취소':'＋ 위치에 코멘트 남기기';onPlace(value);}
 function clearDraft(){draft=null;q('.review-compose').hidden=true;q('textarea').value='';mode(false);notify();}
 function activate(id,{move=true}={}){const c=all.find(c=>c.id===id);if(!c)return;setVisible(true);active=id;
  if(!visible().some(x=>x.id===id)){q('.review-scope').value='all';q('.review-state').value='all';}
  render();container.querySelector(`[data-comment-id="${id}"]`)?.scrollIntoView({block:'nearest'});if(move)onSelect(c);
 }
 function render(){q('.review-count').textContent=all.filter(c=>!c.resolved).length;q('.room-comment').disabled=!getSelection()?.regionId;const list=q('.review-list');list.replaceChildren();const items=numbered();
  if(!items.length){const p=document.createElement('p');p.className='review-empty';p.textContent='표시할 코멘트가 없습니다. 위치를 찍어 첫 의견을 남겨 보세요.';list.append(p);}
  for(const c of [...items].reverse()){
   const card=document.createElement('article');card.dataset.commentId=c.id;card.onclick=e=>{if(!e.target.closest('button'))activate(c.id);};card.className='review-card'+(c.id===active?' selected':'')+(c.resolved?' resolved':'');
   const head=document.createElement('button');head.className='review-card-title';head.textContent=`${c.point?'●':'○'} ${c.number} · ${regionName(c.regionId)}`;head.setAttribute('aria-pressed',String(c.id===active));head.onclick=()=>activate(c.id);
   const tag=document.createElement('small');tag.textContent=(c.objectName||'공간 전체')+' · '+(c.point?'위치 지정':'위치 미지정')+' · '+(c.resolved?'해결됨':'미해결');
   const text=document.createElement('p');text.textContent=c.text;const time=document.createElement('small');time.textContent=new Date(c.createdAt).toLocaleString();
   const actions=document.createElement('div');actions.className='review-card-actions';const visit=document.createElement('button');visit.textContent=c.camera?'작성 시점 보기':c.point?'해당 위치 보기':'공간 선택';visit.onclick=()=>activate(c.id);
   const resolve=document.createElement('button');resolve.textContent=c.resolved?'다시 열기':'해결 처리';resolve.onclick=async()=>{resolve.disabled=true;try{await action({type:'comment.resolve',id:c.id,resolved:!c.resolved});await refresh();}catch(e){q('.review-status').textContent=e.message;resolve.disabled=false;}};
   actions.append(visit,resolve);card.append(head,tag,text,time,actions);list.append(card);
  }notify();
 }
 async function refresh(){const seq=++sequence;try{const data=await getProject();if(seq!==sequence)return;all=data.comments;render();}catch(e){q('.review-status').textContent=e.message;}}
 function begin(selection){draft=structuredClone(selection);mode(false);q('.review-compose').hidden=false;q('.review-target').textContent=(selection.point?'위치 지정 · ':'공간 의견 · ')+regionName(selection.regionId)+(selection.objectName?' / '+selection.objectName:'');q('.review-coordinate').textContent=selection.point?'선택한 위치와 현재 시점을 함께 저장합니다.':'이 의견에는 위치 핀이 표시되지 않습니다.';q('textarea').focus();q('.review-status').textContent='';notify();}
 q('.place-comment').onclick=()=>{if(placing){mode(false);q('.review-status').textContent='위치 선택을 취소했습니다.';}else{mode(true);q('.review-status').textContent='3D 화면의 벽·바닥·가구를 클릭하세요. Esc로 취소할 수 있습니다.';}};
 q('.room-comment').onclick=()=>{const s=getSelection();if(s?.regionId)begin({regionId:s.regionId,objectId:null,objectName:null,point:null,camera:null});};
 q('.review-cancel').onclick=clearDraft;q('.review-refresh').onclick=refresh;for(const name of ['scope','state'])q('.review-'+name).onchange=render;
 q('form').onsubmit=async e=>{e.preventDefault();const text=q('textarea').value.trim();if(!draft||!text)return;const button=q('.review-save');button.disabled=true;try{const result=await action({type:'comment.add',...draft,text});clearDraft();q('.review-state').value='open';q('.review-scope').value='all';await refresh();activate(result.id,{move:false});q('.review-status').textContent='코멘트를 저장했습니다.';}catch(error){q('.review-status').textContent=error.message;}finally{button.disabled=false;}};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&placing){mode(false);q('.review-status').textContent='위치 선택을 취소했습니다.';}});
 refresh();return {refresh,activate,begin,cancel:clearDraft,get placing(){return placing;}};
}
