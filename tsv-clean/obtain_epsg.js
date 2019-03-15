var fs = require('fs');
var filespath = process.cwd() + "/files/";


function read_file(filepath){
    var data = fs.readFileSync(filespath + filepath, 'utf8');
    var lines = data.split('\r\n');
    var nb_lines = lines.length;
    var geo_data = {'file': filepath, 'coord_epsg': new Array(), 'lines': {'groupe': new Array(), 'contour': new Array(), 'point': new Array(), 'jorf_id':new Array(), 'description':new Array()}};
    try {
        var header = lines[0].split('\t');
        var epsg_liste = new Array();
        for (i = 5; i < header.length; i+=2){
            epsg_liste.push(header[i]);
        };
        for (j=0; j<epsg_liste.length; j++){
            var epsg = epsg_liste[j];
            var epsg_int = parseInt(epsg, 10);
            if (1000 < epsg_int && epsg_int < 100000){
                var coord_data = new Array();
                for (i = 1; i < nb_lines; i++){
                    coord_data.push({'X': lines[i].split('\t')[5 + 2*j], 'Y': lines[i].split('\t')[6 + 2*j]});
                };
                geo_data['coord_epsg'].push({'epsg': epsg, 'coord': coord_data})
            } else {
                if (lines.length < 2) console.log("Le fichier: " + filepath + " est vide");
                else console.log("Le fichier: " + filepath + " n'est pas valide");
            };  
        }
    } catch {
        if (lines.length < 2) console.log("Le fichier: " + filepath + " est vide");
        else console.log("Le fichier: " + filepath + " n'est pas valide");
    };
    for (i=1; i< nb_lines;i++){
        var data_des = lines[i].split('\t');
        geo_data['lines']['groupe'].push(data_des[0]);
        geo_data['lines']['contour'].push(data_des[1]);
        geo_data['lines']['point'].push(data_des[2]);
        geo_data['lines']['jorf_id'].push(data_des[3]);
        geo_data['lines']['description'].push(data_des[4]);
    };
    return geo_data
};


function create_epsg_folder(folder){
    var files = fs.readdirSync(filespath + folder + '/');
    return files.map(list_map => read_file(folder + '/' + list_map));
};


function create_epsg(){
    var li = ['w', 'c', 'g', 'h', 'm'];
    return li.map(create_epsg_folder);
};


function recreate_epsg(mat){
    var new_mat = {};
    for (i = 0; i<mat.length;i++){
        for (j=0;j<mat[i].length;j++){
            var filename = mat[i][j]["file"];
            var coord = mat[i][j]["coord_epsg"];
            var lines = mat[i][j]["lines"];
            new_mat[filename] = {epsg_data: coord, other_data: lines};
        };
    };
    return new_mat;
};


var mat = create_epsg();
var new_mat = recreate_epsg(mat);

fs.writeFileSync(filespath + 'data_tsv.json', JSON.stringify(new_mat));
process.exit()