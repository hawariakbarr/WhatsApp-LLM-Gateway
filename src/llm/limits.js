const NodeCache = require('node-cache');
const { logger } = require('../utils/logger');

const usageCache = new NodeCache({ stdTTL: 3600, checkperiod: 60 });

class ApiLimitTracker {
    constructor() {
        this.limits = new Map();
    }

    recordUsage(model, tokens) {
        const key = `usage:${model}`;
        const current = usageCache.get(key) || { tokens: 0, requests: 0, lastReset: Date.now() };
        
        current.tokens += (tokens.input_tokens || 0) + (tokens.output_tokens || 0);
        current.requests += 1;
        
        usageCache.set(key, current);
        logger.debug(`📊 ${model}: ${current.tokens} tokens, ${current.requests} requests`);
    }

    checkLimit(model, rateLimit) {
        const key = `usage:${model}`;
        const current = usageCache.get(key) || { tokens: 0, requests: 0, lastReset: Date.now() };
        
        if (Date.now() - current.lastReset > 3600000) {
            current.tokens = 0;
            current.requests = 0;
            current.lastReset = Date.now();
            usageCache.set(key, current);
        }

        const isTpmLimited = current.tokens >= rateLimit.tpm;
        const isRpmLimited = current.requests >= rateLimit.rpm;

        return {
            limited: isTpmLimited || isRpmLimited,
            tokensUsed: current.tokens,
            tokensLimit: rateLimit.tpm,
            requestsUsed: current.requests,
            requestsLimit: rateLimit.rpm,
            cooldownActive: false
        };
    }

    setCooldown(model, minutes) {
        const key = `cooldown:${model}`;
        const cooldownUntil = Date.now() + (minutes * 60 * 1000);
        usageCache.set(key, cooldownUntil);
        logger.warn(`⏰ Cooldown for ${model} until ${new Date(cooldownUntil).toISOString()}`);
    }

    isOnCooldown(model) {
        const key = `cooldown:${model}`;
        const cooldownUntil = usageCache.get(key);
        
        if (!cooldownUntil) return false;
        if (Date.now() > cooldownUntil) {
            usageCache.del(key);
            return false;
        }
        return true;
    }
}

const tracker = new ApiLimitTracker();

async function checkApiLimits(model, rateLimit) {
    const onCooldown = tracker.isOnCooldown(model);
    if (onCooldown) {
        return { limited: true, cooldownActive: true, model };
    }

    const limitStatus = tracker.checkLimit(model, rateLimit);
    return { ...limitStatus, model };
}

async function updateUsage(model, usage) {
    tracker.recordUsage(model, usage);
}

async function setModelCooldown(model, minutes) {
    tracker.setCooldown(model, minutes);
}

module.exports = {
    checkApiLimits,
    updateUsage,
    setModelCooldown
};
