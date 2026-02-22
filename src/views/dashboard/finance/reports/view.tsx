'use client';

import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { paths } from 'src/routes/al/paths';
import { RouterLink } from 'src/routes/components';

import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import useFinanceStore from 'src/stores/finance';

// ----------------------------------------------------------------------

export default function FinanceReportView() {
   const { summary, loading, getSummary, exportPdf } = useFinanceStore();

   const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
      end: new Date(),
   });

   const fetchData = useCallback(async () => {
      if (dateRange.start && dateRange.end) {
         await getSummary({
            start_date: dateRange.start.toISOString().split('T')[0],
            end_date: dateRange.end.toISOString().split('T')[0],
         });
      }
   }, [dateRange, getSummary]);

   useEffect(() => {
      fetchData();
   }, [fetchData]);

   const handleExport = async () => {
      if (dateRange.start && dateRange.end) {
         await exportPdf({
            start_date: dateRange.start.toISOString().split('T')[0],
            end_date: dateRange.end.toISOString().split('T')[0],
         });
      }
   };

   if (!summary && loading) {
      return <LoadingScreen />;
   }

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Finance Report"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Finance', href: paths.dashboard.finance.root },
               { name: 'Reports' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         {/* Filter & Action */}
         <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 5 }}>
            <DatePicker
               label="Start Date"
               value={dateRange.start ? dayjs(dateRange.start) : null}
               onChange={(newValue) =>
                  setDateRange((prev) => ({ ...prev, start: newValue ? newValue.toDate() : null }))
               }
               slotProps={{ textField: { size: 'small' } }}
            />
            <DatePicker
               label="End Date"
               value={dateRange.end ? dayjs(dateRange.end) : null}
               onChange={(newValue) =>
                  setDateRange((prev) => ({ ...prev, end: newValue ? newValue.toDate() : null }))
               }
               slotProps={{ textField: { size: 'small' } }}
            />
            <Button
               variant="contained"
               startIcon={<Iconify icon="solar:export-bold" />}
               onClick={handleExport}
               disabled={loading}
               sx={{ width: '100%', whiteSpace:'nowrap', px:2 }}
            >
               Export PDF
            </Button>
         </Stack>

         {/* Summary Cards */}
         <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
               <Card
                  sx={{
                     display: 'flex',
                     alignItems: 'center',
                     p: 3,
                     bgcolor: 'primary.lighter',
                     color: 'primary.darker',
                  }}
               >
                  <Box sx={{ flexGrow: 1 }}>
                     <Typography variant="subtitle2">Total Income</Typography>
                     <Typography variant="h3">{fCurrency(summary?.total_income || 0)}</Typography>
                  </Box>
                  <Iconify icon="solar:wallet-money-bold" width={48} sx={{ opacity: 0.48 }} />
               </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
               <Card
                  sx={{
                     display: 'flex',
                     alignItems: 'center',
                     p: 3,
                     bgcolor: 'error.lighter',
                     color: 'error.darker',
                  }}
               >
                  <Box sx={{ flexGrow: 1 }}>
                     <Typography variant="subtitle2">Total Expense</Typography>
                     <Typography variant="h3">{fCurrency(summary?.total_expense || 0)}</Typography>
                  </Box>
                  <Iconify icon="solar:card-send-bold" width={48} sx={{ opacity: 0.48 }} />
               </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
               <Card
                  sx={{
                     display: 'flex',
                     alignItems: 'center',
                     p: 3,
                     bgcolor: 'success.lighter',
                     color: 'success.darker',
                  }}
               >
                  <Box sx={{ flexGrow: 1 }}>
                     <Typography variant="subtitle2">Net Profit</Typography>
                     <Typography variant="h3">{fCurrency(summary?.net_profit || 0)}</Typography>
                  </Box>
                  <Iconify icon="solar:hand-money-bold" width={48} sx={{ opacity: 0.48 }} />
               </Card>
            </Grid>
         </Grid>

         {/* Breakdown Details */}
         <Grid container spacing={3} sx={{ mt: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
               <Card>
                  <CardHeader title="Income Breakdown" />
                  <CardContent>
                     <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between">
                           <Typography variant="body2" color="text.secondary">
                              Sales (Orders)
                           </Typography>
                           <Typography variant="subtitle1">
                              {fCurrency(summary?.income_breakdown.sales || 0)}
                           </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                           <Typography variant="body2" color="text.secondary">
                              Manual Income (Journals)
                           </Typography>
                           <Typography variant="subtitle1">
                              {fCurrency(summary?.income_breakdown.manual_income || 0)}
                           </Typography>
                        </Stack>
                     </Stack>
                  </CardContent>
               </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
               <Card>
                  <CardHeader title="Expense Breakdown" />
                  <CardContent>
                     <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between">
                           <Typography variant="body2" color="text.secondary">
                              Raw Material Purchase
                           </Typography>
                           <Typography variant="subtitle1">
                              {fCurrency(summary?.expense_breakdown.raw_material_purchase || 0)}
                           </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                           <Typography variant="body2" color="text.secondary">
                              Product Purchase (Principal)
                           </Typography>
                           <Typography variant="subtitle1">
                              {fCurrency(summary?.expense_breakdown.product_purchase || 0)}
                           </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                           <Typography variant="body2" color="text.secondary">
                              Manual Expense (Journals)
                           </Typography>
                           <Typography variant="subtitle1">
                              {fCurrency(summary?.expense_breakdown.manual_expense || 0)}
                           </Typography>
                        </Stack>
                     </Stack>
                  </CardContent>
               </Card>
            </Grid>
         </Grid>
      </DashboardContent>
   );
}
