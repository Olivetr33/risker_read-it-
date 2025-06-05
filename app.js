// app.js - KORRIGIERT: Synchrone ultra-robuste Zahlenextraktion

const { DebugLogger, AutoSave, DataUtils, SessionManager, FileInputUtils, PrivacyUtils, findColumnName, extractNumber, extractCustomerData } = window.AppUtils;

let excelData = [];
let headers = [];
let filteredData = [];
let currentSort = { column: '', direction: 'desc' };
let erledigtRows = [];
let selectedLCSM = null;
let archiveMode = false;
let aggregatedData = [];
let originalAggregatedData = [];

let sliderOpen = false;
let sliderMode = 'archive';
let filteredSliderData = [];
let currentSliderSort = { column: 'Total Risk', direction: 'desc' };

const displayColumns = ["ARR", "Customer Name", "LCSM", "Total Risk", "Actions"];


function saveSession() {
    const sessionData = {
        excelData: excelData,
        filteredData: filteredData,
        aggregatedData: aggregatedData,
        originalAggregatedData: originalAggregatedData,
        selectedLCSM: selectedLCSM,
        erledigtRows: erledigtRows,
        headers: headers,
        currentSort: currentSort,
        archiveMode: archiveMode,
        lastSaveTime: AutoSave.lastSaveTime,
        timestamp: Date.now()
    };
    
    const allKeys = ['riskerSessionData', 'sessionData', 'appData'];
    for (const key of allKeys) {
        localStorage.setItem(key, JSON.stringify(sessionData));
    }
    
    SessionManager.save(sessionData);
    console.log('Session saved to all storage keys');
}

function restoreSession() {
    try {
        const allKeys = ['riskerSessionData', 'sessionData', 'appData'];
        let sessionData = null;
        
        for (const key of allKeys) {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsedData = JSON.parse(data);
                    if (parsedData && (parsedData.excelData || parsedData.filteredData || parsedData.aggregatedData)) {
                        sessionData = parsedData;
                        console.log(`Session restored from ${key}`);
                        break;
                    }
                }
            } catch (e) {
                console.warn(`Failed to restore from ${key}:`, e);
            }
        }
        
        if (!sessionData) {
            console.log('No valid session data found');
            return false;
        }
        
        excelData = sessionData.excelData || [];
        filteredData = sessionData.filteredData || [];
        aggregatedData = sessionData.aggregatedData || [];
        originalAggregatedData = sessionData.originalAggregatedData || [];
        selectedLCSM = sessionData.selectedLCSM;
        erledigtRows = sessionData.erledigtRows || [];
        headers = sessionData.headers || [];
        currentSort = sessionData.currentSort || { column: '', direction: 'desc' };
        archiveMode = sessionData.archiveMode || false;
        
        AutoSave.lastSaveTime = sessionData.lastSaveTime;
        
        if (filteredData.length > 0) {
            renderTable(archiveMode ? erledigtRows : DataUtils.getActiveCustomers(filteredData));
            renderSortControls();
            updateTableVisibility();
            
            if (archiveMode) {
                const archiveBar = document.getElementById('archiveUploadBar');
                if (archiveBar) archiveBar.style.display = 'block';
            } else {
                const archiveBar = document.getElementById('archiveUploadBar');
                if (archiveBar) archiveBar.style.display = 'none';
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error restoring session:', error);
        return false;
    }
}

function toggleFooter(hide) {
    const footer = document.getElementById('footerTransparent');
    if (footer) {
        if (hide) {
            footer.classList.add('hidden');
            console.log('Footer hidden');
        } else {
            footer.classList.remove('hidden');
            console.log('Footer shown');
        }
    }
}

window.goToStart = function() {
    console.log('ShowData function called from:', window.location.href);
    
    const currentUrl = window.location.href;
    
    if (currentUrl.includes('riskmap.html')) {
        console.log('Redirecting from RiskMap to ShowData');
        window.location.href = 'app.html';
        return;
    }
    
    if (sliderOpen) {
        closeSlider();
    }
    
    archiveMode = false;
    const archiveBar = document.getElementById('archiveUploadBar');
    if (archiveBar) {
        archiveBar.style.display = 'none';
    }
    renderTable(DataUtils.getActiveCustomers(filteredData));
    updateTableVisibility();
    saveSession();
    console.log('ShowData function executed');
};

window.showArchive = function() {
    console.log('Archive function called - checking current state');
    
    const currentUrl = window.location.href;
    if (currentUrl.includes('riskmap.html')) {
        console.log('Currently in RiskMap - redirecting to app.html with archive');
        window.location.href = 'app.html?openArchive=true';
        return;
    }
    
    if (sliderOpen) {
        closeSlider();
    }
    
    sliderMode = 'archive';
    openSlider();
    console.log('Archive function executed');
};

window.openHeatmap = function() {
    console.log('RiskMap toggle function called - checking state');
    
    const currentUrl = window.location.href;
    
    if (currentUrl.includes('riskmap.html')) {
        console.log('Currently in RiskMap - closing and returning to ShowData');
        window.location.href = 'app.html';
        return;
    }
    
    if (aggregatedData && aggregatedData.length > 0) {
        console.log('Opening RiskMap from app.html');
        window.location.href = "riskmap.html";
    } else {
        alert('Please upload and process data first before viewing the RiskMap.');
    }
};

window.triggerUpload = function() {
    console.log('Upload Data function called from:', window.location.href);
    
    const currentUrl = window.location.href;
    
    if (currentUrl.includes('riskmap.html')) {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.click();
        } else {
            console.error('File input not found in RiskMap');
        }
        return;
    }
    
    const newFileInput = FileInputUtils.reset('fileInput');
    if (newFileInput) {
        newFileInput.addEventListener('change', handleFile, false);
        newFileInput.value = "";
        newFileInput.click();
    }
};

window.performLogout = function() {
    console.log('=== VOLLSTÄNDIGER Logout & Session Clear gestartet ===');
    
    try {
        excelData = [];
        filteredData = [];
        aggregatedData = [];
        originalAggregatedData = [];
        erledigtRows = [];
        headers = [];
        selectedLCSM = null;
        archiveMode = false;
        sliderOpen = false;
        
        console.log('App state variables cleared');
        
        const allKeys = [
            'riskerSessionData', 'sessionData', 'appData', 'excelData', 'userData',
            'erledigtRows', 'archivedData', 'completedData', 'doneData',
            'filteredData', 'aggregatedData', 'originalAggregatedData',
            'headers', 'currentSort', 'selectedLCSM', 'archiveMode'
        ];
        
        for (const key of allKeys) {
            try {
                localStorage.removeItem(key);
                console.log(`Removed localStorage key: ${key}`);
            } catch (e) {
                console.warn(`Failed to remove key ${key}:`, e);
            }
        }
        
        try {
            SessionManager.clear();
            DebugLogger.clear();
            console.log('SessionManager and DebugLogger cleared');
        } catch (e) {
            console.warn('SessionManager clear failed:', e);
        }
        
        try {
            if (typeof Storage !== "undefined" && window.localStorage) {
                const allStorageKeys = Object.keys(localStorage);
                for (const key of allStorageKeys) {
                    localStorage.removeItem(key);
                }
                console.log('All localStorage keys removed:', allStorageKeys.length);
            }
        } catch (e) {
            console.warn('localStorage clear failed:', e);
        }
        
        try {
            if (typeof Storage !== "undefined" && window.sessionStorage) {
                const allSessionKeys = Object.keys(sessionStorage);
                for (const key of allSessionKeys) {
                    sessionStorage.removeItem(key);
                }
                console.log('All sessionStorage keys removed:', allSessionKeys.length);
            }
        } catch (e) {
            console.warn('sessionStorage clear failed:', e);
        }
        
        try {
            const allCookies = document.cookie.split(";");
            for (let cookie of allCookies) {
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                if (name) {
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
                }
            }
            console.log('All cookies cleared');
        } catch (e) {
            console.warn('Cookie clear failed:', e);
        }
        
        DebugLogger.add('info', 'VOLLSTÄNDIGER Logout & Session Clear erfolgreich');
        console.log('=== VOLLSTÄNDIGER Logout & Session Clear ERFOLGREICH ===');
        
        setTimeout(function() {
            try {
                const timestamp = Date.now();
                window.location.href = `index.html?clear=${timestamp}`;
            } catch (e) {
                try {
                    window.location.replace(`index.html?clear=${timestamp}`);
                } catch (e2) {
                    try {
                        window.location = `index.html?clear=${timestamp}`;
                    } catch (e3) {
                        console.error('All redirect methods failed:', e3);
                        alert('VOLLSTÄNDIGER Logout & Session Clear erfolgreich. Bitte navigiere manuell zu index.html');
                    }
                }
            }
        }, 500);
        
    } catch (error) {
        console.error('VOLLSTÄNDIGER Logout & Session Clear error:', error);
        alert('Logout & Session Clear fehlgeschlagen. Bitte versuche es erneut oder lade die Seite neu.');
    }
};

function openSlider() {
    const sliderPanel = document.getElementById('sliderPanel');
    const mainContent = document.getElementById('mainContent');
    const sliderTitle = document.getElementById('sliderTitle');
    
    if (sliderPanel && mainContent) {
        sliderPanel.classList.add('active');
        mainContent.classList.add('slider-open');
        sliderOpen = true;
        
        toggleFooter(true);
        
        sliderTitle.textContent = 'ARCHIVE';
        
        updateSliderData();
        renderSliderContent();
        
        DebugLogger.add('info', `${sliderMode} slider opened`);
    }
}

function closeSlider() {
    const sliderPanel = document.getElementById('sliderPanel');
    const mainContent = document.getElementById('mainContent');
    
    if (sliderPanel) sliderPanel.classList.remove('active');
    if (mainContent) mainContent.classList.remove('slider-open');
    sliderOpen = false;
    
    toggleFooter(false);
    
    DebugLogger.add('info', 'Slider closed');
    console.log('Slider closed successfully');
}

function updateSliderData() {
    let data = erledigtRows;
    
    filteredSliderData = [...data].sort((a, b) => {
        let aVal, bVal;
        
        if (currentSliderSort.column === 'ARR') {
            aVal = parseFloat(a['ARR']) || 0;
            bVal = parseFloat(b['ARR']) || 0;
        } else if (currentSliderSort.column === 'Total Risk') {
            aVal = parseFloat(a['Total Risk']) || 0;
            bVal = parseFloat(b['Total Risk']) || 0;
        } else {
            return 0;
        }
        
        if (currentSliderSort.direction === 'asc') {
            return aVal - bVal;
        } else {
            return bVal - aVal;
        }
    });
    
    renderSliderContent();
}

function renderSliderContent() {
    const sliderContent = document.getElementById('sliderContent');
    if (!sliderContent) return;
    
    const totalCustomers = filteredSliderData.length;
    const highRiskCustomers = filteredSliderData.filter(customer => parseFloat(customer['Total Risk']) > 10).length;
    const totalARR = filteredSliderData.reduce((sum, customer) => sum + (parseFloat(customer['ARR']) || 0), 0);
    
    sliderContent.innerHTML = `
        <div class="slider-filters-static">
            <h3>Sort Data</h3>
            <div class="filter-buttons">
                <button class="sort-btn ${currentSliderSort.column === 'ARR' ? 'active' : ''}" onclick="sortSlider('ARR')">
                    <span class="sort-text">ARR</span>
                    <span class="sort-arrow">${currentSliderSort.column === 'ARR' ? (currentSliderSort.direction === 'asc' ? '↑' : '↓') : '↓'}</span>
                </button>
                <button class="sort-btn ${currentSliderSort.column === 'Total Risk' ? 'active' : ''}" onclick="sortSlider('Total Risk')">
                    <span class="sort-text">Total Risk</span>
                    <span class="sort-arrow">${currentSliderSort.column === 'Total Risk' ? (currentSliderSort.direction === 'asc' ? '↑' : '↓') : '↓'}</span>
                </button>
            </div>
        </div>

        <div class="slider-stats-static">
            <div class="stat-item">
                <span class="stat-label">Total Customers</span>
                <span class="stat-value">${totalCustomers}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">High Risk Customers</span>
                <span class="stat-value">${highRiskCustomers}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total ARR</span>
                <span class="stat-value">€${totalARR.toLocaleString()}</span>
            </div>
        </div>

        <div class="slider-table-section">
            <h3>Customer Data</h3>
            <div class="slider-table-scrollable">
                ${renderSliderTable()}
            </div>
        </div>
    `;
}

function renderSliderTable() {
    if (filteredSliderData.length === 0) {
        return '<div style="color: #ccc; text-align: center; padding: 30px; font-size: 16px;">No archived data available</div>';
    }
    
    let tableHTML = `
        <table class="slider-data-table">
            <thead>
                <tr>
                    <th>Customer Name</th>
                    <th>LCSM</th>
                    <th>ARR</th>
                    <th>Total Risk</th>
                    <th>Risk Level</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    filteredSliderData.forEach((customer, index) => {
        const customerName = customer['Customer Name'] || customer['Kunde'] || customer['Kundenname'] || customer['Customer'] || customer['Name'] || 'Unknown';
        const lcsm = customer['LCSM'] || 'N/A';
        const arr = parseFloat(customer['ARR']) || 0;
        const risk = parseFloat(customer['Total Risk']) || 0;
        
        let riskColor = '#4CAF50';
        let riskBadge = 'LOW';
        let riskBarWidth = '33%';
        
        if (risk >= 6 && risk <= 10) {
            riskColor = '#FF9800';
            riskBadge = 'MED';
            riskBarWidth = '66%';
        }
        if (risk >= 11) {
            riskColor = '#F44336';
            riskBadge = 'HIGH';
            riskBarWidth = '100%';
        }
        
        const actionButton = `<button onclick="removeFromArchiveSlider(${index})" style="
            padding: 6px 12px; background: #f44336; color: white;
            border: none; border-radius: 6px; cursor: pointer; font-size: 12px;
        ">Remove</button>`;
        
        tableHTML += `
            <tr>
                <td>${AppUtils.escapeHTML(customerName)}</td>
                <td>${AppUtils.escapeHTML(lcsm)}</td>
                <td>€${arr.toLocaleString()}</td>
                <td>${risk.toFixed(1)}</td>
                <td>
                    <div class="risk-bar-container">
                        <div class="risk-bar-bg">
                            <div class="risk-bar-fill" style="width: ${riskBarWidth}; background: ${riskColor};"></div>
                        </div>
                        <span class="risk-badge" style="background: ${riskColor}; color: #000;">${riskBadge}</span>
                    </div>
                </td>
                <td>${actionButton}</td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    return tableHTML;
}

window.removeFromArchiveSlider = function(index) {
    try {
        if (index >= 0 && index < erledigtRows.length) {
            const removedRow = erledigtRows.splice(index, 1)[0];
            
            const customerName = removedRow['Customer Name'] || removedRow['Kunde'] || removedRow['Kundenname'] || removedRow['Customer'] || removedRow['Name'] || 'Unknown Customer';
            
            const customerKey = DataUtils.generateCustomerKey(removedRow);
            
            const filteredIndex = DataUtils.findCustomerInArray(filteredData, removedRow);
            
            if (filteredIndex !== -1) {
                filteredData[filteredIndex].erledigt = false;
                filteredData[filteredIndex].done = false;
                filteredData[filteredIndex].archived = false;
                console.log(`Customer ${customerName} marked as active again in filteredData`);
            }
            
            const aggregatedIndex = DataUtils.findCustomerInArray(aggregatedData, removedRow);
            if (aggregatedIndex !== -1) {
                aggregatedData[aggregatedIndex].erledigt = false;
                aggregatedData[aggregatedIndex].done = false;
                aggregatedData[aggregatedIndex].archived = false;
                console.log(`Customer ${customerName} marked as active again in aggregatedData`);
            }
            
            updateSliderData();
            renderTable(DataUtils.getActiveCustomers(filteredData));
            saveSession();
            
            DebugLogger.add('info', `Customer removed from archive: ${customerName}`);
        }
    } catch (error) {
        console.error('Error in removeFromArchiveSlider:', error);
        DebugLogger.add('error', 'Error in removeFromArchiveSlider', error);
    }
};

window.sortSlider = function(column) {
    if (currentSliderSort.column === column) {
        currentSliderSort.direction = currentSliderSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSliderSort.column = column;
        currentSliderSort.direction = 'desc';
    }
    
    updateSliderData();
    console.log(`Slider sorted by ${column} ${currentSliderSort.direction}`);
};

// KORRIGIERT: File Upload mit RICHTIGEN XLSX-Optionen - DAS IST DER ECHTE FIX!
function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            console.log('=== APP: File Upload Started ===');
            
            const data = new Uint8Array(event.target.result);
            
            // KORRIGIERT: Einfache XLSX-Optionen - HIER WAR DER FEHLER!
            const workbook = XLSX.read(data, { 
                type: 'array'
                // ALLE anderen Optionen ENTFERNT!
            });
            
            const sheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheet];
            
            // KORRIGIERT: Bessere JSON-Optionen - HIER WAR DER FEHLER!
            const json = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                raw: false,           // <-- ÄNDERUNG: false statt true
                defval: '',           // <-- ÄNDERUNG: '' statt null
                blankrows: false      // <-- NEU
            });

            headers = json[0].filter(header => header && header.toString().trim() !== '');
            console.log('APP: Original headers found:', headers);
            
            let rawData = json.slice(1).map((row, rowIndex) => {
                let obj = {};
                headers.forEach((header, i) => {
                    if (header && header.trim()) {
                        obj[header] = row[i];
                    }
                });
                return obj;
            }).filter(row => {
                return Object.values(row).some(value => 
                    value !== undefined && 
                    value !== null && 
                    value !== '' && 
                    value.toString().trim() !== ''
                );
            });

            console.log(`APP: Raw data extracted: ${rawData.length} rows`);
            
            const extractedData = extractCustomerData(rawData, headers);
            console.log(`APP: Extracted data: ${extractedData.length} customers`);
            
            if (extractedData.length > 0) {
                console.log('APP: Sample extracted customer:', extractedData[0]);
                console.log('APP: ARR values in first 5 customers:', extractedData.slice(0, 5).map(c => ({
                    name: c['Customer Name'],
                    arr: c.ARR,
                    risk: c['Total Risk']
                })));
            }
            
            excelData = extractedData;
            aggregatedData = extractedData;
            originalAggregatedData = [...extractedData];
            
            filteredData = DataUtils.mergeSessionWithData(erledigtRows, extractedData);
            selectedLCSM = 'ALL';
            
            console.log('APP: Final data prepared:', {
                excelData: excelData.length,
                aggregatedData: aggregatedData.length,
                filteredData: filteredData.length
            });
            
            renderTable(DataUtils.getActiveCustomers(filteredData));
            renderSortControls();
            updateTableVisibility();
            
            const archiveBar = document.getElementById('archiveUploadBar');
            if (archiveBar) {
                archiveBar.style.display = 'none';
            }
            archiveMode = false;
            
            if (sliderOpen) {
                updateSliderData();
            }
            
            saveSession();
            
            console.log('=== APP: File Upload SUCCESS ===');
            alert(`File uploaded successfully: ${extractedData.length} customers processed with corrected XLSX options`);
            
        } catch (error) {
            console.error('APP: Processing error:', error);
            alert(`File processing failed: ${error.message}`);
        }
    };

    reader.readAsArrayBuffer(file);
}

function renderSortControls() {
    const stickySort = document.getElementById('stickySort');
    if (!stickySort) return;
    
    stickySort.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <span style="color: #ffd221; font-weight: bold;">Sort by:</span>
            ${displayColumns.filter(col => col !== 'Actions').map(col => `
                <button onclick="sortTable('${col}')" style="
                    padding: 8px 16px; background: rgba(255,210,33,0.1);
                    border: 1px solid #ffd221; color: #ffd221; border-radius: 8px;
                    cursor: pointer; transition: all 0.3s;
                " onmouseover="this.style.background='rgba(255,210,33,0.2)'"
                   onmouseout="this.style.background='rgba(255,210,33,0.1)'">
                    ${col} ${currentSort.column === col ? (currentSort.direction === 'asc' ? '↑' : '↓') : ''}
                </button>
            `).join('')}
        </div>
    `;
}

function sortTable(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'desc';
    }

    const dataToSort = archiveMode ? erledigtRows : DataUtils.getActiveCustomers(filteredData);
    
    dataToSort.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

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

    renderTable(dataToSort);
    renderSortControls();
    saveSession();
}

function renderTable(data) {
    const tableContainer = document.getElementById('tableContainer');
    const dataTable = document.getElementById('dataTable');

    if (!tableContainer || !dataTable) return;
    
    if (!data || data.length === 0) {
        tableContainer.style.display = 'none';
        return;
    }

    let tableHTML = '<thead><tr>';
    displayColumns.forEach(col => {
        tableHTML += `<th>${col}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    const processedCustomers = new Set();

    data.forEach((row, index) => {
        const customerKey = DataUtils.generateCustomerKey(row);
        
        if (processedCustomers.has(customerKey)) {
            console.log(`Skipping duplicate customer: ${customerKey}`);
            return;
        }
        processedCustomers.add(customerKey);
        
        const isErledigt = row.erledigt || row.done || row.archived || false;
        
        if (!archiveMode && isErledigt) {
            console.log(`Skipping archived customer in ShowData: ${customerKey}`);
            return;
        }
        
        if (archiveMode && !isErledigt) {
            console.log(`Skipping active customer in Archive: ${customerKey}`);
            return;
        }
        
        tableHTML += `<tr>`;
        
        displayColumns.forEach(col => {
            if (col === 'Actions') {
                if (archiveMode) {
                    tableHTML += `<td>
                        <button onclick="removeFromArchive(${index})" style="
                            padding: 6px 12px; background: #f44336; color: white;
                            border: none; border-radius: 6px; cursor: pointer;
                        ">Remove</button>
                    </td>`;
                } else {
                    tableHTML += `<td>
                        <button onclick="markAsDone(${index})" style="
                            padding: 6px 12px; background: #4CAF50;
                            color: white; border: none; border-radius: 6px; cursor: pointer;
                        ">Archive</button>
                    </td>`;
                }
            } else if (col === 'ARR') {
                const arr = parseFloat(row[col]) || 0;
                tableHTML += `<td>€${arr.toLocaleString()}</td>`;
            } else if (col === 'Customer Name') {
                const customerName = row['Customer Name'] || row['Kunde'] || row['Kundenname'] || row['Customer'] || row['Name'] || 'Unknown';
                tableHTML += `<td>${AppUtils.escapeHTML(customerName)}</td>`;
            } else {
                const cellValue = row[col] || '';
                tableHTML += `<td>${AppUtils.escapeHTML(cellValue)}</td>`;
            }
        });
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody>';
    dataTable.innerHTML = tableHTML;
    tableContainer.style.display = 'block';
    
    console.log(`Rendered table with ${processedCustomers.size} unique customers (${data.length} total rows)`);
}

window.markAsDone = function(index) {
    try {
        const activeCustomers = DataUtils.getActiveCustomers(filteredData);
        
        if (index < 0 || index >= activeCustomers.length) {
            return;
        }
        
        const row = activeCustomers[index];
        if (!row || row.erledigt) {
            return;
        }
        
        const customerName = row['Customer Name'] || row['Kunde'] || row['Kundenname'] || row['Customer'] || row['Name'] || 'Unknown Customer';
        
        const customerKey = DataUtils.generateCustomerKey(row);
        const alreadyInArchive = erledigtRows.find(archived => 
            DataUtils.generateCustomerKey(archived) === customerKey
        );
        
        if (alreadyInArchive) {
            console.log(`Customer ${customerName} already in archive - skipping`);
            return;
        }
        
        const originalIndex = DataUtils.findCustomerInArray(filteredData, row);
        
        if (originalIndex !== -1) {
            filteredData[originalIndex].erledigt = true;
            filteredData[originalIndex].done = true;
            filteredData[originalIndex].archived = true;
            filteredData[originalIndex].archivedAt = new Date().toISOString();
            erledigtRows.push({...filteredData[originalIndex]});
            console.log(`Customer ${customerName} moved to archive`);
        }
        
        const aggregatedIndex = DataUtils.findCustomerInArray(aggregatedData, row);
        if (aggregatedIndex !== -1) {
            aggregatedData[aggregatedIndex].erledigt = true;
            aggregatedData[aggregatedIndex].done = true;
            aggregatedData[aggregatedIndex].archived = true;
            aggregatedData[aggregatedIndex].archivedAt = new Date().toISOString();
        }
        
        setTimeout(() => {
            renderTable(DataUtils.getActiveCustomers(filteredData));
            
            if (sliderOpen) {
                updateSliderData();
            }
            
            saveSession();
        }, 0);
        
        DebugLogger.add('info', `Customer marked as done: ${customerName}`);
        
    } catch (error) {
        console.error('Error in markAsDone:', error);
        DebugLogger.add('error', 'Error in markAsDone', error);
    }
};

window.removeFromArchive = function(index) {
    try {
        if (index >= 0 && index < erledigtRows.length) {
            const removedRow = erledigtRows.splice(index, 1)[0];
            
            const customerName = removedRow['Customer Name'] || removedRow['Kunde'] || removedRow['Kundenname'] || removedRow['Customer'] || removedRow['Name'] || 'Unknown Customer';
            
            const filteredIndex = DataUtils.findCustomerInArray(filteredData, removedRow);
            
            if (filteredIndex !== -1) {
                filteredData[filteredIndex].erledigt = false;
                filteredData[filteredIndex].done = false;
                filteredData[filteredIndex].archived = false;
                console.log(`Customer ${customerName} marked as active again`);
            }
            
            const aggregatedIndex = DataUtils.findCustomerInArray(aggregatedData, removedRow);
            if (aggregatedIndex !== -1) {
                aggregatedData[aggregatedIndex].erledigt = false;
                aggregatedData[aggregatedIndex].done = false;
                aggregatedData[aggregatedIndex].archived = false;
            }
            
            renderTable(erledigtRows);
            
            if (sliderOpen) {
                updateSliderData();
            }
            
            saveSession();
            
            DebugLogger.add('info', `Customer removed from archive: ${customerName}`);
        }
    } catch (error) {
        console.error('Error in removeFromArchive:', error);
        DebugLogger.add('error', 'Error in removeFromArchive', error);
    }
};

function updateTableVisibility() {
    const tableContainer = document.getElementById('tableContainer');
    if (!tableContainer) return;
    
    const hasData = (archiveMode ? erledigtRows : DataUtils.getActiveCustomers(filteredData)).length > 0;
    tableContainer.style.display = hasData ? 'block' : 'none';
}

function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openArchive') === 'true') {
        console.log('URL parameter detected - opening archive automatically');
        setTimeout(() => {
            window.showArchive();
        }, 500);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Setting up event listeners...');
    
    let attempts = 0;
    const maxAttempts = 20;
    
    function forceButtonClick(buttonId, callback) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.onclick = function(e) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                console.log(`${buttonId} clicked via onclick`);
                callback();
                return false;
            };
            
            button.addEventListener('click', function(e) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                console.log(`${buttonId} clicked via addEventListener`);
                callback();
                return false;
            }, false);
            
            button.onmousedown = function(e) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                console.log(`${buttonId} mousedown`);
                setTimeout(callback, 10);
                return false;
            };
            
            button.ontouchstart = function(e) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                console.log(`${buttonId} touchstart`);
                setTimeout(callback, 10);
                return false;
            };
            
            console.log(`${buttonId} listeners added (4 methods)`);
            return true;
        }
        return false;
    }
    
    function setupEventListeners() {
        attempts++;
        console.log(`Setting up event listeners - attempt ${attempts}`);
        
        try {
            const sessionRestored = restoreSession();
            
            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                fileInput.addEventListener('change', handleFile, false);
                console.log('File input listener added');
            }

            const uploadDataBtn = document.getElementById('uploadDataBtn');
            if (uploadDataBtn) {
                uploadDataBtn.onclick = window.triggerUpload;
                console.log('Upload Data button listener added');
            }

            const startBtn = document.getElementById('startBtn');
            if (startBtn) {
                startBtn.onclick = window.goToStart;
                console.log('ShowData button listener added');
            }
            
            const logoutSuccess = forceButtonClick('logoutBtn', window.performLogout);
            if (!logoutSuccess) {
                console.error('Logout button not found!');
            }

            const heatmapSuccess = forceButtonClick('heatmapBtn', window.openHeatmap);
            if (!heatmapSuccess) {
                console.error('RiskMap button not found!');
            }
            
            const archiveSuccess = forceButtonClick('archiveBtn', window.showArchive);
            if (!archiveSuccess) {
                console.error('Archive button not found!');
            }

            const closeSliderBtn = document.getElementById('closeSliderBtn');
            if (closeSliderBtn) {
                closeSliderBtn.onclick = function() {
                    console.log('Close slider button clicked');
                    closeSlider();
                };
                console.log('Close slider button listener added');
            }

            const dialogBg = document.getElementById('dialogBg');
            if (dialogBg) {
                dialogBg.addEventListener('click', function(e){
                    if(e.target === this) this.style.display = 'none';
                });
                console.log('Dialog background listener added');
            }

            updateTableVisibility();
            AutoSave.start(saveSession);
            
            checkUrlParameters();
            
            if (!sessionRestored) {
                DebugLogger.add('info', 'App started - no previous session');
            } else {
                DebugLogger.add('info', 'App started - session restored');
            }
            
            console.log('All event listeners set up successfully!');
            return true;
            
        } catch (error) {
            console.error('Error setting up event listeners:', error);
            return false;
        }
    }
    
    function trySetupEventListeners() {
        if (setupEventListeners()) {
            return;
        }
        
        if (attempts < maxAttempts) {
            const delays = [10, 25, 50, 100, 150, 200, 300, 500, 750, 1000];
            const delay = delays[attempts % delays.length];
            setTimeout(trySetupEventListeners, delay);
        } else {
            console.error('Failed to set up event listeners after maximum attempts');
            window.addEventListener('load', function() {
                console.log('Final attempt: Trying to setup event listeners after window load');
                setupEventListeners();
            });
        }
    }
    
    trySetupEventListeners();
});

window.aggregatedData = aggregatedData;
