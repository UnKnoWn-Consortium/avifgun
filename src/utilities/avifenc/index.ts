import { writeFile, } from "node:fs/promises";
import { resolve, } from "node:path";

import appRoot from "app-root-path";

import { promisify, } from "node:util";
import child_process from "node:child_process";
const exec = promisify(child_process.exec);

import { LIBAVIF_COMMIT_HASH, AVIFENC_ARG, } from "../../constants.js";
import processAVIFStdout, { AVIFStdout, } from "../../command/default/processAVIFStdout.js";

async function avifenc (pathToOriginal: string, pathToArtefact: string): Promise<AVIFStdout> {
    const pathToBinary = resolve(appRoot.toString(), "lib", "libavif", LIBAVIF_COMMIT_HASH, "avifenc.exe");
    const {
        stdout, stderr
    } = await exec(`${ pathToBinary } ${ AVIFENC_ARG } "${ pathToOriginal }" "${ pathToArtefact }"`);

    // TODO: append file
    await writeFile("test.txt", stdout);
    return await processAVIFStdout(stdout);
}

export default avifenc;
