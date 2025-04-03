let trades = [];

//upon loading of the page
document.addEventListener("DOMContentLoaded", function () {
    loadPlayers(); 
    loadTrades();
    document.getElementById("tradeForm").addEventListener("submit", submitTrade);
});

//load players
function loadPlayers() {
    const players = [
        "LeBron James", "Nikola Jokic", "Steph Curry", "Kevin Durant", 
        "Jayson Tatum", "Donovan Mitchell", "Giannis Antetokounmpo",
        "Luka Doncic", "Anthony Edwards", "Joel Embiid"
    ];

    const offerDropdown = document.getElementById("offerCard");
    const tradeForDropdown = document.getElementById("tradeForCard");

    offerDropdown.innerHTML = "";
    tradeForDropdown.innerHTML = "";

    players.forEach(player => {
        let option1 = document.createElement("option");
        option1.value = player;
        option1.textContent = player;
        offerDropdown.appendChild(option1);

        let option2 = document.createElement("option");
        option2.value = player;
        option2.textContent = player;
        tradeForDropdown.appendChild(option2);
    });
}


// trade submits
function submitTrade(event) {
    event.preventDefault();

    const offerCard = document.getElementById("offerCard").value;
    const tradeForCard = document.getElementById("tradeForCard").value;

    if (offerCard === tradeForCard) {
        alert("You cannot trade for the same card!");
        return;
    }

    const trade = {
        offer: offerCard,
        request: tradeForCard,
        status: "Pending"
    };

    trades.push(trade);
    updateTradeList();
    document.getElementById("tradeForm").reset();
    bootstrap.Modal.getInstance(document.getElementById("tradeModal")).hide();
}

// pending trades
function updateTradeList() {
    const tradeList = document.getElementById("tradeList");
    tradeList.innerHTML = "";

    trades.forEach((trade, index) => {
        const tradeItem = document.createElement("li");
        tradeItem.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-center");

        tradeItem.innerHTML = `
            ${trade.offer} → ${trade.request}
            <span class="badge bg-warning">${trade.status}</span>
            <button class="btn btn-danger btn-sm" onclick="cancelTrade(${index})">Cancel</button>
        `;

        tradeList.appendChild(tradeItem);
    });
}

// cancel trades *still in progress
function cancelTrade(index) {
    trades.splice(index, 1);
    updateTradeList();
}

//function to load trades *still in progress
function loadTrades() {
    updateTradeList();
}