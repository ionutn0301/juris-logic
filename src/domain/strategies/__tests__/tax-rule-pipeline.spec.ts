import { Money } from '../../value-objects/money.vo';
import { JurisdictionCode } from '../../value-objects/jurisdiction-code.vo';
import {
  TaxRulePipeline,
  ExemptionHandler,
  SurchargeHandler,
  MinimumTaxHandler,
} from '../tax-rule-pipeline';
import { TaxCalculationContext, TaxCalculationResult } from '../tax-strategy.interface';

describe('TaxRulePipeline', () => {
  const baseContext: TaxCalculationContext = {
    subtotal: Money.create(1000, 'USD'),
    jurisdictionCode: JurisdictionCode.us('CA'),
    transactionDate: new Date(),
    isExempt: false,
  };

  const baseResult: TaxCalculationResult = {
    totalTax: Money.create(72.5, 'USD'),
    breakdown: [
      {
        ruleName: 'California State Sales Tax',
        ratePercent: '7.25',
        amount: Money.create(72.5, 'USD'),
      },
    ],
  };

  it('should pass through result unchanged when pipeline is empty', () => {
    const pipeline = new TaxRulePipeline();
    const result = pipeline.execute(baseContext, baseResult);
    expect(result.totalTax.amount.toNumber()).toBe(72.5);
  });

  it('should zero out taxes for exempt transactions', () => {
    const exemptContext = { ...baseContext, isExempt: true, exemptionCertificateId: 'CERT-123' };
    const pipeline = new TaxRulePipeline().addHandler(new ExemptionHandler());
    const result = pipeline.execute(exemptContext, baseResult);
    expect(result.totalTax.isZero()).toBe(true);
    expect(result.breakdown[0].ruleName).toContain('Tax Exempt');
  });

  it('should add a surcharge on top of base tax', () => {
    const pipeline = new TaxRulePipeline()
      .addHandler(new SurchargeHandler(1.5, 'Environmental Surcharge'));
    const result = pipeline.execute(baseContext, baseResult);
    // Base $72.50 + surcharge 1.5% of $1000 = $15.00 → $87.50
    expect(result.totalTax.amount.toNumber()).toBe(87.5);
    expect(result.breakdown).toHaveLength(2);
  });

  it('should enforce a minimum tax floor', () => {
    const lowResult: TaxCalculationResult = {
      totalTax: Money.create(0.5, 'USD'),
      breakdown: [{ ruleName: 'Low Tax', ratePercent: '0.05', amount: Money.create(0.5, 'USD') }],
    };
    const pipeline = new TaxRulePipeline()
      .addHandler(new MinimumTaxHandler(Money.create(5, 'USD')));
    const result = pipeline.execute(baseContext, lowResult);
    expect(result.totalTax.amount.toNumber()).toBe(5);
  });

  it('should chain multiple handlers in order', () => {
    const pipeline = new TaxRulePipeline()
      .addHandler(new ExemptionHandler()) // non-exempt, passes through
      .addHandler(new SurchargeHandler(2, 'Processing Fee'));

    const result = pipeline.execute(baseContext, baseResult);
    // $72.50 + 2% of $1000 = $20 → $92.50
    expect(result.totalTax.amount.toNumber()).toBe(92.5);
  });
});
