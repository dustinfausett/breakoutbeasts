// Original bitmap lettering: no web fonts, downloads or third-party artwork.
const FONT = {
 B:['11110','10001','10001','11110','10001','10001','11110'],
 R:['11110','10001','10001','11110','10100','10010','10001'],
 E:['11111','10000','10000','11110','10000','10000','11111'],
 A:['01110','11011','10001','11111','10001','10001','10001'],
 K:['10001','10010','10100','11000','10100','10010','10001'],
 O:['01110','11011','10001','10001','10001','11011','01110'],
 U:['10001','10001','10001','10001','10001','11011','01110'],
 T:['11111','00100','00100','00100','00100','00100','00100'],
 S:['01111','10000','10000','01110','00001','00001','11110'],
 '!':['00100','01110','01110','00100','00100','00000','00100']
};
const rect=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
function word(text,y,colors){
 const pixels=[];const left=(174-(text.length*18-3))/2;
 [...text].forEach((letter,i)=>FONT[letter].forEach((row,r)=>[...row].forEach((v,c)=>{if(v==='1')pixels.push([left+i*18+c*3,y+r*3,r]);})));
 let art='';
 for(const [ox,oy,color] of [[3,4,'#071c18'],[-1,0,'#071c18'],[1,0,'#071c18'],[0,-1,'#071c18'],[0,1,'#071c18']])for(const [x,y]of pixels)art+=rect(x+ox,y+oy,3,3,color);
 for(const [x,y,r]of pixels)art+=rect(x,y,3,3,colors[Math.floor(r/3)]||colors.at(-1));
 return art;
}
let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 174 70" shape-rendering="crispEdges">';
svg+='<path d="M8 15H21V4H151V10H164V53H154V64H24V60H8Z" fill="#0a2d26"/><path d="M16 16H26V8H147V14H158V51H148V59H28V55H16Z" fill="#174737"/>';
for(let i=0;i<3;i++)svg+=`<path d="M${106+i*12} 1h5l-16 29h-5Z" fill="#ec5f32"/>`;
for(const side of [0,1])for(let i=0;i<5;i++){const x=side?162-i*2:5+i*2;svg+=rect(x,18+i*6,3,8,'#65a544')+rect(x+(side?-5:3),20+i*6,5,3,'#b8dc66');}
svg+=word('BREAKOUT',12,['#f3ffb6','#c4ee7e','#67bb58']);
svg+=word('BEASTS!',37,['#fff1a0','#ffbd4f','#f06438']);
svg+='<path d="M17 49h4v6h3v-6h4v9h-11Z M147 49h4v6h3v-6h4v9h-11Z" fill="#f1f2c8"/>';
svg+=rect(29,64,5,3,'#ffc857')+rect(140,4,4,3,'#c4ee7e')+'</svg>';
export const LOGO_URL = 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
