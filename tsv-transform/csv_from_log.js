var fs = require('fs');
var filespath = process.cwd() + "/files/";

function array_to_csv(entree, sortie){
    var arr = JSON.parse(fs.readFileSync(filespath + entree, 'utf8'));
    var header = 'nom du fichier,epsg,valeur_X,valeur_Y,probleme\n'
    fs.writeFileSync(filespath + sortie, header, 'UTF-8', {'flags': 'a+'});
    for(i=0; i<arr.length; i++){
        var mat = arr[i];
        if (mat.length == 2){
            var mess = mat[0] + ',,,,' + mat[1] + '\n'
        } else {
            if ((mat[2] == null) || (mat[2] == 'undefined') ) {
                var mess = mat[0] + ',' + mat[1] + ',' + mat[2] + ',' + mat[2] + ',' + mat[3] + '\n'
            } else {
                try{
                    var mess = mat[0] + ',' + mat[1] + ',' + mat[2]['X'].replace(',', '.') + ',' + mat[2]['Y'].replace(',', '.') + ',' + mat[3] + '\n'
                } catch {
                    var mess = mat[0] + ',' + mat[1] + ',' + mat[2]['X'] + ',' + mat[2]['Y'] + ',' + mat[3] + '\n'
                }
            }
        }
        fs.appendFileSync(filespath + sortie, mess, 'UTF-8', {'flags': 'a+'});
    }
}

array_to_csv('log_erreur.json', 'prob.csv')




