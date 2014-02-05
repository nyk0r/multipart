/* jshint node:true */
'use strict';

module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: [
                'Gruntfile.js',
                'src/*.js',
                'test/spec/*.js'
            ],
            options: {
                jshintrc: '.jshintrc'
            }
        },
        jsdoc: {
            src: ['src/*.js'],
            options: { destination: 'doc' }
        },
        mocha: {
            src: ['test/**/*.html'],
            options: {
                run: true
            }
        },
        watch: {
            files: [
                'src/*.js',
                'spec/*.js',
                'test/*.(js|html)'
            ],
            tasks: ['jshint', 'mocha']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-jsdoc');

    grunt.registerTask('test', ['jshint', 'mocha']);
};
