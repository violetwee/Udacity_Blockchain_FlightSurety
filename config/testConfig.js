
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function (accounts) {

    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        "0x6b5648CE942F39dcBB5BD998d4ff267aF95671bc",
        "0xBffE19015cbb813F81772ECaF2E234d9EF934C65",
        "0x4B040E65FDC1540795EA5495Ed925e85772df298",
        "0x52e092D590Ea084f3198045217a1d1D21878C690",
        "0x5E3eDd2c339A1D5AbDeC982F4C9f6FaB0003D064",
        "0x63559f0B1286f83033de919FE3A0aFA9e16114a5",
        "0x0296F9d85cB58A82eeb342030b8C6E52584b19F9",
        "0xAFb9623AF31E0B19bf1cEFBABbFFc9525E98AC05",
        "0x6e64c01A8ed27026179Cf6c3Af123F5B45a5A347",
        "0xAcCd725e3A2057A15579119e5Aa56585A657a9C1"
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