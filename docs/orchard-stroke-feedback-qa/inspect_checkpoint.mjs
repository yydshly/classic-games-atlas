import{createInterface}from'node:readline';
import{restore,snapshot,conservation}from'../../versions/v2/games/orchard/engine.mjs';
for await(const line of createInterface({input:process.stdin})){try{const data=JSON.parse(JSON.parse(line).raw),game=restore(data.resume);if(!game)throw Error('Invalid native checkpoint');console.log(JSON.stringify({progress:data,snapshot:snapshot(game),conservation:conservation(game)}));}catch(error){console.log(JSON.stringify({error:String(error)}));}}
