import * as z from 'zod';
import type { Product } from './product';

// Adjustment Schema
export const AdjustmentSchema = z.object({
   product_id: z.string().min(1, { message: 'Product is required!' }),
   qty: z.coerce.number().min(1, { message: 'Quantity must be at least 1!' }),
   is_increment: z.boolean(),
   description: z.string().optional(),

   // For individual tracking products
   length_per_item: z.coerce.number().optional(),
   width: z.coerce.number().optional(),
   measurement_unit: z.string().optional(),
   inventory_item_ids: z.array(z.string()).optional(),
});

export type AdjustmentFormType = z.infer<typeof AdjustmentSchema>;

export interface Adjustment {
   id?: string;
   created_at?: string;
   updated_at?: string;
   product_id?: string;
   product?: Product;
   qty?: number;
   is_increment?: boolean;
   is_clear?: boolean;
   description?: string;

   // For individual tracking products
   length_per_item?: number;
   width?: number;
   measurement_unit?: string;
   inventory_item_ids?: string; // JSON string from backend
}
