cat exports/onf-dossiers.csv |
    # AR2014014, date arrivée DRIRE incorrecte
    sed 's/20010512/20140512/g' |
    # AR2009017, numéro ptmg inversé
    sed 's/18-09/09-18/g' |
    # AR2010004, numéro ptmg double
    sed 's/32010\/33-34/PTMG-2010-33-34/g' |
    # AR2010003, numéro ptmg double
    sed 's/2010\/25-26/PTMG-2010-25-26/g' |
    # AR2013006, numéro ptmg incorrect
    sed 's/140305/14305/g' > exports/onf-dossiers-corrected.csv
