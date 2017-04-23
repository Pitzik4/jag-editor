var gulp = require('gulp');

var rollup = require('rollup-stream');
var buble = require('gulp-buble');
var iife = require('gulp-iife');
var uglify = require('gulp-uglify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');


gulp.task('js', function() {
  return rollup({ entry: './js/main.js', format: 'es' })
    .pipe(source('main.js', './js'))
    .pipe(buffer())
    .pipe(buble())
    .pipe(iife())
    //.pipe(uglify({ ie_proof: false }))
    .pipe(gulp.dest('./build'));
});

gulp.task('editor-js', function() {
  return rollup({ entry: './js/editor/main.js', format: 'es' })
    .pipe(source('main.js', './js/editor'))
    .pipe(buffer())
    .pipe(buble())
    .pipe(iife())
    //.pipe(uglify({ ie_proof: false }))
    .pipe(gulp.dest('./build'));
});

gulp.task('assets', function() {
  return gulp.src('./assets/**/*')
    .pipe(gulp.dest('./build'));
});

gulp.task('watch', ['js'], function() {
  gulp.watch('./js/**/*', ['js']);
});

gulp.task('default', ['assets', 'js']);

gulp.task('editor', ['assets', 'editor-js']);
