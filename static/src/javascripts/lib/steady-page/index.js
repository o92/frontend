// @flow

import config from 'lib/config';
import fastdom from 'lib/fastdom-promise';
import { calculateContainerHeights } from './calculateContainerHeights';
import Queue from './queue';

const queue = new Queue();
let isRunning = false;
let promise;

// Given a batch, call all of the callbacks on the insertion object
const insertElements = (batch: Array<any>): Promise<void> =>
    fastdom.write(() => {
        batch.forEach(insertion => insertion.cb());
    });

/*
    Process the insertion operation:
      1. Calculate the original height of the container
      2. Apply the insertion functions for all inserted elements
      3. Calculate the new height of the container
      4. Adjust the scroll position to account for the new container height
*/
const go = (state: Object): Promise<void> => {
    isRunning = true;

    const batch = [];
    const scroll = (heights: Object): ?Promise<any> => {
        if (queue.isEmpty()) {
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
    while (!queue.isEmpty()) {
        batch.push(queue.dequeue());
    }

    promise = calculateContainerHeights(batch)
        .then(heightsBeforeIns => {
            batchHeightsBeforeInsert = heightsBeforeIns || 0;
            return insertElements(batch);
        })
        .then(() => calculateContainerHeights(batch))
        .then(heightsAfterIns => {
            const opts = Object.assign(state, {
                newHeight: heightsAfterIns - batchHeightsBeforeInsert,
            });

            return scroll(opts);
        });

    return promise;
};

/**
    Insert an element into the page
    Use if your element doesn't exist and is inserted into a container
    ** Don't use fastdom - it is handled in this utility **
*/
const insert = (container: HTMLElement, cb: Function): Promise<void> => {
    if (!config.switches.steadyPageUtil) {
        return fastdom.write(cb);
    }

    const initialState = {
        scrollY: window.scrollY,
        prevHeight: 0,
    };

    queue.enqueue({ container, cb });

    return isRunning ? promise : go(initialState);
};

export { insert };
