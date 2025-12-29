'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import useOrderStore from 'src/stores/order';
import { paths } from 'src/routes/al/paths';

// ----------------------------------------------------------------------

interface UploadPaymentProofModalProps {
   open: boolean;
   onClose: () => void;
   orderId: string;
}

export function UploadPaymentProofModal({ open, onClose, orderId }: UploadPaymentProofModalProps) {
   const router = useRouter();
   const { uploadPaymentProof } = useOrderStore();

   const [file, setFile] = useState<File | null>(null);
   const [preview, setPreview] = useState<string>('');
   const [uploading, setUploading] = useState(false);

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
         // Validate file type
         if (!selectedFile.type.startsWith('image/')) {
            toast.error('File harus berupa gambar');
            return;
         }

         // Validate file size (max 5MB)
         if (selectedFile.size > 5 * 1024 * 1024) {
            toast.error('Ukuran file maksimal 5MB');
            return;
         }

         setFile(selectedFile);
         setPreview(URL.createObjectURL(selectedFile));
      }
   };

   const handleUpload = async () => {
      if (!file) {
         toast.error('Pilih file terlebih dahulu');
         return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append('payment_proof', file);

      try {
         const response = await uploadPaymentProof({ id: orderId, data: formData });

         if (response.success) {
            toast.success('Bukti pembayaran berhasil diupload. Menunggu verifikasi admin.');
            onClose();
            // Redirect to my orders
            router.push(paths.dashboard.customer_orders.my_orders);
         } else {
            toast.error(response.message || 'Gagal upload bukti pembayaran');
         }
      } catch (error: any) {
         toast.error(error.response?.data?.message || 'Gagal upload bukti pembayaran');
      }

      setUploading(false);
   };

   const handleClose = () => {
      setFile(null);
      setPreview('');
      onClose();
   };

   return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
         <DialogTitle>Upload Bukti Pembayaran</DialogTitle>
         <DialogContent>
            <Box sx={{ mb: 2 }}>
               <Typography variant="body2" color="text.secondary" gutterBottom>
                  Upload bukti transfer Anda. File harus berupa gambar (JPG, PNG) dengan ukuran
                  maksimal 5MB.
               </Typography>
            </Box>

            <Button
               component="label"
               variant="outlined"
               startIcon={<Iconify icon="solar:upload-bold" />}
               fullWidth
               sx={{ mb: 2 }}
            >
               Pilih File
               <input type="file" accept="image/*" onChange={handleFileChange} hidden />
            </Button>

            {file && (
               <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                     {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </Typography>
               </Box>
            )}

            {preview && (
               <Box
                  sx={{
                     mt: 2,
                     border: 1,
                     borderColor: 'divider',
                     borderRadius: 1,
                     overflow: 'hidden',
                  }}
               >
                  <img
                     src={preview}
                     alt="Preview"
                     style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
               </Box>
            )}
         </DialogContent>
         <DialogActions>
            <Button onClick={handleClose} disabled={uploading}>
               Batal
            </Button>
            <LoadingButton
               onClick={handleUpload}
               variant="contained"
               loading={uploading}
               disabled={!file}
            >
               Upload
            </LoadingButton>
         </DialogActions>
      </Dialog>
   );
}
