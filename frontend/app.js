document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM ready");

  let provider, signer, contract, userAddress, unlockTimestamp;

  const contractAddress = "0xF020f362CDe86004d94C832596415E082A77e203";
  const rpcUrl = "https://sepolia-rollup.arbitrum.io/rpc";
  const chainId = 421614;

  const abi = [ /* ✅ Your ABI exactly as before */ 
    {
      "inputs": [],
      "name": "deposit",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "index", "type": "uint256" }],
      "name": "claim",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
      "name": "getDeposits",
      "outputs": [{
        "components": [
          { "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
          { "internalType": "bool", "name": "claimed", "type": "bool" }
        ],
        "internalType": "struct TimeLockVault.Deposit[]",
        "name": "",
        "type": "tuple[]"
      }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getUnlockTime",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
      "name": "getTotalDeposited",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getStartTime",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getUserCount",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  const connectBtn = document.getElementById("connectBtn");
  const homepage = document.getElementById("homepage");
  const dashboard = document.getElementById("dashboard");
  const depositForm = document.getElementById("depositForm");
  const depositAmount = document.getElementById("depositAmount");
  const historyTableBody = document.querySelector('#historyTable tbody');
  const totalDepositedEl = document.getElementById('totalDeposited');
  const timerEl = document.getElementById('timer');
  const depositHeading = document.getElementById('depositTitle');
  const afterUnlockText = document.getElementById('claimNote');
  const inlineClaimWrapper = document.getElementById('claimOnlyBtnWrapper');
  const inlineClaimBtn = document.getElementById('claimOnlyBtn');
  const startDateEl = document.getElementById('startDate');
  const totalUsersEl = document.getElementById('totalUsers');
  const vaultBalanceEl = document.getElementById('vaultBalance');

  function showStatus(message, duration = 3000) {
    let statusDiv = document.getElementById("statusMessage");
    if (!statusDiv) {
      statusDiv = document.createElement("div");
      statusDiv.id = "statusMessage";
      statusDiv.style.position = "fixed";
      statusDiv.style.top = "20px";
      statusDiv.style.left = "50%";
      statusDiv.style.transform = "translateX(-50%)";
      statusDiv.style.backgroundColor = "#111";
      statusDiv.style.color = "#fff";
      statusDiv.style.padding = "12px 20px";
      statusDiv.style.borderRadius = "10px";
      statusDiv.style.boxShadow = "0 2px 10px rgba(0,0,0,0.3)";
      statusDiv.style.zIndex = "9999";
      document.body.appendChild(statusDiv);
    }
    statusDiv.textContent = message;
    statusDiv.style.display = "block";
    setTimeout(() => {
      statusDiv.style.display = "none";
    }, duration);
  }

  connectBtn.addEventListener("click", async () => {
    try {
      if (!window.ethereum) {
        alert("Please use a browser with an Ethereum wallet like MetaMask.");
        return;
      }

      provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = network.chainId;

      if (currentChainId !== chainId) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x" + chainId.toString(16) }]
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0x" + chainId.toString(16),
                chainName: "Arbitrum Sepolia",
                rpcUrls: [rpcUrl],
                nativeCurrency: {
                  name: "Ethereum",
                  symbol: "ETH",
                  decimals: 18
                },
                blockExplorerUrls: ["https://sepolia.arbiscan.io"]
              }]
            });
          } else {
            alert("Please switch to the Arbitrum Sepolia network.");
            return;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 700));
        provider = new ethers.providers.Web3Provider(window.ethereum);
      }

      await window.ethereum.request({ method: "eth_requestAccounts" });
      signer = provider.getSigner();
      userAddress = await signer.getAddress();
      contract = new ethers.Contract(contractAddress, abi, signer);

      homepage.style.display = "none";
      dashboard.style.display = "block";

      const rawUnlockTime = await contract.getUnlockTime();
      unlockTimestamp = Number(rawUnlockTime);
      startCountdown();
      await loadUserData();

    } catch (err) {
      if (err.code === "NETWORK_ERROR") {
        console.warn("⚠️ Network changed too fast. Please try again.");
        return;
      }
      console.error("❌ Wallet connection failed:", err);
      alert("Wallet connection failed: " + (err.message || "Unknown error"));
    }
  });

  function startCountdown() {
    if (!unlockTimestamp) {
      timerEl.textContent = "Invalid unlock time.";
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = unlockTimestamp * 1000 - now;

      if (diff <= 0) {
        timerEl.textContent = "Unlocked!";
        clearInterval(interval);
        depositForm.style.display = "none";
        depositHeading.textContent = "Savelock Period has Ended";
        afterUnlockText.style.display = "block";
        inlineClaimWrapper.style.display = "block";
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);
        timerEl.textContent = `${d}d ${h}h ${m}m ${s}s`;
      }
    }, 1000);
  }

  async function loadUserData() {
    try {
      const deposits = await contract.getDeposits(userAddress);
      const total = await contract.getTotalDeposited(userAddress);
      totalDepositedEl.textContent = `${ethers.utils.formatEther(total)} ETH`;

      historyTableBody.innerHTML = '';
      deposits.forEach((d, i) => {
        const isUnlocked = Date.now() / 1000 >= unlockTimestamp;
        const status = d.claimed ? '✅ Claimed' : (isUnlocked ? '🔓 Claimable' : '🔒 Locked');
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${ethers.utils.formatEther(d.amount)} ETH</td>
          <td>${new Date(Number(d.timestamp) * 1000).toLocaleString()}</td>
          <td>${status}</td>`;
        historyTableBody.appendChild(row);
      });
    } catch (err) {
      console.error("❌ Error loading deposits:", err);
    }

    try {
      const contractStartTime = await contract.getStartTime();
      startDateEl.textContent = new Date(Number(contractStartTime) * 1000).toLocaleString();
    } catch {
      startDateEl.textContent = "N/A";
    }

    try {
      const totalUsers = await contract.getUserCount();
      totalUsersEl.textContent = totalUsers.toString();
    } catch {
      totalUsersEl.textContent = "N/A";
    }

    try {
      const vaultBal = await provider.getBalance(contractAddress);
      vaultBalanceEl.textContent = `${ethers.utils.formatEther(vaultBal)} ETH`;
    } catch {
      vaultBalanceEl.textContent = "N/A";
    }
  }

  depositForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (Date.now() >= unlockTimestamp * 1000) {
      alert("Savelock period has ended.");
      return;
    }

    const amount = parseFloat(depositAmount.value);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount greater than 0.");
      return;
    }

    try {
      showStatus("Depositing...");
      const tx = await contract.deposit({ value: ethers.utils.parseEther(amount.toString()) });
      await tx.wait();
      showStatus("Deposit successful", 3000);
      depositAmount.value = '';
      await loadUserData();
    } catch (err) {
      console.error("❌ Deposit failed:", err);
      showStatus("Deposit failed", 3000);
    }
  });

  inlineClaimBtn.addEventListener("click", async () => {
    try {
      const deposits = await contract.getDeposits(userAddress);
      let claimedAny = false;

      for (let i = 0; i < deposits.length; i++) {
        if (!deposits[i].claimed) {
          showStatus(`Claiming deposit ${i + 1}...`);
          const tx = await contract.claim(i);
          await tx.wait();
          claimedAny = true;
        }
      }

      if (claimedAny) {
        showStatus("All eligible deposits claimed", 3000);
      } else {
        showStatus("No unclaimed deposits", 3000);
      }

      await loadUserData();
    } catch (err) {
      console.error("❌ Claim failed:", err);
      showStatus("Claim failed", 3000);
    }
  });
});
