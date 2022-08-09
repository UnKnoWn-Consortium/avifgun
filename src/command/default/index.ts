import { hrtime } from "node:process";
import { cpus } from "node:os";
import { normalize, resolve, parse, } from "node:path";
import { stat, mkdir, readdir, } from "node:fs/promises";

import { Command } from "commander";
import { SingleBar, } from "cli-progress";
import { fileTypeFromFile } from "file-type";
import { chunk } from "lodash-es";
import bytes from "bytes";
import { formatDuration } from "date-fns";

import dssim from "../../utilities/dssim/index.js";
import avifenc from "../../utilities/avifenc/index.js";
import { AVIFStdout, } from "./processAVIFStdout.js";
import progressBar from "./progressBar.js";

import sum from "../../utilities/statistics/sum.js";
import median from "../../utilities/statistics/median.js";
import stdDev from "../../utilities/statistics/stdDev.js";

const MAX_CPU_CORES = 8;

interface CommandOptions {
    recursive: boolean;
    verbose: boolean;
}

async function avifgun (input: string, output: string | undefined, options: CommandOptions, command: Command) {
    console.log(input, output, options);

    const isRecursive = options.recursive;
    const target = normalize(input);

    let info;
    try {
        info = await stat(target);
    } catch (e) {
        console.error(e);
        throw e;
    }

    if (isRecursive ? !info.isDirectory() : info.isDirectory()) {
        command.error(
            isRecursive ?
                "Input path is not a directory. Remove the -R or --recursive option" :
                "Input path is a directory. Have you missed the -R or --recursive option?"
        );
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
        let totalDSSIM = 0;

        const results: AVIFStdout[] = [];
        const dssims: number[] = [];

        // TODO: refactor it into a queue-worker structure for extensibility
        // TODO: deduplicate files to reduce workload
        const coreCount = cpus().length > MAX_CPU_CORES ? MAX_CPU_CORES : cpus().length - 1;
        const chunks = chunk(dir, Math.ceil(dir.length / coreCount));
        const chunkProgressBars: SingleBar[] = chunks.map(
            (chunk: string[], ind) =>
                progressBar.create(chunk.length, 0, { "title": `Queue ${ ind + 1 } `, })
        );
        const footer = progressBar.create(100, 0, {}, { "format": "{avifSize} vs. {originalSize} | {delta} | DSSIM: {dssim} | {elapsed} elapsed"});
        footer.update({ "avifSize": "TBA", "originalSize": "TBA", "delta": "TBA%", "dssim": "TBA", "elapsed": "0 second" });

        const startTime = hrtime.bigint();

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

                                const result = await avifenc(inputPath, outputPath);
                                results.push(result);

                                const dssimVal = await dssim(inputPath, outputPath);
                                totalDSSIM += dssimVal;
                                dssims.push(dssimVal);

                                const { colorSizeBytes, alphaSizeBytes, } = result;
                                totalAVIFSize += colorSizeBytes + alphaSizeBytes;

                                const { size } = await stat(inputPath);
                                totalOriginalSize += size;

                                const saving = (totalAVIFSize - totalOriginalSize) / totalOriginalSize * 100;

                                overall.increment();
                                chunkBar.increment();
                                footer.update({ "avifSize": bytes(totalAVIFSize), "originalSize": bytes(totalOriginalSize), "delta": `${saving.toFixed(2)}%`, "dssim": (totalDSSIM / dssims.length).toFixed(8) });
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
        console.log(`**SIZE**`);
        console.log(`Max: ${ bytes(Math.max(...sizes)) } | Min: ${ bytes(Math.min(...sizes)) } | Mean: ${ bytes(totalAVIFSize / dir.length) } | Median: ${ bytes(<number>median(sizes)) } | Std. Dev.: ${ bytes(<number>stdDev(sizes)) }`)
        console.log(`**DSSIM**`);
        console.log(`Worst: ${ Math.max(...dssims).toFixed(8) } | Best: ${ Math.min(...dssims).toFixed(8) } | Mean: ${ (<number>sum(dssims) / dir.length).toFixed(8) } | Median: ${ (<number>median(dssims)).toFixed(8) } | Std. Dev.: ${ (<number>stdDev(dssims)).toFixed(8) }`);

        // TODO: input image resolution distribution
    } catch (e) {
        console.error(e);
        throw e;
    }
}

export default avifgun;
