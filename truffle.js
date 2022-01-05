var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "play biology off sister label jar round vanish witness spike rail dress"; //"candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

module.exports = {
  networks: {
    development: {
      // provider: function () {
      //   return new HDWalletProvider(mnemonic, "http://127.0.0.1:7545/", 0, 50);
      // },
      // network_id: '*',
      // gas: 4600000,
      host: '127.0.0.1',
      port: 8545,
      network_id: '*',
      gas: 4600000,
      // confirmations: 0,
      // timeoutBlocks: 50,
      // skipDryRun: true,
      websockets: true
    }
  },
  compilers: {
    solc: {
      version: "^0.4.25" //"^0.4.24"
    }
  }
};