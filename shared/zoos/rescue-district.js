import {T} from '../tiles.js';
import {RESCUE_SPECIES,RESCUE_NAMES} from '../rescue-data.js';
export function addRescueDistrict({rect,decor,objects,interiors,destinations}){
 const gates=[],cages=[];
 // Add city street fronts for the pet store and airport; Northgate now has an entrance.
 for(const d of destinations){if(d.name==='Northgate Zoo'){d.scene='zoo';objects.push({id:'enter-zoo',kind:'cityDoor',scene:'zoo',x:32,y:98,stand:[32,99],walkable:true,label:'Enter Northgate Rescue Zoo'});}if(d.name==='Moonlight Cafe'){d.name='Paws & Whiskers Pet Store';d.scene='petstore';for(const sign of decor)if(sign.text==='Moonlight Cafe')sign.text=d.name;objects.push({id:'enter-petstore',kind:'cityDoor',scene:'petstore',x:32,y:66,stand:[32,67],walkable:true,label:'Enter Paws & Whiskers'});}}
 rect(136,112,155,124,T.PATH,3,1);rect(137,114,153,120,T.WALL);decor.push({kind:'cityBuilding',x:137,y:114,w:17,h:7,text:'Wildwing Airport',color:'#718a9b'});objects.push({id:'enter-airport',kind:'cityDoor',scene:'airport',x:145,y:122,stand:[145,123],walkable:true,label:'Enter Wildwing Airport'});destinations.push({id:'airport',name:'Wildwing Airport',x:145,y:108,scene:'airport'});
 Object.assign(interiors,{
  zoo:{rect:[4,196,98,274],spawn:[51,268],exit:[51,271],name:'Northgate Zoo · Gardens'},
  zooUpper:{rect:[4,282,98,342],spawn:[52,336],name:'Northgate Zoo · Upper Terrace'},
  zooPavilion:{rect:[104,242,155,292],spawn:[112,285],name:'Wetlands & Bird House'},
  zooControl:{rect:[104,300,155,342],spawn:[112,336],name:'Habitat Signal House'},
  petstore:{rect:[104,196,155,234],spawn:[129,229],exit:[129,231],name:'Paws & Whiskers Pet Store'},
  airport:{rect:[4,350,155,426],spawn:[20,413],exit:[20,421],name:'Wildwing Airport'}
 });
 for(const scene of ['zoo','zooUpper','zooPavilion','zooControl','petstore','airport']){
  const r=interiors[scene],[a,b,c,d]=r.rect;rect(a,b,c,d,scene.startsWith('zoo')&&scene!=='zooControl'?T.HEDGE:T.WALL);rect(a+1,b+1,c-1,d-1,scene==='zoo'||scene==='zooUpper'?T.GRASS:T.FLOOR,scene==='zoo'||scene==='zooUpper'?0:4);decor.push({kind:'interiorSign',x:a+3,y:b+3,text:r.name});
  if(r.exit)objects.push({id:'leave-'+scene,kind:'cityDoor',scene:'street',from:scene,x:r.exit[0],y:r.exit[1],walkable:true,label:'Return to city'});
 }
 // Winding connected paths cross landscaped islands instead of a cage grid.
 for(const r of [[48,200,54,270],[10,258,89,264],[9,229,47,235],[51,213,88,219],[26,231,32,261],[76,216,82,260]])rect(...r,T.PATH);
 for(const r of [[37,201,40,224],[58,229,71,232],[9,243,19,248],[62,245,69,250]])rect(...r,T.HEDGE);
 for(const [x,y] of [[44,218],[43,219],[56,236],[57,236],[72,256],[73,256],[22,252],[23,252],[16,286],[17,286],[81,320],[82,320]])rect(x,y,x+1,y+1,T.BUSH);
 rect(40,289,44,325,T.HEDGE);rect(40,309,44,315,T.PATH);rect(9,309,91,315,T.PATH);rect(49,286,55,337,T.PATH);
 const link=(id,x,y,scene,label,to)=>objects.push({id,kind:'districtLink',x,y,scene,to,walkable:true,label});
 link('zoo-stairs-up',55,205,'zooUpper','Climb stairs to the upper terrace',[52,336]);link('zoo-stairs-down',52,338,'zoo','Downstairs to the gardens',[55,207]);
 link('zoo-birdhouse-in',87,237,'zooPavilion','Enter the wetlands & bird house',[112,285]);link('zoo-birdhouse-out',112,288,'zoo','Return to the zoo gardens',[85,237]);
 link('zoo-control-in',58,262,'zooControl','Enter habitat signal house',[112,336]);link('zoo-control-out',112,338,'zoo','Return to the gardens',[57,261]);
 // Capture cage in the gardens, outside latch at the west side.
 rect(7,263,20,272,T.FENCE);rect(8,264,19,271,T.GRASS);rect(7,266,7,268,T.PATH);gates.push({id:'rescue-holding',kind:'holding',vis:'bars',tiles:[[7,266],[7,267],[7,268]],label:'Zoo rescue cage'});objects.push({id:'rescue-cage-latch',kind:'rescueLatch',x:5,y:267,walkable:true,label:'Open the zoo rescue cage'});
 const specs=[
  ['lion','zoo',9,202,29,219,'key'],['rhino','zoo',61,201,88,211,'team'],['gorilla','zoo',9,237,28,246,'team'],['hippo','zoo',72,224,92,234,'power'],
  ['tiger','zooUpper',9,288,31,304,'signal'],['wolf','zooUpper',61,287,88,302,'key'],['kangaroo','zooUpper',9,318,30,333,'power'],['capybara','zooUpper',63,319,89,335,'key'],
  ['otter','zooPavilion',110,247,126,259,'power'],['crocodile','zooPavilion',135,247,150,261,'signal'],['peacock','zooPavilion',131,270,150,283,'key'],['sloth','zooPavilion',111,265,125,277,'key'],
  ['rabbit','petstore',109,201,126,211,'key'],['guineapig','petstore',133,201,150,211,'key'],['cat','petstore',109,215,126,224,'power'],['dog','petstore',133,215,150,224,'team']
 ];
 for(const [species,scene,x0,y0,x1,y1,mechanism] of specs){
  const mid=Math.floor((x0+x1)/2);rect(x0,y0,x1,y1,T.FENCE);rect(x0+1,y0+1,x1-1,y1-1,T.GRASS);rect(mid,y1,mid+1,y1,T.PATH);rect(mid-1,y1+1,mid+2,y1+3,T.PATH);
  const gate='rescue-'+species;gates.push({id:gate,kind:'habitat',vis:'bars',tiles:[[mid,y1],[mid+1,y1]],label:RESCUE_NAMES[RESCUE_SPECIES.indexOf(species)]+' habitat'});
  const cage={id:species,species,scene,gate,mechanism,home:[mid,y0+3],release:[mid,y1+2],rally:interiors[scene].spawn};cages.push(cage);
  objects.push({id:'release-'+species,kind:'rescueLock',cage:species,x:mid,y:y1+1,walkable:true,label:'Release '+RESCUE_NAMES[RESCUE_SPECIES.indexOf(species)]});
  if(mechanism==='team')for(let i=0;i<8;i++)objects.push({id:`team-${species}-${i}`,kind:'rescueTeam',cage:species,index:i,x:x0+1+i*2,y:y1+3,walkable:true,label:'Habitat handle '+(i+1)});
 }
 const fusePoints=[[43,204],[33,223],[56,246],[83,256],[33,293],[57,326],[107,279],[151,286]];
 fusePoints.forEach(([x,y],index)=>{rect(x,y,x,y,T.PATH);objects.push({id:'rescue-fuse-'+index,kind:'rescueFuse',index,x,y,walkable:true,label:'Habitat fuse '+(index+1)});});
 objects.push({id:'rescue-generator',kind:'rescueGenerator',x:49,y:253,walkable:true,label:'Habitat power generator'});
 for(let i=0;i<8;i++)objects.push({id:'rescue-panel-'+i,kind:'rescuePanel',index:i,x:116+(i%4)*9,y:311+Math.floor(i/4)*15,walkable:true,label:'Signal console '+(i+1)});
 // Airport: terminal, apron and an actual runway. Plane access is a team objective.
 rect(7,354,69,403,T.FLOOR,4);rect(73,354,151,423,T.PATH,3);decor.push({kind:'runway',x:94,y:356,w:40,h:64});decor.push({kind:'plane',x:100,y:388,w:33,h:18});
 objects.push({id:'board-plane',kind:'boardPlane',x:101,y:406,walkable:true,label:'Board the escape plane'});
 const routes=[{route:[[50,261],[29,261],[29,232],[50,232]],start:0,scene:'zoo'},{route:[[79,218],[52,218],[52,261],[79,261]],start:0,scene:'zoo'},{route:[[51,312],[32,312],[51,336],[79,312]],start:0,scene:'zooUpper'},{route:[[128,264],[128,285],[152,285]],start:0,scene:'zooPavilion'},{route:[[129,214],[129,228],[152,228]],start:0,scene:'petstore'}];
 return {gates,cages,routes,visitors:[['zoo',44,232],['zoo',76,218],['zoo',30,261],['zooUpper',50,312],['zooUpper',80,314],['zooPavilion',120,261],['zooPavilion',143,265],['zooPavilion',144,286],['zooPavilion',117,280],['petstore',119,226],['petstore',143,228]]};
}
