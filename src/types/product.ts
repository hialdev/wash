import * as z from 'zod';
import { schemaUtils } from 'src/components/hook-form';

// Product Schema
export const ProductSchema = z.object({
   product_number: z.string().min(1, { message: 'Product Number is required!' }),
   product_type_id: z.string().min(1, { message: 'Product Type is required!' }),
   title: z.string().min(1, { message: 'Title is required!' }),
   slug: z.string().min(1, { message: 'Slug is required!' }),
   image: schemaUtils.file({ error: 'Image is required!' }).optional(),
   description: z.string().optional(),
   sale_price: z.number().min(0, { message: 'Sale Price must be greater than 0!' }),
   content: z.string().optional(),
   is_active: z.boolean().optional(),

   // Inventory tracking fields
   tracking_mode: z.enum(['simple', 'individual']).optional(),
   measurement_unit: z.string().optional(),
});

export type ProductFormType = z.infer<typeof ProductSchema>;

export interface Product {
   id?: string;
   created_at?: string;
   updated_at?: string;
   product_number?: string;
   product_type_id?: string;
   product_type?: {
      id?: string;
      title?: string;
      slug?: string;
   };
   title?: string;
   slug?: string;
   image?: string | File;
   description?: string;
   sale_price?: number;
   content?: string;
   is_active?: boolean;
   stock?: number;

   // Inventory tracking fields
   tracking_mode?: 'simple' | 'individual';
   measurement_unit?: string;

   // Computed fields (from backend)
   total_qty?: number;
   total_available?: number;

   deleted_at?: string | null;
}
// ----------------------------------------------------------------------

export type IProductFilterValue = string | string[] | number | number[];

export type IProductFilters = {
   rating: string;
   gender: string[];
   category: string;
   colors: string[];
   priceRange: number[];
};

export type IProductTableFilters = {
   stock: string[];
   publish: string[];
};

// ----------------------------------------------------------------------

export type IProductReviewNewForm = {
   rating: number | null;
   review: string;
   name: string;
   email: string;
};

export type IProductReview = {
   id: string;
   name: string;
   rating: number;
   comment: string;
   helpful: number;
   avatarUrl: string;
   isPurchased: boolean;
   attachments?: string[];
   postedAt: Date;
};

export type IProductItem = {
   id: string;
   sku: string;
   name: string;
   code: string;
   price: number;
   taxes: number;
   tags: string[];
   gender: string[];
   sizes: string[];
   publish: string;
   coverUrl: string;
   images: string[];
   colors: string[];
   quantity: number;
   category: string;
   available: number;
   totalSold: number;
   description: string;
   totalRatings: number;
   totalReviews: number;
   inventoryType: string;
   subDescription: string;
   priceSale: number | null;
   createdAt: Date;
   newLabel: {
      enabled: boolean;
      content: string;
   };
   saleLabel: {
      enabled: boolean;
      content: string;
   };
   ratings: any[];
   reviews: any[];
};
