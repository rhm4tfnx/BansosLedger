// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title LedgerErrors
/// @notice Namespaces the error that shares its name with the required event.
library LedgerErrors {
    /// @notice The requested program has been permanently closed.
    error ProgramClosed();
}
