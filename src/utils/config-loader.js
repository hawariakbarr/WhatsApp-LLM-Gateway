const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');

class ConfigLoader {
    constructor(agentsPath = './src/agents') {
        this.agentsPath = agentsPath;
        this.configs = new Map();
        this.cache = new Map();
        this.cacheTTL = 60000; // 1 minute cache
    }

    async load() {
        logger.info('📚 Loading agent configurations...');
        
        const files = [
            'AGENTS.md',
            'IDENTITY.md',
            'SOUL.md',
            'TOOLS.md',
            'USER.md'
        ];

        for (const file of files) {
            try {
                const filePath = path.join(this.agentsPath, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const parsed = this.parseMarkdown(content);
                this.configs.set(file, parsed);
                logger.info(`✅ Loaded ${file}`);
            } catch (error) {
                logger.warn(`⚠️ ${file} not found, using defaults`);
                this.configs.set(file, this.getDefaultConfig(file));
            }
        }

        return this.getConfig();
    }

    parseMarkdown(content) {
        // Extract YAML frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        
        if (!frontmatterMatch) {
            return {
                metadata: {},
                content: content
            };
        }

        const metadata = this.parseYAML(frontmatterMatch[1]);
        const contentBody = frontmatterMatch[2];

        return {
            metadata,
            content: contentBody,
            raw: content
        };
    }

    parseYAML(yamlString) {
        // Simple YAML parser (for basic key-value pairs)
        const result = {};
        const lines = yamlString.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            const [key, ...valueParts] = trimmed.split(':');
            if (key && valueParts.length > 0) {
                let value = valueParts.join(':').trim();
                // Remove quotes
                value = value.replace(/^["']|["']$/g, '');
                // Parse booleans
                if (value === 'true') value = true;
                if (value === 'false') value = false;
                // Parse numbers
                if (!isNaN(value) && value !== '') value = Number(value);
                
                result[key.trim()] = value;
            }
        }
        
        return result;
    }

    getDefaultConfig(file) {
        const defaults = {
            'AGENTS.md': {
                metadata: { name: 'default-agent', version: '1.0.0', enabled: true },
                content: '# Default Agent Configuration'
            },
            'IDENTITY.md': {
                metadata: { name: 'Gateway Assistant', version: '1.0.0' },
                content: '# Default Identity'
            },
            'SOUL.md': {
                metadata: { name: 'Personality', version: '1.0.0' },
                content: '# Default Personality'
            },
            'TOOLS.md': {
                metadata: { name: 'Tools', version: '1.0.0' },
                content: '# Default Tools'
            },
            'USER.md': {
                metadata: { name: 'User Preferences', version: '1.0.0' },
                content: '# Default User Preferences'
            }
        };
        
        return defaults[file] || { metadata: {}, content: '' };
    }

    getConfig() {
        const config = {};
        for (const [file, data] of this.configs.entries()) {
            const key = file.replace('.md', '').toLowerCase();
            config[key] = {
                ...data.metadata,
                content: data.content
            };
        }
        return config;
    }

    getAgentConfig() {
        return this.configs.get('AGENTS.md')?.metadata || {};
    }

    getIdentity() {
        return this.configs.get('IDENTITY.md')?.content || '';
    }

    getPersonality() {
        return this.configs.get('SOUL.md')?.content || '';
    }

    getTools() {
        return this.configs.get('TOOLS.md')?.content || '';
    }

    getUserPreferences() {
        return this.configs.get('USER.md')?.metadata || {};
    }

    async reload() {
        logger.info('🔄 Reloading configurations...');
        this.configs.clear();
        this.cache.clear();
        return await this.load();
    }

    async save(file, content) {
        const filePath = path.join(this.agentsPath, file);
        await fs.writeFile(filePath, content, 'utf-8');
        logger.info(`💾 Saved ${file}`);
        
        // Reload to update cache
        await this.load();
        return true;
    }
}

// Singleton instance
let configLoader = null;

function getConfigLoader() {
    if (!configLoader) {
        configLoader = new ConfigLoader();
    }
    return configLoader;
}

module.exports = {
    ConfigLoader,
    getConfigLoader
};
