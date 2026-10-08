export const ICON_WIDTH = 32;

export const labelButtonWidth = (label: string): number =>
    Math.round(label.length * 7.2 + 24);

export const actionColumnWidth = <T>(
    rows: readonly T[],
    buttonWidthsOf: (row: T) => number[],
    opts: {
        min?: number;
        max?: number;
        gap?: number;
        pad?: number;
    } = {},
): number => {
    const {
        min = 72,
        max = 320,
        gap = 4,
        pad = 16,
    } = opts;

    const maxRowWidth = rows.reduce((maxWidth, row) => {
        const widths = buttonWidthsOf(row);

        if (widths.length === 0) {
            return maxWidth;
        }

        const buttonsWidth = widths.reduce(
            (sum, width) => sum + width,
            0,
        );

        const gapsWidth = Math.max(widths.length - 1, 0) * gap;

        return Math.max(
            maxWidth,
            buttonsWidth + gapsWidth,
        );
    }, 0);

    return Math.min(
        Math.max(maxRowWidth + pad, min),
        max,
    );
};