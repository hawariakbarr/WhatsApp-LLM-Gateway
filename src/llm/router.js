const { logger } = require('../utils/logger');
const { getConfigLoader } = require('../utils/config-loader');
const { checkApiLimits, updateUsage } = require('./limits');
const { callAnthropic, callGoogle, callXAI, callDeepSeek } = require('./providers');

class ModelRouter {
    constructor(config) {
        this.config = config;
        this.configLoader = getConfigLoader();
        this.fallbackChain = config.llm.fallbackChain || [
            'anthropic/claude-sonnet-4-5',
            'google/gemini-2.5-pro',
            'xai/grok-2',
            'deepseek/deepseek-chat'
        ];
        this.rateLimit = config.llm.rateLimit || { tpm: 10000, rpm: 100 };
        this.providerStatus = new Map();
    }

    async route(message, context = {}) {
        const {
            parentingMode = false,
            language = 'en',
            complexity = 5,
            safetyRisk = false
        } = context;

        // Get system prompt from agent config
        const agentConfig = this.configLoader.getConfig();
        const systemPrompt = this.buildSystemPrompt(agentConfig, context);

        logger.info(`🧠 Routing: parenting=${parentingMode}, lang=${language}, complexity=${complexity}`);

        let selectedModel = this.selectModel(parentingMode, language, complexity, safetyRisk);
        logger.info(`🎯 Primary model: ${selectedModel}`);

        const modelsToTry = this.getFallbackOrder(selectedModel);
        let lastError = null;

        for (const model of modelsToTry) {
            try {
                const limitStatus = await checkApiLimits(model, this.rateLimit);
                if (limitStatus.limited && !safetyRisk) {
                    logger.warn(`⚠️ ${model} rate limited, skipping...`);
                    continue;
                }

                const response = await this.executeModel(model, message, { ...context, systemPrompt });
                await updateUsage(model, response.usage);
                
                logger.info(`✅ Success with ${model}`);
                
                return {
                    model: model,
                    response: response.content,
                    usage: response.usage,
                    provider: response.provider,
                    confidence: this.getConfidence(model, safetyRisk),
                    fallbackUsed: model !== selectedModel
                };
            } catch (error) {
                lastError = error;
                logger.warn(`❌ ${model} failed: ${error.message}`);
                this.providerStatus.set(model, { status: 'error', lastError: Date.now() });
            }
        }

        logger.error(`❌ All providers failed!`);
        throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
    }

    buildSystemPrompt(agentConfig, context) {
        const identity = this.configLoader.getIdentity();
        const personality = this.configLoader.getPersonality();
        
        const basePrompt = `
You are a WhatsApp AI assistant. Follow these guidelines:

${identity}

${personality}

## Current Context
- Language: ${context.language || 'auto'}
- Parenting Mode: ${context.parentingMode ? 'Yes' : 'No'}
- Safety Risk: ${context.safetyRisk ? 'Yes' : 'No'}

## Important Rules
1. Keep responses concise for WhatsApp (mobile-friendly)
2. Use appropriate emojis (1-2 per message)
3. For safety/health topics, include professional disclaimer
4. Detect and respond in user's language (Indonesian/English)
5. Be warm, supportive, and helpful
`.trim();

        if (context.parentingMode) {
            return basePrompt + `

## Parenting Mode Active
- Provide practical, empathetic advice
- Be non-judgmental and supportive
- Include step-by-step guidance
- Suggest professional help for health concerns
`;
        }

        if (context.safetyRisk) {
            return basePrompt + `

## ⚠️ SAFETY CRITICAL TOPIC
- Prioritize user safety above all
- Provide clear, actionable guidance
- ALWAYS recommend professional help
- Include emergency contacts if relevant
- Do not provide medical/legal diagnosis
`;
        }

        return basePrompt;
    }

    selectModel(parentingMode, language, complexity, safetyRisk) {
        if (safetyRisk) return 'anthropic/claude-sonnet-4-5';
        if (parentingMode && complexity <= 3) return 'anthropic/claude-3-haiku-20240307';
        if (parentingMode && complexity <= 6) return 'anthropic/claude-sonnet-4-5';
        if (complexity <= 3) return 'anthropic/claude-3-haiku-20240307';
        return 'anthropic/claude-sonnet-4-5';
    }

    getFallbackOrder(primaryModel) {
        const ordered = [primaryModel];
        for (const model of this.fallbackChain) {
            if (!ordered.includes(model)) ordered.push(model);
        }
        return ordered;
    }

    getConfidence(model, safetyRisk) {
        if (safetyRisk) return 0.99;
        const confidenceMap = { 'anthropic': 0.95, 'google': 0.90, 'xai': 0.85, 'deepseek': 0.80 };
        const provider = model.split('/')[0];
        return confidenceMap[provider] || 0.75;
    }

    async executeModel(model, message, context) {
        const [provider, modelName] = model.split('/');
        logger.info(`🤖 Calling ${provider}/${modelName}...`);

        switch (provider) {
            case 'anthropic': return await callAnthropic(modelName, message, context, this.config);
            case 'google': return await callGoogle(modelName, message, context, this.config);
            case 'xai': return await callXAI(modelName, message, context, this.config);
            case 'deepseek': return await callDeepSeek(modelName, message, context, this.config);
            default: throw new Error(`Unknown provider: ${provider}`);
        }
    }

    async getModelStatus() {
        const status = {};
        for (const model of this.fallbackChain) {
            const [provider] = model.split('/');
            const limitStatus = await checkApiLimits(model, this.rateLimit);
            const providerStatus = this.providerStatus.get(model);
            status[model] = {
                ...limitStatus,
                provider: provider,
                health: providerStatus?.status || 'healthy',
                priority: this.config.llm.providerPriority?.[provider] || 99
            };
        }
        return status;
    }
}

module.exports = ModelRouter;
