import {RESCUE_SPECIES} from './shared/rescue-data.js';
import {buildRescueSprites as buildDetailed} from './rescue-sprites-detailed.js';
// Original 16×16 art, using the same one-pixel blocks and four-pose gait as the playable animals.
const colors={lion:['#c49142','#e5bf6d','#83512a'],tiger:['#d77c30','#eee0ae','#332c28'],rhino:['#8a9396','#b8bdb2','#5c6672'],hippo:['#95838f','#baa0aa','#655867'],gorilla:['#4a4b55','#858087','#282a35'],wolf:['#84939e','#c5cccd','#475767'],kangaroo:['#b48a62','#e2bf8c','#785741'],capybara:['#9e8056','#c3a578','#6a513a'],otter:['#876243','#c7aa72','#493b32'],crocodile:['#638552','#a9b379','#3d5942'],peacock:['#326f88','#76a46b','#244958'],sloth:['#8f876d','#ccc2a4','#5d574d'],rabbit:['#c4bca4','#eee0be','#827966'],guineapig:['#b78251','#eee0b5','#79563c'],cat:['#9a91a3','#dbced8','#615a72'],dog:['#b49262','#e3cf9a','#694d3b']};
function frame(id,phase,idle=false){const c=document.createElement('canvas');c.width=c.height=16;const g=c.getContext('2d'),[body,light,dark]=colors[id],lift=idle?0:[0,-1,0,0][phase];const rect=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y+lift,w,h);};
 rect(4,7,8,6,dark);rect(3,7,8,5,body);rect(5,7,5,2,light);rect(10,5,5,6,body);rect(11,7,4,3,light);rect(12,6,1,1,'#20232d');rect(14,8,1,1,dark);
 for(let i=0;i<3;i++){const stride=idle?0:([[0,1,0,-1],[1,0,-1,0],[0,-1,0,1]][i][phase]);rect(4+i*3+stride,12,2,2+((phase+i)%2),dark);}
 rect(1,9,3,1,body);
 if(['lion','tiger','cat','wolf','dog'].includes(id)){rect(10,3,2,3,dark);rect(13,3,2,3,body);}
 if(id==='lion'){rect(9,4,3,8,dark);rect(8,6,2,5,dark);rect(11,5,3,5,body);rect(12,6,1,1,'#20232d');rect(1,9,2,2,dark);}
 if(id==='tiger'){for(const x of [4,7,10])rect(x,8,1,3,dark);rect(1,9,1,2,dark);}
 if(id==='rhino'){rect(14,4,1,3,'#eee1b6');rect(11,4,2,2,dark);}
 if(id==='hippo'){rect(12,8,4,3,light);rect(12,4,2,2,body);rect(14,9,1,1,dark);}
 if(id==='gorilla'){rect(3,5,7,7,body);rect(9,5,5,5,dark);rect(10,7,4,3,light);rect(3,10,3,5,dark);rect(10,10,3,5,dark);rect(11,6,1,1,'#eee1b6');}
 if(id==='wolf'){rect(10,2,2,4,body);rect(1,8,3,3,dark);rect(14,8,2,2,light);}
 if(id==='kangaroo'){rect(10,1,1,5,body);rect(13,1,1,5,body);rect(2,10,3,3,body);rect(0,12,3,1,body);rect(6,11,3,4,dark);}
 if(id==='capybara'){rect(11,4,2,2,dark);rect(12,8,4,3,body);rect(1,9,3,1,'#00000000');}
 if(id==='otter'){rect(0,10,4,2,dark);rect(10,9,4,2,light);rect(11,4,2,2,body);}
 if(id==='crocodile'){rect(12,7,4,3,body);rect(0,9,5,2,dark);for(let x=3;x<13;x+=3)rect(x,6,2,2,dark);rect(13,9,2,1,light);}
 if(id==='peacock'){for(let i=0;i<4;i++){rect(1+i,3+i,2,9,light);rect(1+i,5+i,1,2,'#d0b862');}rect(10,4,2,8,body);rect(10,2,4,3,body);rect(13,4,2,1,'#d7b65d');rect(12,3,1,1,'#20232d');}
 if(id==='sloth'){rect(10,5,5,5,light);rect(10,6,3,2,dark);rect(13,6,1,1,'#20232d');rect(5,12,1,3,light);rect(10,12,1,3,light);}
 if(id==='rabbit'){rect(10,0,2,6,body);rect(13,0,2,6,light);rect(11,1,1,3,'#d69799');rect(1,9,3,3,light);}
 if(id==='guineapig'){rect(3,7,4,5,light);rect(12,4,2,2,dark);rect(14,9,1,1,'#d69799');}
 if(id==='cat'){rect(1,6,1,5,body);rect(2,6,1,1,body);rect(14,9,2,1,dark);}
 if(id==='dog'){rect(10,4,2,5,dark);rect(13,8,3,2,light);rect(0,7,1,3,body);}
 return c;}
const flip=c=>{const f=document.createElement('canvas');f.width=f.height=16;const g=f.getContext('2d');g.translate(16,0);g.scale(-1,1);g.drawImage(c,0,0);return f;};
export function buildRescueSprites(target,images){if(new URLSearchParams(location.search).get('art')==='detailed')return buildDetailed(target,images);for(const id of RESCUE_SPECIES){const r=Array.from({length:4},(_,i)=>frame(id,i)),l=r.map(flip),idle=frame(id,0,true);target['rescue_'+id]={r,l,idle:{r:idle,l:flip(idle)},run:{r,l}};}}
