# spatial-model/1

`examples/new-plan.json`이 실행 가능한 두 공간 예제입니다. 공개 예제와 새 모델 모두 generic-scene을 사용합니다.

필수: schema, name, scale, origin:[x,y], ceilingHeight, footprint:[[x,y],...], regions, objects, assumptions:[문장,...]. optional: source, scaleBasis, revision, voids.

- 모든 평면 좌표와 size/radius/thickness는 **같은 도면 단위**입니다. world metres = (좌표 − origin) × scale. 도면 y는 아래쪽, 3D z는 같은 방향입니다. 높이와 base는 항상 미터입니다. 회전은 Three.js y축 라디안입니다.
- PNG 겹치기: 좌표는 PNG 픽셀과 일치시켜야 합니다. source.width/height는 PNG의 실제 픽셀 크기입니다. 잘라낸 PNG를 쓰면 원점/축척도 맞추세요. 미터 단위 CAD를 이미지와 겹치려면 이미지 픽셀 좌표로 모델을 변환한 뒤 scale에 m/px를 기록하세요. CAD 원래 좌표 변환도 가정/기록에 보존하세요.
- regions: id(영문·숫자·_·-), name, polygon, category(public/meeting/service/existing), optional en/color/label/areaPyeong/seats/note. service/existing은 기본 보행 제외입니다. 개방 영역도 polygon으로 표현합니다.
- 예약 영역 ID: circulation, columns, perimeter. voids는 id/name/polygon. 단순하고 교차하지 않는 외곽과 서로 겹치지 않는 내부 보이드가 필요합니다. 방 polygon은 보이드와 겹치지 않게 분할하세요. 검증기는 필수 필드·수치·ID를 검사하지만 모든 위상/겹침 오류를 판정하지 않습니다. 원본과 평면 비교가 필요합니다.
- objects: 안정적인 고유 id, regionId, name, kind(box/cylinder/wall), type(wall/glass/column/furniture), height, optional base/color/rotation/assumed/sourceId/furnitureId.
- box: position:[x,y], size:[w,d]. cylinder: position, radius. wall: a:[x,y], b:[x,y], thickness. 문의 빈 공간은 **벽을 양쪽 선분으로 나누어** 표시합니다. 영역 경계만 있다고 벽을 자동 생성하지 않습니다.
- 여러 메쉬로 된 소파·의자는 부품별 id와 공통 furnitureId를 씁니다. 기본 가구 라이브러리/자동 제품 추정이 아니므로 시트·등받이 등의 종류와 방향을 도면에 맞춰 구성하세요.
- IFC GUID/DXF handle은 sourceId에 보존합니다. 이 포맷으로 IFC 전체 의미·곡면/BIM 편집 기능이 보존되지는 않습니다. 직접 가져오기 원본 검사 뷰어와 구분하세요.
- auto-로 시작하는 객체 ID는 생성된 바닥/천장용 예약값입니다.
- 천장은 전체 외곽과 보이드 구멍을 따르며 ceilingHeight에 생성됩니다. 천장고·보이드 상부 개방이 도면에서 확인되지 않으면 assumptions에 명시합니다.
- ceilingHeight는 현재 2.2~12m 범위입니다. 한 프로젝트는 한 층/한 좌표계 기준입니다. 대규모 부지/다층/기울어진 바닥은 추가 구현이 필요합니다.

모델 데이터는 실행 코드가 아닌 JSON으로 작성합니다. `sync-model`이 검증 후 JavaScript 데이터 모듈을 생성합니다. source 파일은 new-project 명령 인수로 복사하며 모델 JSON의 임의 경로를 자동으로 읽지 않습니다.
