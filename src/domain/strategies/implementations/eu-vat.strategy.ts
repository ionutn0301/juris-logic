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
 * EU VAT standard rates by country code (2024 rates, representative set).
 * In production, these would be sourced from the EU VIES/TIC database.
 */
const EU_VAT_RATES: Record<string, { standard: number; reduced: number; label: string }> = {
  DE: { standard: 19, reduced: 7, label: 'Germany VAT (MwSt)' },
  FR: { standard: 20, reduced: 5.5, label: 'France VAT (TVA)' },
  IT: { standard: 22, reduced: 10, label: 'Italy VAT (IVA)' },
  ES: { standard: 21, reduced: 10, label: 'Spain VAT (IVA)' },
  NL: { standard: 21, reduced: 9, label: 'Netherlands VAT (BTW)' },
  BE: { standard: 21, reduced: 6, label: 'Belgium VAT (TVA/BTW)' },
  AT: { standard: 20, reduced: 10, label: 'Austria VAT (USt)' },
  PL: { standard: 23, reduced: 8, label: 'Poland VAT' },
  SE: { standard: 25, reduced: 12, label: 'Sweden VAT (Moms)' },
  RO: { standard: 19, reduced: 9, label: 'Romania VAT (TVA)' },
  IE: { standard: 23, reduced: 13.5, label: 'Ireland VAT' },
  PT: { standard: 23, reduced: 6, label: 'Portugal VAT (IVA)' },
};

/**
 * Product categories eligible for reduced VAT rates.
 */
const REDUCED_RATE_CATEGORIES = new Set([
  'food',
  'books',
  'medicine',
  'children_clothing',
  'public_transport',
]);

/**
 * EU VAT Strategy — handles Value Added Tax across EU member states.
 *
 * Key differences from US Sales Tax:
 * - VAT is included in prices (price-inclusive) in B2C; shown separately in B2B.
 * - Rates are per-country, with standard and reduced rates.
 * - Reverse-charge mechanism for B2B cross-border (simplified here).
 */
export class EUVATStrategy implements ITaxStrategy {
  public getSupportedRegion(): string {
    return JurisdictionRegion.EU;
  }

  public calculate(context: TaxCalculationContext): TaxCalculationResult {
    if (context.isExempt) {
      return {
        totalTax: Money.zero(context.subtotal.currency),
        breakdown: [],
      };
    }

    const countryCode = context.jurisdictionCode.country;
    const countryRates = EU_VAT_RATES[countryCode];

    if (!countryRates) {
      return {
        totalTax: Money.zero(context.subtotal.currency),
        breakdown: [
          {
            ruleName: `No VAT data for country: ${countryCode}`,
            ratePercent: '0.00',
            amount: Money.zero(context.subtotal.currency),
          },
        ],
      };
    }

    // Determine if reduced rate applies
    const isReduced =
      context.productCategory !== undefined &&
      REDUCED_RATE_CATEGORIES.has(context.productCategory.toLowerCase());

    const applicableRate = isReduced ? countryRates.reduced : countryRates.standard;
    const rateLabel = `${countryRates.label} (${isReduced ? 'Reduced' : 'Standard'})`;
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
