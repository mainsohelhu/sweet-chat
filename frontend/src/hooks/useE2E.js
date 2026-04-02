/**
 * useE2E — Manages key setup and encrypt/decrypt
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initSodium, getOrCreateKeyPair,
  decryptMessage,
  encryptGroupMessage, decryptGroupMessage,
  isE2EEncrypted
} from '../utils/encryption';
import api from '../utils/api';

let _keysReady = false;
const _pubKeyCache = {};

export default function useE2E() {
  const [ready, setReady] = useState(_keysReady);
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    (async () => {
      try {
        await initSodium();
        const { publicKey } = await getOrCreateKeyPair();
        await api.post('/users/me/public-key', { publicKey });
        console.log('✅ E2E ready, public key:', publicKey.slice(0, 16) + '...');
        _keysReady = true;
        setReady(true);
      } catch (err) {
        console.error('E2E setup error:', err);
        _keysReady = true;
        setReady(true);
      }
    })();
  }, []);

  const getRecipientKey = useCallback(async (userId) => {
    if (_pubKeyCache[userId]) return _pubKeyCache[userId];
    try {
      const res = await api.get(`/users/${userId}/public-key`);
      const key = res.data.publicKey;
      if (key) { _pubKeyCache[userId] = key; return key; }
    } catch (_) {}
    return null;
  }, []);

  // Encrypt for BOTH sender and recipient (direct chat)
  const encryptForBoth = useCallback(async (plaintext, recipientUserId) => {
    try {
      const recipientKey = await getRecipientKey(recipientUserId);
      const { publicKey: ourKey } = await getOrCreateKeyPair();
      const keys = [...new Set([ourKey, recipientKey].filter(Boolean))];
      if (keys.length === 0) return { content: plaintext, e2e: null };
      const e2e = await encryptGroupMessage(plaintext, keys);
      return { content: '🔒 Encrypted message', e2e };
    } catch (err) {
      console.error('encryptForBoth failed:', err);
      return { content: plaintext, e2e: null };
    }
  }, [getRecipientKey]);

  // Encrypt for group chat (all participants + sender)
  const encryptForGroup = useCallback(async (plaintext, participantIds) => {
    try {
      const { publicKey: ourKey } = await getOrCreateKeyPair();
      const recipientKeys = await Promise.all(participantIds.map(getRecipientKey));
      const allKeys = [...new Set([...recipientKeys.filter(Boolean), ourKey])];
      if (allKeys.length === 0) return { content: plaintext, e2e: null };
      const e2e = await encryptGroupMessage(plaintext, allKeys);
      return { content: '🔒 Encrypted message', e2e };
    } catch (err) {
      console.error('encryptForGroup failed:', err);
      return { content: plaintext, e2e: null };
    }
  }, [getRecipientKey]);

  const decrypt = useCallback(async (message) => {
    if (!isE2EEncrypted(message)) return message.content || '';
    try {
      if (message.e2e?.isGroup) return await decryptGroupMessage(message.e2e);
      return await decryptMessage(message.e2e);
    } catch (err) {
      console.error('decrypt failed:', err.message);
      return '[🔒 Could not decrypt]';
    }
  }, []);

  return { ready, encryptForBoth, encryptForGroup, decrypt };
}