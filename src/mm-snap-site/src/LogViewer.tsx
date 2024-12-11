import { useEffect, useRef } from 'react';
import { LogLevel, type LogEntry } from './logger';

interface LogViewerProps {
  logs: LogEntry[];
}

const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG: return 'text-gray-500';
      case LogLevel.INFO: return 'text-blue-500';
      case LogLevel.WARN: return 'text-yellow-500';
      case LogLevel.ERROR: return 'text-red-500';
      default: return 'text-gray-700';
    }
  };

  const getLogBackground = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG: return 'bg-gray-50';
      case LogLevel.INFO: return 'bg-blue-50';
      case LogLevel.WARN: return 'bg-yellow-50';
      case LogLevel.ERROR: return 'bg-red-50';
      default: return 'bg-gray-50';
    }
  };

  const getLogBorder = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG: return 'border-l-gray-500';
      case LogLevel.INFO: return 'border-l-blue-500';
      case LogLevel.WARN: return 'border-l-yellow-500';
      case LogLevel.ERROR: return 'border-l-red-500';
      default: return 'border-l-gray-700';
    }
  };

  return (
    <div 
      ref={logContainerRef}
      className="h-96 overflow-y-auto font-mono text-sm bg-gray-50 rounded-lg shadow-inner"
    >
      {logs.map((log, index) => (
        <div 
          key={`${log.timestamp}-${index}`}
          className={`p-3 border-l-4 ${getLogBorder(log.level)} ${getLogBackground(log.level)} 
            transition-colors duration-200 ease-in-out hover:brightness-95`}
        >
          <div className="flex items-start gap-2">
            <span className="text-gray-500 text-xs whitespace-nowrap">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span className={`font-semibold ${getLogColor(log.level)} text-xs uppercase`}>
              {log.level}
            </span>
            <span className="text-gray-800">{log.message}</span>
          </div>
          {log.context && (
            <pre className="mt-2 p-2 text-xs text-gray-600 overflow-x-auto bg-white/50 rounded">
              {JSON.stringify(log.context, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
};

export default LogViewer;