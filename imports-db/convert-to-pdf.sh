echo "converting from: $1"

rtfCount=$(ls $1/*.rtf | wc -l)

echo Files: $rtfCount

for start in $(seq 0 100 $rtfCount)
do
    end=$((start + 100))

    echo Converting $start to $end files

    files=$(ls $1/*.rtf | head -n +$end | tail -n 100)

    echo $files

    libreoffice --headless --invisible --norestore --convert-to pdf $files
done

echo "finished converting from: $1"
