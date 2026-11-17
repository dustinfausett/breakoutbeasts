import {PLANE_JOBS} from './rescue-data.js';
import {enterCityAnimal} from './city-movement.js';
// Complete objectives without taking players out of the playable mission.
export function completeTasksForTesting(g){if(!g||g.phase!=='play')return false;g.scoreLog.practice=true;
 const crew=g.activePlayers();const roomDoors=new Map(crew.filter(p=>p.inControlRoom).map(p=>[p.id,g.objects.find(o=>o.kind==='controlDoor'&&o.index===g.controlRoom.entered[p.id])]));const boarded=new Set(crew.filter(p=>p.inPlane).map(p=>p.id));
 for(const p of crew){p.prisonGame=null;p.carry=null;p.shopping=false;p.shopShelf=null;p.hold=null;p.under=null;p.hop=null;p.slide=null;p.shell=false;p.capturedT=0;p.caged=false;p.digChoice=null;p.digTarget=null;p.chapterStation=null;p.inControlRoom=false;p.muzzled=false;p.running=false;p.sprintT=0;p.flinch=0;p.input={mx:0,my:0,e:false,sp:false,b:false,run:false};}
 if(g.zooId==='city'){
  const r=g.rescue;r.fuses=new Set(crew.map(p=>p.id));r.inserted=new Set(crew.map(p=>p.id));r.signal=true;r.panelPhase='complete';r.cageProgress=0;
  for(const panel of Object.values(r.panels)){panel.done=5;panel.powered=true;}
  for(const o of g.objects)if(['rescueFuse','rescueGenerator','rescueLock','rescueTeam'].includes(o.kind))o.state=o.kind==='rescueGenerator'?crew.length:1;
  for(const a of r.animals){g.openGate(g.gate(a.gate));a.state='running';enterCityAnimal(g,a);a.state='escaped';}
  if(g.prison){g.prison.active=false;for(const lock of g.prison.locks){lock.done=true;lock.owner=null;lock.game=null;}g.openGate(g.gate('police-prison'));}
  g.openGate(g.gate('city-vault'));g.openGate(g.gate('city-cage'));g.openGate(g.gate('rescue-holding'));
  const f=r.flight;f.aboard=new Set();f.values=Object.fromEntries(PLANE_JOBS.map(j=>[j.id,j.choices[1]]));f.travel=0;f.y=397;f.phase='boarding';
  for(const p of crew){p.inPlane=false;if(boarded.has(p.id)){p.location='airport';p.x=101.5;p.y=407.5;p.safe=[p.x,p.y];}}
  g._callControl(30,'police');
 }else if(g.zooId==='parking'){
  const car=g.vehicle;car.unlocked=true;car.speed=0;car.heldAt={};for(const c of g._carControls())car.values[c.id]=c.goal;car.values.gas=0;car.values.brake=0;car.values.steering=0;g.obj('getaway').state=1;const holding=g.gate('holding-gate');if(holding)g.openGate(holding);
  for(const p of crew){p.escaped=true;p.cageKeys=1;}
  g.testExitNeedsDeparture=car.x>=67.5&&car.x<=74&&car.y>=60;
 }else{
  for(const enc of g.zoo.enclosures)g.openGate(g.gate(enc.mainGate));
  for(const part of g.parts){part.inserted=true;part.breaker=true;part.opened=true;part.fuse=true;}
  for(const o of g.objects)if(['socket','breaker','fuse'].includes(o.kind))o.state=1;
  g.controlRoom.phase='complete';for(const panel of Object.values(g.controlRoom.panels)){panel.done=5;panel.powered=true;}
  g.openGate(g.gate(g.zoo.exitGate));
  for(const p of crew){p.escaped=true;p.inExit=false;const door=roomDoors.get(p.id);if(door){p.x=door.stand[0]+.5;p.y=door.stand[1]+.5;p.safe=[p.x,p.y];door.state=0;}}
  g.testExitNeedsDeparture=crew.every(p=>g.inRect(p.x,p.y,g.zoo.exitZone));
 }
 g.rebuildBlock();return true;}
