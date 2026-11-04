import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Contract, ZeroHash, id } from 'ethers'

type Input = { refId: string; programId: string; periodId: number; recipientCommitment: string; amount: bigint; evidenceCid: string }
const SEED = 0x250204
function generator(seed: number) {
  let state = seed >>> 0
  return (limit: number) => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5
    return (state >>> 0) % limit
  }
}
function tuple(d: Pick<Input, 'programId' | 'periodId' | 'recipientCommitment'>) {
  return `${d.programId}:${d.periodId}:${d.recipientCommitment}`
}

describe('SC-Q4 seeded state/event and amount invariants', () => {
  it(`preserves invariants after 240 randomized operations (seed ${SEED})`, async function () {
    this.timeout(300000)
    const random = generator(SEED)
    const [owner, operator, outsider] = await ethers.getSigners()
    const ledger = await (await ethers.getContractFactory('BansosLedger', owner)).deploy(operator.address) as unknown as Contract
    await ledger.waitForDeployment()
    const op = ledger.connect(operator) as Contract, unauthorized = ledger.connect(outsider) as Contract
    const programs = Array.from({ length: 3 }, (_, i) => ({ programId: id(`invariant-program-${i}`), amount: BigInt((i + 1) * 100000) }))
    const periods = [202601, 202602, 202603]
    const commitments = Array.from({ length: 3 }, (_, i) => id(`invariant-commitment-${i}`))
    const refs = Array.from({ length: 32 }, (_, i) => id(`invariant-ref-${i}`))
    const unknownProgram = id('unknown-program'), unregistered = id('unregistered-commitment')
    for (const program of programs) {
      await (await op.createProgram(program.programId, program.amount, periods[0], periods[2])).wait()
      await (await op.registerRecipients(program.programId, commitments)).wait()
    }
    const universe = [...programs.map(p => p.programId), unknownProgram].flatMap(programId =>
      [...periods, 202604].flatMap(periodId => [...commitments, unregistered].map(recipientCommitment => ({ programId, periodId, recipientCommitment }))))
    let model = new Map<string, Input>()
    let successful = 0, rejected = 0, repeated = 0, batches = 0
    function draw(): Input {
      const program = programs[random(programs.length)]
      return { refId: refs[random(refs.length)], programId: program.programId, periodId: periods[random(periods.length)], recipientCommitment: commitments[random(commitments.length)], amount: program.amount, evidenceCid: 'bafy' + 'a'.repeat(50) }
    }
    function predict(items: Input[], allowed: boolean): { error?: string; records: Map<string, Input> } {
      const records = new Map(model)
      const fail = (error: string) => ({ error, records: model })
      if (!allowed) return fail('NotAuthorized')
      for (const item of items) {
        const program = programs.find(p => p.programId === item.programId)
        if (!program) return fail('ProgramNotFound')
        if (!periods.includes(item.periodId)) return fail('PeriodOutOfRange')
        if (!commitments.includes(item.recipientCommitment)) return fail('RecipientNotRegistered')
        if (item.amount !== program.amount) return fail('AmountMismatch')
        if ([...records.values()].some(record => tuple(record) === tuple(item))) return fail('AlreadyDisbursed')
        if (records.has(item.refId)) return fail('RefIdAlreadyUsed')
        if (Buffer.byteLength(item.evidenceCid) < 46 || Buffer.byteLength(item.evidenceCid) > 100) return fail('InvalidEvidenceCid')
        records.set(item.refId, { ...item })
      }
      return { records }
    }
    for (let step = 0; step < 240; step++) {
      const label = `seed=${SEED} step=${step}`
      const mode = random(10)
      let item = draw(), allowed = true, batch = false
      const previous = [...model.values()]
      if (mode === 2 && previous.length) {
        item.refId = previous[random(previous.length)].refId
        repeated++
      }
      if (mode === 3 && previous.length) {
        item = { ...previous[random(previous.length)] }
        repeated++
      }
      if (mode === 4) item.amount += 1n
      if (mode === 5) item.evidenceCid = ''
      if (mode === 6) allowed = false
      if (mode === 9) {
        const invalid = random(3)
        if (invalid === 0) item.programId = unknownProgram
        if (invalid === 1) item.periodId = 202604
        if (invalid === 2) item.recipientCommitment = unregistered
      }
      const items = [item]
      if (mode === 7 || mode === 8) {
        batch = true; batches++
        const next = draw()
        if (mode === 7) next.amount += 1n
        items.push(next)
      }
      const expected = predict(items, allowed)
      const caller = allowed ? op : unauthorized
      const write = () => batch ? caller.recordDisbursementBatch(items) : caller.recordDisbursement(items[0])
      if (expected.error) {
        await expect(write(), label).to.be.revertedWithCustomError(ledger, expected.error)
        rejected++
      } else {
        await (await write()).wait()
        model = expected.records
        successful++
      }

      const logs = await ledger.queryFilter(ledger.filters.DisbursementRecorded())
      const counts = new Map<string, number>(), eventRefs = new Set<string>()
      expect(logs.length, label).to.equal(model.size)
      for (const log of logs) {
        const event = ledger.interface.parseLog(log)!
        const key = tuple({ programId: event.args.programId, periodId: Number(event.args.periodId), recipientCommitment: event.args.recipientCommitment })
        counts.set(key, (counts.get(key) ?? 0) + 1)
        expect(counts.get(key), label).to.equal(1)
        expect(eventRefs.has(event.args.refId), label).to.equal(false)
        eventRefs.add(event.args.refId)
        const expectedRecord = model.get(event.args.refId)
        expect(expectedRecord, label).not.to.equal(undefined)
        expect(key, label).to.equal(tuple(expectedRecord!))
        expect(event.args.amount, label).to.equal(expectedRecord!.amount)
      }
      await Promise.all(universe.map(async key => {
        const count = counts.get(tuple(key)) ?? 0
        expect(count, label).to.be.at.most(1)
        expect(await ledger.isDisbursed(key.programId, key.periodId, key.recipientCommitment), label).to.equal(count === 1)
        expect(count === 1, label).to.equal([...model.values()].some(record => tuple(record) === tuple(key)))
      }))
      const terms = new Map(await Promise.all(programs.map(async p => [p.programId, (await ledger.getProgram(p.programId)).amountPerRecipient] as const)))
      // Inspect every possible reference, including rejected batch references, not just those with events.
      await Promise.all(refs.map(async refId => {
        const stored = await ledger.getDisbursement(refId)
        const expectedRecord = model.get(refId)
        if (!expectedRecord) {
          expect(stored.programId, label).to.equal(ZeroHash)
          expect(stored.amount, label).to.equal(0n)
          return
        }
        expect(stored.programId, label).to.equal(expectedRecord.programId)
        expect(stored.periodId, label).to.equal(BigInt(expectedRecord.periodId))
        expect(stored.recipientCommitment, label).to.equal(expectedRecord.recipientCommitment)
        expect(stored.amount, label).to.equal(terms.get(stored.programId))
        expect(stored.evidenceCid, label).to.equal(expectedRecord.evidenceCid)
        expect(eventRefs.has(refId), label).to.equal(true)
      }))
    }
    expect(successful).to.be.greaterThan(0)
    expect(rejected).to.be.greaterThan(0)
    expect(repeated).to.be.greaterThan(0)
    expect(batches).to.be.greaterThan(0)
    expect(new Set([...model.values()].map(record => record.programId)).size).to.equal(3)
    expect(new Set([...model.values()].map(record => record.periodId)).size).to.equal(3)
    expect(new Set([...model.values()].map(record => record.recipientCommitment)).size).to.equal(3)
  })
})
