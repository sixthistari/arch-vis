interface DepthSortable {
  z: number;
}

/**
 * Painter's algorithm: sort by z (farthest first → drawn first → behind)
 */
export function depthSort<T extends DepthSortable>(items: T[]): T[] {
  return [...items].sort((a, b) => b.z - a.z);
}
