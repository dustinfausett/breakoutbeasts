import {makeKeepers} from './staff.js';
import {policeExpose} from './police.js';
import {isDisguised} from './wardrobe.js';
import {dist} from './util.js';
import {stepArcade} from './arcade.js';
export const airportSignature=p=>[p.animal,...['hat','shirt','pants'].map(s=>p.outfit?.[s]||'bare')].join('|');
export const airportPass=p=>p.airportPaid&&p.airportCleared===airportSignature(p)&&isDisguised(p);
export function initAirport(g,staff){if(!staff)return;const routes=[[[37,405],[37,379],[6,379],[6,413]],[[67,413],[38,413],[38,377],[67,377]],[[39,357],[39,378],[66,378],[66,403]]];for(const s of makeKeepers(routes.map(route=>({route,start:0})),3)){s.id=g.nid++;s.police=true;s.airport=true;s.scene='airport';g.staff.push(s);}}
export function airportObject(g,p,o){
 if(o.kind!=='airportReturn')return null;
 return {text:'Return to terminal (one way) · security costs $100 again',idle:p.location!=='airport'||p.x<73,run:()=>{if(p.location!=='airport'||p.x<73||p.caged||dist(p.x,p.y,o.x+.5,o.y+.5)>1.9)return;p.x=68.5;p.y=419.5;p.safe=[p.x,p.y];p.airportPaid=false;p.airportCleared=null;p.airportAirside=false;p.hold=null;p.under=null;p.arcade=null;g.msg(p,'Back in the terminal. Pay security again to return to the plane.');}};
}
export function airportCrime(g,p,violent=false){if(p.location!=='airport')return;const cops=g.staff.filter(s=>s.airport&&!(s.downUntil>g.time));const seen=violent||cops.some(s=>g._policeVisible(s,p));if(!seen)return;p.airportWanted=true;policeExpose(g,p);g._raiseAlert();for(const s of cops){s.state='investigate';s.goal=[Math.floor(p.x),Math.floor(p.y)];s.path=null;}g.msg(p,'Airport police spotted you!');}
export function stepAirport(g,dt){if(g.flightChapter)return;stepArcade(g,dt);for(const p of g.activePlayers()){
 if(p.location!=='airport'||p.inPlane||p.caged||p.capturedT>0)continue;
 if(p.x<71&&p.airportAirside){p.airportPaid=false;p.airportCleared=null;p.airportAirside=false;}
 if(p.x>=73&&!airportPass(p)){p.x=68.5;p.y=410.5;p.safe=[p.x,p.y];p.hold=null;p.under=null;p.hop=null;p.slide=null;g.msg(p,'Pass security in a full disguise before entering the tarmac.');}
 if(p.x>=73&&airportPass(p))p.airportAirside=true;
 // Crossing a shop's exit without checking out reports the theft locally.
 if(p.cart?.length){const souvenir=p.cart.some(c=>c.type==='clothes'),snacks=p.cart.some(c=>c.type==='food');if(souvenir&&!(p.x>8&&p.x<36&&p.y>383&&p.y<403)||snacks&&!(p.x>40&&p.x<66&&p.y>357&&p.y<376)){p.cart=[];p.shopping=false;p.shopShelf=null;airportCrime(g,p,true);}}
}}
