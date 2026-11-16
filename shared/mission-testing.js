import {PLANE_JOBS} from './rescue-data.js';
import {enterCityAnimal} from './city-movement.js';
// Host-only transition testing. Keep normal result/Continue handling in Room.tick.
export function completeMissionForTesting(g){if(!g||g.phase!=='play')return false;g.scoreLog.practice=true;
 const crew=g.activePlayers();for(const p of crew){p.carry=null;p.shopping=false;p.shopShelf=null;p.hold=null;p.under=null;p.hop=null;p.slide=null;p.shell=false;p.capturedT=0;p.caged=false;p.digChoice=null;p.digTarget=null;p.chapterStation=null;p.inControlRoom=false;p.muzzled=false;p.running=false;p.sprintT=0;p.flinch=0;p.input={mx:0,my:0,e:false,sp:false,b:false,run:false};}
 if(g.zooId==='city'){
  const r=g.rescue;r.fuses=new Set(crew.map(p=>p.id));r.inserted=new Set(crew.map(p=>p.id));r.signal=true;r.panelPhase='complete';r.cageProgress=0;
  for(const panel of Object.values(r.panels)){panel.done=5;panel.powered=true;}
  for(const o of g.objects)if(['rescueFuse','rescueGenerator','rescueLock','rescueTeam'].includes(o.kind))o.state=o.kind==='rescueGenerator'?crew.length:1;
  for(const a of r.animals){g.openGate(g.gate(a.gate));a.state='running';enterCityAnimal(g,a);a.state='escaped';}
  g.openGate(g.gate('city-vault'));g.openGate(g.gate('city-cage'));g.openGate(g.gate('rescue-holding'));
  const f=r.flight;f.aboard=new Set(crew.map(p=>p.id));f.values=Object.fromEntries(PLANE_JOBS.map(j=>[j.id,j.choices[1]]));f.travel=44;f.y=353;f.phase='departed';
  for(const p of crew){p.inVehicle=false;p.vehicleId=null;p.inPlane=true;p.location='airport';p.x=f.x;p.y=f.y;p.safe=[p.x,p.y];}
 }else if(g.zooId==='parking'){
  const car=g.vehicle;car.unlocked=true;car.x=71;car.y=61;car.speed=0;car.heldAt={};for(const c of g._carControls())car.values[c.id]=c.goal;car.values.gas=0;car.values.brake=0;car.values.steering=0;g.obj('getaway').state=1;const holding=g.gate('holding-gate');if(holding)g.openGate(holding);
  for(const p of crew){p.inVehicle=true;p.escaped=true;p.cageKeys=1;p.x=car.x;p.y=car.y;p.safe=[p.x,p.y];}
 }else{
  for(const npc of g.npcs)g.openGate(g.gate(g.zoo.enclosures[npc.enc].mainGate));
  for(const part of g.parts){part.inserted=true;part.breaker=true;part.opened=true;part.fuse=true;}
  for(const o of g.objects)if(['socket','breaker','fuse'].includes(o.kind))o.state=1;
  g.controlRoom.phase='complete';for(const panel of Object.values(g.controlRoom.panels)){panel.done=5;panel.powered=true;}
  g.openGate(g.gate(g.zoo.exitGate));const [x0,y0,x1,y1]=g.zoo.exitZone;
  for(const p of crew){p.escaped=true;p.inExit=true;p.x=(x0+x1)/2+.5;p.y=(y0+y1)/2+.5;p.safe=[p.x,p.y];}
 }
 g.rebuildBlock();g.phase='complete';g.emit({k:'complete'});return true;}
