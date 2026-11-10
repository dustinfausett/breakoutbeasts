// Generated actor and walking atlases, with original code-drawn fallback art.
// All art in this file is original to this project (no external assets).

import { IMAGES, atlasDraw, objectArt } from './assets.js';
import { T } from './shared/tiles.js';

function make(rows, pal) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  rows.forEach((r, y) => { [...r].forEach((ch, x) => { if (ch !== '.' && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }); });
  return c;
}

function flip(c) {
  const f = document.createElement('canvas');
  f.width = c.width; f.height = c.height;
  const g = f.getContext('2d');
  g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0);
  return f;
}

// Each animal faces right. Legs rows are re-drawn for a second walking frame.
const ART = {
  redpanda: {
    pal: { o: '#c8502a', d: '#5a2412', w: '#f6ecd8', k: '#1b1410', t: '#7a2e14', c: '#e07a48' },
    rows: [
      '................',
      '................',
      '................',
      '..........w...w.',
      '..........oo.oo.',
      '.........owooowo',
      '..t......owkookw',
      '.tct.....oooooww',
      '.ocot.ooooooook.',
      '.tct.oooocoooo..',
      '..ot.ooooooooo..',
      '...ttoooooooood.',
      '.....dooooooood.',
      '.....dd.dd.dd.d.',
      '.....dd.dd.dd.d.',
      '................',
    ],
  },
  elephant: {
    pal: { g: '#9198ab', G: '#5f6577', p: '#d99aa8', k: '#1d1d24', w: '#f7f2e0', l: '#b5bccd' },
    rows: [
      '................',
      '................',
      '......ggggg.....',
      '....ggglllggg...',
      '...gggggggGGgg..',
      '..ggggggggGpGgg.',
      '..ggggggggGpGkgg',
      '..ggggggggGGgggg',
      '..gggggggggggggg',
      '..ggggggggggggwg',
      '.Gggggggggggg.gg',
      '.Ggggggggggg..gg',
      '..GgG.GgG.GgG.g.',
      '..GgG.GgG.GgG...',
      '..GGG.GGG.GGG...',
      '................',
    ],
  },
  monkey: {
    pal: { b: '#9a6a3c', d: '#4e3018', f: '#ecc89c', k: '#1b1410' },
    rows: [
      '................',
      '................',
      '..........ddd...',
      '.........dbbbd..',
      '........fdbbbbd.',
      '........dfffffd.',
      '........dfkffkf.',
      '.........fffff..',
      '..d.......fff...',
      '.d.....dbbbb....',
      'd.....dbbfbbbd..',
      'd....dbbfffbbd..',
      '.d...dbbbfbbb...',
      '..ddddbb..bb....',
      '......dd..dd....',
      '................',
    ],
  },
  beaver: {
    pal: { B: '#83502c', D: '#4a2a14', T: '#3a2c26', w: '#fff6d8', k: '#140c08', l: '#a8703e' },
    rows: [
      '................',
      '................',
      '................',
      '................',
      '..........BB.B..',
      '.........BBBBBB.',
      '........BBBkBBBk',
      '........BlllBBBD',
      '....BBBBBBlBBBw.',
      '...BBBBBBBBBBB..',
      'TTBBBBBBBlBBBB..',
      'TTTBBBBBBBBBBB..',
      'TTTDBBBBBBBBBD..',
      '.TT.DD.DD..DD...',
      '................',
      '................',
    ],
  },
  giraffe: {
    pal: { y: '#e8b04a', s: '#8a4a1a', o: '#5a3010', k: '#1b1410', l: '#f6dc98' },
    rows: [
      '...........o.o..',
      '...........o.o..',
      '...........yyy..',
      '..........yykyy.',
      '..........yyyyll',
      '..........yyy...',
      '..........ys....',
      '.........yyy....',
      '.........sy.....',
      '........yyy.....',
      '........ys......',
      '.......yyy......',
      '...yyyyysyy.....',
      '.yysyyyyyyys....',
      'oyyyyysyyyyy....',
      '..ysyyyyysyy....',
      '..y.y....y.y....',
      '..s.s....s.s....',
      '..s.s....s.s....',
      '..o.o....o.o....',
    ],
  },
  penguin: {
    pal: { k: '#262e40', w: '#f4f6fa', o: '#f29a2e', e: '#ffffff', b: '#11151f' },
    rows: [
      '................',
      '................',
      '......kkkk......',
      '.....kkkkkk.....',
      '....kkkkkekk....',
      '....kkkkkbkoo...',
      '....kkkwwwkooo..',
      '...kkkwwwwwk....',
      '...kkwwwwwwk....',
      '..kkkwwwwwwk....',
      '..k.kwwwwwwk....',
      '....kwwwwwwk....',
      '....kkwwwwkk....',
      '.....kkkkkk.....',
      '.....oo..oo.....',
      '................',
    ],
  },
  zebra: {
    pal: { w: '#f2f2f2', k: '#1e1e22', n: '#3a3a40' },
    rows: [
      '................',
      '................',
      '............kk..',
      '...........kwwk.',
      '..........kwkwww',
      '..........wkwwwk',
      '..........kwwnnn',
      '.........wkw....',
      '..kwkwkwkwkwk...',
      '.kwkwkwkwkwkw...',
      'kkwkwkwkwkwkw...',
      '.wkwkwkwkwkwk...',
      '.kwkwkwkwkwkw...',
      '..k.w.....k.w...',
      '..k.k.....k.k...',
      '..n.n.....n.n...',
    ],
  },
  meerkat: {
    pal: { t: '#cfa86c', d: '#6e4e26', k: '#1b1410', c: '#f2dcae' },
    rows: [
      '................',
      '................',
      '.......tt.......',
      '......tkttt.....',
      '......ttttdk....',
      '.......ttt......',
      '......tcct......',
      '.....ttcctt.....',
      '....d.tccct.....',
      '......tccct.....',
      '......tccct.....',
      '.....dtccct.....',
      '....d.tccct.....',
      '...d..ttttt.....',
      '......dd.dd.....',
      '................',
    ],
  },
  tortoise: {
    pal: { S: '#33501e', s: '#5f8a3a', h: '#94c062', g: '#b0a676', k: '#1b1410' },
    rows: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '.....SSSSS......',
      '....ShshshS.....',
      '...ShshshshS....',
      '..ShshshshshS.gg',
      '..SsssssssssSgkg',
      '..SSSSSSSSSSSggg',
      '...gg.....gg.gg.',
      '...gg.....gg....',
      '................',
      '................',
      '................',
    ],
  },
  flamingo: {
    pal: { p: '#f590b0', P: '#c85a7a', k: '#1b1410', w: '#fff0f4', l: '#d8708e' },
    rows: [
      '..........pp....',
      '.........pkpw...',
      '.........p..kk..',
      '.........p......',
      '........p.......',
      '........p.......',
      '.......pp.......',
      '....ppppp.......',
      '..PPpppppp......',
      '.PPPpppppp......',
      '..PPppppp.......',
      '.....l..........',
      '.....l..........',
      '.....l.l........',
      '.....l..l.......',
      '.....l..........',
    ],
  },
};

const SHELL = {
  pal: { S: '#33501e', s: '#5f8a3a', h: '#94c062' },
  rows: ['................', '................', '................', '................', '................', '................',
    '.....SSSSS......', '....ShshshS.....', '...ShshshshS....', '..ShshshshshS...', '..SsssssssssS...', '..SSSSSSSSSSS...', '................', '................', '................', '................'],
};
const PENGUIN_SLIDE = {
  pal: ART.penguin.pal,
  rows: ['................', '................', '................', '................', '................', '................', '................', '................',
    '................', '..kkkkkkkkkk....', '.kkwwwwwwwwkkkk.', 'okwwwwwwwwwkkebo', '.kkkwwwwwwkkkk..', '...kkkkkkkk.....', '................', '................'],
};

const STAFF = {
  pal: { c: '#2f6a4e', C: '#1f4a36', f: '#f0c49a', k: '#1b1410', s: '#d8b65a', S: '#a8883a', p: '#38463a', y: '#fff3a0', b: '#3a2a1a' },
  rows: [
    '................',
    '.....cccccc.....',
    '....CccccccC....',
    '.......CCCCCC...',
    '.....ffffff.....',
    '.....fkffkf.....',
    '.....ffffff.....',
    '....ssSssSss....',
    '...ssssssssss...',
    '...fsssssssssfyy',
    '...s.ssbbsss....',
    '.....pppppp.....',
    '.....pp..pp.....',
    '.....pp..pp.....',
    '.....bb..bb.....',
    '................',
  ],
};

function walkFrame(rows) {
  // shift alternating leg columns up by one pixel at the bottom rows to suggest stepping
  const out = rows.slice();
  const n = out.length;
  const last = out[n - 2], prev = out[n - 3];
  const swap = (a, b) => [...a].map((ch, i) => (i % 4 < 2 ? b[i] : ch)).join('');
  out[n - 2] = swap(last, prev);
  return out;
}

const MOUTHS={redpanda:[13,9],elephant:[14,9],monkey:[12,8],beaver:[13,8],giraffe:[13,4],penguin:[14,7],zebra:[14,7],meerkat:[11,6],tortoise:[14,10],flamingo:[13,2]};
function buildActionSprites(){
 for(const id of [...Object.keys(ART),'staff']){
  const set=SPRITES[id];if(!set)continue;const art=id==='staff'?STAFF:ART[id],base=set.idle?.r||set.r[0],size=base.width;
  const run=Array.from({length:4},(_,phase)=>{
   if(IMAGES.actors){const c=document.createElement('canvas');c.width=size;c.height=size;c.getContext('2d').drawImage(set.r[phase%set.r.length],0,phase%2?-1:0);return c;}
   const rows=art.rows.map(r=>[...r]),h=rows.length,w=rows[0].length,stride=[-1,0,1,0][phase];
   for(let y=h-4;y<h;y++)rows[y].fill('.');
   for(let y=h-4;y<h;y++)for(let x=0;x<w;x++){
    const pixel=art.rows[y][x];if(!pixel||pixel==='.')continue;const group=Math.floor(x/2)%2,lift=phase%2===group?1:0,nx=Math.max(0,Math.min(w-1,x+(group?stride:-stride))),ny=Math.max(h-4,y-lift);rows[ny][nx]=pixel;
   }
   const frame=make(rows.map(r=>r.join('')),art.pal),c=document.createElement('canvas');c.width=frame.width;c.height=frame.height;c.getContext('2d').drawImage(frame,phase>=2?1:0,phase%2?-1:0);return c;
  });set.run={r:run,l:run.map(flip)};
  if(id==='staff')continue;
  const bite=Array.from({length:4},(_,phase)=>{const c=document.createElement('canvas');c.width=size;c.height=base.height;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(base,0,0);if(phase){const [mx,my]=MOUTHS[id],scale=size/16;g.fillStyle='#211b27';g.fillRect((mx-1)*scale,my*scale,3*scale,(phase===2?3:phase===3?1:2)*scale);g.fillStyle='#f5e9bd';g.fillRect(mx*scale,my*scale,scale,scale);g.fillStyle='#c57779';g.fillRect(mx*scale,(my+1)*scale,scale,scale);}return c;});set.bite={r:bite,l:bite.map(flip)};
 }
}

export const SPRITES = {};
export function buildSprites() {
  if(IMAGES.actors){
    const ids=['redpanda','elephant','monkey','beaver','giraffe','penguin','zebra','meerkat','tortoise','flamingo','staff','staffDown'];
    ids.forEach((id,index)=>{
      const idle=document.createElement('canvas');idle.width=96;idle.height=96;
      const g=idle.getContext('2d');g.imageSmoothingEnabled=false;atlasDraw(g,IMAGES.actors,index,4,3,0,0,96,96);
      const sheet=IMAGES[index<6?'walk-animals-a':'walk-animals-b'];
      const row=index<6?index:index-6;
      const frames=sheet&&id!=='staffDown'?Array.from({length:4},(_,frame)=>{
        const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
        const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
        // The second generated atlas has hand-spaced rows; crop the actual
        // strips so neighbouring heads and feet never bleed into a frame.
        const bounds=index<6?[row*sheet.height/6,(row+1)*sheet.height/6]:[[0,260],[270,540],[560,775],[780,1060],[1065,1402]][row];
        const sw=sheet.width/4,sh=bounds[1]-bounds[0],scale=Math.min(96/sw,96/sh);
        ctx.drawImage(sheet,frame*sw,bounds[0],sw,sh,(96-sw*scale)/2,96-sh*scale,sw*scale,sh*scale);return canvas;
      }):[idle];
      SPRITES[id]={r:frames,l:frames.map(flip),idle:{r:idle,l:flip(idle)}};
    });
    SPRITES.shell=SPRITES.tortoise;SPRITES.penguinSlide=SPRITES.penguin;buildActionSprites();return;
  }
  for (const [id, a] of Object.entries(ART)) {
    const f0 = make(a.rows, a.pal);
    const f1 = make(walkFrame(a.rows), a.pal);
    SPRITES[id] = { r: [f0, f1], l: [flip(f0), flip(f1)] };
  }
  const sh = make(SHELL.rows, SHELL.pal);
  SPRITES.shell = { r: [sh, sh], l: [flip(sh), flip(sh)] };
  const ps = make(PENGUIN_SLIDE.rows, PENGUIN_SLIDE.pal);
  SPRITES.penguinSlide = { r: [ps, ps], l: [flip(ps), flip(ps)] };
  const st = make(STAFF.rows, STAFF.pal);
  const st1 = make(walkFrame(STAFF.rows), STAFF.pal);
  SPRITES.staff = { r: [st, st1], l: [flip(st), flip(st1)] };
  const down=document.createElement('canvas');down.width=16;down.height=16;const dg=down.getContext('2d');dg.translate(16,0);dg.rotate(Math.PI/2);dg.drawImage(st,0,0);
  SPRITES.staffDown={r:[down],l:[flip(down)]};
  buildActionSprites();
}

const portraitCache = {};
export function portraitURL(id, scale = 4) {
  const key = id + scale;
  if (portraitCache[key]) return portraitCache[key];
  const src = SPRITES[id].r[0];
  const c = document.createElement('canvas');c.width=96;c.height=96;
  const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(src,0,0,96,96);
  portraitCache[key] = c.toDataURL();
  return portraitCache[key];
}

// ---------------- tiles ----------------
const THEME_FLOOR = {
  outside: '#3f6b34', bamboo: '#4f6a2c', jungle: '#2f5a2a', savanna: '#c9a85a', dust: '#b08a5a', plains: '#7a9a44',
  ice: '#dbe8f2', pond: '#5a7a3a', desert: '#e0c080', garden: '#4a7a3c', lagoon: '#d8c08a', maint: '#77777a', court: '#a99a86', plaza: '#a08e7a', exit: '#c8b070',
};

function hash(x, y) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; }

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r * f))); g = Math.max(0, Math.min(255, Math.round(g * f))); b = Math.max(0, Math.min(255, Math.round(b * f)));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }

/** Draw one 16x16 tile at (ox,oy) in the map canvas. */
export function drawTile(g, t, x, y, ox, oy, themeName, getTile) {
  if(IMAGES.terrain){
    const textures={[T.GRASS]:0,[T.PATH]:1,[T.FLOOR]:themeName==='maint'?14:2,[T.EXIT]:1,[T.WALL]:3,[T.FENCE]:4,[T.CLIMB]:4,[T.HEDGE]:5,[T.BUSH]:6,[T.WATER]:7,[T.POND]:12,[T.ICE]:8,[T.LOW]:14,[T.NARROW]:10,[T.WOOD]:9,[T.LOOSE]:9,[T.REINF]:14,[T.SOIL]:15,[T.BURROW]:15,[T.SOILX]:0,[T.ROPE]:7,[T.LEDGE]:7,[T.BEAM]:7,[T.BRIDGE_SPOT]:7,[T.BRIDGE]:7,[T.TREE]:11,[T.ROCK]:10,[T.DEBRIS]:15,[T.MACHINE]:14,[T.BARREL]:0};
    atlasDraw(g,IMAGES.terrain,textures[t]??0,4,4,ox,oy,16,16);
    if(t===T.MACHINE)objectArt(g,2,ox,oy);
    if(t===T.BARREL)objectArt(g,4,ox,oy);
    if(t===T.BRIDGE)objectArt(g,1,ox,oy);
    if(t===T.ROPE||t===T.BEAM||t===T.LEDGE){g.fillStyle=t===T.LEDGE?'#b2b7c2':'#c59b5f';g.fillRect(ox,oy+6,16,t===T.ROPE?2:4);}
    if(t===T.BRIDGE_SPOT){g.fillStyle='#b07b40';g.fillRect(ox+2,oy,2,16);g.fillRect(ox+12,oy,2,16);}
    if(t===T.CLIMB||t===T.LOOSE||t===T.WOOD||t===T.SOIL){g.strokeStyle='#ffdf85';g.lineWidth=.5;g.strokeRect(ox+5,oy+5,6,6);}
    if(t===T.BURROW){g.fillStyle='#17120f';g.beginPath();g.ellipse(ox+8,oy+9,5,4,0,0,Math.PI*2);g.fill();}
    if(t===T.LOW){g.fillStyle='#0d1c26';g.fillRect(ox+2,oy+7,12,6);g.fillStyle='#80c8d9';g.fillRect(ox+4,oy+9,8,1);}
    return;
  }
  const base = THEME_FLOOR[themeName] || THEME_FLOOR.outside;
  const r = hash(x, y);
  const ground = (col) => { px(g, ox, oy, 16, 16, col); for (let i = 0; i < 4; i++) { const hx = Math.floor(hash(x + i, y * 3) * 15), hy = Math.floor(hash(x * 5, y + i) * 15); px(g, ox + hx, oy + hy, 1, 1, shade(col, 0.88 + 0.2 * hash(i, x))); } };
  const water = (col) => { px(g, ox, oy, 16, 16, col); px(g, ox + 2 + Math.floor(r * 6), oy + 4, 4, 1, shade(col, 1.25)); px(g, ox + 8, oy + 11, 5, 1, shade(col, 1.18)); };
  switch (t) {
    case T.GRASS: ground(themeName === 'outside' ? '#3c6a33' : base); if (r > 0.7) { px(g, ox + 4, oy + 9, 1, 2, '#5f9a48'); px(g, ox + 5, oy + 8, 1, 3, '#5f9a48'); } break;
    case T.PATH: {
      const c = themeName === 'court' ? '#b2a48e' : themeName === 'plaza' ? '#a6927c' : themeName === 'maint' ? '#7d7d80' : '#9a8a72';
      px(g, ox, oy, 16, 16, c);
      px(g, ox, oy + 7, 16, 1, shade(c, 0.85)); px(g, ox + (y % 2 ? 4 : 11), oy, 1, 7, shade(c, 0.85)); px(g, ox + (y % 2 ? 11 : 4), oy + 8, 1, 8, shade(c, 0.85));
      break;
    }
    case T.FLOOR: case T.EXIT: ground(t === T.EXIT ? '#c8b070' : base); if (themeName === 'maint') { px(g, ox, oy, 16, 1, '#6a6a6e'); px(g, ox, oy, 1, 16, '#6a6a6e'); } if (t === T.EXIT && (x + y) % 2 === 0) px(g, ox + 6, oy + 6, 4, 4, '#e8d090'); break;
    case T.WALL: {
      px(g, ox, oy, 16, 16, '#6c6a72');
      for (let row = 0; row < 4; row++) { const off = row % 2 ? 4 : 0; for (let col = -1; col < 3; col++) { px(g, ox + off + col * 8, oy + row * 4, 7, 3, row === 0 ? '#8a8892' : '#7a7882'); } }
      px(g, ox, oy + 15, 16, 1, '#3a3842');
      break;
    }
    case T.FENCE: case T.CLIMB: {
      ground(base);
      px(g, ox, oy + 2, 16, 2, '#4a4a52'); px(g, ox, oy + 12, 16, 2, '#4a4a52');
      for (let i = 1; i < 16; i += 3) px(g, ox + i, oy + 1, 1, 14, '#5a5a64');
      if (t === T.CLIMB) { for (let i = 0; i < 16; i += 4) { px(g, ox + i, oy + 5, 2, 2, '#f2c63a'); px(g, ox + i + 2, oy + 8, 2, 2, '#1b1b1b'); px(g, ox + i, oy + 8, 2, 2, '#f2c63a'); px(g, ox + i + 2, oy + 5, 2, 2, '#1b1b1b'); } }
      break;
    }
    case T.HEDGE: px(g, ox, oy, 16, 16, '#24502a'); for (let i = 0; i < 9; i++) px(g, ox + Math.floor(hash(x + i, y) * 13), oy + Math.floor(hash(x, y + i) * 13), 3, 3, i % 2 ? '#2f6636' : '#1a3e20'); break;
    case T.BUSH: ground(base); px(g, ox + 1, oy + 4, 14, 11, '#2e7a3a'); px(g, ox + 3, oy + 2, 10, 4, '#3a8e46'); px(g, ox + 4, oy + 6, 3, 2, '#4ea85a'); px(g, ox + 10, oy + 9, 3, 2, '#4ea85a'); px(g, ox + 1, oy + 14, 14, 1, '#1f5226'); break;
    case T.WATER: case T.BRIDGE_SPOT: water('#2f5f9a'); if (t === T.BRIDGE_SPOT) { px(g, ox + 2, oy + 1, 3, 14, '#6a4424'); px(g, ox + 11, oy + 1, 3, 14, '#6a4424'); px(g, ox + 2, oy + 1, 3, 2, '#f2c63a'); px(g, ox + 11, oy + 1, 3, 2, '#f2c63a'); } break;
    case T.POND: water('#4f8fb0'); px(g, ox + 3, oy + 2, 1, 5, '#5a8a3a'); px(g, ox + 12, oy + 8, 1, 5, '#5a8a3a'); break;
    case T.ICE: px(g, ox, oy, 16, 16, '#d6e8f4'); px(g, ox + 3, oy + 3, 5, 1, '#ffffff'); px(g, ox + 9, oy + 10, 4, 1, '#ffffff'); px(g, ox + 2, oy + 12, 2, 1, '#b8d0e4'); break;
    case T.LOW: { ground(base === THEME_FLOOR.ice ? '#d6e8f4' : base); px(g, ox, oy, 16, 16, '#3a3a46'); px(g, ox + 1, oy + 4, 14, 12, '#141420'); px(g, ox + 4, oy + 8, 8, 2, '#7ab0e0'); px(g, ox + 6, oy + 6, 4, 2, '#7ab0e0'); break; }
    case T.NARROW: ground('#7a8a5a'); px(g, ox, oy, 4, 16, '#7a7a80'); px(g, ox + 12, oy, 4, 16, '#7a7a80'); px(g, ox + 1, oy + 2, 2, 3, '#9a9aa0'); px(g, ox + 13, oy + 9, 2, 3, '#9a9aa0'); break;
    case T.WOOD: px(g, ox, oy, 16, 16, '#8a5a2e'); for (let i = 0; i < 16; i += 4) px(g, ox + i, oy, 1, 16, '#5a3a1a'); px(g, ox, oy + 4, 16, 2, '#6a4422'); px(g, ox, oy + 11, 16, 2, '#6a4422'); px(g, ox + 5, oy + 6, 6, 4, '#f2c63a'); px(g, ox + 6, oy + 7, 1, 2, '#5a3a1a'); px(g, ox + 9, oy + 7, 1, 2, '#5a3a1a'); break;
    case T.LOOSE: px(g, ox, oy, 16, 16, '#9a7a4e'); px(g, ox, oy + 3, 16, 3, '#b08a5a'); px(g, ox, oy + 10, 16, 3, '#b08a5a'); px(g, ox + 3, oy, 1, 16, '#5a3a1a'); px(g, ox + 7, oy + 6, 2, 1, '#3a2a1a'); px(g, ox + 8, oy + 7, 2, 1, '#3a2a1a'); px(g, ox + 9, oy + 8, 1, 2, '#3a2a1a'); px(g, ox + 11, oy + 4, 3, 3, '#f2c63a'); break;
    case T.REINF: px(g, ox, oy, 16, 16, '#5a6470'); px(g, ox + 1, oy + 1, 14, 14, '#76808c'); for (const [a, b] of [[2, 2], [12, 2], [2, 12], [12, 12]]) px(g, ox + a, oy + b, 2, 2, '#3a404a'); px(g, ox + 1, oy + 7, 14, 2, '#5a6470'); break;
    case T.SOIL: ground(base); px(g, ox + 2, oy + 5, 12, 8, '#8a6034'); px(g, ox + 4, oy + 3, 8, 3, '#9a7040'); px(g, ox + 6, oy + 7, 1, 2, '#f2dca0'); px(g, ox + 9, oy + 7, 1, 2, '#f2dca0'); px(g, ox + 7, oy + 10, 2, 1, '#f2dca0'); break;
    case T.BURROW: ground(base); px(g, ox + 2, oy + 4, 12, 9, '#7a5a30'); px(g, ox + 4, oy + 5, 8, 7, '#140c08'); break;
    case T.SOILX: ground(base); if (r > 0.5) px(g, ox + 5, oy + 7, 5, 2, shade(base, 0.85)); break;
    case T.ROPE: water('#2f5f9a'); px(g, ox, oy + 7, 16, 2, '#c8a060'); for (let i = 0; i < 16; i += 3) px(g, ox + i, oy + 7, 1, 2, '#8a6a3a'); break;
    case T.LEDGE: water('#2f5f9a'); px(g, ox, oy + 5, 16, 6, '#9a9aa2'); px(g, ox, oy + 5, 16, 1, '#c0c0c8'); px(g, ox, oy + 10, 16, 1, '#5a5a62'); break;
    case T.BEAM: water('#2f5f9a'); px(g, ox, oy + 6, 16, 4, '#b07a44'); px(g, ox, oy + 6, 16, 1, '#d09a5a'); px(g, ox + 7, oy + 6, 1, 4, '#7a4a24'); break;
    case T.BRIDGE: water('#2f5f9a'); px(g, ox + 1, oy, 14, 16, '#9a6a3a'); for (let i = 1; i < 16; i += 4) px(g, ox + 1, oy + i, 14, 1, '#6a4422'); break;
    case T.TREE: ground(themeName === 'outside' ? '#3c6a33' : base); px(g, ox + 6, oy + 10, 4, 6, '#5a3a1a'); px(g, ox + 1, oy + 1, 14, 10, '#1f5a2a'); px(g, ox + 3, oy, 10, 3, '#2a6e34'); px(g, ox + 4, oy + 3, 4, 3, '#3a8a44'); px(g, ox + 2, oy + 10, 12, 1, '#164020'); break;
    case T.ROCK: ground(base); px(g, ox + 2, oy + 5, 12, 9, '#7c7c84'); px(g, ox + 4, oy + 3, 8, 3, '#9a9aa2'); px(g, ox + 5, oy + 4, 3, 2, '#b8b8c0'); px(g, ox + 2, oy + 13, 12, 1, '#4a4a52'); break;
    case T.DEBRIS: ground(base); px(g, ox + 2, oy + 10, 5, 2, '#8a5a2e'); px(g, ox + 9, oy + 4, 4, 2, '#8a5a2e'); px(g, ox + 7, oy + 12, 3, 1, '#5a3a1a'); break;
    case T.MACHINE: px(g, ox, oy, 16, 16, '#4a5058'); px(g, ox + 1, oy + 1, 14, 14, '#5e666e'); px(g, ox + 3, oy + 3, 3, 3, (x + y) % 2 ? '#3aa0e0' : '#e0c03a'); px(g, ox + 8, oy + 9, 6, 2, '#2a2e34'); break;
    case T.BARREL: ground(base); px(g, ox + 3, oy + 2, 10, 13, '#3a6a8a'); px(g, ox + 3, oy + 5, 10, 1, '#2a4a62'); px(g, ox + 3, oy + 11, 10, 1, '#2a4a62'); px(g, ox + 4, oy + 3, 2, 8, '#5a8aaa'); break;
    default: ground(base);
  }
  void getTile;
}

export const TILE_LABEL = {
  [T.CLIMB]: 'Climbing fence', [T.WOOD]: 'Chewable wood', [T.LOOSE]: 'Loose planks', [T.SOIL]: 'Soft soil', [T.LOW]: 'Low passage', [T.BRIDGE_SPOT]: 'Bridge posts',
  [T.REINF]: 'Reinforced', [T.BEAM]: 'Balance beam', [T.ROPE]: 'Rope', [T.LEDGE]: 'Ledge', [T.NARROW]: 'Narrow gap', [T.BUSH]: 'Hiding bush',
};
