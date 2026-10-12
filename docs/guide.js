const announce=document.getElementById('copy-status');let timer;
for(const button of document.querySelectorAll('[data-copy]'))button.addEventListener('click',async()=>{
 const text=document.getElementById(button.dataset.copy).textContent.trim();
 try{await navigator.clipboard.writeText(text);announce.textContent='복사했습니다. 대화 또는 터미널에 붙여넣으세요.';}
 catch{const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(document.getElementById(button.dataset.copy));selection.removeAllRanges();selection.addRange(range);announce.textContent='내용을 선택했습니다. 복사 단축키로 복사하세요.';}
 clearTimeout(timer);timer=setTimeout(()=>announce.textContent='',3500);
});
for(const button of document.querySelectorAll('[data-os]'))button.addEventListener('click',()=>{
 for(const b of document.querySelectorAll('[data-os]'))b.setAttribute('aria-pressed',String(b===button));
 for(const panel of document.querySelectorAll('[data-panel]'))panel.hidden=panel.dataset.panel!==button.dataset.os;
});
const links=[...document.querySelectorAll('.contents>a')];
const observer=new IntersectionObserver(entries=>{
 const active=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];
 if(!active)return;for(const link of links){const selected=link.hash==='#'+active.target.id;link.classList.toggle('current',selected);if(selected)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}
},{rootMargin:'-15% 0px -65% 0px',threshold:0});
for(const section of document.querySelectorAll('main>section[id]'))observer.observe(section);
