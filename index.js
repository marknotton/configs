////////////////////////////////////////////////////////////////////////////////
// Settings
////////////////////////////////////////////////////////////////////////////////

'use strict'

// Dependencies
const path      = require('path'),                            // Handles and normalises file paths
      fs        = require('fs'),                              // File system add, edit, and remove
      argv      = require('minimist')(process.argv.slice(2)), // Grabs flags passed via command
      deepmerge = require('deepmerge');                       // Deep Merges Arrays/Ojects

const cwd = process.cwd();
const flags = Object.keys(argv).slice(1);

module.exports.grab = grab;

////////////////////////////////////////////////////////////////////////////////
// Public Functions
////////////////////////////////////////////////////////////////////////////////

function grab() {

  let defaultConfig = 'config.json';

  // If an object was passed, destructure by checking for these variables.
  // Defaults are applied if 'file', isn't found.
  if ( typeof arguments[0] == 'object') {
    var { file = defaultConfig, env, flag, directory } = arguments[0];
  } else {
    // If anything else was passed (presumably a string), use this as the file.
    var file = arguments[0] || defaultConfig;
  }

  // Get the config file relative to the gulpfile.js file
  var config = require(path.join(cwd, file));

  // Grab any arguments flags that were passed via the command line.
  var siteFlag = flag || flags[0] || config['default-site'] || config['default'] || undefined;

  var envFlags = [env];

  // Run through every element in the config
  var envConfigMerged = Object.keys(config).reduce((result, val) => {

    // If an element is an object, and contains default settings defined with a "*" key
    if ( typeof config[val] == 'object' && typeof config[val]['*'] !== 'undefined') {

      // Then check if any of the keys within this object matches any of the passed flags
      let matched = flags.filter(element => Object.keys(config[val]).includes(element))[0];

      // If no flag was found, fallback to the current enviroment variable
      let flag = typeof matched !== 'undefined' ? matched : env;

      // Add cnofirmed env flags to the envFlag array so we can skip this flag for site flags intead.
      envFlags.push(flag);

      // Default results
      let results =  typeof config[val]['*'] !== 'undefined' ? config[val]['*'] : config[val];

      // Perform a deep merge if there are default [ * ] settings, and enviroment settings found.
      if ( typeof config[val]['*'] !== 'undefined' && typeof config[val][flag] !== 'undefined' ) {

        results = deepmerge( config[val]['*'],  config[val][flag]);

      }

      result.push(results);
    }
    return result;
  }, []);

  // Remove duplicate env flags
  var envFlags = Array.from(new Set(envFlags));

  // Site flag can not be an environment flag. Reset the siteFlag
  if ( envFlags.includes(siteFlag) ) {
    siteFlag = flag || config['default-site'] || config['default'] || undefined;
  }

  // If there is a site flag, start the search for the additional config file
  if ( siteFlag !== 'undefined' ) {

    // Find dev path is one wasn't passed
    directory = directory || config.paths['src'] || 'src';

    // Search for config file
    let content = false;

    // Try to find the multi site config file
    try {

      // Loop through all files and fodlers in the dev directory
      fs.readdirSync(path.join(cwd, directory)).forEach(dir => {

        // Check if the the path is a directory
        if(fs.statSync(path.join(cwd, directory, dir)).isDirectory()) {

          // Check is all or part of the flag exists in one of the directories
          if (siteFlag == dir || dir.indexOf(siteFlag) !== -1) {
            // Deep merge all config settings.
            content = require(path.join(cwd, directory, dir, file));
          }
        }
      });

    } catch (e) {

      console.warn('Could not find a config file associated with the flag '+flag);

    }

    // If config file was found, deepmerge it to the configs
    if ( content !== false) {
      config = deepmerge(config, content);
    }

  }

  // Get all config settings
  var envFlags = config.settings['*'] !== 'undefined' ? Object.keys(config.settings) : undefined;
  // If one of the settings has a key of '*', assume there are going to be other
  // environemnt options and remove the '*' key so only environmental keys exist.
  if ( envFlags ) {
    envFlags.splice(envFlags.indexOf('*'), 1);

    for (var i in flags) {
      if ( envFlags.includes(flags[i]) ) {
        env = flags[i];
        break;
      }
    }
  }

  // Check if there are any environmental settings. Merge the passed enviroment settings and flatting settings object
  if ('*' in config.settings ) {
    if ( typeof env !== 'undefined' && env in config.settings) {
      config.settings = Object.assign(config.settings['*'], config.settings[env]);;
    } else {
      config.settings = config.settings['*'];
    }
  }

  // Check if there are any environmental paths. Merge the passed enviroment path and flatting paths object
  if ('*' in config.paths ) {
    if ( typeof env !== 'undefined' && env in config.paths) {
      config.paths = Object.assign(config.paths['*'], config.paths[env]);;
    } else {
      config.paths = config.paths['*'];
    }
  }

  // Add trailing slashes to string in the paths object;
  for(let p in config.paths) {
    let value = config.paths[p];
    config.paths[p] = value.length ? value.replace(/\/?$/, '/') : value;
  }

  // Convert the paths object to a string
  var pathsToString = JSON.stringify(config.paths);

  // Replace any dynamic variables defined in the paths array specifically;
  for(let p in Object.assign(config.paths, {"site":config.site})) {
    pathsToString = pathsToString.replace(new RegExp('{'+ p +'}', 'g'), config.paths[p]);
  }

  // Convert the paths string back to an object
  config.paths = JSON.parse(pathsToString);

  // Covnert the entire config object to a string
  var configToString = JSON.stringify(config);

  // Replace any dynamic variables defined in the config files.
  for(let p in config.paths) {
    configToString = configToString.replace(new RegExp('{'+ p +'}', 'g'), config.paths[p]);
  }

  // Remove any double slashes
  configToString = configToString.replace(new RegExp('([^:])(\/\/+)', 'g'), '$1/');

  // Convert the config string back to a string
  config = JSON.parse(configToString);

  return config;

}
