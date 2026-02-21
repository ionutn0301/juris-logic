import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaService } from './database/prisma.service';
import { RedisCacheAdapter } from './adapters/redis-cache.adapter';
import { PrismaAuditLogAdapter } from './adapters/prisma-audit-log.adapter';
import { BullMQQueueAdapter } from './adapters/bullmq-queue.adapter';
import { CACHE_PORT } from '../application/ports/cache.port';
import { AUDIT_LOG_PORT } from '../application/ports/audit-log.port';
import { QUEUE_PORT } from '../application/ports/queue.port';

/**
 * InfrastructureModule — wires concrete adapters to abstract port tokens.
 *
 * This is the Composition Root for the Dependency Inversion Principle:
 * the application layer depends on port interfaces (abstractions),
 * and this module provides the concrete implementations.
 *
 * BullModule setup lives here alongside the BullMQQueueAdapter so that
 * the BullQueue_tax-jobs token is available in this module's DI context.
 *
 * @Global so all modules can inject ports without re-importing.
 */
@Global()
@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),
    BullModule.registerQueue({ name: 'tax-jobs' }),
  ],
  providers: [
    PrismaService,
    {
      provide: CACHE_PORT,
      useClass: RedisCacheAdapter,
    },
    {
      provide: AUDIT_LOG_PORT,
      useClass: PrismaAuditLogAdapter,
    },
    {
      provide: QUEUE_PORT,
      useClass: BullMQQueueAdapter,
    },
  ],
  exports: [
    BullModule, // export so BatchTaxProcessorConsumer in AppModule can use the queue
    PrismaService,
    CACHE_PORT,
    AUDIT_LOG_PORT,
    QUEUE_PORT,
  ],
})
export class InfrastructureModule {}
