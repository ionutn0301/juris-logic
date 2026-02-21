import { Entity } from './entity.base';
import { Money } from '../value-objects/money.vo';
import { TaxRate } from '../value-objects/tax-rate.vo';
import { JurisdictionCode } from '../value-objects/jurisdiction-code.vo';

/**
 * Represents a single tax bracket within a jurisdiction.
 * e.g., "First $10,000 taxed at 5%, next $40,000 at 7%, remainder at 9%."
 */
export interface TaxBracketRange {
  readonly minAmount: Money;
  readonly maxAmount: Money | null; // null = no upper bound
  readonly rate: TaxRate;
}

interface TaxRuleProps {
  jurisdictionCode: JurisdictionCode;
  taxType: TaxType;
  name: string;
  description: string;
  brackets: TaxBracketRange[];
  effectiveFrom: Date;
  effectiveTo: Date | null; // null = currently active
  isActive: boolean;
  priority: number; // determines order of application in pipeline
}

/**
 * Classification of tax types — supports extension for future categories.
 */
export enum TaxType {
  SALES_TAX = 'SALES_TAX',
  VAT = 'VAT',
  GST = 'GST',
  EXCISE = 'EXCISE',
  SERVICE_TAX = 'SERVICE_TAX',
}

/**
 * TaxRule Entity — a specific rule within a jurisdiction that dictates
 * how a particular type of tax is calculated.
 *
 * Contains one or more brackets (progressive taxation) and validity dates
 * to support rule versioning over time.
 */
export class TaxRule extends Entity<TaxRuleProps> {
  private constructor(props: TaxRuleProps, id?: string) {
    super(props, id);
  }

  public static create(
    params: {
      jurisdictionCode: JurisdictionCode;
      taxType: TaxType;
      name: string;
      description: string;
      brackets: TaxBracketRange[];
      effectiveFrom: Date;
      effectiveTo?: Date | null;
      priority?: number;
    },
    id?: string,
  ): TaxRule {
    if (!params.brackets || params.brackets.length === 0) {
      throw new Error('A TaxRule must have at least one bracket.');
    }
    return new TaxRule(
      {
        ...params,
        effectiveTo: params.effectiveTo ?? null,
        isActive: true,
        priority: params.priority ?? 0,
      },
      id,
    );
  }

  // ─── Getters ──────────────────────────────────────────────────

  public get jurisdictionCode(): JurisdictionCode {
    return this.props.jurisdictionCode;
  }

  public get taxType(): TaxType {
    return this.props.taxType;
  }

  public get name(): string {
    return this.props.name;
  }

  public get description(): string {
    return this.props.description;
  }

  public get brackets(): readonly TaxBracketRange[] {
    return this.props.brackets;
  }

  public get effectiveFrom(): Date {
    return this.props.effectiveFrom;
  }

  public get effectiveTo(): Date | null {
    return this.props.effectiveTo;
  }

  public get isActive(): boolean {
    return this.props.isActive;
  }

  public get priority(): number {
    return this.props.priority;
  }

  // ─── Domain Logic ─────────────────────────────────────────────

  /**
   * Check if this rule is effective for a given date.
   */
  public isEffectiveOn(date: Date): boolean {
    if (!this.isActive) return false;
    if (date < this.effectiveFrom) return false;
    if (this.effectiveTo && date > this.effectiveTo) return false;
    return true;
  }

  /**
   * Deactivate this rule (soft delete).
   */
  public deactivate(): void {
    this.props.isActive = false;
  }

  /**
   * Returns the effective flat rate if there is exactly one bracket (simple rules).
   */
  public get flatRate(): TaxRate | null {
    if (this.brackets.length === 1) {
      return this.brackets[0].rate;
    }
    return null;
  }
}
