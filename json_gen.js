const fs = require('fs');
const csvParser = require('csv-parser');

const settings = require('./settings.json');

const {
    outputFilePath,
    outputJsonPath,
    nftStoreUrl
} = settings;

const parseCSV = (inputFilePath, callback) => {
    const data = [];

    fs.createReadStream(inputFilePath)
        .pipe(csvParser())
        .on('data', (row) => {
            data.push(row);
        })
        .on('end', () => {
            callback(null, data);
        })
        .on('error', (err) => {
            callback(err, null);
        });
};

const jsonGenerator = (err, data) => {
    if (err) {
        console.error(err)
    } else {

        const attributesKey = Object.keys(data[0]).filter((key) => key.includes('attributes'));
        const regex = /\[(.*?)\]/; // Regular expression to match strings within square brackets

        data.forEach((content, ind) => {

            const attributes = [];

            attributesKey.forEach((key) => {
                attributes.push({
                    "trait_type": regex.exec(key)[1],
                    "value": content[key]
                })
            })

            const formattedMetaData = {
                "description": content.description,
                "external_url": content.external_url,
                "name": content.name,
                "image": `${nftStoreUrl}/${content.tokenID}`,
                "attributes": attributes
            }

            const nftMetaData = JSON.stringify(formattedMetaData, null, 2); // The second argument (null) is for the replacer function, and the third argument (2) is for indentation.
            fs.writeFile(`${outputJsonPath}/${ind + 1}.json`, nftMetaData, (err) => {
                if (err) {
                    console.error('Error writing to file:', err);
                    return;
                }
                console.log('Data has been written to data.json');
            });
        })
    }
}

parseCSV(outputFilePath, jsonGenerator);

