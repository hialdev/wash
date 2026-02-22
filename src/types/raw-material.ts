export interface RawMaterial {
   id?: string;
   created_at?: string;
   updated_at?: string;
   image?: string;
   title?: string;
   slug?: string;
   current_stock?: number;
   unit?: string;
}

export interface RawMaterialPurchase {
   id?: string;
   created_at?: string;
   updated_at?: string;
   purchase_date?: string;
   raw_material_id?: string;
   raw_material?: RawMaterial;
   price_purchase?: number;
   qty?: number;
   notes?: string;
   created_by?: string;
}

export interface RawMaterialMovement {
   id?: string;
   created_at?: string;
   updated_at?: string;
   raw_material_id?: string;
   raw_material?: RawMaterial;
   issuer_type?: string; // order | adjustment | purchase
   issuer_id?: string;
   is_by_system?: boolean;
   is_increment?: boolean;
   qty?: number;
   notes?: string;
   created_by?: string;
}

export interface RawMaterialUsageItem {
   raw_material_id: string;
   qty: number;
   notes?: string;
}
