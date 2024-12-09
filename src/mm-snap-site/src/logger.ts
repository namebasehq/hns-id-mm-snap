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
  
  export type LogListener = (entry: LogEntry) => void;
  

export const setupLogListener = (onLog: (entry: LogEntry) => void) => {
    window.addEventListener('message', (event) => {
      if (
        event.origin === window.location.origin && 
        event.data?.type === 'SNAP_LOG'
      ) {
        onLog(event.data.payload);
      }
    });
  };