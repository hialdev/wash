import type { Adjustment } from 'src/types/adjustment';
import type { Product } from 'src/types/product';

import * as z from 'zod';
import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { Alert, Typography, Chip } from '@mui/material';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import useProductStore from 'src/stores/product';
import useInventoryStore from 'src/stores/inventory';
import useAdjustmentStore from 'src/stores/adjustment';
import { AdjustmentSchema, type AdjustmentFormType } from 'src/types/adjustment';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

type Props = {
   open: boolean;
   onClose: () => void;
   onSuccess?: () => void;
   currentAdjustment?: Adjustment;
};

export function AdjustmentCUForm({ currentAdjustment, open, onClose, onSuccess }: Props) {
   const { update, add } = useAdjustmentStore();
   const { products, all: getAllProducts } = useProductStore();
   const { items, getItemsWithAllocations } = useInventoryStore();

   const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
   const [availableItems, setAvailableItems] = useState<any[]>([]);

   useEffect(() => {
      getAllProducts({ limit: 1000 });
   }, []);

   const defaultValues: AdjustmentFormType = {
      product_id: currentAdjustment?.product_id || '',
      qty: currentAdjustment?.qty || 1,
      is_increment: currentAdjustment?.is_increment ?? true,
      description: currentAdjustment?.description || '',
      length_per_item: currentAdjustment?.length_per_item,
      width: currentAdjustment?.width,
      measurement_unit: currentAdjustment?.measurement_unit,
      inventory_item_ids: [],
   };

   const methods = useForm({
      mode: 'onSubmit',
      resolver: zodResolver(AdjustmentSchema),
      defaultValues,
   });

   const {
      handleSubmit,
      watch,
      formState: { isSubmitting },
      reset,
      setValue,
   } = methods;

   const watchProductId = watch('product_id');
   const watchIsIncrement = watch('is_increment');
   const watchQty = watch('qty');
   const watchInventoryItemIds = watch('inventory_item_ids');

   // Get selected product details
   useEffect(() => {
      if (watchProductId) {
         const product = products.find((p) => p.id === watchProductId);
         setSelectedProduct(product || null);

         // Auto-fill measurement unit for individual tracking
         if (product?.tracking_mode === 'individual' && product.measurement_unit) {
            setValue('measurement_unit', product.measurement_unit);
         }
      } else {
         setSelectedProduct(null);
      }
   }, [watchProductId, products, setValue]);

   // Fetch available inventory items for decrement
   useEffect(() => {
      if (selectedProduct?.tracking_mode === 'individual' && !watchIsIncrement && watchProductId) {
         getItemsWithAllocations({
            product_id: watchProductId,
            status: 'available',
            limit: 100,
         }).then((res) => {
            if (res.success && res.data) {
               setAvailableItems(res.data.items || []);
            }
         });
      } else {
         setAvailableItems([]);
      }
   }, [selectedProduct, watchIsIncrement, watchProductId, getItemsWithAllocations]);

   const isIndividualTracking = selectedProduct?.tracking_mode === 'individual';

   const inventoryItemOptions = useMemo(
      () =>
         availableItems.map((item) => ({
            label: `${item.item_number} - ${item.remaining_length?.toFixed(2)} ${item.measurement_unit}`,
            value: item.id,
            item,
         })),
      [availableItems]
   );

   const onSubmit = handleSubmit(async (data) => {
      try {
         // Validation for individual tracking
         if (isIndividualTracking) {
            if (watchIsIncrement) {
               if (!data.length_per_item || data.length_per_item <= 0) {
                  toast.error('Length per item is required for individual tracking products');
                  return;
               }
            } else {
               if (!data.inventory_item_ids || data.inventory_item_ids.length === 0) {
                  toast.error('Please select inventory items to mark as damaged/depleted');
                  return;
               }
               if (data.inventory_item_ids.length !== data.qty) {
                  toast.error(
                     `Please select exactly ${data.qty} inventory item(s) (currently selected: ${data.inventory_item_ids.length})`
                  );
                  return;
               }
            }
         }

         let result;
         if (currentAdjustment?.id) {
            result = await update({ id: currentAdjustment.id, data: data as Adjustment });
         } else {
            result = await add({ data: data as Adjustment });
         }

         if (result.success) {
            toast.success(
               currentAdjustment
                  ? 'Adjustment updated successfully!'
                  : 'Adjustment created successfully!'
            );
            reset();
            onClose();
            if (onSuccess) onSuccess();
         } else {
            toast.error(result.message || 'An error occurred');
         }
      } catch (error) {
         console.error(error);
         toast.error('An error occurred');
      }
   });

   const handleClose = () => {
      reset();
      setSelectedProduct(null);
      setAvailableItems([]);
      onClose();
   };

   const productOptions = products.map((p) => ({
      label: `${p.product_number} - ${p.title}`,
      value: p.id || '',
      product: p,
   }));

   return (
      <Dialog
         fullWidth
         maxWidth={isIndividualTracking ? 'md' : 'sm'}
         open={open}
         onClose={handleClose}
         PaperProps={{ sx: { borderRadius: 2 } }}
      >
         <DialogTitle sx={{ pb: 2 }}>
            {currentAdjustment ? 'Edit Adjustment' : 'Add New Adjustment'}
         </DialogTitle>

         <Form methods={methods} onSubmit={onSubmit}>
            <DialogContent dividers sx={{ pt: 3, pb: 3 }}>
               <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                     <Alert severity={watchIsIncrement ? 'success' : 'warning'} sx={{ mb: 2 }}>
                        {watchIsIncrement
                           ? '✅ Stock akan BERTAMBAH (Increment)'
                           : '⚠️ Stock akan BERKURANG (Decrement)'}
                     </Alert>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                     <Field.Autocomplete
                        name="product_id"
                        label="Product"
                        options={productOptions}
                        getOptionLabel={(option) =>
                           typeof option === 'string'
                              ? productOptions.find((o) => o.value === option)?.label || option
                              : option.label
                        }
                        isOptionEqualToValue={(option, value) => {
                           const optionValue = typeof option === 'string' ? option : option.value;
                           const compareValue = typeof value === 'string' ? value : value.value;
                           return optionValue === compareValue;
                        }}
                        onChange={(event, newValue) => {
                           const valueToSet =
                              typeof newValue === 'string' ? newValue : newValue?.value || '';
                           methods.setValue('product_id', valueToSet);
                        }}
                     />
                     {selectedProduct && (
                        <Box sx={{ mt: 1 }}>
                           <Chip
                              label={
                                 selectedProduct.tracking_mode === 'individual'
                                    ? 'Individual Tracking'
                                    : 'Simple Tracking'
                              }
                              size="small"
                              color={
                                 selectedProduct.tracking_mode === 'individual'
                                    ? 'primary'
                                    : 'default'
                              }
                           />
                        </Box>
                     )}
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                     <Field.Text
                        name="qty"
                        label="Quantity"
                        type="number"
                        fullWidth
                        InputProps={{
                           inputProps: { min: 1 },
                        }}
                     />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                     <Field.Switch
                        name="is_increment"
                        label="Increment Stock"
                        helperText={
                           watchIsIncrement ? 'Stock akan bertambah' : 'Stock akan berkurang'
                        }
                     />
                  </Grid>

                  {/* Individual Tracking - Increment Fields */}
                  {isIndividualTracking && watchIsIncrement && (
                     <>
                        <Grid size={{ xs: 12 }}>
                           <Alert severity="info">
                              Akan membuat <strong>{String(watchQty)}</strong> inventory item(s)
                              dengan panjang yang ditentukan
                           </Alert>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                           <Field.Text
                              name="length_per_item"
                              label={`Length per Item (${selectedProduct?.measurement_unit || 'unit'})`}
                              type="number"
                              fullWidth
                              InputProps={{
                                 inputProps: { min: 0.01, step: 0.01 },
                              }}
                              helperText="Panjang untuk setiap inventory item"
                           />
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                           <Field.Text
                              name="width"
                              label={`Width (${selectedProduct?.measurement_unit || 'unit'}) - Optional`}
                              type="number"
                              fullWidth
                              InputProps={{
                                 inputProps: { min: 0.01, step: 0.01 },
                              }}
                              helperText="Lebar (opsional)"
                           />
                        </Grid>
                     </>
                  )}

                  {/* Individual Tracking - Decrement Fields */}
                  {isIndividualTracking && !watchIsIncrement && (
                     <>
                        <Grid size={{ xs: 12 }}>
                           <Alert severity="warning">
                              Pilih <strong>{String(watchQty)}</strong> inventory item(s) yang akan
                              ditandai sebagai depleted/rusak
                              {watchInventoryItemIds &&
                                 Array.isArray(watchInventoryItemIds) &&
                                 watchInventoryItemIds.length > 0 && (
                                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                       Terpilih: {watchInventoryItemIds.length} / {String(watchQty)}{' '}
                                       item(s)
                                    </Typography>
                                 )}
                           </Alert>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                           <Field.Autocomplete
                              name="inventory_item_ids"
                              label="Select Inventory Items"
                              multiple
                              options={inventoryItemOptions}
                              getOptionLabel={(option) =>
                                 typeof option === 'string'
                                    ? inventoryItemOptions.find((o) => o.value === option)?.label ||
                                      option
                                    : option.label
                              }
                              isOptionEqualToValue={(option, value) => {
                                 const optionValue =
                                    typeof option === 'string' ? option : option.value;
                                 const compareValue =
                                    typeof value === 'string' ? value : value.value;
                                 return optionValue === compareValue;
                              }}
                              onChange={(event, newValue) => {
                                 const values = newValue.map((v: any) =>
                                    typeof v === 'string' ? v : v.value
                                 );
                                 methods.setValue('inventory_item_ids', values);
                              }}
                              helperText={`Pilih inventory items yang akan di-mark sebagai depleted. Available: ${availableItems.length.toString()} item(s)`}
                           />
                        </Grid>
                     </>
                  )}

                  <Grid size={{ xs: 12 }}>
                     <Field.Text
                        multiline
                        name="description"
                        label="Description / Reason"
                        minRows={3}
                        fullWidth
                        placeholder="Alasan adjustment (e.g., Stock opname, Kerusakan, dll)"
                     />
                  </Grid>
               </Grid>
            </DialogContent>

            <DialogActions>
               <Button onClick={handleClose} variant="outlined" color="inherit">
                  Cancel
               </Button>
               <Button type="submit" variant="contained" loading={isSubmitting}>
                  {currentAdjustment ? 'Update' : 'Create'}
               </Button>
            </DialogActions>
         </Form>
      </Dialog>
   );
}
