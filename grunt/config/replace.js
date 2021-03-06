//replace is used to adjust paths on test files
module.exports = {
    test: {
        options: {
            patterns: [{
                match: /.grunt\/grunt-contrib-jasmine\//g,
                replacement: 'test/jasmine/'
            }, {
                match: /spec\//g,
                replacement: 'test/spec/'
            }, {
                match: /preview\//g,
                replacement: ''
            }, {
                match: /dist\//g,
                replacement: '../dist/'
            }, {
                match: /lib\/d3\//g,
                replacement: 'assets/js/'
            }]
        },
        files: [{
            expand: true,
            flatten: true,
            src: ['test.html'],
            dest: 'preview/'
        }]
    }
};