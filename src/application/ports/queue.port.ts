/**
 * Port interface for asynchronous job queuing.
 * Abstracts BullMQ or any other queue provider.
 */
export interface IQueuePort {
  enqueue<T>(jobName: string, data: T, options?: QueueJobOptions): Promise<string>;
}

export interface QueueJobOptions {
  delay?: number;
  priority?: number;
  attempts?: number;
}

export const QUEUE_PORT = Symbol('IQueuePort');
