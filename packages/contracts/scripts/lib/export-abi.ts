import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'
export async function exportABI(hre: HardhatRuntimeEnvironment) {
  const artifact = await hre.artifacts.readArtifact('BansosLedger')
  const directory = join(hre.config.paths.root, 'abi')
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'BansosLedger.json'), JSON.stringify(artifact.abi, null, 2) + '\n')
}
