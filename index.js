// Import required modules
const fs = require('fs')
const csvParser = require('csv-parser')
const { createObjectCsvWriter } = require('csv-writer')
const sharp = require("sharp")

// Define input and output CSV file paths
const inputFilePath = './data/attribute.csv'
const outputFilePath = './data/output/output.csv'
const outputImagePath = './data/output'
const totalCount = 20
const description = ""

// Function to parse CSV file
const parseCSV = (inputFilePath, totalCount, description, callback) => {
  const data = []

  fs.createReadStream(inputFilePath)
    .pipe(csvParser())
    .on('data', (row) => {
      data.push(row)
    })
    .on('end', () => {
      callback(null, totalCount, description, data)
    })
    .on('error', (err) => {
      callback(err, totalCount, description, null)
    })
}

const handleParsedCSVData = (err, totalCount, description, data) => {
  if (err) {
    console.error(err)
  } else {
    const keys = Object.keys(data[0])
    const filteredKey = keys.filter(str => !str.includes("Percent"))
    let parsedData = {}
    let valueOfKey = []
    filteredKey.map((key) => {
      data.map(item => {
        if (item[key]) {
          valueOfKey.push({ [item[key]]: item[`${key}_Percent`] })
        }
      })
      parsedData = { ...parsedData, [key]: valueOfKey }
      valueOfKey = []
    })

    let analyzedData = {}
    filteredKey.forEach((key) => {
      let attrArr = []
      parsedData[key].forEach(ele => {
        const arr = Array.from(({ length: totalCount * parseInt(Object.values(ele)[0].replace("%", "")) / 100 }), () => Object.keys(ele)[0])
        attrArr = [...attrArr, ...arr]
      })
      analyzedData = { ...analyzedData, [key]: attrArr }
    })

    let csvContent = []

    for (let i = totalCount - 1; i >= 0; i--) {

      let csvRow = {}
      let externalUrl = "https://example.com/?"

      filteredKey.map(key => {
        const index = Math.floor(Math.random() * i)
        csvRow = { ...csvRow, [key]: analyzedData[key][index] }
        externalUrl += `${key}=${analyzedData[key][index]}&`

        const newArrOfKey = analyzedData[key]
        newArrOfKey.splice(index, 1)
        analyzedData = { ...analyzedData, [key]: newArrOfKey }
      })
      externalUrl.slice()
      csvRow = { ...csvRow, external_url: externalUrl.slice(0, -1)}
      csvContent.push(csvRow)
    }

    console.log(csvContent)

    const csvHeader = filteredKey.map((key) => ({ id: key, title: key }))
    csvHeader.push({id: "external_url", title: "external_url"})
    const csvWriter = createObjectCsvWriter({ path: outputFilePath, header: csvHeader })

    csvWriter.writeRecords(csvContent)
      .then(() => console.log('CSV file has been written successfully'))
      .catch((err) => console.error('Error writing CSV file:', err))

    csvContent.forEach((content, index) => {
      const imagePaths = Object.values(content).map((image) => "./assets/" + image + ".png")
      imagePaths.splice(filteredKey.length, 1)
      combineImages(imagePaths, `${outputImagePath}/${index}.png`)
    })
  }
}

async function combineImages(imagePaths, outputPath) {
  try {

    const background = imagePaths.splice(0, 1)

    sharp(background[0]).composite(imagePaths.map((imagePath) => ({ input: imagePath }))).toFile(outputPath)

    console.log('Combined image saved successfully.')
  } catch (error) {
    console.error('Error:', error)
  }
}

parseCSV(inputFilePath, totalCount, description, handleParsedCSVData)
