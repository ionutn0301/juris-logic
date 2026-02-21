import { ValueObject } from './value-object.base';

/**
 * Supported top-level jurisdiction regions.
 */
export enum JurisdictionRegion {
  US = 'US',
  EU = 'EU',
  UK = 'UK',
  CA = 'CA',
}

interface JurisdictionCodeProps {
  country: string;
  region: JurisdictionRegion;
  state?: string;
  county?: string;
  city?: string;
}

/**
 * JurisdictionCode Value Object — uniquely identifies a tax jurisdiction
 * at multiple levels of granularity (country → state → county → city).
 *
 * Encodes the multi-level hierarchy needed for US sales tax, EU VAT, etc.
 */
export class JurisdictionCode extends ValueObject<JurisdictionCodeProps> {
  private constructor(props: JurisdictionCodeProps) {
    super(props);
  }

  public static create(params: {
    country: string;
    region: JurisdictionRegion;
    state?: string;
    county?: string;
    city?: string;
  }): JurisdictionCode {
    if (!params.country || params.country.trim().length === 0) {
      throw new Error('Country code is required for JurisdictionCode.');
    }
    return new JurisdictionCode({
      country: params.country.toUpperCase(),
      region: params.region,
      state: params.state?.toUpperCase(),
      county: params.county?.toUpperCase(),
      city: params.city?.toUpperCase(),
    });
  }

  // ─── Convenience Factories ────────────────────────────────────

  public static us(state?: string, county?: string, city?: string): JurisdictionCode {
    return JurisdictionCode.create({
      country: 'US',
      region: JurisdictionRegion.US,
      state,
      county,
      city,
    });
  }

  public static eu(country: string): JurisdictionCode {
    return JurisdictionCode.create({ country, region: JurisdictionRegion.EU });
  }

  public static uk(): JurisdictionCode {
    return JurisdictionCode.create({ country: 'GB', region: JurisdictionRegion.UK });
  }

  public static ca(province?: string): JurisdictionCode {
    return JurisdictionCode.create({
      country: 'CA',
      region: JurisdictionRegion.CA,
      state: province,
    });
  }

  // ─── Getters ──────────────────────────────────────────────────

  public get country(): string {
    return this.props.country;
  }

  public get region(): JurisdictionRegion {
    return this.props.region;
  }

  public get state(): string | undefined {
    return this.props.state;
  }

  public get county(): string | undefined {
    return this.props.county;
  }

  public get city(): string | undefined {
    return this.props.city;
  }

  // ─── Utilities ────────────────────────────────────────────────

  /**
   * Returns a canonical string key for caching / lookups (e.g., "US:CA:LOS_ANGELES:LA").
   */
  public toKey(): string {
    const parts = [this.country, this.state, this.county, this.city].filter(Boolean);
    return parts.join(':');
  }

  public toString(): string {
    return this.toKey();
  }

  public toJSON(): JurisdictionCodeProps {
    return { ...this.props };
  }
}
