// Import required modules
const fs = require('fs');
const csvParser = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const sharp = require('sharp');

const settings = require('./settings.json');

// Destructure settings object
const {
  inputFilePath,
  outputFilePath,
  outputImagePath,
  totalCount,
  description,
  externalUrl,
} = settings;

// Function to parse CSV file
const parseCSV = (inputFilePath, totalCount, description, callback) => {
  const data = [];

  fs.createReadStream(inputFilePath)
    .pipe(csvParser())
    .on('data', (row) => {
      data.push(row);
    })
    .on('end', () => {
      callback(null, totalCount, description, data);
    })
    .on('error', (err) => {
      callback(err, totalCount, description, null);
    });
};

const handleParsedCSVData = (err, totalCount, description, data) => {
  if (err) {
    console.error(err);
  } else {
    const keys = Object.keys(data[0]);
    const filteredKey = keys.filter((str) => !str.includes('Percent'));
    let parsedData = {};
    let valueOfKey = [];
    filteredKey.map((key) => {
      data.map((item) => {
        if (item[key]) {
          valueOfKey.push({ [item[key]]: item[`${key}_Percent`] });
        }
      });
      parsedData = { ...parsedData, [key]: valueOfKey };
      valueOfKey = [];
    });

    let analyzedData = {};

    filteredKey.forEach((key) => {
      let attrArr = [];
      parsedData[key].forEach((ele) => {
        const arr = Array.from(
          {
            length: Math.round(
              (totalCount *
                parseFloat(Object.values(ele)[0].replace('%', ''))) /
              100
            ),
          },
          () => Object.keys(ele)[0]
        );
        attrArr = [...attrArr, ...arr];
      });
      analyzedData = { ...analyzedData, [key]: attrArr };
    });

    let csvContent = [];

    for (let i = totalCount - 1; i >= 0; i--) {

      let csvRow = {};
      let url;
      
      while (1) {

        csvRow = {}
        url = externalUrl + '/?';

        let indexOfKey = {};

        filteredKey.map((key) => {
          const index = Math.floor(Math.random() * i);
          csvRow = {
            ...csvRow,
            [`attributes[${key}]`]: analyzedData[key][index],
          };
          url += `${key}=${analyzedData[key][index]}&`;
          indexOfKey = { ...indexOfKey, [key]: index }
        });


        if (csvContent.find(row => row.external_url === url.slice(0, -1))) {
          continue;
        } 
        else if ( csvRow["attributes[Background]"].includes("Black")) {
          const indexOfMaterial = analyzedData.Material.indexOf("Glow")
          csvRow = {
            ...csvRow,
            'attributes[Material]' : analyzedData.Material[indexOfMaterial]
          }
          indexOfKey = { ...indexOfKey, Material: indexOfMaterial}

          filteredKey.map((key) => {
            const newArrOfKey = analyzedData[key];
            newArrOfKey.splice(indexOfKey[key], 1);
            analyzedData = { ...analyzedData, [key]: newArrOfKey };
          })
          break;
        } 
        else {
          filteredKey.map((key) => {
            const newArrOfKey = analyzedData[key];
            newArrOfKey.splice(indexOfKey[key], 1);
            analyzedData = { ...analyzedData, [key]: newArrOfKey };
          })
          break;
        }
      }

      csvRow = {
        ...csvRow,
        tokenID: totalCount - i,
        name: `item${totalCount - i}`,
        description: description,
        file_name: `${totalCount - i}.png`,
        external_url: url.slice(0, -1),
      };

      csvContent.push(csvRow);
    }

    const csvHeader = [];

    csvHeader.push(
      { id: 'tokenID', title: 'tokenID' },
      { id: 'name', title: 'name' },
      { id: 'description', title: 'description' },
      { id: 'file_name', title: 'file_name' },
      { id: 'external_url', title: 'external_url' }
    );

    filteredKey.map((key) =>
      csvHeader.push({ id: `attributes[${key}]`, title: `attributes[${key}]` })
    );
    const csvWriter = createObjectCsvWriter({
      path: outputFilePath,
      header: csvHeader,
    });

    csvWriter
      .writeRecords(csvContent)
      .then(() => console.log('CSV file has been written successfully'))
      .catch((err) => console.error('Error writing CSV file:', err));

    // csvContent.forEach((content, index) => {
    //   const imagePaths = [
    //     './assets/backgrounds/' + content['attributes[Background]'] + '.png',
    //     './assets/models/' +
    //       content['attributes[Name]'] +
    //       '/' +
    //       content['attributes[Material]'] +
    //       '.png',
    //   ];
    //   combineImages(imagePaths, `${outputImagePath}/${index + 1}.png`);
    // });
  }
};

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

parseCSV(inputFilePath, totalCount, description, handleParsedCSVData);
