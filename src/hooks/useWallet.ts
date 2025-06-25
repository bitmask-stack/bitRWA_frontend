import { useAccount, useConnect, useDisconnect, Connector } from 'wagmi'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWriteContract } from 'wagmi'
import { bitRWABridgeABI } from '../abis/bitRWABridgeABI'

import { erc20Abi } from 'viem'

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
//USDY_PROXY: '0x96c94BdA9b4633F6cf7B42E44a1baF97be8b4B46',
// Contract Addresses
const CONTRACT_CONFIG = {
  TESTNET: {
    MOCK_USDT: '0xf554F7b66B19A6D28e47d010d5DAf86c9AFa114F',
    USDY_PROXY: '0x717C3087fe043A4C9455142148932b94562D1244', 
    ONDO_TOKEN: '0xb83989068264628Bdf94b7d0a11C969c8736e46f', //0xb83989068264628Bdf94b7d0a11C969c8736e46f
    RONDO_TOKEN: '0xf3511feB383BEf3164DB72CbC70b3dDA93F119be',
    ONDO_BITRWA_HUB: '0xb83989068264628Bdf94b7d0a11C969c8736e46f',
    BITRWA_BRIDGE: '0x988227FDde38e4C682f31C043A560C5f56fa2448',
    ETH_ONDO_PRICE_FEED: '0x6DCee8BDc08F25950615c1F2850B35350BD3653b',
    RBTC_RONDO_PRICE_FEED: '0x107c0a22B941Fd9A009087387a7e5869bDD2730f',
    ADAPTER_ADDRESS: '0xA2f2D55842E308c1C1017a2c0aB2193d03f037BA',
   
  },
  MAINNET: {} // Add mainnet addresses when ready
};
const BRIDGE_CONTRACT_ADDRESS = "0x988227FDde38e4C682f31C043A560C5f56fa2448";

interface TokenBalance {
  symbol: string;
  balance: string;
  nativePair: string;
  chain: 'Ethereum' | 'Rootstock';
  logo: string;
  type?: 'available' | 'locked';
  originalSymbol?: string;
}

type WalletHookReturn = {
  address: `0x${string}` | undefined
  isConnected: boolean
  bitmaskAddress: string
  error: string
  connectWallet: (connectorId?: string) => Promise<void>
  disconnectWallet: () => void
  validateBitmaskAddress: (address: string) => boolean
  setBitmaskAddress: (address: string) => void
  bindWallet: () => Promise<void>
  isBinding: boolean
  isBound: boolean
  walletName: string
  isInjectedWallet: boolean
  availableConnectors: Connector[]
  linkedAddressAmount: string // Changed to match component expectation
  fetchBalances: (ethAddress: string, rootstockAddress: string) => Promise<TokenBalance[]>
  currentChainId: string | null
  currentNetwork: string | null
  testContracts: () => Promise<void>
  switchNetwork: (chainId: number) => Promise<boolean>
  lockAndBridge: (ondoAmount: string) => Promise<any>;
  isLocking: boolean;
  lockError: string | null;
}

export const useWallet = (): WalletHookReturn => {
  const { address, isConnected, connector: activeConnector } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { writeContractAsync } = useWriteContract()
  const [bitmaskAddress, setBitmaskAddress] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isInjectedWallet, setIsInjectedWallet] = useState<boolean>(false)
  const [isBinding, setIsBinding] = useState<boolean>(false)
  const [isBound, setIsBound] = useState<boolean>(false)
  const [availableConnectors, setAvailableConnectors] = useState<Connector[]>([])
  const [linkedAddressAmount, setLinkedAddressAmount] = useState<string>('0') // Changed name to match
  const [currentChainId, setCurrentChainId] = useState<string | null>(null)
  const [currentNetwork, setCurrentNetwork] = useState<string | null>(null)
  const [isLocking, setIsLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  // Enhanced error parsing

  // const lockAndBridge = async (ondoAmount: string) => {
  //   if (!address || !bitmaskAddress) {
  //     throw new Error('Wallet not properly connected');
  //   }
  
  //   setIsLocking(true);
  //   setLockError(null);
  
  //   try {
  //     // 1. Convert amount and validate
  //     const ondoAmountWei = ethers.parseUnits(ondoAmount, 18);
  //     if (ondoAmountWei <= 0n) throw new Error('Amount must be > 0');
  
  //     // 2. Check balance using ethers.js since we don't have readContract

  //     //@ts-ignore
  //     const provider = new ethers.BrowserProvider(window.ethereum);
  //     const ondoContract = new ethers.Contract(
  //       CONTRACT_CONFIG.TESTNET.ONDO_TOKEN,
  //       erc20Abi,
  //       provider
  //     );
  
  //     const balance = await ondoContract.balanceOf(address);
  //     if (balance < ondoAmountWei) {
  //       throw new Error(`Insufficient balance. Need ${ondoAmount} ONDO`);
  //     }
  
  //     // 3. Check allowance and approve if needed
  //     const allowance = await ondoContract.allowance(address, BRIDGE_CONTRACT_ADDRESS);
  //     if (allowance < ondoAmountWei) {
  //       await writeContractAsync({
  //         address: CONTRACT_CONFIG.TESTNET.ONDO_TOKEN as `0x${string}`,
  //         abi: erc20Abi,
  //         functionName: 'approve',
  //         args: [BRIDGE_CONTRACT_ADDRESS, ondoAmountWei]
  //       });
  //     }
  
  //     // 4. Get required fee using ethers.js
  //     const bridgeContract = new ethers.Contract(
  //       BRIDGE_CONTRACT_ADDRESS,
  //       bitRWABridgeABI,
  //       provider
  //     );
  //     const fee = await bridgeContract.getOndoToEthRatio(ondoAmountWei);
  
  //     // 5. Execute bridge transaction using writeContractAsync
  //     const txHash = await writeContractAsync({
  //       address: BRIDGE_CONTRACT_ADDRESS as `0x${string}`,
  //       abi: bitRWABridgeABI,
  //       functionName: 'lockAndBridge',
  //       args: [ondoAmountWei],
  //       value: fee
  //     });
  
  //     console.log('Transaction sent:', txHash);
  //     return fetchBalances(address, bitmaskAddress);
  
  //   } catch (error) {
  //     console.error('Bridge Error:', error);
  //     const message = parseError(error);
  //     setLockError(message);
  //     throw new Error(message);
  //   } finally {
  //     setIsLocking(false);
  //   }
  // };

  const lockAndBridge = async (ondoAmount: string) => {
    if (!address || !bitmaskAddress) {
      throw new Error('Wallet not properly connected');
    }
  
    setIsLocking(true);
    setLockError(null);
  
    try {
      // 1. Convert amount to wei
      const ondoAmountWei = ethers.parseUnits(ondoAmount, 18);
      if (ondoAmountWei <= 0n) throw new Error('Amount must be > 0');
  
      // 2. Check balance
      //@ts-ignore
      const provider = new ethers.BrowserProvider(window.ethereum);
      const ondoContract = new ethers.Contract(
        CONTRACT_CONFIG.TESTNET.ONDO_TOKEN,
        erc20Abi,
        provider
      );
  
      const balance = await ondoContract.balanceOf(address);
      if (balance < ondoAmountWei) {
        throw new Error(`Insufficient balance. Need ${ondoAmount} ONDO`);
      }
  
      // 3. Check allowance and approve if needed
      const allowance = await ondoContract.allowance(address, BRIDGE_CONTRACT_ADDRESS);
      if (allowance < ondoAmountWei) {
        const approveTx = await writeContractAsync({
          address: CONTRACT_CONFIG.TESTNET.ONDO_TOKEN as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [BRIDGE_CONTRACT_ADDRESS, ondoAmountWei]
        });
        console.log('Approval tx:', approveTx);
      }
  
      // 4. Get CCIP fee
      const bridgeContract = new ethers.Contract(
        BRIDGE_CONTRACT_ADDRESS,
        bitRWABridgeABI,
        provider
      );
  
      // Create CCIP message (mockup - adjust according to your contract)
      const message = {
        receiver: ethers.zeroPadValue(CONTRACT_CONFIG.TESTNET.ADAPTER_ADDRESS, 32),
        data: ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint256", "uint256"],
          [address, ondoAmountWei, 0] // Adjust parameters as needed
        ),
        tokenAmounts: [],
        extraArgs: "0x",
        feeToken: ethers.ZeroAddress
      };
  
      const fee = await bridgeContract.ccipRouter.getFee(
        /* destinationChainSelector */ 123, // Replace with actual Rootstock chain selector
        message
      );
  
      // 5. Execute bridge transaction
      const txHash = await writeContractAsync({
        address: BRIDGE_CONTRACT_ADDRESS as `0x${string}`,
        abi: bitRWABridgeABI,
        functionName: 'lockAndBridge',
        args: [ondoAmountWei],
        value: fee // Include the CCIP fee
      });
  
      console.log('Bridge transaction sent:', txHash);
      return txHash;
  
    } catch (error) {
      console.error('Bridge Error:', error);
      const message = parseError(error);
      setLockError(message);
      throw new Error(message);
    } finally {
      setIsLocking(false);
    }
  };
  const parseError = (error: any): string => {
  // Handle MetaMask user rejection
  if (error?.code === 4001) return 'User denied transaction';
  
  // Parse contract revert reasons
  if (error?.data) {
    try {
      if (error.data.startsWith('0x08c379a0')) {
        return ethers.AbiCoder.defaultAbiCoder().decode(
          ['string'], 
          `0x${error.data.slice(10)}`
        )[0];
      }
    } catch (e) {
      console.warn('Error parsing revert reason:', e);
    }
  }
  
  return error.message || 'Transaction failed';
};
  

  const switchNetwork = async (targetChainId: number): Promise<boolean> => {
    try {
        //@ts-ignore
      if (!window.ethereum) {
        throw new Error('No Ethereum provider found');
      }
  //@ts-ignore
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          let params;
          switch (targetChainId) {
            case 1:
              params = NETWORKS.ETHEREUM_MAINNET;
              break;
            case 11155111:
              params = NETWORKS.ETHEREUM_SEPOLIA;
              break;
            case 30:
              params = NETWORKS.ROOTSTOCK_MAINNET;
              break;
            case 31:
              params = NETWORKS.ROOTSTOCK_TESTNET;
              break;
            default:
              throw new Error('Unsupported network');
          }
  //@ts-ignore
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [params],
          });
          return true;
        } catch (addError) {
          console.error('Error adding network:', addError);
          setError('Failed to add network');
          return false;
        }
      }
      console.error('Error switching network:', switchError);
      setError('Failed to switch network');
      return false;
    }
  };

  const verifyNetwork = async (): Promise<boolean> => {
    try {
        //@ts-ignore
      if (!window.ethereum) {
        console.warn('No injected provider found');
        return false;
      }
  //@ts-ignore
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const hexChainId = `0x${network.chainId.toString(16)}`;
      
      setCurrentChainId(hexChainId);
      
      setCurrentNetwork(
          //@ts-ignore
        network.chainId === 1 ? 'Ethereum Mainnet' :
          //@ts-ignore
        network.chainId === 11155111 ? 'Ethereum Sepolia' :
          //@ts-ignore
        network.chainId === 30 ? 'Rootstock Mainnet' :
          //@ts-ignore
        network.chainId === 31 ? 'Rootstock Testnet' :
        `Unknown Network (${network.chainId})`
      );

      return [1, 11155111, 30, 31].includes(Number(network.chainId));
    } catch (err) {
      console.error('Network verification failed:', err);
      return false;
    }
  };


  // const fetchBalances = async (ethAddress: string, rootstockAddress: string): Promise<TokenBalance[]> => {
  //   const balances: TokenBalance[] = [];
  
  //   try {
  //       //@ts-ignore
  //     if (!window.ethereum) throw new Error('Ethereum provider not found');
  //   //@ts-ignore
  //     const provider = new ethers.BrowserProvider(window.ethereum);
  //     const config = CONTRACT_CONFIG.TESTNET;
  
  //     // 1. Get Ethereum balances (ONDO locked in bridge)
  //     try {
  //       const bridgeContract = new ethers.Contract(
  //         config.BITRWA_BRIDGE,
  //         [
  //           'function lockedBalances(address) view returns (uint256)',
  //           'function bitmaskWalletBindings(address) view returns (address)'
  //         ],
  //         provider
  //       );
  
  //       // Get locked ONDO balance
  //       const lockedBalance = await bridgeContract.lockedBalances(ethAddress);
  //       balances.push({
  //         symbol: 'USDY',
  //         balance: ethers.formatUnits(lockedBalance, 18),
  //         nativePair: 'USDY/USDT',
  //         chain: 'Ethereum',
  //         logo: '/src/assets/ondo-locked-icon.svg',
  //         type: 'locked'
  //       });
        
  
  //       // Get bound Rootstock address
  //       const boundAddress = await bridgeContract.bitmaskWalletBindings(ethAddress);
  //       if (boundAddress && boundAddress !== ethers.ZeroAddress) {
  //         rootstockAddress = boundAddress; // Update if found
  //       }
  
  //     } catch (ethError) {
  //       console.error('Error fetching Ethereum balances:', ethError);
  //     }
      
  
  //     // 2. Get Rootstock rONDO balance if address exists
  //     if (rootstockAddress && rootstockAddress !== ethers.ZeroAddress) {
  //       try {
  //         const rskProvider = new ethers.JsonRpcProvider(
  //           NETWORKS.ROOTSTOCK_TESTNET.rpcUrls[0]
  //         );
          
  //         const rOndoContract = new ethers.Contract(
  //           config.RONDO_TOKEN,
  //           ['function balanceOf(address) view returns (uint256)'],
  //           rskProvider
  //         );
  
  //         const rOndoBalance = await rOndoContract.balanceOf(rootstockAddress);
  //         balances.push({
  //           symbol: 'rUSDY',
  //           balance: ethers.formatUnits(rOndoBalance, 18),
  //           nativePair: 'rUSDY/USDT',
  //           chain: 'Rootstock',
  //           logo: '/src/assets/rondo-token-icon.svg',
  //           type: 'available'
  //         });
  //       } catch (rskError) {
  //         console.error('Error fetching Rootstock balances:', rskError);
  //       }
  //     }
  
  //     return balances;
  
  //   } catch (error) {
  //     console.error('Error in fetchBalances:', error);
  //     return []; // Return empty array on critical failure
  //   }
  // };
  
  const fetchBalances = async (ethAddress: string, rootstockAddress: string): Promise<TokenBalance[]> => {
    const balances: TokenBalance[] = [];
    
    try {
        //@ts-ignore
      if (!window.ethereum) throw new Error('Ethereum provider not found');
      //@ts-ignore
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const config = CONTRACT_CONFIG.TESTNET; // Force using testnet config
  
      // Verify we're on Sepolia testnet (chainId 11155111)
      if (Number(network.chainId) !== 11155111) {
        console.warn('Not on Sepolia testnet - skipping Ethereum balances');
        // You might want to add logic here to prompt user to switch networks
      } else {
        // 1. Get Ethereum Sepolia testnet balances
        try {
          // USDY Available Balance
          const usdyContract = new ethers.Contract(
            config.USDY_PROXY, // 0x96c94BdA9b4633F6cf7B42E44a1baF97be8b4B46 on Sepolia
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
  
          // Locked ONDO Balance (in bridge)
          const bridgeContract = new ethers.Contract(
            config.BITRWA_BRIDGE, // 0x43ABeDD6C4027cbC31450BCfde78f8c16C6B4d65 on Sepolia
            bitRWABridgeABI,
            provider
          );
          const lockedBalance = await bridgeContract.lockedBalances(ethAddress);
          balances.push({
            symbol: 'USDY',
            balance: ethers.formatUnits(lockedBalance, 18),
            nativePair: 'USDY/USDT',
            chain: 'Ethereum',
            logo: '/src/assets/ondo-locked-icon.svg',
            type: 'locked',
            originalSymbol: 'ONDO'
          });
  
          // Get bound Rootstock address
          const boundAddress = await bridgeContract.bitmaskWalletBindings(ethAddress);
          if (boundAddress && boundAddress !== ethers.ZeroAddress) {
            rootstockAddress = boundAddress; // Update if found
          }
  
        } catch (ethError) {
          console.error('Error fetching Ethereum Sepolia balances:', ethError);
        }
      }
  
      // 2. Get Rootstock testnet rUSDY balance if address exists
      if (rootstockAddress && rootstockAddress !== ethers.ZeroAddress) {
        try {
          const rskProvider = new ethers.JsonRpcProvider(
            NETWORKS.ROOTSTOCK_TESTNET.rpcUrls[0]
          );
          
          const rOndoContract = new ethers.Contract(
            config.RONDO_TOKEN, // 0xf3511feB383BEf3164DB72CbC70b3dDA93F119be on RSK Testnet
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
          console.error('Error fetching Rootstock Testnet balances:', rskError);
        }
      }
  
      return balances;
  
    } catch (error) {
      console.error('Error in fetchBalances:', error);
      return []; // Return empty array on critical failure
    }
  };
  useEffect(() => {
    const checkInjectedWallet = async () => {
        //@ts-ignore
      const hasInjected = Boolean(window.ethereum);
      setIsInjectedWallet(hasInjected);
      
      const filteredConnectors = connectors.filter(connector => {
        if (connector.id === 'injected') return hasInjected;
        return true;
      });
      
      setAvailableConnectors(filteredConnectors);
      
      if (hasInjected) {
        try {
          await verifyNetwork();
        } catch (err) {
          console.error('Network verification error:', err);
        }
      }
    };
    
    checkInjectedWallet();
    const interval = setInterval(checkInjectedWallet, 1000);
    return () => clearInterval(interval);
  }, [connectors]);

  useEffect(() => {
    const checkBoundStatus = async () => {
      if (!address) return;
      
      try {
          //@ts-ignore
        if (!window.ethereum) {
          console.warn('No ethereum provider for bound status check');
          return;
        }
  //@ts-ignore
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(
          CONTRACT_CONFIG.TESTNET.BITRWA_BRIDGE,
          bitRWABridgeABI,
          provider
        );
       
        const boundAddress = await contract.bitmaskWalletBindings(address);
        const isCurrentlyBound = boundAddress !== ethers.ZeroAddress;
        setIsBound(isCurrentlyBound);
        
        if (isCurrentlyBound && boundAddress !== ethers.ZeroAddress) {
          // Use the bound address from contract, not localStorage
          setBitmaskAddress(boundAddress);
          localStorage.setItem("rootstockAddress", boundAddress);
          
          try {
            const rskProvider = new ethers.JsonRpcProvider(NETWORKS.ROOTSTOCK_TESTNET.rpcUrls[0]);
            const balance = await rskProvider.getBalance(boundAddress);
            setLinkedAddressAmount(ethers.formatEther(balance));
          } catch (balanceError) {
            console.error('Error fetching bound address balance:', balanceError);
            setLinkedAddressAmount('0');
          }
        } else {
          // Clear localStorage if not bound
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
        if (!selectedConnector) {
          throw new Error('Requested wallet connector not found');
        }
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

      if (availableConnectors.length > 0) {
        if (availableConnectors.length === 1) {
          await connect({ connector: availableConnectors[0] });
          await verifyNetwork();
        } else {
          throw new Error('Multiple wallets detected. Please specify which wallet to connect.');
        }
      } else {
        throw new Error('No wallet connectors available');
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(message);
      console.error('Connection error:', err);
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
      setError('Invalid Bitmask address format');
      return false;
    }
    
    setError('');
    return true;
  };

  const bindWallet = async (): Promise<void> => {
    if (!address || !bitmaskAddress || !validateBitmaskAddress(bitmaskAddress)) {
      return;
    }

    setIsBinding(true);
    setError('');
    
    try {
      // Store address before binding in case of failure
      const addressToStore = bitmaskAddress;
      
      await writeContractAsync({
        address: CONTRACT_CONFIG.TESTNET.BITRWA_BRIDGE as `0x${string}`,
        abi: bitRWABridgeABI,
        functionName: 'bindBitmaskWallet',
        args: [bitmaskAddress],
      });
      
      // Only update state and localStorage after successful transaction
      setIsBound(true);
      localStorage.setItem("rootstockAddress", addressToStore);
      
      // Fetch balance for the newly bound address
      try {
        const rskProvider = new ethers.JsonRpcProvider(NETWORKS.ROOTSTOCK_TESTNET.rpcUrls[0]);
        const balance = await rskProvider.getBalance(addressToStore);
        setLinkedAddressAmount(ethers.formatEther(balance));
      } catch (balanceError) {
        console.error('Error fetching balance after binding:', balanceError);
        setLinkedAddressAmount('0');
      }
      
    } catch (err: any) {
      setError(`Failed to bind wallets: ${err.message || 'Please try again.'}`);
      console.error('Binding error:', err);
    } finally {
      setIsBinding(false);
    }
  };

  const testContracts = async () => {
    console.group('Contract Connection Tests');
    try {
      if (!address) {
        throw new Error('No connected address');
      }
  //@ts-ignore
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
        //@ts-ignore
      const config = network.chainId === 1 || network.chainId === 30 ? 
        CONTRACT_CONFIG.MAINNET || {} : 
        CONTRACT_CONFIG.TESTNET;

      // Test ONDO Token
        //@ts-ignore
      if (config.ONDO_TOKEN) {
        try {
          const ondo = new ethers.Contract(
              //@ts-ignore
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
          console.log('ONDO Contract:');
          console.log('Name:', name);
          console.log('Symbol:', symbol);
          console.log('Decimals:', decimals);
          
          const balance = await ondo.balanceOf(address);
          console.log('Your ONDO Balance:', ethers.formatUnits(balance, decimals));
        } catch (e) {
          console.error('ONDO Test Failed:', e);
        }
      }

      // Test Bridge Contract
        //@ts-ignore
      if (config.BITRWA_BRIDGE) {
        try {
          const bridge = new ethers.Contract(
              //@ts-ignore
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
      //@ts-ignore
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]): void => {
      if (accounts.length === 0) {
        disconnectWallet();
      }
    };

    const handleChainChanged = (chainId: string): void => {
      setCurrentChainId(chainId);
      window.location.reload();
    };
  //@ts-ignore
    window.ethereum.on('accountsChanged', handleAccountsChanged);
      //@ts-ignore
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
        //@ts-ignore
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        //@ts-ignore
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [isConnected]);

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
    linkedAddressAmount, // Now matches component expectation
    fetchBalances,
    currentChainId,
    currentNetwork,
    testContracts,
    switchNetwork,
    lockAndBridge,
    isLocking,
    lockError
  };
};