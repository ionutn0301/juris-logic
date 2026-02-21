import { Inject, Injectable, Logger } from '@nestjs/common';
import { IQueuePort, QUEUE_PORT } from '../ports/queue.port';
import { CalculateTaxInput } from './calculate-tax.use-case';

/**
 * A single item in a batch request.
 */
export interface BatchTransactionItem {
  referenceId: string; // client-supplied ID for correlation
  taxInput: CalculateTaxInput;
}

/**
 * Input DTO for the ProcessBatchTransaction use case.
 */
export interface ProcessBatchInput {
  items: BatchTransactionItem[];
  callbackUrl?: string; // optional webhook for completion notification
}

/**
 * Output DTO — batch is enqueued, results delivered asynchronously.
 */
export interface ProcessBatchOutput {
  batchId: string;
  itemCount: number;
  status: 'QUEUED';
  message: string;
}

/**
 * ProcessBatchTransactionUseCase — enqueues a batch of tax calculations
 * for asynchronous processing via the job queue.
 *
 * High-volume transactions are handled off the request cycle:
 * the client receives an immediate acknowledgment and can poll
 * or be notified via webhook when processing completes.
 */
@Injectable()
export class ProcessBatchTransactionUseCase {
  private readonly logger = new Logger(ProcessBatchTransactionUseCase.name);

  constructor(@Inject(QUEUE_PORT) private readonly queue: IQueuePort) {}

  public async execute(input: ProcessBatchInput): Promise<ProcessBatchOutput> {
    if (!input.items || input.items.length === 0) {
      throw new Error('Batch must contain at least one transaction item.');
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    this.logger.log(`Enqueuing batch ${batchId} with ${input.items.length} items`);

    // Enqueue each item as an individual job for parallel processing
    const enqueuePromises = input.items.map((item, index) =>
      this.queue.enqueue('tax-calculation', {
        batchId,
        index,
        referenceId: item.referenceId,
        taxInput: item.taxInput,
        callbackUrl: input.callbackUrl,
      }),
    );

    await Promise.all(enqueuePromises);

    return {
      batchId,
      itemCount: input.items.length,
      status: 'QUEUED',
      message: `Batch ${batchId} with ${input.items.length} items has been queued for processing.`,
    };
  }
}
