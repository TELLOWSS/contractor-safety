import {optimizePhoto} from './photo-optimizer.js';
export function createPhotoPreviewController(onChange,adapters={}){
 const optimize=adapters.optimize??optimizePhoto,makeUrl=adapters.makeUrl??(blob=>URL.createObjectURL(blob)),revoke=adapters.revoke??(url=>URL.revokeObjectURL(url));
 let generation=0,currentFile=null,pending=null,url=null;
 function clear(){generation++;currentFile=null;pending=null;if(url){revoke(url);url=null;}}
 function setFile(file){
  clear();if(!file){onChange({state:'empty'});return Promise.resolve(null);}
  currentFile=file;const token=generation;onChange({state:'processing'});
  pending=(async()=>{try{const result=await optimize(file);if(token!==generation)return null;const nextUrl=makeUrl(result.blob);url=nextUrl;onChange({state:'ready',result,url:nextUrl});return result;}catch(error){if(token===generation)onChange({state:'error',error});return null;}})();return pending;
 }
 return {setFile,clear,get(file){return file===currentFile&&pending?pending:setFile(file);}};
}
