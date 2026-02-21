import Decimal from 'decimal.js';
import { Money } from '../../value-objects/money.vo';
import { TaxRate } from '../../value-objects/tax-rate.vo';
import {
  ITaxStrategy,
  TaxCalculationContext,
  TaxCalculationResult,
} from '../tax-strategy.interface';
import { TaxLineItem } from '../../entities/transaction.entity';
import { JurisdictionRegion } from '../../value-objects/jurisdiction-code.vo';

/**
 * US Sales Tax rates by state (simplified representative set).
 * In production, these would come from a DB or external provider.
 */
const US_STATE_RATES: Record<string, { rate: number; label: string }> = {
  CA: { rate: 7.25, label: 'California State Sales Tax' },
  TX: { rate: 6.25, label: 'Texas State Sales Tax' },
  NY: { rate: 4.0, label: 'New York State Sales Tax' },
  FL: { rate: 6.0, label: 'Florida State Sales Tax' },
  WA: { rate: 6.5, label: 'Washington State Sales Tax' },
  IL: { rate: 6.25, label: 'Illinois State Sales Tax' },
  PA: { rate: 6.0, label: 'Pennsylvania State Sales Tax' },
  OH: { rate: 5.75, label: 'Ohio State Sales Tax' },
  GA: { rate: 4.0, label: 'Georgia State Sales Tax' },
  NJ: { rate: 6.625, label: 'New Jersey State Sales Tax' },
};

/**
 * Representative county/city surcharges.
 */
const US_LOCAL_SURCHARGES: Record<string, { rate: number; label: string }> = {
  'CA:LOS_ANGELES': { rate: 2.25, label: 'Los Angeles County Surcharge' },
  'CA:SAN_FRANCISCO': { rate: 1.25, label: 'San Francisco County Surcharge' },
  'NY:NEW_YORK': { rate: 4.5, label: 'New York City Surcharge' },
  'TX:HOUSTON': { rate: 2.0, label: 'Houston Local Surcharge' },
  'WA:SEATTLE': { rate: 3.6, label: 'Seattle Local Surcharge' },
};

/**
 * US Sales Tax Strategy — handles multi-level tax calculation:
 * Federal (none for sales tax) → State → County/City surcharges.
 *
 * Demonstrates the Strategy Pattern with real-world complexity:
 * rates stack (state + local), and some states have no sales tax.
 */
export class USSalesTaxStrategy implements ITaxStrategy {
  public getSupportedRegion(): string {
    return JurisdictionRegion.US;
  }

  public calculate(context: TaxCalculationContext): TaxCalculationResult {
    if (context.isExempt) {
      return {
        totalTax: Money.zero(context.subtotal.currency),
        breakdown: [],
      };
    }

    const breakdown: TaxLineItem[] = [];
    let totalTax = Money.zero(context.subtotal.currency);

    // 1. State-level tax
    const stateKey = context.jurisdictionCode.state;
    if (stateKey && US_STATE_RATES[stateKey]) {
      const stateInfo = US_STATE_RATES[stateKey];
      const stateRate = TaxRate.fromPercentage(stateInfo.rate, stateInfo.label);
      const stateTax = context.subtotal.multiply(stateRate.rate).round();

      breakdown.push({
        ruleName: stateInfo.label,
        ratePercent: stateRate.percentage.toFixed(2),
        amount: stateTax,
      });
      totalTax = totalTax.add(stateTax);
    }

    // 2. County/City surcharge
    const localKey = [stateKey, context.jurisdictionCode.county ?? context.jurisdictionCode.city]
      .filter(Boolean)
      .join(':');

    if (localKey && US_LOCAL_SURCHARGES[localKey]) {
      const localInfo = US_LOCAL_SURCHARGES[localKey];
      const localRate = TaxRate.fromPercentage(localInfo.rate, localInfo.label);
      const localTax = context.subtotal.multiply(localRate.rate).round();

      breakdown.push({
        ruleName: localInfo.label,
        ratePercent: localRate.percentage.toFixed(2),
        amount: localTax,
      });
      totalTax = totalTax.add(localTax);
    }

    // If no state found, apply a default federal-level zero
    if (breakdown.length === 0) {
      const defaultRate = TaxRate.zero('No applicable US Sales Tax');
      breakdown.push({
        ruleName: defaultRate.label,
        ratePercent: new Decimal(0).toFixed(2),
        amount: Money.zero(context.subtotal.currency),
      });
    }

    return { totalTax: totalTax.round(), breakdown };
  }
}
