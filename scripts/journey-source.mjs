import {buildModel} from '../scene-builder.js';
import {regions} from '../plan-data.js';
import {createNavigation,roomCamera,planJourney} from '../navigation.js';
export function generateJourney(request){
 const nav=createNavigation(buildModel()),eye=request.eye??1.6;
 const stops=request.stops.map(s=>{
  const r=regions.find(r=>r.id===s.regionId);if(!r)throw Error('알 수 없는 공간: '+s.regionId);
  return {...s,name:s.name||r.name,...(s.position?{}:roomCamera(r,nav,s.preset||'south',eye))};
 });
 return planJourney(stops,nav,{name:request.name||'Astra 보행 동선',eye,speed:request.speed??1.2});
}
