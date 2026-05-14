import { create } from 'zustand';
import { protectedApi } from 'src/lib/al/axios';

// ----------------------------------------------------------------------

export interface OrderProcessLog {
   id: string;
   order_id: string;
   process_type: string;
   description?: string;
   images?: string; // JSON string of URL array
   created_by?: { id: string; name: string };
   created_at: string;
   updated_at?: string;
}

interface OrderProcessLogState {
   logs: OrderProcessLog[];
   loading: boolean;

   getLogs: (orderId: string) => Promise<any>;
   getUserLogs: (orderId: string) => Promise<any>;
   addLog: (orderId: string, formData: FormData) => Promise<any>;
   finishOrder: (orderId: string) => Promise<any>;
   reset: () => void;
}

const useOrderProcessLogStore = create<OrderProcessLogState>((set) => ({
   logs: [],
   loading: false,

   getLogs: async (orderId) => {
      set({ loading: true });
      try {
         const res = await protectedApi.get(`/orders/${orderId}/process-log`);
         if (res.data.success) {
            set({ logs: res.data.data || [] });
         }
         return res.data;
      } finally {
         set({ loading: false });
      }
   },

   getUserLogs: async (orderId) => {
      set({ loading: true });
      try {
         const res = await protectedApi.get(`/user/my-orders/${orderId}/process-log`);
         if (res.data.success) {
            set({ logs: res.data.data || [] });
         }
         return res.data;
      } finally {
         set({ loading: false });
      }
   },

   addLog: async (orderId, formData) => {
      set({ loading: true });
      try {
         const res = await protectedApi.post(`/orders/${orderId}/process-log`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
         });
         if (res.data.success) {
            // Append new log to list
            set((state) => ({ logs: [...state.logs, res.data.data] }));
         }
         return res.data;
      } finally {
         set({ loading: false });
      }
   },

   finishOrder: async (orderId) => {
      set({ loading: true });
      try {
         const res = await protectedApi.post(`/orders/${orderId}/finish`);
         return res.data;
      } finally {
         set({ loading: false });
      }
   },

   reset: () => set({ logs: [], loading: false }),
}));

export default useOrderProcessLogStore;
