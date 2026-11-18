// Original code-drawn airport kiosks and arcade cabinets in the classic pixel palette.
export function airportDecor(g,d,x,y){
 if(d.kind==='airportShop'){const w=d.w*16;g.fillStyle='#243b43';g.fillRect(x,y,w,36);g.fillStyle=d.color;g.fillRect(x+3,y+3,w-6,22);g.fillStyle='#f1d298';for(let i=0;i<w;i+=24)g.fillRect(x+i,y+25,12,9);g.fillStyle='#fff0b3';g.font='bold 10px monospace';g.textAlign='center';g.fillText(d.label,x+w/2,y+18);return true;}
 if(d.kind==='arcadeCabinet'){const colors=['#83ba79','#b982ba','#d59b59','#76adc3','#c18c66'];g.fillStyle='#1b252f';g.fillRect(x-8,y-27,44,61);g.fillStyle=colors[d.index];g.fillRect(x-5,y-24,38,8);g.fillRect(x-6,y+15,40,16);g.fillStyle='#090f24';g.fillRect(x-3,y-13,32,26);g.fillStyle='#82d58b';g.fillRect(x+2,y-8,10,8);g.fillStyle='#efce79';g.fillRect(x+17,y-3,7,9);g.fillStyle='#192832';g.fillRect(x-7,y+13,42,7);g.fillStyle='#f38c68';g.fillRect(x+19,y+14,5,4);g.fillStyle='#e2cd91';g.fillRect(x+5,y+11,3,7);g.fillRect(x+3,y+9,7,4);g.fillStyle='#171e2c';g.fillRect(x+9,y+25,12,5);return true;}
 if(d.kind==='airportCashier'){g.fillStyle='#865c3f';g.fillRect(x,y+8,42,24);g.fillStyle='#d3b479';g.fillRect(x-2,y+5,46,5);g.fillStyle='#2d4047';g.fillRect(x+3,y-4,16,13);g.fillStyle='#8fc29c';g.fillRect(x+5,y-2,12,6);g.fillStyle='#d9a871';g.fillRect(x+27,y-12,10,10);g.fillStyle='#698da0';g.fillRect(x+25,y-2,14,9);return true;}
 return false;
}
