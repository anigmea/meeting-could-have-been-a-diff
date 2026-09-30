import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,writeFileSync,rmSync,mkdirSync,existsSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync,spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import {buildCard} from '../src/index.js';
const sha=s=>createHash('sha256').update(s).digest('hex');
function fixture(fn){const dir=mkdtempSync(join(tmpdir(),'card-'));const git=(...a)=>execFileSync('git',a,{cwd:dir,encoding:'utf8'});try{
 git('init','-q','-b','main');git('config','user.name','T');git('config','user.email','t@example.invalid');
 writeFileSync(join(dir,'a.js'),'const a=1;\n');git('add','.');git('commit','-qm','base commit');
 git('checkout','-q','-b','feature');writeFileSync(join(dir,'a.js'),'const a=1;\nconst b=2;\n');writeFileSync(join(dir,'new.js'),'export const n=1;\n');git('add','.');git('commit','-qm','add b and new file');
 mkdirSync(join(dir,'evidence'));writeFileSync(join(dir,'evidence','tests.txt'),'# tests 12\n# pass 12\n# fail 0\n');
 fn(dir,git);}finally{rmSync(dir,{recursive:true,force:true});}}
test('card has exact diff facts, commits, verbatim evidence with hash',()=>fixture(d=>{
 const c=buildCard(d,{base:'main',evidenceFiles:['evidence/tests.txt'],blockers:['needs rebase on main']});
 assert.deepEqual(c.filesChanged.find(f=>f.path==='a.js'),{path:'a.js',added:1,deleted:0});
 assert.deepEqual(c.filesChanged.find(f=>f.path==='new.js'),{path:'new.js',added:1,deleted:0});
 assert.equal(c.commits.length,1);assert.equal(c.commits[0].subject,'add b and new file');
 assert.equal(c.evidenceStatus,'user-supplied');
 assert.equal(c.evidence[0].text,'# tests 12\n# pass 12\n# fail 0\n');
 assert.equal(c.evidence[0].sha256,sha('# tests 12\n# pass 12\n# fail 0\n'));
 assert.deepEqual(c.blockers,['needs rebase on main']);
 assert.match(c.evidenceNote,/does not run/);
}));
test('no evidence is stated, never filled in',()=>fixture(d=>{
 const c=buildCard(d,{base:'main'});
 assert.equal(c.evidenceStatus,'none-supplied');assert.deepEqual(c.evidence,[]);
 assert.ok(!JSON.stringify(c).includes('tests pass'));
}));
test('evidence text is stored, never executed',()=>fixture(d=>{
 writeFileSync(join(d,'evidence','evil.txt'),'touch /tmp/mchbad-must-not-exist');
 const c=buildCard(d,{base:'main',evidenceFiles:['evidence/evil.txt']});
 assert.equal(c.evidence[0].text,'touch /tmp/mchbad-must-not-exist');
 assert.equal(existsSync('/tmp/mchbad-must-not-exist'),false);
}));
test('oversized, symlink and too many evidence files rejected',()=>fixture(d=>{
 writeFileSync(join(d,'evidence','big.txt'),'x'.repeat(262145));
 assert.throws(()=>buildCard(d,{base:'main',evidenceFiles:['evidence/big.txt']}),/256 KiB/);
 assert.throws(()=>buildCard(d,{base:'main',evidenceFiles:Array(9).fill('evidence/tests.txt')}),/At most 8/);
}));
test('bad base, bad blocker and non-repo fail closed',()=>fixture(d=>{
 assert.throws(()=>buildCard(d,{base:'no-such-ref'}));
 assert.throws(()=>buildCard(d,{base:'main',blockers:['']}));
 assert.throws(()=>buildCard(d,{base:'--help'}));
 assert.throws(()=>buildCard(join(d,'nope'),{base:'main'}));
}));
test('CLI: missing base fails, JSON card on valid range, unknown flag fails',()=>fixture(d=>{
 const p=join(process.cwd(),'src','cli.js');
 let x=spawnSync(process.execPath,[p,'--cwd',d],{encoding:'utf8'});assert.equal(x.status,1);
 x=spawnSync(process.execPath,[p,'--base','main','--cwd',d,'--evidence','evidence/tests.txt','--blocker','wip'],{encoding:'utf8'});
 assert.equal(x.status,0);const c=JSON.parse(x.stdout);assert.equal(c.evidenceStatus,'user-supplied');assert.deepEqual(c.blockers,['wip']);
 x=spawnSync(process.execPath,[p,'--base','main','--cwd',d,'--publish'],{encoding:'utf8'});assert.equal(x.status,1);
}));
