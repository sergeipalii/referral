import * as crypto from 'crypto';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');

  return `${hash}:${salt}`;
}

export function comparePasswords(
  storedPassword: string,
  inputPassword: string,
): boolean {
  const [storedHash, salt] = storedPassword.split(':');
  const inputHash = crypto
    .createHmac('sha256', salt)
    .update(inputPassword)
    .digest('hex');

  return inputHash === storedHash;
}
