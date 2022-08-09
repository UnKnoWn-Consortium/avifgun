import { writeFile, } from "node:fs/promises";

import { fileURLToPath, } from "node:url";
import { parse, resolve, } from "node:path";
const dirname = parse(fileURLToPath(import.meta.url)).dir;

import { promisify, } from "node:util";
import child_process from "node:child_process";
const exec = promisify(child_process.exec);

import { AVIFENC_ARG, } from "../../constants.js";
import processAVIFStdout, { AVIFStdout, } from "../../command/default/processAVIFStdout.js";

async function avifenc (pathToOriginal: string, pathToArtefact: string): Promise<AVIFStdout> {
    const pathToBinary = resolve(dirname, "..", "..", "..", "lib", "libavif", "avifenc.exe");
    const {
        stdout, stderr
    } = await exec(`${ pathToBinary } ${ AVIFENC_ARG } "${ pathToOriginal }" "${ pathToArtefact }"`);

    await writeFile("test.txt", stdout);

    return await processAVIFStdout(stdout);
}

export default avifenc;
