'use client';

import type { IService } from 'src/types/service';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useCallback, useEffect } from 'react';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

import { paths } from 'src/routes/al/paths';
import { useRouter } from 'src/routes/hooks';
import useServiceStore from 'src/stores/service';

import { toast } from 'src/components/snackbar';
import { Form, Field, schemaUtils } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export type ServiceCreateSchemaType = z.infer<typeof ServiceCreateSchema>;

export const ServiceCreateSchema = z.object({
   name: z.string().min(1, { error: 'Name is required!' }),
   description: z.string(),
   images: schemaUtils.files({ error: 'Images is required!' }).min(1, {
      error: 'Must have at least 1 image!',
   }),
   price: z.number().min(0, { error: 'Price is required!' }),
   unit: z.string().min(1, { error: 'Unit is required!' }),
   estimated_duration: z.number().min(0).optional(),
   is_active: z.boolean(),
   service_category_id: z.string().optional(),
});

// ----------------------------------------------------------------------

type Props = {
   currentService?: IService;
};

const UNIT_OPTIONS = [
   { value: 'kg', label: 'Kg' },
   { value: 'pcs', label: 'Pcs' },
   { value: 'meter', label: 'Meter' },
];

import { CONFIG } from 'src/global-config';

// ...

export function ServiceCreateEditForm({ currentService }: Props) {
   const router = useRouter();
   const { createService, updateService } = useServiceStore();

   const defaultValues: ServiceCreateSchemaType = {
      name: currentService?.name || '',
      description: currentService?.description || '',
      images: currentService?.images
         ? (() => {
              try {
                 const imgs = JSON.parse(currentService.images);
                 return imgs.map((img: string) => {
                    if (img.startsWith('http')) return img;
                    return `${CONFIG.apiHostUrl}/${img}`;
                 });
              } catch (e) {
                 return [];
              }
           })()
         : [],
      price: currentService?.price || 0,
      unit: currentService?.unit || 'kg',
      estimated_duration: currentService?.estimated_duration || 0,
      is_active: currentService?.is_active ?? true,
      service_category_id: currentService?.service_category_id || undefined,
   };

   const methods = useForm<ServiceCreateSchemaType>({
      resolver: zodResolver(ServiceCreateSchema),
      defaultValues,
   });

   const {
      reset,
      watch,
      setValue,
      handleSubmit,
      formState: { isSubmitting },
   } = methods;

   const values = watch();

   useEffect(() => {
      if (currentService) {
         reset(defaultValues);
      }
   }, [currentService, reset]);

   const onSubmit = handleSubmit(async (data) => {
      try {
         // ... (rest of formData appending)
         const formData = new FormData();
         formData.append('name', data.name);
         formData.append('description', data.description || '');
         formData.append('price', data.price.toString());
         formData.append('unit', data.unit);
         if (data.estimated_duration)
            formData.append('estimated_duration', data.estimated_duration.toString());
         formData.append('is_active', data.is_active.toString());
         if (data.service_category_id)
            formData.append('service_category_id', data.service_category_id);

         // Handle images
         const newImages: File[] = [];
         const existingImages: string[] = [];

         if (data.images && data.images.length > 0) {
            data.images.forEach((file: File | string) => {
               if (typeof file !== 'string') {
                  newImages.push(file);
               } else {
                  // Strip API Host URL if present to send relative path
                  const relativePath = file.replace(`${CONFIG.apiHostUrl}/`, '');
                  existingImages.push(relativePath);
               }
            });
         }
         // ...

         // Append new images
         newImages.forEach((file) => {
            formData.append('images', file);
         });

         // Append existing images as JSON string
         if (existingImages.length > 0) {
            formData.append('existing_images', JSON.stringify(existingImages));
         } else if (currentService) {
            // If editing and no existing images, send empty array to clear images
            formData.append('existing_images', JSON.stringify([]));
         }

         if (currentService) {
            await updateService(currentService.id, formData);
            toast.success('Update success!');
         } else {
            await createService(formData);
            toast.success('Create success!');
         }
         router.push(paths.dashboard.service.list);
      } catch (error: any) {
         console.error(error);
         toast.error(error.message || 'Something went wrong');
      }
   });

   const handleRemoveFile = useCallback(
      (inputFile: File | string) => {
         const filtered = values.images && values.images?.filter((file) => file !== inputFile);
         setValue('images', filtered);
      },
      [setValue, values.images]
   );

   const handleRemoveAllFiles = useCallback(() => {
      setValue('images', [], { shouldValidate: true });
   }, [setValue]);

   return (
      <Form methods={methods} onSubmit={onSubmit}>
         <Stack spacing={{ xs: 3, md: 5 }} sx={{ mx: 'auto', maxWidth: { xs: '100%', xl: '100%' } }}>
            <Card>
               <CardHeader
                  title="Details"
                  subheader="Title, description, image..."
                  sx={{ mb: 3 }}
               />
               <Divider />
               <Stack spacing={3} sx={{ p: 3 }}>
                  <Field.Text name="name" label="Service Name" />

                  <Field.Text name="description" label="Description" multiline rows={4} />

                  <Stack spacing={1.5}>
                     <Typography variant="subtitle2">Images</Typography>
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
               <CardHeader title="Pricing & Properties" sx={{ mb: 3 }} />
               <Divider />
               <Stack spacing={3} sx={{ p: 3 }}>
                  <Field.Text
                     name="price"
                     label="Price"
                     placeholder="0.00"
                     type="number"
                     slotProps={{
                        inputLabel: { shrink: true },
                        input: {
                           startAdornment: <InputAdornment position="start">Rp</InputAdornment>,
                        },
                     }}
                  />

                  <Field.Select
                     name="unit"
                     label="Unit"
                     slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
                  >
                     {UNIT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                           {option.label}
                        </option>
                     ))}
                  </Field.Select>

                  <Field.Text
                     name="estimated_duration"
                     label="Estimated Duration (Minutes)"
                     placeholder="0"
                     type="number"
                     slotProps={{ inputLabel: { shrink: true } }}
                  />

                  <FormControlLabel
                     label="Active"
                     control={
                        <Switch
                           checked={values.is_active}
                           onChange={(e) => setValue('is_active', e.target.checked)}
                        />
                     }
                  />
               </Stack>
            </Card>

            <Stack alignItems="flex-end" sx={{ mt: 3 }}>
               <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                  {!currentService ? 'Create Service' : 'Save Changes'}
               </LoadingButton>
            </Stack>
         </Stack>
      </Form>
   );
}
