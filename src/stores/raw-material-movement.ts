import { create } from 'zustand';
import { protectedApi } from 'src/lib/al/axios';
import type { RawMaterialMovement, RawMaterialUsageItem } from 'src/types/raw-material';

interface RawMaterialMovementState {
   movements: RawMaterialMovement[];
   submitOrderUsage: (params: { orderId: string; items: RawMaterialUsageItem[] }) => Promise<any>;
   getOrderMovements: (params: { orderId: string }) => Promise<RawMaterialMovement[]>;
}

const useRawMaterialMovementStore = create<RawMaterialMovementState>()((set) => ({
   movements: [],

   submitOrderUsage: async ({ orderId, items }) => {
      const res = await protectedApi.post(`/orders/${orderId}/raw-material-usage`, { items });
      return res.data;
   },

   getOrderMovements: async ({ orderId }) => {
      try {
         const res = await protectedApi.get('/raw-material-movements', {
            params: { issuer_type: 'order', issuer_id: orderId, limit: 200 },
         });
         const movements: RawMaterialMovement[] = res.data?.data?.raw_material_movements ?? [];
         set({ movements });
         return movements;
      } catch (err) {
         console.error('RawMaterialMovement getOrderMovements error:', err);
         return [];
      }
   },
}));

export default useRawMaterialMovementStore;
