/**
 * Base class for all Value Objects in the domain.
 * Value Objects are immutable and compared by structural equality.
 * Follows DDD principles — identity is derived from properties, not a key.
 */
export abstract class ValueObject<T extends object> {
  protected readonly props: Readonly<T>;

  protected constructor(props: T) {
    this.props = Object.freeze({ ...props });
  }

  /**
   * Structural equality: two Value Objects are equal if all their properties match.
   */
  public equals(other: ValueObject<T>): boolean {
    if (other === null || other === undefined) return false;
    if (other.constructor !== this.constructor) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }

  /**
   * Returns an immutable copy of the internal properties.
   */
  public toValue(): Readonly<T> {
    return this.props;
  }
}
