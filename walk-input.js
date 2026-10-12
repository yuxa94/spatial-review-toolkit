const movementByCode=new Map([
 ['KeyW','w'],['KeyA','a'],['KeyS','s'],['KeyD','d'],
 ...['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].map(code=>[code,code]),
]);
// Physical keys stay stable across IME composition, Shift and language changes.
export function updateWalkKeys(keys,event,pressed){
 const key=movementByCode.get(event.code);
 if(!key||pressed&&(event.metaKey||event.ctrlKey||event.altKey))return false;
 if(pressed)keys.add(key);else keys.delete(key);
 return true;
}
