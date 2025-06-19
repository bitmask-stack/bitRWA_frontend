import { useAccount, useConnect, useDisconnect, Connector } from 'wagmi'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWriteContract } from 'wagmi' // Updated import
import { bitRWABridgeABI } from '../abis/bitRWABridgeABI'


type WalletHookReturn = {
  address: `0x${string}` | undefined
  isConnected: boolean
  bitmaskAddress: string
  error: string
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  validateBitmaskAddress: (address: string) => boolean
  setBitmaskAddress: (address: string) => void
  bindWallet: () => Promise<void>
  isBinding: boolean
  isBound: boolean
  walletName: string
  isInjectedWallet: boolean
}

const BITRWA_BRIDGE_ADDRESS = '0xYourContractAddress'

export const useWallet = (): WalletHookReturn => {
  const { address, isConnected, connector: activeConnector } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { writeContractAsync } = useWriteContract() // Updated hook
  const [bitmaskAddress, setBitmaskAddress] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isInjectedWallet, setIsInjectedWallet] = useState<boolean>(false)
  const [isBinding, setIsBinding] = useState<boolean>(false)
  const [isBound, setIsBound] = useState<boolean>(false)

  // Setup contract write configuration
  // const { config: bindConfig } = usePrepareContractWrite({
  //   address: BITRWA_BRIDGE_ADDRESS,
  //   abi: bitRWABridgeABI,
  //   functionName: 'bindBitmaskWallet',
  //   args: [bitmaskAddress],
  //   enabled: Boolean(bitmaskAddress) && isConnected,
  // })

  // const { writeAsync: bindWalletContract } = useContractWrite(bindConfig)

  useEffect(() => {
    const checkInjectedWallet = () => {
      setIsInjectedWallet(Boolean(window.ethereum))
    }
    
    checkInjectedWallet()
    const interval = setInterval(checkInjectedWallet, 1000)
    return () => clearInterval(interval)
  }, [])

  // Check if wallet is already bound
  useEffect(() => {
    const checkBoundStatus = async () => {
      if (!address) return
      
      try {
        // In a real app, you would query the contract here
        // For now, we'll use a mock implementation
        const provider = new ethers.BrowserProvider(window.ethereum)
        const contract = new ethers.Contract(
          BITRWA_BRIDGE_ADDRESS,
          bitRWABridgeABI,
          provider
        )
        
        const boundAddress = await contract.bitmaskWalletBindings(address)
        setIsBound(boundAddress !== ethers.ZeroAddress)
        
        // If bound, set the bitmask address
        if (isBound && boundAddress !== ethers.ZeroAddress) {
          setBitmaskAddress(boundAddress)
        }
      } catch (err) {
        console.error('Error checking bound status:', err)
      }
    }

    checkBoundStatus()
  }, [address, isConnected])

  const connectWallet = async (): Promise<void> => {
    try {
      setError('')
      
      if (isInjectedWallet) {
        const injectedConnector = connectors.find(
          (c: Connector) => c.id === 'injected'
        )
        
        if (injectedConnector) {
          await connect({ connector: injectedConnector })
          return
        }
      }

      if (connectors.length > 0) {
        await connect({ connector: connectors[0] })
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
    // Adjust this validation according to your Bitmask address requirements
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
    isInjectedWallet
  }
}