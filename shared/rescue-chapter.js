import {enterCityAnimal,stepCityAnimal} from './city-movement.js';
import {hasTool} from './hardware.js';
import {RESCUE_SPECIES,RESCUE_NAMES,RESCUE_SCENES,PLANE_JOBS} from './rescue-data.js';
import {dist,bfs,lineOfSight,angleDiff} from './util.js';
import {DIRS,staffCanEnter} from './tiles.js';
import {makeKeepers} from './staff.js';
import {CLOTHES,isDisguised} from './wardrobe.js';
export const isRescueScene=scene=>RESCUE_SCENES.includes(scene);
const fingerprint=p=>[p.animal,...['hat','shirt','pants'].map(s=>p.outfit?.[s]||'bare')].join('|');
const allCaptured=g=>g.activePlayers().length>0&&g.activePlayers().every(p=>p.caged&&p.capturedT<=0);
const near=(g,p,o,r=1.8)=>dist(p.x,p.y,o.x+.5,o.y+.5)<r;
const active=g=>g.activePlayers();
export function initRescue(g,staff=true){
 const d=g.zoo.rescueDistrict;
 g.rescue={animals:d.cages.map(c=>({...c,x:c.home[0]+.5,y:c.home[1]+.5,state:'caged',path:null,face:'right',moving:false})),fuses:new Set(),inserted:new Set(),teamTimers:{},panels:{},signal:false,reports:[],wanted:new Set(),description:'',cageProgress:0,roster:active(g).map(p=>p.id).join('|'),flight:{aboard:new Set(),values:{},travel:0,x:116,y:397,phase:'boarding'}};
 for(const p of active(g))newPanel(g,p);
 for(const [i,[scene,x,y]] of d.visitors.entries())g.humans.push({id:'visitor'+i,scene,x:x+.5,y:y+.5,home:[x+.5,y+.5],angle:0,wallet:0,asleep:false,picked:false,phase:i,color:i%4,visitor:true});
 if(staff){const guards=makeKeepers(d.routes,6+Math.floor((active(g).length-1)/2));guards.forEach((s,i)=>{s.id=100+i;s.scene=d.routes[i%d.routes.length].scene;});g.staff.push(...guards);}
}
function newPanel(g,p){const index=g.order.indexOf(p.id),labels=[`BANANA ${index+1}`,`HONK ${index+1}`,`FISH SOCK ${index+1}`,`MOO ${index+1}`],controls=labels.map((label,i)=>({label,kind:(i+index)%3===0?'dial':(i+index)%3===1?'lever':'button',value:0,max:(i+index)%3===0?5:1})),planned=controls.map(()=>0),tasks=[];for(let i=0;i<5;i++){const control=Math.floor(g.rng()*controls.length),max=controls[control].max,value=(planned[control]+1+Math.floor(g.rng()*max))%(max+1);planned[control]=value;tasks.push({control,value});}g.rescue.panels[p.id]={controls,tasks,done:0,powered:false,reader:null};}
function routeClues(g){
 const people=active(g),owners=people.filter(p=>g.rescue.panels[p.id]?.done<5),assignments={};
 function assign(i,used){if(i===owners.length)return true;const owner=owners[i],last=g.rescue.panels[owner.id].reader,choices=people.filter(p=>!used.has(p.id)&&(people.length===1||p.id!==owner.id)).map(p=>({p,rank:g.rng()+(p.id===last?2:0)})).sort((a,b)=>a.rank-b.rank);for(const {p} of choices){assignments[owner.id]=p.id;used.add(p.id);if(assign(i+1,used))return true;used.delete(p.id);}return false;}
 assign(0,new Set());for(const p of owners)g.rescue.panels[p.id].reader=assignments[p.id];
}
export function exposeRescue(g,p){p.disguiseBlown=true;g.rescue.wanted.add(fingerprint(p));}
export function wantedInRescue(g,p){return g.rescue?.wanted.has(fingerprint(p));}
function report(g,p){if(p.hidden||p.under||p.capturedT>0)return;const r=g.rescue,key=fingerprint(p);if(r.wanted.has(key)||r.reports.some(q=>q.key===key))return;const witness=g.humans.find(n=>n.visitor&&n.scene===p.location&&!n.asleep&&dist(n.x,n.y,p.x,p.y)<8&&Math.abs(angleDiff(Math.atan2(p.y-n.y,p.x-n.x),n.angle))<1.25&&lineOfSight(n.x,n.y,p.x,p.y,(x,y)=>g.visionBlocked(x,y)));if(!witness)return;witness.phoneUntil=g.time+3;const clothes=['hat','shirt','pants'].map(slot=>CLOTHES.find(c=>c.id===p.outfit?.[slot])?.name||'no '+slot);r.reports.push({key,due:g.time+3,description:`${p.animal}: ${clothes.join(', ')}`,scene:p.location});g.emit({k:'visitorcalling',pid:p.id});}
export function rescueBite(g,p){
 if(!isRescueScene(p.location)||p.caged||p.muzzled||p.capturedT>0||p.chapterStation!=null||p.inPlane||p.under||p.hop||p.slide||p.shell)return false;
 const [fx,fy]=DIRS[p.face],n=g.humans.find(n=>n.visitor&&n.scene===p.location&&!n.asleep&&dist(p.x,p.y,n.x,n.y)<1.75&&(n.x-p.x)*fx+(n.y-p.y)*fy>-.35&&lineOfSight(p.x,p.y,n.x,n.y,(x,y)=>g.visionBlocked(x,y)));
 if(!n)return false;n.asleep=true;p.biteAnimT=.4;p.biteCool=0;p.disguiseBlown=true;g.rescue.wanted.add(fingerprint(p));g.permanentAlert=true;g._raiseAlert();report(g,p);g.emit({k:'citybite',pid:p.id});return true;
}
export function rescueTarget(g,p){
 if(p.caged&&p.cageDistrict==='rescue'){
  if(!allCaptured(g))return {text:'A free teammate can open the zoo cage latch',idle:true};
  const walls=[];const [x0,y0,x1,y1]=g.zoo.rescueDistrict.holding.rect;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if((x===x0||x===x1||y===y0||y===y1)&&!g.zoo.rescueDistrict.holding.doorTiles.some(t=>t[0]===x&&t[1]===y)&&dist(p.x,p.y,x+.5,y+.5)<1.3&&!active(g).some(q=>q!==p&&q.hold?.kind==='rescueBrace'&&q.hold.wall[0]===x&&q.hold.wall[1]===y))walls.push([x,y]);
  return walls.length?{text:'Hold E: everyone grab a different cage wall together',run:()=>{p.hold={kind:'rescueBrace',btn:'e',wall:walls[0],t:0,need:Infinity};}}:{text:'Move beside a free section of the cage wall',idle:true};
 }
 return null;
}
export function rescueObject(g,p,o){
 if(o.kind==='wayfinding')return {text:o.label,idle:true};
 if(o.kind==='districtLink')return {text:o.label,run:()=>g._enter(p,o.scene,null,o.to)};
 if(o.kind==='rescueLatch')return {text:'Open the zoo rescue cage',run:()=>{if(!p.caged)releaseCage(g);}};
 if(o.kind==='rescueFuse'){
  const owner=active(g).find(q=>g.order.indexOf(q.id)===o.index);if(!owner)return {text:'Spare habitat fuse',idle:true};if(owner.id!==p.id)return {text:`This fuse belongs to ${owner.name}`,idle:true};if(g.rescue.fuses.has(p.id)||g.rescue.inserted.has(p.id))return {text:'Your habitat fuse is already collected',idle:true};return {text:'Hold E: collect your habitat relay fuse',run:()=>{p.hold={kind:'rescueFuse',btn:'e',obj:o.id,t:0,need:1.2};}};
 }
 if(o.kind==='rescueGenerator'){if(g.rescue.inserted.has(p.id))return {text:'Your relay is connected — help your team',idle:true};return g.rescue.fuses.has(p.id)?{text:'Hold E: connect your habitat relay',run:()=>{p.hold={kind:'rescueInsert',btn:'e',obj:o.id,t:0,need:1};}}:{text:'Find your numbered habitat fuse first',idle:true};}
 if(o.kind==='rescueTeam'){
  const a=g.rescue.animals.find(a=>a.id===o.cage),owner=active(g).find(q=>g.order.indexOf(q.id)===o.index);if(a.state!=='caged')return {text:'This habitat is already open',idle:true};if(owner?.id!==p.id)return {text:owner?`${owner.name} must operate this handle`:'Spare handle',idle:true};if(a.species==='gorilla'&&!hasTool(p))return {text:'Buy a tool from Beaver Hardware before working on this habitat',idle:true};if(!powerDone(g))return {text:'Connect every habitat relay first',idle:true};return {text:'Hold E: all teammates must operate their own habitat handle',run:()=>{p.hold={kind:'rescueTeam',btn:'e',obj:o.id,cage:o.cage,t:0,need:Infinity};}};
 }
 if(o.kind==='rescueLock'){
  const a=g.rescue.animals.find(a=>a.id===o.cage);if(a.state!=='caged')return {text:'This animal is already free',idle:true};if(a.mechanism==='team')return {text:'Each teammate must hold their numbered habitat handle together',idle:true};if(a.mechanism==='power'&&!powerDone(g))return {text:'Restore power with one relay per teammate',idle:true};if(a.mechanism==='signal'&&!g.rescue.signal)return {text:'Complete the team signal-house consoles first',idle:true};if(a.mechanism==='key'&&!p.cageKeys)return {text:'Steal a reusable key from a zoo keeper first',idle:true};return {text:`Hold E: release the ${a.species}`,run:()=>{p.hold={kind:'rescueUnlock',btn:'e',obj:o.id,cage:a.id,t:0,need:1.4};}};
 }
 if(o.kind==='rescuePanel'){
  if(g.rescue.signal)return {text:'Habitat signal network is online',idle:true};if(!powerDone(g))return {text:'Connect every habitat relay first',idle:true};if(active(g).some(q=>q.id!==p.id&&q.chapterStation===o.index))return {text:'This station is occupied; choose another',idle:true};return {text:'Enter this signal-house station',run:()=>{p.chapterStation=o.index;p.hold=null;if(!g.rescue.panelPhase){g.rescue.panelPhase='waiting';g.rescue.panelRemaining=180;routeClues(g);}}};
 }
 if(o.kind==='boardPlane'){
  if(!allRescued(g))return {text:'Free every zoo, pet-store and Animal Control animal before boarding',idle:true};return {text:'Board the escape plane',run:()=>{p.inPlane=true;p.hold=null;p.x=g.rescue.flight.x;p.y=g.rescue.flight.y;g.rescue.flight.aboard.add(p.id);}};
 }
 return null;
}
export const powerDone=g=>active(g).every(p=>g.rescue.inserted.has(p.id));
export const allRescued=g=>g.rescue.animals.every(a=>a.state==='escaped');
function freeAnimal(g,a){g.obj('release-'+a.id).state=1;for(const o of g.objects)if(o.kind==='rescueTeam'&&o.cage===a.id)o.state=1;g.openGate(g.gate(a.gate));a.state='running';a.path=bfs(g.w,g.h,Math.floor(a.x),Math.floor(a.y),a.rally,(x,y)=>!g.entSolid[y*g.w+x]&&staffCanEnter(g.tileAt(x,y)),40000)||null;g.emit({k:'districtrescue',species:a.species});}
export function rescueHold(g,p,inp,dt){
 const h=p.hold;if(!h.kind.startsWith('rescue'))return false;
 if(!inp.e||!p.connected||p.capturedT>0){p.hold=null;return true;}
 if(h.kind==='rescueBrace'){if(!p.caged||!allCaptured(g)||dist(p.x,p.y,h.wall[0]+.5,h.wall[1]+.5)>1.4)p.hold=null;return true;}
 const o=g.obj(h.obj);if(!o||!near(g,p,o,1.9)||p.caged){p.hold=null;return true;}
 if(h.kind==='rescueTeam'){if(!powerDone(g))p.hold=null;return true;}
 h.t+=dt;if(h.t<h.need)return true;p.hold=null;
 if(h.kind==='rescueFuse'){g.rescue.fuses.add(p.id);o.state=1;}
 if(h.kind==='rescueInsert'&&g.rescue.fuses.has(p.id)){g.rescue.inserted.add(p.id);o.state=g.rescue.inserted.size;g.emit({k:'relayconnected',pid:p.id});}
 if(h.kind==='rescueUnlock'){const a=g.rescue.animals.find(a=>a.id===h.cage);if(a.state==='caged'){report(g,p);freeAnimal(g,a);}}
 return true;
}
export function rescueReturn(g,p){
 if(p.captureOrigin!=='rescue')return false;p.inVehicle=false;p.cageHits=0;p.carry=null;p.inPlane=false;p.chapterStation=null;p.caged=true;p.cageDistrict='rescue';p.capturedT=0;p.location='zoo';p.hold=null;p.shopping=false;p.shell=false;p.slide=null;p.hop=null;p.under=null;p.cageKeys=0;
 const i=g.order.indexOf(p.id),slots=g.zoo.rescueDistrict.holding.slots;[p.x,p.y]=slots[i].map(v=>v+.5);p.safe=[p.x,p.y];p.grace=5;g.closeGate(g.gate('rescue-holding'));return true;
}
function releaseCage(g){g.openGate(g.gate('rescue-holding'));for(const p of active(g))if(p.caged&&p.cageDistrict==='rescue'){p.caged=false;p.hold=null;p.grace=5;}g.rescue.cageProgress=0;g.emit({k:'districtcagerescue'});}
export function rescueAction(g,pid,msg){
 const p=g.players.get(pid),r=g.rescue;if(!p?.active||!p.connected||p.caged||p.capturedT>0||g.phase!=='play')return;
 if(msg.op==='leavePlane'&&p.inPlane&&r.flight.phase==='boarding'){p.inPlane=false;r.flight.aboard.delete(p.id);p.x=101.5;p.y=407.5;p.safe=[p.x,p.y];p.grace=3;return;}
 if(msg.op==='flight'&&p.inPlane){const job=PLANE_JOBS.find(j=>j.id===msg.control),index=PLANE_JOBS.indexOf(job),crew=active(g);if(!job||crew[index%crew.length].id!==pid||!job.choices.includes(msg.value)||r.flight.phase==='departed')return;r.flight.values[job.id]=msg.value;return;}
 if(p.chapterStation==null)return;
 const panel=r.panels[pid];if(msg.op==='leave'&&r.panelPhase==='waiting'){p.chapterStation=null;return;}
 if(!active(g).every(q=>q.connected&&q.chapterStation!=null))return;
 if(msg.op==='power'&&r.panelPhase==='arming')panel.powered=true;
 if(msg.op==='set'&&r.panelPhase==='running'&&panel.powered&&panel.done<5){const c=panel.controls[msg.control];if(!c||!Number.isInteger(msg.value)||msg.value<0||msg.value>c.max)return;c.value=msg.value;const t=panel.tasks[panel.done];if(t.control===msg.control&&t.value===msg.value){panel.done++;routeClues(g);}}
}
export function stepRescue(g,dt){
 const r=g.rescue,crew=active(g);if(!r||!crew.length)return;const roster=crew.map(p=>p.id).join('|');if(r.roster!==roster){r.roster=roster;for(const id of Object.keys(r.panels))if(!crew.some(p=>p.id===id))delete r.panels[id];routeClues(g);}
 for(const a of r.animals){a.moving=false;if(a.state==='escaped'){stepCityAnimal(g,a,dt);continue;}if(a.state!=='running')continue;if(!a.path)a.path=bfs(g.w,g.h,Math.floor(a.x),Math.floor(a.y),a.rally,(x,y)=>!g.entSolid[y*g.w+x]&&staffCanEnter(g.tileAt(x,y)),40000)||null;if(!a.path)continue;if(!a.path.length){enterCityAnimal(g,a);continue;}const t=a.path[0],dx=t[0]+.5-a.x,dy=t[1]+.5-a.y,d=Math.hypot(dx,dy),step=Math.min(d,dt*3.8);if(d>.001){a.x+=dx/d*step;a.y+=dy/d*step;a.face=dx<0?'left':'right';a.moving=true;}if(d<.12)a.path.shift();}
 for(const a of r.animals.filter(a=>a.mechanism==='team'&&a.state==='caged')){
  const ready=crew.length&&crew.every(p=>p.connected&&!p.caged&&p.capturedT<=0&&p.hold?.kind==='rescueTeam'&&p.hold.cage===a.id&&(a.species!=='gorilla'||hasTool(p))&&p.input.e&&near(g,p,g.obj(p.hold.obj),1.9));r.teamTimers[a.id]=ready?(r.teamTimers[a.id]||0)+dt:0;if(r.teamTimers[a.id]>=2.5){for(const p of crew){report(g,p);p.hold=null;}freeAnimal(g,a);}
 }
 const captives=crew.filter(p=>p.cageDistrict==='rescue'&&p.caged),brace=allCaptured(g)&&captives.length&&captives.every(p=>p.connected&&p.hold?.kind==='rescueBrace'&&p.input.e&&dist(p.x,p.y,p.hold.wall[0]+.5,p.hold.wall[1]+.5)<1.4);
 r.cageProgress=brace?r.cageProgress+dt:0;if(r.cageProgress>=1.5)releaseCage(g);
 const due=r.reports.filter(q=>q.due<=g.time);r.reports=r.reports.filter(q=>q.due>g.time);for(const q of due){r.wanted.add(q.key);r.description=q.description;g._raiseAlert();g.emit({k:'visitordescription',description:q.description});}
 for(const p of crew)if(!r.panels[p.id])newPanel(g,p);
 if(!r.signal&&r.panelPhase){
  if(r.panelPhase==='waiting'&&crew.every(p=>p.chapterStation!=null&&p.connected))r.panelPhase='arming';
  if(r.panelPhase==='arming'&&crew.every(p=>r.panels[p.id].powered))r.panelPhase='running';
  if(['arming','running'].includes(r.panelPhase)&&crew.every(p=>p.connected))r.panelRemaining-=dt;
  if(r.panelRemaining<=0){for(const p of crew){p.chapterStation=null;p.captureOrigin='rescue';g._capture({},p);newPanel(g,p);}r.panelPhase='waiting';r.panelRemaining=180;routeClues(g);g.emit({k:'districtpanelraid'});}
  if(crew.every(p=>r.panels[p.id].done===5)){r.signal=true;r.panelPhase='complete';for(const p of crew)p.chapterStation=null;g.emit({k:'districtsignal'});}
 }
 const f=r.flight,aboard=crew.length&&crew.every(p=>p.inPlane&&p.connected&&!p.caged&&p.capturedT<=0),correct=PLANE_JOBS.every(j=>f.values[j.id]===j.choices[1]);
 if(aboard&&correct&&allRescued(g)){f.phase='takeoff';f.travel+=dt*4;f.y=397-f.travel;for(const p of crew){p.x=f.x;p.y=f.y;}if(f.travel>=44){f.phase='departed';for(const p of crew)p.muzzled=false;g.phase='complete';g.emit({k:'flightdeparted'});g.emit({k:'complete'});}}
}
export function rescuePublic(g){const r=g.rescue;if(!r)return null;return {animals:r.animals.map(a=>({id:a.id,species:a.species,mechanism:a.mechanism,scene:a.scene,location:a.location||a.scene,x:a.x,y:a.y,state:a.state,face:a.face,moving:a.moving})),freed:r.animals.filter(a=>a.state==='escaped').length,total:r.animals.length,power:{done:powerDone(g),inserted:active(g).filter(p=>r.inserted.has(p.id)).length,need:active(g).length,team:active(g).map(p=>({id:p.id,name:p.name,index:g.order.indexOf(p.id),collected:r.fuses.has(p.id),inserted:r.inserted.has(p.id)}))},signal:r.signal,description:r.description,holding:{captured:active(g).filter(p=>p.caged&&p.cageDistrict==='rescue').length,progress:r.cageProgress},flight:{x:r.flight.x,y:r.flight.y,phase:r.flight.phase,progress:Math.min(1,r.flight.travel/44),aboard:active(g).filter(p=>p.inPlane).length,need:active(g).length},cages:r.animals.map(a=>({id:a.id,mechanism:a.mechanism,scene:a.scene,state:a.state}))};}
export function rescuePersonal(g,p){const r=g.rescue;if(!r)return {};
 const result={};if(p.inPlane){const crew=active(g);result.flight={...rescuePublic(g).flight,controls:PLANE_JOBS.filter((j,i)=>crew[i%crew.length].id===p.id).map(j=>({...j,value:r.flight.values[j.id]||j.choices[0]}))};}
 if(p.chapterStation!=null){const panel=r.panels[p.id],target=active(g).find(q=>r.panels[q.id]?.done<5&&r.panels[q.id]?.reader===p.id),other=target?r.panels[target.id]:null,t=other?.tasks[other.done],c=t?other.controls[t.control]:null;result.control={district:true,phase:r.panelPhase,remaining:r.panelRemaining,limit:180,powered:panel.powered,done:panel.done,controls:panel.controls,ready:active(g).every(q=>q.connected&&q.chapterStation!=null),paused:active(g).some(q=>!q.connected),team:active(g).map(q=>({id:q.id,name:q.name,inside:q.chapterStation!=null,powered:r.panels[q.id].powered,done:r.panels[q.id].done})),instruction:t?{target:target.id,index:other.done,control:t.control,value:t.value,text:`${c.label}: ${c.kind==='dial'?'turn to '+t.value:c.kind==='button'?(t.value?'press':'release'):(t.value?'UP':'DOWN')}. ${['Honk honk!','MooOO!','The emergency cabbage insists.','Baa! Baa!','The banana has filed a complaint.'][Math.floor(g.time)%5]}`}:{text:'Keep helping your team find the matching controls.'}};}
 return result;
}
