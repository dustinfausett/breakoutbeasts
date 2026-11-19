// Capture status is based on actual captures, never the crew's initial enclosures.
export const CAPTURE_CALM_SECONDS=30;
export function allTeamCaptive(g){const crew=g.activePlayers();return crew.length>0&&crew.every(p=>p.capturedT<=0&&(p.caged||p.teamCaptive&&g.inOwnEnclosure(p)));}
export function stepCaptureCalm(g,dt){
 for(const p of g.activePlayers())if(p.teamCaptive&&p.capturedT<=0&&!p.caged&&!g.inOwnEnclosure(p))p.teamCaptive=false;
 const all=allTeamCaptive(g);g.allTeamCaptured=all;
 if(!all)return;
 if(g.police)g.police.backupQueue=[];
 const before=g.permanentAlert||g.time<g.alertUntil?(g.alertScale??1):0;
 g.alertScale=Math.max(0,before-dt/CAPTURE_CALM_SECONDS);g.alertUntil=g.time+g.alertScale*CAPTURE_CALM_SECONDS;
 for(const s of g.staff){s.alert=Math.min(s.alert||0,g.alertScale);if(g.alertScale===0&&['chase','investigate'].includes(s.state)){s.state='return';s.target=null;s.path=null;s.goal=null;s.noiseLevel=0;}}
 if(g.alertScale===0){g.permanentAlert=false;g.darts=[];g.checks=[];}
}
export function captureDecisionState(room){const d=room.captureDecision;if(!d)return null;const crew=[...room.game.activePlayers()],host=room.players.get(room.hostId);if(host&&!crew.some(p=>p.id===host.id))crew.push(host);return {id:d.id,hostId:room.hostId,players:crew.map(p=>({id:p.id,name:p.name,connected:p.connected,vote:d.votes[p.id]||null})),cooling:Math.ceil((room.game.alertScale||0)*CAPTURE_CALM_SECONDS)};}
export function updateCaptureDecision(room){
 const all=allTeamCaptive(room.game);
 if(!all){room.captureDecision=null;room.captureAcknowledged=false;return;}
 if(room.captureAcknowledged||room.captureDecision)return;
 room.captureDecision={id:++room.captureSerial,votes:{}};room.queues.clear();
 for(const p of room.game.activePlayers()){room.game.setInput(p.id,{mx:0,my:0,e:false,sp:false,b:false});p.hold=null;}
}
export function captureChoice(room,pid,msg){
 const d=room.captureDecision,p=room.game?.players.get(pid);if(room.phase!=='playing'||!d||msg.id!==d.id||!room.players.get(pid)?.connected||(!p?.active&&pid!==room.hostId))return;
 if(!allTeamCaptive(room.game)){updateCaptureDecision(room);room.broadcast({t:'captureClosed'});return;}
 if(!['continue','restart'].includes(msg.choice))return;
 if(msg.confirm){if(pid!==room.hostId)return room.error(pid,'not_host','Only the host can decide for the group.');
  if(msg.choice==='restart'){const saved=room.partRestarts?.get(room.capturePart)||room.restartCheckpoint;room.startMission(saved?.stage||room.missionStage,saved?structuredClone(saved):null);}
  else{room.captureDecision=null;room.captureAcknowledged=true;room.broadcast({t:'captureClosed'});}
 }else d.votes[pid]=msg.choice;
}
