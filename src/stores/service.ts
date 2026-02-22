import { create } from 'zustand';
import { protectedApi, api } from '../lib/al/axios';
import type { IService, IServiceCategory } from '../types/service';

interface ServiceState {
   services: IService[];
   categories: IServiceCategory[];
   isLoading: boolean;
   error: string | null;
   pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
   };

   // Actions
   fetchServices: (params?: any) => Promise<any>;
   fetchServiceCategories: () => Promise<any>;
   getService: (id: string) => Promise<any>;
   createService: (data: FormData) => Promise<any>;
   updateService: (id: string, data: FormData) => Promise<any>;
   deleteService: (id: string) => Promise<any>;

   createServiceCategory: (data: any) => Promise<any>;
   updateServiceCategory: (id: string, data: any) => Promise<any>;
   deleteServiceCategory: (id: string) => Promise<any>;

   fetchCatalogServices: (params?: any) => Promise<any>;
}

const useServiceStore = create<ServiceState>((set) => ({
   services: [],
   categories: [],
   isLoading: false,
   error: null,
   pagination: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
   },

   fetchServices: async (params) => {
      set({ isLoading: true, error: null });
      try {
         const res = await protectedApi.get('/services', { params });
         set({
            services: res.data.data.services || [],
            pagination: res.data.data.pagination,
         });
         return res.data;
      } catch (err: any) {
         set({ error: err.message });
         throw err;
      } finally {
         set({ isLoading: false });
      }
   },

   fetchServiceCategories: async () => {
      set({ isLoading: true, error: null });
      try {
         const res = await protectedApi.get('/service-categories');
         set({ categories: res.data.data || [] });
         return res.data;
      } catch (err: any) {
         set({ error: err.message });
         throw err;
      } finally {
         set({ isLoading: false });
      }
   },

   getService: async (id) => {
      const res = await protectedApi.get(`/services/${id}`);
      return res.data;
   },

   createService: async (data) => {
      const res = await protectedApi.post('/services', data, {
         headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
   },

   updateService: async (id, data) => {
      const res = await protectedApi.post(`/services/${id}`, data, {
         headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
   },

   deleteService: async (id) => {
      const res = await protectedApi.delete(`/services/${id}`);
      return res.data;
   },

   createServiceCategory: async (data) => {
      const res = await protectedApi.post('/service-categories', data);
      return res.data;
   },

   updateServiceCategory: async (id, data) => {
      const res = await protectedApi.post(`/service-categories/${id}`, data);
      return res.data;
   },

   deleteServiceCategory: async (id) => {
      const res = await protectedApi.delete(`/service-categories/${id}`);
      return res.data;
   },

   fetchCatalogServices: async (params) => {
      set({ isLoading: true, error: null });
      try {
         const res = await api.get('/catalog/services', { params });
         // Don't necessarily update state.services if we want to keep admin/catalog separate
         // But for simplicity we might update it or return it
         return res.data;
      } catch (err: any) {
         set({ error: err.message });
         throw err;
      } finally {
         set({ isLoading: false });
      }
   },
}));

export default useServiceStore;
