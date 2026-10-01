import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const git=(cwd,args)=>execFileSync('git',args,{cwd,encoding:'utf8',maxBuffer:1048576,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}}).trimEnd();
const sha256=b=>createHash('sha256').update(b).digest('hex');
function parseNumstat(text){
 if(!text)return[];
 return text.split('\n').map(line=>{
  const m=line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
  if(!m)throw Error(`Unparseable numstat line: ${line.slice(0,80)}`);
  const [,a,d,p]=m;
  return a==='-'?{path:p,binary:true}:{path:p,added:Number(a),deleted:Number(d)};
 });
}
/** Read-only card. Runs only git rev-parse/diff/log. Never runs tests, scripts or network calls. */
export function buildCard(cwd,{base,head='HEAD',evidenceFiles=[],blockers=[]}={}){
 if(typeof base!=='string'||!base||base.startsWith('-')||base.length>256)throw Error('Explicit --base ref required');
 if(typeof head!=='string'||!head||head.startsWith('-')||head.length>256)throw Error('Invalid head ref');
 const repo=resolve(cwd);
 git(repo,['rev-parse','--verify',`${base}^{commit}`]);
 const headSha=git(repo,['rev-parse','--verify',`${head}^{commit}`]);
 if(!Array.isArray(evidenceFiles)||evidenceFiles.length>8)throw Error('At most 8 evidence files');
 if(!Array.isArray(blockers)||blockers.length>32)throw Error('At most 32 blockers');
 let total=0;
 const evidence=evidenceFiles.map(file=>{
  if(typeof file!=='string'||!file)throw Error('Evidence path must be a string');
  const path=resolve(repo,file);
  const stat=lstatSync(path);
  if(stat.isSymbolicLink())throw Error(`Refusing symlink evidence: ${file}`);
  if(!stat.isFile())throw Error(`Evidence is not a file: ${file}`);
  if(stat.size>262144)throw Error(`Evidence exceeds 256 KiB: ${file}`);
  total+=stat.size;if(total>1048576)throw Error('Combined evidence exceeds 1 MiB');
  const bytes=readFileSync(path);
  return {path:file,bytes:stat.size,sha256:sha256(bytes),text:bytes.toString('utf8')};
 });
 const cleanBlockers=blockers.map(b=>{
  if(typeof b!=='string'||!b.trim()||Buffer.byteLength(b)>4096)throw Error('Blocker must be nonempty text, at most 4 KiB');
  return b;
 });
 const commits=git(repo,['log','--format=%h%x09%s',`${base}..${headSha}`]);
 return {
  version:1,generatedAt:new Date().toISOString(),base,head:headSha,
  filesChanged:parseNumstat(git(repo,['diff','--numstat',base,headSha])),
  commits:commits?commits.split('\n').map(l=>{const[hash,...r]=l.split('\t');return{hash,subject:r.join('\t')};}):[],
  evidenceStatus:evidence.length?'user-supplied':'none-supplied',
  evidenceNote:'This tool does not run, verify or evaluate tests. Evidence below is verbatim user-supplied text with a hash for tamper-evidence. Absence of evidence is stated, never filled in.',
  evidence,
  blockers:cleanBlockers,
  limits:'Diff metadata and supplied evidence only. No inferred progress, quality, test results or business impact.'
 };
}
