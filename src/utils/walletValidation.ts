// utils/walletValidation.ts
import { ethers } from "ethers";

export type NetworkType = "ERC20" | "TRC20";

export function validateWalletAddress(
  address: string,
  network: NetworkType
): boolean {
  if (!address) return false;
  const trimmed = address.trim();

  switch (network) {
    case "ERC20": {
      // Ethereum / ERC20 address with checksum validation
      return ethers.isAddress(trimmed);
    }

    case "TRC20": {
      // Basic Tron (TRC20) address format check: base58, starts with "T", length 34
      // This is a *format* check, not a full crypto validation
      const tronRegex = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
      return tronRegex.test(trimmed);
    }

    default:
      return false;
  }
}