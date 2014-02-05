/* global describe, it, chai, $*/
/* jshint -W030 */

describe('Multipart response', function () {
    'use strict';

    var expect = chai.expect;

    describe('Content-Type header', function () {
        it('must contain boundary', function () {
            expect($.multipart.getBoundary('multipart/mixed; boundary="eff50704-04ff-45f0-bcc9-ac9416983fe4')).to.equal('eff50704-04ff-45f0-bcc9-ac9416983fe4');
            expect($.multipart.getBoundary('multipart/mixed; charset=UTF-8; boundary="eff50704-04ff-45f0-bcc9-ac9416983fe4')).to.equal('eff50704-04ff-45f0-bcc9-ac9416983fe4');
            expect($.multipart.getBoundary('text/plain')).to.equal('');
        });
    });

    describe('Response body', function () {
        var boundary = '!!!==',
            CRLF = '\r\n',
            body = [
                '--' + boundary,
                'HTTP/1.1 404 Not Found',
                '',
                'NOT FOUND',
                '--' + boundary,
                'HTTP/1.0 304 Not Modified',
                '',
                '--' + boundary,
                'HTTP/1.1 200 Ok',
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

        it('can be parsed', function () {
            var entry = $.multipart.parseResponseBody(body, boundary)[3];
            expect(entry.status.code).to.equal(200);
            expect(entry.status.text).to.equal('Ok');
            expect(entry.headers['Content-Location']).to.equal('/content');
            expect(entry.headers['Content-Type']).to.equal('application/json');
            expect(entry.body).to.equal('[1, 2, 3]');
        });
        it('can be skipped', function () {
            var entry = $.multipart.parseResponseBody(body, boundary, 1)[0];
            expect(entry.status.code).to.equal(304);
            expect(entry.status.text).to.equal('Not Modified');
            expect(entry.headers).to.be.empty;
            expect(entry.body).to.equal('');
        });
    });
});