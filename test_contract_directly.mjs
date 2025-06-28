import { ethers } from 'ethers';

async function testContractDirectly() {
  // Sepolia RPC
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/UtaPNUX-ubMTd7j83ZiiDu8RrJEWktwr');
  
  // Contract address (update this to your deployed contract)
  const bridgeAddress = '0xf64a76A57AC76202319F7a53cBd777807bb96a9a';
  
  try {
    console.log('=== Testing Contract Directly ===\n');
    
    // Get private key from command line
    const privateKey = process.argv[2];
    if (!privateKey) {
      console.log('Usage: node test_contract_directly.mjs <PRIVATE_KEY>');
      console.log('⚠️  WARNING: Never share your private key!');
      return;
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('Your address:', wallet.address);
    console.log('Bridge address:', bridgeAddress);
    
    // Bridge ABI (minimal)
    const bridgeABI = [
      "function lockAndBridge(uint256 ondoAmount, address ondoTokenHolder) external payable",
      "function isCompliant(address user) external view returns (bool)",
      "function bitmaskWalletBindings(address user) external view returns (address)"
    ];
    
    const bridgeContract = new ethers.Contract(bridgeAddress, bridgeABI, provider);
    
    // Check if user is compliant
    try {
      const isCompliant = await bridgeContract.isCompliant(wallet.address);
      console.log('User compliant:', isCompliant);
    } catch (e) {
      console.log('❌ Error checking compliance:', e.message);
    }
    
    // Check if wallet is bound
    try {
      const boundWallet = await bridgeContract.bitmaskWalletBindings(wallet.address);
      console.log('Bound wallet:', boundWallet);
    } catch (e) {
      console.log('❌ Error checking wallet binding:', e.message);
    }
    
    // Test parameters
    const ondoAmount = ethers.parseUnits('1', 18); // 1 ONDO
    const tokenHolder = wallet.address;
    const value = ethers.parseEther('0.5'); // 0.5 ETH fee
    
    console.log('\nTesting with:');
    console.log('- Amount:', ethers.formatUnits(ondoAmount, 18), 'ONDO');
    console.log('- Token Holder:', tokenHolder);
    console.log('- Fee:', ethers.formatEther(value), 'ETH');
    
    console.log('\n=== Calling lockAndBridge ===');
    
    try {
      // First try callStatic to simulate without executing
      console.log('Testing with callStatic...');
      const result = await bridgeContract.connect(wallet).callStatic.lockAndBridge(ondoAmount, tokenHolder, {
        value: value,
        gasLimit: 500000
      });
      console.log('✅ callStatic succeeded');
      
    } catch (error) {
      console.log('❌ callStatic failed:', error.message);
      
      if (error.data) {
        console.log('Error data:', error.data);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testContractDirectly(); 