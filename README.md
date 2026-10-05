# ClearGuide

ClearGuide는 웹페이지 위에 단계별 안내를 제공하는 **Guide Studio + Player** 프로젝트입니다.

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
