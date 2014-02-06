(function (wnd, $) {
    'use strict';

    var CR = '\r',
        LF = '\n',
        CRLF = CR + LF,
        NEW_ENTRY = 0,
        RESULT_PARSED = 1,
        BODY_STARTED = 3,
        HTTP_STATUS_PATTERN = /^HTTP\/1\.(?:1|0) (\d{3}) ([\w \t]+)$/i,
        HTTP_HEADER_PATTERN = /^(\S+):[ \t]*(.+)[ \t]*$/i,
        CONTENT_LOCATION_HEADER = 'Content-Location',
        CONTENT_TYPE_HEADER = 'Content-Type';

    /**
     * Parses Content-Type header value and returns boundary.
     * @example getBoundary('multipart/mixed; boundary="eff50704-04ff-45f0-bcc9-ac9416983fe4"');
     * @param {string} header - Header's value.
     * @returns {string} If header's value contains multipart/* boundary returns the boundary otherwise returns an empty string. 
     */
    function getBoundary(header) {
        var boundary;
        if (/\bboundary=".+"/.test(header)) {
            boundary = /\bboundary="(.+)"/.exec(header)[1];
        } else if (/\bboundary=(.+)/.test(header)) {
            boundary = /\bboundary=(.+)/.exec(header)[1];
        } else {
            return '';
        }
        return boundary.replace(/^[ \t"]+|[ \t"]+$/g, '');
    }

    function parseStatus (ln) {
        var match = HTTP_STATUS_PATTERN.exec(ln),
            result;
        if (match) {
            result = {
                code: parseInt(match[1], 10),
                text: match[2]
            };
        }
        return result;
    }

    function parseHeader (ln) {
        var match = HTTP_HEADER_PATTERN.exec(ln),
            result;
        if (match) {
            result = {
                name: match[1],
                value: isNaN(parseFloat(match[2])) ? match[2] : parseFloat(match[2])
            };
        }
        return result;
    }

    /**
     * Creates new multipart entry.
     * @constructor 
     */
    function MultipartEntry(result, headers, body) {
        /** HTTP result status of entry. */
        this.status = result;
        /** HTTP headers of entry. */
        this.headers = headers;
        /** Body of entry. */
        this.body = body;
    }

    /**
     * Parses content of multipart/* response with only one level of inclusion.
     * @param {string} body - Response.
     * @param {string} boundary - Multipart boundary.
     * @param {number} [pass] - Amount of entries to forgo.
     * @returns {MultipartEntry[]} Parsed entries.
    */
    function parseResponseBody(body, boundary, pass) {
        var entries = [],
            passedCount,
            lines, idx, ln,
            entry, entryState = NEW_ENTRY,
            status, header;

        if (typeof pass !== 'number' || pass < 0) {
            pass = 0;
        }

        passedCount = 0;
        lines = body.split(CRLF);
        for (idx = 0; idx < lines.length; idx++) {
            ln = lines[idx];

            if (ln.indexOf(boundary) !== -1) {
                if (entry) {
                    entries.push(new MultipartEntry(
                        entry.status,
                        entry.headers,
                        entry.body.join(CRLF)
                    ));
                }

                if (ln.indexOf('--' + boundary + '--') !== -1) {
                    return entries;
                } else if (ln.indexOf('--' + boundary) !== -1) {
                    if (passedCount < pass) {
                        passedCount++;
                    } else {
                        entry = {
                            status: {},
                            headers: {},
                            body: []
                        };
                        entryState = NEW_ENTRY;
                    }
                }
            } else if (entry) {
                if (NEW_ENTRY === entryState) {
                    if (typeof(status = parseStatus(ln)) !== 'undefined') {
                        entry.status = status;
                        entryState = RESULT_PARSED;
                    } else if (typeof(header = parseHeader(ln)) !== 'undefined') {
                        entry.headers[header.name] = header.value;
                        entryState = RESULT_PARSED;
                    } else {
                        entryState = BODY_STARTED;
                    }
                } else if (RESULT_PARSED === entryState) {
                    if (typeof(header = parseHeader(ln)) !== 'undefined') {
                        entry.headers[header.name] = header.value;
                    } else if (!ln.replace(/^\s+|\s+$/g, '')) {
                        entryState = BODY_STARTED;
                    }
                } else if (BODY_STARTED === entryState) {
                    entry.body.push(ln);
                }
            }
        }

        return entries;
    }

    /**
     * Fetches multipart content.
     * @param {string} url - URL to fetch multipart data.
     * @param {string} [method] - HTTP method, default GET.
     * @param {bool} [debug] - Add debud parameter, default false.
     * @returns {$.promise} Promise reporting progress.
    */
    function load(url, method, debug) {
        var parsedEnties = 0,
            boundary,
            data = {},
            xhr,
            result = {},
            deffered = $.Deferred();

        function loadData () {
            if (xhr.readyState >= 2 && !boundary) {
                boundary = getBoundary(xhr.getResponseHeader(CONTENT_TYPE_HEADER));
            }
            if (xhr.readyState < 3) { return; }

            var entries = parseResponseBody(xhr.responseText, boundary, parsedEnties),
                idx, len;
            for (idx = 0, len = entries.length; idx < len; idx++) {
                result[entries[idx].headers[CONTENT_LOCATION_HEADER]] = entries[idx];
            }

            if (xhr.readyState === 4) {
                deffered.resolve(result);
            } else {
                deffered.notify(parsedEnties, entries);
            }
            parsedEnties += entries.length;
        }

        method = method || 'GET';
        if (debug) {
            data.debug = true;
        }

        $.ajax({
            type: method,
            url: url,
            beforeSend: function (jqXHR) {
                jqXHR.onreadystatechange = function () {
                    if (jqXHR.readyState === 2 || jqXHR.readyState === 3) { // HEADERS_RECEIVED || LOADING
                        xhr = jqXHR;
                        loadData();
                    }
                };
            },
            success: function (data, textStatus, jqXHR) {
                xhr = jqXHR;
                loadData();
            },
            error: function (jqXHR, textStatus, errorThrown) {
                deffered.reject(jqXHR, textStatus, errorThrown);
            }
        });

        return deffered.promise();
    }

    // export public functions
    var exports = {
        getBoundary: getBoundary,
        parseResponseBody: parseResponseBody,
        load: load
    };
    if (typeof wnd.define === 'function') {
        wnd.define('multipart', exports);
    } else {
        $.multipart = exports;
    }
})(window, window.jQuery);