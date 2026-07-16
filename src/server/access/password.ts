import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
const keyLength = 64;
const parameters = { N: 16_384, r: 8, p: 1 } as const;

function deriveKey(
  password: string,
  salt: Buffer,
  length: number,
  options: ScryptOptions,
): Promise<Buffer> {
  const { promise, resolve, reject } = Promise.withResolvers<Buffer>();
  nodeScrypt(password, salt, length, options, (error, key) => {
    if (error) {
      reject(error);
    } else {
      resolve(key);
    }
  });
  return promise;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt, keyLength, parameters);
  return [
    "scrypt",
    parameters.N,
    parameters.r,
    parameters.p,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const [algorithm, n, r, p, encodedSalt, encodedKey] = encodedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    !n ||
    !r ||
    !p ||
    !encodedSalt ||
    !encodedKey
  ) {
    return false;
  }

  const expected = Buffer.from(encodedKey, "base64url");
  const actual = await deriveKey(
    password,
    Buffer.from(encodedSalt, "base64url"),
    expected.length,
    { N: Number(n), r: Number(r), p: Number(p) },
  );

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
