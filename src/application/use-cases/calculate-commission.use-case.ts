import Decimal from 'decimal.js';
import { Inject, Injectable } from '@nestjs/common';
import { Money } from '../../domain/value-objects/money.vo';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code.vo';
import { ICachePort, CACHE_PORT } from '../ports/cache.port';
import { IAuditLogPort, AUDIT_LOG_PORT } from '../ports/audit-log.port';

/**
 * Input DTO for the CalculateCommission use case.
 */
export interface CalculateCommissionInput {
  transactionAmount: number;
  currency: string;
  jurisdictionCode: {
    country: string;
    region: string;
    state?: string;
  };
  commissionType: 'FLAT' | 'PERCENTAGE' | 'TIERED';
  flatAmount?: number;
  ratePercent?: number;
  tiers?: Array<{
    minAmount: number;
    maxAmount: number | null;
    ratePercent: number;
  }>;
  transactionDate?: string;
}

/**
 * Output DTO for the CalculateCommission use case.
 */
export interface CalculateCommissionOutput {
  transactionAmount: { amount: string; currency: string };
  commissionAmount: { amount: string; currency: string };
  commissionType: string;
  effectiveRate: string;
  jurisdiction: string;
  calculatedAt: string;
}

/**
 * CalculateCommissionUseCase — calculates commission based on the
 * specified model (flat, percentage, or tiered).
 *
 * Domain logic is kept in the domain layer via Commission entity;
 * this use case orchestrates inputs → domain → output.
 */
@Injectable()
export class CalculateCommissionUseCase {
  constructor(
    @Inject(CACHE_PORT) private readonly cache: ICachePort,
    @Inject(AUDIT_LOG_PORT) private readonly auditLog: IAuditLogPort,
  ) {}

  public async execute(input: CalculateCommissionInput): Promise<CalculateCommissionOutput> {
    const transactionAmount = Money.create(input.transactionAmount, input.currency);
    const jurisdictionCode = JurisdictionCode.create({
      country: input.jurisdictionCode.country,
      region: input.jurisdictionCode.region as never,
      state: input.jurisdictionCode.state,
    });

    // Check cache
    const cacheKey = this.buildCacheKey(input);
    const cached = await this.cache.get<CalculateCommissionOutput>(cacheKey);
    if (cached) return cached;

    // Calculate based on type
    let commissionAmount: Money;

    switch (input.commissionType) {
      case 'FLAT':
        commissionAmount = this.calculateFlat(input, transactionAmount.currency);
        break;
      case 'PERCENTAGE':
        commissionAmount = this.calculatePercentage(input, transactionAmount);
        break;
      case 'TIERED':
        commissionAmount = this.calculateTiered(input, transactionAmount);
        break;
      default:
        throw new Error(`Unsupported commission type: ${input.commissionType}`);
    }

    const effectiveRate = transactionAmount.isZero()
      ? '0.00'
      : commissionAmount.amount
          .dividedBy(transactionAmount.amount)
          .times(100)
          .toDecimalPlaces(2)
          .toFixed(2);

    const output: CalculateCommissionOutput = {
      transactionAmount: transactionAmount.toJSON(),
      commissionAmount: commissionAmount.toJSON(),
      commissionType: input.commissionType,
      effectiveRate: `${effectiveRate}%`,
      jurisdiction: jurisdictionCode.toKey(),
      calculatedAt: new Date().toISOString(),
    };

    // Cache & audit
    await Promise.all([
      this.cache.set(cacheKey, output, 3600),
      this.auditLog.log({
        action: 'CALCULATE_COMMISSION',
        entityType: 'Commission',
        entityId: jurisdictionCode.toKey(),
        input: input as unknown as Record<string, unknown>,
        output: output as unknown as Record<string, unknown>,
        timestamp: new Date(),
      }),
    ]);

    return output;
  }

  private calculateFlat(input: CalculateCommissionInput, currency: string): Money {
    if (input.flatAmount === undefined || input.flatAmount === null) {
      throw new Error('Flat commission requires a flatAmount.');
    }
    return Money.create(input.flatAmount, currency).round();
  }

  private calculatePercentage(input: CalculateCommissionInput, amount: Money): Money {
    if (input.ratePercent === undefined || input.ratePercent === null) {
      throw new Error('Percentage commission requires a ratePercent.');
    }
    const rate = new Decimal(input.ratePercent).dividedBy(100);
    return amount.multiply(rate).round();
  }

  private calculateTiered(input: CalculateCommissionInput, amount: Money): Money {
    if (!input.tiers || input.tiers.length === 0) {
      throw new Error('Tiered commission requires at least one tier.');
    }

    let totalCommission = Money.zero(amount.currency);
    let remaining = amount.amount;

    // Sort tiers by minAmount ascending
    const sortedTiers = [...input.tiers].sort((a, b) => a.minAmount - b.minAmount);

    for (const tier of sortedTiers) {
      if (remaining.lessThanOrEqualTo(0)) break;

      const tierMin = new Decimal(tier.minAmount);
      const tierMax = tier.maxAmount !== null ? new Decimal(tier.maxAmount) : null;
      const tierRate = new Decimal(tier.ratePercent).dividedBy(100);

      // Calculate the taxable amount within this tier
      const tierRange = tierMax ? tierMax.minus(tierMin) : remaining;
      const applicableAmount = Decimal.min(remaining, tierRange);

      const tierCommission = Money.create(applicableAmount.times(tierRate), amount.currency).round();
      totalCommission = totalCommission.add(tierCommission);
      remaining = remaining.minus(applicableAmount);
    }

    return totalCommission;
  }

  private buildCacheKey(input: CalculateCommissionInput): string {
    const jc = input.jurisdictionCode;
    return `commission:${jc.country}:${jc.state ?? ''}:${input.transactionAmount}:${input.currency}:${input.commissionType}`;
  }
}
