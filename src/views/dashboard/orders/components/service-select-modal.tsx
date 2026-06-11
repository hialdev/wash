import type { IService } from 'src/types/service';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';
import { fCurrency } from 'src/utils/format-number';

import { QuantityController } from './quantity-controller';

// ----------------------------------------------------------------------

type Props = {
   open: boolean;
   onClose: () => void;
   servicesList: IService[];
   selectedServices: { service: IService; variant: IService | null; qty: number }[];
   onSave: (selected: { service: IService; variant: IService | null; qty: number }[]) => void;
};

type SelectedMap = Record<
   string,
   {
      service: IService;
      variant: IService | null;
      qty: number;
   }
>;

export default function ServiceSelectModal({
   open,
   onClose,
   servicesList,
   selectedServices,
   onSave,
}: Props) {
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedMap, setSelectedMap] = useState<SelectedMap>({});

   // Preload selected services when modal opens
   useEffect(() => {
      if (open) {
         const initialMap: SelectedMap = {};
         selectedServices.forEach((item) => {
            const key = item.variant
               ? `${item.service.id}-${item.variant.id}`
               : item.service.id;
            initialMap[key] = {
               service: item.service,
               variant: item.variant,
               qty: item.qty,
            };
         });
         setSelectedMap(initialMap);
         setSearchQuery('');
      }
   }, [open, selectedServices]);

   const getMinQty = (service: IService, variant: IService | null) => {
      const val = variant?.minimum_qty_order ?? service.minimum_qty_order ?? 1;
      return val > 0 ? val : 1;
   };

   const handleToggleSelect = (service: IService, variant: IService | null) => {
      const key = variant ? `${service.id}-${variant.id}` : service.id;
      const isSelected = !!selectedMap[key];

      setSelectedMap((prev) => {
         const next = { ...prev };
         if (isSelected) {
            delete next[key];
         } else {
            next[key] = {
               service,
               variant,
               qty: getMinQty(service, variant),
            };
         }
         return next;
      });
   };

   const handleQtyChange = (
      service: IService,
      variant: IService | null,
      val: number
   ) => {
      const key = variant ? `${service.id}-${variant.id}` : service.id;
      if (!selectedMap[key]) return;

      setSelectedMap((prev) => {
         const next = { ...prev };
         next[key] = {
            ...next[key],
            qty: val,
         };
         return next;
      });
   };

   const handleSave = () => {
      // Enforce minQty clamping for all selected items before saving as safety
      const finalSelected = Object.values(selectedMap).map((item) => {
         const minQty = getMinQty(item.service, item.variant);
         let qty = item.qty;
         if (isNaN(qty) || qty < minQty) {
            qty = minQty;
         }
         return {
            ...item,
            qty: parseFloat(qty.toFixed(2)),
         };
      });

      onSave(finalSelected);
      onClose();
   };

   // Filter services based on search query
   const filteredServices = servicesList.filter((service) => {
      const matchesParent = service.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesVariant =
         service.variants &&
         service.variants.some((v) => v.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesParent || matchesVariant;
   });

   return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
         <DialogTitle sx={{ pb: 1 }}>Pilih Layanan Laundry</DialogTitle>

         <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
               fullWidth
               placeholder="Cari nama layanan atau varian..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               slotProps={{
                  input: {
                     startAdornment: (
                        <InputAdornment position="start">
                           <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                        </InputAdornment>
                     ),
                  },
               }}
            />

            <Divider />

            <Box sx={{ maxHeight: 400, overflowY: 'auto', pr: 1 }}>
               {filteredServices.length === 0 ? (
                  <Typography
                     variant="body2"
                     color="text.secondary"
                     sx={{ textAlign: 'center', py: 4, fontStyle: 'italic' }}
                  >
                     Layanan tidak ditemukan
                  </Typography>
               ) : (
                  filteredServices.map((service) => {
                     const hasVariants =
                        service.variants &&
                        service.variants.filter((v) => v.is_active).length > 0;

                     if (hasVariants) {
                        return (
                           <Box key={service.id} sx={{ mb: 2 }}>
                              <Typography
                                 variant="subtitle2"
                                 sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}
                              >
                                 {service.name}
                              </Typography>
                              <Stack spacing={1} sx={{ pl: 2 }}>
                                 {service
                                    .variants!.filter((v) => v.is_active)
                                    .map((variant) => {
                                       const key = `${service.id}-${variant.id}`;
                                       const isSelected = !!selectedMap[key];
                                       const minQty = getMinQty(service, variant);

                                       return (
                                          <Stack
                                             key={variant.id}
                                             direction="row"
                                             alignItems="center"
                                             justifyContent="space-between"
                                             sx={{
                                                p: 1,
                                                borderRadius: 1,
                                                bgcolor: isSelected
                                                   ? 'action.hover'
                                                   : 'transparent',
                                             }}
                                          >
                                             <FormControlLabel
                                                control={
                                                   <Checkbox
                                                      checked={isSelected}
                                                      onChange={() =>
                                                         handleToggleSelect(service, variant)
                                                      }
                                                   />
                                                }
                                                label={
                                                   <Box>
                                                      <Typography variant="body2" fontWeight={600}>
                                                         {variant.name}
                                                      </Typography>
                                                      <Typography
                                                         variant="caption"
                                                         color="text.secondary"
                                                      >
                                                         {fCurrency(variant.price)} / {variant.unit}
                                                      </Typography>
                                                   </Box>
                                                }
                                             />

                                             {isSelected && (
                                                <QuantityController
                                                   value={selectedMap[key].qty}
                                                   min={minQty}
                                                   onChange={(val) =>
                                                      handleQtyChange(service, variant, val)
                                                   }
                                                />
                                             )}
                                          </Stack>
                                       );
                                    })}
                              </Stack>
                           </Box>
                        );
                     }

                     // Top-level service with no variants
                     const isSelected = !!selectedMap[service.id];
                     const minQty = getMinQty(service, null);

                     return (
                        <Stack
                           key={service.id}
                           direction="row"
                           alignItems="center"
                           justifyContent="space-between"
                           sx={{
                              p: 1.5,
                              mb: 1.5,
                              borderRadius: 1,
                              bgcolor: isSelected ? 'action.hover' : 'transparent',
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                           }}
                        >
                           <FormControlLabel
                              control={
                                 <Checkbox
                                    checked={isSelected}
                                    onChange={() => handleToggleSelect(service, null)}
                                 />
                              }
                              label={
                                 <Box>
                                    <Typography variant="body2" fontWeight={600}>
                                       {service.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                       {fCurrency(service.price)} / {service.unit}
                                    </Typography>
                                 </Box>
                              }
                           />

                           {isSelected && (
                              <QuantityController
                                 value={selectedMap[service.id].qty}
                                 min={minQty}
                                 onChange={(val) =>
                                    handleQtyChange(service, null, val)
                                 }
                              />
                           )}
                        </Stack>
                     );
                  })
               )}
            </Box>
         </DialogContent>

         <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button variant="outlined" color="inherit" onClick={onClose}>
               Batal
            </Button>
            <Button variant="contained" color="warning" onClick={handleSave}>
               Simpan Layanan
            </Button>
         </DialogActions>
      </Dialog>
   );
}
