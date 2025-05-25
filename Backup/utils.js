// Utility: Einfaches Event-Binding per ID
function on(id, event, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
}

// Utility: Shortcut für DOM-Selektor
function $(selector, scope = document) {
    return scope.querySelector(selector);
}

// Utility: Mehrere DOM-Elemente selektieren
function $all(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
}

// Utility: String mit erstem Buchstaben groß
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Utility: Array chunking
function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

// Utility: Debounce (z.B. für Suchfelder)
function debounce(fn, delay = 300) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

// Utility: Throttle (z.B. für Scroll-Events)
function throttle(fn, limit = 300) {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
