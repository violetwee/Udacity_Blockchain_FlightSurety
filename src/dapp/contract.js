import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {

    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

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
                if (error) console.log('fundAirline: ', error);

                console.log('fundAirline', res);
            })

            while (this.airlines.length < 5) {
                let acc = accts[counter++];
                this.airlines.push(acc);
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

    fetchFlightStatus(airline, flightNo, timestamp, callback) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flightNo,
            timestamp: timestamp
        }
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner }, (error, result) => {
                callback(error, payload);
            });
    }

    // Fund first airline so that it can register flights
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


    registerFlight(airline, flightNo, departureFrom, arrivalAt, timestamp, callback) {
        let self = this;

        console.log('registerFlight', airline, flightNo, departureFrom, arrivalAt, timestamp);

        self.flightSuretyApp.methods
            .registerFlight(airline, flightNo, departureFrom, arrivalAt, timestamp)
            .call({ from: airline }, callback);
    }

    isRegisteredFlight(airline, flightNo, timestamp, callback) {
        let self = this;

        console.log('isRegisteredFlight', airline, flightNo, timestamp);

        self.flightSuretyApp.methods
            .isRegisteredFlight(airline, flightNo, timestamp)
            .call(callback);
    }

    buyInsurance(airline, flightNo, timestamp, amount, callback) {
        let self = this;

        amount = this.web3.utils.toWei(amount, 'ether');
        console.log('buy insurance: ', this.passengers[0], amount);

        self.flightSuretyApp.methods
            .buyInsurance(airline, flightNo, timestamp)
            .send({ from: this.passengers[0], value: amount, gas: 4600000 }, callback);
    }

    isInsured(airline, flightNo, timestamp, callback) {
        let self = this;

        self.flightSuretyApp.methods
            .isPassengerInsured(airline, flightNo, timestamp)
            .call({ from: this.passengers[0] }, callback);
    }

    getPassengerCredits(address, callback) {
        let self = this;
        console.log('get passenger credits', address);

        self.flightSuretyApp.methods
            .getPassengerCredits(address)
            .call(callback);
    }

    withdrawCredits(address, callback) {
        let self = this;
        console.log('withdraw credits: ', address);

        self.flightSuretyApp.methods
            .withdrawCredits()
            .send({ from: address, gas: 4600000 }, callback);
    }
}