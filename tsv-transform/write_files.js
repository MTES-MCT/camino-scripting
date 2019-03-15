var fs = require('fs');
var filespath = process.cwd() + "/files/";
var data = JSON.parse(fs.readFileSync(filespath + "data_final.json", 'utf8'));

function check_error(filename){
    var epsg_data = data[filename]['epsg_data'];
    var log_error = data[filename]['correct'];
    var error_arr = new Array();
    for (i=0; i < epsg_data.length; i++){
        var arr = new Array();
        var check_arr = new Array();
        var n = epsg_data[i]['coord'].length;
        for (j=0;j<n;j++){
            var elem = log_error[j+i*n]
            if (!check_arr.includes(elem[1])){
                check_arr.push(elem[1]);
                arr.push([elem[0], elem[1]]);
            };
        };
        if (arr.length != 1){
            console.log(filename, arr);
        };
        error_arr.push(arr);
    };
    return error_arr;
};

function find_error_priority(error_arr){
    var priority_error = {'Inutilisable': 4, 'A verifier': 3, 'A corriger': 2, 'Corrige': 1, 'OK': 0};
    var prio = 0;
    if (error_arr.length == 0){
        prio = 4
    };
    for(i=0;i<error_arr.length;i++){
        for (j=0;j<error_arr[i].length;j++){
            if(priority_error[error_arr[i][j][1]] > prio){
                prio = priority_error[error_arr[i][j][1]];
            };
        };
    };
    return prio;
};

function write_file(path, file_data, prio){
    groupe = file_data['other_data']['groupe'];
    contour = file_data['other_data']['contour'];
    point = file_data['other_data']['point'];
    jorf_id = file_data['other_data']['jorf_id'];
    description = file_data['other_data']['description'];
    epsg_data = file_data['epsg_data'];
    epsg_liste = '';
    for(i=0;i<epsg_data.length;i++){
        epsg_liste += '\t' + epsg_data[i]['epsg'] + '\t' + epsg_data[i]['epsg']
    }
    header = 'groupe\tcontour\tpoint\tjorf_id\tdescription' + epsg_liste;
    fs.writeFileSync(path, header, 'UTF-8');
    try{
        var n = groupe.length;
    } catch {
        var n = 0;
    };
    for (j=0;j<n;j++){
        mess = '\n' + groupe[j] + '\t' + contour[j] + '\t' + point[j] + '\t' + jorf_id[j] + '\t' + description[j];
        for (i=0;i<epsg_data.length;i++){
            if(prio == 3){
                mess += '\t' + epsg_data[i]['coord'][j]['Y'] + '\t' + epsg_data[i]['coord'][j]['X'];
            } else {
                mess += '\t' + epsg_data[i]['coord'][j]['X'] + '\t' + epsg_data[i]['coord'][j]['Y'];
            };
        };
        fs.appendFileSync(path, mess, 'UTF-8', {'flags': 'a+'});
    };
};

function write_data(){
    var files_names = Object.keys(data);
    for (k=0;k<files_names.length;k++){
        var filename = files_names[k];
        var error = check_error(filename);
        var prio = find_error_priority(error);
        //console.log(k, filename, error, prio)
        if (prio==0) path = filespath + 'clean_data/OK/' + filename.substring(2);
        else if (prio==1) path = filespath + 'clean_data/Corrige/'+ filename.substring(2);
        else if (prio==2) path = filespath + 'clean_data/A corriger/'+ filename.substring(2);
        else if (prio==3) path = filespath + 'clean_data/A verifier/'+ filename.substring(2);
        else if (prio==4) path = filespath + 'clean_data/Inutilisable/'+ filename.substring(2);
        write_file(path, data[filename], prio)
    };
};

write_data();
process.exit();