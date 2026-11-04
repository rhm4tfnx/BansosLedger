import { expect } from 'chai'
import { artifacts, ethers } from 'hardhat'
import { Contract, Interface, FunctionFragment, EventFragment, ErrorFragment, type ParamType } from 'ethers'
import { backendInterface } from './backend-abi'

function shape(params: readonly ParamType[]): unknown[] {
  return params.map(param => ({ type: param.format('sighash'), indexed: Boolean(param.indexed), components: param.components ? shape(param.components) : null, array: param.arrayChildren ? shape([param.arrayChildren]) : null }))
}

describe('Compiled ABI compatibility with unchanged backend specification', () => {
  const expected = backendInterface()
  for (const fragment of expected.fragments) {
    it(`matches ${fragment.type} ${fragment.format('sighash')}`, async () => {
      const actual = new Interface((await artifacts.readArtifact('BansosLedger')).abi)
      const signature = fragment.format('sighash')
      if (fragment instanceof FunctionFragment) {
        const match = actual.getFunction(signature)
        expect(match, signature).not.to.equal(null)
        expect(match!.selector).to.equal(fragment.selector)
        expect(match!.stateMutability).to.equal(fragment.stateMutability)
        expect(shape(match!.inputs)).to.deep.equal(shape(fragment.inputs))
        expect(shape(match!.outputs)).to.deep.equal(shape(fragment.outputs))
      } else if (fragment instanceof EventFragment) {
        const match = actual.getEvent(signature)
        expect(match, signature).not.to.equal(null)
        expect(match!.topicHash).to.equal(fragment.topicHash)
        expect(match!.anonymous).to.equal(fragment.anonymous)
        expect(shape(match!.inputs)).to.deep.equal(shape(fragment.inputs))
      } else if (fragment instanceof ErrorFragment) {
        const match = actual.getError(signature)
        expect(match, signature).not.to.equal(null)
        expect(match!.selector).to.equal(fragment.selector)
        expect(shape(match!.inputs)).to.deep.equal(shape(fragment.inputs))
      } else throw new Error(`Unhandled ABI fragment: ${fragment.type}`)
    })
  }

  it('SC-D9: exposes pure renounceOwnership() and RenounceDisabled() error, and reverts with RenounceDisabled for owner and stranger while preserving owner and pendingOwner', async () => {
    const actual = new Interface((await artifacts.readArtifact('BansosLedger')).abi)
    const renounceFn = actual.getFunction('renounceOwnership()')
    expect(renounceFn).not.to.equal(null)
    expect(renounceFn!.stateMutability).to.equal('pure')
    expect(actual.getError('RenounceDisabled()')).not.to.equal(null)
    expect(actual.getError('RenounceOwnershipDisabled()')).to.equal(null)

    const [owner, operator, stranger, successor] = await ethers.getSigners()
    const factory = await ethers.getContractFactory('BansosLedger', owner)
    const ledger = (await factory.deploy(operator.address)) as unknown as Contract
    await ledger.waitForDeployment()
    await ledger.transferOwnership(successor.address)

    for (const caller of [ledger, ledger.connect(stranger) as Contract]) {
      await expect(caller.renounceOwnership()).to.be.revertedWithCustomError(ledger, 'RenounceDisabled')
      expect(await ledger.owner()).to.equal(owner.address)
      expect(await ledger.pendingOwner()).to.equal(successor.address)
    }
  })
})
