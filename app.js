// app.js - KORRIGIERT: Synchrone ultra-robuste Zahlenextraktion

const { DebugLogger, AutoSave, DataUtils, SessionManager, FileInputUtils, PrivacyUtils } = window.AppUtils;

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

// KORRIGIERT: IDENTISCHE Spalten-Mapping in allen Dateien
const COLUMN_MAPPINGS = {
    'LCSM': ['LCSM', 'lcsm', 'Lcsm', 'LcsM', 'SACHBEARBEITER', 'sachbearbeiter', 'Sachbearbeiter', 'CSM', 'csm', 'Manager', 'manager', 'MANAGER', 'Betreuer', 'betreuer', 'BETREUER'],
    'Customer Name': ['Customer Name', 'customer name', 'CUSTOMER NAME', 'CustomerName', 'customername', 'CUSTOMERNAME', 'Customer Number', 'customer number', 'CUSTOMER NUMBER', 'CustomerNumber', 'customernumber', 'CUSTOMERNUMBER', 'Kunde', 'kunde', 'KUNDE', 'Kundenname', 'kundenname', 'KUNDENNAME', 'Kundennummer', 'kundennummer', 'KUNDENNUMMER', 'Name', 'name', 'NAME', 'Client', 'client', 'CLIENT'],
    'Total Risk': ['Total Risk', 'total risk', 'TOTAL RISK', 'TotalRisk', 'totalrisk', 'TOTALRISK', 'Risk', 'risk', 'RISK', 'Risiko', 'risiko', 'RISIKO', 'Score', 'score', 'SCORE', 'Risk Score', 'risk score', 'RISK SCORE', 'RiskScore', 'riskscore', 'RISKSCORE'],
    'ARR': ['ARR', 'arr', 'Arr', 'Annual Recurring Revenue', 'annual recurring revenue', 'ANNUAL RECURRING REVENUE', 'Revenue', 'revenue', 'REVENUE', 'Umsatz', 'umsatz', 'UMSATZ', 'Vertragswert', 'vertragswert', 'VERTRAGSWERT', 'Value', 'value', 'VALUE', 'Wert', 'wert', 'WERT', 'Amount', 'amount', 'AMOUNT']
};

// KORRIGIERT: IDENTISCHE Spaltenerkennung in allen Dateien
function findColumnName(headers, targetColumn) {
    const possibleNames = COLUMN_MAPPINGS[targetColumn] || [targetColumn];
    
    for (const header of headers) {
        for (const possibleName of possibleNames) {
            if (header.toLowerCase().trim() === possibleName.toLowerCase().trim()) {
                console.log(`APP: Found column mapping: "${header}" -> "${targetColumn}"`);
                return header;
            }
        }
    }
    
    console.warn(`APP: Column not found for ${targetColumn}. Available headers:`, headers);
    return null;
}

// KORRIGIERT: IDENTISCHE ultra-robuste Zahlenextraktion in allen Dateien
function extractNumber(value) {
    console.log(`APP: Processing value: "${value}" (type: ${typeof value})`);
    
    if (typeof value === 'number' && !isNaN(value)) {
        console.log(`APP: Already a number: ${value}`);
        return value;
    }
    
    if (value === undefined || value === null || value === '') {
        console.log('APP: Empty value, returning 0');
        return 0;
    }
    
    let stringValue = String(value).trim();
    
    if (stringValue === '' || stringValue === 'N/A' || stringValue === 'n/a' || stringValue === 'NULL') {
        console.log('APP: Invalid string value, returning 0');
        return 0;
    }
    
    console.log(`APP: Processing string: "${stringValue}"`);
    
    let cleanValue = stringValue;
    
    // Entferne Währungszeichen, Buchstaben, Leerzeichen und Prozentzeichen
    cleanValue = cleanValue.replace(/[€$£¥₹₽¢₩₪₨₦₡₵₴₸₼₾₿]/g, '');
    cleanValue = cleanValue.replace(/[A-Za-z]/g, '');
    cleanValue = cleanValue.replace(/[\s]/g, '');
    cleanValue = cleanValue.replace(/[%]/g, '');
    
    console.log(`APP: After removing currency/letters: "${cleanValue}"`);
    
    // Behandle verschiedene Zahlenformate
    if (cleanValue.includes(',') && cleanValue.includes('.')) {
        const lastComma = cleanValue.lastIndexOf(',');
        const lastDot = cleanValue.lastIndexOf('.');
        
        if (lastDot > lastComma) {
            // Amerikanisches Format: 1,234.56
            cleanValue = cleanValue.replace(/,/g, '');
            console.log(`APP: American format detected: "${cleanValue}"`);
        } else {
            // Europäisches Format: 1.234,56
            cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
            console.log(`APP: European format detected: "${cleanValue}"`);
        }
    } else if (cleanValue.includes(',')) {
        const commaCount = (cleanValue.match(/,/g) || []).length;
        const commaPos = cleanValue.indexOf(',');
        const afterComma = cleanValue.substring(commaPos + 1);
        
        if (commaCount === 1 && afterComma.length <= 3 && /^\d+$/.test(afterComma)) {
            // Dezimaltrennzeichen: 123,45
            cleanValue = cleanValue.replace(',', '.');
            console.log(`APP: Comma as decimal separator: "${cleanValue}"`);
        } else {
            // Tausendertrennzeichen: 1,234
            cleanValue = cleanValue.replace(/,/g, '');
            console.log(`APP: Comma as thousand separator: "${cleanValue}"`);
        }
    } else if (cleanValue.includes('.')) {
        const dotCount = (cleanValue.match(/\./g) || []).length;
        const dotPos = cleanValue.lastIndexOf('.');
        const afterDot = cleanValue.substring(dotPos + 1);
        
        if (dotCount === 1 && afterDot.length <= 3 && /^\d+$/.test(afterDot)) {
            // Dezimaltrennzeichen: 123.45
            console.log(`APP: Dot as decimal separator: "${cleanValue}"`);
        } else {
            // Tausendertrennzeichen: 1.234
            cleanValue = cleanValue.replace(/\./g, '');
            console.log(`APP: Dot as thousand separator: "${cleanValue}"`);
        }
    }
    
    cleanValue = cleanValue.replace(/[^\d.\-]/g, '');
    
    console.log(`APP: Final cleaned value: "${cleanValue}"`);
    
    const result = parseFloat(cleanValue) || 0;
    console.log(`APP: Final extracted number: ${result}`);
    
    return result;
}

// KORRIGIERT: IDENTISCHE Datenextraktion in allen Dateien
function extractCustomerData(rawData, headers) {
    console.log('=== APP: Extracting customer data with ultra-robust number conversion ===');
    console.log('APP: Available headers:', headers);
    
    const lcsmColumn = findColumnName(headers, 'LCSM');
    const customerColumn = findColumnName(headers, 'Customer Name');
    const riskColumn = findColumnName(headers, 'Total Risk');
    const arrColumn = findColumnName(headers, 'ARR');
    
    console.log('APP: Column mappings found:', {
        LCSM: lcsmColumn,
        'Customer Name': customerColumn,
        'Total Risk': riskColumn,
        'ARR': arrColumn
    });
    
    return rawData.map((row, index) => {
        const customerName = customerColumn ? (row[customerColumn] || `Customer ${index + 1}`) : `Customer ${index + 1}`;
        const lcsm = lcsmColumn ? (row[lcsmColumn] || 'N/A') : 'N/A';
        
        const totalRisk = riskColumn ? extractNumber(row[riskColumn]) : 0;
        const arr = arrColumn ? extractNumber(row[arrColumn]) : 0;
        
        const extractedData = {
            'Customer Name': customerName,
            'LCSM': lcsm,
            'Total Risk': totalRisk,
            'ARR': arr,
            ...row
        };
        
        console.log(`APP: Extracted customer ${index + 1}:`, {
            name: customerName,
            lcsm: lcsm,
            risk: totalRisk,
            arr: arr,
            originalARR: row[arrColumn],
            originalRisk: row[riskColumn]
        });
        
        return extractedData;
    });
}

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
        riskHistory: SessionManager.riskHistory,
        workflowEntries: SessionManager.workflowEntries,
        notes: SessionManager.notes,
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
        SessionManager.riskHistory = sessionData.riskHistory || {};
        SessionManager.workflowEntries = sessionData.workflowEntries || {};
        SessionManager.notes = sessionData.notes || {};
        
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

    const kpiContainer = document.getElementById('kpiDashboardContainer');
    if (kpiContainer) kpiContainer.classList.remove('active');

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

    const kpiContainer = document.getElementById('kpiDashboardContainer');
    if (kpiContainer) kpiContainer.classList.remove('active');

    sliderMode = 'archive';
    openSlider();
    console.log('Archive function executed');
};

window.openHeatmap = function() {
    console.log('RiskMap toggle function called - checking state');

    const kpiContainer = document.getElementById('kpiDashboardContainer');
    if (kpiContainer) kpiContainer.classList.remove('active');
    
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
    if (!confirm('Clear all data?')) {
        console.log('Logout cancelled by user');
        return;
    }

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
        
        const doneTag = customer.tag === 'Done' ? `<span class="done-tag" onclick="removeFromArchiveSlider(${index})">Done</span>` : '';
        const actionButton = `<button class="table-action-btn remove-btn" onclick="removeFromArchiveSlider(${index})">Remove</button>`;
        
        tableHTML += `
            <tr>
                <td>${escapeHtml(customerName)}</td>
                <td>${escapeHtml(lcsm)}</td>
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
                <td>${doneTag}${actionButton}</td>
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

            unmarkWorkflow(removedRow);

            updateSliderData();
            renderTable(DataUtils.getActiveCustomers(filteredData));
            saveSession();

            showToast('Removed from Archive.');

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

            SessionManager.riskHistory = AppUtils.buildRiskHistory(extractedData);
            if(!SessionManager.workflowEntries) SessionManager.workflowEntries = {};
            
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
                const note = SessionManager.notes && SessionManager.notes[customerKey];
                const preview = note ? note.text.substring(0,50) : '';
                const noteClass = note && note.text ? ' quicknote-has-content' : '';
                if (archiveMode) {
                    tableHTML += `<td>
                        <button class="table-action-btn remove-btn" onclick="removeFromArchive(${index})">Remove</button>
                        <button class="table-action-btn note-btn${noteClass}" onclick="openNoteModal('${customerKey}')" title="${preview}">🗒</button>
                    </td>`;
                } else {
                    tableHTML += `<td>
                        <button class="table-action-btn" onclick="markAsDone(${index})" title="Archive this entry">Archive</button>
                        <button class="table-action-btn" onclick="addCustomerToWorkflow(${index})" title="Add to Workflow">➕ Add to Workflow</button>
                        <button class="table-action-btn note-btn${noteClass}" onclick="openNoteModal('${customerKey}')" title="${preview}">🗒</button>
                    </td>`;
                }
            } else if (col === 'ARR') {
                const arr = parseFloat(row[col]) || 0;
                tableHTML += `<td>€${arr.toLocaleString()}</td>`;
            } else if (col === 'Customer Name') {
                const customerName = row['Customer Name'] || row['Kunde'] || row['Kundenname'] || row['Customer'] || row['Name'] || 'Unknown';
                tableHTML += `<td>${escapeHtml(customerName)}</td>`;
            } else {
                tableHTML += `<td>${escapeHtml(row[col] || '')}</td>`;
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
            const archivedEntry = {...filteredData[originalIndex]};
            erledigtRows.push(archivedEntry);
            if(!SessionManager.archivedRows) SessionManager.archivedRows = [];
            if(!SessionManager.archivedRows.find(r => DataUtils.generateCustomerKey(r) === customerKey)){
                SessionManager.archivedRows.push(archivedEntry);
            }
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

        showToast('Customer archived successfully.');
        
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

            unmarkWorkflow(removedRow);

            renderTable(erledigtRows);

            if (sliderOpen) {
                updateSliderData();
            }

            saveSession();

            showToast('Removed from Archive.');

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

function showKpiDashboard() {
    if (sliderOpen) closeSlider();

    const tableContainer = document.getElementById('tableContainer');
    if (tableContainer) tableContainer.style.display = 'none';

    const kpiContainer = document.getElementById('kpiDashboardContainer');
    if (kpiContainer) {
        kpiContainer.classList.add('active');
        renderKpiDashboard();
        toggleFooter(true);
    }
}

function closeKpiDashboard(){
    const kpiContainer = document.getElementById('kpiDashboardContainer');
    if(kpiContainer) kpiContainer.classList.remove('active');
    toggleFooter(false);
}

function renderKpiDashboard() {
    const container = document.getElementById('kpiDashboardContent');
    if (!container) return;
    container.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'kpi-dashboard-card';

    const controls = document.createElement('div');
    controls.className = 'slider-filters-static filter-header';
    controls.style.background = 'transparent';
    controls.innerHTML = '<h3>Sort Data</h3>';
    const btnWrap = document.createElement('div');
    btnWrap.className = 'filter-buttons filter-bar';
    const metricSelect = document.createElement('select');
    metricSelect.id = 'metricSelect';
    ['ARR','Total Risk','Objective Risk','Contact Risk','Contract Risk'].forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        metricSelect.appendChild(opt);
    });

    const sortAsc = document.createElement('button');
    sortAsc.className = 'sort-btn';
    sortAsc.textContent = '↑';
    const sortDesc = document.createElement('button');
    sortDesc.className = 'sort-btn';
    sortDesc.textContent = '↓';
    const exportBtn = document.createElement('button');
    exportBtn.textContent = '📤 Get Graphic';
    exportBtn.className = 'dashboard-export-btn';
    const toggleHistory = document.createElement('label');
    toggleHistory.innerHTML = '<input type="checkbox" id="toggleRiskHistory"> Show Risk History';

    controls.appendChild(metricSelect);
    btnWrap.appendChild(sortAsc);
    btnWrap.appendChild(sortDesc);
    btnWrap.appendChild(exportBtn);
    controls.appendChild(btnWrap);
    controls.appendChild(toggleHistory);
    card.appendChild(controls);

    const chartArea = document.createElement('div');
    chartArea.className = 'chart-area';

    const chartWrap = document.createElement('div');
    chartWrap.className = 'chart-container chart-scrollable';
    chartWrap.style.height = Math.max(aggregatedData.length * 32, 300) + 'px';
    chartWrap.innerHTML = '<canvas id="kpiChart"></canvas>';
    chartArea.appendChild(chartWrap);

    const historyWrap = document.createElement('div');
    historyWrap.id = 'riskHistoryChartContainer';
    historyWrap.className = 'chart-container';
    historyWrap.style.display = 'none';
    historyWrap.innerHTML = '<select id="riskTypeSelect"><option value="Total">Total Risk</option><option value="Objective">Objective Risk</option><option value="Contact">Contact Risk</option><option value="Contract">Contract Risk</option></select> <select id="riskLevelSelect"><option value="all">All</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select><canvas id="riskHistoryChart"></canvas>';
    chartArea.appendChild(historyWrap);

    card.appendChild(chartArea);

    container.appendChild(card);

    let chart;
    function updateChart() {
        const metric = metricSelect.value;
        const labels = aggregatedData.map(r => r['Customer Name']);
        const data = aggregatedData.map(r => parseFloat(r[metric]) || 0);
        chartWrap.style.height = Math.max(aggregatedData.length * 32, 300) + 'px';
        if (chart) chart.destroy();
        chart = new Chart(document.getElementById('kpiChart').getContext('2d'), {
            type: 'bar',
            data: { labels, datasets:[{ label: metric, data, backgroundColor: '#ffd221' }] },
            options: {
                indexAxis: 'y',
                responsive:true,
                maintainAspectRatio:false,
                plugins:{
                    legend:{labels:{color:'#f1f1f1'}},
                    tooltip:{
                        backgroundColor:'#2c2f33',
                        titleColor:'#fff',
                        bodyColor:'#fff',
                        borderColor:'#555',
                        borderWidth:1,
                        cornerRadius:6,
                        displayColors:false
                    }
                },
                scales:{x:{ticks:{color:'#f1f1f1'}}, y:{ticks:{color:'#f1f1f1'}}}
            }
        });
        window.addEventListener('resize', ()=>chart.resize());
    }

    metricSelect.onchange = updateChart;
    sortAsc.onclick = () => { aggregatedData.sort((a,b)=> (a[metricSelect.value]||0)-(b[metricSelect.value]||0)); updateChart(); };
    sortDesc.onclick = () => { aggregatedData.sort((a,b)=> (b[metricSelect.value]||0)-(a[metricSelect.value]||0)); updateChart(); };
    exportBtn.onclick = () => { if(chart) AppUtils.exportChartAsPng(chart,'kpi-chart.png'); };
    document.getElementById('toggleRiskHistory').onchange = function(){
        historyWrap.style.display = this.checked ? 'block' : 'none';
        if(this.checked) renderRiskHistoryChart();
    };

    updateChart();
}

function renderRiskHistoryChart() {
    const historyWrap = document.getElementById('riskHistoryChartContainer');
    if (!historyWrap) return;
    const riskType = document.getElementById('riskTypeSelect').value;
    const riskLevel = document.getElementById('riskLevelSelect').value;
    const ctx = document.getElementById('riskHistoryChart').getContext('2d');
    const filtered = AppUtils.filterRiskDataByType(SessionManager.riskHistory, riskType);
    const datasets = [];
    Object.keys(filtered).forEach(key => {
        const points = filtered[key].filter(p => {
            const lvl = p.value < 50 ? 'low' : p.value > 100 ? 'high' : 'medium';
            return riskLevel === 'all' || riskLevel === lvl;
        }).map(p => ({x:new Date(p.timestamp), y:p.value, meta:p.entry}));
        if(points.length) datasets.push({label:key,data:points,fill:false,borderColor:'#ffd221'});
    });
    if (window.riskHistoryChart) window.riskHistoryChart.destroy();
    window.riskHistoryChart = new Chart(ctx, {type:'line',data:{datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#f1f1f1'}}}, scales:{x:{type:'time',ticks:{color:'#f1f1f1'}}, y:{ticks:{color:'#f1f1f1'}}}}});
    window.addEventListener('resize', ()=>window.riskHistoryChart.resize());

    ctx.canvas.onclick = function(evt){
        const points = window.riskHistoryChart.getElementsAtEventForMode(evt,'nearest',{intersect:true},true);
        if(points.length){
            const ds = window.riskHistoryChart.data.datasets[points[0].datasetIndex];
            const point = ds.data[points[0].index];
            const info = `<div class='privacy-popup-content'><h3>${ds.label}</h3><p>${riskType} Risk: ${point.y}</p><p>Date: ${new Date(point.x).toLocaleString()}</p></div>`;
            showPopup(info);
        }
    };
}

function showFaqModal() {
    const faqHtml = `<div class='privacy-popup-content'>
        <h3>FAQ</h3>
        <p>This application contains several modules:</p>
        <ul>
            <li><b>📈 KPI Dashboard</b> - Displays customer metrics and allows sorting and exporting.</li>
            <li><b>🧭 RiskMap</b> - Table of active customer risks with filters and Radar details.</li>
            <li><b>📋 Archive</b> - Shows previously archived customers.</li>
            <li><b>➕ Workflow</b> - Customers for manual follow-up managed via Add to Workflow.</li>
            <li><b>🔍 Radar</b> - Detailed popup for a customer with risk breakdown.</li>
            <li><b>💾 Save Session</b> - Stores current session state.</li>
            <li><b>🗒 QuickNotes</b> - Attach editable notes to each customer entry.</li>
        </ul>
    </div>`;
    showPopup(faqHtml);
}

function showPopup(html){
    const inner = document.getElementById('faqPopupInner');
    const bg = document.getElementById('faqPopupBg');
    if(inner && bg){
        inner.innerHTML = html;
        bg.style.display='flex';
    }
}

function hideFaqModal(){
    const bg=document.getElementById('faqPopupBg');
    if(bg) bg.style.display='none';
}

function showToast(message){
    const container = document.getElementById('toastContainer');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(()=>toast.classList.add('show'));
    setTimeout(()=>{
        toast.classList.remove('show');
        setTimeout(()=>toast.remove(),300);
    },2500);
}

function openNoteModal(key){
    const bg = document.getElementById('dialogBg');
    const inner = document.getElementById('dialogInner');
    if(!bg || !inner) return;
    const note = (SessionManager.notes && SessionManager.notes[key]) || {text:'',timestamp:null};
    const allRows = [...filteredData, ...aggregatedData, ...erledigtRows];
    const row = allRows.find(r => DataUtils.generateCustomerKey(r) === key) || {};
    const customerName = row['Customer Name'] || row['Kunde'] || row['Name'] || 'Customer';
    const user = row['LCSM'] || 'User';
    const tsText = note.timestamp ? new Date(note.timestamp).toISOString().slice(0,16).replace('T',' ') : '';
    inner.innerHTML = `
        <div class="slider-header filter-header">
            <h2 class="section-title">Quick Note</h2>
            <button class="close-slider-btn" id="closeNoteBtn">×</button>
        </div>
        <div class="slider-content">
            <table class="data-table">
                <thead><tr><th>Date</th><th>User</th><th>Note</th></tr></thead>
                <tbody>
                    <tr class="table-row">
                        <td class="table-cell"><span class="note-timestamp">${tsText ? '🕒 '+tsText : ''}</span></td>
                        <td class="table-cell">${user}</td>
                        <td class="table-cell"><div id="noteEditor" contenteditable="true" style="min-height:100px;border:1px solid #555;padding:10px;border-radius:6px;">${note.text || ''}</div></td>
                    </tr>
                </tbody>
            </table>
            <div class="filter-bar" style="margin-top:10px;">
                <button class="table-action-btn" id="saveNoteBtn">Save</button>
            </div>
        </div>`;
    bg.style.display = 'flex';
    document.getElementById('saveNoteBtn').onclick = function(){
        const text = document.getElementById('noteEditor').innerHTML;
        if(!SessionManager.notes) SessionManager.notes = {};
        const ts = Date.now();
        SessionManager.notes[key] = {text, timestamp: ts};
        saveSession();
        bg.style.display = 'none';
        renderTable(archiveMode ? erledigtRows : DataUtils.getActiveCustomers(filteredData));
    };
    document.getElementById('closeNoteBtn').onclick = function(){ bg.style.display='none'; };
}
window.openNoteModal = openNoteModal;

window.saveCurrentSession = function(){
    saveSession();
    showToast('Session saved successfully.');
};

function addWorkflowEntry(row){
    const key = DataUtils.generateCustomerKey(row);
    if(!SessionManager.workflowEntries) SessionManager.workflowEntries = {};
    if(!SessionManager.workflowEntries[key]){
        SessionManager.workflowEntries[key] = {
            name: row['Customer Name'] || 'Unknown',
            lcsms: row['LCSM'] || '',
            totalRisk: parseFloat(row['Total Risk']) || 0,
            addedAt: new Date().toISOString(),
            rowData: {...row}
        };
        markInWorkflow(row);
        saveSession();
        renderWorkflowSidebar();
        renderTable(DataUtils.getActiveCustomers(filteredData));
        if(sliderOpen) updateSliderData();
        showToast('Added to Workflow.');
    }
}

function addCustomerToWorkflow(index){
    const active = DataUtils.getActiveCustomers(filteredData);
    if(index < 0 || index >= active.length) return;
    addWorkflowEntry(active[index]);
}

function markInWorkflow(row){
    const idx = DataUtils.findCustomerInArray(filteredData,row);
    if(idx !== -1) filteredData[idx].inWorkflow = true;
    const aIdx = DataUtils.findCustomerInArray(aggregatedData,row);
    if(aIdx !== -1) aggregatedData[aIdx].inWorkflow = true;
}

function unmarkWorkflow(row){
    const idx = DataUtils.findCustomerInArray(filteredData,row);
    if(idx !== -1) filteredData[idx].inWorkflow = false;
    const aIdx = DataUtils.findCustomerInArray(aggregatedData,row);
    if(aIdx !== -1) aggregatedData[aIdx].inWorkflow = false;
}

function toggleWorkflow(){
    const bar = document.getElementById('workflowSidebar');
    if(!bar) return;
    const show = !bar.classList.contains('active');
    if(show){
        renderWorkflowSidebar();
        bar.classList.add('active');
        toggleFooter(true);
    }else{
        bar.classList.remove('active');
        toggleFooter(false);
    }
}

function closeWorkflowSidebar(){
    const bar = document.getElementById('workflowSidebar');
    if(bar && bar.classList.contains('active')){
        bar.classList.remove('active');
        toggleFooter(false);
    }
}

function renderWorkflowSidebar(){
    const bar = document.getElementById('workflowSidebar');
    if(!bar) return;
    const table = bar.querySelector('.workflow-table');
    if(!table) return;
    const entries = SessionManager.workflowEntries || {};
    const rows = Object.values(entries);
    if(rows.length === 0){
        table.innerHTML = '<tr><td>No entries</td></tr>';
        return;
    }
    let html = '<tr><th>Customer</th><th>LCSM</th><th>Total Risk</th><th>Added</th><th>Action</th></tr>';
    Object.entries(entries).forEach(([k,e])=>{
        html += `<tr><td>${e.name}</td><td>${e.lcsms}</td><td>${e.totalRisk}</td><td>${new Date(e.addedAt).toLocaleDateString()}</td><td><button class="table-action-btn" onclick="completeWorkflow(\'${k}\')">Done</button></td></tr>`;
    });
    table.innerHTML = html;
}

window.completeWorkflow = function(key){
    const entry = SessionManager.workflowEntries[key];
    if(!entry) return;
    const row = entry.rowData || {};
    row.erledigt = true;
    row.done = true;
    row.archived = true;
    row.tag = 'Done';
    unmarkWorkflow(row);
    if(DataUtils.findCustomerInArray(erledigtRows,row) === -1){
        erledigtRows.push({...row});
    }
    saveSession();
    delete SessionManager.workflowEntries[key];
    renderWorkflowSidebar();
    renderTable(DataUtils.getActiveCustomers(filteredData));
    if(sliderOpen) updateSliderData();
    showToast('Customer archived successfully.');
};

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
                uploadDataBtn.onclick = () => { closeWorkflowSidebar(); window.triggerUpload(); };
                console.log('Upload Data button listener added');
            }

            const startBtn = document.getElementById('startBtn');
            if (startBtn) {
                startBtn.onclick = () => { closeWorkflowSidebar(); window.goToStart(); };
                console.log('ShowData button listener added');
            }
            
            const logoutSuccess = forceButtonClick('logoutBtn', window.performLogout);
            if (!logoutSuccess) {
                console.error('Logout button not found!');
            }

            const heatmapSuccess = forceButtonClick('heatmapBtn', () => { closeWorkflowSidebar(); window.openHeatmap(); });
            if (!heatmapSuccess) {
                console.error('RiskMap button not found!');
            }
            
            const archiveSuccess = forceButtonClick('archiveBtn', () => { closeWorkflowSidebar(); window.showArchive(); });
            if (!archiveSuccess) {
                console.error('Archive button not found!');
            }

            const kpiSuccess = forceButtonClick('kpiDashboardBtn', () => { closeWorkflowSidebar(); showKpiDashboard(); });
            if (!kpiSuccess) {
                console.error('KPI Dashboard button not found!');
            }

            const saveBtn = document.getElementById('saveSessionBtn');
            if (saveBtn) {
                saveBtn.onclick = window.saveCurrentSession;
            }

            const workflowBtn = document.getElementById('workflowBtn');
            if (workflowBtn) {
                workflowBtn.onclick = toggleWorkflow;
            }

            const closeWorkflowBtn = document.getElementById('closeWorkflowBtn');
            if (closeWorkflowBtn) {
                closeWorkflowBtn.onclick = closeWorkflowSidebar;
            }

            const closeKpiBtn = document.getElementById('closeKpiBtn');
            if (closeKpiBtn) {
                closeKpiBtn.onclick = closeKpiDashboard;
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

            const faqBtn = document.getElementById('faqBtn');
            if (faqBtn) {
                faqBtn.onclick = showFaqModal;
            }

            const faqBg = document.getElementById('faqPopupBg');
            if (faqBg) {
                faqBg.addEventListener('click', function(e){
                    if(e.target === this) hideFaqModal();
                });
            }

            const logSelect = document.getElementById('logLevelSelect');
            if (logSelect && window.Logger) {
                logSelect.value = Logger.getLevel();
                logSelect.addEventListener('change', function(){
                    Logger.saveLevel(this.value);
                });
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
