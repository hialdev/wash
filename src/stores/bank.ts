import { create } from 'zustand';
import { protectedApi } from '../lib/al/axios';

export interface IBank {
   id: string;
   bank_name?: string;
   account_number?: string;
   account_owner?: string;
   description?: string;
   logo?: string;
   is_active: boolean;
   is_qris?: boolean;
   qris_image?: string;
   created_at: string;
   updated_at: string;
}

interface BankState {
   banks: IBank[];
   isLoading: boolean;
   error: string | null;

   // Actions
   fetchBanks: (params?: any) => Promise<any>;
   getBank: (id: string) => Promise<any>;
   createBank: (data: FormData) => Promise<any>;
   updateBank: (id: string, data: FormData) => Promise<any>;
   deleteBank: (id: string) => Promise<any>;
}

const useBankStore = create<BankState>((set) => ({
   banks: [],
   isLoading: false,
   error: null,

   fetchBanks: async (params) => {
      set({ isLoading: true, error: null });
      try {
         const res = await protectedApi.get('/banks', { params });
         const data = res.data?.data?.data || res.data?.data || [];
         set({ banks: data });
         return res.data;
      } catch (err: any) {
         set({ error: err.message });
         throw err;
      } finally {
         set({ isLoading: false });
      }
   },

   getBank: async (id) => {
      const res = await protectedApi.get(`/banks/${id}`);
      return res.data;
   },

   createBank: async (data) => {
      const res = await protectedApi.post('/banks', data, {
         headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
   },

   updateBank: async (id, data) => {
      const res = await protectedApi.post(`/banks/${id}`, data, {
         headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
   },

   deleteBank: async (id) => {
      const res = await protectedApi.delete(`/banks/${id}`);
      return res.data;
   },
}));

export default useBankStore;
