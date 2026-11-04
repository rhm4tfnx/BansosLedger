# BansosLedger contracts

Isolated Hardhat **2.28.0**, toolbox **6.1.0**, ethers **6**, OpenZeppelin **5.4.0** package. Solidity is pinned to **0.8.28**, optimizer 200 runs, EVM **Paris**. The compiler comes from the pinned `solc` package; Hardhat does not download another compiler. Use Node 22 LTS and the repository's pinned pnpm version on a local development machine. No backend source is modified by this package.

## Verification status and generated deliverables

The package includes executable tests and quality gates, **not a claim of measured coverage or a completed security audit**. Compilation, Hardhat tests, coverage, gas measurement, Slither and deployment are local tasks. Solhint and TypeScript can run independently of Solidity compilation.

A normal successful compilation automatically exports the **actual compiled ABI** to `packages/contracts/abi/BansosLedger.json`. No hand-written or purportedly compiled ABI is supplied before compilation. Commit that generated file after the local compatibility gate passes. Gas and coverage reports are also generated only by real runs; none are fabricated. The export path in this request takes precedence over the older PRD's `packages/shared` suggestion. Exporting does not change `src/lib/blockchain/abi.ts` or publish an Explorer UI.

## Local commands

From the repository root after checking out the code through GitHub or the v0 shadcn CLI:

```bash
pnpm install --frozen-lockfile
pnpm --filter @bansos/contracts compile
pnpm --filter @bansos/contracts typecheck
pnpm --filter @bansos/contracts test
pnpm --filter @bansos/contracts test:abi
pnpm --filter @bansos/contracts coverage
pnpm --filter @bansos/contracts gas
pnpm --filter @bansos/contracts compile --force
pnpm --filter @bansos/contracts export:abi
pnpm --filter @bansos/contracts lint
```

Install Slither locally (Python 3.10+ and pipx), then run the supplied configuration:

```bash
pipx install slither-analyzer==0.11.3
pnpm --filter @bansos/contracts slither
```

Slither invokes Hardhat compilation through crytic-compile. Run it with pnpm's executable PATH as above. `slither.config.json` fails on unmitigated Medium/High findings and excludes dependency/test-harness findings, not production ledger findings. Inspect Low/Informational findings too; do not suppress issues merely to pass. Save each run's output and resolve any Medium/High findings before deployment. Delete or archive prior Slither output files before rerunning if Slither refuses to overwrite them.

The complete local gate, after installing Slither, is:

```bash
pnpm --filter @bansos/contracts check
```

This gate compiles, checks TypeScript, tests, enforces **95% branch coverage**, produces a gas report, recompiles uninstrumented bytecode, lints with zero allowed warnings, then runs Slither. Coverage uses the actual `coverage.json` branch counters for `BansosLedger.sol`, fails closed if counters are missing, and writes `reports/coverage-gate.json`. It does not lower the threshold or count the test harness as core coverage. Coverage instrumentation must never be deployed: the deploy script also checks the build-input source against the on-disk production source.

Retain these actual outputs as local/CI build artifacts:

- `abi/BansosLedger.json` — compiled ABI, suitable for review/commit.
- `artifacts/`, `cache/` and `typechain-types/` — Hardhat compilation and types (ignored by Git).
- `coverage/` and `coverage.json` — branch data, HTML and LCOV.
- `reports/coverage-gate.json` — measured branch coverage and threshold result.
- `reports/gas.txt` — Hardhat Gas Reporter per-function measurements; no external price API is required.
- `reports/slither.json` and `reports/slither.sarif` — static-analysis findings.
- `deployments/<chainId>.json` — successful deployment provenance (commit this public metadata).

After the gates pass, `pnpm --filter @bansos/contracts reports:archive` packages the actual ABI, gas, coverage, Slither and compiler outputs into `reports/contracts-<commit>-<timestamp>.tar.gz`. It refuses missing measured reports. Retain this archive in your audit/CI artifact store; it is not created by this code-generation session.

## ABI and security decisions

`test/abi-compat.test.ts` reads the unchanged backend ABI using the TypeScript AST (no backend imports or runtime execution). It compares every backend function's selector, input/output tuple types and state mutability, every event's signature, anonymous flag and indexed fields, and every custom error's selector and arguments against the **compiled** artifact. It fails on unsupported/nonliteral spec entries rather than silently skipping them.

Solidity cannot declare an error and event named `ProgramClosed` in the same scope. The error is declared in `LedgerErrors` and referenced as `LedgerErrors.ProgramClosed()`; the contract emits `ProgramClosed(bytes32)`. Both required signatures appear in the compiled contract ABI and are checked by the compatibility test.

Operational calls require `authorizedWallet` and explicitly exclude the owner, even if an ownership transfer temporarily makes those addresses equal. In that case the new owner must rotate the operational wallet before recording resumes. Constructor and rotation reject zero and current-owner addresses. The owner cannot create programs, register recipients, close programs, or record assistance.

`Ownable2Step` and `Pausable` come from OpenZeppelin. Two-step transfer remains available, but `BansosLedger` overrides `renounceOwnership()` to revert with `RenounceOwnershipDisabled()` for the owner (nonowners still fail `onlyOwner`). Ownership and pending transfers remain unchanged, even while paused, preserving institutional administration and operational wallet rotation. `OwnableInvalidOwner` is an inherited ABI error whose zero-owner constructor path cannot be reached in the ledger because its owner is `msg.sender`; a test-only harness exercises the actual OZ guard. The harness is excluded from core coverage and never deployed by `deploy.ts`.

Single recording performs exactly PRD 10.3: authorization, pause, program existence/closure, period, registration, amount, duplicate tuple, global ref replay, CID bounds. It emits exactly one event with `recordedBy = msg.sender` and `recordedAt = uint64(block.timestamp)`. Batches emit one per item and revert all state/logs on any failure. There is no proxy, multicall, edit/delete method, fallback, receive hook, or value-transfer operation.

Additional deterministic input policies: IDs of programs and commitments are nonzero; program amounts are positive; YYYYMM has four-digit years 1000–9999 and months 01–12; windows are inclusive and ordered. Registration accepts 1–100 commitments, is idempotent and emits the submitted array length. Disbursement batches accept 1–25 records. CIDs are checked for **46–100 bytes**, not actual content availability, authenticity, or IPFS multicodec validity. Global zero `refId` is permitted but still consumed exactly once; normal backend refs are hashed identifiers. Extra custom errors cover these input policies without changing backend signatures.

### SC-Q4 randomized invariants

`test/invariants.test.ts` uses fixed seed `0x250204` for 240 random single/batch operations over three programs, three periods and three registered commitments, plus invalid program/period/commitment inputs. It includes duplicate tuples, replay refs, bad amounts/CIDs and unauthorized writes. After **every** operation, including rejection, it checks the entire bounded tuple space against independently queried events (at most one event and `isDisbursed` iff one exists), all possible reference slots against an independent atomic-write model, and every stored amount against its program terms. Coverage counters require successful, rejected, repeated and batch operations across all three dimensions. These executable tests still require a local Hardhat run; their presence is not a passing result.

### SP-01 … SP-09 test scope

| Scenario | Local contract evidence | Separate integration acceptance still needed |
| --- | --- | --- |
| SP-01 | Duplicate tuple rejected, one record/event | UI and MongoDB uniqueness |
| SP-02 | Wrong amounts rejected | UI hides amount editing |
| SP-03 | Owner/outsider denied on every operational method | MetaMask warning and Besu account allowlist |
| SP-04 | Unregistered/cross-program commitments rejected | FINAL/NIK validation remains backend-only |
| SP-05 | No mutation entrypoint, record immutable, block-parent linkage checked | Tamper MongoDB and run real reconciliation |
| SP-06 | Reused ref on a fresh tuple rejected | Exact replay fails earlier as `AlreadyDisbursed`, per required validation order |
| SP-07 | Closed/unknown program, malformed/out-of-range period rejected | UI eligibility |
| SP-08 | Simulated altered off-chain CID differs from immutable event/record | Real MongoDB-to-chain mismatch report and Explorer |
| SP-09 | Empty/short/long CID rejected; inclusive boundaries pass | Evidence upload validation |

These tests do not pretend that a unit-test object is a real MongoDB tampering test or that a local node tests Besu permissioning.

## Local chain and deployment

Per PRD D-32, **250204** is the default chain ID for all three networks. `hardhat` and `localhost` are local development networks whose ID can be overridden with `LOCAL_CHAIN_ID`; localhost RPC is fixed to `127.0.0.1:8545`. The `besu` network exists only when `RPC_URL` is set and uses `CHAIN_ID` (default **250204**). Overrides must be positive safe integers; Besu still rejects **1, 1337 and 31337**. Runtime `eth_chainId` must match configuration before any deployment is sent. `RPC_API_KEY`, when needed, uses **X-API-Key**, not Bearer auth.

For local testing, start a node in a separate local terminal and select a distinct operational address from its public test accounts:

```bash
pnpm --filter @bansos/contracts exec hardhat node
# In another local terminal, set AUTHORIZED_WALLET to a different local test account:
pnpm --filter @bansos/contracts deploy:local
```

For Besu, provide these **only in the local deployment process environment**, using a protected secrets source (never source-control or chat):

- `RPC_URL`, optional `CHAIN_ID` override (default `250204`), optional `RPC_API_KEY`.
- `OWNER_PRIVATE_KEY` for the offline administrative deployment signer.
- `EXPECTED_OWNER` for an explicit public-address cross-check.
- `AUTHORIZED_WALLET` for the separate Kelurahan operational address.
- `CONFIRM_DEPLOY` equal to the intended decimal chain ID (`250204` when using the default).

Do not enter a private key directly into shell history, use debug shell tracing, reuse the owner key as an operational key, or add these to frontend environment variables. No `.env` file is loaded automatically. Commit reviewed source and the normal generated ABI before deployment. Both local and Besu deployment require a Git repository with a HEAD commit and a clean worktree, including untracked files. Missing Git/repository, unreadable history, or a dirty tree produces an explicit safe diagnostic before RPC access or a transaction; Git supplies `gitCommit` provenance and enforces the clean-tree rule.

```bash
pnpm --filter @bansos/contracts compile --force
pnpm --filter @bansos/contracts deploy:besu
```

The deployment script refuses in-process memory networks and existing chain deployment records. It takes an exclusive local lock, writes a **pre-broadcast journal** with nonce and predicted address, submits once, waits for confirmation, checks runtime bytecode hash against the artifact, checks `owner()`, `authorizedWallet()` and initial unpaused state, then performs an unauthorized **eth_call** and requires the exact `NotAuthorized` selector. The negative probe is intentionally simulated: it needs no second private key, sends no extra transaction and changes no state. A Besu RPC permission error is not accepted as evidence of contract authorization.

Successful checks produce `deployments/<chainId>.json` containing address, block, transaction hash, runtime code hash, compiler version/long version, EVM target, Git commit, roles and check results. ABI is exported from the same artifact. If a deploy fails or times out, the pending journal is retained and the command fails. Investigate the recorded nonce, predicted address and transaction hash before any retry. Never delete a pending journal or stale `.deploy.lock` until an operator has confirmed no deploy is running and reconciled the chain state. Do not automatically redeploy after an uncertain broadcast.

The package does not publish the contract, modify backend configuration, install a CI runner, run a real-chain transaction or certify the PRD's multi-system security scenarios on its own.
