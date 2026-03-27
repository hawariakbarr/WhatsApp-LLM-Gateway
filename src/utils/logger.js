const winston = require('winston');
const path = require('path');
const fs = require('fs');

const logDir = path.join(process.cwd(), 'logs');

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const baileysLoggerLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
        trace: 4
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        debug: 'blue',
        trace: 'cyan'
    }
};

const baseLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels: baileysLoggerLevels.levels,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'whatsapp-llm-gateway' },
    transports: [
        new winston.transports.File({ 
            filename: path.join(logDir, 'error.log'), 
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5
        }),
        new winston.transports.File({ 
            filename: path.join(logDir, 'combined.log'),
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    baseLogger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize({ all: true, colors: baileysLoggerLevels.colors }),
            winston.format.printf(({ level, message, timestamp, service, module, ...metadata }) => {
                let msg = `${timestamp} [${service}] ${level}: ${message}`;
                if (module) msg += ` (module: ${module})`;
                if (Object.keys(metadata).length > 0) {
                    msg += ` ${JSON.stringify(metadata)}`;
                }
                return msg;
            })
        )
    }));
}

function createBaileysLogger(logger) {
    const baileysLogger = {
        level: 'info',
        error: (msg, meta = {}) => logger.error(msg, { ...meta }),
        warn: (msg, meta = {}) => logger.warn(msg, { ...meta }),
        info: (msg, meta = {}) => logger.info(msg, { ...meta }),
        debug: (msg, meta = {}) => logger.debug(msg, { ...meta }),
        trace: (msg, meta = {}) => logger.debug(msg, { ...meta })
    };
    
    baileysLogger.child = (childMeta) => {
        return createBaileysLogger(logger.child(childMeta));
    };
    
    return baileysLogger;
}

const logger = createBaileysLogger(baseLogger);

module.exports = { logger };
