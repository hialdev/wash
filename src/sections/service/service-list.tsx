import type { BoxProps } from '@mui/material/Box';
import type { IService } from 'src/types/service';

import Box from '@mui/material/Box';
import Pagination, { paginationClasses } from '@mui/material/Pagination';

import { paths } from 'src/routes/paths';

import { ServiceItem } from './service-item';
import { ProductItemSkeleton } from 'src/sections/product/product-skeleton';

// ----------------------------------------------------------------------

type Props = BoxProps & {
   loading?: boolean;
   services: IService[];
   pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
   };
   onPageChange?: (page: number) => void;
};

export function ServiceList({ services, loading, pagination, onPageChange, sx, ...other }: Props) {
   const renderLoading = () => (
      <>
         {[...Array(8)].map((_, index) => (
            <ProductItemSkeleton key={index} />
         ))}
      </>
   );

   const renderList = () =>
      services.map((service) => (
         <ServiceItem
            key={service.id}
            service={service}
            detailsHref={paths.dashboard.service.details(service.id)}
         />
      ));

   return (
      <>
         <Box
            sx={[
               {
                  gap: 3,
                  display: 'grid',
                  gridTemplateColumns: {
                     xs: 'repeat(1, 1fr)',
                     sm: 'repeat(2, 1fr)',
                     md: 'repeat(3, 1fr)',
                     lg: 'repeat(4, 1fr)',
                  },
               },
               ...(Array.isArray(sx) ? sx : [sx]),
            ]}
            {...other}
         >
            {loading ? renderLoading() : renderList()}
         </Box>

         {pagination && pagination.totalPages > 1 && (
            <Pagination
               count={pagination.totalPages}
               page={pagination.page}
               onChange={(e, page) => onPageChange?.(page)}
               sx={{
                  mt: { xs: 5, md: 8 },
                  [`& .${paginationClasses.ul}`]: { justifyContent: 'center' },
               }}
            />
         )}
      </>
   );
}
