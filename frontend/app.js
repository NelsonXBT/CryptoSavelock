// == Global vars ==
let provider, signer, contract, userAddress, unlockTimestamp;

const contractAddress = "0xF020f362CDe86004d94C832596415E082A77e203";
const projectId = "c3b7d635ca869e04b3759d209a9081eb";
const chainId = 421614;
const rpcUrl = "https://sepolia-rollup.arbitrum.io/rpc";

// DOM references
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

window.onload = () => {
  const ethers = window.ethers;
  const w3m = window.w3m;

  if (!w3m || typeof w3m.createWeb3Modal !== 'function') {
    console.error("⚠️ Web3Modal not loaded! Check your HTML UMD script.");
    alert("Web3Modal failed to load—check your script tags.");
    return;
  }

  const { createWeb3Modal, EthereumProvider } = w3m;

  const modal = createWeb3Modal({
    projectId,
    themeMode: 'light',
    themeVariables: {
      '--w3m-accent': '#0d9488'
    },
    chains: [{ chainId, name: 'Arbitrum Sepolia', rpcUrl }]
  });

  connectBtn.addEventListener("click", async () => {
    try {
      modal.openModal();

      const ethProvider = new EthereumProvider({
        projectId,
        chains: [{ chainId, rpcUrl }]
      });

      await ethProvider.enable();

      provider = new ethers.providers.Web3Provider(ethProvider);
      signer = provider.getSigner();
      userAddress = await signer.getAddress();

      const response = await fetch("./abi/contractABI.json");
      const abi = await response.json();
      contract = new ethers.Contract(contractAddress, abi, signer);

      homepage.style.display = "none";
      dashboard.style.display = "block";

      unlockTimestamp = Number(await contract.getUnlockTime());

      startCountdown();
      loadUserData();
    } catch (err) {
      console.error("❌ Wallet connection failed:", err);
      alert("Failed to connect wallet. Check console for details.");
    }
  });

  function startCountdown() {
    if (!unlockTimestamp) {
      timerEl.textContent = "Invalid unlock time.";
      return;
    }
    const iv = setInterval(() => {
      const diff = unlockTimestamp * 1000 - Date.now();
      if (diff <= 0) {
        timerEl.textContent = "Unlocked!";
        clearInterval(iv);
        depositForm.style.display = 'none';
        depositHeading.textContent = "Savelock Period has Ended";
        afterUnlockText.style.display = 'block';
        inlineClaimWrapper.style.display = 'block';
      } else {
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff / 3600000) % 24);
        const m = Math.floor((diff / 60000) % 60);
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
      deposits.forEach(d => {
        const row = document.createElement('tr');
        const unlocked = Date.now()/1000 >= unlockTimestamp;
        const status = d.claimed ? '✅ Claimed' : (unlocked ? '🔓 Claimable' : '🔒 Locked');
        row.innerHTML = `
          <td>${ethers.utils.formatEther(d.amount)} ETH</td>
          <td>${new Date(Number(d.timestamp)*1000).toLocaleString()}</td>
          <td>${status}</td>`;
        historyTableBody.appendChild(row);
      });
    } catch (e) {
      console.error("Error loading deposits", e);
    }
    try {
      const st = await contract.getStartTime();
      startDateEl.textContent = new Date(Number(st)*1000).toLocaleString();
    } catch { startDateEl.textContent = "N/A"; }
    try {
      const ct = await contract.getUserCount(); totalUsersEl.textContent = ct.toString();
    } catch { totalUsersEl.textContent = "N/A"; }
    try {
      const vb = await provider.getBalance(contractAddress);
      vaultBalanceEl.textContent = `${ethers.utils.formatEther(vb)} ETH`;
    } catch { vaultBalanceEl.textContent = "N/A"; }
  }

  depositForm.addEventListener("submit", async e => {
    e.preventDefault();
    if (Date.now() >= unlockTimestamp*1000) {
      alert("Savings period ended.");
      return;
    }
    const amt = parseFloat(depositAmount.value);
    if (!amt || amt <= 0) return;
    try {
      const tx = await contract.deposit({ value: ethers.utils.parseEther(amt.toString()) });
      await tx.wait();
      depositAmount.value = '';
      loadUserData();
    } catch (err) {
      console.error("Deposit failed", err);
      alert("Deposit failed. See console.");
    }
  });

  inlineClaimBtn.addEventListener("click", async () => {
    const deps = await contract.getDeposits(userAddress);
    for (let i = 0; i < deps.length; i++) {
      if (!deps[i].claimed) {
        try {
          const tx = await contract.claim(i);
          await tx.wait();
        } catch (e) {
          console.error(`Claim ${i} failed`, e);
        }
      }
    }
    loadUserData();
  });
};
