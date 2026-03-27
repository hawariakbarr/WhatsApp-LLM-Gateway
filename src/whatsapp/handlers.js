const ModelRouter = require('../llm/router');
const { SessionManager } = require('./session');
const { logger } = require('../utils/logger');

function detectParentingMode(text) {
    const parentingKeywords = [
        'anak', 'bayi', 'balita', 'child', 'baby', 'toddler',
        'parenting', 'sekolah', 'school', 'tantrum', 'tidur', 'sleep',
        'ibu hamil', 'pregnancy', 'menyusui', 'breastfeeding',
        'keluarga', 'family', 'pernikahan', 'marriage'
    ];
    
    const textLower = text.toLowerCase();
    return parentingKeywords.some(keyword => textLower.includes(keyword));
}

function detectLanguage(text) {
    const indonesianKeywords = [
        'apa', 'bagaimana', 'kenapa', 'tolong', 'terima kasih',
        'saya', 'anda', 'tidak', 'dengan', 'untuk', 'yang'
    ];
    
    const textLower = text.toLowerCase();
    const matches = indonesianKeywords.filter(k => textLower.includes(k)).length;
    
    return matches >= 2 ? 'id' : 'en';
}

function detectComplexity(text) {
    const wordCount = text.split(/\s+/).length;
    const hasQuestion = text.includes('?');
    const hasMultipleQuestions = (text.match(/\?/g) || []).length > 1;
    
    if (wordCount < 10 && !hasMultipleQuestions) return 2;
    if (wordCount < 30 && !hasMultipleQuestions) return 4;
    if (wordCount < 50 || hasMultipleQuestions) return 6;
    return 8;
}

function detectSafetyRisk(text) {
    const safetyKeywords = [
        'sakit', 'illness', 'demam', 'fever', 'cedera', 'injury',
        'bahaya', 'danger', 'depresi', 'depression', 'bunuh diri', 'suicide',
        'risiko', 'risk', 'darah', 'blood', 'rumah sakit', 'hospital'
    ];
    
    const textLower = text.toLowerCase();
    return safetyKeywords.some(keyword => textLower.includes(keyword));
}

async function handleMessage(message, sock, config) {
    try {
        const phoneNumber = message.key.remoteJid;
        const messageText = message.message?.conversation || 
                           message.message?.extendedTextMessage?.text ||
                           message.message?.imageMessage?.caption || '';

        if (!messageText.trim()) {
            logger.warn('Empty message received');
            return;
        }

        logger.info(`📨 Processing message from ${phoneNumber}: ${messageText.substring(0, 50)}...`);

        const parentingMode = detectParentingMode(messageText);
        const language = detectLanguage(messageText);
        const complexity = detectComplexity(messageText);
        const safetyRisk = detectSafetyRisk(messageText);

        logger.info(`🧠 Context: parenting=${parentingMode}, lang=${language}, complexity=${complexity}, safety=${safetyRisk}`);

        const sessionManager = new SessionManager(config.gateway.sessionStore);
        const history = await sessionManager.getConversationHistory(phoneNumber);

        const context = {
            parentingMode,
            language,
            complexity,
            safetyRisk,
            phoneNumber,
            systemPrompt: parentingMode ? 
                'You are a warm, supportive parenting assistant. Provide practical, empathetic advice. Always suggest professional help for health concerns.' :
                'You are a helpful AI assistant.',
            conversationHistory: history
        };

        const router = new ModelRouter(config);
        const result = await router.route(messageText, context);

        await sock.sendMessage(phoneNumber, { text: result.response });
        logger.info(`✉️ Response sent to ${phoneNumber}`);

        const newHistory = [
            ...history,
            { role: 'user', content: messageText },
            { role: 'assistant', content: result.response }
        ];
        await sessionManager.saveConversationHistory(phoneNumber, newHistory);

        logger.info(`📊 Model: ${result.model}, Fallback: ${result.fallbackUsed}, Tokens: ${result.usage?.input_tokens + result.usage?.output_tokens}`);

    } catch (error) {
        logger.error(`❌ Message handling error: ${error.message}`);
        
        try {
            await sock.sendMessage(message.key.remoteJid, {
                text: '⚠️ Sorry, I encountered an error. Please try again in a moment.'
            });
        } catch (sendError) {
            logger.error(`Failed to send error message: ${sendError.message}`);
        }
    }
}

module.exports = {
    handleMessage,
    detectParentingMode,
    detectLanguage,
    detectComplexity,
    detectSafetyRisk
};
