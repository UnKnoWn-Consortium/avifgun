function median (arr: number[]): number | undefined {
    if (!Array.isArray(arr)) {
        return undefined;
    }
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 === 0 ? ((s[mid - 1] + s[mid]) / 2) : s[mid];
}

export default median;
