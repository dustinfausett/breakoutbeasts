import {dist} from './util.js';
const idle=()=>({mx:0,my:0,e:false,sp:false});
export function campaignDestination(v){const r=v.rescue;if(!r)return null;return r.freed===r.total?'Wildwing Airport':r.animals.filter(a=>a.scene!=='petstore').every(a=>a.state==='escaped')?'Paws & Whiskers Pet Store':'Northgate Zoo';}
export function rescueBot(bot,v,dt){
 const r=v.rescue;if(!r)return null;
 if(v.flight){const c=v.flight.controls.find(c=>c.value!==c.choices[1]);return c?{...idle(),rescue:{op:'flight',control:c.id,value:c.choices[1]}}:idle();}
 if(v.panel){if(v.panel.ready&&!v.panel.powered&&v.panel.phase==='arming')return {...idle(),panel:{op:'power'}};const clue=v.teamClues?.find(c=>c.target===v.me.id&&c.index===v.panel.done);return v.panel.phase==='running'&&clue?{...idle(),panel:{op:'set',control:clue.control,value:clue.value}}:idle();}
 if(v.vehicle)return null;
 if(v.me.caged)return {...idle(),e:true};
 function use(id){const o=v.objects.find(o=>o.id===id);if(!o)return idle();if(bot.rescueTarget!==id){bot.rescueTarget=id;bot.script=null;return idle();}const target=o.stand||[o.x,o.y];if(dist(v.me.x,v.me.y,target[0]+.5,target[1]+.5)<.35)return {...idle(),e:true};bot.setScript('campaign-'+id,[{go:target}]);return bot._runStep(v,dt)||idle();}
 function scene(target){const here=v.me.location;if(here===target)return null;if(here==='zooUpper')return use('zoo-stairs-down');if(here==='zooPavilion')return use('zoo-birdhouse-out');if(here==='zooControl')return use('zoo-control-out');if(here==='zoo'){if(target==='zooUpper')return use('zoo-stairs-up');if(target==='zooPavilion')return use('zoo-birdhouse-in');if(target==='zooControl')return use('zoo-control-in');return use('leave-zoo');}if(here==='street')return use('enter-'+(target.startsWith('zoo')?'zoo':target));return use('leave-'+here);}
 if(r.holding.captured){return scene('zoo')||use('rescue-cage-latch');}
 const mine=r.power.team.find(p=>p.id===v.me.id);
 if(!mine.inserted){if(!mine.collected){const target=mine.index<4?'zoo':mine.index<6?'zooUpper':'zooPavilion';return scene(target)||use('rescue-fuse-'+mine.index);}return scene('zoo')||use('rescue-generator');}
 if(!r.power.done)return idle();
 if(!r.signal){return scene('zooControl')||use('rescue-panel-'+mine.index);}
 const a=r.animals.find(a=>a.state==='caged');if(a){if(a.mechanism==='key'&&!v.me.keys)return null;return scene(a.scene)||use(a.mechanism==='team'?`team-${a.id}-${mine.index}`:'release-'+a.id);}
 if(r.freed!==r.total)return idle();return scene('airport')||use('board-plane');
}
