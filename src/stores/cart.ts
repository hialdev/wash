import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { protectedApi } from '../lib/al/axios';
import type { Product } from '../types/product';
import type { IService } from '../types/service';

// ─── Product Cart ───────────────────────────────────────────────────────────

export interface CartItem {
   product: Product;
   qty: number;
   requested_length?: number; // For individual tracking products
   measurement_unit?: string; // For individual tracking products
}

// ─── Service Cart ───────────────────────────────────────────────────────────

export interface ServiceCartItem {
   service: IService;
   qty: number; // bisa desimal, e.g. 0.5 (setengah unit)
   notes?: string;
}

// ─── Stock Validation ────────────────────────────────────────────────────────

export interface StockValidationResult {
   productId: string;
   requestedQty: number;
   requestedLength?: number; // For individual tracking
   availableStock: number;
   isValid: boolean;
   productTitle?: string;
}

// ─── Store Interface ─────────────────────────────────────────────────────────

interface CartState {
   // Product items
   items: CartItem[];

   // Service items
   serviceItems: ServiceCartItem[];

   // Product actions
   addItem: (product: Product, qty: number, requestedLength?: number) => void;
   removeItem: (productId: string, requestedLength?: number) => void;
   updateQty: (productId: string, qty: number, requestedLength?: number) => void;

   // Service actions
   addServiceItem: (service: IService, qty: number, notes?: string) => void;
   removeServiceItem: (serviceId: string) => void;
   updateServiceQty: (serviceId: string, qty: number) => void;

   // Shared actions
   clearCart: () => void;
   clearProductCart: () => void;
   clearServiceCart: () => void;

   // Getters
   getTotalItems: () => number;
   getTotalPrice: () => number;
   getItemCount: () => number;
   getProductItemCount: () => number;
   getServiceItemCount: () => number;
   getProductTotalPrice: () => number;
   getServiceTotalPrice: () => number;

   // Stock validation (products only — services have no stock constraint)
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
         serviceItems: [],

         // ─── Product actions ─────────────────────────────────────────────────

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
               set({
                  items: items.map((item) => {
                     const isMatch =
                        product.tracking_mode === 'individual'
                           ? item.product.id === product.id &&
                             item.requested_length === requestedLength
                           : item.product.id === product.id;

                     return isMatch ? { ...item, qty: item.qty + qty } : item;
                  }),
               });
            } else {
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
                  if (requestedLength !== undefined) {
                     return !(
                        item.product.id === productId && item.requested_length === requestedLength
                     );
                  }
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
                  if (requestedLength !== undefined) {
                     return item.product.id === productId &&
                        item.requested_length === requestedLength
                        ? { ...item, qty }
                        : item;
                  }
                  return item.product.id === productId ? { ...item, qty } : item;
               }),
            }));
         },

         // ─── Service actions ──────────────────────────────────────────────────

         addServiceItem: (service, qty, notes) => {
            const { serviceItems } = get();
            const existing = serviceItems.find((i) => i.service.id === service.id);

            if (existing) {
               set({
                  serviceItems: serviceItems.map((i) =>
                     i.service.id === service.id ? { ...i, qty: i.qty + qty, notes } : i
                  ),
               });
            } else {
               set({ serviceItems: [...serviceItems, { service, qty, notes }] });
            }
         },

         removeServiceItem: (serviceId) => {
            set((state) => ({
               serviceItems: state.serviceItems.filter((i) => i.service.id !== serviceId),
            }));
         },

         updateServiceQty: (serviceId, qty) => {
            if (qty <= 0) {
               get().removeServiceItem(serviceId);
               return;
            }
            set((state) => ({
               serviceItems: state.serviceItems.map((i) =>
                  i.service.id === serviceId ? { ...i, qty } : i
               ),
            }));
         },

         // ─── Shared actions ───────────────────────────────────────────────────

         clearCart: () => {
            set({ items: [], serviceItems: [] });
         },

         clearProductCart: () => {
            set({ items: [] });
         },

         clearServiceCart: () => {
            set({ serviceItems: [] });
         },

         // ─── Getters ──────────────────────────────────────────────────────────

         getTotalItems: () => {
            const { items, serviceItems } = get();
            const productQty = items.reduce((t, i) => t + i.qty, 0);
            const serviceQty = serviceItems.reduce((t, i) => t + i.qty, 0);
            return productQty + serviceQty;
         },

         getItemCount: () => {
            const { items, serviceItems } = get();
            return items.length + serviceItems.length;
         },

         getProductItemCount: () => {
            return get().items.reduce((t, i) => t + i.qty, 0);
         },

         getServiceItemCount: () => {
            return get().serviceItems.reduce((t, i) => t + i.qty, 0);
         },

         getProductTotalPrice: () => {
            const { items } = get();
            return items.reduce((total, item) => {
               const price = item.product.sale_price || 0;
               if (item.product.tracking_mode === 'individual') {
                  return total + price * (item.requested_length || 0) * item.qty;
               }
               return total + price * item.qty;
            }, 0);
         },

         getServiceTotalPrice: () => {
            return get().serviceItems.reduce(
               (total, item) => total + (item.service.price || 0) * item.qty,
               0
            );
         },

         getTotalPrice: () => {
            return get().getProductTotalPrice() + get().getServiceTotalPrice();
         },

         // ─── Stock validation ─────────────────────────────────────────────────

         validateStock: async (productId, qty, requestedLength) => {
            try {
               const response = await protectedApi.get(`/catalog/stock/${productId}`);
               if (response.data.success && response.data.data) {
                  const product = response.data.data;

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

                     const availableItems = (product.inventory_items || []).filter(
                        (item: any) =>
                           item.status === 'available' &&
                           (item.remaining_length || 0) >= requestedLength
                     );

                     return {
                        productId,
                        requestedQty: qty,
                        requestedLength,
                        availableStock: availableItems.length,
                        isValid: qty <= availableItems.length,
                        productTitle: product.title,
                     };
                  }

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
