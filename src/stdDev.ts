import sum from "./sum.js";

function stdDev (arr: number[]): number | undefined {
    if (!Array.isArray(arr)) {
        return undefined;
    }
    const mean = <number>sum(arr) / arr.length;
    const variance = arr.reduce((acc, value) => acc += Math.pow(value - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
}

export default stdDev;
