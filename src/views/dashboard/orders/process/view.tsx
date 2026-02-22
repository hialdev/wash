'use client';

import type {
   ProcessingItem,
   ProcessingPiece,
   AvailableRemnantItem,
} from 'src/types/order-processing';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/al/paths';

import useOrderProcessingStore from 'src/stores/order-processing';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

type Props = {
   orderId: string;
};

export function ProcessOrderView({ orderId }: Props) {
   const router = useRouter();
   const { processingData, loading, getProcessingData, processOrder, reset } =
      useOrderProcessingStore();

   const [selections, setSelections] = useState<Map<string, ProcessingPiece[]>>(new Map());
   const [submitting, setSubmitting] = useState(false);

   useEffect(() => {
      getProcessingData(orderId);
      return () => reset();
   }, [orderId]);

   useEffect(() => {
      if (processingData) {
         // Initialize selections
         const newSelections = new Map<string, ProcessingPiece[]>();
         processingData.processing_items.forEach((item) => {
            if (item.tracking_mode === 'individual') {
               newSelections.set(item.order_product_id, [...item.pieces]);
            }
         });
         setSelections(newSelections);
      }
   }, [processingData]);

   const handleToggleRemnant = (
      orderProductId: string,
      pieceNumber: number,
      useRemnant: boolean
   ) => {
      setSelections((prev) => {
         const newMap = new Map(prev);
         const pieces = newMap.get(orderProductId);
         if (pieces) {
            const updatedPieces = pieces.map((p) =>
               p.piece_number === pieceNumber
                  ? { ...p, use_remnant: useRemnant, selected_inventory_id: null }
                  : p
            );
            newMap.set(orderProductId, updatedPieces);
         }
         return newMap;
      });
   };

   const handleSelectRemnant = (
      orderProductId: string,
      pieceNumber: number,
      remnant: AvailableRemnantItem | null
   ) => {
      setSelections((prev) => {
         const newMap = new Map(prev);
         const pieces = newMap.get(orderProductId);
         if (pieces) {
            const updatedPieces = pieces.map((p) =>
               p.piece_number === pieceNumber
                  ? { ...p, selected_inventory_id: remnant?.id || null }
                  : p
            );
            newMap.set(orderProductId, updatedPieces);
         }
         return newMap;
      });
   };

   const handleSubmit = async () => {
      if (!processingData) return;

      // Validate selections
      for (const [orderProductId, pieces] of selections.entries()) {
         for (const piece of pieces) {
            if (piece.use_remnant && !piece.selected_inventory_id) {
               toast.error(`Please select remnant for piece ${piece.piece_number}`);
               return;
            }
         }
      }

      // Validate inventory item capacity (check if same item is used multiple times)
      const inventoryUsage = new Map<
         string,
         { totalAllocated: number; remainingLength: number; itemNumber: string }
      >();

      for (const [orderProductId, pieces] of selections.entries()) {
         // Find the processing item to get requested_length
         const processingItem = processingData.processing_items.find(
            (item) => item.order_product_id === orderProductId
         );

         if (!processingItem || !processingItem.requested_length) continue;

         for (const piece of pieces) {
            if (piece.use_remnant && piece.selected_inventory_id) {
               const inventoryId = piece.selected_inventory_id;
               const requestedLength = processingItem.requested_length;

               // Find the remnant item to get its remaining_length
               const remnantItem = piece.available_remnants.find((r) => r.id === inventoryId);
               if (!remnantItem) continue;

               if (!inventoryUsage.has(inventoryId)) {
                  inventoryUsage.set(inventoryId, {
                     totalAllocated: 0,
                     remainingLength: remnantItem.remaining_length,
                     itemNumber: remnantItem.item_number,
                  });
               }

               const usage = inventoryUsage.get(inventoryId)!;
               usage.totalAllocated += requestedLength;
            }
         }
      }

      // Check if any inventory item is over-allocated
      for (const [inventoryId, usage] of inventoryUsage.entries()) {
         if (usage.totalAllocated > usage.remainingLength) {
            toast.error(
               `Inventory item ${usage.itemNumber} is over-allocated! ` +
                  `Total needed: ${usage.totalAllocated.toFixed(2)}m, ` +
                  `Available: ${usage.remainingLength.toFixed(2)}m`
            );
            return;
         }
      }

      // Build request
      const processingItems = processingData.processing_items.map((item) => {
         // Get pieces from selections for individual tracking items
         const pieces = selections.get(item.order_product_id) || [];

         return {
            order_product_id: item.order_product_id,
            pieces: pieces.map((p) => ({
               piece_number: p.piece_number,
               use_remnant: p.use_remnant,
               inventory_id: p.selected_inventory_id,
            })),
         };
      });

      // Map services
      const processingServices = processingData.processing_services.map((service) => ({
         order_service_id: service.order_service_id,
         notes: service.notes || '',
      }));

      setSubmitting(true);
      try {
         const res = await processOrder(orderId, {
            processing_items: processingItems,
            processing_services: processingServices,
         });
         if (res.success) {
            toast.success('Order processed successfully!');
            router.push(paths.dashboard.orders.root);
         } else {
            toast.error(res.message || 'Failed to process order');
         }
      } catch (error: any) {
         toast.error(error.response?.data?.message || 'Failed to process order');
      }
      setSubmitting(false);
   };

   if (loading || !processingData) {
      return <LoadingScreen />;
   }

   const { order, processing_items, processing_services } = processingData;

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Process Order"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Orders', href: paths.dashboard.orders.root },
               { name: order.order_number || 'Process' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         {/* Order Header */}
         <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
               Order Details
            </Typography>
            <Grid container spacing={2}>
               <Grid sx={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                     Order Number
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                     {order.order_number}
                  </Typography>
               </Grid>
               <Grid sx={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                     Total Bill
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                     IDR {order.total_bill?.toLocaleString()}
                  </Typography>
               </Grid>
            </Grid>
         </Card>

         {/* Processing Items (Products) */}
         <Typography variant="h6" sx={{ mb: 2 }}>
            Products
         </Typography>
         {processing_items.map((item) => (
            <Card key={item.order_product_id} sx={{ p: 3, mb: 3 }}>
               {/* Product Header */}
               <Box sx={{ mb: 2 }}>
                  <Typography variant="h6">{item.product.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                     Qty: {item.qty}
                     {item.requested_length &&
                        ` × ${item.requested_length} ${item.product.measurement_unit}`}
                  </Typography>
               </Box>

               <Divider sx={{ mb: 2 }} />

               {/* Simple Product */}
               {item.tracking_mode === 'simple' ? (
                  <Alert severity="info" icon={<Iconify icon="solar:settings-bold" />}>
                     <FormControlLabel
                        control={<Switch disabled checked />}
                        label="Auto-allocated by system"
                     />
                  </Alert>
               ) : (
                  /* Individual Product - Pieces */
                  <Box>
                     {item.pieces.map((piece) => {
                        const currentPiece = selections
                           .get(item.order_product_id)
                           ?.find((p) => p.piece_number === piece.piece_number);

                        return (
                           <Card
                              key={piece.piece_number}
                              variant="outlined"
                              sx={{ p: 2, mb: 2, bgcolor: 'background.neutral' }}
                           >
                              <Typography variant="subtitle2" gutterBottom>
                                 Piece {piece.piece_number}/{item.qty}
                              </Typography>

                              <FormControlLabel
                                 control={
                                    <Switch
                                       checked={currentPiece?.use_remnant || false}
                                       onChange={(e) =>
                                          handleToggleRemnant(
                                             item.order_product_id,
                                             piece.piece_number,
                                             e.target.checked
                                          )
                                       }
                                    />
                                 }
                                 label="Use remnant stock"
                              />

                              {currentPiece?.use_remnant && (
                                 <Autocomplete
                                    options={piece.available_remnants}
                                    getOptionLabel={(option) =>
                                       `${option.item_number} (${option.remaining_length.toFixed(2)} ${item.product.measurement_unit})`
                                    }
                                    value={
                                       piece.available_remnants.find(
                                          (r) => r.id === currentPiece.selected_inventory_id
                                       ) || null
                                    }
                                    onChange={(_, value) =>
                                       handleSelectRemnant(
                                          item.order_product_id,
                                          piece.piece_number,
                                          value
                                       )
                                    }
                                    renderInput={(params) => (
                                       <TextField
                                          {...params}
                                          label="Select remnant item"
                                          placeholder="Choose from available remnants..."
                                          error={!currentPiece.selected_inventory_id}
                                          helperText={
                                             !currentPiece.selected_inventory_id
                                                ? 'Please select a remnant item'
                                                : ''
                                          }
                                       />
                                    )}
                                    sx={{ mt: 2 }}
                                 />
                              )}

                              {!currentPiece?.use_remnant && (
                                 <Alert severity="success" sx={{ mt: 2 }}>
                                    Will use new stock (full roll)
                                 </Alert>
                              )}
                           </Card>
                        );
                     })}
                  </Box>
               )}
            </Card>
         ))}

         {/* Processing Services */}
         {processing_services && processing_services.length > 0 && (
            <>
               <Typography variant="h6" sx={{ mb: 2 }}>
                  Services
               </Typography>
               {processing_services.map((item) => (
                  <Card key={item.order_service_id} sx={{ p: 3, mb: 3 }}>
                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                           sx={{
                              width: 48,
                              height: 48,
                              borderRadius: 1,
                              bgcolor: 'background.neutral',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                           }}
                        >
                           <Iconify
                              icon="solar:washing-machine-bold-duotone"
                              width={24}
                              sx={{ color: 'text.disabled' }}
                           />
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                           <Typography variant="h6">{item.service.name}</Typography>
                           <Typography variant="body2" color="text.secondary">
                              Qty: {item.qty} {item.service.unit}
                           </Typography>
                           {item.notes && (
                              <Typography
                                 variant="caption"
                                 color="info.main"
                                 sx={{ mt: 0.5, display: 'block' }}
                              >
                                 Note: {item.notes}
                              </Typography>
                           )}
                        </Box>
                        <Alert severity="success" icon={<Iconify icon="solar:check-circle-bold" />}>
                           Ready to Process
                        </Alert>
                     </Box>
                  </Card>
               ))}
            </>
         )}

         {/* Submit Button */}
         <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
               variant="outlined"
               onClick={() => router.push(paths.dashboard.orders.root)}
               disabled={submitting}
            >
               Cancel
            </Button>
            <Button
               variant="contained"
               size="large"
               onClick={handleSubmit}
               disabled={submitting}
               startIcon={<Iconify icon="solar:check-circle-bold" />}
            >
               {submitting ? 'Processing...' : 'Process Order'}
            </Button>
         </Box>
      </DashboardContent>
   );
}
