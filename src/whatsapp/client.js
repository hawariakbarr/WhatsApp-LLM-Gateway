const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { logger } = require('../utils/logger');
const { handleMessage } = require('./handlers');
const { saveSession, loadSession, clearSession } = require('./session');
const path = require('path');
const EventEmitter = require('events');

class WhatsAppClient extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.sock = null;
        this.isConnected = false;
        this.sessionPath = path.join(process.cwd(), config.gateway.sessionStore || './sessions');
    }

    async connect() {
        try {
            logger.info('📱 Starting WhatsApp connection...');
            
            const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);
            const { version } = await fetchLatestBaileysVersion();

            const createBaileysLogger = (baseLogger, moduleMeta = {}) => {
                return {
                    level: 'error',
                    error: (msg, meta = {}) => baseLogger.error(msg, { ...moduleMeta, ...meta }),
                    warn: (msg, meta = {}) => baseLogger.warn(msg, { ...moduleMeta, ...meta }),
                    info: (msg, meta = {}) => baseLogger.info(msg, { ...moduleMeta, ...meta }),
                    debug: (msg, meta = {}) => baseLogger.debug(msg, { ...moduleMeta, ...meta }),
                    trace: (msg, meta = {}) => baseLogger.debug(msg, { ...moduleMeta, ...meta }),
                    child: (childMeta) => createBaileysLogger(baseLogger, { ...moduleMeta, ...childMeta })
                };
            };

            const baileysLogger = createBaileysLogger(logger, { module: 'baileys' });

            this.sock = makeWASocket({
                version,
                auth: state,
                logger: baileysLogger,
                printQRInTerminal: false,
                browser: ['WhatsApp LLM Gateway', 'Chrome', '120.0.0.0'],
                markOnlineOnConnect: true,
                syncFullHistory: false
            });

            this.sock.ev.on('creds.update', saveCreds);

            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    logger.info('📲 Scan QR Code to link WhatsApp:');
                    qrcode.generate(qr, { small: true });
                    this.emit('qr', qr);
                }

                if (connection === 'close') {
                    this.isConnected = false;
                    const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                    
                    logger.warn(`⚠️ Connection closed. Reconnect: ${shouldReconnect}`);
                    
                    if (shouldReconnect && this.config.whatsapp.autoReconnect) {
                        setTimeout(() => this.connect(), 5000);
                    }
                } else if (connection === 'open') {
                    this.isConnected = true;
                    logger.info('✅ WhatsApp connected successfully!');
                    await saveSession(this.sessionPath, { connected: true, timestamp: new Date().toISOString() });
                    this.emit('connected');
                }
            });

            this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
                if (type !== 'notify') return;

                const message = messages[0];
                if (!message.message) return;
                if (message.key.fromMe) return;

                const phoneNumber = message.key.remoteJid;
                const messageText = message.message?.conversation || 
                                   message.message?.extendedTextMessage?.text ||
                                   message.message?.imageMessage?.caption || '';

                logger.info(`📨 Received message from ${phoneNumber}: ${messageText.substring(0, 50)}...`);
                await handleMessage(message, this.sock, this.config);
            });

            return this.sock;

        } catch (error) {
            logger.error(`❌ Connection error: ${error.message}`);
            this.emit('error', error);
            throw error;
        }
    }

    async sendMessage(to, text, options = {}) {
        if (!this.sock || !this.isConnected) {
            throw new Error('WhatsApp not connected');
        }

        try {
            const result = await this.sock.sendMessage(to, { text, ...options });
            logger.info(`✉️ Message sent to: ${to}`);
            return result;
        } catch (error) {
            logger.error(`Failed to send message: ${error.message}`);
            throw error;
        }
    }

    async disconnect() {
        if (this.sock) {
            this.sock.end(undefined);
            this.isConnected = false;
            logger.info('📴 WhatsApp disconnected');
        }
    }

    async getStatus() {
        return {
            connected: this.isConnected,
            sessionPath: this.sessionPath,
            uptime: process.uptime()
        };
    }

    async resetSession() {
        await clearSession(this.sessionPath);
        logger.info('🔄 Session reset completed');
        return true;
    }
}

if (require.main === module) {
    const { Command } = require('commander');
    const program = new Command();
    const config = require('../../config.json');

    program.name('whatsapp-client').description('WhatsApp LLM Gateway Client');

    program.command('login').description('Login to WhatsApp').action(async () => {
        const client = new WhatsAppClient(config);
        await client.connect();
    });

    program.command('status').description('Check status').action(async () => {
        const client = new WhatsAppClient(config);
        await client.connect();
        setTimeout(async () => {
            const status = await client.getStatus();
            console.log('Status:', JSON.stringify(status, null, 2));
            await client.disconnect();
            process.exit(0);
        }, 3000);
    });

    program.command('reset').description('Reset session').action(async () => {
        const client = new WhatsAppClient(config);
        await client.resetSession();
        console.log('✅ Session reset completed.');
        process.exit(0);
    });

    program.parse();
}

module.exports = WhatsAppClient;
