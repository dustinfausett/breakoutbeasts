import {dist,bfs} from './util.js';
import {T,staffCanEnter} from './tiles.js';
import {cancelPrisonGame} from './prison.js';
export const WALL_HOLD_SECONDS=1.5;
export const EXTRA_GUARD_INTERVAL=10;
export function allTeamCaptive(g){const crew=g.activePlayers();return crew.length>0&&crew.every(p=>p.capturedT<=0&&(p.caged||p.teamCaptive&&g.inOwnEnclosure(p)));}
export function allTeamCaught(g){const crew=g.activePlayers();return crew.length>0&&crew.every(p=>p.capturedT>0||p.caged||p.teamCaptive&&g.inOwnEnclosure(p));}
export function cellFor(g,p){
 if(g.zooId==='city'){
  if(p.cageDistrict==='police')return {id:'police',scene:'police',rect:g.zoo.policeLayout.holding,gate:'police-prison'};
  if(p.cageDistrict==='airport')return {id:'airport',scene:'airport',rect:g.zoo.airportLayout.holding,gate:'airport-prison'};
  if(p.cageDistrict==='rescue')return {id:'rescue',scene:'zoo',rect:g.zoo.rescueDistrict.holding.rect,gate:'rescue-holding'};
  if(p.caged)return {id:'control',scene:'control',rect:g.zoo.controlLayout.holding,gate:'city-cage'};
  return null;
 }
 if(g.holdingCage)return {id:'parking',scene:'street',rect:[2,52,8,58],gate:'holding-gate'};
 const e=g.zoo.enclosures[p.enc];return e?{id:'enc-'+p.enc,scene:'street',rect:e.rect,gate:e.mainGate}:null;
}
const captive=(g,p)=>p.caged||p.teamCaptive&&g.inOwnEnclosure(p);
function wallValid(g,p,h){const c=cellFor(g,p);return c&&h.cell===c.id&&h.scene===c.scene&&g.inRect(p.x,p.y,c.rect)&&dist(p.x,p.y,...h.wall.map(v=>v+.5))<1.45;}
export function cellTarget(g,p){
 if(p.capturedT>0||!captive(g,p))return null;
 const c=cellFor(g,p);if(!c)return null;
 const bin=g.objects.find(o=>o.kind==='can'&&(o.scene||'street')===c.scene&&dist(p.x,p.y,o.x+.5,o.y+.5)<1.15);
 if(bin)return g._objectInteraction(p,bin);
 if(!allTeamCaptive(g))return null;
 if(!g.inRect(p.x,p.y,c.rect))return null;
 const [x0,y0,x1,y1]=c.rect,walls=[];
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if((x===x0||x===x1||y===y0||y===y1)&&[T.WALL,T.FENCE,T.REINF,T.CLIMB,T.LOOSE].includes(g.tileAt(x,y))&&dist(p.x,p.y,x+.5,y+.5)<1.3&&!g.activePlayers().some(q=>q!==p&&q.hold?.kind==='teamWall'&&q.hold.scene===c.scene&&q.hold.wall[0]===x&&q.hold.wall[1]===y))walls.push([x,y]);
 return walls.length?{text:'Hold E: everyone grab a cell wall together',run:()=>{p.hold={kind:'teamWall',btn:'e',cell:c.id,scene:c.scene,wall:walls[0],t:0,need:WALL_HOLD_SECONDS};}}:{text:'Everyone move beside a free cell wall, then hold E together',idle:true};
}
export function cellHold(g,p,inp){if(p.hold?.kind!=='teamWall')return false;if(!inp.e||!p.connected||!allTeamCaptive(g)||!wallValid(g,p,p.hold))p.hold=null;return true;}
function releaseTeam(g){const crew=g.activePlayers(),cells=crew.map(p=>cellFor(g,p));
 for(const c of cells)if(c?.gate&&g.gate(c.gate))g.openGate(g.gate(c.gate));
 for(const pr of [g.prison,g.airportPrison].filter(Boolean))if(cells.some(c=>c?.gate===pr.gate)){pr.active=false;for(const l of pr.locks){l.done=true;l.owner=null;l.game=null;}}
 for(const p of crew){if(g.prison)cancelPrisonGame(g,p);p.caged=false;p.teamCaptive=false;p.prisonGame=null;p.hold=null;p.cageHits=0;p.grace=['police','airport'].includes(p.cageDistrict)?20:8;if(p.grace===20)p.policeEscapeUntil=g.time+20;}
 if(g.holdingCage)g.holdingCage.progress=0;if(g.rescue)g.rescue.cageProgress=0;g.teamWallProgress=0;g.emit({k:'teamcellopen'});
}
function disperse(g){for(const p of g.activePlayers())if(p.prisonGame!=null)cancelPrisonGame(g,p);const cells=g.activePlayers().map(p=>cellFor(g,p)).filter(Boolean);
 for(const s of g.staff){s.alert=0;s.target=null;s.lastSeen=null;s.suspect=null;s.goal=null;s.path=null;s.noiseLevel=0;s.noiseUntil=0;delete s.vehiclePursuit;delete s.stationResponseUntil;s.recognition={};
  if(s.downUntil>g.time||s.permanentDown)continue;s.state='return';
  const relevant=cells.filter(c=>c.scene===(s.scene||'street')),clearance=(x,y)=>relevant.length?Math.min(...relevant.map(c=>Math.hypot(Math.max(c.rect[0]-x,0,x-c.rect[2]),Math.max(c.rect[1]-y,0,y-c.rect[3])))):99;
  let points=(s.route||[]).filter(([x,y])=>clearance(x,y)>5);
  if(!points.length){const rect=g.zoo.interiors?.[s.scene]?.rect||[1,1,g.w-2,g.h-2];points=[];for(let y=rect[1]+1;y<rect[3];y+=3)for(let x=rect[0]+1;x<rect[2];x+=3)if(clearance(x,y)>6&&g._staffPass(x,y))points.push([x,y]);points.sort((a,b)=>dist(s.x,s.y,...a)-dist(s.x,s.y,...b));points=points.slice(0,12);}
  if(!points.length&&g.zoo.interiors?.[s.scene]?.exit&&g.obj('enter-'+s.scene)){s.disperseExit=[...g.zoo.interiors[s.scene].exit];s.route=[s.disperseExit];s.wp=0;s.path=null;}
  for(const point of points){const path=bfs(g.w,g.h,Math.floor(s.x),Math.floor(s.y),point,(x,y)=>g._staffPass(x,y),16000);if(path){s.route=[point,...(s.route||[]).filter(([x,y])=>clearance(x,y)>5)];s.wp=0;s.path=path;break;}}
 }
}
function reduceExtras(g,dt){if(g.time<g.alertUntil||g.permanentAlert){g.calmStaffTime=0;return;}g.calmStaffTime=(g.calmStaffTime||0)+dt;if(g.calmStaffTime<EXTRA_GUARD_INTERVAL)return;
 const extra=g.staff.filter(s=>s.reinforcement&&!s.draggedBy&&!g.activePlayers().some(p=>(p.hold?.staff===s.id||p.hold?.human===s.id))).sort((a,b)=>dist(b.x,b.y,...[g.activePlayers()[0]?.x||0,g.activePlayers()[0]?.y||0])-dist(a.x,a.y,...[g.activePlayers()[0]?.x||0,g.activePlayers()[0]?.y||0]))[0];
 if(!extra){g.calmStaffTime=0;return;}g.calmStaffTime=0;g.staff=g.staff.filter(s=>s!==extra);
 if(g.cars){g.cars=g.cars.filter(c=>!(c.police&&!c.stolen&&c.driver===extra.id&&!g.activePlayers().some(p=>p.inVehicle&&p.vehicleId===c.id)));g.rebuildBlock();}
}
export function stepCaptureCalm(g,dt){
 for(const p of g.activePlayers())if(p.teamCaptive&&p.capturedT<=0&&!p.caged&&!g.inOwnEnclosure(p))p.teamCaptive=false;
 const all=allTeamCaptive(g),caught=allTeamCaught(g),was=g.allTeamCaptured,wasInCells=g.allInCells;g.allTeamCaptured=caught;g.allInCells=all;
 if(caught){g.alertScale=0;g.alertUntil=g.time;g.permanentAlert=false;g.darts=[];g.checks=[];g.controlAlarm=null;g.localControl=[];if(g.police){g.police.backupQueue=[];g.police.suspicions.clear();}if(!was||all&&!wasInCells)disperse(g);}
 const crew=g.activePlayers(),ready=all&&crew.every(p=>p.connected&&p.hold?.kind==='teamWall'&&p.input.e&&wallValid(g,p,p.hold));
 g.teamWallProgress=ready?(g.teamWallProgress||0)+dt:0;for(const p of crew)if(p.hold?.kind==='teamWall')p.hold.t=g.teamWallProgress;
 if(g.teamWallProgress>=WALL_HOLD_SECONDS)releaseTeam(g);
 reduceExtras(g,dt);
}
export function ensureCellBins(g){if(g.cellBinsReady)return;g.cellBinsReady=true;
 const cells=g.zooId==='moonleaf'?g.zoo.enclosures.map(e=>({id:'enc-'+e.index,rect:e.rect,scene:'street'})):g.zooId==='parking'?(g.holdingCage?[{id:'parking',rect:[2,52,8,58],scene:'street'}]:[]):[{id:'police',rect:g.zoo.policeLayout.holding,scene:'police'},{id:'airport',rect:g.zoo.airportLayout.holding,scene:'airport'},{id:'control',rect:g.zoo.controlLayout.holding,scene:'control'},{id:'rescue',rect:g.zoo.rescueDistrict.holding.rect,scene:'zoo'},...(g.rescue?.animals||[]).filter(a=>a.rect).map(a=>({id:a.id,rect:a.rect,scene:a.scene}))];
 for(const c of cells){const [x0,y0,x1,y1]=c.rect;if(g.objects.some(o=>o.kind==='can'&&(o.scene||'street')===c.scene&&o.x>x0&&o.x<x1&&o.y>y0&&o.y<y1))continue;const candidates=[];
  for(let y=y0+1;y<y1;y++)for(let x=x0+1;x<x1;x++)if(staffCanEnter(g.tileAt(x,y))&&!g.entSolid[y*g.w+x]&&!g.objects.some(o=>dist(x,y,o.x,o.y)<2.1))candidates.push([x,y]);
  candidates.sort((a,b)=>dist(...a,(x0+x1)/2,(y0+y1)/2)-dist(...b,(x0+x1)/2,(y0+y1)/2));const point=candidates[0];if(point){g._addObject({id:'cell-bin-'+c.id,kind:'can',x:point[0],y:point[1],scene:c.scene,walkable:true,captureCan:true,label:'Garbage can'});g.defsVersion++;}
 }
}
export function restartPart(room,pid){if(pid!==room.hostId)return room.error(pid,'not_host','Only the host can restart this part.');if(room.phase!=='playing')return;const saved=room.partRestarts?.get(room.capturePart)||room.restartCheckpoint;room.startMission(saved?.stage||room.missionStage,saved?structuredClone(saved):null);}
