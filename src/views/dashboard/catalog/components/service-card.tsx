import type { IService } from 'src/types/service';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';
import { fCurrency } from 'src/utils/format-number';
import { Lightbox, useLightbox } from 'src/components/lightbox';
import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

type Props = {
   service: IService;
   onAddToCart: () => void;
};

function parseImages(images?: string): string[] {
   if (!images) return [];
   try {
      return JSON.parse(images);
   } catch {
      return [];
   }
}

export function ServiceCard({ service, onAddToCart }: Props) {
   const rawImages = parseImages(service.images);
   const slides = rawImages.map((img) => ({
      src: img.startsWith('http') ? img : `${CONFIG.apiHostUrl}/${img}`,
   }));

   const lightbox = useLightbox(slides);

   const imageUrl = slides.length > 0 ? slides[0].src : '/assets/placeholder.svg';

   const durationText = service.estimated_duration
      ? service.estimated_duration >= 60
         ? `~${Math.floor(service.estimated_duration / 60)}j ${service.estimated_duration % 60 > 0 ? `${service.estimated_duration % 60}m` : ''}`
         : `~${service.estimated_duration}m`
      : null;

   return (
      <>
         <Card
            sx={{
               height: '100%',
               display: 'flex',
               flexDirection: 'column',
               transition: 'box-shadow 0.2s',
               '&:hover': {
                  boxShadow: (theme) => theme.shadows[8],
               },
            }}
         >
            {/* Image with slideshow indicator */}
            <Box sx={{ position: 'relative' }}>
               <CardMedia
                  component="img"
                  height="180"
                  image={imageUrl}
                  alt={service.name}
                  sx={{
                     objectFit: 'cover',
                     bgcolor: 'background.neutral',
                     cursor: slides.length > 0 ? 'pointer' : 'default',
                  }}
                  onClick={() => slides.length > 0 && lightbox.onOpen(slides[0].src)}
               />

               {/* Image count badge */}
               {slides.length > 1 && (
                  <Box
                     sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: 'rgba(0,0,0,0.55)',
                        color: 'common.white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        fontSize: '0.72rem',
                        pointerEvents: 'none',
                     }}
                  >
                     <Iconify icon="solar:gallery-wide-linear" width={14} />
                     {slides.length}
                  </Box>
               )}

               {/* Zoom icon overlay */}
               {slides.length > 0 && (
                  <IconButton
                     size="small"
                     onClick={() => lightbox.onOpen(slides[0].src)}
                     sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'rgba(0,0,0,0.45)',
                        color: 'common.white',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                     }}
                  >
                     <Iconify icon="solar:maximise-square-linear" width={18} />
                  </IconButton>
               )}
            </Box>

            <CardContent sx={{ flexGrow: 1, pb: 1 }}>
               {/* Category badge */}
               {service.service_category && (
                  <Chip
                     label={service.service_category.name}
                     size="small"
                     color="info"
                     variant="soft"
                     sx={{ mb: 1 }}
                  />
               )}

               <Typography variant="subtitle1" gutterBottom noWrap title={service.name}>
                  {service.name}
               </Typography>

               {service.description && (
                  <Typography
                     variant="body2"
                     color="text.secondary"
                     sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 1,
                     }}
                  >
                     {service.description}
                  </Typography>
               )}

               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  <Typography variant="h6" color="primary.main">
                     {fCurrency(service.price || 0)}
                     <Typography component="span" variant="caption" color="text.secondary">
                        {' '}
                        / {service.unit}
                     </Typography>
                  </Typography>

                  {durationText && (
                     <Chip
                        icon={<Iconify icon="solar:clock-circle-linear" width={14} />}
                        label={durationText}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                     />
                  )}
               </Box>
            </CardContent>

            <CardActions sx={{ px: 2, pb: 2 }}>
               <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  startIcon={<Iconify icon="solar:cart-plus-bold" />}
                  onClick={onAddToCart}
               >
                  Tambah
               </Button>
            </CardActions>
         </Card>

         {/* Lightbox */}
         <Lightbox
            index={lightbox.selected}
            slides={slides}
            open={lightbox.open}
            close={lightbox.onClose}
         />
      </>
   );
}
