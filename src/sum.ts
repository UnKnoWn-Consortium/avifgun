function sum (arr: number[]): number | undefined {
    if (!Array.isArray(arr)) {
        return undefined;
    }
    return arr.reduce((acc, value) => acc += value, 0);
}

export default sum;
