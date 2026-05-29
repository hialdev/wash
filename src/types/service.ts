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
   parent_id?: string | null;    // null = top-level service, set = variant of parent
   parent?: IService;            // populated when is variant
   variants?: IService[];        // sub-services (variants)
   name: string;
   description?: string;
   price: number;
   unit: string; // 'kg', 'pcs', 'set'
   estimated_duration?: number; // in minutes
   estimate_hour?: number;      // in hours
   minimum_qty_order?: number;  // BOM set size, default 1
   is_active: boolean;
   is_parent?: boolean;
   images?: string; // JSON string from backend
   service_cogs?: IServiceCog[];
   created_at: string;
   updated_at: string;
}

export interface IServiceCog {
   id: string;
   service_id: string;
   raw_material_id: string;
   raw_material?: {
      id: string;
      title: string;
      unit: string;
      current_stock: number;
   };
   qty: number;
   unit: string;
}

export interface IOrderService {
   id: string;
   order_id: string;
   service_id: string;
   service?: IService;
   service_variant_id?: string | null;
   service_variant?: IService;
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
