// PGP encryption helpers (browser-side) using openpgp.
import * as openpgp from "openpgp";

// Read & validate an ASCII-armored public key. Returns metadata for storage.
export async function inspectPublicKey(armored) {
  const key = await openpgp.readKey({ armoredKey: armored });
  const fingerprint = key.getFingerprint();
  const userIDs = key.getUserIDs();
  return {
    fingerprint: fingerprint.toUpperCase(),
    userIds: userIDs.join(", "),
  };
}

// Encrypt UTF-8 text with an armored public key. Returns the .pgp armored string.
export async function encryptText(plainText, armoredPublicKey, filename) {
  const publicKey = await openpgp.readKey({ armoredKey: armoredPublicKey });
  const message = await openpgp.createMessage({ text: plainText, filename });
  const encrypted = await openpgp.encrypt({
    message,
    encryptionKeys: publicKey,
    format: "armored",
  });
  return encrypted;
}

// Trigger a browser download of an encrypted .pgp file.
export function downloadEncrypted(armoredCiphertext, fileName) {
  const blob = new Blob([armoredCiphertext], { type: "application/pgp-encrypted" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}