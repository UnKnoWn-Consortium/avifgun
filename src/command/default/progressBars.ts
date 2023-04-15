import {MultiBar, Presets, SingleBar,} from "cli-progress";
import colors from "ansi-colors";

export function progressBarFactory (total: number, numOfProcesses: number) {
    const bars = new MultiBar(
        {
            "format": `{title} |${ colors.cyan("{bar}") }| {percentage}% || {value} images processed`,
            "clearOnComplete": false,
            "hideCursor": true,
        },
        Presets.shades_classic
    );

    const header = bars.create(
        total,
        0,
        { "title": "Overall ", },
        { "format": `{title} |${ colors.cyan("{bar}") }| {percentage}% || {value}/{total} images processed` }
    );
    const chunkProgressBars: SingleBar[] = [...Array(numOfProcesses).keys()].map(
        (val, ind) =>
            bars.create(999_999, 0, { "title": `Queue ${ ind + 1 } `, },)
    );
    const footer = bars.create(
        100,
        0,
        {},
        { "format": `{avifSize} vs. {originalSize} | {delta} | DSSIM: {dssim} | {elapsed} elapsed | {fps}` }
    );

    return {
        bars, header, chunkProgressBars, footer,
    }
}
