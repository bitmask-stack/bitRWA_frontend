import React, { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import './WalletConnect.css';

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
    availableConnectors,
    linkedAddressAmount
  } = useWallet();

  const [isLoading, setIsLoading] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const _boundAddress: any = localStorage.getItem("rootstockAddress")

  const handleConnect = async (connectorId?: string) => {
    setIsLoading(true);
    try {
      await connectWallet(connectorId);
      setShowWalletSelector(false);
    } catch (err) {
      console.error('Connection error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBitmaskAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log({value})
    setBitmaskAddress(value);
    validateBitmaskAddress(value);
    localStorage.setItem("rootstockAddress", value)
  };

  const handleBindWallets = async () => {
    await bindWallet();
  };

  const renderWalletOptions = () => {
    if (availableConnectors.length === 1) {
      return (
        <button 
          onClick={() => handleConnect()} 
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
      );
    }

    return (
      <div className="wallet-selector">
        {showWalletSelector && (
          <div className="wallet-modal">
            <div className="wallet-modal-content">
              <div className="wallet-modal-header">
                <h3>Select a Wallet</h3>
                <button 
                  onClick={() => setShowWalletSelector(false)}
                  className="wallet-modal-close"
                >
                  &times;
                </button>
              </div>
              
              <div className="wallet-modal-body">
                <div className="wallet-grid">
                  {availableConnectors.map(connector => (
                    <button
                      key={connector.id}
                      onClick={() => handleConnect(connector.id)}
                      className="wallet-card"
                      disabled={isLoading}
                    >
                      <div className="wallet-card-inner">
                        <img 
                          src={`/src/assets/wallets/${connector.id}.svg`} 
                          alt={connector.name} 
                          className="wallet-icon" 
                        />
                        <span className="wallet-name">{connector.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="wallet-modal-footer">
                <p className="wallet-help-text">
                  New to Ethereum wallets?{' '}
                  <a 
                    href="https://ethereum.org/en/wallets/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Learn more
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMainContent = () => {
    if (isConnected) {
      return (
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
       <span className="bound-badge">Successfully Bound</span>
       
       <div className="balance-card">
         <span className="balance-label">Available Balance</span>
         <span className="balance-amount">{linkedAddressAmount}</span>
       </div>
     
       <div className="bound-addresses">
         <div className="address-row">
           <span className="address-label">EVM Wallet:</span>
           <div className="address-value">{address}</div>
         </div>
         <div className="address-row">
           <span className="address-label">Bitmask RootStock Wallet:</span>
           <div className="address-value">{_boundAddress}</div>
         </div>
       </div>
     </div>
            ) : (
              <div className="bitmask-binding">
                <h3 style={{fontSize: "0.9em"}}>Link Your Bitmask RootStock Address</h3>
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
                {error && <p className="error-message">{error}</p>}
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
      );
    }

    return (
      <div className="connect-section">
      {availableConnectors.length > 0 ? (
        <div className="strategy-card-modern">
          <div className="strategy-badge">Tokenized Asset</div>
          
          <div className="strategy-header-modern">
            <div className="strategy-icon-container">
              <img src="/src/assets/ondo-token-icon.svg" alt="MSTR" className="strategy-icon" />
              <span className="strategy-ticker">ONDO</span>
            </div>
            <h3 className="strategy-title">Tokenized US Treasury Bills by ONDO</h3>
            <p className="strategy-subtitle-modern">Fully collateralized 1:1</p>
          </div>
          
          <div className="strategy-details-grid">
            <div className="detail-cell">
              <span className="detail-label-modern">APY (compounded daily):  </span>
              <span className="detail-value-modern">~4.3%</span>
            </div>
            <div className="detail-cell">
              <span className="detail-label-modern">Redeemable</span>
              <span className="detail-value-modern success">Yes</span>
            </div>
            <div className="detail-cell">
              <span className="detail-label-modern">Maturity</span>
              <span className="detail-value-modern">~1–3 Months Rolling</span>
            </div>
            <div className="detail-cell">
              <span className="detail-label-modern">Collateral</span>
              <span className="detail-value-modern">Short‑term U.S. T‑Bills + bank cash</span>
            </div>
          </div>
          
          <div className="strategy-actions">
            <button 
              onClick={() => availableConnectors.length === 1 ? handleConnect() : setShowWalletSelector(true)}
              className="connect-button-modern"
            >
              {isLoading ? (
                <span className="loading-spinner"></span>
              ) : (
                <>
                  <img src="/src/assets/bitcoin-icon.svg" alt="Connect" className="wallet-icon" width="12" height="12" />
                  Bridge to Bitcoin
                </>
              )}
            </button>
            
            <div className="strategy-footer-modern">
              <a href="#" className="full-details-link-modern">
                View Full Position Details
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 6H11M11 6L6 1M11 6L6 11" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </a>
              <div className="powered-by-modern">
                <a href="https://bitmask.app" target='_blank' style={{color: "#fff"}}><span>Powered by BitMask</span></a>
                {/* <img src="/src/assets/liquid-logo.svg" alt="Liquid" className="liquid-logo" /> */}
              </div>
            </div>
          </div>
        </div>
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
      </div>
    );
  };

  return (
    <div className="wallet-container">
      {!showWalletSelector && (
        <div className="wallet-card">
          <div className="wallet-header">
            
             {isConnected && isBound ? ( <h2>BitMask Bridge</h2>) : ( <h2>Connect Your Wallet</h2>)}
           
            <p className="subtitle">
              {isConnected && isBound 
                ? "Your EVM wallet is successfully bound to your Bitmask address"
                : "Connect your EVM wallet and link your Bitmask address"}
            </p>
          </div>
          {renderMainContent()}
        </div>
      )}
      {renderWalletOptions()}
    </div>
  );
};