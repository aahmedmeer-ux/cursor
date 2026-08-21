module.exports = function(grunt) {
    require('time-grunt')(grunt);
    require('load-grunt-config')(grunt);

    grunt.loadNpmTasks('grunt-run');
    grunt.loadNpmTasks('grunt-stylelint');
    grunt.registerTask('jqueryui', ['clean:jqueryui', 'copy:jqueryui', 'replace:jqueryui']);
    grunt.registerTask('default', ['eslint', 'svgstore']);
};
