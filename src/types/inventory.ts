// Inventory Item Types
import type { Product } from './product';
import type { OrderProduct } from './order';

export interface InventoryItem {
   id: string;
   product_id: string;
   purchase_product_id: string;
   item_number: string;
   original_length: number;
   remaining_length: number;
   measurement_unit: string;
   width?: number;
   notes?: string;
   status: 'available' | 'depleted' | 'reserved' | 'returned';
   depleted_at?: string;
   created_at: string;
   updated_at: string;
   product?: Product;
   allocations?: InventoryAllocation[];
}

export interface InventoryAllocation {
   id: string;
   inventory_item_id: string;
   order_product_id: string;
   allocated_length: number;
   measurement_unit: string;
   created_at: string;
   order_product?: OrderProduct;
}

export interface InventorySummary {
   total_items: number;
   available_items: number;
   depleted_items: number;
   total_available_length?: number; // For GetInventoryItemsWithAllocations
   total_original_length?: number; // For GetInventoryItemsWithAllocations
   total_available?: number; // For GetProductInventory (legacy)
   measurement_unit?: string;
}

export interface InventoryReport {
   item_number: string;
   product_title: string;
   original_length: number;
   remaining_length: number;
   used_length: number;
   utilization_rate: number;
   measurement_unit: string;
   status: string;
   purchase_product_id: string;
}
