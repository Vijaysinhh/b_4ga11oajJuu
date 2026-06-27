// Password hashing utilities using Web Crypto API (available in browsers and modern Node.js)

/**
 * Hashes a password using PBKDF2 with SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate a random salt
  const saltBuffer = crypto.getRandomValues(new Uint8Array(16));
  const salt = Array.from(saltBuffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Hash the password
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer2 = encoder.encode(salt);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer2,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  const hashBuffer = new Uint8Array(derivedBits);
  const hash = Array.from(hashBuffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Format: salt:hash
  return `${salt}:${hash}`;
}

/**
 * Compares a password with a stored hash
 */
export async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  // Check if storedHash is in our format (salt:hash)
  if (!storedHash.includes(':')) {
    // Legacy plaintext password support
    return password === storedHash;
  }
  
  const [salt, originalHash] = storedHash.split(':');
  
  // Hash the password with the same salt
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(salt);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  const hashBuffer = new Uint8Array(derivedBits);
  const hash = Array.from(hashBuffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Compare hashes using timing-safe equality
  return timingSafeEqual(hash, originalHash);
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}
