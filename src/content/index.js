console.log("[ClearView AI] Content Script Injected (Connect++ Z-Index Fix)");

class ClearViewEngine {
  constructor() {
    this.config = null;
    this.currentStep = 0;
    this.shadowRoot = null;
    this.overlay = null;
    this.isAdminMode = false;
    this.isNavMode = false;
    this.pickerOverlay = null;
    this.tempSteps = [];
    this.isPaused = false;
    this.globalWorkflow = null;
    this.lastHoveredElement = null;
    this.trackingElement = null;
    this.tickerId = null;

    this.boundHandleMouseOver = this.handleMouseOver.bind(this);
    this.boundHandleElementClick = this.handleElementClick.bind(this);
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundTick = this.tick.bind(this);

    this.init();
  }

  async init() {
    // 키보드 이벤트 리스너 추가 (전역)
    document.addEventListener('keydown', this.boundHandleKeyDown);
    // 1. 메시지 리스너 등록
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("[ClearGuide] Received message:", request.action);
      if (request.action === "activate") {
        this.startGuide();
      } else if (request.action === "startPicker") {
        this.toggleAdminMode(true);
      } else if (request.action === "resumeWorkflow") {
        this.globalWorkflow = request.workflow;
        this.currentStep = request.currentStepIndex || 0;
        this.config = this.globalWorkflow;
        this.startGuide(true);
      }
    });

    // 2. 초기 로드 시 활성 세션 또는 도메인 설정 확인 (최대 3회 재시도)
    let retries = 0;
    const checkSession = async () => {
      try {
        const globalSession = await chrome.storage.local.get(['active_workflow_session']);
        const session = globalSession['active_workflow_session'];

        if (session && session.workflow) {
          const currentStep = session.workflow.steps[session.currentStepIndex];
          if (this.urlMatchesPattern(window.location.href, currentStep.urlPattern)) {
            console.log("[ClearGuide] Active session found. Resuming step", session.currentStepIndex + 1);
            this.globalWorkflow = session.workflow;
            this.currentStep = session.currentStepIndex;
            this.config = this.globalWorkflow;
            this.startGuide(true);
            return true;
          }
        }
        return false;
      } catch (e) {
        console.error("[ClearGuide] Init Error:", e);
        return false;
      }
    };

    if (!(await checkSession()) && retries < 3) {
      const interval = setInterval(async () => {
        retries++;
        if (await checkSession() || retries >= 3) {
          clearInterval(interval);
        }
      }, 500);
    }

    // 도메인별 설정 (폴백)
    chrome.runtime.sendMessage({ action: "getConfig" }).then(response => {
      if (response && response.config && !this.config) {
        this.config = response.config;
      }
    }).catch(() => { });

    // 3. 현재 페이지용 가이드 검색 (Quick Start 전용)
    setTimeout(() => {
      if (!this.overlay && !this.isAdminMode) {
        this.checkAvailableWorkflows();
      }
    }, 1000); // 돔 안정화 대기
  }

  async checkAvailableWorkflows() {
    try {
      const response = await chrome.runtime.sendMessage({ action: "getWorkflows" });
      const workflows = response.workflows || [];
      const currentDomain = window.location.hostname;
      const matches = workflows.filter(w => w.domain === currentDomain);

      if (matches.length > 0) {
        this.createQuickStartUI(matches);
      }
    } catch (e) {
      console.error("[ClearGuide] Discovery Error:", e);
    }
  }

  createQuickStartUI(workflows) {
    this.initializeShadowDOM();
    if (this.shadowRoot.querySelector('#cv-quick-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'cv-quick-bar';
    bar.style.cssText = `
      position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(10px);
      border: 1px solid rgba(59, 130, 246, 0.5); border-radius: 30px;
      padding: 5px 15px; display: flex; align-items: center; gap: 10px;
      z-index: 2147483645; box-shadow: 0 5px 20px rgba(0,0,0,0.3);
      pointer-events: auto; font-family: sans-serif; transition: all 0.3s;
    `;

    let buttonsHtml = workflows.map(w => `
      <button class="cv-quick-play" data-id="${w.id}" style="
        background: #3b82f6; border: none; color: white; padding: 6px 14px;
        border-radius: 15px; font-size: 11px; font-weight: bold; cursor: pointer;
        white-space: nowrap; transition: all 0.2s;
      ">
        ▶ ${this.escapeHtml(w.name)}
      </button>
    `).join('');

    bar.innerHTML = `
      <img src="${chrome.runtime.getURL('public/icons/icon128.png')}" style="width: 16px; height: 16px; border-radius: 4px; margin-right: 5px;">
      <span style="font-size: 10px; color: #94a3b8; font-weight: bold; margin-right: 5px;">ClearGuide 가이드</span>
      <div style="display: flex; gap: 8px; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 10px;">
        ${buttonsHtml}
      </div>
      <button id="cv-quick-toggle" title="전체 스텝 보기" style="
        background: rgba(255,255,255,0.1); border: none; color: white; padding: 5px 10px;
        border-radius: 15px; font-size: 11px; cursor: pointer; margin-left: 5px;
      ">🔍 스텝 상세</button>
      <button id="cv-quick-close" style="
        background: transparent; border: none; color: #94a3b8; font-size: 16px;
        cursor: pointer; margin-left: 5px; padding: 0 5px; line-height: 1;
      ">×</button>
      
      <div id="cv-quick-steps-panel" style="
        display: none; position: absolute; top: 110%; left: 0; width: 100%;
        background: rgba(15, 23, 42, 0.95); border-radius: 12px;
        border: 1px solid rgba(59, 130, 246, 0.3); padding: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5); box-sizing: border-box;
      "></div>
    `;

    this.shadowRoot.appendChild(bar);

    // 이벤트 바인딩
    this.shadowRoot.querySelectorAll('.cv-quick-play').forEach(btn => {
      btn.addEventListener('click', () => {
        const wfId = btn.getAttribute('data-id');
        const workflow = workflows.find(w => w.id === wfId);
        if (workflow) {
          bar.remove();
          this.globalWorkflow = workflow;
          this.currentStep = 0;
          this.config = this.globalWorkflow;
          // 백그라운드 세션 등록
          chrome.runtime.sendMessage({ action: "startGlobalWorkflow", workflow });
          this.startGuide(true);
        }
      });
    });

    this.shadowRoot.querySelector('#cv-quick-close').addEventListener('click', () => {
      bar.style.opacity = '0';
      bar.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => bar.remove(), 300);
    });

    const toggleBtn = this.shadowRoot.querySelector('#cv-quick-toggle');
    const panel = this.shadowRoot.querySelector('#cv-quick-steps-panel');

    toggleBtn.addEventListener('click', () => {
      if (panel.style.display === 'none') {
        // 모든 매칭된 워크플로우의 상세 단계 노출
        panel.innerHTML = `
          <div style="font-size: 11px; color: #3b82f6; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">
             📋 가이드 상세 리스트 (${workflows.length})
          </div>
          <div style="max-height: 250px; overflow-y: auto; padding-right: 5px;">
             ${workflows.map((wf, idx) => `
               <div style="margin-bottom: 15px; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 8px;">
                 <div style="font-size: 11px; color: #facc15; font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
                   <span style="background: #3b82f6; color: white; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 9px;">${idx + 1}</span>
                   ${this.escapeHtml(wf.name)}
                 </div>
                 <div style="padding-left: 5px;">
                   ${wf.steps.map((s, i) => `
                     <div style="font-size: 10px; color: #e2e8f0; margin-bottom: 5px; display: flex; gap: 8px; align-items: flex-start;">
                       <span style="color: #94a3b8; font-weight: bold; min-width: 15px;">${i + 1}.</span>
                       <span style="line-height: 1.4;">${this.escapeHtml(s.message)}</span>
                     </div>
                   `).join('')}
                 </div>
               </div>
             `).join('')}
          </div>
        `;
        panel.style.display = 'block';
        toggleBtn.innerText = "🔼 접기";
      } else {
        panel.style.display = 'none';
        toggleBtn.innerText = "🔍 스텝 상세";
      }
    });
  }

  tick() {
    let active = false;
    if (this.isAdminMode && this.lastHoveredElement) {
      this.updatePickerHighlight(this.lastHoveredElement);
      active = true;
    }
    // overlay가 존재하면 가이드가 활성화된 상태이므로 trackingElement가 없어도 ticker 유지
    if (this.overlay) {
      if (this.trackingElement) {
        // 요소가 여전히 DOM에 있고 표시 중인지 확인
        const isVisible = !!(this.trackingElement.offsetWidth || this.trackingElement.offsetHeight || this.trackingElement.getClientRects().length);
        if (isVisible) {
          this.updateGuideHighlight(this.trackingElement);
        } else {
          // 요소가 사라졌거나 숨겨진 경우 UI 일시 중지 처리
          this.hideVisuals();
        }
      }
      active = true;
    }

    if (active) {
      this.tickerId = requestAnimationFrame(this.boundTick);
    } else {
      this.tickerId = null;
    }
  }

  startTicker() {
    if (!this.tickerId) this.tick();
  }

  stopTicker() {
    if (this.tickerId) {
      cancelAnimationFrame(this.tickerId);
      this.tickerId = null;
    }
  }

  makeDraggable(el, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;

      const newTop = el.offsetTop - pos2;
      const newLeft = el.offsetLeft - pos1;

      el.style.top = newTop + "px";
      el.style.left = newLeft + "px";
      el.style.right = "auto"; // 중첩 방지
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  urlMatchesPattern(url, pattern) {
    if (!pattern || pattern === '*') return true;
    // 두 URL 모두 호스트와 패스까지만 비교하도록 정규화
    const normalize = (u) => {
      try {
        const urlObj = new URL(u);
        return urlObj.origin + urlObj.pathname.replace(/\/$/, "");
      } catch (e) {
        // 유효하지 않은 URL 패턴일 경우, 원본 문자열을 반환하거나 에러 처리
        return u.split('?')[0].split('#')[0].replace(/\/$/, "");
      }
    };
    const cleanUrl = normalize(url);
    const cleanPattern = normalize(pattern);

    try {
      // 와일드카드 처리
      const regex = new RegExp("^" + cleanPattern.replace(/\*/g, '.*') + "$");
      return regex.test(cleanUrl);
    } catch (e) {
      return cleanUrl.includes(cleanPattern);
    }
  }

  escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  handleKeyDown(e) {
    // 가이드 실행 중일 때만 작동
    if (this.overlay) {
      if (e.key === 'Enter') {
        this.moveStep(1);
      } else if (e.key === 'Escape') {
        this.exitGuide();
      }
    }
  }

  toggleAdminMode(active) {
    this.isAdminMode = active;
    this.isNavMode = false;
    if (active) {
      this.createPickerUI();
      document.addEventListener('mouseover', this.boundHandleMouseOver);
      document.addEventListener('click', this.boundHandleElementClick, true);
      this.startTicker();
    } else {
      this.destroyPickerUI();
      document.removeEventListener('mouseover', this.boundHandleMouseOver);
      document.removeEventListener('click', this.boundHandleElementClick, true);
      this.stopTicker();
    }
  }

  destroyPickerUI() {
    this.shadowRoot?.querySelector('#cv-admin-panel')?.remove();
    this.pickerOverlay?.remove();
    this.pickerOverlay = null;
    this.lastHoveredElement = null;
    this.isAdminMode = false;
  }

  initializeShadowDOM() {
    if (this.shadowRoot) return;
    const host = document.createElement('div');
    host.id = 'clearview-root';
    // 호스트 레벨에서 최상단 고정 및 z-index 부여
    host.style.cssText = `
      position: fixed; top: 0; left: 0; width: 0; height: 0;
      z-index: 2147483647; pointer-events: none;
    `;
    document.body.appendChild(host);
    this.shadowRoot = host.attachShadow({ mode: 'closed' });
  }

  createPickerUI() {
    this.initializeShadowDOM();
    const panel = document.createElement('div');
    panel.id = 'cv-admin-panel';
    panel.style.cssText = `
      position: fixed; top: 20px; right: 20px; background: #0f172a; color: white;
      padding: 15px; border-radius: 12px; z-index: 2147483647;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5); font-family: sans-serif;
      width: 320px; border: 1px solid #3b82f6; pointer-events: auto;
    `;
    panel.innerHTML = `
      <div id="cv-drag-handle" style="font-weight: bold; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; cursor: move; padding: 10px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; user-select: none;">
         <span style="color: #60a5fa;">✥</span> ClearGuide 작성기 (v1.1.0)
      </div>
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <button id="cv-toggle-nav" style="flex: 1; background: #334155; border: 1px solid #475569; color: white; padding: 10px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500;">🚀 탐색 모드: OFF</button>
      </div>
      <div id="cv-active-step" style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 10px; margin-bottom: 12px; display: none; border: 1px solid rgba(255,255,255,0.1);">
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px; font-weight: bold;">🛠️ 스텝 속성 설정</div>
        
        <!-- 라벨 수정 필드 -->
        <div style="margin-bottom: 10px;">
          <div style="font-size: 10px; color: #60a5fa; margin-bottom: 4px;">단계 이름 (Label)</div>
          <input id="cv-step-label" type="text" style="width: 100%; background: #1e293b; border: 1px solid #334155; color: white; padding: 8px; border-radius: 6px; font-size: 12px; box-sizing: border-box;">
        </div>

        <!-- 안내 문구 필드 -->
        <div style="margin-bottom: 10px;">
          <div style="font-size: 10px; color: #60a5fa; margin-bottom: 4px;">상세 안내 (Message)</div>
          <textarea id="cv-step-message" placeholder="사용자에게 보여줄 안내 문구..." style="width: 100%; background: #1e293b; border: 1px solid #334155; color: white; padding: 8px; border-radius: 6px; font-size: 12px; box-sizing: border-box; resize: vertical; height: 60px; font-family: inherit;"></textarea>
        </div>

        <!-- 인터랙티브 액션 설정 -->
        <div style="background: rgba(59, 130, 246, 0.1); padding: 10px; border-radius: 8px; margin-bottom: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 8px;">
            <input id="cv-action-required" type="checkbox" style="width: 16px; height: 16px; accent-color: #3b82f6;">
            <span style="font-size: 12px; font-weight: bold; color: #e2e8f0;">수행 액션 기다리기</span>
          </label>
          <div id="cv-interaction-type-box" style="display: none; padding-left: 24px;">
            <div style="font-size: 10px; color: #94a3b8; margin-bottom: 4px;">감지할 액션 종류</div>
            <select id="cv-interaction-type" style="width: 100%; background: #1e293b; color: white; border: 1px solid #334155; padding: 5px; border-radius: 4px; font-size: 11px;">
              <option value="click">🖱️ 클릭 (Click)</option>
              <option value="input">⌨️ 입력 (Input)</option>
              <option value="mouseover">🎯 마우스 오버 (Hover)</option>
            </select>
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <button id="cv-add-step" style="flex: 2; background: #059669; border: none; color: white; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px;">✅ 스텝 적용</button>
          <button id="cv-add-text-step" title="텍스트 안내만 추가" style="flex: 1; background: #6366f1; border: none; color: white; padding: 10px; border-radius: 8px; cursor: pointer; font-size: 13px;">📝 텍스트</button>
        </div>
      </div>
      <div id="cv-picked-list" style="max-height: 200px; overflow-y: auto; margin-bottom: 15px; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);"></div>
      <div style="display: flex; gap: 8px;">
        <button id="cv-save" style="flex: 1; background: #3b82f6; border: none; color: white; padding: 12px; border-radius: 10px; cursor: pointer; font-weight: bold; font-size: 14px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">전체 시나리오 저장</button>
        <button id="cv-cancel" style="flex: 1; background: #334155; border: none; color: white; padding: 12px; border-radius: 10px; cursor: pointer; font-size: 14px;">취소</button>
      </div>
    `;
    this.shadowRoot.appendChild(panel);

    const navBtn = this.shadowRoot.querySelector('#cv-toggle-nav');
    navBtn.addEventListener('click', () => {
      this.isNavMode = !this.isNavMode;
      navBtn.innerText = this.isNavMode ? "📍 탐색 모드: ON" : "🚀 탐색 모드: OFF";
      navBtn.style.background = this.isNavMode ? "#059669" : "#334155";
      if (this.isNavMode) { this.pickerOverlay?.remove(); this.pickerOverlay = null; }
    });

    this.shadowRoot.querySelector('#cv-save').addEventListener('click', () => this.saveWorkflow());
    this.shadowRoot.querySelector('#cv-cancel').addEventListener('click', () => this.toggleAdminMode(false));
    this.shadowRoot.querySelector('#cv-add-step').addEventListener('click', () => this.commitStep());
    this.shadowRoot.querySelector('#cv-add-text-step').addEventListener('click', () => this.commitTextOnlyStep());

    // 상태 반응 필드 (액션 설정 보이기/숨기기)
    const actionToggle = this.shadowRoot.querySelector('#cv-action-required');
    const interactionBox = this.shadowRoot.querySelector('#cv-interaction-type-box');
    actionToggle.addEventListener('change', () => {
      interactionBox.style.display = actionToggle.checked ? 'block' : 'none';
    });

    this.makeDraggable(panel, this.shadowRoot.querySelector('#cv-drag-handle'));

    this.updatePickedListUI();
  }

  commitStep() {
    if (!this.pendingStep) return;
    const labelInput = this.shadowRoot.querySelector('#cv-step-label');
    const msgInput = this.shadowRoot.querySelector('#cv-step-message');
    const actionCheck = this.shadowRoot.querySelector('#cv-action-required');
    const typeSelect = this.shadowRoot.querySelector('#cv-interaction-type');

    const step = {
      ...this.pendingStep,
      label: labelInput.value.trim() || this.pendingStep.label,
      message: msgInput.value.trim() || `${labelInput.value.trim() || this.pendingStep.label} 단계를 수행해주세요.`,
      actionRequired: actionCheck.checked,
      interactionType: actionCheck.checked ? typeSelect.value : (this.pendingStep.trigger || 'none')
    };

    this.tempSteps.push(step);
    this.pendingStep = null;
    this.shadowRoot.querySelector('#cv-active-step').style.display = 'none';
    msgInput.value = '';
    labelInput.value = '';
    actionCheck.checked = false;
    this.shadowRoot.querySelector('#cv-interaction-type-box').style.display = 'none';
    this.updatePickedListUI();
  }

  commitTextOnlyStep() {
    const msgInput = this.shadowRoot.querySelector('#cv-step-message');
    const message = msgInput.value.trim();
    if (!message) {
      alert("안내 문구를 입력해주세요.");
      msgInput.focus();
      return;
    }
    const step = {
      selector: null,
      label: "📢 안내 메시지",
      urlPattern: window.location.href,
      trigger: 'none',
      message: message,
      actionRequired: false // 텍스트 전용은 명시적 false
    };
    this.tempSteps.push(step);
    msgInput.value = '';
    this.updatePickedListUI();
  }

  handleMouseOver(e) {
    if (!this.isAdminMode || this.isNavMode || (this.shadowRoot && this.shadowRoot.host.contains(e.target))) return;
    this.lastHoveredElement = e.target;
    this.updatePickerHighlight(e.target);
  }

  updatePickerHighlight(el) {
    if (this.isNavMode) return;
    if (!this.pickerOverlay) {
      this.pickerOverlay = document.createElement('div');
      // picker-highlight 역시 fixed로 처리
      this.pickerOverlay.style.cssText = `position: fixed; pointer-events: none; background: rgba(59, 130, 246, 0.2); border: 2px solid #3b82f6; z-index: 2147483646;`;
      document.body.appendChild(this.pickerOverlay);
    }
    const rect = el.getBoundingClientRect();
    this.pickerOverlay.style.top = `${rect.top}px`;
    this.pickerOverlay.style.left = `${rect.left}px`;
    this.pickerOverlay.style.width = `${rect.width}px`;
    this.pickerOverlay.style.height = `${rect.height}px`;
  }

  handleElementClick(e) {
    if (!this.isAdminMode || (this.shadowRoot && this.shadowRoot.host.contains(e.target))) return;
    if (this.isNavMode) return;
    e.preventDefault(); e.stopPropagation();
    const selector = this.getUniqueSelector(e.target);
    const label = e.target.innerText?.trim().substring(0, 25) || e.target.tagName;
    const urlPattern = window.location.href;

    this.pendingStep = { selector, label, urlPattern, trigger: 'mouseover' };

    const activePanel = this.shadowRoot.querySelector('#cv-active-step');
    activePanel.style.display = 'block';

    // 신규 필드 초기화
    this.shadowRoot.querySelector('#cv-step-label').value = label;
    this.shadowRoot.querySelector('#cv-step-message').value = '';
    this.shadowRoot.querySelector('#cv-action-required').checked = false;
    this.shadowRoot.querySelector('#cv-interaction-type-box').style.display = 'none';
    this.shadowRoot.querySelector('#cv-step-message').focus();
  }

  getUniqueSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    let path = []; let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase();
      if (current.id) { selector += `#${CSS.escape(current.id)}`; path.unshift(selector); break; }
      else {
        let sibling = current, nth = 1;
        while (sibling = sibling.previousElementSibling) { if (sibling.tagName.toLowerCase() == current.tagName.toLowerCase()) nth++; }
        if (nth != 1) selector += `:nth-of-type(${nth})`;
        path.unshift(selector); current = current.parentElement;
      }
      if (path.length >= 6) break;
    }
    return path.join(' > ');
  }

  addPickedElement(item) {
    this.tempSteps.push(item);
    this.updatePickedListUI();
  }

  updatePickedListUI() {
    const list = this.shadowRoot?.querySelector('#cv-picked-list');
    if (!list) return;
    list.innerHTML = this.tempSteps.map((s, i) => `
      <div class="cv-item" style="font-size: 11px; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; background: rgba(255,255,255,0.02); margin-bottom: 2px; border-radius: 4px;">
        <span style="color: #facc15; margin-right: 8px; font-weight: bold; width: 15px;">${i + 1}</span>
        <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #e2e8f0;">${this.escapeHtml(s.label)}</span>
      </div>
    `).join('');
  }

  async saveWorkflow() {
    if (this.tempSteps.length === 0) return;
    const name = prompt("워크플로우 이름을 입력하세요:", "새 시나리오");
    if (!name) return;

    const domain = window.location.hostname;
    const workflow = {
      id: `wf_${Date.now()}`,
      name: name,
      domain: domain,
      originUrl: window.location.origin,
      steps: this.tempSteps,
      createdAt: new Date().toISOString()
    };

    await chrome.runtime.sendMessage({ action: "saveGlobalWorkflow", workflow });
    alert("워크플로우 저장 완료!");
    this.toggleAdminMode(false);
  }

  startGuide(isResume = false) {
    if (!this.config) return;
    this.isPaused = false;
    this.createUI();
    this.startTicker();
  }

  createUI() {
    this.initializeShadowDOM();
    this.shadowRoot.querySelector('#cv-overlay')?.remove();
    this.overlay = document.createElement('div');
    this.overlay.id = 'cv-overlay';
    this.overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 2147483647;`;
    this.shadowRoot.appendChild(this.overlay);
    this.renderHighlight();
  }

  async ensureVisibility(selector, trigger) {
    const el = document.querySelector(selector);
    if (!el) return null;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(r => setTimeout(r, 600));
    if (trigger === 'mouseover') {
      const e1 = new MouseEvent('mouseover', { bubbles: true, cancelable: true });
      const e2 = new MouseEvent('mouseenter', { bubbles: true, cancelable: true });
      el.dispatchEvent(e1); el.dispatchEvent(e2);
    }
    return el;
  }

  renderHighlight() {
    if (this.isPaused) return;
    const step = this.config.steps[this.currentStep];

    // 텍스트 전용 스캔 (요소 없음)
    if (!step.selector) {
      this.trackingElement = null;
      this.renderTextOnlyUI(step);
      return;
    }

    this.ensureVisibility(step.selector, step.trigger).then(target => {
      if (!target) { this.renderMissingUI(step); return; }
      this.trackingElement = target;

      // 최상단 노출을 위한 내비게이션 바 z-index 강제 및 order 조정
      this.overlay.innerHTML = `
        <div id="cv-spotlight" style="
          position: fixed; pointer-events: none;
          border: 4px solid #3b82f6; border-radius: 8px;
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.7);
          transition: none; z-index: 2147483640; /* 스포트라이트 배경은 컨트롤보다 낮게 */
        "></div>
        <div id="cv-nav-bar" style="
          position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%);
          background: #0f172a; color: white; padding: 15px 25px; border-radius: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.6); pointer-events: auto;
          display: flex; align-items: center; gap: 20px; font-family: sans-serif;
          border: 1px solid rgba(59, 130, 246, 0.3); backdrop-filter: blur(15px);
          z-index: 2147483647; /* 컨트롤러를 명시적 최상단으로 */
        ">
          <img src="${chrome.runtime.getURL('public/icons/icon128.png')}" style="width: 36px; height: 36px; border-radius: 8px;">
          <div style="flex: 1; min-width: 200px;">
            <div style="font-size: 10px; color: #3b82f6; font-weight: bold; margin-bottom: 2px;">CLEARGUIDE ENGINE</div>
            <div style="font-size: 14px; font-weight: 500;">${this.escapeHtml(step.message)}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 15px;">
             <button id="cv-prev" style="background: transparent; border: 1px solid #334155; color: white; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-size: 12px;">이전</button>
             <button id="cv-next" style="background: #3b82f6; border: none; color: white; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-weight: bold;">다음</button>
             <button id="cv-act" title="수동 트리거" style="background: #facc15; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer;">⚡</button>
             <button id="cv-stop" style="background: #ef4444; border: none; color: white; width: 32px; height: 32px; border-radius: 8px; cursor: pointer;">✕</button>
          </div>
        </div>
        <div id="cv-tooltip" style="
          position: fixed; background: #3b82f6; color: white; padding: 10px 15px;
          border-radius: 8px; font-size: 13px; font-weight: 500; z-index: 2147483647;
          pointer-events: none; box-shadow: 0 5px 15px rgba(0,0,0,0.3);
          max-width: 250px; line-height: 1.4; transition: opacity 0.3s;
        ">
          ${this.escapeHtml(step.message)}
          <div style="
            position: absolute; width: 10px; height: 10px; background: #3b82f6;
            transform: rotate(45deg); bottom: -5px; left: 50%; margin-left: -5px;
          "></div>
        </div>
      `;
      this.shadowRoot.querySelector('#cv-next').addEventListener('click', () => this.moveStep(1));
      this.shadowRoot.querySelector('#cv-prev').addEventListener('click', () => this.moveStep(-1));
      this.shadowRoot.querySelector('#cv-stop').addEventListener('click', () => this.exitGuide());
      this.shadowRoot.querySelector('#cv-act').addEventListener('click', () => target.click());
    });
  }

  renderTextOnlyUI(step) {
    this.overlay.innerHTML = `
        <div id="cv-spotlight" style="display: none;"></div>
        <div id="cv-nav-bar" style="
          position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%);
          background: #1e1b4b; color: white; padding: 15px 25px; border-radius: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.6); pointer-events: auto;
          display: flex; align-items: center; gap: 20px; font-family: sans-serif;
          border: 2px solid #6366f1; backdrop-filter: blur(15px);
          z-index: 2147483647;
        ">
          <img src="${chrome.runtime.getURL('public/icons/icon128.png')}" style="width: 36px; height: 36px; border-radius: 8px;">
          <div style="flex: 1; min-width: 250px;">
            <div style="font-size: 10px; color: #818cf8; font-weight: bold; margin-bottom: 2px;">📢 안내 (텍스트 모드)</div>
            <div style="font-size: 15px; font-weight: 500; line-height: 1.5;">${this.escapeHtml(step.message)}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 15px;">
             <button id="cv-prev" style="background: transparent; border: 1px solid #475569; color: white; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-size: 12px;">이전</button>
             <button id="cv-next" style="background: #6366f1; border: none; color: white; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-weight: bold;">확인 / 다음</button>
             <button id="cv-stop" style="background: #ef4444; border: none; color: white; width: 32px; height: 32px; border-radius: 8px; cursor: pointer;">✕</button>
          </div>
        </div>
        <div id="cv-tooltip" style="
          position: fixed; top: 150px; left: 50%; transform: translateX(-50%);
          background: #1e1b4b; color: white; padding: 25px; border-radius: 16px;
          font-size: 16px; font-weight: 500; z-index: 2147483647; text-align: center;
          pointer-events: none; box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          width: 80%; max-width: 450px; border: 1px solid rgba(99, 102, 241, 0.3);
        ">
          <div style="font-size: 24px; margin-bottom: 15px;">📝</div>
          ${this.escapeHtml(step.message)}
        </div>
        <div id="cv-text-dimmer" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); z-index: 2147483646;"></div>
    `;
    this.shadowRoot.querySelector('#cv-next').addEventListener('click', () => this.moveStep(1));
    this.shadowRoot.querySelector('#cv-prev').addEventListener('click', () => this.moveStep(-1));
    this.shadowRoot.querySelector('#cv-stop').addEventListener('click', () => this.exitGuide());
  }

  updateGuideHighlight(el) {
    const spotlight = this.shadowRoot.querySelector('#cv-spotlight');
    const tooltip = this.shadowRoot.querySelector('#cv-tooltip');
    if (!spotlight) return;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return; // 유효하지 않은 크기면 업데이트 보류

    spotlight.style.display = 'block';
    spotlight.style.top = `${rect.top - 5}px`;
    spotlight.style.left = `${rect.left - 5}px`;
    spotlight.style.width = `${rect.width + 10}px`;
    spotlight.style.height = `${rect.height + 10}px`;

    if (tooltip) {
      tooltip.style.display = 'block';
      tooltip.style.opacity = '1';
      const toolRect = tooltip.getBoundingClientRect();
      const top = rect.top - toolRect.height - 15;
      const left = rect.left + (rect.width / 2) - (toolRect.width / 2);

      tooltip.style.top = `${Math.max(10, top)}px`;
      tooltip.style.left = `${Math.max(10, Math.min(window.innerWidth - toolRect.width - 10, left))}px`;
    }
  }

  hideVisuals() {
    const spotlight = this.shadowRoot?.querySelector('#cv-spotlight');
    const tooltip = this.shadowRoot?.querySelector('#cv-tooltip');
    if (spotlight) spotlight.style.display = 'none';
    if (tooltip) tooltip.style.opacity = '0';
  }

  renderMissingUI(step) {
    this.trackingElement = null;
    this.overlay.innerHTML = `
      <div style="position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); background: #1e293b; color: white; padding: 15px 25px; border-radius: 20px; border: 1px solid #ef4444; pointer-events: auto; display: flex; align-items: center; gap: 15px; z-index: 2147483647;">
        <span style="color: #ef4444;">⚠ 찾을 수 없음</span> '${this.escapeHtml(step.label)}'
        <button id="cv-retry" style="background: #3b82f6; border: none; color: white; padding: 5px 10px; border-radius: 6px; cursor: pointer;">다시 찾기</button>
        <button id="cv-stop-m" style="background: #ef4444; border: none; color: white; padding: 5px 10px; border-radius: 6px; cursor: pointer;">종료</button>
      </div>
    `;
    this.shadowRoot.querySelector('#cv-retry').addEventListener('click', () => this.renderHighlight());
    this.shadowRoot.querySelector('#cv-stop-m').addEventListener('click', () => this.exitGuide());
  }

  exitGuide() {
    chrome.runtime.sendMessage({ action: "clearWorkflow" });
    this.overlay?.remove();
    this.overlay = null;
    this.trackingElement = null;
    this.stopTicker();
  }

  moveStep(delta) {
    const nextIdx = this.currentStep + delta;
    if (nextIdx >= 0 && nextIdx < this.config.steps.length) {
      this.currentStep = nextIdx;

      // 상태 동기화 (비동기 완료 대기)
      chrome.runtime.sendMessage({ action: "updateWorkflowStep", stepIndex: this.currentStep }, () => {
        const nextStep = this.config.steps[this.currentStep];
        if (!this.urlMatchesPattern(window.location.href, nextStep.urlPattern)) {
          alert("다음 단계 수행을 위해 페이지를 이동합니다.");
          window.location.href = nextStep.urlPattern;
        } else {
          this.renderHighlight();
        }
      });
    } else if (nextIdx >= this.config.steps.length) {
      alert("워크플로우 완료!");
      this.exitGuide();
    }
  }
}

new ClearViewEngine();
