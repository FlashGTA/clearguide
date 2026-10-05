/**
 * ClearGuide Studio - Popup Logic
 */

const elements = {
    currentList: document.getElementById('current-list'),
    otherList: document.getElementById('other-list'),
    startPickupBtn: document.getElementById('start-pickup'),
    importBtn: document.getElementById('import-btn'),
    importFile: document.getElementById('import-file'),
    exportAllBtn: document.getElementById('export-all'),
    clearAllBtn: document.getElementById('clear-all'),
    status: document.getElementById('status'),

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
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab || null;

    bindEvents();
    await loadWorkflows();
});

function bindEvents() {
    elements.startPickupBtn.addEventListener('click', async () => {
        const origin = toOriginPattern(currentTab?.url);
        if (!origin) {
            showStatus('이 페이지에서는 가이드 제작을 시작할 수 없습니다.', true);
            return;
        }

        if (!(await ensureOriginsGranted([origin]))) {
            showStatus('가이드를 만들려면 현재 사이트 접근 권한이 필요합니다.', true);
            return;
        }

        await ensureContentScript(currentTab.id);
        await chrome.tabs.sendMessage(currentTab.id, { action: 'startPicker' });
        window.close();
    });

    elements.importBtn.addEventListener('click', () => elements.importFile.click());
    elements.importFile.addEventListener('change', handleImport);
    elements.exportAllBtn.addEventListener('click', exportAll);
    elements.clearAllBtn.addEventListener('click', clearAll);

    elements.closePreview.addEventListener('click', () => {
        elements.previewPanel.style.display = 'none';
    });

    elements.previewPlay.addEventListener('click', async () => {
        const workflowId = elements.previewPlay.dataset.id;
        const workflow = allWorkflows.find((item) => item.id === workflowId);
        if (workflow) await playWorkflow(workflow);
    });
}

async function loadWorkflows() {
    const response = await chrome.runtime.sendMessage({ action: 'getWorkflows' });
    allWorkflows = response.workflows || [];
    renderWorkflows();
}

function renderWorkflows() {
    const currentDomain = hostnameFromUrl(currentTab?.url);
    const pageMatch = allWorkflows.filter((workflow) => workflow.domain === currentDomain);
    const others = allWorkflows.filter((workflow) => workflow.domain !== currentDomain);

    if (pageMatch.length > 0) {
        elements.currentList.replaceChildren();
        pageMatch.forEach((workflow) => elements.currentList.appendChild(createWorkflowItem(workflow)));
    } else {
        elements.currentList.innerHTML = '<div class="empty-state">현재 페이지를 위한 가이드가 없습니다.</div>';
    }

    if (others.length > 0) {
        elements.otherList.replaceChildren();
        others.forEach((workflow) => elements.otherList.appendChild(createWorkflowItem(workflow)));
    } else {
        elements.otherList.innerHTML = '<div class="empty-state">보관함이 비어있습니다.</div>';
    }
}

function createWorkflowItem(workflow) {
    const item = document.createElement('div');
    item.className = 'workflow-item';

    const stepCount = workflow.steps?.length || 0;
    item.innerHTML = `
      <div class="wf-header">
        <div class="wf-name">${escapeHtml(workflow.name)}</div>
        <div class="wf-meta">${stepCount} steps</div>
      </div>
      <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 8px;">${escapeHtml(workflow.domain || '')}</div>
      <div class="wf-actions">
        <button class="icon-btn play" title="미리보기 실행" aria-label="미리보기 실행">▶</button>
        <button class="icon-btn preview" title="가이드 내용 보기" aria-label="가이드 내용 보기">👁</button>
        <button class="icon-btn export" title="JSON 내보내기" aria-label="JSON 내보내기">📤</button>
        <button class="icon-btn delete" title="삭제" aria-label="삭제">🗑</button>
      </div>
    `;

    item.addEventListener('click', (event) => {
        if (!event.target.closest('.icon-btn')) showPreview(workflow);
    });

    item.querySelector('.play').addEventListener('click', async (event) => {
        event.stopPropagation();
        await playWorkflow(workflow);
    });

    item.querySelector('.preview').addEventListener('click', (event) => {
        event.stopPropagation();
        showPreview(workflow);
    });

    item.querySelector('.export').addEventListener('click', (event) => {
        event.stopPropagation();
        exportWorkflow(workflow);
    });

    item.querySelector('.delete').addEventListener('click', async (event) => {
        event.stopPropagation();
        await deleteWorkflow(workflow.id);
    });

    return item;
}

function showPreview(workflow) {
    elements.previewTitle.innerText = workflow.name;
    elements.previewMeta.innerText = `${workflow.domain || '여러 사이트'} · ${workflow.steps.length} steps`;
    elements.previewPlay.dataset.id = workflow.id;

    elements.previewList.innerHTML = workflow.steps.map((step, index) => `
      <div class="step-item">
        <div class="step-num">${index + 1}</div>
        <div style="flex: 1;">
          <div class="step-msg">${escapeHtml(step.message)}</div>
          <div class="step-label">${escapeHtml(step.label)}</div>
        </div>
      </div>
    `).join('');

    elements.previewPanel.style.display = 'flex';
}

async function playWorkflow(workflow) {
    const origins = collectWorkflowOrigins(workflow);
    if (!(await ensureOriginsGranted(origins))) {
        showStatus('이 가이드의 대상 사이트 권한이 승인되지 않았습니다.', true);
        return;
    }

    const currentOrigin = toOriginPattern(currentTab?.url);
    if (currentOrigin && origins.includes(currentOrigin)) {
        await ensureContentScript(currentTab.id);
    }

    const currentDomain = hostnameFromUrl(currentTab?.url);
    if (workflow.domain && workflow.domain !== currentDomain) {
        if (!confirm('이 가이드는 다른 사이트에서 시작합니다. 이동할까요?')) return;

        await chrome.runtime.sendMessage({ action: 'startGlobalWorkflow', workflow });
        await chrome.tabs.update(currentTab.id, {
            url: workflow.originUrl || `https://${workflow.domain}`
        });
        window.close();
        return;
    }

    await chrome.runtime.sendMessage({ action: 'startGlobalWorkflow', workflow });
    await chrome.tabs.sendMessage(currentTab.id, {
        action: 'resumeWorkflow',
        workflow,
        currentStepIndex: 0
    });

    window.close();
}

async function ensureOriginsGranted(origins) {
    const requested = [...new Set(origins.filter(Boolean))];
    if (requested.length === 0) return true;

    const missing = [];
    for (const origin of requested) {
        const granted = await chrome.permissions.contains({ origins: [origin] });
        if (!granted) missing.push(origin);
    }

    if (missing.length > 0) {
        const granted = await chrome.permissions.request({ origins: missing });
        if (!granted) return false;
    }

    const registration = await chrome.runtime.sendMessage({
        action: 'registerGrantedOrigins',
        origins: requested
    });
    return registration?.success === true;
}

async function ensureContentScript(tabId) {
    if (!Number.isInteger(tabId)) return;

    try {
        await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        return;
    } catch {
        // Not injected in the current document yet.
    }

    await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/index.js']
    });
}

function collectWorkflowOrigins(workflow) {
    const values = [
        workflow.originUrl,
        ...(workflow.steps || []).map((step) => step.urlPattern)
    ];

    return [...new Set(values.map(toOriginPattern).filter(Boolean))];
}

function toOriginPattern(value) {
    if (typeof value !== 'string' || !value.trim()) return null;

    try {
        const withoutWildcard = value.trim().replace(/\*/gu, '');
        const parsed = new URL(withoutWildcard);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return `${parsed.protocol}//${parsed.host}/*`;
    } catch {
        return null;
    }
}

function hostnameFromUrl(value) {
    if (typeof value !== 'string') return '';
    try {
        return new URL(value).hostname;
    } catch {
        return '';
    }
}

async function deleteWorkflow(id) {
    if (!confirm('이 가이드를 삭제하시겠습니까?')) return;
    await chrome.runtime.sendMessage({ action: 'deleteWorkflow', workflowId: id });
    await loadWorkflows();
    showStatus('가이드를 삭제했습니다.');
}

function exportWorkflow(workflow) {
    const normalized = {
        ...workflow,
        schemaVersion: workflow.schemaVersion || '1.0'
    };
    downloadFile(JSON.stringify(normalized, null, 2), `clearguide_${safeFileName(workflow.name)}.json`);
}

function exportAll() {
    const normalized = allWorkflows.map((workflow) => ({
        ...workflow,
        schemaVersion: workflow.schemaVersion || '1.0'
    }));
    downloadFile(JSON.stringify(normalized, null, 2), `clearguide_backup_${Date.now()}.json`);
}

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);
        const workflows = Array.isArray(data) ? data : [data];

        for (const workflow of workflows) {
            validateImportedWorkflow(workflow);
            await chrome.runtime.sendMessage({
                action: 'saveGlobalWorkflow',
                workflow: {
                    ...workflow,
                    schemaVersion: workflow.schemaVersion || '1.0'
                }
            });
        }

        await loadWorkflows();
        showStatus('가이드를 불러왔습니다.');
    } catch (error) {
        console.error(error);
        showStatus('가이드 JSON 형식을 확인해주세요.', true);
    } finally {
        event.target.value = '';
    }
}

function validateImportedWorkflow(workflow) {
    if (!workflow || typeof workflow !== 'object') throw new Error('INVALID_WORKFLOW');
    if (!workflow.id || !workflow.name) throw new Error('MISSING_ID_OR_NAME');
    if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) throw new Error('MISSING_STEPS');

    for (const step of workflow.steps) {
        if (!step || typeof step !== 'object' || !step.message || !step.urlPattern) {
            throw new Error('INVALID_STEP');
        }
    }
}

async function clearAll() {
    if (!confirm('모든 로컬 가이드를 삭제하시겠습니까?')) return;
    await chrome.storage.local.set({ cv_workflows: [] });
    await chrome.storage.local.remove('active_workflow_session');
    await loadWorkflows();
    showStatus('로컬 가이드를 모두 삭제했습니다.');
}

function downloadFile(content, fileName) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
}

function safeFileName(value) {
    return String(value || 'guide').replace(/[^a-z0-9가-힣_-]+/giu, '_').slice(0, 80);
}

function showStatus(message, isError = false) {
    if (!elements.status) return;
    elements.status.textContent = message;
    elements.status.style.display = 'block';
    elements.status.style.background = isError
        ? 'rgba(239,68,68,0.15)'
        : 'rgba(16,185,129,0.15)';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}
