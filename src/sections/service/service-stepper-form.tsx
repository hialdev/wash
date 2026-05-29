'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Step from '@mui/material/Step';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import StepLabel from '@mui/material/StepLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import CardHeader from '@mui/material/CardHeader';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

import { paths } from 'src/routes/al/paths';
import { useRouter } from 'src/routes/hooks';
import useServiceStore from 'src/stores/service';
import useRawMaterialStore from 'src/stores/raw-material';
import type { RawMaterial } from 'src/types/raw-material';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { fCurrency } from 'src/utils/format-number';
import { Form, Field, schemaUtils } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const STEPS = ['Data Layanan', 'Daftar Varian', 'Input BOM (COGS)', 'Review & Kirim'];

const UNIT_OPTIONS = [
   { value: 'kg', label: 'Kg' },
   { value: 'pcs', label: 'Pcs' },
   { value: 'meter', label: 'Meter' },
];

// Zod Schemas
const ServiceBasicSchema = z.object({
   name: z.string().min(2, { message: 'Nama layanan minimal 2 karakter!' }),
   description: z.string().optional().default(''),
   images: schemaUtils.files({ minFiles: 0 }),
   price: z.number().min(0, { message: 'Harga tidak boleh kosong!' }),
   unit: z.string().min(1, { message: 'Satuan wajib diisi!' }),
   estimated_duration: z.number().min(0).optional().default(0),
   estimate_hour: z.number().min(0).optional().default(0),
   minimum_qty_order: z.number().min(1, { message: 'Minimum qty order minimal 1!' }).default(1),
   is_active: z.boolean().default(true),
   is_parent: z.boolean().default(false),
   service_category_id: z.string().optional(),
});

type ServiceBasicType = z.infer<typeof ServiceBasicSchema>;

interface IVariantLocal {
   tempId: string;
   name: string;
   description: string;
   price: number;
   unit: string;
   estimated_duration: number;
   estimate_hour: number;
   minimum_qty_order: number;
   is_active: boolean;
}

interface ICogLocal {
   raw_material_id: string;
   qty: number;
   unit: string;
}

export function ServiceStepperForm() {
   const router = useRouter();
   const { createService, fetchServiceCategories, categories } = useServiceStore();
   const { getAll: getAllRawMaterials } = useRawMaterialStore();

   const [activeStep, setActiveStep] = useState(0);
   const [isSubmittingForm, setIsSubmittingForm] = useState(false);

   // Masters
   const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);

   // Step 2 state: Local variants
   const [localVariants, setLocalVariants] = useState<IVariantLocal[]>([]);
   const [variantForm, setVariantForm] = useState({
      name: '',
      price: '',
      unit: 'kg',
      estimate_hour: '0',
      estimated_duration: '0',
      minimum_qty_order: '1',
      description: '',
      is_active: true,
   });

   // Step 3 state: COGS mapping (targetKey: tempId | 'parent' -> array of cogs)
   const [cogsMap, setCogsMap] = useState<Record<string, ICogLocal[]>>({});
   const [activeCogsTab, setActiveCogsTab] = useState<string>('parent');
   
   // Local BOM editor inputs
   const [newCog, setNewCog] = useState({
      raw_material_id: '',
      qty: '',
   });

   // React Hook Form for Step 1 (Basic data)
   const methods = useForm({
      resolver: zodResolver(ServiceBasicSchema),
      defaultValues: {
         name: '',
         description: '',
         images: [],
         price: 0,
         unit: 'kg',
         estimated_duration: 0,
         estimate_hour: 0,
         minimum_qty_order: 1,
         is_active: true,
         is_parent: false,
         service_category_id: '',
      },
   });

   const { watch, setValue, trigger, handleSubmit } = methods;
   const basicValues = watch();

   useEffect(() => {
      // Load dependencies
      fetchServiceCategories();
      getAllRawMaterials().then((data) => setRawMaterials(data || []));
   }, [fetchServiceCategories, getAllRawMaterials]);

   // Navigation triggers
   const handleNext = async () => {
      if (activeStep === 0) {
         // Validate Step 1
         const isStepValid = await trigger();
         if (!isStepValid) {
            toast.error('Harap isi semua kolom wajib di Step 1');
            return;
         }
         
         // Initialize activeCogsTab and cogsMap default
         if (basicValues.is_parent) {
            setActiveStep(1); // to Variants
         } else {
            setActiveCogsTab('parent');
            setActiveStep(2); // skip to COGS
         }
      } else if (activeStep === 1) {
         // Validate Step 2: Variants list must not be empty if is_parent is true
         if (localVariants.length === 0) {
            toast.error('Harap tambahkan minimal satu varian layanan!');
            return;
         }
         
         // Setup initial active tab for BOM input in next step
         setActiveCogsTab(localVariants[0].tempId);
         setActiveStep(2);
      } else if (activeStep === 2) {
         setActiveStep(3); // to Preview
      }
   };

   const handleBack = () => {
      if (activeStep === 2 && !basicValues.is_parent) {
         setActiveStep(0); // Jump back to Step 1
      } else {
         setActiveStep((prev) => prev - 1);
      }
   };

   // Helper methods for Step 1 images
   const handleRemoveFile = useCallback(
      (inputFile: File | string) => {
         const filtered = basicValues.images && basicValues.images?.filter((file) => file !== inputFile);
         setValue('images', filtered);
      },
      [setValue, basicValues.images]
   );

   const handleRemoveAllFiles = useCallback(() => {
      setValue('images', [], { shouldValidate: true });
   }, [setValue]);

   // Handle Variant actions (Step 2)
   const handleAddVariant = () => {
      if (!variantForm.name || !variantForm.price || !variantForm.unit) {
         toast.error('Harap lengkapi field wajib varian (Nama, Harga, Satuan)');
         return;
      }

      const ehVal = parseFloat(variantForm.estimate_hour) || 0;
      const newVar: IVariantLocal = {
         tempId: `v-${Date.now()}`,
         name: variantForm.name,
         description: variantForm.description,
         price: parseFloat(variantForm.price),
         unit: variantForm.unit,
         estimate_hour: ehVal,
         estimated_duration: Math.round(ehVal * 60),
         minimum_qty_order: parseFloat(variantForm.minimum_qty_order) || 1,
         is_active: variantForm.is_active,
      };

      setLocalVariants([...localVariants, newVar]);
      // Reset form
      setVariantForm({
         name: '',
         price: '',
         unit: basicValues.unit || 'kg', // fallback unit same as parent
         estimate_hour: '0',
         estimated_duration: '0',
         minimum_qty_order: '1',
         description: '',
         is_active: true,
      });
      toast.success('Varian ditambahkan secara lokal!');
   };

   const handleRemoveVariant = (tempId: string) => {
      setLocalVariants(localVariants.filter((v) => v.tempId !== tempId));
      // Clean up associated COGS if any
      const updatedCogsMap = { ...cogsMap };
      delete updatedCogsMap[tempId];
      setCogsMap(updatedCogsMap);
   };

   // Handle COGS actions (Step 3)
   const handleAddCog = () => {
      if (!newCog.raw_material_id || !newCog.qty) {
         toast.error('Harap isi material dan kuantitas!');
         return;
      }

      const rm = rawMaterials.find((m) => m.id === newCog.raw_material_id);
      const targetKey = basicValues.is_parent ? activeCogsTab : 'parent';
      const currentCogs = cogsMap[targetKey] || [];

      const newEntry: ICogLocal = {
         raw_material_id: newCog.raw_material_id,
         qty: parseFloat(newCog.qty),
         unit: rm?.unit || '',
      };

      setCogsMap({
         ...cogsMap,
         [targetKey]: [...currentCogs, newEntry],
      });

      setNewCog({ raw_material_id: '', qty: '' });
   };

   const handleRemoveCog = (targetKey: string, index: number) => {
      const currentCogs = cogsMap[targetKey] || [];
      const updated = currentCogs.filter((_, i) => i !== index);
      setCogsMap({
         ...cogsMap,
         [targetKey]: updated,
      });
   };

   // Submission handler (Step 4)
   const onSubmit = async () => {
      setIsSubmittingForm(true);
      try {
         // Build final structure
         const rootServicePayload: any = {
            name: basicValues.name,
            description: basicValues.description,
            price: basicValues.is_parent ? 0 : basicValues.price,
            unit: basicValues.unit,
            estimated_duration: basicValues.estimated_duration,
            estimate_hour: basicValues.estimate_hour,
            minimum_qty_order: basicValues.minimum_qty_order,
            is_active: basicValues.is_active,
            is_parent: basicValues.is_parent,
            service_category_id: basicValues.service_category_id || null,
         };

         if (!basicValues.is_parent) {
            // Map parent COGS
            const parentCogs = cogsMap['parent'] || [];
            rootServicePayload.service_cogs = parentCogs.map((c) => ({
               raw_material_id: c.raw_material_id,
               qty: c.qty,
               unit: c.unit,
            }));
         } else {
            // Map variants and their respective nested COGS
            rootServicePayload.variants = localVariants.map((v) => {
               const vCogs = cogsMap[v.tempId] || [];
               return {
                  name: v.name,
                  description: v.description,
                  price: v.price,
                  unit: v.unit,
                  estimated_duration: v.estimated_duration,
                  estimate_hour: v.estimate_hour,
                  minimum_qty_order: v.minimum_qty_order,
                  is_active: v.is_active,
                  service_category_id: basicValues.service_category_id || null,
                  service_cogs: vCogs.map((c) => ({
                     raw_material_id: c.raw_material_id,
                     qty: c.qty,
                     unit: c.unit,
                  })),
               };
            });
         }

         // Wrap in FormData for images
         const fd = new FormData();
         fd.append('payload', JSON.stringify(rootServicePayload));

         if (basicValues.images && basicValues.images.length > 0) {
            basicValues.images.forEach((file: File | string) => {
               if (typeof file !== 'string') {
                  fd.append('images', file);
               }
            });
         }

         await createService(fd);
         toast.success('Layanan berhasil dibuat secara bertingkat!');
         router.push(paths.dashboard.service.list);
      } catch (error: any) {
         console.error(error);
         toast.error(error.message || 'Gagal memproses pembuatan layanan.');
      } finally {
         setIsSubmittingForm(false);
      }
   };

   // Render methods for steps
   const renderStep1 = () => (
      <Stack spacing={3}>
         <Card>
            <CardHeader title="Identitas Layanan Utama" subheader="Detail nama, kategori, dan foto master" />
            <Divider />
            <Stack spacing={3} sx={{ p: 3 }}>
               <Field.Text name="name" label="Nama Layanan Utama *" placeholder="cth: Cuci Kering Lipat" />
               <Field.Text name="description" label="Deskripsi Ringkas" multiline rows={3} />
               
               <Field.Select name="service_category_id" label="Kategori Layanan">
                  <MenuItem value="">-- Pilih Kategori --</MenuItem>
                  {categories.map((cat) => (
                     <MenuItem key={cat.id} value={cat.id}>
                        {cat.name}
                     </MenuItem>
                  ))}
               </Field.Select>

               <Stack spacing={1}>
                  <Typography variant="subtitle2">Foto Layanan</Typography>
                  <Field.Upload
                     multiple
                     name="images"
                     maxSize={3145728}
                     onRemove={handleRemoveFile}
                     onRemoveAll={handleRemoveAllFiles}
                  />
               </Stack>
            </Stack>
         </Card>

         <Card>
            <CardHeader title="Properti & Flagging" />
            <Divider />
            <Stack spacing={3} sx={{ p: 3 }}>
               <Stack direction="row" spacing={4}>
                  <FormControlLabel
                     label={
                        <Typography variant="subtitle2" color="primary.main" fontWeight={700}>
                           Aktifkan Mode Grup / Memiliki Varian?
                        </Typography>
                     }
                     control={
                        <Switch
                           checked={basicValues.is_parent}
                           onChange={(e) => setValue('is_parent', e.target.checked)}
                        />
                     }
                  />
                  
                  <FormControlLabel
                     label="Status Aktif"
                     control={
                        <Switch
                           checked={basicValues.is_active}
                           onChange={(e) => setValue('is_active', e.target.checked)}
                        />
                     }
                  />
               </Stack>

               {!basicValues.is_parent && (
                  <>
                     <Divider />
                     <Typography variant="caption" color="text.secondary">
                        Keterangan: Karena tidak memiliki varian, properti harga dan estimasi akan dilekatkan langsung pada parent.
                     </Typography>
                     <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <Field.Text
                           name="price"
                           label="Harga Layanan *"
                           type="number"
                           slotProps={{
                              input: {
                                 startAdornment: <InputAdornment position="start">Rp</InputAdornment>,
                              },
                           }}
                        />

                        <Field.Select name="unit" label="Satuan Unit *">
                           {UNIT_OPTIONS.map((o) => (
                              <MenuItem key={o.value} value={o.value}>
                                 {o.label}
                              </MenuItem>
                           ))}
                        </Field.Select>
                     </Stack>

                     <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <Stack spacing={0.5} sx={{ flex: 1 }}>
                           <Field.Text
                              name="estimate_hour"
                              label="Estimasi Durasi (Jam)"
                              type="number"
                              slotProps={{
                                 input: {
                                    endAdornment: <InputAdornment position="end">jam</InputAdornment>,
                                    inputProps: { min: 0, step: 0.5 },
                                 },
                              }}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                 const hours = parseFloat(e.target.value) || 0;
                                 setValue('estimate_hour', hours);
                                 setValue('estimated_duration', Math.round(hours * 60));
                              }}
                           />
                           <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
                              = {basicValues.estimated_duration || 0} menit
                           </Typography>
                        </Stack>

                        <Stack spacing={0.5} sx={{ flex: 1 }}>
                           <Field.Text
                              name="minimum_qty_order"
                              label="Minimum Qty Order *"
                              type="number"
                              slotProps={{
                                 input: {
                                    endAdornment: <InputAdornment position="end">{basicValues.unit}</InputAdornment>,
                                    inputProps: { min: 1, step: 1 },
                                 },
                              }}
                           />
                           <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
                              BOM berlaku per {basicValues.minimum_qty_order || 1} {basicValues.unit}
                           </Typography>
                        </Stack>
                     </Stack>
                  </>
               )}
            </Stack>
         </Card>
      </Stack>
   );

   const renderStep2 = () => (
      <Stack spacing={3}>
         <Card>
            <CardHeader 
               title="Kelola Item Varian" 
               subheader="Tambahkan item-item variasi (misal: Express 1 Hari, Reguler 3 Hari)" 
            />
            <Divider />
            
            {/* Add Variant Subform */}
            <Stack spacing={2} sx={{ p: 3, bgcolor: 'background.neutral' }}>
               <Typography variant="subtitle2" fontWeight={700}>+ Baris Varian Baru</Typography>
               <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                     label="Nama Varian *"
                     size="small"
                     fullWidth
                     value={variantForm.name}
                     onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                     placeholder="cth: Express 6 Jam"
                  />
                  <TextField
                     label="Harga (Rp) *"
                     size="small"
                     type="number"
                     fullWidth
                     value={variantForm.price}
                     onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })}
                  />
                  <TextField
                     select
                     label="Satuan *"
                     size="small"
                     fullWidth
                     value={variantForm.unit}
                     onChange={(e) => setVariantForm({ ...variantForm, unit: e.target.value })}
                  >
                     {UNIT_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                     ))}
                  </TextField>
               </Stack>
               <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                  <Stack spacing={0.5}>
                     <TextField
                        label="Estimasi (Jam)"
                        size="small"
                        type="number"
                        value={variantForm.estimate_hour}
                        onChange={(e) => {
                           const hours = e.target.value;
                           setVariantForm({ 
                              ...variantForm, 
                              estimate_hour: hours,
                              estimated_duration: String(Math.round((parseFloat(hours) || 0) * 60)),
                           });
                        }}
                        slotProps={{
                           input: { inputProps: { min: 0, step: 0.5 } },
                        }}
                     />
                     <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
                        = {variantForm.estimated_duration || 0} menit
                     </Typography>
                  </Stack>
                  <TextField
                     label="Min. Qty Order"
                     size="small"
                     type="number"
                     value={variantForm.minimum_qty_order}
                     onChange={(e) => setVariantForm({ ...variantForm, minimum_qty_order: e.target.value })}
                     slotProps={{
                        input: { inputProps: { min: 1, step: 1 } },
                     }}
                  />
                  <TextField
                     label="Deskripsi Singkat"
                     size="small"
                     fullWidth
                     value={variantForm.description}
                     onChange={(e) => setVariantForm({ ...variantForm, description: e.target.value })}
                  />
                  <Button
                     variant="contained"
                     color="secondary"
                     startIcon={<Iconify icon="mingcute:add-line" />}
                     onClick={handleAddVariant}
                     sx={{ minWidth: 140, height: 40 }}
                  >
                     Tambah Varian
                  </Button>
               </Stack>
            </Stack>

            <Divider />

            {/* Variants list */}
            <Box sx={{ p: 3 }}>
               {localVariants.length === 0 ? (
                  <Box textAlign="center" py={3}>
                     <Iconify icon="solar:layers-bold-duotone" width={48} sx={{ color: 'text.disabled', mb: 1 }} />
                     <Typography color="text.secondary" variant="body2">
                        Belum ada varian yang ditambahkan. Masukkan minimal satu varian di atas.
                     </Typography>
                  </Box>
               ) : (
                  <Scrollbar>
                     <Table size="small">
                        <TableHead>
                           <TableRow>
                              <TableCell>Nama Varian</TableCell>
                              <TableCell>Harga</TableCell>
                              <TableCell>Satuan</TableCell>
                              <TableCell>Estimasi</TableCell>
                              <TableCell>Min. Qty</TableCell>
                              <TableCell align="right">Aksi</TableCell>
                           </TableRow>
                        </TableHead>
                        <TableBody>
                           {localVariants.map((v) => (
                              <TableRow key={v.tempId}>
                                 <TableCell>
                                    <Typography variant="subtitle2">{v.name}</Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>{v.description}</Typography>
                                 </TableCell>
                                 <TableCell>{fCurrency(v.price)}</TableCell>
                                 <TableCell>{v.unit}</TableCell>
                                 <TableCell>{v.estimate_hour} jam ({v.estimated_duration} mnt)</TableCell>
                                 <TableCell>{v.minimum_qty_order} {v.unit}</TableCell>
                                 <TableCell align="right">
                                    <IconButton color="error" onClick={() => handleRemoveVariant(v.tempId)}>
                                       <Iconify icon="solar:trash-bin-trash-bold" />
                                    </IconButton>
                                 </TableCell>
                              </TableRow>
                           ))}
                        </TableBody>
                     </Table>
                  </Scrollbar>
               )}
            </Box>
         </Card>
      </Stack>
   );

   const renderStep3 = () => {
      const targetKey = basicValues.is_parent ? activeCogsTab : 'parent';
      const currentCogs = cogsMap[targetKey] || [];

      return (
         <Stack spacing={3}>
            <Card>
               <CardHeader 
                  title="Bill of Materials (BOM) / Service COGS" 
                  subheader="Petakan penggunaan bahan baku untuk menghitung HPP secara akurat (Bisa dilewati jika belum siap)"
               />
               <Divider />

               {basicValues.is_parent && (
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 2 }}>
                     <Tabs
                        value={activeCogsTab}
                        onChange={(_, val) => setActiveCogsTab(val)}
                        variant="scrollable"
                        scrollButtons="auto"
                     >
                        {localVariants.map((v) => (
                           <Tab
                              key={v.tempId}
                              label={`${v.name} (${cogsMap[v.tempId]?.length || 0} BOM)`}
                              value={v.tempId}
                           />
                        ))}
                     </Tabs>
                  </Box>
               )}

               <Box sx={{ p: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                     {basicValues.is_parent 
                        ? `Input Bahan Baku untuk Varian: ${localVariants.find(v => v.tempId === activeCogsTab)?.name || ''}`
                        : 'Input Bahan Baku untuk Layanan Utama'
                     }
                  </Typography>
                  <Typography variant="caption" color="info.main" sx={{ mb: 2, display: 'block', bgcolor: 'info.lighter', px: 1.5, py: 0.75, borderRadius: 0.75 }}>
                     💡 BOM ini berlaku per{' '}
                     <strong>
                        {basicValues.is_parent
                           ? (localVariants.find(v => v.tempId === activeCogsTab)?.minimum_qty_order || 1)
                           : (basicValues.minimum_qty_order || 1)
                        }{' '}
                        {basicValues.is_parent
                           ? (localVariants.find(v => v.tempId === activeCogsTab)?.unit || basicValues.unit)
                           : basicValues.unit
                        }
                     </strong>
                     . Saat order, qty material akan dihitung proporsional berdasarkan qty pesanan.
                  </Typography>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3, alignItems: 'center' }}>
                     <TextField
                        select
                        fullWidth
                        size="small"
                        label="Bahan Baku (Raw Material)"
                        value={newCog.raw_material_id}
                        onChange={(e) => setNewCog({ ...newCog, raw_material_id: e.target.value })}
                     >
                        <MenuItem value="">-- Pilih Material --</MenuItem>
                        {rawMaterials.map((rm) => (
                           <MenuItem key={rm.id} value={rm.id}>
                              {rm.title} ({rm.unit})
                           </MenuItem>
                        ))}
                     </TextField>

                     <TextField
                        label="Jumlah Pemakaian"
                        size="small"
                        type="number"
                        fullWidth
                        value={newCog.qty}
                        onChange={(e) => setNewCog({ ...newCog, qty: e.target.value })}
                        slotProps={{
                           input: {
                              endAdornment: (
                                 <InputAdornment position="end">
                                    {rawMaterials.find(m => m.id === newCog.raw_material_id)?.unit || '-'}
                                 </InputAdornment>
                              ),
                           },
                        }}
                     />

                     <Button
                        variant="contained"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={handleAddCog}
                        sx={{ height: 40, px: 3 }}
                     >
                        Tambahkan
                     </Button>
                  </Stack>

                  <Scrollbar>
                     <Table size="small">
                        <TableHead>
                           <TableRow>
                              <TableCell>Nama Material</TableCell>
                              <TableCell>Kuantitas</TableCell>
                              <TableCell>Satuan</TableCell>
                              <TableCell align="right">Aksi</TableCell>
                           </TableRow>
                        </TableHead>
                        <TableBody>
                           {currentCogs.length === 0 ? (
                              <TableRow>
                                 <TableCell colSpan={4} align="center" sx={{ py: 2 }}>
                                    <Typography variant="caption" color="text.secondary">
                                       Belum ada pemetaan bahan baku untuk item ini.
                                    </Typography>
                                 </TableCell>
                              </TableRow>
                           ) : (
                              currentCogs.map((cog, index) => {
                                 const rm = rawMaterials.find((r) => r.id === cog.raw_material_id);
                                 return (
                                    <TableRow key={index}>
                                       <TableCell>{rm?.title || 'N/A'}</TableCell>
                                       <TableCell>{cog.qty}</TableCell>
                                       <TableCell>{cog.unit}</TableCell>
                                       <TableCell align="right">
                                          <IconButton color="error" size="small" onClick={() => handleRemoveCog(targetKey, index)}>
                                             <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                                          </IconButton>
                                       </TableCell>
                                    </TableRow>
                                 );
                              })
                           )}
                        </TableBody>
                     </Table>
                  </Scrollbar>
               </Box>
            </Card>
         </Stack>
      );
   };

   const renderStep4 = () => (
      <Stack spacing={3}>
         <Card>
            <CardHeader title="Ringkasan Pembuatan Layanan" />
            <Divider />
            <Stack spacing={3} sx={{ p: 3 }}>
               <Box sx={{ bgcolor: 'background.neutral', p: 2, borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                     Parent Service: {basicValues.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                     Deskripsi: {basicValues.description || '-'}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                     Mode Grup: <strong>{basicValues.is_parent ? 'YA (Memiliki Varian)' : 'TIDAK'}</strong>
                  </Typography>
                  {!basicValues.is_parent && (
                     <>
                        <Typography variant="subtitle2" sx={{ mt: 1 }} color="text.primary">
                           Harga Dasar: {fCurrency(basicValues.price)} / {basicValues.unit}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                           Estimasi: {basicValues.estimate_hour || 0} jam ({basicValues.estimated_duration || 0} menit)
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                           Minimum Qty Order: <strong>{basicValues.minimum_qty_order || 1} {basicValues.unit}</strong>
                        </Typography>
                     </>
                  )}
                  <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 1 }}>
                     Media Gambar: {basicValues.images?.length} file terpilih.
                  </Typography>
               </Box>

               {basicValues.is_parent ? (
                  <Stack spacing={2}>
                     <Typography variant="subtitle2" fontWeight={700}>
                        Daftar Varian & Komponen BOM Terpetakan ({localVariants.length} item):
                     </Typography>
                     {localVariants.map((v, i) => {
                        const vCogs = cogsMap[v.tempId] || [];
                        return (
                           <Box 
                              key={v.tempId} 
                              sx={{ 
                                 p: 2, 
                                 border: '1px solid', 
                                 borderColor: 'divider', 
                                 borderRadius: 1 
                              }}
                           >
                              <Stack direction="row" justifyContent="space-between">
                                 <Typography variant="subtitle2" color="info.main">
                                    #{i+1} Varian: {v.name}
                                 </Typography>
                                 <Typography variant="subtitle2">
                                    {fCurrency(v.price)} / {v.unit}
                                 </Typography>
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                 BOM Mapped: {vCogs.length} material.
                              </Typography>
                              {vCogs.length > 0 && (
                                 <Box sx={{ mt: 1, pl: 2, borderLeft: '2px dashed lightgray' }}>
                                    {vCogs.map((c, idx) => {
                                       const rm = rawMaterials.find((m) => m.id === c.raw_material_id);
                                       return (
                                          <Typography key={idx} variant="caption" display="block">
                                             • {rm?.title} ({c.qty} {c.unit})
                                          </Typography>
                                       );
                                    })}
                                 </Box>
                              )}
                           </Box>
                        );
                     })}
                  </Stack>
               ) : (
                  <Box>
                     <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Pemetaan BOM Langsung ({cogsMap['parent']?.length || 0} item):
                     </Typography>
                     {(cogsMap['parent'] || []).map((c, idx) => {
                        const rm = rawMaterials.find((m) => m.id === c.raw_material_id);
                        return (
                           <Typography key={idx} variant="body2" color="text.secondary" sx={{ pl: 1 }}>
                              - {rm?.title}: {c.qty} {c.unit}
                           </Typography>
                        );
                     })}
                  </Box>
               )}
            </Stack>
         </Card>
      </Stack>
   );

   return (
      <Form methods={methods} onSubmit={handleSubmit(onSubmit)}>
         <Card sx={{ mb: 4, p: 3 }}>
            <Stepper activeStep={activeStep} alternativeLabel sx={{ py: 1 }}>
               {STEPS.map((label, index) => {
                  const isVariantStep = index === 1;
                  // Conditionally skip Step 2 visuals if not parent
                  if (isVariantStep && !basicValues.is_parent) {
                     return null;
                  }
                  return (
                     <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                     </Step>
                  );
               })}
            </Stepper>
         </Card>

         <Box sx={{ mb: 4 }}>
            {activeStep === 0 && renderStep1()}
            {activeStep === 1 && renderStep2()}
            {activeStep === 2 && renderStep3()}
            {activeStep === 3 && renderStep4()}
         </Box>

         <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
            <Button
               variant="outlined"
               color="inherit"
               disabled={activeStep === 0}
               onClick={handleBack}
               startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            >
               Kembali
            </Button>

            {activeStep < 3 ? (
               <Button
                  variant="contained"
                  color="primary"
                  onClick={handleNext}
                  endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
               >
                  Lanjutkan
               </Button>
            ) : (
               <LoadingButton
                  variant="contained"
                  color="success"
                  size="large"
                  type="submit"
                  loading={isSubmittingForm}
                  startIcon={<Iconify icon="solar:diskette-bold" />}
               >
                  Simpan Layanan
               </LoadingButton>
            )}
         </Stack>
      </Form>
   );
}
