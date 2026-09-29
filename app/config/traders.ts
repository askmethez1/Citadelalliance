export interface MasterTrader {
  id: string;
  name: string;
  strategy: string;
  avatar: string;
  winRate?: number;
  monthlyReturn?: number;
  riskScore?: number;
  copiers?: number;
  aum?: string;
}

export const TRADERS: MasterTrader[] = [
  { 
    id: 't1', 
    name: 'Alex Quant', 
    strategy: 'Quantitative Momentum', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    winRate: 84,
    monthlyReturn: 18.5,
    riskScore: 4,
    copiers: 1204,
    aum: '$4.2M'
  },
  { 
    id: 't2', 
    name: 'Elena Algo', 
    strategy: 'High-Frequency Arbitrage', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
    winRate: 91,
    monthlyReturn: 12.2,
    riskScore: 2,
    copiers: 3420,
    aum: '$12.5M'
  },
  { 
    id: 't3', 
    name: 'Marcus Macro', 
    strategy: 'Global Macro FX', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
    winRate: 72,
    monthlyReturn: 24.8,
    riskScore: 7,
    copiers: 890,
    aum: '$2.1M'
  },
];