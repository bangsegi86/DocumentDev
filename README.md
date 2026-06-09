# DocumentDev

API/기술 문서용 **자체 완결형 HTML 문서**를 만드는 위지윅(WYSIWYG) 데스크톱 편집기입니다.
스크린샷의 Mushiny "RMS Interface Doc" 같은 3분할 문서를 쉽게 작성·내보낼 수 있습니다.

- **상단**: 문서 제목 바
- **왼쪽**: 본문의 제목(H1/H2/H3)에서 **자동 생성되는 목차** — 클릭 시 해당 위치로 이동
- **가운데**: 본문 — 텍스트, 문법 강조 코드 블록, 표, 이미지

## 주요 기능

- 리치 텍스트 편집 (굵게/기울임/목록/인용 등)
- 코드 블록(언어별 문법 강조)과 표를 손쉽게 삽입 (툴바 그리드 피커)
- **빠른 삽입 메뉴**: 본문에서 `/` 입력 → 제목·목록·표·코드 블록·이미지 등을 키보드로 선택 삽입
- 제목 입력 시 왼쪽 목차 자동 갱신 + 앵커 링크
- **사용자 지정 테마**: 상단바/사이드바/제목/표/코드 색상, 제목, 글꼴을 문서별로 변경
- **한국어 / 영어 UI 전환**
- 내보낸 `.html`은 네트워크 없이 더블클릭으로 열림 (CSS·하이라이트·이미지 모두 내장)
- 내보낸 `.html`을 다시 열어 **재편집** 가능 (편집 데이터가 파일 안에 내장됨)

## 개발 실행

```bash
npm install
npm run dev
```

## 빌드 / 배포본

```bash
npm run build           # out/ 생성
npm run package:win     # Windows 설치본 (nsis)
npm run package:mac     # macOS dmg
npm run package:linux   # Linux AppImage
```

> 배포본(설치 파일)은 해당 OS에서 빌드하는 것이 가장 안정적입니다.
> 예) Windows `.exe` 설치본은 Windows PC에서 `npm run package:win`으로 생성하세요.

## 기술 스택

Electron · electron-vite · React · TypeScript · TipTap(ProseMirror) · lowlight/highlight.js · Zustand

## 파일 포맷

내보낸 `.html`은 보이는 문서이자 편집 가능한 프로젝트 파일입니다.
편집용 JSON(문서 내용 + 테마 + 언어)이 파일 끝의 비활성
`<script id="docdev-data" type="application/json">` 블록에 내장되어,
브라우저에서는 일반 문서로 보이고 DocumentDev에서는 다시 열어 편집할 수 있습니다.
