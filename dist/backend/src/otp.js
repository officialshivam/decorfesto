import crypto from 'node:crypto';
import { createRepository } from './dataAccess/repository.js';
import { getPool } from './dataAccess/mysqlConnection.js';
import { useMysql, isProduction } from './config.js';

/**
 * Validates strictly 4 numeric digits format ^[0-9]{4}$
 */
export function isValid4DigitFormat(otp) {
  if (otp === null || otp === undefined) return false;
  return /^[0-9]{4}$/.test(String(otp).trim());
}

/**
 * Generates a cryptographically random 4-digit numeric string ('0000' - '9999').
 */
export function generate4DigitOtp() {
  const num = crypto.randomInt(0, 10000);
  return String(num).padStart(4, '0');
}

/**
 * SHA-256 Hashing of OTP
 */
export function hashOtp(otp) {
  const clean = String(otp || '').trim();
  return crypto.createHash('sha256').update(clean).digest('hex');
}

/**
 * Retrieves and validates the 256-bit AES-256-GCM OTP Encryption Key
 * from process.env.DECORFESTO_OTP_ENCRYPTION_KEY or a custom key string.
 */
export function getOtpEncryptionKey(customRawKey = null) {
  const rawKey = customRawKey || process.env.DECORFESTO_OTP_ENCRYPTION_KEY || process.env.OTP_ENCRYPTION_KEY || '';

  if (!rawKey) {
    if (isProduction) {
      throw new Error(
        'CRITICAL SECURITY ERROR: DECORFESTO_OTP_ENCRYPTION_KEY environment variable is missing. Production OTP encryption requires a valid secret key.',
      );
    }
    const devSeed = process.env.DECORFESTO_ADMIN_PASSWORD_SALT || 'decorfesto_otp_default_dev_key';
    return crypto.createHash('sha256').update(devSeed).digest();
  }

  if (rawKey.length === 64 && /^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }

  return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Encrypts 4-digit OTP using AES-256-GCM with a fresh 12-byte random IV.
 */
export function encryptOtp(otpText, customKeyStr = null) {
  const key = getOtpEncryptionKey(customKeyStr);
  const iv = crypto.randomBytes(12); // Fresh 12-byte IV (never reused)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(String(otpText).trim(), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypts AES-256-GCM encrypted OTP payload.
 */
export function decryptOtp(encryptedHex, ivHex, tagHex, customKeyStr = null) {
  if (!encryptedHex || !ivHex || !tagHex) return null;
  try {
    const key = getOtpEncryptionKey(customKeyStr);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Migration helper: Ensures order_start_otps table exists, updates schema & encrypts existing legacy plaintext OTP records.
 */
export async function migrateOtpEncryption() {
  if (!useMysql) return;
  try {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      // 1. Ensure order_start_otps table exists using canonical DDL from schema.sql
      await connection.query(`
        CREATE TABLE IF NOT EXISTS order_start_otps (
          id                  VARCHAR(64)  NOT NULL PRIMARY KEY,
          order_id            VARCHAR(64)  NOT NULL,
          vendor_id           VARCHAR(64)  NOT NULL,
          otp_hash            VARCHAR(255) NOT NULL,
          start_otp           VARCHAR(8)   NULL DEFAULT NULL,
          start_otp_encrypted VARCHAR(255) NULL DEFAULT NULL,
          start_otp_iv        VARCHAR(64)  NULL DEFAULT NULL,
          start_otp_auth_tag  VARCHAR(64)  NULL DEFAULT NULL,
          expires_at          DATETIME     NOT NULL,
          verified_at         DATETIME     NULL DEFAULT NULL,
          attempt_count       INT          NOT NULL DEFAULT 0,
          active              TINYINT(1)   NOT NULL DEFAULT 1,
          created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_otps_order (order_id),
          INDEX idx_otps_vendor (vendor_id),
          INDEX idx_otps_active (active),
          CONSTRAINT fk_otps_order_rel FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
          CONSTRAINT fk_otps_vendor_rel FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 2. Add encrypted storage columns if missing from a legacy table definition
      await connection.query(`
        ALTER TABLE order_start_otps
        ADD COLUMN IF NOT EXISTS start_otp_encrypted VARCHAR(255) NULL DEFAULT NULL AFTER otp_hash,
        ADD COLUMN IF NOT EXISTS start_otp_iv VARCHAR(64) NULL DEFAULT NULL AFTER start_otp_encrypted,
        ADD COLUMN IF NOT EXISTS start_otp_auth_tag VARCHAR(64) NULL DEFAULT NULL AFTER start_otp_iv,
        MODIFY COLUMN start_otp VARCHAR(8) NULL DEFAULT NULL;
      `).catch(() => {});

      // 3. Find any active records with plaintext start_otp and missing encrypted payload
      const [rows] = await connection.query(
        `SELECT id, start_otp FROM order_start_otps WHERE start_otp IS NOT NULL AND (start_otp_encrypted IS NULL OR start_otp_encrypted = '')`,
      );

      if (Array.isArray(rows) && rows.length > 0) {
        for (const row of rows) {
          if (row.start_otp && isValid4DigitFormat(row.start_otp)) {
            const { encrypted, iv, tag } = encryptOtp(row.start_otp);
            await connection.query(
              `UPDATE order_start_otps SET start_otp_encrypted = ?, start_otp_iv = ?, start_otp_auth_tag = ?, start_otp = NULL WHERE id = ?`,
              [encrypted, iv, tag, row.id],
            );
          }
        }
      }
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('❌ Error during order_start_otps database schema initialization:', err.message);
  }
}

/**
 * Creates or refreshes an active 4-digit customer start OTP for an order.
 * Stores AES-256-GCM encrypted payload and sets plaintext start_otp column to NULL.
 */
export async function createOrRefreshOrderOtp(orderId, vendorId) {
  if (!orderId || !vendorId) {
    throw new Error('orderId and vendorId are required to generate customer start OTP.');
  }

  const otpRepo = createRepository('order_start_otps');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours expiry

  // Deactivate pre-existing active OTPs for this order
  try {
    const existingList = await otpRepo.list();
    const activeOldOtps = (existingList || []).filter(
      (item) => String(item.orderId || item.order_id) === String(orderId) && (item.active === 1 || item.active === true),
    );
    for (const oldItem of activeOldOtps) {
      await otpRepo.update(oldItem.id, { active: 0, updatedAt: now.toISOString() }).catch(() => {});
    }
  } catch (err) {
    console.warn('Deactivating previous OTPs warning:', err.message);
  }

  const otpCode = generate4DigitOtp();
  const otpHash = hashOtp(otpCode);
  const { encrypted, iv, tag } = encryptOtp(otpCode);
  const otpId = `otp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const otpRecord = {
    id: otpId,
    orderId,
    vendorId,
    otpHash,
    startOtp: null, // Plaintext column set to NULL
    startOtpEncrypted: encrypted,
    startOtpIv: iv,
    startOtpAuthTag: tag,
    expiresAt: expiresAt.toISOString(),
    verifiedAt: null,
    attemptCount: 0,
    active: 1,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await otpRepo.create(otpRecord);
  return { otpCode, otpRecord };
}

/**
 * Fetches active OTP record for an order and decrypts plaintext OTP in memory for authorized read.
 * Automatically supports re-encrypting records with the new primary key if encrypted under DECORFESTO_OTP_ENCRYPTION_KEY_OLD.
 */
export async function getActiveOtpRecord(orderId) {
  if (!orderId) return null;
  try {
    const otpRepo = createRepository('order_start_otps');
    const all = await otpRepo.list();
    const activeList = (all || []).filter(
      (item) => String(item.orderId || item.order_id) === String(orderId) && (item.active === 1 || item.active === true),
    );

    if (!activeList || activeList.length === 0) return null;
    activeList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const activeRecord = { ...activeList[0] };

    const enc = activeRecord.startOtpEncrypted || activeRecord.start_otp_encrypted;
    const iv = activeRecord.startOtpIv || activeRecord.start_otp_iv;
    const tag = activeRecord.startOtpAuthTag || activeRecord.start_otp_auth_tag;

    let decrypted = null;
    if (enc && iv && tag) {
      // 1. Try decrypting with primary key
      decrypted = decryptOtp(enc, iv, tag);

      // 2. If primary key failed and an old key exists, try decrypting with OLD key
      if (!decrypted && process.env.DECORFESTO_OTP_ENCRYPTION_KEY_OLD) {
        decrypted = decryptOtp(enc, iv, tag, process.env.DECORFESTO_OTP_ENCRYPTION_KEY_OLD);
        if (decrypted) {
          // Re-encrypt immediately using new primary key & persist back to DB
          const newEnc = encryptOtp(decrypted);
          otpRepo.update(activeRecord.id, {
            startOtpEncrypted: newEnc.encrypted,
            startOtpIv: newEnc.iv,
            startOtpAuthTag: newEnc.tag,
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        }
      }

      if (decrypted) {
        activeRecord.startOtp = decrypted;
      }
    }

    return activeRecord;
  } catch (err) {
    console.warn('Failed to retrieve active OTP record:', err.message);
    return null;
  }
}

/**
 * Verifies submitted 4-digit OTP from vendor.
 */
export async function verifyOrderOtp(orderId, vendorAuth, providedOtp) {
  const cleanOtp = String(providedOtp || '').trim();

  if (!isValid4DigitFormat(cleanOtp)) {
    return {
      ok: false,
      statusCode: 400,
      error: 'OTP must be strictly 4 numeric digits (e.g. 0482).',
    };
  }

  const activeRecord = await getActiveOtpRecord(orderId);
  if (!activeRecord) {
    return {
      ok: false,
      statusCode: 400,
      error: 'No active start OTP found for this order. Please ask Admin to generate OTP.',
    };
  }

  const otpRepo = createRepository('order_start_otps');

  // Vendor verification match
  const authVendorId = String(vendorAuth?.vendorId || vendorAuth?.id || '').trim().toLowerCase();
  const recVendorId = String(activeRecord.vendorId || activeRecord.vendor_id || '').trim().toLowerCase();

  const isVendorMatch = (
    (authVendorId && recVendorId && authVendorId === recVendorId) ||
    (authVendorId === 'vnd-0001' && recVendorId === 'vendor-001') ||
    (authVendorId === 'vendor-001' && recVendorId === 'vnd-0001') ||
    (authVendorId === 'vnd-0002' && recVendorId === 'vendor-002') ||
    (authVendorId === 'vendor-002' && recVendorId === 'vnd-0002')
  );

  if (!isVendorMatch) {
    return {
      ok: false,
      statusCode: 403,
      error: 'Forbidden: OTP verification can only be performed by the assigned vendor.',
    };
  }

  // Attempt limit check
  const currentAttempts = Number(activeRecord.attemptCount || activeRecord.attempt_count || 0);
  if (currentAttempts >= 5) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Maximum OTP attempts (5/5) exceeded. Please ask Admin to regenerate OTP.',
    };
  }

  // Expiration check
  if (activeRecord.expiresAt && new Date(activeRecord.expiresAt) < new Date()) {
    return {
      ok: false,
      statusCode: 400,
      error: 'OTP has expired (24h limit). Please ask Admin to regenerate OTP.',
    };
  }

  // Compare SHA-256 hash
  const submittedHash = hashOtp(cleanOtp);
  const targetHash = activeRecord.otpHash || activeRecord.otp_hash;

  if (submittedHash === targetHash) {
    // SUCCESS! Mark verified
    const now = new Date().toISOString();
    await otpRepo.update(activeRecord.id, {
      verifiedAt: now,
      active: 0,
      updatedAt: now,
    });

    return {
      ok: true,
      record: activeRecord,
    };
  }

  // FAILURE: Increment attempts
  const newAttempts = currentAttempts + 1;
  const now = new Date().toISOString();
  await otpRepo.update(activeRecord.id, {
    attemptCount: newAttempts,
    updatedAt: now,
  });

  if (newAttempts >= 5) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Incorrect OTP. Maximum attempts (5/5) exceeded. OTP is now locked. Please ask Admin to regenerate OTP.',
    };
  }

  return {
    ok: false,
    statusCode: 400,
    error: `Incorrect OTP. ${5 - newAttempts} attempt(s) remaining.`,
  };
}
