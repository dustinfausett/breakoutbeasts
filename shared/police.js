import {makeKeepers} from './staff.js';
import {stepTraffic} from './traffic.js';
import {carsOverlap} from './car-pushing.js';
import {dist} from './util.js';
import {CLOTHES,isDisguised} from './wardrobe.js';
const ROUTES=[[[50,44],[88,44],[88,76],[50,76]],[[88,76],[126,76],[126,108],[88,108]]];
export const policeSignature=p=>[p.animal,...['hat','shirt','pants'].map(k=>p.outfit?.[k]||'bare')].join('|');
export function initPolice(g){g.police={active:false,descriptions:new Set(),description:'',suspicions:new Map(),nextBackup:0};}
export function policeRecognized(g,p){return !!g.police?.descriptions.has(policeSignature(p));}
export function policeExpose(g,p){if(!g.police)return;const signature=policeSignature(p);if(g.police.descriptions.has(signature))return;g.police.descriptions.add(signature);g.police.description=`${p.animal}: ${['hat','shirt','pants'].map(k=>CLOTHES.find(c=>c.id===p.outfit?.[k])?.name||'no '+k).join(', ')}`;g.emit({k:'policeidentified',pid:p.id,name:p.name,description:g.police.description});}
export function policeRecognition(g,s,dt,visible){if(!g.police||s.downUntil>g.time)return;s.recognition=s.recognition||{};for(const p of g.activePlayers()){
 if(g.policeWanted?.has(p.id)){policeExpose(g,p);g.policeWanted.delete(p.id);}
 const signature=policeSignature(p);if((s.scene||'street')!==(p.location||'street')||!g.detectable(p)||!visible(s,p)){delete s.recognition[p.id];continue;}
 if(policeRecognized(g,p))continue;let scan=s.recognition[p.id];if(!scan||scan.signature!==signature)scan=s.recognition[p.id]={signature,time:0};const need=isDisguised(p)?4:Object.keys(p.outfit||{}).length?1.5:.15;scan.time+=dt;g.police.suspicions.set(p.id,{signature,progress:Math.min(1,scan.time/need),at:g.time});if(scan.time>=need)policeExpose(g,p);
 }}
function dismount(g,car,s){s.inCar=false;car.speed=0;let goal=null;for(const [dx,dy] of [[0,3],[0,-3],[3,0],[-3,0]]){const x=Math.floor(car.x+dx),y=Math.floor(car.y+dy);if(g._staffPass(x,y)){goal=[x,y];break;}}goal=goal||g._nearestStaffTile(Math.floor(car.x+3),Math.floor(car.y));if(goal){s.x=goal[0]+.5;s.y=goal[1]+.5;}s.path=null;s.repath=0;return goal;}
export function stealPoliceCar(g,p,s){const car=g.cars.find(c=>c.id===s.carId);if(!car)return;car.stolen=true;car.traffic=false;car.speed=0;car.owners={};car.values={...car.values,gear:'Park',gas:0,brake:0,steering:0};for(const cop of g.staff)if(cop.inCar&&cop.carId===car.id)dismount(g,car,cop);if(!p.carKeys.includes(car.id))p.carKeys.push(car.id);p.carFob=car.id;p.cageKeys=1;s.keyCool=g.time+12;g.emit({k:'keystolen',pid:p.id,car:car.id});g.msg(p,'Police car keys stolen! Use your fob to find and unlock it.');}
function addPatrolCars(g){if(g.cars.filter(c=>c.police).length>=12)return;const unassigned=g.staff.filter(s=>s.police&&(s.scene||'street')==='street'&&!s.carId&&!(s.downUntil>g.time));for(const officer of unassigned.slice(0,2)){
 let point=null;for(const [x,y] of [[50,110],[126,110],[88,76],[50,44],[126,44],[88,110],[50,76]]){const pose={x,y,angle:0};if(g._terrainFits(x,y,0)&&g.cars.every(c=>!carsOverlap(pose,c))){point=[x,y];break;}}if(!point)continue;
 const [x,y]=point,route=[[x,y],[x,y<76?110:44],[x<88?126:50,y<76?110:44],[x<88?126:50,y]],car={...g.vehicle,id:'police-car-'+g.nid++,x,y,angle:0,police:true,stolen:false,traffic:true,trafficRoute:route,trafficIndex:1,trafficSpeed:2.6,patrolPhase:'driving',phaseUntil:g.time+18,driver:officer.id,unlocked:false,speed:0,owners:{},values:{...g.vehicle.values,gear:'Park',gas:0,brake:0,steering:0},heldAt:{},lightsUntil:0,alarmUntil:0};g.cars.push(car);officer.carId=car.id;officer.inCar=true;officer.x=x;officer.y=y;
 }
 const available=g.cars.filter(c=>c.police&&!c.stolen);for(const [i,s] of g.staff.filter(s=>s.police&&!s.carId).entries())if(available.length)s.carId=available[i%available.length].id;
}
export function startPolicePatrols(g){g.police.active=true;g.police.nextBackup=g.time+45;addPatrolCars(g);}
export function stepPoliceCar(g,car,dt){const s=g.staff.find(s=>s.id===car.driver);if(!s||s.downUntil>g.time){car.speed=0;if(s&&s.inCar)dismount(g,car,s);return;}
 if(car.patrolPhase==='driving'){s.inCar=true;stepTraffic(g,car,dt);s.x=car.x;s.y=car.y;s.dir=car.angle;if(g.time>=car.phaseUntil||s.state==='chase'){dismount(g,car,s);car.patrolPhase='walking';car.phaseUntil=g.time+22;}return;}
 car.speed=0;if(g.time<car.phaseUntil||s.state==='chase')return;
 const goal=g._nearestStaffTile(Math.floor(car.x+3),Math.floor(car.y));if(goal&&dist(s.x,s.y,goal[0]+.5,goal[1]+.5)>1.5){s.state='investigate';s.goal=goal;return;}car.patrolPhase='driving';car.phaseUntil=g.time+18;s.inCar=true;s.x=car.x;s.y=car.y;s.path=null;s.state='patrol';}
export function stepPolice(g){if(!g.police?.active)return;if(g.time>=g.police.nextBackup){g.police.nextBackup=g.time+45;if(g.staff.filter(s=>s.police&&!(s.downUntil>g.time)).length<4){const cops=makeKeepers(ROUTES.map(route=>({route,start:0})),2);for(const s of cops){s.id=g.nid++;s.police=true;s.scene='street';g.staff.push(s);}addPatrolCars(g);}}}
export function policePersonal(g,p){const scan=g.police?.suspicions.get(p.id);return {policeActive:!!g.police?.active,policeKnown:policeRecognized(g,p),policeDescription:g.police?.description||'',recognition:scan&&scan.signature===policeSignature(p)&&g.time-scan.at<.5?scan.progress:0};}
