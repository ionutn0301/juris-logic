import { Entity } from './entity.base';
import { Money } from '../value-objects/money.vo';
import { JurisdictionCode } from '../value-objects/jurisdiction-code.vo';

/**
 * Classification of commission calculation strategies.
 */
export enum CommissionType {
  FLAT = 'FLAT',
  PERCENTAGE = 'PERCENTAGE',
  TIERED = 'TIERED',
}

/**
 * A tier within a tiered commission schedule.
 * e.g., "0–$10k at 5%, $10k–$50k at 7%, $50k+ at 10%"
 */
export interface CommissionTier {
  readonly minAmount: Money;
  readonly maxAmount: Money | null;
  readonly ratePercent: number; // e.g., 5 for 5%
}

interface CommissionProps {
  jurisdictionCode: JurisdictionCode;
  commissionType: CommissionType;
  name: string;
  description: string;
  flatAmount: Money | null;
  ratePercent: number | null;
  tiers: CommissionTier[];
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

/**
 * Commission Entity — represents a commission schedule for a given jurisdiction.
 * Supports flat-fee, percentage-based, and tiered commission models.
 */
export class Commission extends Entity<CommissionProps> {
  private constructor(props: CommissionProps, id?: string) {
    super(props, id);
  }

  // ─── Factory Methods ──────────────────────────────────────────

  public static createFlat(params: {
    jurisdictionCode: JurisdictionCode;
    name: string;
    description: string;
    flatAmount: Money;
    effectiveFrom: Date;
    effectiveTo?: Date | null;
  }): Commission {
    return new Commission({
      ...params,
      commissionType: CommissionType.FLAT,
      ratePercent: null,
      tiers: [],
      isActive: true,
      effectiveTo: params.effectiveTo ?? null,
      flatAmount: params.flatAmount,
    });
  }

  public static createPercentage(params: {
    jurisdictionCode: JurisdictionCode;
    name: string;
    description: string;
    ratePercent: number;
    effectiveFrom: Date;
    effectiveTo?: Date | null;
  }): Commission {
    if (params.ratePercent < 0 || params.ratePercent > 100) {
      throw new Error(`Commission rate must be 0–100. Got: ${params.ratePercent}`);
    }
    return new Commission({
      ...params,
      commissionType: CommissionType.PERCENTAGE,
      flatAmount: null,
      tiers: [],
      isActive: true,
      effectiveTo: params.effectiveTo ?? null,
    });
  }

  public static createTiered(params: {
    jurisdictionCode: JurisdictionCode;
    name: string;
    description: string;
    tiers: CommissionTier[];
    effectiveFrom: Date;
    effectiveTo?: Date | null;
  }): Commission {
    if (!params.tiers || params.tiers.length === 0) {
      throw new Error('Tiered commission must have at least one tier.');
    }
    return new Commission({
      ...params,
      commissionType: CommissionType.TIERED,
      flatAmount: null,
      ratePercent: null,
      isActive: true,
      effectiveTo: params.effectiveTo ?? null,
    });
  }

  // ─── Getters ──────────────────────────────────────────────────

  public get jurisdictionCode(): JurisdictionCode {
    return this.props.jurisdictionCode;
  }

  public get commissionType(): CommissionType {
    return this.props.commissionType;
  }

  public get name(): string {
    return this.props.name;
  }

  public get description(): string {
    return this.props.description;
  }

  public get flatAmount(): Money | null {
    return this.props.flatAmount;
  }

  public get ratePercent(): number | null {
    return this.props.ratePercent;
  }

  public get tiers(): readonly CommissionTier[] {
    return this.props.tiers;
  }

  public get isActive(): boolean {
    return this.props.isActive;
  }

  public get effectiveFrom(): Date {
    return this.props.effectiveFrom;
  }

  public get effectiveTo(): Date | null {
    return this.props.effectiveTo;
  }

  // ─── Domain Logic ─────────────────────────────────────────────

  public isEffectiveOn(date: Date): boolean {
    if (!this.isActive) return false;
    if (date < this.effectiveFrom) return false;
    if (this.effectiveTo && date > this.effectiveTo) return false;
    return true;
  }

  public deactivate(): void {
    this.props.isActive = false;
  }
}
