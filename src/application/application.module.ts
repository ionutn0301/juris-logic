import { Module } from '@nestjs/common';
import {
  CalculateTaxUseCase,
  CalculateCommissionUseCase,
  ProcessBatchTransactionUseCase,
} from './use-cases';

/**
 * ApplicationModule — registers all use case services.
 * Use cases are injectable NestJS providers that orchestrate domain + ports.
 */
@Module({
  providers: [
    CalculateTaxUseCase,
    CalculateCommissionUseCase,
    ProcessBatchTransactionUseCase,
  ],
  exports: [
    CalculateTaxUseCase,
    CalculateCommissionUseCase,
    ProcessBatchTransactionUseCase,
  ],
})
export class ApplicationModule {}
