import type { IService } from 'src/types/service';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';

import useCartStore from 'src/stores/cart';
import useServiceStore from 'src/stores/service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { fCurrency } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type Props = {
   open: boolean;
   onClose: () => void;
   service: IService;
   initialVariant?: IService;
};

function parseImages(images?: string): string[] {
   if (!images) return [];
   try {
      return JSON.parse(images);
   } catch {
      return [];
   }
}

export function AddServiceToCartModal({ open, onClose, service, initialVariant }: Props) {
   const { addServiceItem } = useCartStore();
   const { fetchServices } = useServiceStore();

   const [qty, setQty] = useState<number>(1);
   const [notes, setNotes] = useState<string>('');
   const [variants, setVariants] = useState<IService[]>([]);
   const [loadingVariants, setLoadingVariants] = useState(false);
   const [selectedVariantId, setSelectedVariantId] = useState<string>('');

   const fetchVariants = useCallback(async () => {
      if (service.variants && service.variants.length > 0) {
         setVariants(service.variants);
         if (initialVariant) {
            setSelectedVariantId(initialVariant.id);
         } else {
            setSelectedVariantId(service.variants[0].id);
         }
         return;
      }

      setLoadingVariants(true);
      try {
         const res = await fetchServices({ parent_id: service.id, limit: 50, page: 1 });
         const variantList = res?.data?.services || [];
         setVariants(variantList);
         if (variantList.length > 0) {
            if (initialVariant) {
               setSelectedVariantId(initialVariant.id);
            } else {
               setSelectedVariantId(variantList[0].id);
            }
         }
      } catch (err) {
         console.error('Failed to fetch variants:', err);
      } finally {
         setLoadingVariants(false);
      }
   }, [service.id, service.variants, initialVariant, fetchServices]);

   useEffect(() => {
      if (open && service.id) {
         fetchVariants();
      }
   }, [open, service.id, fetchVariants]);

   const images = parseImages(service.images);
   const imageUrl =
      images.length > 0
         ? `${process.env.NEXT_PUBLIC_API_HOST}/${images[0]}`
         : '';

   const [imgError, setImgError] = useState(false);

   useEffect(() => {
      setImgError(false);
   }, [imageUrl]);

   const selectedVariant = variants.find((v) => v.id === selectedVariantId);
   const currentPrice = selectedVariant ? selectedVariant.price : service.price;
   const subtotal = (currentPrice || 0) * qty;

   const handleAdd = () => {
      if (qty <= 0) {
         toast.error('Qty harus lebih dari 0');
         return;
      }
      
      // If variants exist but none selected (shouldn't happen with our logic)
      if (variants.length > 0 && !selectedVariantId) {
         toast.error('Pilih varian terlebih dahulu');
         return;
      }

      // Add to cart. We pass the parent service and the selected variant object.
      if (selectedVariant) {
         addServiceItem(service, qty, notes || undefined, selectedVariant);
      } else {
         addServiceItem(service, qty, notes || undefined);
      }

      toast.success(`${service.name} ${selectedVariant ? `(${selectedVariant.name})` : ''} ditambahkan ke keranjang`);
      handleClose();
   };

   const handleClose = () => {
      setQty(1);
      setNotes('');
      setVariants([]);
      setSelectedVariantId('');
      onClose();
   };

   return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
         <DialogTitle>Tambah Service ke Keranjang</DialogTitle>

         <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
               {/* Service Image */}
               <Box sx={{ height: 180, width: '100%', bgcolor: 'background.neutral', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {images.length === 0 || imgError ? (
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
                        }}
                     />
                  )}
               </Box>

               {/* Service Info */}
               <Box>
                  <Box
                     sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}
                  >
                     <Typography variant="h6">{service.name}</Typography>
                     {service.service_category && (
                        <Chip
                           label={service.service_category.name}
                           size="small"
                           color="info"
                           variant="soft"
                        />
                     )}
                  </Box>
                  
                  {loadingVariants ? (
                     <Stack direction="row" alignItems="center" spacing={1}>
                        <CircularProgress size={16} />
                        <Typography variant="caption">Memuat varian...</Typography>
                     </Stack>
                  ) : variants.length > 0 ? (
                     <TextField
                        select
                        fullWidth
                        label="Pilih Varian"
                        value={selectedVariantId}
                        onChange={(e) => setSelectedVariantId(e.target.value)}
                        sx={{ mt: 1 }}
                     >
                        {variants.map((v) => (
                           <MenuItem key={v.id} value={v.id}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                 <span>{v.name}</span>
                                 <span style={{ fontWeight: 600 }}>{fCurrency(v.price)}</span>
                              </Box>
                           </MenuItem>
                        ))}
                     </TextField>
                  ) : (
                     <Typography variant="h5" color="primary.main" gutterBottom>
                        {fCurrency(service.price || 0)}
                        <Typography component="span" variant="caption" color="text.secondary">
                           {' '}
                           / {service.unit}
                        </Typography>
                     </Typography>
                  )}

                  {service.description && (
                     <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {service.description}
                     </Typography>
                  )}
               </Box>

               {/* Quantity */}
               <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                     Quantity ({selectedVariant ? selectedVariant.unit : service.unit})
                  </Typography>
                  <Box
                     sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 2,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'background.neutral',
                     }}
                  >
                     <IconButton
                        size="small"
                        onClick={() =>
                           setQty((prev) => Math.max(0.5, Math.round((prev - 0.5) * 10) / 10))
                        }
                        disabled={qty <= 0.5}
                        sx={{ border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
                     >
                        <Iconify icon="solar:minus-circle-bold" width={20} />
                     </IconButton>

                     <TextField
                        type="number"
                        value={qty}
                        onChange={(e) => {
                           const val = parseFloat(e.target.value) || 0;
                           setQty(Math.max(0.5, Math.round(val * 10) / 10));
                        }}
                        inputProps={{ min: 0.5, step: 0.5 }}
                        sx={{
                           minWidth: 100,
                           '& .MuiOutlinedInput-root': {
                              bgcolor: 'background.paper',
                              '& input': {
                                 textAlign: 'center',
                                 fontWeight: 600,
                                 fontSize: '1.1rem',
                                 padding: '8px',
                              },
                           },
                        }}
                     />

                     <IconButton
                        size="small"
                        onClick={() => setQty((prev) => Math.round((prev + 0.5) * 10) / 10)}
                        sx={{ border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
                     >
                        <Iconify icon="solar:add-circle-bold" width={20} />
                     </IconButton>
                  </Box>
               </Box>

               {/* Notes */}
               <TextField
                  label="Catatan (Opsional)"
                  multiline
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan khusus untuk service ini..."
               />

               {/* Subtotal */}
               <Box
                  sx={{
                     display: 'flex',
                     justifyContent: 'space-between',
                     alignItems: 'center',
                     p: 2,
                     bgcolor: 'background.neutral',
                     borderRadius: 1,
                  }}
               >
                  <Typography variant="subtitle1">Subtotal:</Typography>
                  <Typography variant="h6" color="primary.main">
                     {fCurrency(subtotal)}
                  </Typography>
               </Box>
            </Box>
         </DialogContent>

         <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleClose} variant="outlined" color="inherit">
               Batal
            </Button>
            <Button
               onClick={handleAdd}
               variant="contained"
               startIcon={<Iconify icon="solar:cart-plus-bold" />}
               disabled={qty <= 0 || loadingVariants}
            >
               Tambah ke Keranjang
            </Button>
         </DialogActions>
      </Dialog>
   );
}
