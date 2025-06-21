import { useAccount, useConnect, useDisconnect, Connector, useBalance } from 'wagmi'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWriteContract } from 'wagmi'
import { bitRWABridgeABI } from '../abis/bitRWABridgeABI'

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
  availableConnectors: Connector[],
  linkedAddressAmount: any
}

const BITRWA_BRIDGE_ADDRESS = '0x02CBDeFeBd06D5E946b72F86813A0e49Bf96a5D0'

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
  const [linkedAddressAmount, setLinkedAddressAmount] = useState<any>(0)

  useEffect(() => {
    const checkInjectedWallet = () => {
      const hasInjected = Boolean(window.ethereum)
      setIsInjectedWallet(hasInjected)
      
      // Filter out connectors that aren't available (like when wallets aren't installed)
      const filteredConnectors = connectors.filter(connector => {
        // For injected connectors, check if any wallet is injected
        if (connector.id === 'injected') return hasInjected
        
        // For wallet connect and other connectors, we assume they're available
        return true
      })
      
      setAvailableConnectors(filteredConnectors)
    }
    
    checkInjectedWallet()
    const interval = setInterval(checkInjectedWallet, 1000)
    return () => clearInterval(interval)
  }, [connectors])

  // Check if wallet is already bound
  useEffect(() => {
    const checkBoundStatus = async () => {
      if (!address) return
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const contract = new ethers.Contract(
          BITRWA_BRIDGE_ADDRESS,
          bitRWABridgeABI,
          provider
        )
       
        
        const boundAddress = await contract.bitmaskWalletBindings(address)
    
        setIsBound(boundAddress !== ethers.ZeroAddress)
        
        if (isBound && boundAddress !== ethers.ZeroAddress) {
          const _boundAddress: any = localStorage.getItem("rootstockAddress")
          const { data: balance } = useBalance({ address: _boundAddress })
          setLinkedAddressAmount(balance)
          setBitmaskAddress(_boundAddress)
        }
      } catch (err) {
        console.error('Error checking bound status:', err)
      }
    }

    checkBoundStatus()
  }, [address, isConnected])

  const connectWallet = async (connectorId?: string): Promise<void> => {
    try {
      setError('')
      
      if (connectorId) {
        // Connect to the specified connector
        const selectedConnector = connectors.find(c => c.id === connectorId)
        if (!selectedConnector) {
          throw new Error('Requested wallet connector not found')
        }
        await connect({ connector: selectedConnector })
        return
      }
      
      // If no connector specified, use the default behavior
      if (isInjectedWallet) {
        const injectedConnector = connectors.find(c => c.id === 'injected')
        if (injectedConnector) {
          await connect({ connector: injectedConnector })
          return
        }
      }

      if (availableConnectors.length > 0) {
        // If only one connector available, use that
        if (availableConnectors.length === 1) {
          await connect({ connector: availableConnectors[0] })
        } else {
          // Multiple connectors available but none specified - throw error
          throw new Error('Multiple wallets detected. Please specify which wallet to connect.')
        }
      } else {
        throw new Error('No wallet connectors available')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet'
      setError(message)
      console.error('Connection error:', err)
    }
  }

  const disconnectWallet = (): void => {
    disconnect()
    setBitmaskAddress('')
    setIsBound(false)
  }

  const validateBitmaskAddress = (address: string): boolean => {
    if (!address || address.length < 8 || address.length > 64) {
      setError('Invalid Bitmask address format')
      return false
    }
    
    setError('')
    return true
  }

  const bindWallet = async (): Promise<void> => {
    if (!address || !bitmaskAddress || !validateBitmaskAddress(bitmaskAddress)) {
      return
    }

    setIsBinding(true)
    setError('')
    
    try {
      await writeContractAsync({
        address: BITRWA_BRIDGE_ADDRESS,
        abi: bitRWABridgeABI,
        functionName: 'bindBitmaskWallet',
        args: [bitmaskAddress],
      })
      
      setIsBound(true)
    } catch (err) {
      setError('Failed to bind wallets. Please try again.')
      console.error('Binding error:', err)
    } finally {
      setIsBinding(false)
    }
  }

  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = (accounts: string[]): void => {
      if (accounts.length === 0) {
        disconnectWallet()
      }
    }

    const handleChainChanged = (): void => {
      window.location.reload()
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
    }
  }, [isConnected])

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
    linkedAddressAmount
  }
}