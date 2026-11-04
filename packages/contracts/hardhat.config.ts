import '@nomicfoundation/hardhat-toolbox'
import { task, subtask, type HardhatUserConfig } from 'hardhat/config'
import { TASK_COMPILE, TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } from 'hardhat/builtin-tasks/task-names'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { exportABI } from './scripts/lib/export-abi'

function chainId(value: string): number {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error('Invalid chain ID')
  return Number(value)
}
const localChainId = chainId(process.env.LOCAL_CHAIN_ID ?? '250204')
const remoteUrl = process.env.RPC_URL
const remoteChainId = remoteUrl ? chainId(process.env.CHAIN_ID ?? '250204') : undefined
if (remoteChainId && [1, 1337, 31337].includes(remoteChainId)) throw new Error('Reserved local/mainnet chain ID cannot be used for Besu')
if (remoteUrl && !/^https?:\/\//.test(remoteUrl)) throw new Error('RPC_URL must use HTTP(S)')
mkdirSync(join(__dirname, 'reports'), { recursive: true })

subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(async ({ solcVersion }: { solcVersion: string }, _hre, runSuper) => {
  if (solcVersion !== '0.8.28') return runSuper()
  return { compilerPath: require.resolve('solc/soljson.js'), isSolcJs: true, version: '0.8.28', longVersion: require('solc').version() as string }
})
task(TASK_COMPILE).setAction(async (args, hre, runSuper) => {
  const result = await runSuper(args)
  if (process.env.COVERAGE !== 'true') await exportABI(hre)
  return result
})

const config: HardhatUserConfig = {
  solidity: { version: '0.8.28', settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'paris' } },
  networks: {
    hardhat: { chainId: localChainId, hardfork: 'merge' },
    localhost: { url: 'http://127.0.0.1:8545', chainId: localChainId },
    ...(remoteUrl ? { besu: {
      url: remoteUrl,
      chainId: remoteChainId,
      accounts: process.env.OWNER_PRIVATE_KEY ? [process.env.OWNER_PRIVATE_KEY] : [],
      httpHeaders: process.env.RPC_API_KEY ? { 'X-API-Key': process.env.RPC_API_KEY } : {},
      timeout: 60000,
    } } : {}),
  },
  typechain: { outDir: 'typechain-types', target: 'ethers-v6' },
  gasReporter: { enabled: process.env.REPORT_GAS === 'true', outputFile: 'reports/gas.txt', noColors: true },
  mocha: { timeout: 60000 },
}
export default config
