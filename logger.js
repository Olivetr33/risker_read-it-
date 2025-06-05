(function(global){
    const origConsole = {
        log: global.console.log.bind(global.console),
        info: global.console.info ? global.console.info.bind(global.console) : global.console.log.bind(global.console),
        warn: global.console.warn ? global.console.warn.bind(global.console) : global.console.log.bind(global.console),
        error: global.console.error ? global.console.error.bind(global.console) : global.console.log.bind(global.console),
    };

    const levels = { debug: 0, info: 1, warn: 2, error: 3, none: 4 };
    let currentLevel = levels[(global.LOG_LEVEL || 'info').toLowerCase()] || levels.info;

    function setLevel(level){
        if (typeof level === 'string') level = levels[level.toLowerCase()];
        if (level === undefined) return;
        currentLevel = level;
    }

    const logger = {
        levels,
        setLevel,
        debug: (...args) => { if (currentLevel <= levels.debug) origConsole.log(...args); },
        info: (...args) => { if (currentLevel <= levels.info) origConsole.info(...args); },
        warn: (...args) => { if (currentLevel <= levels.warn) origConsole.warn(...args); },
        error: (...args) => { if (currentLevel <= levels.error) origConsole.error(...args); },
    };

    global.Logger = logger;
    global.console.log = logger.debug;
    if(global.console.info) global.console.info = logger.info;
    if(global.console.warn) global.console.warn = logger.warn;
    if(global.console.error) global.console.error = logger.error;
})(window);
