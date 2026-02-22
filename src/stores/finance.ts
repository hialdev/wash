import { create } from 'zustand';
import { protectedApi } from 'src/lib/al/axios';
import { FinanceSummary, FinanceFilter } from '../types/journal';

interface FinanceState {
   summary: FinanceSummary | null;
   loading: boolean;

   // Actions
   getSummary: (params: FinanceFilter) => Promise<void>;
   exportPdf: (params: FinanceFilter) => Promise<void>;
}

const useFinanceStore = create<FinanceState>((set) => ({
   summary: null,
   loading: false,

   getSummary: async (params) => {
      set({ loading: true });
      try {
         const response = await protectedApi.get('/finance/summary', { params });
         if (response.data.success) {
            set({ summary: response.data.data });
         }
      } catch (error) {
         console.error('Failed to fetch finance summary:', error);
      } finally {
         set({ loading: false });
      }
   },

   exportPdf: async (params) => {
      set({ loading: true });
      try {
         const response = await protectedApi.get('/finance/export-pdf', {
            params,
            responseType: 'blob', // Important for file download
         });

         // Create blob link to download
         const url = window.URL.createObjectURL(new Blob([response.data]));
         const link = document.createElement('a');
         link.href = url;
         link.setAttribute(
            'download',
            `finance_report_${params.start_date}_${params.end_date}.pdf`
         );
         document.body.appendChild(link);
         link.click();
         link.remove();
      } catch (error) {
         console.error('Failed to export PDF:', error);
      } finally {
         set({ loading: false });
      }
   },
}));

export default useFinanceStore;
