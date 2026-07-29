/**
 * True E2E Encryption using libsodium (X25519-XSalsa20-Poly1305)
 * Same algorithm used by Signal/WhatsApp
 */
import _sodium from 'libsodium-wrappers';

let sodium = null;

export const initSodium = async () => {
  if (sodium) return sodium;
  await _sodium.ready;
  sodium = _sodium;
  return sodium;
};

const PRIV_KEY = 'sc_e2e_private';
const PUB_KEY  = 'sc_e2e_public';

// Safe base64 decode — tries all variants
const fromB64 = (na, str) => {
  for (const v of Object.values(na.base64_variants)) {
    try { return na.from_base64(str, v); } catch (_) {}
  }
  throw new Error('Cannot decode base64 string');
};

const toB64 = (na, bytes) => na.to_base64(bytes, na.base64_variants.URLSAFE_NO_PADDING);

export const generateKeyPair = async () => {
  const na = await initSodium();
  const kp  = na.crypto_box_keypair();
  const pub  = toB64(na, kp.publicKey);
  const priv = toB64(na, kp.privateKey);
  localStorage.setItem(PUB_KEY,  pub);
  localStorage.setItem(PRIV_KEY, priv);
  console.log('🔑 E2E key pair generated');
  return { publicKey: pub, privateKey: priv };
};

export const getOrCreateKeyPair = async () => {
  const priv = localStorage.getItem(PRIV_KEY);
  const pub  = localStorage.getItem(PUB_KEY);
  if (priv && pub) return { publicKey: pub, privateKey: priv };
  return generateKeyPair();
};

export const getPublicKey = async () => {
  const { publicKey } = await getOrCreateKeyPair();
  return publicKey;
};

// ─── Direct Message Encryption ────────────────────────────────────────────────

export const encryptMessage = async (plaintext, recipientPublicKeyB64) => {
  const na = await initSodium();
  const { publicKey: ourPubB64, privateKey: ourPrivB64 } = await getOrCreateKeyPair();

  const recipientPub = fromB64(na, recipientPublicKeyB64);
  const ourPriv      = fromB64(na, ourPrivB64);
  const nonce        = na.randombytes_buf(na.crypto_box_NONCEBYTES);
  const cipher       = na.crypto_box_easy(na.from_string(plaintext), nonce, recipientPub, ourPriv);

  return {
    ciphertext:      toB64(na, cipher),
    nonce:           toB64(na, nonce),
    senderPublicKey: ourPubB64,
  };
};

export const decryptMessage = async ({ ciphertext, nonce, senderPublicKey: senderPubB64 }) => {
  const na = await initSodium();
  const { privateKey: ourPrivB64 } = await getOrCreateKeyPair();

  const senderPub   = fromB64(na, senderPubB64);
  const ourPriv     = fromB64(na, ourPrivB64);
  const cipherBytes = fromB64(na, ciphertext);
  const nonceBytes  = fromB64(na, nonce);

  const decrypted = na.crypto_box_open_easy(cipherBytes, nonceBytes, senderPub, ourPriv);
  return na.to_string(decrypted);
};

// ─── Group Message Encryption ─────────────────────────────────────────────────

export const encryptGroupMessage = async (plaintext, memberPublicKeys) => {
  const na = await initSodium();
  const { publicKey: ourPubB64, privateKey: ourPrivB64 } = await getOrCreateKeyPair();

  const sessionKey = na.randombytes_buf(na.crypto_secretbox_KEYBYTES);
  const nonce      = na.randombytes_buf(na.crypto_secretbox_NONCEBYTES);
  const cipher     = na.crypto_secretbox_easy(na.from_string(plaintext), nonce, sessionKey);

  // Encrypt session key for each member
  // Use index-based keys to avoid MongoDB dot-notation issues with base64 keys
  const encryptedKeysList = [];
  for (const memberPubB64 of memberPublicKeys) {
    try {
      const memberPub = fromB64(na, memberPubB64);
      const ourPriv   = fromB64(na, ourPrivB64);
      const keyNonce  = na.randombytes_buf(na.crypto_box_NONCEBYTES);
      const encKey    = na.crypto_box_easy(sessionKey, keyNonce, memberPub, ourPriv);
      encryptedKeysList.push({
        publicKey: memberPubB64,
        key:       toB64(na, encKey),
        nonce:     toB64(na, keyNonce),
      });
    } catch (e) {
      console.warn('Could not encrypt for member:', e.message);
    }
  }

  return {
    ciphertext:      toB64(na, cipher),
    nonce:           toB64(na, nonce),
    senderPublicKey: ourPubB64,
    encryptedKeysList, // array instead of object — avoids MongoDB key issues
    isGroup: true,
  };
};

export const decryptGroupMessage = async ({ ciphertext, nonce, senderPublicKey: senderPubB64, encryptedKeysList }) => {
  const na = await initSodium();
  const { publicKey: ourPubB64, privateKey: ourPrivB64 } = await getOrCreateKeyPair();

  // Find our entry by matching public key
  const myEntry = encryptedKeysList?.find((e) => e.publicKey === ourPubB64);
  if (!myEntry) throw new Error('No session key for our public key');

  const senderPub = fromB64(na, senderPubB64);
  const ourPriv   = fromB64(na, ourPrivB64);
  const encKey    = fromB64(na, myEntry.key);
  const keyNonce  = fromB64(na, myEntry.nonce);

  const sessionKey  = na.crypto_box_open_easy(encKey, keyNonce, senderPub, ourPriv);
  const cipherBytes = fromB64(na, ciphertext);
  const nonceBytes  = fromB64(na, nonce);
  const decrypted   = na.crypto_secretbox_open_easy(cipherBytes, nonceBytes, sessionKey);

  return na.to_string(decrypted);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const isE2EEncrypted = (msg) =>
  !!(msg?.e2e?.ciphertext &&
     msg?.e2e?.nonce &&
     msg?.e2e?.senderPublicKey &&
     msg?.e2e?.encryptedKeysList?.length > 0);

export const decryptAnyMessage = async (msg) => {
  if (!isE2EEncrypted(msg)) return msg.content || '';
  try {
    if (msg.e2e?.isGroup) return await decryptGroupMessage(msg.e2e);
    return await decryptMessage(msg.e2e);
  } catch (err) {
    console.warn('Decryption error for msg:', msg._id, err.message);
    if (msg.content && msg.content !== '🔒 Encrypted message' && msg.content !== '[Encrypted Message]') {
      return msg.content;
    }
    return '🔒 Encrypted message';
  }
};