import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { IQueuePort, QueueJobOptions } from '../../application/ports/queue.port';

/**
 * BullMQ-backed adapter for the IQueuePort.
 * Enqueues jobs for asynchronous processing by workers.
 */
@Injectable()
export class BullMQQueueAdapter implements IQueuePort {
  private readonly logger = new Logger(BullMQQueueAdapter.name);

  constructor(@InjectQueue('tax-jobs') private readonly taxQueue: Queue) {}

  async enqueue<T>(jobName: string, data: T, options?: QueueJobOptions): Promise<string> {
    const job = await this.taxQueue.add(jobName, data, {
      delay: options?.delay,
      priority: options?.priority,
      attempts: options?.attempts ?? 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });

    this.logger.debug(`Enqueued job "${jobName}" with ID: ${job.id}`);
    return job.id ?? '';
  }
}
