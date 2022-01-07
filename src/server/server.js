import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

const STATUS_CODES = {
  UNKNOWN: 0,
  ON_TIME: 10,
  LATE_AIRLINE: 20,
  // LATE_WEATHER: 30,
  // LATE_TECHNICAL: 40,
  // LATE_OTHER: 50
};

const NUM_ORACLES = 25;
let accounts = [];
let oracles = [];

flightSuretyApp.events.OracleRequest({
  fromBlock: 0
}, function (error, event) {
  if (error) console.log(error)

  // extract event data for contract call
  let { index, airline, flight, timestamp } = event.returnValues;
  console.log('=================================================');
  console.log(`[IncomingRequest] index=${index}, airline=${airline}, flight=${flight}, timestamp=${timestamp}`);
  // loop through all registered oracles
  for (let i = 0; i < oracles.length; i++) {
    // determine oracles to use based on oracle indexes

    if (oracles[i].indexes.includes(index)) {
      // call submitOracleResponse with a random status code
      let randomStatusCode = getRandomStatusCode();
      let oracle = oracles[i];

      flightSuretyApp.methods.submitOracleResponse(index, airline, flight, timestamp, randomStatusCode).send({ from: oracle.address }, (error, res) => {
        if (error) console.log(error);

        console.log(`[SubmitOracleResponse] flight=${flight}, oracle#${oracle.serial}=${oracle.address} (${oracle.indexes}), index=${index}, statusCode=${randomStatusCode}, res=${res}`);
      })
    }
  }
});

flightSuretyApp.events.FlightStatusInfo({
  fromBlock: 0
}, function (error, event) {
  if (error) console.log(error)

  let { airline, flight, timestamp, status } = event.returnValues;
  console.log(`[FlightInfoStatus] airline=${airline}, flight=${flight}, timestamp=${timestamp}, statusCode=${status}`);
})

const app = express();
app.get('/api', (req, res) => {
  res.send({
    message: 'An API for use with your Dapp!'
  })
})

// Internal functions
// Auto register oracles on startup
web3.eth.getAccounts((error, accs) => {
  if (error) console.log('error', error);

  accounts = accs;
  registerOracles(NUM_ORACLES);
});

function getRandomStatusCode() {
  let statusCodeIndex = Math.floor(Math.random() * Object.keys(STATUS_CODES).length);
  return STATUS_CODES[Object.keys(STATUS_CODES)[statusCodeIndex]];
}

function registerOracles(numOracles) {
  console.log(`-- Register ${numOracles} Oracle(s) --`);
  let ORACLE_ACCOUNT_INDEX = 10;

  for (let i = 0; i < numOracles; i++) {
    let acc = accounts[ORACLE_ACCOUNT_INDEX + i];

    flightSuretyApp.methods.registerOracle().send({ from: acc, value: web3.utils.toWei("1", "ether"), gas: 4600000 }, (error, res) => {
      if (error) console.log('error', error);

      // register oracle indexes
      flightSuretyApp.methods.getMyIndexes().call({ from: acc }, (error, indexes) => {
        if (error) console.log('error', error);

        oracles.push({ serial: i + 1, address: acc, indexes: indexes });
        console.log(`${i + 1}. Oracle registered: ${acc} > ${indexes}`);
      })
    })
  }
}


export default app;
