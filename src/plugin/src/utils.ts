export const chainInfo: { [key: string]: { coinType: number; chainId: number, name: string } } = {
    "eip155:1": { coinType: 60, chainId: 1, name: "Ethereum" }, // Ethereum Mainnet
    "eip155:10": { coinType: 614, chainId: 10, name: "Optimism" }, // Optimism
    "eip155:137": { coinType: 966, chainId: 137, name: "Polygon" }, // Polygon
    "eip155:43114": { coinType: 9000, chainId: 43114, name: "Avalanche" }, // Avalanche
    "eip155:42161": { coinType: 9001, chainId: 42161, name: "Arbitrum" }, // Arbitrum
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