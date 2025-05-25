// Privacy Popup Text (English)
const privacyText = `
<h3>Privacy</h3>
<p>
    This application is a purely local web app. <b>No data</b> is transmitted to third parties or external servers.<br>
    All files and session data remain on your device and can be deleted at any time.
</p>
<p>
    <b>GDPR compliance:</b> The application is designed to be fully GDPR-compliant.<br>
    No personal data is processed outside your device. No cookies or trackers are used.
</p>
<p style="color:#b3b3b3;font-size:0.98rem;">
    Contact for privacy inquiries: <a href="mailto:saberton24@outlook.de">saberton24@outlook.de</a>
</p>
`;

function showPrivacy() {
    document.getElementById('popupInner').innerHTML = privacyText;
    document.getElementById('popupBg').style.display = 'flex';
}
function hidePrivacy() {
    document.getElementById('popupBg').style.display = 'none';
}

// App State
let excelData = [];
let headers = [];
let filteredData = [];
let currentSort = { column: '', direction: 'desc' };
let erledigtRows = [];
let selectedLCSM = null;
let archiveMode = false;

// Sidebar Actions
window.goToStart = function() {
    archiveMode = false;
    document.getElementById('archiveUploadBar').style.display = 'none';
    renderTable(filteredData);
    updateTableVisibility();
};
window.showLCSMDialog = function() {
    showLCSMSelection();
};
window.showArchive = function() {
    archiveMode = true;
    renderTable(erledigtRows);
    document.getElementById('archiveUploadBar').style.display = 'block';
    updateTableVisibility();
};
window.logout = function() {
    window.location = "index.html";
};

// File Upload
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', handleFile, false);

    document.getElementById('uploadDataBtn').onclick = function() {
        fileInput.value = "";
        fileInput.click();
    };

    document.getElementById('startBtn').onclick = window.goToStart;
    document.getElementById('changeLcsmBtn').onclick = window.showLCSMDialog;
    document.getElementById('archiveBtn').onclick = window.showArchive;
    document.getElementById('logoutBtn').onclick = window.logout;
    document.getElementById('clearDataBtn').onclick = handleClearData;

    const popupBg = document.getElementById('popupBg');
    if (popupBg) {
        popupBg.addEventListener('click', function(e){
            if(e.target === this) hidePrivacy();
        });
    }
    const dialogBg = document.getElementById('dialogBg');
    if (dialogBg) {
        dialogBg.addEventListener('click', function(e){
            if(e.target === this) this.style.display = 'none';
        });
    }

    updateTableVisibility();
});

function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheet];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        headers = json[0];
        let rawData = json.slice(1).map(row => {
            let obj = {};
            headers.forEach((h,i) => obj[h] = row[i]);
            return obj;
        });
        // Aggregation by customer
        excelData = aggregateDataByCustomer(rawData);
        filteredData = mergeSessionWithData(erledigtRows, excelData);
        showLCSMSelection();
        renderSortControls();
        document.getElementById('archiveUploadBar').style.display = archiveMode ? 'block' : 'none';
        updateTableVisibility();
    };
    reader.readAsArrayBuffer(file);
}

// Aggregation: group by customer and sum risk values
function aggregateDataByCustomer(data) {
    const grouped = {};
    data.forEach(row => {
        const key = row["Customer Number"] || row["Customer ID"];
        if (!key) return;
        if (!grouped[key]) {
            grouped[key] = {...row};
            ["Contact Risk", "Update Risk", "Value Risk", "Contract Risk", "Objective Risk", "Total Risk", "ARR"].forEach(field => {
                grouped[key][field] = parseFloat(row[field]) || 0;
            });
        } else {
            ["Contact Risk", "Update Risk", "Value Risk", "Contract Risk", "Objective Risk", "Total Risk", "ARR"].forEach(field => {
                grouped[key][field] += parseFloat(row[field]) || 0;
            });
        }
    });
    return Object.values(grouped);
}

// LCSM Dialog
function showLCSMSelection() {
    const dialogBg = document.getElementById('dialogBg');
    const dialogInner = document.getElementById('dialogInner');
    const lcsmCol = headers.find(h => h.toLowerCase().includes("lcsm"));
    const uniqueLCSM = [...new Set(excelData.map(row => row[lcsmCol]).filter(Boolean))];
    dialogInner.innerHTML = `
        <h3 style="margin-top:0;">Who wants to see the risk? Select your LCSM on Deck!</h3>
        <div style="display:flex; flex-wrap:wrap; gap:12px; margin:18px 0; justify-content:center;">
            ${uniqueLCSM.map(lcsm => `
                <button class="upload-btn-main" style="font-size:1.1rem; padding:10px 24px; border-radius:10px;" onclick="selectLCSM('${lcsm}')">${lcsm}</button>
            `).join('')}
        </div>
    `;
    dialogBg.style.display = 'flex';
}
window.selectLCSM = function(lcsm) {
    selectedLCSM = lcsm;
    document.getElementById('dialogBg').style.display = 'none';
    filterByLCSM();
};
function filterByLCSM() {
    if (!selectedLCSM) return;
    filteredData = mergeSessionWithData(erledigtRows, excelData).filter(row =>
        row["LCSM"] === selectedLCSM
    );
    archiveMode = false;
    document.getElementById('archiveUploadBar').style.display = 'none';
    renderTable(filteredData);
    updateTableVisibility();
}

// Table Rendering
function renderTable(data) {
    const table = document.getElementById('dataTable');
    if (!headers.length || !data.length) {
        table.innerHTML = '';
        updateTableVisibility();
        return;
    }
    const showCols = headers.filter(h =>
        h === "Customer Number" || h === "Name" || h === "ARR" || h === "Total Risk" || h === "LCSM"
    );
    table.innerHTML = `
        <thead>
            <tr>
                ${showCols.map(h => `<th>${h}</th>`).join('')}
                <th>Top Risk</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
            ${data.map(row => {
                const topRisk = getTopRisk(row);
                return `<tr>
                    ${showCols.map(h => `<td>${row[h] ?? ''}</td>`).join('')}
                    <td>${topRisk.badges.join(' ')}</td>
                    <td>
                        <button class="copy-btn" title="Copy customer number to clipboard" onclick="navigator.clipboard.writeText('${row["Customer Number"] || ""}')">📑</button>
                        ${archiveMode ? '' : `<button class="complete-btn" title="Mark as done" onclick="removeRow('${row["Customer Number"] || ""}')">Done</button>`}
                    </td>
                </tr>`;
            }).join('')}
        </tbody>
    `;
    updateTableVisibility();
}

// Risk Badges
function getTopRisk(row) {
    const risks = [
        { key: "Contact Risk", label: "Contact", class: "badge-contact", val: row["Contact Risk"] },
        { key: "Update Risk", label: "Update", class: "badge-update", val: row["Update Risk"] },
        { key: "Value Risk", label: "Value", class: "badge-value", val: row["Value Risk"] },
        { key: "Contract Risk", label: "Contract", class: "badge-contract", val: row["Contract Risk"] },
        { key: "Objective Risk", label: "Objective", class: "badge-objective", val: row["Objective Risk"] }
    ];
    let badges = [];
    risks.forEach(risk => {
        if (parseFloat(risk.val) >= 7) {
            badges.push(`<span class="badge ${risk.class}">${risk.label}</span>`);
        }
    });
    return { badges };
}

// Remove Row (Done)
window.removeRow = function(customerNum) {
    const row = filteredData.find(row =>
        (row["Customer Number"] || row["Customer ID"] || "") == customerNum
    );
    if (row) erledigtRows.push(row);
    filteredData = filteredData.filter(row =>
        (row["Customer Number"] || row["Customer ID"] || "") != customerNum
    );
    renderTable(filteredData);
    updateTableVisibility();
};

// Sort Controls
function renderSortControls() {
    const sticky = document.getElementById('stickySort');
    sticky.innerHTML = `
        <div class="sort-controls" id="sortControls">
            <label for="sortColumn">Sort by:</label>
            <select class="sort-select" id="sortColumn"></select>
            <button class="sort-btn" id="sortAsc" title="Sort ascending">▲</button>
            <button class="sort-btn active" id="sortDesc" title="Sort descending">▼</button>
        </div>
    `;
    const sortColumn = document.getElementById('sortColumn');
    sortColumn.innerHTML = '';
    headers.filter(h => h !== "LCSM").forEach(h => {
        const opt = document.createElement('option');
        opt.value = h;
        opt.textContent = h;
        sortColumn.appendChild(opt);
    });
    currentSort.column = headers.find(h => h !== "LCSM") || headers[0];
    document.getElementById('sortAsc').onclick = function() {
        currentSort.direction = 'asc';
        updateSortButtons();
        sortAndRenderTable();
    };
    document.getElementById('sortDesc').onclick = function() {
        currentSort.direction = 'desc';
        updateSortButtons();
        sortAndRenderTable();
    };
    document.getElementById('sortColumn').onchange = function() {
        currentSort.column = this.value;
        sortAndRenderTable();
    };
}
function updateSortButtons() {
    document.getElementById('sortAsc').classList.toggle('active', currentSort.direction === 'asc');
    document.getElementById('sortDesc').classList.toggle('active', currentSort.direction === 'desc');
}
function sortAndRenderTable() {
    let sorted = [...filteredData];
    sorted.sort((a, b) => {
        let aVal = a[currentSort.column];
        let bVal = b[currentSort.column];
        if(!isNaN(parseFloat(aVal)) && !isNaN(parseFloat(bVal))) {
            aVal = parseFloat(aVal);
            bVal = parseFloat(bVal);
        }
        if (currentSort.direction === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
    });
    renderTable(sorted);
}

// Show/hide table and filter bar together, also for archive
function updateTableVisibility() {
    const tableContainer = document.getElementById('tableContainer');
    const stickySort = document.getElementById('stickySort');
    let showTable = false;
    if (archiveMode) {
        showTable = erledigtRows.length > 0 && headers.length > 0;
    } else {
        showTable = headers.length && filteredData.length;
    }
    tableContainer.style.display = showTable ? '' : 'none';
    stickySort.style.display = showTable ? '' : 'none';
}

// Clear Data Button logic with English archive query
function handleClearData() {
    if (!headers.length && !erledigtRows.length) {
        alert("No data loaded.");
        return;
    }
    if (erledigtRows.length) {
        const keepArchive = confirm(
            "Do you want to keep the archive (completed rows)?\n\n" +
            "OK = Keep archive, only clear table data\n" +
            "Cancel = Delete everything including archive"
        );
        if (keepArchive) {
            // Only clear table data, keep archive
            excelData = [];
            filteredData = [];
            selectedLCSM = null;
            archiveMode = false;
            renderTable([]);
            updateTableVisibility();
        } else {
            // Delete everything
            excelData = [];
            headers = [];
            filteredData = [];
            erledigtRows = [];
            selectedLCSM = null;
            archiveMode = false;
            renderTable([]);
            updateTableVisibility();
        }
    } else {
        if (confirm("Clear all loaded data from the table?")) {
            excelData = [];
            headers = [];
            filteredData = [];
            selectedLCSM = null;
            archiveMode = false;
            renderTable([]);
            updateTableVisibility();
        }
    }
}

// Merge Session Helper
function mergeSessionWithData(session, data) {
    const erledigtIds = new Set((session || []).map(row =>
        row["Customer Number"] || row["Customer ID"]));
    return data.filter(row =>
        !erledigtIds.has(row["Customer Number"] || row["Customer ID"])
    );
}
