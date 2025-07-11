async function initApp() {
  try {
    if (typeof window.ethereum === 'undefined') {
      alert("No wallet detected. Please install MetaMask.");
      return;
    }

    console.log("🟢 Wallet detected. Connecting...");

    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    const response = await fetch('./abi/contractABI.json');
    const abi = await response.json();

    contract = new ethers.Contract(contractAddress, abi, signer);

    homepage.classList.remove('active');
    dashboard.classList.add('active');

    unlockTimestamp = await contract.getUnlockTime();
    startCountdown();
    await loadUserData();

    console.log("✅ Wallet connected:", userAddress);

  } catch (err) {
    console.error("❌ Failed to initialize dApp:", err);
    alert("Failed to initialize dApp. Check console for details.");
  }
}
