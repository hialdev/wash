'use client';

import { create } from 'zustand';
import { protectedApi } from '../lib/al/axios';

export interface MyCustomer {
   id: string;
   name?: string;
   username?: string;
   phone?: string;
   email?: string;
   created_by?: string;
   role?: { id: string; name: string };
}

export interface CustomerDeliveryAddress {
   id: string;
   user_id: string;
   address?: string;
   phone_number?: string;
   is_primary?: boolean;
   notes?: string;
}

interface MyCustomerState {
   customers: MyCustomer[];

   all: (params?: { search?: string }) => Promise<any>;
   add: (data: { name: string; phone: string; email?: string }) => Promise<any>;
   update: (id: string, data: { name: string }) => Promise<any>;
   getDeliveryAddresses: (customerId: string) => Promise<any>;
   addDeliveryAddress: (customerId: string, data: { address: string; phone_number: string; notes?: string; is_primary?: boolean }) => Promise<any>;
   updateDeliveryAddress: (customerId: string, addrId: string, data: { address: string; phone_number: string; notes?: string; is_primary?: boolean }) => Promise<any>;
   deleteDeliveryAddress: (customerId: string, addrId: string) => Promise<any>;
   setAddressPrimary: (customerId: string, addrId: string) => Promise<any>;
}

const useMyCustomerStore = create<MyCustomerState>()((set) => ({
   customers: [],

   all: async (params) => {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      const url = query.toString() ? `/my-customers?${query.toString()}` : '/my-customers';
      const response = await protectedApi.get(url);
      if (response.data?.success && response.data?.data?.customers) {
         set({ customers: response.data.data.customers });
      }
      return response.data;
   },

   add: async (data) => {
      const response = await protectedApi.post('/my-customers', data);
      return response.data;
   },

   update: async (id, data) => {
      const response = await protectedApi.patch(`/my-customers/${id}`, data);
      return response.data;
   },

   getDeliveryAddresses: async (customerId) => {
      const response = await protectedApi.get(`/my-customers/${customerId}/delivery-addresses`);
      return response.data;
   },

   addDeliveryAddress: async (customerId, data) => {
      const response = await protectedApi.post(`/my-customers/${customerId}/delivery-addresses`, data);
      return response.data;
   },

   updateDeliveryAddress: async (customerId, addrId, data) => {
      const response = await protectedApi.patch(`/my-customers/${customerId}/delivery-addresses/${addrId}`, data);
      return response.data;
   },

   deleteDeliveryAddress: async (customerId, addrId) => {
      const response = await protectedApi.delete(`/my-customers/${customerId}/delivery-addresses/${addrId}`);
      return response.data;
   },

   setAddressPrimary: async (customerId, addrId) => {
      const response = await protectedApi.patch(`/my-customers/${customerId}/delivery-addresses/${addrId}/set-primary`);
      return response.data;
   },
}));

export default useMyCustomerStore;
