import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CalculateTaxUseCase } from '../../../application/use-cases';
import { CalculateTaxRequestDto, CalculateTaxResponseDto } from '../dto';

/**
 * TaxController — REST endpoint for single tax calculations.
 */
@ApiTags('Tax')
@Controller('api/v1/tax')
export class TaxController {
  constructor(private readonly calculateTaxUseCase: CalculateTaxUseCase) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate tax for a transaction',
    description:
      'Calculates tax based on the transaction amount, jurisdiction, and applicable rules. ' +
      'Supports multi-level jurisdictions (federal → state → county → city) and exemptions.',
  })
  @ApiResponse({ status: 200, type: CalculateTaxResponseDto, description: 'Tax calculated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async calculateTax(@Body() dto: CalculateTaxRequestDto): Promise<CalculateTaxResponseDto> {
    return this.calculateTaxUseCase.execute({
      subtotal: dto.subtotal,
      currency: dto.currency,
      jurisdictionCode: {
        country: dto.jurisdictionCode.country,
        region: dto.jurisdictionCode.region,
        state: dto.jurisdictionCode.state,
        county: dto.jurisdictionCode.county,
        city: dto.jurisdictionCode.city,
      },
      isExempt: dto.isExempt,
      exemptionCertificateId: dto.exemptionCertificateId,
      productCategory: dto.productCategory,
      transactionDate: dto.transactionDate,
    });
  }
}
