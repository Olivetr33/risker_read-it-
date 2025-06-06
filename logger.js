(function(global){
    const origConsole = {
        log: global.console.log.bind(global.console),
        info: global.console.info ? global.console.info.bind(global.console) : global.console.log.bind(global.console),
        warn: global.console.warn ? global.console.warn.bind(global.console) : global.console.log.bind(global.console),
        error: global.console.error ? global.console.error.bind(global.console) : global.console.log.bind(global.console),
    };

    const levels = { debug: 0, info: 1, warn: 2, error: 3, none: 4 };

    const filters = { debug: true, info: true, warn: true, error: true };

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

    const logger = {
        levels,
        setLevel,
        saveLevel,
        getLevel,
        setFilter,
        debug: (...args) => { if (isEnabled(levels.debug, 'debug')) origConsole.log(...args); },
        info: (...args) => { if (isEnabled(levels.info, 'info')) origConsole.info(...args); },
        warn: (...args) => { if (isEnabled(levels.warn, 'warn')) origConsole.warn(...args); },
        error: (...args) => { if (isEnabled(levels.error, 'error')) origConsole.error(...args); },
    };

    global.Logger = logger;
    global.console.log = logger.debug;
    if(global.console.info) global.console.info = logger.info;
    if(global.console.warn) global.console.warn = logger.warn;
    if(global.console.error) global.console.error = logger.error;
})(window);
