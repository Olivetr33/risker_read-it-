(function(global){
    const origConsole = {
        log: global.console.log.bind(global.console),
        info: global.console.info ? global.console.info.bind(global.console) : global.console.log.bind(global.console),
        warn: global.console.warn ? global.console.warn.bind(global.console) : global.console.log.bind(global.console),
        error: global.console.error ? global.console.error.bind(global.console) : global.console.log.bind(global.console),
        debug: global.console.debug ? global.console.debug.bind(global.console) : global.console.log.bind(global.console)
    };

    const levels = { debug: 0, info: 1, warn: 2, error: 3, none: 4 };

    const filters = { debug: true, info: true, warn: true, error: true };
    const logs = [];

    function loadLevel() {
        const stored = global.localStorage ? localStorage.getItem('logLevel') : null;
        const levelName = (stored || global.LOG_LEVEL || 'info').toLowerCase();
        return levels[levelName] !== undefined ? levels[levelName] : levels.info;
    }

    let currentLevel = loadLevel();

    function setFilter(level, enabled){
        if(filters.hasOwnProperty(level)){
            filters[level] = !!enabled;
        }
    }

    function isEnabled(levelIndex, levelName){
        return currentLevel <= levelIndex && filters[levelName];
    }

    function setLevel(level){
        if (typeof level === 'string') level = levels[level.toLowerCase()];
        if (level === undefined) return;
        currentLevel = level;
    }

    function saveLevel(levelName){
        if(typeof levelName === 'string'){
            if(global.localStorage){
                localStorage.setItem('logLevel', levelName.toLowerCase());
            }
            setLevel(levelName);
        }
    }

    function getLevel(){
        for(const key in levels){
            if(levels[key] === currentLevel) return key;
        }
        return 'info';
    }

    function log(level, args){
        const ts = new Date().toISOString();
        logs.push({timestamp: ts, level, message: args.join(' ')});
        if(isEnabled(levels[level], level)) {
            if (typeof origConsole[level] === 'function') {
                origConsole[level](...args);
            } else if (typeof origConsole.log === 'function') {
                origConsole.log(...args);
            } else {
                global.console.error('Logger error: Missing method:', level);
            }
        }
        display();
    }

    function display(){
        const el = global.document ? document.getElementById('debugLog') : null;
        if(!el) return;
        el.innerHTML = '';
        logs.forEach(entry => {
            if(filters[entry.level]){
                const div = document.createElement('div');
                div.textContent = `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;
                el.appendChild(div);
            }
        });
    }

    const logger = {
        levels,
        setLevel,
        saveLevel,
        getLevel,
        setFilter,
        logs,
        display,
        debug: (...args) => { log('debug', args); },
        info: (...args) => { log('info', args); },
        warn: (...args) => { log('warn', args); },
        error: (...args) => { log('error', args); },
    };

    global.Logger = logger;
    global.console.log = logger.debug;
    if(global.console.info) global.console.info = logger.info;
    if(global.console.warn) global.console.warn = logger.warn;
    if(global.console.error) global.console.error = logger.error;
})(window);
