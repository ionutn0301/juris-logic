import { JurisdictionCode, JurisdictionRegion } from '../value-objects/jurisdiction-code.vo';
import { ITaxStrategy } from './tax-strategy.interface';
import { USSalesTaxStrategy } from './implementations/us-sales-tax.strategy';
import { EUVATStrategy } from './implementations/eu-vat.strategy';
import { UKVATStrategy } from './implementations/uk-vat.strategy';
import { CAGSTStrategy } from './implementations/ca-gst.strategy';

/**
 * TaxStrategyFactory — resolves the correct ITaxStrategy for a given jurisdiction.
 *
 * Factory Pattern: centralises strategy creation and decouples callers
 * from knowing which concrete class to instantiate.
 *
 * Open/Closed: to add a new jurisdiction, register a new strategy here —
 * no existing strategy code changes.
 */
export class TaxStrategyFactory {
  private readonly strategyMap: Map<string, ITaxStrategy>;

  constructor() {
    this.strategyMap = new Map<string, ITaxStrategy>();

    // Register all built-in strategies
    this.register(new USSalesTaxStrategy());
    this.register(new EUVATStrategy());
    this.register(new UKVATStrategy());
    this.register(new CAGSTStrategy());
  }

  /**
   * Register a custom strategy (extensibility point for consumers).
   */
  public register(strategy: ITaxStrategy): void {
    this.strategyMap.set(strategy.getSupportedRegion(), strategy);
  }

  /**
   * Resolve the strategy for a given jurisdiction.
   * Throws if no strategy is registered for the region.
   */
  public resolve(jurisdictionCode: JurisdictionCode): ITaxStrategy {
    const region = jurisdictionCode.region;
    const strategy = this.strategyMap.get(region);

    if (!strategy) {
      throw new Error(
        `No tax strategy registered for region "${region}". ` +
          `Available regions: [${Array.from(this.strategyMap.keys()).join(', ')}]`,
      );
    }

    return strategy;
  }

  /**
   * Check if a strategy exists for the given region.
   */
  public hasStrategy(region: JurisdictionRegion): boolean {
    return this.strategyMap.has(region);
  }

  /**
   * List all registered regions.
   */
  public getRegisteredRegions(): string[] {
    return Array.from(this.strategyMap.keys());
  }
}
