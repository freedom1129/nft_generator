# NFT Metadata and Thumbnail Generator

This Node.js project generates metadata and thumbnails for Non-Fungible Tokens (NFTs). It can be used to create metadata files conforming to NFT standards like ERC-721 or ERC-1155, as well as thumbnails for displaying NFT previews.

## Features

- Import the occurrence(rarity) table from `input.csv` file.
- Generate NFT metadata in CSV format for OpenSea drop.
- Generate NFT metadata files in JSON format.
- Generate thumbnails for NFTs. (`output/media`)
- Customize metadata properties such as name, description, image URL, attributes, etc. in `settings.json` file.

## Installation

1. Clone the repository to your local machine:

    ```bash
    git clone https://github.com/opensea712/metadata-generator.git
    ```

2. Navigate into the project directory:

    ```bash
    cd metadata-generator
    ```

3. Install dependencies using npm or Yarn:

    ```bash
    npm install
    ```

## Usage

    ```bash
    npm start
    ```

## License

This project is licensed under the MIT License.