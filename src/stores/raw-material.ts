import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { protectedApi } from 'src/lib/al/axios';
import type { RawMaterial } from 'src/types/raw-material';

interface RawMaterialState {
   rawMaterials: RawMaterial[];
   all: (params?: any) => Promise<any>;
   getAll: () => Promise<RawMaterial[]>;
   detail: (params: { id: string }) => Promise<RawMaterial | null>;
   add: (params: { data: FormData }) => Promise<any>;
   update: (params: { id: string; data: FormData }) => Promise<any>;
   delete: (params: { id: string }) => Promise<any>;
}

const useRawMaterialStore = create<RawMaterialState>()(
   persist(
      (set) => ({
         rawMaterials: [],

         all: async (params?: any) => {
            try {
               const res = await protectedApi.get('/raw-materials', { params });
               set({ rawMaterials: res.data?.data?.raw_materials ?? [] });
               return res.data;
            } catch (err) {
               console.error('RawMaterial all error:', err);
               throw err;
            }
         },

         getAll: async () => {
            try {
               const res = await protectedApi.get('/raw-materials', { params: { limit: 1000 } });
               const items: RawMaterial[] = res.data?.data?.raw_materials ?? [];
               set({ rawMaterials: items });
               return items;
            } catch (err) {
               console.error('RawMaterial getAll error:', err);
               return [];
            }
         },

         detail: async ({ id }) => {
            try {
               const res = await protectedApi.get(`/raw-materials/${id}`);
               return res.data?.data ?? null;
            } catch (err) {
               console.error('RawMaterial detail error:', err);
               return null;
            }
         },

         add: async ({ data }) => {
            const res = await protectedApi.post('/raw-materials', data, {
               headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data;
         },

         update: async ({ id, data }) => {
            const res = await protectedApi.post(`/raw-materials/${id}`, data, {
               headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data;
         },

         delete: async ({ id }) => {
            const res = await protectedApi.delete(`/raw-materials/${id}`);
            return res.data;
         },
      }),
      {
         name: 'raw-material-store',
         partialize: (state) => ({ rawMaterials: state.rawMaterials }),
      }
   )
);

export default useRawMaterialStore;
