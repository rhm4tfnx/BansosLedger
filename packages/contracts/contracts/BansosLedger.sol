// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {LedgerErrors} from "./LedgerErrors.sol";

/// @title BansosLedger
/// @notice Append-only social assistance ledger with no payable or value-transfer API.
/// @dev Commitments must be prepared off-chain without exposing recipient identity.
contract BansosLedger is Ownable2Step, Pausable {
    /// @notice Immutable program terms and permanent closure flag.
    struct Program {
        /// @dev Positive amount in integer rupiah.
        uint128 amountPerRecipient;
        /// @dev Inclusive first YYYYMM month.
        uint32 startPeriod;
        /// @dev Inclusive last YYYYMM month.
        uint32 endPeriod;
        /// @dev Separates registered programs from default mapping entries.
        bool exists;
        /// @dev Permanent closure; never reset to false.
        bool closed;
    }

    /// @notice A proposed record, with a globally unique reference and evidence CID.
    struct DisbursementInput {
        /// @dev Globally unique reference, normally the hash of backend Data_ID.
        bytes32 refId;
        /// @dev Existing program identifier.
        bytes32 programId;
        /// @dev Requested YYYYMM month.
        uint32 periodId;
        /// @dev Opaque identity commitment, never a raw NIK.
        bytes32 recipientCommitment;
        /// @dev Must equal the program's integer rupiah amount.
        uint128 amount;
        /// @dev Public evidence CID, constrained to 46–100 bytes.
        string evidenceCid;
    }

    /// @notice Stored record; time and sender are always derived from the chain.
    struct Disbursement {
        /// @dev Nonzero program identifier also marks a consumed reference.
        bytes32 programId;
        /// @dev Validated YYYYMM month.
        uint32 periodId;
        /// @dev Registered opaque identity commitment.
        bytes32 recipientCommitment;
        /// @dev Validated integer rupiah amount.
        uint128 amount;
        /// @dev Immutable evidence CID supplied at recording time.
        string evidenceCid;
        /// @dev Actual authorized transaction sender.
        address recordedBy;
        /// @dev Block timestamp in seconds, not an off-chain supplied timestamp.
        uint64 recordedAt;
    }

    /// @notice The caller is not the operational wallet, or is the owner.
    error NotAuthorized();
    /// @notice The program does not exist.
    error ProgramNotFound();
    /// @notice The period is invalid or outside the program window.
    error PeriodOutOfRange();
    /// @notice The commitment is not registered for this program.
    error RecipientNotRegistered();
    /// @notice The amount differs from the immutable program amount.
    error AmountMismatch();
    /// @notice This program/period/commitment tuple has already been recorded.
    error AlreadyDisbursed();
    /// @notice The global reference has already been recorded.
    error RefIdAlreadyUsed();
    /// @notice The evidence CID is outside the inclusive 46–100 byte bounds.
    error InvalidEvidenceCid();
    /// @notice A program identifier is zero or its amount is zero.
    error InvalidProgram();
    /// @notice Program identifiers cannot be reused, including after closure.
    error ProgramAlreadyExists();
    /// @notice An operational wallet must be nonzero and distinct from owner.
    error InvalidWallet();
    /// @notice Registration or disbursement batch is empty or exceeds its cap.
    error InvalidBatchSize();
    /// @notice A recipient commitment cannot be zero.
    error InvalidCommitment();
    /// @notice Institutional ownership cannot be permanently discarded.
    error RenounceOwnershipDisabled();

    /// @notice Immutable terms of a newly created program.
    event ProgramCreated(bytes32 indexed programId, uint128 amountPerRecipient, uint32 startPeriod, uint32 endPeriod);
    /// @notice A program has been permanently closed.
    event ProgramClosed(bytes32 indexed programId);
    /// @notice Number of commitments supplied to a direct registration call.
    event RecipientsRegistered(bytes32 indexed programId, uint256 count);
    /// @notice Exactly one event per successful record, including each batch item.
    event DisbursementRecorded(
        bytes32 indexed refId, bytes32 indexed programId, bytes32 indexed recipientCommitment,
        uint32 periodId, uint128 amount, string evidenceCid, address recordedBy, uint64 recordedAt
    );
    /// @notice Administrative rotation of the operational wallet.
    event AuthorizedWalletChanged(address indexed oldWallet, address indexed newWallet);

    /// @notice Wallet allowed to execute operational methods, but never as owner.
    address public authorizedWallet;
    /// @dev Program terms are immutable apart from the closure flag.
    mapping(bytes32 => Program) private _programs;
    /// @dev Registration is append-only and scoped to each program.
    mapping(bytes32 => mapping(bytes32 => bool)) private _registered;
    /// @dev Each recipient may receive once per program and period.
    mapping(bytes32 => mapping(uint32 => mapping(bytes32 => bool))) private _disbursed;
    /// @dev Program existence (nonzero ID) also marks a consumed reference.
    mapping(bytes32 => Disbursement) private _records;

    /// @notice Restricts operations, including after an ownership transfer.
    modifier onlyAuthorized() {
        if (msg.sender != authorizedWallet || msg.sender == owner()) revert NotAuthorized();
        _;
    }

    /// @notice Deploy from the separate administrative owner wallet.
    /// @param initialAuthorizedWallet Operational Kelurahan wallet.
    constructor(address initialAuthorizedWallet) Ownable(msg.sender) {
        _setAuthorizedWallet(initialAuthorizedWallet);
    }

    /// @notice Rotate the operational wallet; callable while paused.
    /// @param newWallet Nonzero wallet distinct from current owner.
    function setAuthorizedWallet(address newWallet) external onlyOwner {
        _setAuthorizedWallet(newWallet);
    }

    /// @notice Preserve institutional administration; ownership transfer remains available.
    /// @dev Always reverts for the owner; other callers fail the inherited owner guard.
    function renounceOwnership() public override onlyOwner {
        revert RenounceOwnershipDisabled();
    }

    /// @notice Stop every operational write in an emergency.
    function pause() external onlyOwner { _pause(); }

    /// @notice Resume operational writes after an emergency.
    function unpause() external onlyOwner { _unpause(); }

    /// @notice Create immutable program terms; program IDs are never reusable.
    /// @param programId Nonzero opaque program identifier.
    /// @param amountPerRecipient Positive integer rupiah amount.
    /// @param startPeriod Inclusive first month in YYYYMM form.
    /// @param endPeriod Inclusive last month in YYYYMM form.
    function createProgram(bytes32 programId, uint128 amountPerRecipient, uint32 startPeriod, uint32 endPeriod)
        external onlyAuthorized whenNotPaused
    {
        if (programId == bytes32(0) || amountPerRecipient == 0) revert InvalidProgram();
        if (_programs[programId].exists) revert ProgramAlreadyExists();
        if (!_validPeriod(startPeriod) || !_validPeriod(endPeriod) || startPeriod > endPeriod) revert PeriodOutOfRange();
        _programs[programId] = Program(amountPerRecipient, startPeriod, endPeriod, true, false);
        emit ProgramCreated(programId, amountPerRecipient, startPeriod, endPeriod);
    }

    /// @notice Register 1–100 commitments directly; repeat registration is idempotent.
    /// @param programId Existing open program identifier.
    /// @param commitments Nonzero commitments; count is the submitted array length.
    function registerRecipients(bytes32 programId, bytes32[] calldata commitments) external onlyAuthorized whenNotPaused {
        _openProgram(programId);
        if (commitments.length == 0 || commitments.length > 100) revert InvalidBatchSize();
        for (uint256 i = 0; i < commitments.length; ++i) {
            if (commitments[i] == bytes32(0)) revert InvalidCommitment();
            _registered[programId][commitments[i]] = true;
        }
        emit RecipientsRegistered(programId, commitments.length);
    }

    /// @notice Permanently close a program without changing existing records.
    /// @param programId Existing open program identifier.
    function closeProgram(bytes32 programId) external onlyAuthorized whenNotPaused {
        _openProgram(programId).closed = true;
        emit ProgramClosed(programId);
    }

    /// @notice Record one disbursement; emits exactly one DisbursementRecorded.
    /// @param d Proposed record, validated in PRD 10.3 order.
    function recordDisbursement(DisbursementInput calldata d) external onlyAuthorized whenNotPaused {
        _record(d);
    }

    /// @notice Record 1–25 entries atomically; any failure rolls back all entries.
    /// @param items Proposed records, each validated in PRD 10.3 order.
    function recordDisbursementBatch(DisbursementInput[] calldata items) external onlyAuthorized whenNotPaused {
        if (items.length == 0 || items.length > 25) revert InvalidBatchSize();
        for (uint256 i = 0; i < items.length; ++i) { _record(items[i]); }
    }

    /// @notice Return program terms; unknown identifiers return the zero struct.
    /// @param programId Program identifier.
    /// @return Program struct with an explicit exists flag.
    function getProgram(bytes32 programId) external view returns (Program memory) { return _programs[programId]; }

    /// @notice Test whether a commitment was registered for a program.
    /// @param programId Program identifier.
    /// @param commitment Recipient commitment.
    /// @return Whether the commitment is registered.
    function isRecipientRegistered(bytes32 programId, bytes32 commitment) external view returns (bool) {
        return _registered[programId][commitment];
    }

    /// @notice Test whether the tuple has an immutable record.
    /// @param programId Program identifier.
    /// @param periodId Month in YYYYMM form.
    /// @param commitment Recipient commitment.
    /// @return Whether a disbursement has been recorded.
    function isDisbursed(bytes32 programId, uint32 periodId, bytes32 commitment) external view returns (bool) {
        return _disbursed[programId][periodId][commitment];
    }

    /// @notice Return a record in the exact backend tuple order; unknown refs return zero fields.
    /// @param refId Global disbursement reference.
    /// @return Immutable on-chain disbursement.
    function getDisbursement(bytes32 refId) external view returns (Disbursement memory) { return _records[refId]; }

    /// @dev Apply PRD 10.3 steps 2–8; external modifiers implement step 1.
    /// @param d Proposed record; sender and timestamp are never accepted as input.
    function _record(DisbursementInput calldata d) private {
        Program storage program = _openProgram(d.programId);
        if (!_validPeriod(d.periodId) || d.periodId < program.startPeriod || d.periodId > program.endPeriod) revert PeriodOutOfRange();
        if (!_registered[d.programId][d.recipientCommitment]) revert RecipientNotRegistered();
        if (d.amount != program.amountPerRecipient) revert AmountMismatch();
        if (_disbursed[d.programId][d.periodId][d.recipientCommitment]) revert AlreadyDisbursed();
        if (_records[d.refId].programId != bytes32(0)) revert RefIdAlreadyUsed();
        uint256 length = bytes(d.evidenceCid).length;
        if (length < 46 || length > 100) revert InvalidEvidenceCid();
        _records[d.refId] = Disbursement(d.programId, d.periodId, d.recipientCommitment, d.amount, d.evidenceCid, msg.sender, uint64(block.timestamp));
        _disbursed[d.programId][d.periodId][d.recipientCommitment] = true;
        emit DisbursementRecorded(d.refId, d.programId, d.recipientCommitment, d.periodId, d.amount, d.evidenceCid, msg.sender, uint64(block.timestamp));
    }

    /// @dev Read an existing open program, preserving the required error selectors.
    /// @param programId Program identifier.
    /// @return program Storage reference to its immutable terms and closure flag.
    function _openProgram(bytes32 programId) private view returns (Program storage program) {
        program = _programs[programId];
        if (!program.exists) revert ProgramNotFound();
        if (program.closed) revert LedgerErrors.ProgramClosed();
    }

    /// @dev Accept exactly a four-digit positive year and month 01–12.
    /// @param period YYYYMM integer.
    /// @return Whether the period is well formed.
    function _validPeriod(uint32 period) private pure returns (bool) {
        return period >= 100001 && period <= 999912 && period % 100 >= 1 && period % 100 <= 12;
    }

    /// @dev Used by constructor and owner-controlled rotation, including while paused.
    /// @param newWallet Nonzero operational wallet distinct from current owner.
    function _setAuthorizedWallet(address newWallet) private {
        if (newWallet == address(0) || newWallet == owner()) revert InvalidWallet();
        address oldWallet = authorizedWallet;
        authorizedWallet = newWallet;
        emit AuthorizedWalletChanged(oldWallet, newWallet);
    }
}
