import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Logger {
    constructor() {
        this.logFile = path.join(__dirname, '..', 'logs', 'app.log');
        this.ensureLogDirectory();
    }

    async ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        await fs.mkdir(logDir, { recursive: true });
    }

    async log(message, type = 'INFO', stack = new Error().stack) {
        const timestamp = new Date().toISOString();
        const stackTrace = stack.split('\n').slice(1).map(line => line.trim()).join('\n    ');
        const logEntry = `[${timestamp}] ${type}: ${message}\nStack Trace:\n    ${stackTrace}\n`;
        
        try {
            await fs.appendFile(this.logFile, logEntry + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    async error(message, error) {
        const stack = error?.stack || new Error().stack;
        await this.log(message + '\n' + (error?.message || ''), 'ERROR', stack);
    }

    async info(message) {
        await this.log(message, 'INFO');
    }

    async debug(message) {
        await this.log(message, 'DEBUG');
    }

    async request(req, message) {
        const reqInfo = `${req.method} ${req.url} - ${message}`;
        await this.log(reqInfo, 'REQUEST');
    }
}

export const logger = new Logger();
