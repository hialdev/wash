import type { IService } from 'src/types/service';
import type { ICheckoutItem } from 'src/types/checkout';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Fab, { fabClasses } from '@mui/material/Fab';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';
import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Image } from 'src/components/image';
import { Iconify } from 'src/components/iconify';

import { useCheckoutContext } from '../checkout/context';

// ----------------------------------------------------------------------

type Props = {
   service: IService;
   detailsHref: string;
};

export function ServiceItem({ service, detailsHref }: Props) {
   const { onAddToCart } = useCheckoutContext();

   const { id, name, price, description, images, is_active } = service;

   const coverUrl = images ? JSON.parse(images)?.[0] || '' : '';

   const handleAddCart = async () => {
      const newItem: ICheckoutItem = {
         id,
         name,
         coverUrl,
         price,
         type: 'service' as const,
         quantity: 1,
         available: 9999,
      };
      try {
         onAddToCart(newItem);
      } catch (error) {
         console.error(error);
      }
   };

   const renderImage = () => (
      <Box sx={{ position: 'relative', p: 1 }}>
         {is_active && (
            <Fab
               size="medium"
               color="warning"
               onClick={handleAddCart}
               sx={[
                  (theme) => ({
                     right: 16,
                     zIndex: 9,
                     bottom: 16,
                     opacity: 0,
                     position: 'absolute',
                     transform: 'scale(0)',
                     transition: theme.transitions.create(['opacity', 'transform'], {
                        easing: theme.transitions.easing.easeInOut,
                        duration: theme.transitions.duration.shorter,
                     }),
                  }),
               ]}
            >
               <Iconify icon="solar:cart-plus-bold" width={24} />
            </Fab>
         )}

         <Image
            alt={name}
            src={coverUrl}
            ratio="1/1"
            sx={{ borderRadius: 1.5, ...(!is_active && { opacity: 0.48, filter: 'grayscale(1)' }) }}
         />
      </Box>
   );

   const renderContent = () => (
      <Stack spacing={2.5} sx={{ p: 3, pt: 2 }}>
         <Link component={RouterLink} href={detailsHref} color="inherit" variant="subtitle2" noWrap>
            {name}
         </Link>

         <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ gap: 0.5, display: 'flex', typography: 'subtitle1' }}>
               <Box component="span">{fCurrency(price)}</Box>
               <Typography
                  variant="body2"
                  component="span"
                  sx={{ color: 'text.secondary', ml: 0.5, alignSelf: 'center' }}
               >
                  / {service.unit}
               </Typography>
            </Box>
         </Box>
      </Stack>
   );

   return (
      <Card
         sx={{
            '&:hover': {
               [`& .${fabClasses.root}`]: { opacity: 1, transform: 'scale(1)' },
            },
         }}
      >
         <Label
            variant="filled"
            color={is_active ? 'success' : 'error'}
            sx={{
               zIndex: 9,
               top: 16,
               right: 16,
               position: 'absolute',
               textTransform: 'uppercase',
            }}
         >
            {is_active ? 'Active' : 'Inactive'}
         </Label>
         {renderImage()}
         {renderContent()}
      </Card>
   );
}
