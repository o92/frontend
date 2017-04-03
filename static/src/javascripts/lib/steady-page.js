// @flow

import fastdom from 'lib/fastdom-promise';
import config from 'lib/config';

class Queue {
    queue: Array;

    constructor(): void {
        this.queue = [];
    }

    enqueue(item) {
        return this.queue.push(item);
    }

    dequeue() {
        return this.queue.shift();
    }

    isEmpty(): Boolean {
        return this.queue.length === 0;
    }
}

const q = new Queue();
let isRunning = false;
let promise;

/**
    Insert an element into the page
    Use if your element doesn't exist and is inserted into a container
    ** Don't use fastdom - it is handled in this utility **
*/

const insert = (container: HTMLElement, cb: Funciton) => {
    if (!config.switches.steadyPageUtil) {
        return fastdom.write(cb);
    }

    const initialState = {
        scrollY: window.scrollY,
        prevHeight: 0,
    };

    q.enqueue({
        container,
        cb,
    });

    return isRunning ? promise : go(initialState);
};

// Given a batch, call all of the callbacks on the insertion object
const insertElements = (batch: Array): void => fastdom.write(() => {
    batch.forEach(insertion => insertion.cb());
});

/*
    Given a batch and a previous currentBatchHeight, measure the height of
    each container in the batch
*/
const getHeightOfAllContainers = (batch: Array) => {
    let viewportHeight;

    /*
        If the element has height
        - and the user has scrolled
        - and the distance from the top of the element to the top of the
          viewport is less
        - than the viewport height then we know the page will be yanked
    */
    const elementIsAbove = (el: HTMLElement): Boolean => {
        const elTopPos = el.container.getBoundingClientRect().top;
        const { offsetHeight } = el.container;
        const { scrollY } = window;

        return offsetHeight > -1 &&
            scrollY > 0 &&
            elTopPos < Math.max(viewportHeight, offsetHeight || 0);
    };

    const readHeight = (el: HTMLElement): number => {
        const style = getComputedStyle(el);
        const height = el.offsetHeight +
            parseInt(style.marginTop, 10) +
            parseInt(style.marginBottom, 10);

        return isNaN(height) ? 0 : height;
    };

    return fastdom.read(() => {
        viewportHeight = Math.max(
            document.documentElement.clientHeight,
            window.innerHeight || 0
        );

        // Add all the heights of the passed in batch removing the current height
        return batch
            .filter(elementIsAbove)
            .reduce(
                (height, insertion) => height + readHeight(insertion.container),
                0
            );
    });
};

/*
    Process the insertion operation:
      1. Calculate the original height of the container
      2. Apply the insertion functions for all inserted elements
      3. Calculate the new height of the container
      4. Adjust the scroll position to account for the new container height
*/

const go = (state: Object): ?Promise<any> => {
    isRunning = true;

    const batch = [];
    const scroll = (heights: Object): ?Promise<any> => {
        if (q.isEmpty()) {
            /*
                If the queue is empty (no more elements need to be added
                to the page) we immediately scroll
            */
            const scrollY = state.newHeight + state.prevHeight + state.scrollY;

            if (scrollY) {
                window.scrollTo(0, scrollY);
            }

            isRunning = false;
        } else {
            /*
                If there are elements waiting to be added to the page we
                take the previous container's heights and recursively call
                the function so that we only scroll the page once the queue
                is empty - this prevents excessive and jarring scrolling
            */
            return go(
                Object.assign(heights, {
                    prevHeight: state.prevHeight + state.newHeight,
                })
            );
        }

        return undefined;
    };

    let batchHeightsBeforeInsert;

    // Take the current queue items and add them to the batch array
    while (!q.isEmpty()) {
        batch.push(q.dequeue());
    }

    promise = Promise.resolve(getHeightOfAllContainers(batch))
        .then(heightsBeforeIns => {
            batchHeightsBeforeInsert = heightsBeforeIns || 0;
            return insertElements(batch);
        })
        .then(() => getHeightOfAllContainers(batch).then(newHeights => {
            scroll(
                Object.assign(state, {
                    newHeight: newHeights - batchHeightsBeforeInsert,
                })
            );
        }));

    return promise;
};

export default {
    insert,
    _tests: {
        getHeightOfAllContainers,
        insertElements,
    },
};
