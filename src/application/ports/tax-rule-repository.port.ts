import { TaxRule } from '../../domain/entities/tax-rule.entity';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code.vo';

/**
 * Port interface for TaxRule persistence (Dependency Inversion Principle).
 *
 * The application layer depends on this abstraction — never on concrete
 * Prisma/SQL implementations. Infrastructure provides the adapter.
 */
export interface ITaxRuleRepository {
  findByJurisdiction(jurisdictionCode: JurisdictionCode): Promise<TaxRule[]>;
  findActiveByJurisdiction(jurisdictionCode: JurisdictionCode, date: Date): Promise<TaxRule[]>;
  findById(id: string): Promise<TaxRule | null>;
  save(taxRule: TaxRule): Promise<void>;
  saveMany(taxRules: TaxRule[]): Promise<void>;
}

/**
 * NestJS injection token for ITaxRuleRepository.
 */
export const TAX_RULE_REPOSITORY = Symbol('ITaxRuleRepository');
