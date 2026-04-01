export class InMemoryTaskQueue {
  private chain = Promise.resolve();
  private inFlight = new Map<string, Promise<unknown>>();

  public enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const run = this.chain
      .catch(() => undefined)
      .then(task)
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, run);
    this.chain = run.then(() => undefined, () => undefined);

    return run;
  }
}

