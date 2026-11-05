import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const name of ['index.html','app.js','style.css']) await copyFile(`web/${name}`,`dist/${name}`);
console.log('Static pilot build complete');
