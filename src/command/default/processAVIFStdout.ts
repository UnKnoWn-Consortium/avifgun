
import rescape from "@stdlib/utils-escape-regexp-string";
import bytes from "bytes";

export interface AVIFStdout {
    resolution?: string;
    bitDepth?: string;
    format?: string;
    chromeSamplePosition?: string;
    alpha?: string;
    range?: string;
    colorPrimaries?: string;
    transferCharacters?: string;
    matrixCoefficients?: string;

    isICCProfilePresent: boolean;
    isXMPMetadataPresent: boolean;
    isExifMetadataPresent: boolean;
    transformations?: string;
    isProgressive: boolean;

    colorSizeBytes: number;
    alphaSizeBytes: number;
}

function extractItem (input: string[], pattern: string): string | undefined {
    const regexp = new RegExp(rescape(pattern), "g");
    const target = input.find((string: string) => string.search(regexp) > -1);
    if (!target) {
        return undefined;
    }
    return target.split(pattern)[1].trim().toLowerCase();
}

async function processAVIFStdout (stdout: string): Promise<AVIFStdout> {
    const output = stdout.split("\r\n");

    const resolution = extractItem(output, "* Resolution     :");
    const bitDepth = extractItem(output, "* Bit Depth      :");
    const format = extractItem(output, "* Format         :");
    const chromeSamplePosition = extractItem(output, "* Chroma Sam. Pos:");

    const alpha = extractItem(output, "* Alpha          :");
    const range = extractItem(output, "* Range          :");
    const colorPrimaries = extractItem(output, "* Color Primaries:");
    const transferCharacters = extractItem(output, "* Transfer Char. :");
    const matrixCoefficients = extractItem(output, "* Matrix Coeffs. :");

    const isICCProfilePresent = extractItem(output, "* ICC Profile    :") !== "absent";
    const isXMPMetadataPresent = extractItem(output, "* XMP Metadata   :") !== "absent";
    const isExifMetadataPresent = extractItem(output, "* Exif Metadata  :") !== "absent";

    const transformations = extractItem(output, "* Transformations:");
    const isProgressive = extractItem(output, "* Progressive    :") !== "unavailable";

    const colorSizeBytes = bytes.parse(extractItem(output, "* Color AV1 total size:") ?? "0");
    const alphaSizeBytes = bytes.parse(extractItem(output, "* Alpha AV1 total size:") ?? "0");

    return {
        resolution, bitDepth, format, chromeSamplePosition,
        alpha, range, colorPrimaries, transferCharacters, matrixCoefficients,

        isICCProfilePresent, isXMPMetadataPresent, isExifMetadataPresent,
        transformations, isProgressive,

        colorSizeBytes, alphaSizeBytes,
    };
}

export default processAVIFStdout;
