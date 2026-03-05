'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardMedia from '@mui/material/CardMedia';
import LoadingButton from '@mui/lab/LoadingButton';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';

import { paths } from 'src/routes/al/paths';

import useCartStore from 'src/stores/cart';
import useOrderStore from 'src/stores/order';
import useVoucherStore from 'src/stores/voucher';
import useDeliveryAddressStore from 'src/stores/delivery-address';
import type { IDeliveryAddress } from 'src/stores/delivery-address';
import type { IVoucher } from 'src/types/voucher';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { fCurrency } from 'src/utils/format-number';
import { AddressDialog } from 'src/views/dashboard/my-account/components/profile-form';

// ----------------------------------------------------------------------

const CheckoutSchema = z.object({
   address_receiver: z.string().min(1, { message: 'Address is required!' }),
   phone_receiver: z.string().min(1, { message: 'Phone number is required!' }),
   notes: z.string().optional(),
});

type CheckoutFormType = z.infer<typeof CheckoutSchema>;

// ----------------------------------------------------------------------

export function CheckoutView() {
   const router = useRouter();
   const { items, serviceItems, getTotalPrice, clearCart, validateAllStock } = useCartStore();
   const { checkout } = useOrderStore();
   const { fetchVouchers, validateVoucher } = useVoucherStore();
   const { addresses, fetchAddresses } = useDeliveryAddressStore();

   const [loading, setLoading] = useState<boolean>(false);
   const [validatingVoucher, setValidatingVoucher] = useState(false);
   const [selectedAddress, setSelectedAddress] = useState<IDeliveryAddress | null>(null);
   const [addAddressOpen, setAddAddressOpen] = useState(false);

   const [voucherInput, setVoucherInput] = useState('');
   const [appliedVoucher, setAppliedVoucher] = useState<IVoucher | null>(null);
   const [discountAmount, setDiscountAmount] = useState(0);
   const [publicVouchers, setPublicVouchers] = useState<IVoucher[]>([]);

   const totalPrice = getTotalPrice();
   const finalPrice = Math.max(0, totalPrice - discountAmount);
   const hasAnyItem = items.length > 0 || serviceItems.length > 0;

   // Load public vouchers and saved addresses
   useEffect(() => {
      const getPublic = async () => {
         try {
            const res = await fetchVouchers({ is_public: true, is_active: true });
            if (res?.data) {
               setPublicVouchers(res.data);
            }
         } catch (err) {
            console.error(err);
         }
      };
      getPublic();
      fetchAddresses()
         .then((res) => {
            // Auto-select primary address
            const list: IDeliveryAddress[] = res?.data?.data || res?.data || [];
            const primary = list.find((a: IDeliveryAddress) => a.is_primary);
            if (primary) {
               setSelectedAddress(primary);
               setValue('address_receiver', primary.address);
               setValue('phone_receiver', primary.phone_number);
            }
         })
         .catch(() => {});
   }, [fetchVouchers, fetchAddresses]);

   const methods = useForm<CheckoutFormType>({
      resolver: zodResolver(CheckoutSchema),
      defaultValues: {
         address_receiver: '',
         phone_receiver: '',
         notes: '',
      },
   });

   const {
      handleSubmit,
      setValue,
      formState: { isSubmitting },
   } = methods;

   // When address is selected, populate form fields
   const handleSelectAddress = (addr: IDeliveryAddress | null) => {
      setSelectedAddress(addr);
      if (addr) {
         setValue('address_receiver', addr.address);
         setValue('phone_receiver', addr.phone_number);
      }
   };

   // After adding a new address, refresh list and auto-select the latest
   const handleAddressAdded = async () => {
      const res = await fetchAddresses();
      const list: IDeliveryAddress[] = res?.data?.data || res?.data || [];
      if (list.length > 0) {
         const latest = list[list.length - 1];
         handleSelectAddress(latest);
      }
   };

   const onSubmit = handleSubmit(async (data) => {
      if (!hasAnyItem) {
         toast.error('Keranjang kosong');
         return;
      }

      setLoading(true);

      try {
         // Validate product stock
         if (items.length > 0) {
            const validations = await validateAllStock();
            const hasInvalidStock = validations.some((v) => !v.isValid);

            if (hasInvalidStock) {
               const errors = validations
                  .filter((v) => !v.isValid)
                  .map(
                     (v) =>
                        `${v.productTitle}: Stock tersedia ${v.availableStock}, diminta ${v.requestedQty}`
                  );

               toast.error(
                  <div>
                     <div>Stock telah berubah:</div>
                     <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {errors.map((error, index) => (
                           <li key={index}>{error}</li>
                        ))}
                     </ul>
                  </div>
               );
               setLoading(false);
               return;
            }
         }

         // Create order
         const orderData = {
            address_receiver: data.address_receiver,
            phone_receiver: data.phone_receiver,
            notes: data.notes || '',
            voucher_code: appliedVoucher ? appliedVoucher.code : undefined,
            // Map product items
            products: items.map((item) => ({
               product_id: item.product.id!,
               qty: item.qty,
               requested_length: item.requested_length,
               measurement_unit: item.measurement_unit,
            })),
            // Map service items
            services: serviceItems.map((item) => ({
               service_id: item.service.id!,
               qty: item.qty,
               notes: item.notes,
            })),
         };

         const response = await checkout({ data: orderData as any });

         if (response.success && response.data) {
            toast.success('Order berhasil dibuat');
            clearCart();
            // Redirect to payment page
            router.push(paths.dashboard.customer_orders.payment(response.data.id));
         } else {
            toast.error(response.message || 'Gagal membuat order');
         }
      } catch (error: any) {
         toast.error(error.message || 'Gagal membuat order');
      }

      setLoading(false);
   });

   const handleApplyVoucher = async () => {
      if (!voucherInput.trim()) {
         toast.error('Please enter a voucher code');
         return;
      }
      setValidatingVoucher(true);
      try {
         const res = await validateVoucher(voucherInput, totalPrice);
         if (res.success && res.data) {
            setAppliedVoucher(res.data.voucher);
            setDiscountAmount(res.data.discount_amount);
            toast.success('Voucher applied successfully!');
         } else {
            toast.error(res.message || 'Invalid voucher');
            setAppliedVoucher(null);
            setDiscountAmount(0);
         }
      } catch (error: any) {
         toast.error(error.response?.data?.message || 'Invalid voucher');
         setAppliedVoucher(null);
         setDiscountAmount(0);
      }
      setValidatingVoucher(false);
   };

   const handleRemoveVoucher = () => {
      setAppliedVoucher(null);
      setDiscountAmount(0);
      setVoucherInput('');
   };

   if (!hasAnyItem) {
      return (
         <DashboardContent>
            <CustomBreadcrumbs
               heading="Checkout"
               links={[
                  { name: 'Dashboard', href: paths.dashboard.root },
                  { name: 'Catalog', href: paths.dashboard.customer_orders.catalog },
                  { name: 'Checkout' },
               ]}
               sx={{ mb: { xs: 3, md: 5 } }}
            />

            <Card sx={{ p: 8, textAlign: 'center' }}>
               <Iconify
                  icon="solar:cart-large-2-bold-duotone"
                  width={80}
                  sx={{ color: 'text.disabled', mb: 2 }}
               />
               <Typography variant="h6" color="text.secondary" gutterBottom>
                  Keranjang kosong
               </Typography>
               <Button
                  variant="contained"
                  onClick={() => router.push(paths.dashboard.customer_orders.catalog)}
                  sx={{ mt: 2 }}
               >
                  Kembali ke Catalog
               </Button>
            </Card>
         </DashboardContent>
      );
   }

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Checkout"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Catalog', href: paths.dashboard.customer_orders.catalog },
               { name: 'Checkout' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <Form methods={methods} onSubmit={onSubmit}>
            <Grid container spacing={3}>
               {/* Order Summary */}
               <Grid size={{ xs: 12, md: 8 }}>
                  <Card sx={{ p: 3 }}>
                     <Typography variant="h6" gutterBottom>
                        Order Summary
                     </Typography>

                     {/* PRODUCT SECTION */}
                     {items.length > 0 && (
                        <Box
                           sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, mb: 3 }}
                        >
                           <Typography variant="subtitle2" color="text.secondary">
                              Products ({items.length})
                           </Typography>
                           {items.map((item, i) => {
                              const imageUrl = item.product.image
                                 ? `${process.env.NEXT_PUBLIC_API_HOST}/${item.product.image}`
                                 : '/assets/placeholder.svg';

                              const isIndividual = item.product.tracking_mode === 'individual';
                              const subtotal = isIndividual
                                 ? (item.product.sale_price || 0) *
                                   (item.requested_length || 0) *
                                   item.qty
                                 : (item.product.sale_price || 0) * item.qty;

                              return (
                                 <Box
                                    key={`prod-${i}`}
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
                                          width: 80,
                                          height: 80,
                                          objectFit: 'cover',
                                          borderRadius: 1,
                                          bgcolor: 'background.neutral',
                                       }}
                                    />

                                    <Box sx={{ flexGrow: 1 }}>
                                       <Typography variant="subtitle1">
                                          {item.product.title}
                                       </Typography>
                                       {isIndividual ? (
                                          <>
                                             <Typography variant="body2" color="text.secondary">
                                                {fCurrency(item.product.sale_price || 0)}/
                                                {item.measurement_unit} × {item.requested_length}{' '}
                                                {item.measurement_unit} × {item.qty} qty
                                             </Typography>
                                             <Typography variant="caption" color="primary.main">
                                                Total:{' '}
                                                {((item.requested_length || 0) * item.qty).toFixed(
                                                   2
                                                )}{' '}
                                                {item.measurement_unit}
                                             </Typography>
                                          </>
                                       ) : (
                                          <Typography variant="body2" color="text.secondary">
                                             {fCurrency(item.product.sale_price || 0)} × {item.qty}
                                          </Typography>
                                       )}
                                    </Box>

                                    <Typography variant="h6" color="primary.main">
                                       {fCurrency(subtotal)}
                                    </Typography>
                                 </Box>
                              );
                           })}
                        </Box>
                     )}

                     {items.length > 0 && serviceItems.length > 0 && <Divider sx={{ my: 3 }} />}

                     {/* SERVICE SECTION */}
                     {serviceItems.length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                           <Typography variant="subtitle2" color="text.secondary">
                              Services ({serviceItems.length})
                           </Typography>
                           {serviceItems.map((item, i) => {
                              const subtotal = (item.service.price || 0) * item.qty;

                              return (
                                 <Box
                                    key={`serv-${i}`}
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
                                          sx={{ color: 'text.disabled' }}
                                       />
                                    </Box>

                                    <Box sx={{ flexGrow: 1 }}>
                                       <Typography variant="subtitle1">
                                          {item.service.name}
                                       </Typography>
                                       <Typography variant="body2" color="text.secondary">
                                          {fCurrency(item.service.price || 0)} × {item.qty}{' '}
                                          {item.service.unit}
                                       </Typography>
                                       {item.notes && (
                                          <Typography
                                             variant="caption"
                                             color="text.secondary"
                                             sx={{ display: 'block' }}
                                          >
                                             Note: {item.notes}
                                          </Typography>
                                       )}
                                    </Box>

                                    <Typography variant="h6" color="secondary.main">
                                       {fCurrency(subtotal)}
                                    </Typography>
                                 </Box>
                              );
                           })}
                        </Box>
                     )}

                     {/* MOVED: Subtotal and Total moved to Delivery Information Card */}
                  </Card>
               </Grid>

               {/* Delivery Information */}
               <Grid size={{ xs: 12, md: 4 }}>
                  <Card sx={{ p: 3, position: 'sticky', top: 24 }}>
                     <Typography variant="h6" gutterBottom>
                        Delivery Information
                     </Typography>

                     <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        {/* Delivery Address Selector */}
                        {addresses.length > 0 ? (
                           <Box>
                              <Autocomplete<IDeliveryAddress>
                                 options={addresses}
                                 value={selectedAddress}
                                 onChange={(_, val) => handleSelectAddress(val)}
                                 getOptionLabel={(opt) =>
                                    `${opt.is_primary ? '★ ' : ''}${opt.phone_number} — ${opt.address.slice(0, 35)}${opt.address.length > 35 ? '…' : ''}`
                                 }
                                 isOptionEqualToValue={(opt, val) => opt.id === val.id}
                                 renderInput={(params) => (
                                    <TextField
                                       {...params}
                                       label="Pilih Alamat Pengiriman"
                                       size="small"
                                       placeholder="Cari atau pilih alamat..."
                                    />
                                 )}
                                 renderOption={(props, option) => (
                                    <Box component="li" {...props} key={option.id}>
                                       <Box>
                                          <Box
                                             sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.5,
                                             }}
                                          >
                                             {option.is_primary && (
                                                <Chip
                                                   label="Utama"
                                                   size="small"
                                                   color="primary"
                                                   sx={{ height: 18, fontSize: 10 }}
                                                />
                                             )}
                                             <Typography variant="subtitle2">
                                                {option.phone_number}
                                             </Typography>
                                          </Box>
                                          <Typography variant="caption" color="text.secondary">
                                             {option.address}
                                          </Typography>
                                       </Box>
                                    </Box>
                                 )}
                              />

                              {/* Preview card for selected address */}
                              {selectedAddress && (
                                 <Box
                                    sx={{
                                       mt: 1.5,
                                       p: 2,
                                       borderRadius: 1.5,
                                       border: '1px solid',
                                       borderColor: 'primary.light',
                                       bgcolor: 'primary.lighter',
                                    }}
                                 >
                                    <Stack
                                       direction="row"
                                       spacing={1}
                                       alignItems="center"
                                       sx={{ mb: 0.5 }}
                                    >
                                       <Iconify
                                          icon="solar:phone-bold-duotone"
                                          width={16}
                                          sx={{ color: 'primary.main' }}
                                       />
                                       <Typography variant="subtitle2">
                                          {selectedAddress.phone_number}
                                       </Typography>
                                       {selectedAddress.is_primary && (
                                          <Chip
                                             label="Utama"
                                             size="small"
                                             color="primary"
                                             sx={{ height: 18, fontSize: 10 }}
                                          />
                                       )}
                                    </Stack>
                                    <Stack direction="row" spacing={1} alignItems="flex-start">
                                       <Iconify
                                          icon="solar:map-point-bold-duotone"
                                          width={16}
                                          sx={{ color: 'primary.main', mt: 0.2 }}
                                       />
                                       <Typography variant="body2">
                                          {selectedAddress.address}
                                       </Typography>
                                    </Stack>
                                    {selectedAddress.notes && (
                                       <Stack
                                          direction="row"
                                          spacing={1}
                                          alignItems="flex-start"
                                          sx={{ mt: 0.5 }}
                                       >
                                          <Iconify
                                             icon="solar:notes-bold-duotone"
                                             width={16}
                                             sx={{ color: 'text.secondary', mt: 0.2 }}
                                          />
                                          <Typography variant="caption" color="text.secondary">
                                             {selectedAddress.notes}
                                          </Typography>
                                       </Stack>
                                    )}
                                 </Box>
                              )}
                           </Box>
                        ) : (
                           <Box
                              sx={{
                                 p: 2.5,
                                 borderRadius: 1.5,
                                 border: '1px dashed',
                                 borderColor: 'divider',
                                 textAlign: 'center',
                              }}
                           >
                              <Iconify
                                 icon="solar:map-point-bold-duotone"
                                 width={40}
                                 sx={{ color: 'text.disabled', mb: 1 }}
                              />
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                 Belum ada alamat pengiriman tersimpan.
                              </Typography>
                              <Button
                                 variant="outlined"
                                 onClick={() => {
                                    setAddAddressOpen(true);
                                 }}
                                 size="small"
                                 startIcon={<Iconify icon="solar:add-square-bold-duotone" />}
                              >
                                 Tambah Alamat
                              </Button>

                              <AddressDialog
                                 open={addAddressOpen}
                                 onClose={() => setAddAddressOpen(false)}
                                 onSaved={() => {
                                    setAddAddressOpen(false);
                                 }}
                              />
                           </Box>
                        )}

                        <Field.Text
                           name="address_receiver"
                           label="Alamat Pengiriman"
                           multiline
                           rows={3}
                           required
                        />

                        <Field.Text name="phone_receiver" label="Nomor Telepon" required />

                        <Field.Text name="notes" label="Catatan (Opsional)" multiline rows={2} />
                     </Box>

                     <Divider sx={{ my: 3 }} />

                     <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                           Voucher Code
                        </Typography>
                        {appliedVoucher ? (
                           <Card
                              sx={{
                                 p: 2,
                                 bgcolor: 'background.neutral',
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'space-between',
                              }}
                           >
                              <Box>
                                 <Typography variant="subtitle2" color="primary.main">
                                    {appliedVoucher.code}
                                 </Typography>
                                 <Typography variant="body2" color="text.secondary">
                                    Discount applied: {fCurrency(discountAmount)}
                                 </Typography>
                              </Box>
                              <Button color="error" size="small" onClick={handleRemoveVoucher}>
                                 Remove
                              </Button>
                           </Card>
                        ) : (
                           <Box sx={{ display: 'flex', gap: 1 }}>
                              <TextField
                                 fullWidth
                                 size="small"
                                 placeholder="Enter voucher code"
                                 value={voucherInput}
                                 onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setVoucherInput(e.target.value)
                                 }
                              />
                              <Button
                                 variant="contained"
                                 color="primary"
                                 onClick={handleApplyVoucher}
                                 disabled={!voucherInput.trim() || validatingVoucher}
                              >
                                 Apply
                              </Button>
                           </Box>
                        )}

                        {publicVouchers.length > 0 && !appliedVoucher && (
                           <Box sx={{ mt: 2 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                 Available Vouchers:
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                 {publicVouchers.map((v) => (
                                    <Card
                                       key={v.id}
                                       sx={{
                                          p: 1.5,
                                          border: '1px dashed',
                                          borderColor: 'primary.main',
                                          cursor: 'pointer',
                                          width: '100%',
                                          '&:hover': { bgcolor: 'action.hover' },
                                       }}
                                       onClick={() => {
                                          setVoucherInput(v.code);
                                       }}
                                    >
                                       <Typography variant="subtitle2" color="primary">
                                          {v.code}
                                       </Typography>
                                       <Typography variant="caption" color="text.secondary">
                                          {v.discount_type === 'percentage'
                                             ? `${v.discount_value}% OFF`
                                             : `${fCurrency(v.discount_value)} OFF`}
                                       </Typography>
                                    </Card>
                                 ))}
                              </Box>
                           </Box>
                        )}
                     </Box>

                     <Divider sx={{ my: 3 }} />

                     <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                           <Typography variant="body2" color="text.secondary">
                              Subtotal
                           </Typography>
                           <Typography variant="subtitle2">{fCurrency(totalPrice)}</Typography>
                        </Box>
                        {discountAmount > 0 && (
                           <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="error">
                                 Discount
                              </Typography>
                              <Typography variant="subtitle2" color="error">
                                 -{fCurrency(discountAmount)}
                              </Typography>
                           </Box>
                        )}
                        <Box
                           sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              pt: 1,
                              mt: 1,
                              borderTop: 'dashed 1px',
                              borderColor: 'divider',
                           }}
                        >
                           <Typography variant="h6">Total:</Typography>
                           <Typography variant="h5" color="primary.main">
                              {fCurrency(finalPrice)}
                           </Typography>
                        </Box>
                     </Box>

                     <Divider sx={{ my: 3 }} />

                     <LoadingButton
                        fullWidth
                        size="large"
                        type="submit"
                        variant="contained"
                        loading={isSubmitting || loading}
                        startIcon={<Iconify icon="solar:card-send-bold" />}
                     >
                        Process Order
                     </LoadingButton>

                     <Button
                        fullWidth
                        variant="outlined"
                        color="inherit"
                        onClick={() => router.push(paths.dashboard.customer_orders.catalog)}
                        sx={{ mt: 1 }}
                     >
                        Back to Catalog
                     </Button>
                  </Card>
               </Grid>
            </Grid>
         </Form>
      </DashboardContent>
   );
}
