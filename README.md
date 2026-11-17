# DocumentDev

API/기술 문서용 **자체 완결형 HTML 문서**를 만드는 위지윅(WYSIWYG) 데스크톱 편집기입니다.
스크린샷의 Mushiny "RMS Interface Doc" 같은 3분할 문서를 쉽게 작성·내보낼 수 있습니다.

- **상단**: 문서 제목 바
- **왼쪽**: 본문의 제목(H1/H2/H3)에서 **자동 생성되는 목차** — 클릭 시 해당 위치로 이동
- **가운데**: 본문 — 텍스트, 문법 강조 코드 블록, 표, 이미지

## 주요 기능

- 리치 텍스트 편집 (굵게/기울임/목록/인용 등)
- 코드 블록(언어별 문법 강조)과 표를 손쉽게 삽입 (툴바 그리드 피커)
- 제목 입력 시 왼쪽 목차 자동 갱신 + 앵커 링크
- **사용자 지정 테마**: 상단바/사이드바/제목/표/코드 색상, 제목, 글꼴을 문서별로 변경
- **한국어 / 영어 UI 전환**
- 내보낸 `.html`은 네트워크 없이 더블클릭으로 열림 (CSS·하이라이트·이미지 모두 내장)
- 내보낸 `.html`을 다시 열어 **재편집** 가능 (편집 데이터가 파일 안에 내장됨)
- 내보낸 문서에 **목차 검색**과 코드 블록 **복사 버튼**
- **PDF로 내보내기 / 인쇄** (A4, 표 머리글 행이 쪽마다 반복)
- **워드(.docx) 내보내기** — 제목 스타일, 목록, 표(셀 병합·색·열 너비), 그림, 쪽 번호
- 여러 문서를 **탭**으로 열기 (탭마다 실행 취소 기록 유지), 엑셀 표 붙여넣기, 셀 병합/분할
- **최근 문서**, 파일 끌어다 놓기, "연결 프로그램으로 열기"
- 비정상 종료 시 **복구**, 다른 프로그램이 파일을 바꾼 경우 덮어쓰기 전 확인

## 개발 실행

```bash
npm install
npm run dev
```

## 테스트

```bash
npm test            # 내보내기·파일 포맷 스모크 테스트 (Node)
npm run test:e2e    # 실제 앱(Electron)을 띄워 편집·탭·붙여넣기·파일·PDF/워드 등을 검사
```

> Linux에서 화면 없이 실행할 때는 `xvfb-run -a npm run test:e2e`.

## 빌드 / 배포본

`npm run build`는 앱 코드를 `out/` 폴더로 컴파일만 합니다. **실행 파일(.exe)은 만들지 않습니다.**
실행 파일과 설치본은 아래 `package` 명령으로 만들며, 결과물은 `release/` 폴더에 생깁니다.

```bash
npm run package:win       # Windows: 설치 프로그램 .exe + 설치 없이 실행하는 portable .exe
npm run package:portable  # Windows: portable .exe만
npm run package:mac       # macOS: .dmg
npm run package:linux     # Linux: .AppImage
```

`npm run package:win` 결과물 (`release/` 폴더):

| 파일 | 용도 |
|---|---|
| `DocumentDev Setup 0.1.0.exe` | 설치 프로그램 (설치 경로 선택 가능, 시작 메뉴 등록) |
| `DocumentDev-0.1.0-portable.exe` | 설치 없이 더블클릭으로 바로 실행 |
| `win-unpacked/DocumentDev.exe` | 압축 풀린 실행 폴더 (폴더째 복사해서 써도 됨) |

> 배포본은 해당 OS에서 만드는 것이 가장 안정적입니다.
> Windows용 `.exe`는 Windows PC에서 `npm install` 후 `npm run package:win`을 실행하세요.

## 기술 스택

Electron · electron-vite · React · TypeScript · TipTap(ProseMirror) · lowlight/highlight.js · Zustand

## 파일 포맷

내보낸 `.html`은 보이는 문서이자 편집 가능한 프로젝트 파일입니다.
편집용 JSON(문서 내용 + 테마 + 언어)이 파일 끝의 비활성
`<script id="docdev-data" type="application/json">` 블록에 내장되어,
브라우저에서는 일반 문서로 보이고 DocumentDev에서는 다시 열어 편집할 수 있습니다.
