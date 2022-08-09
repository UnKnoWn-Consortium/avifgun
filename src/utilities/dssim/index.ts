import { fileURLToPath, } from "node:url";
import { parse, resolve, } from "node:path";
const dirname = parse(fileURLToPath(import.meta.url)).dir;

import { promisify, } from "node:util";
import child_process from "node:child_process";
const exec = promisify(child_process.exec);

async function dssim (pathToOriginal: string, pathToArtefact: string): Promise<number> {
    const pathToBinary = resolve(dirname, "..", "..", "..", "lib", "dssim", "dssim.exe");
    const {
        stdout, stderr
    } = await exec(`${ pathToBinary } "${ pathToOriginal }" "${ pathToArtefact }"`);
    return parseFloat(stdout.split(" ")[0]);
}

export default dssim;
