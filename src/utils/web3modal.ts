import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi'
import { arbitrum, mainnet } from 'viem/chains'

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = 'YOUR_PROJECT_ID'

// 2. Create wagmiConfig
const metadata = {
  name: 'BitRWA Bridge',
  description: 'BitRWA Bridge Interface',
  url: 'https://bitrwa.com', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const chains = [mainnet, arbitrum]
// @ts-ignore
export const config = defaultWagmiConfig({ chains, projectId, metadata })

// 3. Create modal
// @ts-ignore
createWeb3Modal({ wagmiConfig: config, projectId, chains }) 