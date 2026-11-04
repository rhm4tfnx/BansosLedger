// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title OwnershipHarness
/// @notice Test-only harness for the inherited zero-owner constructor error.
/// @dev Never deployed by the deployment script; no application functionality.
contract OwnershipHarness is Ownable2Step {
    /// @notice Exercise the unmodified OpenZeppelin ownership constructor.
    /// @param initialOwner Owner to pass directly into OpenZeppelin.
    constructor(address initialOwner) Ownable(initialOwner) {}
}
