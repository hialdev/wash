'use client';

import type { RawMaterialMovement } from 'src/types/raw-material';
import type { TableHeadCellProps } from 'src/components/table';

import type { Dayjs } from 'dayjs';

import { useState, useEffect, useCallback } from 'react';
import { useSetState } from 'minimal-shared/hooks';
import dayjs from 'dayjs';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/al/paths';
import { useRouter } from 'src/routes/hooks';
import { protectedApi } from 'src/lib/al/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
   useTable,
   TableNoData,
   TableHeadCustom,
   TablePaginationCustom,
} from 'src/components/table';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
   { id: 'created_at', label: 'Tanggal', width: 150 },
   { id: 'raw_material', label: 'Bahan Baku' },
   { id: 'issuer_type', label: 'Jenis', align: 'center', width: 120 },
   { id: 'qty', label: 'Qty', align: 'center', width: 130 },
   { id: 'notes', label: 'Catatan' },
   { id: 'created_by', label: 'Dicatat oleh', width: 160 },
];

// ----------------------------------------------------------------------

const issuerLabel = (
   type?: string
): { label: string; color: 'success' | 'error' | 'warning' | 'default' } => {
   switch (type) {
      case 'purchase':
         return { label: 'Pembelian', color: 'success' };
      case 'order':
         return { label: 'Order', color: 'error' };
      case 'adjustment':
         return { label: 'Adjustment', color: 'warning' };
      default:
         return { label: type ?? '-', color: 'default' };
   }
};

// ----------------------------------------------------------------------

export default function RawMaterialMovementListView() {
   const router = useRouter();
   const table = useTable({ defaultOrderBy: 'created_at', defaultOrder: 'desc' });

   const [data, setData] = useState<RawMaterialMovement[]>([]);
   const [loading, setLoading] = useState(true);
   const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

   const filters = useSetState({ search: '', dateFrom: '', dateTo: '' });
   const { state: f } = filters;

   const [dateFrom, setDateFrom] = useState<Dayjs | null>(null);
   const [dateTo, setDateTo] = useState<Dayjs | null>(null);

   const fetchData = useCallback(async () => {
      setLoading(true);
      try {
         const res = await protectedApi.get('/raw-material-movements', {
            params: {
               page: table.page + 1,
               limit: table.rowsPerPage,
               order: 'desc',
               search: f.search || undefined,
               date_from: f.dateFrom || undefined,
               date_to: f.dateTo || undefined,
            },
         });
         const d = res.data?.data;
         setData(d?.raw_material_movements ?? []);
         if (d?.pagination) setPagination(d.pagination);
      } catch {
         toast.error('Gagal memuat data');
      }
      setLoading(false);
   }, [table.page, table.rowsPerPage, f.search, f.dateFrom, f.dateTo]); // eslint-disable-line

   useEffect(() => {
      fetchData();
   }, [table.page, table.rowsPerPage, f.search, f.dateFrom, f.dateTo]);

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Pergerakan Bahan Baku"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Raw Material', href: paths.dashboard.rawMaterials.root },
               { name: 'Movements' },
            ]}
            action={
               <Button
                  variant="contained"
                  color="warning"
                  startIcon={<Iconify icon="solar:settings-bold" />}
                  onClick={() => router.push(paths.dashboard.rawMaterialMovements.create)}
               >
                  Catat Adjustment
               </Button>
            }
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <Card>
            {/* Filters */}
            <Stack
               direction={{ xs: 'column', md: 'row' }}
               spacing={2}
               sx={{ p: 2.5, alignItems: { md: 'center' } }}
            >
               <TextField
                  placeholder="Cari bahan baku atau catatan..."
                  defaultValue={f.search}
                  onBlur={(e) => {
                     table.onResetPage();
                     filters.setState({ search: e.target.value });
                  }}
                  size="small"
                  sx={{ flex: 1 }}
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
               <DatePicker
                  label="Dari tanggal"
                  value={dateFrom}
                  onChange={(val) => {
                     setDateFrom(val);
                     table.onResetPage();
                     filters.setState({ dateFrom: val ? dayjs(val).format('YYYY-MM-DD') : '' });
                  }}
                  slotProps={{
                     textField: { size: 'small', sx: { width: { xs: '100%', md: 180 } } },
                  }}
               />
               <DatePicker
                  label="Sampai tanggal"
                  value={dateTo}
                  onChange={(val) => {
                     setDateTo(val);
                     table.onResetPage();
                     filters.setState({ dateTo: val ? dayjs(val).format('YYYY-MM-DD') : '' });
                  }}
                  slotProps={{
                     textField: { size: 'small', sx: { width: { xs: '100%', md: 180 } } },
                  }}
               />
               {(f.search || f.dateFrom || f.dateTo) && (
                  <Button
                     variant="text"
                     size="small"
                     color="error"
                     onClick={() => {
                        table.onResetPage();
                        setDateFrom(null);
                        setDateTo(null);
                        filters.setState({ search: '', dateFrom: '', dateTo: '' });
                     }}
                  >
                     Reset
                  </Button>
               )}
            </Stack>

            {loading ? (
               <LoadingScreen />
            ) : (
               <Scrollbar>
                  <Table size="medium" sx={{ minWidth: 900 }}>
                     <TableHeadCustom
                        order={table.order}
                        orderBy={table.orderBy}
                        headCells={TABLE_HEAD}
                        rowCount={data.length}
                        numSelected={0}
                        onSort={table.onSort}
                     />
                     <TableBody>
                        {data.map((row) => {
                           const { label, color } = issuerLabel(row.issuer_type);
                           return (
                              <TableRow key={row.id} hover>
                                 <TableCell>
                                    <Typography variant="caption">
                                       {row.created_at
                                          ? dayjs(row.created_at).format('DD MMM YYYY HH:mm')
                                          : '-'}
                                    </Typography>
                                 </TableCell>

                                 <TableCell>
                                    <Typography variant="body2" fontWeight={600}>
                                       {row.raw_material?.title ?? '—'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                       {row.raw_material?.unit}
                                    </Typography>
                                 </TableCell>

                                 <TableCell align="center">
                                    <Chip
                                       label={label}
                                       color={color}
                                       size="small"
                                       variant="outlined"
                                    />
                                 </TableCell>

                                 <TableCell align="center">
                                    <Chip
                                       label={`${row.is_increment ? '+' : '-'}${row.qty} ${row.raw_material?.unit ?? ''}`}
                                       color={row.is_increment ? 'success' : 'error'}
                                       size="small"
                                       icon={
                                          <Iconify
                                             icon={
                                                row.is_increment
                                                   ? 'solar:arrow-up-bold'
                                                   : 'solar:arrow-down-bold'
                                             }
                                             width={14}
                                          />
                                       }
                                    />
                                 </TableCell>

                                 <TableCell>
                                    <Typography variant="caption" color="text.secondary">
                                       {row.notes || '-'}
                                    </Typography>
                                 </TableCell>

                                 <TableCell>
                                    <Typography variant="caption" color="text.secondary">
                                       {(row as any).creator
                                          ? `${(row as any).creator.name ?? (row as any).creator.email}`
                                          : row.created_by
                                            ? String(row.created_by).slice(0, 8) + '…'
                                            : '-'}
                                    </Typography>
                                 </TableCell>
                              </TableRow>
                           );
                        })}
                        {!data.length && <TableNoData notFound />}
                     </TableBody>
                  </Table>
               </Scrollbar>
            )}

            <TablePaginationCustom
               page={pagination.page - 1}
               count={pagination.total}
               rowsPerPage={pagination.limit}
               dense={table.dense}
               onPageChange={(e, p) => table.onChangePage(e, p)}
               onRowsPerPageChange={(e) => table.onChangeRowsPerPage(e as any)}
               onChangeDense={table.onChangeDense}
               labelDisplayedRows={({ from, to }) =>
                  `${pagination.page} / ${pagination.totalPages} (${from}-${to} dari ${pagination.total})`
               }
            />
         </Card>
      </DashboardContent>
   );
}
