(() => {
  const socket = io();
  const { username, opponent, userCards, oppCards, roomCode } =
    window.BATTLE_DATA;

  let round = 0,
    userHP,
    oppHP,
    userMul,
    oppMul,
    scoreA = 0,
    scoreB = 0,
    logs = "";

  // Join the battle room immediately (prevents “opponent left” alert)
  socket.emit("room:join", roomCode);

  // Rolling dice
  document.getElementById("rollBtn").onclick = () => {
    socket.emit("battle:roll", { room: roomCode, round });
  };

  socket.on("battle:rollResult", ({ side, roll, mul }) => {
    if (side === socket.id) {
      userMul = mul;
      appendLog(`You rolled ${roll} (x${mul})`);
    } else {
      oppMul = mul;
      appendLog(`Opponent rolled ${roll} (x${mul})`);
    }
    if (userMul != null && oppMul != null) {
      document.getElementById("attackBtn").disabled = false;
    }
  });

  // Battle!
  document.getElementById("attackBtn").onclick = () => {
    socket.emit("battle:attack", { room: roomCode, round });
  };

  socket.on("battle:update", ({ hpA, hpB, winner }) => {
    userHP = hpA;
    oppHP = hpB;
    updateBars();
    appendLog(
      winner === "tie"
        ? "Tie this round"
        : winner === username
        ? "You win the round"
        : "Opponent wins round"
    );
    if (winner === username) scoreA++;
    else if (winner === opponent) scoreB++;
    document.getElementById(
      "scoreBoard"
    ).textContent = `Score ${scoreA}-${scoreB}`;

    round++;
    userMul = oppMul = null;
    if (scoreA === 3 || scoreB === 3 || round === 5) {
      socket.emit("battle:finish", {
        room: roomCode,
        winner: scoreA > scoreB ? username : opponent,
        logs,
      });
    } else {
      // reset for next round
      document.getElementById("rollBtn").disabled = false;
      document.getElementById("attackBtn").disabled = true;
    }
  });

  // Final redirect when DB saved
  socket.on("battle:finished", ({ battleId }) => {
    window.location = `/battle/result/${battleId}`;
  });

  // Helpers…
  function updateBars() {
    document.getElementById("userHP").style.width = `${
      (userHP / userCards[round].health) * 100
    }%`;
    document.getElementById("oppHP").style.width = `${
      (oppHP / oppCards[round].health) * 100
    }%`;
  }
  function appendLog(line) {
    logs += line + "\n";
    const box = document.getElementById("logBox");
    box.textContent = logs;
    box.scrollTop = box.scrollHeight;
  }
})();
