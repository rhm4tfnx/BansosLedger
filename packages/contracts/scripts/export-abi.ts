import hre from 'hardhat'
import { exportABI } from './lib/export-abi'
exportABI(hre).catch(() => { console.error('ABI export failed. Compile the contract first.'); process.exitCode = 1 })
