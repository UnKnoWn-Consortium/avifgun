import { Command } from "commander";
import avifgun from "./command/default/index.js";

const program = new Command();
program
    .name("avifgun🔫🔫🔫")
    .description("A utility to convert images to AVIF en masse 🔫🔫🔫")
    .version("1.0.0", "-v, --version")

    .argument("<input>", "Path to the input (file or folder depending on whether recursive mode is enabled)")
    .argument("[output]", "Path to the output (file or folder depending on whether recursive mode is enabled)")
    .option("-R, --recursive", "Execute in recursive mode", false)
    .option("-v, --verbose", "Execute in verbose mode", false)
    .option("-d, --dssim", "Compute DSSIM statistics for the converted AVIF images", false)
    .action(avifgun);

program.parse();
