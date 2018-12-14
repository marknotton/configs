////////////////////////////////////////////////////////////////////////////////
// Configs
////////////////////////////////////////////////////////////////////////////////

// =============================================================================
// Settings
// =============================================================================

'use strict'

// Dependencies
const path      = require('path'),                            // Handles and normalises file paths
      fs        = require('fs-extra'),                        // File system add, edit, and remove
      argv      = require('minimist')(process.argv.slice(2)), // Grabs flags passed via command
      deepmerge = require('deepmerge'),                       // Deep Merges Arrays/Ojects
      log       = require('@marknotton/lumberjack'),
			clearModule = require('clear-module');

const flags = Object.keys(argv).slice(1);
let cache = null;
let defaultConfig = 'config.json';

module.exports.grab = grab;
module.exports.create = create;
module.exports.update = update;

// =============================================================================
// Public Functions
// =============================================================================

// Create ----------------------------------------------------------------------

function update() {

	let args = arguments[0];

	// Updates will need to clear the require cache of the config.json file. We
	// can set that by setting the 'clear' argument to true;
	args['clear'] = true;

	// We'll also clear and previous cache.
	cache = null;

	return create(args);
}

// Create ----------------------------------------------------------------------

function create() {

  let args  = arguments[0];
	let force = false;
	let type = 'Updated:';

	if (!cache) {
		cache = Object.assign({}, args);
	}

	if (typeof args == 'undefined' && cache != null ) {
		args = Object.assign({}, cache);
		force = true;
		type = 'Recreated:';
	}

	let config = grab(args);

  fs.access('config.lock', (err) => {
    if (err) { type = 'Created:' }
  });

	// Get the current config.lock data so that is can be compared to.
	// IF the config settings has changed at all, generate a new .lock file.
	fs.readJson('config.lock', (err, data) => {
		if (force || err || JSON.stringify(data) != JSON.stringify(config)) {
			fs.writeFile('config.lock', JSON.stringify(config, null, 2), function(err) {
				log(type, 'config.lock', !force);
			});
		}
	})

  return config;
}

// Grab ------------------------------------------------------------------------

function grab() {

  // If an object was passed, destructure by checking for these variables.
  // Defaults are applied if 'file', isn't found.
  if ( typeof arguments[0] == 'object') {
    var { file = defaultConfig, env, flag, directory, dynamic = ['paths'], clear = false} = arguments[0];
  } else {
    // If anything else was passed (presumably a string), use this as the file.
    var file = arguments[0] || defaultConfig;
  }

	// Clear the require cache so that the next line renders the file from fresh.
	if ( clear ) {
		clearModule(path.join(process.cwd()) + '/' + file);
	}

  // Get the config file relative to the gulpfile.js file
	var config = require(path.join(process.cwd(), file));

  // Grab any arguments flags that were passed via the command line.
  var siteFlag = flag || flags[0] || config['default-site'] || config['default'] || undefined;

  var envFlags = [env];

  // Run through every element in the config
  Object.keys(config).map(key => {

    let value = config[key];

    // If an element is an object, and contains default settings defined with a "*" key
    if ( typeof value == 'object' && typeof value['*'] !== 'undefined') {

      // Then check if any of the keys within this object matches any of the passed flags
      let matched = flags.filter(element => Object.keys(value).includes(element))[0];

      // If no flag was found, fallback to the current enviroment variable
      let flag = typeof matched !== 'undefined' ? matched : env;

      // Add cnofirmed env flags to the envFlag array so we can skip this flag for site flags intead.
      envFlags.push(flag);

      // Default results
      let results =  typeof value['*'] !== 'undefined' ? value['*'] : value;

      // Perform a deep merge if there are default [ * ] settings, and enviroment settings found.
      if ( typeof value['*'] !== 'undefined' && typeof value[flag] !== 'undefined' ) {

        results = deepmerge( value['*'],  value[flag]);

      }

      // Replace existing confug value with the now merged setting;
      config[key] = results;
    }

  });

  // Remove duplicate env flags
  var envFlags = Array.from(new Set(envFlags));

  // Site flag can not be an environment flag. Reset the siteFlag
  if ( envFlags.includes(siteFlag) ) {
    siteFlag = flag || flags.filter(a => a !== siteFlag)[0] || config['default-site'] || config['default'] || undefined;
  }

  var flag = flag || flags.filter(a => a !== siteFlag)[0] || env;

  // If there is a site flag, start the search for the additional config file
  if ( siteFlag !== 'undefined' ) {

    // Find dev path if one wasn't passed
    directory = directory || config.paths['src'] ||  'src';

    // Search for config file
    let content = false;

    let filePath = '';

    // Try to find the multi site config file
    try {

      // Loop through all files and folders in the dev directory
      fs.readdirSync(path.join(process.cwd(), directory)).forEach(dir => {

        // Check if the the path is a directory
        if(fs.statSync(path.join(process.cwd(), directory, dir)).isDirectory()) {

          // Check is all or part of the flag exists in one of the directories
          if (siteFlag == dir || dir.indexOf(siteFlag) !== -1) {

            // Deep merge all config settings.
            filePath = path.join(process.cwd(), directory, dir, file);
            content = require(filePath);
          }
        }
      });

    } catch (e) {

      console.warn('Either there is a syntax error, or the config file associated with the "'+ siteFlag + '" flag doesn\'t exist' + (filePath !== '' ? (':\n' + filePath) : '.'));

    }

    // TODO: Figure out why I can't merge multiple config.json files due to this error:
    // Unexpected token [ in JSON at position
    // If config file was found, deepmerge it to the configs
    if ( content !== false) {
      config = deepmerge(config, content);
    }

  }

  // Add trailing slashes to string in the paths object;
  for(let p in config.paths) {
    let value = config.paths[p];
    config.paths[p] = value.length ? value.replace(/\/?$/, '/') : value;
  }

  for(let i in dynamic) {

    let key = dynamic[i];

    // Convert the paths object to a string
    var pathsToString = JSON.stringify(config[key]);

    // Replace any dynamic variables defined in the paths array specifically;
    for(let p in Object.assign(config[key], {"site":config.site})) {
      pathsToString = pathsToString.replace(new RegExp('{'+ p +'}', 'g'), config[key][p]);
    }

    // Convert the paths string back to an object
    config[key] = JSON.parse(pathsToString);

  }

  // Covnert the entire config object to a string
  var configToString = JSON.stringify(config);

  for(let i in dynamic) {

    let key = dynamic[i];

    // Replace any dynamic variables defined in the config files.
    for(let p in config[key]) {
      configToString = configToString.replace(new RegExp('{'+ p +'}', 'g'), config[key][p]);
    }

  }

  // Remove any double slashes
  configToString = configToString.replace(new RegExp('([^:])(\/\/+)', 'g'), '$1/');

  // Convert the config string back to a string
  config = JSON.parse(configToString);

  return config;

}
