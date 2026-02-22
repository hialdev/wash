import type { Product } from './product';
import type { Order } from './order';
import type { IService } from './service';

export interface ProcessingPiece {
   piece_number: number;
   use_remnant: boolean;
   selected_inventory_id: string | null;
   available_remnants: AvailableRemnantItem[];
}

export interface AvailableRemnantItem {
   id: string;
   item_number: string;
   remaining_length: number;
}

export interface ProcessingItem {
   order_product_id: string;
   product: Product;
   tracking_mode: string;
   qty: number;
   requested_length?: number;
   pieces: ProcessingPiece[];
}

export interface ProcessingService {
   order_service_id: string;
   service: IService;
   qty: number;
   price_at_order: number;
   notes?: string;
}

export interface ProcessingDataResponse {
   order: Order;
   processing_items: ProcessingItem[];
   processing_services: ProcessingService[];
}

export interface ProcessOrderPiece {
   piece_number: number;
   use_remnant: boolean;
   inventory_id: string | null;
}

export interface ProcessOrderItem {
   order_product_id: string;
   pieces: ProcessOrderPiece[];
}

export interface ProcessOrderService {
   order_service_id: string;
   notes?: string;
}

export interface ProcessOrderRequest {
   processing_items: ProcessOrderItem[];
   processing_services: ProcessOrderService[];
}
