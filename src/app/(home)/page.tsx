import type { Metadata } from 'next';

import { redirect } from 'next/navigation';
import { CONFIG } from 'src/global-config';

import { paths } from 'src/routes/al/paths';


// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: `Home - ${CONFIG.appName}`,
  description:
    `This is an Admin Dashsboard for ${CONFIG.appName}, manage all contents of official sites and web apps`,
};

export default function Page() {
  return redirect(paths.dashboard.root);
}
    