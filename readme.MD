# HNS.id MetaMask Snap

This project provides a MetaMask Snap that allows HNS.id domains to resolve directly in the browser, utilizing domains that are configured and stored on the Optimism blockchain. The project consists of two main components:

- **MetaMask Snap Plugin** (in `src/plugin`)
- **React Site** (in `src/mm-snap-site`) for managing and interacting with the Snap.

## Features
- Enables resolution of HNS.id domains directly in your browser.
- The Snap interacts with the Optimism blockchain to read domain data.
- Simple web interface for connecting and interacting with the Snap via the React frontend.

## Prerequisites
- **Node.js** and **Yarn** must be installed on your machine.
- **MetaMask Flask** should be installed in your browser (MetaMask Flask is the developer version of MetaMask that allows Snaps functionality).

## Project Structure
- `src/mm-snap-site`: Contains the frontend React application.
- `src/plugin`: Contains the MetaMask Snap code.

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/namebasehq/hns-id-mm-snap
cd hns-id-mm-snap
```

### 2. Install Dependencies
Run the following command in the root directory to install all dependencies for both the React site and the MetaMask Snap plugin:
```bash
yarn install
```

### 3. Run the Development Server
You can start both the React site and the Snap plugin simultaneously using:
```bash
yarn dev
```
This command will run the following script:
```json
"dev": "yarn workspaces foreach -A --parallel run start"
```
This ensures that both `mm-snap-site` and `plugin` are started together in parallel.

### 4. Using the MetaMask Snap
- **Install MetaMask Flask**: Make sure to install MetaMask Flask, as the Snap functionality is only supported there (until whitelisted by Metamask). You can install it from [MetaMask Flask](https://chrome.google.com/webstore/detail/metamask-flask/ljfoeinjpaedjfecbmggjgodbgkmjkjk).
- **Connect MetaMask**: Open the browser and go to the React app.
- Use the provided interface to connect the MetaMask Snap, send requests, or view logs.

## Available Commands

- **Install all dependencies**: 
  ```bash
  yarn install
  ```
- **Start all workspaces**:
  ```bash
  yarn dev
  ```

## MetaMask Snap Usage

The MetaMask Snap allows you to use and interact with HNS.id domains through MetaMask. With the plugin installed, the following features are available:
- **Domain Resolution**: Resolves HNS.id domains that are stored on the Optimism blockchain.

### Troubleshooting
- Ensure MetaMask Flask is installed and configured correctly.
- If the Snap does not connect, make sure your local development server is running and accessible.

## License
MIT License
