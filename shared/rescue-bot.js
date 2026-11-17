import {dist} from './util.js';
const idle=()=>({mx:0,my:0,e:false,sp:false});
export function campaignDestination(v){const r=v.rescue;if(!r)return null;if(!v.me.tools?.length)return v.me.money<50?'Cedar Bank':'Beaver Hardware';if(r.animals.some(a=>a.species==='lion'&&a.state==='caged')&&!Object.values(v.me.food||{}).some(n=>n>0))return v.me.money<20?'Cedar Bank':'Acorn Groceries';const next=r.animals.find(a=>a.state!=='escaped');return !next?'Wildwing Airport':next.scene==='control'?'Animal Control':next.scene==='petstore'?'Paws & Whiskers Pet Store':'Northgate Zoo';}
export function rescueBot(bot,v,dt){
 const r=v.rescue;if(!r)return null;
 if(v.flight){const f=v.flight,t=(v.flightTasks||f.tasks)?.[f.task],c=f.controls.find(c=>c.id===t?.id);return f.phase==='crashed'?{...idle(),rescue:{op:'retry'}}:c&&f.speed>=t.speed?{...idle(),rescue:{op:'flight',control:c.id,value:c.choices[1]}}:idle();}
 if(v.panel){if(v.panel.ready&&!v.panel.powered&&v.panel.phase==='arming')return {...idle(),panel:{op:'power'}};const clue=v.teamClues?.find(c=>c.target===v.me.id&&c.index===v.panel.done);return v.panel.phase==='running'&&clue?{...idle(),panel:{op:'set',control:clue.control,value:clue.value}}:idle();}
 if(v.vehicle)return null;
 if(v.prison?.game){const b=v.prison.game;if(b.type==='tail')return {...idle(),prison:{op:'pin',x:b.target[0],y:b.target[1]}};const queue=[[...b.cursor]],prev=new Map([[b.cursor.join(','),null]]);let end=null;for(let i=0;i<queue.length;i++){const [x,y]=queue[i];if(x===b.goal[0]&&y===b.goal[1]){end=[x,y];break;}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,c=y+dy,k=a+','+c;if(a>=0&&c>=0&&a<b.w&&c<b.h&&b.cells[c*b.w+a]&&!prev.has(k)){prev.set(k,[x,y]);queue.push([a,c]);}}}if(end){while(prev.get(end.join(','))?.join(',')!==b.cursor.join(','))end=prev.get(end.join(','));return {...idle(),prison:{op:'move',x:end[0],y:end[1]}};}return idle();}
 if(v.me.caged&&v.me.cageDistrict!=='police')return {...idle(),e:true};
 function use(id){const o=v.objects.find(o=>o.id===id);if(!o)return idle();if(bot.rescueTarget!==id){bot.rescueTarget=id;bot.script=null;return idle();}const target=o.stand||[o.x,o.y];if(dist(v.me.x,v.me.y,target[0]+.5,target[1]+.5)<.35){bot.lastUseE=v.me.holding||!bot.lastUseE;return {...idle(),e:bot.lastUseE};}bot.setScript('campaign-'+id,[{go:target}]);return bot._runStep(v,dt)||idle();}
 function scene(target){const here=v.me.location;if(here===target)return null;if(here==='zooUpper')return use('zoo-stairs-down');if(here==='zooPavilion')return use('zoo-birdhouse-out');if(here==='zooControl')return use('zoo-control-out');if(here==='zoo'){if(target==='zooUpper')return use('zoo-stairs-up');if(target==='zooPavilion')return use('zoo-birdhouse-in');if(target==='zooControl')return use('zoo-control-in');return use('leave-zoo');}if(here==='street')return use('enter-'+(target.startsWith('zoo')?'zoo':target));return use('leave-'+here);}
 const missing=['hat','shirt','pants'].find(slot=>!v.me.outfit?.[slot]);if(r.freed===r.total&&(missing||v.me.location==='thrift'&&(v.me.cart?.length||v.me.shopping))){if(v.me.cart?.length){if(v.me.shopping)return {...idle(),city:{op:'closeShop'}};return use('thrift-counter');}if(v.me.money<100)return scene('bank')||use('vault-cash');if(v.me.shopping)return {...idle(),city:{op:'take',item:v.me.animal+'-'+missing+'-0'}};return scene('thrift')||use('shelf-'+({hat:'hats',shirt:'shirts',pants:'pants'}[missing]));}
 if(v.me.cageDistrict==='police'&&v.me.caged){const lock=v.prison?.locks.find(l=>!l.done&&(!l.owner||l.owner===v.me.id));return lock?use('prison-lock-'+lock.id):idle();}
 if(r.holding.captured){return scene('zoo')||use('rescue-cage-latch');}
 const needsFood=r.animals.some(a=>a.species==='lion'&&a.state==='caged')&&!Object.values(v.me.food||{}).some(n=>n>0),needsTool=!v.me.tools?.length;
 if(needsTool||needsFood||(v.me.cart||[]).length||v.me.shopping){
  const store=needsTool?'hardware':'grocery',item=needsTool?'wrench':'meat',category=needsTool?'tools':'meat';
  if((v.me.cart||[]).length){if(v.me.shopping)return {...idle(),city:{op:'closeShop'}};return use(v.me.location==='hardware'?'hardware-counter':'grocery-counter');}
  if(v.me.shopping){if(v.me.shopCategory!==category)return {...idle(),city:{op:'closeShop'}};return {...idle(),city:{op:'take',item}};}
  if(v.me.money<(needsTool?50:20)){if(!v.obj.parking.city.vaultOpen)return scene('bank')||use('vault-wheel');return scene('bank')||use('vault-cash');}
  return scene(store)||use('shelf-'+(needsTool?'tools':'meat'));
 }
 const mine=r.power.team.find(p=>p.id===v.me.id);
 if(!mine.inserted){if(!mine.collected){const target=mine.index<4?'zoo':mine.index<6?'zooUpper':'zooPavilion';return scene(target)||use('rescue-fuse-'+mine.index);}return scene('zoo')||use('rescue-generator');}
 if(!r.power.done)return idle();
 if(!r.signal){return scene('zooControl')||use('rescue-panel-'+mine.index);}
 const a=r.animals.find(a=>a.state==='caged');if(a){if(a.mechanism==='key'&&!v.me.keys)return null;return scene(a.scene)||use(a.mechanism==='team'?`team-${a.id}-${mine.index}`:'release-'+a.id);}
 if(r.freed!==r.total)return idle();if(!v.me.airportPaid&&v.me.money<100)return scene('bank')||use('vault-cash');return scene('airport')||use(v.me.airportCleared?'board-plane':'airport-security');
}
