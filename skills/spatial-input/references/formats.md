# 입력 형식과 구현 범위

패키지 버전 0.3.0 기준. 모든 파싱은 로컬 브라우저에서 이루어지며 외부 API 키나 업로드가 필요 없다.

| 입력 | 현재 실행 기능 | 다음 모델링 단계 |
| --- | --- | --- |
| PNG/JPEG | 원본 이미지 미리보기 | 픽셀 추적, 기준 치수 보정, 영역별 객체 구성 |
| PDF | PDF.js 페이지별 미리보기/원본 저장 | 벡터/스캔 여부와 페이지 선택 확인, 필요시 추출·추적 |
| ASCII DXF | 레이어별 2D 선형상, 선택/표시, 단위 보정, 기록 저장 | 닫힌 경계와 레이어 의미 확인 후 벽·공간·가구 분류 |
| DWG | 변환 안내 | CAD에서 ASCII DXF로 저장 또는 IFC 내보내기 |
| IFC STEP `.ifc` | 3D 형상, 객체 이름/유형, GlobalId/ExpressID, 직접 층 연결, 선택/표시 | 관심 층/공간 식별, 변경 대상 분리 |

## DXF

`importers/dxf.js`는 `dxf-parser`를 사용하며 LINE, LWPOLYLINE, POLYLINE, CIRCLE, ARC, 단일 INSERT를 그린다. 폴리라인 bulge와 원호는 선분 근사한다. 블록의 기준점, 축척, 회전, 이동과 레이어 0의 상속을 처리한다. DXF 2D 선을 자동으로 벽이나 가구로 부풀리지 않는다.

문자, 치수, 해치, 스플라인, 3D 솔리드/메시, 배열 INSERT, 비표준 OCS, 순환·미해결 블록은 제외한다. 뷰어는 제외 요소를 표시하지만 전체 CAD 의미·폰트·선종·치수·외부 참조의 보존을 보장하지 않는다. ASCII를 전제로 하며 구형 비 UTF-8 한글 인코딩은 원본 CAD에서 UTF-8 DXF로 다시 저장해 확인한다.

`$INSUNITS`의 mm/cm/m/inch/ft를 읽는다. 단위 미지정이나 미지원 코드면 단위를 고르게 하고 자동 추정을 하지 않는다. 사용자가 단위를 바꾸면 원본 파일을 다시 파싱한다. 원본 좌표는 기록의 `entries[].objects[].points`에 **미터, X/Y/Z = 원본 X/Z/-Y**로 저장한다. 표시용 좌표는 여기서 `metadata.renderOrigin`을 뺀 값이다. 원본 수치로 되돌릴 때 축 방향과 `metersPerUnit`까지 역변환한다.

## IFC

`importers/ifc.js`는 web-ifc가 생성한 메시, 단위 보정, 배치 변환을 사용한다. 데이터를 복사한 뒤 모델 핸들을 닫으므로 WASM 버퍼에 대한 참조를 남기지 않는다. 객체마다 GlobalId/ExpressID를 남기고 IfcRelContainedInSpatialStructure로 직접 연결된 층/공간 이름을 기록한다. 간접 집합 관계를 따라 전체 공간 트리를 만드는 기능은 아직 없다.

`COORDINATE_TO_ORIGIN`을 사용하고 coordination matrix를 기록한다. 지리 좌표·사이트 기준 좌표를 정확히 유지해야 하는 작업에서는 원점 이동 행렬과 CRS/지도 변환을 별도로 검증한다. IFC2X3 합성 예제는 테스트했지만 모든 IFC 버전·내보내기 도구·대형 프로젝트를 검증하지 않았다. IFCZIP/IFCXML, 전체 속성 세트 편집, 수정 IFC 내보내기, 연결 모델 병합은 미지원이다.

가져오기 기록 JSON의 IFC 항목에는 객체 ID·유형·층과 삼각형 수만 담긴다. **메시 자체와 원본 전체 속성이 없는 검사 기록이며, 원본 IFC를 대체하거나 재불러오는 모델 파일이 아니다.** DXF 기록은 정규화한 선 좌표를 포함하지만 현재 UI에 JSON 재불러오기 기능은 없다.

## 원본 미리보기와 운용

PNG/JPEG/PDF 선택은 파일을 읽고 원본을 표시한다. PDF는 로컬 PDF.js 및 worker/CMap/폰트/WASM으로 페이지를 그린다. OCR·벡터 의미 추출·치수 보정·자동 3D 변환은 포함하지 않는다. 원본 저장 링크와 이전/다음 페이지를 제공한다. 암호화되거나 손상된 PDF는 오류를 표시할 수 있다. 로컬 파일 객체 URL은 새 파일로 교체할 때 해제한다.

단일 파일 크기는 50MB로 제한한다. 파싱은 메인 스레드에서 실행되므로 복잡한 파일은 일시적으로 화면이 멈출 수 있다. 대규모 운영에 앞서 worker, 취소, 대형 메시 처리, 실 프로젝트 회귀 검증을 추가한다. 현재 화면은 입력 검토용이며 기존 프로젝트 모델을 자동으로 덮어쓰지 않는다.

## 유지보수 근거

- [dxf-parser 공식 저장소](https://github.com/gdsestimating/dxf-parser): 파서 자체의 지원 범위와 이 뷰어가 그리는 범위는 다르다.
- [web-ifc 공식 저장소](https://github.com/ThatOpen/engine_web-ifc) 및 [IfcAPI 문서](https://thatopen.github.io/engine_web-ifc/docs/classes/web-ifc.IfcAPI.html): OpenModel, StreamAllMeshes, 배치 변환, 좌표/형상 반환을 확인할 때 사용한다.
