'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CardContent from '@mui/material/CardContent';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';

import type { IService, IServiceCategory } from 'src/types/service';
import type { IVoucher } from 'src/types/voucher';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import useServiceStore from 'src/stores/service';
import useVoucherStore from 'src/stores/voucher';
import useOrderStore from 'src/stores/order';
import type { UserData } from 'src/stores/user';
import type { IDeliveryAddressResult } from '../components/AddAddressModal';

// ----------------------------------------------------------------------

export interface BoardingCartItem {
   service: IService;
   variant?: IService | null;
   qty: number;
   notes?: string;
}

interface Props {
   customer: UserData;
   address: IDeliveryAddressResult;
   weightKg: string;
   selimutPcs: string;
   celanaPcs: string;
   bajuPcs: string;
   sempakPcs: string;
   braPcs: string;
   spreiPcs: string;
   lainnyaPcs: string;
   videoFile: File | null;
   notes: string;

   initialCartItems: BoardingCartItem[];
   initialVoucher: IVoucher | null;
   initialDiscountAmount: number;

   onBack: (items: BoardingCartItem[], voucher: IVoucher | null, discount: number) => void;
   onNext: (order: { id: string; order_number: string; total_bill: number; xendit_invoice_url?: string }) => void;
}

function formatCurrency(value: number) {
   return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

export function Step2ServiceSelect({
   customer,
   address,
   weightKg,
   selimutPcs,
   celanaPcs,
   bajuPcs,
   sempakPcs,
   braPcs,
   spreiPcs,
   lainnyaPcs,
   videoFile,
   notes,
   initialCartItems,
   initialVoucher,
   initialDiscountAmount,
   onBack,
   onNext,
}: Props) {
   const { fetchCatalogServices, fetchServiceCategories, categories } = useServiceStore();
   const { fetchVouchers, validateVoucher } = useVoucherStore();
   const { kasirCreateOrder } = useOrderStore();

   const [services, setServices] = useState<IService[]>([]);
   const [loading, setLoading] = useState(false);
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedCategory, setSelectedCategory] = useState<IServiceCategory | null>(null);
   const debouncedSearch = useDebounce(searchQuery, 400);

   // Cart state
   const [cartItems, setCartItems] = useState<BoardingCartItem[]>(initialCartItems);

   // Voucher state
   const [voucherCode, setVoucherCode] = useState(initialVoucher?.code || '');
   const [appliedVoucher, setAppliedVoucher] = useState<IVoucher | null>(initialVoucher);
   const [discountAmount, setDiscountAmount] = useState(initialDiscountAmount);
   const [voucherLoading, setVoucherLoading] = useState(false);
   const [submitting, setSubmitting] = useState(false);

   // Fetch catalog services
   const fetchServices = useCallback(async () => {
      setLoading(true);
      try {
         const params: any = { limit: 100, parent_id: 'none' };
         if (debouncedSearch) params.search = debouncedSearch;
         if (selectedCategory) params.category_id = selectedCategory.id;

         const res = await fetchCatalogServices(params);
         if (res.success) {
            // Only show parent services (no parent_id) that have no variants, or show parent + let user pick variant
            setServices(res.data?.services || []);
         }
      } catch {
         toast.error('Gagal memuat layanan');
      }
      setLoading(false);
   }, [debouncedSearch, selectedCategory, fetchCatalogServices]);

   useEffect(() => {
      fetchServiceCategories();
      fetchServices();
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   useEffect(() => {
      fetchServices();
   }, [fetchServices]);

   // ---- Cart Operations ----

   const isInCart = (serviceId: string, variantId?: string) =>
      cartItems.some(
         (i) => i.service.id === serviceId && (variantId ? i.variant?.id === variantId : !i.variant)
      );

   const handleToggleServiceVariant = (service: IService, variant: IService | null) => {
      const variantId = variant?.id;
      if (isInCart(service.id, variantId)) {
         // Remove exact match from cart
         setCartItems((prev) =>
            prev.filter(
               (i) => !(i.service.id === service.id && (variantId ? i.variant?.id === variantId : !i.variant))
            )
         );
      } else {
         // Add new entry
         setCartItems((prev) => [...prev, { service, variant, qty: 1 }]);
      }
      // Reset voucher when cart changes
      setAppliedVoucher(null);
      setDiscountAmount(0);
      setVoucherCode('');
   };

   const updateQty = (index: number, delta: number) => {
      setCartItems((prev) => {
         const next = [...prev];
         const newQty = (next[index].qty || 1) + delta;
         if (newQty < 1) {
            next.splice(index, 1);
         } else {
            next[index] = { ...next[index], qty: newQty };
         }
         return next;
      });
      setAppliedVoucher(null);
      setDiscountAmount(0);
   };

   const removeItem = (index: number) => {
      setCartItems((prev) => prev.filter((_, i) => i !== index));
      setAppliedVoucher(null);
      setDiscountAmount(0);
   };

   // ---- Voucher ----

   const subtotal = cartItems.reduce((sum, item) => {
      const price = item.variant ? item.variant.price : item.service.price;
      return sum + price * item.qty;
   }, 0);

   const handleApplyVoucher = async () => {
      if (!voucherCode.trim()) return;
      setVoucherLoading(true);
      try {
         const res = await validateVoucher(voucherCode.trim(), subtotal);
         if (res.success) {
            setAppliedVoucher(res.data?.voucher || null);
            setDiscountAmount(res.data?.discount_amount || 0);
            toast.success('Voucher berhasil diterapkan!');
         } else {
            toast.error(res.message || 'Voucher tidak valid');
            setAppliedVoucher(null);
            setDiscountAmount(0);
         }
      } catch {
         toast.error('Gagal memvalidasi voucher');
      }
      setVoucherLoading(false);
   };

   const handleRemoveVoucher = () => {
      setAppliedVoucher(null);
      setDiscountAmount(0);
      setVoucherCode('');
   };

   const total = Math.max(0, subtotal - discountAmount);

   const computedTotalPcs =
      (parseInt(selimutPcs, 10) || 0) +
      (parseInt(celanaPcs, 10) || 0) +
      (parseInt(bajuPcs, 10) || 0) +
      (parseInt(sempakPcs, 10) || 0) +
      (parseInt(braPcs, 10) || 0) +
      (parseInt(spreiPcs, 10) || 0) +
      (parseInt(lainnyaPcs, 10) || 0);

   const handleCheckout = async () => {
      if (cartItems.length === 0) {
         toast.error('Pilih minimal 1 layanan');
         return;
      }
      setSubmitting(true);
      try {
         const payload = {
            user_id: customer.id!,
            address_receiver: address.address,
            phone_receiver: address.phone_number,
            notes: notes.trim() || undefined,
            voucher_code: appliedVoucher?.code || undefined,
            weight_kg: weightKg ? parseFloat(weightKg) : undefined,
            total_pcs: computedTotalPcs,
            selimut_pcs: parseInt(selimutPcs, 10) || 0,
            celana_pcs: parseInt(celanaPcs, 10) || 0,
            baju_pcs: parseInt(bajuPcs, 10) || 0,
            sempak_pcs: parseInt(sempakPcs, 10) || 0,
            bra_pcs: parseInt(braPcs, 10) || 0,
            sprei_pcs: parseInt(spreiPcs, 10) || 0,
            lainnya_pcs: parseInt(lainnyaPcs, 10) || 0,
            products: [],
            services: cartItems.map((item) => ({
               service_id: item.service.id,
               service_variant_id: item.variant?.id || undefined,
               qty: item.qty,
            })),
         };

         let submitData: any = payload;
         if (videoFile) {
            const formData = new FormData();
            formData.append('data', JSON.stringify(payload));
            formData.append('video', videoFile);
            submitData = formData;
         }

         const res = await kasirCreateOrder({ data: submitData });
         if (res.success) {
            toast.success('Pesanan berhasil dibuat!');
            onNext({
               id: res.data?.id,
               order_number: res.data?.order_number,
               total_bill: res.data?.total_bill,
               xendit_invoice_url: res.data?.xendit_invoice_url,
            });
         } else {
            toast.error(res.message || 'Gagal membuat pesanan');
         }
      } catch (err: any) {
         toast.error(err?.message || 'Terjadi kesalahan');
      }
      setSubmitting(false);
   };

   // Check if a service (or its variant) is in cart
   const getCartBadge = (service: IService) => {
      const variants = service.variants?.filter((v) => v.is_active) || [];
      if (variants.length > 0) {
         return cartItems.some((i) => i.service.id === service.id);
      }
      return isInCart(service.id);
   };

   const detailingItems = [
      { name: 'Selimut', value: parseInt(selimutPcs, 10) || 0, icon: 'solar:bed-bold-duotone', color: 'info' },
      { name: 'Celana', value: parseInt(celanaPcs, 10) || 0, icon: 'ph:pants-bold', color: 'warning' },
      { name: 'Baju', value: parseInt(bajuPcs, 10) || 0, icon: 'solar:t-shirt-bold-duotone', color: 'success' },
      { name: 'Sempak', value: parseInt(sempakPcs, 10) || 0, icon: 'solar:shield-user-bold-duotone', color: 'error' },
      { name: 'Bra', value: parseInt(braPcs, 10) || 0, icon: 'solar:heart-bold-duotone', color: 'secondary' },
      { name: 'Sprei', value: parseInt(spreiPcs, 10) || 0, icon: 'solar:document-bold-duotone', color: 'primary' },
      { name: 'Lainnya', value: parseInt(lainnyaPcs, 10) || 0, icon: 'solar:box-bold-duotone', color: 'default' },
   ].filter((item) => item.value > 0);

   return (
      <Box>
         <Grid container spacing={3}>
            {/* ===== LEFT: Service Catalog ===== */}
            <Grid size={{ xs: 12, md: 8 }}>
               {/* Quick Info Summary Card */}
               <Card
                  sx={{
                     mb: 3,
                     background: (theme) => `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.primary.lighter} 100%)`,
                     border: '1px solid',
                     borderColor: 'primary.light',
                     boxShadow: (theme) => theme.customShadows?.card || theme.shadows[2],
                  }}
               >
                  <CardContent sx={{ p: 2.5 }}>
                     <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
                        {/* Weight & Total Pcs Group */}
                        <Stack direction="row" spacing={3} sx={{ flexShrink: 0 }}>
                           <Stack direction="row" alignItems="center" spacing={1.5}>
                              <Box
                                 sx={{
                                    p: 1,
                                    borderRadius: 1.5,
                                    bgcolor: 'primary.main',
                                    color: 'primary.contrastText',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                 }}
                              >
                                 <Iconify icon="solar:scale-bold-duotone" width={24} />
                              </Box>
                              <Box>
                                 <Typography variant="caption" color="text.secondary" display="block">
                                    Total Berat
                                 </Typography>
                                 <Typography variant="h6" fontWeight={800}>
                                    {weightKg ? `${weightKg} kg` : '0 kg'}
                                 </Typography>
                              </Box>
                           </Stack>

                           <Stack direction="row" alignItems="center" spacing={1.5}>
                              <Box
                                 sx={{
                                    p: 1,
                                    borderRadius: 1.5,
                                    bgcolor: 'secondary.main',
                                    color: 'secondary.contrastText',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                 }}
                              >
                                 <Iconify icon="solar:box-bold-duotone" width={24} />
                              </Box>
                              <Box>
                                 <Typography variant="caption" color="text.secondary" display="block">
                                    Total Item
                                 </Typography>
                                 <Typography variant="h6" fontWeight={800}>
                                    {computedTotalPcs} pcs
                                 </Typography>
                              </Box>
                           </Stack>
                        </Stack>

                        {/* Detailing Details */}
                        {detailingItems.length > 0 && (
                           <Box sx={{ flex: 1, width: '100%' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                                 Rincian Item Pcs:
                              </Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
                                 {detailingItems.map((item, idx) => (
                                    <Chip
                                       key={idx}
                                       icon={<Iconify icon={item.icon} width={16} />}
                                       label={`${item.name}: ${item.value} pcs`}
                                       variant="soft"
                                       color={item.color as any}
                                       size="small"
                                       sx={{ fontWeight: 600 }}
                                    />
                                 ))}
                              </Stack>
                           </Box>
                        )}
                     </Stack>
                  </CardContent>
               </Card>

               <Typography variant="h6" gutterBottom>
                  Katalog Layanan
               </Typography>

               {/* Filters */}
               <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <TextField
                     size="small"
                     placeholder="Cari layanan..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     InputProps={{
                        startAdornment: (
                           <InputAdornment position="start">
                              <Iconify icon="solar:magnifer-linear" width={18} />
                           </InputAdornment>
                        ),
                     }}
                     sx={{ flex: 1 }}
                  />
                  <Autocomplete
                     size="small"
                     options={categories}
                     getOptionLabel={(o) => o.name}
                     value={selectedCategory}
                     onChange={(_, val) => setSelectedCategory(val)}
                     renderInput={(params) => <TextField {...params} placeholder="Kategori" />}
                     sx={{ width: 200 }}
                  />
               </Stack>

               {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                     <CircularProgress />
                  </Box>
               ) : services.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                     Tidak ada layanan ditemukan
                  </Typography>
               ) : (
                  <Grid container spacing={2}>
                     {services.map((service) => {
                        const inCart = getCartBadge(service);
                        const variants = service.variants?.filter((v) => v.is_active) || [];

                        const hasVariants = variants.length > 0;

                        return (
                           <Grid key={service.id} size={{ xs: 12, sm: 6 }}>
                              <Card
                                 onClick={!hasVariants ? () => handleToggleServiceVariant(service, null) : undefined}
                                 sx={{
                                    border: '2px solid',
                                    borderColor: inCart ? 'primary.main' : 'divider',
                                    bgcolor: !hasVariants && inCart ? 'primary.lighter' : 'background.paper',
                                    transition: 'all 0.2s ease',
                                    cursor: !hasVariants ? 'pointer' : 'default',
                                    ...(!hasVariants
                                       ? {
                                            '&:hover': {
                                               borderColor: 'primary.main',
                                               transform: 'translateY(-2px)',
                                               boxShadow: (theme) => theme.shadows[4],
                                            },
                                         }
                                       : {}),
                                 }}
                              >
                                 <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                       <Box sx={{ flex: 1 }}>
                                          <Typography variant="subtitle2" fontWeight={700}>
                                             {service.name}
                                          </Typography>
                                          {service.description && (
                                             <Typography variant="caption" color="text.secondary" display="block">
                                                {service.description}
                                             </Typography>
                                          )}
                                          {hasVariants ? (
                                             <Stack spacing={1} sx={{ mt: 1.5 }}>
                                                {variants.map((v) => {
                                                   const isVariantInCart = cartItems.some(
                                                      (i) => i.service.id === service.id && i.variant?.id === v.id
                                                   );
                                                   return (
                                                      <Button
                                                         key={v.id}
                                                         variant={isVariantInCart ? 'contained' : 'outlined'}
                                                         color={isVariantInCart ? 'primary' : 'inherit'}
                                                         size="small"
                                                         fullWidth
                                                         onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleServiceVariant(service, v);
                                                         }}
                                                         sx={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            px: 1.5,
                                                            py: 0.75,
                                                            textTransform: 'none',
                                                            borderColor: isVariantInCart ? 'primary.main' : 'divider',
                                                            '&:hover': {
                                                               borderColor: 'primary.main',
                                                            },
                                                         }}
                                                      >
                                                         <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                                                            <Iconify
                                                               icon={isVariantInCart ? 'solar:check-circle-bold' : 'solar:add-circle-bold'}
                                                               width={16}
                                                               sx={{ flexShrink: 0 }}
                                                            />
                                                            <Typography variant="caption" fontWeight={600} sx={{ flexGrow: 1, textAlign: 'left' }}>
                                                               {v.name}
                                                            </Typography>
                                                            <Typography variant="caption" fontWeight={700} sx={{ flexShrink: 0 }}>
                                                               {formatCurrency(v.price)}
                                                            </Typography>
                                                         </Box>
                                                      </Button>
                                                   );
                                                })}
                                             </Stack>
                                          ) : (
                                             <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ mt: 0.5 }}>
                                                {formatCurrency(service.price)} / {service.unit}
                                             </Typography>
                                          )}
                                       </Box>
                                       {!hasVariants && inCart && (
                                          <Iconify
                                             icon="solar:check-circle-bold"
                                             width={22}
                                             sx={{ color: 'primary.main', ml: 1, flexShrink: 0 }}
                                          />
                                       )}
                                    </Stack>
                                 </CardContent>
                              </Card>
                           </Grid>
                        );
                     })}
                  </Grid>
               )}
            </Grid>

            {/* ===== RIGHT: Cart Panel ===== */}
            <Grid size={{ xs: 12, md: 4 }}>
               <Typography variant="h6" gutterBottom>
                  Keranjang{' '}
                  <Badge badgeContent={cartItems.length} color="primary" sx={{ ml: 1 }}>
                     <Iconify icon="solar:cart-bold-duotone" width={22} />
                  </Badge>
               </Typography>

               <Card sx={{ position: 'sticky', top: 80 }}>
                  <CardContent>
                     {cartItems.length === 0 ? (
                        <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                           Belum ada layanan dipilih
                        </Typography>
                     ) : (
                        <Stack spacing={2}>
                           {cartItems.map((item, idx) => {
                              const price = item.variant ? item.variant.price : item.service.price;
                              return (
                                 <Box key={idx}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                       <Box sx={{ flex: 1 }}>
                                          <Typography variant="body2" fontWeight={600}>
                                             {item.service.name}
                                             {item.variant && (
                                                <Typography component="span" variant="caption" color="text.secondary">
                                                   {' '}• {item.variant.name}
                                                </Typography>
                                             )}
                                          </Typography>
                                          <Typography variant="caption" color="primary.main">
                                             {formatCurrency(price)} × {item.qty} = {formatCurrency(price * item.qty)}
                                          </Typography>
                                       </Box>
                                       <IconButton size="small" color="error" onClick={() => removeItem(idx)}>
                                          <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                                       </IconButton>
                                    </Stack>
                                    {/* Qty control */}
                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                                       <IconButton size="small" onClick={() => updateQty(idx, -1)} disabled={item.qty <= 1}>
                                          <Iconify icon="solar:minus-circle-bold" width={18} />
                                       </IconButton>
                                       <Typography variant="body2" sx={{ minWidth: 24, textAlign: 'center' }}>
                                          {item.qty}
                                       </Typography>
                                       <IconButton size="small" onClick={() => updateQty(idx, 1)}>
                                          <Iconify icon="solar:add-circle-bold" width={18} />
                                       </IconButton>
                                    </Stack>
                                 </Box>
                              );
                           })}

                           <Divider />

                           {/* Voucher */}
                           {!appliedVoucher ? (
                              <Stack direction="row" spacing={1}>
                                 <TextField
                                    size="small"
                                    label="Kode Voucher"
                                    value={voucherCode}
                                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                                    sx={{ flex: 1 }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleApplyVoucher(); }}
                                 />
                                 <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleApplyVoucher}
                                    disabled={voucherLoading || !voucherCode.trim()}
                                 >
                                    Apply
                                 </Button>
                              </Stack>
                           ) : (
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                 <Chip
                                    label={`${appliedVoucher.code} (-${formatCurrency(discountAmount)})`}
                                    color="success"
                                    size="small"
                                    onDelete={handleRemoveVoucher}
                                 />
                              </Stack>
                           )}

                           <Divider />

                           {/* Totals */}
                           <Stack spacing={0.5}>
                              <Stack direction="row" justifyContent="space-between">
                                 <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                                 <Typography variant="body2">{formatCurrency(subtotal)}</Typography>
                              </Stack>
                              {discountAmount > 0 && (
                                 <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="success.main">Diskon</Typography>
                                    <Typography variant="body2" color="success.main">-{formatCurrency(discountAmount)}</Typography>
                                 </Stack>
                              )}
                              <Stack direction="row" justifyContent="space-between">
                                 <Typography variant="subtitle1" fontWeight={700}>Total</Typography>
                                 <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                                    {formatCurrency(total)}
                                 </Typography>
                              </Stack>
                           </Stack>
                        </Stack>
                     )}
                  </CardContent>
               </Card>
            </Grid>
         </Grid>

         {/* Navigation */}
         <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
            <Button
               variant="outlined"
               onClick={() => onBack(cartItems, appliedVoucher, discountAmount)}
               startIcon={<Iconify icon="solar:arrow-left-bold" />}
               disabled={submitting}
            >
               Kembali
            </Button>
            <LoadingButton
               loading={submitting}
               variant="contained"
               size="large"
               color="primary"
               onClick={handleCheckout}
               disabled={cartItems.length === 0}
               startIcon={<Iconify icon="solar:check-circle-bold" />}
            >
               Submit Pesanan
            </LoadingButton>
         </Stack>
      </Box>
   );
}
