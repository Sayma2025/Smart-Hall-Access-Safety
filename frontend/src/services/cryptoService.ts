import { api } from './api';

const DB_NAME = 'shasms_security_store';
const STORE_NAME = 'device_keys';
const DEVICE_ID_KEY = 'shasms_active_device_id';

// Helper to open IndexedDB
function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported on this browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'deviceId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export const cryptoService = {
  /**
   * Check if current browser has an enrolled cryptographic key
   */
  async getActiveEnrolledDevice(): Promise<{ deviceId: string; deviceName: string } | null> {
    try {
      const savedDeviceId = localStorage.getItem(DEVICE_ID_KEY);
      if (!savedDeviceId) return null;

      const db = await openKeyDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(savedDeviceId);
        req.onsuccess = () => {
          if (req.result && req.result.privateKey) {
            resolve({ deviceId: req.result.deviceId, deviceName: req.result.deviceName });
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  /**
   * Enroll the Current Device using WebCrypto ECDSA P-256
   * The private key is strictly marked extractable: false for security
   */
  async enrollCurrentDevice(deviceName: string, password: string): Promise<any> {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Cryptography API is not available on this browser or origin.');
    }

    // 1. Generate ECDSA P-256 key pair
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      false, // extractable: false ensures the private key cannot be extracted
      ['sign']
    );

    // 2. Export Public Key in SPKI format
    const spkiBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const base64Spki = arrayBufferToBase64(spkiBuffer);
    const pem = `-----BEGIN PUBLIC KEY-----\n${base64Spki}\n-----END PUBLIC KEY-----`;

    // 3. Register with backend passing password for mandatory re-authentication
    const response = await api.enrollDevice({
      deviceName,
      publicKey: pem,
      password,
      platformInfo: `${navigator.platform || 'Desktop/Mobile'} (${navigator.userAgent.slice(0, 80)})`,
    });

    const deviceId = response.device.deviceId;

    // 4. Save non-extractable CryptoKey privateKey in browser IndexedDB
    const db = await openKeyDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({
        deviceId,
        deviceName,
        privateKey: keyPair.privateKey,
        enrolledAt: new Date().toISOString(),
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    return response.device;
  },

  /**
   * Sign a Verification Challenge using the stored private key
   */
  async signVerificationChallenge(challenge: string): Promise<{ deviceId: string; signature: string }> {
    const savedDeviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!savedDeviceId) {
      throw new Error('No enrolled device found on this browser. Please enroll this device first.');
    }

    const db = await openKeyDB();
    const keyRecord = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(savedDeviceId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!keyRecord || !keyRecord.privateKey) {
      throw new Error('Cryptographic private key for this device was not found in browser keystore.');
    }

    const encoder = new TextEncoder();
    const challengeBytes = encoder.encode(challenge);

    // Cryptographically sign the server-generated challenge
    const signatureBuffer = await window.crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      keyRecord.privateKey,
      challengeBytes
    );

    const signatureHex = bufferToHex(signatureBuffer);
    return {
      deviceId: savedDeviceId,
      signature: signatureHex,
    };
  },

  /**
   * Clear device from local browser store
   */
  clearLocalDevice(): void {
    localStorage.removeItem(DEVICE_ID_KEY);
  },
};

