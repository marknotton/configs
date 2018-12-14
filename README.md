
# Configs

![Made For NPM](https://img.shields.io/badge/Made%20for-NPM-orange.svg)

Combine multiple config.json files using a flag to distinguish different environments.

## Installation
```
npm i @marknotton/configs --save-dev
```
```js
const configs = require('@marknotton/configs');
```
------

If you're just trying to include a config.json file, there is no need to install this package. You can do this natively:
```
const config = require('./config.json');
```
### How to use:

Pass in an object of options. See below details on the options available.

```js
const config = configs.grab({
	file : "config.json",
	env : "production",
	flag : "site2",
	directory : "src"
	clear : false,
});
```
or if you're just passing in a different config file, you can pass in a single string:

```
const config = configs.grab("config.json");
```
#### Options
| Option | Default | Description |
|--|--|--|
| file | config.json | The name of the file that should be included
| env | - | Some objects in the config file can be merged based on a environment name
| flag | - | Force a command flag to target a specific site directory
| directory | /src | Define a directory to search for your site flag
| dynamic | ['paths'] | Define a selection of keys that contain dynamic variables. These will be checked against all properties and manage the dynamic variables, e.g. `{images}`
| clear | false | Clear the require cache of the config.json file. So the file will be queried again.

You can pass in a default argument to be used on each gulp call.

```js
const config = configs.grab({'env':'src', 'directory':'site1'});
```

To distinguish what config file should be used, pass in an arguments flag that
matches all or part of your site directory.
```js
gulp default --site2
```
You can also manually pass in a environmental command to overwrite any in the config files.
```js
gulp default --site2 --production
```
This will grab the config.json file in your site2 project and deep merge everything
to your default config.json in the root. Note, Configs will only use the first argument flag.

### Use Case

Assume you have a project that looks like this:
```
project/
├── gulpfile.js
├── config.json
├── package.json
└── src/
    ├── site1/
    └── site2/
```
Your root config.json file has all the settings you need. But you need to add some
bespoke options for site2 only. You could create a new config.json.

But if you update one config.json, you'll need to manage the changes for all your config.json files.

This is where Configs comes in. Create a config.json for each site
with ONLY the changes that need to be merged into your root config.json (default) file.
```
project/
├── gulpfile.js
├── config.json
├── package.json
└── src/
    ├── site1/
    │  └── config.json
    └── site2/
       └── config.json
```
You can use special variable names that will be passed any nested objects.

#### Example:
```json
{
  "project" : "My Awesome Site",
  "site"    : "site1",
  "host"    : "www.site1.loc",

  "paths" : {
    "public"  : "public_html/{site}",
    "scripts" : "src/{site}/scripts",
    "sass"    : "src/{site}/sass"
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
    "scripts" : "src/site1/scripts",
    "sass"    : "src/site1/sass"
  }
}
```
All objects can have special environmental nested options. If the first level of a nested object contains environment variables,
(which are defined either in the initial set up or via a command flag)... then that object will be flattened respectively.

```js
const config = configs.grab({'env':process.env.ENVIRONMENT});
```

#### Example config.json:
```json
{
  "project" : "My Awesome Site",
  "site"    : "site1",
  "host"    : "www.site1.loc",

  "settings" : {
    "*" : {
      "sourceMaps"  : false,
      "minify"	    : false,
      "versioning"  : true,
    },
    "production" : {
      "minify"	    : true,
    },
    "dev" : {
      "sourceMaps"  : true,
      "minify"	    : true,
      "special"	    : true,
    }
  }
}
```
Will return this in a dev environment:
```json
{
  "project" : "My Awesome Site",
  "site"    : "site1",
  "host"    : "www.site1.loc",

  "settings" : {
      "sourceMaps"  : true,
      "minify"	    : true,
      "versioning"  : true,
      "special"	    : true,
  }
}
```

### Create

Instead of `grab`, you can use `create` instead:
```js
const config = configs.create({'env': process.env.ENVIRONMENT})
```
This does exactly the same as grab, only it generates a `config.lock` in the root path. This will contain the JSON code with environments managed and dynamic variable handled. The purpose of this is to avoid server-side languages (php) having to perform all the same logic.

### Update

```js
configs.update({'env': process.env.ENVIRONMENT})
```

Is the same as `create()`, only this will clear and caches before re-creating a config file. This is useful if you need to update the config file with a watcher.
