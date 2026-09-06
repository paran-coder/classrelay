import test from 'node:test';
import assert from 'node:assert/strict';

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

test('같은 탭의 별도 고위험 작업은 순차 실행된다', async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalBroadcast = globalThis.BroadcastChannel;
  let tail = Promise.resolve();
  const fakeLocks = {
    request(_name, _options, callback) {
      const run = tail.then(() => callback());
      tail = run.catch(() => {});
      return run;
    },
  };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: fakeLocks } });
  globalThis.BroadcastChannel = undefined;
  try {
    const { withOperationLock } = await import(`../assets/coordination.mjs?serial=${Date.now()}`);
    const events = [];
    const first = withOperationLock('first', async () => {
      events.push('first:start');
      await wait(30);
      events.push('first:end');
    });
    await wait(5);
    const second = withOperationLock('second', async () => {
      events.push('second:start');
      await wait(1);
      events.push('second:end');
    });
    await Promise.all([first, second]);
    assert.deepEqual(events, ['first:start', 'first:end', 'second:start', 'second:end']);
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
    globalThis.BroadcastChannel = originalBroadcast;
  }
});
