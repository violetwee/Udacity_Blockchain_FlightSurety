import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
// const TruffleContract = require("@truffle/contract");

export default class Contract {

    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

        // let web3Provider = new Web3.providers.WebsocketProvider(this.config.url.replace('http', 'ws'));
        // this.web3 = new Web3(web3Provider);
        // this.flightSuretyApp = TruffleContract(FlightSuretyApp);
        // this.flightSuretyApp.setProvider(web3Provider);

        console.log('config', config.url, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.firstAirline = null;
        this.airlines = [];
        this.passengers = [];

        console.log('FlightSuretyApp.abi', FlightSuretyApp.abi);
        console.log('app address:', config.appAddress);
    }

    initialize(callback) {
        let DEFAULT_FUND_AMOUNT = this.web3.utils.toWei('10', 'ether');
        this.web3.eth.getAccounts((error, accts) => {
            this.owner = accts[0];
            this.firstAirline = accts[1];
            let counter = 2;



            // fund the first airline
            this.fundAirline(this.firstAirline, DEFAULT_FUND_AMOUNT, (error, res) => {
                console.log('fund ---> ', this.firstAirline);
                console.log('fundAirline err', error);
                console.log('fundAirline res', res);
                this.getFundsForAirline(this.firstAirline, (error, res) => {
                    console.log('getFundsForAirline err', error);
                    console.log('getFundsForAirline res', res);
                })

            })

            while (this.airlines.length < 5) {
                let acc = accts[counter++];
                this.airlines.push(acc);

                // this.registerAirline(acc, this.firstAirline, (error, res) => {
                //     console.log('register ---> ', acc);
                //     console.log('registerAirline err', error);
                //     console.log('registerAirline res', res);
                //     this.fundAirline(acc, DEFAULT_FUND_AMOUNT, (error, res) => {
                //         console.log('fund ---> ', acc);
                //         console.log('fundAirline err', error);
                //         console.log('fundAirline res', res);
                //     })
                // })
            }

            while (this.passengers.length < 5) {
                let acc = accts[counter++];
                this.passengers.push(acc);
            }

            callback();
        });
    }

    isOperational(callback) {
        let self = this;

        self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner }, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        }
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner }, (error, result) => {
                callback(error, payload);
            });
    }

    // Initialise an airline for demo/testing purposes
    registerAirline(address, caller, callback) {
        let self = this;

        self.flightSuretyApp.methods
            .registerAirline(address)
            .call({ from: caller }, callback);
    }

    // Fund airline so that it can register flights
    fundAirline(address, amount, callback) {
        let self = this;

        self.flightSuretyApp.methods
            .fund()
            .send({ from: address, value: amount, gas: 4600000 }, callback);
    }
    getFundsForAirline(address, callback) {
        let self = this;

        self.flightSuretyApp.methods
            .getFundsForAirline(address)
            .call({ from: address }, callback);
    }

    registerFlight(airline, flightNo, from, to, timestamp, callback) {
        let self = this;

        self.flightSuretyApp.methods
            .registerFlight(airline, flightNo, from, to, timestamp)
            .call({ from: airline }, callback);
    }
}