import { 
  useAccount, 
  useConnect, 
  useDisconnect, 
  Connector, 
  useWriteContract
} from 'wagmi'
import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { bitRWABridgeABI } from '../abis/bitRWABridgeABI'

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

// Network Configuration
const NETWORKS = {
  ETHEREUM_MAINNET: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.infura.io/v3/'],
    blockExplorerUrls: ['https://etherscan.io']
  },
  ETHEREUM_SEPOLIA: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://eth-sepolia.g.alchemy.com/v2/UtaPNUX-ubMTd7j83ZiiDu8RrJEWktwr'],
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  },
  ROOTSTOCK_MAINNET: {
    chainId: 30,
    name: 'Rootstock Mainnet',
    nativeCurrency: { name: 'RBTC', symbol: 'RBTC', decimals: 18 },
    rpcUrls: ['https://public-node.rsk.co'],
    blockExplorerUrls: ['https://explorer.rsk.co']
  },
  ROOTSTOCK_TESTNET: {
    chainId: 31,
    name: 'Rootstock Testnet',
    nativeCurrency: { name: 'RBTC', symbol: 'RBTC', decimals: 18 },
    rpcUrls: ['https://rootstock-testnet.g.alchemy.com/v2/8uFzoVB3j_M_2eniC39St'],
    blockExplorerUrls: ['https://explorer.testnet.rsk.co']
  }
};

// Contract Addresses
export const CONTRACT_CONFIG = {
  TESTNET: {
    MOCK_USDT: '0xf554F7b66B19A6D28e47d010d5DAf86c9AFa114F',
    USDY_PROXY: '0x717C3087fe043A4C9455142148932b94562D1244', 
    ONDO_TOKEN: '0x717C3087fe043A4C9455142148932b94562D1244',
    RONDO_TOKEN: '0x936A3dC8f7d72B2edd4EE232500Ec9d873cd2416',
    BITRWA_BRIDGE: '0x94Da0f6a574AA9Add852595F281afE8725F7B7e4',
    ETH_ONDO_PRICE_FEED: '0xc6482a38572a1a8fA63Ba9187d04ce89d2dE64eF',
    RBTC_RONDO_PRICE_FEED: '0x3127c5555De87Ea9F631Bc0BE828E5Edbbd5e3bF',
    ADAPTER_ADDRESS: '0x27E5205211105b29430C7EA5A8804C0Bdf2b68f7',
    CCIP_ROUTER: '0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59',
    ROOTSTOCK_CHAIN_SELECTOR: 8953668971247136127
  },
  MAINNET: {}
};

interface TokenBalance {
  symbol: string;
  balance: string;
  nativePair: string;
  chain: 'Ethereum' | 'Rootstock';
  logo: string;
  type?: 'available' | 'locked';
  originalSymbol?: string;
}

interface WalletHookReturn {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  bitmaskAddress: string;
  error: string;
  connectWallet: (connectorId?: string) => Promise<void>;
  disconnectWallet: () => void;
  validateBitmaskAddress: (address: string) => boolean;
  setBitmaskAddress: (address: string) => void;
  bindWallet: () => Promise<void>;
  isBinding: boolean;
  isBound: boolean;
  walletName: string;
  isInjectedWallet: boolean;
  availableConnectors: Connector[];
  linkedAddressAmount: string;
  fetchBalances: (ethAddress: string, rootstockAddress: string) => Promise<TokenBalance[]>;
  currentChainId: string | null;
  currentNetwork: string | null;
  testContracts: () => Promise<void>;
  switchNetwork: (chainId: number) => Promise<boolean>;
  lockAndBridge: (ondoAmount: string, ondoTokenHolderAddress?: string) => Promise<string>;
  isLocking: boolean;
  lockError: string | null;
  approveOndoForBridge: (amount: string, tokenHolderAddress?: string) => Promise<string>;
  checkBridgeStatus: (amount: string, tokenHolderAddress?: string) => Promise<{ canBridge: boolean; reason: string; fee?: string }>;
}


export const useWallet = (): WalletHookReturn => {
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();
  
  const [bitmaskAddress, setBitmaskAddress] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isInjectedWallet, setIsInjectedWallet] = useState<boolean>(false);
  const [isBinding, setIsBinding] = useState<boolean>(false);
  const [isBound, setIsBound] = useState<boolean>(false);
  const [availableConnectors, setAvailableConnectors] = useState<Connector[]>([]);
  const [linkedAddressAmount, setLinkedAddressAmount] = useState<string>('0');
  const [currentChainId, setCurrentChainId] = useState<string | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<string | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  const lockAndBridge = useCallback(async (ondoAmount: string, ondoTokenHolderAddress?: string): Promise<string> => {
    setIsLocking(true);
    setLockError(null);
    
    try {
        // 1. Basic validations
        if (!address) throw new Error('Please connect your wallet');
        if (!CONTRACT_CONFIG.TESTNET.BITRWA_BRIDGE) throw new Error('Bridge configuration error');

        // 2. Convert amount
        const ondoAmountWei = ethers.parseUnits(ondoAmount, 18);
        
        // 3. Check wallet binding
        const boundWallet = bitmaskAddress || localStorage.getItem("rootstockAddress");
        if (!boundWallet) throw new Error('Please bind your Rootstock wallet first');

        // 4. Get token holder address
        const tokenHolder = ondoTokenHolderAddress || address;
        if (!ethers.isAddress(tokenHolder)) throw new Error('Invalid wallet address');

        // 5. Check allowance and request approval if needed
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const ondoToken = new ethers.Contract(
            CONTRACT_CONFIG.TESTNET.ONDO_TOKEN,
            erc20Abi,
            provider
        );
        
        console.log('🔍 Checking token allowance...');
        const allowance = await ondoToken.allowance(tokenHolder, CONTRACT_CONFIG.TESTNET.BITRWA_BRIDGE);
        console.log('Current allowance:', ethers.formatUnits(allowance, 18), 'USDY');
        console.log('Required amount:', ondoAmount, 'USDY');
        
        if (allowance < ondoAmountWei) {
            console.log('Insufficient allowance, requesting approval...');
            console.log('Current allowance:', ethers.formatUnits(allowance, 18), 'USDY');
            console.log('Required amount:', ethers.formatUnits(ondoAmountWei, 18), 'USDY');
            
            // Instead of handling approval automatically, throw an error to let the frontend handle it
            throw new Error('INSUFFICIENT_ALLOWANCE');
        }

        // 6. Use the new canBridge function to check all preconditions
        const bridgeContract = new ethers.Contract(
            CONTRACT_CONFIG.TESTNET.BITRWA_BRIDGE,
            bitRWABridgeABI,
            provider
        );

        console.log('🔍 Checking bridge preconditions...');
        const [canBridge, reason] = await bridgeContract.canBridge(address, tokenHolder, ondoAmountWei);
        
        if (!canBridge) {
            throw new Error(`Cannot bridge: ${reason}`);
        }

        console.log('✅ All preconditions met');

        // 7. Get required fee using the new getRequiredFee function
        let requiredFee: bigint;
        try {
            console.log('💰 Calculating required fee...');
            requiredFee = await bridgeContract.getRequiredFee(ondoAmountWei);
            console.log('Required fee:', ethers.formatEther(requiredFee), 'ETH');
        } catch (feeError) {
            console.warn('Could not get dynamic fee, using fallback:', feeError);
            requiredFee = ethers.parseEther('0.1'); // Fallback fee
        }
        
        // 8. Check ETH balance for fee
        const ethBalance = await provider.getBalance(address);
        if (ethBalance < requiredFee) {
            throw new Error(`Insufficient ETH for fee. Required: ${ethers.formatEther(requiredFee)} ETH, Available: ${ethers.formatEther(ethBalance)} ETH`);
        }

        // 9. Send transaction
        const signer = await provider.getSigner();
        const bridgeContractWithSigner = new ethers.Contract(
            CONTRACT_CONFIG.TESTNET.BITRWA_BRIDGE,
            bitRWABridgeABI,
            signer
        );

        console.log('🌉 Sending bridge transaction...');
        const tx = await bridgeContractWithSigner.lockAndBridge(
            ondoAmountWei,
            tokenHolder,
            {
                value: requiredFee,
                gasLimit: 500000
            }
        );

        console.log('📝 Transaction sent:', tx.hash);
        return tx.hash;

    } catch (error: any) {
        console.error('Transaction error:', error);
        let userMessage = error.message;
        
        // Enhanced error decoding for custom errors
        if (error?.data) {
            try {
                const iface = new ethers.Interface(bitRWABridgeABI);
                const decodedError = iface.parseError(error.data);
                
                switch (decodedError?.name) {
                    case 'NotCompliant':
                        userMessage = 'Your wallet is not compliant. Please contact support.';
                        break;
                    case 'WalletNotBound':
                        userMessage = 'Your wallet is not bound to a Bitmask wallet. Please bind your wallet first.';
                        break;
                    case 'InsufficientTokenBalance':
                        const [available, required] = decodedError?.args;
                        userMessage = `Insufficient balance: ${ethers.formatUnits(available, 18)} available, ${ethers.formatUnits(required, 18)} required`;
                        break;
                    case 'InsufficientTokenAllowance':
                        const [allowance, requiredAllowance] = decodedError?.args;
                        userMessage = `Insufficient allowance: ${ethers.formatUnits(allowance, 18)} approved, ${ethers.formatUnits(requiredAllowance, 18)} required`;
                        break;
                    case 'InsufficientFee':
                        const [sent, requiredFee] = decodedError?.args;
                        userMessage = `Insufficient fee: ${ethers.formatEther(sent)} ETH sent, ${ethers.formatEther(requiredFee)} ETH required`;
                        break;
                    case 'ZeroAmount':
                        userMessage = 'Amount must be greater than 0';
                        break;
                    case 'InvalidTokenHolder':
                        userMessage = 'Invalid token holder address';
                        break;
                    default:
                        userMessage = `Contract error: ${decodedError?.name}`;
                }
            } catch (decodeError) {
                console.error('Error decoding custom error:', decodeError);
                // Handle standard revert strings
                if (error.data.startsWith('0x08c379a0')) {
                    try {
                        const reason = ethers.AbiCoder.defaultAbiCoder().decode(
                            ['string'],
                            '0x' + error.data.slice(10)
                        )[0];
                        userMessage = reason;
                    } catch (e) {
                        userMessage = 'Contract execution reverted';
                    }
                }
            }
        } 
        // Handle user rejection
        else if (error.code === 4001) {
            userMessage = 'Transaction rejected by user';
        }

        setLockError(userMessage);
        throw new Error(userMessage);
    } finally {
        setIsLocking(false);
    }
}, [address, bitmaskAddress]);


  const approveOndoForBridge = useCallback(async (amount: string, tokenHolderAddress?: string): Promise<string> => {
    try {
      const holderAddress = tokenHolderAddress || address;
      if (!holderAddress) throw new Error('No token holder address available');

      const ondoAmountWei = ethers.parseUnits(amount, 18);
      
      // Use direct ethers.js call to ensure MetaMask prompt appears
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      const ondoToken = new ethers.Contract(
        CONTRACT_CONFIG.TESTNET.ONDO_TOKEN,
        erc20Abi,
        signer
      );
      
      console.log('📝 Sending approval transaction...');
      console.log('Token address:', CONTRACT_CONFIG.TESTNET.ONDO_TOKEN);
      console.log('Spender address:', CONTRACT_CONFIG.TESTNET.BITRWA_BRIDGE);
      console.log('Amount to approve:', ethers.formatUnits(ondoAmountWei, 18), 'USDY');
      
      const approveTx = await ondoToken.approve(
        CONTRACT_CONFIG.TESTNET.BITRWA_BRIDGE,
        ondoAmountWei
      );
      
      console.log('Approval transaction sent:', approveTx.hash);
      return approveTx.hash;
    } catch (error: any) {
      console.error('Approval error:', error);
      
      // Handle user rejection
      if (error.code === 4001) {
        throw new Error('Approval was rejected by user');
      }
      
      throw new Error(`Failed to approve USDY tokens: ${error.message}`);
    }
  }, [address]);



  const switchNetwork = async (targetChainId: number): Promise<boolean> => {
    try {
      if (!(window as any).ethereum) throw new Error('No Ethereum provider');
      
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          let params;
          switch (targetChainId) {
            case 1: params = NETWORKS.ETHEREUM_MAINNET; break;
            case 11155111: params = NETWORKS.ETHEREUM_SEPOLIA; break;
            case 30: params = NETWORKS.ROOTSTOCK_MAINNET; break;
            case 31: params = NETWORKS.ROOTSTOCK_TESTNET; break;
            default: throw new Error('Unsupported network');
          }
          
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [params],
          });
          return true;
        } catch (addError) {
          setError('Failed to add network');
          return false;
        }
      }
      setError('Failed to switch network');
      return false;
    }
  };

  const verifyNetwork = async (): Promise<boolean> => {
    try {
      if (!(window as any).ethereum) return false;
      
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const network = await provider.getNetwork();
      const hexChainId = `0x${network.chainId.toString(16)}`;
      
      setCurrentChainId(hexChainId);
      setCurrentNetwork(
        network.chainId === 1n ? 'Ethereum Mainnet' :
        network.chainId === 11155111n ? 'Ethereum Sepolia' :
        network.chainId === 30n ? 'Rootstock Mainnet' :
        network.chainId === 31n ? 'Rootstock Testnet' :
        `Unknown Network (${network.chainId})`
      );

      return [1, 11155111, 30, 31].includes(Number(network.chainId));
    } catch (err) {
      return false;
    }
  };

  const fetchBalances = async (ethAddress: string, rootstockAddress: string): Promise<TokenBalance[]> => {
    const balances: TokenBalance[] = [];
    
    try {
      if (!(window as any).ethereum) throw new Error('Ethereum provider not found');
      
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const network = await provider.getNetwork();
      const config = CONTRACT_CONFIG.TESTNET;

      if (Number(network.chainId) === 11155111) {
        try {
          const usdyContract = new ethers.Contract(
            config.USDY_PROXY,
            erc20Abi,
            provider
          );
          const usdyBalance = await usdyContract.balanceOf(ethAddress);
          balances.push({
            symbol: 'USDY',
            balance: ethers.formatUnits(usdyBalance, 18),
            nativePair: 'USDY/USDT',
            chain: 'Ethereum',
            logo: '/src/assets/ondo-token-icon.svg',
            type: 'available',
            originalSymbol: 'USDY'
          });
        } catch (ethError) {
          console.error('Error fetching Ethereum balances:', ethError);
        }
      }

      if (rootstockAddress && rootstockAddress !== ethers.ZeroAddress) {
        try {
          const rskProvider = new ethers.JsonRpcProvider(
            NETWORKS.ROOTSTOCK_TESTNET.rpcUrls[0]
          );
          
          const rOndoContract = new ethers.Contract(
            config.RONDO_TOKEN,
            erc20Abi,
            rskProvider
          );
  
          const rOndoBalance = await rOndoContract.balanceOf(rootstockAddress);
          balances.push({
            symbol: 'rUSDY',
            balance: ethers.formatUnits(rOndoBalance, 18),
            nativePair: 'rUSDY/USDT',
            chain: 'Rootstock',
            logo: '/src/assets/rondo-token-icon.svg',
            type: 'available',
            originalSymbol: 'rONDO'
          });
        } catch (rskError) {
          console.error('Error fetching Rootstock balances:', rskError);
        }
      }
  
      return balances;
    } catch (error) {
      return [];
    }
  };

  useEffect(() => {
    const checkInjectedWallet = async () => {
      const hasInjected = Boolean((window as any).ethereum);
      setIsInjectedWallet(hasInjected);
      
      const filteredConnectors = connectors.filter(connector => {
        if (connector.id === 'injected') return hasInjected;
        return true;
      });
      
      setAvailableConnectors(filteredConnectors);
      
      if (hasInjected) {
        try {
          await verifyNetwork();
        } catch (err) {}
      }
    };

    checkInjectedWallet();
  }, [connectors]);

  useEffect(() => {
    const checkBoundStatus = async () => {
      if (!address || !(window as any).ethereum) return;
      
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const contract = new ethers.Contract(
          CONTRACT_CONFIG.TESTNET.BITRWA_BRIDGE,
          bitRWABridgeABI,
          provider
        );
       
        // Check what Rootstock address is bound to the current Ethereum user
        const boundRootstockAddress = await contract.bitmaskWalletBindings(address);
        
        const isCurrentlyBound = boundRootstockAddress !== ethers.ZeroAddress;
        setIsBound(isCurrentlyBound);
        
        if (isCurrentlyBound && boundRootstockAddress !== ethers.ZeroAddress) {
          // The bound address is the Rootstock address
          setBitmaskAddress(boundRootstockAddress);
          localStorage.setItem("rootstockAddress", boundRootstockAddress);
          
          try {
            const rskProvider = new ethers.JsonRpcProvider(NETWORKS.ROOTSTOCK_TESTNET.rpcUrls[0]);
            const balance = await rskProvider.getBalance(boundRootstockAddress);
            setLinkedAddressAmount(ethers.formatEther(balance));
          } catch (balanceError) {
            console.warn('Could not fetch Rootstock balance:', balanceError);
          }
        } else {
          localStorage.removeItem("rootstockAddress");
          setLinkedAddressAmount('0');
        }
      } catch (err) {
        console.error('Error checking bound status:', err);
      }
    };

    checkBoundStatus();
  }, [address, isConnected]);

  const connectWallet = async (connectorId?: string): Promise<void> => {
    try {
      setError('');
      
      if (connectorId) {
        const selectedConnector = connectors.find(c => c.id === connectorId);
        if (!selectedConnector) throw new Error('Wallet connector not found');
        await connect({ connector: selectedConnector });
        await verifyNetwork();
        return;
      }
      
      if (isInjectedWallet) {
        const injectedConnector = connectors.find(c => c.id === 'injected');
        if (injectedConnector) {
          await connect({ connector: injectedConnector });
          await verifyNetwork();
          return;
        }
      }

      if (availableConnectors.length === 1) {
        await connect({ connector: availableConnectors[0] });
        await verifyNetwork();
      } else {
        throw new Error('Specify which wallet to connect');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    }
  };

  const disconnectWallet = (): void => {
    disconnect();
    setBitmaskAddress('');
    setIsBound(false);
    setCurrentChainId(null);
    setCurrentNetwork(null);
    setLinkedAddressAmount('0');
    localStorage.removeItem("rootstockAddress");
  };

  const validateBitmaskAddress = (address: string): boolean => {
    if (!address || address.length < 8 || address.length > 64) {
      setError('Invalid Rootstock address format');
      return false;
    }
    setError('');
    return true;
  };

  const bindWallet = async (): Promise<void> => {
    if (!address || !bitmaskAddress || !validateBitmaskAddress(bitmaskAddress)) return;

    setIsBinding(true);
    setError('');
    
    try {
      // First check if user is compliant
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const bridgeContract = new ethers.Contract(
        CONTRACT_CONFIG.TESTNET.BITRWA_BRIDGE,
        bitRWABridgeABI,
        provider
      );

      const isCompliant = await bridgeContract.isCompliant(address);
      if (!isCompliant) {
        throw new Error('Your wallet is not compliant. Please contact support to be whitelisted.');
      }

      // Bind the Rootstock address to the current Ethereum user
      console.log(`🔗 Binding Rootstock address ${bitmaskAddress} to Ethereum user ${address}...`);
      await writeContractAsync({
        address: CONTRACT_CONFIG.TESTNET.BITRWA_BRIDGE as `0x${string}`,
        abi: bitRWABridgeABI,
        functionName: 'bindBitmaskWallet',
        args: [bitmaskAddress], // This is the Rootstock address
      });
      
      setIsBound(true);
      localStorage.setItem("rootstockAddress", bitmaskAddress);
      
      // Update linked address balance (Rootstock balance)
      try {
        const rskProvider = new ethers.JsonRpcProvider(NETWORKS.ROOTSTOCK_TESTNET.rpcUrls[0]);
        const balance = await rskProvider.getBalance(bitmaskAddress);
        setLinkedAddressAmount(ethers.formatEther(balance));
      } catch (balanceError) {
        console.warn('Could not fetch Rootstock balance:', balanceError);
      }

      console.log('✅ Rootstock wallet bound successfully');
    } catch (err: any) {
      console.error('Bind wallet error:', err);
      
      // Handle specific contract errors
      if (err?.data) {
        try {
          const iface = new ethers.Interface(bitRWABridgeABI);
          const decodedError = iface.parseError(err.data);
          
          switch (decodedError?.name) {
            case 'NotCompliant':
              setError('Your wallet is not compliant. Please contact support to be whitelisted.');
              break;
            case 'InvalidWalletAddress':
              setError('Invalid Rootstock wallet address format.');
              break;
            default:
              setError(`Failed to bind wallet: ${decodedError?.name}`);
          }
        } catch (decodeError) {
          setError(`Failed to bind wallets: ${err.message || 'Please try again.'}`);
        }
      } else {
        setError(`Failed to bind wallets: ${err.message || 'Please try again.'}`);
      }
    } finally {
      setIsBinding(false);
    }
  };

  const testContracts = async () => {
    console.group('Contract Connection Tests');
    try {
      if (!address) throw new Error('No connected address');
      
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const network = await provider.getNetwork();
      const config = Number(network.chainId) === 1 || Number(network.chainId) === 30 ? 
        CONTRACT_CONFIG.MAINNET : CONTRACT_CONFIG.TESTNET;

        // @ts-ignore
      if (config.ONDO_TOKEN) {
        try {
          const ondo = new ethers.Contract(
            // @ts-ignore
            config.ONDO_TOKEN,
            [
              'function balanceOf(address) view returns (uint256)',
              'function name() view returns (string)',
              'function symbol() view returns (string)',
              'function decimals() view returns (uint8)'
            ],
            provider
          );
          const [name, symbol, decimals] = await Promise.all([
            ondo.name(),
            ondo.symbol(),
            ondo.decimals()
          ]);
          console.log('ONDO Contract:', { name, symbol, decimals });
        } catch (e) {
          console.error('ONDO Test Failed:', e);
        }
      }
// @ts-ignore
      if (config.BITRWA_BRIDGE) {
        try {
          const bridge = new ethers.Contract(
            // @ts-ignore
            config.BITRWA_BRIDGE,
            bitRWABridgeABI,
            provider
          );
          const isBound = await bridge.bitmaskWalletBindings(address);
          console.log('Bridge Binding Status:', isBound !== ethers.ZeroAddress);
        } catch (e) {
          console.error('Bridge Test Failed:', e);
        }
      }
    } catch (error) {
      console.error('Global Test Error:', error);
    } finally {
      console.groupEnd();
    }
  };

  useEffect(() => {
    if (!(window as any).ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) disconnectWallet();
    };

    const handleChainChanged = (chainId: string) => {
      setCurrentChainId(chainId);
      window.location.reload();
    };

    (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
    (window as any).ethereum.on('chainChanged', handleChainChanged);

    return () => {
      (window as any).ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      (window as any).ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [isConnected]);

  const checkBridgeStatus = useCallback(async (amount: string, tokenHolderAddress?: string): Promise<{ canBridge: boolean; reason: string; fee?: string }> => {
    try {
      if (!CONTRACT_CONFIG.TESTNET.BITRWA_BRIDGE) return { canBridge: false, reason: 'Bridge configuration error' };
      if (!address) return { canBridge: false, reason: 'Please connect your wallet' };

      const ondoAmountWei = ethers.parseUnits(amount, 18);
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const bridgeContract = new ethers.Contract(
        CONTRACT_CONFIG.TESTNET.BITRWA_BRIDGE,
        bitRWABridgeABI,
        provider
      );

      console.log('🔍 Checking bridge preconditions...');
      const [canBridge, reason] = await bridgeContract.canBridge(address, tokenHolderAddress || address, ondoAmountWei);
      
      if (!canBridge) {
        return { canBridge: false, reason };
      }

      console.log('✅ All preconditions met');

      let fee: string | undefined;
      try {
        console.log('💰 Calculating required fee...');
        const requiredFee = await bridgeContract.getRequiredFee(ondoAmountWei);
        fee = ethers.formatEther(requiredFee);
        console.log('Required fee:', fee, 'ETH');
      } catch (feeError) {
        console.warn('Could not get dynamic fee, using fallback:', feeError);
        fee = '0.1'; // Fallback fee
      }

      return { canBridge, reason, fee };
    } catch (error) {
      console.error('Error checking bridge status:', error);
      return { canBridge: false, reason: 'An error occurred' };
    }
  }, [address]);

  return {
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
    walletName: activeConnector?.name || (isInjectedWallet ? 'Browser Wallet' : 'Not Connected'),
    isInjectedWallet,
    availableConnectors,
    linkedAddressAmount,
    fetchBalances,
    currentChainId,
    currentNetwork,
    testContracts,
    switchNetwork,
    lockAndBridge,
    isLocking,
    lockError,
    approveOndoForBridge,
    checkBridgeStatus
  };
};