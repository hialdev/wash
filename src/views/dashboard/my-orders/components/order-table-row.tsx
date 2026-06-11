import type { Order } from 'src/types/order';

import { useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';

import Chip from '@mui/material/Chip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/al/paths';

import { Iconify } from 'src/components/iconify';
import { fCurrency } from 'src/utils/format-number';
import useOrderStore from 'src/stores/order';

import { StockIssueModal } from './stock-issue-modal';

// ----------------------------------------------------------------------

type Props = {
   row: Order;
   onActionSuccess?: () => void;
};

export function OrderTableRow({ row, onActionSuccess }: Props) {
   const router = useRouter();
   const [openStockIssueModal, setOpenStockIssueModal] = useState(false);

   const { requestRefund, waitRestock } = useOrderStore();

   const statusColor = {
      pickup: 'info',
      calculating: 'warning',
      waiting_payment: 'warning',
      waiting_process: 'info',
      payment_verification: 'info',
      on_progress: 'primary',
      waiting_finish: 'success',
      delivering: 'primary',
      finish: 'success',
      stock_issue: 'error',
      waiting_restock: 'info',
      refund_pending: 'warning',
      refunded: 'error',
      canceled: 'error',
   } as const;

   const statusLabel = {
      pickup: 'Penjemputan',
      calculating: 'Penimbangan',
      waiting_payment: 'Menunggu Pembayaran',
      waiting_process: 'Menunggu Diproses',
      payment_verification: 'Verifikasi Pembayaran',
      on_progress: 'Dalam Proses',
      waiting_finish: 'Siap Diambil/Diantar',
      delivering: 'Sedang Diantar',
      finish: 'Selesai',
      stock_issue: 'Masalah Stok',
      waiting_restock: 'Menunggu Restock',
      refund_pending: 'Refund Pending',
      refunded: 'Refunded',
      canceled: 'Dibatalkan',
   } as const;

   const handleViewDetails = () => {
      // If stock_issue, open stock issue modal instead
      if (row.status === 'stock_issue') {
         setOpenStockIssueModal(true);
      } else {
         router.push(paths.dashboard.customer_orders.detail(row.id!));
      }
   };

   const handleCloseStockIssueModal = () => {
      setOpenStockIssueModal(false);
   };

   const handleRefund = async () => {
      try {
         const response = await requestRefund({ id: row.id! });
         if (response.success) {
            toast.success(
               'Permintaan refund berhasil dikirim. Admin akan memproses dalam 2x24 jam.'
            );
            handleCloseStockIssueModal();
            // Trigger refetch from parent
            if (onActionSuccess) {
               onActionSuccess();
            }
         } else {
            toast.error(response.message || 'Gagal mengirim permintaan refund');
         }
      } catch (error) {
         toast.error('Terjadi kesalahan saat mengirim permintaan refund');
         console.error(error);
      }
   };

   const handleWaitRestock = async () => {
      try {
         const response = await waitRestock({ id: row.id! });
         if (response.success) {
            toast.success(
               'Permintaan tunggu restock berhasil. Admin akan memeriksa dalam 1x24 jam.'
            );
            handleCloseStockIssueModal();
            // Trigger refetch from parent
            if (onActionSuccess) {
               onActionSuccess();
            }
         } else {
            toast.error(response.message || 'Gagal mengirim permintaan');
         }
      } catch (error) {
         toast.error('Terjadi kesalahan saat mengirim permintaan');
         console.error(error);
      }
   };

   return (
      <>
         <TableRow hover>
            <TableCell>
               <Typography variant="subtitle2">{row.order_number}</Typography>
               {row.is_agent_order && row.user?.name && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                     Customer: {row.user.name}
                  </Typography>
               )}
            </TableCell>

            <TableCell>
               {row.created_at ? dayjs(row.created_at).format('DD MMM YYYY HH:mm') : '-'}
            </TableCell>

            <TableCell>
               <Chip
                  label={statusLabel[row.status || 'waiting_payment']}
                  color={statusColor[row.status || 'waiting_payment']}
                  size="small"
                  variant="soft"
               />
            </TableCell>

            <TableCell>
               <Typography variant="subtitle2">{fCurrency(row.total_bill || 0)}</Typography>
            </TableCell>

            <TableCell align="right">
               <IconButton onClick={handleViewDetails}>
                  <Iconify icon="solar:eye-bold" />
               </IconButton>
            </TableCell>
         </TableRow>

         {row.status === 'stock_issue' && (
            <StockIssueModal
               open={openStockIssueModal}
               onClose={handleCloseStockIssueModal}
               order={row}
               onRefund={handleRefund}
               onWaitRestock={handleWaitRestock}
            />
         )}
      </>
   );
}
