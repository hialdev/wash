'use client';

import type { IService, IServiceTableFilters } from 'src/types/service';
import type { TableHeadCellProps } from 'src/components/table';

import { useState, useEffect, useCallback } from 'react';
import { useBoolean, useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import useServiceStore from 'src/stores/service';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
   useTable,
   TableNoData,
   TableHeadCustom,
   TableSelectedAction,
   TablePaginationCustom,
} from 'src/components/table';

import { ServiceTableRow } from '../service-table-row';
import { ServiceTableToolbar } from '../service-table-toolbar';
import { ServiceTableFiltersResult } from '../service-table-filters-result';
import { ServiceCogsDialog } from '../service-cogs-dialog';
import { ServiceVariantsDialog } from '../service-variants-dialog';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
   { id: 'expand', width: 40 }, // Expand Column
   { id: 'name', label: 'Nama Layanan' },
   { id: 'created_at', label: 'Tanggal Dibuat', width: 160 },
   { id: 'price', label: 'Harga', width: 140 },
   { id: 'is_active', label: 'Status', width: 110 },
   { id: 'actions', width: 88 },
];

const STATUS_OPTIONS = [
   { value: 'all', label: 'All' },
   { value: 'true', label: 'Active' },
   { value: 'false', label: 'Inactive' },
];

// ----------------------------------------------------------------------

export function ServiceListView() {
   const router = useRouter();
   const table = useTable();
   const confirmDialog = useBoolean();
   const { fetchServices, deleteService } = useServiceStore();

   const [tableData, setTableData] = useState<IService[]>([]);
   const [loading, setLoading] = useState<boolean>(true);

   const filters = useSetState<IServiceTableFilters>({
      name: '',
      status: 'all',
   });
   const { state: currentFilters } = filters;

   const [pagination, setPagination] = useState({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
   });

   const cogsDialog = useBoolean();
   const [selectedServiceForCogs, setSelectedServiceForCogs] = useState<{
      id: string;
      name: string;
   } | null>(null);

   const variantsDialog = useBoolean();
   const [selectedServiceForVariants, setSelectedServiceForVariants] = useState<IService | null>(null);

   const handleManageCogs = useCallback((id: string, name: string) => {
      setSelectedServiceForCogs({ id, name });
      cogsDialog.onTrue();
   }, []);

   const handleManageVariants = useCallback((service: IService) => {
      setSelectedServiceForVariants(service);
      variantsDialog.onTrue();
   }, []);

   const fetchData = useCallback(async () => {
      setLoading(true);

      const params: any = {
         page: table.page + 1,
         limit: table.rowsPerPage,
         sort: table.orderBy,
         order: table.order,
         search: currentFilters.name,
         parent_id: 'none', // Only show top-level services in list
         with_variants: 'true',
      };

      if (currentFilters.status !== 'all') {
         params.is_active = currentFilters.status;
      }

      try {
         const res = await fetchServices(params);
         if (res.data) {
            const { pagination: pgnt, services } = res.data;
            setTableData(services || []);
            setPagination({
               page: pgnt.page,
               limit: pgnt.limit,
               total: pgnt.total,
               totalPages: pgnt.totalPages,
            });
         }
      } catch (error) {
         toast.error('Failed to load services');
      } finally {
         setLoading(false);
      }
   }, [
      table.page,
      table.rowsPerPage,
      table.order,
      table.orderBy,
      currentFilters.name,
      currentFilters.status,
      fetchServices,
   ]);

   useEffect(() => {
      fetchData();
   }, [fetchData]);

   const handleDeleteRow = useCallback(
      async (id: string) => {
         try {
            await deleteService(id);
            toast.success('Delete success!');
            fetchData();
         } catch (error: any) {
            toast.error('Failed to delete');
         }
      },
      [deleteService, fetchData]
   );

   const handleDeleteRows = useCallback(async () => {
      if (table.selected.length === 0) {
         toast.info('No data selected!');
         return;
      }

      try {
         // eslint-disable-next-line no-restricted-syntax
         for (const id of table.selected) {
            await deleteService(id);
         }
         toast.success('Delete success!');
         table.onUpdatePageDeleteRows(tableData.length, tableData.length);
         fetchData();
      } catch (error) {
         toast.error('An error occurred while deleting!');
      }
   }, [deleteService, fetchData, table, tableData.length]);

   const canReset = currentFilters.name !== '' || currentFilters.status !== 'all';

   const notFound = !tableData.length && !loading;

   const renderConfirmDialog = () => (
      <ConfirmDialog
         open={confirmDialog.value}
         onClose={confirmDialog.onFalse}
         title="Delete"
         content={
            <>
               Are you sure want to delete <strong>{table.selected.length}</strong> items?
            </>
         }
         action={
            <Button
               variant="contained"
               color="error"
               onClick={() => {
                  handleDeleteRows();
                  confirmDialog.onFalse();
               }}
            >
               Delete
            </Button>
         }
      />
   );

   return (
      <>
         <DashboardContent>
            <CustomBreadcrumbs
               heading="Services"
               links={[
                  { name: 'Dashboard', href: paths.dashboard.root },
                  { name: 'Services', href: paths.dashboard.service.root },
                  { name: 'List' },
               ]}
               action={
                  <Button
                     onClick={() => router.push(paths.dashboard.service.new)}
                     variant="contained"
                     startIcon={<Iconify icon="mingcute:add-line" />}
                  >
                     New Service
                  </Button>
               }
               sx={{ mb: { xs: 3, md: 5 } }}
            />

            <Card>
               <ServiceTableToolbar
                  filters={filters}
                  onResetPage={table.onResetPage}
                  options={{ statuses: STATUS_OPTIONS }}
               />

               {canReset && (
                  <ServiceTableFiltersResult
                     filters={filters}
                     totalResults={pagination.total}
                     onResetPage={table.onResetPage}
                     sx={{ p: 2.5, pt: 0 }}
                  />
               )}

               <Box sx={{ position: 'relative' }}>
                  <TableSelectedAction
                     dense={table.dense}
                     numSelected={table.selected.length}
                     rowCount={tableData.length}
                     onSelectAllRows={(checked) =>
                        table.onSelectAllRows(
                           checked,
                           tableData.map((row) => row.id)
                        )
                     }
                     action={
                        <Tooltip title="Delete">
                           <IconButton color="primary" onClick={confirmDialog.onTrue}>
                              <Iconify icon="solar:trash-bin-trash-bold" />
                           </IconButton>
                        </Tooltip>
                     }
                  />

                  <Scrollbar>
                     <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
                        <TableHeadCustom
                           order={table.order}
                           orderBy={table.orderBy}
                           headCells={TABLE_HEAD}
                           rowCount={tableData.length}
                           numSelected={table.selected.length}
                           onSort={table.onSort}
                           onSelectAllRows={(checked) =>
                              table.onSelectAllRows(
                                 checked,
                                 tableData.map((row) => row.id)
                              )
                           }
                        />

                        <TableBody>
                           {loading ? (
                              <TableRow>
                                 <TableCell colSpan={TABLE_HEAD.length} sx={{ height: 320 }}>
                                    <LoadingScreen />
                                 </TableCell>
                              </TableRow>
                           ) : (
                              <>
                                 {tableData.map((row) => (
                                    <ServiceTableRow
                                       key={row.id}
                                       row={row}
                                       selected={table.selected.includes(row.id)}
                                       onSelectRow={() => table.onSelectRow(row.id)}
                                       onDeleteRow={handleDeleteRow}
                                       onManageCogs={handleManageCogs}
                                       onManageVariants={handleManageVariants}
                                    />
                                 ))}
                              </>
                           )}

                           <TableNoData notFound={notFound} />
                        </TableBody>
                     </Table>
                  </Scrollbar>
               </Box>

               <TablePaginationCustom
                  page={pagination.page - 1}
                  dense={table.dense}
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
                  onChangeDense={table.onChangeDense}
                  labelDisplayedRows={({ from, to }) =>
                     `${pagination.page} of ${pagination.totalPages} (${from}-${to} of ${pagination.total})`
                  }
               />
            </Card>
         </DashboardContent>

         {renderConfirmDialog()}

         {selectedServiceForCogs && (
            <ServiceCogsDialog
               open={cogsDialog.value}
               onClose={() => {
                  cogsDialog.onFalse();
                  setSelectedServiceForCogs(null);
               }}
               serviceId={selectedServiceForCogs.id}
               serviceName={selectedServiceForCogs.name}
            />
         )}

         {selectedServiceForVariants && (
            <ServiceVariantsDialog
               open={variantsDialog.value}
               onClose={() => {
                  variantsDialog.onFalse();
                  setSelectedServiceForVariants(null);
                  fetchData(); // Refresh list just in case
               }}
               parentService={selectedServiceForVariants}
            />
         )}
      </>
   );
}
