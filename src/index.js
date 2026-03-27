require('dotenv').config();
const WhatsAppClient = require('./whatsapp/client');
const { logger } = require('./utils/logger');
const { getConfigLoader } = require('./utils/config-loader');
const config = require('../config.json');
const express = require('express');

class Gateway {
    constructor() {
        this.whatsapp = null;
        this.app = express();
        this.config = config;
        this.agentConfig = null;
    }

    async start() {
        try {
            logger.info('🚀 Starting WhatsApp LLM Gateway...');
            
            // Load agent configurations
            const configLoader = getConfigLoader();
            this.agentConfig = await configLoader.load();
            logger.info('✅ Agent configurations loaded');
            
            // Setup Express API
            this.setupAPI(configLoader);

            // Connect WhatsApp
            if (this.config.whatsapp.enabled) {
                this.whatsapp = new WhatsAppClient(this.config);
                
                this.whatsapp.on('connected', () => {
                    logger.info('✅ Gateway ready!');
                });

                this.whatsapp.on('error', (error) => {
                    logger.error(`WhatsApp error: ${error.message}`);
                });

                await this.whatsapp.connect();
            }

            // Start HTTP server
            const port = this.config.gateway.port || 3000;
            this.app.listen(port, () => {
                logger.info(`🌐 API server running on port ${port}`);
            });

        } catch (error) {
            logger.error(`❌ Gateway startup failed: ${error.message}`);
            process.exit(1);
        }
    }

    setupAPI(configLoader) {
        this.app.use(express.json());

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                uptime: process.uptime(),
                agent: this.agentConfig?.agents?.name || 'unknown'
            });
        });

        // Agent configuration
        this.app.get('/api/agent/config', (req, res) => {
            res.json(configLoader.getConfig());
        });

        // Agent identity
        this.app.get('/api/agent/identity', (req, res) => {
            res.json({
                identity: configLoader.getIdentity(),
                personality: configLoader.getPersonality()
            });
        });

        // Reload configurations
        this.app.post('/api/agent/reload', async (req, res) => {
            try {
                await configLoader.reload();
                res.json({ success: true, message: 'Configurations reloaded' });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Update configuration
        this.app.post('/api/agent/config/:file', async (req, res) => {
            try {
                const { file } = req.params;
                const { content } = req.body;
                
                if (!file || !content) {
                    return res.status(400).json({ error: 'File and content required' });
                }
                
                const validFiles = ['AGENTS.md', 'IDENTITY.md', 'SOUL.md', 'TOOLS.md', 'USER.md'];
                if (!validFiles.includes(file)) {
                    return res.status(400).json({ error: 'Invalid file name' });
                }
                
                await configLoader.save(file, content);
                res.json({ success: true, message: `${file} updated` });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // WhatsApp status
        this.app.get('/api/whatsapp/status', async (req, res) => {
            if (!this.whatsapp) {
                return res.status(503).json({ error: 'WhatsApp not initialized' });
            }
            const status = await this.whatsapp.getStatus();
            res.json(status);
        });

        // Reset session
        this.app.post('/api/whatsapp/reset', async (req, res) => {
            if (!this.whatsapp) {
                return res.status(503).json({ error: 'WhatsApp not initialized' });
            }
            await this.whatsapp.resetSession();
            res.json({ success: true, message: 'Session reset. Please scan QR code again.' });
        });

        // Model status
        this.app.get('/api/models/status', async (req, res) => {
            const ModelRouter = require('./llm/router');
            const router = new ModelRouter(this.config);
            const status = await router.getModelStatus();
            res.json({ models: status, agent: this.agentConfig?.agents });
        });

        // Change model
        this.app.post('/api/models/set', async (req, res) => {
            const { model } = req.body;
            if (!model) {
                return res.status(400).json({ error: 'Model name required' });
            }
            
            const { SessionManager } = require('./whatsapp/session');
            const sessionManager = new SessionManager(this.config.gateway.sessionStore);
            await sessionManager.updateModelOverride(model);
            
            res.json({ success: true, model });
        });
    }

    async stop() {
        logger.info('🛑 Stopping gateway...');
        if (this.whatsapp) {
            await this.whatsapp.disconnect();
        }
        process.exit(0);
    }
}

// Start gateway
const gateway = new Gateway();
gateway.start();

// Graceful shutdown
process.on('SIGINT', () => gateway.stop());
process.on('SIGTERM', () => gateway.stop());
