import type { Order } from 'src/types/order';

import { useState } from 'react';
import { toast } from 'sonner';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';
import useOrderStore from 'src/stores/order';

// ----------------------------------------------------------------------

type Props = {
   open: boolean;
   onClose: () => void;
   order: Order;
   onSuccess: () => void;
};

export function VerifyPaymentModal({ open, onClose, order, onSuccess }: Props) {
   const [loading, setLoading] = useState(false);

   const { verifyPayment } = useOrderStore();

   const handleSubmit = async () => {
      setLoading(true);
      try {
         const response = await verifyPayment({
            id: order.id!,
            data: { action: 'approve' },
         });

         if (response.success) {
            toast.success('Payment verified successfully, order status updated to Waiting Process');
            onSuccess();
            onClose();
         } else {
            toast.error(response.message || 'Failed to verify payment');
         }
      } catch (error) {
         console.error(error);
         toast.error('An error occurred while verifying payment');
      } finally {
         setLoading(false);
      }
   };

   return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
         <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Iconify icon="solar:check-circle-bold" width={28} color="success.main" />
                  <Typography variant="h6">Verify Manual Payment</Typography>
               </Box>
               <IconButton onClick={onClose}>
                  <Iconify icon="solar:close-circle-bold" />
               </IconButton>
            </Box>
         </DialogTitle>

         <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
               <Box>
                  <Typography variant="caption" color="text.secondary">
                     Order Number
                  </Typography>
                  <Typography variant="subtitle1">{order.order_number}</Typography>
               </Box>

               <Box
                  sx={{
                     p: 2,
                     bgcolor: 'success.lighter',
                     borderRadius: 1,
                     border: 1,
                     borderColor: 'success.light',
                  }}
               >
                  <Typography variant="body2" color="success.darker">
                     <strong>Confirmation:</strong> Manual payment has been received and verified.
                     The order status will be updated to <strong>Waiting Process</strong>.
                  </Typography>
               </Box>

               {/* Show payment proof if available */}
               {order.payment_proof && (
                  <Box>
                     <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Payment Proof
                     </Typography>
                     <Box
                        sx={{
                           border: 1,
                           borderColor: 'divider',
                           borderRadius: 1,
                           overflow: 'hidden',
                           maxWidth: 400,
                        }}
                     >
                        <img
                           src={`${process.env.NEXT_PUBLIC_API_HOST}/${order.payment_proof}`}
                           alt="Payment Proof"
                           style={{ width: '100%', height: 'auto', display: 'block' }}
                        />
                     </Box>
                  </Box>
               )}
            </Box>
         </DialogContent>

         <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={onClose} variant="outlined" color="inherit">
               Cancel
            </Button>
            <Button
               onClick={handleSubmit}
               variant="contained"
               color="success"
               disabled={loading}
               startIcon={<Iconify icon="solar:check-circle-bold" />}
            >
               {loading ? 'Processing...' : 'Confirm Payment Valid'}
            </Button>
         </DialogActions>
      </Dialog>
   );
}
