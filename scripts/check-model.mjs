import {readFile} from 'node:fs/promises';
import {validateModel} from '../model-schema.js';
try{const model=validateModel(JSON.parse(await readFile(new URL('../model.json',import.meta.url),'utf8')));console.log(model.name+': 필수 필드·치수·ID 검증 통과. 도면 일치와 보행 경로는 화면에서 별도 확인하세요.');}catch(e){console.error(e.message);process.exitCode=1;}
