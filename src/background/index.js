console.log("[ClearView AI] Service Worker Initialized (Connect Mode)");

/**
 * 전역 워크플로우 상태 관리
 * 여러 페이지를 넘나드는 멀티 페이지 시나리오를 추적합니다.
 */

// 탭 업데이트 감시 (페이지 전환 대응)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    checkAndBroadcastWorkflow(tabId, tab.url);
  }
});

/**
 * 현재 URL에 활성화될 워크플로우 단계가 있는지 확인하고 브로드캐스팅합니다.
 */
async function checkAndBroadcastWorkflow(tabId, url) {
  const result = await chrome.storage.local.get(['active_workflow_session']);
  const session = result['active_workflow_session'];

  if (session && session.workflow && Array.isArray(session.workflow.steps)) {
    const { workflow, currentStepIndex } = session;
    const currentStep = workflow.steps[currentStepIndex];

    if (!currentStep) {
      await chrome.storage.local.remove(['active_workflow_session']);
      return;
    }

    // URL 패턴 매칭 (간단한 포함 여부 체크로 우선 구현)
    if (urlMatchesPattern(url, currentStep.urlPattern)) {
      console.log(`[Connect] Match found! Broadcasting step ${currentStepIndex + 1} to tab ${tabId}`);
      chrome.tabs.sendMessage(tabId, {
        action: "resumeWorkflow",
        workflow: workflow,
        currentStepIndex: currentStepIndex
      }).catch(err => console.log("Tab not ready yet, will retry on next interaction."));
    }
  }
}

function urlMatchesPattern(url, pattern) {
  if (!pattern || pattern === '*') return true;
  const normalize = (u) => {
    try {
      const urlObj = new URL(u);
      return urlObj.origin + urlObj.pathname.replace(/\/$/, "");
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getConfig") {
    const domain = new URL(sender.tab.url).hostname;
    chrome.storage.local.get([domain], (result) => {
      sendResponse({ config: result[domain] || null });
    });
  }
  else if (request.action === "saveConfig") {
    const { domain, config } = request;
    chrome.storage.local.set({ [domain]: config }, () => {
      console.log("[ClearView AI] Config saved for:", domain);
      sendResponse({ success: true });
    });
  }
  /**
   * 글로벌 워크플로우 관리 [NEW]
   */
  else if (request.action === "saveGlobalWorkflow") {
    const { workflow } = request;
    chrome.storage.local.get(['cv_workflows'], (result) => {
      let workflows = result.cv_workflows || [];
      // ID 중복 시 업데이트, 없으면 추가
      const index = workflows.findIndex(w => w.id === workflow.id);
      if (index > -1) {
        workflows[index] = workflow;
      } else {
        workflows.push(workflow);
      }
      chrome.storage.local.set({ 'cv_workflows': workflows }, () => {
        console.log("[ClearGuide] Global Workflow saved:", workflow.name);
        sendResponse({ success: true });
      });
    });
  }
  else if (request.action === "getWorkflows") {
    chrome.storage.local.get(['cv_workflows'], (result) => {
      sendResponse({ workflows: result.cv_workflows || [] });
    });
  }
  else if (request.action === "deleteWorkflow") {
    const { workflowId } = request;
    chrome.storage.local.get(['cv_workflows'], (result) => {
      let workflows = result.cv_workflows || [];
      workflows = workflows.filter(w => w.id !== workflowId);
      chrome.storage.local.set({ 'cv_workflows': workflows }, () => {
        sendResponse({ success: true });
      });
    });
  }
  else if (request.action === "startGlobalWorkflow") {
    const { workflow } = request;
    if (!workflow || !Array.isArray(workflow.steps) || workflow.steps.length === 0) {
      sendResponse({ success: false, error: 'INVALID_WORKFLOW' });
      return true;
    }
    const session = {
      workflow: workflow,
      currentStepIndex: 0,
      startTime: Date.now(),
      status: 'active',
      lastError: null
    };
    chrome.storage.local.set({ 'active_workflow_session': session }, () => {
      console.log("[ClearGuide] Global Workflow started:", workflow.id);
      sendResponse({ success: true });
    });
  }
  else if (request.action === "updateWorkflowStep") {
    const { stepIndex } = request;
    chrome.storage.local.get(['active_workflow_session'], (result) => {
      const session = result['active_workflow_session'];
      if (session) {
        session.currentStepIndex = stepIndex;
        session.lastError = null;
        chrome.storage.local.set({ 'active_workflow_session': session }, () => {
          sendResponse({ success: true });
        });
      }
    });
  }
  else if (request.action === "clearWorkflow") {
    chrome.storage.local.remove(['active_workflow_session'], () => {
      sendResponse({ success: true });
    });
  }

  else if (request.action === "recordWorkflowError") {
    const { error } = request;
    chrome.storage.local.get(['active_workflow_session'], (result) => {
      const session = result['active_workflow_session'];
      if (!session) {
        sendResponse({ success: false });
        return;
      }
      session.status = 'blocked';
      session.lastError = {
        code: error?.code || 'UNKNOWN',
        message: error?.message || '알 수 없는 오류',
        at: new Date().toISOString()
      };
      chrome.storage.local.set({ active_workflow_session: session }, () => {
        sendResponse({ success: true });
      });
    });
  }

  return true;
});
