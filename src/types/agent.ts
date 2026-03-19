export interface Agent {
   id: string;
   name: string;
   code?: string;
   phone?: string;
   email?: string;
   address?: string;
   commission_rate?: number;
   image?: string;
   is_active?: boolean;
   created_at?: string;
   updated_at?: string;
}

export interface AgentReportData {
   agent_id: string;
   agent_name: string;
   agent_code: string;
   total_orders: number;
   total_sales: number;
   total_commission: number;
}
