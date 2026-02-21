import Decimal from 'decimal.js';
import { ValueObject } from './value-object.base';

interface MoneyProps {
  amount: string; // stored as string to preserve decimal precision
  currency: string;
}

/**
 * Money Value Object — wraps decimal.js for safe financial arithmetic.
 * NEVER use native JS floats for money. This encapsulates that rule.
 *
 * Immutable: every arithmetic operation returns a new Money instance.
 */
export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  // ─── Factory Methods ──────────────────────────────────────────

  public static create(amount: number | string | Decimal, currency: string): Money {
    const decimal = new Decimal(amount);
    if (!currency || currency.trim().length !== 3) {
      throw new Error(`Invalid currency code: "${currency}". Must be a 3-letter ISO code.`);
    }
    return new Money({ amount: decimal.toFixed(), currency: currency.toUpperCase() });
  }

  public static zero(currency: string): Money {
    return Money.create(0, currency);
  }

  // ─── Getters ──────────────────────────────────────────────────

  public get amount(): Decimal {
    return new Decimal(this.props.amount);
  }

  public get currency(): string {
    return this.props.currency;
  }

  // ─── Arithmetic (all return new Money — immutability) ─────────

  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.create(this.amount.plus(other.amount), this.currency);
  }

  public subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.create(this.amount.minus(other.amount), this.currency);
  }

  public multiply(factor: number | string | Decimal): Money {
    const result = this.amount.times(new Decimal(factor));
    return Money.create(result, this.currency);
  }

  public divide(divisor: number | string | Decimal): Money {
    const d = new Decimal(divisor);
    if (d.isZero()) {
      throw new Error('Cannot divide Money by zero.');
    }
    return Money.create(this.amount.dividedBy(d), this.currency);
  }

  /**
   * Round to a given number of decimal places (default 2 for most currencies).
   * Uses ROUND_HALF_UP — the standard for financial rounding.
   */
  public round(decimalPlaces = 2): Money {
    const rounded = this.amount.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
    return Money.create(rounded, this.currency);
  }

  // ─── Comparisons ──────────────────────────────────────────────

  public isZero(): boolean {
    return this.amount.isZero();
  }

  public isPositive(): boolean {
    return this.amount.greaterThan(0);
  }

  public isNegative(): boolean {
    return this.amount.lessThan(0);
  }

  public greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount.greaterThan(other.amount);
  }

  public lessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount.lessThan(other.amount);
  }

  // ─── Serialization ────────────────────────────────────────────

  public toString(): string {
    return `${this.amount.toFixed(2)} ${this.currency}`;
  }

  public toJSON(): { amount: string; currency: string } {
    return { amount: this.amount.toFixed(), currency: this.currency };
  }

  // ─── Internal ─────────────────────────────────────────────────

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(
        `Currency mismatch: cannot operate on ${this.currency} and ${other.currency}.`,
      );
    }
  }
}
