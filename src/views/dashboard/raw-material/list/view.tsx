'use client';

import type { RawMaterial } from 'src/types/raw-material';
import type { TableHeadCellProps } from 'src/components/table';

import { useState, useEffect, useCallback } from 'react';
import { useBoolean, useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/al/paths';
import useRawMaterialStore from 'src/stores/raw-material';
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

import { RawMaterialTableRow } from '../components/raw-material-table-row';
import { RawMaterialCUForm } from '../forms/raw-material-cu-form';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
   { id: 'image', label: 'Foto', width: 80 },
   { id: 'title', label: 'Nama Bahan Baku' },
   { id: 'unit', label: 'Satuan', width: 100 },
   { id: 'current_stock', label: 'Stok', align: 'center', width: 120 },
   { id: '', width: 88 },
];

// ----------------------------------------------------------------------

export default function RawMaterialListView() {
   const table = useTable({ defaultOrderBy: 'created_at', defaultOrder: 'desc' });
   const confirmDialog = useBoolean();
   const addDialog = useBoolean();
   const [editItem, setEditItem] = useState<RawMaterial | null>(null);

   const { all, delete: destroy } = useRawMaterialStore();
   const [tableData, setTableData] = useState<RawMaterial[]>([]);
   const [loading, setLoading] = useState(true);
   const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

   const filters = useSetState({ search: '' });
   const { state: currentFilters } = filters;

   const fetchData = useCallback(async () => {
      setLoading(true);
      const res = await all({
         page: table.page + 1,
         limit: table.rowsPerPage,
         sort: table.orderBy,
         order: table.order,
         search: currentFilters.search,
      });
      if (res?.data) {
         setTableData(res.data.raw_materials ?? []);
         if (res.data.pagination) setPagination(res.data.pagination);
      } else {
         toast.error('Gagal memuat data');
      }
      setLoading(false);
   }, [table.page, table.rowsPerPage, table.order, table.orderBy, currentFilters.search]); // eslint-disable-line

   useEffect(() => {
      fetchData();
   }, [table.page, table.rowsPerPage, table.order, table.orderBy, currentFilters.search]);

   const handleDeleteRow = useCallback(
      async (id: string) => {
         try {
            await destroy({ id });
            toast.success('Berhasil menghapus bahan baku');
            fetchData();
         } catch {
            toast.error('Gagal menghapus bahan baku');
         }
      },
      [destroy, fetchData]
   );

   const handleDeleteRows = useCallback(async () => {
      for (const id of table.selected) {
         try {
            await destroy({ id });
         } catch {
            toast.error(`Gagal menghapus: ${id}`);
         }
      }
      toast.success(`${table.selected.length} item dihapus`);
      confirmDialog.onFalse();
      fetchData();
   }, [table.selected, destroy, fetchData, confirmDialog]);

   const notFound = !tableData.length && !loading;

   return (
      <>
         <DashboardContent>
            <CustomBreadcrumbs
               heading="Bahan Baku"
               links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Bahan Baku' }]}
               action={
                  <Button
                     variant="contained"
                     startIcon={<Iconify icon="mingcute:add-line" />}
                     onClick={() => {
                        setEditItem(null);
                        addDialog.onTrue();
                     }}
                  >
                     Tambah Bahan Baku
                  </Button>
               }
               sx={{ mb: { xs: 3, md: 5 } }}
            />

            <Card>
               {/* Toolbar / Search */}
               <Box
                  sx={{
                     p: 2.5,
                     display: 'flex',
                     gap: 2,
                     flexDirection: { xs: 'column', md: 'row' },
                     alignItems: 'center',
                  }}
               >
                  <TextField
                     fullWidth
                     defaultValue={currentFilters.search}
                     onBlur={(e) => {
                        table.onResetPage();
                        filters.setState({ search: e.target.value });
                     }}
                     placeholder="Cari nama bahan baku..."
                     slotProps={{
                        input: {
                           startAdornment: (
                              <InputAdornment position="start">
                                 <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                              </InputAdornment>
                           ),
                        },
                     }}
                  />
               </Box>

               {loading ? (
                  <LoadingScreen />
               ) : (
                  <Box sx={{ position: 'relative' }}>
                     <TableSelectedAction
                        dense={table.dense}
                        numSelected={table.selected.length}
                        rowCount={tableData.length}
                        onSelectAllRows={(checked) =>
                           table.onSelectAllRows(
                              checked,
                              tableData.map((r) => r.id!)
                           )
                        }
                        action={
                           <Tooltip title="Hapus">
                              <IconButton color="primary" onClick={confirmDialog.onTrue}>
                                 <Iconify icon="solar:trash-bin-trash-bold" />
                              </IconButton>
                           </Tooltip>
                        }
                     />

                     <Scrollbar>
                        <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 680 }}>
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
                                    tableData.map((r) => r.id!)
                                 )
                              }
                           />

                           <TableBody>
                              {tableData.map((row) => (
                                 <RawMaterialTableRow
                                    key={row.id}
                                    row={row}
                                    selected={table.selected.includes(row.id!)}
                                    onSelectRow={() => table.onSelectRow(row.id!)}
                                    onDeleteRow={() => handleDeleteRow(row.id!)}
                                    onEditRow={() => {
                                       setEditItem(row);
                                       addDialog.onTrue();
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
                  onPageChange={(e, p) => {
                     table.onChangePage(e, p);
                  }}
                  onRowsPerPageChange={(e) => {
                     table.onChangeRowsPerPage(e as any);
                     table.onResetPage();
                  }}
                  onChangeDense={table.onChangeDense}
                  labelDisplayedRows={({ from, to }) =>
                     `${pagination.page} / ${pagination.totalPages} (${from}-${to} dari ${pagination.total})`
                  }
               />
            </Card>
         </DashboardContent>

         {/* Bulk delete confirm */}
         <ConfirmDialog
            open={confirmDialog.value}
            onClose={confirmDialog.onFalse}
            title="Hapus"
            content={
               <>
                  Yakin hapus <strong>{table.selected.length}</strong> item?
               </>
            }
            action={
               <Button variant="contained" color="error" onClick={handleDeleteRows}>
                  Hapus
               </Button>
            }
         />

         {/* Add / Edit form */}
         <RawMaterialCUForm
            open={addDialog.value}
            currentItem={editItem}
            onSuccess={() => {
               fetchData();
               addDialog.onFalse();
               setEditItem(null);
            }}
            onClose={() => {
               addDialog.onFalse();
               setEditItem(null);
            }}
         />
      </>
   );
}
