import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ExportsController } from './exports.controller';
import { DatabaseExportsSource, ExportsService } from './exports.service';

/**
 * Registers the asynchronous export pipeline:
 * - `POST /v1/exports` enqueues a job on the BullMQ `exports` queue.
 * - The service streams merchant-scoped rows in batches and writes the file
 *   through its configured storage adapter.
 * - `GET /v1/exports/:id` reports status and `GET /v1/exports/:id/download`
 *   serves the file via a signed, expiring, owner-only URL.
 *
 * The existing synchronous `GET /v1/payments/export` endpoint is untouched
 * and remains available for small ranges.
 */
@Module({
  controllers: [ExportsController],
  providers: [
    {
      provide: ExportsService,
      inject: [DataSource],
      useFactory: (dataSource: DataSource) =>
        new ExportsService({ source: new DatabaseExportsSource(dataSource) }),
    },
  ],
  exports: [ExportsService],
})
export class ExportsModule {}
