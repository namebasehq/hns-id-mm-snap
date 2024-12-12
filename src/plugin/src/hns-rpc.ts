export class HandshakeRPC {
    private readonly baseUrl: string;
    private readonly apiKey: string;
  
    constructor(baseUrl: string, apiKey: string) {
      this.baseUrl = baseUrl;
      this.apiKey = apiKey;
    }
  
    private async request(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
      const headers: HeadersInit = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };
  
      const options: RequestInit = {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      };
  
      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      if (!response.ok) {
        throw new Error(`HNS RPC Error: ${response.status} ${response.statusText}`);
      }
  
      return response.json();
    }
  
    async getAddressInfo(address: string): Promise<{
      balance: number;
      unconfirmedBalance: number;
      txCount: number;
    }> {
      const data = await this.request(`/address/${address}`);
      return {
        balance: data.balance / 1e6,
        unconfirmedBalance: data.unconfirmed / 1e6,
        txCount: data.tx_count
      };
    }
  
    async getBlock(hash: string): Promise<any> {
      return this.request(`/block/${hash}`);
    }
  
    async getBestBlockHash(): Promise<string> {
      return this.request('/chain/tip');
    }
  
    async getMempool(): Promise<Array<string>> {
      return this.request('/mempool');
    }
  
    async broadcastTx(rawTx: string): Promise<string> {
      return this.request('/broadcast', 'POST', { tx: rawTx });
    }
  
    async getAddressHistory(address: string, limit: number = 10): Promise<any[]> {
      return this.request(`/address/${address}/history?limit=${limit}`);
    }
  
    async getFeeEstimate(blocks: number = 1): Promise<number> {
      const data = await this.request(`/fee?blocks=${blocks}`);
      return data.rate;
    }
  
    async getName(name: string): Promise<any> {
      return this.request(`/name/${name}`);
    }

    async getAddressUTXOs(address: string): Promise<Array<{
      hash: string;      // Transaction hash
      index: number;     // Output index in the transaction
      address: string;   // Address that owns this UTXO
      value: number;     // Amount in HNS (converted from dollaritos/mHNS)
      height: number;    // Block height where this UTXO was created
      coinbase: boolean; // Whether this is a coinbase (mining reward) transaction
    }>> {
      const data = await this.request(`/coin/address/${address}`);
      
      return data.map((utxo: any) => ({
        hash: utxo.hash,
        index: utxo.index,
        address: utxo.address,
        value: utxo.value / 1e6, // Convert from dollaritos to HNS
        height: utxo.height,
        coinbase: utxo.coinbase || false
      }));
    }
  }