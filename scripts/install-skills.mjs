import {mkdir,writeFile,readFile,stat} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const base=process.argv[2]||path.join(process.env.CODEX_HOME||path.join(homedir(),'.codex'),'skills');
const dest=path.join(path.resolve(base),'igis-spatial-review');
try{
 try{const old=await readFile(path.join(dest,'package-path.txt'),'utf8');if(old.trim()!==root)throw Error('다른 패키지에 연결된 스킬이 있습니다. 기존 설치를 덮어쓰지 않습니다.');}
 catch(e){if(e.code!=='ENOENT')throw e;try{await stat(dest);throw Error('대상 스킬 폴더가 이미 있습니다.');}catch(s){if(s.code!=='ENOENT')throw s;}}
 await mkdir(dest,{recursive:true});await writeFile(path.join(dest,'package-path.txt'),root+'\n');
 await writeFile(path.join(dest,'SKILL.md'),`---\nname: igis-spatial-review\ndescription: 로컬 도면 기반 Three.js 공간 검토 패키지로 새 프로젝트를 만들고 실내 뷰, PNG 캡처, 공간 코멘트와 보행 동선을 구성한다.\n---\n\n이 스킬 폴더의 package-path.txt를 읽어 패키지 위치를 확인한다. 해당 경로의 skills/spatial-review-workflow/SKILL.md를 읽고 사용자의 도면으로 작업한다. 패키지가 이동되었으면 사용자에게 현재 경로를 확인한다. 새 도면은 기존 프로젝트에 덮어쓰지 않는다. 이미지 시각화는 기본적으로 captures/ PNG를 외부 도구에서 이용하며, 외부 업로드는 사용자의 요청 없이 실행하지 않는다.\n`);
 console.log('설치 완료: '+dest+'\nCodex에서 새 대화를 열어 $igis-spatial-review를 사용하세요. 패키지 폴더는 이동하지 마세요.');
}catch(e){console.error(e.message);process.exitCode=1;}
