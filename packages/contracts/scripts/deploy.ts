import hre, { ethers } from 'hardhat'
import { execFileSync } from 'node:child_process'
import { mkdir, open, readFile, writeFile, unlink, access } from 'node:fs/promises'
import { join } from 'node:path'
import { Contract, getAddress, getCreateAddress, id, keccak256, ZeroAddress } from 'ethers'
import { exportABI } from './lib/export-abi'

async function exists(path: string) { try { await access(path); return true } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error } }
class GitPreflightError extends Error {}
function deploymentCommit(): string {
  const options = { cwd: hre.config.paths.root, encoding: 'utf8' as const, stdio: ['ignore', 'pipe', 'pipe'] as ['ignore', 'pipe', 'pipe'] }
  try {
    if (execFileSync('git', ['rev-parse', '--is-inside-work-tree'], options).trim() !== 'true') throw new Error('Not a working tree')
  } catch {
    throw new GitPreflightError('Deployment stopped: the project folder is not a Git repository or Git is unavailable. Git is required for gitCommit provenance and the clean-tree rule.')
  }
  try {
    if (execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], options).trim()) {
      throw new GitPreflightError('Deployment stopped: the Git working tree is not clean. Commit or remove uncommitted changes first; Git is required for gitCommit provenance and the clean-tree rule.')
    }
    return execFileSync('git', ['rev-parse', 'HEAD'], options).trim()
  } catch (error) {
    if (error instanceof GitPreflightError) throw error
    throw new GitPreflightError('Deployment stopped: Git could not determine gitCommit or inspect the working tree. A readable Git repository with a HEAD commit and a clean tree is required.')
  }
}
async function main() {
  if (!['localhost', 'besu'].includes(hre.network.name)) throw new Error('Use an explicit localhost or besu network')
  const gitCommit = deploymentCommit()
  const isLocal = hre.network.name === 'localhost'
  const actualChainId = BigInt(await ethers.provider.send('eth_chainId', []))
  if (actualChainId !== BigInt(hre.network.config.chainId!)) throw new Error('RPC chain ID mismatch')
  if (!isLocal && [1n, 1337n, 31337n].includes(actualChainId)) throw new Error('Reserved chain ID is forbidden outside local dev')
  if (!isLocal && process.env.CONFIRM_DEPLOY !== actualChainId.toString()) throw new Error('Set CONFIRM_DEPLOY to the intended chain ID locally (default CHAIN_ID: 250204)')
  const authorizedWallet = getAddress(process.env.AUTHORIZED_WALLET ?? '')
  const [signer] = await ethers.getSigners()
  if (!signer) throw new Error('Owner signer unavailable')
  const owner = getAddress(await signer.getAddress())
  if (authorizedWallet === ZeroAddress || authorizedWallet === owner) throw new Error('Owner and authorized wallet must be distinct and nonzero')
  if (!isLocal && (!process.env.EXPECTED_OWNER || getAddress(process.env.EXPECTED_OWNER) !== owner)) throw new Error('EXPECTED_OWNER does not match the signer')
  const artifact = await hre.artifacts.readArtifact('BansosLedger')
  const build = await hre.artifacts.getBuildInfo(`${artifact.sourceName}:${artifact.contractName}`)
  if (!build || build.solcVersion !== '0.8.28' || build.input.settings.evmVersion !== 'paris') throw new Error('Expected Solidity 0.8.28 / Paris build')
  const source = await readFile(join(hre.config.paths.root, artifact.sourceName), 'utf8')
  if (build.input.sources[artifact.sourceName].content !== source) throw new Error('Instrumented or stale build: recompile normally before deployment')
  const directory = join(hre.config.paths.root, 'deployments')
  await mkdir(directory, { recursive: true })
  const target = join(directory, `${actualChainId}.json`), pending = join(directory, `${actualChainId}.pending.json`)
  const lockPath = join(hre.config.paths.root, '.deploy.lock')
  const lock = await open(lockPath, 'wx', 0o600)
  try {
    if (await exists(target) || await exists(pending)) throw new Error('Deployment or pending journal exists; investigate rather than redeploy')
    const nonce = await signer.getNonce('pending'), predictedAddress = getCreateAddress({ from: owner, nonce })
    const metadata = { chainId: actualChainId.toString(), owner, authorizedWallet, compilerVersion: build.solcVersion, compilerLongVersion: build.solcLongVersion, evmVersion: 'paris', gitCommit, nonce, predictedAddress }
    await writeFile(pending, JSON.stringify({ ...metadata, stage: 'prepared' }, null, 2) + '\n', { flag: 'wx' })
    const factory = await ethers.getContractFactory('BansosLedger', signer)
    const ledger = await factory.deploy(authorizedWallet, { nonce }) as unknown as Contract
    const tx = ledger.deploymentTransaction()
    if (!tx) throw new Error('Deployment transaction unavailable; inspect pending journal')
    await writeFile(pending, JSON.stringify({ ...metadata, stage: 'submitted', txHash: tx.hash }, null, 2) + '\n')
    const receipt = await tx.wait(1, 120000)
    if (!receipt || receipt.status !== 1) throw new Error('Deployment not confirmed; inspect pending journal')
    const address = await ledger.getAddress()
    const deployedCode = await ethers.provider.getCode(address)
    const codeHash = keccak256(deployedCode)
    if (getAddress(address) !== getAddress(predictedAddress) || codeHash !== keccak256(artifact.deployedBytecode)) throw new Error('Deployment address or runtime code hash mismatch')
    if (getAddress(await ledger.authorizedWallet()) !== authorizedWallet || getAddress(await ledger.owner()) !== owner || await ledger.paused()) throw new Error('Post-deploy role/pause checks failed')
    const outsider = '0x000000000000000000000000000000000000dEaD'
    const unauthorized = outsider.toLowerCase() === authorizedWallet.toLowerCase() ? '0x0000000000000000000000000000000000000001' : outsider
    let denied = false
    try {
      await ethers.provider.call({ from: unauthorized, to: address, data: ledger.interface.encodeFunctionData('createProgram', [id('POST_DEPLOY_PROBE'), 1n, 202601, 202601]) })
    } catch (error) {
      const value = error as { data?: string; info?: { error?: { data?: string } } }
      const data = value.data ?? value.info?.error?.data
      if (typeof data === 'string') {
        try { denied = ledger.interface.parseError(data)?.name === 'NotAuthorized' } catch { denied = false }
      }
    }
    if (!denied) throw new Error('Unauthorized eth_call did not return NotAuthorized; investigate RPC permissions')
    await exportABI(hre)
    await writeFile(target, JSON.stringify({ ...metadata, address, block: receipt.blockNumber, txHash: receipt.hash, codeHash, checks: { owner: true, authorizedWallet: true, paused: false, runtimeCode: true, unauthorizedCallRejected: true } }, null, 2) + '\n', { flag: 'wx' })
    await unlink(pending)
    console.log(`Verified deployment ${address} on chain ${actualChainId}; metadata: ${target}`)
  } finally { await lock.close(); await unlink(lockPath) }
}
main().catch((error: unknown) => {
  if (error instanceof GitPreflightError) console.error(error.message)
  console.error('Deployment failed or is incomplete. Inspect the local pending journal and chain before retrying; no automatic redeploy was attempted.')
  process.exitCode = 1
})
