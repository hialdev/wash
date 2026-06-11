'use client';

import { useState, useEffect, useRef } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import InputLabel from '@mui/material/InputLabel';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import Timeline from '@mui/lab/Timeline';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CONFIG } from 'src/global-config';

import useOrderProcessLogStore, { type OrderProcessLog } from 'src/stores/order-process-log';

// ----------------------------------------------------------------------

const PROCESS_TYPES = [
   { value: 'pickup',    label: 'Penjemputan',     icon: 'solar:delivery-bold-duotone',        color: 'info' },
   { value: 'queue',     label: 'Antrian',          icon: 'solar:clock-circle-bold-duotone',    color: 'secondary' },
   { value: 'washing',   label: 'Pencucian',        icon: 'solar:waterdrops-bold-duotone',      color: 'primary' },
   { value: 'drying',    label: 'Pengeringan',      icon: 'solar:sun-bold-duotone',             color: 'warning' },
   { value: 'ironing',   label: 'Setrika',          icon: 'solar:bolt-bold-duotone',            color: 'warning' },
   { value: 'packing',   label: 'Packing',          icon: 'solar:box-bold-duotone',             color: 'secondary' },
   { value: 'ready',     label: 'Siap Diambil',     icon: 'solar:check-circle-bold-duotone',   color: 'success' },
   { value: 'delivery',  label: 'Pengiriman',       icon: 'solar:delivery-bold-duotone',        color: 'info' },
   { value: 'done',      label: 'Selesai',          icon: 'solar:verified-check-bold-duotone',  color: 'success' },
   { value: 'other',     label: 'Lainnya',          icon: 'solar:notes-bold-duotone',           color: 'default' },
] as const;

type ProcessTypeColor = 'info' | 'secondary' | 'primary' | 'warning' | 'success' | 'default';

function getProcessType(value: string) {
   return PROCESS_TYPES.find((p) => p.value === value) ?? {
      value,
      label: value,
      icon: 'solar:notes-bold-duotone',
      color: 'default' as ProcessTypeColor,
   };
}

function parseImages(images?: string): string[] {
   if (!images) return [];
   try {
      const arr = JSON.parse(images);
      return arr.map((url: string) => (url.startsWith('http') ? url : `${CONFIG.apiHostUrl}/${url}`));
   } catch {
      return [];
   }
}

// ----------------------------------------------------------------------

interface Props {
   orderId: string;
   orderStatus: string;
   onOrderFinished?: () => void;
}

export default function OrderProcessPanel({ orderId, orderStatus, onOrderFinished }: Props) {
   const { logs, loading, getLogs, addLog, finishOrder, reset } = useOrderProcessLogStore();
   const [openAdd, setOpenAdd] = useState(false);
   const [openFinish, setOpenFinish] = useState(false);
   const [submitting, setSubmitting] = useState(false);

   // Add log form state
   const [processType, setProcessType] = useState('');
   const [description, setDescription] = useState('');
   const [imageFiles, setImageFiles] = useState<File[]>([]);
   const fileInputRef = useRef<HTMLInputElement>(null);

   const actionable = [
      'waiting_payment',
      'confirmed',
      'payment_verification',
      'waiting_process',
      'on_progress',
   ].includes(orderStatus);


   useEffect(() => {
      reset();
      getLogs(orderId);
      return () => reset();
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [orderId]);

   // ---- Add Log Submit ----
   const handleAddSubmit = async () => {
      if (!processType) { toast.error('Pilih jenis proses'); return; }
      setSubmitting(true);
      try {
         const fd = new FormData();
         fd.append('process_type', processType);
         if (description) fd.append('description', description);
         imageFiles.forEach((f) => fd.append('images', f));

         const res = await addLog(orderId, fd);
         if (res.success) {
            toast.success('Log proses berhasil ditambahkan');
            setOpenAdd(false);
            setProcessType('');
            setDescription('');
            setImageFiles([]);
         } else {
            toast.error(res.message || 'Gagal menambahkan log');
         }
      } catch {
         toast.error('Terjadi kesalahan');
      }
      setSubmitting(false);
   };

   // ---- Finish Order Submit ----
   const handleFinishSubmit = async () => {
      setSubmitting(true);
      try {
         const res = await finishOrder(orderId);
         if (res.success) {
            toast.success('Pesanan berhasil diselesaikan!');
            setOpenFinish(false);
            onOrderFinished?.();
         } else {
            toast.error(res.message || 'Gagal menyelesaikan pesanan');
         }
      } catch {
         toast.error('Terjadi kesalahan');
      }
      setSubmitting(false);
   };

   if (!actionable && logs.length === 0) return null;

   return (
      <>
         <Card>
            <CardHeader
               title={
                  <Stack direction="row" alignItems="center" spacing={1}>
                     <Iconify icon="solar:refresh-circle-bold-duotone" width={22} sx={{ color: 'primary.main' }} />
                     <Typography variant="h6">Proses Pesanan</Typography>
                  </Stack>
               }
               action={
                  actionable && (
                     <Stack direction="row" spacing={1}>
                        <Button
                           size="small"
                           variant="outlined"
                           startIcon={<Iconify icon="solar:add-square-bold" />}
                           onClick={() => setOpenAdd(true)}
                        >
                           Tambah Proses
                        </Button>
                        {orderStatus !== 'on_progress' && (
                           <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<Iconify icon="solar:check-circle-bold" />}
                              onClick={() => setOpenFinish(true)}
                           >
                              Selesaikan
                           </Button>
                        )}
                     </Stack>
                  )
               }
            />
            <CardContent sx={{ pt: 0 }}>
               {loading && logs.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                     Memuat log proses...
                  </Typography>
               ) : logs.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                     <Iconify icon="solar:clipboard-list-bold-duotone" width={40} sx={{ color: 'text.disabled', mb: 1 }} />
                     <Typography variant="body2" color="text.secondary">
                        Belum ada log proses
                     </Typography>
                  </Box>
               ) : (
                  <Timeline sx={{ m: 0, p: 0 }}>
                     {logs.map((log, idx) => {
                        const pt = getProcessType(log.process_type);
                        const imgs = parseImages(log.images);
                        const isLast = idx === logs.length - 1;
                        return (
                           <TimelineItem key={log.id} sx={{ '&:before': { flex: 0, p: 0 }, minHeight: isLast ? 'auto' : 60 }}>
                              <TimelineOppositeContent
                                 sx={{ m: 'auto 0', minWidth: 72, textAlign: 'right', pr: 1.5 }}
                                 variant="caption"
                                 color="text.secondary"
                              >
                                 {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                 <br />
                                 {new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                              </TimelineOppositeContent>
                              <TimelineSeparator>
                                 <TimelineDot color={pt.color === 'default' ? 'grey' : (pt.color as any)} sx={{ boxShadow: 'none' }}>
                                    <Iconify icon={pt.icon} width={16} />
                                 </TimelineDot>
                                 {!isLast && <TimelineConnector />}
                              </TimelineSeparator>
                              <TimelineContent sx={{ py: 1, px: 2 }}>
                                 <Stack spacing={0.5}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                       <Chip label={pt.label} size="small" color={pt.color as any} variant="soft" />
                                       {log.created_by?.name && (
                                          <Typography variant="caption" color="text.secondary">
                                             oleh {log.created_by.name}
                                          </Typography>
                                       )}
                                    </Stack>
                                    {log.description && (
                                       <Typography variant="body2">{log.description}</Typography>
                                    )}
                                    {imgs.length > 0 && (
                                       <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                          {imgs.map((src, i) => (
                                             <Box
                                                key={i}
                                                component="img"
                                                src={src}
                                                sx={{ width: 56, height: 56, borderRadius: 1, objectFit: 'cover', cursor: 'pointer' }}
                                                onClick={() => window.open(src, '_blank')}
                                             />
                                          ))}
                                       </Stack>
                                    )}
                                 </Stack>
                              </TimelineContent>
                           </TimelineItem>
                        );
                     })}
                  </Timeline>
               )}
            </CardContent>
         </Card>

         {/* ---- Add Process Log Dialog ---- */}
         <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth>
            <DialogTitle>
               <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Iconify icon="solar:clipboard-add-bold-duotone" width={24} sx={{ color: 'primary.main' }} />
                  <span>Tambah Log Proses</span>
               </Stack>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
               <Stack spacing={2.5} sx={{ mt: 0.5 }}>
                  <FormControl fullWidth required>
                     <InputLabel>Jenis Proses</InputLabel>
                     <Select
                        value={processType}
                        label="Jenis Proses"
                        onChange={(e) => setProcessType(e.target.value)}
                     >
                        {PROCESS_TYPES.map((p) => (
                           <MenuItem key={p.value} value={p.value}>
                              <Stack direction="row" alignItems="center" spacing={1.5}>
                                 <Iconify icon={p.icon} width={20} sx={{ color: `${p.color}.main` }} />
                                 <span>{p.label}</span>
                              </Stack>
                           </MenuItem>
                        ))}
                     </Select>
                  </FormControl>

                  <TextField
                     label="Keterangan (opsional)"
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                     multiline
                     rows={3}
                     fullWidth
                     placeholder="Mis: Pakaian sedang dalam antrian mesin cuci..."
                  />

                  {/* Image upload */}
                  <Box>
                     <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Iconify icon="solar:camera-add-bold" />}
                        onClick={() => fileInputRef.current?.click()}
                     >
                        Upload Foto ({imageFiles.length})
                     </Button>
                     <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={(e) => {
                           if (e.target.files) setImageFiles(Array.from(e.target.files));
                        }}
                     />
                     {imageFiles.length > 0 && (
                        <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap">
                           {imageFiles.map((f, i) => (
                              <Box
                                 key={i}
                                 component="img"
                                 src={URL.createObjectURL(f)}
                                 sx={{ width: 56, height: 56, borderRadius: 1, objectFit: 'cover' }}
                              />
                           ))}
                        </Stack>
                     )}
                  </Box>
               </Stack>
            </DialogContent>
            <Divider />
            <DialogActions>
               <Button onClick={() => setOpenAdd(false)} disabled={submitting}>Batal</Button>
               <LoadingButton loading={submitting} variant="contained" onClick={handleAddSubmit}>
                  Simpan Log
               </LoadingButton>
            </DialogActions>
         </Dialog>

         {/* ---- Finish Order Confirm Dialog ---- */}
         <ConfirmDialog
            open={openFinish}
            onClose={() => setOpenFinish(false)}
            title="Selesaikan Pesanan"
            content={
               <Typography>
                  Yakin ingin menyelesaikan pesanan ini? Status akan berubah menjadi <strong>Selesai</strong> dan tidak dapat diubah kembali.
               </Typography>
            }
            action={
               <LoadingButton loading={submitting} variant="contained" color="success" onClick={handleFinishSubmit}>
                  Ya, Selesaikan
               </LoadingButton>
            }
         />
      </>
   );
}
