import {T} from '../tiles.js';
import {RESCUE_SPECIES,RESCUE_NAMES} from '../rescue-data.js';
export function addRescueDistrict({rect,decor,objects,interiors,destinations,controlCages=[]}){
 const gates=[],cages=[];
 for(const d of destinations){if(d.name==='Northgate Zoo'){d.scene='zoo';objects.push({id:'enter-zoo',kind:'cityDoor',scene:'zoo',x:32,y:98,stand:[32,99],walkable:true,label:'Enter Northgate Rescue Zoo'});}if(d.name==='Moonlight Cafe'){d.name='Paws & Whiskers Pet Store';d.scene='petstore';for(const sign of decor)if(sign.text==='Moonlight Cafe')sign.text=d.name;objects.push({id:'enter-petstore',kind:'cityDoor',scene:'petstore',x:32,y:66,stand:[32,67],walkable:true,label:'Enter Paws & Whiskers'});}}
 rect(136,112,155,124,T.PATH,3,1);rect(137,114,153,120,T.WALL);decor.push({kind:'cityBuilding',x:137,y:114,w:17,h:7,text:'Wildwing Airport',color:'#718a9b'});objects.push({id:'enter-airport',kind:'cityDoor',scene:'airport',x:145,y:122,stand:[145,123],walkable:true,label:'Enter Wildwing Airport'});destinations.push({id:'airport',name:'Wildwing Airport',x:145,y:108,scene:'airport'});
 Object.assign(interiors,{
  zoo:{rect:[4,196,65,245],spawn:[34,240],exit:[34,243],name:'Northgate Zoo · Gardens'},
  zooUpper:{rect:[4,282,65,325],spawn:[34,321],name:'Northgate Zoo · Upper Terrace'},
  zooPavilion:{rect:[104,242,141,276],spawn:[121,272],name:'Wetlands & Bird House'},
  zooControl:{rect:[104,300,133,319],spawn:[119,315],name:'Habitat Signal House'},
  petstore:{rect:[104,196,137,227],spawn:[120,224],exit:[120,225],name:'Paws & Whiskers Pet Store'},
  airport:{rect:[4,350,155,426],spawn:[20,413],exit:[20,421],name:'Wildwing Airport'}
 });
 for(const scene of ['zoo','zooUpper','zooPavilion','zooControl','petstore','airport']){
  const r=interiors[scene],[a,b,c,d]=r.rect;rect(a,b,c,d,scene.startsWith('zoo')&&scene!=='zooControl'?T.HEDGE:T.WALL);rect(a+1,b+1,c-1,d-1,scene==='zoo'||scene==='zooUpper'?T.GRASS:T.FLOOR,scene==='zoo'||scene==='zooUpper'?0:4);decor.push({kind:'interiorSign',x:a+3,y:b+2,text:r.name});
  if(r.exit)objects.push({id:'leave-'+scene,kind:'cityDoor',scene:'street',from:scene,x:r.exit[0],y:r.exit[1],walkable:true,label:'Return to city'});
 }
 // Keep the winding gardens, central spine and separate upstairs/indoor wings.
 for(const r of [[31,199,36,243],[9,214,58,217],[9,233,61,236],[24,215,28,240],[39,211,42,239],[57,216,61,235]])rect(...r,T.PATH);
 for(const r of [[28,201,29,208],[37,219,38,224],[25,224,26,228],[44,237,49,238]])rect(...r,T.HEDGE);
 for(const [x,y] of [[26,211],[27,211],[37,232],[38,232],[59,239],[60,239],[23,287],[24,287],[38,315],[39,315]])rect(x,y,x,y,T.BUSH);
 for(const r of [[31,285,36,323],[9,299,59,303],[24,299,28,320],[39,299,42,320]])rect(...r,T.PATH);
 rect(27,286,28,295,T.HEDGE);rect(38,307,39,311,T.HEDGE);
 for(const r of [[121,244,123,274],[107,256,138,258],[107,271,138,274]])rect(...r,T.PATH);
 const link=(id,x,y,scene,label,to)=>objects.push({id,kind:'districtLink',x,y,scene,to,walkable:true,label});
 link('zoo-stairs-up',37,201,'zooUpper','Climb stairs to the upper terrace',[34,321]);link('zoo-stairs-down',34,323,'zoo','Downstairs to the gardens',[37,203]);
 link('zoo-birdhouse-in',60,219,'zooPavilion','Enter the wetlands & bird house',[121,272]);link('zoo-birdhouse-out',121,274,'zoo','Return to the zoo gardens',[59,219]);
 link('zoo-control-in',40,238,'zooControl','Enter habitat signal house',[119,315]);link('zoo-control-out',119,317,'zoo','Return to the gardens',[40,237]);
 const holding={rect:[7,237,20,243],doorTiles:[[7,239],[7,240],[7,241]],slots:[[8,238],[11,238],[15,238],[18,238],[8,242],[11,242],[15,242],[18,242]]};
 rect(...holding.rect,T.FENCE);rect(8,238,19,242,T.GRASS);rect(7,239,7,241,T.PATH);gates.push({id:'rescue-holding',kind:'holding',vis:'bars',tiles:holding.doorTiles,label:'Zoo rescue cage'});objects.push({id:'rescue-cage-latch',kind:'rescueLatch',x:5,y:240,walkable:true,label:'Open the zoo rescue cage'});
 const specs=[
  ['lion','zoo',8,201,21,211,'key'],['rhino','zoo',43,201,56,211,'team'],['gorilla','zoo',8,221,21,231,'team'],['hippo','zoo',45,222,58,232,'power'],
  ['tiger','zooUpper',8,286,21,296,'signal'],['wolf','zooUpper',43,286,56,296,'key'],['kangaroo','zooUpper',8,307,21,317,'power'],['capybara','zooUpper',43,309,56,319,'key'],
  ['otter','zooPavilion',108,246,119,254,'power'],['crocodile','zooPavilion',125,246,137,255,'signal'],['peacock','zooPavilion',125,261,137,270,'key'],['sloth','zooPavilion',108,260,119,268,'key'],
  ['rabbit','petstore',108,200,117,207,'key'],['guineapig','petstore',125,200,134,207,'key'],['cat','petstore',108,213,117,221,'power'],['dog','petstore',123,213,134,221,'team']
 ];
 for(const [species,scene,x0,y0,x1,y1,mechanism] of specs){
  const mid=Math.floor((x0+x1)/2);rect(x0,y0,x1,y1,T.FENCE);rect(x0+1,y0+1,x1-1,y1-1,T.GRASS);rect(mid,y1,mid+1,y1,T.PATH);rect(mid-1,y1+1,mid+2,y1+3,T.PATH);
  const gate='rescue-'+species;gates.push({id:gate,kind:'habitat',vis:'bars',tiles:[[mid,y1],[mid+1,y1]],label:RESCUE_NAMES[RESCUE_SPECIES.indexOf(species)]+' habitat'});
  cages.push({id:species,species,scene,gate,mechanism,rect:[x0,y0,x1,y1],home:[mid,y0+3],release:[mid,y1+2],rally:interiors[scene].spawn});
  objects.push({id:'release-'+species,kind:'rescueLock',cage:species,x:mid,y:y1+1,walkable:true,label:'Release '+RESCUE_NAMES[RESCUE_SPECIES.indexOf(species)]});
  if(mechanism==='team')for(let i=0;i<8;i++)objects.push({id:`team-${species}-${i}`,kind:'rescueTeam',cage:species,index:i,x:x0+1+(i%4)*3,y:y1+2+Math.floor(i/4)*2,walkable:true,label:'Habitat handle '+(i+1)});
  decor.push({kind:'habitatLabel',x:mid,y:y0,text:RESCUE_NAMES[RESCUE_SPECIES.indexOf(species)]});
  decor.push({kind:'habitatProp',x:x0+2,y:y0+2,variant:['otter','hippo','crocodile','capybara'].includes(species)?'pond':'shelter'});
  decor.push({kind:'habitatProp',x:x1-3,y:y1-3,variant:['sloth','gorilla','cat'].includes(species)?'climber':'feeder'});
 }
 for(const c of controlCages){const [x0,y0,x1,y1]=c.rect,mid=Math.floor((x0+x1)/2);rect(x0,y0,x1,y1,T.FENCE);rect(x0+1,y0+1,x1-1,y1-1,T.FLOOR,4);rect(mid,y1,mid+1,y1,T.PATH);const gate='rescue-'+c.id;gates.push({id:gate,kind:'holding',vis:'bars',tiles:[[mid,y1],[mid+1,y1]],label:'Impounded '+c.species});cages.push({...c,scene:'control',gate,mechanism:'rescue',home:[mid,y0+2],rally:interiors.control.spawn});objects.push({id:'release-'+c.id,kind:'rescueLock',cage:c.id,x:mid,y:y1+1,walkable:true,label:'Release impounded '+c.species});decor.push({kind:'habitatLabel',x:mid,y:y0,text:'RESCUE '+c.species.toUpperCase()});decor.push({kind:'habitatProp',x:x0+1,y:y0+1,variant:'bed'});}
 const fusePoints=[[27,201],[24,218],[37,223],[60,233],[25,287],[39,319],[107,272],[138,272]];
 fusePoints.forEach(([x,y],index)=>{rect(x,y,x,y,T.PATH);objects.push({id:'rescue-fuse-'+index,kind:'rescueFuse',index,x,y,walkable:true,label:'Habitat fuse '+(index+1)});});
 objects.push({id:'rescue-generator',kind:'rescueGenerator',x:34,y:230,walkable:true,label:'Habitat power generator'});
 for(let i=0;i<8;i++)objects.push({id:'rescue-panel-'+i,kind:'rescuePanel',index:i,x:108+(i%4)*7,y:305+Math.floor(i/4)*7,walkable:true,label:'Signal console '+(i+1)});
 const signs=[['zoo',37,206,'up','UPPER TERRACE','FUSES 5–6'],['zoo',54,216,'right','BIRD HOUSE','FUSES 7–8'],['zoo',31,224,'down','GENERATOR','CONNECT FUSES'],['zoo',39,234,'down','SIGNAL HOUSE','TEAM CONSOLES'],['zoo',30,239,'down','CITY EXIT','SHOPS & TOOLS'],['zooUpper',35,300,'down','DOWNSTAIRS','GENERATOR'],['zooPavilion',121,257,'down','GARDENS EXIT','GENERATOR'],['zooControl',112,314,'right','TEAM STATIONS','ONE EACH']];
 for(const [scene,x,y,arrow,text,detail] of signs){decor.push({kind:'wayfinding',scene,x,y,arrow,text,detail});objects.push({id:'sign-'+scene+'-'+x,kind:'wayfinding',x,y,walkable:true,label:`${text} — ${detail}`});}
 for(const [x,y] of [[26,216],[39,217],[29,235],[37,241],[28,300],[38,302],[122,273]])decor.push({kind:'bench',x,y});
 for(const [x,y] of [[22,200],[60,205],[28,222],[44,240],[22,285],[59,306],[106,273],[135,244]]){decor.push({kind:'flowers',x,y},{kind:'lamp',x:x+1,y});}
 for(const [x,y] of [[26,232],[38,214],[30,317]])decor.push({kind:'habitatProp',x,y,variant:'fountain'});
 const binPoints=[[6,234],[23,235],[38,229],[62,238],[6,302],[38,317],[61,320],[106,270],[139,273],[120,209],[136,223],[131,316]];
 for(const [i,[x,y]] of binPoints.entries())objects.push({id:'district-bin-'+i,kind:'can',x,y,label:'Zoo garbage can'});
 rect(7,354,69,403,T.FLOOR,4);rect(73,354,151,423,T.PATH,3);decor.push({kind:'runway',x:94,y:356,w:40,h:64},{kind:'plane',x:100,y:388,w:33,h:18});objects.push({id:'board-plane',kind:'boardPlane',x:101,y:406,walkable:true,label:'Board the escape plane'});
 const routes=[{route:[[33,235],[26,235],[26,216],[33,216]],start:0,scene:'zoo'},{route:[[60,216],[40,216],[40,235],[60,235]],start:0,scene:'zoo'},{route:[[33,301],[26,301],[33,321],[40,301]],start:0,scene:'zooUpper'},{route:[[122,258],[122,272],[139,272]],start:0,scene:'zooPavilion'},{route:[[120,210],[120,224],[135,224]],start:0,scene:'petstore'}];
 return {gates,cages,holding,routes,visitors:[['zoo',25,216],['zoo',40,216],['zoo',29,235],['zooUpper',30,301],['zooUpper',40,303],['zooPavilion',122,258],['zooPavilion',122,271],['petstore',120,211],['petstore',120,223]]};
}
