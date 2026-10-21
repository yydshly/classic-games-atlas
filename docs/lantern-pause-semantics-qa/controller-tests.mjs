import fs from 'node:fs';import{execFileSync}from'node:child_process';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';import{pathToFileURL}from'node:url';
const game=process.argv[2],r='.local/pause-semantics-round/',file='versions/v2/games/'+game+'/game.mjs',source=fs.readFileSync(file,'utf8'),old=execFileSync('git',['show','166497b857d57658d8858f23f65b68d9f2cec0f4:'+file],{encoding:'utf8'}),results=[];
if(game==='expedition'){
 const{createGame,command}=await import(pathToFileURL(path.resolve('versions/v2/games/expedition/engine.mjs')));
 const handler=s=>s.split("$('pause').onclick=")[1].split(";$('resume')")[0];
 const render=s=>s.match(/\$\('pause'\)\.(?:textContent|disabled)=[^;]+;/g).join('');
 for(const state of['ready','running','paused','won','lost'])for(const blocked of[false,true]){
  const g=createGame(0);if(['running','paused'].includes(state))command(g,{type:'start'});if(state==='paused')command(g,{type:'pause'});if(['won','lost'].includes(state))g.status=state;
  const node={},sent=[],scope={g,blocked,running:state==='running',ended:()=>['won','lost'].includes(g.status),$:()=>node,send:c=>{sent.push(c);return command(g,c).ok;}};
  vm.runInNewContext(render(source),scope);const enabled=['running','paused'].includes(state)&&!blocked;assert.equal(node.disabled,!enabled);assert.equal(node.textContent,state==='paused'?'继续':'暂停');vm.runInNewContext('('+handler(source)+')()',scope);assert.equal(sent.length,enabled?1:0);assert.equal(g.status,enabled?(state==='running'?'paused':'running'):state);results.push({state,blocked,statusAfter:g.status,pauseDisabled:node.disabled,label:node.textContent,commandCount:sent.length,terminalModelFixture:['won','lost'].includes(state)});
 }
 const g=createGame(0),sent=[];vm.runInNewContext('('+handler(old)+')()',{g,blocked:false,ended:()=>false,send:c=>{sent.push(c);command(g,c);}});assert.equal(g.status,'running');assert.equal(sent[0].type,'start');
}else if(game==='lantern'){
 const statements=s=>(s.match(/\$\('#(?:pause|touch-pause)'\)\.(?:disabled|innerHTML|textContent)=[^;]+;/g)||[]).join('');
 for(const state of['ready','playing','paused','won','lost']){
  const nodes={'#pause':{disabled:false},'#touch-pause':{disabled:false}};vm.runInNewContext(statements(source),{game:{state},$:id=>nodes[id]});const disabled=['ready','won','lost'].includes(state);assert.equal(nodes['#pause'].disabled,disabled);assert.equal(nodes['#touch-pause'].disabled,disabled);assert.equal(nodes['#touch-pause'].textContent,state==='paused'?'继续':'暂停');results.push({state,mainDisabled:nodes['#pause'].disabled,touchDisabled:nodes['#touch-pause'].disabled,label:nodes['#touch-pause'].textContent,terminalPresentationFixture:['won','lost'].includes(state)});
 }
 const nodes={'#pause':{disabled:false},'#touch-pause':{disabled:false}};vm.runInNewContext(statements(old),{game:{state:'ready'},$:id=>nodes[id]});assert.equal(nodes['#pause'].disabled,true);assert.equal(nodes['#touch-pause'].disabled,false);
}else throw Error('unsupported game');
fs.mkdirSync(r,{recursive:true});const report={status:'passed',game,method:'Execute actual controller handler/presentation assignments; expedition uses actual rules command. Terminal states are explicit Node fixtures, not natural browser wins/losses. Baseline negative control reproduces original issue.',cases:results,baselineNegativeControl:true};fs.writeFileSync(r+game+'-controller.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({game,status:'passed',cases:results.length,baselineNegativeControl:true}));
