export function paginate<T>(items: readonly T[], pageSize: number): readonly T[][] {
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error('Page size must be a positive integer');
  }

  const pages: T[][] = [];
  for (let start = 0; start < items.length; start += pageSize) {
    pages.push(items.slice(start, start + pageSize));
  }
  return pages;
}
