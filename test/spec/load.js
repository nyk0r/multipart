/* jshint devel:true */
/* global describe, it, xit, chai, sinon, $, beforeEach, afterEach*/
/* jshint  -W030 */

describe('Multipart loader returns promise, which', function () {
    'use strict';

    var expect = chai.expect,
        server,
        boundary = '!!!==',
        CRLF = '\r\n';

    beforeEach(function () {
        var data = [
            '--' + boundary,
            'HTTP/1.1 404 Not Found',
            'Content-Location: /notfound',
            '',
            'NOT FOUND',
            '--' + boundary,
            'HTTP/1.0 304 Not Modified',
            'Content-Location: /notmodified',
            '',
            '--' + boundary,
            'HTTP/1.1 200 Ok',
            'Content-Location: /ok',
            '',
            'OK',
            '--' + boundary,
            'HTTP/1.1 200 Ok',
            'Content-Location: /content',
            'Content-Type: application/json',
            '',
            '[1, 2, 3]',
            '--' + boundary + '--'
        ].join(CRLF);

        server = sinon.fakeServer.create();
        server.respondWith(function (xhr) {
            if (xhr.method === 'GET') {
                if (xhr.url === '/data') {
                    xhr.respond(200, {
                        'Content-Type': 'multipart/mixed; boundary=!!!=='
                    }, data);
                } else {
                    xhr.respond(404, {
                        'Content-Type': 'text/plain'
                    }, sinon.FakeXMLHttpRequest.statusCodes[404]);
                }
            } else {
                xhr.respond(405, {
                    'Content-Type': 'text/plain'
                }, sinon.FakeXMLHttpRequest.statusCodes[405]);
            }
        });
        server.autoRespond = true;
    });

    afterEach(function () {
        server.restore();
    });

    it('reports on not found', function (done) {
        $.multipart.load('/error').fail(function (jqXHR, textStatus, errorThrown) {
            expect(errorThrown).to.equal(sinon.FakeXMLHttpRequest.statusCodes[404]);
            done();
        });
    });

    it('reports on wrong method', function (done) {
        $.multipart.load('/data', 'POST').fail(function (jqXHR, textStatus, errorThrown) {
            expect(errorThrown).to.equal(sinon.FakeXMLHttpRequest.statusCodes[405]);
            done();
        });
    });

    xit('notify about progress', function () {
    });

    it('returns data on success', function(done) {
        $.multipart.load('/data').done(function (data) {
            expect(data['/content'].body).to.equal('[1, 2, 3]');
            done();
        });
    });
});