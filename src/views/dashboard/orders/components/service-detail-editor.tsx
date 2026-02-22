import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { toast } from 'src/components/snackbar';
import { Form, Field, schemaUtils } from 'src/components/hook-form';

import useServiceTrackingStore from 'src/stores/service-tracking';
import { IOrderServiceDetail } from 'src/types/service';
import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

const ServiceDetailSchema = z.object({
   description: z.string().optional(),
   images: schemaUtils.files({ minFiles: 0 }).optional(),
});

type ServiceDetailSchemaType = z.infer<typeof ServiceDetailSchema>;

type Props = {
   orderId: string;
   serviceId: string;
   currentDetail?: IOrderServiceDetail;
};

export default function ServiceDetailEditor({ orderId, serviceId, currentDetail }: Props) {
   const { updateServiceDetail, isLoading } = useServiceTrackingStore();

   const defaultValues: ServiceDetailSchemaType = {
      description: currentDetail?.description || '',
      images: currentDetail?.images
         ? (() => {
              try {
                 const imgs = JSON.parse(currentDetail.images);
                 return imgs.map((img: string) => {
                    if (img.startsWith('http')) return img;
                    return `${CONFIG.apiHostUrl}/${img}`;
                 });
              } catch (e) {
                 return [];
              }
           })()
         : [],
   };

   const methods = useForm<ServiceDetailSchemaType>({
      resolver: zodResolver(ServiceDetailSchema),
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
      if (currentDetail) {
         reset({
            description: currentDetail.description || '',
            images: currentDetail.images
               ? (() => {
                    try {
                       const imgs = JSON.parse(currentDetail.images);
                       return imgs.map((img: string) => {
                          if (img.startsWith('http')) return img;
                          return `${CONFIG.apiHostUrl}/${img}`;
                       });
                    } catch (e) {
                       return [];
                    }
                 })()
               : [],
         });
      }
   }, [currentDetail, reset]);

   const onSubmit = handleSubmit(async (data) => {
      try {
         const formData = new FormData();
         formData.append('description', data.description || '');

         // Handle images
         const newImages: File[] = [];
         const existingImages: string[] = [];

         if (data.images && data.images.length > 0) {
            data.images.forEach((file: File | string) => {
               if (typeof file !== 'string') {
                  newImages.push(file);
               } else {
                  const relativePath = file.replace(`${CONFIG.apiHostUrl}/`, '');
                  existingImages.push(relativePath);
               }
            });
         }

         newImages.forEach((file) => {
            formData.append('images', file);
         });

         if (existingImages.length > 0) {
            formData.append('existing_images', JSON.stringify(existingImages));
         } else {
            formData.append('existing_images', JSON.stringify([]));
         }

         await updateServiceDetail(orderId, serviceId, formData);
         toast.success('Service details updated!');
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
      <Card>
         <CardHeader
            title="Service Details / Report"
            subheader="Detailed information about the service execution"
         />

         <Form methods={methods} onSubmit={onSubmit}>
            <Stack spacing={3} sx={{ p: 3 }}>
               <Stack spacing={1.5}>
                  <Typography variant="subtitle2">Description</Typography>
                  <Field.Editor name="description" sx={{ maxHeight: 480 }} />
               </Stack>

               <Stack spacing={1.5}>
                  <Typography variant="subtitle2">Images / Documentation</Typography>
                  <Field.Upload
                     multiple
                     name="images"
                     maxSize={5242880} // 5MB
                     onRemove={handleRemoveFile}
                     onRemoveAll={handleRemoveAllFiles}
                  />
               </Stack>

               <Stack alignItems="flex-end">
                  <LoadingButton
                     type="submit"
                     variant="contained"
                     loading={isSubmitting || isLoading}
                  >
                     Save Details
                  </LoadingButton>
               </Stack>
            </Stack>
         </Form>
      </Card>
   );
}
