import { Inject, Injectable } from '@nestjs/common';
import { Money } from '../../domain/value-objects/money.vo';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code.vo';
import { Transaction } from '../../domain/entities/transaction.entity';
import {
  TaxStrategyFactory,
  TaxCalculationContext,
  TaxCalculationResult,
  TaxRulePipeline,
  ExemptionHandler,
} from '../../domain/strategies';
import { ICachePort, CACHE_PORT } from '../ports/cache.port';
import { IAuditLogPort, AUDIT_LOG_PORT } from '../ports/audit-log.port';

/**
 * Input DTO for the CalculateTax use case.
 */
export interface CalculateTaxInput {
  subtotal: number;
  currency: string;
  jurisdictionCode: {
    country: string;
    region: string;
    state?: string;
    county?: string;
    city?: string;
  };
  isExempt?: boolean;
  exemptionCertificateId?: string;
  productCategory?: string;
  transactionDate?: string; // ISO 8601
}

/**
 * Output DTO for the CalculateTax use case.
 */
export interface CalculateTaxOutput {
  transactionId: string;
  subtotal: { amount: string; currency: string };
  taxAmount: { amount: string; currency: string };
  total: { amount: string; currency: string };
  effectiveRate: string;
  jurisdiction: string;
  breakdown: Array<{
    ruleName: string;
    ratePercent: string;
    amount: { amount: string; currency: string };
  }>;
  calculatedAt: string;
}

/**
 * CalculateTaxUseCase — orchestrates a single tax calculation.
 *
 * This is an Application Service: it coordinates domain objects
 * and infrastructure ports without containing business rules itself.
 * Single Responsibility: one use case, one reason to change.
 */
@Injectable()
export class CalculateTaxUseCase {
  private readonly strategyFactory: TaxStrategyFactory;

  constructor(
    @Inject(CACHE_PORT) private readonly cache: ICachePort,
    @Inject(AUDIT_LOG_PORT) private readonly auditLog: IAuditLogPort,
  ) {
    this.strategyFactory = new TaxStrategyFactory();
  }

  public async execute(input: CalculateTaxInput): Promise<CalculateTaxOutput> {
    // 1. Build domain value objects from input
    const subtotal = Money.create(input.subtotal, input.currency);
    const jurisdictionCode = JurisdictionCode.create({
      country: input.jurisdictionCode.country,
      region: input.jurisdictionCode.region as never, // validated at DTO layer
      state: input.jurisdictionCode.state,
      county: input.jurisdictionCode.county,
      city: input.jurisdictionCode.city,
    });
    const transactionDate = input.transactionDate
      ? new Date(input.transactionDate)
      : new Date();

    // 2. Check cache for identical request
    const cacheKey = this.buildCacheKey(input);
    const cached = await this.cache.get<CalculateTaxOutput>(cacheKey);
    if (cached) return cached;

    // 3. Resolve the correct strategy and calculate
    const strategy = this.strategyFactory.resolve(jurisdictionCode);
    const context: TaxCalculationContext = {
      subtotal,
      jurisdictionCode,
      transactionDate,
      isExempt: input.isExempt ?? false,
      exemptionCertificateId: input.exemptionCertificateId,
      productCategory: input.productCategory,
    };

    const baseResult: TaxCalculationResult = strategy.calculate(context);

    // 4. Run through pipeline (exemptions, surcharges, etc.)
    const pipeline = new TaxRulePipeline().addHandler(new ExemptionHandler());
    const finalResult = pipeline.execute(context, baseResult);

    // 5. Build the Transaction aggregate
    const transaction = Transaction.create({
      subtotal,
      jurisdictionCode,
    });
    transaction.applyTax(finalResult.totalTax, finalResult.breakdown);
    transaction.markCalculated();

    // 6. Build output
    const output = this.buildOutput(transaction, jurisdictionCode);

    // 7. Cache result & audit log (fire-and-forget, non-blocking)
    await Promise.all([
      this.cache.set(cacheKey, output, 3600),
      this.auditLog.log({
        action: 'CALCULATE_TAX',
        entityType: 'Transaction',
        entityId: transaction.id,
        input: input as unknown as Record<string, unknown>,
        output: output as unknown as Record<string, unknown>,
        timestamp: new Date(),
      }),
    ]);

    return output;
  }

  private buildCacheKey(input: CalculateTaxInput): string {
    const jc = input.jurisdictionCode;
    return `tax:${jc.country}:${jc.state ?? ''}:${jc.county ?? ''}:${jc.city ?? ''}:${input.subtotal}:${input.currency}:${input.productCategory ?? ''}:${input.isExempt ?? false}`;
  }

  private buildOutput(
    transaction: Transaction,
    jurisdictionCode: JurisdictionCode,
  ): CalculateTaxOutput {
    const effectiveRate = transaction.subtotal.isZero()
      ? '0.00'
      : transaction.taxAmount.amount
          .dividedBy(transaction.subtotal.amount)
          .times(100)
          .toDecimalPlaces(2)
          .toFixed(2);

    return {
      transactionId: transaction.id,
      subtotal: transaction.subtotal.toJSON(),
      taxAmount: transaction.taxAmount.toJSON(),
      total: transaction.total.toJSON(),
      effectiveRate: `${effectiveRate}%`,
      jurisdiction: jurisdictionCode.toKey(),
      breakdown: transaction.taxBreakdown.map((item) => ({
        ruleName: item.ruleName,
        ratePercent: item.ratePercent,
        amount: item.amount.toJSON(),
      })),
      calculatedAt: transaction.calculatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}
