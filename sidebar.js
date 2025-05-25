// Bindet die Sidebar-Buttons an die globalen App-Funktionen
window.addEventListener('DOMContentLoaded', () => {
    on('startBtn', 'click', () => window.goToStart());
    on('changeLcsmBtn', 'click', () => window.showLCSMDialog());
    on('archiveBtn', 'click', () => window.showArchive());
    on('saveBtn', 'click', () => window.saveSession());
    on('migrateBtn', 'click', () => window.migrateSession());
    on('logoutBtn', 'click', () => window.logout());
});
