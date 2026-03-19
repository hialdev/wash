import { create } from 'zustand';
import { protectedApi } from 'src/lib/al/axios';

export type AgentCommissionRate = {
   id?: string;
   agent_id?: string;
   type: 'service' | 'product';
   issuer_id: string;
   rate_type: 'percentage' | 'fixed';
   rate: number;
};

export type AgentCommissionSubmitInput = {
   rates: AgentCommissionRate[];
};

type AgentCommissionStoreType = {
   commissions: AgentCommissionRate[];
   getCommissions: (agentId: string) => Promise<any>;
   bulkUpdateCommissions: (agentId: string, input: AgentCommissionSubmitInput) => Promise<any>;
};

const useAgentCommissionStore = create<AgentCommissionStoreType>((set, get) => ({
   commissions: [],

   getCommissions: async (agentId) => {
      try {
         const res = await protectedApi.get(`/agents/${agentId}/commissions`);
         set({ commissions: res.data.data });
         return res.data;
      } catch (error) {
         set({ commissions: [] });
         throw error;
      }
   },

   bulkUpdateCommissions: async (agentId, input) => {
      try {
         const res = await protectedApi.post(
            `/agents/${agentId}/commissions/bulk`,
            input
         );
         return res.data;
      } catch (error) {
         throw error;
      }
   },
}));

export default useAgentCommissionStore;
