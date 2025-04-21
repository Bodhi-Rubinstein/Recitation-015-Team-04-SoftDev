// battle.js

function rollAttackOutcome() {
  const roll = Math.floor(Math.random() * 100) + 1; // 1–100
  let type, multiplier;

  if (roll <= 10) {          // 10% miss chance
    type = "miss";
    multiplier = 0;
  } else if (roll >= 96) {   // 5% crit chance
    type = "crit";
    multiplier = 2;
  } else {
    type = "normal";
    // slight variance on normal hits: 0.85×–1.15×
    multiplier = 1 + (Math.random() * 0.3 - 0.15);
  }

  return { roll, type, multiplier };
}

function rollDiceMultiplier() {
  const { roll, multiplier } = rollAttackOutcome();
  return { roll, multiplier };
}


// Simulate a one-on-one fight between two cards.
function simulateCardFight(userCard, botCard) {
  let userHealth = userCard.health;
  let botHealth = botCard.health;
  let roundLog = "";

  // Continue the fight until one or both cards run out of health.
  while (userHealth > 0 && botHealth > 0) {
    const userOutcome = rollAttackOutcome();
    const botOutcome  = rollAttackOutcome();

    // Log misses/crits
    if (userOutcome.type === "miss") {
      roundLog += `User's \"${userCard.name}\" missed!\n`;
    } else if (userOutcome.type === "crit") {
      roundLog += `User's \"${userCard.name}\" lands a CRITICAL HIT!\n`;
    }
    if (botOutcome.type === "miss") {
      roundLog += `Bot's \"${botCard.name}\" missed!\n`;
    } else if (botOutcome.type === "crit") {
      roundLog += `Bot's \"${botCard.name}\" lands a CRITICAL HIT!\n`;
    }

    const userDamage =
      userCard.attack * userOutcome.multiplier * (1 - botCard.defense / 100);
    const botDamage  =
      botCard.attack  * botOutcome.multiplier * (1 - userCard.defense / 100);

    userHealth -= botDamage;
    botHealth  -= userDamage;

    roundLog += `User deals ${userDamage.toFixed(2)} damage; Bot deals ${botDamage.toFixed(2)} damage.\n`;
  }

  let result;
  if (userHealth <= 0 && botHealth <= 0) {
    result = "tie";
    roundLog += "Both cards fell at the same time.\n";
  } else if (userHealth > 0) {
    result = "user";
    roundLog += `User's "${userCard.name}" wins the round.\n`;
  } else {
    result = "bot";
    roundLog += `Bot's "${botCard.name}" wins the round.\n`;
  }
  return { result, roundLog };
}

// Simulate a full battle (best of five rounds)
async function simulateBattle(userCards, botCards, username, db) {
  let userScore = 0;
  let botScore = 0;
  let battleLogs = "";
  let roundNumber = 1;

  // Iterate through up to 5 rounds (stop early if one side wins 3 rounds).
  for (let i = 0; i < 5; i++) {
    if (userScore === 3 || botScore === 3) break;
    const userCard = userCards[i];
    const botCard = botCards[i];

    const { result, roundLog } = simulateCardFight(userCard, botCard);
    battleLogs += `--- Round ${roundNumber} ---\n${roundLog}\n`;

    if (result === "user") userScore++;
    else if (result === "bot") botScore++;
    // In case of a tie, scores remain the same.

    roundNumber++;
  }

  let winner =
    userScore > botScore ? username : botScore > userScore ? "bot" : "tie";

  // Record the battle outcome in the database.
  try {
    const battleInsertQuery = `
        INSERT INTO battles (player1_id, player2_id, winner_id, player1_score, player2_score)
        VALUES ((SELECT id FROM users WHERE username = $1), 0,
        CASE WHEN $2 = $1 THEN (SELECT id FROM users WHERE username = $1) ELSE 0 END,
        $3, $4) RETURNING id;
      `;
    const battleData = await db.one(battleInsertQuery, [
      username,
      winner,
      userScore,
      botScore,
    ]);
    const battleId = battleData.id;

    await db.none(
      "INSERT INTO battle_logs (battle_id, action_detail) VALUES ($1, $2)",
      [battleId, battleLogs]
    );

    // Update trophies and money based on the outcome (adjust rewards as needed).
    if (winner !== "tie") {
      const trophyReward = 10;
      const moneyReward = 50;
      if (winner === username) {
        await db.none(
          "UPDATE users SET trophies = trophies + $1, money = money + $2 WHERE username = $3",
          [trophyReward, moneyReward, username]
        );
      } else {
        await db.none(
          "UPDATE users SET trophies = trophies - $1, money = money - $2 WHERE username = $3",
          [trophyReward, moneyReward, username]
        );
      }
    }
  } catch (err) {
    console.error("Error recording battle:", err);
  }

  return { userScore, botScore, winner, battleLogs };
}

if (typeof module !== "undefined") {
  module.exports = {
    simulateBattle,
    simulateCardFight,
    rollDiceMultiplier,
  };
}

// at bottom, keep existing module.exports, then ALSO expose for browser
if (typeof window !== "undefined")
  window.rollDiceMultiplier = rollDiceMultiplier;

// extra helper to record finished battle (called by /battle/finish)
async function recordFinishedBattle(
  username,
  userScore,
  botScore,
  battleLogs,
  db
) {
  try {
    const winner =
      userScore > botScore ? username : botScore > userScore ? "bot" : "tie";

    const battleId = await db
      .one(
        `INSERT INTO battles (player1_id, player2_id, winner_id,
                            player1_score, player2_score)
       VALUES ((SELECT id FROM users WHERE username=$1), 0,
               CASE WHEN $2=$1 THEN (SELECT id FROM users WHERE username=$1) ELSE 0 END,
               $3,$4) RETURNING id`,
        [username, winner, userScore, botScore]
      )
      .then((r) => r.id);

    await db.none(
      `INSERT INTO battle_logs (battle_id, action_detail) VALUES ($1,$2)`,
      [battleId, battleLogs]
    );

    if (winner === username) {
      await db.none(
        `UPDATE users SET trophies = trophies + 1, money = money + 10
          WHERE username = $1`,
        [username]
      );
    } else {
      await db.none(`UPDATE users SET money = money + 5 WHERE username = $1`, [
        username,
      ]);
    }

    return battleId;
  } catch (err) {
    console.error("recordFinishedBattle failed:", err);
    throw err; // propagate to caller
  }
}
if (typeof module !== "undefined") {
  module.exports.recordFinishedBattle = recordFinishedBattle;
}


if (typeof module !== "undefined") {
  module.exports = {
    rollAttackOutcome,
    rollDiceMultiplier,   // backward compatibility
    simulateCardFight,
    simulateBattle,
    recordFinishedBattle,
  };
}

if (typeof window !== "undefined") {
  window.rollAttackOutcome = rollAttackOutcome;
  window.rollDiceMultiplier = rollDiceMultiplier;
}