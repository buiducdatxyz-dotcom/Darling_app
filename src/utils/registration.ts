export const MIN_PASSWORD_LENGTH = 8;

export function validateRegistrationCredentials(email: string, password: string, confirmation: string): string | null {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password || !confirmation) {
    return 'Vui lòng nhập đầy đủ thông tin';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return 'Email chưa đúng định dạng. Hãy kiểm tra lại email của bạn.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return 'Mật khẩu cần có ít nhất ' + MIN_PASSWORD_LENGTH + ' ký tự. Hãy chọn mật khẩu dài hơn trước khi tiếp tục.';
  }
  if (password !== confirmation) {
    return 'Mật khẩu không khớp!';
  }
  return null;
}
