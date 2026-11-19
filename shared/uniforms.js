import {dist,lineOfSight,angleDiff} from './util.js';
export const UNIFORM_TYPES=['police','keeper'];
export const UNIFORM_LOOKS={police:{label:'Police uniform',hat:'#243b69',shirt:'#385784',pants:'#233853'},keeper:{label:'Keeper uniform',hat:'#a99a66',shirt:'#bead7d',pants:'#63754e'}};
const scene=p=>p.location||p.scene||'street';
export function initUniforms(g){g.uniforms={compromised:{police:false,keeper:false}};}
export function uniformWorks(p){return UNIFORM_TYPES.includes(p.uniform)&&!p.uniformCompromised&&!p.disguiseBlown;}
export function compromiseUniform(g,type){if(!UNIFORM_TYPES.includes(type))return false;g.uniforms=g.uniforms||{compromised:{police:false,keeper:false}};const fresh=!g.uniforms.compromised[type];g.uniforms.compromised[type]=true;for(const p of g.players.values())if(p.uniform===type){p.uniformCompromised=true;p.disguiseBlown=true;}if(fresh)g.emit({k:'uniformexposed',uniform:type});return true;}
const guardWitness=(g,p)=>g.staff.find(s=>scene(s)===scene(p)&&!s.permanentDown&&!(s.downUntil>g.time)&&(g._policeVisible?g._policeVisible(s,p):g.canSee(s,p)));
export function uniformWitnessed(g,p){if(p.hidden||p.under)return false;
 if(guardWitness(g,p))return true;
 return (g.humans||[]).some(n=>!n.asleep&&scene(n)===scene(p)&&dist(n.x,n.y,p.x,p.y)<8&&Math.abs(angleDiff(Math.atan2(p.y-n.y,p.x-n.x),n.angle||0))<1.25&&lineOfSight(n.x,n.y,p.x,p.y,(x,y)=>g.visionBlocked(x,y)));
}
export function uniformCrime(g,p){
 if(!p.uniform||!uniformWitnessed(g,p))return false;
 compromiseUniform(g,p.uniform);g._raiseAlert();
 const witness=guardWitness(g,p);if(witness&&(witness.state!=='chase'||witness.target!==p.id))g._radio(witness,p);
 return true;
}
// Recheck visible escape work throughout a hold, including when a guard walks into view.
const suspiciousHolds=new Set(['lever','crank','ram','chew','dig','groundDig','terrainHit','craft','steal','key','muzzleHelp','cageWall','rescueBrace','rescueUnlock','rescueTeam','rescueInsert','rescueFuse','cityVault','vaultCash','cityRam','cityCarKey','policeKeys','citySteal','uniformKeys','uniformWallet','uniformLoot','prisonLock']);
export function uniformHoldCrime(g,p,inp){const h=p.hold;if(p.uniform&&h&&suspiciousHolds.has(h.kind)&&(h.btn==='sp'?inp.sp:h.btn==='b'?inp.b:inp.e))uniformCrime(g,p);}
export function wearUniform(g,p,type){if(type==null){p.uniform=null;p.uniformCompromised=false;p.disguiseBlown=false;return true;}if(!UNIFORM_TYPES.includes(type)||!p.uniformsOwned?.includes(type))return false;p.uniform=type;p.uniformCompromised=!!g.uniforms?.compromised[type];p.disguiseBlown=false;return true;}
export function uniformAction(g,pid,msg){const p=g.players.get(pid);if(!p?.active||!p.connected||p.capturedT>0||p.caged||p.inPlane||p.inControlRoom||p.chapterStation!=null||p.arcade||p.inVehicle)return;if(msg.op==='wear')wearUniform(g,p,msg.uniform);}
const lootable=(g,p,s)=>p.active&&p.connected&&!p.caged&&p.capturedT<=0&&!p.inVehicle&&!p.inPlane&&!p.under&&!p.hop&&!p.slide&&p.dragging==null&&s&&(s.downUntil>g.time||s.permanentDown)&&!s.inCar&&scene(s)===scene(p)&&dist(p.x,p.y,s.x,s.y)<1.9&&lineOfSight(p.x,p.y,s.x,s.y,(x,y)=>g.visionBlocked(x,y));
export function uniformTarget(g,p){const s=g.staff.filter(s=>lootable(g,p,s)&&!s.uniformTaken).sort((a,b)=>dist(p.x,p.y,a.x,a.y)-dist(p.x,p.y,b.x,b.y))[0];if(!s)return null;const kind=!s.keysLooted?'uniformKeys':!s.walletLooted?'uniformWallet':'uniformLoot',type=s.police?'police':'keeper';return {quiet:kind!=='uniformKeys',text:kind==='uniformKeys'?'Hold E: take the keys first':kind==='uniformWallet'?'Hold E: take wallet ($20)':`Hold E: take ${UNIFORM_LOOKS[type].label.toLowerCase()}`,run:()=>{p.hold={kind,btn:'e',staff:s.id,t:0,need:kind==='uniformKeys'?.9:kind==='uniformWallet'?.7:1.5};}};}
export function uniformHold(g,p,inp,dt){const h=p.hold;if(!['uniformKeys','uniformWallet','uniformLoot'].includes(h.kind))return false;const s=g.staff.find(s=>s.id===h.staff);if(!inp.e||!lootable(g,p,s)||s.uniformTaken||(h.kind!=='uniformKeys'&&!s.keysLooted)||(h.kind==='uniformLoot'&&!s.walletLooted)){p.hold=null;return true;}h.t+=dt;if(h.t<h.need)return true;p.hold=null;
 if(h.kind==='uniformKeys'){if(!s.keysLooted){g._takeStaffKeys(p,s);uniformCrime(g,p);}return true;}
 if(h.kind==='uniformWallet'){if(!s.walletLooted){s.walletLooted=true;s.wallet=0;p.money=(p.money||0)+20;uniformCrime(g,p);g.emit({k:'cash',pid:p.id,amount:20});}return true;}
 const type=s.police?'police':'keeper';s.uniformTaken=true;p.uniformsOwned=p.uniformsOwned||[];if(!p.uniformsOwned.includes(type))p.uniformsOwned.push(type);uniformCrime(g,p);wearUniform(g,p,type);uniformCrime(g,p);g.emit({k:'uniformtaken',pid:p.id,staff:s.id,uniform:type});return true;
}
export function uniformPersonal(g,p){return {wearing:p.uniform||null,compromised:!!p.uniformCompromised,owned:(p.uniformsOwned||[]).map(type=>({type,label:UNIFORM_LOOKS[type].label,compromised:!!g.uniforms?.compromised[type]}))};}
export function transferUniforms(previous,next){next.uniforms=structuredClone(previous.uniforms||{compromised:{police:false,keeper:false}});for(const p of next.players.values()){const old=previous.players.get(p.id);if(!old)continue;p.uniformsOwned=[...(old.uniformsOwned||[])];if(old.uniform)wearUniform(next,p,old.uniform);}}
