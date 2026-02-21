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
 * UK VAT rate configuration.
 */
const UK_RATES = {
  standard: 20,
  reduced: 5,
  zero: 0,
};

/**
 * Product categories eligible for the UK reduced rate (5%).
 */
const UK_REDUCED_CATEGORIES = new Set(['domestic_fuel', 'energy_saving', 'children_car_seats']);

/**
 * Product categories zero-rated in the UK (0%).
 */
const UK_ZERO_RATED_CATEGORIES = new Set([
  'food',
  'books',
  'newspapers',
  'children_clothing',
  'public_transport',
]);

/**
 * UK VAT Strategy — handles UK Value Added Tax post-Brexit.
 *
 * Three rate tiers: Standard (20%), Reduced (5%), Zero (0%).
 * Category-driven rate selection.
 */
export class UKVATStrategy implements ITaxStrategy {
  public getSupportedRegion(): string {
    return JurisdictionRegion.UK;
  }

  public calculate(context: TaxCalculationContext): TaxCalculationResult {
    if (context.isExempt) {
      return {
        totalTax: Money.zero(context.subtotal.currency),
        breakdown: [],
      };
    }

    const category = context.productCategory?.toLowerCase();
    let applicableRate: number;
    let rateLabel: string;

    if (category && UK_ZERO_RATED_CATEGORIES.has(category)) {
      applicableRate = UK_RATES.zero;
      rateLabel = 'UK VAT (Zero-Rated)';
    } else if (category && UK_REDUCED_CATEGORIES.has(category)) {
      applicableRate = UK_RATES.reduced;
      rateLabel = 'UK VAT (Reduced)';
    } else {
      applicableRate = UK_RATES.standard;
      rateLabel = 'UK VAT (Standard)';
    }

    const taxRate = TaxRate.fromPercentage(applicableRate, rateLabel);
    const taxAmount = context.subtotal.multiply(taxRate.rate).round();

    const breakdown: TaxLineItem[] = [
      {
        ruleName: rateLabel,
        ratePercent: taxRate.percentage.toFixed(2),
        amount: taxAmount,
      },
    ];

    return { totalTax: taxAmount, breakdown };
  }
}
