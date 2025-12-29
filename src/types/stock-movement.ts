import type { Product } from './product';

export interface StockMovement {
   id?: string;
   created_at?: string;
   updated_at?: string;
   product_id?: string;
   product?: Product;
   reference_type?: 'purchase' | 'order' | 'adjustment';
   reference_id?: string;
   purchase?: {
      id: string;
      purchase_number: string;
   };
   order?: {
      id: string;
      order_number: string;
   };
   adjustment?: {
      id: string;
      adjustment_number: string;
   };
   qty?: number; // positive for increment, negative for decrement
   unit?: string; // measurement unit (e.g., 'meter', 'pcs')
   description?: string;
}
