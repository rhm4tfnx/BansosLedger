import { expect } from 'chai'
import { ethers, artifacts } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { Contract, FunctionFragment, ZeroAddress, ZeroHash, id } from 'ethers'

const programId = id('BLT-TEST'), commitment = id('synthetic-recipient-1'), second = id('synthetic-recipient-2')
const amount = 300000n, cid = 'bafy' + 'a'.repeat(50)
type Input = { refId: string; programId: string; periodId: number; recipientCommitment: string; amount: bigint; evidenceCid: string }
function input(overrides: Partial<Input> = {}): Input {
  return { refId: id('record-1'), programId, periodId: 202601, recipientCommitment: commitment, amount, evidenceCid: cid, ...overrides }
}
async function fixture() {
  const [owner, operator, stranger, successor] = await ethers.getSigners()
  const factory = await ethers.getContractFactory('BansosLedger', owner)
  const ledger = await factory.deploy(operator.address) as unknown as Contract
  await ledger.waitForDeployment()
  const op = ledger.connect(operator) as Contract
  await op.createProgram(programId, amount, 202601, 202612)
  await op.registerRecipients(programId, [commitment, second])
  return { ledger, op, owner, operator, stranger, successor, factory }
}

describe('BansosLedger immutable record and PRD security scenarios', () => {
  it('happy path emits exactly one event with block timestamp and correct tuple order', async () => {
    const { ledger, op, operator } = await loadFixture(fixture)
    const receipt = await (await op.recordDisbursement(input())).wait()
    const block = await ethers.provider.getBlock(receipt.blockNumber)
    const logs = receipt.logs.filter((log: { topics: string[] }) => log.topics[0] === ledger.interface.getEvent('DisbursementRecorded')!.topicHash)
    expect(logs).to.have.length(1)
    const event = ledger.interface.parseLog(logs[0])!
    expect([...event.args]).to.deep.equal([input().refId, programId, commitment, 202601n, amount, cid, operator.address, BigInt(block!.timestamp)])
    expect([...(await ledger.getDisbursement(input().refId))]).to.deep.equal([programId, 202601n, commitment, amount, cid, operator.address, BigInt(block!.timestamp)])
    expect(await ledger.isDisbursed(programId, 202601, commitment)).to.equal(true)
  })
  it('SP-01: duplicate tuple wins over replay reference, and history stays unchanged', async () => {
    const { ledger, op } = await loadFixture(fixture)
    await op.recordDisbursement(input())
    const original = await ledger.getDisbursement(input().refId)
    await expect(op.recordDisbursement(input())).to.be.revertedWithCustomError(ledger, 'AlreadyDisbursed')
    await expect(op.recordDisbursement(input({ refId: id('new-ref') }))).to.be.revertedWithCustomError(ledger, 'AlreadyDisbursed')
    expect(await ledger.getDisbursement(input().refId)).to.deep.equal(original)
    expect(await ledger.queryFilter(ledger.filters.DisbursementRecorded())).to.have.length(1)
  })
  it('SP-02: amount cannot differ from the program', async () => {
    const { ledger, op } = await loadFixture(fixture)
    for (const value of [0n, amount - 1n, amount + 1n]) await expect(op.recordDisbursement(input({ amount: value }))).to.be.revertedWithCustomError(ledger, 'AmountMismatch')
  })
  it('SP-03: neither owner nor stranger may perform operational writes', async () => {
    const { ledger, owner, stranger } = await loadFixture(fixture)
    for (const signer of [owner, stranger]) {
      const caller = ledger.connect(signer) as Contract
      for (const call of [
        () => caller.createProgram(id('new'), amount, 202601, 202612),
        () => caller.registerRecipients(programId, [second]),
        () => caller.closeProgram(programId),
        () => caller.recordDisbursement(input()),
        () => caller.recordDisbursementBatch([input()]),
      ]) await expect(call()).to.be.revertedWithCustomError(ledger, 'NotAuthorized')
    }
  })
  it('SP-04: unregistered commitment is rejected, including cross-program registration', async () => {
    const { ledger, op } = await loadFixture(fixture)
    await expect(op.recordDisbursement(input({ recipientCommitment: id('unregistered') }))).to.be.revertedWithCustomError(ledger, 'RecipientNotRegistered')
    await op.createProgram(id('other'), amount, 202601, 202612)
    await expect(op.recordDisbursement(input({ programId: id('other') }))).to.be.revertedWithCustomError(ledger, 'RecipientNotRegistered')
  })
  it('SP-05: no edit/delete entrypoint; failed writes preserve record and canonical block linkage', async () => {
    const { ledger, op, stranger } = await loadFixture(fixture)
    const receipt = await (await op.recordDisbursement(input())).wait()
    const record = await ledger.getDisbursement(input().refId)
    const allowed = new Set(['setAuthorizedWallet', 'pause', 'unpause', 'createProgram', 'registerRecipients', 'closeProgram', 'recordDisbursement', 'recordDisbursementBatch', 'transferOwnership', 'acceptOwnership'])
    for (const fragment of ledger.interface.fragments) if (fragment instanceof FunctionFragment && !['view', 'pure'].includes(fragment.stateMutability)) expect(allowed.has(fragment.name), fragment.name).to.equal(true)
    await expect(stranger.sendTransaction({ to: await ledger.getAddress(), data: id('deleteDisbursement(bytes32)').slice(0, 10) + input().refId.slice(2) })).to.be.reverted
    expect(await ledger.getDisbursement(input().refId)).to.deep.equal(record)
    const block = await ethers.provider.getBlock(receipt.blockNumber)
    expect(block!.parentHash).to.equal((await ethers.provider.getBlock(receipt.blockNumber - 1))!.hash)
  })
  it('SP-06: replay reference on a fresh tuple is rejected', async () => {
    const { ledger, op } = await loadFixture(fixture)
    await op.recordDisbursement(input())
    await expect(op.recordDisbursement(input({ periodId: 202602 }))).to.be.revertedWithCustomError(ledger, 'RefIdAlreadyUsed')
    expect(await ledger.isDisbursed(programId, 202602, commitment)).to.equal(false)
  })
  it('SP-07: closed program rejects writes and cannot be reopened or recreated', async () => {
    const { ledger, op } = await loadFixture(fixture)
    await expect(op.closeProgram(programId)).to.emit(ledger, 'ProgramClosed').withArgs(programId)
    expect((await ledger.getProgram(programId)).closed).to.equal(true)
    for (const action of [() => op.recordDisbursement(input()), () => op.registerRecipients(programId, [second]), () => op.closeProgram(programId)]) await expect(action()).to.be.revertedWithCustomError(ledger, 'ProgramClosed')
    await expect(op.createProgram(programId, amount, 202601, 202612)).to.be.revertedWithCustomError(ledger, 'ProgramAlreadyExists')
  })
  for (const periodId of [0, 99901, 100000, 1000000, 202500, 202512, 202600, 202613, 202701]) {
    it(`SP-07: invalid/out-of-range period ${periodId}`, async () => {
      const { ledger, op } = await loadFixture(fixture)
      await expect(op.recordDisbursement(input({ periodId }))).to.be.revertedWithCustomError(ledger, 'PeriodOutOfRange')
    })
  }
  it('SP-08: simulated off-chain CID replacement cannot alter either stored or emitted CID', async () => {
    const { ledger, op } = await loadFixture(fixture)
    await op.recordDisbursement(input())
    const changedDatabaseCopy = { ...input(), evidenceCid: 'bafy' + 'b'.repeat(50) }
    const events = await ledger.queryFilter(ledger.filters.DisbursementRecorded(input().refId))
    const emitted = ledger.interface.parseLog(events[0])!
    expect(emitted.args.evidenceCid).to.equal(cid)
    expect(emitted.args.evidenceCid).not.to.equal(changedDatabaseCopy.evidenceCid)
    expect((await ledger.getDisbursement(input().refId)).evidenceCid).to.equal(cid)
  })
  for (const length of [0, 45, 101]) it(`SP-09: rejects CID length ${length}`, async () => {
    const { ledger, op } = await loadFixture(fixture)
    await expect(op.recordDisbursement(input({ evidenceCid: 'a'.repeat(length) }))).to.be.revertedWithCustomError(ledger, 'InvalidEvidenceCid')
  })
  for (const length of [46, 100]) it(`accepts CID boundary ${length}`, async () => {
    const { op } = await loadFixture(fixture)
    await expect(op.recordDisbursement(input({ evidenceCid: 'a'.repeat(length) }))).not.to.be.reverted
  })
})

describe('Validation precedence and program boundaries', () => {
  it('validates authorization before pause, then program existence, closed state, period, registration, amount, duplicate, ref and CID', async () => {
    const { ledger, op, stranger } = await loadFixture(fixture)
    await ledger.pause()
    await expect((ledger.connect(stranger) as Contract).recordDisbursement(input({ programId: ZeroHash }))).to.be.revertedWithCustomError(ledger, 'NotAuthorized')
    await expect(op.recordDisbursement(input({ programId: ZeroHash }))).to.be.revertedWithCustomError(ledger, 'EnforcedPause')
    await ledger.unpause()
    await expect(op.recordDisbursement(input({ programId: ZeroHash, periodId: 0, amount: 0n, evidenceCid: '' }))).to.be.revertedWithCustomError(ledger, 'ProgramNotFound')
    await op.createProgram(id('closed'), amount, 202601, 202612); await op.closeProgram(id('closed'))
    await expect(op.recordDisbursement(input({ programId: id('closed'), periodId: 0 }))).to.be.revertedWithCustomError(ledger, 'ProgramClosed')
    await expect(op.recordDisbursement(input({ periodId: 0, recipientCommitment: ZeroHash }))).to.be.revertedWithCustomError(ledger, 'PeriodOutOfRange')
    await expect(op.recordDisbursement(input({ recipientCommitment: ZeroHash, amount: 0n }))).to.be.revertedWithCustomError(ledger, 'RecipientNotRegistered')
    await op.recordDisbursement(input())
    await expect(op.recordDisbursement(input({ amount: 0n }))).to.be.revertedWithCustomError(ledger, 'AmountMismatch')
    await expect(op.recordDisbursement(input({ evidenceCid: '' }))).to.be.revertedWithCustomError(ledger, 'AlreadyDisbursed')
    await expect(op.recordDisbursement(input({ periodId: 202602, evidenceCid: '' }))).to.be.revertedWithCustomError(ledger, 'RefIdAlreadyUsed')
    await expect(op.recordDisbursement(input({ refId: id('fresh'), periodId: 202602, evidenceCid: '' }))).to.be.revertedWithCustomError(ledger, 'InvalidEvidenceCid')
  })
  it('unknown views return zero structs/false, unknown writes revert', async () => {
    const { ledger, op } = await loadFixture(fixture)
    expect([...(await ledger.getProgram(ZeroHash))]).to.deep.equal([0n, 0n, 0n, false, false])
    expect([...(await ledger.getDisbursement(ZeroHash))]).to.deep.equal([ZeroHash, 0n, ZeroHash, 0n, '', ZeroAddress, 0n])
    expect(await ledger.isRecipientRegistered(ZeroHash, commitment)).to.equal(false)
    expect(await ledger.isDisbursed(programId, 202601, commitment)).to.equal(false)
    for (const call of [() => op.registerRecipients(ZeroHash, [commitment]), () => op.closeProgram(ZeroHash)]) await expect(call()).to.be.revertedWithCustomError(ledger, 'ProgramNotFound')
  })
  it('rejects zero program IDs, zero amounts and duplicate program IDs', async () => {
    const { ledger, op } = await loadFixture(fixture)
    await expect(op.createProgram(ZeroHash, amount, 202601, 202612)).to.be.revertedWithCustomError(ledger, 'InvalidProgram')
    await expect(op.createProgram(id('new'), 0n, 202601, 202612)).to.be.revertedWithCustomError(ledger, 'InvalidProgram')
    await expect(op.createProgram(programId, amount, 202601, 202612)).to.be.revertedWithCustomError(ledger, 'ProgramAlreadyExists')
  })
  for (const [start, end] of [[0, 202612], [1000000, 202612], [202600, 202612], [202613, 202612], [202601, 0], [202601, 202700], [202601, 202713], [202612, 202601]]) {
    it(`rejects invalid program window ${start}–${end}`, async () => {
      const { ledger, op } = await loadFixture(fixture)
      await expect(op.createProgram(id('window'), amount, start, end)).to.be.revertedWithCustomError(ledger, 'PeriodOutOfRange')
    })
  }
  it('accepts valid month endpoints and full four-digit year boundaries', async () => {
    const { ledger, op } = await loadFixture(fixture)
    await expect(op.createProgram(id('wide'), amount, 100001, 999912)).to.emit(ledger, 'ProgramCreated').withArgs(id('wide'), amount, 100001, 999912)
    await op.registerRecipients(id('wide'), [commitment])
    for (const periodId of [100001, 999912]) await op.recordDisbursement(input({ refId: id(String(periodId)), programId: id('wide'), periodId }))
    await op.recordDisbursement(input({ periodId: 202612 }))
  })
  it('registers directly, preserves idempotent registration and enforces 1–100 cap atomically', async () => {
    const { ledger, op } = await loadFixture(fixture)
    const commitments = Array.from({ length: 100 }, (_, i) => id(`batch-${i}`))
    await expect(op.registerRecipients(programId, commitments)).to.emit(ledger, 'RecipientsRegistered').withArgs(programId, 100)
    await expect(op.registerRecipients(programId, [commitment])).to.emit(ledger, 'RecipientsRegistered').withArgs(programId, 1)
    for (const items of [[], [...commitments, id('101')]]) await expect(op.registerRecipients(programId, items)).to.be.revertedWithCustomError(ledger, 'InvalidBatchSize')
    const fresh = id('fresh-registration')
    await expect(op.registerRecipients(programId, [fresh, ZeroHash])).to.be.revertedWithCustomError(ledger, 'InvalidCommitment')
    expect(await ledger.isRecipientRegistered(programId, fresh)).to.equal(false)
  })
  it('records zero refId safely, marks it consumed and never permits overwrite', async () => {
    const { ledger, op } = await loadFixture(fixture)
    await op.recordDisbursement(input({ refId: ZeroHash }))
    await expect(op.recordDisbursement(input({ refId: ZeroHash, periodId: 202602 }))).to.be.revertedWithCustomError(ledger, 'RefIdAlreadyUsed')
  })
})

describe('Atomic batches, pausing and two-step ownership', () => {
  it('records 25 items with one event per item; empty and 26-item batches fail', async () => {
    const { ledger, op } = await loadFixture(fixture)
    const commitments = Array.from({ length: 25 }, (_, i) => id(`recipient-${i}`))
    await op.registerRecipients(programId, commitments)
    const items = commitments.map((recipientCommitment, i) => input({ refId: id(`ref-${i}`), recipientCommitment }))
    const receipt = await (await op.recordDisbursementBatch(items)).wait()
    expect(receipt.logs).to.have.length(25)
    for (const item of items) expect((await ledger.getDisbursement(item.refId)).recipientCommitment).to.equal(item.recipientCommitment)
    for (const items of [[], Array.from({ length: 26 }, () => input())]) await expect(op.recordDisbursementBatch(items)).to.be.revertedWithCustomError(ledger, 'InvalidBatchSize')
  })
  it('rolls back state and logs when a later item fails; ref IDs remain reusable', async () => {
    const { ledger, op } = await loadFixture(fixture)
    const next = input({ refId: id('next'), recipientCommitment: second, evidenceCid: '' })
    await expect(op.recordDisbursementBatch([input(), next])).to.be.revertedWithCustomError(ledger, 'InvalidEvidenceCid')
    expect(await ledger.isDisbursed(programId, 202601, commitment)).to.equal(false)
    expect((await ledger.getDisbursement(input().refId)).programId).to.equal(ZeroHash)
    expect(await ledger.queryFilter(ledger.filters.DisbursementRecorded())).to.have.length(0)
    await expect(op.recordDisbursementBatch([input()])).not.to.be.reverted
  })
  it('rejects duplicates and replay refs inside a batch without partial writes', async () => {
    const { ledger, op } = await loadFixture(fixture)
    await expect(op.recordDisbursementBatch([input(), input({ refId: id('other') })])).to.be.revertedWithCustomError(ledger, 'AlreadyDisbursed')
    await expect(op.recordDisbursementBatch([input(), input({ recipientCommitment: second })])).to.be.revertedWithCustomError(ledger, 'RefIdAlreadyUsed')
    expect(await ledger.isDisbursed(programId, 202601, commitment)).to.equal(false)
  })
  it('only owner can administer; pause disables all operational methods but leaves views and rotation available', async () => {
    const { ledger, op, owner, operator, successor } = await loadFixture(fixture)
    for (const call of [() => op.pause(), () => op.unpause(), () => op.setAuthorizedWallet(successor.address), () => op.transferOwnership(successor.address)]) await expect(call()).to.be.revertedWithCustomError(ledger, 'OwnableUnauthorizedAccount').withArgs(operator.address)
    await expect(op.renounceOwnership()).to.be.revertedWithCustomError(ledger, 'RenounceDisabled')
    await expect(ledger.unpause()).to.be.revertedWithCustomError(ledger, 'ExpectedPause')
    await expect(ledger.pause()).to.emit(ledger, 'Paused').withArgs(owner.address)
    await expect(ledger.pause()).to.be.revertedWithCustomError(ledger, 'EnforcedPause')
    for (const call of [() => op.createProgram(id('paused'), amount, 202601, 202612), () => op.registerRecipients(programId, [second]), () => op.closeProgram(programId), () => op.recordDisbursement(input()), () => op.recordDisbursementBatch([input()])]) await expect(call()).to.be.revertedWithCustomError(ledger, 'EnforcedPause')
    expect((await ledger.getProgram(programId)).exists).to.equal(true)
    await expect(ledger.setAuthorizedWallet(successor.address)).to.emit(ledger, 'AuthorizedWalletChanged').withArgs(operator.address, successor.address)
    await expect(ledger.unpause()).to.emit(ledger, 'Unpaused').withArgs(owner.address)
    await expect(op.recordDisbursement(input())).to.be.revertedWithCustomError(ledger, 'NotAuthorized')
    await expect((ledger.connect(successor) as Contract).recordDisbursement(input())).not.to.be.reverted
  })
  it('rejects invalid authorized wallets at construction and rotation', async () => {
    const { ledger, factory, owner } = await loadFixture(fixture)
    for (const address of [ZeroAddress, owner.address]) {
      await expect(factory.deploy(address)).to.be.revertedWithCustomError(ledger, 'InvalidWallet')
      await expect(ledger.setAuthorizedWallet(address)).to.be.revertedWithCustomError(ledger, 'InvalidWallet')
    }
  })
  it('transfers ownership in two steps; old owner loses administration', async () => {
    const { ledger, owner, successor, stranger } = await loadFixture(fixture)
    await expect(ledger.transferOwnership(successor.address)).to.emit(ledger, 'OwnershipTransferStarted').withArgs(owner.address, successor.address)
    expect(await ledger.pendingOwner()).to.equal(successor.address); expect(await ledger.owner()).to.equal(owner.address)
    await expect((ledger.connect(stranger) as Contract).acceptOwnership()).to.be.revertedWithCustomError(ledger, 'OwnableUnauthorizedAccount').withArgs(stranger.address)
    await expect((ledger.connect(successor) as Contract).acceptOwnership()).to.emit(ledger, 'OwnershipTransferred').withArgs(owner.address, successor.address)
    expect(await ledger.pendingOwner()).to.equal(ZeroAddress)
    await expect(ledger.pause()).to.be.revertedWithCustomError(ledger, 'OwnableUnauthorizedAccount').withArgs(owner.address)
  })
  it('owner can cancel a pending transfer using OpenZeppelin two-step semantics', async () => {
    const { ledger, successor } = await loadFixture(fixture)
    await ledger.transferOwnership(successor.address); await ledger.transferOwnership(ZeroAddress)
    expect(await ledger.pendingOwner()).to.equal(ZeroAddress)
    await expect((ledger.connect(successor) as Contract).acceptOwnership()).to.be.revertedWithCustomError(ledger, 'OwnableUnauthorizedAccount')
  })
  it('an operator that becomes owner cannot operate until owner rotates the operational role', async () => {
    const { ledger, op, operator, successor } = await loadFixture(fixture)
    await ledger.transferOwnership(operator.address); await op.acceptOwnership()
    await expect(op.recordDisbursement(input())).to.be.revertedWithCustomError(ledger, 'NotAuthorized')
    await op.setAuthorizedWallet(successor.address)
    await expect((ledger.connect(successor) as Contract).recordDisbursement(input())).not.to.be.reverted
  })
  it('rejects stranger and operator renunciation with RenounceDisabled and preserves owner and pendingOwner', async () => {
    const { ledger, op, stranger, successor } = await loadFixture(fixture)
    const originalOwner = await ledger.owner()
    await ledger.transferOwnership(successor.address)
    for (const caller of [ledger.connect(stranger) as Contract, op]) {
      await expect(caller.renounceOwnership())
        .to.be.revertedWithCustomError(ledger, 'RenounceDisabled')
      expect(await ledger.owner()).to.equal(originalOwner)
      expect(await ledger.pendingOwner()).to.equal(successor.address)
    }
  })
  it('renunciation cannot discard ownership or pending transfer, including while paused', async () => {
    const { ledger, owner, operator, successor, stranger } = await loadFixture(fixture)
    await ledger.transferOwnership(successor.address)
    for (const paused of [false, true]) {
      if (paused) await ledger.pause()
      await expect(ledger.renounceOwnership()).to.be.revertedWithCustomError(ledger, 'RenounceDisabled')
      expect(await ledger.owner()).to.equal(owner.address)
      expect(await ledger.pendingOwner()).to.equal(successor.address)
      await expect((ledger.connect(stranger) as Contract).renounceOwnership()).to.be.revertedWithCustomError(ledger, 'RenounceDisabled')
      expect(await ledger.owner()).to.equal(owner.address)
      expect(await ledger.pendingOwner()).to.equal(successor.address)
    }
    await expect(ledger.setAuthorizedWallet(stranger.address)).to.emit(ledger, 'AuthorizedWalletChanged').withArgs(operator.address, stranger.address)
    const next = ledger.connect(successor) as Contract
    await next.acceptOwnership()
    await expect(next.renounceOwnership()).to.be.revertedWithCustomError(ledger, 'RenounceDisabled')
    expect(await ledger.owner()).to.equal(successor.address)
    expect(await ledger.pendingOwner()).to.equal(ZeroAddress)
    await next.setAuthorizedWallet(operator.address)
    await next.unpause()
    expect(await ledger.authorizedWallet()).to.equal(operator.address)
  })
  it('covers inherited OwnableInvalidOwner using the actual OZ constructor harness', async () => {
    const factory = await ethers.getContractFactory('OwnershipHarness')
    await expect(factory.deploy(ZeroAddress)).to.be.revertedWithCustomError(factory, 'OwnableInvalidOwner').withArgs(ZeroAddress)
  })
  it('has no payable entrypoint, rejects ETH and has no token/ETH transfer API', async () => {
    const { ledger, owner } = await loadFixture(fixture)
    const artifact = await artifacts.readArtifact('BansosLedger')
    expect(artifact.abi.some(item => item.type === 'receive' || item.type === 'fallback' || item.stateMutability === 'payable')).to.equal(false)
    await expect(owner.sendTransaction({ to: await ledger.getAddress(), value: 1n })).to.be.reverted
  })
})
