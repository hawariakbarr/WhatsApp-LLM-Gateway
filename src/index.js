require('dotenv').config();
const WhatsAppClient = require('./whatsapp/client');
const { logger } = require('./utils/logger');
const config = require('../config.json');
const express = require('express');

class Gateway {
    constructor() {
        this.whatsapp = null;
        this.app = express();
        this.config = config;
    }

    async start() {
        try {
            logger.info('🚀 Starting WhatsApp LLM Gateway...');
            
            // Setup Express API
            this.setupAPI();

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

    setupAPI() {
        this.app.use(express.json());

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', uptime: process.uptime() });
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
            res.json({ models: status });
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
