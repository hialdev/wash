'use client';

import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface Props {
   open: boolean;
   onClose: () => void;
}

export function DeleteRestrictedModal({ open, onClose }: Props) {
   return (
      <Dialog 
         open={open} 
         onClose={onClose} 
         maxWidth="xs" 
         fullWidth
         PaperProps={{
            sx: {
               borderRadius: 2,
               p: 1.5,
               textAlign: 'center',
            }
         }}
      >
         <DialogContent sx={{ pt: 4, pb: 2 }}>
            <Stack alignItems="center" spacing={2.5}>
               <Box 
                  sx={{
                     width: 80,
                     height: 80,
                     borderRadius: '50%',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     bgcolor: 'warning.lighter',
                     color: 'warning.main',
                     animation: 'pulse 2s infinite',
                     '@keyframes pulse': {
                        '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 171, 0, 0.4)' },
                        '70%': { transform: 'scale(1.05)', boxShadow: '0 0 0 12px rgba(255, 171, 0, 0)' },
                        '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 171, 0, 0)' },
                     }
                  }}
               >
                  <Iconify icon="solar:shield-warning-bold-duotone" width={48} />
               </Box>

               <Stack spacing={1}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                     Oops! Akses Terbatas
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', px: 1, lineHeight: 1.6 }}>
                     Untuk menghapus data customer / karyawan, hanya bisa dilakukan oleh owner... edit untuk memperbarui data, atau buat baru
                  </Typography>
               </Stack>
            </Stack>
         </DialogContent>

         <DialogActions sx={{ justifyContent: 'center', pb: 2, px: 3 }}>
            <Button 
               variant="contained" 
               color="warning" 
               onClick={onClose}
               fullWidth
               sx={{ py: 1 }}
            >
               Tutup
            </Button>
         </DialogActions>
      </Dialog>
   );
}
