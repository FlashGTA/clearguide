console.log("[ClearGuide Studio] Service Worker initialized");

const CONTENT_SCRIPT_FILE = "src/content/index.js";
const CONTENT_SCRIPT_PREFIX = "clearguide-site-";

chrome.runtime.onInstalled.addListener(() => {
  void syncRegisteredContentScripts();
});

chrome.runtime.onStartup.addListener(() => {
  void syncRegisteredContentScripts();
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
    if (!url.hostname || url.hostname.includes("*")) return null;
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
  void (async () => {
    try {
      sendResponse(await handleMessage(request, sender));
    } catch (error) {
      console.error("[ClearGuide Studio] message error", error);
      sendResponse({ success: false, error: error?.message || "UNKNOWN_ERROR" });
    }
  })();
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

const ALLOWED_INTERACTION_TYPES = new Set([
  "none",
  "click",
  "input",
  "change",
  "submit",
  "mouseover",
  "mouseenter"
]);

function normalizeWorkflow(input) {
  if (!input || typeof input !== "object") {
    throw new Error("INVALID_WORKFLOW");
  }

  const steps = Array.isArray(input.steps)
    ? input.steps.map(normalizeStep).filter(Boolean)
    : [];

  if (steps.length === 0) {
    throw new Error("WORKFLOW_REQUIRES_STEPS");
  }

  const originUrl = sanitizeHttpUrl(input.originUrl);
  const domain = sanitizeDomain(input.domain, originUrl);

  return {
    schemaVersion: "1.0",
    id: sanitizeIdentifier(input.id) || `guide_${Date.now()}`,
    name: sanitizeText(input.name, 120) || "Untitled guide",
    domain,
    originUrl,
    createdAt: sanitizeIsoDate(input.createdAt) || new Date().toISOString(),
    steps
  };
}

function normalizeStep(step) {
  if (!step || typeof step !== "object") return null;

  const message = sanitizeText(step.message, 1000);
  const urlPattern = sanitizeGuidePattern(step.urlPattern);
  if (!message || !urlPattern) return null;

  return {
    selector: sanitizeSelector(step.selector),
    label: sanitizeText(step.label, 120) || "",
    message,
    urlPattern,
    trigger: ALLOWED_INTERACTION_TYPES.has(step.trigger) ? step.trigger : "none",
    actionRequired: Boolean(step.actionRequired),
    interactionType: ALLOWED_INTERACTION_TYPES.has(step.interactionType)
      ? step.interactionType
      : "none",
    autoAdvance: Boolean(step.autoAdvance)
  };
}

function sanitizeIdentifier(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[^a-zA-Z0-9._:-]+/gu, "_").slice(0, 120);
  return normalized || null;
}

function sanitizeText(value, maxLength) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/gu, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function sanitizeSelector(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return null;

  const selector = value.trim().slice(0, 500);
  if (!selector || selector.includes("\0")) return null;

  return selector;
}

function sanitizeDomain(value, originUrl) {
  const candidate = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (/^[a-z0-9.-]+$/u.test(candidate)) return candidate;

  if (originUrl) {
    try {
      return new URL(originUrl).hostname;
    } catch {
      return "";
    }
  }

  return "";
}

function sanitizeHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    url.username = "";
    url.password = "";
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return null;
  }
}

function sanitizeGuidePattern(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim().slice(0, 600);

  if (raw === "*") return "*";

  if (/^https?:\/\//iu.test(raw)) {
    const token = "__CG_WILDCARD__";
    try {
      const url = new URL(raw.replace(/\*/gu, token));
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      if (url.hostname.includes(token.toLowerCase())) return null;

      url.username = "";
      url.password = "";
      url.hash = "";
      url.search = "";

      return (url.origin + url.pathname).replace(new RegExp(token, "gu"), "*");
    } catch {
      return null;
    }
  }

  // Legacy path/text glob patterns such as *complete* may be matched,
  // but are never used as navigation destinations.
  return /^[a-zA-Z0-9_./*-]+$/u.test(raw) ? raw : null;
}

function sanitizeIsoDate(value) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
