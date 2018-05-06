////////////////////////////////////////////////////////////////////////////////
// Settings
////////////////////////////////////////////////////////////////////////////////

'use strict'

// Dependencies
const path      = require('path'),                            // Handles and normalises file paths
      fs        = require('fs'),                              // File system add, edit, and remove
      argv      = require('minimist')(process.argv.slice(2)), // Grabs flags passed via command
      deepmerge = require('deepmerge');                       // Depp Merges Arrays/Bojects

const cwd = process.cwd();

module.exports.grab = grab;

////////////////////////////////////////////////////////////////////////////////
// Public Functions
////////////////////////////////////////////////////////////////////////////////

/**
 * Combine multiple config.json files using a flag to distinguish different environments.
 * @param  {object | string}  Strings are a shorthand for changing the filename.
 *                            Objects should contain the following arguments: *
 * - @param {string} file      The name of the file that should be included
 * - @param {string} env       Some objects in the config file can be merged based on a environment name
 * - @param {string} flag      Force a command flag to target a specific site directory
 * - @param {string} directory Define a directory to search for your site flag
 * @return {object}
 */
function grab() {

  let defaultConfig   = 'config.json';
  let defaultDirectory = 'dev';

  // If an object was passed, destructure by checking for these variables.
  // Defaults are applied if 'file', isn't found.
  if ( typeof arguments[0] == 'object') {
    var { file = defaultConfig, env, flag, directory } = arguments[0];
  } else {
    // If anything else was passed (presumable a string), use this as the file.
    var file = arguments[0] || defaultConfig;
  }

  // Get the config file relative to the gulpfile.js file
  var config = require(path.join(cwd, file));

  // Grab any arguments flags that were passed via the command line.
  var flag = Object.keys(argv)[1] || undefined;

  // Check to see if there is a default site name to use as the flag.
  // This is should only be used for multisites envionments;
  if ( flag === 'undefined' ) {
    if ( 'default-site' in config ) {
      // Check for 'default-site'
      flag = config['default-site']
    } else if ( 'default' in config ) {
      // Check for 'default'
      flag = config['default']
    }
  }

  // If there is a flag, start the search for the additional config file
  if ( flag !== 'undefined' ) {

    // Find dev path is one wasn't passed
    if ( directory !== 'undefined') {
      directory = config.paths['dev'] || defaultDirectory;
    }

    // Search for config file
    let content = false;

    // Try to find the multi site config file
    try {

      // Loop through all files and fodlers in the dev directory
      fs.readdirSync(path.join(cwd, directory)).forEach(dir => {

        // Check if the the path is a directory
        if(fs.statSync(path.join(cwd, directory, dir)).isDirectory()) {

          // Check is all or part of the flag exists in one of the directories
          if (flag == dir || dir.indexOf(flag) !== -1) {
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

  // Check if there are any environmental settings. Merge the passed enviroment settings and flatting settings object
  if ( typeof env !== 'undefined' && '*' in config.settings && env in config.settings ) {
    config.settings = Object.assign(config.settings['*'], config.settings[env]);;
  }

  // Check if there are any environmental paths. Merge the passed enviroment path and flatting paths object
  if ( typeof env !== 'undefined' && '*' in config.paths && env in config.paths ) {
    config.paths = Object.assign(config.paths['*'], config.paths[env]);;
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
