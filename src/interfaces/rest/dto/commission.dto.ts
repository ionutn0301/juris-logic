import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  Length,
  ArrayMinSize,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JurisdictionCodeDto, MoneyResponseDto } from './tax.dto';

export class CommissionTierDto {
  @ApiProperty({ example: 0, description: 'Tier floor amount' })
  @IsNumber()
  @Min(0)
  minAmount!: number;

  @ApiPropertyOptional({ example: 10000, description: 'Tier ceiling (null for unlimited)' })
  @IsOptional()
  @IsNumber()
  maxAmount!: number | null;

  @ApiProperty({ example: 5, description: 'Commission rate for this tier (%)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  ratePercent!: number;
}

/**
 * Request DTO for POST /api/v1/commission/calculate
 */
export class CalculateCommissionRequestDto {
  @ApiProperty({ example: 50000, description: 'Transaction amount' })
  @IsNumber()
  @Min(0)
  transactionAmount!: number;

  @ApiProperty({ example: 'USD', description: '3-letter ISO currency code' })
  @IsString()
  @Length(3, 3)
  currency!: string;

  @ApiProperty({ type: JurisdictionCodeDto })
  @ValidateNested()
  @Type(() => JurisdictionCodeDto)
  jurisdictionCode!: JurisdictionCodeDto;

  @ApiProperty({ enum: ['FLAT', 'PERCENTAGE', 'TIERED'], example: 'PERCENTAGE' })
  @IsEnum(['FLAT', 'PERCENTAGE', 'TIERED'])
  commissionType!: 'FLAT' | 'PERCENTAGE' | 'TIERED';

  @ApiPropertyOptional({ example: 500, description: 'Flat commission amount (required if FLAT)' })
  @IsOptional()
  @IsNumber()
  flatAmount?: number;

  @ApiPropertyOptional({ example: 2.5, description: 'Commission rate % (required if PERCENTAGE)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  ratePercent?: number;

  @ApiPropertyOptional({
    type: [CommissionTierDto],
    description: 'Commission tiers (required if TIERED)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommissionTierDto)
  @ArrayMinSize(1)
  tiers?: CommissionTierDto[];

  @ApiPropertyOptional({ example: '2026-02-21T00:00:00Z', description: 'Transaction date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  transactionDate?: string;
}

/**
 * Response DTO for commission calculation results.
 */
export class CalculateCommissionResponseDto {
  @ApiProperty({ type: MoneyResponseDto })
  transactionAmount!: MoneyResponseDto;

  @ApiProperty({ type: MoneyResponseDto })
  commissionAmount!: MoneyResponseDto;

  @ApiProperty({ example: 'PERCENTAGE' })
  commissionType!: string;

  @ApiProperty({ example: '2.50%' })
  effectiveRate!: string;

  @ApiProperty({ example: 'US:CA' })
  jurisdiction!: string;

  @ApiProperty({ example: '2026-02-21T12:00:00.000Z' })
  calculatedAt!: string;
}
