import { Entity } from './entity.base';
import { Money } from '../value-objects/money.vo';
import { JurisdictionCode } from '../value-objects/jurisdiction-code.vo';

export enum TransactionStatus {
  PENDING = 'PENDING',
  CALCULATED = 'CALCULATED',
  FAILED = 'FAILED',
}

interface TransactionProps {
  subtotal: Money;
  taxAmount: Money;
  commissionAmount: Money;
  total: Money;
  jurisdictionCode: JurisdictionCode;
  status: TransactionStatus;
  calculatedAt: Date | null;
  metadata: Record<string, string>;
  taxBreakdown: TaxLineItem[];
}

/**
 * Individual line in a tax breakdown — shows each rule's contribution.
 */
export interface TaxLineItem {
  readonly ruleName: string;
  readonly ratePercent: string;
  readonly amount: Money;
}

/**
 * Transaction Entity — the core aggregate representing a single
 * taxable transaction with its full calculation result.
 *
 * Follows the Aggregate Root pattern: all state changes go through
 * domain methods that enforce business invariants.
 */
export class Transaction extends Entity<TransactionProps> {
  private constructor(props: TransactionProps, id?: string) {
    super(props, id);
  }

  /**
   * Create a new pending transaction (pre-calculation).
   */
  public static create(params: {
    subtotal: Money;
    jurisdictionCode: JurisdictionCode;
    metadata?: Record<string, string>;
  }): Transaction {
    const currency = params.subtotal.currency;
    return new Transaction({
      subtotal: params.subtotal,
      taxAmount: Money.zero(currency),
      commissionAmount: Money.zero(currency),
      total: params.subtotal,
      jurisdictionCode: params.jurisdictionCode,
      status: TransactionStatus.PENDING,
      calculatedAt: null,
      metadata: params.metadata ?? {},
      taxBreakdown: [],
    });
  }

  /**
   * Reconstitute from persistence (bypasses creation rules).
   */
  public static reconstitute(
    props: TransactionProps,
    id: string,
  ): Transaction {
    return new Transaction(props, id);
  }

  // ─── Getters ──────────────────────────────────────────────────

  public get subtotal(): Money {
    return this.props.subtotal;
  }

  public get taxAmount(): Money {
    return this.props.taxAmount;
  }

  public get commissionAmount(): Money {
    return this.props.commissionAmount;
  }

  public get total(): Money {
    return this.props.total;
  }

  public get jurisdictionCode(): JurisdictionCode {
    return this.props.jurisdictionCode;
  }

  public get status(): TransactionStatus {
    return this.props.status;
  }

  public get calculatedAt(): Date | null {
    return this.props.calculatedAt;
  }

  public get metadata(): Readonly<Record<string, string>> {
    return this.props.metadata;
  }

  public get taxBreakdown(): readonly TaxLineItem[] {
    return this.props.taxBreakdown;
  }

  // ─── Domain Commands ──────────────────────────────────────────

  /**
   * Apply the calculated tax to this transaction.
   * Called by the use case after the strategy pipeline runs.
   */
  public applyTax(taxAmount: Money, breakdown: TaxLineItem[]): void {
    if (this.status !== TransactionStatus.PENDING) {
      throw new Error(`Cannot apply tax to a transaction in "${this.status}" status.`);
    }
    this.props.taxAmount = taxAmount;
    this.props.taxBreakdown = breakdown;
    this.recalculateTotal();
  }

  /**
   * Apply the calculated commission to this transaction.
   */
  public applyCommission(commissionAmount: Money): void {
    if (this.status !== TransactionStatus.PENDING) {
      throw new Error(`Cannot apply commission to a transaction in "${this.status}" status.`);
    }
    this.props.commissionAmount = commissionAmount;
    this.recalculateTotal();
  }

  /**
   * Mark the transaction as fully calculated.
   */
  public markCalculated(): void {
    this.props.status = TransactionStatus.CALCULATED;
    this.props.calculatedAt = new Date();
  }

  /**
   * Mark the transaction as failed.
   */
  public markFailed(): void {
    this.props.status = TransactionStatus.FAILED;
  }

  // ─── Serialization ────────────────────────────────────────────

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      subtotal: this.subtotal.toJSON(),
      taxAmount: this.taxAmount.toJSON(),
      commissionAmount: this.commissionAmount.toJSON(),
      total: this.total.toJSON(),
      jurisdiction: this.jurisdictionCode.toJSON(),
      status: this.status,
      calculatedAt: this.calculatedAt?.toISOString() ?? null,
      taxBreakdown: this.taxBreakdown.map((item) => ({
        ruleName: item.ruleName,
        ratePercent: item.ratePercent,
        amount: item.amount.toJSON(),
      })),
      metadata: this.metadata,
    };
  }

  // ─── Internal ─────────────────────────────────────────────────

  private recalculateTotal(): void {
    this.props.total = this.props.subtotal.add(this.props.taxAmount).add(this.props.commissionAmount);
  }
}
