console.log("test");
//let trades = [];

//upon loading of the page
//document.addEventListener("DOMContentLoaded", function () {
async function loadAll(){
    console.log("Page Loaded!");
    //loadPlayers(); 
    loadTrades();
    document.getElementById("tradeForm").addEventListener("submit", submitTrade);
};

//load players
async function loadPlayers(username) {
    const offerDropdown = document.getElementById("offerCard");
    const tradeForDropdown = document.getElementById("tradeForCard");
    offerDropdown.innerHTML = "";
    tradeForDropdown.innerHTML = "";

    try {
        const player_card_query =
        `SELECT * 
        FROM cards 
        JOIN cardsToUsers 
        ON cards.id = cardsToUsers.card_id 
        WHERE cardsToUsers.username_id = $1;`;

        const player_cards = await db.any(player_card_query, [username]);
        player_cards.forEach(card => {
            const option1 = document.createElement("option");
            option1.value = card.id;
            option1.textContent = card.name;
            offerDropdown.appendChild(option1);
        });


        const response = await fetch("/cards"); 
        const cards = await response.json();
        cards.forEach(card => {

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
document.getElementById("tradeForm").addEventListener("submit", async (event) =>{
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
            await loadTrades(); // reloads the trade list with the new trade
            // hides the modal
            const modalEl = document.getElementById("tradeModal");
            const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
            if (modalInstance) {
                modalInstance.hide();
            }
            // remove backdrop
            setTimeout(() => {
                document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                document.body.classList.remove('modal-open');
                document.body.style.overflow = 'auto';
                document.body.style.paddingRight = '0';
              }, 300); 
            document.getElementById("tradeForm").reset();
        } else {
            const errorData = await response.json();
            alert("Failed to submit trade: " + (errorData.error || "Unknown error"));
        }
    } catch (err) {
        console.error("Error submitting trade:", err);
        alert("Server error while submitting trade.");
    }
});

// pending trades
function updateTradeList(outgoing, incoming, accepted) {
    //clear existing lists
    const outgoingList = document.getElementById("outgoingTrades");
    const incomingList = document.getElementById("incomingTrades");
    const acceptedList = document.getElementById("acceptedTrades");

    outgoingList.innerHTML = "";
    incomingList.innerHTML = "";
    acceptedList.innerHTML = "";
    
    //populate outgoing trades i.e. trades you've made
    outgoing.forEach((trade, index) => {
        const tradeItem = document.createElement("li");
        tradeItem.className = "list-group-item d-flex justify-content-between align-items-center";
        tradeItem.innerHTML = `
          <span>You offered <strong>${trade.offer_name}</strong> for <strong>${trade.request_name}</strong></span>
          <span class="badge bg-warning">${trade.trade_status}</span>
          <button class="btn btn-danger btn-sm" onclick="cancelTrade(${trade.id}, ${index})">Cancel</button>
        `;
        outgoingList.appendChild(tradeItem);
    });

    //populate incoming trades i.e. trades you can accept
    incoming.forEach((trade, index) => {
        const tradeItem = document.createElement("li");
        tradeItem.className = "list-group-item d-flex justify-content-between align-items-center";
        tradeItem.innerHTML = `
          <span>${trade.card1_owner} offered <strong>${trade.offer_name}</strong> for your <strong>${trade.request_name}</strong></span>
          <span class="badge bg-warning">${trade.trade_status}</span>
          <div>
            <button class="btn btn-success btn-sm me-1" onclick="acceptTrade(${trade.id}, ${index})">Accept</button>
            <button class="btn btn-danger btn-sm" onclick="rejectTrade(${trade.id}, ${index})">Reject</button>
          </div>`;
        incomingList.appendChild(tradeItem);
    });

    //populate accepted trades
    accepted.forEach((trade) => {
        const tradeItem = document.createElement("li");
        tradeItem.className = "list-group-item";
        tradeItem.innerHTML = `
          <span>${trade.card1_owner} traded <strong>${trade.offer_name}</strong> ⇄ <strong>${trade.request_name}</strong> with ${trade.card2_owner}</span>
          <div><span class="badge bg-success">${trade.trade_status}</span></div>`;
        acceptedList.appendChild(tradeItem);
    });
}

//accept trades
async function acceptTrade(tradeId, index) {
    //console.log("Accepting trade with ID:", tradeId);
    try {
        //calls accept trade endpoint
        const response = await fetch(`/trades/${tradeId}/accept`, { method: "POST" });
        if (response.ok) {

            await loadTrades(); //reloads trade list
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
        //calls reject trade endpoint
        const response = await fetch(`/trades/${tradeId}/reject`, { method: "DELETE" });

        if (response.ok) {
            await loadTrades(); // reloads trade list
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
async function cancelTrade(tradeId, index) {
    try {
        //calls cancel trade endpoint
        const response = await fetch(`/trades/${tradeId}`, {
            method: "DELETE",
        });

        if (response.ok) {
            await loadTrades(); // reloads trade list
        } else {
            console.error("Failed to remove trade from database");
        }
    } catch (error) {
        console.error("Error deleting trade:", error);
    }
}

//function to load trades *still in progress
async function loadTrades() {
    try {
        //fetch outgoing, incoming, and accepted trades from the server
        const res = await fetch(`/trades/${CURRENT_USER}`);
        const data = await res.json();
        
        //update the trade list with the fetched data
        updateTradeList(data.outgoing, data.incoming, data.accepted);
      } catch (err) {
        console.error("Error loading trades:", err);
      }
}
//load all trades when the page loads
document.addEventListener("DOMContentLoaded", loadAll);