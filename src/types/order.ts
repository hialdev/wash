import * as z from 'zod';
import type { Product } from './product';
import type { IService } from './service';

// Order Product Schema
export const OrderProductSchema = z.object({
   product_id: z.string().min(1, { message: 'Product is required!' }),
   qty: z.number().min(1, { message: 'Quantity must be at least 1!' }),
});

export type OrderProductFormType = z.infer<typeof OrderProductSchema>;

// Order Schema
export const OrderSchema = z.object({
   user_id: z.string().min(1, { message: 'User ID is required!' }),
   address_receiver: z.string().min(1, { message: 'Receiver Address is required!' }),
   phone_receiver: z.string().min(1, { message: 'Receiver Phone is required!' }),
   notes: z.string().optional(),
   products: z.array(OrderProductSchema).min(1, { message: 'At least one product is required!' }),
});

export type OrderFormType = z.infer<typeof OrderSchema>;

export interface OrderProduct {
   id?: string;
   created_at?: string;
   updated_at?: string;
   order_id?: string;
   product_id?: string;
   product?: Product;
   order?: Order; // For allocation history
   price_at_order?: number;
   qty?: number;
   requested_length?: number; // For individual tracking products
   measurement_unit?: string; // For individual tracking products
}

export interface OrderService {
   id?: string;
   created_at?: string;
   updated_at?: string;
   order_id?: string;
   service_id?: string;
   service_variant_id?: string;
   service?: IService;
   price_at_order?: number;
   qty?: number;
   subtotal?: number;
   notes?: string;
}

export interface Order {
   id?: string;
   created_at?: string;
   updated_at?: string;
   order_number?: string;
   user_id?: string;
   address_receiver?: string;
   phone_receiver?: string;
   status?:
      | 'waiting_payment'
      | 'on_progress'
      | 'finish'
      | 'stock_issue'
      | 'waiting_restock'
      | 'refund_pending'
      | 'waiting_process'
      | 'refunded'
      | 'payment_verification'
      | 'canceled';
   notes?: string;
   total_bill?: number;
   xendit_invoice_id?: string;
   xendit_invoice_url?: string;
   payment_proof?: string;
   is_agent_order?: boolean;
   agent_id?: string;
   user?: {
      id: string;
      name: string;
      email: string;
      phone: string;
   };
   order_products?: OrderProduct[];
   order_services?: OrderService[];
   order_logs?: any[];
   rating?: number;
   review?: string;
   voucher_id?: string;
   voucher?: any;
   discount_amount?: number;
   weight_kg?: number;
   total_pcs?: number;
   // Mock/Legacy aliases
   orderNumber?: string;
   createdAt?: string | Date;
   totalAmount?: number;
   totalQuantity?: number;
   customer?: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
   };
}

export type IOrderItem = Order;

export type IOrderTableFilters = {
   status: string;
   name: string;
   startDate: Date | null;
   endDate: Date | null;
};
