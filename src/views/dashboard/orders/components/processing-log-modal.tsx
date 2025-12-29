import type { Order } from 'src/types/order';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';

import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { protectedApi } from 'src/lib/al/axios';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

type ProcessingLog = {
   id: string;
   order_id: string;
   processed_by_id: string;
   processed_by?: {
      id: string;
      name: string;
      email: string;
   };
   order?: {
      id: string;
      order_number: string;
      order_products?: Array<{
         id: string;
         product?: {
            id: string;
            title: string;
         };
      }>;
   };
   processing_details: string;
   notes: string;
   created_at: string;
};

type Props = {
   open: boolean;
   onClose: () => void;
   order: Order;
};

export function ProcessingLogModal({ open, onClose, order }: Props) {
   const [loading, setLoading] = useState(false);
   const [log, setLog] = useState<ProcessingLog | null>(null);

   useEffect(() => {
      if (open && order.id) {
         fetchProcessingLog();
      }
   }, [open, order.id]);

   const fetchProcessingLog = async () => {
      setLoading(true);
      try {
         const response = await protectedApi.get(`/orders/${order.id}/processing-log`);
         if (response.data.success && response.data.data) {
            setLog(response.data.data);
         }
      } catch (error: any) {
         toast.error(error.response?.data?.message || 'Failed to load processing log');
      }
      setLoading(false);
   };

   const parseProcessingDetails = () => {
      if (!log?.processing_details) return null;
      try {
         return JSON.parse(log.processing_details);
      } catch {
         return null;
      }
   };

   const details = parseProcessingDetails();

   return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
         <DialogTitle>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
               <Box>
                  <Typography variant="h6">Processing Log</Typography>
                  <Typography variant="caption" color="text.secondary">
                     Order: {order.order_number}
                  </Typography>
               </Box>
               <IconButton onClick={onClose}>
                  <Iconify icon="solar:close-circle-bold" width={24} />
               </IconButton>
            </Stack>
         </DialogTitle>

         <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
            {loading ? (
               <Box sx={{ p: 3 }}>
                  <LoadingScreen />
               </Box>
            ) : !log ? (
               <Alert severity="info" sx={{ m: 3 }}>
                  No processing log found for this order
               </Alert>
            ) : (
               <Stack spacing={3} sx={{ maxHeight: '60vh', overflowY: 'auto', p: 3 }}>
                  {/* Admin Info */}
                  <Card
                     sx={{ p: 2.5, border: 1, borderColor: 'divider', minHeight: 'fit-content' }}
                  >
                     <Typography variant="subtitle2" gutterBottom>
                        Processed By
                     </Typography>
                     <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Iconify icon="solar:user-bold" width={20} color="primary.main" />
                        <Box>
                           <Typography variant="body2" fontWeight={600}>
                              {log.processed_by?.name || 'Unknown Admin'}
                           </Typography>
                           <Typography variant="caption" color="text.secondary">
                              {log.processed_by?.email || '-'}
                           </Typography>
                        </Box>
                     </Stack>
                  </Card>

                  {/* Processing Time */}
                  <Card
                     sx={{ p: 2.5, border: 1, borderColor: 'divider', minHeight: 'fit-content' }}
                  >
                     <Typography variant="subtitle2" gutterBottom>
                        Processing Time
                     </Typography>
                     <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Iconify icon="solar:calendar-bold" width={20} color="info.main" />
                        <Typography variant="body2">
                           {new Date(log.created_at).toLocaleString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                           })}
                        </Typography>
                     </Stack>
                  </Card>

                  {/* Notes */}
                  {log.notes && (
                     <Card
                        sx={{ p: 2.5, border: 1, borderColor: 'divider', minHeight: 'fit-content' }}
                     >
                        <Typography variant="subtitle2" gutterBottom>
                           Notes
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                           {log.notes}
                        </Typography>
                     </Card>
                  )}

                  {/* Processing Details */}
                  {details && Array.isArray(details) && (
                     <Card
                        sx={{ p: 2.5, border: 1, borderColor: 'divider', minHeight: 'fit-content' }}
                     >
                        <Typography variant="subtitle2" gutterBottom>
                           Processing Details
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        <Stack spacing={2}>
                           {details.map((item: any, index: number) => {
                              // Fallback: get product title from log.order.order_products if not in details
                              let productTitle = item.product_title || 'Unknown Product';
                              if (!item.product_title && log.order?.order_products) {
                                 const orderProduct = log.order.order_products.find(
                                    (op: any) => op.id === item.order_product_id
                                 );
                                 if (orderProduct?.product?.title) {
                                    productTitle = orderProduct.product.title;
                                 }
                              }

                              return (
                                 <Box key={index}>
                                    <Stack
                                       direction="row"
                                       alignItems="center"
                                       spacing={1}
                                       sx={{ mb: 1.5 }}
                                    >
                                       <Chip
                                          label={`Product ${index + 1}`}
                                          size="small"
                                          color="primary"
                                          variant="soft"
                                       />
                                       <Typography variant="body2" fontWeight={600}>
                                          {productTitle}
                                       </Typography>
                                    </Stack>
                                    {item.pieces && item.pieces.length > 0 && (
                                       <Stack spacing={1} sx={{ pl: 2 }}>
                                          {item.pieces.map((piece: any) => (
                                             <Stack
                                                key={piece.piece_number}
                                                direction="row"
                                                alignItems="center"
                                                spacing={1}
                                                sx={{ flexWrap: 'wrap' }}
                                             >
                                                <Typography
                                                   variant="caption"
                                                   color="text.secondary"
                                                   sx={{ minWidth: 60 }}
                                                >
                                                   Piece {piece.piece_number}:
                                                </Typography>
                                                <Chip
                                                   label={
                                                      piece.use_remnant
                                                         ? 'Remnant Stock'
                                                         : 'New Stock'
                                                   }
                                                   size="small"
                                                   color={piece.use_remnant ? 'warning' : 'success'}
                                                   variant="soft"
                                                />
                                                {piece.item_number && (
                                                   <Chip
                                                      label={piece.item_number}
                                                      size="small"
                                                      variant="outlined"
                                                      sx={{
                                                         fontFamily: 'monospace',
                                                         fontSize: '0.7rem',
                                                      }}
                                                   />
                                                )}
                                             </Stack>
                                          ))}
                                       </Stack>
                                    )}
                                 </Box>
                              );
                           })}
                        </Stack>
                     </Card>
                  )}
               </Stack>
            )}
         </DialogContent>
      </Dialog>
   );
}
