import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import './WalletConnect.css';
import { ethers } from 'ethers';

// ERC20 ABI with approve function
const erc20Abi = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

interface TokenBalance {
  symbol: string;
  balance: string;
  nativePair: string;
  chain: 'Ethereum' | 'Rootstock';
  logo: string;
  type?: 'available' | 'locked';
  originalSymbol?: string;
}

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
    availableConnectors,
    fetchBalances,
    lockAndBridge,
    isLocking,
    approveOndoForBridge,
  } = useWallet();

  const [isLoading, setIsLoading] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [lockAmount, setLockAmount] = useState('');
  const [ondoTokenHolderAddress, setOndoTokenHolderAddress] = useState('');
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [usdyBalanceForInput, setUsdyBalanceForInput] = useState<string | null>(null);
  const [usdyBalanceLoading, setUsdyBalanceLoading] = useState(false);

  const fetchTokenBalances = async (ethAddress: string) => {
    if (!ethAddress || !bitmaskAddress) {
      setBalanceError('Wallet not properly connected');
      return;
    }

    setIsLoadingBalances(true);
    setBalanceError(null);

    try {
      // Get balances for the connected wallet
      const balances = await fetchBalances(ethAddress, bitmaskAddress);
      
      // If there's a specific USDY token holder address, also check that wallet's balance
      if (ondoTokenHolderAddress && ondoTokenHolderAddress !== ethAddress) {
        const usdyTokenAddress = "0x717C3087fe043A4C9455142148932b94562D1244";
        // @ts-ignore
        const provider = new ethers.BrowserProvider(window.ethereum);
        const usdyTokenContract = new ethers.Contract(usdyTokenAddress, erc20Abi, provider);
        const usdyBalance = await usdyTokenContract.balanceOf(ondoTokenHolderAddress);
        
        // Merge balances, prioritizing the token holder's USDY balance
        const mergedBalances = balances.map(balance => {
          if (balance.symbol === 'USDY') {
            return {
              ...balance,
              balance: ethers.formatUnits(usdyBalance, 18),
              originalSymbol: 'USDY (from token holder)'
            };
          }
          return balance;
        });
        
        const nonZeroBalances = mergedBalances.filter(b => b.balance !== '0');
        setTokenBalances(nonZeroBalances.length ? nonZeroBalances : mergedBalances);
      } else {
        const nonZeroBalances = balances.filter(b => b.balance !== '0');
        setTokenBalances(nonZeroBalances.length ? nonZeroBalances : balances);
      }
    } catch (err: any) {
      console.error('Error fetching balances:', err);
      setBalanceError('Failed to load balances. Please try again.');
      setTokenBalances([]);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  const renderAssetBalances = () => {
    if (isLoadingBalances) return (
      <div className="loading-balances compact">
        <div className="loading-spinner"></div>
        <span>Loading balances...</span>
      </div>
    );

    if (balanceError) return (
      <div className="balance-error compact">
        <p>{balanceError}</p>
        <button onClick={() => fetchTokenBalances(address!)} className="retry-button">
          Retry
        </button>
      </div>
    );

    if (tokenBalances.length === 0) return (
      <div className="no-balances compact">
        <p>No balances found</p>
      </div>
    );

    return (
      <div className="asset-grid compact">
        {tokenBalances.map((balance) => (
          <div key={`${balance.chain}-${balance.symbol}`} className={`asset-card ${balance.type === 'locked' ? 'locked' : ''}`}>
            <div className="asset-header">
              <span className={`chain-badge ${balance.chain.toLowerCase()}`}>
                {balance.chain === 'Ethereum' ? 'ETH' : 'RSK(BTC)'}
              </span>
            </div>
            <div className="asset-details">
              <h4>{balance.symbol}</h4>
              <p className="asset-pair">{balance.nativePair}</p>
            </div>
            <div className="asset-balance">
              {parseFloat(balance.balance).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6
              })}
            </div>
            {balance.type === 'locked' && <div className="asset-status">Locked</div>}
          </div>
        ))}
      </div>
    );
  };

  useEffect(() => {
    if (isConnected && address && isBound && bitmaskAddress) {
      fetchTokenBalances(address);
    } else {
      setTokenBalances([]);
    }
  }, [isConnected, address, isBound, bitmaskAddress]);

  // Refetch balances when ONDO token holder address changes
  useEffect(() => {
    if (isConnected && address && isBound && bitmaskAddress) {
      fetchTokenBalances(address);
    }
  }, [ondoTokenHolderAddress]);

  const handleConnect = async (connectorId?: string) => {
    setIsLoading(true);
    try {
      await connectWallet(connectorId);
      setShowWalletSelector(false);
    } catch (err: any) {
      console.error('Connection error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBitmaskAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBitmaskAddress(value);
    validateBitmaskAddress(value);
  };

  const handleBindWallets = async () => {
    await bindWallet();
    if (address) await fetchTokenBalances(address);
  };

  const handleLockAssets = async () => {
    if (!lockAmount || !bitmaskAddress) return;
    
    try {
      console.log('🔍 Starting bridge process...');

      // Get token holder address
      const ondoTokenHolder = ondoTokenHolderAddress || address!;
      
      try {
        // Call lockAndBridge directly (which will check allowance and throw INSUFFICIENT_ALLOWANCE if needed)
        console.log('🌉 Proceeding with bridge transaction...');
        const txHash = await lockAndBridge(lockAmount, ondoTokenHolder);
        console.log('✅ Bridge transaction successful:', txHash);
        
        setLockAmount('');
        await fetchTokenBalances(address!);
        
        // Show success message
        alert(`Bridge transaction successful! Transaction hash: ${txHash}`);
      } catch (bridgeError: any) {
        // Check if this is an allowance error
        if (bridgeError.message === 'INSUFFICIENT_ALLOWANCE') {
          console.log('🔄 Insufficient allowance detected, requesting approval...');
          
          // Request approval using the approveOndoForBridge function
          try {
            console.log('📝 Requesting token approval...');
            const approvalTxHash = await approveOndoForBridge(lockAmount, ondoTokenHolder);
            console.log('✅ Approval transaction sent:', approvalTxHash);
            
            // Wait for approval confirmation
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const receipt = await provider.waitForTransaction(approvalTxHash);
            if (receipt) {
              console.log('✅ Approval confirmed in block:', receipt.blockNumber);
            }
            
            // Now try the bridge transaction again
            console.log('🌉 Retrying bridge transaction after approval...');
            const txHash = await lockAndBridge(lockAmount, ondoTokenHolder);
            console.log('✅ Bridge transaction successful:', txHash);
            
            setLockAmount('');
            await fetchTokenBalances(address!);
            
            // Show success message
            alert(`Bridge transaction successful! Transaction hash: ${txHash}`);
          } catch (approvalError: any) {
            console.error('Approval error:', approvalError);
            
            if (approvalError.code === 4001) {
              alert('Approval was rejected by user');
            } else {
              alert(`Approval failed: ${approvalError.message}`);
            }
          }
        } else {
          // Re-throw other errors
          throw bridgeError;
        }
      }
      
    } catch (err: any) {
      console.error('Error locking assets:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const getUsdyBalanceForInput = async () => {
    setUsdyBalanceLoading(true);
    setUsdyBalanceForInput(null);
    try {
      // Get connected wallet address
      if (!address) throw new Error('No wallet connected');
      // Use the address entered by the user as the holder address
      const holderAddress = ondoTokenHolderAddress;
      if (!holderAddress || !ethers.isAddress(holderAddress)) throw new Error('Invalid address');
      // Get network and USDY token address
      // @ts-ignore
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const USDY_ADDRESSES: Record<number, string> = {
        1: '0x...mainnet', // Mainnet address (replace with real one)
        11155111: '0x717C3087fe043A4C9455142148932b94562D1244', // Sepolia
      };
      const usdyTokenAddress = USDY_ADDRESSES[Number(network.chainId)];
      if (!usdyTokenAddress) throw new Error('USDY token not deployed on this network');
      // Get balance
      const usdyToken = new ethers.Contract(usdyTokenAddress, erc20Abi, provider);
      const balance = await usdyToken.balanceOf(holderAddress);
      const decimals = await usdyToken.decimals();
      setUsdyBalanceForInput(ethers.formatUnits(balance, decimals));
    } catch (err: any) {
      setUsdyBalanceForInput('Error');
    } finally {
      setUsdyBalanceLoading(false);
    }
  };

  const renderWalletOptions = () => {
    if (availableConnectors.length === 1) {
      return (
        <button onClick={() => handleConnect()} className="connect-button" disabled={isLoading}>
          {isLoading ? <span className="loading-spinner"></span> : <>
            <img src="bitmask-rwa-logo.svg" alt="Wallet" className="wallet-icon" />
            Connect Wallet
          </>}
        </button>
      );
    }

    return (
      <div className="wallet-selector">
        {showWalletSelector && (
          <div className="wallet-modal">
            <div className="wallet-modal-content">
              <div className="wallet-modal-header compact">
                <h3>Select a Wallet</h3>
                <button onClick={() => setShowWalletSelector(false)} className="wallet-modal-close">
                  &times;
                </button>
              </div>
              <div className="wallet-modal-body">
                <div className="wallet-grid">
                  {availableConnectors.map(connector => (
                    <button key={connector.id} onClick={() => handleConnect(connector.id)}
                      className="wallet-card" disabled={isLoading}>
                      <div className="wallet-card-inner">
                        <img src={`wallets/${connector.id}.svg`} alt={connector.name} className="wallet-icon" />
                        <span className="wallet-name">{connector.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
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
        <div className="connected-section compact">
          {isBound ? (
            <div className="bound-status compact">
              <div className="bound-header compact">
                <div className="address-row compact">
                  <span className="address-label">Linked:</span>
                  <div className="address-value compact">{bitmaskAddress}</div>
                </div>
              </div>

              <div className="bridge-interface compact" style={{marginBottom: "-40px"}}>
                <div className="assets-section compact">
                  <h3 className="section-title compact">Assets</h3>
                  <div className="asset-cards">
                    {renderAssetBalances()}
                  </div>
                </div>

                <div className="lock-section compact">
                  <h3 className="section-title compact">Bridge</h3>        
                  <div className="lock-form compact">
                    <div className="form-group compact">
                      <label>USDY Token Holder Address (Optional)</label>
                      <input
                        type="text"
                        value={ondoTokenHolderAddress}
                        onChange={(e) => setOndoTokenHolderAddress(e.target.value)}
                        placeholder={address || "Enter wallet address that holds USDY tokens"}
                        className={`form-input compact ${ondoTokenHolderAddress && !ethers.isAddress(ondoTokenHolderAddress) ? 'error' : ''}`}
                      />
                      <div className="balance-hint compact">
                        Leave empty to use your connected wallet ({address?.substring(0, 6)}...{address?.substring(address.length - 4)})
                      </div>
                      {ondoTokenHolderAddress && !ethers.isAddress(ondoTokenHolderAddress) && (
                        <div className="error-message compact">Invalid Ethereum address format</div>
                      )}
                    </div>
                    <div className="form-group compact">
                      <label>Amount (USDY)</label>
                      <div className="amount-input-container">
                        <input
                          type="number"
                          value={lockAmount}
                          onChange={(e) => setLockAmount(e.target.value)}
                          placeholder="0.00"
                          className="form-input compact"
                        />
                        <button
                          className="max-button compact"
                          onClick={() => {
                            const usdyBalance = tokenBalances.find(b => b.symbol === 'USDY')?.balance || '0';
                            setLockAmount(usdyBalance);
                          }}
                        >
                          MAX
                        </button>
                      </div>
                      <div className="balance-hint compact">
                        Available: {tokenBalances.find(b => b.symbol === 'USDY')?.balance || '0'} USDY
                        {ondoTokenHolderAddress && ondoTokenHolderAddress !== address && (
                          <span> (from {ondoTokenHolderAddress.substring(0, 6)}...{ondoTokenHolderAddress.substring(ondoTokenHolderAddress.length - 4)})</span>
                        )}
                      </div>
                      {ondoTokenHolderAddress && (
                        <button
                          onClick={getUsdyBalanceForInput}
                          disabled={usdyBalanceLoading || !ethers.isAddress(ondoTokenHolderAddress)}
                          className="debug-button compact"
                          style={{ marginTop: '8px', fontSize: '12px', padding: '4px 8px', backgroundColor: '#4CAF50' }}
                        >
                          {usdyBalanceLoading ? 'Checking...' : 'Get USDY Balance for Address'}
                        </button>
                      )}
                    </div>
                    {usdyBalanceForInput !== null && (
                      <div style={{ marginTop: 8 }}>
                        USDY Balance for {ondoTokenHolderAddress}: {usdyBalanceForInput}
                      </div>
                    )}
                    <button
                      onClick={handleLockAssets}
                      className="lock-button"
                      disabled={!lockAmount || isLocking || Boolean(ondoTokenHolderAddress && !ethers.isAddress(ondoTokenHolderAddress))}
                    >
                      {isLocking ? (
                        <>
                          <span className="loading-spinner"></span>
                          Processing...
                        </>
                      ) : (
                        'Lock & Bridge'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bitmask-binding compact">
              <div className="wallet-info compact">
                <h3>Link Bitmask Address</h3>
                <div className="input-group compact">
                  <input
                    type="text"
                    value={bitmaskAddress}
                    onChange={handleBitmaskAddressChange}
                    placeholder="Bitmask wallet address"
                    className="bitmask-input compact"
                  />
                  <button
                    onClick={handleBindWallets}
                    className="bind-button compact"
                    disabled={!bitmaskAddress || isBinding || !!error}
                  >
                    {isBinding ? <><span className="loading-spinner small"></span>Binding...</> : 'Link'}
                  </button>
                </div>
                {error && <p className="error-message compact">{error}</p>}
              </div>
            </div>
          )}

          <button onClick={disconnectWallet} className="disconnect-button compact">
            Disconnect
          </button>
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
                <img src="ondo-token-icon.svg" alt="MSTR" className="strategy-icon" />
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
                    <img src="bitcoin-icon.svg" alt="Connect" className="wallet-icon" width="12" height="12" />
                    Bridge to Bitcoin
                  </>
                )}
              </button>

              <div className="strategy-footer-modern">
                <a href="#" className="full-details-link-modern">
                  View Full Position Details
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 6H11M11 6L6 1M11 6L6 11" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </a>
                <div className="powered-by-modern">
                  <a href="https://bitmask.app" target='_blank' style={{ color: "#fff" }}><span>Powered by BitMask</span></a>
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
    <div className="wallet-container compact">
      {!showWalletSelector && (
        <div className="wallet-card compact">
        <div className="wallet-header compact" style={{ marginTop: "-20px" }}>
  <div className="header-content" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {/* <span className="bridge-icon">↔</span> */}
      <h2 className="compact" style={{ margin: 0 }}>
        {isConnected && isBound ? "Asset Bridge" : "Connect Wallet to Begin"}
      </h2>
    </div>
    <p className="subtitle compact" >
      {isConnected && isBound ? (
        <span className="chain-indicator" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="chain-badge eth">ETH</span>
          <span>→</span>
          <span className="chain-badge rsk" style={{background: "#ffcb12", color: "#333"}}>RSK(BTC)</span>
        </span>
      ) : (
        ""
      )}
    </p>
  </div>
</div>
          {renderMainContent()}
        </div>
      )}
      {renderWalletOptions()}
    </div>
  );
};