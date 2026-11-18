import {applyBayTemplate,revertBay} from './bays.js';
import {stationPanel,routeStationClues} from './stations.js';
import {T} from './tiles.js';

// Add a crew member to the existing world without restarting completed work.
export function joinLiveGame(g,pd){
 const enc=g.zoo.enclosures.find(e=>e.animal===pd.animal);
 if(!enc)throw new Error('Choose an available animal.');
 const old=g.players.get(pd.id),p=old||g._newPlayer(pd,enc);
 const powered=(g.parts.length>0&&g.parts.every(p=>p.inserted))||g.controlRoom.phase==='complete';
 p.active=true;p.connected=true;p.name=pd.name;p.hold=null;p.input={};p.grace=8;
 if(!old)g.players.set(pd.id,p);
 if(!g.order.includes(pd.id)){
  // Numbered city fuses and handles use these eight roster positions.
  const slot=g.order.findIndex(id=>!g.players.get(id)?.active);
  if(slot>=0)g.order[slot]=pd.id;else g.order.push(pd.id);
 }
 g.team=g.activePlayers().length>1;
 if(g.zooId==='moonleaf')joinZoo(g,p,enc,powered);
 else{
  p.escaped=true;p.inVehicle=false;p.vehicleId=null;
  p.money=p.money||0;p.tools=p.tools||[];p.food=p.food||{};p.cart=p.cart||[];
  p.carKeys=p.carKeys||[];p.owned=p.owned||[];p.outfit=p.outfit||{};
  if(g.zooId==='city'){
   if(!old){p.location='street';p.x=12.5;p.y=18.5;}
   const crew=g.activePlayers().filter(q=>q!==p);
   if(crew.length&&crew.every(q=>g.rescue.inserted.has(q.id)))g.rescue.inserted.add(p.id);
   if(!g.rescue.panels[p.id]){
    g.rescue.panels[p.id]=stationPanel(g,g.order.indexOf(p.id));
    routeStationClues(g,g.rescue.panels);
    if(['arming','running'].includes(g.rescue.panelPhase))g.rescue.panelPhase='waiting';
   }
   if(g.flightChapter){
    p.inPlane=true;p.location='airport';p.x=g.rescue.flight.x;p.y=g.rescue.flight.y;
    g.rescue.flight.aboard.add(p.id);
   }
  }
 }
 if(g.zooId==='parking'){
  g._assignCarJobs();
  if(g.activePlayers().length>1&&!g.holdingCage)g._buildHoldingCage();
 }
 p.safe=[p.x,p.y];g.defsVersion++;g.rebuildBlock();return p;
}

function joinZoo(g,p,enc,powered){
 const npc=g.npcs.find(n=>n.animal===p.animal);
 if(npc){
  if(npc.state!=='caged'){p.x=npc.x;p.y=npc.y;p.escaped=true;}
  g.npcs=g.npcs.filter(n=>n!==npc);
  g.stats.rescued=g.npcs.filter(n=>n.state!=='caged').length;
 }
 g.requiredRescues=g.npcs.length;
 let part=g.parts.find(pt=>pt.pid===p.id)||g.parts.find(pt=>pt.pid==null)||g.parts.find(pt=>!g.players.get(pt.pid)?.active);
 if(part){
  // An orphan fuse may already be carried by a helper. Return it to its bay
  // before assigning it, so the helper cannot get stuck with a foreign fuse.
  if(part.pid!==p.id)for(const q of g.activePlayers())if(q.carry==='fuse:'+part.bay)g._dropCarry(q);
  part.pid=p.id;
 }else if(!powered){
  const bay=g.bayState.find(b=>!b.used);
  if(!bay)throw new Error('No spare power bay.');
  revertBay(g,bay);
  for(const id of [bay.cage,bay.breaker])if(!g.obj(id)){
   const o=g.zoo.objects.find(o=>o.id===id);if(o)g._addObject({...o});
  }
  g.setTile(...bay.door,T.PATH);bay.used=true;
  const index=Math.max(-1,...g.parts.map(pt=>pt.index))+1;bay.part=index;
  part={index,bay:bay.index,pid:p.id,animal:p.animal,template:p.animal,opened:false,breaker:false,fuse:false,inserted:false,socket:-1};
  g.parts.push(part);applyBayTemplate(g,bay,p.animal);
 }
 const c=g.controlRoom;
 for(const id of Object.keys(c.panels))if(!g.players.get(id)?.active){
  const door=g.objects.find(o=>o.kind==='controlDoor'&&o.index===c.entered[id]);
  if(door)door.state=0;delete c.panels[id];delete c.entered[id];
 }
 if(!c.panels[p.id]){
  const usedDoors=new Set(Object.values(c.panels).map(panel=>panel.doorIndex));
  const usedControls=new Set(Object.values(c.panels).map(panel=>panel.controls[0].color));
  const free=used=>Array.from({length:8},(_,i)=>i).find(i=>!used.has(i));
  c.panels[p.id]={...stationPanel(g,free(usedControls)),doorIndex:free(usedDoors)};
  if(p.inControlRoom){p.inControlRoom=false;p.x=enc.spawn[0]+.5;p.y=enc.spawn[1]+.5;}
  if(['arming','running'].includes(c.phase))c.phase='waiting';
  routeStationClues(g,c.panels);
 }
 if(c.phase==='complete'){c.panels[p.id].done=5;c.panels[p.id].powered=true;}
}
