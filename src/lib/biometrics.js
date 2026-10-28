// Native WebAuthn Biometric Authentication (Android Fingerprint / iOS FaceID / Windows Hello)

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer)
  let str = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i])
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBuffer(base64url) {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer
}

function randomChallenge() {
  const arr = new Uint8Array(32)
  window.crypto.getRandomValues(arr)
  return arr
}

export async function isBiometricSupported() {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return false
    }
    if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    }
    return true
  } catch (e) {
    return false
  }
}

/**
 * Registers the phone's Fingerprint / FaceID for a given tenant or admin
 */
export async function registerBiometricCredential({ userId, email, displayName }) {
  if (!window.PublicKeyCredential) {
    throw new Error('Tu navegador o dispositivo no soporta lector de huella / FaceID en web.')
  }

  const userBytes = new TextEncoder().encode(String(userId || email))

  const publicKeyOptions = {
    challenge: randomChallenge(),
    rp: {
      name: 'Ingenio OS',
      id: window.location.hostname
    },
    user: {
      id: userBytes,
      name: email,
      displayName: displayName || email
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },   // ES256 (Android / iOS standard)
      { type: 'public-key', alg: -257 }  // RS256 (Windows Hello standard)
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Forces built-in Fingerprint / FaceID sensor
      userVerification: 'required',
      residentKey: 'preferred'
    },
    timeout: 60000,
    attestation: 'none'
  }

  const credential = await navigator.credentials.create({
    publicKey: publicKeyOptions
  })

  if (!credential) {
    throw new Error('No se pudo registrar la huella.')
  }

  const credentialId = bufferToBase64Url(credential.rawId)
  return credentialId
}

/**
 * Verifies the phone's Fingerprint / FaceID against a stored credentialId (or discoverable passkey)
 */
export async function verifyBiometricCredential(credentialId) {
  if (!window.PublicKeyCredential) {
    throw new Error('Tu dispositivo no soporta autenticación por huella.')
  }

  const publicKeyRequest = {
    challenge: randomChallenge(),
    rpId: window.location.hostname,
    userVerification: 'required',
    timeout: 60000
  }

  if (credentialId) {
    publicKeyRequest.allowCredentials = [
      {
        id: base64UrlToBuffer(credentialId),
        type: 'public-key',
        transports: ['internal']
      }
    ]
  }

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyRequest
  })

  if (!assertion) {
    throw new Error('Verificación de huella cancelada.')
  }

  return bufferToBase64Url(assertion.rawId)
}
