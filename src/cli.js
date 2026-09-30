#!/usr/bin/env node
import {buildCard} from './index.js';
const help='meeting-could-have-been-a-diff --base <ref> [--head <ref>] [--cwd dir] [--evidence file]... [--blocker "text"]...\nLocal PR card: diff facts plus evidence YOU supply. Never runs tests or the network.\nJSON to stdout. Exit 1 on any invalid input. Missing evidence is reported as missing.';
try{
 const args=process.argv.slice(2);
 if(args.length===1&&args[0]==='--help')console.log(help);
 else if(args.length===1&&args[0]==='--version')console.log('0.1.0');
 else{
  const opts={base:undefined,head:'HEAD',cwd:process.cwd(),evidenceFiles:[],blockers:[]};
  for(let i=0;i<args.length;i++){
   const k=args[i];const v=args[++i];
   if(!['--base','--head','--cwd','--evidence','--blocker'].includes(k))throw Error(`Unexpected option: ${k}`);
   if(v===undefined)throw Error(`Missing value: ${k}`);
   if(k==='--evidence')opts.evidenceFiles.push(v);
   else if(k==='--blocker')opts.blockers.push(v);
   else if(k==='--base'){if(opts.base!==undefined)throw Error('Duplicate --base');opts.base=v;}
   else if(k==='--head'){if(opts.head!=='HEAD')throw Error('Duplicate --head');opts.head=v;}
   else{if(opts.cwd!==process.cwd())throw Error('Duplicate --cwd');opts.cwd=v;}
  }
  if(opts.base===undefined)throw Error(help);
  console.log(JSON.stringify(buildCard(opts.cwd,opts),null,2));
 }
}catch(e){console.error(JSON.stringify({error:e.message}));process.exitCode=1;}
