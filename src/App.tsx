import { WagmiConfig } from 'wagmi'
import { config } from './utils/web3modal'
import { WalletConnect } from './components/WalletConnect'
import './App.css'

function App() {
  return (
    <WagmiConfig config={config}>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <div className="logo-container">
              <img src="/src/assets/bitmask-rwa-logo.svg" alt="BitRWA" className="logo" />
              <h1>BitMASK RWA Bridge</h1>
            </div>
            <div className="network-indicator">
              <span className="network-dot"></span>
              <span>Ethereum Mainnet</span>
            </div>
          </div>
        </header>
        <main>
          <WalletConnect />
        </main>
      </div>
    </WagmiConfig>
  )
}

export default App