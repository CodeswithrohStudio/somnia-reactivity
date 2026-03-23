# Will.eth · Somnia Reactive

A reactive dead man's switch inheritance protocol on Somnia Testnet. Beneficiaries watch their inheritance land in real-time the moment the will executes — no page refresh, no polling, no waiting.

---

## What is this

Will.eth Somnia Reactive is an on-chain inheritance protocol where a will-owner deposits STT, assigns beneficiaries with percentage allocations, and must check in periodically. If they miss a check-in deadline, anyone can trigger execution — and every beneficiary watching the dashboard sees their payout arrive the instant it hits the chain. The real-time layer is powered entirely by Somnia Reactivity, not by client-side polling.

---

## How Somnia Reactivity is used

The `@somnia-chain/reactivity` SDK is initialised once in `useReactiveWill.ts` and subscribes to the deployed `ReactiveWill` contract address. Somnia's reactive infrastructure maintains a persistent WebSocket connection to the chain and pushes event notifications to the client the moment they are included in a block.

Three events are subscribed to:

| Event | What Somnia Reactivity does |
|---|---|
| `WillExecuted` | Instantly flips all beneficiary cards from WAITING → RECEIVED, shows distributed amounts, and adds an entry to the live feed |
| `BeneficiaryPaid` | Updates each individual card with the exact received amount as their transfer confirms |
| `CheckInMissed` | Flips cards to INCOMING (amber pulse) before payouts settle, giving beneficiaries a heads-up in real time |

Why real-time matters here: beneficiaries open the dashboard and walk away. They are not refreshing the page. They do not know when the will might execute. With Somnia Reactivity they simply watch — the chain tells them the moment their inheritance arrives. This is the core UX proposition.

---

## Live demo

🔗 **[https://willeth-somnia-reactive.vercel.app](https://willeth-somnia-reactive.vercel.app)**

---

## Local setup

```bash
git clone https://github.com/CodeswithrohStudio/somnia-reactivity
cd willeth-somnia-reactive
npm install

# Configure environment
cp .env.example .env
# Edit .env — add your PRIVATE_KEY

# Compile and deploy the contract to Somnia Testnet
npx hardhat compile
TS_NODE_PROJECT=tsconfig.hardhat.json npx hardhat run scripts/deploy.ts --network somnia

# Copy the deployed address into .env:
# VITE_WILL_CONTRACT_ADDRESS=0x...

# Start the frontend
npm run dev
```

You will need STT (Somnia Testnet tokens) in your deployer wallet. Get them from the Somnia faucet.

---

## Contract addresses

| Contract | Address |
|---|---|
| ReactiveWill | [`0x44094Ac481A6dA3F815589Fc7E6d13994565f9C8`](https://shannon-explorer.somnia.network/address/0x44094Ac481A6dA3F815589Fc7E6d13994565f9C8) |

Network: Somnia Testnet · Chain ID: 50312
Explorer: https://shannon-explorer.somnia.network

---

## Tech stack

- **Somnia Testnet** — EVM-compatible L1 built for high throughput
- **Somnia Reactivity SDK** (`@somnia-chain/reactivity`) — real-time event subscriptions, no polling
- **Solidity 0.8.20** — `ReactiveWill.sol` dead man's switch contract
- **React 18 + TypeScript** — frontend
- **wagmi v2 + viem** — wallet connection and contract reads/writes
- **Hardhat** — contract compilation and deployment
- **Framer Motion** — status card animations
- **Tailwind CSS** — styling

---

## Project structure

```
willeth-somnia-reactive/
├── contracts/
│   ├── ReactiveWill.sol         # Main will contract with events
│   └── IReactiveService.sol     # Somnia reactivity interface reference
├── src/
│   ├── App.tsx                  # Root layout, wagmi config
│   ├── main.tsx
│   ├── index.css
│   ├── components/
│   │   ├── CreateWill.tsx       # Deposit + assign heirs
│   │   ├── CheckInPanel.tsx     # Countdown + check-in status
│   │   ├── BeneficiaryDashboard.tsx  # Live reactive heir cards
│   │   └── WillExecutionFeed.tsx     # Real-time event feed
│   ├── hooks/
│   │   └── useReactiveWill.ts   # All Somnia Reactivity logic
│   └── config/
│       └── somnia.ts            # Chain config, contract addresses
├── scripts/
│   └── deploy.ts                # Hardhat deploy
├── hardhat.config.ts
├── package.json
├── vite.config.ts
└── .env.example
```
