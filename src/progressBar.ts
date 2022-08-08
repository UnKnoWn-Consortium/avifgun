import { MultiBar, Presets, } from "cli-progress";
import colors from "ansi-colors";

const progressBar = new MultiBar({
    "clearOnComplete": false,
    "format": `{title} |${ colors.cyan("{bar}") }| {percentage}% || {value}/{total} Images`,
    "hideCursor": true,
}, Presets.shades_classic);

export default progressBar;
