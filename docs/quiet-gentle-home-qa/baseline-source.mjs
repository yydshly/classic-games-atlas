// Exact source excerpts for offline QA, not a second runtime or candidate tree.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const directory=new URL('./baselines/',import.meta.url);
const {entries}=JSON.parse(readFileSync(new URL('manifest.json',directory),'utf8'));
export function baselineSource(commit,file){
 const entry=entries[commit+':'+file];if(!entry)throw Error('Unknown QA baseline');
 const bytes=readFileSync(new URL(entry.file,directory));
 if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('QA baseline checksum mismatch');
 return bytes.toString('utf8');
}
