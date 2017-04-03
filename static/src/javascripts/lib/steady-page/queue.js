// @flow

class Queue {
    queue: Array<any>;

    constructor(): void {
        this.queue = [];
    }

    enqueue(item: Object): number {
        return this.queue.push(item);
    }

    dequeue(): any {
        return this.queue.shift();
    }

    isEmpty(): boolean {
        return this.queue.length === 0;
    }
}

export default Queue;
