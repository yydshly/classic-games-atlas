export const WIDTH=760,HEIGHT=440;
export const PHYSICS={step:1/120,speed:195,acceleration:1900,friction:2200,gravity:1250,jump:485,cut:180,fall:780,coyote:.12,buffer:.14};
export const LEVELS=[
{id:1,name:'铜港 · 低线反击',biome:0,band:'COPPER QUAY / 读高线，伏低还击',width:1250,start:{x:50,y:314},goal:1170,ground:[{x:0,y:350,w:1250,h:90}],platforms:[],enemies:[{id:1,kind:'relay',x:470,y:338,w:34,h:12,hp:12},{id:2,kind:'relay',x:1000,y:338,w:34,h:12,hp:12}],checkpoints:[{x:650,y:314}],pickups:[],tip:'金色胸高线先闪烁，再三连射。按住 ↓ / S 伏低停步，J 从低枪口击中装置；清除两座装置后到右端出口。'},
{id:2,name:'霜井 · 高低交替',biome:1,band:'FROST CHANNEL / 高线伏低，地波跃过',width:1350,start:{x:50,y:314},goal:1270,ground:[{x:0,y:350,w:1350,h:90}],platforms:[],enemies:[{id:1,kind:'alternator',x:510,y:338,w:34,h:12,hp:24},{id:2,kind:'alternator',x:1090,y:338,w:34,h:12,hp:24}],checkpoints:[{x:710,y:314}],pickups:[],tip:'金线胸高三连射和红色贴地波轮流出现。高线伏低还击；红线先松开伏低再起跳。永远伏低会被地波命中。'}
];
