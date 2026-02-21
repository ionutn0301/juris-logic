import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProcessBatchTransactionUseCase } from '../../../application/use-cases';
import { ProcessBatchRequestDto, ProcessBatchResponseDto } from '../dto';

/**
 * BatchController — REST endpoint for batch tax calculation.
 * Enqueues items for async processing and returns immediately.
 */
@ApiTags('Batch Processing')
@Controller('api/v1/batch')
export class BatchController {
  constructor(
    private readonly processBatchUseCase: ProcessBatchTransactionUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Submit a batch of transactions for tax calculation',
    description:
      'Enqueues multiple tax calculation jobs for async processing. ' +
      'Returns immediately with a batch ID for tracking. ' +
      'Optionally provide a callbackUrl for webhook notification on completion.',
  })
  @ApiResponse({ status: 202, type: ProcessBatchResponseDto, description: 'Batch accepted and queued' })
  @ApiResponse({ status: 400, description: 'Invalid batch data' })
  async processBatch(@Body() dto: ProcessBatchRequestDto): Promise<ProcessBatchResponseDto> {
    return this.processBatchUseCase.execute({
      items: dto.items.map((item) => ({
        referenceId: item.referenceId,
        taxInput: {
          subtotal: item.taxInput.subtotal,
          currency: item.taxInput.currency,
          jurisdictionCode: {
            country: item.taxInput.jurisdictionCode.country,
            region: item.taxInput.jurisdictionCode.region,
            state: item.taxInput.jurisdictionCode.state,
            county: item.taxInput.jurisdictionCode.county,
            city: item.taxInput.jurisdictionCode.city,
          },
          isExempt: item.taxInput.isExempt,
          exemptionCertificateId: item.taxInput.exemptionCertificateId,
          productCategory: item.taxInput.productCategory,
          transactionDate: item.taxInput.transactionDate,
        },
      })),
      callbackUrl: dto.callbackUrl,
    });
  }
}
