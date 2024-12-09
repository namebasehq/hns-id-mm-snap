import { useState, useEffect } from 'react';
import { LogLevel, type LogEntry, setupLogListener } from './logger';

interface SerializedLogEntry {
  timestamp: number;
  level: string;
  message: string;
  context?: unknown;
}

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: {
        method: string;
        params?: any;
      }) => Promise<any>;
    };
  }
}

const App: React.FC = () => {
  const [status, setStatus] = useState('Checking MetaMask installation...');
  const [isFlaskInstalled, setIsFlaskInstalled] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const snapId = 'local:http://localhost:8080';
  const flaskInstallUrl = 'https://chromewebstore.google.com/detail/metamask-flask-developmen/ljfoeinjpaedjfecbmggjgodbgkmjkjk';

  useEffect(() => {
    checkMetaMaskFlask();
    setupLogListener((logEntry: LogEntry) => {
      setLogs(prevLogs => [...prevLogs, logEntry].slice(-1000));
    });
  }, []);

  const parseLogLevel = (level: string): LogLevel => {
    switch (level.toUpperCase()) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  };

  const processSnapLogs = (response: any) => {
    if (response?.logs && Array.isArray(response.logs)) {
      const processedLogs: LogEntry[] = response.logs.map((log: SerializedLogEntry) => ({
        timestamp: log.timestamp,
        level: parseLogLevel(log.level),
        message: log.message,
        context: log.context || undefined
      }));
      setLogs(prevLogs => {
        // Merge logs, remove duplicates, and keep the most recent 1000
        const newLogs = [...prevLogs, ...processedLogs];
        const uniqueLogs = Array.from(
          new Map(newLogs.map(log => [log.timestamp + log.message, log])).values()
        );
        return uniqueLogs
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-1000);
      });
    }
  };

  const enableSnapNotifications = async () => {
    try {
      const getSnapResponse = await window.ethereum?.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: snapId,
          request: {
            method: 'getSnap'
          }
        }
      });
      processSnapLogs(getSnapResponse);
      
      const notifyResponse = await window.ethereum?.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: snapId,
          request: {
            method: 'notify'
          }
        }
      });
      processSnapLogs(notifyResponse);
    } catch (error) {
      console.warn('Error enabling notifications:', error);
    }
  };

  const refreshLogs = async () => {
    try {
      await enableSnapNotifications();
    } catch (error) {
      console.warn('Error refreshing logs:', error);
    }
  };

  const checkMetaMaskFlask = async () => {
    try {
      if (!window.ethereum?.isMetaMask) {
        setStatus('MetaMask not detected');
        setIsFlaskInstalled(false);
        return;
      }

      const clientVersion = await window.ethereum.request({
        method: 'web3_clientVersion'
      });

      const isFlask = clientVersion.toLowerCase().includes('flask');
      
      if (isFlask) {
        setIsFlaskInstalled(true);
        setStatus('MetaMask Flask detected');
      } else {
        setIsFlaskInstalled(false);
        setStatus('Please install MetaMask Flask');
      }
    } catch (err) {
      setIsFlaskInstalled(false);
      setStatus('Error checking MetaMask version');
    }
  };

  const connectSnap = async () => {
    try {
      await window.ethereum?.request({
        method: 'wallet_requestSnaps',
        params: {
          [snapId]: {},
        },
      });
      await enableSnapNotifications();
      setStatus('Snap connected successfully!');
    } catch (err) {
      setStatus(`Failed to connect snap: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const getLogColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG: return 'text-gray-500';
      case LogLevel.INFO: return 'text-blue-500';
      case LogLevel.WARN: return 'text-yellow-500';
      case LogLevel.ERROR: return 'text-red-500';
      default: return 'text-gray-700';
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
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6">MetaMask Snap Installer</h1>
          
          <div className="mb-6">
            <div className="text-gray-700 mb-2">Status: {status}</div>
          </div>

          <div className="space-y-4">
            {!isFlaskInstalled && (
              <a
                href={flaskInstallUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-yellow-500 text-white text-center px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
              >
                Install MetaMask Flask
              </a>
            )}
            
            {isFlaskInstalled && (
              <button
                onClick={connectSnap}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                Connect Snap
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Snap Logs</h2>
            <button
              onClick={refreshLogs}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded transition-colors"
            >
              Refresh Logs
            </button>
          </div>
          <div className="h-96 overflow-y-auto font-mono text-sm bg-gray-50 rounded-lg">
            {logs.map((log, index) => (
              <div 
                key={index} 
                className={`p-2 border-l-4 ${getLogBorder(log.level)} hover:bg-gray-100`}
              >
                <span className="text-gray-500">
                  {new Date(log.timestamp).toISOString()}
                </span>
                <span className={`ml-2 font-semibold ${getLogColor(log.level)}`}>
                  [{log.level}]
                </span>
                <span className="ml-2">{log.message}</span>
                {log.context && (
                  <pre className="mt-1 pl-4 text-xs text-gray-600 overflow-x-auto">
                    {JSON.stringify(log.context, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;