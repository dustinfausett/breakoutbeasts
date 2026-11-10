import {ParkingGame,CAR_CONTROLS} from './parking-game.js';import {dist} from './util.js';
export class CityGame extends ParkingGame{
 constructor(args){super({...args,worldId:'city',options:{...args.options,staff:false}});this.visited=new Set();const ids=this.activePlayers().map(p=>p.id);if(ids.length&&!this.vehicle.owners.navigation)this.vehicle.owners.navigation=ids.at(-1);this.vehicle.unlocked=true;this.vehicle.values.navigation=this.zoo.destinations[0].name;for(const p of this.activePlayers()){p.inVehicle=true;p.x=this.vehicle.x;p.y=this.vehicle.y;}}
 _carControls(){return CAR_CONTROLS.map(c=>c.id==='navigation'?{...c,choices:this.zoo.destinations.map(d=>d.name),goal:this.zoo.destinations[0].name,hint:'Pick a destination and guide the crew through the streets.'}:c);}
 _stepCityVisits(){for(const d of this.zoo.destinations)if(!this.visited.has(d.id)&&dist(this.vehicle.x,this.vehicle.y,d.x,d.y)<3&&Math.abs(this.vehicle.speed)<.7){this.visited.add(d.id);this.emit({k:'cityvisit',name:d.name});}}
 objectives(){const o=super.objectives();o.stage='city';o.parking.city={destinations:this.zoo.destinations.map(d=>({...d,visited:!!this.visited?.has(d.id)})),visited:this.visited?.size||0,selected:this.vehicle.values.navigation};return o;}
 results(){return {...super.results(),stage:'city',next:null};}
}
