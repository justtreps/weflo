export type SubmissionLock = {
  readonly locked: boolean;
  tryAcquire(): boolean;
  release(): void;
};

export function createSubmissionLock(): SubmissionLock {
  let locked = false;
  return {
    get locked() { return locked; },
    tryAcquire() {
      if (locked) return false;
      locked = true;
      return true;
    },
    release() { locked = false; },
  };
}
