import { create } from 'zustand';
import { protectedApi } from 'src/lib/al/axios';
import dayjs from 'dayjs';
import { Journal, JournalInput } from '../types/journal';

interface JournalState {
   journals: Journal[];
   total: number;
   loading: boolean;

   // Actions
   getAll: (params?: any) => Promise<void>;
   detail: (id: string) => Promise<Journal>;
   add: (input: JournalInput) => Promise<void>;
   addBatch: (inputs: any[]) => Promise<void>;
   delete: (id: string) => Promise<void>;
}

const useJournalStore = create<JournalState>((set, get) => ({
   journals: [],
   total: 0,
   loading: false,

   getAll: async (params) => {
      set({ loading: true });
      try {
         const response = await protectedApi.get('/journals', { params });
         // Check "status" or "success". The backend sends "status": "ok".
         // Assuming response.data.success is a helper property or we should check response.data.status === 'ok'.
         // But sticking to existing pattern if possible.
         // Actually the backend sends: utils.RespApi(c, "ok", ...)
         // Let's assume response.data has { status, message, data }.

         // Fix: Access nested data properly
         if (response.data && response.data.data) {
            // The backend returns a map with "data" and "count" INSIDE the main data payload
            set({
               journals: response.data.data.data || [],
               total: response.data.data.count || 0,
            });
         }
      } catch (error) {
         console.error('Failed to fetch journals:', error);
         set({ journals: [] });
      } finally {
         set({ loading: false });
      }
   },

   addBatch: async (inputs: any[]) => {
      set({ loading: true });
      try {
         const formData = new FormData();

         const jsonEntries = inputs.map((input) => ({
            trx_date: dayjs(input.trx_date).format('YYYY-MM-DD'),
            trx_type: input.trx_type,
            trx_category: input.trx_category,
            amount: Number(input.amount),
            notes: input.notes || '',
         }));

         formData.append('json_data', JSON.stringify(jsonEntries));

         inputs.forEach((input, index) => {
            if (input.attachments && input.attachments.length > 0) {
               input.attachments.forEach((file: File) => {
                  formData.append(`attachments_${index}`, file);
               });
            }
         });

         await protectedApi.post('/journals/batch', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
         });
         await get().getAll();
      } finally {
         set({ loading: false });
      }
   },

   detail: async (id) => {
      set({ loading: true });
      try {
         const response = await protectedApi.get(`/journals/${id}`);
         return response.data.data;
      } finally {
         set({ loading: false });
      }
   },

   add: async (input) => {
      set({ loading: true });
      try {
         const formData = new FormData();
         formData.append('trx_date', input.trx_date);
         formData.append('trx_type', input.trx_type);
         formData.append('trx_category', input.trx_category);
         formData.append('amount', input.amount.toString());
         formData.append('notes', input.notes);

         if (input.attachments) {
            input.attachments.forEach((file) => {
               formData.append('attachments', file);
            });
         }

         await protectedApi.post('/journals', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
         });
         await get().getAll(); // Refresh list
      } finally {
         set({ loading: false });
      }
   },

   delete: async (id) => {
      set({ loading: true });
      try {
         await protectedApi.delete(`/journals/${id}`);
         await get().getAll(); // Refresh list
      } finally {
         set({ loading: false });
      }
   },
}));

export default useJournalStore;
