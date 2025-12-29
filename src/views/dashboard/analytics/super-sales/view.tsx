'use client';

import { useState, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete from '@mui/material/Autocomplete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import TablePagination from '@mui/material/TablePagination';

import { useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/al/paths';
import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { LoadingScreen } from 'src/components/loading-screen';
import { Chart, useChart } from 'src/components/chart';
import { Iconify } from 'src/components/iconify';

import useSalesAnalyticsStore from 'src/stores/sales-analytics';
import useProductStore from 'src/stores/product';
import { AnalyticsWidgetSummary } from '../components/widget-summary';

// ----------------------------------------------------------------------

export function SuperSalesView() {
   const theme = useTheme();
   const { getSuperSales } = useSalesAnalyticsStore();
   const { all: getAllProducts } = useProductStore();

   const [loading, setLoading] = useState(false);
   const [analyticsData, setAnalyticsData] = useState<any>(null);

   // Filter states
   const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(30, 'day'));
   const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
   const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
   const [sort, setSort] = useState<'profit_desc' | 'profit_asc'>('profit_desc');

   // Data states
   const [products, setProducts] = useState<any[]>([]);

   // Pagination
   const [page, setPage] = useState(0);
   const [rowsPerPage, setRowsPerPage] = useState(10);

   useEffect(() => {
      const loadData = async () => {
         const productsRes = await getAllProducts();

         if (productsRes.success) {
            setProducts(productsRes.data?.products || productsRes.data || []);
         }
      };

      loadData();
   }, [getAllProducts]);

   const handleApplyFilters = async () => {
      setLoading(true);
      try {
         const params: any = {
            start_date: startDate?.format('YYYY-MM-DD') || '',
            end_date: endDate?.format('YYYY-MM-DD') || '',
            sort,
         };

         if (selectedProducts.length > 0) {
            params.product_ids = selectedProducts.map((p) => p.id);
         }

         const response = await getSuperSales(params);

         if (response.success) {
            setAnalyticsData(response.data);
         }
      } catch (error) {
         console.error('Failed to fetch analytics:', error);
      } finally {
         setLoading(false);
      }
   };

   // Load initial data
   useEffect(() => {
      handleApplyFilters();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   const chartData = analyticsData?.chart_data || [];
   const topProducts = analyticsData?.top_products || [];
   const summary = analyticsData?.summary || {
      total_revenue: 0,
      total_cost: 0,
      total_profit: 0,
      profit_margin: 0,
   };

   const chartOptions = useChart({
      chart: {
         type: 'bar',
         stacked: false,
      },
      plotOptions: {
         bar: {
            horizontal: false,
            columnWidth: '55%',
         },
      },
      dataLabels: {
         enabled: false,
      },
      stroke: {
         show: true,
         width: 2,
         colors: ['transparent'],
      },
      xaxis: {
         categories: chartData.map((item: any) => item.name),
         labels: {
            rotate: -45,
            rotateAlways: chartData.length > 5,
         },
      },
      yaxis: {
         title: {
            text: 'Amount (IDR)',
         },
         labels: {
            formatter: (value: number) => fCurrency(value),
         },
      },
      fill: {
         opacity: 1,
      },
      tooltip: {
         y: {
            formatter: (value: number) => fCurrency(value),
         },
      },
      legend: {
         position: 'top',
         horizontalAlign: 'right',
      },
      colors: [theme.palette.info.main, theme.palette.warning.main, theme.palette.success.main],
   });

   const chartSeries = [
      {
         name: 'Revenue',
         data: chartData.map((item: any) => item.revenue),
      },
      {
         name: 'Cost',
         data: chartData.map((item: any) => item.cost),
      },
      {
         name: 'Profit',
         data: chartData.map((item: any) => item.profit),
      },
   ];

   const handleChangePage = (event: unknown, newPage: number) => {
      setPage(newPage);
   };

   const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      setPage(0);
   };

   const paginatedProducts = topProducts.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
   );

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Super Sales Analytics"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Analytics' },
               { name: 'Super Sales' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         {/* Filters */}
         <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
               Filters
            </Typography>

            <Grid container spacing={3}>
               {/* Date Range */}
               <Grid size={{ xs: 12, md: 6 }}>
                  <DatePicker
                     label="Start Date"
                     value={startDate}
                     onChange={(newValue) => setStartDate(newValue)}
                     slotProps={{
                        textField: {
                           fullWidth: true,
                        },
                     }}
                  />
               </Grid>

               <Grid size={{ xs: 12, md: 6 }}>
                  <DatePicker
                     label="End Date"
                     value={endDate}
                     onChange={(newValue) => setEndDate(newValue)}
                     slotProps={{
                        textField: {
                           fullWidth: true,
                        },
                     }}
                  />
               </Grid>

               {/* Sort */}
               <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                     fullWidth
                     select
                     label="Sort By"
                     value={sort}
                     onChange={(e) => setSort(e.target.value as 'profit_desc' | 'profit_asc')}
                  >
                     <MenuItem value="profit_desc">Highest Profit</MenuItem>
                     <MenuItem value="profit_asc">Lowest Profit</MenuItem>
                  </TextField>
               </Grid>

               {/* Product Autocomplete */}
               <Grid size={{ xs: 12 }}>
                  <Autocomplete
                     multiple
                     options={products}
                     getOptionLabel={(option) => option.title || ''}
                     value={selectedProducts}
                     onChange={(event, newValue) => setSelectedProducts(newValue)}
                     renderInput={(params) => (
                        <TextField
                           {...params}
                           label="Select Products (Optional)"
                           placeholder="Choose products..."
                        />
                     )}
                  />
               </Grid>

               {/* Apply Button */}
               <Grid size={{ xs: 12 }}>
                  <Button
                     variant="contained"
                     size="large"
                     onClick={handleApplyFilters}
                     disabled={loading}
                     startIcon={<Iconify icon="solar:filter-bold" />}
                  >
                     {loading ? 'Loading...' : 'Apply Filters'}
                  </Button>
               </Grid>
            </Grid>
         </Card>

         {loading && <LoadingScreen />}

         {!loading && analyticsData && (
            <>
               {/* Summary Cards */}
               <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12 }}>
                     <Box
                        sx={{
                           p: 2,
                           bgcolor: 'info.lighter',
                           borderRadius: 1,
                           border: 1,
                           borderColor: 'info.light',
                        }}
                     >
                        <Typography variant="body2" color="info.darker">
                           <strong>Note:</strong> Cost calculation uses{' '}
                           <strong>Average Purchase Price</strong> from all purchase history. Profit
                           = Revenue - (Avg Purchase Price × Quantity Sold)
                        </Typography>
                     </Box>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                     <AnalyticsWidgetSummary
                        title="Total Revenue"
                        total={summary.total_revenue}
                        currency
                        icon="solar:dollar-minimalistic-bold-duotone"
                        color="info"
                     />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                     <AnalyticsWidgetSummary
                        title="Total Cost"
                        total={summary.total_cost}
                        currency
                        icon="solar:wallet-money-bold-duotone"
                        color="warning"
                     />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                     <AnalyticsWidgetSummary
                        title="Total Profit"
                        total={summary.total_profit}
                        currency
                        icon="solar:chart-2-bold-duotone"
                        color="success"
                     />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                     <AnalyticsWidgetSummary
                        title="Profit Margin"
                        total={summary.profit_margin}
                        icon="solar:graph-up-bold-duotone"
                        color="primary"
                     />
                  </Grid>
               </Grid>

               {/* Bar Chart */}
               <Card sx={{ mb: 3 }}>
                  <CardHeader
                     title="Sales Analysis by Product"
                     subheader={`${startDate?.format('MMM DD, YYYY') || 'N/A'} - ${endDate?.format('MMM DD, YYYY') || 'N/A'} | Cost based on Avg Purchase Price`}
                  />
                  <Box sx={{ p: 3 }}>
                     {chartData.length > 0 ? (
                        <Box sx={{ height: '100%' }}>
                           <Chart type="bar" series={chartSeries} options={chartOptions} />
                        </Box>
                     ) : (
                        <Box
                           sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              height: 400,
                           }}
                        >
                           <Typography variant="body2" color="text.secondary">
                              No data available for the selected filters
                           </Typography>
                        </Box>
                     )}
                  </Box>
               </Card>

               {/* Top Products Table */}
               <Card>
                  <CardHeader title="Top Products / Sales" />
                  <TableContainer component={Paper} sx={{ pt: 3 }}>
                     <Table>
                        <TableHead>
                           <TableRow>
                              <TableCell>Rank</TableCell>
                              <TableCell>Name</TableCell>
                              <TableCell align="right">Qty Sold</TableCell>
                              <TableCell align="right">Avg Sale Price</TableCell>
                              <TableCell align="right">Avg Purchase</TableCell>
                              <TableCell align="right">Revenue</TableCell>
                              <TableCell align="right">Total Cost</TableCell>
                              <TableCell align="right">Profit</TableCell>
                              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                 Margin %
                              </TableCell>
                           </TableRow>
                        </TableHead>
                        <TableBody>
                           {paginatedProducts.map((row: any, index: number) => (
                              <TableRow key={index}>
                                 <TableCell>{page * rowsPerPage + index + 1}</TableCell>

                                 <TableCell>
                                    <Typography variant="subtitle2">{row.product_name}</Typography>
                                 </TableCell>

                                 <TableCell align="right">
                                    {row.quantity_sold} {row.product_unit}
                                 </TableCell>

                                 <TableCell align="right">
                                    {row.avg_sale_price > 0 ? fCurrency(row.avg_sale_price) : 'N/A'}
                                 </TableCell>

                                 <TableCell align="right">
                                    <Typography variant="body2" color="text.secondary">
                                       {row.avg_purchase_price > 0
                                          ? fCurrency(row.avg_purchase_price)
                                          : 'N/A'}
                                    </Typography>
                                 </TableCell>

                                 <TableCell align="right">
                                    <Typography variant="body2" color="info.main">
                                       {fCurrency(row.total_revenue)}
                                    </Typography>
                                 </TableCell>

                                 <TableCell align="right">
                                    <Typography variant="body2" color="warning.main">
                                       {row.total_cost > 0 ? fCurrency(row.total_cost) : 'N/A'}
                                    </Typography>
                                 </TableCell>

                                 <TableCell align="right">
                                    <Typography
                                       variant="subtitle2"
                                       color={row.total_profit >= 0 ? 'success.main' : 'error.main'}
                                    >
                                       {fCurrency(row.total_profit)}
                                    </Typography>
                                 </TableCell>
                                 <TableCell align="right">
                                    <Typography
                                       variant="body2"
                                       color={
                                          row.profit_margin >= 0 ? 'success.main' : 'error.main'
                                       }
                                    >
                                       {row.profit_margin.toFixed(2)}%
                                    </Typography>
                                 </TableCell>
                              </TableRow>
                           ))}
                        </TableBody>
                     </Table>
                  </TableContainer>
                  <TablePagination
                     rowsPerPageOptions={[5, 10, 25, 50]}
                     component="div"
                     count={topProducts.length}
                     rowsPerPage={rowsPerPage}
                     page={page}
                     onPageChange={handleChangePage}
                     onRowsPerPageChange={handleChangeRowsPerPage}
                  />
               </Card>
            </>
         )}
      </DashboardContent>
   );
}
