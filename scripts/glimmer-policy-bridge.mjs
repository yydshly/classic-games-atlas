import readline from 'node:readline';
import {chooseInput} from './fixtures/glimmer-policy.mjs';
for await(const line of readline.createInterface({input:process.stdin})){try{const {game,options}=JSON.parse(line);process.stdout.write(JSON.stringify(chooseInput(game,options))+'\n');}catch(error){process.stdout.write(JSON.stringify({error:String(error)})+'\n');}}
