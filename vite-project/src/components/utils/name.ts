export const normalizeFullName = (value: string) =>
  value.replace(/\s+/g, " ").trim();

export const isValidFullName = (value: string) => {
  const normalized = normalizeFullName(value);

  if (normalized.length < 5) return false;

  return /^[A-Za-zА-Яа-яЁё\s-]+$/.test(normalized);
};

export const filterFullNameInput = (value: string) => {
  return value
    .replace(/[^A-Za-zА-Яа-яЁё\s-]/g, "") 
    .replace(/\s+/g, " ");
};