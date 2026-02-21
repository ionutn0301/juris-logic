import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CalculateTaxRequestDto } from './tax.dto';

export class BatchTransactionItemDto {
  @ApiProperty({ example: 'ref-001', description: 'Client-supplied reference ID' })
  @IsString()
  referenceId!: string;

  @ApiProperty({ type: CalculateTaxRequestDto })
  @ValidateNested()
  @Type(() => CalculateTaxRequestDto)
  taxInput!: CalculateTaxRequestDto;
}

/**
 * Request DTO for POST /api/v1/batch
 */
export class ProcessBatchRequestDto {
  @ApiProperty({ type: [BatchTransactionItemDto], description: 'Array of transaction items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchTransactionItemDto)
  @ArrayMinSize(1)
  items!: BatchTransactionItemDto[];

  @ApiPropertyOptional({
    example: 'https://example.com/webhook/batch-complete',
    description: 'Webhook URL for completion notification',
  })
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;
}

/**
 * Response DTO for batch processing.
 */
export class ProcessBatchResponseDto {
  @ApiProperty({ example: 'batch_1708500000_abc1234' })
  batchId!: string;

  @ApiProperty({ example: 100 })
  itemCount!: number;

  @ApiProperty({ example: 'QUEUED' })
  status!: string;

  @ApiProperty({ example: 'Batch batch_... with 100 items has been queued for processing.' })
  message!: string;
}
