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

        if (analyzedData.Material.includes('Glow')) {
          const indexOfGlow = analyzedData.Material.indexOf('Glow')

          filteredKey.map((key) => {
            const index = Math.floor(Math.random() * i);
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

              const randomIndex = Math.floor(Math.random() * (indexesOfBlack.length - 1))

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

          console.log(url)

        } else {
          filteredKey.map((key) => {
            const index = Math.floor(Math.random() * i);
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

    shufffledCsvContent.forEach((content, ind) => {

      const attributes = [];

      filteredKey.forEach((key) => {
        attributes.push({
          "trait_type": key,
          "value": content[`attributes[${key}]`]
        })
      })

      const formattedContent = {
        "description": content.description,
        "external_url": content.external_url,
        "name": content.name,
        "attributes": attributes
      }

      const stringfiedContent = JSON.stringify(formattedContent, null, 2); // The second argument (null) is for the replacer function, and the third argument (2) is for indentation.
      // Write JSON string to a file
      fs.writeFile(`${outputJsonPath}/${ind + 1}.json`, stringfiedContent, (err) => {
        if (err) {
          console.error('Error writing to file:', err);
          return;
        }
        console.log('Data has been written to data.json');
      });
    })

    csvWriter
      .writeRecords(shufffledCsvContent)
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

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); // Generate random index from 0 to i

      // Swap elements at i and j
      [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

parseCSV(inputFilePath, totalCount, description, handleParsedCSVData);
