
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async () => {
    let result = null;

    let contract = new Contract('localhost', () => {
        let displayWrapper = DOM.elid("display-wrapper");

        let topNav = ["contract", "airline", "passenger", "credits"].map(item => {
            return DOM.elid(item);
        });

        let navItemContainer = ["contract-container", "airline-container", "passenger-container", "credits-container"].map(item => {
            return DOM.elid(item);
        });

        // add click listener for each nav item
        topNav.forEach((navItem, index, arr) => {
            navItem.addEventListener("click", () => {
                arr.forEach((item, idx, array) => {
                    item.classList.remove("active");
                    navItemContainer[idx].style.display = "none";// toggle show/hide container
                });
                navItem.classList.add("active");
                navItemContainer[index].style.display = "block";
                displayWrapper.innerHTML = "";
            });
        });



        // Contract > Check operational status of contract
        DOM.elid("contract").addEventListener("click", async () => {
            contract.isOperational((error, result) => {
                display('Operational Status', 'Check if contract is operational', [{ label: 'Operational Status', error: error, value: result }], 'contract-container');
            });
        });
        DOM.elid("contract").click(); // load first screen


        // For Airlines > Register flights
        DOM.elid("is-airline-funded").addEventListener("click", async () => {
            let airlineAddress = DOM.elid("rf-airline-address").value;

            console.log('is-airline-funded', airlineAddress);

            contract.getFundsForAirline(airlineAddress, (error, result) => {
                if (error) console.log(error);

                console.log('getFundsForAirline', result);
                display('Airline Funds', `Funds: ${result}`, [{ label: 'Funds', error: error, value: result }], 'airline-container');

            })
        });
        DOM.elid("register-flight").addEventListener("click", async () => {
            let airlineAddress = DOM.elid("rf-airline-address").value;
            let flightNo = DOM.elid("rf-flight-no").value;
            let departureFrom = DOM.elid("rf-from").value;
            let arrivalAt = DOM.elid("rf-to").value;
            let departureTime = DOM.elid("rf-datetime").value;
            let timestamp = new Date(departureTime).valueOf() / 1000;

            console.log('register-flight', airlineAddress, flightNo, departureFrom, arrivalAt, timestamp);

            contract.registerFlight(airlineAddress, flightNo, departureFrom, arrivalAt, timestamp, (error, result) => {
                if (error) console.log(error);

                console.log('result', result);
                display('Flight Registration', `Flight No: ${flightNo}`, [{ label: 'Submitted', error: error, value: result.isRegistered }], 'airline-container');
            });
        });

        DOM.elid("is-registered-flight").addEventListener("click", async () => {
            let airlineAddress = DOM.elid("rf-airline-address").value;
            let flightNo = DOM.elid("rf-flight-no").value;
            let departureTime = DOM.elid("rf-datetime").value;
            let timestamp = new Date(departureTime).valueOf() / 1000;

            console.log('is-registered-flight', airlineAddress, flightNo, timestamp);

            contract.isRegisteredFlight(airlineAddress, flightNo, timestamp, (error, result) => {
                if (error) console.log(error);

                console.log('result', result);

                display('Flight Registration', `Flight No: ${flightNo}`, [{ label: 'Is Registered?', error: error, value: result }], 'airline-container');
            })
        });

        // For Passengers > Buy insurance
        DOM.elid("buy-insurance").addEventListener("click", async () => {
            let airlineAddress = DOM.elid("bi-airline-address").value;
            let flightNo = DOM.elid("bi-flight-no").value;
            let departureTime = DOM.elid("bi-datetime").value;
            let timestamp = new Date(departureTime).valueOf() / 1000;
            let amount = DOM.elid("bi-eth").value;

            console.log('buy-insurance', airlineAddress, flightNo, timestamp, amount);

            contract.buyInsurance(airlineAddress, flightNo, timestamp, amount, (error, result) => {
                if (error) console.log(error);
                console.log('result', result);



                display('Insurance', `Flight No: ${flightNo}`, [{ label: 'Is Purchased?', error: error, value: error ? false : true }], 'passenger-container');
            });
        });

        DOM.elid("is-insured").addEventListener("click", async () => {
            let airlineAddress = DOM.elid("bi-airline-address").value;
            let flightNo = DOM.elid("bi-flight-no").value;
            let departureTime = DOM.elid("bi-datetime").value;
            let timestamp = new Date(departureTime).valueOf() / 1000;

            console.log('is-insured', airlineAddress, flightNo, timestamp);

            contract.isInsured(airlineAddress, flightNo, timestamp, (error, result) => {
                console.log('result', result);
                display('Is Insured', 'Check insurance status', [{ label: 'Fetch Insurance Status', error: error, value: result }], 'passenger-container');
            });
        })

        // For Passengers > Submit oracle
        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let airlineAddress = DOM.elid("bi-airline-address").value;
            let flightNo = DOM.elid("bi-flight-no").value;
            let departureTime = DOM.elid("bi-datetime").value;
            let timestamp = new Date(departureTime).valueOf() / 1000;

            console.log('submit-oracle', airlineAddress, flightNo, timestamp);

            // Write transaction
            contract.fetchFlightStatus(airlineAddress, flightNo, timestamp, (error, result) => {
                console.log('error', error);
                console.log('result', result);
                display('Oracles', 'Trigger oracles', [{ label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp }], 'passenger-container');
            });
        })

        // For Passengers > Check credit balance
        DOM.elid("check-credits").addEventListener("click", async () => {
            let passengerAddress = DOM.elid("cd-address").value;

            console.log('check-credits', passengerAddress);

            contract.getPassengerCredits(passengerAddress, (error, result) => {
                if (error) console.log(error);
                console.log('result', result);

                display('Payout Credits', `Check credit balance`, [{ label: 'Credits', error: error, value: result }], 'credits-container');
            });
        });

        // For Passengers > Withdraw credit balance
        DOM.elid("withdraw-credits").addEventListener("click", async () => {
            let passengerAddress = DOM.elid("cd-address").value;

            console.log('withdraw-credits', passengerAddress);

            contract.withdrawCredits(passengerAddress, (error, result) => {
                if (error) console.log(error);
                console.log('result', result);

                display('Payout Credits', `Withdraw credit balance`, [{ label: 'Credits', error: error, value: result }], 'credits-container');
            });
        });
    });
})();


function display(title, description, results, container) {
    let containerDiv = DOM.elid(container);
    let displayDiv = containerDiv.getElementsByTagName("div")[2]; // locate display-wrapper
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({ className: 'row' }));
        row.appendChild(DOM.div({ className: 'col-sm-4 field' }, result.label));
        row.appendChild(DOM.div({ className: 'col-sm-8 field-value' }, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);
    displayDiv.style.display = 'block';

}