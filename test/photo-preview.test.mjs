import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPhotoPreviewController} from '../web/photo-preview.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('preview ignores outdated conversions, reuses the selected result, and revokes URLs',async()=>{
 const a=deferred(),b=deferred(),events=[],revoked=[],fileA={name:'a'},fileB={name:'b'},calls=[];
 const controller=createPhotoPreviewController(x=>events.push(x),{optimize:f=>{calls.push(f);return f===fileA?a.promise:b.promise;},makeUrl:()=> 'blob:preview',revoke:u=>revoked.push(u)});
 const old=controller.setFile(fileA),fresh=controller.setFile(fileB),reused=controller.get(fileB);assert.equal(fresh,reused);assert.equal(calls.length,2);
 a.resolve({blob:{},width:1,height:1});assert.equal(await old,null);assert.equal(events.filter(x=>x.state==='ready').length,0);
 const result={blob:{},width:2,height:2};b.resolve(result);assert.equal(await fresh,result);assert.equal(events.at(-1).state,'ready');controller.clear();assert.deepEqual(revoked,['blob:preview']);
});
test('failed or cleared conversion cannot yield an upload result',async()=>{
 const pending=deferred(),events=[];const controller=createPhotoPreviewController(x=>events.push(x),{optimize:()=>pending.promise,makeUrl:()=>{throw Error('must not create URL')},revoke:()=>{}});
 const task=controller.setFile({name:'sample'});controller.clear();pending.resolve({blob:{}});assert.equal(await task,null);assert.equal(events.filter(x=>x.state==='ready').length,0);
 const errors=[];const failed=createPhotoPreviewController(x=>errors.push(x),{optimize:async()=>{throw Error('PHOTO_DECODE_FAILED')},makeUrl:()=>'',revoke:()=>{}});assert.equal(await failed.setFile({name:'bad'}),null);assert.equal(errors.at(-1).error.message,'PHOTO_DECODE_FAILED');
});
