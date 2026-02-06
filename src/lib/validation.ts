/**
 * Validates Korean phone number format (010-XXXX-XXXX or 01X-XXX-XXXX)
 * Returns error message or null if valid
 */
export function validatePhone(phone: string): string | null {
  const cleaned = phone.replace(/\s/g, "");
  const pattern = /^01[016789]-?\d{3,4}-?\d{4}$/;
  if (!pattern.test(cleaned)) {
    return "올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)";
  }
  return null;
}

/**
 * Validates fee as a positive integer
 * Returns error message or null if valid
 */
export function validateFee(fee: string): string | null {
  if (!fee) return null;
  const num = Number(fee);
  if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
    return "참가비는 0 이상의 숫자로 입력해주세요.";
  }
  return null;
}

/**
 * Format number to Korean won display (e.g. 15000 -> "15,000원")
 */
export function formatFee(fee: number | string | null): string | null {
  if (fee === null || fee === undefined || fee === "") return null;
  const num = typeof fee === "string" ? Number(fee) : fee;
  if (isNaN(num)) return null;
  return `${num.toLocaleString("ko-KR")}원`;
}
