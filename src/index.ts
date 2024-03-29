import os from "node:os";

import "v8-compile-cache";

import { Command } from "commander";
import avifgun from "./command/default/index.js";

const program = new Command();
program
    .name("avifgun🔫🔫🔫")
    .description("A utility to convert images to AVIF en masse 🔫🔫🔫")
    .version("1.0.0", "-v, --version");

program
    .argument("<input>", "Path to the input (file or folder depending on whether recursive mode is enabled)")
    .argument("[output]", "Path to the output (file or folder depending on whether recursive mode is enabled)")
    .option("-R, --recursive", "Execute in recursive mode", false)
    .option("--verbose", "Execute in verbose mode", false)
    .option(
        "-d, --live-dssim",
        "Compute DSSIM statistics for the converted AVIF images live (Warning: significantly reduce images processed per second)",
        false
    )
    .option(
        "-t, --thread <numThread>",
        "Compute DSSIM statistics for the converted AVIF images live (Warning: significantly reduce images processed per second)",
        !!os?.availableParallelism ? os?.availableParallelism().toString() : os?.cpus().length.toString()
    )
    .action(avifgun);

program.parse();
