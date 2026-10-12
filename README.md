# ClearGuide

`ClearGuide`는 복잡한 공공·생활 웹서비스 위에 단계별 안내 레이어를 띄워 사용자가 필요한 업무를 끝까지 수행하도록 돕는 웹 접근성 에이전트의 공개 제품 기반입니다.

가이드의 **생산(Authoring)** 과 **소비(Playback)** 를 분리합니다.

```text
ClearGuide Studio (Chrome Extension)
        ↓
Guide Template (JSON)
        ↓
ClearGuide Player (Web SDK)
        ↓
일반 사용자 — Extension 설치 불필요
```

- 실제 웹페이지 위에 단계별 가이드 오버레이 표시
- 현재 진행해야 하는 요소를 강조 표시
- 페이지 이동 후에도 워크플로우 이어서 실행
- 제작한 가이드를 Player SDK로 재사용 가능
- 사용자의 목표를 등록된 업무 여정과 연결하는 Goal Router 확장 지점
- 페이지 이동·새로고침 뒤에도 진행 중인 업무를 복구
- 요소를 찾지 못했을 때 재시도·중단을 선택할 수 있는 안전한 실패 처리

## 공공서비스 에이전트 방향

ClearGuide의 1차 제품 범위는 모든 웹사이트를 자동 조작하는 범용 에이전트가 아닙니다. 공공서비스의 한 업무 여정을 대상으로 다음 기능을 검증하는 것을 목표로 합니다.

1. 사용자의 업무 목표를 안내 여정(workflow)으로 연결
2. 현재 페이지에서 다음 행동 하나를 강조
3. 제출·결제·민감정보 단계는 사용자의 확인 후 진행
4. 페이지 이동, 새로고침, 요소 변경 시 진행 상태를 복구하거나 안전하게 중단
5. 완료·실패·중단 상태를 사용자가 이해할 수 있게 표시

AI는 목표 분류, 현재 단계 추론, 다음 행동 추천과 오류 설명에 사용하고, 실제 위험 행동의 실행 권한은 사용자 확인과 명시적 workflow에 둡니다. 이 경계를 지키면 공공서비스 데모를 안정적으로 검증하면서도 이후 비전 모델·에이전트 기능으로 확장할 수 있습니다.

제품 방향과 구현 우선순위는 [`docs/competition-product-baseline.md`](./docs/competition-product-baseline.md)에 기록합니다.

## 1. ClearGuide Studio

Chrome Extension은 가이드를 만드는 사람을 위한 도구입니다.

- 실제 웹페이지에서 안내 대상 요소 선택
- 단계별 설명 작성
- 가이드 미리보기
- JSON Import / Export
- 다중 페이지 가이드 작성·검증

사이트 접근 권한은 설치 시 전체 사이트에 요청하지 않고, 작성자가 가이드를 만들거나 미리볼 사이트를 선택했을 때 요청하는 방향으로 구성합니다.

### 로컬 설치

1. 저장소를 clone/download 합니다.
2. Chrome에서 `chrome://extensions/`를 엽니다.
3. 개발자 모드를 켭니다.
4. **압축해제된 확장 프로그램을 로드합니다**를 선택합니다.
5. 이 저장소 루트를 선택합니다.

## 2. ClearGuide Player

`sdk/clearguide-player.js`는 일반 웹사이트에서 사용할 수 있는 독립 실행형 Player입니다.

웹사이트 운영자가 Player와 Guide Template을 사이트에 배포하면 일반 사용자는 Chrome Extension을 설치할 필요가 없습니다.

### 객체로 실행

```html
<script src="/assets/clearguide-player.js"></script>
<script>
  ClearGuide.init({ showDashboard: true });
  ClearGuide.play(myGuideTemplate);
</script>
```

### JSON 템플릿 URL로 실행

```html
<script src="/assets/clearguide-player.js"></script>
<script>
  ClearGuide.init({ showDashboard: true });
  ClearGuide.playFromUrl('/guides/signup.json');
</script>
```

운영 환경에서는 Player와 Guide JSON을 해당 사이트와 같은 출처에서 제공하는 방식을 우선 권장합니다.

## Guide Template

Studio와 Player 사이의 공통 계약은 JSON Guide Template입니다.

- JSON Schema: [schema/guide.schema.json](./schema/guide.schema.json)
- 아키텍처: [docs/Guide_Producer_Consumer_Architecture.md](./docs/Guide_Producer_Consumer_Architecture.md)

Guide Template은 향후 CMS, Git 저장소, 정적 파일, API 등 다양한 배포 채널에서 사용할 수 있습니다.

## Chrome Web Store

Store 출시 정보와 체크리스트는 [CHROMEWEBSTORE.md](./CHROMEWEBSTORE.md)를 Source of Truth로 사용합니다.

Store Extension의 목적은 **웹 가이드 제작과 미리보기**입니다. Player는 웹사이트에 직접 삽입되는 별도 소비 경로입니다.

Store ZIP 생성:

```bash
python scripts/package_store.py
```

생성 ZIP에는 Extension 런타임 파일(`manifest.json`, `src/`, `public/`)만 포함됩니다.

## Repository Structure

```text
manifest.json                 # ClearGuide Studio manifest
src/                          # Studio service worker / content script
public/                       # Studio popup / icons
sdk/clearguide-player.js      # zero-install web Player
schema/guide.schema.json      # Studio ↔ Player contract
docs/                         # public architecture / guides
scripts/package_store.py      # reproducible Store package
CHROMEWEBSTORE.md             # Store submission source of truth
PRIVACY.md                    # Extension privacy policy
CONTRIBUTING.md
SECURITY.md
```

## Privacy

현재 Studio는 가이드 데이터를 `chrome.storage.local`에 저장하며 ClearGuide 서버로 전송하지 않습니다.

자세한 내용은 [PRIVACY.md](./PRIVACY.md)를 참조하세요.

## License

ClearGuide 소프트웨어는 **Apache License 2.0**으로 공개됩니다. 수정·재배포·상업적 활용을 포함한 오픈소스 사용은 Apache-2.0 조건을 따릅니다.

ClearGuide 이름·로고 등 브랜드 자산은 소프트웨어 라이선스와 별개이며 [TRADEMARK.md](./TRADEMARK.md)를 따릅니다.

## Contributing

외부 기여 절차는 [CONTRIBUTING.md](./CONTRIBUTING.md)를 참조하세요.
