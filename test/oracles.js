
const assert = require('assert');
const { default: BigNumber } = require('bignumber.js');
var Test = require('../config/testConfig.js');
//var BigNumber = require('bignumber.js');

contract('Oracles', async (accounts) => {

  const TEST_ORACLES_COUNT = 20;
  // Watch contract events
  const STATUS_CODE_UNKNOWN = 0;
  const STATUS_CODE_ON_TIME = 10;
  const STATUS_CODE_LATE_AIRLINE = 20;
  const STATUS_CODE_LATE_WEATHER = 30;
  const STATUS_CODE_LATE_TECHNICAL = 40;
  const STATUS_CODE_LATE_OTHER = 50;

  let ORACLE_ACCOUNT_INDEX = 10;
  const INSURANCE_FEE = web3.utils.toWei("1", "ether");

  let flight1 = {};

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);

    flight1 = {
      airline: config.firstAirline,
      flightNo: "SQ390",
      departureFrom: "SIN",
      arrivalAt: "BKK",
      timestamp: 1640928519
    }
  });

  describe('Test oracles', () => {
    it('can register oracles', async () => {

      // ARRANGE
      let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

      // ACT
      for (let a = 1; a < TEST_ORACLES_COUNT; a++) {
        let acc = accounts[ORACLE_ACCOUNT_INDEX + a];

        await config.flightSuretyApp.registerOracle({ from: acc, value: fee, gas: 4600000 });
        let result = await config.flightSuretyApp.getMyIndexes.call({ from: acc });
        assert.equal(result.length, 3, "Oracle should be registered with 3 indexes")
        console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
      }
    });

    it('can request flight status', async () => {

      // ARRANGE
      let passenger2 = config.testAddresses[2];
      const AIRLINE_REGISTRATION_FEE = web3.utils.toWei("10", "ether");

      await config.flightSuretyApp.fund.sendTransaction({ from: flight1.airline, value: AIRLINE_REGISTRATION_FEE, gas: 4600000 });
      console.log('flight1.airline', flight1.airline);

      // register a flight
      await config.flightSuretyApp.registerFlight(flight1.airline, flight1.flightNo, flight1.departureFrom, flight1.arrivalAt, flight1.timestamp, { from: flight1.airline });

      // check if flight is registered 
      let isRegistered = await config.flightSuretyApp.isRegisteredFlight(flight1.airline, flight1.flightNo, flight1.timestamp);
      console.log('Flight registered = ', isRegistered);

      // buy insurance
      await config.flightSuretyApp.buyInsurance.sendTransaction(flight1.airline, flight1.flightNo, flight1.timestamp, { from: passenger2, value: INSURANCE_FEE, gas: 4600000 });

      // // check if passenger is insured
      // let result = await config.flightSuretyApp.isPassengerInsured(passenger2, flight1.airline, flight1.flightNo, flight1.timestamp);
      // console.log('Passenger insured = ', result);

      // Submit a request for oracles to get status information for a flight
      await config.flightSuretyApp.fetchFlightStatus(flight1.airline, flight1.flightNo, flight1.timestamp);

      // ACT
      // Since the Index assigned to each test account is opaque by design
      // loop through all the accounts and for each account, all its Indexes (indices?)
      // and submit a response. The contract will reject a submission if it was
      // not requested so while sub-optimal, it's a good test of that feature

      for (let a = 1; a < TEST_ORACLES_COUNT; a++) {
        let acc = accounts[ORACLE_ACCOUNT_INDEX + a];

        // Get oracle information
        let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: acc });
        for (let idx = 0; idx < 3; idx++) {

          try {
            // Submit a response...it will only be accepted if there is an Index match
            await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], flight1.airline, flight1.flightNo, flight1.timestamp, STATUS_CODE_LATE_AIRLINE, { from: acc });
            console.log('Oracle response submitted', idx, oracleIndexes[idx].toNumber());
          }
          catch (e) {
            // Enable this when debugging
            console.log('\nError', idx, oracleIndexes[idx].toNumber(), flight1.flightNo, flight1.timestamp);
            // console.log(e);
          }
        }
      }
    });
  })

  // Test if passenger can receive credits
  describe('Test front end', () => {
    it('can get insuree credits', async () => {
      let passenger2 = config.testAddresses[2];

      let result = await config.flightSuretyData.isPassengerInsured(passenger2, flight1.airline, flight1.flightNo, flight1.timestamp);
      console.log('Passenger insured = ', result);

      let credits = await config.flightSuretyApp.getPassengerCredits(passenger2);

      credits = BigNumber(credits);
      console.log('credits', credits);
      assert.equal(credits, INSURANCE_FEE * 1.5, "Insuree should receive credits for late airline")
    })
  })
});
