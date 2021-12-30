
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function (accounts) {

    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        "0x1de108D5618e61b6Df42dB81FE2Ce5B25A09b0ac",
        "0x9e20893d3AB31aC6206872a6d21DF7cc078690d2",
        "0xd47d6dC07EE1cF61ce7b6786e6288BAd53E843cE",
        "0xf1893aDd3ef63d5A0AE10c3A0B44B90D40580fE8",
        "0xC1ddc6BAAb29093366f6fefd3233b7Ae3B58b3ef",
        "0x819ac302221d9976a4be35f20A3F147E18031f44",
        "0x0086C187097637f39fc96D2aC94da251fCa36569",
        "0xe88130ebAbb5f9789012bde73AEe12160db9A958",
        "0x48466ac5De8dA250121d38dB4eAaCee2A9c6803c",
        "0xF2310AF074A03752929B181871367E1E92f779F2"
    ];


    let owner = accounts[0];
    let firstAirline = accounts[1];

    let flightSuretyData = await FlightSuretyData.new(firstAirline);
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address);


    return {
        owner: owner,
        firstAirline: firstAirline,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};