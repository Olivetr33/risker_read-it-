// Utility functions for DOM and common tasks

/**
 * Hole ein Element per ID
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function $(id) {
    return document.getElementById(id);
}

/**
 * Zeige ein Element (display: block)
 * @param {HTMLElement|string} el
 */
function show(el) {
    if (typeof el === "string") el = $(el);
    if (el) el.style.display = 'block';
}

/**
 * Verstecke ein Element (display: none)
 * @param {HTMLElement|string} el
 */
function hide(el) {
    if (typeof el === "string") el = $(el);
    if (el) el.style.display = 'none';
}

/**
 * Füge einen Event-Listener zu einem Element hinzu
 * @param {string} id
 * @param {string} event
 * @param {function} handler
 */
function on(id, event, handler) {
    const el = $(id);
    if (el) el.addEventListener(event, handler);
}
