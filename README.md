# Spatial Review Toolkit

도면으로 만든 공간을 Three.js에서 검토하고 실내 구도를 PNG로 저장하는 로컬 패키지입니다. 3D 도구에 익숙하지 않은 사용자도 에이전트의 도움으로 모델을 구성하고, 코멘트와 보행 동선을 남길 수 있습니다.

**[상세 HTML 사용 가이드](https://yuxa94.github.io/spatial-review-toolkit/)** · **[실행 패키지 다운로드](https://github.com/yuxa94/spatial-review-toolkit/releases/latest)**

## 빠른 시작

1. Node.js 20 이상을 설치합니다.
2. Release의 spatial-review-toolkit-0.6.1.zip을 압축 해제합니다.
3. Mac은 Start.command, Windows는 Start.bat를 실행합니다.
4. 표시된 로컬 주소에서 합성 라운지/회의실 예제를 엽니다.

실행에는 npm 설치, API 키, CDN이 필요하지 않습니다. WebGL2 지원 브라우저가 필요합니다. GitHub Pages는 사용 설명서이며, 파일 저장 서버는 사용자 컴퓨터에서 실행됩니다.

## 새 도면으로 시작

선택적으로 Install-skills.command 또는 Install-skills.bat로 Codex에 igis-spatial-review 스킬을 등록합니다. 전역 설치 없이 skills/spatial-review-workflow/SKILL.md 경로를 대화에 지정해도 됩니다.

> 이 스킬을 사용해 첨부 도면으로 별도 공간 검토 프로젝트를 만들어 줘. 구조와 가구를 먼저 확인하고, 실내 캡처 PNG를 외부 이미지 도구에서 사용할 수 있게 해 줘.

입력 검토 → 모델 JSON 구성·검증 → 새 프로젝트 생성 순서입니다. PNG/PDF는 추적이 필요하고, DXF/IFC 가져오기는 검사 화면입니다. IFC의 스튜디오 자동 연결은 지원하지 않습니다.

모델 데이터가 준비되어 있다면:

```sh
node scripts/new-project.mjs ../new-building ./model.json ./drawing.png
```

[설치와 재사용](docs/NEW-PROJECT.md) · [모델 형식](docs/MODEL-SCHEMA.md) · [작업 과정](docs/PROCESS.md)

## 주요 기능

- 공간/객체 선택과 레이어 목록 동기화
- 실내 카메라, 천장, 한/영 입력과 무관한 WASD 이동
- captures/ PNG + 카메라 JSON 저장, 선택 폴더 저장, 다운로드
- 좌표 코멘트, 작성 시점 복원과 해결 상태
- 보행 동선 검사, 재생과 WebM/MP4 녹화
- PDF, ASCII DXF, IFC 입력 검사
- 외부 이미지 결과의 버전 보관; 선택적 대화 이미지 도구 스킬

새 프로젝트의 원본과 작업 기록은 로컬에 저장됩니다. 공개 소스에는 합성 예제만 포함됩니다. 실측·시공·피난 검증용 모델이 아닙니다.

## 개발

```sh
npm ci
npm test
npm run vendor
npm run package
```

Three.js와 파서 라이브러리는 vendor/에 포함됩니다. 라이선스는 [Third-party notices](vendor/THIRD-PARTY-NOTICES.md)를 확인하세요.
