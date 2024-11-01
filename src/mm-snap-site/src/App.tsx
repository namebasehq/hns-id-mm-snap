import { useState, useEffect } from 'react';

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
  const [status, setStatus] = useState<string>('Checking MetaMask installation...');
  const [isFlaskInstalled, setIsFlaskInstalled] = useState<boolean>(false);
  
  const snapId = 'local:http://localhost:8080';
  const flaskInstallUrl = 'https://chromewebstore.google.com/detail/metamask-flask-developmen/ljfoeinjpaedjfecbmggjgodbgkmjkjk';

  useEffect(() => {
    checkMetaMaskFlask();
  }, []);

  const checkMetaMaskFlask = async (): Promise<void> => {
    try {
      // Check if MetaMask is installed at all
      if (!window.ethereum?.isMetaMask) {
        setStatus('MetaMask not detected');
        setIsFlaskInstalled(false);
        return;
      }

      // Get provider version info
      const clientVersion = await window.ethereum.request({
        method: 'web3_clientVersion'
      });

      // Check if it's Flask by looking for "flask" in the version string
      const isFlask = clientVersion.toLowerCase().includes('flask');
      
      if (isFlask) {
        setIsFlaskInstalled(true);
        setStatus('MetaMask Flask detected');
      } else {
        setIsFlaskInstalled(false);
        setStatus('Please install MetaMask Flask (current installation is regular MetaMask)');
      }
    } catch (err) {
      setIsFlaskInstalled(false);
      setStatus('Error checking MetaMask version');
    }
  };

  const connectSnap = async (): Promise<void> => {
    try {
      await window.ethereum?.request({
        method: 'wallet_requestSnaps',
        params: {
          [snapId]: {},
        },
      });
      setStatus('Snap connected successfully!');
    } catch (err) {
      setStatus(`Failed to connect snap: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-md p-6">
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
    </div>
  );
};

export default App;