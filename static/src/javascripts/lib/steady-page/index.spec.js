// @flow

import fastdom from 'lib/fastdom-promise';
import { insert as steadyPage } from './index.js';
import { calculateContainerHeights } from './calculateContainerHeights.js';

jest.mock('lib/config', () => ({
    switches: {
        steadyPageUtil: true,
    },
}));

jest.mock('./calculateContainerHeights', () => ({
    calculateContainerHeights: jest.fn(),
}));

describe('steadyPage', () => {
    const insertedElHeight = 100;
    const prevScrollPos = 1000;

    const insertElement = (className, container) => () => {
        const elem = document.createElement('div');

        elem.classList.add(className);

        container.appendChild(elem);
    };

    const addContainers = count => {
        let i;
        let container;
        const containers = [];

        for (i = 0; i < count; i + 1) {
            container = document.createElement('div');
            container.classList.add('js-steady-container');
            container.classList.add(`js-steady-container-${i}`);
            containers.push(container);
            document.body.appendChild(container);
        }

        return containers;
    };

    const removeContainers = () => {
        const containers = document.querySelectorAll('.js-steady-container');

        Array.prototype.map.call(containers, container => {
            container.remove();
        });
    };

    beforeEach(() => {
        window.scrollY = prevScrollPos;

        window.scrollTo = jest.fn();
    });

    afterEach(() => {
        removeContainers();
    });

    it('should exist', () => {
        expect(steadyPage).toBeDefined();
    });

    it('should call scrollTo if container height increases after inserting one element', done => {
        calculateContainerHeights
            .mockImplementationOnce(() => Promise.resolve(0))
            .mockImplementationOnce(() => Promise.resolve(insertedElHeight));

        const container = addContainers(1)[0];

        steadyPage
            .insert(
                container,
                insertElement('js-inserted-container', container)
            )
            .then(() => {
                // scrollTo should be called with the scroll position and the inserted element
                expect(window.scrollTo).toHaveBeenCalledWith(
                    0,
                    prevScrollPos + insertedElHeight
                );
                // the container should be inserted
                expect(
                    document.getElementsByClassName('js-inserted-container')
                        .length
                ).toBeTruthy();
                done();
            });
    });

    it('should call scrollTo with the height of the three inserted elements', done => {
        calculateContainerHeights
            .mockImplementationOnce(() => Promise.resolve(0))
            .mockImplementationOnce(() => Promise.resolve(insertedElHeight))
            .mockImplementationOnce(() => Promise.resolve(0))
            .mockImplementationOnce(() =>
                Promise.resolve(insertedElHeight * 2)
            );

        const containers = addContainers(3);

        Promise.all(
            containers.map((container, i) =>
                steadyPage.insert(
                    container,
                    insertElement(`js-inserted-container-${i}`, container)
                )
            )
        ).then(() => {
            expect(window.scrollTo).toHaveBeenCalledWith(
                0,
                prevScrollPos + insertedElHeight * 3
            );
            expect(
                document.getElementsByClassName('js-inserted-container-0')
                    .length
            ).toBeTruthy();
            expect(
                document.getElementsByClassName('js-inserted-container-1')
                    .length
            ).toBeTruthy();
            expect(
                document.getElementsByClassName('js-inserted-container-2')
                    .length
            ).toBeTruthy();
            done();
        });
    });

    it('should call scrollTo with the height of the two inserted element when the second insertion is called after the initial fastdom read', done => {
        calculateContainerHeights
            .mockImplementationOnce(() => Promise.resolve(0))
            .mockImplementationOnce(() => Promise.resolve(insertedElHeight))
            .mockImplementationOnce(() => Promise.resolve(0))
            .mockImplementationOnce(() => Promise.resolve(insertedElHeight));

        const containers = addContainers(2);

        const firstInsert = steadyPage.insert(
            containers[0],
            insertElement('js-inserted-container-0', containers[0])
        );

        const secondInsert = fastdom.write(() => {
            steadyPage.insert(
                containers[1],
                insertElement('js-inserted-container-1', containers[1])
            );
        });

        Promise.all([firstInsert, secondInsert]).then(() => {
            // We don't expect scrollTo to have been called with the height of one container
            expect(window.scrollTo).not.toHaveBeenCalledWith(
                0,
                prevScrollPos + insertedElHeight
            );
            // We should have called scrollTo with the previous scroll position and 2 times the container height
            expect(window.scrollTo).toHaveBeenCalledWith(
                0,
                prevScrollPos + insertedElHeight * 2
            );
            expect(
                document.getElementsByClassName('js-inserted-container-0')
                    .length
            ).toBeTruthy();
            expect(
                document.getElementsByClassName('js-inserted-container-1')
                    .length
            ).toBeTruthy();
            done();
        });
    });
});
