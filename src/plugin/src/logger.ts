declare const snap: {
    request: (args: { method: string; params: any }) => Promise<any>;
  };
  
  export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
  }
  
  export interface LogEntry {
    timestamp: number;
    level: LogLevel;
    message: string;
    context?: Record<string, unknown>;
  }
  
  export class SnapLogger {
    private static instance: SnapLogger;
    private logs: LogEntry[] = [];
    private readonly maxLogs: number = 1000;
  
    private constructor() {}
  
    public static getInstance(): SnapLogger {
      if (!SnapLogger.instance) {
        SnapLogger.instance = new SnapLogger();
      }
      return SnapLogger.instance;
    }
  
    private createLogEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
      return {
        timestamp: Date.now(),
        level,
        message,
        context,
      };
    }
  
    private async sendToCompanion(entry: LogEntry): Promise<void> {
      try {
        await snap.request({
          method: 'snap_notify',
          params: {
            type: 'inApp',
            message: JSON.stringify({
              type: 'SNAP_LOG',
              payload: entry,
            }),
          },
        });
      } catch (error) {
        console.error('Failed to send log to companion:', error);
      }
    }
  
    private addLog(entry: LogEntry): void {
      this.logs.push(entry);
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
      this.sendToCompanion(entry);
    }
  
    public debug(message: string, context?: Record<string, unknown>): void {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
      this.addLog(entry);
    }
  
    public info(message: string, context?: Record<string, unknown>): void {
      const entry = this.createLogEntry(LogLevel.INFO, message, context);
      this.addLog(entry);
    }
  
    public warn(message: string, context?: Record<string, unknown>): void {
      const entry = this.createLogEntry(LogLevel.WARN, message, context);
      this.addLog(entry);
    }
  
    public error(message: string, context?: Record<string, unknown>): void {
      const entry = this.createLogEntry(LogLevel.ERROR, message, context);
      this.addLog(entry);
    }
  
    public getLogs(): LogEntry[] {
      return [...this.logs];
    }
  
    public clearLogs(): void {
      this.logs = [];
    }
  }