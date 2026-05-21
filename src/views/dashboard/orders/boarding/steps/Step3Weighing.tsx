'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';
import type { UserData } from 'src/stores/user';

import type { IDeliveryAddressResult } from '../components/AddAddressModal';

// ----------------------------------------------------------------------

interface Props {
   customer: UserData;
   address: IDeliveryAddressResult;
   initialWeightKg: string;
   initialSelimutPcs: string;
   initialCelanaPcs: string;
   initialBajuPcs: string;
   initialSempakPcs: string;
   initialBraPcs: string;
   initialSpreiPcs: string;
   initialLainnyaPcs: string;
   initialVideoFile: File | null;
   initialNotes: string;
   onBack: () => void;
   onNext: (data: {
      weightKg: string;
      selimutPcs: string;
      celanaPcs: string;
      bajuPcs: string;
      sempakPcs: string;
      braPcs: string;
      spreiPcs: string;
      lainnyaPcs: string;
      videoFile: File | null;
      notes: string;
   }) => void;
}

export function Step3Weighing({
   customer,
   address,
   initialWeightKg,
   initialSelimutPcs,
   initialCelanaPcs,
   initialBajuPcs,
   initialSempakPcs,
   initialBraPcs,
   initialSpreiPcs,
   initialLainnyaPcs,
   initialVideoFile,
   initialNotes,
   onBack,
   onNext,
}: Props) {
   const [weightKg, setWeightKg] = useState(initialWeightKg);
   const [selimutPcs, setSelimutPcs] = useState(initialSelimutPcs);
   const [celanaPcs, setCelanaPcs] = useState(initialCelanaPcs);
   const [bajuPcs, setBajuPcs] = useState(initialBajuPcs);
   const [sempakPcs, setSempakPcs] = useState(initialSempakPcs);
   const [braPcs, setBraPcs] = useState(initialBraPcs);
   const [spreiPcs, setSpreiPcs] = useState(initialSpreiPcs);
   const [lainnyaPcs, setLainnyaPcs] = useState(initialLainnyaPcs);
   const [videoFile, setVideoFile] = useState<File | null>(initialVideoFile);
   const [notes, setNotes] = useState(initialNotes);

   const computedTotalPcs =
      (parseInt(selimutPcs, 10) || 0) +
      (parseInt(celanaPcs, 10) || 0) +
      (parseInt(bajuPcs, 10) || 0) +
      (parseInt(sempakPcs, 10) || 0) +
      (parseInt(braPcs, 10) || 0) +
      (parseInt(spreiPcs, 10) || 0) +
      (parseInt(lainnyaPcs, 10) || 0);

   const handleNext = () => {
      onNext({
         weightKg,
         selimutPcs,
         celanaPcs,
         bajuPcs,
         sempakPcs,
         braPcs,
         spreiPcs,
         lainnyaPcs,
         videoFile,
         notes,
      });
   };

   return (
      <Box>
         <Typography variant="h6" gutterBottom>
            Penimbangan & Detailing
         </Typography>

         <Stack spacing={3}>
            {/* Customer & Address Summary */}
            <Card>
               <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                     Info Customer
                  </Typography>
                  <Stack spacing={0.5}>
                     <Typography variant="body2">
                        <strong>Nama:</strong> {customer.name}
                     </Typography>
                     <Typography variant="body2">
                        <strong>HP:</strong> {String(customer.phone || '-')}
                     </Typography>
                     <Typography variant="body2">
                        <strong>Alamat Pengiriman:</strong> {address.address}
                     </Typography>
                     <Typography variant="body2">
                        <strong>HP Penerima:</strong> {address.phone_number}
                     </Typography>
                  </Stack>
               </CardContent>
            </Card>

            {/* Weighing Form */}
            <Card>
               <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                     Data Penimbangan
                  </Typography>
                  <Stack spacing={2.5}>
                     <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                           label="Total Berat (kg)"
                           value={weightKg}
                           onChange={(e) => setWeightKg(e.target.value)}
                           type="number"
                           inputProps={{ step: 0.1, min: 0 }}
                           InputProps={{
                              endAdornment: (
                                 <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                    kg
                                 </Typography>
                              ),
                           }}
                           fullWidth
                           placeholder="0.0"
                        />
                        <TextField
                           label="Total Item (pcs)"
                           value={computedTotalPcs}
                           disabled
                           type="number"
                           InputProps={{
                              endAdornment: (
                                 <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                    pcs (otomatis dari detail)
                                 </Typography>
                              ),
                           }}
                           fullWidth
                        />
                     </Stack>

                     <Box sx={{ mt: 1 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary', fontWeight: 600 }}>
                           Detailing Pcs
                        </Typography>
                        <Box
                           sx={{
                              display: 'grid',
                              gap: 2,
                              gridTemplateColumns: {
                                 xs: 'repeat(2, 1fr)',
                                 sm: 'repeat(4, 1fr)',
                              },
                           }}
                        >
                           <TextField
                              label="Selimut"
                              value={selimutPcs}
                              onChange={(e) => setSelimutPcs(e.target.value)}
                              type="number"
                              inputProps={{ min: 0 }}
                              placeholder="0"
                              size="small"
                              InputProps={{
                                 startAdornment: (
                                    <InputAdornment position="start">
                                       <Iconify icon="solar:bed-bold-duotone" width={20} />
                                    </InputAdornment>
                                 ),
                              }}
                           />
                           <TextField
                              label="Celana"
                              value={celanaPcs}
                              onChange={(e) => setCelanaPcs(e.target.value)}
                              type="number"
                              inputProps={{ min: 0 }}
                              placeholder="0"
                              size="small"
                              InputProps={{
                                 startAdornment: (
                                    <InputAdornment position="start">
                                       <Iconify icon="ph:pants-bold" width={20} />
                                    </InputAdornment>
                                 ),
                              }}
                           />
                           <TextField
                              label="Baju"
                              value={bajuPcs}
                              onChange={(e) => setBajuPcs(e.target.value)}
                              type="number"
                              inputProps={{ min: 0 }}
                              placeholder="0"
                              size="small"
                              InputProps={{
                                 startAdornment: (
                                    <InputAdornment position="start">
                                       <Iconify icon="solar:t-shirt-bold-duotone" width={20} />
                                    </InputAdornment>
                                 ),
                              }}
                           />
                           <TextField
                              label="Sempak"
                              value={sempakPcs}
                              onChange={(e) => setSempakPcs(e.target.value)}
                              type="number"
                              inputProps={{ min: 0 }}
                              placeholder="0"
                              size="small"
                              InputProps={{
                                 startAdornment: (
                                    <InputAdornment position="start">
                                       <Iconify icon="solar:shield-user-bold-duotone" width={20} />
                                    </InputAdornment>
                                 ),
                              }}
                           />
                           <TextField
                              label="Bra"
                              value={braPcs}
                              onChange={(e) => setBraPcs(e.target.value)}
                              type="number"
                              inputProps={{ min: 0 }}
                              placeholder="0"
                              size="small"
                              InputProps={{
                                 startAdornment: (
                                    <InputAdornment position="start">
                                       <Iconify icon="solar:heart-bold-duotone" width={20} />
                                    </InputAdornment>
                                 ),
                              }}
                           />
                           <TextField
                              label="Sprei"
                              value={spreiPcs}
                              onChange={(e) => setSpreiPcs(e.target.value)}
                              type="number"
                              inputProps={{ min: 0 }}
                              placeholder="0"
                              size="small"
                              InputProps={{
                                 startAdornment: (
                                    <InputAdornment position="start">
                                       <Iconify icon="solar:document-bold-duotone" width={20} />
                                    </InputAdornment>
                                 ),
                              }}
                           />
                           <TextField
                              label="Lainnya"
                              value={lainnyaPcs}
                              onChange={(e) => setLainnyaPcs(e.target.value)}
                              type="number"
                              inputProps={{ min: 0 }}
                              placeholder="0"
                              size="small"
                              InputProps={{
                                 startAdornment: (
                                    <InputAdornment position="start">
                                       <Iconify icon="solar:box-bold-duotone" width={20} />
                                    </InputAdornment>
                                 ),
                              }}
                           />
                        </Box>
                     </Box>

                     {/* Video Upload Field */}
                     <Box sx={{ mt: 1, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 600 }}>
                           Dokumentasi Video Boarding (opsional)
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={2}>
                           <Button
                              variant="outlined"
                              component="label"
                              color="info"
                              startIcon={<Iconify icon="solar:videocamera-record-bold" />}
                           >
                              Pilih/Rekam Video
                              <input
                                 type="file"
                                 accept="video/*"
                                 hidden
                                 onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) setVideoFile(file);
                                 }}
                              />
                           </Button>
                           {videoFile && (
                              <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                 <Iconify icon="solar:check-circle-bold" /> {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
                              </Typography>
                           )}
                        </Stack>
                     </Box>

                     <TextField
                        label="Catatan Tambahan (opsional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        multiline
                        rows={3}
                        fullWidth
                        placeholder="Catatan khusus untuk pesanan ini..."
                     />
                  </Stack>
               </CardContent>
            </Card>
         </Stack>

         {/* Navigation */}
         <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
            <Button
               variant="outlined"
               onClick={onBack}
               startIcon={<Iconify icon="solar:arrow-left-bold" />}
            >
               Kembali
            </Button>
            <Button
               variant="contained"
               size="large"
               color="primary"
               onClick={handleNext}
               endIcon={<Iconify icon="solar:arrow-right-bold" />}
            >
               Lanjut Pilih Layanan
            </Button>
         </Stack>
      </Box>
   );
}
