import { create } from 'zustand';
import { protectedApi } from '../lib/al/axios';
import type { InventoryItem, InventorySummary, InventoryReport } from '../types/inventory';

interface InventoryState {
   items: InventoryItem[];
   summary: InventorySummary | null;
   report: InventoryReport[];

   getProductInventory: (productId: string) => Promise<any>;
   checkAvailability: (productId: string, length: number) => Promise<any>;
   getInventoryReport: (productId?: string) => Promise<any>;
   getItemsWithAllocations: (params?: {
      page?: number;
      limit?: number;
      product_id?: string;
      status?: string;
      search?: string;
   }) => Promise<any>;
}

const useInventoryStore = create<InventoryState>()((set, get) => ({
   items: [],
   summary: null,
   report: [],

   getProductInventory: async (productId: string) => {
      try {
         const response = await protectedApi.get(`/inventory/${productId}`);
         if (response.data.success) {
            set({
               items: response.data.data.items,
               summary: response.data.data.summary,
            });
         }
         return response.data;
      } catch (error: any) {
         console.error('Error fetching inventory:', error);
         return { success: false, message: error.message };
      }
   },

   checkAvailability: async (productId: string, length: number) => {
      try {
         const response = await protectedApi.get(`/inventory/${productId}/check?length=${length}`);
         return response.data;
      } catch (error: any) {
         console.error('Error checking availability:', error);
         return { success: false, message: error.message };
      }
   },

   getInventoryReport: async (productId?: string) => {
      try {
         const url = productId ? `/inventory/report?product_id=${productId}` : '/inventory/report';
         const response = await protectedApi.get(url);
         if (response.data.success) {
            set({ report: response.data.data.items });
         }
         return response.data;
      } catch (error: any) {
         console.error('Error fetching inventory report:', error);
         return { success: false, message: error.message };
      }
   },

   getItemsWithAllocations: async (params) => {
      try {
         const queryParams = new URLSearchParams();

         if (params) {
            if (params.page !== undefined) queryParams.append('page', params.page.toString());
            if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
            if (params.product_id !== undefined)
               queryParams.append('product_id', params.product_id);
            if (params.status !== undefined) queryParams.append('status', params.status);
            if (params.search !== undefined && params.search !== '')
               queryParams.append('search', params.search);
         }

         const queryString = queryParams.toString();
         const url = queryString ? `/inventory/items?${queryString}` : '/inventory/items';

         const response = await protectedApi.get(url);

         if (response.data.success && response.data.data) {
            set({
               items: response.data.data.items || [],
               summary: response.data.data.summary || null,
            });
         }

         return response.data;
      } catch (error: any) {
         console.error('Error fetching inventory items:', error);
         return { success: false, message: error.message };
      }
   },
}));

export default useInventoryStore;
