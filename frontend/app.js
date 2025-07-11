// ✅ Load ABI and Initialize App with better debug
async function initApp() {
  try {
    console.log("🔄 Fetching ABI from: abi/contractABI.json");
    const response = await fetch('abi/contractABI.json'); // ← no './'
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ABI: ${response.statusText}`);
    }

    const abi = await response.json();
    console.log("✅ ABI loaded:", abi);

    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    console.log("✅ Wallet connected:", userAddress);

    contract = new ethers.Contract(contractAddress, abi, signer);

    homepage.classList.remove('active');
    dashboard.classList.add('active');

    unlockTimestamp = await contract.getUnlockTime();
    console.log("🔓 Unlock timestamp:", unlockTimestamp);

    startCountdown();
    await loadUserData();
  } catch (err) {
    console.error("🚨 Error initializing dApp:", err);
    alert("Failed to initialize dApp. Check console for details.");
  }
}
