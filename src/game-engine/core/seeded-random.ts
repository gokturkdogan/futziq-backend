export function createSeededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    hash = (Math.imul(1664525, hash) + 1013904223) | 0;
    return ((hash >>> 0) % 1000000) / 1000000;
  };
}

export function randomIntInRange(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}
