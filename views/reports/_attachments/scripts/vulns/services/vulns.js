angular.module('faradayApp')
    .factory('vulnsFact', ['BASEURL', '$http', '$q', 'attachmentsFact', function(BASEURL, $http, $q, attachmentsFact) {
        var vulnsFact = {};

        vulnsFact.get = function(ws) {
            var vulns = [];
            vulns_url = BASEURL + ws +"/_design/vulns/_view/vulns";
            // gets vulns json from couch
            $.getJSON(vulns_url, function(data) {
                $.each(data.rows, function(n, obj){
                    var d = new Date(0),
                    evidence = [];
                    d.setUTCSeconds(obj.value.date);
                    d = d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
                    if(typeof(obj.value.attachments) != undefined && obj.value.attachments != undefined) {
                        for(var attachment in obj.value.attachments) {
                            evidence.push(attachment);
                        }
                    }
                    var v = {
                        "id":               obj.id,
                        "rev":              obj.value.rev,
                        "attachments":      evidence,
                        "couch_parent":     obj.value.parent,
                        "data":             obj.value.data,
                        "date":             d, 
                        "delete":           false,
                        "desc":             obj.value.desc,
                        "easeofresolution": obj.value.easeofresolution,
                        "impact":           obj.value.impact,
                        "meta":             obj.value.meta,
                        "name":             obj.value.name, 
                        "oid":              obj.value.oid,
                        "owned":            obj.value.owned,
                        "owner":            obj.value.owner,
                        "parent":           obj.key.substring(0, obj.key.indexOf('.')),
                        "refs":             obj.value.refs,
                        "resolution":       obj.value.resolution,
                        "selected":         false,
                        "severity":         obj.value.severity,
                        "type":             obj.value.type, 
                        "web":              false
                    };
                    vulns.push(v);
                });
            });
            return vulns;
        }

        vulnsFact.put = function(ws, vuln, callback) {
            var url = BASEURL + ws + "/" + vuln.id, 
            v = {
                "_rev":             vuln.rev,
                "data":             vuln.data,
                "desc":             vuln.desc,
                "easeofresolution": vuln.easeofresolution,
                "impact":           vuln.impact,
                "metadata":         vuln.meta,
                "name":             vuln.name,
                "obj_id":           vuln.oid,
                "owned":            vuln.owned,
                "owner":            vuln.owner,
                "parent":           vuln.couch_parent, 
                "refs":             vuln.refs,
                "resolution":       vuln.resolution,
                "severity":         vuln.severity, 
                "type":             vuln.type
            };
            if(typeof(vuln.evidence) != undefined && vuln.evidence != undefined) {
                // the list of evidence may have mixed objects, some of them already in CouchDB, some of them new
                // new attachments are of File type and need to be processed by attachmentsFact.loadAttachments 
                // old attachments are of type String (file name) and need to be processed by attachmentsFact.getStubs
                var stubs = [],
                files = [],
                names = [],
                promises = [];
                v._attachments = {};

                for(var name in vuln.evidence) {
                    if(vuln.evidence[name] instanceof File) {
                        files.push(vuln.evidence[name]);
                    } else {
                        stubs.push(name);
                    }
                }

                if(stubs.length > 0) promises.push(attachmentsFact.getStubs(ws, vuln.id, stubs));
                if(files.length > 0) promises.push(attachmentsFact.loadAttachments(files));

                $q.all(promises).then(function(result) {
                    result.forEach(function(atts) {
                        for(var name in atts) {
                            v._attachments[name] = atts[name];
                            names.push(name);
                        }
                    });
                    $http.put(url, v).success(function(d, s, h, c) {
                        callback(d.rev, names);
                    });
                });
            } else {
                $http.put(url, v).success(function(d, s, h, c) {
                    callback(d.rev, []);
                });
            }
        };

        vulnsFact.remove = function(ws, vuln) {
            var url = BASEURL + ws + "/" + vuln.id + "?rev=" + vuln.rev;
            $http.delete(url).success(function(d, s, h, c) {});
        };

        return vulnsFact;
    }]);
