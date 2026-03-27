const axios = require('axios');
const { logger } = require('../utils/logger');

// ===========================================
// ANTHROPIC (Claude) - PRIMARY PROVIDER
// ===========================================
async function callAnthropic(model, message, context, config) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey || apiKey.includes('your_')) {
        throw new Error('Anthropic API key not configured');
    }

    const baseUrl = 'https://api.anthropic.com/v1';
    
    const modelMap = {
        'claude-opus-4-5': 'claude-opus-4-5-20250514',
        'claude-sonnet-4-5': 'claude-sonnet-4-5-20250514',
        'claude-haiku-4-5': 'claude-3-haiku-20240307'
    };

    const actualModel = modelMap[model] || model;

    logger.info(`🤖 Calling Anthropic: ${actualModel}`);

    try {
        const response = await axios.post(
            `${baseUrl}/messages`,
            {
                model: actualModel,
                max_tokens: 2048,
                messages: [{ role: 'user', content: message }],
                system: context.systemPrompt || 'You are a helpful AI assistant.'
            },
            {
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                timeout: 30000
            }
        );

        return {
            content: response.data.content[0].text,
            usage: {
                input_tokens: response.data.usage?.input_tokens || 0,
                output_tokens: response.data.usage?.output_tokens || 0
            },
            provider: 'anthropic'
        };
    } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        const errorCode = error.response?.status || 'unknown';
        logger.error(`❌ Anthropic API error (${errorCode}): ${errorMessage}`);
        throw new Error(`Anthropic API error (${errorCode}): ${errorMessage}`);
    }
}

// ===========================================
// GOOGLE (Gemini) - FREE BACKUP
// ===========================================
async function callGoogle(model, message, context, config) {
    const apiKey = process.env.GOOGLE_API_KEY;
    
    if (!apiKey || apiKey.includes('your_')) {
        throw new Error('Google API key not configured');
    }

    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    const actualModel = model || 'gemini-2.5-pro';

    logger.info(`🤖 Calling Google: ${actualModel}`);

    try {
        const response = await axios.post(
            `${baseUrl}/models/${actualModel}:generateContent?key=${apiKey}`,
            {
                contents: [{ parts: [{ text: message }] }],
                generationConfig: {
                    maxOutputTokens: 2048,
                    temperature: 0.7
                },
                systemInstruction: {
                    parts: [{ text: context.systemPrompt || 'You are a helpful AI assistant.' }]
                }
            },
            { timeout: 30000 }
        );

        return {
            content: response.data.candidates[0].content.parts[0].text,
            usage: {
                input_tokens: response.data.usageMetadata?.promptTokenCount || 0,
                output_tokens: response.data.usageMetadata?.candidatesTokenCount || 0
            },
            provider: 'google'
        };
    } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        logger.error(`❌ Google API error: ${errorMessage}`);
        throw new Error(`Google API error: ${errorMessage}`);
    }
}

// ===========================================
// XAI (Grok) - PREMIUM BACKUP
// ===========================================
async function callXAI(model, message, context, config) {
    const apiKey = process.env.XAI_API_KEY;
    
    if (!apiKey || apiKey.includes('your_')) {
        throw new Error('XAI API key not configured');
    }

    const baseUrl = 'https://api.x.ai/v1';
    const actualModel = model || 'grok-2';

    logger.info(`🤖 Calling XAI (Grok): ${actualModel}`);

    try {
        const response = await axios.post(
            `${baseUrl}/chat/completions`,
            {
                model: actualModel,
                messages: [
                    { role: 'system', content: context.systemPrompt || 'You are a helpful AI assistant.' },
                    { role: 'user', content: message }
                ],
                max_tokens: 2048,
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'content-type': 'application/json'
                },
                timeout: 30000
            }
        );

        return {
            content: response.data.choices[0].message.content,
            usage: response.data.usage,
            provider: 'xai'
        };
    } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        const errorCode = error.response?.status || 'unknown';
        logger.error(`❌ XAI API error (${errorCode}): ${errorMessage}`);
        throw new Error(`XAI API error (${errorCode}): ${errorMessage}`);
    }
}

// ===========================================
// DEEPSEEK - COST-EFFECTIVE BACKUP
// ===========================================
async function callDeepSeek(model, message, context, config) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey || apiKey.includes('your_')) {
        throw new Error('DeepSeek API key not configured');
    }

    const baseUrl = 'https://api.deepseek.com/v1';
    const actualModel = model || 'deepseek-chat';

    logger.info(`🤖 Calling DeepSeek: ${actualModel}`);

    try {
        const response = await axios.post(
            `${baseUrl}/chat/completions`,
            {
                model: actualModel,
                messages: [
                    { role: 'system', content: context.systemPrompt || 'You are a helpful AI assistant.' },
                    { role: 'user', content: message }
                ],
                max_tokens: 2048,
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'content-type': 'application/json'
                },
                timeout: 30000
            }
        );

        return {
            content: response.data.choices[0].message.content,
            usage: response.data.usage,
            provider: 'deepseek'
        };
    } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        const errorCode = error.response?.status || 'unknown';
        logger.error(`❌ DeepSeek API error (${errorCode}): ${errorMessage}`);
        throw new Error(`DeepSeek API error (${errorCode}): ${errorMessage}`);
    }
}

module.exports = {
    callAnthropic,
    callGoogle,
    callXAI,
    callDeepSeek
};
