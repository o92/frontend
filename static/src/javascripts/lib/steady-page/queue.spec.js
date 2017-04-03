// @flow

import Queue from './queue';

describe('Queue', () => {
    let queue;

    beforeEach(() => {
        queue = new Queue();
    });

    test('enqueue()', () => {
        expect(queue.enqueue({})).toBe(1);
        expect(queue.enqueue({})).toBe(2);
    });

    test('dequeue()', () => {
        const FIX_1 = { foo: 'bar' };
        const FIX_2 = { bar: 'baz' };

        expect(queue.dequeue()).toBe(undefined);
        queue.enqueue(FIX_1);
        queue.enqueue(FIX_2);
        expect(queue.dequeue()).toBe(FIX_1);
        expect(queue.dequeue()).toBe(FIX_2);
        expect(queue.dequeue()).toBe(undefined);
    });

    test('isEmpty', () => {
        expect(queue.isEmpty()).toBe(true);
        queue.enqueue({});
        expect(queue.isEmpty()).toBe(false);
    });
});
