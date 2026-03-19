import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { protectedApi } from '../lib/al/axios';
import type { Agent, AgentReportData } from '../types/agent';

interface AgentState {
   agents: Agent[];
   financeReports: AgentReportData[];
   grandTotalSales: number;
   grandTotalCommission: number;

   all: (params?: any) => Promise<any>;
   myAgent: ({ id }: { id: string }) => Promise<any>;
   detail: ({ id }: { id: string }) => Promise<any>;
   add: ({ data }: { data: FormData }) => Promise<any>;
   update: ({ id, data }: { id: string; data: FormData }) => Promise<any>;
   delete: ({ id }: { id: string }) => Promise<any>;
   generateUser: ({ id }: { id: string }) => Promise<any>;
   fetchFinanceReport: (params?: { start_date?: string; end_date?: string; agent_id?: string }) => Promise<any>;
   createAgentOrder: (data: any) => Promise<any>;
}

const useAgentStore = create<AgentState>()(
   persist(
      (set, get) => ({
         agents: [],
         financeReports: [],
         grandTotalSales: 0,
         grandTotalCommission: 0,

         all: async (params?: any) => {
            const queryParams = new URLSearchParams();

            if (params) {
               if (params.page !== undefined) queryParams.append('page', params.page.toString());
               if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
               if (params.search !== undefined) queryParams.append('search', params.search);
               if (params.sort !== undefined) queryParams.append('sort', params.sort);
               if (params.order !== undefined) queryParams.append('order', params.order);
            }

            const queryString = queryParams.toString();
            const url = queryString ? `/agents?${queryString}` : '/agents';

            const response = await protectedApi.get(url);
            if (response.data.success && response.data.data) {
               set({ agents: response.data.data.agents || response.data.data });
            }
            return response.data;
         },
         myAgent: async ({ id }: { id: string }) => {
            const response = await protectedApi.get(`/agents/my-agent/${id}`);
            return response.data;
         },
         detail: async ({ id }: { id: string }) => {
            const response = await protectedApi.get(`/agents/${id}`);
            return response.data;
         },
         add: async ({ data }) => {
            const response = await protectedApi.post(`/agents`, data, {
               headers: {
                  'Content-Type': 'multipart/form-data',
               },
            });
            return response.data;
         },
         update: async ({ id, data }) => {
            const response = await protectedApi.patch(`/agents/${id}`, data, {
               headers: {
                  'Content-Type': 'multipart/form-data',
               },
            });
            return response.data;
         },
         delete: async ({ id }) => {
            const response = await protectedApi.delete(`/agents/${id}`);
            return response.data;
         },
         generateUser: async ({ id }) => {
            const response = await protectedApi.post(`/agents/${id}/generate-user`);
            return response.data;
         },
         createAgentOrder: async (data) => {
            const response = await protectedApi.post('/agent-orders', data);
            return response.data;
         },
         fetchFinanceReport: async (params) => {
            const queryParams = new URLSearchParams();

            if (params) {
               if (params.start_date) queryParams.append('start_date', params.start_date);
               if (params.end_date) queryParams.append('end_date', params.end_date);
               if (params.agent_id) queryParams.append('agent_id', params.agent_id);
            }

            const queryString = queryParams.toString();
            const url = queryString ? `/finance-agent?${queryString}` : '/finance-agent';

            const response = await protectedApi.get(url);
            if (response.data.success && response.data.data) {
               set({ 
                  financeReports: response.data.data.reports || [],
                  grandTotalSales: response.data.data.grand_total_sales || 0,
                  grandTotalCommission: response.data.data.grand_total_commission || 0
               });
            }
            return response.data;
         }
      }),
      {
         name: 'agent-store',
         partialize: (state) => ({
            agents: state.agents,
         }),
      }
   )
);

export default useAgentStore;
