import { create } from 'zustand';

import type { ProcessingDataResponse, ProcessOrderRequest } from 'src/types/order-processing';

import { protectedApi } from '../lib/al/axios';

// ----------------------------------------------------------------------

type OrderProcessingStore = {
   processingData: ProcessingDataResponse | null;
   loading: boolean;
   getProcessingData: (orderId: string) => Promise<any>;
   processOrder: (orderId: string, data: ProcessOrderRequest) => Promise<any>;
   reset: () => void;
};

const useOrderProcessingStore = create<OrderProcessingStore>((set) => ({
   processingData: null,
   loading: false,

   getProcessingData: async (orderId: string) => {
      set({ loading: true });
      try {
         const response = await protectedApi.get(`/orders/${orderId}/processing-data`);
         if (response.data.success) {
            set({ processingData: response.data.data, loading: false });
         }
         return response.data;
      } catch (error) {
         set({ loading: false });
         throw error;
      }
   },

   processOrder: async (orderId: string, data: ProcessOrderRequest) => {
      set({ loading: true });
      try {
         const response = await protectedApi.post(`/orders/${orderId}/process`, data);
         set({ loading: false });
         return response.data;
      } catch (error) {
         set({ loading: false });
         throw error;
      }
   },

   reset: () => set({ processingData: null, loading: false }),
}));

export default useOrderProcessingStore;
