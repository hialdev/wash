'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';

import Fab from '@mui/material/Fab';
import Badge from '@mui/material/Badge';
import { useBoolean } from 'minimal-shared/hooks';

import { paths } from 'src/routes/al/paths';
import { Iconify } from 'src/components/iconify';
import useOrderStore from 'src/stores/order';
import useServiceStore from 'src/stores/service';
import useAuthStore from 'src/stores/auth';
import useCartStore from 'src/stores/cart';
import { IService } from 'src/types/service';
import { ServiceCard } from '../catalog/components/service-card';
import { CartModal } from '../catalog/components/cart-modal';
import { AddServiceToCartModal } from '../catalog/components/add-service-to-cart-modal';

// ----------------------------------------------------------------------

const STATUS_COLOR: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
   waiting_payment: 'warning',
   on_progress: 'primary',
   finish: 'success',
   cancelled: 'error',
   stock_issue: 'error',
};

export function CustomerDashboard() {
   const { user } = useAuthStore();
   const { getMyOrders } = useOrderStore();
   const { fetchCatalogServices } = useServiceStore();

   const [orders, setOrders] = useState<any[]>([]);
   const [services, setServices] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   const cartModal = useBoolean();
   const addServiceToCartModal = useBoolean();
   const [selectedService, setSelectedService] = useState<IService | null>(null);
   const [preselectedVariant, setPreselectedVariant] = useState<IService | null>(null);
   
   const { getItemCount } = useCartStore();
   const cartItemCount = getItemCount();

   const handleOpenAddService = (service: IService, variant?: IService) => {
      setSelectedService(service);
      setPreselectedVariant(variant || null);
      addServiceToCartModal.onTrue();
   };

   const handleCloseAddService = () => {
      setSelectedService(null);
      setPreselectedVariant(null);
      addServiceToCartModal.onFalse();
   };

   useEffect(() => {
      const load = async () => {
         setLoading(true);
         try {
            const [orderRes, serviceRes] = await Promise.allSettled([
               getMyOrders({ page: 1, limit: 5, sort: 'created_at', order: 'desc' }),
               fetchCatalogServices({ page: 1, limit: 3, parent_id: 'none' }),
            ]);
            if (orderRes.status === 'fulfilled') {
               setOrders(orderRes.value?.data?.orders || orderRes.value?.data || []);
            }
            if (serviceRes.status === 'fulfilled') {
               setServices(serviceRes.value?.data?.services || []);
            }
         } finally {
            setLoading(false);
         }
      };
      load();
   }, []);  // eslint-disable-line

   const firstName = user?.name?.split(' ')[0] || 'Pelanggan';

   if (loading) {
      return (
         <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
         </Box>
      );
   }

   return (
      <>
      <Stack spacing={4}>
         {/* Greeting */}
         <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent sx={{ p: 4 }}>
               <Typography variant="h4" fontWeight={700}>
                  Halo, {firstName}! 👋
               </Typography>
               <Typography variant="body1" sx={{ mt: 1, opacity: 0.9 }}>
                  Selamat datang di layanan laundry kami.
               </Typography>
               <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                  <Button
                     component={Link}
                     href={paths.dashboard.customer_orders.catalog}
                     variant="contained"
                     sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
                     startIcon={<Iconify icon="solar:shop-bold-duotone" />}
                  >
                     Pesan Sekarang
                  </Button>
                  <Button
                     component={Link}
                     href={paths.dashboard.customer_orders.my_orders}
                     variant="outlined"
                     sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: 'grey.200' } }}
                     startIcon={<Iconify icon="solar:clipboard-list-bold-duotone" />}
                  >
                     Pesanan Saya
                  </Button>
               </Stack>
            </CardContent>
         </Card>

         {/* Active Orders */}
         <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
               <Typography variant="h6" fontWeight={700}>Pesanan Terbaru</Typography>
               <Button
                  component={Link}
                  href={paths.dashboard.customer_orders.my_orders}
                  size="small"
                  endIcon={<Iconify icon="solar:alt-arrow-right-outline" />}
               >
                  Lihat Semua
               </Button>
            </Stack>
            {orders.length === 0 ? (
               <Card>
                  <CardContent>
                     <Stack alignItems="center" spacing={2} py={4}>
                        <Iconify icon="solar:clipboard-list-bold-duotone" width={48} sx={{ color: 'text.secondary' }} />
                        <Typography color="text.secondary">Belum ada pesanan</Typography>
                        <Button
                           component={Link}
                           href={paths.dashboard.customer_orders.catalog}
                           variant="contained"
                        >
                           Mulai Pesan
                        </Button>
                     </Stack>
                  </CardContent>
               </Card>
            ) : (
               <Stack spacing={1.5}>
                  {orders.map((order: any) => (
                     <Card
                        key={order.id}
                        component={Link}
                        href={paths.dashboard.customer_orders.detail(order.id)}
                        sx={{
                           textDecoration: 'none',
                           transition: 'transform 0.2s',
                           '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                        }}
                     >
                        <CardContent>
                           <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Stack spacing={0.5}>
                                 <Typography variant="subtitle2" fontWeight={700}>
                                    #{order.order_number}
                                 </Typography>
                                 <Typography variant="caption" color="text.secondary">
                                    {new Date(order.created_at).toLocaleDateString('id-ID', {
                                       day: 'numeric', month: 'long', year: 'numeric',
                                    })}
                                 </Typography>
                              </Stack>
                              <Stack direction="row" spacing={1} alignItems="center">
                                 <Typography variant="subtitle2" fontWeight={700}>
                                    Rp {(order.total_bill || 0).toLocaleString('id-ID')}
                                 </Typography>
                                 <Chip
                                    label={order.status?.replace(/_/g, ' ').toUpperCase()}
                                    size="small"
                                    color={STATUS_COLOR[order.status || ''] || 'default'}
                                 />
                              </Stack>
                           </Stack>
                        </CardContent>
                     </Card>
                  ))}
               </Stack>
            )}
         </Box>

         {/* Service Preview */}
         {services.length > 0 && (
            <Box>
               <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight={700}>Layanan Tersedia</Typography>
                  <Button
                     component={Link}
                     href={paths.dashboard.customer_orders.catalog}
                     size="small"
                     endIcon={<Iconify icon="solar:alt-arrow-right-outline" />}
                  >
                     Lihat Semua
                  </Button>
               </Stack>
               <Grid container spacing={2}>
                  {services.map((svc: IService) => (
                     <Grid size={{ xs: 12, sm: 4 }} key={svc.id}>
                        <ServiceCard
                           service={svc}
                           onAddToCart={(variant) => handleOpenAddService(svc, variant)}
                        />
                     </Grid>
                  ))}
               </Grid>
            </Box>
         )}
      </Stack>

      {/* Floating Cart Button */}
      <Fab
         color="primary"
         aria-label="cart"
         onClick={cartModal.onTrue}
         sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
         }}
      >
         <Badge badgeContent={cartItemCount} color="error">
            <Iconify icon="solar:cart-large-2-bold" width={24} />
         </Badge>
      </Fab>

      {/* Add to Cart Modal (Service) */}
      {selectedService && (
         <AddServiceToCartModal
            open={addServiceToCartModal.value}
            onClose={handleCloseAddService}
            service={selectedService}
            initialVariant={preselectedVariant || undefined}
         />
      )}

      {/* Cart Modal */}
      <CartModal open={cartModal.value} onClose={cartModal.onFalse} />
      </>
   );
}
