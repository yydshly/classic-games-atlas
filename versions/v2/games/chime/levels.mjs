// Three original, independently selectable bubble studies.
const defs=[
{name:'一 · 借一口轻风',theme:'garden',start:{x:360,y:250},anchors:[[360,80]],goal:{x:360,y:505,w:190,h:56},bubble:{x:360,y:325,r:29},solids:[],hazards:[],stars:[{x:360,y:205},{x:360,y:145},{x:360,y:85}],tip:'剪 1，让铃落入泡泡。泡泡会先托住下落，再慢慢上升。取星随意；升到上方后点泡泡或按 B，落回正下方的台。'},
{name:'二 · 过梁的弧线',theme:'valley',start:{x:240,y:210},anchors:[[380,65]],goal:{x:530,y:505,w:210,h:56},bubble:{x:320,y:270,r:42},solids:[{x:260,y:370,w:185,h:24}],hazards:[],stars:[{x:360,y:245},{x:430,y:220},{x:510,y:245}],tip:'先等铃向右摆、进入泡泡，再剪 1 带走横向速度。看铃越过石梁右缘，在收集台上方戳破；过早释放会落在梁上。'},
{name:'三 · 留住一个支点',theme:'dusk',start:{x:340,y:240},anchors:[[180,75],[500,75]],goal:{x:530,y:505,w:190,h:56},bubble:{x:415,y:290,r:43},solids:[],hazards:[{x:260,y:390,w:170,h:25}],stars:[{x:410,y:280},{x:470,y:245},{x:535,y:335}],tip:'先剪左边 1，保留右支点 2，绕开下方危险台。泡泡包住铃后，借右摆剪 2；等铃离开危险台上方，再戳破回落。'}
];
export const LEVELS=defs.map((l,i)=>({...l,id:i+1,winds:[],ropes:l.anchors.map(([x,y],k)=>({id:k+1,x,y,length:Math.hypot(l.start.x-x,l.start.y-y)})),stars:l.stars.map((s,k)=>({...s,id:k+1}))}));
