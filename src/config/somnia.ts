/**
 * Somnia Testnet chain config and contract addresses.
 * All Somnia Reactivity SDK instances in this project use these values.
 */

export const SOMNIA_TESTNET = {
  id: 50312,
  name: "Somnia Testnet",
  network: "somnia-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Somnia Testnet Token",
    symbol: "STT",
  },
  rpcUrls: {
    default: {
      http: ["https://dream-rpc.somnia.network"],
      webSocket: ["wss://dream-rpc.somnia.network"],
    },
    public: {
      http: ["https://dream-rpc.somnia.network"],
      webSocket: ["wss://dream-rpc.somnia.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Somnia Explorer",
      url: "https://shannon-explorer.somnia.network",
    },
  },
  testnet: true,
} as const;

// Fill in after deployment: npx hardhat run scripts/deploy.ts --network somnia
export const WILL_CONTRACT_ADDRESS =
  (import.meta.env.VITE_WILL_CONTRACT_ADDRESS as `0x${string}`) || ("0x0000000000000000000000000000000000000000" as `0x${string}`);

export const SOMNIA_RPC_URL =
  import.meta.env.VITE_SOMNIA_RPC || "https://dream-rpc.somnia.network";

export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 50312);

// Somnia Reactivity SDK config — used in useReactiveWill.ts
export const REACTIVITY_CONFIG = {
  rpcUrl: SOMNIA_RPC_URL,
  chainId: CHAIN_ID,
} as const;

// Event signatures (keccak256 of event sig) — used as topic[0] filters
// for Somnia Reactivity subscriptions
export const EVENT_TOPICS = {
  WillExecuted: "0x" as `0x${string}`, // computed at runtime via viem
  BeneficiaryPaid: "0x" as `0x${string}`,
  CheckInMissed: "0x" as `0x${string}`,
  CheckedIn: "0x" as `0x${string}`,
} as const;
