// === Global Variables ===
let provider, signer, contract, userAddress, unlockTimestamp;

const contractAddress = "0xF020f362CDe86004d94C832596415E082A77e203";
const rpcUrl = "https://sepolia-rollup.arbitrum.io/rpc";
const chainId = 421614;

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

// === Connect Wallet Logic ===
connectBtn.addEventListener("click", async () => {
  if (typeof window.ethereum === "undefined") {
    alert("No wallet found. Please use MetaMask, Trust Wallet, or a Web3 browser.");
    return;
  }

  try {
    // Request access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) throw new Error("No accounts returned.");

    // Init provider and signer
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    userAddress = accounts[0] || await signer.getAddress();

    // Load ABI
    let abi;
    try {
      const res = await fetch("./abi/contractABI.json");
      abi = await res.json();
    } catch (fetchError) {
      console.error("❌ ABI load failed:", fetchError);
      alert("Could not load contract ABI.");
      return;
    }

    // Set contract
    contract = new ethers.Contract(contractAddress, abi, signer);

    // Show dashboard
    homepage.style.display = "none";
    dashboard.style.display = "block";

    // Load unlock time & user data
    const rawUnlockTime = await contract.getUnlockTime();
    unlockTimestamp = Number(rawUnlockTime);
    startCountdown();
    await loadUserData();

  } catch (err) {
    console.error("❌ Wallet connection failed:", err);
    alert("Failed to connect wallet.");
  }
});

// === Countdown Timer ===
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

// === Load User & Contract Data ===
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

// === Handle Deposit ===
depositForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (Date.now() >= unlockTimestamp * 1000) {
    alert("Savelock period has ended.");
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
    alert("Deposit failed.");
  }
});

// === Handle Withdraw ===
inlineClaimBtn.addEventListener("click", async () => {
  const deposits = await contract.getDeposits(userAddress);

  for (let i = 0; i < deposits.length; i++) {
    if (!deposits[i].claimed) {
      try {
        const tx = await contract.claim(i);
        await tx.wait();
      } catch (err) {
        console.error(`❌ Claim ${i} failed:`, err);
      }
    }
  }

  await loadUserData();
});
