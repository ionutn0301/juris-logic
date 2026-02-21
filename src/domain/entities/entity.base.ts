import { v4 as uuidv4 } from 'uuid';

/**
 * Base class for all Entities in the domain.
 * Entities have a unique identity (id) and are compared by identity, not structure.
 */
export abstract class Entity<T> {
  protected readonly _id: string;
  protected props: T;

  protected constructor(props: T, id?: string) {
    this._id = id ?? uuidv4();
    this.props = props;
  }

  public get id(): string {
    return this._id;
  }

  public equals(other: Entity<T>): boolean {
    if (other === null || other === undefined) return false;
    if (!(other instanceof Entity)) return false;
    return this._id === other._id;
  }
}
