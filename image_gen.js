const fs = require('fs');
const csvParser = require('csv-parser');
const sharp = require('sharp');

const settings = require('./settings.json');

const {
    outputFilePath,
    outputImagePath
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

const imageGenerator = (err, data) => {
    if (err) {
        console.error(err);
    } else {
        data.forEach(content => {
            const imagePaths = [
                './assets/backgrounds/' + content['attributes[Background]'] + '.png',
                './assets/models/' + content['attributes[Name]'] + '/' + content['attributes[Material]'] + '.png',
            ];
            combineImages(imagePaths, `${outputImagePath}/${index + 1}.png`);
        });
    }
}

async function combineImages(imagePaths, outputPath) {
    try {
        const headImage = await sharp(imagePaths[1]).resize({
            width: 1024,
            height: 1024,
        }).toBuffer();

        sharp(imagePaths[0])
            .resize(1024)
            .composite([{ input: headImage }])
            .toFile(outputPath);

        console.log('Composited image saved successfully.');
    } catch (error) {
        console.error(error);
    }
}


parseCSV(outputFilePath, imageGenerator);