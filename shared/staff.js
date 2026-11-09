// Team size determines patrol pressure at the beginning of each mission.
export const zooKeeperCount=n=>4+Math.max(0,n-2);
export const parkingKeeperCount=n=>2+Math.floor(n/2);
export function makeKeepers(routes,count){return Array.from({length:count},(_,i)=>{
 const r=routes[i%routes.length],[x,y]=r.route[r.start];
 return {id:i,x:x+.5,y:y+.5,dir:0,route:r.route,wp:r.start,state:'patrol',alert:0,target:null,path:null,repath:0,lastSeen:null,lost:0,look:0,suspect:null,cheer:0,stuck:0};
});}
