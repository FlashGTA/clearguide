console.log("[ClearGuide Studio] Service Worker initialized");

const CONTENT_SCRIPT_FILE = "src/content/index.js";
const CONTENT_SCRIPT_PREFIX = "clearguide-site-";

chrome.runtime.onInstalled.addListener(() => {
  void syncRegisteredContentScripts();
});

chrome.runtime.onStartup.addListener(() => {
  void syncRegisteredContentScripts();
});

chrome.permissions.onAdded.addListener(({ origins = [] }) => {
  void registerContentScriptsForOrigins(origins);
});

chrome.permissions.onRemoved.addListener(({ origins = [] }) => {
  void unregisterContentScriptsForOrigins(origins);
});

// Multi-page preview resume. tab.url is available for origins the user has granted.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    void checkAndBroadcastWorkflow(tabId, tab.url);
  }
});

async function syncRegisteredContentScripts() {
  const granted = await chrome.permissions.getAll();
  await registerContentScriptsForOrigins(granted.origins || []);
}

async function registerContentScriptsForOrigins(origins) {
  const patterns = uniqueHttpOriginPatterns(origins);
  if (patterns.length === 0) return;

  const existing = await chrome.scripting.getRegisteredContentScripts();
  const existingIds = new Set(existing.map((script) => script.id));
  const registrations = patterns
    .map((pattern) => ({
      id: registrationIdForOrigin(pattern),
      matches: [pattern],
      js: [CONTENT_SCRIPT_FILE],
      runAt: "document_idle",
      persistAcrossSessions: true
    }))
    .filter((registration) => !existingIds.has(registration.id));

  if (registrations.length > 0) {
    await chrome.scripting.registerContentScripts(registrations);
  }
}

async function unregisterContentScriptsForOrigins(origins) {
  const ids = uniqueHttpOriginPatterns(origins).map(registrationIdForOrigin);
  if (ids.length === 0) return;

  const existing = await chrome.scripting.getRegisteredContentScripts();
  const existingIds = new Set(existing.map((script) => script.id));
  const removable = ids.filter((id) => existingIds.has(id));

  if (removable.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: removable });
  }
}

function uniqueHttpOriginPatterns(origins) {
  return [...new Set(
    origins
      .map(toHttpOriginPattern)
      .filter(Boolean)
  )];
}

function toHttpOriginPattern(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  const candidate = value.trim();
  if (candidate === "<all_urls>") return null;

  try {
    const normalized = candidate.replace(/\*$/u, "");
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.protocol}//${url.host}/*`;
  } catch {
    const match = candidate.match(/^(https?):\/\/([^/]+)\/\*$/u);
    return match ? `${match[1]}://${match[2]}/*` : null;
  }
}

function registrationIdForOrigin(originPattern) {
  let hash = 2166136261;
  for (const char of originPattern) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${CONTENT_SCRIPT_PREFIX}${(hash >>> 0).toString(36)}`;
}

async function checkAndBroadcastWorkflow(tabId, url) {
  const { active_workflow_session: session } = await chrome.storage.local.get("active_workflow_session");
  if (!session?.workflow) return;

  const { workflow, currentStepIndex } = session;
  const currentStep = workflow.steps?.[currentStepIndex];
  if (!currentStep || !urlMatchesPattern(url, currentStep.urlPattern)) return;

  try {
    await chrome.tabs.sendMessage(tabId, {
      action: "resumeWorkflow",
      workflow,
      currentStepIndex
    });
  } catch {
    // A newly granted site can complete navigation before the registered content script is ready.
  }
}

function urlMatchesPattern(url, pattern) {
  if (!pattern || pattern === "*") return true;

  const normalize = (value) => {
    try {
      const parsed = new URL(value);
      return parsed.origin + parsed.pathname.replace(/\/$/u, "");
    } catch {
      return String(value).split("?")[0].split("#")[0].replace(/\/$/u, "");
    }
  };

  const cleanUrl = normalize(url);
  const cleanPattern = normalize(pattern);

  try {
    const regex = new RegExp("^" + cleanPattern.replace(/\*/gu, ".*") + "$");
    return regex.test(cleanUrl);
  } catch {
    return cleanUrl.includes(cleanPattern);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  void handleMessage(request, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error("[ClearGuide Studio] message error", error);
      sendResponse({ success: false, error: error?.message || "UNKNOWN_ERROR" });
    });
  return true;
});

async function handleMessage(request, sender) {
  switch (request.action) {
    case "ping":
      return { success: true };

    case "registerGrantedOrigins": {
      const origins = uniqueHttpOriginPatterns(request.origins || []);
      if (origins.length === 0) return { success: true, origins: [] };

      const hasPermission = await chrome.permissions.contains({ origins });
      if (!hasPermission) {
        return { success: false, error: "HOST_PERMISSION_NOT_GRANTED" };
      }

      await registerContentScriptsForOrigins(origins);
      return { success: true, origins };
    }

    case "getConfig": {
      const tabUrl = sender.tab?.url;
      if (!tabUrl) return { config: null };
      const domain = new URL(tabUrl).hostname;
      const result = await chrome.storage.local.get(domain);
      return { config: result[domain] || null };
    }

    case "saveConfig": {
      const { domain, config } = request;
      await chrome.storage.local.set({ [domain]: config });
      return { success: true };
    }

    case "saveGlobalWorkflow": {
      const workflow = normalizeWorkflow(request.workflow);
      const { cv_workflows: stored = [] } = await chrome.storage.local.get("cv_workflows");
      const workflows = Array.isArray(stored) ? [...stored] : [];
      const index = workflows.findIndex((item) => item.id === workflow.id);

      if (index >= 0) workflows[index] = workflow;
      else workflows.push(workflow);

      await chrome.storage.local.set({ cv_workflows: workflows });
      return { success: true, workflow };
    }

    case "getWorkflows": {
      const { cv_workflows: workflows = [] } = await chrome.storage.local.get("cv_workflows");
      return { workflows: Array.isArray(workflows) ? workflows : [] };
    }

    case "deleteWorkflow": {
      const { cv_workflows: stored = [] } = await chrome.storage.local.get("cv_workflows");
      const workflows = (Array.isArray(stored) ? stored : [])
        .filter((workflow) => workflow.id !== request.workflowId);
      await chrome.storage.local.set({ cv_workflows: workflows });
      return { success: true };
    }

    case "startGlobalWorkflow": {
      const workflow = normalizeWorkflow(request.workflow);
      await chrome.storage.local.set({
        active_workflow_session: {
          workflow,
          currentStepIndex: 0,
          startTime: Date.now()
        }
      });
      return { success: true };
    }

    case "updateWorkflowStep": {
      const { active_workflow_session: session } = await chrome.storage.local.get("active_workflow_session");
      if (!session) return { success: false, error: "NO_ACTIVE_WORKFLOW" };
      session.currentStepIndex = request.stepIndex;
      await chrome.storage.local.set({ active_workflow_session: session });
      return { success: true };
    }

    case "clearWorkflow":
      await chrome.storage.local.remove("active_workflow_session");
      return { success: true };

    default:
      return { success: false, error: "UNKNOWN_ACTION" };
  }
}

function normalizeWorkflow(input) {
  const workflow = input && typeof input === "object" ? input : {};
  return {
    ...workflow,
    schemaVersion: workflow.schemaVersion || "1.0"
  };
}
