import { cpus } from "node:os";
import { normalize, resolve, parse, } from "node:path";
import { stat, mkdir, readdir, writeFile, } from "node:fs/promises";

import { promisify, } from "util";
import child_process from "child_process";
const exec = promisify(child_process.exec);

import { SingleBar, } from "cli-progress";
import { fileTypeFromFile } from "file-type";
import { chunk } from "lodash-es";
import bytes from "bytes";

import processAVIFStdout, { AVIFStdout, } from "./processAVIFStdout.js";
import median from "./median.js";
import stdDev from "./stdDev.js";

const AVIFENC_ARG = "-j 8";
const MAX_CPU_CORES = 8;

if (!process?.argv[2]) {
    throw "Input path is required. Exiting... ";
}

import progressBar from "./progressBar.js";

const target = normalize(process?.argv[2]);

let info;
try {
    info = await stat(target);
} catch (e) {
    console.error(e);
    throw e;
}
if (!info.isDirectory()) {
    throw "Input path is not a directory. Exiting... ";
}

const { base } = parse(target);
const outputName = base.toLowerCase().includes("jpeg") || base.toLowerCase().includes("jpg") ?
    base.replace(/jpeg/gi, "AVIF").replace(/jpg/gi, "AVIF") : `${ base }_avif`
const outputDir = resolve(target, "..", `${ outputName }`);

try {
    await mkdir(outputDir);
} catch (e: any) {
    if (e.code === "EEXIST") {
        console.log("Output folder already exists. Skipping mkdir...");
    } else {
        console.error(e);
        throw e;
    }
}

try {
    const dir = await readdir(target);
    const overall = progressBar.create(dir.length, 0, { "title": "Overall ", });

    let totalOriginalSize = 0;
    let totalAVIFSize = 0;

    // TODO: refactor it into a queue-worker structure for extensibility
    // TODO: deduplicate files to reduce workload
    const coreCount = cpus().length > MAX_CPU_CORES ? MAX_CPU_CORES : cpus().length - 1;
    const chunks = chunk(dir, Math.ceil(dir.length / coreCount));
    const chunkProgressBars: SingleBar[] = chunks.map(
        (chunk: string[], ind) =>
            progressBar.create(chunk.length, 0, { "title": `Worker ${ ind + 1 }`, })
    );
    const footer = progressBar.create(100, 0, {}, { "format": "Size: {avifSize} vs. {originalSize} | {delta}"});
    const results: AVIFStdout[] = [];
    await Promise.allSettled(
        chunks.map(
            async (chunk, ind) => {
                const chunkBar = chunkProgressBars[ind];
                for (const item of chunk) {
                    const inputPath = normalize(`${ target }\\\\${ item }`);
                    const stats = await stat(inputPath);
                    if (stats.isFile()) {
                        const { name } = parse(inputPath);
                        const outputPath = resolve(outputDir, `${ name }.avif`);

                        const fileType = await fileTypeFromFile(inputPath);

                        const regex = /image\/\S+/g;
                        if (fileType?.mime && regex.test(fileType.mime)) {
                            // console.log(`Processing ${ inputPath }...`);
                            const {
                                stdout, stderr
                            } = await exec(`.\\lib\\libavif\\avifenc.exe ${ AVIFENC_ARG } "${ inputPath }" "${ outputPath }"`);

                            const result = await processAVIFStdout(stdout);
                            results.push(result);

                            const { colorSizeBytes, alphaSizeBytes, } = result;
                            totalAVIFSize += colorSizeBytes + alphaSizeBytes;

                            const { size } = await stat(inputPath);
                            totalOriginalSize += size;

                            const saving = (totalAVIFSize - totalOriginalSize) / totalOriginalSize * 100;

                            overall.increment();
                            chunkBar.increment();
                            footer.update({ "avifSize": bytes(totalAVIFSize), "originalSize": bytes(totalOriginalSize), "delta": `${saving.toFixed(2)}%` });

                            await writeFile("test.txt", stdout);
                        }
                    }
                }
            }
        )
    );

    progressBar.stop();

    // const saving = (totalAVIFSize - totalOriginalSize) / totalOriginalSize * 100;
    // console.log(`Size: ${ bytes(totalAVIFSize) } vs. ${ bytes(totalOriginalSize) } | ${ saving.toFixed(2) }%`);

    const sizes = results.map(({ colorSizeBytes, alphaSizeBytes, }) => colorSizeBytes + alphaSizeBytes);
    console.log(`Max: ${ bytes(Math.max(...sizes)) } | Min: ${ bytes(Math.min(...sizes)) } | Mean: ${ bytes(totalAVIFSize / dir.length) } | Median: ${ bytes(<number>median(sizes)) } | Std. Dev.: ${ bytes(<number>stdDev(sizes)) }`)
    // TODO: output AVIF size distribution
    // TODO: input image resolution distribution
    // TODO: compute and report dssim
} catch (e) {
    console.error(e);
    throw e;
}
