import {readFile,writeFile,rename} from 'node:fs/promises';
import {validateModel} from '../model-schema.js';
const file=new URL('../model.json',import.meta.url),output=new URL('../model-definition.js',import.meta.url),temp=new URL('../model-definition.js.tmp',import.meta.url);
try{const model=validateModel(JSON.parse(await readFile(file,'utf8')));await writeFile(temp,'export default '+JSON.stringify(model,null,2)+';\n');await rename(temp,output);console.log('모델 검증·반영 완료. 브라우저를 새로고침하세요. 저장 동선과 코멘트 좌표를 다시 확인하세요.');}catch(e){console.error(e.message);process.exitCode=1;}
