import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CalculateCommissionUseCase } from '../../../application/use-cases';
import { CalculateCommissionRequestDto, CalculateCommissionResponseDto } from '../dto';

/**
 * CommissionController — REST endpoint for commission calculations.
 */
@ApiTags('Commission')
@Controller('api/v1/commission')
export class CommissionController {
  constructor(private readonly calculateCommissionUseCase: CalculateCommissionUseCase) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate commission for a transaction',
    description:
      'Calculates commission based on flat-fee, percentage, or tiered models. ' +
      'Supports multiple jurisdictions and commission schedules.',
  })
  @ApiResponse({ status: 200, type: CalculateCommissionResponseDto, description: 'Commission calculated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async calculateCommission(
    @Body() dto: CalculateCommissionRequestDto,
  ): Promise<CalculateCommissionResponseDto> {
    return this.calculateCommissionUseCase.execute({
      transactionAmount: dto.transactionAmount,
      currency: dto.currency,
      jurisdictionCode: {
        country: dto.jurisdictionCode.country,
        region: dto.jurisdictionCode.region,
        state: dto.jurisdictionCode.state,
      },
      commissionType: dto.commissionType,
      flatAmount: dto.flatAmount,
      ratePercent: dto.ratePercent,
      tiers: dto.tiers,
      transactionDate: dto.transactionDate,
    });
  }
}
