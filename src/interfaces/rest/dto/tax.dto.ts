import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  ValidateNested,
  Min,
  Length,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for the jurisdiction code input.
 */
export class JurisdictionCodeDto {
  @ApiProperty({ example: 'US', description: 'ISO country code' })
  @IsString()
  @Length(2, 3)
  country!: string;

  @ApiProperty({ example: 'US', description: 'Region: US, EU, UK, CA' })
  @IsString()
  region!: string;

  @ApiPropertyOptional({ example: 'CA', description: 'State/Province code' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'LOS_ANGELES', description: 'County name' })
  @IsOptional()
  @IsString()
  county?: string;

  @ApiPropertyOptional({ example: 'LA', description: 'City name' })
  @IsOptional()
  @IsString()
  city?: string;
}

/**
 * Request DTO for POST /api/v1/tax/calculate
 */
export class CalculateTaxRequestDto {
  @ApiProperty({ example: 1000.0, description: 'Transaction subtotal' })
  @IsNumber()
  @Min(0)
  subtotal!: number;

  @ApiProperty({ example: 'USD', description: '3-letter ISO currency code' })
  @IsString()
  @Length(3, 3)
  currency!: string;

  @ApiProperty({ type: JurisdictionCodeDto })
  @ValidateNested()
  @Type(() => JurisdictionCodeDto)
  jurisdictionCode!: JurisdictionCodeDto;

  @ApiPropertyOptional({ example: false, description: 'Is the transaction tax-exempt?' })
  @IsOptional()
  @IsBoolean()
  isExempt?: boolean;

  @ApiPropertyOptional({ example: 'CERT-12345', description: 'Exemption certificate ID' })
  @IsOptional()
  @IsString()
  exemptionCertificateId?: string;

  @ApiPropertyOptional({ example: 'electronics', description: 'Product category for rate selection' })
  @IsOptional()
  @IsString()
  productCategory?: string;

  @ApiPropertyOptional({ example: '2026-02-21T00:00:00Z', description: 'Transaction date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  transactionDate?: string;
}

/**
 * Response DTO for tax calculation results.
 */
export class MoneyResponseDto {
  @ApiProperty({ example: '72.50' })
  amount!: string;

  @ApiProperty({ example: 'USD' })
  currency!: string;
}

export class TaxBreakdownItemDto {
  @ApiProperty({ example: 'California State Sales Tax' })
  ruleName!: string;

  @ApiProperty({ example: '7.25' })
  ratePercent!: string;

  @ApiProperty({ type: MoneyResponseDto })
  amount!: MoneyResponseDto;
}

export class CalculateTaxResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-...' })
  transactionId!: string;

  @ApiProperty({ type: MoneyResponseDto })
  subtotal!: MoneyResponseDto;

  @ApiProperty({ type: MoneyResponseDto })
  taxAmount!: MoneyResponseDto;

  @ApiProperty({ type: MoneyResponseDto })
  total!: MoneyResponseDto;

  @ApiProperty({ example: '9.50%' })
  effectiveRate!: string;

  @ApiProperty({ example: 'US:CA:LOS_ANGELES' })
  jurisdiction!: string;

  @ApiProperty({ type: [TaxBreakdownItemDto] })
  breakdown!: TaxBreakdownItemDto[];

  @ApiProperty({ example: '2026-02-21T12:00:00.000Z' })
  calculatedAt!: string;
}
