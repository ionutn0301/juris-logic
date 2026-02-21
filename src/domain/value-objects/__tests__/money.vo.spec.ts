import { Money } from '../money.vo';

describe('Money Value Object', () => {
  describe('creation', () => {
    it('should create a Money instance with valid inputs', () => {
      const money = Money.create(100.5, 'USD');
      expect(money.amount.toNumber()).toBe(100.5);
      expect(money.currency).toBe('USD');
    });

    it('should reject invalid currency codes', () => {
      expect(() => Money.create(100, 'US')).toThrow('Invalid currency code');
      expect(() => Money.create(100, '')).toThrow('Invalid currency code');
    });

    it('should create zero money', () => {
      const zero = Money.zero('EUR');
      expect(zero.isZero()).toBe(true);
      expect(zero.currency).toBe('EUR');
    });
  });

  describe('arithmetic', () => {
    it('should add two Money values of the same currency', () => {
      const a = Money.create(100, 'USD');
      const b = Money.create(50.75, 'USD');
      const result = a.add(b);
      expect(result.amount.toNumber()).toBe(150.75);
    });

    it('should subtract two Money values', () => {
      const a = Money.create(100, 'USD');
      const b = Money.create(30.25, 'USD');
      const result = a.subtract(b);
      expect(result.amount.toNumber()).toBe(69.75);
    });

    it('should multiply Money by a factor', () => {
      const money = Money.create(100, 'USD');
      const result = money.multiply(0.0825);
      expect(result.amount.toNumber()).toBe(8.25);
    });

    it('should reject division by zero', () => {
      const money = Money.create(100, 'USD');
      expect(() => money.divide(0)).toThrow('Cannot divide Money by zero');
    });

    it('should reject operations on different currencies', () => {
      const usd = Money.create(100, 'USD');
      const eur = Money.create(100, 'EUR');
      expect(() => usd.add(eur)).toThrow('Currency mismatch');
    });

    it('should round to 2 decimal places with ROUND_HALF_UP', () => {
      const money = Money.create(100.555, 'USD');
      const rounded = money.round(2);
      expect(rounded.amount.toNumber()).toBe(100.56);
    });
  });

  describe('comparisons', () => {
    it('should correctly compare amounts', () => {
      const a = Money.create(100, 'USD');
      const b = Money.create(50, 'USD');
      expect(a.greaterThan(b)).toBe(true);
      expect(b.lessThan(a)).toBe(true);
      expect(a.isPositive()).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const money = Money.create(99.99, 'USD');
      const json = money.toJSON();
      expect(json.amount).toBe('99.99');
      expect(json.currency).toBe('USD');
    });

    it('should produce a human-readable string', () => {
      const money = Money.create(1234.5, 'GBP');
      expect(money.toString()).toBe('1234.50 GBP');
    });
  });
});
