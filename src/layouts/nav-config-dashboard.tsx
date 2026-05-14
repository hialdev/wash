import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/al/paths';

import { CONFIG } from 'src/global-config';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
   <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />
);

const ICONS = {
   job: icon('ic-job'),
   blog: icon('ic-blog'),
   chat: icon('ic-chat'),
   mail: icon('ic-mail'),
   user: icon('ic-user'),
   file: icon('ic-file'),
   lock: icon('ic-lock'),
   tour: icon('ic-tour'),
   order: icon('ic-order'),
   label: icon('ic-label'),
   blank: icon('ic-blank'),
   kanban: icon('ic-kanban'),
   folder: icon('ic-folder'),
   course: icon('ic-course'),
   params: icon('ic-params'),
   banking: icon('ic-banking'),
   booking: icon('ic-booking'),
   invoice: icon('ic-invoice'),
   product: icon('ic-product'),
   calendar: icon('ic-calendar'),
   disabled: icon('ic-disabled'),
   external: icon('ic-external'),
   subpaths: icon('ic-subpaths'),
   menuItem: icon('ic-menu-item'),
   ecommerce: icon('ic-ecommerce'),
   analytics: icon('ic-analytics'),
   dashboard: icon('ic-dashboard'),
   service: icon('ic-label'),
   voucher: icon('ic-label'),
};

// ----------------------------------------------------------------------

/**
 * Input nav data is an array of navigation section items used to define the structure and content of a navigation bar.
 * Each section contains a subheader and an array of items, which can include nested children items.
 *
 * Each item can have the following properties:
 * - `title`: The title of the navigation item.
 * - `path`: The URL path the item links to.
 * - `icon`: An optional icon component to display alongside the title.
 * - `info`: Optional additional information to display, such as a label.
 * - `allowedRoles`: An optional array of roles that are allowed to see the item.
 * - `caption`: An optional caption to display below the title.
 * - `children`: An optional array of nested navigation items.
 * - `disabled`: An optional boolean to disable the item.
 * - `deepMatch`: An optional boolean to indicate if the item should match subpaths.
 */
export const navData: NavSectionProps['data'] = [
   /**
    * Overview
    */
   {
      subheader: 'Overview',
      items: [
         { title: 'Dashboard', path: paths.dashboard.root, icon: ICONS.dashboard },
         { title: 'Katalog', path: paths.dashboard.customer_orders.catalog, icon: ICONS.ecommerce, allowedRoles: ['customer'] },
         { title: 'Pesanan Saya', path: paths.dashboard.customer_orders.my_orders, icon: ICONS.order, allowedRoles: ['customer'] },
         { 
            title: 'Analytics', 
            path: paths.dashboard.general.analytics, 
            icon: ICONS.analytics, 
            allowedRoles: ['manager', 'owner'],
            children: [
               { title: 'Sales', path: paths.dashboard.analytics.sales },
               { title: 'Stock', path: paths.dashboard.analytics.stock },
               { title: 'Purchase', path: paths.dashboard.analytics.purchase },
            ]
         },
      ],
   },
   /**
    * Transaction (For Kasir & Managers)
    */
   {
      subheader: 'Transaksi',
      items: [
         {
            title: 'Pesanan Layanan',
            path: paths.dashboard.orders.root,
            icon: ICONS.order,
            allowedRoles: ['kasir', 'staff', 'karyawan', 'manager', 'owner'],
            children: [
               { title: 'Daftar Pesanan', path: paths.dashboard.orders.root },
               { title: 'Buat Pesanan', path: paths.dashboard.customer_orders.catalog },
            ],
         },
      ],
   },
   /**
    * Management (For Manager & Owner)
    */
   {
      subheader: 'Management',
      items: [
         {
            title: 'Karyawan',
            path: paths.dashboard.users.root,
            icon: ICONS.user,
            allowedRoles: ['manager', 'owner'],
            children: [
               { title: 'Daftar Karyawan', path: paths.dashboard.users.list },
               { title: 'Tambah Karyawan', path: paths.dashboard.users.new },
            ],
         },
         {
            title: 'Layanan',
            path: paths.dashboard.service.root,
            icon: ICONS.service,
            allowedRoles: ['manager', 'owner'],
            children: [
               { title: 'Daftar Layanan', path: paths.dashboard.service.root },
               { title: 'Tambah Layanan', path: paths.dashboard.service.new },
               { title: 'Variant & COGS', path: paths.dashboard.service.root },
            ],
         },
         {
            title: 'Finance',
            path: paths.dashboard.finance.root,
            icon: ICONS.invoice,
            allowedRoles: ['manager', 'owner'],
            children: [
               { title: 'Laporan Keuangan', path: paths.dashboard.finance.reports },
               { title: 'Jurnal Umum', path: paths.dashboard.finance.journal.root },
            ],
         },
         {
            title: 'Marketing',
            path: paths.dashboard.vouchers.root,
            icon: ICONS.voucher,
            allowedRoles: ['manager', 'owner'],
            children: [
               { title: 'Vouchers', path: paths.dashboard.vouchers.root },
            ],
         },
      ],
   },
   /**
    * Inventory (For Manager & Owner)
    */
   {
      subheader: 'Inventory',
      items: [
         {
            title: 'Bahan Baku',
            path: paths.dashboard.rawMaterials.root,
            icon: ICONS.folder,
            allowedRoles: ['manager', 'owner'],
            children: [
               { title: 'Stok Bahan Baku', path: paths.dashboard.rawMaterials.root },
               { title: 'Pembelian (Purchase)', path: paths.dashboard.rawMaterialPurchases.root },
               { title: 'Pergerakan Stok', path: paths.dashboard.rawMaterialMovements.root },
            ],
         },
      ],
   },
   /**
    * Core Settings (For Superadmin & Owner)
    */
   {
      subheader: 'Core Settings',
      items: [
         {
            title: 'User Management',
            path: paths.dashboard.users.root,
            icon: ICONS.user,
            allowedRoles: ['superadmin'],
            children: [
               { title: 'All User List', path: paths.dashboard.users.list },
               { title: 'Access Control', path: paths.dashboard.users.access },
            ],
         },
         {
            title: 'Konfigurasi',
            path: paths.dashboard.settings,
            icon: ICONS.params,
            allowedRoles: ['superadmin'],
            children: [
               { title: 'App Settings', path: paths.dashboard.settings },
               { title: 'Whatsapp Integration', path: paths.dashboard.whatsapp },
               { title: 'Hak Akses (Role)', path: paths.dashboard.permission },
            ],
         },
      ],
   },
];
