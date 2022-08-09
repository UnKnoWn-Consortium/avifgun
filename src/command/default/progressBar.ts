import { MultiBar, Presets, } from "cli-progress";
import colors from "ansi-colors";

const progressBar = new MultiBar(
    {
        "format": `{title} |${ colors.cyan("{bar}") }| {percentage}% || {value}/{total} Images`,
        "clearOnComplete": false,
        "hideCursor": true,
    },
    Presets.shades_classic
);

export default progressBar;
