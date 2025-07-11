const connectBtn = document.getElementById('connectBtn');
const homepage = document.getElementById('homepage');
const dashboard = document.getElementById('dashboard');
const depositForm = document.getElementById('depositForm');
const depositAmount = document.getElementById('depositAmount');
const historyTableBody = document.querySelector('#historyTable tbody');
const totalDepositedEl = document.getElementById('totalDeposited');
const timerEl = document.getElementById('timer');
const claimWrapper = document.getElementById('globalClaimWrapper');

const contractAddress = "0xE7D0F892f315B4E3d25cC91936Edb29492754Db5";

let provider, signer, contract, userAddress, unlockTimestamp;

// ✅ Initialize dApp
async function initApp() {
  try {
    if (typeof window.ethereum === 'undefined') {
      alert("No wallet detected. Please install MetaMask.");
      return;
    }

    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    const response = await fetch('./abi/contractABI.json');
    const abi = await response.json();
    contract = new ethers.Contract(contractAddress, abi, signer);

    homepage.classList.remove('active');
    dashboard.classList.add('active');

    const rawUnlockTime = await contract.getUnlockTime();
    unlockTimestamp = Number(rawUnlockTime);

    startCountdown();
    await loadUserData();
  } catch (err) {
    console.error("❌ Initialization failed:", err);
    alert("Error initializing dApp.");
  }
}

// ⏳ Countdown timer handler
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

      // Hide deposit input and button
      document.getElementById('depositForm').style.display = 'none';

      // Update heading and message
      const heading = document.getElementById('depositHeading');
      const afterText = document.getElementById('afterUnlockText');
      const inlineClaim = document.getElementById('inlineClaimWrapper');

      if (heading) heading.textContent = 'Saving Period has Ended';
      if (afterText) afterText.style.display = 'block';
      if (inlineClaim) inlineClaim.style.display = 'block';

      // Also show global claim button if needed
      claimWrapper.style.display = 'block';
    } else {
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      timerEl.textContent = `${d}d ${h}h ${m}m ${s}s`;
    }
  }, 1000);
}

// 🧾 Load user deposits and update UI
async function loadUserData() {
  const deposits = await contract.getDeposits(userAddress);
  const total = await contract.getTotalDeposited(userAddress);
  totalDepositedEl.textContent = `${ethers.formatEther(total)} ETH`;

  historyTableBody.innerHTML = '';

  deposits.forEach((d, index) => {
    const row = document.createElement('tr');

    const isUnlocked = Date.now() / 1000 >= unlockTimestamp;
    const status = d.claimed
      ? '✅ Claimed'
      : (isUnlocked ? '🔓 Claimable' : '🔒 Locked');

    row.innerHTML = `
      <td>${ethers.formatEther(d.amount)} ETH</td>
      <td>${new Date(Number(d.timestamp) * 1000).toLocaleString()}</td>
      <td>${status}</td>
    `;

    historyTableBody.appendChild(row);
  });
}

// 💰 Handle deposit submission
depositForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (Date.now() >= unlockTimestamp * 1000) {
    alert("Saving period has ended. Please claim your savings.");
    return;
  }

  const amount = parseFloat(depositAmount.value);
  if (!amount || amount <= 0) return;

  try {
    const tx = await contract.deposit({ value: ethers.parseEther(amount.toString()) });
    await tx.wait();
    depositAmount.value = '';
    await loadUserData();
  } catch (err) {
    console.error("Deposit failed:", err);
    alert("Deposit failed. Check console for details.");
  }
});

// 🚀 Claim all unclaimed deposits (global claim button)
claimWrapper.querySelector('button').addEventListener('click', async () => {
  const deposits = await contract.getDeposits(userAddress);

  for (let i = 0; i < deposits.length; i++) {
    if (!deposits[i].claimed) {
      try {
        const tx = await contract.claim(i);
        await tx.wait();
      } catch (err) {
        console.error(`Claim failed at index ${i}:`, err);
      }
    }
  }

  await loadUserData();
});

// 🚀 Inline claim button (replaces deposit section after unlock)
const inlineClaimBtn = document.getElementById('inlineClaimBtn');
if (inlineClaimBtn) {
  inlineClaimBtn.addEventListener('click', async () => {
    const deposits = await contract.getDeposits(userAddress);
    for (let i = 0; i < deposits.length; i++) {
      if (!deposits[i].claimed) {
        try {
          const tx = await contract.claim(i);
          await tx.wait();
        } catch (err) {
          console.error(`Claim failed at index ${i}:`, err);
        }
      }
    }
    await loadUserData();
  });
}

// 👟 Load connect button handler
window.onload = () => {
  connectBtn.addEventListener('click', initApp);
};

// 🌐 Expose initApp globally if needed elsewhere
window.initApp = initApp;
