import { create } from 'zustand';
import { protectedApi } from '../lib/al/axios';

export interface IDeliveryAddress {
   id: string;
   user_id: string;
   address: string;
   phone_number: string;
   is_primary: boolean;
   notes?: string;
   created_at: string;
   updated_at: string;
}

interface DeliveryAddressState {
   addresses: IDeliveryAddress[];
   isLoading: boolean;
   error: string | null;

   // Actions
   fetchAddresses: (params?: any) => Promise<any>;
   createAddress: (data: Partial<IDeliveryAddress>) => Promise<any>;
   updateAddress: (id: string, data: Partial<IDeliveryAddress>) => Promise<any>;
   deleteAddress: (id: string) => Promise<any>;
   setPrimary: (id: string) => Promise<any>;
}

const useDeliveryAddressStore = create<DeliveryAddressState>((set) => ({
   addresses: [],
   isLoading: false,
   error: null,

   fetchAddresses: async (params) => {
      set({ isLoading: true, error: null });
      try {
         const res = await protectedApi.get('/my-addresses', { params });
         const data = res.data?.data?.data || res.data?.data || [];
         set({ addresses: data });
         return res.data;
      } catch (err: any) {
         set({ error: err.message });
         throw err;
      } finally {
         set({ isLoading: false });
      }
   },

   createAddress: async (data) => {
      const res = await protectedApi.post('/my-addresses', data);
      return res.data;
   },

   updateAddress: async (id, data) => {
      const res = await protectedApi.patch(`/my-addresses/${id}`, data);
      return res.data;
   },

   deleteAddress: async (id) => {
      const res = await protectedApi.delete(`/my-addresses/${id}`);
      return res.data;
   },

   setPrimary: async (id) => {
      const res = await protectedApi.patch(`/my-addresses/${id}/set-primary`);
      return res.data;
   },
}));

export default useDeliveryAddressStore;
