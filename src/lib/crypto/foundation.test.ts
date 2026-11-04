import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHmac, randomBytes } from 'node:crypto'
import { AbiCoder, keccak256, solidityPackedKeccak256, toUtf8Bytes } from 'ethers'
import { getEnv } from '../env'
import { encryptNik, decryptNik, nikBlindIndex, validateNik, maskNik } from './nik'
import { recipientCommitment } from '../blockchain/identity-hash'
import { disbursementKey, periodIdFromYYYYMM, programIdFromCode, refIdFromDataId } from '../blockchain/chain-keys'
import { hashPassword, verifyPassword, validatePassword } from '../auth/password'

// Synthetic identity and ephemeral keys; never read real credentials or persist test keys.
const nik = '1101010101900001'

test('NIK validation and masking', () => {
  assert.equal(validateNik(nik), true)
  assert.equal(validateNik('1101014101900001'), true)
  for (const invalid of ['0000000000000000', '1101010001900001', '1101013212900001', '1101017212900001', '1101010113900001', '110101010190000', `${nik}x`]) {
    assert.equal(validateNik(invalid), false)
  }
  assert.equal(maskNik(nik), '1101••••••••0001')
})

test('encrypted identity, commitment, and lazy configuration', () => {
  const keys = ['NIK_ENC_KEY', 'NIK_INDEX_KEY', 'COMMITMENT_PEPPER', 'AUTH_REQUIRE_TOTP', 'APP_TRUST_PROXY', 'PINATA_JWT'] as const
  const previous = keys.map(key => [key, process.env[key]] as const)
  try {
    for (const key of keys) delete process.env[key]
    assert.equal(getEnv('AUTH_REQUIRE_TOTP'), false)
    assert.equal(getEnv('APP_TRUST_PROXY'), false)
    assert.equal(getEnv('PINATA_JWT'), undefined)
    assert.throws(() => encryptNik(nik), /Layanan belum dikonfigurasi/)
    process.env.NIK_ENC_KEY = randomBytes(32).toString('hex')
    process.env.NIK_INDEX_KEY = randomBytes(32).toString('hex')
    process.env.COMMITMENT_PEPPER = randomBytes(32).toString('hex')
    const encrypted = encryptNik(nik)
    assert.equal(decryptNik(encrypted), nik)
    assert.notEqual(encryptNik(nik).iv, encrypted.iv)
    assert.throws(() => decryptNik({ ...encrypted, tag: '00'.repeat(16) }))
    assert.throws(() => decryptNik({ ...encrypted, ct: '00'.repeat(16) }))
    assert.equal(nikBlindIndex(nik), createHmac('sha256', process.env.NIK_INDEX_KEY).update(nik).digest('hex'))
    assert.equal(recipientCommitment(nik), solidityPackedKeccak256(['string', 'bytes32'], [nik, `0x${process.env.COMMITMENT_PEPPER}`]))
    process.env.NIK_ENC_KEY = randomBytes(32).toString('hex')
    assert.throws(() => decryptNik(encrypted))
    process.env.COMMITMENT_PEPPER = 'invalid'
    assert.throws(() => recipientCommitment(nik), /Layanan belum dikonfigurasi/)
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})

test('blockchain key encoding matches ethers reference', () => {
  const program = programIdFromCode('BLT')
  const commitment = refIdFromDataId('synthetic-test')
  assert.equal(program, keccak256(toUtf8Bytes('BLT')))
  assert.equal(commitment, keccak256(toUtf8Bytes('synthetic-test')))
  assert.equal(disbursementKey(program, 202610, commitment), keccak256(AbiCoder.defaultAbiCoder().encode(['bytes32', 'uint32', 'bytes32'], [program, 202610, commitment])))
  assert.throws(() => periodIdFromYYYYMM(202613))
  assert.throws(() => disbursementKey('invalid', 202610, commitment))
})

test('Argon2id password hashing and policy', async () => {
  const password = 'Example-test-only-724!'
  const encoded = await hashPassword(password, 'operator', 'operator@example.test')
  assert.match(encoded, /^\$argon2id\$/)
  assert.equal(await verifyPassword(encoded, password), true)
  assert.equal(await verifyPassword(encoded, 'incorrect'), false)
  assert.equal(await verifyPassword('invalid', password), false)
  assert.throws(() => validatePassword('password123456', 'operator', 'operator@example.test'))
  assert.throws(() => validatePassword('operator@example.test', 'operator', 'operator@example.test'))
})
