# ClearGuide

`ClearGuide`는 웹페이지 위에 단계별 안내 레이어를 띄워 사용자가 필요한 작업을 더 쉽게 따라갈 수 있도록 돕는 브라우저 확장 프로그램입니다.

이 저장소는 공개 배포용 레포지토리입니다. 실제 개발은 비공개 monorepo에서 진행하고, 이 레포에는 배포에 필요한 확장 프로그램 코드와 데모 파일, SDK만 포함합니다.

## 주요 기능

- 실제 웹페이지 위에 단계별 가이드 오버레이 표시
- 현재 진행해야 하는 요소를 강조 표시
- 페이지 이동 후에도 워크플로우 이어서 실행
- 제작한 가이드를 Player SDK로 재사용 가능

## 포함된 구성

- `manifest.json`
- `src/`
- `public/`
- `sdk/`
- `USER_GUIDE.md`
- `player_demo.html`
- `player_demo_complete.html`
- `automated_test.html`

## 설치 방법

1. 브라우저에서 `chrome://extensions/` 를 엽니다.
2. 우측 상단의 개발자 모드를 켭니다.
3. `압축해제된 확장 프로그램을 로드합니다`를 클릭합니다.
4. 이 저장소 루트를 선택합니다.

## 테스트 및 데모

- `automated_test.html`: 브라우저에서 바로 열 수 있는 경량 회귀 테스트
- `player_demo.html`: Player SDK 기본 데모
- `player_demo_complete.html`: Player SDK 확장 데모

## 참고 사항

- 기본 라이선스는 `PolyForm Noncommercial 1.0.0` 입니다.
- 상업적 사용은 별도 서면 라이선스가 필요합니다.
- 이름, 로고, 아이콘 등 브랜드 자산은 `TRADEMARK.md` 기준으로 보호됩니다.
- 이 공개 레포에는 내부 로드맵, 감사 문서, 전략 문서를 포함하지 않습니다.
