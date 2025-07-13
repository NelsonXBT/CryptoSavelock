// === Global Variables ===
let provider, signer, contract, userAddress, unlockTimestamp;

const contractAddress = "0xF020f362CDe86004d94C832596415E082A77e203";
const projectId = "c3b7d635ca869e04b3759d209a9081eb";
const chainId = 421614; // Arbitrum Sepolia
const rpcUrl = "https://sepolia-rollup.arbitrum.io/rpc";

// === DOM Elements ===
const connectBtn = document.getElementById('connectBtn');
const homepage = document.getElementById('homepage');
const dashboard = document.getElementById('dashboard');
const depositForm = document.getElementById('depositForm');
const depositAmount = document.getElementById('depositAmount');
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

// === Initialize dApp on Load ===
window.onload = () => {
  const ethers = window.ethers;
  const w3m = window.w3m;

  if (!w3m || !w3m.createWeb3Modal || !w3m.EthereumProvider) {
    console.error("❌ Web3Modal not loaded correctly. Check your script setup.");
    alert("Web3Modal failed to load. Please check your script setup.");
    return;
  }

  const { createWeb3Modal, EthereumProvider } = w3m;

  // ✅ Initialize Web3Modal
  const modal = createWeb3Modal({
    projectId,
    themeMode: 'light',
    themeVariables: {
      '--w3m-accent': '#0d9488'
    },
    chains: [{ chainId, name: 'Arbitrum Sepolia', rpcUrl }]
  });

  // ✅ Wallet Connection Flow
  connectBtn.addEventListener("click", async () => {
    try {
      modal.openModal();

      const ethereumProvider = new EthereumProvider({
        projectId,
        chains: [{ chainId, rpcUrl }]
      });

      await ethereumProvider.enable();

      provider = new ethers.providers.Web3Provider(ethereumProvider);
      signer = provider.getSigner();
      userAddress = await signer.getAddress();

      const response = await fetch("./abi/contractABI.json");
      const abi = await response.json();
      contract = new ethers.Contract(contractAddress, abi, signer);

      homepage.style.display = "none";
      dashboard.style.display = "block";

      const rawUnlockTime = await contract.getUnlockTime();
      unlockTimestamp = Number(rawUnlockTime);

      startCountdown();
      await loadUserData();
    } catch (err) {
      console.error("❌ Wallet connection failed:", err);
      alert("Failed to connect wallet. Please try again.");
    }
  });

  // 🕒 Countdown Timer
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

  // 🔄 Load Contract & User Data
  async function loadUserData() {
    try {
      const deposits = await contract.getDeposits(userAddress);
      const total = await contract.getTotalDeposited(userAddress);
      totalDepositedEl.textContent = `${ethers.utils.formatEther(total)} ETH`;

      historyTableBody.innerHTML = '';
      deposits.forEach((d) => {
        const row = document.createElement('tr');
        const isUnlocked = Date.now() / 1000 >= unlockTimestamp;
        const status = d.claimed ? '✅ Claimed' : (isUnlocked ? '🔓 Claimable' : '🔒 Locked');
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
    } catch (err) {
      console.error("⚠️ getStartTime failed:", err);
      startDateEl.textContent = "N/A";
    }

    try {
      const totalUsers = await contract.getUserCount();
      totalUsersEl.textContent = totalUsers.toString();
    } catch (err) {
      console.error("⚠️ getUserCount failed:", err);
      totalUsersEl.textContent = "N/A";
    }

    try {
      const vaultBal = await provider.getBalance(contractAddress);
      vaultBalanceEl.textContent = `${ethers.utils.formatEther(vaultBal)} ETH`;
    } catch (err) {
      console.error("⚠️ getBalance failed:", err);
      vaultBalanceEl.textContent = "N/A";
    }
  }

  // 💸 Deposit
  depositForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (Date.now() >= unlockTimestamp * 1000) {
      alert("Savelock period has ended. Please claim your savings.");
      return;
    }

    const amount = parseFloat(depositAmount.value);
    if (!amount || amount <= 0) return;

    try {
      const tx = await contract.deposit({ value: ethers.utils.parseEther(amount.toString()) });
      await tx.wait();
      depositAmount.value = '';
      await loadUserData();
    } catch (err) {
      console.error("❌ Deposit failed:", err);
      alert("Deposit failed. See console.");
    }
  });

  // 🔓 Claim All
  inlineClaimBtn.addEventListener("click", async () => {
    const deposits = await contract.getDeposits(userAddress);

    for (let i = 0; i < deposits.length; i++) {
      if (!deposits[i].claimed) {
        try {
          const tx = await contract.claim(i);
          await tx.wait();
        } catch (err) {
          console.error(`❌ Claim at index ${i} failed:`, err);
        }
      }
    }

    await loadUserData();
  });
};
