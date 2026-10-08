const DEMO_PAGES = new URL('./', document.baseURI);

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
