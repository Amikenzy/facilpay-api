import { DataSource } from 'typeorm';
import {
  DatabaseExportsSource,
  EXPORT_COLUMNS,
  ExportType,
  sanitizeCsvCell,
} from './exports.service';

describe('exports source', () => {
  it.each<ExportType>(['payments', 'customers', 'invoices', 'refunds'])(
    'streams merchant-scoped %s rows with its documented columns',
    async (resource) => {
      const query = jest.fn().mockResolvedValue([{ id: 'row-id' }]);
      const source = new DatabaseExportsSource({ query } as unknown as DataSource);
      const batches: Record<string, unknown>[][] = [];

      for await (const batch of source.streamRows(
        resource,
        { merchantId: 'merchant-id', currency: 'USD' },
        100,
      )) {
        batches.push(batch);
      }

      expect(batches).toEqual([[{ id: 'row-id' }]]);
      const sql = query.mock.calls[0][0];
      const merchantPredicate = {
        payments: 'p."merchantId" = $1',
        customers: 'c."merchantId" = $1',
        invoices: 'i."merchantId" = $1',
        refunds: 'p."merchantId" = $1',
      }[resource];
      expect(sql).toContain(`WHERE ${merchantPredicate}`);
      expect(query.mock.calls[0][1][0]).toBe('merchant-id');
      expect(sql).toContain('LIMIT');
      for (const column of EXPORT_COLUMNS[resource]) {
        expect(sql).toContain(`"${column}"`);
      }
    },
  );

  it('applies invoice currency filters to the invoices table', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const source = new DatabaseExportsSource({ query } as unknown as DataSource);

    for await (const _batch of source.streamRows(
      'invoices',
      { merchantId: 'merchant-id', currency: 'USD' },
      100,
    )) {
      // No rows expected for this query.
    }

    expect(query.mock.calls[0][0]).toContain('i."currency" = $2');
    expect(query.mock.calls[0][1]).toEqual(['merchant-id', 'USD', 100, 0]);
  });

  it('protects formula-leading values and escapes CSV delimiters', () => {
    expect(sanitizeCsvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(sanitizeCsvCell('name,"value"')).toBe('"name,""value"""');
    expect(sanitizeCsvCell(null)).toBe('');
  });
});