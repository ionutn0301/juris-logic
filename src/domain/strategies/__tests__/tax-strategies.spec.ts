import { JurisdictionCode, JurisdictionRegion } from '../../value-objects/jurisdiction-code.vo';
import { Money } from '../../value-objects/money.vo';
import { TaxStrategyFactory } from '../tax-strategy.factory';
import { TaxCalculationContext } from '../tax-strategy.interface';
import { USSalesTaxStrategy } from '../implementations/us-sales-tax.strategy';
import { EUVATStrategy } from '../implementations/eu-vat.strategy';
import { UKVATStrategy } from '../implementations/uk-vat.strategy';
import { CAGSTStrategy } from '../implementations/ca-gst.strategy';

describe('Tax Strategies', () => {
  // ─── US Sales Tax ──────────────────────────────────────────

  describe('USSalesTaxStrategy', () => {
    const strategy = new USSalesTaxStrategy();

    it('should calculate California state sales tax at 7.25%', () => {
      const context: TaxCalculationContext = {
        subtotal: Money.create(1000, 'USD'),
        jurisdictionCode: JurisdictionCode.us('CA'),
        transactionDate: new Date(),
        isExempt: false,
      };

      const result = strategy.calculate(context);
      expect(result.totalTax.amount.toNumber()).toBe(72.5);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].ruleName).toContain('California');
    });

    it('should stack state + local taxes for CA:LOS_ANGELES', () => {
      const context: TaxCalculationContext = {
        subtotal: Money.create(1000, 'USD'),
        jurisdictionCode: JurisdictionCode.us('CA', 'LOS_ANGELES'),
        transactionDate: new Date(),
        isExempt: false,
      };

      const result = strategy.calculate(context);
      // 7.25% + 2.25% = 9.50% of $1000 = $95.00
      expect(result.totalTax.amount.toNumber()).toBe(95);
      expect(result.breakdown).toHaveLength(2);
    });

    it('should return zero for exempt transactions', () => {
      const context: TaxCalculationContext = {
        subtotal: Money.create(5000, 'USD'),
        jurisdictionCode: JurisdictionCode.us('TX'),
        transactionDate: new Date(),
        isExempt: true,
        exemptionCertificateId: 'CERT-001',
      };

      const result = strategy.calculate(context);
      expect(result.totalTax.isZero()).toBe(true);
    });
  });

  // ─── EU VAT ───────────────────────────────────────────────

  describe('EUVATStrategy', () => {
    const strategy = new EUVATStrategy();

    it('should calculate German standard VAT at 19%', () => {
      const context: TaxCalculationContext = {
        subtotal: Money.create(500, 'EUR'),
        jurisdictionCode: JurisdictionCode.eu('DE'),
        transactionDate: new Date(),
        isExempt: false,
      };

      const result = strategy.calculate(context);
      expect(result.totalTax.amount.toNumber()).toBe(95);
      expect(result.breakdown[0].ruleName).toContain('Germany');
    });

    it('should apply reduced rate for food products', () => {
      const context: TaxCalculationContext = {
        subtotal: Money.create(500, 'EUR'),
        jurisdictionCode: JurisdictionCode.eu('DE'),
        transactionDate: new Date(),
        isExempt: false,
        productCategory: 'food',
      };

      const result = strategy.calculate(context);
      // Germany reduced VAT is 7%
      expect(result.totalTax.amount.toNumber()).toBe(35);
      expect(result.breakdown[0].ruleName).toContain('Reduced');
    });
  });

  // ─── UK VAT ───────────────────────────────────────────────

  describe('UKVATStrategy', () => {
    const strategy = new UKVATStrategy();

    it('should calculate standard UK VAT at 20%', () => {
      const context: TaxCalculationContext = {
        subtotal: Money.create(200, 'GBP'),
        jurisdictionCode: JurisdictionCode.uk(),
        transactionDate: new Date(),
        isExempt: false,
      };

      const result = strategy.calculate(context);
      expect(result.totalTax.amount.toNumber()).toBe(40);
    });

    it('should apply zero rate for books', () => {
      const context: TaxCalculationContext = {
        subtotal: Money.create(200, 'GBP'),
        jurisdictionCode: JurisdictionCode.uk(),
        transactionDate: new Date(),
        isExempt: false,
        productCategory: 'books',
      };

      const result = strategy.calculate(context);
      expect(result.totalTax.isZero()).toBe(true);
    });
  });

  // ─── Canadian GST ────────────────────────────────────────

  describe('CAGSTStrategy', () => {
    const strategy = new CAGSTStrategy();

    it('should calculate Ontario HST at 13%', () => {
      const context: TaxCalculationContext = {
        subtotal: Money.create(1000, 'CAD'),
        jurisdictionCode: JurisdictionCode.ca('ON'),
        transactionDate: new Date(),
        isExempt: false,
      };

      const result = strategy.calculate(context);
      expect(result.totalTax.amount.toNumber()).toBe(130);
      expect(result.breakdown).toHaveLength(1); // HST is a single rate
    });

    it('should stack GST + PST for British Columbia', () => {
      const context: TaxCalculationContext = {
        subtotal: Money.create(1000, 'CAD'),
        jurisdictionCode: JurisdictionCode.ca('BC'),
        transactionDate: new Date(),
        isExempt: false,
      };

      const result = strategy.calculate(context);
      // 5% GST + 7% PST = 12% → $120
      expect(result.totalTax.amount.toNumber()).toBe(120);
      expect(result.breakdown).toHaveLength(2);
    });

    it('should apply GST only for Alberta (no PST)', () => {
      const context: TaxCalculationContext = {
        subtotal: Money.create(1000, 'CAD'),
        jurisdictionCode: JurisdictionCode.ca('AB'),
        transactionDate: new Date(),
        isExempt: false,
      };

      const result = strategy.calculate(context);
      expect(result.totalTax.amount.toNumber()).toBe(50); // 5% GST only
      expect(result.breakdown).toHaveLength(1);
    });
  });

  // ─── Factory ──────────────────────────────────────────────

  describe('TaxStrategyFactory', () => {
    const factory = new TaxStrategyFactory();

    it('should resolve US strategy', () => {
      const strategy = factory.resolve(JurisdictionCode.us('CA'));
      expect(strategy.getSupportedRegion()).toBe('US');
    });

    it('should resolve EU strategy', () => {
      const strategy = factory.resolve(JurisdictionCode.eu('DE'));
      expect(strategy.getSupportedRegion()).toBe('EU');
    });

    it('should list all registered regions', () => {
      const regions = factory.getRegisteredRegions();
      expect(regions).toContain('US');
      expect(regions).toContain('EU');
      expect(regions).toContain('UK');
      expect(regions).toContain('CA');
    });
  });
});
