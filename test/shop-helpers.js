export function at(g,p,id){const o=g.obj(id);p.shopping=false;p.hold=null;p.x=o.x+.5;p.y=o.y+.5;p.prevE=false;p.input={};g._objectInteraction(p,o).run?.();return o;}
export function hold(g,p,seconds){for(let i=0;i<seconds/.05&&p.hold;i++)g._continueHold(p,{e:true},.05);}
export function take(g,p,shelf,item){at(g,p,'shelf-'+shelf);hold(g,p,.8);g.cityAction(p.id,{op:'take',item});g.cityAction(p.id,{op:'closeShop'});}
export function pay(g,p){at(g,p,p.location==='thrift'?'thrift-counter':p.location==='hardware'?'hardware-counter':'grocery-counter');hold(g,p,1.5);}
