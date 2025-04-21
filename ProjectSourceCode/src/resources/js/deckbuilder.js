// Disable duplicate selections across the five <select> elements.
document.addEventListener("DOMContentLoaded", () => {
    const cardSelects = document.querySelectorAll('select[id^="card"]');
    const previewContainer = document.getElementById("deckPreview");

    function updatePreview() {
      previewContainer.innerHTML = "";
  
      cardSelects.forEach((select) => {
        const selectedOption = select.options[select.selectedIndex];
  
        if (select.value) {
          const imageUrl = selectedOption.getAttribute("data-image");
          if (imageUrl) {
            const img = document.createElement("img");
            img.src = `../resources/img/cards/${imageUrl}`;
            img.alt = selectedOption.textContent;
            img.className = "deck-preview-img";
            previewContainer.appendChild(img);
          }
        }
      });
    }
  
    function updateOptions() {
      // Normalise everything to strings so "3" === "3"
      const selectedValues = Array.from(cardSelects).map((sel) => String(sel.value));
  
      cardSelects.forEach((sel) => {
        const currentValue = String(sel.value);
  
        Array.from(sel.options).forEach((opt) => {
          const optVal = String(opt.value);
  
          if (optVal === "") {
            opt.disabled = false;                 // "Select a card"
          } else if (selectedValues.includes(optVal) && optVal !== currentValue) {
            opt.disabled = true;                  // chosen in another dropdown
          } else {
            opt.disabled = false;                 // free to pick
          }
        });
      });
      updatePreview();                        // update preview after options change
    }
  
    cardSelects.forEach((sel) => sel.addEventListener("change", updateOptions));
    updateOptions();                              // run once on load
  });