import type { InventoryAllocation } from 'src/types/inventory';

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

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
   open: boolean;
   onClose: () => void;
   allocations: InventoryAllocation[];
   itemNumber: string;
};

export function AllocationHistoryModal({ open, onClose, allocations, itemNumber }: Props) {
   return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
         <DialogTitle>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
               <Box>
                  <Typography variant="h6">Allocation History</Typography>
                  <Typography variant="caption" color="text.secondary">
                     Item: {itemNumber}
                  </Typography>
               </Box>
               <IconButton onClick={onClose}>
                  <Iconify icon="solar:close-circle-bold" width={24} />
               </IconButton>
            </Stack>
         </DialogTitle>

         <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
            <Stack spacing={2} sx={{ maxHeight: '90vh', overflowY: 'auto', p: 3, pb: 16 }}>
               {allocations.length === 0 ? (
                  <Card sx={{ p: 3, textAlign: 'center' }}>
                     <Typography variant="body2" color="text.secondary">
                        No allocations yet
                     </Typography>
                  </Card>
               ) : (
                  allocations.map((allocation, index) => (
                     <Card
                        key={allocation.id}
                        sx={{
                           p: 2.5,
                           minHeight: 'fit-content',
                           border: 1,
                           borderColor: 'divider',
                           '&:hover': {
                              borderColor: 'primary.main',
                              boxShadow: (theme) => theme.customShadows.z8,
                           },
                        }}
                     >
                        {/* Header */}
                        <Stack
                           direction="row"
                           alignItems="center"
                           justifyContent="space-between"
                           mb={2}
                        >
                           <Chip
                              label={`#${index + 1}`}
                              size="small"
                              color="primary"
                              variant="soft"
                           />
                           <Typography variant="caption" color="text.secondary">
                              {new Date(allocation.created_at).toLocaleDateString('id-ID', {
                                 day: 'numeric',
                                 month: 'short',
                                 year: 'numeric',
                                 hour: '2-digit',
                                 minute: '2-digit',
                              })}
                           </Typography>
                        </Stack>

                        <Divider sx={{ mb: 2 }} />

                        {/* Order Info */}
                        <Stack spacing={1.5}>
                           <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                 Order Number
                              </Typography>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                 <Iconify
                                    icon="solar:clipboard-list-bold"
                                    width={16}
                                    color="primary.main"
                                 />
                                 <Typography variant="body2" fontWeight={600}>
                                    {allocation.order_product?.order?.order_number || '-'}
                                 </Typography>
                              </Stack>
                           </Box>

                           <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                 Product
                              </Typography>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                 <Iconify icon="solar:box-bold" width={16} color="info.main" />
                                 <Typography variant="body2">
                                    {allocation.order_product?.product?.title || '-'}
                                 </Typography>
                              </Stack>
                           </Box>

                           <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                 Allocated Length
                              </Typography>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                 <Iconify icon="solar:ruler-bold" width={16} color="success.main" />
                                 <Typography variant="h6" color="success.main">
                                    {allocation.allocated_length?.toFixed(2)}{' '}
                                    {allocation.measurement_unit}
                                 </Typography>
                              </Stack>
                           </Box>
                        </Stack>
                     </Card>
                  ))
               )}
            </Stack>
         </DialogContent>
      </Dialog>
   );
}
