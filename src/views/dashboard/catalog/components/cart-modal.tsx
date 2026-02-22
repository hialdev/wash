'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CardMedia from '@mui/material/CardMedia';
import Alert from '@mui/material/Alert';

import { paths } from 'src/routes/al/paths';

import useCartStore from 'src/stores/cart';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { fCurrency } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type Props = {
   open: boolean;
   onClose: () => void;
};

export function CartModal({ open, onClose }: Props) {
   const router = useRouter();
   const {
      items,
      serviceItems,
      updateQty,
      removeItem,
      removeServiceItem,
      updateServiceQty,
      getTotalPrice,
      getProductTotalPrice,
      getServiceTotalPrice,
      getProductItemCount,
      getServiceItemCount,
      clearCart,
      validateAllStock,
      validateStock,
   } = useCartStore();

   const [loading, setLoading] = useState<boolean>(false);
   const [stockErrors, setStockErrors] = useState<string[]>([]);
   const [activeTab, setActiveTab] = useState<0 | 1>(0); // 0 = Products, 1 = Services

   const totalPrice = getTotalPrice();
   const productQty = getProductItemCount();
   const serviceQty = getServiceItemCount();
   const hasAnyItem = items.length > 0 || serviceItems.length > 0;

   const handleUpdateQty = async (
      productId: string,
      newQty: number,
      currentQty: number,
      requestedLength?: number
   ) => {
      if (newQty <= 0) {
         removeItem(productId, requestedLength);
         return;
      }
      if (newQty > currentQty) {
         const validation = await validateStock(productId, newQty, requestedLength);
         if (!validation.isValid) {
            toast.error(`Stock tidak mencukupi! Tersedia: ${validation.availableStock}`);
            return;
         }
      }
      updateQty(productId, newQty, requestedLength);
   };

   const handleCheckout = async () => {
      if (!hasAnyItem) {
         toast.error('Keranjang kosong');
         return;
      }

      setLoading(true);
      setStockErrors([]);

      try {
         // Validate product stock
         const validations = await validateAllStock();
         const errors: string[] = [];
         validations.forEach((v) => {
            if (!v.isValid) {
               errors.push(
                  `${v.productTitle}: Stock tersedia ${v.availableStock}, diminta ${v.requestedQty}`
               );
            }
         });

         if (errors.length > 0) {
            setStockErrors(errors);
            setLoading(false);
            return;
         }

         router.push(paths.dashboard.customer_orders.checkout);
         onClose();
      } catch (error) {
         toast.error('Gagal memvalidasi stock');
      }

      setLoading(false);
   };

   return (
      <Dialog
         open={open}
         onClose={onClose}
         maxWidth="md"
         fullWidth
         PaperProps={{ sx: { width: '90%', maxWidth: '900px' } }}
      >
         <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <Typography variant="h5">Shopping Cart</Typography>
               <IconButton onClick={onClose}>
                  <Iconify icon="solar:close-circle-bold" />
               </IconButton>
            </Box>
         </DialogTitle>

         {/* Tab Switcher */}
         <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
            <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
               <Tab
                  label={
                     <Badge badgeContent={productQty} color="primary" max={99}>
                        <Box sx={{ pr: productQty > 0 ? 2 : 0 }}>Produk</Box>
                     </Badge>
                  }
               />
               <Tab
                  label={
                     <Badge badgeContent={serviceQty} color="secondary" max={99}>
                        <Box sx={{ pr: serviceQty > 0 ? 2 : 0 }}>Services</Box>
                     </Badge>
                  }
               />
            </Tabs>
         </Box>

         <DialogContent>
            {/* ── TAB: PRODUCTS ── */}
            {activeTab === 0 && (
               <>
                  {items.length === 0 ? (
                     <Box sx={{ py: 8, textAlign: 'center' }}>
                        <Iconify
                           icon="solar:cart-large-2-bold-duotone"
                           width={80}
                           sx={{ color: 'text.disabled', mb: 2 }}
                        />
                        <Typography variant="h6" color="text.secondary">
                           Belum ada produk di keranjang
                        </Typography>
                     </Box>
                  ) : (
                     <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Stock Errors */}
                        {stockErrors.length > 0 && (
                           <Alert severity="error">
                              <Typography variant="subtitle2" gutterBottom>
                                 Stock telah berubah:
                              </Typography>
                              <ul style={{ margin: 0, paddingLeft: 20 }}>
                                 {stockErrors.map((error, index) => (
                                    <li key={index}>
                                       <Typography variant="body2">{error}</Typography>
                                    </li>
                                 ))}
                              </ul>
                           </Alert>
                        )}

                        {/* Product Items */}
                        {items.map((item, index) => {
                           const imageUrl = item.product.image
                              ? `${process.env.NEXT_PUBLIC_API_HOST}/${item.product.image}`
                              : '/assets/placeholder.svg';
                           const isIndividual = item.product.tracking_mode === 'individual';
                           const subtotal = isIndividual
                              ? (item.product.sale_price || 0) *
                                (item.requested_length || 0) *
                                item.qty
                              : (item.product.sale_price || 0) * item.qty;
                           const itemKey = isIndividual
                              ? `${item.product.id}-${item.requested_length}`
                              : item.product.id;

                           return (
                              <Box
                                 key={itemKey}
                                 sx={{
                                    display: 'flex',
                                    gap: 2,
                                    p: 2,
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                 }}
                              >
                                 <CardMedia
                                    component="img"
                                    image={imageUrl}
                                    alt={item.product.title}
                                    sx={{
                                       width: 100,
                                       height: 100,
                                       objectFit: 'cover',
                                       borderRadius: 1,
                                       bgcolor: 'background.neutral',
                                    }}
                                 />

                                 <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                       {item.product.title}
                                    </Typography>
                                    <Typography variant="h6" color="primary.main" gutterBottom>
                                       {fCurrency(item.product.sale_price || 0)}
                                       {isIndividual && (
                                          <Typography
                                             component="span"
                                             variant="caption"
                                             color="text.secondary"
                                          >
                                             {' '}
                                             / {item.measurement_unit}
                                          </Typography>
                                       )}
                                    </Typography>
                                    {isIndividual && (
                                       <Typography
                                          variant="caption"
                                          color="primary.main"
                                          sx={{ display: 'block', mb: 1 }}
                                       >
                                          {item.qty} × {item.requested_length}{' '}
                                          {item.measurement_unit} ={' '}
                                          {(item.qty * (item.requested_length || 0)).toFixed(2)}{' '}
                                          {item.measurement_unit}
                                       </Typography>
                                    )}

                                    <Box
                                       sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}
                                    >
                                       <IconButton
                                          size="small"
                                          onClick={() =>
                                             handleUpdateQty(
                                                item.product.id!,
                                                item.qty - 1,
                                                item.qty,
                                                item.requested_length
                                             )
                                          }
                                          sx={{ border: 1, borderColor: 'divider' }}
                                       >
                                          <Iconify icon="solar:minus-circle-bold" width={20} />
                                       </IconButton>
                                       <Typography
                                          variant="body1"
                                          sx={{ minWidth: 40, textAlign: 'center' }}
                                       >
                                          {item.qty}
                                       </Typography>
                                       <IconButton
                                          size="small"
                                          onClick={() =>
                                             handleUpdateQty(
                                                item.product.id!,
                                                item.qty + 1,
                                                item.qty,
                                                item.requested_length
                                             )
                                          }
                                          sx={{ border: 1, borderColor: 'divider' }}
                                       >
                                          <Iconify icon="solar:add-circle-bold" width={20} />
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
                                       onClick={() =>
                                          removeItem(item.product.id!, item.requested_length)
                                       }
                                    >
                                       <Iconify icon="solar:trash-bin-trash-bold" />
                                    </IconButton>
                                    <Typography variant="h6" color="primary.main">
                                       {fCurrency(subtotal)}
                                    </Typography>
                                 </Box>
                              </Box>
                           );
                        })}

                        <Divider />
                        {/* Product subtotal */}
                        <Box
                           sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              p: 2,
                              bgcolor: 'background.neutral',
                              borderRadius: 1,
                           }}
                        >
                           <Typography variant="subtitle1">Total Produk:</Typography>
                           <Typography variant="h6" color="primary.main">
                              {fCurrency(getProductTotalPrice())}
                           </Typography>
                        </Box>
                     </Box>
                  )}
               </>
            )}

            {/* ── TAB: SERVICES ── */}
            {activeTab === 1 && (
               <>
                  {serviceItems.length === 0 ? (
                     <Box sx={{ py: 8, textAlign: 'center' }}>
                        <Iconify
                           icon="solar:washing-machine-bold-duotone"
                           width={80}
                           sx={{ color: 'text.disabled', mb: 2 }}
                        />
                        <Typography variant="h6" color="text.secondary">
                           Belum ada service di keranjang
                        </Typography>
                     </Box>
                  ) : (
                     <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {serviceItems.map((item) => {
                           const subtotal = (item.service.price || 0) * item.qty;
                           return (
                              <Box
                                 key={item.service.id}
                                 sx={{
                                    display: 'flex',
                                    gap: 2,
                                    p: 2,
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                 }}
                              >
                                 <Box
                                    sx={{
                                       width: 100,
                                       height: 100,
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
                                       width={48}
                                       sx={{ color: 'text.disabled' }}
                                    />
                                 </Box>

                                 <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                       {item.service.name}
                                    </Typography>
                                    <Typography variant="h6" color="secondary.main" gutterBottom>
                                       {fCurrency(item.service.price || 0)}
                                       <Typography
                                          component="span"
                                          variant="caption"
                                          color="text.secondary"
                                       >
                                          {' '}
                                          / {item.service.unit}
                                       </Typography>
                                    </Typography>
                                    {item.notes && (
                                       <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{ display: 'block', mb: 1 }}
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
                                                Math.max(0, Math.round((item.qty - 0.5) * 10) / 10)
                                             )
                                          }
                                          sx={{ border: 1, borderColor: 'divider' }}
                                       >
                                          <Iconify icon="solar:minus-circle-bold" width={20} />
                                       </IconButton>
                                       <Typography
                                          variant="body1"
                                          sx={{ minWidth: 50, textAlign: 'center' }}
                                       >
                                          {item.qty} {item.service.unit}
                                       </Typography>
                                       <IconButton
                                          size="small"
                                          onClick={() =>
                                             updateServiceQty(
                                                item.service.id,
                                                Math.round((item.qty + 0.5) * 10) / 10
                                             )
                                          }
                                          sx={{ border: 1, borderColor: 'divider' }}
                                       >
                                          <Iconify icon="solar:add-circle-bold" width={20} />
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
                                       onClick={() => removeServiceItem(item.service.id)}
                                    >
                                       <Iconify icon="solar:trash-bin-trash-bold" />
                                    </IconButton>
                                    <Typography variant="h6" color="secondary.main">
                                       {fCurrency(subtotal)}
                                    </Typography>
                                 </Box>
                              </Box>
                           );
                        })}

                        <Divider />
                        {/* Service subtotal */}
                        <Box
                           sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              p: 2,
                              bgcolor: 'background.neutral',
                              borderRadius: 1,
                           }}
                        >
                           <Typography variant="subtitle1">Total Services:</Typography>
                           <Typography variant="h6" color="secondary.main">
                              {fCurrency(getServiceTotalPrice())}
                           </Typography>
                        </Box>
                     </Box>
                  )}
               </>
            )}
         </DialogContent>

         {/* Grand Total + Actions */}
         <Box sx={{ px: 3, pb: 1 }}>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <Typography variant="h6">Grand Total:</Typography>
               <Typography variant="h5" color="primary.main">
                  {fCurrency(totalPrice)}
               </Typography>
            </Box>
         </Box>

         <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            {hasAnyItem && (
               <Button onClick={() => clearCart()} variant="outlined" color="error">
                  Clear Semua
               </Button>
            )}
            <Box sx={{ flexGrow: 1 }} />
            <Button onClick={onClose} variant="outlined" color="inherit">
               Lanjut Belanja
            </Button>
            <Button
               onClick={handleCheckout}
               variant="contained"
               disabled={loading || !hasAnyItem}
               startIcon={<Iconify icon="solar:card-send-bold" />}
            >
               {loading ? 'Validating...' : 'Checkout'}
            </Button>
         </DialogActions>
      </Dialog>
   );
}
