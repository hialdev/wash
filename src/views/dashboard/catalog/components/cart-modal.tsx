'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { paths } from 'src/routes/al/paths';

import useCartStore from 'src/stores/cart';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { fCurrency } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type Props = {
   open: boolean;
   onClose: () => void;
   checkoutHref?: string;
};

export function CartModal({ open, onClose, checkoutHref }: Props) {
   const router = useRouter();
   const {
      serviceItems,
      removeServiceItem,
      updateServiceQty,
      getServiceTotalPrice,
      clearCart,
   } = useCartStore();

   const [loading, setLoading] = useState<boolean>(false);

   const totalPrice = getServiceTotalPrice();
   const serviceItemDistinctCount = serviceItems.length; // number of selected distinct items
   const hasAnyItem = serviceItems.length > 0;

   const handleCheckout = async () => {
      if (!hasAnyItem) {
         toast.error('Keranjang kosong');
         return;
      }

      setLoading(true);
      try {
         router.push(checkoutHref || paths.dashboard.customer_orders.checkout);
         onClose();
      } catch (error) {
         toast.error('Gagal memproses checkout');
      }
      setLoading(false);
   };

   return (
      <Dialog
         open={open}
         onClose={onClose}
         maxWidth="sm"
         fullWidth
         PaperProps={{ sx: { width: '90%', maxWidth: '600px' } }}
      >
         <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Keranjang Belanja ({serviceItemDistinctCount})
               </Typography>
               <IconButton onClick={onClose}>
                  <Iconify icon="solar:close-circle-bold" />
               </IconButton>
            </Box>
         </DialogTitle>

         <DialogContent sx={{ pt: 1 }}>
            {serviceItems.length === 0 ? (
               <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Iconify
                     icon="solar:washing-machine-bold-duotone"
                     width={80}
                     sx={{ color: 'text.disabled', mb: 2, opacity: 0.5 }}
                  />
                  <Typography variant="h6" color="text.secondary">
                     Belum ada service di keranjang
                  </Typography>
               </Box>
            ) : (
               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {serviceItems.map((item) => {
                     const itemPrice = item.variant ? item.variant.price : item.service.price;
                     const itemUnit = item.variant ? item.variant.unit : item.service.unit;
                     const subtotal = (itemPrice || 0) * item.qty;
                     return (
                        <Box
                           key={item.variant ? `${item.service.id}-${item.variant.id}` : item.service.id}
                           sx={{
                              display: 'flex',
                              gap: 2,
                              p: 2,
                              border: 1,
                              borderColor: 'divider',
                              borderRadius: 1.5,
                              bgcolor: 'background.paper',
                           }}
                        >
                           <Box
                              sx={{
                                 width: 80,
                                 height: 80,
                                 borderRadius: 1,
                                 bgcolor: 'background.neutral',
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 flexShrink: 0,
                              }}
                           >
                              <Iconify
                                 icon="solar:washing-machine-bold-duotone"
                                 width={40}
                                 sx={{ color: 'text.disabled', opacity: 0.5 }}
                              />
                           </Box>

                           <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                 {item.service.name} {item.variant ? `(${item.variant.name})` : ''}
                              </Typography>
                              <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 600, mb: 0.5 }}>
                                 {fCurrency(itemPrice || 0)}
                                 <Typography
                                    component="span"
                                    variant="caption"
                                    color="text.secondary"
                                 >
                                    {' '}
                                    / {itemUnit}
                                 </Typography>
                              </Typography>
                              {item.notes && (
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}
                                 >
                                    Catatan: {item.notes}
                                 </Typography>
                              )}

                              <Box
                                 sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}
                              >
                                 <IconButton
                                    size="small"
                                    onClick={() =>
                                       updateServiceQty(
                                          item.service.id,
                                          Math.max(0, Math.round((item.qty - 0.5) * 10) / 10),
                                          item.variant?.id
                                       )
                                    }
                                    sx={{ border: 1, borderColor: 'divider' }}
                                 >
                                    <Iconify icon="solar:minus-circle-bold" width={18} />
                                 </IconButton>
                                 <Typography
                                    variant="body2"
                                    sx={{ minWidth: 45, textAlign: 'center', fontWeight: 600 }}
                                 >
                                    {item.qty} {itemUnit}
                                 </Typography>
                                 <IconButton
                                    size="small"
                                    onClick={() =>
                                       updateServiceQty(
                                          item.service.id,
                                          Math.round((item.qty + 0.5) * 10) / 10,
                                          item.variant?.id
                                       )
                                    }
                                    sx={{ border: 1, borderColor: 'divider' }}
                                 >
                                    <Iconify icon="solar:add-circle-bold" width={18} />
                                 </IconButton>
                              </Box>
                           </Box>

                           <Box
                              sx={{
                                 display: 'flex',
                                 flexDirection: 'column',
                                 alignItems: 'flex-end',
                                 justifyContent: 'space-between',
                              }}
                           >
                              <IconButton
                                 size="small"
                                 color="error"
                                 onClick={() => removeServiceItem(item.service.id, item.variant?.id)}
                              >
                                 <Iconify icon="solar:trash-bin-trash-bold" />
                              </IconButton>
                              <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 700 }}>
                                 {fCurrency(subtotal)}
                              </Typography>
                           </Box>
                        </Box>
                     );
                  })}
               </Box>
            )}
         </DialogContent>

         {/* Grand Total */}
         {hasAnyItem && (
            <Box sx={{ px: 3, pb: 1 }}>
               <Divider sx={{ mb: 2 }} />
               <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Grand Total:</Typography>
                  <Typography variant="h5" color="primary.main" sx={{ fontWeight: 700 }}>
                     {fCurrency(totalPrice)}
                  </Typography>
               </Box>
            </Box>
         )}

         <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            {hasAnyItem && (
               <Button onClick={() => clearCart()} variant="outlined" color="error">
                  Hapus Semua
               </Button>
            )}
            <Box sx={{ flexGrow: 1 }} />
            <Button onClick={onClose} variant="outlined" color="inherit">
               Kembali
            </Button>
            <Button
               onClick={handleCheckout}
               variant="contained"
               disabled={loading || !hasAnyItem}
               startIcon={<Iconify icon="solar:card-send-bold" />}
            >
               Checkout
            </Button>
         </DialogActions>
      </Dialog>
   );
}
