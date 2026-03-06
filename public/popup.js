/**
 * ClearGuide AI - Popup Logic
 */

const elements = {
    currentList: document.getElementById('current-list'),
    otherList: document.getElementById('other-list'),
    startPickupBtn: document.getElementById('start-pickup'),
    importBtn: document.getElementById('import-btn'),
    importFile: document.getElementById('import-file'),
    exportAllBtn: document.getElementById('export-all'),
    clearAllBtn: document.getElementById('clear-all'),

    // Preview
    previewPanel: document.getElementById('preview-panel'),
    previewTitle: document.getElementById('preview-title'),
    previewMeta: document.getElementById('preview-meta'),
    previewList: document.getElementById('preview-list'),
    previewPlay: document.getElementById('preview-play'),
    closePreview: document.getElementById('close-preview')
};

let currentTab = null;
let allWorkflows = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 현재 탭 정보 가져오기
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    // 이벤트 바인딩
    bindEvents();

    // 워크플로우 로드
    await loadWorkflows();
});

function bindEvents() {
    elements.startPickupBtn.addEventListener('click', () => {
        chrome.tabs.sendMessage(currentTab.id, { action: "startPicker" });
        window.close();
    });

    elements.importBtn.addEventListener('click', () => elements.importFile.click());
    elements.importFile.addEventListener('change', handleImport);
    elements.exportAllBtn.addEventListener('click', exportAll);
    elements.clearAllBtn.addEventListener('click', clearAll);

    elements.closePreview.addEventListener('click', () => {
        elements.previewPanel.style.display = 'none';
    });

    elements.previewPlay.addEventListener('click', () => {
        const workflowId = elements.previewPlay.dataset.id;
        const workflow = allWorkflows.find(w => w.id === workflowId);
        if (workflow) playWorkflow(workflow);
    });
}

async function loadWorkflows() {
    const response = await chrome.runtime.sendMessage({ action: "getWorkflows" });
    allWorkflows = response.workflows || [];
    renderWorkflows();
}

function renderWorkflows() {
    const domain = new URL(currentTab.url).hostname;

    const pageMatch = allWorkflows.filter(w => w.domain === domain);
    const others = allWorkflows.filter(w => w.domain !== domain);

    // 현재 페이지 렌더링
    if (pageMatch.length > 0) {
        elements.currentList.innerHTML = '';
        pageMatch.forEach(w => elements.currentList.appendChild(createWorkflowItem(w, true)));
    } else {
        elements.currentList.innerHTML = `<div class="empty-state">현재 페이지를 위한 가이드가 없습니다.</div>`;
    }

    // 기타 페이지 렌더링
    if (others.length > 0) {
        elements.otherList.innerHTML = '';
        others.forEach(w => elements.otherList.appendChild(createWorkflowItem(w, false)));
    } else {
        elements.otherList.innerHTML = `<div class="empty-state">보관함이 비어있습니다.</div>`;
    }
}

function createWorkflowItem(workflow, isContextual) {
    const item = document.createElement('div');
    item.className = 'workflow-item';

    const stepCount = workflow.steps?.length || 0;

    item.innerHTML = `
    <div class="wf-header">
      <div class="wf-name">${escapeHtml(workflow.name)}</div>
      <div class="wf-meta">${stepCount} steps</div>
    </div>
    <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 8px;">${workflow.domain}</div>
    <div class="wf-actions">
      <button class="icon-btn play" title="수행하기">▶</button>
      <button class="icon-btn preview" title="미리보기">👁</button>
      <button class="icon-btn export" title="내보내기">📤</button>
      <button class="icon-btn delete" title="삭제">🗑</button>
    </div>
  `;

    // 이벤트 바인딩
    item.addEventListener('click', (e) => {
        if (!e.target.closest('.icon-btn')) showPreview(workflow);
    });

    item.querySelector('.play').addEventListener('click', (e) => {
        e.stopPropagation();
        playWorkflow(workflow);
    });

    item.querySelector('.preview').addEventListener('click', (e) => {
        e.stopPropagation();
        showPreview(workflow);
    });

    item.querySelector('.export').addEventListener('click', (e) => {
        e.stopPropagation();
        exportWorkflow(workflow);
    });

    item.querySelector('.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteWorkflow(workflow.id);
    });

    return item;
}

function showPreview(workflow) {
    elements.previewTitle.innerText = workflow.name;
    elements.previewMeta.innerText = `${workflow.domain} · ${workflow.steps.length} steps`;
    elements.previewPlay.dataset.id = workflow.id;

    elements.previewList.innerHTML = workflow.steps.map((s, i) => `
    <div class="step-item">
      <div class="step-num">${i + 1}</div>
      <div style="flex: 1;">
        <div class="step-msg">${escapeHtml(s.message)}</div>
        <div class="step-label">${escapeHtml(s.label)}</div>
      </div>
    </div>
  `).join('');

    elements.previewPanel.style.display = 'flex';
}

async function playWorkflow(workflow) {
    // 해당 도메인이 아닌 경우 이동 확인
    const currentDomain = new URL(currentTab.url).hostname;
    if (workflow.domain !== currentDomain) {
        if (confirm("이 가이드는 다른 사이트용입니다. 이동할까요?")) {
            chrome.tabs.update(currentTab.id, { url: workflow.originUrl || `https://${workflow.domain}` });
            // 이동 후 자동 시작을 위해 세션 저장 필요 (이미 background에서 처리 중일 수 있음)
        } else {
            return;
        }
    }

    await chrome.runtime.sendMessage({ action: "startGlobalWorkflow", workflow });

    // 현재 도메인과 일치하면 즉시 실행 메시지 전송
    if (workflow.domain === currentDomain) {
        chrome.tabs.sendMessage(currentTab.id, {
            action: "resumeWorkflow",
            workflow: workflow,
            currentStepIndex: 0
        }).catch(() => { }); // 컨텐츠 스크립트 미준비 시 무시
    }

    window.close();
}

async function deleteWorkflow(id) {
    if (!confirm("이 시나리오를 삭제하시겠습니까?")) return;
    await chrome.runtime.sendMessage({ action: "deleteWorkflow", workflowId: id });
    await loadWorkflows();
}

function exportWorkflow(workflow) {
    const data = JSON.stringify(workflow, null, 2);
    downloadFile(data, `clearguide_${workflow.name}.json`);
}

async function exportAll() {
    const data = JSON.stringify(allWorkflows, null, 2);
    downloadFile(data, `clearguide_backup_${Date.now()}.json`);
}

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                // 전체 백업인 경우
                for (const wf of data) {
                    await chrome.runtime.sendMessage({ action: "saveGlobalWorkflow", workflow: wf });
                }
            } else {
                // 단일 워크플로우인 경우
                await chrome.runtime.sendMessage({ action: "saveGlobalWorkflow", workflow: data });
            }
            await loadWorkflows();
            alert("불러오기 완료!");
        } catch (err) {
            alert("잘못된 파일 형식입니다.");
        }
    };
    reader.readAsText(file);
}

async function clearAll() {
    if (!confirm("모든 데이터를 초기화하시겠습니까?")) return;
    await chrome.storage.local.set({ cv_workflows: [] });
    await loadWorkflows();
}

function downloadFile(content, fileName) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
