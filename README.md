# Gulp Config Grabber

Combine multiple config.json files using an argument to distinguish an environment specific config.josn file. Purpose built for multisite projects.

### Installation
```
npm i gulp-config-grabber
```
*If you're just trying to include a config.json file, there is no need to install this module. You can do this natively:*
```
const config = require('./config.json');
```
### How to use:
Assume you have a project that looks like this:
```
project/
├── gulpfile.js
├── config.json
├── package.json
└── dev/
    ├── site1/
    └── site2/
```
Your config.json file has all the settings you need. But you need to add some
bespoke options for site2 only. You could create a new config.json.

But if you update one config.json, you'll need to manage the changes for all your config.json files.

This is where Gulp Config Grabber comes in. Create a config.json for each site
with ONLY the changes that need to be merged into your root config.json (default) file.
```
project/
├── gulpfile.js
├── config.json
├── package.json
└── dev/
    ├── site1/
    │  └── config.json
    └── site2/
       └── config.json
```
Now pass in where your sites are located (relative to your gulpfile.js)
```js
const config = require('gulp-config-grabber')('dev');
```
You can also pass in a default argument to be used on each gulp call.
```js
const config = require('gulp-config-grabber')('dev', 'site1');
```
If your sites live in the root. You'll still have to call a function after the 'require'
```js
const config = require('gulp-config-grabber')();
```
You can define the 'environment location' and 'default site' settings in your root config.json too.

Default site can be defined as 'default-site' or 'default'.

Default environment path can be defined as 'devPath' or nested in 'paths/dev'.

To distinguish what config file Gulp should use, pass in an arguments flag that
matches all or part of your site directory.
```js
gulp default --site2
```
This will grab the config.json file in your site2 project and deep merge everything
to your default config.json in the root. Note, Gulp Config Grabber will only use the first argument flag.

### Variables
An added feature you don't get natively with config.json files is the option to use
special variables.

#### Example:
```json
{
  "project" : "My Awesome Site",
  "site"    : "site1",
  "host"    : "www.site1.loc",

  "paths" : {
    "public"  : "public_html/{site}",
    "scripts" : "dev/{site}/scripts",
    "sass"    : "dev/{site}/sass"
  }
}
```
Will return this:
```json
{
  "project" : "My Awesome Site",
  "site"    : "site1",
  "host"    : "www.site1.loc",

  "paths" : {
    "public"  : "public_html/site1",
    "scripts" : "dev/site1/scripts",
    "sass"    : "dev/site1/sass"
  }
}
```
Note, these variables will only work in nested objects.
