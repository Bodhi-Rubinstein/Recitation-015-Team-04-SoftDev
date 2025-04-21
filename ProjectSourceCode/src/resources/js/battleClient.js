(() => {
  const { userCards, botCards, username } = window.BATTLE_DATA;

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

  // floating damage popup helper
  function showDamagePopup(barEl, text, isCrit) {
    const col = barEl.parentElement.parentElement; // .col wrapper
    col.style.position = 'relative';

    const popup = document.createElement('div');
    popup.textContent = text;
    popup.style.position = 'absolute';
    popup.style.left = '50%';
    popup.style.bottom = '-2rem';
    popup.style.transform = 'translateX(-50%)';
    popup.style.pointerEvents = 'none';
    popup.style.color = 'red';
    popup.style.fontSize = '1.25rem';
    popup.style.fontWeight = isCrit ? 'bold' : 'normal';
    popup.style.transition = 'all 0.6s ease-out';
    popup.style.opacity = '1';
    popup.style.zIndex = '10';

    col.appendChild(popup);
    requestAnimationFrame(() => {
      popup.style.bottom = '-3rem';
      popup.style.opacity = '0';
    });
    setTimeout(() => col.removeChild(popup), 600);
  }


   // Roll Dice (only once), now with miss/crit
   els.rollBtn.onclick = () => {
    const u = window.rollAttackOutcome();
    const b = window.rollAttackOutcome();

    state.user.mult = u.multiplier;
    state.bot.mult  = b.multiplier;

    updateStats();

    const userMsg =
      u.type === "miss" ?
        "MISSED!" :
      u.type === "crit" ?
        "CRITICAL STRIKE!" :
        `x${u.multiplier.toFixed(2)}`;

    const botMsg =
      b.type === "miss" ?
        "MISSED!" :
      b.type === "crit" ?
        "CRITICAL STRIKE!" :
        `x${b.multiplier.toFixed(2)}`;

    appendLog(`You rolled ${u.roll} → ${userMsg}`);
    appendLog(`Bot rolled ${b.roll} → ${botMsg}`);

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
    const u = window.rollAttackOutcome();
    const b = window.rollAttackOutcome();

    if (u.type === "miss")    appendLog(`${state.user.name} MISSES!`);
    else if (u.type === "crit") appendLog(`${state.user.name} CRITICAL STRIKE!`);

    if (b.type === "miss")    appendLog(`${state.bot.name} MISSES!`);
    else if (b.type === "crit") appendLog(`${state.bot.name} CRITICAL STRIKE!`);

    const userDmg = state.user.attack * u.multiplier * (1 - state.bot.defense / 100);
    const botDmg  = state.bot.attack  * b.multiplier * (1 - state.user.defense / 100);


    state.bot.hp  -= userDmg;
    state.user.hp -= botDmg;


    //show damage popup
    showDamagePopup(els.botHP,  `${u.type === 'crit' ? 'CRIT ' : ''}-${Math.round(userDmg)}HP`, u.type === 'crit');
    showDamagePopup(els.userHP, `${b.type === 'crit' ? 'CRIT ' : ''}-${Math.round(botDmg)}HP`, b.type === 'crit');



    appendLog(
      `${state.user.name} hits ${userDmg.toFixed(1)} | ${state.bot.name} hits ${botDmg.toFixed(1)}`
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
