import { useState, useEffect } from 'react';
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
import Stack from '@mui/material/Stack';

import { Iconify } from 'src/components/iconify';
import { fCurrency } from 'src/utils/format-number';
import { Lightbox, useLightbox } from 'src/components/lightbox';
import { CONFIG } from 'src/global-config';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

type Props = {
   service: IService;
   onAddToCart: (variant?: IService) => void;
   isCustomer?: boolean;
   adminPhone?: string;
};

function parseImages(images?: string): string[] {
   if (!images) return [];
   try {
      return JSON.parse(images);
   } catch {
      return [];
   }
}

export function ServiceCard({ service, onAddToCart, isCustomer = false, adminPhone = '' }: Props) {
   const rawImages = parseImages(service.images);
   const slides = rawImages.map((img) => ({
      src: img.startsWith('http') ? img : `${CONFIG.apiHostUrl}/${img}`,
   }));

   const lightbox = useLightbox(slides);

   const hasImages = slides.length > 0;
   const imageUrl = hasImages ? slides[0].src : '';

   const [imgError, setImgError] = useState(false);

   useEffect(() => {
      setImgError(false);
   }, [imageUrl]);

   const durationText = service.estimated_duration
      ? service.estimated_duration >= 60
         ? `~${Math.floor(service.estimated_duration / 60)}j ${service.estimated_duration % 60 > 0 ? `${service.estimated_duration % 60}m` : ''}`
         : `~${service.estimated_duration}m`
      : null;

   const hasVariants = service.variants && service.variants.length > 0;

   const handleWhatsAppRedirect = (variantName?: string) => {
      if (!adminPhone) {
         toast.error('WhatsApp admin tidak terhubung. Silakan hubungi admin toko.');
         return;
      }
      const message = variantName
         ? `Saya tertarik dengan layanan ${service.name} - ${variantName}`
         : `Saya tertarik dengan layanan ${service.name}`;

      const cleanPhone = adminPhone.replace(/\D/g, '');
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
   };

   const getPriceDisplay = () => {
      if (!hasVariants) {
         return (
            <Typography variant="h6" color="primary.main">
               {fCurrency(service.price || 0)}
               <Typography component="span" variant="caption" color="text.secondary">
                  {' '}
                  / {service.unit}
               </Typography>
            </Typography>
         );
      }

      const prices = service.variants?.map((v: any) => v.price || 0) || [];
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

      return (
         <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 700 }}>
            {minPrice === maxPrice ? fCurrency(minPrice) : `${fCurrency(minPrice)} - ${fCurrency(maxPrice)}`}
            <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.68rem', fontWeight: 400 }}>
               Pilihan Varian
            </Typography>
         </Typography>
      );
   };

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
            <Box sx={{ position: 'relative', height: 180, bgcolor: 'background.neutral', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
               {!hasImages || imgError ? (
                  <Iconify icon="solar:washing-machine-bold-duotone" width={64} sx={{ color: 'text.disabled', opacity: 0.5 }} />
               ) : (
                  <CardMedia
                     component="img"
                     height="180"
                     image={imageUrl}
                     alt={service.name}
                     onError={() => setImgError(true)}
                     sx={{
                        objectFit: 'cover',
                        width: '100%',
                        height: '100%',
                        cursor: 'pointer',
                      }}
                     onClick={() => lightbox.onOpen(imageUrl)}
                  />
               )}

               {/* Image count badge */}
               {!imgError && slides.length > 1 && (
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
                  {getPriceDisplay()}

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

            <CardActions sx={{ px: 2, pb: 2, pt: 0, display: 'block', width: '100%' }}>
               {isCustomer ? (
                  hasVariants ? (
                     <Stack spacing={1} sx={{ mt: 0.5, width: '100%' }}>
                        {service.variants?.map((variant: IService) => (
                           <Button
                              key={variant.id}
                              fullWidth
                              variant="outlined"
                              size="small"
                              startIcon={<Iconify icon="mdi:whatsapp" width={18} sx={{ color: 'success.main' }} />}
                              onClick={() => handleWhatsAppRedirect(variant.name)}
                              sx={{
                                 justifyContent: 'space-between',
                                 textTransform: 'none',
                                 py: 0.75,
                                 px: 1.5,
                                 borderColor: 'success.light',
                                 color: 'success.darker',
                                 bgcolor: 'success.lighter',
                                 '&:hover': {
                                    borderColor: 'success.main',
                                    bgcolor: 'success.soft',
                                 }
                              }}
                           >
                              <Typography variant="caption" fontWeight={600}>
                                 Hubungi Admin ({variant.name})
                              </Typography>
                              <Typography variant="caption" fontWeight={700} sx={{ color: 'success.darker' }}>
                                 {fCurrency(variant.price || 0)}
                              </Typography>
                           </Button>
                        ))}
                     </Stack>
                  ) : (
                     <Button
                        fullWidth
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<Iconify icon="mdi:whatsapp" width={18} />}
                        onClick={() => handleWhatsAppRedirect()}
                        sx={{
                           bgcolor: '#25D366',
                           color: 'white',
                           '&:hover': {
                              bgcolor: '#128C7E'
                           }
                        }}
                     >
                        Hubungi Admin via WA
                     </Button>
                  )
               ) : (
                  hasVariants ? (
                     <Stack spacing={1} sx={{ mt: 0.5, width: '100%' }}>
                        {service.variants?.map((variant: IService) => (
                           <Button
                              key={variant.id}
                              fullWidth
                              variant="outlined"
                              size="small"
                              onClick={() => onAddToCart(variant)}
                              sx={{
                                 justifyContent: 'space-between',
                                 textTransform: 'none',
                                 py: 0.75,
                                 px: 1.5,
                                 borderColor: 'divider',
                                 color: 'text.primary',
                                 '&:hover': {
                                    borderColor: 'primary.main',
                                    bgcolor: 'primary.lighter',
                                    color: 'primary.darker',
                                 }
                              }}
                           >
                              <Typography variant="caption" fontWeight={600}>
                                 {variant.name}
                              </Typography>
                              <Typography variant="caption" fontWeight={700} sx={{ color: 'primary.main' }}>
                                 {fCurrency(variant.price || 0)}
                              </Typography>
                           </Button>
                        ))}
                     </Stack>
                  ) : (
                     <Button
                        fullWidth
                        variant="contained"
                        size="small"
                        startIcon={<Iconify icon="solar:cart-plus-bold" />}
                        onClick={() => onAddToCart()}
                     >
                        Tambah
                     </Button>
                  )
               )}
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
