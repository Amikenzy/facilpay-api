# Data Exports

`POST /v1/exports` creates an asynchronous export job. Set `resource` to `payments`, `customers`, `invoices`, or `refunds`; `format` defaults to `csv`. Optional `from` and `to` values filter `createdAt` (inclusive start, exclusive end). `status` and `currency` filters are applied where the selected resource supports them. Exports always use the authenticated merchant's records.

CSV columns are emitted in this order:

- `payments`: `id`, `merchantId`, `amount`, `currency`, `status`, `createdAt`
- `customers`: `id`, `merchantId`, `email`, `name`, `phone`, `createdAt`, `updatedAt`
- `invoices`: `id`, `merchantId`, `number`, `customerEmail`, `customerName`, `currency`, `subtotal`, `taxRate`, `taxAmount`, `total`, `dueDate`, `status`, `paymentId`, `createdAt`, `updatedAt`
- `refunds`: `id`, `paymentId`, `amount`, `reason`, `reasonCode`, `initiatedBy`, `createdAt`

CSV values are quoted and escaped as needed, and values beginning with spreadsheet formula characters are prefixed to prevent formula injection.