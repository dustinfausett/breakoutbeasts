// Local transport/load benchmark. Usage: node tools/benchmark-multiplayer.mjs [seconds=3]
import {performance} from 'node:perf_hooks';
import WebSocket from 'ws';
import {createServer} from '../server/index.js';
import {SnapshotDecoder} from '../shared/snapshot-wire.js';
const seconds=Math.max(1,Number(process.argv[2])||3),animals=['beaver','elephant','monkey','redpanda','giraffe','penguin','zebra','meerkat'];
const wait=async(fn)=>{const start=Date.now();while(!fn()){if(Date.now()-start>10000)throw Error('Benchmark setup timed out');await new Promise(r=>setTimeout(r,10));}};
for(const stage of ['city','airport'])for(const n of [1,4,8])for(const compact of [false,true]){
 const srv=await createServer({port:0,host:'127.0.0.1',roomOptions:{staff:true},log:()=>{}}),clients=[];let room;
 try{
  for(let i=0;i<n;i++){
   const ws=new WebSocket(`ws://127.0.0.1:${srv.port}/ws`,{perMessageDeflate:compact}),decoder=new SnapshotDecoder(),c={ws,pid:null,snap:null};clients.push(c);
   ws.on('message',data=>{const m=decoder.decode(JSON.parse(data.toString()));if(m.t==='joined')c.pid=m.you;if(m.t==='snap')c.snap=m;});await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
   ws.send(JSON.stringify(i?{t:'join',code:room.code,name:'Beast '+i,wire:compact?1:0}:{t:'create',name:'Beast 0',wire:compact?1:0}));await wait(()=>c.pid);room=[...srv.rooms.values()][0];ws.send(JSON.stringify({t:'pick',animal:animals[i]}));await wait(()=>room.players.get(c.pid)?.animal);
  }
  room.rng=()=>.3;room.startMission(stage);for(const p of room.game.activePlayers())p.grace=99999;await wait(()=>clients.every(c=>c.snap?.tick>=10));
  const reads=clients.map(c=>c.ws._socket.bytesRead),samples=[],tick=room.tick.bind(room);room.tick=(...a)=>{const start=performance.now();tick(...a);samples.push(performance.now()-start);};const start=performance.now();await new Promise(r=>setTimeout(r,seconds*1000));const elapsed=(performance.now()-start)/1000;samples.sort((a,b)=>a-b);
  const bytes=clients.reduce((sum,c,i)=>sum+c.ws._socket.bytesRead-reads[i],0);if(!clients.every(c=>c.snap?.pl.length===n&&c.snap.me?.id===c.pid))throw Error('Invalid player state');
  console.log(JSON.stringify({stage,players:n,transport:compact?'optimized':'previous-uncompressed',KBperPlayerSecond:Math.round(bytes/n/elapsed/1024*10)/10,meanTickMs:Math.round(samples.reduce((a,b)=>a+b,0)/samples.length*100)/100,p95TickMs:Math.round(samples[Math.floor(samples.length*.95)]*100)/100,ticks:samples.length}));
 }finally{for(const c of clients)c.ws.terminate();await srv.close();}
}
