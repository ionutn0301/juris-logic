import Decimal from 'decimal.js';
import { ValueObject } from './value-object.base';

interface TaxRateProps {
  rate: string; // stored as string for decimal precision (e.g., "0.0825" = 8.25%)
  label: string; // human-readable (e.g., "California State Tax")
}

/**
 * TaxRate Value Object — represents a percentage rate (0–1 range internally).
 * Encapsulates rate validation and percentage formatting.
 */
export class TaxRate extends ValueObject<TaxRateProps> {
  private constructor(props: TaxRateProps) {
    super(props);
  }

  /**
   * Create from a decimal fraction (e.g., 0.0825 for 8.25%).
   */
  public static fromDecimal(rate: number | string | Decimal, label: string): TaxRate {
    const decimal = new Decimal(rate);
    if (decimal.lessThan(0) || decimal.greaterThan(1)) {
      throw new Error(`Tax rate must be between 0 and 1. Received: ${decimal.toFixed()}`);
    }
    return new TaxRate({ rate: decimal.toFixed(), label });
  }

  /**
   * Create from a percentage value (e.g., 8.25 for 8.25%).
   */
  public static fromPercentage(percentage: number | string | Decimal, label: string): TaxRate {
    const decimal = new Decimal(percentage).dividedBy(100);
    return TaxRate.fromDecimal(decimal, label);
  }

  public static zero(label = 'No Tax'): TaxRate {
    return TaxRate.fromDecimal(0, label);
  }

  // ─── Getters ──────────────────────────────────────────────────

  public get rate(): Decimal {
    return new Decimal(this.props.rate);
  }

  public get label(): string {
    return this.props.label;
  }

  public get percentage(): Decimal {
    return this.rate.times(100);
  }

  // ─── Operations ───────────────────────────────────────────────

  /**
   * Combine two rates (e.g., federal + state).
   */
  public combine(other: TaxRate): TaxRate {
    const combined = this.rate.plus(other.rate);
    return TaxRate.fromDecimal(combined, `${this.label} + ${other.label}`);
  }

  public isZero(): boolean {
    return this.rate.isZero();
  }

  // ─── Serialization ────────────────────────────────────────────

  public toString(): string {
    return `${this.percentage.toFixed(2)}% (${this.label})`;
  }

  public toJSON(): { rate: string; percentage: string; label: string } {
    return {
      rate: this.rate.toFixed(),
      percentage: this.percentage.toFixed(2),
      label: this.label,
    };
  }
}
