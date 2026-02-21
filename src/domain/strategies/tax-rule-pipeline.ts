import { Money } from '../value-objects/money.vo';
import { TaxLineItem } from '../entities/transaction.entity';
import { TaxCalculationContext, TaxCalculationResult } from './tax-strategy.interface';

/**
 * A single handler in the tax rule pipeline.
 *
 * Chain of Responsibility Pattern: each handler processes the context,
 * optionally modifies the running result, then passes control to the next handler.
 *
 * Use cases: exemption checks, surcharge application, rate overrides, audit logging.
 */
export interface ITaxPipelineHandler {
  /**
   * Process the context and return a (possibly modified) result.
   * Receives the accumulated result from upstream handlers.
   */
  handle(
    context: TaxCalculationContext,
    currentResult: TaxCalculationResult,
  ): TaxCalculationResult;
}

/**
 * Exemption Handler — if the transaction is exempt, zeroes out all taxes.
 * Placed at the start of the pipeline to short-circuit exempt transactions.
 */
export class ExemptionHandler implements ITaxPipelineHandler {
  public handle(
    context: TaxCalculationContext,
    currentResult: TaxCalculationResult,
  ): TaxCalculationResult {
    if (context.isExempt) {
      return {
        totalTax: Money.zero(context.subtotal.currency),
        breakdown: [
          {
            ruleName: `Tax Exempt (Certificate: ${context.exemptionCertificateId ?? 'N/A'})`,
            ratePercent: '0.00',
            amount: Money.zero(context.subtotal.currency),
          },
        ],
      };
    }
    return currentResult;
  }
}

/**
 * Minimum Tax Handler — enforces a floor on the tax amount (if business rules require).
 */
export class MinimumTaxHandler implements ITaxPipelineHandler {
  constructor(private readonly minimumTax: Money) {}

  public handle(
    _context: TaxCalculationContext,
    currentResult: TaxCalculationResult,
  ): TaxCalculationResult {
    if (currentResult.totalTax.lessThan(this.minimumTax)) {
      return {
        totalTax: this.minimumTax,
        breakdown: [
          ...currentResult.breakdown,
          {
            ruleName: 'Minimum Tax Floor Applied',
            ratePercent: 'N/A',
            amount: this.minimumTax.subtract(currentResult.totalTax),
          },
        ],
      };
    }
    return currentResult;
  }
}

/**
 * Surcharge Handler — adds a flat or percentage surcharge on top of calculated tax.
 * Decorator-like behaviour applied via the pipeline.
 */
export class SurchargeHandler implements ITaxPipelineHandler {
  constructor(
    private readonly surchargePercent: number,
    private readonly label: string,
  ) {}

  public handle(
    context: TaxCalculationContext,
    currentResult: TaxCalculationResult,
  ): TaxCalculationResult {
    if (this.surchargePercent <= 0) return currentResult;

    const surchargeRate = this.surchargePercent / 100;
    const surchargeAmount = context.subtotal.multiply(surchargeRate).round();
    const newBreakdown: TaxLineItem[] = [
      ...currentResult.breakdown,
      {
        ruleName: this.label,
        ratePercent: this.surchargePercent.toFixed(2),
        amount: surchargeAmount,
      },
    ];

    return {
      totalTax: currentResult.totalTax.add(surchargeAmount),
      breakdown: newBreakdown,
    };
  }
}

/**
 * TaxRulePipeline — orchestrates a chain of handlers around a base tax calculation.
 *
 * Chain of Responsibility: handlers are composed in order and each can
 * transform, augment, or short-circuit the result.
 *
 * This separates cross-cutting concerns (exemptions, surcharges, auditing)
 * from the core tax strategy logic (Single Responsibility Principle).
 */
export class TaxRulePipeline {
  private readonly handlers: ITaxPipelineHandler[] = [];

  /**
   * Add a handler to the end of the pipeline.
   */
  public addHandler(handler: ITaxPipelineHandler): TaxRulePipeline {
    this.handlers.push(handler);
    return this; // fluent interface (Builder-like)
  }

  /**
   * Execute the pipeline: run the base result through all handlers sequentially.
   */
  public execute(
    context: TaxCalculationContext,
    baseResult: TaxCalculationResult,
  ): TaxCalculationResult {
    return this.handlers.reduce<TaxCalculationResult>(
      (result, handler) => handler.handle(context, result),
      baseResult,
    );
  }
}
