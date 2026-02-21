import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService — wraps the Prisma Client and manages its lifecycle
 * within the NestJS application container.
 *
 * Connection is attempted eagerly on init but failures are non-fatal:
 * the app boots successfully and individual queries will surface DB errors
 * at call-time. This allows the service to start without a live DB
 * (e.g., during local dev before `docker compose up`).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    try {
      await (this as unknown as PrismaClient).$connect();
      this.logger.log('Database connection established.');
    } catch (error) {
      this.logger.warn(
        `Database not available at startup — will retry on first query. ` +
          `Run \`docker compose up -d\` then \`npm run prisma:migrate\` to provision the DB. ` +
          `Error: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await (this as unknown as PrismaClient).$disconnect();
  }
}
