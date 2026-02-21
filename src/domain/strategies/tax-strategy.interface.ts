import { Money } from '../value-objects/money.vo';
import { JurisdictionCode } from '../value-objects/jurisdiction-code.vo';
import { TaxLineItem } from '../entities/transaction.entity';

/**
 * The result of a tax calculation — total tax plus a per-rule breakdown.
 */
export interface TaxCalculationResult {
  readonly totalTax: Money;
  readonly breakdown: TaxLineItem[];
}

/**
 * The input context for a tax calculation.
 */
export interface TaxCalculationContext {
  readonly subtotal: Money;
  readonly jurisdictionCode: JurisdictionCode;
  readonly transactionDate: Date;
  readonly isExempt: boolean;
  readonly exemptionCertificateId?: string;
  readonly productCategory?: string;
}

/**
 * Strategy interface for tax calculation (Strategy Pattern).
 *
 * Each jurisdiction implements this interface with its own rules.
 * Open/Closed Principle: new jurisdictions are added by creating
 * new strategy classes, not by modifying existing ones.
 */
export interface ITaxStrategy {
  /**
   * Returns the jurisdiction region(s) this strategy handles.
   */
  getSupportedRegion(): string;

  /**
   * Calculate tax for the given context.
   */
  calculate(context: TaxCalculationContext): TaxCalculationResult;
}
