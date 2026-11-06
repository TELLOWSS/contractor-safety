import {test} from 'node:test';
import assert from 'node:assert/strict';
import {optimizePhoto,optimizedPhotoName,PHOTO_MAX_INPUT_BYTES,PHOTO_MAX_PIXELS,PHOTO_TARGET_BYTES} from '../web/photo-optimizer.js';
function adapters(width,height,encode){let closed=false;const draws=[];return {get closed(){return closed},draws,decode:async()=>({source:{},width,height,close(){closed=true;}}),createCanvas:(w,h)=>({width:w,height:h,getContext(){return {fillRect(...args){draws.push(['fill',...args]);},drawImage(...args){draws.push(['draw',...args.slice(1)]);}};}}),encode};}
test('large image is resized, JPEG encoded, and retried until below upload limit',async()=>{
 assert.equal(PHOTO_TARGET_BYTES,1024*1024);
 const attempts=[];const env=adapters(6000,4000,async(c,q)=>{attempts.push([c.width,c.height,q]);return {size:q>0.64?PHOTO_TARGET_BYTES+1:PHOTO_TARGET_BYTES-1,type:'image/jpeg'};});
 const result=await optimizePhoto({size:6*1024*1024},env);assert.equal(result.width,1920);assert.equal(result.height,1280);assert.ok(result.blob.size<=PHOTO_TARGET_BYTES);assert.equal(attempts.length,3);assert.equal(env.closed,true);assert.deepEqual(env.draws[0],['fill',0,0,1920,1280]);assert.equal(optimizedPhotoName('가상 사진.PNG'),'가상 사진.jpg');
});
test('optimizer reduces dimensions when quality alone cannot meet limit',async()=>{
 const env=adapters(4000,2000,async(c)=>({size:c.width>1536?PHOTO_TARGET_BYTES+1:1000,type:'image/jpeg'}));const result=await optimizePhoto({size:20000},env);assert.equal(result.width,1536);assert.equal(result.height,768);assert.equal(env.closed,true);
});
test('invalid input, unsupported decode, excessive dimensions and encode failures do not produce an upload',async()=>{
 let decoded=false;await assert.rejects(optimizePhoto({size:PHOTO_MAX_INPUT_BYTES+1},{decode:async()=>{decoded=true;}}),/PHOTO_INPUT_SIZE/);assert.equal(decoded,false);
 await assert.rejects(optimizePhoto({size:1},{decode:async()=>{throw Error('unsupported')}}),/PHOTO_DECODE_FAILED/);
 const huge=adapters(PHOTO_MAX_PIXELS+1,1,async()=>({size:10,type:'image/jpeg'}));await assert.rejects(optimizePhoto({size:1},huge),/PHOTO_DIMENSIONS/);assert.equal(huge.closed,true);
 const bad=adapters(100,100,async()=>({size:10,type:'image/png'}));await assert.rejects(optimizePhoto({size:1},bad),/PHOTO_ENCODE_FAILED/);assert.equal(bad.closed,true);
 const tooBig=adapters(100,100,async()=>({size:PHOTO_TARGET_BYTES+1,type:'image/jpeg'}));await assert.rejects(optimizePhoto({size:1},tooBig),/PHOTO_TOO_LARGE/);assert.equal(tooBig.closed,true);
});
