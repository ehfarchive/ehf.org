const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseStrictUtcIsoDate(value: string, field: string): Date {
  const match = ISO_DATE.exec(value);
  if (!match) throw new Error(`${field} must be a valid ISO calendar date`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${field} must be a valid ISO calendar date`);
  }

  return date;
}
