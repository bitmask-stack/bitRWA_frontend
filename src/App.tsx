import { WagmiConfig, useAccount } from 'wagmi'
import { config } from './utils/web3modal'
import { WalletConnect } from './components/WalletConnect'
import './App.css'

function App() {
  return (
    <WagmiConfig config={config}>
      <AppContent />
    </WagmiConfig>
  )
}

function AppContent() {
  const { address, isConnected, connector } = useAccount()

  const getNetworkDisplay = () => {
    if (!isConnected) return 'No Wallet Connected'
    
    const walletName = connector?.name || 'Wallet'
    const shortenedAddress = address 
      ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
      : 'NO wallet selected'
    
    return (
      <div className="wallet-display">
        <span className="wallet-name">{walletName}</span>
        <span className="wallet-address">{shortenedAddress}</span>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo-container">
            <img src="bitmask-rwa-logo.svg" alt="BitRWA" className="logo" />
            <h1>BitMASK RWA Bridge</h1>
          </div>
          <div className="network-indicator">
            <span className="network-dot" data-connected={isConnected}></span>
            {getNetworkDisplay()}
          </div>
        </div>
      </header>
      <main>
        <WalletConnect />
      </main>
    </div>
  )
}

export default App