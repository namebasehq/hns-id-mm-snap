export const chainInfo: { [key: string]: { coinType: number; chainId: number, name: string } } = {
    "eip155:1": { coinType: 60, chainId: 1, name: "Ethereum" }, // Ethereum Mainnet
    "eip155:56": { coinType: 714, chainId: 56, name: "Binance Smart Chain" }, // Binance Smart Chain
    "eip155:137": { coinType: 966, chainId: 137, name: "Polygon" }, // Polygon
    "eip155:250": { coinType: 1007, chainId: 250, name: "Fantom" }, // Fantom
    "eip155:1088": { coinType: 1088, chainId: 1088, name: "Metis" }, // Metis
    "eip155:1284": { coinType: 1284, chainId: 1284, name: "Moonbeam" }, // Moonbeam
    "eip155:1285": { coinType: 1285, chainId: 1285, name: "Moonriver" }, // Moonriver
    "eip155:1313161554": { coinType: 1313161554, chainId: 1313161554, name: "Aurora" }, // Aurora
    "eip155:43114": { coinType: 9000, chainId: 43114, name: "Avalanche" }, // Avalanche C-Chain
    "eip155:8217": { coinType: 8217, chainId: 8217, name: "Klaytn" }, // Klaytn
    "eip155:42220": { coinType: 52752, chainId: 42220, name: "Celo" }, // Celo
    "eip155:100": { coinType: 700, chainId: 100, name: "Gnosis" }, // Gnosis (xDai)
    "eip155:10": { coinType: 614, chainId: 10, name: "Optimism" }, // Optimism
    "eip155:42161": { coinType: 9001, chainId: 42161, name: "Arbitrum" }, // Arbitrum One
    "eip155:8453": { coinType: 8453, chainId: 8453, name: "Base" } // Base
};



  export const getChainInfoByCoinType = (searchCoinType: number) => {
    // Find the first entry where coinType matches
    const entry = Object.entries(chainInfo).find(([_, info]) => info.coinType === searchCoinType);
    
    if (!entry) {
        return null;
    }

    const [key, info] = entry;
    return {
        ...info,
        key // Include the original key (e.g., "eip155:1")
    };
};