export type Journal = {
   id: string;
   trx_date: string;
   trx_type: 'income' | 'expense';
   trx_category?: string;
   amount: number;
   notes?: string;
   attachments?: string; // JSON string
   created_by?: string;
   created_at?: string;
   updated_at?: string;
};

export type JournalInput = {
   trx_date: string;
   trx_type: 'income' | 'expense';
   trx_category: string;
   amount: number;
   notes: string;
   attachments?: File[];
};

export type FinanceSummary = {
   total_income: number;
   total_expense: number;
   net_profit: number;
   income_breakdown: {
      sales: number;
      manual_income: number;
   };
   expense_breakdown: {
      raw_material_purchase: number;
      product_purchase: number;
      manual_expense: number;
   };
};

export type FinanceFilter = {
   start_date: string;
   end_date: string;
};
