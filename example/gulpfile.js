const gulp   = require('gulp');
const configs = require('gulp-config-grabber');

const config = configs.grab();

console.log(config);
