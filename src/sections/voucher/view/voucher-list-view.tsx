'use client';

import type { IVoucher, IVoucherTableFilters } from 'src/types/voucher';
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
import useVoucherStore from 'src/stores/voucher';
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

import { VoucherTableRow } from '../voucher-table-row';
import { VoucherTableToolbar } from '../voucher-table-toolbar';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
   { id: 'code', label: 'Voucher Code' },
   { id: 'discount_value', label: 'Discount', width: 140 },
   { id: 'quota', label: 'Usage / Quota', width: 140 },
   { id: 'is_active', label: 'Status & Vis.', width: 110 },
   { id: 'valid_until', label: 'Expiry', width: 120 },
   { id: '', width: 88 },
];

const STATUS_OPTIONS = [
   { value: 'all', label: 'All' },
   { value: 'true', label: 'Active' },
   { value: 'false', label: 'Inactive' },
];

export function VoucherListView() {
   const router = useRouter();
   const table = useTable();
   const confirmDialog = useBoolean();
   const { fetchVouchers, deleteVoucher } = useVoucherStore();

   const [tableData, setTableData] = useState<IVoucher[]>([]);
   const [loading, setLoading] = useState<boolean>(true);

   const filters = useSetState<IVoucherTableFilters>({
      code: '',
      status: 'all',
   });
   const { state: currentFilters } = filters;

   const [pagination, setPagination] = useState({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
   });

   const fetchData = useCallback(async () => {
      setLoading(true);

      const params: any = {
         page: table.page + 1,
         limit: table.rowsPerPage,
         sort: table.orderBy,
         order: table.order,
         code: currentFilters.code,
      };

      if (currentFilters.status !== 'all') {
         params.is_active = currentFilters.status;
      }

      try {
         const res = await fetchVouchers(params);
         if (res.data) {
            setTableData(res.data || []);
            // Quick workaround if pagination metadata is not structured standardly on voucher
            const pgnt = res.pagination || {
               page: 1,
               limit: 10,
               total: res.data.length,
               totalPages: 1,
            };
            setPagination({
               page: pgnt.page,
               limit: pgnt.limit,
               total: pgnt.total,
               totalPages: pgnt.totalPages,
            });
         }
      } catch (error) {
         toast.error('Failed to load vouchers');
      } finally {
         setLoading(false);
      }
   }, [
      table.page,
      table.rowsPerPage,
      table.order,
      table.orderBy,
      currentFilters.code,
      currentFilters.status,
      fetchVouchers,
   ]);

   useEffect(() => {
      fetchData();
   }, [fetchData]);

   const handleDeleteRow = useCallback(
      async (id: string) => {
         try {
            await deleteVoucher(id);
            toast.success('Delete success!');
            fetchData();
         } catch (error: any) {
            toast.error('Failed to delete');
         }
      },
      [deleteVoucher, fetchData]
   );

   const handleDeleteRows = useCallback(async () => {
      if (table.selected.length === 0) {
         toast.info('No data selected!');
         return;
      }

      try {
         // eslint-disable-next-line no-restricted-syntax
         for (const id of table.selected) {
            await deleteVoucher(id);
         }
         toast.success('Delete success!');
         table.onUpdatePageDeleteRows(tableData.length, tableData.length);
         fetchData();
      } catch (error) {
         toast.error('An error occurred while deleting!');
      }
   }, [deleteVoucher, fetchData, table, tableData.length]);

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
               heading="Vouchers"
               links={[
                  { name: 'Dashboard', href: paths.dashboard.root },
                  { name: 'Vouchers', href: paths.dashboard.voucher.root },
                  { name: 'List' },
               ]}
               action={
                  <Button
                     onClick={() => router.push(paths.dashboard.voucher.new)}
                     variant="contained"
                     startIcon={<Iconify icon="mingcute:add-line" />}
                  >
                     New Voucher
                  </Button>
               }
               sx={{ mb: { xs: 3, md: 5 } }}
            />

            <Card>
               <VoucherTableToolbar
                  filters={filters}
                  onResetPage={table.onResetPage}
                  options={{ statuses: STATUS_OPTIONS }}
               />

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
                                    <VoucherTableRow
                                       key={row.id}
                                       row={row}
                                       selected={table.selected.includes(row.id)}
                                       onSelectRow={() => table.onSelectRow(row.id)}
                                       onDeleteRow={() => handleDeleteRow(row.id)}
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
                     const newLimit = Number.parseInt(e.target.value, 10);
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
      </>
   );
}
