// Privacy Popup Text (English)
const privacyText = `
<h2>Privacy</h2>
<p>
This application is a purely local web app.<br>
<b>No data</b> is transmitted to third parties or external servers.<br>
All files and session data remain on your device and can be deleted at any time.
</p>
<p>
<b>GDPR compliance:</b> The application is designed to be fully GDPR-compliant.<br>
No personal data is processed outside your device. No cookies or trackers are used.
</p>
<p>
<b>Contact for privacy inquiries:</b>
<a href="mailto:Your Local Privacy Officer">Your Local Privacy Officer</a>
</p>
<p style="margin-top: 20px;">
<a href="https://github.com/Olivetr33/risker_read-it-" target="_blank" rel="noopener" style="color: #ffd221;">GitHub Repository</a>
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

// Only display these columns + Done button
const displayColumns = ["ARR", "Customer Name", "LCSM", "Total Risk", "Actions"];

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
    <div class="lcsm-popup">
      <h2>Select LCSM</h2>
      <div class="lcsm-btn-group">
        ${uniqueLCSM.map(lcsm => `
          <button class="lcsm-btn" onclick="selectLCSM('${lcsm}')">${lcsm}</button>
        `).join('')}
      </div>
    </div>
  `;
  dialogBg.style.display = 'flex';
}

window.selectLCSM = function(lcsm) {
  selectedLCSM = lcsm;
  filteredData = excelData.filter(row => row["LCSM"] === lcsm);
  renderTable(filteredData);
  document.getElementById('dialogBg').style.display = 'none';
  updateTableVisibility();
};

function renderSortControls() {
  const stickySort = document.getElementById('stickySort');
  const sortableColumns = displayColumns.filter(col => col !== 'Actions');
  if (!sortableColumns || sortableColumns.length === 0) return;
  
  stickySort.innerHTML = `
    <div class="sort-controls">
      <label for="sortSelect">Sort by:</label>
      <select id="sortSelect" class="sort-select">
        ${sortableColumns.map(column => `<option value="${column}">${column}</option>`).join('')}
      </select>
      <button class="sort-btn" id="sortBtn" onclick="toggleSort()">↓</button>
    </div>
  `;
}

// KORRIGIERTE renderTable Funktion - mit Done Button und korrekter Customer Name Auslesung
function renderTable(data) {
  const tableContainer = document.getElementById('tableContainer');
  const dataTable = document.getElementById('dataTable');
  
  if (!data || data.length === 0) {
    tableContainer.style.display = 'none';
    return;
  }
  
  // Fill table with desired columns + Done button
  let tableHTML = '<thead><tr>';
  displayColumns.forEach(column => {
    tableHTML += `<th>${column}</th>`;
  });
  tableHTML += '</tr></thead><tbody>';
  
  data.forEach((row, index) => {
    tableHTML += '<tr>';
    displayColumns.forEach(column => {
      if (column === 'Actions') {
        tableHTML += `<td><button class="complete-btn" onclick="markAsDone(${index})">Done</button></td>`;
      } else {
        let value = '';
        
        // KORRIGIERTE Customer Name Auslesung
        if (column === 'Customer Name') {
          value = row["Customer Name"] || row["Customer"] || row["Name"] || row["Client Name"] || row["Company"] || '';
        } else {
          value = row[column] || '';
        }
        
        // Formatting for ARR and Total Risk (numbers)
        if ((column === 'ARR' || column === 'Total Risk') && value !== '') {
          const numValue = parseFloat(value);
          tableHTML += `<td>${isNaN(numValue) ? value : numValue.toLocaleString()}</td>`;
        } else {
          tableHTML += `<td>${value}</td>`;
        }
      }
    });
    tableHTML += '</tr>';
  });
  
  tableHTML += '</tbody>';
  dataTable.innerHTML = tableHTML;
  
  // Show table
  tableContainer.style.display = 'flex';
  tableContainer.style.visibility = 'visible';
  tableContainer.style.opacity = '1';
}

// Done Button Funktionalität
window.markAsDone = function(index) {
  if (confirm('Mark this entry as done?')) {
    const completedRow = filteredData[index];
    erledigtRows.push(completedRow);
    filteredData.splice(index, 1);
    renderTable(filteredData);
    updateTableVisibility();
  }
};

function updateTableVisibility() {
  const tableContainer = document.getElementById('tableContainer');
  if (filteredData && filteredData.length > 0) {
    tableContainer.style.display = 'flex';
    tableContainer.style.visibility = 'visible';
    tableContainer.style.opacity = '1';
  } else {
    tableContainer.style.display = 'none';
  }
}

function toggleSort() {
  const sortSelect = document.getElementById('sortSelect');
  const sortBtn = document.getElementById('sortBtn');
  const column = sortSelect.value;
  
  if (currentSort.column === column) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.column = column;
    currentSort.direction = 'desc';
  }
  
  sortBtn.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
  
  filteredData.sort((a, b) => {
    let aVal = a[column] || 0;
    let bVal = b[column] || 0;
    
    // Numeric sorting for ARR and Total Risk
    if (column === 'ARR' || column === 'Total Risk') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    }
    
    if (currentSort.direction === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
  
  renderTable(filteredData);
}

function handleClearData() {
  if (confirm('Delete all data?')) {
    excelData = [];
    filteredData = [];
    erledigtRows = [];
    headers = [];
    selectedLCSM = null;
    document.getElementById('tableContainer').style.display = 'none';
    document.getElementById('stickySort').innerHTML = '';
  }
}

function mergeSessionWithData(erledigtRows, excelData) {
  return excelData;
}
