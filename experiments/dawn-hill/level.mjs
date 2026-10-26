// Original route and dimensions. This is not a recreation of Nintendo's map.
export const LEVEL=Object.freeze({width:2420,floor:420,start:90,goal:2290,
  terrain:Object.freeze([
    {id:'meadow',x:0,y:420,w:950,h:160},{id:'orchard',x:1040,y:420,w:860,h:160},{id:'home',x:2010,y:420,w:410,h:160},
    {id:'low-step',x:1140,y:380,w:90,h:40},{id:'middle',x:1290,y:318,w:100,h:18},{id:'high',x:1450,y:255,w:155,h:20},{id:'descent',x:1700,y:330,w:100,h:18}
  ].map(Object.freeze)),
  blocks:Object.freeze([{id:'first',x:350,y:315,w:38,h:30},{id:'upper',x:1504,y:160,w:38,h:30}].map(Object.freeze)),
  enemies:Object.freeze([{id:'sprig-1',x:690,y:420,left:610,right:790,speed:35},{id:'sprig-2',x:1340,y:420,left:1260,right:1410,speed:-40},{id:'sprig-3',x:1760,y:420,left:1610,right:1830,speed:43}].map(Object.freeze)),
  seeds:Object.freeze([{id:'a',x:1325,y:292},{id:'b',x:1480,y:229},{id:'c',x:1580,y:229}].map(Object.freeze))
});
export const STEP=1/120;
