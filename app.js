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
<a href="mailto:Your Data Protection Officer">Your Data Protection Officer</a>
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
    <!-- ... Rest deiner Dialog-Logik ... -->
  `;
  dialogBg.style.display = 'flex';
}

// ... (Rest deiner app.js bleibt wie gehabt)
