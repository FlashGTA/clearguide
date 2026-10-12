# ClearGuide 사용자 가이드

ClearGuide는 **가이드를 만드는 Studio**와 **가이드를 보여주는 Player**를 분리합니다.

## A. 가이드 제작자 — ClearGuide Studio Extension

### 1. 새 가이드 만들기

1. 가이드를 만들 사이트를 엽니다.
2. Chrome 툴바에서 **ClearGuide Studio**를 엽니다.
3. **새 가이드 만들기**를 누릅니다.
4. 처음 사용하는 사이트라면 Chrome이 해당 사이트 접근 권한을 묻습니다.
5. 허용하면 페이지에서 요소를 선택할 수 있습니다.
6. 단계 이름과 안내 문구를 입력하고 스텝을 추가합니다.
7. 작업이 끝나면 가이드 이름을 입력해 저장합니다.

ClearGuide Studio는 설치 시 모든 사이트 접근을 요구하지 않습니다. 제작 또는 미리보기에 필요한 사이트만 사용자가 선택해 허용합니다.

### 2. 가이드 미리보기

팝업의 현재 페이지 가이드 또는 보관함에서 ▶ 버튼을 누르면 작성한 가이드를 미리볼 수 있습니다.

가이드가 여러 사이트를 거치는 경우 미리보기 시작 전에 필요한 사이트 권한을 요청할 수 있습니다.

### 3. 가져오기 / 내보내기

- 개별 가이드: 📤 버튼으로 JSON 저장
- 전체 백업: 팝업 하단 **전체 백업**
- 가져오기: **가져오기**에서 JSON 선택

새로 내보내는 가이드에는 `schemaVersion: "1.0"`이 포함됩니다.

공통 계약은 [schema/guide.schema.json](./schema/guide.schema.json)을 기준으로 합니다.

---

## B. 일반 사용자 — ClearGuide Player

일반 사용자가 단순히 가이드를 따라가기만 하는 경우에는 Chrome Extension 설치가 필요하지 않습니다.

웹사이트 운영자가 Player SDK와 Guide Template을 사이트에 포함하면 됩니다.

### 1. Player 로드

```html
<script src="/assets/clearguide-player.js"></script>
```

### 2. 초기화

```html
<script>
  ClearGuide.init({
    accentColor: '#3b82f6',
    showDashboard: true
  });
</script>
```

### 3-1. JavaScript 객체 실행

```html
<script>
  ClearGuide.play({
    schemaVersion: '1.0',
    id: 'signup-guide',
    name: '회원가입 안내',
    steps: [
      {
        label: '가입 버튼',
        selector: '#signup',
        message: '회원가입 버튼을 선택하세요.',
        urlPattern: '*'
      }
    ]
  });
</script>
```

### 3-2. JSON 파일 실행

```html
<script>
  ClearGuide.playFromUrl('/guides/signup.json');
</script>
```

Player와 JSON 가이드는 같은 사이트에서 호스팅하는 방식을 우선 권장합니다.

---

## C. 언제 Extension Viewer가 필요한가?

다음 상황에서는 향후 별도의 **ClearGuide Viewer Extension**을 제공할 수 있습니다.

- 대상 웹사이트 운영자가 Player SDK를 삽입할 수 없음
- 사용자가 외부에서 배포된 Guide Template을 특정 사이트 위에서 실행해야 함

Viewer는 일반 사용자용이므로 Studio의 제작 기능과 권한을 그대로 포함하지 않는 별도 제품으로 설계하는 것을 원칙으로 합니다.

---

## D. 페이지 이동

가이드의 다음 단계가 다른 URL이면 Player 또는 Studio Preview가 해당 단계의 `urlPattern`을 기준으로 이동합니다.

Studio Extension 기반 미리보기의 경우 대상 origin에 대한 사용자 권한이 필요합니다.

웹사이트에 직접 삽입된 Player는 Chrome Extension 권한을 사용하지 않습니다.

---

## E. 데이터

Studio는 현재 다음 데이터를 브라우저 로컬에 저장합니다.

- Guide Template
- 대상 도메인/URL 패턴
- DOM selector
- 작성한 안내 문구
- 미리보기 세션

현재 릴리즈는 이 데이터를 ClearGuide 서버로 전송하지 않습니다.

자세한 내용은 [PRIVACY.md](./PRIVACY.md)를 참조하세요.
