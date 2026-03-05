export interface IVoucher {
   id: string;
   code: string;
   description?: string;
   discount_type: 'percentage' | 'nominal';
   discount_value: number;
   max_discount?: number;
   min_purchase?: number;
   is_public: boolean;
   is_active: boolean;
   quota?: number;
   used_count: number;
   valid_from?: string;
   valid_until?: string;
   created_at: string;
   updated_at: string;
}

export type IVoucherTableFilters = {
   code: string;
   status: string;
};
