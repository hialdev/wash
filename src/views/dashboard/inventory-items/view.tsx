'use client';

import type { InventoryItem } from 'src/types/inventory';

import { useState, useEffect, useCallback } from 'react';
import { useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/al/paths';

import useInventoryStore from 'src/stores/inventory';
import useProductStore from 'src/stores/product';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { useTable, TableNoData, TablePaginationCustom } from 'src/components/table';

import { AllocationHistoryModal } from './components/allocation-history-modal';
import { InventoryItemsTableToolbar } from './components/inventory-items-table-toolbar';

// ----------------------------------------------------------------------

export function InventoryItemsView() {
   const table = useTable({ defaultRowsPerPage: 10 });
   const { items, summary, getItemsWithAllocations } = useInventoryStore();
   const { products, all: getAllProducts } = useProductStore();

   const [loading, setLoading] = useState(false);
   const [selectedProduct, setSelectedProduct] = useState<any>(null);
   const [selectedStatus, setSelectedStatus] = useState<string>('all');
   const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
   const [modalOpen, setModalOpen] = useState(false);

   const [pagination, setPagination] = useState({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
   });

   const filters = useSetState<{ search: string }>({ search: '' });
   const { state: currentFilters, setState: updateFilters } = filters;

   const fetchItems = useCallback(async () => {
      setLoading(true);
      try {
         const params: any = {
            search: currentFilters.search,
            page: table.page + 1, // MUI uses 0-based, backend uses 1-based
            limit: table.rowsPerPage,
         };

         if (selectedProduct) {
            params.product_id = selectedProduct.id;
         }

         if (selectedStatus && selectedStatus !== 'all') {
            params.status = selectedStatus;
         }

         const res = await getItemsWithAllocations(params);
         if (res.success && res.data) {
            const { pagination: pgnt } = res.data;
            setPagination({
               page: pgnt.page,
               limit: pgnt.limit,
               total: pgnt.total,
               totalPages: pgnt.totalPages,
            });
         } else {
            toast.error('Gagal memuat inventory items');
         }
      } catch (error) {
         toast.error('Gagal memuat inventory items');
      }
      setLoading(false);
   }, [
      table.page,
      table.rowsPerPage,
      selectedProduct,
      selectedStatus,
      currentFilters.search,
      getItemsWithAllocations,
   ]);

   useEffect(() => {
      getAllProducts({ limit: 1000 });
   }, []);

   useEffect(() => {
      fetchItems();
   }, [table.page, table.rowsPerPage, selectedProduct, selectedStatus, currentFilters.search]);

   const handleOpenModal = (item: InventoryItem) => {
      setSelectedItem(item);
      setModalOpen(true);
   };

   const handleCloseModal = () => {
      setSelectedItem(null);
      setModalOpen(false);
   };

   const statusOptions = [
      { value: 'all', label: 'All Status' },
      { value: 'available', label: 'Available' },
      { value: 'depleted', label: 'Depleted' },
   ];

   const getStatusColor = (status: string) => {
      switch (status) {
         case 'available':
            return 'success';
         case 'depleted':
            return 'error';
         default:
            return 'default';
      }
   };

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Inventory Items Tracking"
            links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Inventory Items' }]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         {/* Summary */}
         {summary && selectedProduct && (
            <Card sx={{ p: 3, mb: 3 }}>
               <Typography variant="h6" gutterBottom>
                  Summary - {selectedProduct.title}
               </Typography>
               <Grid container spacing={2}>
                  <Grid size={{ xs: 6, md: 3 }}>
                     <Typography variant="caption" color="text.secondary">
                        Total Items
                     </Typography>
                     <Typography variant="h4">{summary.total_items || 0}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                     <Typography variant="caption" color="text.secondary">
                        Available Items
                     </Typography>
                     <Typography variant="h4" color="success.main">
                        {summary.available_items || 0}
                     </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                     <Typography variant="caption" color="text.secondary">
                        Depleted Items
                     </Typography>
                     <Typography variant="h4" color="error.main">
                        {summary.depleted_items || 0}
                     </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                     <Typography variant="caption" color="text.secondary">
                        Available Length
                     </Typography>
                     <Typography variant="h4" color="primary.main">
                        {summary.total_available_length?.toFixed(2) || 0}{' '}
                        {selectedProduct.measurement_unit}
                     </Typography>
                  </Grid>
               </Grid>
            </Card>
         )}

         {loading ? (
            <LoadingScreen />
         ) : (
            <Card>
               <InventoryItemsTableToolbar
                  filters={filters}
                  onResetPage={table.onResetPage}
                  products={products}
                  selectedProduct={selectedProduct}
                  onProductChange={setSelectedProduct}
                  selectedStatus={selectedStatus}
                  onStatusChange={setSelectedStatus}
               />

               <Scrollbar>
                  <TableContainer>
                     <Table>
                        <TableHead>
                           <TableRow>
                              <TableCell>Item Number</TableCell>
                              <TableCell>Product</TableCell>
                              <TableCell align="right">Original Length</TableCell>
                              <TableCell align="right">Remaining Length</TableCell>
                              <TableCell align="right">Used Length</TableCell>
                              <TableCell align="center">Status</TableCell>
                              <TableCell align="center">Allocations</TableCell>
                           </TableRow>
                        </TableHead>
                        <TableBody>
                           {items.length === 0 ? (
                              <TableNoData notFound={items.length === 0} />
                           ) : (
                              items.map((item) => {
                                 const usedLength =
                                    (item.original_length || 0) - (item.remaining_length || 0);

                                 return (
                                    <TableRow
                                       key={item.id}
                                       hover
                                       sx={{
                                          cursor: 'pointer',
                                          '&:hover': {
                                             bgcolor: 'action.hover',
                                          },
                                       }}
                                    >
                                       <TableCell>
                                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                             {item.item_number}
                                          </Typography>
                                       </TableCell>
                                       <TableCell>
                                          <Typography variant="body2">
                                             {item.product?.title || '-'}
                                          </Typography>
                                       </TableCell>
                                       <TableCell align="right">
                                          <Typography variant="body2">
                                             {item.original_length?.toFixed(2)}{' '}
                                             {item.measurement_unit}
                                          </Typography>
                                       </TableCell>
                                       <TableCell align="right">
                                          <Typography variant="body2" color="primary.main">
                                             {item.remaining_length?.toFixed(2)}{' '}
                                             {item.measurement_unit}
                                          </Typography>
                                       </TableCell>
                                       <TableCell align="right">
                                          <Typography variant="body2" color="text.secondary">
                                             {usedLength.toFixed(2)} {item.measurement_unit}
                                          </Typography>
                                       </TableCell>
                                       <TableCell align="center">
                                          <Chip
                                             label={item.status}
                                             size="small"
                                             color={getStatusColor(item.status)}
                                             variant="soft"
                                          />
                                       </TableCell>
                                       <TableCell align="center">
                                          <Chip
                                             label={item.allocations?.length || 0}
                                             size="small"
                                             color="info"
                                             variant="outlined"
                                             onClick={() => handleOpenModal(item)}
                                             sx={{
                                                cursor:
                                                   item.allocations && item.allocations.length > 0
                                                      ? 'pointer'
                                                      : 'default',
                                                '&:hover':
                                                   item.allocations && item.allocations.length > 0
                                                      ? {
                                                           bgcolor: 'info.lighter',
                                                           borderColor: 'info.main',
                                                        }
                                                      : {},
                                             }}
                                          />
                                       </TableCell>
                                    </TableRow>
                                 );
                              })
                           )}
                        </TableBody>
                     </Table>
                  </TableContainer>
               </Scrollbar>

               <TablePaginationCustom
                  page={pagination.page - 1} // backend 1-based, MUI 0-based
                  count={pagination.total}
                  rowsPerPage={pagination.limit}
                  onPageChange={(e, newPage) => {
                     table.onChangePage(e, newPage);
                  }}
                  onRowsPerPageChange={(e) => {
                     const newLimit = parseInt(e.target.value, 10);
                     table.onChangeRowsPerPage(e as any);
                     setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
                     table.onResetPage();
                  }}
                  labelDisplayedRows={({ from, to }) =>
                     `${pagination.page} of ${pagination.totalPages} (${from}-${to} of ${pagination.total})`
                  }
               />
            </Card>
         )}

         {/* Allocation History Modal */}
         {selectedItem && (
            <AllocationHistoryModal
               open={modalOpen}
               onClose={handleCloseModal}
               allocations={selectedItem.allocations || []}
               itemNumber={selectedItem.item_number || ''}
            />
         )}
      </DashboardContent>
   );
}
