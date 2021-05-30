import { normalize, resolve, parse, } from "path";
import fs from "fs/promises";

import { promisify, } from "util";
import child_process from "child_process";
const exec = promisify(child_process.exec);

import { fromFile, } from "file-type";

const AVIFENC_ARG = "-j 16";

(async () => {
    if (!process?.argv[2]) {
        throw "Input path is required. Exiting... ";
    }

    const target = normalize(process?.argv[2]);

    let info;
    try {
        info = await fs.stat(target);
    } catch (e) {
        console.error(e);
        throw e;
    }
    if (!info.isDirectory()) {
        throw "Input path is not a directory. Exiting... ";
    }

    const pathInfo = parse(target);
    const outputDir = resolve(target, "..", `${ pathInfo.name }_avif`);
    try {
        await fs.mkdir(outputDir);
    } catch (e) {
        if (e.code === "EEXIST") {
            console.log("Output folder already exists. Skipping mkdir...");
        } else {
            console.error(e);
            throw e;
        }
    }

    let dir;
    try {
        dir = await fs.opendir(target);
    } catch (e) {
        console.error(e);
        throw e;
    }

    for await (const dirent of dir) {
        if (dirent.isFile()) {
            const inputPath = normalize(`${ target }\\\\${ dirent.name }`);

            const { name } = parse(inputPath);
            const outputPath = resolve(outputDir, `${ name }.avif`);

            const { mime } = await fromFile(inputPath);

            if (["image/jpeg", ].includes(mime)) {
                console.log(`Processing ${ inputPath }...`);
                const {
                    stdout, stderr
                } = await exec(`.\\lib\\libavif\\avifenc.exe ${ AVIFENC_ARG } "${ inputPath }" "${ outputPath }"`);
                console.log(stdout);
            }
        }
    }
})();
