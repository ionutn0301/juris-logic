import { Commission } from '../../domain/entities/commission.entity';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code.vo';

/**
 * Port interface for Commission persistence.
 */
export interface ICommissionRepository {
  findByJurisdiction(jurisdictionCode: JurisdictionCode): Promise<Commission[]>;
  findActiveByJurisdiction(jurisdictionCode: JurisdictionCode, date: Date): Promise<Commission[]>;
  findById(id: string): Promise<Commission | null>;
  save(commission: Commission): Promise<void>;
}

export const COMMISSION_REPOSITORY = Symbol('ICommissionRepository');
