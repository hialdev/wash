import { create } from 'zustand';

import { protectedApi } from '../lib/al/axios';

export interface SuperSalesParams {
   start_date: string;
   end_date: string;
   product_ids?: string[];
   sort?: 'profit_desc' | 'profit_asc';
}

interface SalesAnalyticsState {
   getSuperSales: (params: SuperSalesParams) => Promise<any>;
}

const useSalesAnalyticsStore = create<SalesAnalyticsState>()((set, get) => ({
   getSuperSales: async (params: SuperSalesParams) => {
      const queryParams = new URLSearchParams();

      queryParams.append('start_date', params.start_date);
      queryParams.append('end_date', params.end_date);

      if (params.product_ids && params.product_ids.length > 0) {
         queryParams.append('product_ids', params.product_ids.join(','));
      }

      if (params.sort) {
         queryParams.append('sort', params.sort);
      }

      const response = await protectedApi.get(`/analytics/super-sales?${queryParams.toString()}`);
      return response.data;
   },
}));

export default useSalesAnalyticsStore;
