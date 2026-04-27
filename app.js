const START_NUMBER = 26001;
const END_NUMBER = 26380;
const STORAGE_KEY = "lottery-state-v1";

const prizeLabel = document.getElementById("prizeLabel");
const roundLabel = document.getElementById("roundLabel");
const countLabel = document.getElementById("countLabel");
const rollingNumber = document.getElementById("rollingNumber");
const statusText = document.getElementById("statusText");
const progressText = document.getElementById("progressText");
const winnerList = document.getElementById("winnerList");

let config = [];
let currentRoundIndex = 0;
let rollingTimer = null;
let isRolling = false;
let finalWinners = [];
let displayedWinners = [];
let usedNumbers = new Set();
let completedRounds = [];
let revealTimer = null;
let revealFlipTimer = null;
let isRevealing = false;
let revealingWinner = null;

function setPhase(phase) {
  document.body.dataset.phase = phase;
}

function setDensity(count = 0) {
  let density = "normal";

  if (count >= 30) {
    density = "max";
  } else if (count >= 22) {
    density = "dense";
  } else if (count >= 14) {
    density = "compact";
  }

  document.body.dataset.density = density;
}

function formatNumber(value) {
  return String(value).padStart(5, "0");
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    currentRoundIndex = parsed.currentRoundIndex ?? 0;
    completedRounds = Array.isArray(parsed.completedRounds) ? parsed.completedRounds : [];
    usedNumbers = new Set(Array.isArray(parsed.usedNumbers) ? parsed.usedNumbers : []);
  } catch (error) {
    console.warn("读取本地抽奖状态失败：", error);
  }
}

function saveState() {
  const data = {
    currentRoundIndex,
    completedRounds,
    usedNumbers: [...usedNumbers],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function clearRollingTimer() {
  if (rollingTimer) {
    clearInterval(rollingTimer);
    rollingTimer = null;
  }
}

function clearRevealTimer() {
  if (revealTimer) {
    clearTimeout(revealTimer);
    revealTimer = null;
  }

  if (revealFlipTimer) {
    clearInterval(revealFlipTimer);
    revealFlipTimer = null;
  }
}

function getAvailableNumbers() {
  const numbers = [];
  for (let value = START_NUMBER; value <= END_NUMBER; value += 1) {
    if (!usedNumbers.has(formatNumber(value))) {
      numbers.push(formatNumber(value));
    }
  }
  return numbers;
}

function getCurrentRound() {
  return config[currentRoundIndex] ?? null;
}

function renderWinners(newWinnerSet = new Set()) {
  winnerList.innerHTML = "";

  if (displayedWinners.length === 0 && !revealingWinner) {
    winnerList.innerHTML = '<div class="winner-item">待抽奖</div>';
    return;
  }

  displayedWinners.forEach((winner) => {
    const item = document.createElement("div");
    item.className = "winner-item";
    if (newWinnerSet.has(winner)) {
      item.classList.add("is-new");
    }
    item.textContent = winner;
    winnerList.appendChild(item);
  });

  if (revealingWinner) {
    const item = document.createElement("div");
    item.className = "winner-item is-rolling";
    item.textContent = revealingWinner;
    winnerList.appendChild(item);
  }
}

function renderRoundInfo() {
  const round = getCurrentRound();

  if (!round) {
    setPhase("result");
    prizeLabel.textContent = "全部轮次已完成";
    roundLabel.textContent = `共完成 ${completedRounds.length} 轮`;
    countLabel.textContent = `号码池 ${formatNumber(START_NUMBER)}-${formatNumber(END_NUMBER)}`;
    progressText.textContent = "";
    statusText.textContent = "按 R 可重置全部抽奖结果";
    finalWinners = [];
    displayedWinners = [];
    renderWinners();
    return;
  }

  prizeLabel.textContent = round.prizeLevel;
  roundLabel.textContent = `第 ${round.round} 轮`;
  countLabel.textContent = `抽取 ${round.count} 个`;
  progressText.textContent = `第 ${currentRoundIndex + 1} / ${config.length} 轮`;
  setDensity(round.count);

  const completed = completedRounds[currentRoundIndex];
  if (completed) {
    setPhase("result");
    finalWinners = [...completed.winners];
    displayedWinners = [...completed.winners];
    revealingWinner = null;
    statusText.textContent = "本轮已完成，按回车进入下一轮";
  } else {
    setPhase("idle");
    finalWinners = [];
    displayedWinners = [];
    revealingWinner = null;
    rollingNumber.textContent = formatNumber(randomNumber(START_NUMBER, END_NUMBER));
    statusText.textContent = "按空格开始本轮抽奖";
  }
  renderWinners();
}

function startRolling() {
  const round = getCurrentRound();
  if (!round || completedRounds[currentRoundIndex] || isRevealing) {
    return;
  }

  const available = getAvailableNumbers();
  if (available.length < round.count) {
    statusText.textContent = "剩余号码不足，无法继续抽奖";
    return;
  }

  isRolling = true;
  setPhase("rolling");
  rollingNumber.classList.add("is-rolling");
  statusText.textContent = "抽奖中，按空格停止";
  clearRollingTimer();
  rollingTimer = setInterval(() => {
    const pick = available[randomNumber(0, available.length - 1)];
    rollingNumber.textContent = pick;
  }, 60);
}

function stopRolling() {
  const round = getCurrentRound();
  if (!round || !isRolling) {
    return;
  }

  clearRollingTimer();
  isRolling = false;
  setPhase("result");
  rollingNumber.classList.remove("is-rolling");

  const pool = getAvailableNumbers();
  const winners = [];

  while (winners.length < round.count && pool.length > 0) {
    const index = randomNumber(0, pool.length - 1);
    const winner = pool.splice(index, 1)[0];
    winners.push(winner);
    usedNumbers.add(winner);
  }

  winners.sort((a, b) => Number(a) - Number(b));
  finalWinners = winners;
  completedRounds[currentRoundIndex] = {
    ...round,
    winners,
  };
  saveState();
  revealWinnersOneByOne(winners);
}

function revealWinnersOneByOne(winners) {
  clearRevealTimer();
  isRevealing = true;
  displayedWinners = [];
  revealingWinner = null;
  statusText.textContent = "正在揭晓本轮中奖号码...";
  renderWinners();

  let index = 0;

  const revealNext = () => {
    if (index >= winners.length) {
      isRevealing = false;
      revealingWinner = null;
      revealTimer = null;
      statusText.textContent = "本轮完成，按回车进入下一轮";
      renderWinners();
      return;
    }

    const winner = winners[index];
    let flips = 0;
    const maxFlips = 12;

    revealingWinner = formatNumber(randomNumber(START_NUMBER, END_NUMBER));
    renderWinners();

    revealFlipTimer = setInterval(() => {
      flips += 1;

      if (flips >= maxFlips) {
        clearInterval(revealFlipTimer);
        revealFlipTimer = null;
        revealingWinner = null;
        displayedWinners = [...displayedWinners, winner];
        renderWinners(new Set([winner]));
        index += 1;
        revealTimer = setTimeout(revealNext, 380);
        return;
      }

      revealingWinner = formatNumber(randomNumber(START_NUMBER, END_NUMBER));
      renderWinners();
    }, 15);
  };

  revealNext();
}

function nextRound() {
  if (isRolling || isRevealing) {
    return;
  }

  const round = getCurrentRound();
  if (!round) {
    return;
  }

  if (!completedRounds[currentRoundIndex]) {
    statusText.textContent = "请先完成当前轮次抽奖";
    return;
  }

  currentRoundIndex += 1;
  saveState();
  renderRoundInfo();
}

function resetAll() {
  clearRollingTimer();
  clearRevealTimer();
  isRolling = false;
  isRevealing = false;
  currentRoundIndex = 0;
  finalWinners = [];
  displayedWinners = [];
  revealingWinner = null;
  usedNumbers = new Set();
  completedRounds = [];
  localStorage.removeItem(STORAGE_KEY);
  rollingNumber.classList.remove("is-rolling");
  renderRoundInfo();
}

async function init() {
  const response = await fetch("./prizes.json");
  config = await response.json();
  loadSavedState();
  renderRoundInfo();
}

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    if (isRolling) {
      stopRolling();
    } else {
      startRolling();
    }
  }

  if (event.code === "Enter") {
    event.preventDefault();
    nextRound();
  }

  if (event.key.toLowerCase() === "r") {
    resetAll();
  }
});

init().catch((error) => {
  console.error(error);
  statusText.textContent = "页面初始化失败，请检查 prizes.json";
});
