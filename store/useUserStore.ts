// store/useUserStore.ts
import { create } from 'zustand';

interface UserState {
  balance: number;
  country: string | null;
  setBalance: (amount: number) => void;
  setCountry: (country: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
  balance: 0.00,
  country: null,
  setBalance: (amount) => set({ balance: amount }),
  setCountry: (country) => set({ country }),
}));
