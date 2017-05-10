// @flow
import fastdom from 'lib/fastdom-promise';

/*
    Given a batch and a previous currentBatchHeight, measure the height of
    each container in the batch
*/
const calculateContainerHeights = (batch: Array<any>): Promise<number> => {
    let viewportHeight;

    /*
        If the element has height
        - and the user has scrolled
        - and the distance from the top of the element to the top of the
          viewport is less
        - than the viewport height then we know the page will be yanked
    */
    const elementIsAbove = (el: Object): boolean => {
        const elTopPos = el.container.getBoundingClientRect().top;
        const { offsetHeight } = el.container;
        const { scrollY } = window;

        return (
            offsetHeight > -1 &&
            scrollY > 0 &&
            elTopPos < Math.max(viewportHeight, offsetHeight || 0)
        );
    };

    const readHeight = (el: HTMLElement): number => {
        const style = getComputedStyle(el);
        const height =
            el.offsetHeight +
            parseInt(style.marginTop, 10) +
            parseInt(style.marginBottom, 10);

        return isNaN(height) ? 0 : height;
    };

    return fastdom.read(() => {
        const docElement = document.documentElement;

        if (!docElement) {
            return [];
        }

        viewportHeight = Math.max(
            docElement.clientHeight,
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

export { calculateContainerHeights };
