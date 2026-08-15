import bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import crypto from 'crypto';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 32);

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateApiKey(prefix: 'pk_live_' | 'sk_live_'): { fullKey: string; keyHash: string; keyPreview: string } {
  const secret = nanoid();
  const fullKey = `${prefix}${secret}`;
  const keyHash = hashApiKey(fullKey);
  const keyPreview = `${prefix}***${fullKey.slice(-4)}`;
  
  return { fullKey, keyHash, keyPreview };
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}
