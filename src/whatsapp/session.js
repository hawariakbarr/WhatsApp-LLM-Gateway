const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

class SessionManager {
    constructor(sessionPath) {
        this.sessionPath = sessionPath;
    }

    async saveSession(data) {
        try {
            await fs.mkdir(this.sessionPath, { recursive: true });
            const sessionFile = path.join(this.sessionPath, 'session.json');
            await fs.writeFile(sessionFile, JSON.stringify(data, null, 2));
            logger.info('💾 Session saved');
            return true;
        } catch (error) {
            logger.error(`Failed to save session: ${error.message}`);
            return false;
        }
    }

    async loadSession() {
        try {
            const sessionFile = path.join(this.sessionPath, 'session.json');
            const data = await fs.readFile(sessionFile, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            logger.warn('No existing session found');
            return null;
        }
    }

    async clearSession() {
        try {
            await fs.rm(this.sessionPath, { recursive: true, force: true });
            await fs.mkdir(this.sessionPath, { recursive: true });
            logger.info('🗑️ Session cleared');
            return true;
        } catch (error) {
            logger.error(`Failed to clear session: ${error.message}`);
            return false;
        }
    }

    async updateModelOverride(modelName) {
        const session = await this.loadSession() || {};
        session.modelOverride = modelName;
        session.lastUpdated = new Date().toISOString();
        await this.saveSession(session);
        logger.info(`🔄 Model override updated: ${modelName}`);
        return true;
    }

    async getModelOverride() {
        const session = await this.loadSession();
        return session?.modelOverride || null;
    }

    async getConversationHistory(phoneNumber) {
        const session = await this.loadSession() || {};
        return session.conversations?.[phoneNumber] || [];
    }

    async saveConversationHistory(phoneNumber, messages) {
        const session = await this.loadSession() || {};
        if (!session.conversations) session.conversations = {};
        session.conversations[phoneNumber] = messages.slice(-50);
        session.lastUpdated = new Date().toISOString();
        await this.saveSession(session);
        return true;
    }
}

async function saveSession(sessionPath, data) {
    const manager = new SessionManager(sessionPath);
    return await manager.saveSession(data);
}

async function loadSession(sessionPath) {
    const manager = new SessionManager(sessionPath);
    return await manager.loadSession();
}

async function clearSession(sessionPath) {
    const manager = new SessionManager(sessionPath);
    return await manager.clearSession();
}

module.exports = {
    saveSession,
    loadSession,
    clearSession,
    SessionManager
};
