var fs = require('fs');
var filespath = process.cwd() + "/files/";
var block = JSON.parse(fs.readFileSync(filespath + "epsg_block.json", 'utf8'));
var data = JSON.parse(fs.readFileSync(filespath + "data_epsg.json", 'utf8'));

var log = new Array();


function dms_to_dec(latitude){
    var dec = 0
    try{
        var deg = parseFloat(latitude.split('°')[0]);
        var min = parseFloat(latitude.split('°')[1].split('\'')[0]);
        var sec = parseFloat(latitude.split('°')[1].replace(',', '\'').split('\'')[1]);
        if (deg <= 0){
            dec = deg - min/60 - sec/3600
        } else {
            dec = deg + min/60 + sec/3600
        }
    } catch {
        
        dec = parseFloat(latitude.replace(',', '.').replace(' ', '.'))
    }
    return dec;
}

function check_data(filename){
    coord_epsg = data[filename]
    if (coord_epsg.length == 0){
        log.push([filename, 'pas de données'])
    }
    for (i=0; i < coord_epsg.length; i++){
        var epsg = coord_epsg[i]['epsg'];
        var coord = coord_epsg[i]['coord'];
        var epsg_bound = block[epsg]['coord'];
        if (block[epsg]['projected'] == 'Y'){
            var A = 0;
            for(j=0;j<coord.length;j++){
                var val = coord[j];
                if ((parseFloat(epsg_bound['X1']) > parseFloat(val['X'])) || 
                    (parseFloat(epsg_bound['X2']) < parseFloat(val['X'])) || 
                    (parseFloat(epsg_bound['Y1']) > parseFloat(val['Y'])) || 
                    (parseFloat(epsg_bound['Y2']) < parseFloat(val['Y']))){
                    A += 1;
                    break
                };
            }
            for(j=0;j<coord.length;j++){
                var val = coord[j];
                if ((parseFloat(epsg_bound['X1']) < parseFloat(val['X'])) || 
                    (parseFloat(epsg_bound['X2']) > parseFloat(val['X'])) || 
                    (parseFloat(epsg_bound['Y1']) < parseFloat(val['Y'])) || 
                    (parseFloat(epsg_bound['Y2']) > parseFloat(val['Y']))){
                    A += 0.5;
                    break
                };
            };
            if (A == 1) {
                log.push([filename, epsg, val, 'inversion des colonnes X/Y'])
            }
            else if (A==0.5) {
                log.push([filename, epsg, val, 'pas d\'erreur à priori sur X/Y'])
            }
            else if (A == 1.5) log.push([filename, epsg, val, 'erreur a determiner sur la donnée X/Y'])
            else if (A == 0) log.push([filename, epsg, val, 'epsg X/Y sans coordonnées'])
        } else {
            try {
            var A = 0;
            for(j=0;j<coord.length;j++){
                var val = coord[j];
                if ((dms_to_dec(epsg_bound['X1']) > dms_to_dec(val['X'])) || 
                    (dms_to_dec(epsg_bound['X2']) < dms_to_dec(val['X'])) || 
                    (dms_to_dec(epsg_bound['Y1']) > dms_to_dec(val['Y'])) || 
                    (dms_to_dec(epsg_bound['Y2']) < dms_to_dec(val['Y']))){
                    A += 1
                    break
                }
            }
            for(j=0;j<coord.length;j++){
                var val = coord[j];
                if ((dms_to_dec(epsg_bound['X1']) > dms_to_dec(val['Y'])) || 
                    (dms_to_dec(epsg_bound['X2']) < dms_to_dec(val['Y'])) || 
                    (dms_to_dec(epsg_bound['Y1']) > dms_to_dec(val['X'])) || 
                    (dms_to_dec(epsg_bound['Y2']) < dms_to_dec(val['X']))){
                    A += 0.5
                    break
                }
            }
            if (A == 1) log.push([filename, epsg, val, 'inversion dans les colonnes lat/lon'])
            else if (A == 0.5) log.push([filename, epsg, val, 'Pas d\'erreur à priori sur lat/lon'])
            else if (A == 1.5) log.push([filename, epsg, val, 'erreur a determiner sur le lat/lon'])
            else if (A == 0) log.push([filename, epsg, val, 'epsg lat/lon sans coordonnées'])
            }
            catch {
                log.push([filename, epsg, val, 'problème de formatage des lat/lon OU epsg lat/lon sans coordonnées'])
            }
        }
    }
}

function read_folder(folder){
    var files = fs.readdirSync(filespath + folder + '/');
    files.map(list_map => check_data(folder + '/' + list_map));
};


function read_files(){
    var li = ['w', 'c', 'g', 'h', 'm'];
    li.map(read_folder);
};

read_files();
fs.writeFileSync(filespath + 'log.json', JSON.stringify(log));
console.log(log.length)