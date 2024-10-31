import { useState } from 'react';

declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: any;
      }) => Promise<any>;
    };
  }
}

const App: React.FC = () => {
  const [result, setResult] = useState<string>('Results will appear here...');
  const [logs, setLogs] = useState<string[]>([]);

  const snapId = 'local:http://localhost:8080';

  const connectSnap = async (): Promise<void> => {
    try {
      await window.ethereum?.request({
        method: 'wallet_requestSnaps',
        params: {
          [snapId]: {},
        },
      });
      setResult('Snap connected!');
      refreshLogs();
    } catch (err) {
      showError('Failed to connect snap', err);
    }
  };

  const sendHello = async (): Promise<void> => {
    try {
      const response = await window.ethereum?.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId,
          request: {
            method: 'hello',
          },
        },
      });
      setResult(`Response: ${response}`);
      refreshLogs();
    } catch (err) {
      showError('Failed to send hello', err);
    }
  };

  const refreshLogs = async (): Promise<void> => {
    try {
      const response = await window.ethereum?.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId,
          request: {
            method: 'getLogs',
          },
        },
      });
      setLogs(response);
    } catch (err) {
      showError('Failed to load logs', err);
    }
  };

  const clearLogs = async (): Promise<void> => {
    try {
      await window.ethereum?.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId,
          request: {
            method: 'clearLogs',
          },
        },
      });
      setLogs([]);
    } catch (err) {
      showError('Failed to clear logs', err);
    }
  };

  const showError = (message: string, error: unknown): void => {
    console.error('Error:', error);
    setResult(`${message}\nDetails: ${JSON.stringify(error, null, 2)}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6">Snap Test & Debug Console</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Test Controls Panel */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          <div className="flex flex-wrap gap-4 mb-4">
            <button
              onClick={connectSnap}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Connect Snap
            </button>
            <button
              onClick={sendHello}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Send Hello
            </button>
            <button
              onClick={refreshLogs}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
              Refresh Logs
            </button>
            <button
              onClick={clearLogs}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Clear Logs
            </button>
          </div>
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            {result}
          </div>
        </div>
        {/* Debug Logs Panel */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
          <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-80 overflow-y-auto">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="border-b border-gray-300 py-2">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-gray-500">No logs available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
