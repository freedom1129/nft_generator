// Import required modules
const fs = require('fs');
const csvParser = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const sharp = require('sharp');

const settings = require('./settings.json');
const { parse } = require('path');

// Destructure settings object
const {
  inputFilePath,
  outputCSVPath,
  outputImagePath,
  outputJsonPath,
  totalCount,
  description,
  externalUrl,
  nftStoreUrl
} = settings;

const priority = ['Glow', 'Rainbow', 'Rainbow2', 'Wireframe'];


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
    const attrs = Object.keys(data[0]).filter((str) => !str.includes('Percent'));;
    const attrType = {}
    let parsedData = {};
    let valueOfKey = [];
    attrs.map((attr) => {
      const typesOfAttrs = [];
      data.map((item) => {
        if (item[attr]) {
          valueOfKey.push({ [item[attr]]: item[`${attr}_Percent`] });
          typesOfAttrs.push(item[attr])
        }
      });
      attrType[attr] = typesOfAttrs;
      parsedData = { ...parsedData, [attr]: valueOfKey };
      valueOfKey = [];
    });

    let analyzedData = {};

    attrs.forEach((attr) => {
      let attrArr = [];
      parsedData[attr].forEach((ele) => {
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
      let randomAttrArr;
      if (attr !== 'Material') {
        randomAttrArr = shuffleArray(attrArr);
      } else {
        randomAttrArr = attrArr.sort(sortByPriority);
      }
      analyzedData = { ...analyzedData, [attr]: randomAttrArr };
    });

    const csvContent = [];
    let combs = [];
    let usedComb = [];
    let currentIndex = {};
    attrs.forEach((attr) => {
      currentIndex = { ...currentIndex, [attr]: 0 }
    })

    while (combs.length < totalCount) {
      let newComb = '';
      let bannedRule = false;


      if (
        analyzedData.Material[currentIndex.Material] === 'Glow' &&
        !analyzedData.Background[currentIndex.Background].includes('Black')
      ) { bannedRule = true; }

      if (
        analyzedData.Material[currentIndex.Material] === 'Glow' &&
        analyzedData.Name[currentIndex.Name].includes('_low')
      ) { bannedRule = true; }

      if (
        analyzedData.Material[currentIndex.Material] === 'Rainbow' &&
        analyzedData.Name[currentIndex.Name].includes('_low')
      ) { bannedRule = true; }

      if (
        analyzedData.Material[currentIndex.Material] === 'Rainbow2' &&
        analyzedData.Name[currentIndex.Name].includes('_low')
      ) { bannedRule = true; }

      if (
        analyzedData.Material[currentIndex.Material] === 'Wireframe' &&
        !analyzedData.Name[currentIndex.Name].includes('_low')
      ) { bannedRule = true; }


      attrs.forEach((attr) => {
        newComb += analyzedData[attr][currentIndex[attr]] + '-';
      })
      if (checkUsedCombination(newComb, usedComb) || bannedRule) {
        let loopForward = 1;
        attrs.forEach(attr => {
          currentIndex[attr] += loopForward;
          if (currentIndex[attr] < analyzedData[attr].length) loopForward = 0
          else {
            currentIndex[attr] = 0;
            loopForward = 1;
          }
        })
        if (loopForward) {
          if (!csvContent.length) {
            console.error('Could not find proper combinations. Please try agian');
            process.exit(1);
          }
          const lastComb = combs.pop()
          attrs.forEach(attr => {
            analyzedData[attr].push(lastComb[attr])
          })
        }
      } else {
        usedComb.push(newComb)
        let comb = {};
        comb.external_url = '';
        attrs.forEach(attr => {
          comb[attr] = analyzedData[attr][currentIndex[attr]];
          comb.external_url += `${attr}=${analyzedData[attr][currentIndex[attr]]}&`
        })
        combs.push(comb);
        console.log(comb.Material, combs.length);
        attrs.map((attr) => {
          const newArrOfAttr = analyzedData[attr];
          newArrOfAttr.splice(currentIndex[attr], 1);
          analyzedData = { ...analyzedData, [attr]: newArrOfAttr };
          currentIndex[attr] = 0;
        })
      }
    }

    combs.forEach((comb, ind) => {
      let csvRow = {};
      let url;
      attrs.forEach(attr => {
        csvRow[`attributes[${attr}]`] = comb[attr]
      })
      csvRow.tokenID = ind + 1;
      csvRow.name = `item${ind + 1}`;
      csvRow.description = description;
      csvRow.file_name = `${ind + 1}.png`
      csvRow.external_url = externalUrl + '/' + comb.external_url
      csvContent.push(csvRow);
    })

    const csvHeader = [];

    csvHeader.push(
      { id: 'tokenID', title: 'tokenID' },
      { id: 'name', title: 'name' },
      { id: 'description', title: 'description' },
      { id: 'file_name', title: 'file_name' },
      { id: 'external_url', title: 'external_url' }
    );

    attrs.map((attr) =>
      csvHeader.push({ id: `attributes[${attr}]`, title: `attributes[${attr}]` })
    );

    const csvWriter = createObjectCsvWriter({
      path: outputCSVPath,
      header: csvHeader,
    });

    const shufffledCsvContent = shuffleCSVContent(csvContent);

    csvWriter
      .writeRecords(shufffledCsvContent)
      .then(() => console.log('CSV file has been written successfully'))
      .catch((err) => console.error('Error writing CSV file:', err));

    console.log(attrs)
  };
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // Generate random index from 0 to i

    [array[i], array[j]] = [array[j], array[i]]
  }
  return array;
}

function shuffleCSVContent(array) {
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

function sortByPriority(a, b) {
  const priorityIndexA = priority.indexOf(a);
  const priorityIndexB = priority.indexOf(b);

  // If both elements are in the priority array
  if (priorityIndexA !== -1 && priorityIndexB !== -1) {
    return priorityIndexA - priorityIndexB;
  }

  // If only 'a' is in the priority array
  if (priorityIndexA !== -1) {
    return -1;
  }

  // If only 'b' is in the priority array
  if (priorityIndexB !== -1) {
    return 1;
  }

  // If neither element is in the priority array, sort naturally
  return a.localeCompare(b);
}

function checkUsedCombination(newComb, usedComb) {
  return usedComb.find((comb) => comb === newComb)
}

parseCSV(inputFilePath, totalCount, description, handleParsedCSVData);
