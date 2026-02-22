import type { IService } from 'src/types/service';

import { useState } from 'react';

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

import useCartStore from 'src/stores/cart';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { fCurrency } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type Props = {
   open: boolean;
   onClose: () => void;
   service: IService;
};

function parseImages(images?: string): string[] {
   if (!images) return [];
   try {
      return JSON.parse(images);
   } catch {
      return [];
   }
}

export function AddServiceToCartModal({ open, onClose, service }: Props) {
   const { addServiceItem } = useCartStore();

   const [qty, setQty] = useState<number>(1);
   const [notes, setNotes] = useState<string>('');

   const images = parseImages(service.images);
   const imageUrl =
      images.length > 0
         ? `${process.env.NEXT_PUBLIC_API_HOST}/${images[0]}`
         : '/assets/placeholder.svg';

   const subtotal = (service.price || 0) * qty;

   const handleAdd = () => {
      if (qty <= 0) {
         toast.error('Qty harus lebih dari 0');
         return;
      }
      addServiceItem(service, qty, notes || undefined);
      toast.success(`${service.name} ditambahkan ke keranjang`);
      handleClose();
   };

   const handleClose = () => {
      setQty(1);
      setNotes('');
      onClose();
   };

   return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
         <DialogTitle>Tambah Service ke Keranjang</DialogTitle>

         <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
               {/* Service Image */}
               <CardMedia
                  component="img"
                  height="180"
                  image={imageUrl}
                  alt={service.name}
                  sx={{
                     objectFit: 'cover',
                     borderRadius: 1,
                     bgcolor: 'background.neutral',
                  }}
               />

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
                  <Typography variant="h5" color="primary.main" gutterBottom>
                     {fCurrency(service.price || 0)}
                     <Typography component="span" variant="caption" color="text.secondary">
                        {' '}
                        / {service.unit}
                     </Typography>
                  </Typography>
                  {service.description && (
                     <Typography variant="body2" color="text.secondary">
                        {service.description}
                     </Typography>
                  )}
               </Box>

               {/* Quantity */}
               <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                     Quantity ({service.unit})
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
               disabled={qty <= 0}
            >
               Tambah ke Keranjang
            </Button>
         </DialogActions>
      </Dialog>
   );
}
