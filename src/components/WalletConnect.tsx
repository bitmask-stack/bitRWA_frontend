import React, { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import './WalletConnect.css'

export const WalletConnect: React.FC = () => {
  const {
    address,
    isConnected,
    bitmaskAddress,
    error,
    connectWallet,
    disconnectWallet,
    validateBitmaskAddress,
    setBitmaskAddress,
    bindWallet,
    isBinding,
    isBound,
    walletName,
    isInjectedWallet
  } = useWallet()

  const [isLoading, setIsLoading] = useState(false)

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      await connectWallet()
    } catch (err) {
      console.error('Connection error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBitmaskAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setBitmaskAddress(value)
    validateBitmaskAddress(value)
  }

  const handleBindWallets = async () => {
    await bindWallet()
  }

  return (
    <div className="wallet-container">
      <div className="wallet-card">
        <div className="wallet-header">
          <h2>Connect Your Wallet</h2>
          <p className="subtitle">
            {isConnected && isBound 
              ? "Your EVM wallet is successfully bound to your Bitmask address"
              : "Connect your EVM wallet and link your Bitmask address"}
          </p>
        </div>

        {!isConnected ? (
          <div className="connect-section">
            {isInjectedWallet ? (
              <button 
                onClick={handleConnect} 
                className="connect-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  <>
                    <img src="/src/assets/bitmask-rwa-logo.svg" alt="Wallet" className="wallet-icon" />
                    Connect Wallet
                  </>
                )}
              </button>
            ) : (
              <div className="wallet-install-prompt">
                <p className="no-wallet-message">No wallet extension detected</p>
                <a 
                  href="https://metamask.io/download/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="wallet-install-link"
                >
                  Install MetaMask
                </a>
                <p className="wallet-alternatives">
                  or use WalletConnect with mobile wallet
                </p>
              </div>
            )}
            <p className="supported-wallets">
              Supported: MetaMask, Coinbase Wallet, Brave, and other EVM-compatible wallets
            </p>
          </div>
        ) : (
          <div className="connected-section">
            <div className="wallet-info">
              <div className="wallet-meta">
                <span className="wallet-name">{walletName}</span>
                <span className="network-badge">Ethereum</span>
              </div>
              <div className="address-container">
                <span className="label">Connected Address:</span>
                <span className="address">{address}</span>
              </div>

              {isBound ? (
                <div className="bound-status">
                  <span className="bound-badge">✓ Successfully Bound</span>
                  <div className="bound-addresses">
                    <div>
                      <span className="address-label">EVM Wallet:</span>
                      <span className="address-value">{address}</span>
                    </div>
                    <div>
                      <span className="address-label">Bitmask Wallet:</span>
                      <span className="address-value">{bitmaskAddress}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bitmask-binding">
                  <h3>Link Your Bitmask Wallet</h3>
                  <div className="input-group">
                    <input
                      type="text"
                      value={bitmaskAddress}
                      onChange={handleBitmaskAddressChange}
                      placeholder="Enter your Bitmask wallet address"
                      className="bitmask-input"
                    />
                    <button
                      onClick={handleBindWallets}
                      className="bind-button"
                      disabled={!bitmaskAddress || isBinding || !!error}
                    >
                      {isBinding ? (
                        <>
                          <span className="loading-spinner small"></span>
                          Binding...
                        </>
                      ) : (
                        'Link Wallets'
                      )}
                    </button>
                  </div>
                  {error && (
                    <p className="error-message">{error}</p>
                  )}
                  <p className="input-help">
                    This links your EVM wallet to your Bitmask address for bridging
                  </p>
                </div>
              )}

              <button 
                onClick={disconnectWallet} 
                className="disconnect-button"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}