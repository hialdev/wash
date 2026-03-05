import { create } from 'zustand';
import { protectedApi, api } from '../lib/al/axios';

export interface IVoucher {
   id: string;
   code: string;
   description?: string;
   discount_type: 'percentage' | 'nominal';
   discount_value: number;
   max_discount?: number;
   min_purchase?: number;
   is_public: boolean;
   is_active: boolean;
   quota?: number;
   used_count: number;
   valid_from?: string;
   valid_until?: string;
   created_at: string;
   updated_at: string;
}

interface VoucherState {
   vouchers: IVoucher[];
   isLoading: boolean;
   error: string | null;

   // Actions
   fetchVouchers: (params?: any) => Promise<any>;
   getVoucher: (id: string) => Promise<any>;
   createVoucher: (data: any) => Promise<any>;
   updateVoucher: (id: string, data: any) => Promise<any>;
   deleteVoucher: (id: string) => Promise<any>;
   validateVoucher: (code: string, totalPurchase: number) => Promise<any>;
}

const useVoucherStore = create<VoucherState>((set) => ({
   vouchers: [],
   isLoading: false,
   error: null,

   fetchVouchers: async (params) => {
      set({ isLoading: true, error: null });
      try {
         const res = await protectedApi.get('/vouchers', { params });
         set({ vouchers: res.data.data || [] });
         return res.data;
      } catch (err: any) {
         set({ error: err.message });
         throw err;
      } finally {
         set({ isLoading: false });
      }
   },

   getVoucher: async (id) => {
      const res = await protectedApi.get(`/vouchers/${id}`);
      return res.data;
   },

   createVoucher: async (data: any) => {
      const res = await protectedApi.post('/vouchers', data);
      return res.data;
   },

   updateVoucher: async (id: string, data: any) => {
      const res = await protectedApi.post(`/vouchers/${id}`, data);
      return res.data;
   },

   deleteVoucher: async (id: string) => {
      const res = await protectedApi.delete(`/vouchers/${id}`);
      return res.data;
   },

   validateVoucher: async (code: string, totalPurchase: number) => {
      // Intentionally use protectedApi so it sends JWT, but this logic can vary
      const res = await protectedApi.post('/vouchers/validate', {
         code,
         total_purchase: totalPurchase,
      });
      return res.data;
   },
}));

export default useVoucherStore;
