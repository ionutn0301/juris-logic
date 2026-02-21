import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { InterfacesModule } from './interfaces/rest/interfaces.module';
import { BatchTaxProcessorConsumer } from './infrastructure/workers/batch-tax-processor.consumer';
import { ApplicationModule } from './application/application.module';

/**
 * AppModule — the root NestJS module.
 *
 * Composes all layers:
 *  - InfrastructureModule: DB, cache, queue adapters (global)
 *  - ApplicationModule: use cases
 *  - InterfacesModule: REST controllers
 *  - BullModule: async job processing
 *  - LoggerModule: structured Pino logging
 */
@Module({
  imports: [
    // Structured logging
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        level: process.env.LOG_LEVEL ?? 'info',
      },
    }),

    // Application layers
    InfrastructureModule,
    ApplicationModule,
    InterfacesModule,
  ],
  providers: [BatchTaxProcessorConsumer],
})
export class AppModule {}
