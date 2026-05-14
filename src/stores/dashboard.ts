import { create } from 'zustand';
import { protectedApi } from '../lib/al/axios';

interface DashboardState {
   salesData: any;
   stockData: any;
   purchaseData: any;
   managerData: any;
   superadminData: any;

   getSalesData: () => Promise<any>;
   getStockData: () => Promise<any>;
   getPurchaseData: () => Promise<any>;
   getManagerData: () => Promise<any>;
   getSuperadminData: () => Promise<any>;
}

const useDashboardStore = create<DashboardState>()((set, get) => ({
   salesData: null,
   stockData: null,
   purchaseData: null,
   managerData: null,
   superadminData: null,

   getSalesData: async () => {
      const response = await protectedApi.get('/dashboard/sales');
      if (response.data.success && response.data.data) {
         set({ salesData: response.data.data });
      }
      return response.data;
   },

   getStockData: async () => {
      const response = await protectedApi.get('/dashboard/stock');
      if (response.data.success && response.data.data) {
         set({ stockData: response.data.data });
      }
      return response.data;
   },

   getPurchaseData: async () => {
      const response = await protectedApi.get('/dashboard/purchase');
      if (response.data.success && response.data.data) {
         set({ purchaseData: response.data.data });
      }
      return response.data;
   },

   getManagerData: async () => {
      const response = await protectedApi.get('/dashboard/manager');
      if (response.data.success && response.data.data) {
         set({ managerData: response.data.data });
      }
      return response.data;
   },

   getSuperadminData: async () => {
      const response = await protectedApi.get('/dashboard/superadmin');
      if (response.data.success && response.data.data) {
         set({ superadminData: response.data.data });
      }
      return response.data;
   },
}));

export default useDashboardStore;
