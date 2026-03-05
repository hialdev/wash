'use client';

import type { Product } from 'src/types/product';
import type { ProductType } from 'src/types/product-type';
import type { IService, IServiceCategory } from 'src/types/service';

import { useState, useEffect, useCallback } from 'react';
import { useBoolean, useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Fab from '@mui/material/Fab';
import Badge from '@mui/material/Badge';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/al/paths';

import useCartStore from 'src/stores/cart';
import useProductStore from 'src/stores/product';
import useServiceStore from 'src/stores/service';
import useVoucherStore from 'src/stores/voucher';
import useProductTypeStore from 'src/stores/product-type';
import type { IVoucher } from 'src/types/voucher';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { ProductCard } from './components/product-card';
import { ServiceCard } from './components/service-card';
import { CartModal } from './components/cart-modal';
import { AddToCartModal } from './components/add-to-cart-modal';
import { AddServiceToCartModal } from './components/add-service-to-cart-modal';

// ----------------------------------------------------------------------

export function CatalogView() {
   const cartModal = useBoolean();
   const addToCartModal = useBoolean();
   const addServiceToCartModal = useBoolean();

   const { products, getCatalog: getProducts } = useProductStore();
   const { productTypes, all: getAllProductTypes } = useProductTypeStore();
   const {
      fetchCatalogServices,
      fetchServiceCategories,
      categories: serviceCategories,
   } = useServiceStore();
   const { fetchVouchers } = useVoucherStore();
   const { getItemCount } = useCartStore();

   const [activeTab, setActiveTab] = useState<'products' | 'services'>('products');
   const [loading, setLoading] = useState<boolean>(true);
   const [publicVouchers, setPublicVouchers] = useState<IVoucher[]>([]);

   // Selection states
   const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
   const [selectedService, setSelectedService] = useState<IService | null>(null);

   // Data states for services (local state since store usually holds admin data)
   const [services, setServices] = useState<IService[]>([]);

   // Filter states
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedProductTypes, setSelectedProductTypes] = useState<ProductType[]>([]);
   const [selectedServiceCategories, setSelectedServiceCategories] = useState<IServiceCategory[]>(
      []
   );

   const debouncedSearch = useDebounce(searchQuery, 500);

   // Fetch Products
   const fetchProducts = useCallback(async () => {
      setLoading(true);
      try {
         const params: any = { limit: 100 };

         if (debouncedSearch) params.search = debouncedSearch;
         if (selectedProductTypes.length > 0) {
            params.product_type_ids = selectedProductTypes.map((pt) => pt.id).join(',');
         }

         const res = await getProducts(params);
         if (!res.success) toast.error('Gagal memuat produk');
      } catch (error) {
         toast.error('Gagal memuat produk');
      }
      setLoading(false);
   }, [debouncedSearch, selectedProductTypes, getProducts]);

   // Fetch Services
   const fetchServices = useCallback(async () => {
      setLoading(true);
      try {
         const params: any = { limit: 100 };

         if (debouncedSearch) params.search = debouncedSearch;
         if (selectedServiceCategories.length > 0) {
            // Backend currently supports single category_id
            params.category_id = selectedServiceCategories[0].id;
         }

         const res = await fetchCatalogServices(params);
         if (res.success) {
            setServices(res.data?.services || []);
         }
      } catch (error) {
         toast.error('Gagal memuat services');
      }
      setLoading(false);
   }, [debouncedSearch, selectedServiceCategories, fetchCatalogServices]);

   // Initial load dependent data
   useEffect(() => {
      getAllProductTypes();
      fetchServiceCategories();
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   // Fetch data when filter/tab changes
   useEffect(() => {
      if (activeTab === 'products') {
         fetchProducts();
      } else {
         fetchServices();
      }
   }, [activeTab, fetchProducts, fetchServices]);

   // Handlers
   const handleOpenAddToCart = (product: Product) => {
      setSelectedProduct(product);
      addToCartModal.onTrue();
   };

   const handleCloseAddToCart = () => {
      setSelectedProduct(null);
      addToCartModal.onFalse();
   };

   const handleOpenAddService = (service: IService) => {
      setSelectedService(service);
      addServiceToCartModal.onTrue();
   };

   const handleCloseAddService = () => {
      setSelectedService(null);
      addServiceToCartModal.onFalse();
   };

   const cartItemCount = getItemCount();
   const [mounted, setMounted] = useState(false);

   useEffect(() => {
      setMounted(true);
   }, []);

   return (
      <>
         <DashboardContent>
            <CustomBreadcrumbs
               heading="Catalog"
               links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Catalog' }]}
               sx={{ mb: { xs: 3, md: 5 } }}
            />

            {publicVouchers.length > 0 && (
               <Card sx={{ p: 2, mb: 3, bgcolor: 'primary.lighter', color: 'primary.darker' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                     <Iconify icon="solar:ticket-sale-bold-duotone" width={24} sx={{ mr: 1 }} />
                     <Typography variant="subtitle1">Available Vouchers</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
                     {publicVouchers.map((v) => (
                        <Box
                           key={v.id}
                           sx={{
                              minWidth: 200,
                              p: 1.5,
                              borderRadius: 1,
                              border: '1px dashed currentColor',
                              bgcolor: 'common.white',
                           }}
                        >
                           <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'text.primary' }}>
                              {v.code}
                           </Typography>
                           <Typography
                              variant="caption"
                              sx={{ display: 'block', color: 'text.secondary' }}
                           >
                              {v.discount_type === 'percentage'
                                 ? `${v.discount_value}% OFF`
                                 : `Rp ${v.discount_value} OFF`}
                           </Typography>
                           {v.min_purchase && v.min_purchase > 0 ? (
                              <Typography
                                 variant="caption"
                                 sx={{ opacity: 0.8, color: 'text.secondary' }}
                              >
                                 Min. spend: Rp {v.min_purchase}
                              </Typography>
                           ) : null}
                        </Box>
                     ))}
                  </Box>
               </Card>
            )}

            <Box sx={{ mb: 3 }}>
               <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ mb: 2 }}>
                  <Tab
                     label="Products"
                     value="products"
                     icon={<Iconify icon="solar:box-bold-duotone" />}
                     iconPosition="start"
                  />
                  <Tab
                     label="Services"
                     value="services"
                     icon={<Iconify icon="solar:washing-machine-bold-duotone" />}
                     iconPosition="start"
                  />
               </Tabs>

               {/* Filters */}
               <Card sx={{ p: 3 }}>
                  <Grid container spacing={2}>
                     {/* Search */}
                     <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                           fullWidth
                           placeholder={
                              activeTab === 'products' ? 'Search products...' : 'Search services...'
                           }
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           InputProps={{
                              startAdornment: (
                                 <InputAdornment position="start">
                                    <Iconify icon="solar:magnifer-linear" width={20} />
                                 </InputAdornment>
                              ),
                           }}
                        />
                     </Grid>

                     {/* Type/Category Filter */}
                     <Grid size={{ xs: 12, md: 6 }}>
                        {activeTab === 'products' ? (
                           <Autocomplete
                              multiple
                              options={productTypes}
                              getOptionLabel={(option) => option.title || ''}
                              value={selectedProductTypes}
                              onChange={(_, newValue) => setSelectedProductTypes(newValue)}
                              renderInput={(params) => (
                                 <TextField
                                    {...params}
                                    placeholder="Filter by product type..."
                                    InputProps={{
                                       ...params.InputProps,
                                       startAdornment: (
                                          <>
                                             <InputAdornment position="start">
                                                <Iconify icon="solar:tag-linear" width={20} />
                                             </InputAdornment>
                                             {params.InputProps.startAdornment}
                                          </>
                                       ),
                                    }}
                                 />
                              )}
                           />
                        ) : (
                           <Autocomplete
                              multiple
                              options={serviceCategories}
                              getOptionLabel={(option) => option.name || ''}
                              value={selectedServiceCategories}
                              onChange={(_, newValue) => setSelectedServiceCategories(newValue)}
                              renderInput={(params) => (
                                 <TextField
                                    {...params}
                                    placeholder="Filter by service category..."
                                    InputProps={{
                                       ...params.InputProps,
                                       startAdornment: (
                                          <>
                                             <InputAdornment position="start">
                                                <Iconify icon="solar:tag-linear" width={20} />
                                             </InputAdornment>
                                             {params.InputProps.startAdornment}
                                          </>
                                       ),
                                    }}
                                 />
                              )}
                           />
                        )}
                     </Grid>
                  </Grid>
               </Card>
            </Box>

            {loading ? (
               <LoadingScreen />
            ) : (
               <>
                  {activeTab === 'products' ? (
                     // PRODUCTS GRID
                     products.length === 0 ? (
                        <Card sx={{ p: 3 }}>
                           <Typography variant="body1" color="text.secondary" textAlign="center">
                              Tidak ada produk tersedia
                           </Typography>
                        </Card>
                     ) : (
                        <Grid container spacing={3}>
                           {products.map((product) => (
                              <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                 <ProductCard
                                    product={product}
                                    onAddToCart={() => handleOpenAddToCart(product)}
                                 />
                              </Grid>
                           ))}
                        </Grid>
                     )
                  ) : // SERVICES GRID
                  services.length === 0 ? (
                     <Card sx={{ p: 3 }}>
                        <Typography variant="body1" color="text.secondary" textAlign="center">
                           Tidak ada service tersedia
                        </Typography>
                     </Card>
                  ) : (
                     <Grid container spacing={3}>
                        {services.map((service) => (
                           <Grid key={service.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                              <ServiceCard
                                 service={service}
                                 onAddToCart={() => handleOpenAddService(service)}
                              />
                           </Grid>
                        ))}
                     </Grid>
                  )}
               </>
            )}
         </DashboardContent>

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
            <Badge badgeContent={mounted ? cartItemCount : 0} color="error">
               <Iconify icon="solar:cart-large-2-bold" width={24} />
            </Badge>
         </Fab>

         {/* Add to Cart Modal (Product) */}
         {selectedProduct && (
            <AddToCartModal
               open={addToCartModal.value}
               onClose={handleCloseAddToCart}
               product={selectedProduct}
            />
         )}

         {/* Add to Cart Modal (Service) */}
         {selectedService && (
            <AddServiceToCartModal
               open={addServiceToCartModal.value}
               onClose={handleCloseAddService}
               service={selectedService}
            />
         )}

         {/* Cart Modal */}
         <CartModal open={cartModal.value} onClose={cartModal.onFalse} />
      </>
   );
}
