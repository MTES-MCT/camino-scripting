var PAS_DE_PROBLEME = 'pas de probleme'

var fs = require('fs');
var filespath = process.cwd() + "/files/";
var block = JSON.parse(fs.readFileSync(filespath + "epsg_block.json", 'utf8'));
var data = JSON.parse(fs.readFileSync(filespath + "data_tsv.json", 'utf8'));
var log = new Array();


function changeXY(coord) {
    return coord.replace(/ /g, '').replace(/,/g, '.');
}

function dms_to_dec(latitude) {
    var dec = 0
    try {
        var deg = parseFloat(latitude.split('°')[0]);
        var min = parseFloat(latitude.split('°')[1].split('\'')[0]);
        var sec = parseFloat(latitude.split('°')[1].replace(',', '\'').split('\'')[1]);
        if (isNaN(sec)) {
            sec = 0
        }
        if (deg <= 0) {
            dec = deg - min / 60 - sec / 3600
        } else {
            dec = deg + min / 60 + sec / 3600
        }
    } catch {
        dec = parseFloat(latitude.replace(/,/g, '.').replace(/ /g, ''))
    }
    return dec;
}

function dec_to_dms(latitude) {
    var deg = Math.floor(latitude);
    if (isNaN(deg)) return ""

    var minfloat = (latitude - deg) * 60;
    var min = Math.floor(minfloat);
    var secfloat = (minfloat - min) * 60;
    var sec = Math.round(secfloat);
    if (sec == 60) {
        min++;
        s = 0;
    }
    if (min == 60) {
        if (deg < 0) deg--;
        else deg++;
        min = 0;
    }
    if (deg < 0) {
        deg++;
        min = 59 - min;
        sec = 60 - sec;
    }
    var dms = '' + deg + '°' + min + '\'' + sec + '"';
    return dms.replace(/ /g, '');
}

function check_inverseXY(coordXY, bounds) {
    var A = 0;
    if ((parseFloat(bounds['X1']) >= parseFloat(coordXY['X'])) ||
        (parseFloat(bounds['X2']) <= parseFloat(coordXY['X'])) ||
        (parseFloat(bounds['Y1']) >= parseFloat(coordXY['Y'])) ||
        (parseFloat(bounds['Y2']) <= parseFloat(coordXY['Y']))) {
        A += 1;
    }
    if ((parseFloat(bounds['X1']) >= parseFloat(coordXY['Y'])) ||
        (parseFloat(bounds['X2']) <= parseFloat(coordXY['Y'])) ||
        (parseFloat(bounds['Y1']) >= parseFloat(coordXY['X'])) ||
        (parseFloat(bounds['Y2']) <= parseFloat(coordXY['X']))) {
        A += 0.5;
    }
    return A
}

function check_inverselatlon(coordlatlon, bounds) {
    var A = 0;
    if ((dms_to_dec(bounds['X1']) >= parseFloat(coordlatlon['X'])) ||
        (dms_to_dec(bounds['X2']) <= parseFloat(coordlatlon['X'])) ||
        (dms_to_dec(bounds['Y1']) >= parseFloat(coordlatlon['Y'])) ||
        (dms_to_dec(bounds['Y2']) <= parseFloat(coordlatlon['Y']))) {
        A += 1;
    }
    if ((dms_to_dec(bounds['X1']) >= parseFloat(coordlatlon['Y'])) ||
        (dms_to_dec(bounds['X2']) <= parseFloat(coordlatlon['Y'])) ||
        (dms_to_dec(bounds['Y1']) >= parseFloat(coordlatlon['X'])) ||
        (dms_to_dec(bounds['Y2']) <= parseFloat(coordlatlon['X']))) {
        A += 0.5;
    }
    return A
}

function check_latlon_fromXY(coordXY) {
    var X = parseFloat(coordXY['X'])
    var Y = parseFloat(coordXY['Y'])
    if (isNaN(X)) {
        return -180 < Y && Y < 180
    } 
    if (isNaN(Y)) {
        return -180 < X && X < 180
    } 
    return !(-180 < X && X < 180 && -180 < Y && Y < 180) 
}

function check_XY_fromlatlon(coordlatlon) {
    try {
        var lat = parseFloat(coordlatlon['X'].replace(/ /g, ''))
        var lon = parseFloat(coordlatlon['Y'].replace(/ /g, ''))
    } catch {
        var lat = parseFloat(coordlatlon['X'])
        var lon = parseFloat(coordlatlon['Y'])
    }
    if (isNaN(lat)) {
        if (200 < lon || lon < -200) {
            return false
        } else return true
    } else if (isNaN(lon)) {
        if (200 < lat || lat < -200) {
            return false
        } else return true
    } else if (200 < lat || 200 < lon || lat < -200 || lon < -200) {
        return false
    } else {
        return true
    }
}

function modif_XY(coord, epsg_bound, file, epsg, description) {
    try {
        coord['X'] = changeXY(coord['X']);
        coord['Y'] = changeXY(coord['Y']);
        var A = check_inverseXY(coord, epsg_bound);
        if (A == 0) {
            if (description != null && description.length != 0) {
                log.push([file, 'description sans donnee']);
                data[file]['correct'].push(['description sans donnee', "A corriger"]);
            } else {
                log.push([file, 'pas de donnee']);
                data[file]['correct'].push(['pas de donnee', "Inutilisable"]);
            }
        } else if (A == 1) {
            log.push([file, epsg, coord['X'], coord['Y'], 'inversion des colonnes']);
            data[file]['correct'].push(['inversion des colonnes', "Corrige"]);
        } else if (A == 0.5) {
            log.push([file, epsg, coord['X'], coord['Y'], 'pas de probleme']);
            data[file]['correct'].push(['pas de probleme', "OK"]);
        } else if (A == 1.5) {
            log.push([file, epsg, coord['X'], coord['Y'], 'pas le bon epsg']);
            data[file]['correct'].push(['pas le bon epsg', "A verifier"]);
        }
    } catch {
        try {
            changeXY(coord['X'])
        } catch {
            coord['X'] = ''
        }
        try {
            changeXY(coord['Y'])
        } catch {
            coord['Y'] = ''
        }
        if (description != null && description.length != 0) {
            log.push([file, 'description sans donnee']);
            data[file]['correct'].push(['description sans donnee', "A corriger"]);
        } else {
            log.push([file, epsg, coord['X'], coord['Y'], 'donnee incomplete']);
            data[file]['correct'].push(['donnee incomplete', "Inutilisable"]);
        }
    }
}

function modif_latlon(coord, epsg_bound, file, epsg, description) {
    try {
        coord['X'] = dms_to_dec(coord['X']);
        coord['Y'] = dms_to_dec(coord['Y']);
        var A = check_inverselatlon(coord, epsg_bound);
        //if (isNaN(coord['X'])) coord['X'] = '';
        //if (isNaN(coord['Y'])) coord['Y'] = '';
        if (A == 0) {
            if (description != null && description.length != 0) {
                log.push([file, 'description sans donnee']);
                data[file]['correct'].push(['description sans donnee', "A corriger"]);
            } else {
                log.push([file, 'pas de donnee']);
                data[file]['correct'].push(['pas de donnee', "Inutilisable"]);
            };
        } else if (A == 1) {
            log.push([file, epsg, coord['X'], coord['Y'], 'inversion des colonnes']);
            data[file]['correct'].push(['inversion des colonnes', "Corrige"]);
        } else if (A == 0.5) {
            log.push([file, epsg, coord['X'], coord['Y'], 'pas de probleme']);
            data[file]['correct'].push(['pas de probleme', "OK"]);
        } else if (A == 1.5) {
            if (epsg == '4807') {
                var B = check_inverselatlon(coord, {
                    "X1": "-8°0'25\"",
                    "Y1": "45°53'20\"",
                    "X2": "8°6'13\"",
                    "Y2": "56°49'20\""
                });
                if (B == 0.5) {
                    log.push([file, epsg, coord['X'], coord['Y'], 'probleme d\'unite grad/degre']);
                    data[file]['correct'].push(['probleme d\'unite grad/degre', "A verifier"]);
                } else {
                    log.push([file, epsg, coord['X'], coord['Y'], 'pas le bon epsg']);
                    data[file]['correct'].push(['pas le bon epsg', "A verifier"]);
                }
            } else {
                log.push([file, epsg, coord['X'], coord['Y'], 'pas le bon epsg']);
                data[file]['correct'].push(['pas le bon epsg', "A verifier"]);
            }
        }
        coord['X'] = dec_to_dms(coord['X']);
        coord['Y'] = dec_to_dms(coord['Y']);
    } catch {
        try {
            b = dms_to_dec(coord['X'])
        } catch {
            coord['X'] = ''
        }
        try {
            b = dms_to_dec(coord['Y'])
        } catch {
            coord['Y'] = ''
        }
        if (description != null && description.length != 0) {
            log.push([file, 'description sans donnee']);
            data[file]['correct'].push(['description sans donnee', "A corriger"]);
        } else {
            log.push([file, epsg, coord['X'], coord['Y'], 'donnee incomplete']);
            data[file]['correct'].push(['donnee incomplete', "Inutilisable"]);
        };
    }
}

function check(file) {
    var {epsg_data, other_data:{description}} = data[file];
    data[file]['correct'] = new Array();
    if (epsg_data.length == 0) {
        var count = description.filter(A => A).length
        if (count == description.length) {
            log.push([file, 'description sans donnee']);
            data[file]['correct'].push(['description sans donnee', "A corriger"]);
        } else {
            log.push([file, 'pas de donnee'])
            data[file]['correct'].push(['pas de donnee', "Inutilisable"]);
        }
        return;
    }
    
    for (i = 0; i < epsg_data.length; i++) {
        var epsg = epsg_data[i]['epsg'];
        var coord = epsg_data[i]['coord'];
        var epsg_bound = block[epsg]['coord'];
        if (block[epsg]['projected'] == 'Y') {
            for (j = 0; j < coord.length; j++) {
                if (check_latlon_fromXY(coord[j])) {
                    modif_XY(coord[j], epsg_bound, file, epsg, description[j]);
                } else {
                    log.push([file, epsg, coord[j]['X'], coord[j]['Y'], 'lat/lon au lieu de X/Y']);
                    data[file]['correct'].push(['lat/lon au lieu de X/Y', "A verifier"]);
                }
            }
        } else {
            for (j = 0; j < coord.length; j++) {
                if (check_XY_fromlatlon(coord[j])) {
                    modif_latlon(coord[j], epsg_bound, file, epsg, description[j]);
                } else {
                    log.push([file, epsg, coord[j]['X'], coord[j]['Y'], 'X/Y au lieu de lat/lon']);
                    data[file]['correct'].push(['X/Y au lieu de lat/lon', "A verifier"]);
                }
            }
        }
    }
};


function read_folder(folder) {
    var files = fs.readdirSync(filespath + folder + '/');
    files.map(list_map => check(folder + '/' + list_map));
};

function read_files() {
    var li = ['w', 'c', 'g', 'h', 'm'];
    li.map(read_folder);
};

function array_to_csv(entree, sortie) {
    var arr = JSON.parse(fs.readFileSync(filespath + entree, 'utf8'));
    var header = 'nom du fichier,epsg,probleme\n'
    fs.writeFileSync(filespath + sortie, header, 'UTF-8', {
        'flags': 'a+'
    });
    for (i = 0; i < arr.length; i++) {
        var mat = arr[i];
        if (mat.length == 2) {
            var mess = mat[0] + ',,' + mat[1] + '\n'
        } else {
            var mess = mat[0] + ',' + mat[1] + ',' + mat[mat.length - 1] + '\n'
        }
        fs.appendFileSync(filespath + sortie, mess, 'UTF-8', {
            'flags': 'a+'
        });
    }
}

read_files();
fs.writeFileSync(filespath + 'log_error.json', JSON.stringify(log));
fs.writeFileSync(filespath + 'data_final.json', JSON.stringify(data));
array_to_csv('log_error.json', 'prob.csv');
console.log(log.length)