'use client';

import type { UserData } from 'src/stores/user';
import type { TableHeadCellProps } from 'src/components/table';

import { useState, useEffect, useCallback } from 'react';
import { useBoolean, useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/al/paths';

import useUserStore from 'src/stores/user';
import useAuthStore from 'src/stores/auth';
import { DeleteRestrictedModal } from '../components/DeleteRestrictedModal';
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
   TablePaginationCustom,
} from 'src/components/table';

import { UserTableRow } from '../../user/components/user-table-row';
import { CustomerAddModal } from './CustomerAddModal';
import { CustomerAddressModal } from './CustomerAddressModal';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
   { id: '', label: '' },
   { id: 'name', label: 'Nama' },
   { id: 'phone', label: 'No. HP' },
   { id: 'email', label: 'Email' },
   { id: 'address', label: 'Alamat' },
   { id: 'action', width: 88 },
];

// ----------------------------------------------------------------------

export function CustomerListView() {
   const table = useTable();
   const confirmDialog = useBoolean();
   const addDialog = useBoolean();
   const addressDialog = useBoolean();
   const restrictedDialog = useBoolean();

   const { all, delete: destroy } = useUserStore();
   const { user } = useAuthStore();

   const myRole = user?.role?.name?.toLowerCase() || '';
   const isRestricted = myRole === 'manager' || myRole === 'kasir';

   const [tableData, setTableData] = useState<UserData[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchName, setSearchName] = useState('');
   const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
   const [selectedAddressCustomer, setSelectedAddressCustomer] = useState<UserData | null>(null);

   const [pagination, setPagination] = useState({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
   });

   const debouncedSearch = useDebounce(searchName, 400);

   const fetchData = useCallback(async () => {
      setLoading(true);
      try {
         const params = {
            page: table.page + 1,
            limit: table.rowsPerPage,
            sort: table.orderBy || 'created_at',
            order: table.order || 'desc',
            search: debouncedSearch || '',
            role: 'customer', // always locked to customer
         };
         const res = await all(params);
         if (res.success) {
            const { pagination: pgnt, users } = res.data;
            setTableData(users || []);
            setPagination({
               page: pgnt.page,
               limit: pgnt.limit,
               total: pgnt.total,
               totalPages: pgnt.totalPages,
            });
         } else {
            toast.error('Gagal memuat data customer');
         }
      } finally {
         setLoading(false);
      }
   }, [table.page, table.rowsPerPage, table.orderBy, table.order, debouncedSearch, all]);

   useEffect(() => {
      fetchData();
   }, [fetchData]);

   const handleDeleteRow = useCallback(async (id: string) => {
      try {
         const res = await destroy({ id });
         if (res.success) {
            toast.success('Customer berhasil dihapus');
            fetchData();
         } else {
            toast.error(res.message || 'Gagal menghapus customer');
         }
      } catch {
         toast.error('Terjadi kesalahan');
      }
   }, [destroy, fetchData]);

   const notFound = !loading && tableData.length === 0;

   return (
      <>
         <DashboardContent>
            <CustomBreadcrumbs
               heading="Data Customer"
               links={[
                  { name: 'Dashboard', href: paths.dashboard.root },
                  { name: 'Customer' },
               ]}
               action={
                  <Button
                     onClick={addDialog.onTrue}
                     variant="contained"
                     startIcon={<Iconify icon="solar:user-plus-bold" />}
                  >
                     Tambah Customer
                  </Button>
               }
               sx={{ mb: { xs: 3, md: 5 } }}
            />

            <Card>
               {/* Search bar */}
               <Box sx={{ p: 2.5 }}>
                  <TextField
                     size="small"
                     placeholder="Cari nama, HP, atau email..."
                     value={searchName}
                     onChange={(e) => setSearchName(e.target.value)}
                     InputProps={{
                        startAdornment: (
                           <InputAdornment position="start">
                              <Iconify icon="solar:magnifer-linear" width={18} />
                           </InputAdornment>
                        ),
                     }}
                     sx={{ width: { xs: '100%', sm: 320 } }}
                  />
               </Box>

               {loading ? (
                  <LoadingScreen />
               ) : (
                  <Box sx={{ position: 'relative' }}>
                     <Scrollbar>
                        <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 720 }}>
                           <TableHeadCustom
                              order={table.order}
                              orderBy={table.orderBy}
                              headCells={TABLE_HEAD}
                              rowCount={tableData.length}
                              numSelected={table.selected.length}
                              onSort={table.onSort}
                           />
                           <TableBody>
                              {tableData.map((row) => (
                                 <UserTableRow
                                    onSuccessEdit={() => fetchData()}
                                    key={row.id}
                                    row={row}
                                    selected={table.selected.includes(row.id!)}
                                    onSelectRow={() => table.onSelectRow(row.id!)}
                                    onDeleteRow={() => {
                                       if (isRestricted) {
                                          restrictedDialog.onTrue();
                                       } else {
                                          setDeleteTarget(row.id!);
                                          confirmDialog.onTrue();
                                       }
                                    }}
                                    editHref={`${paths.dashboard.users.root}/${row.id}/edit`}
                                    onViewAddresses={() => {
                                       setSelectedAddressCustomer(row);
                                       addressDialog.onTrue();
                                    }}
                                 />
                              ))}
                              {notFound && <TableNoData notFound={notFound} />}
                           </TableBody>
                        </Table>
                     </Scrollbar>
                  </Box>
               )}

               <TablePaginationCustom
                  page={pagination.page - 1}
                  dense={table.dense}
                  count={pagination.total}
                  rowsPerPage={pagination.limit}
                  onPageChange={(e, newPage) => {
                     table.onChangePage(e, newPage);
                  }}
                  onRowsPerPageChange={(e) => {
                     table.onChangeRowsPerPage(e as any);
                     setPagination((prev) => ({ ...prev, limit: parseInt(e.target.value, 10), page: 1 }));
                     table.onResetPage();
                  }}
                  onChangeDense={table.onChangeDense}
                  labelDisplayedRows={({ from, to }) =>
                     `${pagination.page} of ${pagination.totalPages} (${from}-${to} of ${pagination.total})`
                  }
               />
            </Card>
         </DashboardContent>

         {/* Confirm Delete */}
         <ConfirmDialog
            open={confirmDialog.value}
            onClose={() => { confirmDialog.onFalse(); setDeleteTarget(null); }}
            title="Hapus Customer"
            content="Yakin ingin menghapus customer ini?"
            action={
               <Button
                  variant="contained"
                  color="error"
                  onClick={() => {
                     if (deleteTarget) handleDeleteRow(deleteTarget);
                     confirmDialog.onFalse();
                     setDeleteTarget(null);
                  }}
               >
                  Hapus
               </Button>
            }
         />

         {/* Add Customer Modal */}
         <CustomerAddModal
            open={addDialog.value}
            onClose={addDialog.onFalse}
            onSuccess={() => fetchData()}
         />

         {/* Customer Address Modal */}
         <CustomerAddressModal
            customer={selectedAddressCustomer}
            open={addressDialog.value}
            onClose={() => {
               addressDialog.onFalse();
               setSelectedAddressCustomer(null);
            }}
            onSuccess={() => fetchData()}
         />

         {/* Delete Restricted Modal */}
         <DeleteRestrictedModal
            open={restrictedDialog.value}
            onClose={restrictedDialog.onFalse}
         />
      </>
   );
}
