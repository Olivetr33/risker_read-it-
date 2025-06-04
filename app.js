// app.js - KORRIGIERT: Verbesserte Excel-Verarbeitung mit robuster Zahlen- und Namenerkennung

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

// ERWEITERTE Spalten-Mapping für maximale Flexibilität
const COLUMN_MAPPINGS = {
    'LCSM': ['LCSM', 'lcsm', 'Lcsm', 'LcsM', 'SACHBEARBEITER', 'sachbearbeiter', 'Sachbearbeiter', 'CSM', 'csm', 'Csm', 'Manager', 'manager', 'MANAGER', 'Betreuer', 'betreuer', 'BETREUER', 'Account Manager', 'account manager', 'ACCOUNT MANAGER', 'Customer Success Manager', 'customer success manager', 'Ansprechpartner', 'ansprechpartner', 'ANSPRECHPARTNER'],
    'Customer Name': ['Customer Name', 'customer name', 'CUSTOMER NAME', 'CustomerName', 'customername', 'CUSTOMERNAME', 'Customer_Name', 'customer_name', 'CUSTOMER_NAME', 'Customer Number', 'customer number', 'CUSTOMER NUMBER', 'CustomerNumber', 'customernumber', 'CUSTOMERNUMBER', 'Customer_Number', 'customer_number', 'CUSTOMER_NUMBER', 'Kunde', 'kunde', 'KUNDE', 'Kundenname', 'kundenname', 'KUNDENNAME', 'Kunden Name', 'kunden name', 'KUNDEN NAME', 'Kundennummer', 'kundennummer', 'KUNDENNUMMER', 'Kunden Nummer', 'kunden nummer', 'KUNDEN NUMMER', 'Name', 'name', 'NAME', 'Client', 'client', 'CLIENT', 'Client Name', 'client name', 'CLIENT NAME', 'Company', 'company', 'COMPANY', 'Company Name', 'company name', 'COMPANY NAME', 'Firma', 'firma', 'FIRMA', 'Firmenname', 'firmenname', 'FIRMENNAME'],
    'Total Risk': ['Total Risk', 'total risk', 'TOTAL RISK', 'TotalRisk', 'totalrisk', 'TOTALRISK', 'Total_Risk', 'total_risk', 'TOTAL_RISK', 'Risk', 'risk', 'RISK', 'Risiko', 'risiko', 'RISIKO', 'Score', 'score', 'SCORE', 'Risk Score', 'risk score', 'RISK SCORE', 'RiskScore', 'riskscore', 'RISKSCORE', 'Risk_Score', 'risk_score', 'RISK_SCORE', 'Gesamtrisiko', 'gesamtrisiko', 'GESAMTRISIKO', 'Gesamt Risiko', 'gesamt risiko', 'GESAMT RISIKO', 'Total', 'total', 'TOTAL'],
    'ARR': ['ARR', 'arr', 'Arr', 'A.R.R.', 'a.r.r.', 'Annual Recurring Revenue', 'annual recurring revenue', 'ANNUAL RECURRING REVENUE', 'Revenue', 'revenue', 'REVENUE', 'Umsatz', 'umsatz', 'UMSATZ', 'Jahresumsatz', 'jahresumsatz', 'JAHRESUMSATZ', 'Vertragswert', 'vertragswert', 'VERTRAGSWERT', 'Value', 'value', 'VALUE', 'Wert', 'wert', 'WERT', 'Amount', 'amount', 'AMOUNT', 'Betrag', 'betrag', 'BETRAG', 'Contract Value', 'contract value', 'CONTRACT VALUE', 'Vertragssumme', 'vertragssumme', 'VERTRAGSSUMME']
};

// VERBESSERTE Spaltenerkennung ohne Case-Sensitivity
function findColumnName(headers, targetColumn) {
    const possibleNames = COLUMN_MAPPINGS[targetColumn] || [targetColumn];
    
    // Normalisiere alle Header (entferne Leerzeichen am Anfang/Ende und mehrfache Leerzeichen)
    const normalizedHeaders = headers.map(h => h ? h.toString().trim().replace(/\s+/g, ' ') : '');
    
    for (let i = 0; i < normalizedHeaders.length; i++) {
        const header = normalizedHeaders[i];
        if (!header) continue;
        
        // Prüfe jede mögliche Variante
        for (const possibleName of possibleNames) {
            // Case-insensitive Vergleich mit normalisierten Strings
            if (header.toLowerCase() === possibleName.toLowerCase()) {
                console.log(`APP: Found column mapping: "${headers[i]}" -> "${targetColumn}"`);
                return headers[i]; // Gib den Original-Header zurück
            }
        }
    }
    
    // Fallback: Suche nach teilweisen Übereinstimmungen
    for (let i = 0; i < normalizedHeaders.length; i++) {
        const header = normalizedHeaders[i].toLowerCase();
        if (!header) continue;
        
        // Spezielle Logik für verschiedene Spalten
        if (targetColumn === 'Customer Name') {
            if (header.includes('customer') || header.includes('kunde') || header.includes('client') || header.includes('company') || header.includes('firma') || header.includes('name')) {
                console.log(`APP: Found partial match for Customer Name: "${headers[i]}"`);
                return headers[i];
            }
        } else if (targetColumn === 'ARR') {
            if (header.includes('arr') || header.includes('revenue') || header.includes('umsatz') || header.includes('value') || header.includes('wert') || header.includes('amount') || header.includes('betrag')) {
                console.log(`APP: Found partial match for ARR: "${headers[i]}"`);
                return headers[i];
            }
        } else if (targetColumn === 'Total Risk') {
            if (header.includes('risk') || header.includes('risiko') || header.includes('score')) {
                console.log(`APP: Found partial match for Total Risk: "${headers[i]}"`);
                return headers[i];
            }
        } else if (targetColumn === 'LCSM') {
            if (header.includes('lcsm') || header.includes('csm') || header.includes('manager') || header.includes('betreuer') || header.includes('sachbearbeiter')) {
                console.log(`APP: Found partial match for LCSM: "${headers[i]}"`);
                return headers[i];
            }
        }
    }
    
    console.warn(`APP: Column not found for ${targetColumn}. Available headers:`, headers);
    return null;
}

// VERBESSERTE Zahlenextraktion mit besserer Formatierung
function extractNumber(value) {
    console.log(`APP: Processing value: "${value}" (type: ${typeof value})`);
    
    // Wenn es bereits eine Zahl ist
    if (typeof value === 'number' && !isNaN(value)) {
        console.log(`APP: Already a number: ${value}`);
        return value;
    }
    
    // Leere Werte
    if (value === undefined || value === null || value === '') {
        console.log('APP: Empty value, returning 0');
        return 0;
    }
    
    let stringValue = String(value).trim();
    
    // Ungültige String-Werte
    if (stringValue === '' || stringValue.toLowerCase() === 'n/a' || stringValue.toLowerCase() === 'null' || stringValue === '-') {
        console.log('APP: Invalid string value, returning 0');
        return 0;
    }
    
    console.log(`APP: Processing string: "${stringValue}"`);
    
    let cleanValue = stringValue;
    
    // Entferne alle Währungszeichen und Buchstaben
    cleanValue = cleanValue.replace(/[€$£¥₹₽¢₩₪₨₦₡₵₴₸₼₾₿]/g, '');
    cleanValue = cleanValue.replace(/EUR|USD|GBP|CHF/gi, '');
    
    // Entferne alle Buchstaben (außer Komma und Punkt)
    cleanValue = cleanValue.replace(/[A-Za-z]/g, '');
    
    // Entferne Leerzeichen
    cleanValue = cleanValue.replace(/\s/g, '');
    
    // Entferne Prozentzeichen
    cleanValue = cleanValue.replace(/%/g, '');
    
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
        // Prüfe ob Komma als Dezimaltrennzeichen verwendet wird
        const parts = cleanValue.split(',');
        if (parts.length === 2 && parts[1].length <= 3 && /^\d+$/.test(parts[1])) {
            // Dezimaltrennzeichen: 123,45
            cleanValue = cleanValue.replace(',', '.');
            console.log(`APP: Comma as decimal separator: "${cleanValue}"`);
        } else {
            // Tausendertrennzeichen: 1,234
            cleanValue = cleanValue.replace(/,/g, '');
            console.log(`APP: Comma as thousand separator: "${cleanValue}"`);
        }
    } else if (cleanValue.includes('.')) {
        // Prüfe ob Punkt als Tausendertrennzeichen verwendet wird
        const parts = cleanValue.split('.');
        if (parts.length > 2 || (parts.length === 2 && parts[1].length > 3)) {
            // Tausendertrennzeichen: 1.234
            cleanValue = cleanValue.replace(/\./g, '');
            console.log(`APP: Dot as thousand separator: "${cleanValue}"`);
        } else {
            // Dezimaltrennzeichen: 123.45 (nichts zu tun)
            console.log(`APP: Dot as decimal separator: "${cleanValue}"`);
        }
    }
    
    // Entferne alle verbleibenden nicht-numerischen Zeichen (außer Punkt und Minus)
    cleanValue = cleanValue.replace(/[^\d.\-]/g, '');
    
    console.log(`APP: Final cleaned value: "${cleanValue}"`);
    
    const result = parseFloat(cleanValue) || 0;
    console.log(`APP: Final extracted number: ${result}`);
    
    return result;
}

// VERBESSERTE Datenextraktion
function extractCustomerData(rawData, headers) {
    console.log('=== APP: Extracting customer data with improved mappings ===');
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
        // Extrahiere Kundennamen mit Fallback-Logik
        let customerName = 'Unknown Customer';
        if (customerColumn && row[customerColumn]) {
            customerName = String(row[customerColumn]).trim();
        } else {
            // Fallback: Suche in allen Spalten nach einem sinnvollen Namen
            for (const header of headers) {
                const value = row[header];
                if (value && typeof value === 'string' && value.trim().length > 2) {
                    const lowerHeader = header.toLowerCase();
                    if (lowerHeader.includes('name') || lowerHeader.includes('kunde') || lowerHeader.includes('client') || lowerHeader.includes('company')) {
                        customerName = value.trim();
                        break;
                    }
                }
            }
        }
        
        // Stelle sicher, dass wir einen sinnvollen Namen haben
        if (customerName === 'Unknown Customer' || !customerName) {
            customerName = `Customer ${index + 1}`;
        }
        
        const lcsm = lcsmColumn ? (row[lcsmColumn] || 'N/A') : 'N/A';
        const totalRisk = riskColumn ? extractNumber(row[riskColumn]) : 0;
        const arr = arrColumn ? extractNumber(row[arrColumn]) : 0;
        
        const extractedData = {
            'Customer Name': customerName,
            'LCSM': lcsm,
            'Total Risk': totalRisk,
            'ARR': arr,
            ...row // Behalte alle Original-Daten
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
                <td>${customerName}</td>
                <td>${lcsm}</td>
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

// KORRIGIERT: File Upload mit BESSEREN XLSX-Optionen für korrekte Zahlenverarbeitung
function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            console.log('=== APP: File Upload Started ===');
            
            const data = new Uint8Array(event.target.result);
            
            // KORRIGIERT: Verwende raw: true für korrekte Zahlenverarbeitung
            const workbook = XLSX.read(data, { 
                type: 'array',
                raw: true,           // WICHTIG: Behalte Rohwerte (Zahlen bleiben Zahlen)
                cellDates: true,     // Datumswerte korrekt erkennen
                cellNF: false,       // Keine Formatierung anwenden
                cellText: false      // Keine Text-Formatierung
            });
            
            const sheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheet];
            
            // KORRIGIERT: Bessere JSON-Konvertierung
            const json = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                raw: true,           // WICHTIG: Rohwerte beibehalten
                defval: '',          // Leere Zellen als leerer String
                blankrows: false,    // Leere Zeilen überspringen
                dateNF: 'dd/mm/yyyy' // Datumsformat
            });

            // Extrahiere Header und bereinige sie
            headers = json[0].map(header => {
                if (header === null || header === undefined) return '';
                return String(header).replace(/\s+/g, ' ').trim();
            }).filter(header => header !== '');

            console.log("DEBUG: HEADER-ARRAY:", headers);      // <-- NEU!
            console.log("DEBUG: JSON[0]:", json[0]);           // <-- NEU!
            console.log("DEBUG: JSON (Länge):", json.length);  // <-- NEU!

            window.headers = headers;
            console.log('APP: Original headers found:', headers);
            
            // Konvertiere Zeilen zu Objekten
            let rawData = [];
            for (let i = 1; i < json.length; i++) {
                const row = json[i];
                if (!row || row.length === 0) continue;
                
                // Prüfe ob die Zeile nicht komplett leer ist
                let hasData = false;
                for (let j = 0; j < row.length; j++) {
                    if (row[j] !== null && row[j] !== undefined && String(row[j]).trim() !== '') {
                        hasData = true;
                        break;
                    }
                }
                
                if (!hasData) continue;
                
                let obj = {};
                headers.forEach((header, j) => {
                    if (header) {
                        // Behalte den Rohwert bei
                        obj[header] = row[j] !== undefined ? row[j] : '';
                    }
                });
                
                rawData.push(obj);
            }

            console.log(`APP: Raw data extracted: ${rawData.length} rows`);
            
            // Debug: Zeige die ersten paar Zeilen
            if (rawData.length > 0) {
                console.log('APP: First 3 rows of raw data:', rawData.slice(0, 3));
            }
            
            // Extrahiere und transformiere die Daten
            const extractedData = extractCustomerData(rawData, headers);
            console.log(`APP: Extracted data: ${extractedData.length} customers`);
            
            if (extractedData.length > 0) {
                console.log('APP: Sample extracted customer:', extractedData[0]);
                console.log('APP: ARR values in first 5 customers:', extractedData.slice(0, 5).map(c => ({
                    name: c['Customer Name'],
                    arr: c.ARR,
                    risk: c['Total Risk']
                })));
                
                // Prüfe ob wir vernünftige Daten haben
                const hasValidData = extractedData.some(c => c.ARR > 0 || c['Total Risk'] > 0);
                if (!hasValidData) {
                    console.warn('APP: Warning - No valid numeric data found. Check column mappings.');
                }
            }
            
            // Speichere die Daten
            excelData = extractedData;
            aggregatedData = extractedData;
            originalAggregatedData = [...extractedData];
            
            // Merge mit bestehenden erledigten Rows
            filteredData = DataUtils.mergeSessionWithData(erledigtRows, extractedData);
            selectedLCSM = 'ALL';
            window.headers = headers;
            window.excelData = excelData;
            window.filteredData = filteredData;
            window.rawData = rawData; // falls rawData im Code existiert
            console.log('APP: Final data prepared:', {
                excelData: excelData.length,
                aggregatedData: aggregatedData.length,
                filteredData: filteredData.length
            });
            
            // Render UI
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
            alert(`Datei erfolgreich hochgeladen: ${extractedData.length} Kunden verarbeitet`);
            
        } catch (error) {
            console.error('APP: Processing error:', error);
            alert(`Fehler beim Verarbeiten der Datei: ${error.message}`);
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
                        ">Mark Done</button>
                    </td>`;
                }
            } else if (col === 'ARR') {
                const arr = parseFloat(row[col]) || 0;
                tableHTML += `<td>€${arr.toLocaleString()}</td>`;
            } else if (col === 'Customer Name') {
                const customerName = row['Customer Name'] || row['Kunde'] || row['Kundenname'] || row['Customer'] || row['Name'] || 'Unknown';
                tableHTML += `<td>${customerName}</td>`;
            } else {
                tableHTML += `<td>${row[col] || ''}</td>`;
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