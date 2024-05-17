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
  outputJsonPath,
  totalCount,
  description,
  externalUrl,
  nftStoreUrl
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

      console.log(totalCount - i)

      let csvRow = {};
      let url;

      while (1) {

        csvRow = {}
        url = externalUrl + '/?';

        let indexOfKey = {};

        if (analyzedData.Material.includes('Glow')) {
          const indexOfGlow = analyzedData.Material.indexOf('Glow')
          filteredKey.map((key) => {
            const index = Math.floor(Math.random() * (i + 1));
            if (key === 'Material') {

              csvRow = {
                ...csvRow,
                [`attributes[${key}]`]: 'Glow'
              }
              url += `${key}=${analyzedData[key][indexOfGlow]}&`;
              indexOfKey[key] = indexOfGlow
            } else if (key === 'Background') {

              const indexesOfBlack = [];

              analyzedData.Background.forEach((ele, index) => {
                if (ele.includes('Black')) {
                  indexesOfBlack.push(index);
                }
              })

              const randomIndex = Math.floor(Math.random() * (indexesOfBlack.length))

              csvRow = {
                ...csvRow,
                [`attributes[${key}]`]: analyzedData.Background[indexesOfBlack[randomIndex]]
              }

              url += `${key}=${analyzedData[key][indexesOfBlack[randomIndex]]}&`;
              indexOfKey[key] = indexesOfBlack[randomIndex];

            } else {

              csvRow = {
                ...csvRow,
                [`attributes[${key}]`]: analyzedData[key][index],
              };

              url += `${key}=${analyzedData[key][index]}&`;
              indexOfKey[key] = index;
            }
          });

        } else if (analyzedData.Material.includes('Original')) {
          const indexOfOriginal = analyzedData.Material.indexOf('Original');
          filteredKey.map((key) => {
            const index = Math.floor(Math.random() * (i + 1));
            if (key === 'Material') {

              csvRow = {
                ...csvRow,
                [`attributes[${key}]`]: 'Original'
              }
              url += `${key}=${analyzedData[key][indexOfOriginal]}&`;
              indexOfKey[key] = indexOfOriginal
            } else {

              csvRow = {
                ...csvRow,
                [`attributes[${key}]`]: analyzedData[key][index],
              };

              url += `${key}=${analyzedData[key][index]}&`;
              indexOfKey[key] = index;
            }
          });
        }

        else {
          filteredKey.map((key) => {
            const index = Math.floor(Math.random() * (i + 1));
            csvRow = {
              ...csvRow,
              [`attributes[${key}]`]: analyzedData[key][index],
            };
            url += `${key}=${analyzedData[key][index]}&`;
            indexOfKey[key] = index;
          });
        }


        if (csvContent.find(row => row.external_url === url.slice(0, -1))) {
          continue;
        } else {
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
      console.log(analyzedData)
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

    const shufffledCsvContent = shuffleArray(csvContent);

    csvWriter
      .writeRecords(shufffledCsvContent)
      .then(() => console.log('CSV file has been written successfully'))
      .catch((err) => console.error('Error writing CSV file:', err));

  }
};


function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // Generate random index from 0 to i

    // Swap elements at i and j
    const tempUrl = array[j].external_url;
    const tempBG = array[j]['attributes[Background]'];
    const tempName = array[j]['attributes[Name]'];
    const tempMaterial = array[j]['attributes[Material]'];

    array[j].external_url = array[i].external_url;
    array[j]['attributes[Background]'] = array[i]['attributes[Background]'];
    array[j]['attributes[Name]'] = array[i]['attributes[Name]'];
    array[j]['attributes[Material]'] = array[i]['attributes[Material]'];

    array[i].external_url = tempUrl;
    array[i]['attributes[Background]'] = tempBG;
    array[i]['attributes[Name]'] = tempName;
    array[i]['attributes[Material]'] = tempMaterial;
  }
  return array;
}

parseCSV(inputFilePath, totalCount, description, handleParsedCSVData);
