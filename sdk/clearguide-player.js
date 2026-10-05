/**
 * ClearGuide Player SDK (v1.1.0)
 * 독립형 가이드 실행 엔진 - 익스텐션 없이 구동 가능
 * v1.1.0: 웹 취약계층용 대시보드 및 인터랙티브 액션 기능 추가
 */

class ClearGuidePlayer {
    static VERSION = "1.3.0";
    constructor() {
        this.workflow = null;
        this.currentStep = 0;
        this.shadowRoot = null;
        this.overlay = null;
        this.dashboard = null;
        this.toggleControl = null;
        this.trackingElement = null;
        this.tickerId = null;
        this.isActionResolved = false;
        this.isGuideHidden = true; // v1.2.0: 최초 진입 시 숨김 상태 (토글만 노출)
        this.config = {
            baseUrl: '', // 아이콘 등 리소스 경로
            accentColor: '#3b82f6',
            showDashboard: false // v1.1.0 기본값
        };

        this.boundTick = this.tick.bind(this);
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    }

    /**
     * SDK 초기 설정
     */
    init(options = {}) {
        this.config = { ...this.config, ...options };
        console.log("[ClearGuide Player] Initialized");

        document.addEventListener('keydown', this.boundHandleKeyDown);
        this.checkSession();
    }

    /**
     * Guide Template 로드.
     * 객체를 직접 전달하거나 같은 출처/CORS가 허용된 JSON URL을 전달할 수 있습니다.
     */
    async load(source) {
        const workflow = typeof source === 'string'
            ? await this.fetchWorkflow(source)
            : source;

        this.validateWorkflow(workflow);
        return workflow;
    }

    async fetchWorkflow(url) {
        const response = await fetch(url, { credentials: 'same-origin' });
        if (!response.ok) {
            throw new Error(`ClearGuide template load failed: HTTP ${response.status}`);
        }
        return response.json();
    }

    validateWorkflow(workflow) {
        if (!workflow || typeof workflow !== 'object') {
            throw new Error('ClearGuide template must be an object.');
        }
        if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
            throw new Error('ClearGuide template requires at least one step.');
        }
        for (const step of workflow.steps) {
            if (!step || !step.message || !step.urlPattern) {
                throw new Error('Each ClearGuide step requires message and urlPattern.');
            }
        }
    }

    /**
     * 워크플로우 실행
     */
    play(workflow) {
        this.validateWorkflow(workflow);
        this.workflow = workflow;
        this.currentStep = 0;
        this.startGuide();
    }

    /**
     * JSON URL을 로드한 뒤 즉시 실행합니다.
     */
    async playFromUrl(url) {
        const workflow = await this.load(url);
        this.play(workflow);
    }

    /**
     * 세션 복구 로직 (페이지 이동 및 새로고침 대응)
     */
    checkSession() {
        const sessionData = sessionStorage.getItem('cg_active_session');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                this.workflow = session.workflow;
                this.currentStep = session.currentStepIndex;

                const step = this.workflow.steps[this.currentStep];
                if (this.urlMatchesPattern(window.location.href, step.urlPattern)) {
                    console.log("[ClearGuide] Resuming session at step", this.currentStep + 1);
                    this.startGuide(true);
                }
            } catch (e) {
                sessionStorage.removeItem('cg_active_session');
            }
        }
    }

    saveSession() {
        sessionStorage.setItem('cg_active_session', JSON.stringify({
            workflow: this.workflow,
            currentStepIndex: this.currentStep,
            isGuideHidden: this.isGuideHidden
        }));
    }

    clearSession() {
        sessionStorage.removeItem('cg_active_session');
    }

    startGuide(isResume = false) {
        this.initializeShadowDOM();

        // 세션에서 가시성 상태 복구
        const sessionData = sessionStorage.getItem('cg_active_session');
        if (sessionData) {
            try {
                this.isGuideHidden = JSON.parse(sessionData).isGuideHidden || false;
            } catch (e) { }
        }

        this.renderHighlight();
        this.renderToggleControl();
        if (this.config.showDashboard) this.renderDashboard();

        // 초기 가시성 설정 적용
        this.applyVisibility();

        this.startTicker();
        this.saveSession();
    }

    initializeShadowDOM() {
        if (this.shadowRoot) return;
        const host = document.createElement('div');
        host.id = 'clearguide-player-root';
        host.style.cssText = `position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none;`;
        document.body.appendChild(host);
        this.shadowRoot = host.attachShadow({ mode: 'closed' });
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

    tick() {
        if (this.overlay && this.trackingElement) {
            const isVisible = !!(this.trackingElement.offsetWidth || this.trackingElement.offsetHeight || this.trackingElement.getClientRects().length);
            if (isVisible) {
                this.updateGuideHighlight(this.trackingElement);
            } else {
                this.hideVisuals();
            }
        }
        this.tickerId = requestAnimationFrame(this.boundTick);
    }

    async ensureVisibility(selector, trigger) {
        const el = document.querySelector(selector);
        if (!el) return null;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(r => setTimeout(r, 600));
        if (trigger === 'mouseover') {
            el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        }
        return el;
    }

    renderHighlight() {
        const step = this.workflow.steps[this.currentStep];
        if (!this.overlay) {
            this.overlay = document.createElement('div');
            this.overlay.id = 'cg-overlay';
            this.overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 2147483647;`;
            this.shadowRoot.appendChild(this.overlay);
        }

        if (!step.selector) {
            this.renderTextOnlyUI(step);
            return;
        }

        this.ensureVisibility(step.selector, step.trigger).then(target => {
            if (!target) { this.renderMissingUI(step); return; }
            this.trackingElement = target;
            this.isActionResolved = !step.actionRequired;
            this.overlay.innerHTML = this.getGuideTemplate(step);
            this.bindEvents();
            if (step.actionRequired) this.bindActionListener(step);
        });
    }

    renderTextOnlyUI(step) {
        this.isActionResolved = true; // 텍스트 전용 단계는 즉시 액션 완료 처리
        this.overlay.innerHTML = `
            <div id="cv-nav-bar" style="position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); background: #1e1b4b; color: white; padding: 20px 30px; border-radius: 28px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); pointer-events: auto; display: flex; align-items: center; gap: 20px; font-family: sans-serif; border: 2px solid #6366f1; backdrop-filter: blur(15px); z-index: 2147483647;">
              <div style="flex: 1; min-width: 300px;">
                <div style="font-size: 13px; color: #818cf8; font-weight: bold; margin-bottom: 4px;">📢 안내 가이드</div>
                <div style="font-size: 20px; font-weight: 500; line-height: 1.5;">${this.escapeHtml(step.message)}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 20px;">
                 <button id="cv-prev" style="background: transparent; border: 1px solid #475569; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 16px; display: ${this.currentStep === 0 ? 'none' : 'block'};">이전</button>
                 <button id="cv-next" style="background: #6366f1; border: none; color: white; padding: 10px 22px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px;">확인 / 다음</button>
                 <button id="cv-stop" style="background: #ef4444; border: none; color: white; width: 40px; height: 40px; border-radius: 8px; cursor: pointer; font-size: 20px;">✕</button>
              </div>
            </div>
            <div id="cv-text-dimmer" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); z-index: 2147483646;"></div>
        `;
        this.bindEvents();
    }

    renderMissingUI(step) {
        this.trackingElement = null;
        this.overlay.innerHTML = `
          <div style="position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); background: #1e293b; color: white; padding: 20px 30px; border-radius: 24px; border: 1px solid #ef4444; pointer-events: auto; display: flex; align-items: center; gap: 15px; z-index: 2147483647; font-family: sans-serif; font-size: 18px;">
            <span style="color: #ef4444; font-weight: bold; font-size: 16px;">⚠️ 찾을 수 없음</span> '${this.escapeHtml(step.label)}'
            <button id="cv-retry" style="background: #3b82f6; border: none; color: white; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-size: 16px;">다시 찾기</button>
            <button id="cv-stop-m" style="background: #ef4444; border: none; color: white; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-size: 16px;">종료</button>
          </div>
        `;
        this.shadowRoot.querySelector('#cv-retry').addEventListener('click', () => this.renderHighlight());
        this.shadowRoot.querySelector('#cv-stop-m').addEventListener('click', () => this.exitGuide());
    }

    getGuideTemplate(step) {
        return `
            <div id="cv-spotlight" style="position: fixed; pointer-events: none; border: 4px solid ${this.config.accentColor}; border-radius: 8px; box-shadow: 0 0 30px rgba(59, 130, 246, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.7); z-index: 2147483640;"></div>
            <div id="cv-nav-bar" style="position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); background: #0f172a; color: white; padding: 20px 30px; border-radius: 28px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); pointer-events: auto; display: flex; align-items: center; gap: 20px; font-family: sans-serif; border: 1px solid rgba(59, 130, 246, 0.3); backdrop-filter: blur(15px); z-index: 2147483647;">
              <div style="flex: 1; min-width: 250px;">
                <div style="font-size: 13px; color: ${this.config.accentColor}; font-weight: bold; margin-bottom: 4px;">🎯 핵심 액션 안내</div>
                <div style="font-size: 18px; font-weight: 500; line-height: 1.4;">${this.escapeHtml(step.label || '지정된 영역을 확인해 주세요.')}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 20px;">
                  <button id="cv-prev" style="background: transparent; border: 1px solid #334155; color: white; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-size: 16px; display: ${this.currentStep === 0 ? 'none' : 'block'};">이전</button>
                  <button id="cv-next" style="background: ${this.config.accentColor}; border: none; color: white; padding: 10px 22px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 18px; ${this.isActionResolved ? '' : 'opacity: 0.5; cursor: not-allowed;'}" ${this.isActionResolved ? '' : 'disabled'}>${this.isActionResolved ? '확인 / 다음' : '액션 대기중...'}</button>
                  <button id="cv-stop" style="background: #ef4444; border: none; color: white; width: 40px; height: 40px; border-radius: 8px; cursor: pointer; font-size: 20px;">✕</button>
              </div>
            </div>
            <div id="cv-tooltip" style="position: fixed; background: ${this.config.accentColor}; color: white; padding: 15px 20px; border-radius: 12px; font-size: 17px; font-weight: 500; z-index: 2147483647; pointer-events: none; box-shadow: 0 5px 15px rgba(0,0,0,0.3); max-width: 300px; line-height: 1.5; transition: opacity 0.3s;">
              ${this.escapeHtml(step.message)}
              <div style="position: absolute; width: 12px; height: 12px; background: ${this.config.accentColor}; transform: rotate(45deg); bottom: -6px; left: 50%; margin-left: -6px;"></div>
            </div>
        `;
    }

    bindEvents() {
        this.shadowRoot.querySelector('#cv-next')?.addEventListener('click', () => this.moveStep(1));
        this.shadowRoot.querySelector('#cv-prev')?.addEventListener('click', () => this.moveStep(-1));
        this.shadowRoot.querySelector('#cv-stop')?.addEventListener('click', () => this.exitGuide());
    }

    updateGuideHighlight(el) {
        const spotlight = this.shadowRoot.querySelector('#cv-spotlight');
        const tooltip = this.shadowRoot.querySelector('#cv-tooltip');
        if (!spotlight) return;

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

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

    moveStep(delta) {
        // 액션이 반드시 필요한 단계인데 완료되지 않았다면 다음으로 이동 불가
        if (delta > 0 && !this.isActionResolved) return;

        this.cleanupActionListener(); // 신규 추가: 이전 액션 리스너 제거 Audit
        const nextIdx = this.currentStep + delta;
        if (nextIdx >= 0 && nextIdx < this.workflow.steps.length) {
            this.currentStep = nextIdx;
            this.saveSession();

            const nextStep = this.workflow.steps[this.currentStep];
            if (!this.urlMatchesPattern(window.location.href, nextStep.urlPattern)) {
                alert("다음 단계 수행을 위해 페이지를 이동합니다.");
                window.location.href = nextStep.urlPattern;
            } else {
                this.renderHighlight();
                if (this.config.showDashboard) this.renderDashboard();
            }
        } else if (nextIdx >= this.workflow.steps.length) {
            alert("워크플로우를 모두 완료했습니다!");
            this.exitGuide();
        }
    }

    exitGuide() {
        this.cleanupActionListener(); // 신규 추가: 리소스 해제 Audit
        this.clearSession();
        this.overlay?.remove();
        this.dashboard?.remove();
        this.toggleControl?.remove();
        this.overlay = null;
        this.dashboard = null;
        this.toggleControl = null;
        this.trackingElement = null;
        this.stopTicker();
    }

    cleanupActionListener() {
        if (this.actionListener && this.trackingElement) {
            this.trackingElement.removeEventListener(this.actionListener.type, this.actionListener.handler);
            this.actionListener = null;
        }
    }

    handleKeyDown(e) {
        if (this.overlay) {
            if (e.key === 'Enter') this.moveStep(1);
            if (e.key === 'Escape') this.exitGuide();
        }
    }

    /**
     * 상단 퀵스타트 바 표시 (익스텐션과 동일한 UI)
     */
    showQuickBar(workflows) {
        if (!Array.isArray(workflows)) workflows = [workflows];
        this.initializeShadowDOM();
        this.renderToggleControl(); // v1.2.1: 퀵바 노출 시에도 마스터 토글 먼저 렌더링
        if (this.shadowRoot.querySelector('#cv-quick-bar')) return;

        const bar = document.createElement('div');
        bar.id = 'cv-quick-bar';
        bar.style.cssText = `
            position: fixed; top: 15px; left: 50%; transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px);
            border: 1px solid rgba(59, 130, 246, 0.6); border-radius: 40px;
            padding: 8px 25px; display: flex; align-items: center; gap: 15px;
            z-index: 2147483645; box-shadow: 0 10px 40px rgba(0,0,0,0.4);
            pointer-events: auto; font-family: sans-serif; transition: all 0.3s;
            display: ${this.isGuideHidden ? 'none' : 'flex'};
        `;

        const buttonsHtml = workflows.map(w => `
            <button class="cv-quick-play" data-id="${w.id}" style="
                background: ${this.config.accentColor}; border: none; color: white; padding: 10px 22px;
                border-radius: 20px; font-size: 16px; font-weight: bold; cursor: pointer;
                white-space: nowrap; transition: all 0.2s;
            "> ▶ ${this.escapeHtml(w.name)} </button>
        `).join('');

        bar.innerHTML = `
            <span style="font-size: 14px; color: #94a3b8; font-weight: bold; margin-right: 5px;">ClearGuide 가이드</span>
            <div style="display: flex; gap: 12px; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 15px;">
                ${buttonsHtml}
                <button id="cv-quick-toggle" title="전체 스텝 보기" style="
                    background: rgba(255,255,255,0.1); border: none; color: white; padding: 8px 18px;
                    border-radius: 20px; font-size: 14px; cursor: pointer;
                ">🔍 스텝 상세</button>
                <button id="cv-quick-close" style="
                    background: transparent; border: none; color: #94a3b8; font-size: 24px;
                    cursor: pointer; margin-left: 5px; padding: 0 10px; line-height: 1;
                ">×</button>
            </div>
            <div id="cv-quick-steps-panel" style="
                display: none; position: absolute; top: 110%; left: 0; width: 100%;
                background: rgba(15, 23, 42, 0.98); border-radius: 20px;
                border: 1px solid rgba(59, 130, 246, 0.4); padding: 20px;
                box-shadow: 0 20px 50px rgba(0,0,0,0.6); box-sizing: border-box;
                max-height: 400px; overflow-y: auto;
            "></div>
        `;

        this.shadowRoot.appendChild(bar);

        // 이벤트 바인딩
        bar.querySelectorAll('.cv-quick-play').forEach(btn => {
            btn.addEventListener('click', () => {
                const wfId = btn.getAttribute('data-id');
                const workflow = workflows.find(w => w.id === wfId);
                if (workflow) {
                    bar.remove();
                    this.play(workflow);
                }
            });
        });

        bar.querySelector('#cv-quick-close').addEventListener('click', () => {
            bar.style.opacity = '0';
            bar.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => bar.remove(), 300);
        });

        const toggleBtn = bar.querySelector('#cv-quick-toggle');
        const panel = bar.querySelector('#cv-quick-steps-panel');

        toggleBtn.addEventListener('click', () => {
            if (panel.style.display === 'none') {
                panel.style.display = 'block';
                panel.innerHTML = `
                    <div style="font-size: 16px; color: #3b82f6; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                       📋 가이드 상세 리스트
                    </div>
                    ${workflows.map(wf => `
                        <div style="margin-bottom: 20px;">
                            <div style="font-size: 16px; color: #facc15; font-weight: bold; margin-bottom: 10px;">${this.escapeHtml(wf.name)}</div>
                            ${wf.steps.map((s, idx) => `
                                <div style="font-size: 15px; color: #e2e8f0; margin-bottom: 8px; display: flex; gap: 10px;">
                                    <span style="color: #94a3b8; font-weight: bold;">${idx + 1}.</span>
                                    <span>${this.escapeHtml(s.message)}</span>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                `;
            } else {
                panel.style.display = 'none';
            }
        });
    }

    /**
     * v1.1.0: 인터랙티브 액션 리스너 바인딩
     */
    bindActionListener(step) {
        if (!this.trackingElement) return;
        const type = step.interactionType || 'click';
        console.log(`[ClearGuide] Waiting for ${type} on`, this.trackingElement);

        // 이전 리스너가 있다면 제거 (메모리 누수 방지 Audit)
        if (this.actionListener) {
            this.trackingElement.removeEventListener(this.actionListener.type, this.actionListener.handler);
        }

        const handler = (e) => {
            console.log(`[ClearGuide] Interaction ${type} detected on`, e.target);
            this.isActionResolved = true;
            this.trackingElement.removeEventListener(type, handler);
            this.actionListener = null;

            // v1.2.3: Auto Advance (페이지 이동이 발생하는 터미널 액션 대응)
            if (step.autoAdvance) {
                console.log("[ClearGuide] Auto-advancing step due to terminal action");
                // 즉시 다음 단계로 세션 업데이트 (페이지 이동 전 저장 필수)
                this.currentStep++;
                this.saveSession();
                // UI 반영 없이 바로 리턴 (페이지가 곧 이동되므로)
                return;
            }

            // UI 업데이트: 다음 버튼 활성화 및 하이라이트 색상 변경 피드백
            const nextBtn = this.shadowRoot.querySelector('#cv-next');
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.style.opacity = '1';
                nextBtn.style.cursor = 'pointer';
                nextBtn.innerText = '확인 (완료됨) / 다음';
            }
            const spotlight = this.shadowRoot.querySelector('#cv-spotlight');
            if (spotlight) {
                spotlight.style.borderColor = '#10b981'; // Success Green
                spotlight.style.boxShadow = '0 0 30px rgba(16, 185, 129, 0.6), 0 0 0 9999px rgba(0, 0, 0, 0.7)';
            }
        };

        this.actionListener = { type, handler };
        this.trackingElement.addEventListener(type, handler);
    }

    /**
     * v1.1.0: 전체 워크플로우 대시보드 렌더링 (웹 취약계층용 나침반)
     */
    renderDashboard() {
        if (!this.shadowRoot) return;
        if (this.dashboard) this.dashboard.remove();

        this.dashboard = document.createElement('div');
        this.dashboard.id = 'cv-dashboard';
        this.dashboard.style.cssText = `
            position: fixed; bottom: 100px; right: 20px; width: 280px;
            background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(10px);
            border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 16px;
            padding: 15px; color: white; font-family: sans-serif;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 2147483649;
            pointer-events: auto; max-height: 300px; overflow-y: auto;
            transition: all 0.3s ease; display: ${this.isGuideHidden ? 'none' : 'block'};
        `;

        const stepsHtml = this.workflow.steps.map((s, idx) => {
            const isCurrent = idx === this.currentStep;
            const isPast = idx < this.currentStep;
            return `
                <div style="display: flex; gap: 10px; margin-bottom: 12px; align-items: flex-start; opacity: ${isPast ? '0.5' : '1'}">
                    <div style="
                        width: 24px; height: 24px; border-radius: 50%; 
                        background: ${isCurrent ? this.config.accentColor : (isPast ? '#10b981' : '#334155')};
                        display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0;
                    ">${isPast ? '✓' : idx + 1}</div>
                    <div style="font-size: 14px; color: ${isCurrent ? 'white' : '#94a3b8'}; font-weight: ${isCurrent ? 'bold' : 'normal'}">
                        ${this.escapeHtml(s.label || `단계 ${idx + 1}`)}
                        ${isCurrent ? '<div style="font-size:11px; color:#60a5fa; margin-top:2px;">현재 진행 중...</div>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        this.dashboard.innerHTML = `
            <div style="font-size: 12px; font-weight: bold; color: #60a5fa; margin-bottom: 15px; display: flex; justify-content: space-between;">
                <span>🧭 진행 대시보드</span>
                <span>${this.currentStep + 1} / ${this.workflow.steps.length}</span>
            </div>
            ${stepsHtml}
        `;
        this.shadowRoot.appendChild(this.dashboard);
    }

    /**
     * v1.1.0: 사용자가 가이드를 켜고 끌 수 있는 토글 컨트롤
     */
    renderToggleControl() {
        if (!this.shadowRoot) return;
        if (this.toggleControl) this.toggleControl.remove();

        this.toggleControl = document.createElement('div');
        this.toggleControl.id = 'cv-toggle-control';
        this.toggleControl.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: ${this.config.accentColor}; color: white;
            padding: 10px 20px; border-radius: 30px; cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 2147483649;
            font-family: sans-serif; font-size: 14px; font-weight: bold;
            pointer-events: auto; display: flex; align-items: center; gap: 8px;
            transition: all 0.3s ease;
        `;
        this.toggleControl.innerHTML = `
            <span>${this.isGuideHidden ? '💡 도움말 켜기' : '🙈 도움말 숨기기'}</span>
        `;
        this.toggleControl.onclick = () => this.toggleGuideVisibility();
        this.shadowRoot.appendChild(this.toggleControl);
    }

    toggleGuideVisibility() {
        this.isGuideHidden = !this.isGuideHidden;
        this.saveSession();
        this.applyVisibility();
        this.renderToggleControl();
        console.log(`[ClearGuide] Guide visibility: ${this.isGuideHidden ? 'Hidden' : 'Visible'}`);
    }

    applyVisibility() {
        const display = this.isGuideHidden ? 'none' : 'block';
        if (this.overlay) this.overlay.style.display = display;
        if (this.dashboard) this.dashboard.style.display = display;

        const quickBar = this.shadowRoot.querySelector('#cv-quick-bar');
        if (quickBar) quickBar.style.display = this.isGuideHidden ? 'none' : 'flex';
    }

    urlMatchesPattern(url, pattern) {
        if (!pattern || pattern === '*') return true;
        const normalize = (u) => {
            try {
                const uObj = new URL(u);
                return uObj.origin + uObj.pathname.replace(/\/$/, "");
            } catch (e) {
                return u.split('?')[0].split('#')[0].replace(/\/$/, "");
            }
        };
        const cleanUrl = normalize(url);
        const cleanPattern = normalize(pattern);
        try {
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
}

window.ClearGuide = new ClearGuidePlayer();
