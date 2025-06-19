import { createConfig, configureChains } from 'wagmi'
import { publicProvider } from 'wagmi/providers/public'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { Chain } from 'wagmi/chains'

// Add this configuration file in your project's src/utils/ folder
export const config = createConfig({
  autoConnect: true,
  connectors: [
    new InjectedConnector({
      chains: [chain.mainnet], // Replace with your target chain
      options: {
        name: 'Browser Wallet',
        shimDisconnect: true,
      },
    }),
    // Add other connectors as needed
  ],
  publicClient: publicProvider(),
})

// Add this type definition in the same file or in a types/wagmi.d.ts file
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: true
      isCoinbaseWallet?: true
      isBraveWallet?: true
      on: (...args: any[]) => void
      removeListener: (...args: any[]) => void
      request: (...args: any[]) => Promise<any>
    }
  }
}