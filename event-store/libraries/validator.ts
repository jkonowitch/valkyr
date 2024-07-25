import type { EventRecord } from "../types/event.ts";
import { Queue } from "./queue.ts";

export class Validator<Record extends EventRecord> {
  #listeners: Listeners<any> = {};
  #queue: Queue<Record>;

  constructor() {
    this.validate = this.validate.bind(this);
    this.#queue = new Queue(async (event) => {
      return Promise.all(Array.from(this.#listeners[event.type] || []).map((fn) => fn(event)));
    });
  }

  /**
   * Validate a event before its committed to the event store. Throwing an error results
   * in invalidation, otherwise the event is committed.
   *
   * @param record - Event record to validate.
   */
  async validate(record: Record): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.#queue.push(record, resolve, reject);
    });
  }

  /**
   * Register a validation handler for a specific event type used to validate the event
   * before its committed to the event store. Throwing an error results in invalidation,
   * otherwise the event is committed.
   *
   * @param type    - Event type to register the validation handler for.
   * @param handler - Validation handler to register.
   *
   * @returns function to unregister the validation handler.
   */
  on<T extends Record["type"], R extends Record = Extract<Record, { type: T }>>(
    type: T,
    handler: ValidationHandler<R>,
  ): () => void {
    const listeners = (this.#listeners[type] ?? (this.#listeners[type] = new Set())).add(handler);
    return () => {
      listeners.delete(handler);
    };
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type Listeners<R extends EventRecord> = Record<string, Set<ValidationHandler<R>>>;

type ValidationHandler<Record extends EventRecord> = (record: Record) => Promise<void>;
