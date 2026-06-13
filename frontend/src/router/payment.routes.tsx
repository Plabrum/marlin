import { createRoute } from '@tanstack/react-router';
import { PayInvoicePage } from '@/pages/pay/pay-invoice-page';
import { publicLayoutRoute } from '@/router/layout.routes';

export const payInvoiceRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/pay/$accessToken',
  component: PayInvoicePage,
});
