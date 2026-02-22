'use client';

import { z as zod } from 'zod';
import dayjs from 'dayjs';
import { useMemo, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';

import { paths } from 'src/routes/al/paths';
import { useRouter } from 'src/routes/hooks';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, RHFSelect, RHFTextField, RHFUpload } from 'src/components/hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { Journal } from 'src/types/journal';
import useJournalStore from 'src/stores/journal';

// ----------------------------------------------------------------------

type Props = {
   currentJournal?: Journal;
};

// Single Journal Entry Schema
const JournalItemSchema = zod.object({
   trx_date: zod.instanceof(dayjs as any, { message: 'Date is required' }),
   trx_type: zod.enum(['income', 'expense']),
   trx_category: zod.string().min(1, 'Category is required'),
   amount: zod.number().min(1, 'Amount must be greater than 0'),
   notes: zod.string().optional(),
   attachments: zod.array(zod.custom<File>()).optional(),
});

// List Schema for Dynamic Form
export const JournalListSchema = zod.object({
   journals: zod.array(JournalItemSchema),
});

export type JournalListSchemaType = zod.infer<typeof JournalListSchema>;

export default function JournalNewEditForm({ currentJournal }: Props) {
   const router = useRouter();

   const { addBatch } = useJournalStore();

   const defaultValues = useMemo(
      () => ({
         journals: [
            {
               trx_date: currentJournal?.trx_date ? dayjs(currentJournal.trx_date) : dayjs(),
               trx_type: currentJournal?.trx_type || 'expense',
               trx_category: currentJournal?.trx_category || '',
               amount: currentJournal?.amount || 0,
               notes: currentJournal?.notes || '',
               attachments: [],
            },
         ],
      }),
      [currentJournal]
   );

   const methods = useForm<JournalListSchemaType>({
      resolver: zodResolver(JournalListSchema),
      defaultValues,
   });

   const {
      reset,
      watch,
      control,
      handleSubmit,
      setValue,
      formState: { isSubmitting },
   } = methods;

   const { fields, append, remove } = useFieldArray({
      control,
      name: 'journals',
   });

   useEffect(() => {
      if (currentJournal) {
         reset(defaultValues);
      }
   }, [currentJournal, defaultValues, reset]);

   const onSubmit = handleSubmit(async (data) => {
      try {
         if (currentJournal) {
            toast.info('Update feature pending for batch mode');
         } else {
            await addBatch(data.journals);
            toast.success('Journals created successfully!');
            router.push(paths.dashboard.finance.journal.root);
         }
      } catch (error) {
         console.error(error);
         toast.error('Something went wrong');
      }
   });

   const handleAddRow = () => {
      append({
         trx_date: dayjs(),
         trx_type: 'expense',
         trx_category: '',
         amount: 0,
         notes: '',
         attachments: [],
      });
   };

   return (
      <Form methods={methods} onSubmit={onSubmit}>
         <Stack spacing={3}>
            {fields.map((field, index) => (
               <Card key={field.id} sx={{ p: 3 }}>
                  <Stack
                     direction="row"
                     alignItems="center"
                     justifyContent="space-between"
                     sx={{ mb: 2 }}
                  >
                     <Typography variant="h6">Entry #{index + 1}</Typography>
                     {fields.length > 1 && (
                        <Button
                           size="small"
                           color="error"
                           startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                           onClick={() => remove(index)}
                        >
                           Remove
                        </Button>
                     )}
                  </Stack>

                  <Grid container spacing={2}>
                     <Grid size={{ xs: 12, md: 3 }}>
                        <Controller
                           name={`journals.${index}.trx_date`}
                           control={control}
                           render={({ field: f, fieldState: { error } }) => (
                              <DatePicker
                                 label="Date"
                                 value={f.value}
                                 onChange={(newValue) => f.onChange(newValue)}
                                 slotProps={{
                                    textField: {
                                       fullWidth: true,
                                       error: !!error,
                                       helperText: error?.message,
                                    },
                                 }}
                              />
                           )}
                        />
                     </Grid>

                     <Grid size={{ xs: 12, md: 2 }}>
                        <RHFSelect name={`journals.${index}.trx_type`} label="Type">
                           <MenuItem value="income">Income</MenuItem>
                           <MenuItem value="expense">Expense</MenuItem>
                        </RHFSelect>
                     </Grid>

                     <Grid size={{ xs: 12, md: 3 }}>
                        <RHFTextField
                           name={`journals.${index}.trx_category`}
                           label="Category"
                           placeholder="e.g. Salary, Rent"
                        />
                     </Grid>

                     <Grid size={{ xs: 12, md: 4 }}>
                        <RHFTextField
                           name={`journals.${index}.amount`}
                           label="Amount"
                           placeholder="0.00"
                           type="number"
                           InputLabelProps={{ shrink: true }}
                           InputProps={{
                              startAdornment: (
                                 <InputAdornment position="start">
                                    <Box component="span" sx={{ color: 'text.disabled' }}>
                                       Rp
                                    </Box>
                                 </InputAdornment>
                              ),
                           }}
                        />
                     </Grid>

                     <Grid size={{ xs: 12 }}>
                        <RHFTextField
                           name={`journals.${index}.notes`}
                           label="Notes"
                           multiline
                           rows={2}
                           placeholder="Additional notes..."
                        />
                     </Grid>

                     {/* Attachments for this row */}
                     <Grid size={{ xs: 12 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                           Attachments
                        </Typography>
                        <RHFUpload
                           multiple
                           name={`journals.${index}.attachments`}
                           maxSize={3145728}
                           onDrop={(acceptedFiles) => {
                              // We need to get current files for THIS row
                              const currentFiles =
                                 methods.getValues(`journals.${index}.attachments`) || [];
                              const newFiles = acceptedFiles.map((file) =>
                                 Object.assign(file, {
                                    preview: URL.createObjectURL(file),
                                 })
                              );
                              setValue(
                                 `journals.${index}.attachments`,
                                 [...currentFiles, ...newFiles],
                                 { shouldValidate: true }
                              );
                           }}
                           onRemove={(inputFile) => {
                              const currentFiles =
                                 methods.getValues(`journals.${index}.attachments`) || [];
                              const filtered = currentFiles.filter(
                                 (file: any) => file !== inputFile
                              );
                              setValue(`journals.${index}.attachments`, filtered);
                           }}
                           onRemoveAll={() => setValue(`journals.${index}.attachments`, [])}
                        />
                     </Grid>
                  </Grid>
               </Card>
            ))}

            <Stack direction="row" spacing={2} justifyContent="space-between">
               <Button
                  variant="outlined"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={handleAddRow}
               >
                  Add Entry
               </Button>

               <LoadingButton type="submit" variant="contained" size="large" loading={isSubmitting}>
                  {!currentJournal ? 'Save All Entries' : 'Save Changes'}
               </LoadingButton>
            </Stack>
         </Stack>
      </Form>
   );
}
