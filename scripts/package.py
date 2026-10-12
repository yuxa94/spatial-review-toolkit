"""Build a public runtime ZIP with a synthetic model and no user project data."""
from pathlib import Path
import json,zipfile,hashlib
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'package.json').read_text())['version']
output=root/'release'/f'spatial-review-toolkit-{version}.zip'
output.parent.mkdir(exist_ok=True)
checks={}
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
 def write(name,data,mode=0o644):
  info=zipfile.ZipInfo(name);info.external_attr=(0o100000|mode)<<16;info.compress_type=zipfile.ZIP_DEFLATED
  z.writestr(info,data);checks[name]=hashlib.sha256(data).hexdigest()
 for p in sorted(root.rglob('*')):
  if not p.is_file():continue
  rel=p.relative_to(root)
  if rel.parts[0] in {'node_modules','release','artifacts','output','project','captures','sources'} or any(part.startswith('.') for part in rel.parts):continue
  write(rel.as_posix(),p.read_bytes(),p.stat().st_mode&0o777)
 write('project/review.json',json.dumps({'schema':'spatial-review/0.4','revision':0,'views':[],'assets':[],'journeys':[],'comments':[],'briefs':[],'versions':[]},indent=2).encode())
 write('PACKAGE-INFO.json',json.dumps({'version':version,'kind':'public-toolkit','entry':'docs/index.html','containsUserWork':False,'requires':'Node.js >=20; WebGL2 browser'},indent=2).encode())
 write('SHA256SUMS.txt',''.join(f'{h}  {name}\n' for name,h in sorted(checks.items())).encode())
with zipfile.ZipFile(output) as z:
 assert z.testzip() is None
 assert not any(n.startswith(('captures/','sources/','output/','artifacts/')) for n in z.namelist())
 print(f'{output}: {len(z.namelist())} files, {output.stat().st_size/1024/1024:.2f} MiB')
