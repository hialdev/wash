import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { protectedApi } from '../lib/al/axios';
import type { Product } from '../types/product';

export interface CartItem {
   product: Product;
   qty: number;
   requested_length?: number; // For individual tracking products
   measurement_unit?: string; // For individual tracking products
}

export interface StockValidationResult {
   productId: string;
   requestedQty: number;
   requestedLength?: number; // For individual tracking
   availableStock: number;
   isValid: boolean;
   productTitle?: string;
}

interface CartState {
   items: CartItem[];

   addItem: (product: Product, qty: number, requestedLength?: number) => void;
   removeItem: (productId: string, requestedLength?: number) => void;
   updateQty: (productId: string, qty: number, requestedLength?: number) => void;
   clearCart: () => void;
   getTotalItems: () => number;
   getTotalPrice: () => number;
   getItemCount: () => number;
   validateStock: (
      productId: string,
      qty: number,
      requestedLength?: number
   ) => Promise<StockValidationResult>;
   validateAllStock: () => Promise<StockValidationResult[]>;
}

const useCartStore = create<CartState>()(
   persist(
      (set, get) => ({
         items: [],

         addItem: (product, qty, requestedLength) => {
            const { items } = get();

            // For individual tracking products, match by product_id AND requested_length
            // For simple products, match by product_id only
            const existingItem = items.find((item) => {
               if (product.tracking_mode === 'individual') {
                  return (
                     item.product.id === product.id && item.requested_length === requestedLength
                  );
               }
               return item.product.id === product.id;
            });

            if (existingItem) {
               // Update quantity if item already exists
               set({
                  items: items.map((item) => {
                     const isMatch =
                        product.tracking_mode === 'individual'
                           ? item.product.id === product.id &&
                             item.requested_length === requestedLength
                           : item.product.id === product.id;

                     return isMatch
                        ? {
                             ...item,
                             qty:
                                product.tracking_mode === 'individual'
                                   ? item.qty + qty
                                   : item.qty + qty,
                          }
                        : item;
                  }),
               });
            } else {
               // Add new item
               set({
                  items: [
                     ...items,
                     {
                        product,
                        qty,
                        requested_length: requestedLength,
                        measurement_unit: product.measurement_unit,
                     },
                  ],
               });
            }
         },

         removeItem: (productId, requestedLength) => {
            set((state) => ({
               items: state.items.filter((item) => {
                  // For individual tracking, match both productId and requestedLength
                  if (requestedLength !== undefined) {
                     return !(
                        item.product.id === productId && item.requested_length === requestedLength
                     );
                  }
                  // For simple tracking, match only productId
                  return item.product.id !== productId;
               }),
            }));
         },

         updateQty: (productId, qty, requestedLength) => {
            if (qty <= 0) {
               get().removeItem(productId, requestedLength);
               return;
            }

            set((state) => ({
               items: state.items.map((item) => {
                  // For individual tracking, match both productId and requestedLength
                  if (requestedLength !== undefined) {
                     return item.product.id === productId &&
                        item.requested_length === requestedLength
                        ? { ...item, qty }
                        : item;
                  }
                  // For simple tracking, match only productId
                  return item.product.id === productId ? { ...item, qty } : item;
               }),
            }));
         },

         clearCart: () => {
            set({ items: [] });
         },

         getTotalItems: () => {
            const { items } = get();
            return items.reduce((total, item) => total + item.qty, 0);
         },

         getTotalPrice: () => {
            const { items } = get();
            return items.reduce((total, item) => {
               const price = item.product.sale_price || 0;
               if (item.product.tracking_mode === 'individual') {
                  return total + price * (item.requested_length || 0) * item.qty;
               }
               return total + price * item.qty;
            }, 0);
         },

         getItemCount: () => {
            const { items } = get();
            return items.length;
         },

         validateStock: async (productId, qty, requestedLength) => {
            try {
               const response = await protectedApi.get(`/catalog/stock/${productId}`);
               if (response.data.success && response.data.data) {
                  const product = response.data.data;

                  // For individual tracking, check inventory items
                  if (product.tracking_mode === 'individual') {
                     if (!requestedLength) {
                        return {
                           productId,
                           requestedQty: qty,
                           requestedLength,
                           availableStock: 0,
                           isValid: false,
                           productTitle: product.title,
                        };
                     }

                     // Filter inventory items that can fulfill the requested length
                     const availableItems = (product.inventory_items || []).filter(
                        (item: any) =>
                           item.status === 'available' &&
                           (item.remaining_length || 0) >= requestedLength
                     );

                     const availableQty = availableItems.length;

                     return {
                        productId,
                        requestedQty: qty,
                        requestedLength,
                        availableStock: availableQty,
                        isValid: qty <= availableQty,
                        productTitle: product.title,
                     };
                  }

                  // For simple tracking, check product stock
                  const availableStock = product.stock || 0;
                  return {
                     productId,
                     requestedQty: qty,
                     availableStock,
                     isValid: qty <= availableStock,
                     productTitle: product.title,
                  };
               }
               return {
                  productId,
                  requestedQty: qty,
                  requestedLength,
                  availableStock: 0,
                  isValid: false,
               };
            } catch (error) {
               return {
                  productId,
                  requestedQty: qty,
                  requestedLength,
                  availableStock: 0,
                  isValid: false,
               };
            }
         },

         validateAllStock: async () => {
            const { items } = get();
            const validationPromises = items.map((item) =>
               get().validateStock(item.product.id!, item.qty, item.requested_length)
            );
            return Promise.all(validationPromises);
         },
      }),
      {
         name: 'cart-store', // localStorage key
      }
   )
);

export default useCartStore;
