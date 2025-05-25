// ================== Privacy & Accessibility Notice (BfSG/DSGVO) ==================
const privacyText = `
<h3>Privacy Policy & Accessibility Notice (BfSG)</h3>
<p>This tool is a purely local application. No data is transmitted to third parties or external servers. All files and session data remain on your device and can be deleted at any time in your local start directory.</p>
<p><b>GDPR compliance:</b> The application is designed to be fully GDPR-compliant. No personal data is processed outside your device. No cookies or trackers are used.</p>
<p><b>Accessibility (BfSG):</b> According to the German Accessibility Strengthening Act (Barrierefreiheitsstärkungsgesetz, BfSG), we strive to make this tool as accessible as possible. If you encounter any barriers or accessibility issues, please contact us at <a href="mailto:saberton24@outlook.de" style="color:#f1c40f;">saberton24@outlook.de</a>. As this is a local, non-commercial tool, some requirements of the BfSG may not apply.</p>
`;

function showPrivacy() {
    document.getElementById('popupInner').innerHTML = privacyText;
    document.getElementById('popupBg').style.display = 'flex';
}
function hidePopup() {
    document.getElementById('popupBg').style.display = 'none';
}

// ================== App State ==================
let excelData = [];
let headers = [];
let filteredData = [];
let currentSort = { column: '', direction: 'desc' };
let erledigtRows = [];
let selectedLCSM = null;
let archiveMode = false;

// ================== Save/Migrate Session ==================
function saveSessionToFile(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "session.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}
function loadSessionFromFile(callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const session = JSON.parse(evt.target.result);
                callback(session);
            } catch (err) {
                alert("Invalid session file.");
            }
        };
        reader.readAsText(file);
    };
    input.click();
}
function mergeSessionWithData(session, data) {
    const erledigtIds = new Set((session || []).map(row =>
        row["Customer Number"] || row["Customer ID"]));
    return data.filter(row =>
        !erledigtIds.has(row["Customer Number"] || row["Customer ID"])
    );
}

// ================== Sidebar Actions ==================
window.saveSession = function() {
    saveSessionToFile(erledigtRows);
};
window.migrateSession = function() {
    loadSessionFromFile(session => {
        erledigtRows = session;
        filteredData = mergeSessionWithData(erledigtRows, excelData);
        renderTable(filteredData);
    });
};
window.logout = function() {
    window.location = "index.html";
};
window.goToStart = function() {
    archiveMode = false;
    renderTable(filteredData);
};
window.showArchive = function() {
    archiveMode = true;
    renderTable(erledigtRows);
};
window.showLCSMDialog = function() {
    showLCSMSelection();
};

// ================== File Upload ==================
document.getElementById('fileInput').addEventListener('change', handleFile, false);

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
        excelData = json.slice(1).map(row => {
            let obj = {};
            headers.forEach((h,i) => obj[h] = row[i]);
            return obj;
        });
        filteredData = mergeSessionWithData(erledigtRows, excelData);
        showLCSMSelection();
        renderSortControls();
        document.getElementById('uploadBtnMain').style.display = "none";
    };
    reader.readAsArrayBuffer(file);
}

// ================== LCSM Dialog ==================
function showLCSMSelection() {
    const dialogBg = document.getElementById('dialogBg');
    const dialogInner = document.getElementById('dialogInner');
    const lcsmCol = headers.find(h => h.toLowerCase().includes("lcsm"));
    const uniqueLCSM = [...new Set(excelData.map(row => row[lcsmCol]).filter(Boolean))];
    dialogInner.innerHTML = `
        <h3 style="margin-top:0;">Who wants to see the risk? Select your LCSM on Deck!</h3>
        <div style="display:flex; flex-wrap:wrap; gap:12px; margin:18px 0;">
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
    renderTable(filteredData);
}

// ================== Table Rendering ==================
function renderTable(data) {
    const table = document.getElementById('dataTable');
    if (!headers.length || !data.length) {
        table.innerHTML = '';
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
                        <button class="copy-btn" title="Copy" onclick="navigator.clipboard.writeText('${row["Customer Number"] || ""}')">📋</button>
                        ${archiveMode ? '' : `<button class="complete-btn" onclick="removeRow('${row["Customer Number"] || ""}')">Done</button>`}
                    </td>
                </tr>`;
            }).join('')}
        </tbody>
    `;
}

// ================== Risk Badges ==================
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

// ================== Remove Row (Done) ==================
window.removeRow = function(customerNum) {
    const row = filteredData.find(row =>
        (row["Customer Number"] || row["Customer ID"] || "") == customerNum
    );
    if (row) erledigtRows.push(row);
    filteredData = filteredData.filter(row =>
        (row["Customer Number"] || row["Customer ID"] || "") != customerNum
    );
    renderTable(filteredData);
};

// ================== Sort Controls ==================
function renderSortControls() {
    const sticky = document.getElementById('stickySort');
    sticky.innerHTML = `
        <div class="sort-controls" id="sortControls">
            <label for="sortColumn" style="font-size:1.1rem;">Sort by:</label>
            <select class="sort-select" id="sortColumn"></select>
            <button class="sort-btn" id="sortAsc">↑</button>
            <button class="sort-btn active" id="sortDesc">↓</button>
        </div>
    `;
    const sortColumn = document.getElementById('sortColumn');
    sortColumn.innerHTML = '';
    headers.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h;
        opt.textContent = h;
        sortColumn.appendChild(opt);
    });
    currentSort.column = headers[0];
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

// ================== Dialog & Popup Events ==================
document.getElementById('popupBg').addEventListener('click', function(e){
    if(e.target === this) hidePopup();
});
document.getElementById('dialogBg').addEventListener('click', function(e){
    if(e.target === this) this.style.display = 'none';
});

// ================== Upload Button beim Start anzeigen ==================
window.onload = function() {
    document.getElementById('uploadBtnMain').style.display = "block";
};
