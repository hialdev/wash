import { useState } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';

import Timeline from '@mui/lab/Timeline';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { Form, Field, schemaUtils } from 'src/components/hook-form';
import { fDateTime } from 'src/utils/format-time';
import { Lightbox, useLightbox } from 'src/components/lightbox';

import useServiceTrackingStore from 'src/stores/service-tracking';
import { IOrderServiceProcess } from 'src/types/service';
import { CONFIG } from 'src/global-config';

// ... (imports)

// ... (imports)

type Props = {
   orderId: string;
   serviceId: string;
   processes: IOrderServiceProcess[];
   readOnly?: boolean;
};

const PROCESS_TYPES = [
   { value: 'pickup', label: 'Pick Up', icon: 'mingcute:truck-line', color: 'info' },
   { value: 'queue', label: 'In Queue', icon: 'mingcute:time-line', color: 'secondary' },
   { value: 'processing', label: 'Processing', icon: 'mingcute:settings-2-line', color: 'primary' },
   { value: 'cleaning', label: 'Cleaning', icon: 'mingcute:broom-line', color: 'primary' },
   { value: 'drying', label: 'Drying', icon: 'mingcute:fire-line', color: 'warning' },
   { value: 'checking', label: 'Quality Check', icon: 'mingcute:check-circle-line', color: 'info' },
   { value: 'packing', label: 'Packing', icon: 'mingcute:box-3-line', color: 'secondary' },
   { value: 'ready', label: 'Ready for Pickup', icon: 'mingcute:check-2-line', color: 'success' },
   { value: 'delivery', label: 'Delivery', icon: 'mingcute:truck-fill', color: 'info' },
   { value: 'done', label: 'Done', icon: 'mingcute:check-circle-fill', color: 'success' },
   { value: 'other', label: 'Other', icon: 'mingcute:more-3-line', color: 'default' },
];

export default function ServiceProcessTimeline({
   orderId,
   serviceId,
   processes,
   readOnly = false,
}: Props) {
   const { addServiceProcess, isLoading: isSubmitting } = useServiceTrackingStore();
   const [openForm, setOpenForm] = useState(false);

   const sortedProcesses = [...processes].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
   );

   const ProcessSchema = z.object({
      process_type: z.string().min(1, 'Process type is required'),
      description: z.string().min(1, 'Description is required'),
      images: schemaUtils.files({ minFiles: 0 }).optional(),
   });

   const defaultValues = {
      process_type: '',
      description: '',
      images: [],
   };

   const methods = useForm({
      resolver: zodResolver(ProcessSchema),
      defaultValues,
   });

   const {
      watch,
      setValue,
      handleSubmit,
      reset,
      formState: { isSubmitting: isFormSubmitting },
   } = methods;

   const values = watch();

   const onSubmit = handleSubmit(async (data) => {
      try {
         const formData = new FormData();
         formData.append('process_type', data.process_type);
         formData.append('description', data.description);

         if (data.images && data.images.length > 0) {
            data.images.forEach((file: any) => {
               if (file instanceof File) {
                  formData.append('images', file);
               }
            });
         }

         await addServiceProcess(orderId, serviceId, formData);
         reset();
         setOpenForm(false);
         toast.success('Process log added successfully');
      } catch (error) {
         console.error(error);
         toast.error(typeof error === 'string' ? error : 'Failed to add process log');
      }
   });

   const getTimelineImages = (item: IOrderServiceProcess) => {
      try {
         if (!item.images) return [];
         const images = JSON.parse(item.images);
         return images.map((img: string) => ({
            src: img.startsWith('http') ? img : `${CONFIG.apiHostUrl}/${img}`,
         }));
      } catch (e) {
         return [];
      }
   };

   return (
      <Card>
         <CardHeader
            title="Process Timeline"
            action={
               !readOnly && (
                  <Button
                     size="small"
                     variant="contained"
                     startIcon={<Iconify icon="mingcute:add-line" />}
                     onClick={() => setOpenForm(true)}
                  >
                     Add Process
                  </Button>
               )
            }
         />

         <Box sx={{ p: 3 }}>
            <Timeline position="right">
               {sortedProcesses.map((item, index) => {
                  const type =
                     PROCESS_TYPES.find((t) => t.value === item.process_type) || PROCESS_TYPES[4];
                  const images = getTimelineImages(item);

                  return (
                     <TimelineItem key={item.id}>
                        <TimelineOppositeContent sx={{ m: 'auto 0' }}>
                           <Typography variant="caption" color="text.secondary">
                              {fDateTime(item.created_at)}
                           </Typography>
                        </TimelineOppositeContent>

                        <TimelineSeparator>
                           <TimelineConnector />
                           <TimelineDot color={type.color as any}>
                              <Iconify icon={type.icon} width={20} />
                           </TimelineDot>
                           <TimelineConnector />
                        </TimelineSeparator>

                        <TimelineContent sx={{ py: '12px', px: 2 }}>
                           <Typography variant="subtitle2" component="span">
                              {type.label}
                           </Typography>
                           <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                              {item.description}
                           </Typography>

                           {images.length > 0 && (
                              <Stack
                                 direction="row"
                                 spacing={1}
                                 sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}
                              >
                                 {images.map((img: any, i: number) => (
                                    <Box
                                       key={i}
                                       component="img"
                                       src={img.src}
                                       sx={{
                                          width: 64,
                                          height: 64,
                                          borderRadius: 1,
                                          objectFit: 'cover',
                                          cursor: 'pointer',
                                          border: (theme) => `1px solid ${theme.palette.divider}`,
                                       }}
                                       onClick={() => {
                                          // Simple window open for now, or implement Lightbox properly
                                          window.open(img.src, '_blank');
                                       }}
                                    />
                                 ))}
                              </Stack>
                           )}

                           {item.creator && (
                              <Typography
                                 variant="caption"
                                 sx={{ color: 'text.disabled', display: 'block', mt: 1 }}
                              >
                                 By: {item.creator.first_name} {item.creator.last_name}
                              </Typography>
                           )}
                        </TimelineContent>
                     </TimelineItem>
                  );
               })}

               {sortedProcesses.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                     <Typography variant="body2" color="text.secondary">
                        No process logs yet.
                     </Typography>
                  </Box>
               )}
            </Timeline>
         </Box>

         {/* Add Process Form Dialog */}
         <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Add Process Log</DialogTitle>

            <Form methods={methods} onSubmit={onSubmit}>
               <DialogContent>
                  <Stack spacing={3} sx={{ pt: 1 }}>
                     <Field.Select
                        name="process_type"
                        label="Process Type"
                        InputLabelProps={{ shrink: true }}
                     >
                        {PROCESS_TYPES.map((type) => (
                           <MenuItem key={type.value} value={type.value}>
                              {type.label}
                           </MenuItem>
                        ))}
                     </Field.Select>

                     <Field.Text
                        name="description"
                        label="Description"
                        multiline
                        rows={3}
                        placeholder="e.g. Picking up items from customer location..."
                     />

                     <Stack spacing={1.5}>
                        <Typography variant="subtitle2">Photos (Optional)</Typography>
                        <Field.Upload
                           multiple
                           name="images"
                           maxSize={5242880}
                           onRemove={(inputFile) => {
                              const filtered =
                                 values.images &&
                                 values.images?.filter((file) => file !== inputFile);
                              setValue('images', filtered);
                           }}
                           onRemoveAll={() => setValue('images', [])}
                        />
                     </Stack>
                  </Stack>
               </DialogContent>

               <DialogActions>
                  <Button variant="outlined" onClick={() => setOpenForm(false)}>
                     Cancel
                  </Button>
                  <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                     Submit
                  </LoadingButton>
               </DialogActions>
            </Form>
         </Dialog>
      </Card>
   );
}
