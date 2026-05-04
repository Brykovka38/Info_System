export const normalizeRussianPhoneDigits = (value: string): string => {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("8")) {
    digits = "7" + digits.slice(1);
  } else if (digits.startsWith("9")) {
    digits = "7" + digits;
  } else if (digits.length > 0 && !digits.startsWith("7")) {
    digits = "7" + digits;
  }

  digits = digits.slice(0, 11);

  if (digits.length === 0) {
    return "7";
  }

  if (!digits.startsWith("7")) {
    digits = "7" + digits.slice(0, 10);
  }

  return digits;
};

export const formatRussianPhone = (digits: string): string => {
  const cleaned = digits.replace(/\D/g, "").slice(0, 11);

  if (!cleaned) return "+7";
  if (cleaned.length === 1) return "+7";
  if (cleaned.length <= 4) return `+7 (${cleaned.slice(1)}`;
  if (cleaned.length <= 7) {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4)}`;
  }
  if (cleaned.length <= 9) {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`;
};

export const isValidRussianPhone = (digits: string): boolean => {
  return /^7\d{10}$/.test(digits);
};

export const toApiRussianPhone = (digits: string): string => {
  return `+${digits}`;
};