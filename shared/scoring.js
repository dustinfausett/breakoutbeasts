// Versioned round records are calculated by the shared simulation, never clients.
export const SCORE_VERSION=1;
export const CAPTURE_PENALTY=300;
export function newScoreLog(){return {players:new Map(),seen:new Set(),sightings:0,alarms:0,resumed:false,practice:false};}
function playerLog(g,pid){if(!pid||!g.players.has(pid))return null;const logs=g.scoreLog.players;if(!logs.has(pid))logs.set(pid,{rescues:0,tasks:0,keys:0,helped:0,digs:0,noises:0,bites:0,cash:0,captures:0,sightings:0,runSeconds:0,driveSeconds:0,holdSeconds:0,activeSeconds:0,distance:0,lastPos:null,lastSeen:-Infinity});return logs.get(pid);}
export function scoreEvent(g,e){if(!g.scoreLog)return;if(e.pids){for(const pid of new Set(e.pids))scoreEvent(g,{...e,pids:null,pid});return;}const s=g.scoreLog,p=playerLog(g,e.helperPid||e.pid);if(e.k==='radio'&&p&&g.time-p.lastSeen>=5){p.lastSeen=g.time;p.sightings++;s.sightings++;}if(['shopTheft','controlcalled','visitorcalling'].includes(e.k))s.alarms++;
 if(!p)return;
 if(e.k==='capture')p.captures++;if(e.k==='noise')p.noises++;if(['bitten','citybite'].includes(e.k))p.bites++;if(e.k==='cash')p.cash+=Math.max(0,e.amount||0);if(e.k==='muzzleoff'&&e.helperPid&&e.helperPid!==e.pid)p.helped++;if(e.k==='dug')p.digs++;
 const metric=e.k==='rescue'||e.k==='districtrescue'?'rescues':['paneltask','socket','relayconnected','flighttask'].includes(e.k)?'tasks':e.k==='keystolen'?'keys':null;
 if(metric){const key=[e.k,e.pid,e.animal||e.cage||e.obj||e.done||e.staff||e.car||'once'].join('|');if(!s.seen.has(key)){s.seen.add(key);p[metric]++;}}
}
export function scoreTick(g,dt){for(const p of g.activePlayers()){if(!p.connected)continue;const m=playerLog(g,p.id);m.activeSeconds+=dt;if(p.moving&&p.sprintT>0)m.runSeconds+=dt;if(['rescueTeam','rescueBrace','cageWall','cityVault'].includes(p.hold?.kind))m.holdSeconds+=dt;
 const car=p.inVehicle?(g.cars||[g.vehicle]).find(c=>c&&(!p.vehicleId||c.id===p.vehicleId)):null;if(car&&Math.abs(car.speed)>.1&&Object.values(car.owners).includes(p.id))m.driveSeconds+=dt;
 if(m.lastPos&&!p.inVehicle&&!p.under&&p.capturedT<=0){const d=Math.hypot(p.x-m.lastPos[0],p.y-m.lastPos[1]);if(d<1.2)m.distance+=d;}m.lastPos=[p.x,p.y];}}
const clamp=v=>Math.max(0,Math.min(1,v));
export function taskCompletion(g){const crew=g.activePlayers(),n=Math.max(1,crew.length);if(g.phase==='complete')return 1;
 if(g.zooId==='city'){const r=g.rescue;if(!r)return 0;return clamp(r.animals.filter(a=>a.state==='escaped').length/Math.max(1,r.animals.length)*.5+clamp(r.inserted.size/n)*.15+(r.signal ? .15 : 0)+(r.flight.phase==='departed' ? .2 : 0));}
 if(g.zooId==='parking')return ((crew.some(p=>p.cageKeys)||g.vehicle.unlocked) ? .25 : 0)+(g.vehicle.unlocked ? .25 : 0)+clamp(crew.filter(p=>p.inVehicle).length/n)*.25;
 return (clamp(crew.filter(p=>p.escaped).length/n)+clamp(g.stats.rescued/Math.max(1,g.requiredRescues))+clamp(g.parts.filter(p=>p.inserted).length/Math.max(1,g.parts.length))+clamp(Object.values(g.controlRoom.panels).reduce((a,p)=>a+p.done,0)/(n*5)))/4;
}
const AWARDS=[
 ['rescuer','Chief Cage Unclencher',m=>m.rescues*3,m=>`Freed ${m.rescues} animal${m.rescues===1?'':'s'}. The locks have filed a complaint.`],
 ['operator','Certified Button Goblin',m=>m.tasks,m=>`Completed ${m.tasks} tasks. Human machinery fears your little paws.`],
 ['keys','Pocket-Sized Crime Boss',m=>m.keys*2,m=>`Stole ${m.keys} key set${m.keys===1?'':'s'}. Definitely a licensed locksmith.`],
 ['dentist','Muzzle Removal Dentist',m=>m.helped*4,m=>`Removed ${m.helped} teammate muzzle${m.helped===1?'':'s'}. No insurance accepted.`],
 ['digger','Minister of Underground Affairs',m=>m.digs*2,m=>`Dug ${m.digs} tunnel${m.digs===1?'':'s'}. Surface roads are for amateurs.`],
 ['driver','Department of Questionable Transport',m=>m.driveSeconds/20,m=>`Worked the car controls for ${Math.round(m.driveSeconds)} seconds. Nobody tell the DMV.`],
 ['lever','Unionized Lever Holder',m=>m.holdSeconds/4,m=>`Held team mechanisms for ${Math.round(m.holdSeconds)} seconds. Excellent standing-around skills.`],
 ['cardio','Cardio With Criminal Intent',m=>m.runSeconds/8,m=>`Ran for ${Math.round(m.runSeconds)} seconds. Fitness, but make it suspicious.`],
 ['noise','Walking Pots-and-Pans Drawer',m=>m.noises/4,m=>`Made ${m.noises} noises. Subtle as a shopping cart full of cymbals.`],
 ['frequent','Frequent Flyer, Enclosure Airlines',m=>m.captures*1.5,m=>`Caught ${m.captures} time${m.captures===1?'':'s'}. Your next enclosure visit earns a stamp.`],
 ['cash','Unlicensed Pocket Accountant',m=>m.cash/100,m=>`Collected $${m.cash}. The receipts were tragically eaten.`],
 ['bite','HR Would Like a Word',m=>m.bites*2,m=>`Bit ${m.bites} human${m.bites===1?'':'s'}. An extremely firm handshake.`],
 ['ghost','Suspiciously Absent',m=>!m.sightings&&!m.captures&&m.distance>1?2+Math.min(3,m.distance/100):0,m=>'Never spotted or caught. Possibly three leaves in an animal costume.'],
];
const FALLBACK=['Officially Part of the Problem','Escape Committee Intern','Wildly Unsupervised','Deputy Snack Inspector','Professional Bad Influence','Assistant to the Regional Raccoon','Honorary Distraction','Legally Still an Animal'];
export function playerAwards(g){const people=g.order.map(id=>g.players.get(id)),assigned=new Map(),used=new Set(),pairs=[];for(const [i,p] of people.entries()){const m=playerLog(g,p.id);for(const [id,title,rank,reason] of AWARDS){const value=rank(m);if(value>0)pairs.push({pid:p.id,id,title,reason:reason(m),value,index:i});}}pairs.sort((a,b)=>b.value-a.value||a.index-b.index||a.id.localeCompare(b.id));for(const a of pairs)if(!assigned.has(a.pid)&&!used.has(a.id)){assigned.set(a.pid,a);used.add(a.id);}return people.map((p,i)=>{const a=assigned.get(p.id);return {pid:p.id,name:p.name,animal:p.animal,active:p.active,id:a?.id||'crew-'+i,title:a?.title||FALLBACK[i%FALLBACK.length],reason:a?.reason||(playerLog(g,p.id).tasks?`Completed ${playerLog(g,p.id).tasks} tasks. The instruction manual has bite marks.`:playerLog(g,p.id).rescues?`Helped free ${playerLog(g,p.id).rescues} animals. The paperwork can wait.`:playerLog(g,p.id).distance>1?`Travelled ${Math.round(playerLog(g,p.id).distance)} tiles. Definitely meant to go that way.`:'Present for the scheme. Paperwork mysteriously missing.')};});}
export function roundScore(g){const n=g.activePlayers().length,stage=g.zooId==='city'?'city':g.zooId==='parking'?'parking':'zoo',par=stage==='city'?720:stage==='parking'?120:240+Math.max(0,4-n)*30;
 const efficiency=Math.round(3500*Math.max(.1,1-g.time/(par*3))),tasks=Math.round(3500*taskCompletion(g)),elusiveness=Math.max(0,3000-g.scoreLog.sightings*150-g.scoreLog.alarms*100),captures=g.stats.captures||0,penalty=captures*CAPTURE_PENALTY,total=Math.max(0,Math.min(10000,efficiency+tasks+elusiveness-penalty));
 const medal=total>=9500?'Platinum':total>=8500?'Gold':total>=7000?'Silver':total>=5000?'Bronze':null;
 return {version:SCORE_VERSION,stage,stageId:g.zooId,completed:g.phase==='complete',seconds:Math.round(g.time),crewSize:n,practice:!g.scoreLog.staffEnabled||g.scoreLog.practice,resumed:g.scoreLog.resumed,total,medal,breakdown:{efficiency,tasks,elusiveness,captures,capturePenalty:penalty,penaltyPerCapture:CAPTURE_PENALTY,sightings:g.scoreLog.sightings,alarms:g.scoreLog.alarms},awards:playerAwards(g)};
}
