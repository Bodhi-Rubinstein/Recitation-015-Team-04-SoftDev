console.log("test");
let trades = [];

//upon loading of the page
//document.addEventListener("DOMContentLoaded", function () {
async function loadAll(){
    console.log("Page Loaded!");
    loadPlayers(); 
    loadTrades();
    document.getElementById("tradeForm").addEventListener("submit", submitTrade);
};

//load players
async function loadPlayers() {
    const offerDropdown = document.getElementById("offerCard");
    const tradeForDropdown = document.getElementById("tradeForCard");
    offerDropdown.innerHTML = "";
    tradeForDropdown.innerHTML = "";

    try {
        const response = await fetch("/cards"); 
        const cards = await response.json();
        cards.forEach(card => {
            const option1 = document.createElement("option");
            option1.value = card.id; 
            option1.textContent = card.name;
            offerDropdown.appendChild(option1);

            const option2 = document.createElement("option");
            option2.value = card.id;
            option2.textContent = card.name;
            tradeForDropdown.appendChild(option2);
        });
    } catch (err) {
        console.error("Error loading cards:", err);
    }
}

// trade submits
async function submitTrade(event) {
    event.preventDefault();
    const offerCard = document.getElementById("offerCard").value;
    const tradeForCard = document.getElementById("tradeForCard").value;
    if (offerCard === tradeForCard) {
        alert("You cannot trade for the same card!");
        return;
    }
    const trade = {
        card1_id: offerCard,
        card2_id: tradeForCard
    };
    try {
        const response = await fetch("/trades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(trade)
        });
        if (response.ok) {
            const result = await response.json();
            alert("Trade submitted successfully!");
            loadTrades(); // reloads the trade list with the new trade
            // hides the modal
            const modalEl = document.getElementById("tradeModal");
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) {
                modalInstance.hide();
            }
            document.getElementById("tradeForm").reset();
        } else {
            const errorData = await response.json();
            alert("Failed to submit trade: " + (errorData.error || "Unknown error"));
        }
    } catch (err) {
        console.error("Error submitting trade:", err);
        alert("Server error while submitting trade.");
    }
};

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

//accept trades
async function acceptTrade(tradeId, index) {
    try {
        const response = await fetch(     
            `/trades/${tradeId}/accept`, { method: "POST" }
        );
        if (response.ok) {
            trades.splice(index, 1); //deletes from UI
            updateTradeList();
            alert("Trade accepted!");
        } else {
            alert("Failed to accept trade.");
        }
    } catch (err) {
        console.error("Error accepting trade:", err);
        alert("Server error while accepting trade.");
    }
}

//reject trades
async function rejectTrade(tradeId, index) {
    try {
        const response = await fetch(`/trades/${tradeId}/reject`, { method: "DELETE" });

        if (response.ok) {
            trades.splice(index, 1); // deletes from UI
            updateTradeList();
            alert("Trade rejected!");
        } else {
            alert("Failed to reject trade.");
        }
    } catch (err) {
        console.error("Error rejecting trade:", err);
        alert("Server error while rejecting trade.");
    }
}

// cancel trades 
async function cancelTrade(index) {
    try {
        const response = await fetch(`/trades/${tradeId}`, {
            method: "DELETE",
        });

        if (response.ok) {
            trades.splice(index, 1);
            updateTradeList(); 
        } else {
            console.error("Failed to remove trade from database");
        }
    } catch (error) {
        console.error("Error deleting trade:", error);
    }
}

//function to load trades *still in progress
function loadTrades() {
    updateTradeList();
}