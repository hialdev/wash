import { create } from 'zustand';
import { protectedApi } from 'src/lib/al/axios';
import { IOrderService } from 'src/types/service';

// ----------------------------------------------------------------------

type ServiceTrackingState = {
   isLoading: boolean;
   error: Error | null;
   orderService: IOrderService | null;

   getServiceTracking: (orderId: string, serviceId: string, isUser: boolean) => Promise<void>;
   addServiceProcess: (orderId: string, serviceId: string, formData: FormData) => Promise<void>;
   updateServiceDetail: (orderId: string, serviceId: string, formData: FormData) => Promise<void>;
};

const useServiceTrackingStore = create<ServiceTrackingState>((set) => ({
   isLoading: false,
   error: null,
   orderService: null,

   getServiceTracking: async (orderId: string, serviceId: string, isUser: boolean = false) => {
      set({ isLoading: true, error: null });
      try {
         const url = isUser
            ? `/user/services/${serviceId}/tracking`
            : `/orders/services/${serviceId}/tracking`;
         const response = await protectedApi.get(url);
         set({ orderService: response.data.data, isLoading: false });
      } catch (error) {
         console.error('Error fetching service tracking:', error);
         set({ error: error as Error, isLoading: false });
      }
   },

   addServiceProcess: async (orderId: string, serviceId: string, formData: FormData) => {
      set({ isLoading: true, error: null });
      try {
         await protectedApi.post(`/orders/services/${serviceId}/process`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
         });
         // Refresh data
         const response = await protectedApi.get(`/orders/services/${serviceId}/tracking`);
         set({ orderService: response.data.data, isLoading: false });
      } catch (error) {
         console.error('Error adding service process:', error);
         set({ error: error as Error, isLoading: false });
         throw error;
      }
   },

   updateServiceDetail: async (orderId: string, serviceId: string, formData: FormData) => {
      set({ isLoading: true, error: null });
      try {
         await protectedApi.post(`/orders/services/${serviceId}/details`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
         });
         // Refresh data
         const response = await protectedApi.get(`/orders/services/${serviceId}/tracking`);
         set({ orderService: response.data.data, isLoading: false });
      } catch (error) {
         console.error('Error updating service details:', error);
         set({ error: error as Error, isLoading: false });
         throw error;
      }
   },
}));

export default useServiceTrackingStore;
