rtfCount=$(ls *.rtf | wc -l)

echo Files: $rtfCount

for start in $(seq 0 100 $rtfCount)
do
    end=$((start + 100))

    echo Converting $start to $end files

    files=$(ls *.rtf | head -n +$end | tail -n 100)

    echo $files

    libreoffice --headless --invisible --norestore --convert-to pdf $files
done
