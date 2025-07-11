const connectBtn = document.getElementById('connectBtn');
const homepage = document.getElementById('homepage');
const dashboard = document.getElementById('dashboard');
const depositForm = document.getElementById('depositForm');
const depositAmount = document.getElementById('depositAmount');
const historyTableBody = document.querySelector('#historyTable tbody');
const totalDepositedEl = document.getElementById('totalDeposited');
const timerEl = document.getElementById('timer');

const contractAddress = "0xE7D0F892f315B4E3d25cC91936Edb29492754Db5";

let provider, signer, contract, userAddress, unlockTimestamp;

// ✅ Main function to initialize dApp
async function initApp() {
  try {
    console.log("🌐 Checking for wallet...");

    if (typeof window.ethereum === 'undefined') {
      alert("No wallet detected. Please install MetaMask.");
      return;
    }

    console.log("🟢 Wallet detected. Connecting...");

    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);

    console.log("✅ Wallet connection request sent");

    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    console.log("👤 Address:", userAddress);

    const response = await fetch('./abi/contractABI.json');
    const abi = await response.json();
    console.log("📄 ABI loaded");

    contract = new ethers.Contract(contractAddress, abi, signer);
    console.log("✅ Contract instance created");

    homepage.classList.remove('active');
    dashboard.classList.add('active');

    const rawUnlockTime = await contract.getUnlockTime();
    unlockTimestamp = Number(rawUnlockTime);
    console.log("🔓 Unlock timestamp:", unlockTimestamp);

    startCountdown();
    await loadUserData();
  } catch (err) {
    console.error("❌ Failed to initialize dApp:", err);
    alert("Failed to initialize dApp. Check console for details.");
  }
}

// ⏳ Countdown timer
function startCountdown() {
  if (isNaN(unlockTimestamp) || unlockTimestamp === 0) {
    timerEl.textContent = "Invalid unlock time.";
    return;
  }

  const interval = setInterval(() => {
    const now = Date.now();  // milliseconds
    const diff = unlockTimestamp * 1000 - now;

    if (diff <= 0) {
      timerEl.textContent = "Unlocked!";
      clearInterval(interval);
      // Optional: disable inputs
      document.getElementById("depositBtn").disabled = true;
      depositAmount.disabled = true;
    } else {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      timerEl.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
  }, 1000);
}

// 🧾 Load user deposits and populate table
async function loadUserData() {
  const deposits = await contract.getDeposits(userAddress);
  const total = await contract.getTotalDeposited(userAddress);
  totalDepositedEl.textContent = `${ethers.formatEther(total)} ETH`;

  historyTableBody.innerHTML = '';
  deposits.forEach((d, index) => {
    const row = document.createElement('tr');

    const claimable = !d.claimed && (Date.now() / 1000 >= unlockTimestamp);
    const btn = claimable
      ? `<button onclick="claimDeposit(${index})">Claim</button>`
      : d.claimed
      ? '✅ Claimed'
      : '🔒 Locked';

    row.innerHTML = `
      <td>${ethers.formatEther(d.amount)} ETH</td>
      <td>${new Date(Number(d.timestamp) * 1000).toLocaleString()}</td>
      <td>${btn}</td>
    `;
    historyTableBody.appendChild(row);
  });
}

// 💰 Deposit handler with unlock check
depositForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const now = Date.now();
  const unlockMs = unlockTimestamp * 1000;

  if (now >= unlockMs) {
    alert("🕒 The saving period is ended.\n\nIf you saved earlier, go ahead to claim your savings now.");
    return;
  }

  const amount = parseFloat(depositAmount.value);
  if (!amount || amount <= 0) return;

  try {
    const tx = await contract.deposit({
      value: ethers.parseEther(amount.toString())
    });
    await tx.wait();

    depositAmount.value = '';
    await loadUserData();
  } catch (err) {
    console.error("❌ Deposit failed:", err);
    alert("Deposit failed. See console for details.");
  }
});

// ✅ Claim handler
window.claimDeposit = async (index) => {
  try {
    const tx = await contract.claim(index);
    await tx.wait();
    await loadUserData();
  } catch (err) {
    console.error("❌ Claim failed:", err);
    alert("Claim failed. See console for details.");
  }
};

// 🎯 Connect button
window.onload = () => {
  connectBtn.addEventListener('click', initApp);
};

// 🔁 Make globally accessible
window.initApp = initApp;
