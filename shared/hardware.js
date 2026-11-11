export const TOOLS=[{id:'crowbar',name:'Crowbar',price:60,action:'pry the lock'},{id:'cutters',name:'Bolt cutters',price:80,action:'snip the chain'},{id:'wrench',name:'Wrench',price:50,action:'loosen the bolts'},{id:'drill',name:'Hand drill',price:90,action:'drill the latch'}];
export const hasTool=p=>TOOLS.some(t=>p.tools?.includes(t.id));
