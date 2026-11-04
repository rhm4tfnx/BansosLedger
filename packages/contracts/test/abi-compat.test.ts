import { expect } from 'chai'
import { artifacts } from 'hardhat'
import { Interface, FunctionFragment, EventFragment, ErrorFragment, type ParamType } from 'ethers'
import { backendInterface } from './backend-abi'

function shape(params: readonly ParamType[]): unknown[] {
  return params.map(param => ({ type: param.format('sighash'), indexed: param.indexed ?? null, components: param.components ? shape(param.components) : null, array: param.arrayChildren ? shape([param.arrayChildren]) : null }))
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
})
