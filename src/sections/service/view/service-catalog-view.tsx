'use client';

import { useState, useCallback, useEffect } from 'react';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import useServiceStore from 'src/stores/service';

import { EmptyContent } from 'src/components/empty-content';
import { CartIcon } from 'src/sections/product/cart-icon';
import { useCheckoutContext } from 'src/sections/checkout/context';

import { ServiceList } from '../service-list';

// ----------------------------------------------------------------------

export function ServiceCatalogView() {
   const { state: checkoutState } = useCheckoutContext();
   const { fetchCatalogServices } = useServiceStore();

   const [services, setServices] = useState([]);
   const [loading, setLoading] = useState(true);
   const [pagination, setPagination] = useState({
      page: 1,
      limit: 12,
      total: 0,
      totalPages: 0,
   });

   const [page, setPage] = useState(1);
   const [limit] = useState(12);

   const fetchData = useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetchCatalogServices({
            page,
            limit,
            is_active: true,
         });
         setServices(res?.data?.services || []);
         setPagination(res?.data?.pagination || { total: 0, page: 1, limit: 12, totalPages: 0 });
      } catch (error) {
         console.error(error);
      } finally {
         setLoading(false);
      }
   }, [fetchCatalogServices, limit, page]);

   useEffect(() => {
      fetchData();
   }, [fetchData]);

   const handlePageChange = useCallback((newPage: number) => {
      setPage(newPage);
   }, []);

   const notFound = !loading && !services.length;

   return (
      <>
         <CartIcon totalItems={checkoutState.totalItems} />

         <Container sx={{ mb: 10 }}>
            <Typography variant="h4" sx={{ mb: 3, mt: { xs: 1, md: 3 } }}>
               Services
            </Typography>

            {loading ? (
               <ServiceList loading services={[]} />
            ) : notFound ? (
               <EmptyContent filled title="No services found" sx={{ py: 10 }} />
            ) : (
               <ServiceList
                  services={services}
                  loading={loading}
                  pagination={{
                     page: pagination.page,
                     limit: pagination.limit,
                     total: pagination.total,
                     totalPages: pagination.totalPages,
                  }}
                  onPageChange={handlePageChange}
               />
            )}
         </Container>
      </>
   );
}
