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
 * Canadian GST/HST/PST rates by province.
 * Canada has a complex layered system:
 *   - GST (federal): 5% across all provinces
 *   - HST (harmonized): replaces GST+PST in some provinces
 *   - PST (provincial): varies by province, stacks on top of GST
 */
const CA_PROVINCE_RATES: Record<
  string,
  { gst: number; pst: number; hst: number | null; label: string }
> = {
  ON: { gst: 5, pst: 0, hst: 13, label: 'Ontario HST' },
  BC: { gst: 5, pst: 7, hst: null, label: 'British Columbia GST+PST' },
  AB: { gst: 5, pst: 0, hst: null, label: 'Alberta GST (no PST)' },
  QC: { gst: 5, pst: 9.975, hst: null, label: 'Quebec GST+QST' },
  NS: { gst: 5, pst: 0, hst: 15, label: 'Nova Scotia HST' },
  NB: { gst: 5, pst: 0, hst: 15, label: 'New Brunswick HST' },
  MB: { gst: 5, pst: 7, hst: null, label: 'Manitoba GST+RST' },
  SK: { gst: 5, pst: 6, hst: null, label: 'Saskatchewan GST+PST' },
  PE: { gst: 5, pst: 0, hst: 15, label: 'Prince Edward Island HST' },
  NL: { gst: 5, pst: 0, hst: 15, label: 'Newfoundland & Labrador HST' },
};

/**
 * Canadian GST/HST/PST Strategy — handles the federal + provincial tax stack.
 *
 * Shows how a single jurisdiction can have multiple independent tax layers
 * that combine differently depending on the province (HST vs GST+PST).
 */
export class CAGSTStrategy implements ITaxStrategy {
  public getSupportedRegion(): string {
    return JurisdictionRegion.CA;
  }

  public calculate(context: TaxCalculationContext): TaxCalculationResult {
    if (context.isExempt) {
      return {
        totalTax: Money.zero(context.subtotal.currency),
        breakdown: [],
      };
    }

    const province = context.jurisdictionCode.state;
    const rates = province ? CA_PROVINCE_RATES[province] : undefined;
    const breakdown: TaxLineItem[] = [];
    let totalTax = Money.zero(context.subtotal.currency);

    if (!rates) {
      // Federal GST only (no province match)
      const gstRate = TaxRate.fromPercentage(5, 'Canada Federal GST');
      const gstAmount = context.subtotal.multiply(gstRate.rate).round();
      breakdown.push({
        ruleName: gstRate.label,
        ratePercent: gstRate.percentage.toFixed(2),
        amount: gstAmount,
      });
      return { totalTax: gstAmount, breakdown };
    }

    if (rates.hst !== null) {
      // HST province — single harmonized rate replaces GST + PST
      const hstRate = TaxRate.fromPercentage(rates.hst, `${rates.label}`);
      const hstAmount = context.subtotal.multiply(hstRate.rate).round();

      breakdown.push({
        ruleName: hstRate.label,
        ratePercent: hstRate.percentage.toFixed(2),
        amount: hstAmount,
      });
      totalTax = hstAmount;
    } else {
      // Non-HST province — GST + PST stacked separately
      const gstRate = TaxRate.fromPercentage(rates.gst, 'Federal GST');
      const gstAmount = context.subtotal.multiply(gstRate.rate).round();
      breakdown.push({
        ruleName: gstRate.label,
        ratePercent: gstRate.percentage.toFixed(2),
        amount: gstAmount,
      });
      totalTax = totalTax.add(gstAmount);

      if (rates.pst > 0) {
        const pstLabel = province === 'QC' ? 'Quebec QST' : `${province} PST`;
        const pstRate = TaxRate.fromPercentage(rates.pst, pstLabel);
        const pstAmount = context.subtotal.multiply(pstRate.rate).round();
        breakdown.push({
          ruleName: pstRate.label,
          ratePercent: pstRate.percentage.toFixed(2),
          amount: pstAmount,
        });
        totalTax = totalTax.add(pstAmount);
      }
    }

    return { totalTax: totalTax.round(), breakdown };
  }
}
