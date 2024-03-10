import { hrtime } from "node:process";
import { normalize, resolve, parse, } from "node:path";
import { stat, mkdir, readdir, } from "node:fs/promises";

import { Command } from "commander";
import { fileTypeFromFile } from "file-type";
import bytes from "bytes";
import { formatDuration } from "date-fns";

import { parallel } from "radash";

import dssim from "../../utilities/dssim/index.js";
import avifenc from "../../utilities/avifenc/index.js";
import { AVIFStdout, } from "./processAVIFStdout.js";
import { progressBarFactory } from "./progressBars.js";

import sum from "../../utilities/statistics/sum.js";
import median from "../../utilities/statistics/median.js";
import stdDev from "../../utilities/statistics/stdDev.js";
import { clearInterval } from "node:timers";

const MAX_CPU_THREADS = 8;

interface CommandOptions {
    recursive: boolean;
    verbose: boolean;
    liveDssim: boolean;
    thread: string;
}

async function avifgun (input: string, output: string | undefined, options: CommandOptions, command: Command) {
    console.log(input, output, options);

    const isRecursive = options.recursive;
    const runLiveDSSIM = options.liveDssim;
    const threads = parseInt(options.thread);

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
        const coreCount = threads > MAX_CPU_THREADS ? MAX_CPU_THREADS : threads - 2;

        const { bars, header, chunkProgressBars, footer } = progressBarFactory(dir.length, coreCount);
        footer.update({ "avifSize": "TBA", "originalSize": "TBA", "delta": "TBA%", "dssim": "TBA", "elapsed": "0 second" });

        let totalOriginalSize = 0;
        let totalAVIFSize = 0;
        let totalDSSIM = 0;

        const results: AVIFStdout[] = [];
        const dssims: number[] = [];

        // TODO: deduplicate files to reduce workload

        const startTime = hrtime.bigint();
        const ticker = setInterval(
            () => {
                const tick = hrtime.bigint();
                const seconds = Number(tick - startTime) / 1_000_000_000;
                // @ts-ignore
                const current = header.value;
                footer.update({
                    "elapsed": formatDuration({ "seconds": parseFloat(seconds.toFixed(2)) }),
                    "fps": current === 0 ? "TBD" : `${ (current / seconds).toFixed(2) } images per second`,
                });
            },
            100
        );

        await parallel(
            coreCount,
            dir,
            async (entry, index, queueIndex) => {
                const chunkBar = chunkProgressBars[queueIndex];
                chunkBar.setTotal(chunkBar.getTotal() === 999_999 ? 1 : chunkBar.getTotal() + 1);
                const inputPath = normalize(`${ target }\\\\${ entry }`);
                const stats = await stat(inputPath);
                if (!stats.isFile()) {
                    return;
                }

                const { name } = parse(inputPath);
                const outputPath = resolve(outputDir, `${ name }.avif`);

                const fileType = await fileTypeFromFile(inputPath);

                const regex = /image\/\S+/g;
                const isImage = regex.test(fileType?.mime ?? "")
                const isSvg = fileType?.mime === "application/xml" && inputPath.endsWith(".svg");

                if (!isImage && !isSvg) {
                    return;
                }

                // console.log(`Processing ${ inputPath }...`);

                const result = await avifenc(inputPath, outputPath);
                results.push(result);

                //const dssimVal = await dssim(inputPath, outputPath);
                //totalDSSIM += dssimVal;
                //dssims.push(dssimVal);

                const { colorSizeBytes, alphaSizeBytes, } = result;
                totalAVIFSize += colorSizeBytes + alphaSizeBytes;

                const { size } = await stat(inputPath);
                totalOriginalSize += size;

                const saving = (totalAVIFSize - totalOriginalSize) / totalOriginalSize * 100;

                header.increment();
                chunkBar.increment();
                footer.update({
                    "avifSize": bytes(totalAVIFSize),
                    "originalSize": bytes(totalOriginalSize),
                    "delta": `${saving.toFixed(2)}%`,
                    "dssim": (totalDSSIM / dssims.length).toFixed(8),
                });
            }
        );

        bars.stop();
        clearInterval(ticker);

        const sizes = results.map(({ colorSizeBytes, alphaSizeBytes, }) => colorSizeBytes + alphaSizeBytes);
        console.log(`**SIZE**`);
        console.log(`Max: ${ bytes(Math.max(...sizes)) } | Min: ${ bytes(Math.min(...sizes)) } | Mean: ${ bytes(totalAVIFSize / dir.length) } | Median: ${ bytes(<number>median(sizes)) } | Std. Dev.: ${ bytes(<number>stdDev(sizes)) }`)
        //console.log(`**DSSIM**`);
        //console.log(`Worst: ${ Math.max(...dssims).toFixed(8) } | Best: ${ Math.min(...dssims).toFixed(8) } | Mean: ${ (<number>sum(dssims) / dir.length).toFixed(8) } | Median: ${ (<number>median(dssims)).toFixed(8) } | Std. Dev.: ${ (<number>stdDev(dssims)).toFixed(8) }`);

        // TODO: input image resolution distribution
    } catch (e) {
        console.error(e);
        throw e;
    }
}

export default avifgun;
