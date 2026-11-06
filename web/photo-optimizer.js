export const PHOTO_MAX_INPUT_BYTES=30*1024*1024;
export const PHOTO_MAX_PIXELS=60_000_000;
export const PHOTO_MAX_SIDE=1920;
export const PHOTO_TARGET_BYTES=1*1024*1024;
const JPEG_QUALITIES=[0.86,0.75,0.64,0.52,0.40];
function defaultDecode(file){
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{URL.revokeObjectURL(url);resolve({source:img,width:img.naturalWidth,height:img.naturalHeight,close(){}});};
  img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('PHOTO_DECODE_FAILED'));};
  img.src=url;
 });
}
function defaultCanvas(width,height){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;}
function canvasBlob(canvas,quality){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PHOTO_ENCODE_FAILED')),'image/jpeg',quality));}
export async function optimizePhoto(file,adapters={}){
 if(!file||!Number.isFinite(file.size)||file.size<1||file.size>PHOTO_MAX_INPUT_BYTES)throw new Error('PHOTO_INPUT_SIZE');
 let decoded;
 try{
  decoded=await (adapters.decode??defaultDecode)(file);
  const {width,height,source}=decoded;
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>PHOTO_MAX_PIXELS)throw new Error('PHOTO_DIMENSIONS');
  const initial=Math.min(1,PHOTO_MAX_SIDE/Math.max(width,height));
  for(const scale of [1,0.8,0.64,0.5]){
   const w=Math.max(1,Math.round(width*initial*scale)),h=Math.max(1,Math.round(height*initial*scale));
   const canvas=(adapters.createCanvas??defaultCanvas)(w,h),context=canvas.getContext('2d');
   if(!context)throw new Error('PHOTO_ENCODE_FAILED');
   context.fillStyle='#ffffff';context.fillRect(0,0,w,h);context.drawImage(source,0,0,w,h);
   for(const quality of JPEG_QUALITIES){
    const blob=await (adapters.encode??canvasBlob)(canvas,quality);
    if(!blob||blob.type!=='image/jpeg'||blob.size<1)throw new Error('PHOTO_ENCODE_FAILED');
    if(blob.size<=PHOTO_TARGET_BYTES)return {blob,width:w,height:h,originalBytes:file.size};
   }
  }
  throw new Error('PHOTO_TOO_LARGE');
 }catch(err){if(/^PHOTO_/.test(err?.message??''))throw err;throw new Error('PHOTO_DECODE_FAILED');}
 finally{decoded?.close?.();}
}
export function optimizedPhotoName(name){
 const stem=String(name??'photo').replace(/[\\/\x00-\x1f\x7f]/g,'_').replace(/\.[^.]*$/,'').trim().slice(0,180)||'photo';
 return `${stem}.jpg`;
}
