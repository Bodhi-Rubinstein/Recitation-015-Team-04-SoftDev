(() => {
  const { userCards, opponentCards, username, opponent } = window.BATTLE_DATA;
  const socket = io();

  let round = 0,
    userScore = 0,
    botScore = 0,
    logs = "";

  const els = {
    roundTitle: document.getElementById("roundTitle"),
    userCard: document.getElementById("userCardName"),
    botCard: document.getElementById("botCardName"),
    userStats: document.getElementById("userStats"),
    botStats: document.getElementById("botStats"),
    userHP: document.getElementById("userHP"),
    botHP: document.getElementById("botHP"),
    rollBtn: document.getElementById("rollBtn"),
    battleBtn: document.getElementById("battleBtn"),
    logBox: document.getElementById("logBox"),
    scoreBoard: document.getElementById("scoreBoard"),
    banner: document.getElementById("winnerBanner"),
  };

  let state;

  function startRound() {
    if (round === 0){
      buildDeckSummary(userCards, botCards);
    }

    state = {
      user: { ...userCards[round], hp: userCards[round].health, mult: 1 },
      bot: { ...botCards[round], hp: botCards[round].health, mult: 1 },
    };
    setHeadings();
    updateBars();
    updateStats(); // show base stats (name + stats)
    els.rollBtn.disabled = false;
    els.rollBtn.classList.remove("disabled");
    els.battleBtn.disabled = false;
  }

  function setHeadings() {
    const title = `Round ${round + 1} – ${state.user.name} vs ${
      state.bot.name
    }`;
    els.roundTitle.textContent = title;
    document.title = title;

    const userImg = document.getElementById("userCardImage");
    const botImg = document.getElementById("botCardImage");

    userImg.src = `/resources/img/cards/${state.user.image_url}`;
    userImg.alt = state.user.name;

    botImg.src = `/resources/img/cards/${state.bot.image_url}`;
    botImg.alt = state.bot.name;
  }

  function updateBars() {
    els.userHP.style.width = `${(state.user.hp / state.user.health) * 100}%`;
    els.botHP.style.width = `${(state.bot.hp / state.bot.health) * 100}%`;
  }

  // Now show the card's name along with its (possibly boosted) stats.
  function updateStats() {
    els.userStats.textContent = `${state.user.name} – ATK ${Math.round(
      state.user.attack * state.user.mult
    )} | DEF ${state.user.defense}`;
    els.botStats.textContent = `${state.bot.name} – ATK ${Math.round(
      state.bot.attack * state.bot.mult
    )} | DEF ${state.bot.defense}`;
  }

  // Roll Dice (only once)
  els.rollBtn.onclick = () => {
    const u = window.rollDiceMultiplier(),
      b = window.rollDiceMultiplier();
    state.user.mult = u.multiplier;
    state.bot.mult = b.multiplier;
    updateStats(); // update displayed stats with boosted attack
    appendLog(
      `You rolled ${u.roll} (x${u.multiplier}). ${
        state.user.name
      }'s attack increased from ${state.user.attack} to ${Math.round(
        state.user.attack * state.user.mult
      )}.`
    );
    appendLog(
      `Bot rolled ${b.roll} (x${b.multiplier}). ${
        state.bot.name
      }'s attack increased from ${state.bot.attack} to ${Math.round(
        state.bot.attack * state.bot.mult
      )}.`
    );
    // Disable the roll button so the player can only roll once.
    els.rollBtn.disabled = true;
    els.rollBtn.classList.add("disabled");
  };

  // Battle button starts the fight
  els.battleBtn.onclick = () => {
    els.rollBtn.disabled = true;
    els.battleBtn.disabled = true;
    fightTick();
  };

  function fightTick() {
    if (state.user.hp <= 0 || state.bot.hp <= 0) {
      endRound();
      return;
    }
    const userDmg =
      state.user.attack * state.user.mult * (1 - state.bot.defense / 100);
    const botDmg =
      state.bot.attack * state.bot.mult * (1 - state.user.defense / 100);
    state.bot.hp -= userDmg;
    state.user.hp -= botDmg;
    appendLog(
      `${state.user.name} hits ${userDmg.toFixed(1)} | ${
        state.bot.name
      } hits ${botDmg.toFixed(1)}`
    );
    updateBars();

    setTimeout(fightTick, 600);
  }

  function endRound() {
    let winner;
    if (state.user.hp > 0 && state.bot.hp <= 0) {
      userScore++;
      winner = username;
    } else if (state.bot.hp > 0) {
      botScore++;
      winner = "Bot";
    } else {
      winner = "Tie";
    }
    appendLog(`⟹ Round Winner: ${winner}\n`);
    els.scoreBoard.textContent = `Score ${userScore}‑${botScore}`;

    // Update the summary images to show the round results.
    const userImg = document.getElementById(`userSummary${round}`);
    const botImg = document.getElementById(`botSummary${round}`);

    if (state.user.hp > 0 && state.bot.hp <= 0) {
      userImg.classList.add("win");
      botImg.classList.add("loss");
    } else if (state.bot.hp > 0 && state.user.hp <= 0) {
      userImg.classList.add("loss");
      botImg.classList.add("win");
    } else {
      userImg.classList.add("loss");
      botImg.classList.add("loss");
    }


    round++;
    if (userScore === 3 || botScore === 3 || round === 5) {
      finishBattle();
    } else {
      setTimeout(startRound, 1200);
    }
  }

  function finishBattle() {
    const finalWinner =
      userScore > botScore ? username : botScore > userScore ? "Bot" : "Tie";
    els.banner.textContent = `Winner: ${finalWinner}`;

    fetch("/battle/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userScore, botScore, logs }),
    })
      .then((r) => r.json())
      .then(({ ok, battleId, error }) => {
        if (ok && battleId) {
          window.location = `/battle/result/${battleId}`;
        } else {
          alert(error || "Something went wrong saving the battle.");
        }
      });
  }

  function appendLog(line) {
    logs += line + "\n";
    els.logBox.textContent = logs;
    els.logBox.scrollTop = els.logBox.scrollHeight;
  }

  // Boot up the first round.
  startRound();
})();

function buildDeckSummary(userCards, botCards) {
  const userDeck = document.getElementById("userDeckSummary");
  const botDeck = document.getElementById("botDeckSummary");

  userCards.forEach((card, i) => {
    const img = document.createElement("img");
    img.src = `/resources/img/cards/${card.image_url}`;
    img.className = "summary-card";
    img.id = `userSummary${i}`;
    img.alt = card.name;
    userDeck.appendChild(img);
  });

  botCards.forEach((card, i) => {
    const img = document.createElement("img");
    img.src = `/resources/img/cards/${card.image_url}`;
    img.className = "summary-card";
    img.id = `botSummary${i}`;
    img.alt = card.name;
    botDeck.appendChild(img);
  });
}
