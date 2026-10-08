/**
 * ClearGuide Goal Router
 *
 * Converts a user's natural-language goal into a known workflow candidate.
 * An application may inject an AI analyzer through `options.analyzer`.
 * The deterministic fallback is intentionally conservative: it only returns
 * catalog entries with a positive keyword match and always requires consent.
 */
class ClearGuideGoalRouter {
    constructor(catalog = [], options = {}) {
        this.catalog = Array.isArray(catalog) ? catalog : [];
        this.analyzer = options.analyzer || null;
        this.minimumScore = options.minimumScore || 1;
    }

    async resolve(goal) {
        const normalizedGoal = this.normalize(goal);
        if (!normalizedGoal) return this.noMatch('목표를 입력해 주세요.');

        if (typeof this.analyzer === 'function') {
            const modelResult = await this.analyzer({ goal: normalizedGoal, catalog: this.catalog });
            const validated = this.validateModelResult(modelResult);
            if (validated) return { ...validated, source: 'ai-analyzer', requiresConfirmation: true };
        }

        const ranked = this.catalog
            .map(workflow => ({ workflow, score: this.score(normalizedGoal, workflow) }))
            .filter(item => item.score >= this.minimumScore)
            .sort((a, b) => b.score - a.score);

        if (!ranked.length) return this.noMatch('현재 등록된 안내 여정과 일치하는 목표를 찾지 못했습니다.');
        const best = ranked[0];
        return {
            workflowId: best.workflow.id,
            confidence: Math.min(0.95, 0.5 + best.score * 0.1),
            reason: '등록된 업무 목표 키워드와 일치',
            source: 'deterministic-fallback',
            requiresConfirmation: true
        };
    }

    score(goal, workflow) {
        const terms = [workflow.name, workflow.purpose, ...(workflow.keywords || [])]
            .join(' ').toLowerCase().split(/\s+/).filter(Boolean);
        return terms.reduce((score, term) => goal.includes(term) ? score + 1 : score, 0);
    }

    validateModelResult(result) {
        if (!result || typeof result.workflowId !== 'string') return null;
        const workflow = this.catalog.find(item => item.id === result.workflowId);
        if (!workflow) return null;
        return {
            workflowId: workflow.id,
            confidence: Number.isFinite(result.confidence) ? Math.max(0, Math.min(1, result.confidence)) : 0.5,
            reason: typeof result.reason === 'string' ? result.reason : 'AI가 등록된 안내 여정을 추천했습니다.'
        };
    }

    normalize(value) {
        return typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, ' ') : '';
    }

    noMatch(reason) {
        return { workflowId: null, confidence: 0, reason, source: 'none', requiresConfirmation: false };
    }
}

if (typeof window !== 'undefined') window.ClearGuideGoalRouter = ClearGuideGoalRouter;
if (typeof module !== 'undefined') module.exports = ClearGuideGoalRouter;
