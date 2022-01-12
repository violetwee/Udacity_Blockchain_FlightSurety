
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const assert = require('assert');

contract('Flight Surety Tests', async (accounts) => {
    var config;
    const AIRLINE_REGISTRATION_FEE = web3.utils.toWei("10", "ether");
    const INSURANCE_FEE = web3.utils.toWei("1", "ether");

    let flight1 = {};

    // console.log('accounts', accounts);
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authorizeContract(config.flightSuretyApp.address);

        flight1 = {
            airline: config.firstAirline,
            flightNo: "SQ390",
            departureFrom: "SIN",
            arrivalAt: "BKK",
            timestamp: 1640928519
        }
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/
    describe(`Test operational`, () => {
        it(`(multiparty) has correct initial isOperational() value`, async function () {

            // Get operating status
            let status = await config.flightSuretyData.isOperational.call();
            assert.equal(status, true, "Incorrect initial operating status value");

        });

        it(`(multiparty) can block access to setOperatingStatus() for non-contract owner account`, async function () {

            try {
                await config.flightSuretyData.setOperatingStatus.call(false, { from: config.testAddresses[2] });
            }
            catch (e) {
                // console.log('e', e);
            }
            let status = await config.flightSuretyData.isOperational.call();
            assert.equal(status, true, "Non-contract owner should not be able to set operating status");
        });

        it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

            try {
                await config.flightSuretyData.setOperatingStatus(false);
                let status = await config.flightSuretyData.isOperational.call();
                assert.equal(status, false, "Access should be restricted to contract owner only");
            }
            catch (e) {
                console.log('e', e);
            }
        });

        it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

            await config.flightSuretyData.setOperatingStatus(false);

            let reverted = false;
            try {
                await config.flightSurety.setTestingMode(true);
            }
            catch (e) {
                reverted = true;
            }
            assert.equal(reverted, true, "Access not blocked for requireIsOperational");

            // Set it back for other tests to work
            await config.flightSuretyData.setOperatingStatus(true);

        });
    })

    describe(`Test airline functionalities`, () => {
        it('(airline) first airline is registered when contract is deployed', async () => {

            // ARRANGE
            let firstAirline = config.firstAirline;

            // ACT
            let result = await config.flightSuretyData.isRegisteredAirline.call(firstAirline);

            // ASSERT
            assert.equal(result, true, "Airline should be registered on contract deployment");
        });


        it('(airline) cannot register an airline using registerAirline() if it is not funded', async () => {

            // ARRANGE
            let newAirline = accounts[2];

            // ACT
            try {
                await config.flightSuretyApp.registerAirline.call(newAirline, { from: config.firstAirline });
            }
            catch (e) {
                // console.log('registerAirline', e);
            }
            let result = await config.flightSuretyData.isRegisteredAirline.call(newAirline);

            // ASSERT
            assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
        });

        it('(airline) airline is able to fund its account', async () => {

            // ARRANGE
            let firstAirline = config.firstAirline;

            // ACT
            try {
                await config.flightSuretyApp.fund.sendTransaction({ from: firstAirline, value: AIRLINE_REGISTRATION_FEE, gas: 4600000 });
            }
            catch (e) {
                console.log(e);
            }

            let result = await config.flightSuretyData.isFundedAirline.call(firstAirline);
            let funds = await config.flightSuretyData.getFundsForAirline.call(firstAirline);
            funds = BigNumber(funds);

            // ASSERT
            assert.equal(result, true, "Airline should be able to provide funding to its account");
            assert.equal(funds, AIRLINE_REGISTRATION_FEE, "Funds not added to airline's account");
        });

        it('(airline) can register another airline using registerAirline() if it is funded', async () => {

            // ARRANGE
            let firstAirline = config.firstAirline; // is funded in previous test case
            let newAirline2 = accounts[2]; // register 2nd airline

            // ACT
            try {
                await config.flightSuretyApp.registerAirline(newAirline2, { from: firstAirline });
            }
            catch (e) {
                console.log(e);
            }

            let result = await config.flightSuretyData.isRegisteredAirline.call(newAirline2);

            // ASSERT
            assert.equal(result, true, "Airline should be able to register a new airline if it has provided funding");
        });

        it('(airline) can register up to 4 airlines without multi-sig consensus', async () => {

            // ARRANGE
            let firstAirline = config.firstAirline; // is funded in previous test case
            let newAirline3 = accounts[3]; // register 3rd airline
            let newAirline4 = accounts[4]; // register 4th airline

            // ACT
            try {
                await config.flightSuretyApp.registerAirline(newAirline3, { from: firstAirline });
                await config.flightSuretyApp.registerAirline(newAirline4, { from: firstAirline });
            }
            catch (e) {
                console.log(e);
            }

            let result3 = await config.flightSuretyData.isRegisteredAirline.call(newAirline3);
            let result4 = await config.flightSuretyData.isRegisteredAirline.call(newAirline4);

            // ASSERT
            assert.equal(result3, true, "Should be able to register airline 3 without multi-sig consensus");
            assert.equal(result4, true, "Should be able to register airline 4 without multi-sig consensus");
        });

        it('(airline) cannot register 5th airline without multi-sig consensus', async () => {

            // ARRANGE
            let firstAirline = config.firstAirline; // is funded in previous test case
            let newAirline5 = accounts[5]; // register 5th airline

            // ACT
            try {
                await config.flightSuretyApp.registerAirline(newAirline5, { from: firstAirline });
            }
            catch (e) {
                console.log(e);
            }

            let result5 = await config.flightSuretyData.isRegisteredAirline.call(newAirline5);

            // ASSERT
            assert.equal(result5, false, "Should not be able to register airline 5 without multi-sig consensus");
        });

        it('(airline) should be able to register 5th airline with 50% multi-sig consensus', async () => {

            // ARRANGE
            let secondAirline = accounts[2];
            let newAirline5 = accounts[5]; // register 5th airline

            // ACT
            try {
                await config.flightSuretyApp.fund.sendTransaction({ from: secondAirline, value: AIRLINE_REGISTRATION_FEE, gas: 4600000 });// fund 2nd airline so that it may participate in voting process
                // firstAirline has voted in previous test case, we vote with secondAirline to pass 50% consensus requirement
                await config.flightSuretyApp.registerAirline(newAirline5, { from: secondAirline });
            }
            catch (e) {
                console.log(e);
            }

            let result5 = await config.flightSuretyData.isRegisteredAirline.call(newAirline5);

            // ASSERT
            assert.equal(result5, true, "Should be able to register airline 5 with 50% multi-sig consensus");
        });
    }) // end Test airline

    describe(`Test flight functionalities`, () => {
        it('(flight) can register a new flight', async () => {

            // ARRANGE
            // register a flight
            let flight1 = {
                airline: config.firstAirline,
                flightNo: "SQ390",
                departureFrom: "SIN",
                arrivalAt: "BKK",
                timestamp: 1640928519
            }

            // ACT
            try {
                await config.flightSuretyApp.registerFlight(flight1.airline, flight1.flightNo, flight1.departureFrom, flight1.arrivalAt, flight1.timestamp, { from: config.firstAirline });

            }
            catch (e) {
                // console.log(e);
            }
            let isRegistered = await config.flightSuretyData.isRegisteredFlight.call(flight1.airline, flight1.flightNo, flight1.timestamp);
            assert.equal(isRegistered, true, "Able to register a new flight");
        });

        it('(flight) cannot register a new flight if the airline is not funded yet', async () => {

            // ARRANGE
            let airline5 = accounts[5];
            // register a flight
            let flight2 = {
                airline: airline5,
                flightNo: "SQ112",
                departureFrom: "OSK",
                arrivalAt: "SIN",
                timestamp: 1640928519
            }

            // ACT
            try {
                await config.flightSuretyApp.registerFlight.call(flight2.airline, flight2.flightNo, flight2.departureFrom, flight2.arrivalAt, flight2.timestamp, { from: airline5 });
            }
            catch (e) {
                // console.log(e);
            }
            let isRegistered = await config.flightSuretyData.isRegisteredFlight.call(flight2.airline, flight2.flightNo, flight2.timestamp);
            assert.equal(isRegistered, false, "Unfunded airlines should not be able to register a new flight");
        });
    }) // end Test flight

    describe(`Test passenger functionalities`, () => {
        it('(passenger) can buy insurance for a selected flight', async () => {

            // ARRANGE
            let passenger1 = config.testAddresses[1];

            // ACT
            try {
                // buy insurance for flight
                await config.flightSuretyApp.buyInsurance.sendTransaction(flight1.airline, flight1.flightNo, flight1.timestamp, { from: passenger1, value: INSURANCE_FEE, gas: 4600000 });
            }
            catch (e) {
                console.log(e);
            }
            let result = await config.flightSuretyData.isPassengerInsured(passenger1, flight1.airline, flight1.flightNo, flight1.timestamp);
            assert.equal(result, true, "Passenger is able to buy insurance for a flight");
        });

        it('(passenger) passenger 2 can buy insurance for the same flight', async () => {

            // ARRANGE
            let passenger2 = config.testAddresses[2];

            // ACT
            try {
                // buy insurance for flight
                await config.flightSuretyApp.buyInsurance.sendTransaction(flight1.airline, flight1.flightNo, flight1.timestamp, { from: passenger2, value: INSURANCE_FEE, gas: 4600000 });
            }
            catch (e) {
                console.log(e);
            }
            let result = await config.flightSuretyData.isPassengerInsured(passenger2, flight1.airline, flight1.flightNo, flight1.timestamp);
            assert.equal(result, true, "Passenger 2 is able to buy insurance for the same flight");
        });

        it('(passenger) cannot buy insurance for more than 1 ether', async () => {

            // ARRANGE
            let passenger1 = config.testAddresses[1];
            let insuranceFee = web3.utils.toWei("2", "ether");
            let success = false;

            try {
                // buy insurance for flight
                await config.flightSuretyApp.buyInsurance.sendTransaction(flight1.airline, flight1.flightNo, flight1.timestamp, { from: passenger1, value: insuranceFee, gas: 4600000 });
                success = true;
            }
            catch (e) {
                // console.log(e);
                success = false;
            } finally {
                assert.equal(success, false, "Passenger should not be able to buy insurance at > 1 ether");
            }

        });

        // it('(passenger) can credit payout to insurees', async () => {

        //     // ARRANGE
        //     let passenger2 = config.testAddresses[2];
        //     const STATUS_CODE_LATE_AIRLINE = 20;

        //     // ACT
        //     try {
        //         // register a flight
        //         // await config.flightSuretyApp.registerFlight(flight1.airline, flight1.flightNo, flight1.departureFrom, flight1.arrivalAt, flight1.timestamp, { from: config.firstAirline });

        //         // // buy insurance
        //         // await config.flightSuretyApp.buyInsurance.sendTransaction(flight1.airline, flight1.flightNo, flight1.timestamp, { from: passenger2, value: INSURANCE_FEE, gas: 4600000 });

        //         // check if flight is registered
        //         // let isRegistered = await config.flightSuretyData.isRegisteredFlight(flight1.airline, flight1.flightNo, flight1.timestamp);
        //         // console.log('Flight registered = ', isRegistered);

        //         // check if passenger is insured
        //         let result = await config.flightSuretyData.isPassengerInsured(passenger2, flight1.airline, flight1.flightNo, flight1.timestamp);
        //         console.log('Passenger insured = ', result);

        //         // simulate a LATE_AIRLINE event and payout credits to insurees
        //         await config.flightSuretyData.processFlightStatus(flight1.airline, flight1.flightNo, flight1.timestamp, STATUS_CODE_LATE_AIRLINE);

        //         // check if passenger received credits 
        //         let creditBalance = await config.flightSuretyApp.getPassengerCredits(passenger2);
        //         creditBalance = BigNumber(creditBalance);
        //         console.log('credit balance', creditBalance);

        //         assert.equal(creditBalance, INSURANCE_FEE * 1.5, "Passenger 2 can receive credits for an insured flight that is late (LATE_AIRLINE)");
        //     }
        //     catch (e) {
        //         // console.log(e);
        //     }
        // });

        // it('(passenger) can withdraw credits', async () => {

        //     // ARRANGE
        //     let passenger2 = config.testAddresses[2];

        //     // ACT
        //     try {
        //         // check if passenger received credits 
        //         let creditBalance = await config.flightSuretyApp.getPassengerCredits(passenger2);
        //         creditBalance = BigNumber(creditBalance);
        //         console.log('credit balance', creditBalance);

        //         let walletBalance = await web3.eth.getBalance(passenger2);
        //         console.log('wallet balance', walletBalance);

        //         await config.flightSuretyApp.withdrawCredits.sendTransaction({ from: passenger2, gas: 4600000 });

        //         creditBalance = await config.flightSuretyApp.getPassengerCredits(passenger2);
        //         creditBalance = BigNumber(creditBalance);
        //         console.log('new credit balance', creditBalance);

        //         walletBalance = await web3.eth.getBalance(passenger2);
        //         console.log('new wallet balance', walletBalance);

        //         assert.equal(creditBalance, 0, "Passenger 2 can withdraw credits");
        //     }
        //     catch (e) {
        //         // console.log(e);
        //     }
        // });
    }) // End test passenger
});