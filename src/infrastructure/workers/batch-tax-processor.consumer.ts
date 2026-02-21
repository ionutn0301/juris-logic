import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CalculateTaxUseCase, CalculateTaxInput } from '../../application/use-cases';

/**
 * BullMQ worker that processes batched tax calculation jobs.
 * Each job contains a single tax calculation request from a batch.
 */
@Processor('tax-jobs')
export class BatchTaxProcessorConsumer {
  private readonly logger = new Logger(BatchTaxProcessorConsumer.name);

  constructor(private readonly calculateTaxUseCase: CalculateTaxUseCase) {}

  @Process('tax-calculation')
  async handleTaxCalculation(
    job: Job<{
      batchId: string;
      index: number;
      referenceId: string;
      taxInput: CalculateTaxInput;
      callbackUrl?: string;
    }>,
  ): Promise<void> {
    const { batchId, index, referenceId, taxInput } = job.data;

    this.logger.log(
      `Processing batch ${batchId}, item ${index} (ref: ${referenceId})`,
    );

    try {
      const result = await this.calculateTaxUseCase.execute(taxInput);
      this.logger.log(
        `Batch ${batchId}, item ${index} completed: tax=${result.taxAmount.amount} ${result.taxAmount.currency}`,
      );

      // In production: store result, update batch status, trigger webhook callback
    } catch (error) {
      this.logger.error(
        `Batch ${batchId}, item ${index} failed: ${error instanceof Error ? error.message : error}`,
      );
      throw error; // BullMQ will retry based on configured attempts
    }
  }
}
