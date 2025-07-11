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

// ✅ Load ABI and Initialize App
async function initApp() {
  try {
    const response = await fetch('./abi/contractABI.json');
    const abi = await response.json();

    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    contract = new ethers.Contract(contractAddress, abi, signer);

    homepage.classList.remove('active');
    dashboard.classList.add('active');

    unlockTimestamp = await contract.getUnlockTime();
    startCountdown();
    await loadUserData();
  } catch (err) {
    console.error("Error loading ABI or connecting wallet:", err);
    alert("Failed to initialize dApp. Check console for details.");
  }
}

// ⏳ Countdown timer
function startCountdown() {
  const interval = setInterval(() => {
    const now = Date.now();
    const diff = unlockTimestamp * 1000 - now;

    if (diff <= 0) {
      timerEl.textContent = "Unlocked!";
      clearInterval(interval);
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
      <td>${new Date(d.timestamp * 1000).toLocaleString()}</td>
      <td>${btn}</td>
    `;
    historyTableBody.appendChild(row);
  });
}

// 💰 Deposit handler
depositForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = parseFloat(depositAmount.value);
  if (!amount || amount <= 0) return;

  const tx = await contract.deposit({
    value: ethers.parseEther(amount.toString())
  });
  await tx.wait();

  depositAmount.value = '';
  await loadUserData();
});

// ✅ Claim handler
window.claimDeposit = async (index) => {
  const tx = await contract.claim(index);
  await tx.wait();
  await loadUserData();
};

// 🎯 Connect button
connectBtn.addEventListener('click', initApp);
