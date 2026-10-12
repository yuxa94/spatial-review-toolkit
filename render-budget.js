// Schedule GPU work only for changed views; cap animation/recording at 30 fps.
export function createRenderBudget({fps=30}={}){
 let dirty=true,last=-Infinity;
 return {
  invalidate(){dirty=true;},
  consume(now,{visible=true,contextLost=false,continuous=false}={}){
   if(!visible||contextLost||(!dirty&&!continuous)||now-last<1000/fps)return false;
   dirty=false;last=now;return true;
  }
 };
}
