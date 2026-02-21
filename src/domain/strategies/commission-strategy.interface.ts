import { Money } from '../value-objects/money.vo';
import { JurisdictionCode } from '../value-objects/jurisdiction-code.vo';

/**
 * The result of a commission calculation.
 */
export interface CommissionCalculationResult {
  readonly totalCommission: Money;
  readonly description: string;
}

/**
 * The input context for a commission calculation.
 */
export interface CommissionCalculationContext {
  readonly transactionAmount: Money;
  readonly jurisdictionCode: JurisdictionCode;
  readonly transactionDate: Date;
  readonly agentId?: string;
  readonly transactionType?: string;
}

/**
 * Strategy interface for commission calculation (Strategy Pattern).
 */
export interface ICommissionStrategy {
  getSupportedRegion(): string;
  calculate(context: CommissionCalculationContext): CommissionCalculationResult;
}
