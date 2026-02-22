import { Order } from './order';

export interface IServiceCategory {
   id: string;
   name: string;
   description?: string;
   is_active: boolean;
   created_at: string;
   updated_at: string;
}

export interface IService {
   id: string;
   service_category_id?: string;
   service_category?: IServiceCategory;
   name: string;
   description?: string;
   price: number;
   unit: string; // 'kg', 'pcs', 'set'
   estimated_duration?: number; // in minutes
   is_active: boolean;
   images?: string; // JSON string from backend
   created_at: string;
   updated_at: string;
}

export interface IOrderService {
   id: string;
   order_id: string;
   service_id: string;
   service?: IService;
   qty: number;
   price_at_order: number;
   subtotal: number;
   notes?: string;

   order?: Order;

   // Tracking
   service_process?: IOrderServiceProcess[];
   service_detail?: IOrderServiceDetail;
}

export interface IOrderServiceProcess {
   id: string;
   order_service_id: string;
   process_type: string; // pickup, processing, delivery, done, other
   description?: string;
   images?: string; // JSON string
   created_by?: string;
   creator?: {
      first_name: string;
      last_name: string;
      email: string;
   };
   created_at: string;
}

export interface IOrderServiceDetail {
   id: string;
   order_service_id: string;
   description?: string; // HTML
   images?: string; // JSON string
   created_at: string;
   updated_at: string;
}

export type IServiceTableFilterValue = string | string[];

export type IServiceTableFilters = {
   name: string;
   status: string;
};
