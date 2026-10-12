const DEMO_PAGES = new URL('./', document.baseURI);

window.CLEARGUIDE_SERVICE_CATALOG = [
  {
    id: 'gov24-certificate',
    portal: '정부24',
    title: '주민등록등본 발급 안내',
    description: '메뉴를 찾고 신청 조건과 발급 절차를 확인하는 복잡한 민원 흐름',
    category: '민원·증명',
    steps: ['서비스 찾기', '신청 조건 확인', '발급 형태 선택', '본인 확인 안내', '수령 방법 선택', '신청 전 확인'],
    color: '#2563eb',
    url: 'https://www.gov.kr/'
  },
  {
    id: 'bokjiro-support',
    portal: '복지로',
    title: '복지서비스 모의 신청 안내',
    description: '복지서비스를 찾고 신청에 필요한 준비사항을 확인하는 흐름',
    category: '복지·생활',
    steps: ['서비스 찾기', '대상 조건 확인', '신청자 유형 선택', '준비 서류 확인', '가구 정보 안내', '신청 전 확인'],
    color: '#0f9f6e',
    url: 'https://www.bokjiro.go.kr/'
  },
  {
    id: 'public-reservation',
    portal: '공공예약 포털',
    title: '문화시설 예약 안내',
    description: '시설·날짜·시간을 고르고 예약 전 확인까지 이어지는 흐름',
    category: '예약·문화',
    steps: ['시설 찾기', '날짜 선택', '시간 선택', '이용자 유형 확인', '예약 정보 확인', '예약 전 동의'],
    color: '#7c3aed',
    url: null
  }
];

window.CLEARGUIDE_DEMO_WORKFLOW = {
  id: 'public-service-assistance-demo-v1',
  name: '공공 생활지원 서비스 신청 안내',
  domain: 'local-demo',
  originUrl: new URL('start.html', DEMO_PAGES).href,
  audience: 'digital-inclusion',
  purpose: 'Guide a user through a public-service application preparation journey',
  keywords: ['공공', '생활지원', '복지', '서비스', '신청', '안내'],
  safety: {
    confirmationRequired: true,
    sensitiveDataPolicy: 'no-sensitive-data-in-demo'
  },
  steps: [
    {
      selector: '#start-task',
      label: '서비스 이용 시작',
      urlPattern: new URL('start.html', DEMO_PAGES).href,
      trigger: 'none',
      message: '먼저 서비스 이용 시작 버튼을 눌러 안내를 시작하세요.',
      actionRequired: false,
      interactionType: 'click'
    },
    {
      selector: '#service-type',
      label: '생활지원 서비스 선택',
      urlPattern: new URL('service.html', DEMO_PAGES).href,
      trigger: 'none',
      message: '신청하려는 생활지원 서비스를 선택하세요.',
      actionRequired: true,
      interactionType: 'change'
    },
    {
      selector: '#applicant-type',
      label: '신청자 유형 선택',
      urlPattern: new URL('service.html', DEMO_PAGES).href,
      trigger: 'none',
      message: '본인 신청인지 대리 안내인지 선택하세요.',
      actionRequired: true,
      interactionType: 'change'
    },
    {
      selector: '#document-check',
      label: '준비 서류 안내 확인',
      urlPattern: new URL('service.html', DEMO_PAGES).href,
      trigger: 'none',
      message: '준비 서류 안내를 확인한 뒤 체크하세요.',
      actionRequired: true,
      interactionType: 'change'
    },
    {
      selector: '#review-task',
      label: '신청 전 확인',
      urlPattern: new URL('review.html', DEMO_PAGES).href,
      trigger: 'none',
      message: '신청 전 확인 내용을 읽고 안내를 완료할 준비를 하세요.',
      actionRequired: true,
      interactionType: 'click'
    },
    {
      selector: '#finish-task',
      label: '안내 완료',
      urlPattern: new URL('review.html', DEMO_PAGES).href,
      trigger: 'none',
      message: '모든 안내 단계를 확인했습니다. 완료 버튼을 눌러 종료하세요.',
      actionRequired: true,
      interactionType: 'click'
    }
  ]
};
